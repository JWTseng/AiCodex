/**
 * 经典NES俄罗斯方块 - 忠实复刻版
 * 基于1989年任天堂娱乐系统(NES)北美(NTSC)版本
 */

// 高分记录管理器
class HighScoreManager {
    constructor() {
        this.scores = this.loadScores();
    }
    
    loadScores() {
        const saved = localStorage.getItem('tetrisHighScores');
        return saved ? JSON.parse(saved) : [];
    }
    
    saveScores() {
        localStorage.setItem('tetrisHighScores', JSON.stringify(this.scores));
    }
    
    addScore(score, level, lines, duration) {
        const newScore = {
            score, level, lines, duration,
            timestamp: Date.now()
        };
        
        this.scores.push(newScore);
        this.scores.sort((a, b) => b.score - a.score);
        this.scores = this.scores.slice(0, 10); // 只保留前10名
        
        this.saveScores();
        this.updateDisplay();
    }
    
    updateDisplay() {
        const tbody = document.getElementById('highScoresBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        for (let i = 0; i < this.scores.length; i++) {
            const score = this.scores[i];
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${i + 1}</td>
                <td>${score.score.toString().padStart(6, '0')}</td>
                <td>${score.level}</td>
                <td>${score.lines}</td>
                <td>${this.formatTime(score.duration)}</td>
            `;
            
            tbody.appendChild(row);
        }
        
        // 填充空行到10条
        for (let i = this.scores.length; i < 10; i++) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${i + 1}</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
            `;
            tbody.appendChild(row);
        }
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

// 游戏计时器
class GameTimer {
    constructor() {
        this.startTime = null;
        this.endTime = null;
    }
    
    start() {
        this.startTime = Date.now();
    }
    
    end() {
        this.endTime = Date.now();
        return Math.floor((this.endTime - this.startTime) / 1000);
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

// 连击系统 - 动态累计窗口版本
class ComboSystem {
    constructor() {
        // 配置（可后续抽到全局配置）
        this.cdForLinesMs = { 1: 5000, 2: 6000, 3: 7000, 4: 8000 };
        this.maxWindowMs = 30000; // 30秒上限
        this.clutchThresholdMs = 90; // 压哨阈值 0.09s
        this.maxCombo = 999;

        // 状态
        this.comboCount = 0;
        this.remainingMs = 0;   // 窗口剩余时间（ms）
        this.timerActive = false;
        this.lastTickMs = 0;    // 上一次tick时间

        // 特效状态
        this.lastEffectComboCount = 0;
        this.isEffectPlaying = false;
    }

    // 在消行时调用，返回信息对象
    // linesCleared: 1..4, nowMs: 当前毫秒
    onLinesCleared(linesCleared, nowMs) {
        const addMs = this.cdForLinesMs[Math.min(Math.max(linesCleared,1),4)] || 0;
        const wasActive = this.timerActive && this.remainingMs >= 0;
        const isClutch = wasActive && this.remainingMs <= this.clutchThresholdMs;

        if (!wasActive || this.remainingMs < 0) {
            // 新连击
            this.comboCount = 1;
            this.remainingMs = Math.min(addMs, this.maxWindowMs);
            this.timerActive = true;
        } else {
            // 累计窗口并叠加连击
            this.comboCount = Math.min(this.comboCount + 1, this.maxCombo);
            this.remainingMs = Math.min(this.remainingMs + addMs, this.maxWindowMs);
        }

        this.lastTickMs = nowMs;

        return {
            isCombo: true,
            addedMs: addMs,
            newRemainingMs: this.remainingMs,
            isClutch
        };
    }

    // 每帧播放状态下调用
    tick(nowMs) {
        if (!this.timerActive || this.comboCount <= 0) return;
        if (!this.lastTickMs) {
            this.lastTickMs = nowMs; return;
        }
        const delta = nowMs - this.lastTickMs;
        this.remainingMs -= delta;
        this.lastTickMs = nowMs;
        if (this.remainingMs < 0) {
            this.remainingMs = -1; // 方便区分过期
            this.timerActive = false;
            this.comboCount = 0;
            // 重置特效门槛，确保下一轮 combo=2 能激活
            this.lastEffectComboCount = 0;
            this.isEffectPlaying = false;
            // 清理UI
            this.clearUI();
        }
    }

    // 是否需要触发特效
    shouldTriggerEffect() {
        return this.comboCount > this.lastEffectComboCount &&
               this.comboCount >= 2 &&
               !this.isEffectPlaying;
    }
    markEffectTriggered() {
        this.lastEffectComboCount = this.comboCount;
        this.isEffectPlaying = true;
        setTimeout(() => { this.isEffectPlaying = false; }, 1000);
    }

    getMultiplier() { return this.comboCount; }

    getTimerInfo() {
        const active = this.timerActive && this.comboCount > 0 && this.remainingMs >= 0;
        const remaining = Math.max(0, this.remainingMs) / 1000;
        return { remaining, active };
    }

    reset() {
        this.comboCount = 0;
        this.remainingMs = 0;
        this.timerActive = false;
        this.lastTickMs = 0;
        this.lastEffectComboCount = 0;
        this.isEffectPlaying = false;
        this.clearUI();
    }

    clearUI() {
        const comboDisplay = document.getElementById('comboDisplay');
        const comboTimer = document.getElementById('comboTimer');
        if (comboDisplay) comboDisplay.classList.remove('show');
        if (comboTimer) {
            comboTimer.classList.remove('show');
            comboTimer.textContent = '';
            comboTimer.style.color = 'var(--nes-light-green)';
        }
    }
}

class NESTetris {
    constructor() {
        // 游戏区域尺寸 (10x20)
        this.GRID_WIDTH = 10;
        this.GRID_HEIGHT = 20;
        this.CELL_SIZE = 40; // 40x40像素的方块，确保游戏体验
        
        // 游戏状态
        this.gameState = 'stopped'; // stopped, playing, paused, gameOver
        this.score = 0;
        this.level = 0;
        this.linesClearedTotal = 0;
        this.nextPiece = null;
        this.currentPiece = null;
        this.playfieldGrid = [];
        
        // 音频系统 - 使用全局音频管理器
        this.audio = window.globalAudioManager;
        // 调试开关（true时输出调试日志）
        this.DEBUG = false;
        if (window.GameLogger) {
            window.GameLogger.event('init', { version: 'tg3', grid: [this.GRID_WIDTH, this.GRID_HEIGHT] });
        }
        
        // 高分记录系统
        this.highScoreManager = new HighScoreManager();
        this.gameTimer = new GameTimer();
        
        // 连击系统
        this.comboSystem = new ComboSystem();
        // 连击倒计时显示与动画（UI层）
        this.displayTimerSeconds = 0; // UI显示的剩余秒
        this.timerAnim = {
            remainingToAddSec: 0, // 待滚动增加到显示上的秒数
            ratePerSec: 10,       // 每1秒增量以约0.1s完成 -> 1s/0.1s = 10 秒/秒
        };
        
        // 时序系统 (60 FPS)
        this.frameCount = 0;
        this.gravityTimer = 0;
        this.dasTimer = 0;
        this.areTimer = 0;
        this.areDelay = 0;
        
        // DAS系统 (延迟自动位移)
        this.dasInitialDelay = 16; // 初始延迟16帧
        this.dasRepeatRate = 6;    // 重复速率6帧
        this.dasDirection = 0;     // 0=无, -1=左, 1=右
        this.dasCharged = false;
        
        // 线性加速系统
        this.softDropAcceleration = 0; // 软降加速度
        this.accelerationRate = 4.8;   // 加速度增长率（每帧）- 提高一倍
        this.maxAcceleration = 500;    // 最大加速度 - 提高一倍
        this.baseSoftDropSpeed = 4;    // 基础软降速度倍数
        
        // 输入状态
        this.keys = {
            left: false,
            right: false,
            down: false,
            rotateCW: false,
            rotateCCW: false,
            pause: false,
            select: false
        };
        
        // 输入管理器
        this.inputManager = null;
        this.prevInputState = {
            enter: false,
            left: false,
            right: false,
            down: false,
            rotateCW: false,
            rotateCCW: false,
            pause: false,
            reset: false,
            musicToggle: false,
            softDrop: false,
            hardDrop: false
        };
        // 最近一次锁定原因：'gravity' | 'soft' | 'hard'
        this.lockCause = 'gravity';
        
        // 是否至少开始过一局（用于控制 NEW 按钮初始禁用状态）
        this.hasStartedAtLeastOnce = false;
        
        // 重力表 (每单元格帧数)
        this.gravityTable = [
            48, 43, 38, 33, 28, 23, 18, 13, 8, 6,  // 0-9级
            5, 5, 5, 4, 4, 4, 3, 3, 3, 2,          // 10-19级
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2,          // 20-29级
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1           // 30+级
        ];
        
        // 方块定义 (任天堂旋转系统)
        this.pieces = {
            I: {
                name: 'I',
                color: '#80ffff', // 青色，饱和度下调50%
                rotations: [
                    [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
                    [[0,0,1,0], [0,0,1,0], [0,0,1,0], [0,0,1,0]],
                    [[0,0,0,0], [0,0,0,0], [1,1,1,1], [0,0,0,0]],
                    [[0,1,0,0], [0,1,0,0], [0,1,0,0], [0,1,0,0]]
                ],
                spawnX: 3,
                spawnY: 0
            },
            O: {
                name: 'O',
                color: '#ffff80', // 黄色，饱和度下调50%
                rotations: [
                    [[1,1], [1,1]]
                ],
                spawnX: 4,
                spawnY: 0
            },
            T: {
                name: 'T',
                color: '#c080c0', // 紫色，饱和度下调50%
                rotations: [
                    [[0,1,0], [1,1,1], [0,0,0]],
                    [[0,1,0], [0,1,1], [0,1,0]],
                    [[0,0,0], [1,1,1], [0,1,0]],
                    [[0,1,0], [1,1,0], [0,1,0]]
                ],
                spawnX: 3,
                spawnY: 0
            },
            S: {
                name: 'S',
                color: '#80ff80', // 绿色，饱和度下调50%
                rotations: [
                    [[0,1,1], [1,1,0], [0,0,0]],
                    [[0,1,0], [0,1,1], [0,0,1]],
                    [[0,0,0], [0,1,1], [1,1,0]],
                    [[1,0,0], [1,1,0], [0,1,0]]
                ],
                spawnX: 3,
                spawnY: 0
            },
            Z: {
                name: 'Z',
                color: '#ff8080', // 红色，饱和度下调50%
                rotations: [
                    [[1,1,0], [0,1,1], [0,0,0]],
                    [[0,0,1], [0,1,1], [0,1,0]],
                    [[0,0,0], [1,1,0], [0,1,1]],
                    [[0,1,0], [1,1,0], [1,0,0]]
                ],
                spawnX: 3,
                spawnY: 0
            },
            J: {
                name: 'J',
                color: '#8080ff', // 蓝色，饱和度下调50%
                rotations: [
                    [[1,0,0], [1,1,1], [0,0,0]],
                    [[0,1,1], [0,1,0], [0,1,0]],
                    [[0,0,0], [1,1,1], [0,0,1]],
                    [[0,1,0], [0,1,0], [1,1,0]]
                ],
                spawnX: 3,
                spawnY: 0
            },
            L: {
                name: 'L',
                color: '#ffc080', // 橙色，饱和度下调50%
                rotations: [
                    [[0,0,1], [1,1,1], [0,0,0]],
                    [[0,1,0], [0,1,0], [0,1,1]],
                    [[0,0,0], [1,1,1], [1,0,0]],
                    [[1,1,0], [0,1,0], [0,1,0]]
                ],
                spawnX: 3,
                spawnY: 0
            }
        };
        
        // NES随机数生成器状态
        this.lastPiece = null;
        this.rngState = 0;
        

        
        // 初始化
        this.init();
    }
    
    init() {
        // 获取Canvas元素
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        // 设置Canvas尺寸以匹配游戏网格
        this.canvas.width = this.GRID_WIDTH * this.CELL_SIZE;  // 10 * 40 = 400
        this.canvas.height = 800; // 固定高度为800px
        
        // 设置下一个方块Canvas尺寸 (4x4网格，每个方块20像素)
        this.nextCanvas.width = 4 * (this.CELL_SIZE * 0.5);   // 4 * 20 = 80
        this.nextCanvas.height = 4 * (this.CELL_SIZE * 0.5);  // 4 * 20 = 80
        
        // 初始化游戏区域
        this.initPlayfield();
        
        // 初始化高分记录显示
        this.highScoreManager.updateDisplay();
        
        // 初始化输入管理器（模块化）
        this.inputManager = new InputManager({ enableKeyboard: true, enableGamepad: true, deadzone: 0.3 });
        
        // 绑定事件
        this.bindEvents();
        
        // 开始游戏循环
        this.gameLoop();
        if (window.GameLogger) window.GameLogger.event('loop-started');

        // 初始化 NEW 按钮状态（未开始过任意一局时禁用）
        this.updateNewButtonState();
    }
    
    initPlayfield() {
        // 初始化10x20的游戏网格
        this.playfieldGrid = [];
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            this.playfieldGrid[y] = [];
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                this.playfieldGrid[y][x] = null;
            }
        }
    }
    
    bindEvents() {
        // 按钮事件
        const startPauseBtn = document.getElementById('startPauseBtn');
        if (startPauseBtn) {
            startPauseBtn.addEventListener('click', () => {
                // 开始前显式预加载音频，杜绝首帧延迟
                if (this.audio && this.audio.preloadForGameStart) {
                    this.audio.preloadForGameStart();
                }
                if (this.gameState === 'stopped' || this.gameState === 'gameOver') {
                    this.startGame();
                    startPauseBtn.textContent = 'PAUSE';
                } else if (this.gameState === 'playing') {
                    this.togglePause();
                    startPauseBtn.textContent = 'RESUME';
                } else if (this.gameState === 'paused') {
                    this.togglePause();
                    startPauseBtn.textContent = 'PAUSE';
                }
            });
        }
        // NEW按钮：随时开始新局（相当于reset+start）
        const newBtn = document.getElementById('newBtn');
        if (newBtn) {
            newBtn.addEventListener('click', () => {
                this.resetGame();
                // 重置后按钮回到 START
                const sp = document.getElementById('startPauseBtn');
                if (sp) sp.textContent = 'START';
            });
        }
        
        // 音频激活事件 - 确保用户交互后激活音频
        document.addEventListener('click', () => this.activateAudio());
        document.addEventListener('keydown', () => this.activateAudio());
        
        // 音频控制事件 - 现在在start.html中处理
        // this.bindAudioControls();
    }
    
    // 激活音频系统
    activateAudio() {
        if (this.audio && this.audio.audioContext) {
            if (this.audio.audioContext.state === 'suspended') {
                this.audio.audioContext.resume().then(() => {
                    if (this.DEBUG) console.log('音频上下文已激活');
                    if (window.GameLogger) window.GameLogger.info('audio-resumed');
                }).catch(error => {
                    if (this.DEBUG) console.log('音频上下文激活失败:', error);
                    if (window.GameLogger) window.GameLogger.error('audio-resume-failed', { error: String(error) });
                });
            }
        }
    }
    
    handleInput() {
        if (!this.inputManager) return;
        
        let inputState = this.inputManager.getInputState();
        // 在手柄刚连接/断开后的短时间窗口内，忽略来自手柄的瞬时按键抖动
        if (this.inputManager.justChangedConnection && this.inputManager.justChangedConnection(800)) {
            inputState = {
                enter: false,
                left: false,
                right: false,
                down: false,
                rotateCW: false,
                rotateCCW: false,
                pause: false,
                reset: false,
                musicToggle: false,
                softDrop: false
            };
        }
        
        // 回车键开始游戏 - 在任何状态下都可以工作（边沿触发）
        if (inputState.enter && !this.prevInputState.enter) {
            if (this.gameState === 'stopped' || this.gameState === 'gameOver') {
                this.startGame();
                this.prevInputState = { ...inputState };
                return;
            }
        }
        
        // 暂停键多功能处理 - 开始/暂停/继续（防误触：仅 playing/paused 接受；stopped/gameOver 交给 Enter）
        if (inputState.pause && !this.prevInputState.pause) {
            if (this.gameState === 'playing') {
                // 暂停游戏
                this.togglePause();
            } else if (this.gameState === 'paused') {
                // 继续游戏
                this.togglePause();
            }
            this.prevInputState = { ...inputState };
            return;
        }
        
        // 重置游戏
        // 重置：仅暂停或游戏结束时允许，避免误触。长按机制在按钮层实现，这里只判断状态
        if (inputState.reset && !this.prevInputState.reset) {
            if (this.gameState === 'paused' || this.gameState === 'gameOver') {
                this.resetGame();
                this.prevInputState = { ...inputState };
                return;
            }
        }
        
        // 音乐切换
        if (inputState.musicToggle && !this.prevInputState.musicToggle) {
            this.toggleMusicWithKeyboard();
            this.prevInputState = { ...inputState };
            return;
        }
        
        // 其他输入只在游戏进行中有效
        if (this.gameState !== 'playing') return;
        
        // 边沿触发：以 prevInputState 为依据
        const justPressedLeft = inputState.left && !this.prevInputState.left;
        const justPressedRight = inputState.right && !this.prevInputState.right;
        const justPressedDown = inputState.down && !this.prevInputState.down;
        const justPressedRotateCW = inputState.rotateCW && !this.prevInputState.rotateCW;
        const justPressedRotateCCW = inputState.rotateCCW && !this.prevInputState.rotateCCW;
        const justPressedHardDrop = inputState.hardDrop && !this.prevInputState.hardDrop;

        // 处理移动输入
        if (justPressedLeft) {
            this.dasDirection = -1;
            this.dasTimer = 0;
            this.dasCharged = false;
            this.movePiece(-1, 0);
            this.inputManager.triggerVibration('move');
        }
        
        if (justPressedRight) {
            this.dasDirection = 1;
            this.dasTimer = 0;
            this.dasCharged = false;
            this.movePiece(1, 0);
            this.inputManager.triggerVibration('move');
        }
        
        if (justPressedDown) {
            this.movePiece(0, 1);
            this.lockCause = 'soft';
            this.inputManager.triggerVibration('drop');
        }
        
        // 硬降（Hard Drop）：瞬间落到底并锁定
        if (justPressedHardDrop && this.currentPiece) {
            const dropPos = this.calculateDropPosition();
            if (dropPos) {
                this.currentPiece.x = dropPos.x;
                this.currentPiece.y = dropPos.y;
                this.currentPiece.rotation = dropPos.rotation;
                // 锁定并结算
                this.lockCause = 'hard';
                this.lockPiece();
                this.inputManager.triggerVibration('drop');
                // 计分（现代规则可选）：每格+2分，这里保持NES传统不额外加分。若需要，解除下行注释并计算落差格数。
                // const delta = dropPos.y - pieceStartY; this.score += delta * 2;
            }
        }

        // 处理旋转输入
        if (justPressedRotateCW) {
            this.rotatePiece(1);
            this.inputManager.triggerVibration('rotate');
        }
        
        if (justPressedRotateCCW) {
            this.rotatePiece(-1);
            this.inputManager.triggerVibration('rotate');
        }

        // 连续态：用于重力和软降等
        this.keys.down = inputState.down;
        // 左右持续：用于DAS 判定
        this.keys.left = inputState.left;
        this.keys.right = inputState.right;
        // 旋转持续置位（不影响边沿触发）
        this.keys.rotateCW = inputState.rotateCW;
        this.keys.rotateCCW = inputState.rotateCCW;

        // 当左右释放时，复位 DAS 方向
        if (!inputState.left && this.prevInputState.left && this.dasDirection === -1) {
            this.dasDirection = 0;
        }
        if (!inputState.right && this.prevInputState.right && this.dasDirection === 1) {
            this.dasDirection = 0;
        }

        // 保存本帧输入状态
        this.prevInputState = { ...inputState };
    }
    

    
    // NES随机数生成器
    generateNextPiece() {
        let attempts = 0;
        let pieceType;
        
        do {
            if (attempts === 0) {
                // 第一次尝试: 0-7
                pieceType = this.randomInt(0, 7);
            } else {
                // 第二次尝试: 0-6
                pieceType = this.randomInt(0, 6);
            }
            
            attempts++;
        } while (pieceType === 7 || (attempts === 1 && pieceType === this.lastPiece));
        
        this.lastPiece = pieceType;
        
        const pieceNames = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
        return this.pieces[pieceNames[pieceType]];
    }
    
    randomInt(min, max) {
        // 简单的线性同余生成器模拟NES RNG
        this.rngState = (this.rngState * 1103515245 + 12345) & 0x7fffffff;
        return min + (this.rngState % (max - min + 1));
    }
    
    startGame() {
        if (window.GameLogger) window.GameLogger.event('game-start');
        this.gameState = 'playing';
        // 确保进入全新局：清理所有临时/残留UI与计时器
        this.clearTransientUI();
        // 记录已开始过至少一局，并更新 NEW 按钮可用性
        this.hasStartedAtLeastOnce = true;
        this.updateNewButtonState();
        this.score = 0;
        this.level = 0;
        this.linesClearedTotal = 0;
        this.frameCount = 0;
        this.gravityTimer = 0;
        this.dasTimer = 0;
        this.areTimer = 0;
        
        // 初始化游戏统计变量
        this.piecesPlaced = 0;
        this.tetrisCount = 0;
        this.totalCombo = 0;
        this.comboCount = 0;
        this.gameStartTime = Date.now();
        
        // 重置连击系统
        this.comboSystem.reset();
        
        this.initPlayfield();
        this.nextPiece = this.generateNextPiece();
        this.spawnNewPiece();
        
        // 启动游戏计时器
        this.gameTimer.start();
        
        // 启动背景音乐（先确保音频已就绪并预热，避免首声延迟）
        if (this.audio && this.audio.ensureAudioReady) {
            this.audio.ensureAudioReady()
                .then(() => {
                    if (this.audio.primeAudio) this.audio.primeAudio();
                    if (this.audio.playMusic) this.audio.playMusic('music1');
                })
                .catch(() => {});
        }
        
        this.updateUI();
        const sp = document.getElementById('startPauseBtn');
        if (sp) sp.textContent = 'PAUSE';
        this.hideGameOverlay();
    }
    
    // 不自动开始游戏，保留接口以兼容旧调用
    autoStart() {}
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            if (window.GameLogger) window.GameLogger.event('game-paused');
            // 暂停时重置连击
            this.comboSystem.reset();
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            if (window.GameLogger) window.GameLogger.event('game-resumed');
        }
    }
    
    resetGame() {
        if (window.GameLogger) window.GameLogger.event('game-reset');
        this.gameState = 'stopped';
        this.score = 0;
        this.level = 0;
        this.linesClearedTotal = 0;
        
        // 重置连击系统
        this.comboSystem.reset();
        
        this.initPlayfield();
        this.currentPiece = null;
        this.nextPiece = null;
        
        // 停止音乐
        this.audio.stopMusic();
        
        this.updateUI();
        const sp = document.getElementById('startPauseBtn');
        if (sp) sp.textContent = 'START';
        this.clearTransientUI();
        this.hideGameOverlay();
        // 保持 NEW 按钮在已开始过后可用
        this.updateNewButtonState();
    }
    
    spawnNewPiece() {
        if (window.GameLogger) window.GameLogger.event('spawn', { next: this.nextPiece && this.nextPiece.name });
        this.currentPiece = {
            type: this.nextPiece,
            x: this.nextPiece.spawnX,
            y: this.nextPiece.spawnY,
            rotation: 0
        };
        
        this.nextPiece = this.generateNextPiece();
        
        // 检查游戏结束
        if (this.checkCollision(this.currentPiece)) {
            this.gameOver();
        }
        
        // 计算ARE延迟
        this.calculateAREDelay();
        this.areTimer = this.areDelay;
    }
    
    calculateAREDelay() {
        // ARE延迟基于锁定高度
        const lockHeight = this.currentPiece.y;
        if (lockHeight >= this.GRID_HEIGHT - 2) {
            this.areDelay = 10; // 最下面两行
        } else {
            const heightGroup = Math.floor((this.GRID_HEIGHT - 2 - lockHeight) / 4);
            this.areDelay = 10 + (heightGroup * 2);
        }
    }
    
    checkCollision(piece, dx = 0, dy = 0, drotation = 0) {
        const newX = piece.x + dx;
        const newY = piece.y + dy;
        const newRotation = (piece.rotation + drotation + 4) % 4;
        const shape = piece.type.rotations[newRotation];
        
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const gridX = newX + x;
                    const gridY = newY + y;
                    
                    if (gridX < 0 || gridX >= this.GRID_WIDTH || 
                        gridY >= this.GRID_HEIGHT ||
                        (gridY >= 0 && this.playfieldGrid[gridY][gridX] !== null)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    movePiece(dx, dy) {
        if (!this.currentPiece) return false;
        
        if (!this.checkCollision(this.currentPiece, dx, dy)) {
            this.currentPiece.x += dx;
            this.currentPiece.y += dy;
            
            // 播放移动音效 - 恢复所有移动音效
            if (dx !== 0 || dy !== 0) {
                this.audio.playSFX('move');
            }
            
            return true;
        }
        return false;
    }
    
    rotatePiece(direction) {
        if (!this.currentPiece) return;
        
        if (!this.checkCollision(this.currentPiece, 0, 0, direction)) {
            this.currentPiece.rotation = (this.currentPiece.rotation + direction + 4) % 4;
            // 播放旋转音效
            this.audio.playSFX('rotate');
        }
    }
    
    lockPiece() {
        if (!this.currentPiece) return;
        
        const shape = this.currentPiece.type.rotations[this.currentPiece.rotation];
        
        // 统计放置的方块数
        let pieceBlocks = 0;
        
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const gridX = this.currentPiece.x + x;
                    const gridY = this.currentPiece.y + y;
                    
                    if (gridY >= 0) {
                        this.playfieldGrid[gridY][gridX] = this.currentPiece.type;
                        pieceBlocks++;
                    }
                }
            }
        }
        
        // 更新统计
        this.piecesPlaced += pieceBlocks;
        
        // 播放锁定音效（区分重力/软降/硬降）
        if (this.lockCause === 'hard') {
            this.audio.playSFX('hardlock');
            // 硬降落地：轻微窗口抖动（强度低于连击）
            this.screenShakeHardDrop();
        } else if (this.lockCause === 'soft') {
            this.audio.playSFX('softlock');
        } else {
            this.audio.playSFX('lock');
        }
        // 重置锁因
        this.lockCause = 'gravity';
        
        this.clearLines();
        this.spawnNewPiece();
    }
    
    clearLines() {
        let linesCleared = 0;
        const eliminatedRows = []; // 记录消除的行位置
        
        for (let y = this.GRID_HEIGHT - 1; y >= 0; y--) {
            let lineFull = true;
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                if (this.playfieldGrid[y][x] === null) {
                    lineFull = false;
                    break;
                }
            }
            
            if (lineFull) {
                // 记录消除的行位置
                eliminatedRows.push(y);
                // 移除该行
                this.playfieldGrid.splice(y, 1);
                // 在顶部添加新行
                this.playfieldGrid.unshift(new Array(this.GRID_WIDTH).fill(null));
                linesCleared++;
                y++; // 重新检查同一行
            }
        }
        
        if (linesCleared > 0) {
            this.linesClearedTotal += linesCleared;
            
            // 统计Tetris次数（一次消除4行）
            if (linesCleared === 4) {
                this.tetrisCount++;
            }
            
            this.updateScore(linesCleared, eliminatedRows);
            this.updateLevel();
            
            // 播放消行音效
            this.audio.playSFX('line');
            
            // 触发手柄振动
            if (this.inputManager) {
                this.inputManager.triggerVibration('lineClear');
            }
        }
    }
    
    updateScore(linesCleared, eliminatedRows = []) {
        const nowMs = Date.now();
        // 新的动态窗口：叠加CD并获取压哨判定
        const lines = Math.max(1, Math.min(4, linesCleared));
        const comboInfo = this.comboSystem.onLinesCleared(lines, nowMs);
        const isCombo = true;
        const isClutch = comboInfo.isClutch === true; // 0.00~0.09s 压哨
        // 启动/叠加倒计时显示动画
        const addedSec = (comboInfo.addedMs || 0) / 1000;
        if (addedSec > 0) {
            // 将当前模型剩余时间作为显示基线（避免显示落后模型过多）
            this.displayTimerSeconds = Math.max(this.displayTimerSeconds, Math.max(0, this.comboSystem.remainingMs) / 1000);
            this.timerAnim.remainingToAddSec = Math.min(
                (this.timerAnim.remainingToAddSec || 0) + addedSec,
                30 - this.displayTimerSeconds
            );
        } else {
            // 没有增加，直接同步到模型（避免漂移）
            this.displayTimerSeconds = Math.max(0, this.comboSystem.remainingMs) / 1000;
        }
        
        // 统计连击数据（内部统计，不影响显示规则）
        if (isCombo) {
            this.totalCombo += this.comboSystem.comboCount;
            this.comboCount++;
        }
        
        // NES得分公式 + 连击倍数
        const baseScores = [0, 40, 100, 300, 1200];
        const baseScore = baseScores[linesCleared];
        const levelMultiplier = this.level + 1;
        const comboMultiplier = this.comboSystem.getMultiplier();
        
        // 最终得分
        let finalScore = baseScore * levelMultiplier * comboMultiplier;
        if (isClutch) {
            finalScore *= 2; // 压哨×2
        }
        this.score += finalScore;
        
        // 软降得分
        if (this.keys.down) {
            this.score += 1;
        }
        
        // 限制最大分数
        if (this.score > 999999) {
            this.score = 999999;
        }
        
        // 触发连击特效（仅在 combo>=2 才显示，combo=1 作为预报态不显示）
        if (this.comboSystem.getMultiplier() >= 2 && this.comboSystem.shouldTriggerEffect()) {
            if (this.DEBUG) console.log(`触发${this.comboSystem.comboCount}连击特效`);
            this.triggerComboEffects(this.comboSystem.comboCount, { clutch: isClutch });
            this.comboSystem.markEffectTriggered();
        }
        
        // 调试信息
        const timerInfo = this.comboSystem.getTimerInfo();
        if (this.DEBUG) console.log(`消除${linesCleared}行，连击数${this.comboSystem.comboCount}，倍数x${comboMultiplier}，得分${finalScore}，剩余时间${timerInfo.remaining.toFixed(3)}秒，压哨${isClutch}`);
    }
    

    

    
    updateLevel() {
        const newLevel = Math.floor(this.linesClearedTotal / 10);
        if (newLevel !== this.level) {
            this.level = newLevel;
            // 播放升级音效
            this.audio.playSFX('levelup');
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        
        // 重置连击系统
        this.comboSystem.reset();
        
        // 计算游戏时长并保存高分记录
        const gameDuration = this.gameTimer.end();
        this.highScoreManager.addScore(this.score, this.level, this.linesClearedTotal, gameDuration);
        
        // 提交成绩到全球排行榜
        this.submitScoreToLeaderboard(gameDuration);
        // 显示上传状态占位（提交中）
        const overlay = document.getElementById('gameOverlay');
        if (overlay) overlay.style.display = 'flex';
        this.showUploadStatus('God is watching you...', false);
        
        // 播放游戏结束音效
        this.audio.playSFX('gameover');
        this.audio.stopMusic();
        
        // 触发手柄振动
        if (this.inputManager) {
            this.inputManager.triggerVibration('gameOver');
        }
        
        document.getElementById('gameOverlay').style.display = 'flex';
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
    }
    
    // 提交成绩到全球排行榜
    async submitScoreToLeaderboard(gameDuration) {
        if (!window.scoreSubmissionManager) {
            console.warn('Score submission manager not available');
            return;
        }
        
        try {
            const scoreData = {
                score: this.score,
                level: this.level,
                lines: this.linesClearedTotal,
                duration: gameDuration * 1000, // 转换为毫秒
                playerName: window.playerNameManager ? window.playerNameManager.getPlayerName() : 'Anonymous'
            };
            
            console.log('Submitting score to leaderboard:', scoreData);
            
            const result = await window.scoreSubmissionManager.submitScore(scoreData);
            
            if (result.success) {
                console.log('Score submitted successfully');
                
                // 检查是否进入Top50并更新玩家名字显示
                if (window.playerNameManager && window.playerNameManager.updateTop50Status) {
                    const isInTop50 = await window.scoreSubmissionManager.isInTop50(this.score);
                    window.playerNameManager.updateTop50Status(isInTop50);
                }
                
                // 刷新排行榜
                if (window.tetrisWorldLeaderboard) {
                    window.tetrisWorldLeaderboard.loadWorldScores();
                }
                // 更新上传状态提示（成功）
                this.showUploadStatus('Congratulations, you\'ve earned a place.', false);
            } else {
                console.error('Score submission failed:', result.error);
                // 上传失败提示
                this.showUploadStatus('You need to try harder.', true);
            }
        } catch (error) {
            console.error('Error submitting score:', error);
            // 上传错误提示
            this.showUploadStatus('You need to try harder.', true);
        }
    }

    // 显示上传状态
    // 默认总显示时长：2.5s（2.0s后开始淡出，0.5s隐藏）
    // 成功文案“Congratulations, you've earned a place.”：延长到5s
    // 文案“God is watching you...”采用打字机效果，逐字出现，打字结束后停留1.5s再淡出
    showUploadStatus(text, isError = false) {
        const upload = document.getElementById('uploadStatus');
        if (!upload) return;

        // 清理计时器/打字机
        if (this._uploadFadeTimer) clearTimeout(this._uploadFadeTimer);
        if (this._uploadHideTimer) clearTimeout(this._uploadHideTimer);
        if (this._typingInterval) clearInterval(this._typingInterval);

        // 统一样式
        if (isError) upload.classList.add('error'); else upload.classList.remove('error');
        upload.style.display = 'block';
        // 强制回流，确保过渡生效
        // eslint-disable-next-line no-unused-expressions
        upload.offsetHeight;
        upload.style.opacity = '1';

        // 成功提示延长到5秒
        const SUCCESS_TEXT = "Congratulations,!\nyou've earned a place.";
        const TYPING_TEXT = 'God is watching you...';

        // 处理打字机效果
        if (text === TYPING_TEXT) {
            const fullText = TYPING_TEXT;
            const typeSpeedMs = 70; // 每字符70ms，流畅不拖沓
            const postHoldMs = 1500; // 打字结束后停留1.5s
            upload.textContent = '';

            let index = 0;
            this._typingInterval = setInterval(() => {
                index += 1;
                upload.textContent = fullText.slice(0, index);
                if (index >= fullText.length) {
                    clearInterval(this._typingInterval);
                    this._typingInterval = null;
                    // 打字结束后等待再淡出
                    this._uploadFadeTimer = setTimeout(() => {
                        upload.style.opacity = '0';
                    }, postHoldMs);
                    this._uploadHideTimer = setTimeout(() => {
                        upload.style.display = 'none';
                        upload.style.opacity = '';
                        upload.classList.remove('error');
                    }, postHoldMs + 500);
                }
            }, typeSpeedMs);
            return;
        }

        // 非打字机文案：立即显示完整文本并按时长淡出
        upload.textContent = text;

        // 基础显示总时长（含0.5s淡出）
        let totalDurationMs = 2500; // 默认2.5s
        if (!isError && text === SUCCESS_TEXT) {
            totalDurationMs = 5000; // 成功提示延长到5s
        }

        const fadeStartMs = Math.max(0, totalDurationMs - 500);
        this._uploadFadeTimer = setTimeout(() => {
            upload.style.opacity = '0';
        }, fadeStartMs);

        this._uploadHideTimer = setTimeout(() => {
            upload.style.display = 'none';
            upload.style.opacity = '';
            upload.classList.remove('error');
        }, totalDurationMs);
    }

    // 隐藏游戏结束覆盖层并清理上传提示与计时器
    hideGameOverlay() {
        try {
            const overlay = document.getElementById('gameOverlay');
            const upload = document.getElementById('uploadStatus');
            const gameOverText = overlay ? overlay.querySelector('.game-over-text') : null;

            // 停止仍在进行的打字/淡出计时器，避免回退后又把提示显示回来
            if (this._uploadFadeTimer) { clearTimeout(this._uploadFadeTimer); this._uploadFadeTimer = null; }
            if (this._uploadHideTimer) { clearTimeout(this._uploadHideTimer); this._uploadHideTimer = null; }
            if (this._typingInterval) { clearInterval(this._typingInterval); this._typingInterval = null; }

            if (upload) {
                upload.style.display = 'none';
                upload.style.opacity = '';
                upload.classList.remove('error');
                upload.textContent = '';
            }

            if (overlay) {
                overlay.style.display = 'none';
            }

            if (gameOverText) {
                // 确保下一次展示时仍可见（只隐藏 overlay，不单独隐藏文本）
                // 这里不改 display，保持由 overlay 控制
            }
        } catch (_) {
            // 忽略任何清理异常，避免阻断启动流程
        }
    }

    // 根据是否至少开始过一局，控制 NEW 按钮可用性
    updateNewButtonState() {
        const newBtn = document.getElementById('newBtn');
        if (!newBtn) return;
        // 未开始过任何一局时禁用，开始过后始终可用
        newBtn.disabled = !this.hasStartedAtLeastOnce;
    }

    // 清理所有临时/残留UI（确保新开局为全新状态）
    clearTransientUI() {
        try {
            // 1) 覆盖层与上传提示（计时器/打字机在 hideGameOverlay 中清理，这里再兜底一次）
            this.hideGameOverlay();

            // 2) 移除连击粒子
            const gameArea = document.querySelector('.game-area');
            if (gameArea) {
                const particles = gameArea.querySelectorAll('.combo-particle');
                particles.forEach(p => p.remove());
                // 3) 复位 game-area 位移（防屏幕震动残留）
                gameArea.style.transform = 'translate(0, 0)';
            }

            // 4) 连击 UI 复位
            const comboDisplay = document.getElementById('comboDisplay');
            if (comboDisplay) {
                comboDisplay.classList.remove('show');
                comboDisplay.textContent = '';
                comboDisplay.style.opacity = '';
            }
            const comboTimer = document.getElementById('comboTimer');
            if (comboTimer) {
                comboTimer.classList.remove('show');
                comboTimer.textContent = '';
                comboTimer.style.opacity = '0';
                comboTimer.style.color = 'var(--nes-light-green)';
            }
        } catch (_) {
            // 忽略任何清理异常
        }
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score.toString().padStart(6, '0');
        document.getElementById('level').textContent = this.level.toString();
        document.getElementById('lines').textContent = this.linesClearedTotal.toString();
        
        // 更新连击UI（combo=1不显示任何数字/倒计时；combo>=2显示）
        this.updateComboUI();
    }
    
    render() {
        // 清空画布
        this.ctx.fillStyle = '#0f380f';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制游戏区域网格
        this.renderGrid();
        
        // 绘制当前方块
        if (this.currentPiece) {
            // 绘制下落指示线和位置预测
            this.renderDropIndicator();
            this.renderPiece(this.currentPiece, this.ctx);
        }
        
        // 绘制下一个方块
        this.renderNextPiece();
    }
    
    renderGrid() {
        for (let y = 0; y < this.GRID_HEIGHT; y++) {
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                const cell = this.playfieldGrid[y][x];
                if (cell) {
                    this.ctx.fillStyle = cell.color;
                    this.ctx.fillRect(
                        x * this.CELL_SIZE,
                        y * this.CELL_SIZE,
                        this.CELL_SIZE,
                        this.CELL_SIZE
                    );
                    
                    // 绘制边框
                    this.ctx.strokeStyle = '#0f380f';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(
                        x * this.CELL_SIZE,
                        y * this.CELL_SIZE,
                        this.CELL_SIZE,
                        this.CELL_SIZE
                    );
                }
            }
        }
    }
    
    renderPiece(piece, context) {
        const shape = piece.type.rotations[piece.rotation];
        
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    context.fillStyle = piece.type.color;
                    context.fillRect(
                        (piece.x + x) * this.CELL_SIZE,
                        (piece.y + y) * this.CELL_SIZE,
                        this.CELL_SIZE,
                        this.CELL_SIZE
                    );
                    
                    // 绘制边框
                    context.strokeStyle = '#0f380f';
                    context.lineWidth = 1;
                    context.strokeRect(
                        (piece.x + x) * this.CELL_SIZE,
                        (piece.y + y) * this.CELL_SIZE,
                        this.CELL_SIZE,
                        this.CELL_SIZE
                    );
                }
            }
        }
    }
    
    renderNextPiece() {
        if (!this.nextPiece) return;
        
        // 清空下一个方块画布
        this.nextCtx.fillStyle = '#0f380f';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        
        // 获取方块形状和尺寸
        const shape = this.nextPiece.rotations[0];
        const shapeWidth = shape[0].length;
        const shapeHeight = shape.length;
        
        // Next窗口是4x4网格，每个方块20像素
        const nextWindowSize = 4;
        const nextCellSize = this.CELL_SIZE * 0.5; // 20像素
        
        // 计算窗口中心点 (4x4网格的中心是(2, 2))
        const windowCenterX = 2;
        const windowCenterY = 2;
        
        // 计算方块中心点
        const pieceCenterX = shapeWidth / 2;
        const pieceCenterY = shapeHeight / 2;
        
        // 计算偏移量：窗口中心 - 方块中心
        const offsetX = windowCenterX - pieceCenterX;
        const offsetY = windowCenterY - pieceCenterY;
        
        // 渲染方块
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const renderX = (offsetX + x) * nextCellSize;
                    const renderY = (offsetY + y) * nextCellSize;
                    
                    // 填充方块
                    this.nextCtx.fillStyle = this.nextPiece.color;
                    this.nextCtx.fillRect(renderX, renderY, nextCellSize, nextCellSize);
                    
                    // 绘制边框
                    this.nextCtx.strokeStyle = '#0f380f';
                    this.nextCtx.lineWidth = 1;
                    this.nextCtx.globalAlpha = 1.0; // 设置不透明度为100%（完全清晰）
                    this.nextCtx.strokeRect(renderX, renderY, nextCellSize, nextCellSize);
                    this.nextCtx.globalAlpha = 1.0; // 重置透明度
                    
                    // 调试信息
                    if (this.DEBUG) console.log(`${this.nextPiece.name}方块渲染位置: (${renderX}, ${renderY}), 偏移: (${offsetX}, ${offsetY}), 方块中心: (${pieceCenterX}, ${pieceCenterY})`);
                }
            }
        }
    }
    
    gameLoop() {
        try {
            // 处理输入
            this.handleInput();
            
            if (this.gameState === 'playing') {
                this.update();
            }
            
            this.render();
            this.updateUI();
            
            // 更新手柄状态显示
            if (this.inputManager) {
                this.inputManager.updateStatus();
            }
        } catch (e) {
            if (window.GameLogger) window.GameLogger.error('tick-exception', { message: e && e.message, stack: e && e.stack });
        } finally {
            requestAnimationFrame(() => this.gameLoop());
        }
    }
    
    update() {
        this.frameCount++;
        
        // 处理ARE延迟
        if (this.areTimer > 0) {
            this.areTimer--;
            // 在ARE延迟期间仍然处理输入
            this.updateDAS();
            return;
        }
        
        // 处理DAS系统
        this.updateDAS();
        
        // 处理重力
        this.updateGravity();

        // 连击窗口倒计时（仅在进行中）
        this.comboSystem.tick(Date.now());
    }
    
    updateDAS() {
        if (this.dasDirection !== 0) {
            if (!this.dasCharged) {
                this.dasTimer++;
                if (this.dasTimer >= this.dasInitialDelay) {
                    this.dasCharged = true;
                    this.dasTimer = 0;
                }
            } else {
                this.dasTimer++;
                if (this.dasTimer >= this.dasRepeatRate) {
                    this.movePiece(this.dasDirection, 0);
                    this.dasTimer = 0;
                }
            }
        }
    }
    
    updateGravity() {
        const gravityFrames = this.gravityTable[Math.min(this.level, this.gravityTable.length - 1)];
        
        // 处理软降线性加速
        if (this.keys.down) {
            // 增加加速度
            this.softDropAcceleration = Math.min(this.softDropAcceleration + this.accelerationRate, this.maxAcceleration);
            
            // 计算基于等级的基础软降速度
            const levelBasedSoftDropSpeed = Math.max(2, Math.floor(gravityFrames / 10));
            
            // 计算当前软降速度
            const currentSoftDropSpeed = levelBasedSoftDropSpeed + this.softDropAcceleration;
            
            // 应用软降速度
            this.gravityTimer += currentSoftDropSpeed;
        } else {
            // 松开按键时重置加速度
            this.softDropAcceleration = 0;
            this.gravityTimer += 1;
        }
        
        if (this.gravityTimer >= gravityFrames) {
            if (!this.movePiece(0, 1)) {
                this.lockPiece();
            }
            this.gravityTimer = 0;
        }
    }
    
    toggleNextDisplay() {
        // 切换NEXT预览显示 (Select键功能)
        const nextSection = document.querySelector('.next-piece-section');
        nextSection.style.display = nextSection.style.display === 'none' ? 'block' : 'none';
    }
    
    bindAudioControls() {
        // 主音量控制
        const masterVolumeSlider = document.getElementById('masterVolume');
        const masterVolumeValue = document.getElementById('masterVolumeValue');
        
        masterVolumeSlider.addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            this.audio.setMasterVolume(volume);
            masterVolumeValue.textContent = e.target.value + '%';
        });
        
        // 音乐音量控制
        const musicVolumeSlider = document.getElementById('musicVolume');
        const musicVolumeValue = document.getElementById('musicVolumeValue');
        
        musicVolumeSlider.addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            this.audio.setMusicVolume(volume);
            musicVolumeValue.textContent = e.target.value + '%';
        });
        
        // 音效音量控制
        const sfxVolumeSlider = document.getElementById('sfxVolume');
        const sfxVolumeValue = document.getElementById('sfxVolumeValue');
        
        sfxVolumeSlider.addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            this.audio.setSFXVolume(volume);
            sfxVolumeValue.textContent = e.target.value + '%';
        });
        
        // 音乐开关
        const musicToggle = document.getElementById('musicToggle');
        musicToggle.addEventListener('change', (e) => {
            this.audio.toggleMusic(e.target.checked);
            this.updateMusicToggleStatus(e.target.checked);
        });
        
        // 音效开关
        const sfxToggle = document.getElementById('sfxToggle');
        sfxToggle.addEventListener('change', (e) => {
            this.audio.toggleSFX(e.target.checked);
        });
        
        // 初始化音频设置
        this.initializeAudioSettings();
    }
    
    // 初始化音频设置
    initializeAudioSettings() {
        // 设置默认音量
        this.audio.setMasterVolume(0.3); // 30%
        this.audio.setMusicVolume(0.3);  // 30%
        
        // 设置音乐为关闭状态
        const musicToggle = document.getElementById('musicToggle');
        this.audio.toggleMusic(false);
        this.updateMusicToggleStatus(false);
    }
    
    // 更新音乐开关状态显示
    updateMusicToggleStatus(enabled) {
        const musicToggle = document.getElementById('musicToggle');
        const musicLabel = musicToggle.nextElementSibling;
        
        if (enabled) {
            musicLabel.textContent = '音乐 ON';
            musicLabel.style.background = '#8bac0f';
            musicLabel.style.color = '#0f380f';
        } else {
            musicLabel.textContent = '音乐 OFF';
            musicLabel.style.background = '#306230';
            musicLabel.style.color = '#ffffff';
        }
    }
    
    // 键盘切换音乐开关
    toggleMusicWithKeyboard() {
        const musicToggle = document.getElementById('musicToggle');
        musicToggle.checked = !musicToggle.checked;
        this.audio.toggleMusic(musicToggle.checked);
        this.updateMusicToggleStatus(musicToggle.checked);
    }
    
    // 计算方块的落点位置
    calculateDropPosition() {
        if (!this.currentPiece) return null;
        
        const shape = this.currentPiece.type.rotations[this.currentPiece.rotation];
        let dropY = this.currentPiece.y;
        
        // 从当前位置向下移动，直到碰到障碍物
        while (dropY < this.GRID_HEIGHT) {
            // 检查下一个位置是否会发生碰撞
            let collision = false;
            for (let y = 0; y < shape.length; y++) {
                for (let x = 0; x < shape[y].length; x++) {
                    if (shape[y][x]) {
                        const newY = dropY + y + 1;
                        const newX = this.currentPiece.x + x;
                        
                        // 检查边界
                        if (newY >= this.GRID_HEIGHT || newX < 0 || newX >= this.GRID_WIDTH) {
                            collision = true;
                            break;
                        }
                        
                        // 检查与其他方块的碰撞
                        if (newY >= 0 && this.playfieldGrid[newY][newX]) {
                            collision = true;
                            break;
                        }
                    }
                }
                if (collision) break;
            }
            
            if (collision) break;
            dropY++;
        }
        
        return {
            type: this.currentPiece.type,
            x: this.currentPiece.x,
            y: dropY,
            rotation: this.currentPiece.rotation
        };
    }
    
    // 获取方块的边界信息，包括指示线对齐位置
    getPieceBounds(piece) {
        const shape = piece.type.rotations[piece.rotation];
        let leftBound = shape[0].length;
        let rightBound = 0;
        let bottomBound = 0;
        let topBound = shape.length;
        
        // 找到方块的边界
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    leftBound = Math.min(leftBound, x);
                    rightBound = Math.max(rightBound, x);
                    bottomBound = Math.max(bottomBound, y);
                    topBound = Math.min(topBound, y);
                }
            }
        }
        
        // 计算指示线对齐位置
        const leftLineStart = this.calculateLeftLineStart(piece, shape, topBound, bottomBound);
        const rightLineStart = this.calculateRightLineStart(piece, shape, topBound, bottomBound);
        
        return {
            left: piece.x + leftBound,
            right: piece.x + rightBound,
            bottom: piece.y + bottomBound,
            top: piece.y + topBound,
            leftLineStart: leftLineStart,
            rightLineStart: rightLineStart
        };
    }
    
    // 计算左边指示线的起始位置
    calculateLeftLineStart(piece, shape, topBound, bottomBound) {
        const pieceType = piece.type.name;
        const rotation = piece.rotation;
        
        // 对于大多数方块，左边线从底部开始
        let startY = piece.y + bottomBound;
        
        // 特殊处理某些方块类型
        switch (pieceType) {
            case 'I':
                // I方块：水平时从顶部开始，垂直时从底部开始
                if (rotation === 0 || rotation === 2) {
                    startY = piece.y + topBound; // 水平状态
                } else {
                    startY = piece.y + bottomBound; // 垂直状态
                }
                break;
            case 'O':
                // O方块：从顶部开始
                startY = piece.y + topBound;
                break;
            case 'T':
            case 'S':
            case 'Z':
            case 'J':
            case 'L':
                // 这些方块根据形状结构确定起始位置
                startY = this.calculateComplexLeftLineStart(piece, shape, topBound, bottomBound);
                break;
        }
        
        return startY;
    }
    
    // 计算右边指示线的起始位置
    calculateRightLineStart(piece, shape, topBound, bottomBound) {
        const pieceType = piece.type.name;
        const rotation = piece.rotation;
        
        // 对于大多数方块，右边线从底部开始
        let startY = piece.y + bottomBound;
        
        // 特殊处理某些方块类型
        switch (pieceType) {
            case 'I':
                // I方块：水平时从顶部开始，垂直时从底部开始
                if (rotation === 0 || rotation === 2) {
                    startY = piece.y + topBound; // 水平状态
                } else {
                    startY = piece.y + bottomBound; // 垂直状态
                }
                break;
            case 'O':
                // O方块：从顶部开始
                startY = piece.y + topBound;
                break;
            case 'T':
            case 'S':
            case 'Z':
            case 'J':
            case 'L':
                // 这些方块根据形状结构确定起始位置
                startY = this.calculateComplexRightLineStart(piece, shape, topBound, bottomBound);
                break;
        }
        
        return startY;
    }
    
    // 计算复杂方块的左边线起始位置
    calculateComplexLeftLineStart(piece, shape, topBound, bottomBound) {
        const pieceType = piece.type.name;
        const rotation = piece.rotation;
        
        // 特殊处理S和Z方块
        if (pieceType === 'S' || pieceType === 'Z') {
            return this.calculateSZSpecificLeftLineStart(piece, shape, topBound, bottomBound, rotation);
        }
        
        // 找到左边最上方的方块位置
        let leftTopY = topBound;
        for (let y = topBound; y <= bottomBound; y++) {
            if (shape[y][0]) { // 检查最左边的列
                leftTopY = y;
                break;
            }
        }
        
        return piece.y + leftTopY;
    }
    
    // 计算复杂方块的右边线起始位置
    calculateComplexRightLineStart(piece, shape, topBound, bottomBound) {
        const pieceType = piece.type.name;
        const rotation = piece.rotation;
        
        // 特殊处理S和Z方块
        if (pieceType === 'S' || pieceType === 'Z') {
            return this.calculateSZSpecificRightLineStart(piece, shape, topBound, bottomBound, rotation);
        }
        
        // 找到右边最上方的方块位置
        let rightTopY = topBound;
        const rightCol = shape[0].length - 1;
        
        for (let y = topBound; y <= bottomBound; y++) {
            if (shape[y][rightCol]) { // 检查最右边的列
                rightTopY = y;
                break;
            }
        }
        
        return piece.y + rightTopY;
    }
    
    // S方块特定的左边线起始位置计算
    calculateSZSpecificLeftLineStart(piece, shape, topBound, bottomBound, rotation) {
        // S方块的形状分析：
        // 旋转0: [[0,1,1], [1,1,0], [0,0,0]] - 左边从第1行开始
        // 旋转1: [[0,1,0], [0,1,1], [0,0,1]] - 左边从第0行开始
        // 旋转2: [[0,0,0], [0,1,1], [1,1,0]] - 左边从第1行开始
        // 旋转3: [[1,0,0], [1,1,0], [0,1,0]] - 左边从第0行开始
        
        // Z方块的形状分析：
        // 旋转0: [[1,1,0], [0,1,1], [0,0,0]] - 左边从第0行开始
        // 旋转1: [[0,0,1], [0,1,1], [0,1,0]] - 左边从第1行开始
        // 旋转2: [[0,0,0], [1,1,0], [0,1,1]] - 左边从第1行开始
        // 旋转3: [[0,1,0], [1,1,0], [1,0,0]] - 左边从第0行开始
        
        let startY = topBound;
        
        // 根据旋转状态确定起始位置
        if (piece.type.name === 'S') {
            if (rotation === 0 || rotation === 2) {
                startY = topBound + 1; // 从第1行开始
            } else {
                startY = topBound; // 从第0行开始
            }
        } else if (piece.type.name === 'Z') {
            if (rotation === 0 || rotation === 2) {
                startY = topBound; // 从第0行开始
            } else {
                startY = topBound + 1; // 从第1行开始
            }
        }
        
        return piece.y + startY;
    }
    
    // S方块特定的右边线起始位置计算
    calculateSZSpecificRightLineStart(piece, shape, topBound, bottomBound, rotation) {
        // S方块的形状分析：
        // 旋转0: [[0,1,1], [1,1,0], [0,0,0]] - 右边从第0行开始
        // 旋转1: [[0,1,0], [0,1,1], [0,0,1]] - 右边从第1行开始
        // 旋转2: [[0,0,0], [0,1,1], [1,1,0]] - 右边从第0行开始
        // 旋转3: [[1,0,0], [1,1,0], [0,1,0]] - 右边从第1行开始
        
        // Z方块的形状分析：
        // 旋转0: [[1,1,0], [0,1,1], [0,0,0]] - 右边从第1行开始
        // 旋转1: [[0,0,1], [0,1,1], [0,1,0]] - 右边从第0行开始
        // 旋转2: [[0,0,0], [1,1,0], [0,1,1]] - 右边从第1行开始
        // 旋转3: [[0,1,0], [1,1,0], [1,0,0]] - 右边从第0行开始
        
        let startY = topBound;
        
        // 根据旋转状态确定起始位置
        if (piece.type.name === 'S') {
            if (rotation === 0 || rotation === 2) {
                startY = topBound; // 从第0行开始
            } else {
                startY = topBound + 1; // 从第1行开始
            }
        } else if (piece.type.name === 'Z') {
            if (rotation === 0 || rotation === 2) {
                startY = topBound + 1; // 从第1行开始
            } else {
                startY = topBound; // 从第0行开始
            }
        }
        
        return piece.y + startY;
    }
    
    // 绘制下落指示线和位置预测
    renderDropIndicator() {
        if (!this.currentPiece) return;
        
        const dropPosition = this.calculateDropPosition();
        if (!dropPosition) return;
        
        const currentBounds = this.getPieceBounds(this.currentPiece);
        const dropBounds = this.getPieceBounds(dropPosition);
        
        // 计算指示线位置 - 与方块边缘完全对齐
        const leftX = currentBounds.left * this.CELL_SIZE;
        const rightX = (currentBounds.right + 1) * this.CELL_SIZE;
        
        // 计算起点和终点 - 使用智能对齐位置
        const leftStartY = currentBounds.leftLineStart * this.CELL_SIZE;
        const rightStartY = currentBounds.rightLineStart * this.CELL_SIZE;
        const leftEndY = dropBounds.leftLineStart * this.CELL_SIZE;
        const rightEndY = dropBounds.rightLineStart * this.CELL_SIZE;
        
        // 绘制带透明度渐变的指示线
        this.renderGradientLine(leftX, leftStartY, leftEndY, 'left');
        this.renderGradientLine(rightX, rightStartY, rightEndY, 'right');
        
        // 绘制位置预测轮廓
        this.renderDropPreview(dropPosition);
    }
    
    // 绘制带透明度渐变的指示线
    renderGradientLine(x, startY, endY, side) {
        const segments = 20; // 将线条分成20段
        const segmentHeight = (endY - startY) / segments;
        
        // 设置虚线样式
        this.ctx.setLineDash([5, 5]);
        this.ctx.lineWidth = 2;
        
        for (let i = 0; i < segments; i++) {
            const y1 = startY + i * segmentHeight;
            const y2 = startY + (i + 1) * segmentHeight;
            
            // 计算当前段的透明度 - 从100%渐变到10%
            const alpha = 1.0 - (i / segments) * 0.9; // 从1.0渐变到0.1
            
            this.ctx.strokeStyle = `rgba(139, 172, 15, ${alpha})`;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, y1);
            this.ctx.lineTo(x, y2);
            this.ctx.stroke();
        }
        
        // 重置虚线样式
        this.ctx.setLineDash([]);
    }
    
    // 绘制落点预测轮廓
    renderDropPreview(dropPosition) {
        const shape = dropPosition.type.rotations[dropPosition.rotation];
        
        // 设置半透明效果
        this.ctx.globalAlpha = 0.15;
        
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    this.ctx.fillStyle = this.currentPiece.type.color;
                    this.ctx.fillRect(
                        (dropPosition.x + x) * this.CELL_SIZE,
                        (dropPosition.y + y) * this.CELL_SIZE,
                        this.CELL_SIZE,
                        this.CELL_SIZE
                    );
                    
                    // 绘制边框
                    this.ctx.strokeStyle = 'rgba(139, 172, 15, 0.8)';
                    this.ctx.lineWidth = 1;
                    this.ctx.strokeRect(
                        (dropPosition.x + x) * this.CELL_SIZE,
                        (dropPosition.y + y) * this.CELL_SIZE,
                        this.CELL_SIZE,
                        this.CELL_SIZE
                    );
                }
            }
        }
        
        // 重置透明度
        this.ctx.globalAlpha = 1.0;
    }
    
    // 触发连击特效
    triggerComboEffects(comboCount, options = {}) {
        const isClutch = !!options.clutch;
        // 显示连击文本
        this.showComboText(comboCount, { clutch: isClutch });
        
        // 播放连击音效
        this.playComboSound(comboCount, { clutch: isClutch });
        if (isClutch) {
            this.playClutchDing();
        }
        
        // 屏幕震动
        this.screenShake(comboCount, { clutch: isClutch });
        
        // 粒子特效
        this.createComboParticles(comboCount);
    }
    
    // 显示连击文本
    showComboText(comboCount, options = {}) {
        const isClutch = !!options.clutch;
        if (comboCount < 2) return;
        
        const comboText = `COMBO x${comboCount}!`;
        const comboDisplay = document.getElementById('comboDisplay');
        
        if (comboDisplay && this.currentPiece) {
            // 使用当前下落方块的中心位置
            const pieceX = this.currentPiece.x;
            const pieceY = this.currentPiece.y;
            
            // 获取方块形状
            const shape = this.currentPiece.type.rotations[this.currentPiece.rotation];
            const shapeWidth = shape[0].length;
            const shapeHeight = shape.length;
            
            // 计算方块中心位置（像素坐标）
            const centerX = (pieceX + shapeWidth / 2) * this.CELL_SIZE;
            const centerY = (pieceY + shapeHeight / 2) * this.CELL_SIZE;
            
            // 设置位置
            comboDisplay.style.left = centerX + 'px';
            comboDisplay.style.top = centerY + 'px';
            comboDisplay.style.transform = 'translate(-50%, -50%)' + (isClutch ? ' scale(2.0)' : '');
            
            // 使用内层元素承载动画，外层负责定位
            comboDisplay.innerHTML = '';
            const inner = document.createElement('span');
            inner.className = 'combo-inner';
            inner.textContent = comboText;
            comboDisplay.appendChild(inner);
            comboDisplay.classList.add('show');
            
            // 添加调试信息
            console.log(`显示连击文本: ${comboText} 在方块中心位置 (${centerX}, ${centerY}), 方块位置(${pieceX}, ${pieceY}), 方块尺寸(${shapeWidth}x${shapeHeight})`);
            
            // 1秒后隐藏
            setTimeout(() => {
                comboDisplay.classList.remove('show');
                comboDisplay.innerHTML = '';
                console.log('连击文本已隐藏');
            }, 1000);
        } else {
            console.log('comboDisplay元素未找到或没有当前方块');
        }
    }
    
    // 播放连击音效 - 对齐线上版本的直接播放方式
    playComboSound(comboCount, options = {}) {
        const isClutch = !!options.clutch;
        if (comboCount < 2) return;
        
        try {
            // 检查音频上下文是否可用（线上版本方式）
            if (!this.audio || !this.audio.audioContext) {
                console.log('音频上下文不可用');
                return;
            }
            
            // 检查音频上下文状态（线上版本方式）
            if (this.audio.audioContext.state === 'suspended') {
                console.log('音频上下文已暂停，尝试恢复...');
                this.audio.audioContext.resume();
            }
            
            // 舒适版连击音效 - 超低延迟版本
            this.generateComboSFX(comboCount, { gainScale: isClutch ? 1.5 : 1.0 });
            
            console.log(`播放舒适连击音效: ${comboCount}连击`);
        } catch (error) {
            console.log('播放连击音效失败:', error);
        }
    }

    // 压哨“叮”声（铃铛）
    // 压哨"叮"声（铃铛）- 对齐线上版本的直接播放方式
    playClutchDing() {
        try {
            // 检查音频上下文是否可用（线上版本方式）
            if (!this.audio || !this.audio.audioContext) return;
            const ctx = this.audio.audioContext;
            const now = ctx.currentTime;

            // 冷却控制
            if (this._clutchDingLast && (now - this._clutchDingLast) < 0.2) return; // 200ms
            this._clutchDingLast = now;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const pan = (this.audio.panner || null);

            const baseHz = 2000;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseHz, now);

            const volume = 0.35; // 低音量
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(volume, now + 0.006);
            gain.gain.exponentialRampToValueAtTime(volume * 0.4, now + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

            if (pan && pan.pan) {
                try { pan.pan.setValueAtTime(0, now); } catch (_) {}
                osc.connect(gain).connect(pan).connect(this.audio.sfxGain);
            } else {
                osc.connect(gain).connect(this.audio.sfxGain);
            }

            osc.start(now);
            osc.stop(now + 0.2);
        } catch (_) {}
    }
    
    // 生成钢琴音阶连击音效
    generateComboSFX(comboCount, options = {}) {
        const gainScale = options.gainScale || 1.0;
        if (!this.audio || !this.audio.audioContext) return;
        
        try {
            // 钢琴音阶连击音效配置 - C大调音阶
            const pianoComboConfig = {
                2: { notes: [261.63], chord: [329.63], duration: 0.6, volume: 0.25 },     // C4 + E4 (大三度)
                3: { notes: [293.66], chord: [369.99], duration: 0.7, volume: 0.3 },      // D4 + F#4 (大三度)
                4: { notes: [329.63], chord: [415.30], duration: 0.8, volume: 0.35 },     // E4 + G#4 (大三度)
                5: { notes: [349.23], chord: [440.00], duration: 0.9, volume: 0.4 },      // F4 + A4 (大三度)
                6: { notes: [392.00], chord: [493.88], duration: 1.0, volume: 0.45 },     // G4 + B4 (大三度)
                7: { notes: [440.00], chord: [554.37], duration: 1.1, volume: 0.5 },      // A4 + C#5 (大三度)
                8: { notes: [493.88], chord: [622.25], duration: 1.2, volume: 0.55 },     // B4 + D#5 (大三度)
                9: { notes: [523.25], chord: [659.25], duration: 1.3, volume: 0.6 },      // C5 + E5 (大三度)
                10: { notes: [587.33], chord: [739.99], duration: 1.4, volume: 0.65 }     // D5 + F#5 (大三度)
            };
            
            // 获取配置，高连击沿用10连击配置
            const config = pianoComboConfig[Math.min(comboCount, 10)];
            
            // 直接播放，超低延迟
            const startTime = this.audio.audioContext.currentTime;
            
            // 创建钢琴音色（使用多重振荡器模拟钢琴复合音色）
            this.createPianoNote(config.notes[0], config.volume * gainScale, config.duration, startTime, true); // 主音
            this.createPianoNote(config.chord[0], (config.volume * 0.7) * gainScale, config.duration, startTime + 0.1, false); // 和弦音
            
            // 高连击添加琶音效果（>= 6连击）
            if (comboCount >= 6) {
                this.addPianoArpeggio(startTime, config, comboCount);
            }
            
            // 超高连击添加钢琴颤音（>= 8连击）
            if (comboCount >= 8) {
                this.addPianoTremolo(startTime, config.notes[0], config.duration);
            }
            
        } catch (error) {
            console.error('钢琴连击音效生成失败:', error);
        }
    }
    
    // 创建钢琴音符（模拟钢琴复合音色）
    createPianoNote(frequency, volume, duration, startTime, isMainNote = true) {
        try {
            // 钢琴音色由多个谐波组成
            const harmonics = [
                { freq: frequency, vol: 1.0 },           // 基频
                { freq: frequency * 2, vol: 0.3 },       // 2次谐波
                { freq: frequency * 3, vol: 0.15 },      // 3次谐波
                { freq: frequency * 4, vol: 0.08 },      // 4次谐波
                { freq: frequency * 5, vol: 0.04 }       // 5次谐波
            ];
            
            harmonics.forEach((harmonic, index) => {
                const oscillator = this.audio.audioContext.createOscillator();
                const gainNode = this.audio.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audio.sfxGain);
                
                // 钢琴音色使用正弦波作为基础
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(harmonic.freq, startTime);
                
                // 钢琴特有的音量包络（快速攻击，缓慢衰减）
                const noteVolume = volume * harmonic.vol * (isMainNote ? 1.0 : 0.7);
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(noteVolume, startTime + 0.01); // 快速攻击
                gainNode.gain.exponentialRampToValueAtTime(noteVolume * 0.6, startTime + 0.1); // 快速衰减
                gainNode.gain.exponentialRampToValueAtTime(noteVolume * 0.3, startTime + duration * 0.5); // 持续衰减
                gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // 完全衰减
                
                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
            });
            
        } catch (error) {
            console.error('钢琴音符创建失败:', error);
        }
    }
    
    // 钢琴琶音效果（高连击专用）
    addPianoArpeggio(startTime, config, comboCount) {
        try {
            // 琶音音符序列（向上琶音）
            const arpeggioNotes = [
                config.notes[0],
                config.chord[0],
                config.notes[0] * 1.5,  // 五度
                config.notes[0] * 2     // 八度
            ];
            
            const arpeggioDelay = 0.08; // 琶音间隔
            
            arpeggioNotes.forEach((freq, index) => {
                const noteStartTime = startTime + 0.2 + (index * arpeggioDelay);
                this.createPianoNote(freq, config.volume * 0.4, 0.5, noteStartTime, false);
            });
            
        } catch (error) {
            console.error('钢琴琶音效果失败:', error);
        }
    }
    
    // 钢琴颤音效果（超高连击专用）
    addPianoTremolo(startTime, baseFreq, duration) {
        try {
            // 颤音效果（快速交替两个相近音符）
            const tremoloFreq1 = baseFreq * 2;
            const tremoloFreq2 = baseFreq * 2.059; // 半音关系
            const tremoloSpeed = 0.05; // 颤音速度
            const tremoloCount = Math.floor(duration / tremoloSpeed / 2);
            
            for (let i = 0; i < tremoloCount; i++) {
                const tremolo1Time = startTime + 0.4 + (i * tremoloSpeed * 2);
                const tremolo2Time = tremolo1Time + tremoloSpeed;
                
                this.createPianoNote(tremoloFreq1, 0.15, tremoloSpeed * 1.5, tremolo1Time, false);
                this.createPianoNote(tremoloFreq2, 0.15, tremoloSpeed * 1.5, tremolo2Time, false);
            }
            
        } catch (error) {
            console.error('钢琴颤音效果失败:', error);
        }
    }
    

    
    // 屏幕震动
    screenShake(comboCount, options = {}) {
        const isClutch = !!options.clutch;
        const gameArea = document.querySelector('.game-area');
        if (!gameArea) return;
        
        const intensity = Math.min(comboCount * 2 * (isClutch ? 1.5 : 1.0), 10); // 最大震动10px
        
        gameArea.style.transform = `translate(${intensity}px, ${intensity}px)`;
        
        setTimeout(() => {
            gameArea.style.transform = 'translate(0, 0)';
        }, 100);
    }

    // 硬降专用：轻微短促抖动（低于连击强度）
    screenShakeHardDrop(intensityPx = 2, durationMs = 80) {
        const gameArea = document.querySelector('.game-area');
        if (!gameArea) return;
        gameArea.style.transform = `translate(${intensityPx}px, ${-intensityPx}px)`;
        setTimeout(() => {
            gameArea.style.transform = 'translate(0, 0)';
        }, durationMs);
    }
    
    // 创建粒子特效
    createComboParticles(comboCount) {
        const particleCount = Math.min(comboCount * 3, 15); // 最多15个粒子
        const gameArea = document.querySelector('.game-area');
        
        if (!gameArea) {
            console.log('gameArea元素未找到');
            return;
        }
        
        console.log(`创建${particleCount}个粒子特效`);
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'combo-particle';
            
            // 随机位置
            const x = Math.random() * 400; // 游戏区域宽度
            const y = Math.random() * 800; // 游戏区域高度
            
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            
            // 使用transform而不是CSS变量，提高兼容性
            const angle = Math.random() * 360;
            const distance = 50 + Math.random() * 100;
            const dx = Math.cos(angle * Math.PI / 180) * distance;
            const dy = Math.sin(angle * Math.PI / 180) * distance;
            
            particle.style.transform = `translate(${dx}px, ${dy}px)`;
            
            gameArea.appendChild(particle);
            
            // 1秒后移除粒子
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.remove();
                }
            }, 1000);
        }
    }
    
    // 更新连击UI
    updateComboUI() {
        // 更新连击显示
        const comboElement = document.getElementById('combo');
        if (comboElement) {
            const comboMultiplier = this.comboSystem.getMultiplier();
            if (comboMultiplier >= 2) {
                comboElement.textContent = `x${comboMultiplier}`;
                comboElement.classList.add('active');
            } else {
                comboElement.textContent = `x1`;
                comboElement.classList.remove('active');
            }
        }
        
        // 更新倒计时显示
        this.updateComboTimer();
    }
    
    // 更新倒计时显示
    updateComboTimer() {
        const currentTime = Date.now();
        // 模型值
        const modelInfo = this.comboSystem.getTimerInfo();
        
        const timerElement = document.getElementById('comboTimer');
        
        if (timerElement) {
            // 监控透明度变化
            const computedStyle = window.getComputedStyle(timerElement);
            const currentOpacity = computedStyle.opacity;
            
            // 只有在连击激活且剩余时间大于0时才显示
            if (modelInfo.active && modelInfo.remaining > 0 && this.comboSystem.getMultiplier() >= 2) {
                // 滚动增长动画：逐步将 displayTimerSeconds 推近 模型剩余值
                const modelSec = modelInfo.remaining;
                const capModelSec = Math.min(30, modelSec);
                // 先处理“待增加”的滚动显示
                if ((this.timerAnim.remainingToAddSec || 0) > 0) {
                    const step = Math.max(0.01, Math.min(this.timerAnim.remainingToAddSec, 0.01 * this.timerAnim.ratePerSec));
                    this.displayTimerSeconds = Math.min(30, this.displayTimerSeconds + step);
                    this.timerAnim.remainingToAddSec = Math.max(0, this.timerAnim.remainingToAddSec - step);
                } else {
                    // 无新增时，跟随模型（避免视觉滞后过大）
                    this.displayTimerSeconds = Math.max(0, Math.min(30, capModelSec));
                }

                // 显示值对齐到两位小数（0.01 粒度）
                const displayTime = Math.max(0, Math.min(30, this.displayTimerSeconds));
                timerElement.textContent = displayTime.toFixed(2);
                timerElement.classList.add('show');
                
                // 强制设置透明度为50%
                timerElement.style.opacity = '0.5';
                
                // 固定颜色，不随时间变化
                timerElement.style.color = 'var(--nes-light-green)';
                

                
                // 检查透明度是否变化
                setTimeout(() => {
                    const newComputedStyle = window.getComputedStyle(timerElement);
                    const newOpacity = newComputedStyle.opacity;
                    if (newOpacity !== '0.5') {
                        console.log(`透明度变化检测: ${currentOpacity} -> ${newOpacity}`);
                    }
                }, 100);
                
            } else {
                // 倒计时结束或未激活时，立即隐藏
                timerElement.classList.remove('show');
                timerElement.textContent = '';
                timerElement.style.color = 'var(--nes-light-green)';
                timerElement.style.opacity = '0';
            }
        }
    }
    
} // 结束NESTetris类

// 初始化游戏
    document.addEventListener('DOMContentLoaded', () => {
        const tetrisGame = new NESTetris();
        // 自动开始游戏
        tetrisGame.autoStart();
        
        // 添加隐藏的清理功能（按Ctrl+Shift+C清理High Scores）
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                if (confirm('确定要清理所有High Scores数据吗？')) {
                    localStorage.removeItem('tetrisHighScores');
                    alert('High Scores数据已清理！');
                    // 刷新高分显示
                    if (tetrisGame.highScoreManager) {
                        tetrisGame.highScoreManager.updateDisplay();
                    }
                }
            }
        });
        
        // 添加隐藏功能：连续点击HIGH SCORES标题10次清零数据
        let clickCount = 0;
        let lastClickTime = 0;
        const clickTimeout = 3000; // 3秒内需要完成10次点击
        
        const highScoresTitle = document.getElementById('highScoresTitle');
        if (highScoresTitle) {
            highScoresTitle.addEventListener('click', () => {
                const currentTime = Date.now();
                
                // 如果距离上次点击超过3秒，重置计数
                if (currentTime - lastClickTime > clickTimeout) {
                    clickCount = 0;
                }
                
                clickCount++;
                lastClickTime = currentTime;
                
                // 显示点击进度（可选）
                if (clickCount === 1) {
                    highScoresTitle.style.color = '#ff6b6b';
                } else if (clickCount >= 5) {
                    highScoresTitle.style.color = '#ff4757';
                }
                
                // 达到10次点击
                if (clickCount >= 10) {
                    if (confirm('🎯 隐藏功能触发！确定要清零所有High Scores数据吗？')) {
                        localStorage.removeItem('tetrisHighScores');
                        alert('✅ High Scores数据已清零！');
                        
                        // 刷新高分显示
                        if (tetrisGame.highScoreManager) {
                            tetrisGame.highScoreManager.updateDisplay();
                        }
                        
                        // 重置点击计数和颜色
                        clickCount = 0;
                        highScoresTitle.style.color = '';
                    } else {
                        // 用户取消，重置计数
                        clickCount = 0;
                        highScoresTitle.style.color = '';
                    }
                }
                
                // 3秒后自动重置计数和颜色
                setTimeout(() => {
                    if (Date.now() - lastClickTime > clickTimeout) {
                        clickCount = 0;
                        highScoresTitle.style.color = '';
                    }
                }, clickTimeout);
            });
            
            // 添加鼠标悬停提示（可选）
            highScoresTitle.title = '连续点击10次可清零数据';
        }
    });
