/**
 * TETRIS WORLD 成绩提交模块
 * 处理游戏成绩提交到Google表单
 */

class ScoreSubmissionManager {
    constructor() {
        // Google表单配置
        this.formId = '1WDr4zv5o3yxr5EmKNQTeNkYJnNO6Dif2Go_nj1UFapw';
        this.spreadsheetId = '17Wu8sonn4kxHX3VWT1ZKPR3M-ZDSUWy8UeKG1SvdFoU';
        this.sheetName = 'scores_raw';
        // Google Apps Script API（统一读写）
        this.apiUrl = (window.TW_CONFIG && window.TW_CONFIG.API_URL) ? window.TW_CONFIG.API_URL : 'https://script.google.com/macros/s/AKfycbw9oCs3E9iPT2u2IukGvg_36MHjcjYxtdqaYGzd4zv0NNU9VrllIpiBqF5u6_I0bwE/exec';
        
        // 客户端版本
        this.clientVersion = 'v1.0.0';
        
        // 提交状态
        this.isSubmitting = false;
        this.submissionQueue = [];
        // 可靠上传：持久化队列 + 断网重试
        this.persistentQueueKey = 'tw_pending_submissions_v1';
        this.retryTimer = null;
        this.retryBackoffMs = 5000; // 初始5s，指数回退
        this.maxBackoffMs = 5 * 60 * 1000; // 上限5分钟
        
        this.init();
    }
    
    init() {
        console.log('ScoreSubmissionManager initialized');
        // 恢复持久化队列
        try {
            const saved = localStorage.getItem(this.persistentQueueKey);
            if (saved) {
                const arr = JSON.parse(saved);
                if (Array.isArray(arr)) this.submissionQueue.push(...arr);
            }
        } catch (_) {}

        // 启动自动重试（页面激活/网络恢复后）
        window.addEventListener('online', () => this.scheduleRetry(0));
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') this.scheduleRetry(0);
        });
        this.scheduleRetry(0);
    }
    
    // 生成UUID
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    // 生成nonce（防重复标识）
    generateNonce() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        return `nonce-${timestamp}-${random}`;
    }
    
    // 验证成绩数据
    validateScoreData(scoreData) {
        const errors = [];
        
        // 检查必需字段
        if (!scoreData.score || scoreData.score < 1 || scoreData.score > 9999999) {
            errors.push('Score must be between 1 and 9999999');
        }
        
        if (!scoreData.level || scoreData.level < 1 || scoreData.level > 99) {
            errors.push('Level must be between 1 and 99');
        }
        
        if (!scoreData.lines || scoreData.lines < 0 || scoreData.lines > 999) {
            errors.push('Lines must be between 0 and 999');
        }
        
        if (!scoreData.duration || scoreData.duration < 1 || scoreData.duration > 36000000) {
            errors.push('Duration must be between 1 and 36000000 ms');
        }
        
        if (!scoreData.playerName || scoreData.playerName.length > 12) {
            errors.push('Player name must be provided and <= 12 characters');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    // 准备提交数据（Apps Script 接口字段）
    prepareSubmissionData(scoreData) {
        const playerName = window.playerNameManager ? window.playerNameManager.getPlayerName() : 'Anonymous';
        const playerId = window.playerNameManager && window.playerNameManager.getPlayerId ? window.playerNameManager.getPlayerId() : this.generateUUID();
        // 确保每个提交的 client_nonce 稳定（若不存在则生成一次并回写到 scoreData 上）
        if (!scoreData.client_nonce) {
            scoreData.client_nonce = this.generateNonce();
        }
        return {
            player_id: playerId,
            player_name: playerName,
            score: scoreData.score,
            level: scoreData.level,
            lines: scoreData.lines,
            duration_ms: scoreData.duration,
            client_version: this.clientVersion,
            client_nonce: scoreData.client_nonce
        };
    }
    
    // 提交成绩到 Google Apps Script（统一服务层）
    async submitScore(scoreData) {
        console.log('ScoreSubmissionManager: 开始提交成绩:', scoreData);
        
        // 验证数据
        const validation = this.validateScoreData(scoreData);
        if (!validation.isValid) {
            console.error('Score validation failed:', validation.errors);
            return {
                success: false,
                error: 'Invalid score data: ' + validation.errors.join(', ')
            };
        }
        
        // 并发保护：若正在提交，则加入队列并持久化
        if (this.isSubmitting) {
            console.log('Submission in progress, queuing score...');
            this.enqueue(scoreData);
            return { success: false, error: 'Submission in progress, score queued' };
        }
        
        this.isSubmitting = true;
        
        try {
            console.log('Submitting score via Apps Script:', scoreData);
            const payload = this.prepareSubmissionData(scoreData);
            const params = new URLSearchParams({ action: 'submit_score', ...payload });
            const response = await fetch(`${this.apiUrl}?${params.toString()}`, { method: 'GET', mode: 'cors' });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (!data || data.success !== true) {
                throw new Error('API failed');
            }
            // 二次确认：确保已写入（避免网络中途断连导致误判）
            const confirmed = await this.confirmSubmission(payload.player_id, payload.client_nonce);
            if (!confirmed) {
                throw new Error('Server confirmation failed');
            }
            // 更新本地最高分
            this.updateLocalHighScore(scoreData);
            // 成功后异步处理后续队列，避免递归调用
            setTimeout(() => this.processSubmissionQueue(), 0);
            return { success: true, message: 'Score submitted successfully' };
        } catch (error) {
            console.error('Score submission failed:', error);
            // 失败：加入持久化队列并安排重试
            this.enqueue(scoreData);
            this.scheduleRetry();
            return { success: false, error: 'Submission failed: ' + error.message };
        } finally {
            this.isSubmitting = false;
        }
    }
    
    // 处理提交队列
    processSubmissionQueue() {
        if (this.submissionQueue.length > 0 && !this.isSubmitting) {
            const nextScore = this.submissionQueue.shift();
            this.persistQueue();
            this.submitScore(nextScore);
        }
    }
    
    // 更新本地最高分
    updateLocalHighScore(scoreData) {
        const currentHighScore = localStorage.getItem('playerHighScore') || 0;
        if (scoreData.score > currentHighScore) {
            localStorage.setItem('playerHighScore', scoreData.score);
            console.log('New high score saved:', scoreData.score);
        }
    }

    // 队列与重试工具
    enqueue(scoreData) {
        this.submissionQueue.push(scoreData);
        this.persistQueue();
    }

    persistQueue() {
        try {
            localStorage.setItem(this.persistentQueueKey, JSON.stringify(this.submissionQueue));
        } catch (_) {}
    }

    scheduleRetry(delayMs) {
        // 允许手动指定延迟，否则使用指数回退
        const delay = typeof delayMs === 'number' ? delayMs : this.retryBackoffMs;
        if (this.retryTimer) clearTimeout(this.retryTimer);
        if (this.submissionQueue.length === 0) return;
        if (navigator.onLine === false) return; // 离线时不安排
        this.retryTimer = setTimeout(() => {
            if (this.isSubmitting) { this.scheduleRetry(1000); return; }
            // 尝试处理一个
            this.processSubmissionQueue();
            // 指数回退（若仍有剩余）
            if (this.submissionQueue.length > 0) {
                this.retryBackoffMs = Math.min(this.retryBackoffMs * 2, this.maxBackoffMs);
                this.scheduleRetry();
            } else {
                // 清空后重置回退
                this.retryBackoffMs = 5000;
            }
        }, Math.max(0, delay));
    }

    // 与服务端确认：通过 player_id + client_nonce 校验是否写入
    async confirmSubmission(playerId, clientNonce) {
        try {
            const params = new URLSearchParams({ action: 'confirm_submission', player_id: playerId, client_nonce: clientNonce });
            const resp = await fetch(`${this.apiUrl}?${params.toString()}`, { method: 'GET', mode: 'cors' });
            if (!resp.ok) return false;
            const data = await resp.json();
            return !!(data && data.exists === true);
        } catch (_) {
            return false;
        }
    }
    
    // 获取玩家排名
    async getPlayerRank(score) {
        try {
            console.log('ScoreSubmissionManager: 正在查询玩家排名...');
            const response = await fetch(`${this.apiUrl}?action=get_player_rank&score=${score}`, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.rank) {
                console.log(`ScoreSubmissionManager: 玩家排名 ${data.rank} for score ${score}`);
                return data.rank;
            } else {
                console.warn('ScoreSubmissionManager: API返回数据格式错误:', data);
                return null;
            }
            
        } catch (error) {
            console.error('Failed to get player rank:', error);
            
            // 如果API失败，使用模拟排名作为后备
            const mockRank = Math.floor(Math.random() * 50) + 1;
            console.log(`ScoreSubmissionManager: 使用模拟排名 ${mockRank} for score ${score}`);
            return mockRank;
        }
    }
    
    // 检查是否进入Top50
    async isInTop50(score) {
        const rank = await this.getPlayerRank(score);
        return rank !== null && rank <= 50;
    }
}

// 创建全局实例
window.scoreSubmissionManager = new ScoreSubmissionManager();

// 导出给其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScoreSubmissionManager;
}
