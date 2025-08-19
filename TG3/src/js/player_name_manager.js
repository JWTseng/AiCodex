/**
 * 用户名管理模块
 * 处理玩家名称的输入、验证、存储和弹窗功能
 */

class PlayerNameManager {
    constructor() {
        this.playerName = '';
        this.playerId = '';
        this.isModalOpen = false;
        
        this.init();
    }
    
    init() {
        this.loadPlayerName();
        this.ensurePlayerId();
        this.bindEvents();
        
        // 更新玩家名字显示
        this.updatePlayerNameDisplay();
        
        // 如果未设置用户名，显示弹窗
        if (!this.playerName) {
            this.showNameModal();
        }
    }
    
    bindEvents() {
        // 设置按钮事件
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.showGameSettings();
        });
        
        // 弹窗事件
        document.getElementById('playerNameInput').addEventListener('input', (e) => {
            this.validateName(e.target.value);
        });
        
        document.getElementById('playerNameInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.confirmName();
            } else if (e.key === 'Escape') {
                this.closeModal();
            }
        });
        
        document.getElementById('confirmNameBtn').addEventListener('click', () => {
            this.confirmName();
        });
        
        document.getElementById('skipNameBtn').addEventListener('click', () => {
            this.skipName();
        });
        
        // 点击遮罩关闭弹窗
        document.getElementById('playerNameModal').addEventListener('click', (e) => {
            if (e.target.id === 'playerNameModal') {
                this.closeModal();
            }
        });
        
        // 游戏设置界面事件
        document.getElementById('closeSettingsBtn').addEventListener('click', () => {
            this.closeGameSettings();
        });
        
        
        document.getElementById('updateNameBtn').addEventListener('click', () => {
            this.updatePlayerNameFromSettings();
        });
        
        // 设置页面的名字输入框事件
        document.getElementById('settingsPlayerNameInput').addEventListener('input', (e) => {
            this.validateSettingsName(e.target.value);
        });
        
        document.getElementById('settingsPlayerNameInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.updatePlayerNameFromSettings();
            }
        });
        
        document.getElementById('gameSettingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'gameSettingsModal') {
                this.closeGameSettings();
            }
        });
    }
    
    // 加载玩家名称（带localStorage + Cookie兜底）
    loadPlayerName() {
        this.playerName = this.getStoredValue('playerName') || '';
    }
    
    // （注意：实际保存逻辑见后文 savePlayerName，避免重复定义）
    
    // 显示名称设置弹窗
    showNameModal() {
        if (this.isModalOpen) return;
        
        this.isModalOpen = true;
        const modal = document.getElementById('playerNameModal');
        const input = document.getElementById('playerNameInput');
        const confirmBtn = document.getElementById('confirmNameBtn');
        
        // 设置当前名称
        input.value = this.playerName;
        
        // 验证当前名称
        this.validateName(this.playerName);
        
        // 显示弹窗
        modal.style.display = 'flex';
        
        // 聚焦输入框
        setTimeout(() => {
            input.focus();
            input.select();
        }, 100);
    }
    
    // 关闭弹窗
    closeModal() {
        if (!this.isModalOpen) return;
        
        this.isModalOpen = false;
        document.getElementById('playerNameModal').style.display = 'none';
        
        // 如果还没有设置名称，设置为Anonymous
        if (!this.playerName) {
            this.savePlayerName('Anonymous');
        }
    }
    
    // 验证名称
    validateName(name) {
        const errorElement = document.getElementById('nameError');
        const confirmBtn = document.getElementById('confirmNameBtn');
        
        // 清除错误信息
        errorElement.textContent = '';
        
        // 清洗名称
        const cleanedName = this.cleanName(name);
        
        // 验证规则
        if (!cleanedName || cleanedName.length === 0) {
            errorElement.textContent = 'Name cannot be empty';
            confirmBtn.disabled = true;
            return false;
        }
        
        if (cleanedName.length < 1) {
            errorElement.textContent = 'Name too short (min 1 character)';
            confirmBtn.disabled = true;
            return false;
        }
        
        if (cleanedName.length > 12) {
            errorElement.textContent = 'Name too long (max 12 characters)';
            confirmBtn.disabled = true;
            return false;
        }
        
        // 字符验证（只允许英文字母和数字）
        if (!/^[a-zA-Z0-9]+$/.test(cleanedName)) {
            errorElement.textContent = 'Name can only contain letters and numbers';
            confirmBtn.disabled = true;
            return false;
        }
        
        // 连续字符验证（最多3个）
        if (/(.)\1{3,}/.test(cleanedName)) {
            errorElement.textContent = 'Name cannot have more than 3 repeated characters';
            confirmBtn.disabled = true;
            return false;
        }
        
        // 验证通过
        confirmBtn.disabled = false;
        return true;
    }
    
    // 清洗名称
    cleanName(name) {
        if (!name) return '';
        
        let cleaned = name;
        
        // 1. 解码HTML实体
        cleaned = this.decodeHtmlEntities(cleaned);
        
        // 2. 移除HTML标签和实体
        cleaned = cleaned.replace(/<[^>]*>/g, '');
        cleaned = cleaned.replace(/&[a-zA-Z0-9#]+;/g, '');
        
        // 3. 移除Unicode控制字符
        cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        
        // 4. 移除零宽字符
        cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
        
        // 5. 移除表情符号和特殊符号
        cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
        
        // 6. 只保留英文字母和数字
        cleaned = cleaned.replace(/[^a-zA-Z0-9]/g, '');
        
        // 7. 限制连续字符（最多3个）
        cleaned = cleaned.replace(/(.)\1{3,}/g, '$1$1$1');
        
        // 8. 长度限制
        if (cleaned.length > 12) {
            cleaned = cleaned.substring(0, 12);
        }
        
        return cleaned;
    }
    
    // 解码HTML实体
    decodeHtmlEntities(text) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    }
    
    // 确认名称
    confirmName() {
        const input = document.getElementById('playerNameInput');
        const name = input.value;
        
        if (this.validateName(name)) {
            const cleanedName = this.cleanName(name);
            this.savePlayerName(cleanedName);
        }
    }
    
    // 保存玩家名字
    savePlayerName(name) {
        this.setStoredValue('playerName', name);
        this.playerName = name;
        
        // 更新玩家名字显示
        this.updatePlayerNameDisplay();
        
        // 通知排行榜更新玩家名字
        if (window.tetrisWorldLeaderboard) {
            window.tetrisWorldLeaderboard.setPlayerName(name);
        }
        
        this.closeModal();
    }
    
    // 更新玩家名字显示
    updatePlayerNameDisplay() {
        const displayElement = document.getElementById('playerNameDisplay');
        if (displayElement) {
            displayElement.textContent = this.playerName || 'Anonymous';
            
            // 检查是否进入Top50榜单
            this.checkTop50Status();
        }
    }
    
    // 检查玩家是否进入Top50榜单
    checkTop50Status() {
        const displayElement = document.getElementById('playerNameDisplay');
        if (!displayElement || !this.playerName) return;
        
        // 从localStorage获取玩家最高分
        const playerHighScore = localStorage.getItem('playerHighScore');
        if (!playerHighScore) {
            displayElement.classList.remove('top50');
            return;
        }
        
        // 检查是否进入Top50（这里需要与排行榜数据比较）
        // 暂时使用一个简单的判断逻辑，后续可以优化
        const score = parseInt(playerHighScore);
        if (score >= 1000000) { // 假设100万分以上进入Top50
            displayElement.classList.add('top50');
        } else {
            displayElement.classList.remove('top50');
        }
    }
    
    // 更新Top50状态（由排行榜管理器调用）
    updateTop50Status(isInTop50) {
        const displayElement = document.getElementById('playerNameDisplay');
        if (!displayElement) return;
        
        if (isInTop50) {
            displayElement.classList.add('top50');
        } else {
            displayElement.classList.remove('top50');
        }
    }
    
    // 跳过名称设置
    skipName() {
        this.savePlayerName('Anonymous');
    }
    
    // 获取当前玩家名称
    getPlayerName() {
        return this.playerName || 'Anonymous';
    }
    
    // 检查是否已设置名称
    hasPlayerName() {
        return this.playerName && this.playerName !== '';
    }

    // ===== 持久化封装与ID管理 =====
    // 本地存储读取（安全）
    getFromLocalStorage(key) {
        try {
            return window.localStorage ? window.localStorage.getItem(key) : null;
        } catch (_) {
            return null;
        }
    }
    // 本地存储写入（安全）
    setToLocalStorage(key, value) {
        try {
            if (window.localStorage) window.localStorage.setItem(key, value);
        } catch (_) {}
    }
    // 读取Cookie
    getCookie(key) {
        try {
            const cookies = document.cookie ? document.cookie.split('; ') : [];
            for (let i = 0; i < cookies.length; i++) {
                const parts = cookies[i].split('=');
                const name = decodeURIComponent(parts[0]);
                if (name === key) {
                    return decodeURIComponent(parts.slice(1).join('='));
                }
            }
        } catch (_) {}
        return null;
    }
    // 写入Cookie（默认1年）
    setCookie(key, value, maxAgeSeconds = 31536000) {
        try {
            const safeKey = encodeURIComponent(key);
            const safeVal = encodeURIComponent(value);
            document.cookie = `${safeKey}=${safeVal}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax`;
        } catch (_) {}
    }
    // 统一读取（localStorage优先，Cookie兜底）
    getStoredValue(key) {
        const ls = this.getFromLocalStorage(key);
        if (ls != null && ls !== '') return ls;
        const ck = this.getCookie(key);
        return ck != null ? ck : null;
    }
    // 统一写入（双写）
    setStoredValue(key, value) {
        this.setToLocalStorage(key, value);
        this.setCookie(key, value);
    }
    
    // 生成UUID
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    // 确保存在持久的player_id
    ensurePlayerId() {
        const existing = this.getStoredValue('playerId');
        if (existing && existing !== '') {
            this.playerId = existing;
            return;
        }
        const newId = this.generateUUID();
        this.playerId = newId;
        this.setStoredValue('playerId', newId);
    }
    // 获取player_id
    getPlayerId() {
        return this.playerId || this.getStoredValue('playerId');
    }
    
    // ===== 游戏设置界面管理 =====
    showGameSettings() {
        const modal = document.getElementById('gameSettingsModal');
        const nameInput = document.getElementById('settingsPlayerNameInput');
        
        // 预填当前玩家名称（大写）
        if (nameInput) {
            nameInput.value = (this.playerName || '').toUpperCase();
        }
        
        modal.style.display = 'flex';
        
        // 添加ESC键关闭
        this.settingsKeyHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeGameSettings();
            }
        };
        document.addEventListener('keydown', this.settingsKeyHandler);
    }
    
    closeGameSettings() {
        const modal = document.getElementById('gameSettingsModal');
        modal.style.display = 'none';
        
        // 移除ESC键监听
        if (this.settingsKeyHandler) {
            document.removeEventListener('keydown', this.settingsKeyHandler);
            this.settingsKeyHandler = null;
        }
    }
    
    

    
    validateSettingsName(name) {
        const input = document.getElementById('settingsPlayerNameInput');
        
        // 实时清理和转换
        const cleanedName = this.cleanName(name);
        if (cleanedName !== name) {
            input.value = cleanedName;
        }
        
        // 验证逻辑
        return this.validateName(cleanedName);
    }
    
    updatePlayerNameFromSettings() {
        const input = document.getElementById('settingsPlayerNameInput');
        const name = input.value.trim();
        
        if (!name) {
            alert('PLEASE ENTER A VALID PLAYER NAME');
            return;
        }
        
        if (this.validateName(name)) {
            const cleanedName = this.cleanName(name);
            this.savePlayerName(cleanedName);
            
            // 更新输入框显示
            input.value = cleanedName;
            
            // 显示更新成功通知
            this.showUpdateNotification('PLAYER NAME UPDATED');
        }
    }
    
    showUpdateNotification(message) {
        const updateBtn = document.getElementById('updateNameBtn');
        const originalText = updateBtn.textContent;
        
        updateBtn.textContent = '✓ 已更新';
        updateBtn.style.background = '#8bac0f';
        updateBtn.style.color = '#0f380f';
        
        setTimeout(() => {
            updateBtn.textContent = originalText;
            updateBtn.style.background = '';
            updateBtn.style.color = '';
        }, 2000);
    }
    

}

// 创建全局实例
window.playerNameManager = new PlayerNameManager();
