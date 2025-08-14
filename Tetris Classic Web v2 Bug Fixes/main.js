/* Classic Tetris (Web) – main.js
 * Implements a strict "classic" spec with:
 * - 10x22 grid (top 2 hidden)
 * - No kicks rotation, memoryless RNG
 * - Immediate lock, no lock delay
 * - Line flash 200ms, then collapse
 * - Scoring per NES table; soft drop +1/row
 * - DAS=150ms, ARR=50ms
 * - State machine to prevent the 'fall during line clear' bug
 */
(() => {
  'use strict';

  // -------------------- Constants --------------------
  const COLS = 10, ROWS = 22, HIDDEN_ROWS = 2; // visible rows 20 (2..21)
  const FPS = 60;
  const FRAME_MS = 1000 / FPS;
  const GRAVITY_TABLE = [
    48,43,38,33,28,23,18,13,8,6,5,5,5,4,4,4,3,3,3,2,2,2,2,2,2,2,2,2,1
  ]; // frames per row for level 0..29+
  const SCORES = {1:40, 2:100, 3:300, 4:1200};
  const DAS = 150, ARR = 50; // ms
  const FLASH_MS = 200;

  const COLORS_STANDARD = {
    I:"#00ffff", O:"#ffff00", T:"#800080", S:"#00ff00", Z:"#ff0000", J:"#0000ff", L:"#ffa500",
    gridDark:"#111", gridMid:"#222", bg:"#000"
  };
  const COLORS_CB = {
    I:"#02b3e4", O:"#f3c623", T:"#b84dff", S:"#16db65", Z:"#ff595e", J:"#1f7a8c", L:"#ff924c",
    gridDark:"#111", gridMid:"#222", bg:"#000"
  };

  const DEFAULT_SETTINGS = {
    pixel: 24,
    colorMode: 'standard', // 'standard' | 'cb'
    volume: 0.7,
    mute: false,
    crt: false,
    keys: {
      left:['ArrowLeft'],
      right:['ArrowRight'],
      down:['ArrowDown'],
      cw:['ArrowUp','KeyX'],
      ccw:['KeyZ'],
      pause:['KeyP'],
      restart:['KeyR'],
      mute:['KeyM']
    },
    highScore: 0
  };

  // -------------------- State --------------------
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const nextCanvas = document.getElementById('next');
  const nextCtx = nextCanvas.getContext('2d');
  const overlayEl = document.getElementById('overlay');
  const crtEl = document.getElementById('crt');

  const ui = {
    score: document.getElementById('score'),
    level: document.getElementById('level'),
    lines: document.getElementById('lines'),
    high: document.getElementById('high'),
  };

  // Local storage helpers
  const store = {
    load(){
      try {
        const raw = localStorage.getItem('tetrisClassicSettings');
        if(!raw) return {...DEFAULT_SETTINGS};
        const obj = JSON.parse(raw);
        // merge with defaults to avoid missing keys
        return {...DEFAULT_SETTINGS, ...obj, keys: {...DEFAULT_SETTINGS.keys, ...(obj.keys||{})}};
      } catch(e){
        console.warn('Failed to load settings', e);
        return {...DEFAULT_SETTINGS};
      }
    },
    save(obj){
      try { localStorage.setItem('tetrisClassicSettings', JSON.stringify(obj)); } catch{}
    },
    high(){ return store.load().highScore || 0; },
    setHigh(v){
      const s = store.load(); if(v > (s.highScore||0)) { s.highScore = v; store.save(s); }
    }
  };

  let settings = store.load();
  ui.high.textContent = settings.highScore|0;

  let palette = settings.colorMode === 'cb' ? COLORS_CB : COLORS_STANDARD;

  function resizeCanvas(px){
    const w = COLS * px, h = (ROWS - 2) * px; // only visible height in pixels for drawing
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  }
  resizeCanvas(settings.pixel);

  // Game state machine
  const GameState = Object.freeze({ Playing:1, LineFlash:2, Collapse:3, GameOver:4 });
  let state = GameState.Playing;
  let paused = false;

  // Input state for DAS/ARR/soft drop
  const input = {
    held: new Map(), // code -> {downTime, lastRepeatTime, isRepeatable}
    is(code){ return input.held.has(code); },
    press(code){
      if (!input.held.has(code)) input.held.set(code, {downTime: performance.now(), lastRepeatTime: 0});
    },
    release(code){ input.held.delete(code); },
    clear(){ input.held.clear(); }
  };

  // Board & pieces
  const field = createField(COLS, ROWS);
  let current = null; // active piece or null
  let nextPiece = randomPiece();
  let gravityCounter = 0; // frame counter for gravity
  let lastFrameTime = performance.now();

  let level = 0, linesCleared = 0, score = 0;

  // Line clear bookkeeping
  let flashingRows = [];
  let flashStart = 0;

  // Audio
  const audio = makeAudio();
  setMute(settings.mute);
  audio.setVolume(settings.volume);

  // Spawn initial piece
  spawn();

  // --------------- Piece definitions (4x4 masks) ---------------
  // Each entry is array of 4 rotations; each rotation is list of [r,c] coordinates within 4x4
  const SHAPES = {
    I: [
      [[1,0],[1,1],[1,2],[1,3]],
      [[0,2],[1,2],[2,2],[3,2]],
      [[1,0],[1,1],[1,2],[1,3]],
      [[0,2],[1,2],[2,2],[3,2]]
    ],
    O: [
      [[1,1],[1,2],[2,1],[2,2]],
      [[1,1],[1,2],[2,1],[2,2]],
      [[1,1],[1,2],[2,1],[2,2]],
      [[1,1],[1,2],[2,1],[2,2]],
    ],
    T: [
      [[1,0],[1,1],[1,2],[0,1]],
      [[0,1],[1,1],[2,1],[1,2]],
      [[1,0],[1,1],[1,2],[2,1]],
      [[0,1],[1,1],[2,1],[1,0]],
    ],
    S: [
      [[0,0],[0,1],[1,1],[1,2]],
      [[0,1],[1,1],[1,2],[2,2]],
      [[0,0],[0,1],[1,1],[1,2]],
      [[0,1],[1,1],[1,2],[2,2]],
    ],
    Z: [
      [[0,1],[0,2],[1,0],[1,1]],
      [[0,2],[1,2],[1,1],[2,1]],
      [[0,1],[0,2],[1,0],[1,1]],
      [[0,2],[1,2],[1,1],[2,1]],
    ],
    J: [
      [[1,0],[1,1],[1,2],[0,0]],
      [[0,1],[1,1],[2,1],[2,2]],
      [[1,0],[1,1],[1,2],[2,2]],
      [[0,1],[1,1],[2,1],[0,0]],
    ],
    L: [
      [[1,0],[1,1],[1,2],[0,2]],
      [[0,1],[1,1],[2,1],[0,2]],
      [[1,0],[1,1],[1,2],[2,0]],
      [[0,1],[1,1],[2,1],[2,0]],
    ],
  };

  const PIECE_COLORS = {
    I:"I", O:"O", T:"T", S:"S", Z:"Z", J:"J", L:"L"
  };

  function createField(w,h){
    const grid = new Array(h);
    for(let y=0;y<h;y++){ grid[y] = new Array(w).fill(0); }
    return grid;
  }

  function randomPiece(){
    const keys = Object.keys(SHAPES);
    const id = keys[Math.floor(Math.random()*keys.length)];
    return { id, rot:0, X:3, Y:0 }; // 4x4 box top-left at (3,0)
  }

  function cellsOf(piece){
    const shape = SHAPES[piece.id][piece.rot];
    return shape.map(([r,c]) => ({x: piece.X + c, y: piece.Y + r}));
  }

  function canPlace(piece, grid = field){
    const cells = cellsOf(piece);
    for(const p of cells){
      if (p.x < 0 || p.x >= COLS || p.y < 0 || p.y >= ROWS) return false;
      if (grid[p.y][p.x]) return false;
    }
    return true;
  }

  function mergeToField(piece){
    const color = PIECE_COLORS[piece.id];
    for(const p of cellsOf(piece)){
      if (p.y>=0 && p.y<ROWS && p.x>=0 && p.x<COLS){
        field[p.y][p.x] = color;
      }
    }
  }

  function spawn(){
    current = nextPiece;
    current.rot = 0;
    current.X = 3; current.Y = 0;
    nextPiece = randomPiece();
    if (!canPlace(current)){
      // immediate Game Over
      state = GameState.GameOver;
      audio.play('over');
      overlay('GAME OVER');
      settings.highScore = Math.max(settings.highScore|0, score|0);
      saveSettings();
      document.getElementById('high').textContent = settings.highScore;
    }
    updateHUD();
  }

  function overlay(text){
    const el = document.getElementById('overlay');
    el.classList.remove('hidden');
    el.textContent = text;
  }
  function hideOverlay(){ document.getElementById('overlay').classList.add('hidden'); }

  function setMute(m){ settings.mute = !!m; audio.setMute(settings.mute); }

  // -------------------- Rendering --------------------
  function draw(){
    const px = settings.pixel;
    const ctx = document.getElementById('board').getContext('2d');
    const canvas = document.getElementById('board');
    const nextCtx = document.getElementById('next').getContext('2d');
    // palettes
    const map = settings.colorMode === 'cb' ? COLORS_CB : COLORS_STANDARD;

    // background
    ctx.fillStyle = map.bg;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    // grid (visible rows)
    ctx.strokeStyle = map.gridDark;
    ctx.lineWidth = 1;
    for(let x=0;x<=COLS;x++){
      ctx.beginPath();
      ctx.moveTo(x*px+0.5,0);
      ctx.lineTo(x*px+0.5,(ROWS-HIDDEN_ROWS)*px);
      ctx.stroke();
    }
    for(let y=0;y<=ROWS-HIDDEN_ROWS;y++){
      ctx.beginPath();
      ctx.moveTo(0,y*px+0.5);
      ctx.lineTo(COLS*px,y*px+0.5);
      ctx.stroke();
    }
    // draw fixed field
    for(let y=HIDDEN_ROWS;y<ROWS;y++){
      for(let x=0;x<COLS;x++){
        const cell = field[y][x];
        if(cell){
          drawCell(ctx, x, y-HIDDEN_ROWS, map[cell]);
        }
      }
    }
    // draw flashing rows overlay (LineFlash)
    if(state === GameState.LineFlash){
      const now = performance.now();
      const phase = Math.floor((now - flashStart) / (FLASH_MS/2)) % 2;
      if(phase === 0){
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        for(const row of flashingRows){
          ctx.fillRect(0,(row-HIDDEN_ROWS)*px, COLS*px, px);
        }
      }
    }
    // draw current piece
    if(current && state === GameState.Playing && !paused){
      const cells = cellsOf(current);
      for(const p of cells){
        if(p.y >= HIDDEN_ROWS) drawCell(ctx, p.x, p.y-HIDDEN_ROWS, map[current.id]);
      }
    }
    // draw next
    drawNext(nextCtx);
  }

  function drawCell(ctx, gridX, gridY, color){
    const px = settings.pixel;
    const x = gridX*px, y = gridY*px;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, px, px);
    // inner shading for retro look
    ctx.strokeStyle = '#333';
    ctx.strokeRect(x+0.5, y+0.5, px-1, px-1);
  }

  function drawNext(nextCtx){
    const px = Math.floor(nextCtx.canvas.width/4);
    const map = settings.colorMode === 'cb' ? COLORS_CB : COLORS_STANDARD;
    nextCtx.fillStyle = '#000';
    nextCtx.fillRect(0,0,nextCtx.canvas.width,nextCtx.canvas.height);
    const color = map[nextPiece.id];
    nextCtx.fillStyle = color;
    const shape = SHAPES[nextPiece.id][0];
    for(const [r,c] of shape){
      nextCtx.fillRect(c*px, r*px, px, px);
      nextCtx.strokeStyle = '#333';
      nextCtx.strokeRect(c*px+0.5, r*px+0.5, px-1, px-1);
    }
  }

  function updateHUD(){
    document.getElementById('score').textContent = score|0;
    document.getElementById('level').textContent = level|0;
    document.getElementById('lines').textContent = linesCleared|0;
    document.getElementById('high').textContent = settings.highScore|0;
  }

  // -------------------- Line detection --------------------
  function detectFullRows(){
    const rows = [];
    for(let y=HIDDEN_ROWS; y<ROWS; y++){
      let full = true;
      for(let x=0; x<COLS; x++){
        if(!field[y][x]) { full = false; break; }
      }
      if(full) rows.push(y);
    }
    return rows;
  }

  function startLineFlash(rows){
    flashingRows = rows.slice();
    flashStart = performance.now();
    state = GameState.LineFlash;
    // During line flash: input + gravity disabled. active piece must be null.
    // Guard: ensure no active piece exists to prevent the known bug.
    current = null;
  }

  function doCollapse(){
    // Remove rows and move above down
    const rows = flashingRows.slice().sort((a,b)=>a-b);
    const count = rows.length;
    for(const row of rows){
      for(let y=row; y>0; y--){
        field[y] = field[y-1].slice();
      }
      field[0] = new Array(COLS).fill(0);
    }
    // scoring & lines
    if(count>0){
      score += SCORES[count] * (level + 1);
      linesCleared += count;
      if(Math.floor(linesCleared/10) > level) { level = Math.floor(linesCleared/10); play('level'); }
      if(count===4) play('tetris'); else play('line');
      if(score > (settings.highScore|0)){ settings.highScore = score|0; saveSettings(); }
    }
    updateHUD();
    flashingRows = [];
  }

  // -------------------- Game loop --------------------
  function step(){
    const now = performance.now();
    const dt = now - lastFrameTime;
    lastFrameTime = now;

    if(paused){
      overlay('PAUSED');
      draw();
      requestAnimationFrame(step);
      return;
    } else if(state !== GameState.GameOver){
      hideOverlay();
    }

    if(state === GameState.Playing){
      handleInput(dt);
      updateGravity(dt);
      draw();
    } else if (state === GameState.LineFlash){
      if (now - flashStart >= FLASH_MS){
        state = GameState.Collapse;
      }
      draw();
    } else if (state === GameState.Collapse){
      doCollapse();
      state = GameState.Playing;
      spawn(); // spawn only after collapse
      draw();
    } else if (state === GameState.GameOver){
      draw();
    }
    requestAnimationFrame(step);
  }

  function updateGravity(dt){
    gravityCounter += dt;
    const framesPerCell = GRAVITY_TABLE[Math.min(level, 29)] * (1000/60);
    while(gravityCounter >= framesPerCell){
      gravityCounter -= framesPerCell;
      tryFall();
    }
  }

  function tryFall(){
    if(!current) return;
    const moved = {...current, Y: current.Y + 1};
    if (canPlace(moved)){
      current = moved;
    } else {
      // Lock immediately
      mergeToField(current);
      current = null; // ensure cleared before any line action
      const rows = detectFullRows();
      if(rows.length){
        startLineFlash(rows);
      } else {
        spawn();
      }
      play('land');
    }
  }

  // -------------------- Input --------------------
  function handleInput(dt){
    if(!current) return;

    const now = performance.now();
    const leftCodes = settings.keys.left;
    const rightCodes = settings.keys.right;

    const moveIf = (dir) => {
      const dx = dir < 0 ? -1 : 1;
      const tryMove = () => {
        const test = {...current, X: current.X + dx};
        if(canPlace(test)){ current = test; play('move'); return true; }
        return false;
      };

      const codes = dir<0 ? leftCodes : rightCodes;
      const pressed = codes.find(c => input.is(c));
      if(!pressed) return;

      const meta = input.held.get(pressed);
      const elapsed = now - meta.downTime;
      if(meta.lastRepeatTime === 0){
        if(tryMove()){ meta.lastRepeatTime = now; }
      } else if (elapsed >= 150){
        if(now - meta.lastRepeatTime >= 50){
          if(tryMove()){ meta.lastRepeatTime = now; }
          else { meta.lastRepeatTime = now; }
        }
      }
    };

    moveIf(-1);
    moveIf(1);

    // Soft drop
    const downPressed = settings.keys.down.some(c => input.is(c));
    if(downPressed){
      const test = {...current, Y: current.Y + 1};
      if(canPlace(test)){ current = test; score += 1; updateHUD(); }
    }
  }

  function rotate(dir){ // dir: +1 cw, -1 ccw
    if(!current) return;
    const rot = (current.rot + (dir>0?1:3)) % 4;
    const test = {...current, rot};
    if(canPlace(test)){ current = test; play('rotate'); }
  }

  // -------------------- Events --------------------
  function keyToAction(code){
    const map = settings.keys;
    const match = (arr) => arr && arr.includes(code);
    if(match(map.left)) return 'left';
    if(match(map.right)) return 'right';
    if(match(map.down)) return 'down';
    if(match(map.cw)) return 'cw';
    if(match(map.ccw)) return 'ccw';
    if(match(map.pause)) return 'pause';
    if(match(map.restart)) return 'restart';
    if(match(map.mute)) return 'mute';
    return null;
  }

  window.addEventListener('keydown', (e) => {
    const action = keyToAction(e.code);
    if(!action) return;
    e.preventDefault();
    if(state === GameState.LineFlash || state === GameState.Collapse) return;

    if(action === 'pause'){
      if(state !== GameState.GameOver){
        paused = !paused;
        if(!paused) hideOverlay(); else overlay('PAUSED');
      }
      return;
    }
    if(action === 'restart'){ resetGame(); return; }
    if(action === 'mute'){ setMute(!settings.mute); saveSettings(); return; }

    if(paused || state !== GameState.Playing) return;

    if(action === 'left' || action === 'right' || action === 'down'){
      input.press(e.code);
    } else if(action === 'cw'){
      rotate(+1);
    } else if(action === 'ccw'){
      rotate(-1);
    }
  }, {passive:false});

  window.addEventListener('keyup', (e) => { input.release(e.code); });
  window.addEventListener('blur', () => input.clear());

  function resetGame(){
    for(let y=0;y<ROWS;y++) field[y].fill(0);
    level=0; linesCleared=0; score=0;
    gravityCounter=0;
    paused=false;
    state = GameState.Playing;
    current = null;
    nextPiece = randomPiece();
    spawn();
    updateHUD();
    hideOverlay();
    play('start');
  }

  // -------------------- Settings UI --------------------
  const dlg = document.getElementById('settings');
  const btnSettings = document.getElementById('btnSettings');
  const btnClose = document.getElementById('btnClose');
  const optPixel = document.getElementById('optPixel');
  const optColor = document.getElementById('optColor');
  const optVol = document.getElementById('optVol');
  const volVal = document.getElementById('volVal');
  const optMute = document.getElementById('optMute');
  const optCRT = document.getElementById('optCRT');
  const btnResetKeys = document.getElementById('btnResetKeys');

  btnSettings.addEventListener('click', ()=>{
    optPixel.value = String(settings.pixel);
    optColor.value = settings.colorMode;
    optVol.value = String(Math.round(settings.volume*100));
    volVal.textContent = `${Math.round(settings.volume*100)}%`;
    optMute.checked = !!settings.mute;
    optCRT.checked = !!settings.crt;
    dlg.showModal();
  });
  btnClose.addEventListener('click', ()=>dlg.close());
  optPixel.addEventListener('change', ()=>{
    settings.pixel = parseInt(optPixel.value,10);
    const w = COLS * settings.pixel, h = (ROWS - 2) * settings.pixel;
    const board = document.getElementById('board');
    board.width = w; board.height = h;
    board.style.width = w + 'px'; board.style.height = h + 'px';
    saveSettings();
  });
  optColor.addEventListener('change', ()=>{
    settings.colorMode = optColor.value;
    saveSettings();
  });
  optVol.addEventListener('input', ()=>{
    const v = parseInt(optVol.value,10)/100;
    volVal.textContent = `${Math.round(v*100)}%`;
    audio.setVolume(v);
    settings.volume = v; saveSettings();
  });
  optMute.addEventListener('change', ()=>{
    setMute(optMute.checked);
    saveSettings();
  });
  optCRT.addEventListener('change', ()=>{
    settings.crt = optCRT.checked;
    document.getElementById('crt').classList.toggle('hidden', !settings.crt);
    saveSettings();
  });

  btnResetKeys.addEventListener('click', ()=>{
    settings.keys = JSON.parse(JSON.stringify({
      left:['ArrowLeft'], right:['ArrowRight'], down:['ArrowDown'], cw:['ArrowUp','KeyX'],
      ccw:['KeyZ'], pause:['KeyP'], restart:['KeyR'], mute:['KeyM']
    }));
    saveSettings();
    renderKeyButtons();
  });

  function renderKeyButtons(){
    document.querySelectorAll('button.rebind').forEach(btn=>{
      const action = btn.dataset.action;
      btn.textContent = (settings.keys[action]||[]).join(', ') || '(none)';
      btn.onclick = ()=>{
        btn.textContent='Press key...';
        const onKey = (e)=>{
          e.preventDefault();
          const code = e.code;
          settings.keys[action] = [code];
          saveSettings();
          renderKeyButtons();
          window.removeEventListener('keydown', onKey, true);
        };
        window.addEventListener('keydown', onKey, true);
      };
    });
  }
  renderKeyButtons();

  function saveSettings(){ try{ localStorage.setItem('tetrisClassicSettings', JSON.stringify(settings)); }catch{} }

  // -------------------- Audio --------------------
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let muted=false, volume=settings.volume;
  function playTone(freq, dur=0.06, type='square', gain=0.05){
    if(muted) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = gain * Math.max(0,Math.min(1,volume));
    o.connect(g).connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  }
  function play(name){
    switch(name){
      case 'move': playTone(180,0.03,'square',0.03); break;
      case 'rotate': playTone(260,0.05,'square',0.04); break;
      case 'land': playTone(120,0.06,'square',0.05); break;
      case 'line': playTone(420,0.12,'square',0.05); break;
      case 'tetris': playTone(540,0.18,'square',0.06); break;
      case 'level': playTone(700,0.15,'square',0.05); break;
      case 'start': playTone(300,0.2,'square',0.05); break;
      case 'over': playTone(90,0.4,'square',0.07); break;
    }
  }
  function setMute(m){ muted=!!m; }
  function setVolume(v){ volume=v; }

  function makeAudio(){ return { setMute, setVolume }; }

  // -------------------- Init --------------------
  document.getElementById('crt').classList.toggle('hidden', !settings.crt);
  requestAnimationFrame(step);

})();