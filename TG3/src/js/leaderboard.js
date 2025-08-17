/**
 * TETRIS WORLD 排行榜管理模块
 * 处理全球排行榜数据加载、显示和交互
 */

class TetrisWorldLeaderboard {
    constructor() {
        this.worldScores = [];
        this.isLoading = false;
        this.autoRefreshInterval = null;
        this.serverTimeInterval = null;
        this.serverTimeBaseMs = null; // 服务器时间基准（毫秒，UTC）
        this.serverTimeStartLocalMs = null; // 本地开始计时的时间（毫秒）
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.lastSignature = '';
        this.loadWorldScores({ silent: false });
        this.startAutoRefresh();
        // 初始化多语言标语
        try { this.initLocalizedMotto(); } catch (_) {}
        // 标注Beta模式（通过 ?beta=1）
        try { this.markIfBeta(); } catch (_) {}
    }
    
    bindEvents() {
        // 重试按钮
        document.getElementById('retryBtn').addEventListener('click', () => {
            this.loadWorldScores();
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeLeaderboard();
            } else if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
                e.preventDefault();
                this.loadWorldScores();
            }
        });
    }

    markIfBeta() {
        const url = new URL(window.location.href);
        if (url.searchParams.get('beta') === '1') {
            const header = document.querySelector('.leaderboard-header');
            if (!header) return;
            let tag = document.getElementById('leaderboardBetaTag');
            if (!tag) {
                tag = document.createElement('div');
                tag.id = 'leaderboardBetaTag';
                tag.textContent = 'BETA';
                tag.style.cssText = 'display:inline-block;margin-bottom:6px;padding:2px 8px;border:1px solid #ffc107;color:#ffc107;border-radius:10px;font-weight:700;letter-spacing:1px;';
                header.insertBefore(tag, header.firstChild);
            }
            document.body.classList.add('is-beta');
        }
    }

    // ===== 多语言标语 =====
    initLocalizedMotto() {
        const header = document.querySelector('.leaderboard-header');
        if (!header) return;

        // 若已存在则不重复创建
        let mottoEl = document.getElementById('leaderboardMotto');
        if (!mottoEl) {
            mottoEl = document.createElement('div');
            mottoEl.id = 'leaderboardMotto';
            mottoEl.className = 'leaderboard-motto';
            header.appendChild(mottoEl);
        }

        const { text, rtl } = this.pickMottoText();
        mottoEl.textContent = text;
        if (rtl) {
            mottoEl.setAttribute('dir', 'rtl');
            mottoEl.style.textAlign = 'right';
        } else {
            mottoEl.removeAttribute('dir');
            mottoEl.style.textAlign = '';
        }
    }

    pickMottoText() {
        const MAP = {
            'zh': '真男人就上10级',
            'en': 'REAL MEN REACH LEVEL 10',
            'en_alt': 'ONLY REAL MEN GO FOR LEVEL 10',
            'ja': '真の男ならレベル10へ挑め',
            'ko': '진짜 남자라면 10레벨까지 가라',
            'de': 'EIN ECHTER MANN SCHAFFT LEVEL 10',
            'fr': 'UN VRAI HOMME ATTEINT LE NIVEAU 10',
            'es': 'UN VERDADERO HOMBRE LLEGA AL NIVEL 10',
            'es-419': '¡LOS HOMBRES DE VERDAD VAN HASTA EL NIVEL 10!',
            'it': 'UN VERO UOMO ARRIVA AL LIVELLO 10',
            'ru': 'НАСТОЯЩИЙ МУЖЧИНА ДОЙДЁТ ДО 10 УРОВНЯ',
            'pt': 'UM HOMEM DE VERDADE CHEGA AO NÍVEL 10',
            'ar': 'الرجل الحقيقي يصل إلى المستوى 10'
        };

        const candidates = [];
        if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);
        if (navigator.language) candidates.push(navigator.language);
        try {
            const intlLocale = (Intl.DateTimeFormat().resolvedOptions().locale || '');
            if (intlLocale) candidates.push(intlLocale);
        } catch (_) {}
        candidates.push('en');

        for (const raw of candidates) {
            const lang = String(raw || '').toLowerCase();
            if (!lang) continue;
            // 完整匹配优先（如 es-419 / ar / zh-CN）
            if (MAP[lang]) return { text: MAP[lang], rtl: lang.startsWith('ar') };
            // 拉美西语区域映射到 es-419
            if (lang.startsWith('es-') && /^(es-419|es-mx|es-ar|es-co|es-cl|es-pe)/.test(lang)) {
                return { text: MAP['es-419'], rtl: false };
            }
            // 基础语言回退
            const base = lang.split('-')[0];
            if (MAP[base]) return { text: MAP[base], rtl: base === 'ar' };
        }
        return { text: MAP['en'], rtl: false };
    }
    
    // 加载世界排行榜数据
    async loadWorldScores(options = { silent: false }) {
        const isSilent = !!options.silent;
        if (this.isLoading && !isSilent) return;
        
        if (!isSilent) {
            this.isLoading = true;
            this.showLoading();
        }
        
        try {
            const scores = await this.fetchWorldScores();
            this.updateServerTime();
            const newSignature = this.computeSignature(scores);
            if (newSignature !== this.lastSignature) {
                this.worldScores = scores;
                this.renderLeaderboard();
                this.lastSignature = newSignature;
            }
            if (!isSilent) {
                this.hideLoading();
            }
        } catch (error) {
            console.error('Failed to load world scores:', error);
            if (!isSilent) {
                this.showError();
            }
        } finally {
            if (!isSilent) {
                this.isLoading = false;
            }
        }
    }
    
    // 从Google Apps Script API获取世界排行榜数据
    async fetchWorldScores() {
        try {
            // Google Apps Script API URL
            const API_URL = (window.TW_CONFIG && window.TW_CONFIG.API_URL) ? window.TW_CONFIG.API_URL : 'https://script.google.com/macros/s/AKfycbw9oCs3E9iPT2u2IukGvg_36MHjcjYxtdqaYGzd4zv0NNU9VrllIpiBqF5u6_I0bwE/exec';
            
            console.log('TetrisWorldLeaderboard: 正在从Google Apps Script获取数据...');
            
            const response = await fetch(`${API_URL}?action=get_scores&limit=50`, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.scores && Array.isArray(data.scores)) {
                const scores = data.scores.map(score => ({
                    name: score.player_name,
                    score: score.score,
                    level: score.level,
                    lines: score.lines,
                    duration: score.duration_ms
                }));
                
                console.log('TetrisWorldLeaderboard: 从Google Apps Script获取到数据:', scores);
                return scores;
            } else {
                console.warn('TetrisWorldLeaderboard: API返回数据格式错误:', data);
                return [];
            }
            
        } catch (error) {
            console.error('TetrisWorldLeaderboard: 获取数据失败:', error);
            
            // 如果API失败，使用模拟数据作为后备
            console.log('TetrisWorldLeaderboard: 使用模拟数据作为后备');
            const mockScores = [
                { name: 'Player1', score: 15000, level: 5, lines: 20, duration: 120000 },
                { name: 'Player2', score: 12000, level: 4, lines: 18, duration: 100000 },
                { name: 'Player3', score: 10000, level: 3, lines: 15, duration: 90000 },
                { name: 'Player4', score: 8000, level: 2, lines: 12, duration: 80000 },
                { name: 'Player5', score: 6000, level: 1, lines: 10, duration: 70000 }
            ];
            return mockScores;
        }
    }
    
    // 渲染排行榜
    renderLeaderboard() {
        const tbody = document.getElementById('leaderboardBody');
        tbody.innerHTML = '';
        
        if (this.worldScores.length === 0) {
            // 显示空状态
            const row = tbody.insertRow();
            row.innerHTML = `
                <td colspan="6" style="text-align: center; padding: 20px; color: #9bbc0f;">
                    暂无排行榜数据<br>
                    <small>开始游戏并提交成绩来创建排行榜！</small>
                </td>
            `;
        } else {
            // 渲染排行榜数据
            this.worldScores.forEach((score, index) => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${score.name}</td>
                    <td>${score.score.toString().padStart(6, '0')}</td>
                    <td>${score.level}</td>
                    <td>${score.lines}</td>
                    <td>${this.formatTime(score.duration)}</td>
                `;
                
                // 为第一名添加金色样式
                if (index === 0) {
                    row.style.color = '#ffd700';
                    row.style.textShadow = '2px 2px 0px var(--nes-black)';
                }
            });
        }
        
        document.getElementById('leaderboardTableContainer').style.display = 'block';
        
        // 检查玩家是否进入Top50
        this.checkPlayerTop50Status();
    }
    
    // 显示加载状态
    showLoading() {
        document.getElementById('leaderboardLoading').style.display = 'flex';
        document.getElementById('leaderboardTableContainer').style.display = 'none';
        document.getElementById('leaderboardError').style.display = 'none';
    }
    
    // 隐藏加载状态
    hideLoading() {
        document.getElementById('leaderboardLoading').style.display = 'none';
    }
    
    // 显示错误状态
    showError() {
        document.getElementById('leaderboardLoading').style.display = 'none';
        document.getElementById('leaderboardTableContainer').style.display = 'none';
        document.getElementById('leaderboardError').style.display = 'flex';
    }
    
    // 开始自动刷新
    startAutoRefresh() {
        // 每45秒静默刷新一次（仅当数据变化时才更新UI）
        this.autoRefreshInterval = setInterval(() => {
            this.loadWorldScores({ silent: true });
        }, 45000);
    }
    
    // 停止自动刷新
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }
    

    
    // 工具方法：格式化时间
    formatTime(durationMs) {
        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // 工具方法：计算数据签名，用于判断是否需要刷新UI
    computeSignature(scores) {
        try {
            return scores.map(s => `${s.name}|${s.score}|${s.level}|${s.lines}|${s.duration}`).join(';');
        } catch (_) {
            return '' + Date.now();
        }
    }

    // 显示服务器时间（采用请求返回的Date头或本地时间兜底）
    async updateServerTime() {
        try {
            const apiUrl = (window.TW_CONFIG && window.TW_CONFIG.API_URL) ? window.TW_CONFIG.API_URL : '';
            if (!apiUrl) return;
            const resp = await fetch(`${apiUrl}?action=get_scores`, { method: 'HEAD' });
            let serverDateStr = resp.headers.get('date');
            let base = serverDateStr ? Date.parse(serverDateStr) : Date.now();
            this.serverTimeBaseMs = isNaN(base) ? Date.now() : base;
            this.serverTimeStartLocalMs = Date.now();
            this.startServerClock();
        } catch (_) {
            this.serverTimeBaseMs = Date.now();
            this.serverTimeStartLocalMs = Date.now();
            this.startServerClock();
        }
    }

    // 启动每秒更新的服务器时间显示
    startServerClock() {
        this.stopServerClock();
        const el = document.getElementById('leaderboardServerTime');
        if (!el) return;
        const tick = () => {
            if (this.serverTimeBaseMs == null || this.serverTimeStartLocalMs == null) return;
            const elapsed = Date.now() - this.serverTimeStartLocalMs;
            const nowMs = this.serverTimeBaseMs + elapsed;
            el.textContent = `Server Time: ${this.formatDateTimeUTC(new Date(nowMs))}`;
        };
        tick();
        this.serverTimeInterval = setInterval(tick, 1000);
    }

    // 停止服务器时间计时器
    stopServerClock() {
        if (this.serverTimeInterval) {
            clearInterval(this.serverTimeInterval);
            this.serverTimeInterval = null;
        }
    }

    // UTC 格式化（YYYY-MM-DD HH:MM:SS UTC）
    formatDateTimeUTC(date) {
        const pad = (n) => n.toString().padStart(2, '0');
        const Y = date.getUTCFullYear();
        const M = pad(date.getUTCMonth() + 1);
        const D = pad(date.getUTCDate());
        const h = pad(date.getUTCHours());
        const m = pad(date.getUTCMinutes());
        const s = pad(date.getUTCSeconds());
        return `${Y}-${M}-${D} ${h}:${m}:${s} UTC`;
    }
    
    // 获取玩家排名
    getPlayerRank(playerScore) {
        return this.worldScores.findIndex(s => s.score <= playerScore) + 1;
    }
    
    // 检查是否进入排行榜
    isInTop50(playerScore) {
        const rank = this.getPlayerRank(playerScore);
        return rank > 0 && rank <= 50;
    }
    
    // 检查玩家是否进入Top50并更新显示
    checkPlayerTop50Status() {
        if (!window.playerNameManager) return;
        
        const playerHighScore = localStorage.getItem('playerHighScore');
        if (!playerHighScore) return;
        
        const score = parseInt(playerHighScore);
        const isInTop50 = this.isInTop50(score);
        
        // 通知玩家名字管理器更新显示
        if (window.playerNameManager.updateTop50Status) {
            window.playerNameManager.updateTop50Status(isInTop50);
        }
    }
    
    // 设置玩家名称
    setPlayerName(name) {
        this.playerName = name;
        localStorage.setItem('playerName', name);
    }
    
    // 获取玩家名称
    getPlayerName() {
        return this.playerName || 'Anonymous';
    }
}

// 页面加载完成后初始化排行榜
document.addEventListener('DOMContentLoaded', () => {
    window.tetrisWorldLeaderboard = new TetrisWorldLeaderboard();
});

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    if (window.tetrisWorldLeaderboard) {
        window.tetrisWorldLeaderboard.stopAutoRefresh();
    }
});
