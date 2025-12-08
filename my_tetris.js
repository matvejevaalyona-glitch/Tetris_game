// ========== CONSTANTS ==========
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = {
  I: '#00F0F0', // Cyan
  O: '#F0F000', // Yellow
  T: '#A000F0', // Purple
  S: '#00F000', // Green
  Z: '#F00000', // Red
  J: '#0000F0', // Blue
  L: '#F0A000', // Orange
};

// Tetromino shapes - each is a set of block coordinates
const SHAPES = {
  I: [[0, 0], [0, 1], [0, 2], [0, 3]],
  O: [[0, 0], [0, 1], [1, 0], [1, 1]],
  T: [[0, 1], [1, 0], [1, 1], [1, 2]],
  S: [[0, 1], [0, 2], [1, 0], [1, 1]],
  Z: [[0, 0], [0, 1], [1, 1], [1, 2]],
  J: [[0, 0], [1, 0], [1, 1], [1, 2]],
  L: [[0, 2], [1, 0], [1, 1], [1, 2]],
};

// ========== GLOBAL VARIABLES ==========
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('holdCanvas');
const holdCtx = holdCanvas.getContext('2d');

let board = []; // game field
let currentPiece = null; // currently falling piece
let nextPiece = null; // next piece
let holdPiece = null; // piece in hold
let canHold = true; // can use hold function
let score = 0;
let level = 1;
let lines = 0;
let gameOver = false;
let isPaused = false;
let dropCounter = 0;
let dropInterval = 1000; // falling speed (ms)
let lastTime = 0;

// Bag for piece generation (7-bag system)
let bag = [];

// Sounds (placeholders, since we don't have real files)
const bgMusic = document.getElementById('bgMusic');

// ========== INITIALIZATION ==========
function init() {
  // Create empty board
  for (let r = 0; r < ROWS; r++) {
    board[r] = [];
    for (let c = 0; c < COLS; c++) {
      board[r][c] = 0;
    }
  }
  
  score = 0;
  level = 1;
  lines = 0;
  gameOver = false;
  isPaused = false;
  dropCounter = 0;
  lastTime = 0;
  
  updateScore();
  
  // Fill the bag with pieces
  refillBag();
  nextPiece = getNextPiece();
  spawnPiece();
  
  // Start music
  bgMusic.play().catch(() => {
    console.log('Music autoplay blocked');
  });
  
  // Countdown
  showCountdown();
}

// Countdown before start
function showCountdown() {
  const countdownEl = document.getElementById('countdown');
  let count = 3;
  countdownEl.classList.remove('hidden');
  countdownEl.textContent = count;
  
  const countInterval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownEl.textContent = count;
    } else {
      countdownEl.classList.add('hidden');
      clearInterval(countInterval);
      requestAnimationFrame(gameLoop);
    }
  }, 1000);
}

// ========== 7-BAG SYSTEM ==========
// Random generation system that gives all 7 pieces in random order
function refillBag() {
  const pieces = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  bag = [];
  
  // Shuffle pieces
  while (pieces.length > 0) {
    const index = Math.floor(Math.random() * pieces.length);
    bag.push(pieces.splice(index, 1)[0]);
  }
}

function getNextPiece() {
  if (bag.length === 0) {
    refillBag();
  }
  return bag.shift();
}

// ========== PIECE CREATION ==========
function spawnPiece() {
  const type = nextPiece;
  const shape = SHAPES[type];
  const color = COLORS[type];
  
  // Determine starting position
  let x;
  if (type === 'I' || type === 'O') {
    x = Math.floor(COLS / 2) - 2; // middle
  } else {
    x = Math.floor(COLS / 2) - 2; // left-middle
  }
  
  currentPiece = {
    type,
    shape: shape.map(block => [...block]),
    x,
    y: 0,
    color,
  };
  
  // Check for game over
  if (checkCollision(currentPiece, 0, 0)) {
    gameOver = true;
    showGameOver();
    return;
  }
  
  // Prepare next piece
  nextPiece = getNextPiece();
  drawNextPiece();
  canHold = true;
}

// ========== DRAWING ==========
function draw() {
  // Clear canvas
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw grid
  ctx.strokeStyle = '#333';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    }
  }
  
  // Draw already fallen blocks
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) {
        ctx.fillStyle = board[r][c];
        ctx.fillRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        ctx.strokeStyle = '#000';
        ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      }
    }
  }
  
  // Draw ghost piece (shows where piece will land)
  if (currentPiece) {
    drawGhost();
  }
  
  // Draw current piece
  if (currentPiece) {
    ctx.fillStyle = currentPiece.color;
    currentPiece.shape.forEach(([r, c]) => {
      const drawX = (currentPiece.x + c) * BLOCK_SIZE;
      const drawY = (currentPiece.y + r) * BLOCK_SIZE;
      ctx.fillRect(drawX, drawY, BLOCK_SIZE, BLOCK_SIZE);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(drawX, drawY, BLOCK_SIZE, BLOCK_SIZE);
    });
  }
}

// Ghost piece - shows where the piece will land
function drawGhost() {
  let ghostY = currentPiece.y;
  
  // Find the lowest position
  while (!checkCollision(currentPiece, 0, ghostY - currentPiece.y + 1)) {
    ghostY++;
  }
  
  // Draw semi-transparent piece
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = currentPiece.color;
  currentPiece.shape.forEach(([r, c]) => {
    const drawX = (currentPiece.x + c) * BLOCK_SIZE;
    const drawY = (ghostY + r) * BLOCK_SIZE;
    ctx.fillRect(drawX, drawY, BLOCK_SIZE, BLOCK_SIZE);
  });
  ctx.globalAlpha = 1.0;
}

// Draw next piece
function drawNextPiece() {
  nextCtx.fillStyle = '#000';
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
  
  const shape = SHAPES[nextPiece];
  const color = COLORS[nextPiece];
  const size = 25;
  
  nextCtx.fillStyle = color;
  shape.forEach(([r, c]) => {
    nextCtx.fillRect(c * size + 15, r * size + 15, size, size);
    nextCtx.strokeStyle = '#000';
    nextCtx.strokeRect(c * size + 15, r * size + 15, size, size);
  });
}

// Draw hold piece
function drawHoldPiece() {
  holdCtx.fillStyle = '#000';
  holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
  
  if (holdPiece) {
    const shape = SHAPES[holdPiece];
    const color = COLORS[holdPiece];
    const size = 25;
    
    holdCtx.fillStyle = color;
    shape.forEach(([r, c]) => {
      holdCtx.fillRect(c * size + 15, r * size + 15, size, size);
      holdCtx.strokeStyle = '#000';
      holdCtx.strokeRect(c * size + 15, r * size + 15, size, size);
    });
  }
}

// ========== COLLISION DETECTION ==========
function checkCollision(piece, dx, dy) {
  for (let [r, c] of piece.shape) {
    const newX = piece.x + c + dx;
    const newY = piece.y + r + dy;
    
    // Check boundaries
    if (newX < 0 || newX >= COLS || newY >= ROWS) {
      return true;
    }
    
    // Check collision with other blocks
    if (newY >= 0 && board[newY][newX]) {
      return true;
    }
  }
  return false;
}

// ========== MOVEMENT ==========
function movePiece(dx, dy) {
  if (!checkCollision(currentPiece, dx, dy)) {
    currentPiece.x += dx;
    currentPiece.y += dy;
    return true;
  }
  return false;
}

// Rotate piece (simplified SRS - Super Rotation System)
function rotatePiece() {
  const rotated = currentPiece.shape.map(([r, c]) => [c, -r]);
  const oldShape = currentPiece.shape;
  
  currentPiece.shape = rotated;
  
  // Simple wall kicks (if doesn't fit, try shifting)
  const kicks = [[0, 0], [-1, 0], [1, 0], [0, -1]];
  
  for (let [dx, dy] of kicks) {
    if (!checkCollision(currentPiece, dx, dy)) {
      currentPiece.x += dx;
      currentPiece.y += dy;
      return;
    }
  }
  
  // If rotation failed, restore old shape
  currentPiece.shape = oldShape;
}

// Hard drop - instant fall
function hardDrop() {
  while (movePiece(0, 1)) {
    score += 2; // bonus for hard drop
  }
  lockPiece();
}

// Lock piece on board
function lockPiece() {
  currentPiece.shape.forEach(([r, c]) => {
    const x = currentPiece.x + c;
    const y = currentPiece.y + r;
    if (y >= 0) {
      board[y][x] = currentPiece.color;
    }
  });
  
  clearLines();
  spawnPiece();
}

// Hold function
function hold() {
  if (!canHold) return;
  
  if (!holdPiece) {
    holdPiece = currentPiece.type;
    spawnPiece();
  } else {
    const temp = holdPiece;
    holdPiece = currentPiece.type;
    
    const type = temp;
    const shape = SHAPES[type];
    const color = COLORS[type];
    
    currentPiece = {
      type,
      shape: shape.map(block => [...block]),
      x: Math.floor(COLS / 2) - 2,
      y: 0,
      color,
    };
  }
  
  canHold = false;
  drawHoldPiece();
}

// ========== LINE CLEARING ==========
function clearLines() {
  let linesCleared = 0;
  
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(cell => cell !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      linesCleared++;
      r++; // check this row again
    }
  }
  
  if (linesCleared > 0) {
    // Score calculation (simplified system)
    const points = [0, 100, 300, 500, 800];
    score += points[linesCleared] * level;
    lines += linesCleared;
    
    // Level up every 10 lines
    level = Math.floor(lines / 10) + 1;
    if (level > 15) level = 15;
    
    // Increase speed
    dropInterval = Math.max(100, 1000 - (level - 1) * 50);
    
    updateScore();
  }
}

// ========== SCORE UPDATE ==========
function updateScore() {
  document.getElementById('score').textContent = score;
  document.getElementById('level').textContent = level;
  document.getElementById('lines').textContent = lines;
}

// ========== GAME OVER ==========
function showGameOver() {
  document.getElementById('gameOver').classList.remove('hidden');
  bgMusic.pause();
}

// ========== CONTROLS ==========
document.addEventListener('keydown', (e) => {
  if (gameOver) {
    if (e.key === 'Enter') {
      document.getElementById('gameOver').classList.add('hidden');
      init();
    }
    return;
  }
  
  if (isPaused && e.key !== 'Escape') return;
  
  switch (e.key) {
    case 'ArrowLeft':
      movePiece(-1, 0);
      break;
    case 'ArrowRight':
      movePiece(1, 0);
      break;
    case 'ArrowDown':
      if (movePiece(0, 1)) {
        score += 1;
      }
      break;
    case 'ArrowUp':
    case 'x':
    case 'X':
      rotatePiece();
      break;
    case ' ':
      e.preventDefault();
      hardDrop();
      break;
    case 'c':
    case 'C':
    case 'Shift':
      hold();
      break;
    case 'Escape':
      isPaused = !isPaused;
      if (isPaused) {
        bgMusic.pause();
      } else {
        bgMusic.play();
        showCountdown();
      }
      break;
    case 'z':
    case 'Z':
      // Rotate counterclockwise (simplified version)
      rotatePiece();
      rotatePiece();
      rotatePiece();
      break;
  }
  
  draw();
});

// ========== GAME LOOP ==========
function gameLoop(time = 0) {
  if (gameOver || isPaused) return;
  
  const deltaTime = time - lastTime;
  lastTime = time;
  
  dropCounter += deltaTime;
  
  if (dropCounter > dropInterval) {
    if (!movePiece(0, 1)) {
      lockPiece();
    }
    dropCounter = 0;
  }
  
  draw();
  requestAnimationFrame(gameLoop);
}

// ========== START GAME ==========
init();