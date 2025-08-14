// --- Canvas & Rendering ---
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');

// Upscale for pixel art
context.scale(20, 20);

// Colors for pieces (index 0 = empty)
const colors = [
  null,
  '#00f0f0', // I
  '#0000f0', // J
  '#f0a000', // L
  '#f0f000', // O
  '#00f000', // S
  '#a000f0', // T
  '#f00000', // Z
];

// --- Sounds ---
const moveSound = document.getElementById('move-sound');
const rotateSound = document.getElementById('rotate-sound');
const dropSound = document.getElementById('drop-sound');
const clearSound = document.getElementById('clear-sound');
const gameoverSound = document.getElementById('gameover-sound');

function playSound(el) {
  if (!el) return;
  try {
    el.currentTime = 0;
    el.play();
  } catch (e) {
    // ignore autoplay restrictions
  }
}

// --- Matrix helpers ---
function createMatrix(w, h) {
  const matrix = [];
  while (h--) matrix.push(new Array(w).fill(0));
  return matrix;
}

function createPiece(type) {
  switch (type) {
    case 'T': return [
      [0, 0, 0],
      [7, 7, 7],
      [0, 7, 0],
    ];
    case 'O': return [
      [4, 4],
      [4, 4],
    ];
    case 'L': return [
      [0, 2, 0],
      [0, 2, 0],
      [0, 2, 2],
    ];
    case 'J': return [
      [0, 3, 0],
      [0, 3, 0],
      [3, 3, 0],
    ];
    case 'I': return [
      [1, 1, 1, 1],
    ];
    case 'S': return [
      [0, 5, 5],
      [5, 5, 0],
      [0, 0, 0],
    ];
    case 'Z': return [
      [6, 6, 0],
      [0, 6, 6],
      [0, 0, 0],
    ];
  }
}

// Collision detection
function collide(arena, player) {
  const m = player.matrix;
  const o = player.pos;
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m[y].length; x++) {
      if (m[y][x] !== 0 &&
          (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

// Merge piece into arena
function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

// Clear lines and score
function arenaSweep() {
  let rowCount = 1;
  let cleared = 0;
  outer: for (let y = arena.length - 1; y >= 0; y--) {
    for (let x = 0; x < arena[y].length; x++) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    y++;
    player.score += rowCount * 10;
    rowCount *= 2;
    cleared++;
  }
  if (cleared > 0) playSound(clearSound);
}

// Rotate matrix
function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < y; x++) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir > 0) {
    matrix.forEach(row => row.reverse());
  } else {
    matrix.reverse();
  }
}

function playerReset() {
  const pieces = 'TJLOSZI';
  player.matrix = createPiece(pieces[(pieces.length * Math.random()) | 0]);
  player.pos.y = 0;
  player.pos.x = ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);
  // Game over check
  if (collide(arena, player)) {
    playSound(gameoverSound);
    arena.forEach(row => row.fill(0));
    player.score = 0;
    updateScore();
  }
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    // FIX: clear lines BEFORE spawning new piece
    arenaSweep();
    updateScore();
    playerReset();
    playSound(dropSound);
  }
  dropCounter = 0;
}

function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) {
    player.pos.x -= dir;
  } else {
    playSound(moveSound);
  }
}

function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
  playSound(rotateSound);
}

// Draw helpers
function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = colors[value];
        context.fillRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
}

function draw() {
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawMatrix(arena, {x: 0, y: 0});
  drawMatrix(player.matrix, player.pos);
}

// Game loop
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let paused = false;

function update(time = 0) {
  if (paused) {
    requestAnimationFrame(update);
    return;
  }
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    playerDrop();
  }
  draw();
  requestAnimationFrame(update);
}

function updateScore() {
  document.getElementById('score').innerText = player.score;
  const hsKey = 'tetris_high_score';
  const prev = Number(localStorage.getItem(hsKey) || 0);
  if (player.score > prev) {
    localStorage.setItem(hsKey, String(player.score));
  }
  document.getElementById('highScore').innerText =
    localStorage.getItem(hsKey) || '0';
}

// Input
document.addEventListener('keydown', (event) => {
  const k = event.key;
  if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowDown') {
    event.preventDefault();
  }
  if (k === 'ArrowLeft') {
    playerMove(-1);
  } else if (k === 'ArrowRight') {
    playerMove(1);
  } else if (k === 'ArrowDown') {
    playerDrop();
  } else if (k === 'q' || k === 'Q') {
    playerRotate(-1);
  } else if (k === 'w' || k === 'W') {
    playerRotate(1);
  } else if (k === 'p' || k === 'P') {
    paused = !paused;
  }
});

// Arena & Player
const arena = createMatrix(12, 20);
const player = {
  pos: {x: 0, y: 0},
  matrix: null,
  score: 0,
};

playerReset();
updateScore();
update();
