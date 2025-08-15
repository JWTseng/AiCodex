/**
 * 经典NES俄罗斯方块 - 忠实复刻版
 * 基于1989年任天堂娱乐系统(NES)北美(NTSC)版本
 */

class NESTetris {
    constructor() {
        // 游戏区域尺寸 (10x20)
        this.GRID_WIDTH = 10;
        this.GRID_HEIGHT = 20;
        this.CELL_SIZE = 36; // 36x36像素的方块 (150%放大)
        
        // 游戏状态
        this.gameState = 'stopped'; // stopped, playing, paused, gameOver
        this.score = 0;
        this.level = 0;
        this.linesClearedTotal = 0;
        this.nextPiece = null;
        this.currentPiece = null;
        this.playfieldGrid = [];
        
        // 音频系统
        this.audio = new NESTetrisAudio();
        
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
        this.accelerationRate = 2.4;   // 加速度增长率（每帧）- 提高一倍
        this.maxAcceleration = 200;    // 最大加速度 - 提高一倍
        this.baseSoftDropSpeed = 2;    // 基础软降速度倍数
        
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
        this.canvas.width = this.GRID_WIDTH * this.CELL_SIZE;  // 10 * 36 = 360
        this.canvas.height = this.GRID_HEIGHT * this.CELL_SIZE; // 20 * 36 = 720
        
        // 设置下一个方块Canvas尺寸 (4x4网格，每个方块27像素)
        this.nextCanvas.width = 4 * (this.CELL_SIZE * 0.75);  // 4 * 27 = 108
        this.nextCanvas.height = 4 * (this.CELL_SIZE * 0.75); // 4 * 27 = 108
        
        // 初始化游戏区域
        this.initPlayfield();
        
        // 绑定事件
        this.bindEvents();
        
        // 开始游戏循环
        this.gameLoop();
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
        // 键盘事件
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // 按钮事件
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
        
        // 音频控制事件 - 现在在start.html中处理
        // this.bindAudioControls();
    }
    
    handleKeyDown(e) {
        // 回车键开始游戏 - 在任何状态下都可以工作
        if (e.code === 'Enter') {
            if (this.gameState === 'stopped' || this.gameState === 'gameOver') {
                this.startGame();
                return;
            }
        }
        
        // 空格键多功能处理 - 开始/暂停/继续
        if (e.code === 'Space') {
            if (this.gameState === 'stopped' || this.gameState === 'gameOver') {
                // 开始游戏
                this.startGame();
            } else if (this.gameState === 'playing') {
                // 暂停游戏
                this.keys.pause = true;
                this.togglePause();
            } else if (this.gameState === 'paused') {
                // 继续游戏
                this.keys.pause = true;
                this.togglePause();
            }
            return;
        }
        
        // 其他按键只在游戏进行中有效
        if (this.gameState !== 'playing') return;
        
        switch(e.code) {
            case 'ArrowLeft':
                this.keys.left = true;
                this.dasDirection = -1;
                this.dasTimer = 0;
                this.dasCharged = false;
                // 立即执行一次移动
                this.movePiece(-1, 0);
                break;
            case 'ArrowRight':
                this.keys.right = true;
                this.dasDirection = 1;
                this.dasTimer = 0;
                this.dasCharged = false;
                // 立即执行一次移动
                this.movePiece(1, 0);
                break;
            case 'ArrowDown':
                this.keys.down = true;
                // 立即执行一次软降
                this.movePiece(0, 1);
                break;
            case 'KeyQ':
            case 'ArrowUp':
                this.keys.rotateCW = true;
                this.rotatePiece(1);
                break;
            case 'KeyW':
                this.keys.rotateCCW = true;
                this.rotatePiece(-1);
                break;
            case 'KeyR':
                this.resetGame();
                break;
            case 'KeyM':
                // M键切换音乐开关
                this.toggleMusicWithKeyboard();
                break;
        }
    }
    
    handleKeyUp(e) {
        switch(e.code) {
            case 'ArrowLeft':
                this.keys.left = false;
                if (this.dasDirection === -1) this.dasDirection = 0;
                break;
            case 'ArrowRight':
                this.keys.right = false;
                if (this.dasDirection === 1) this.dasDirection = 0;
                break;
            case 'ArrowDown':
                this.keys.down = false;
                break;
            case 'KeyQ':
            case 'ArrowUp':
                this.keys.rotateCW = false;
                break;
            case 'KeyW':
                this.keys.rotateCCW = false;
                break;
            case 'Space':
                this.keys.pause = false;
                break;
        }
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
        this.gameState = 'playing';
        this.score = 0;
        this.level = 0;
        this.linesClearedTotal = 0;
        this.frameCount = 0;
        this.gravityTimer = 0;
        this.dasTimer = 0;
        this.areTimer = 0;
        
        this.initPlayfield();
        this.nextPiece = this.generateNextPiece();
        this.spawnNewPiece();
        
        // 启动背景音乐
        this.audio.resumeAudioContext();
        this.audio.generateBackgroundMusic('music1');
        
        this.updateUI();
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        document.getElementById('gameOverlay').style.display = 'none';
    }
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
        }
    }
    
    resetGame() {
        this.gameState = 'stopped';
        this.score = 0;
        this.level = 0;
        this.linesClearedTotal = 0;
        this.initPlayfield();
        this.currentPiece = null;
        this.nextPiece = null;
        
        // 停止音乐
        this.audio.stopMusic();
        
        this.updateUI();
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('gameOverlay').style.display = 'none';
    }
    
    spawnNewPiece() {
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
            
            // 播放移动音效
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
        
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const gridX = this.currentPiece.x + x;
                    const gridY = this.currentPiece.y + y;
                    
                    if (gridY >= 0) {
                        this.playfieldGrid[gridY][gridX] = this.currentPiece.type;
                    }
                }
            }
        }
        
        // 播放锁定音效
        this.audio.playSFX('lock');
        
        this.clearLines();
        this.spawnNewPiece();
    }
    
    clearLines() {
        let linesCleared = 0;
        
        for (let y = this.GRID_HEIGHT - 1; y >= 0; y--) {
            let lineFull = true;
            for (let x = 0; x < this.GRID_WIDTH; x++) {
                if (this.playfieldGrid[y][x] === null) {
                    lineFull = false;
                    break;
                }
            }
            
            if (lineFull) {
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
            this.updateScore(linesCleared);
            this.updateLevel();
            
            // 播放消行音效
            this.audio.playSFX('line');
        }
    }
    
    updateScore(linesCleared) {
        // NES得分公式
        const baseScores = [0, 40, 100, 300, 1200];
        const baseScore = baseScores[linesCleared];
        const levelMultiplier = this.level + 1;
        
        this.score += baseScore * levelMultiplier;
        
        // 软降得分
        if (this.keys.down) {
            this.score += 1;
        }
        
        // 限制最大分数
        if (this.score > 999999) {
            this.score = 999999;
        }
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
        
        // 播放游戏结束音效
        this.audio.playSFX('gameover');
        this.audio.stopMusic();
        
        document.getElementById('gameOverlay').style.display = 'flex';
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score.toString().padStart(6, '0');
        document.getElementById('level').textContent = this.level.toString();
        document.getElementById('lines').textContent = this.linesClearedTotal.toString();
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
        
        // Next窗口是4x4网格，每个方块27像素
        const nextWindowSize = 4;
        const nextCellSize = this.CELL_SIZE * 0.75; // 27像素
        
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
                    
                    // 填充方块 - 恢复可见
                    this.nextCtx.fillStyle = this.nextPiece.color;
                    this.nextCtx.fillRect(renderX, renderY, nextCellSize, nextCellSize);
                    
                    // 绘制边框 - 不透明度100%（清晰可见）
                    this.nextCtx.strokeStyle = '#0f380f';
                    this.nextCtx.lineWidth = 1;
                    this.nextCtx.globalAlpha = 1.0; // 设置不透明度为100%（完全清晰）
                    this.nextCtx.strokeRect(renderX, renderY, nextCellSize, nextCellSize);
                    this.nextCtx.globalAlpha = 1.0; // 重置透明度
                    
                    // 调试信息：在控制台输出渲染位置
                    console.log(`${this.nextPiece.name}方块渲染位置: (${renderX}, ${renderY}), 偏移: (${offsetX}, ${offsetY}), 方块中心: (${pieceCenterX}, ${pieceCenterY})`);
                }
            }
        }
    }
    
    gameLoop() {
        if (this.gameState === 'playing') {
            this.update();
        }
        
        this.render();
        this.updateUI();
        
        requestAnimationFrame(() => this.gameLoop());
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
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    new NESTetris();
});
