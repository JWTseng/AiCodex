document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const canvas = document.getElementById('tetris-canvas');
    const ctx = canvas.getContext('2d');
    const nextCanvas = document.getElementById('next-canvas');
    const nextCtx = nextCanvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const highScoreElement = document.getElementById('high-score');
    const levelElement = document.getElementById('level');
    const linesElement = document.getElementById('lines');

    // Game Constants
    const COLS = 10;
    const ROWS = 22;
    const HIDDEN_ROWS = 2;
    const VISIBLE_ROWS = ROWS - HIDDEN_ROWS;
    const BLOCK_SIZE = 24; // Default block size, will be configurable

    canvas.width = COLS * BLOCK_SIZE;
    canvas.height = VISIBLE_ROWS * BLOCK_SIZE;
    ctx.scale(BLOCK_SIZE, BLOCK_SIZE);

    nextCanvas.width = 4 * BLOCK_SIZE;
    nextCanvas.height = 4 * BLOCK_SIZE;
    nextCtx.scale(BLOCK_SIZE, BLOCK_SIZE);

    const COLORS = {
        I: '#00FFFF',
        O: '#FFFF00',
        T: '#800080',
        S: '#00FF00',
        Z: '#FF0000',
        J: '#0000FF',
        L: '#FFA500'
    };

    const PIECES = {
        'I': [
            [[1,0], [1,1], [1,2], [1,3]], // 0 deg
            [[0,2], [1,2], [2,2], [3,2]], // 90 deg
            [[1,0], [1,1], [1,2], [1,3]], // 180 deg
            [[0,2], [1,2], [2,2], [3,2]]  // 270 deg
        ],
        'O': [
            [[1,1], [1,2], [2,1], [2,2]] // All rotations are the same
        ],
        'T': [
            [[1,0], [1,1], [1,2], [0,1]],
            [[0,1], [1,1], [2,1], [1,2]],
            [[1,0], [1,1], [1,2], [2,1]],
            [[0,1], [1,1], [2,1], [1,0]]
        ],
        'S': [
            [[0,0], [0,1], [1,1], [1,2]],
            [[0,1], [1,1], [1,2], [2,2]],
            [[0,0], [0,1], [1,1], [1,2]],
            [[0,1], [1,1], [1,2], [2,2]]
        ],
        'Z': [
            [[0,1], [0,2], [1,0], [1,1]],
            [[0,2], [1,2], [1,1], [2,1]],
            [[0,1], [0,2], [1,0], [1,1]],
            [[0,2], [1,2], [1,1], [2,1]]
        ],
        'J': [
            [[0,0], [1,0], [1,1], [1,2]],
            [[0,1], [1,1], [2,1], [0,2]],
            [[1,0], [1,1], [1,2], [2,2]],
            [[0,1], [1,1], [2,1], [2,0]]
        ],
        'L': [
            [[0,2], [1,0], [1,1], [1,2]],
            [[0,1], [1,1], [2,1], [0,0]],
            [[1,0], [1,1], [1,2], [2,0]],
            [[0,1], [1,1], [2,1], [2,2]]
        ]
    };

    // Level speed in frames per gridcell. 60 FPS baseline.
    const LEVEL_SPEEDS = [
        48, // Level 0
        43, // Level 1
        38, // Level 2
        33, // Level 3
        28, // Level 4
        23, // Level 5
        18, // Level 6
        13, // Level 7
        8,  // Level 8
        6,  // Level 9
        5,  // Levels 10-12
        4,  // Levels 13-15
        3,  // Levels 16-18
        2,  // Levels 19-28
        1   // Levels 29+
    ];

    const SCORE_VALUES = {
        1: 40,
        2: 100,
        3: 300,
        4: 1200
    };

    // --- Game State & Settings ---
    let grid, currentPiece, nextPiece, score, level, lines, gameOver, isPaused, highScore;
    let lineClearAnimation = { active: false, timer: 0, rows: [] };
    let settings = { isMuted: false };

    // --- Persistence ---
    function saveSettings() { localStorage.setItem('tetrisSettings', JSON.stringify(settings)); }
    function loadSettings() {
        const saved = localStorage.getItem('tetrisSettings');
        if (saved) settings = JSON.parse(saved);
        audioEngine.isMuted = settings.isMuted;
    }
    function saveHighScore() { localStorage.setItem('tetrisHighScore', highScore); }
    function loadHighScore() { highScore = parseInt(localStorage.getItem('tetrisHighScore')) || 0; }

    // --- Audio Engine ---
    const audioEngine = {
        context: null,
        isMuted: false,
        init() {
            if (this.context) return;
            try { this.context = new (window.AudioContext || window.webkitAudioContext)(); }
            catch (e) { console.error("Web Audio API is not supported."); }
        },
        play(type) {
            if (!this.context || this.isMuted) return;
            const o = this.context.createOscillator(), g = this.context.createGain();
            o.connect(g); g.connect(this.context.destination);
            const now = this.context.currentTime;
            g.gain.setValueAtTime(0.1, now);
            switch (type) {
                case 'move': o.type = 'square'; o.frequency.setValueAtTime(100, now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.1); break;
                case 'rotate': o.type = 'square'; o.frequency.setValueAtTime(150, now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.1); break;
                case 'lock': o.type = 'sine'; o.frequency.setValueAtTime(200, now); o.frequency.exponentialRampToValueAtTime(50, now + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15); break;
                case 'clear': o.type = 'triangle'; o.frequency.setValueAtTime(440, now); o.frequency.exponentialRampToValueAtTime(880, now + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15); break;
                case 'tetris': o.type = 'triangle'; o.frequency.setValueAtTime(440, now); o.frequency.exponentialRampToValueAtTime(1200, now + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2); break;
                case 'levelUp': o.type = 'sawtooth'; o.frequency.setValueAtTime(220, now); o.frequency.exponentialRampToValueAtTime(880, now + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2); break;
                case 'gameOver': o.type = 'sawtooth'; o.frequency.setValueAtTime(200, now); o.frequency.exponentialRampToValueAtTime(50, now + 1.0); g.gain.exponentialRampToValueAtTime(0.0001, now + 1.0); break;
            }
            o.start(now); o.stop(now + 1);
        },
        toggleMute() { this.isMuted = !this.isMuted; settings.isMuted = this.isMuted; saveSettings(); }
    };

    // --- Game Logic Functions ---
    function createEmptyGrid() { return Array.from({ length: ROWS }, () => Array(COLS).fill(0)); }
    function isValidPosition(piece) {
        const shape = PIECES[piece.type][piece.rotation % PIECES[piece.type].length];
        for (const [r, c] of shape) {
            const newX = piece.x + c, newY = piece.y + r;
            if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && grid[newY][newX] !== 0)) return false;
        }
        return true;
    }
    function lockPiece() {
        const shape = PIECES[currentPiece.type][currentPiece.rotation % PIECES[currentPiece.type].length];
        for (const [r, c] of shape) {
            if (currentPiece.y + r >= 0) grid[currentPiece.y + r][currentPiece.x + c] = currentPiece.type;
        }
    }
    function findFullRows() {
        const fullRows = [];
        outer: for (let y = ROWS - 1; y >= 0; y--) {
            for (let x = 0; x < COLS; x++) if (grid[y][x] === 0) continue outer;
            fullRows.push(y);
        }
        return fullRows;
    }
    function removeRows(rowsToRemove) {
        rowsToRemove.sort((a, b) => b - a).forEach(y => { grid.splice(y, 1); grid.unshift(Array(COLS).fill(0)); });
    }
    function getRandomPieceType() { const types = 'IOTSZJL'; return types[Math.floor(Math.random() * types.length)]; }
    function spawnNewPiece() {
        currentPiece = nextPiece;
        nextPiece = { type: getRandomPieceType(), rotation: 0, x: 3, y: 0 };
        currentPiece.x = 3; currentPiece.y = 0;
        if (!isValidPosition(currentPiece)) {
            gameOver = true;
            audioEngine.play('gameOver');
            if (score > highScore) { highScore = score; saveHighScore(); }
        }
    }

    // --- Rendering Functions ---
    function drawBlock(ctxToDrawOn, x, y, color) {
        ctxToDrawOn.fillStyle = color; ctxToDrawOn.fillRect(x, y, 1, 1);
        ctxToDrawOn.strokeStyle = '#111'; ctxToDrawOn.lineWidth = 0.1; ctxToDrawOn.strokeRect(x, y, 1, 1);
    }
    function drawBoard() {
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (grid[y][x] !== 0 && y >= HIDDEN_ROWS) drawBlock(ctx, x, y - HIDDEN_ROWS, COLORS[grid[y][x]]);
            }
        }
    }
    function drawPiece() {
        const shape = PIECES[currentPiece.type][currentPiece.rotation % PIECES[currentPiece.type].length];
        for (const [r, c] of shape) {
            if (currentPiece.y + r >= HIDDEN_ROWS) drawBlock(ctx, currentPiece.x + c, currentPiece.y + r - HIDDEN_ROWS, COLORS[currentPiece.type]);
        }
    }
    function drawNextPiece() {
        nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        const shape = PIECES[nextPiece.type][0], color = COLORS[nextPiece.type];
        const boxW = shape.reduce((max, [_, c]) => Math.max(max, c + 1), 0);
        const boxH = shape.reduce((max, [r, _]) => Math.max(max, r + 1), 0);
        const offsetX = (4 - boxW) / 2, offsetY = (4 - boxH) / 2;
        for (const [r, c] of shape) drawBlock(nextCtx, c + offsetX, r + offsetY, color);
    }
    function updateHUD() {
        scoreElement.textContent = score;
        highScoreElement.textContent = highScore;
        levelElement.textContent = level;
        linesElement.textContent = lines;
    }
    function draw() {
        ctx.clearRect(0, 0, COLS, VISIBLE_ROWS);
        drawBoard();
        if (lineClearAnimation.active) {
            if (Math.floor(lineClearAnimation.timer / 50) % 2 === 0) {
                ctx.fillStyle = 'white';
                for (const y of lineClearAnimation.rows) {
                    if (y >= HIDDEN_ROWS) ctx.fillRect(0, y - HIDDEN_ROWS, COLS, 1);
                }
            }
        } else if (currentPiece) {
            drawPiece();
        }
        drawNextPiece();
        updateHUD();
    }

    // --- Input Handling & Player Controls ---
    const DAS_DELAY = 150, ARR_INTERVAL = 50;
    let keysDown = {}, dasState = { timer: 0, direction: 0, arrTimer: 0, active: false };
    document.addEventListener('keydown', e => {
        audioEngine.init();
        const key = e.key.toLowerCase();
        if (keysDown[key]) return;
        keysDown[key] = true;
        handleSinglePress(key);
    });
    document.addEventListener('keyup', e => {
        const key = e.key.toLowerCase();
        keysDown[key] = false;
        if ((key === 'arrowleft' && dasState.direction === -1) || (key === 'arrowright' && dasState.direction === 1)) {
            dasState = { timer: 0, direction: 0, arrTimer: 0, active: false };
        }
    });
    function handleSinglePress(key) {
        if (key === 'r') { init(); return; }
        if (key === 'p') { togglePause(); return; }
        if (key === 'm') { audioEngine.toggleMute(); return; }
        if (isPaused || gameOver || lineClearAnimation.active) return;
        switch (key) {
            case 'arrowleft': if (dasState.direction === 1) dasState.timer = 0; movePiece(-1); dasState.direction = -1; break;
            case 'arrowright': if (dasState.direction === -1) dasState.timer = 0; movePiece(1); dasState.direction = 1; break;
            case 'z': rotatePiece(-1); break;
            case 'x': case 'arrowup': rotatePiece(1); break;
        }
    }
    function processContinuousInput(deltaTime) {
        if (keysDown['arrowdown']) softDrop();
        if (dasState.direction === 0) return;

        // A direction key is held. Start or continue the DAS timer.
        dasState.timer += deltaTime;
        if (dasState.timer > DAS_DELAY) {
            // DAS delay has been surpassed. Activate auto-repeat.
            if (!dasState.active) {
                dasState.active = true;
                // Carry over any excess time from the DAS delay into the first ARR interval.
                dasState.arrTimer = dasState.timer - DAS_DELAY;
            } else {
                dasState.arrTimer += deltaTime;
            }
            const moves = Math.floor(dasState.arrTimer / ARR_INTERVAL);
            if (moves > 0) {
                for (let i = 0; i < moves; i++) movePiece(dasState.direction);
                // Reset arrTimer but keep the remainder for the next frame, preventing timer drift.
                dasState.arrTimer %= ARR_INTERVAL;
            }
        }
    }
    function togglePause() {
        if (gameOver) return;
        isPaused = !isPaused;
        if (!isPaused) { lastTime = performance.now(); gameLoop(); }
        else {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(0, VISIBLE_ROWS / 2 - 2, COLS, 4);
            ctx.font = '2px "Press Start 2P", sans-serif';
            ctx.fillStyle = 'white'; ctx.textAlign = 'center';
            ctx.fillText('PAUSED', COLS / 2, VISIBLE_ROWS / 2);
        }
    }
    function movePiece(dir) {
        if (isPaused || gameOver || lineClearAnimation.active) return;
        currentPiece.x += dir;
        if (!isValidPosition(currentPiece)) currentPiece.x -= dir;
        else audioEngine.play('move');
    }
    function rotatePiece(dir) {
        if (isPaused || gameOver || lineClearAnimation.active) return;
        const oRotation = currentPiece.rotation;
        currentPiece.rotation = (currentPiece.rotation + dir + 4) % 4;
        if (!isValidPosition(currentPiece)) currentPiece.rotation = oRotation;
        else audioEngine.play('rotate');
    }
    function softDrop() {
        if (isPaused || gameOver || lineClearAnimation.active) return;
        currentPiece.y++;
        if (!isValidPosition(currentPiece)) { currentPiece.y--; lockAndSpawn(); }
        else score++;
    }
    function lockAndSpawn() {
        lockPiece(); audioEngine.play('lock');
        const fullRows = findFullRows();
        if (fullRows.length > 0) lineClearAnimation = { active: true, timer: 200, rows: fullRows };
        else spawnNewPiece();
        dasState = { timer: 0, direction: 0, arrTimer: 0, active: false };
    }

    // --- Game Loop ---
    let lastTime = 0; let dropCounter = 0;
    function getSpeedInFrames() {
        if (level >= 29) return 1; if (level >= 19) return 2; if (level >= 16) return 3;
        if (level >= 13) return 4; if (level >= 10) return 5; return LEVEL_SPEEDS[Math.min(level, 9)];
    }
    function update(deltaTime) {
        // The game loop is paused for other updates during the line clear animation.
        if (lineClearAnimation.active) {
            lineClearAnimation.timer -= deltaTime;
            if (lineClearAnimation.timer <= 0) {
                // Animation is over.
                lineClearAnimation.active = false;

                // Now, perform the deferred logic: remove lines, score, and spawn next piece.
                const cleared = lineClearAnimation.rows.length;
                removeRows(lineClearAnimation.rows);

                if (cleared === 4) audioEngine.play('tetris');
                else if (cleared > 0) audioEngine.play('clear');

                score += SCORE_VALUES[cleared] * (level + 1);
                lines += cleared;
                const newLevel = Math.floor(lines / 10);
                if (newLevel > level) {
                    level = newLevel;
                    audioEngine.play('levelUp');
                }

                spawnNewPiece();
            }
            return; // Stop further updates during animation.
        }

        if (isPaused || gameOver) return;
        processContinuousInput(deltaTime);

        // --- Gravity ---
        const dropInterval = (getSpeedInFrames() / 60) * 1000;
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            dropCounter %= dropInterval;
            currentPiece.y++;
            if (!isValidPosition(currentPiece)) {
                currentPiece.y--;
                lockAndSpawn();
            }
        }
    }
    function gameLoop(timestamp) {
        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(0, VISIBLE_ROWS / 2 - 2, COLS, 4);
            ctx.font = '1.5px "Press Start 2P", sans-serif';
            ctx.fillStyle = 'red'; ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', COLS / 2, VISIBLE_ROWS / 2);
            return;
        }
        if (isPaused) return;
        const deltaTime = (timestamp - lastTime) || 0;
        lastTime = timestamp;
        update(deltaTime);
        draw();
        requestAnimationFrame(gameLoop);
    }
    function init() {
        loadSettings();
        loadHighScore();
        grid = createEmptyGrid();
        nextPiece = { type: getRandomPieceType(), rotation: 0, x: 3, y: 0 };
        spawnNewPiece();
        score = 0; level = 0; lines = 0;
        gameOver = false; isPaused = false;
        dropCounter = 0; keysDown = {};
        dasState = { timer: 0, direction: 0, arrTimer: 0, active: false };
        lineClearAnimation = { active: false, timer: 0, rows: [] };
        lastTime = performance.now();
        gameLoop(lastTime);
    }

    init();
});
