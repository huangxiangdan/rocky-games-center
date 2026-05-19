// ============ 迷宫捉迷藏游戏 ============

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const overlayBtn = document.getElementById('overlay-btn');
const levelDisplay = document.getElementById('level-display');
const timerDisplay = document.getElementById('timer-display');
const caughtDisplay = document.getElementById('caught-display');

// ---- 关卡配置 ----
const LEVELS = [
  { maze: 0, npcCount: 4, time: 60, npcSpeed: 1.2, name: '关卡 1' },
  { maze: 1, npcCount: 5, time: 55, npcSpeed: 1.5, name: '关卡 2' },
  { maze: 2, npcCount: 6, time: 50, npcSpeed: 1.8, name: '关卡 3' },
];

// ---- 预设迷宫 (1=墙, 0=路) ----
const MAZES = [
  // 迷宫1: 11x11
  [
    [1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,0,1,0,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,1,0,1],
    [1,0,1,1,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,1],
    [1,1,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1],
  ],
  // 迷宫2: 13x13
  [
    [1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,0,0,1,0,0,0,1],
    [1,0,1,0,1,0,1,0,0,0,1,0,1],
    [1,0,1,0,0,0,1,1,1,0,1,0,1],
    [1,0,1,1,1,0,0,0,1,0,1,0,1],
    [1,0,0,0,1,1,1,0,1,0,0,0,1],
    [1,1,1,0,0,0,0,0,1,1,1,0,1],
    [1,0,0,0,1,1,1,0,0,0,0,0,1],
    [1,0,1,0,1,0,0,0,1,0,1,1,1],
    [1,0,1,0,0,0,1,0,1,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  // 迷宫3: 15x15
  [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
    [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
    [1,0,1,0,0,0,0,0,1,0,0,0,1,0,1],
    [1,0,1,1,1,1,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,1,0,0,0,1],
    [1,1,1,0,1,0,1,1,1,0,1,0,1,1,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,1,1,1,1,0,1],
    [1,0,0,0,1,0,1,0,0,0,0,0,1,0,1],
    [1,1,1,0,1,0,1,1,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,0,1,1,1,1,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
];

// NPC颜色
const NPC_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff9ff3', '#54a0ff'];
const NPC_NAMES = ['小红', '小黄', '小绿', '小蓝', '小粉', '小紫'];

// ---- 游戏状态 ----
let currentLevel = 0;
let gameState = 'menu'; // menu, playing, win, lose
let maze = [];
let cellSize = 0;
let offsetX = 0;
let offsetY = 0;
let timeLeft = 60;
let timerInterval = null;
let player = null;
let npcs = [];
let caughtCount = 0;
let totalNpcs = 0;
let keys = {};
let touchActive = false;
let touchDir = { x: 0, y: 0 };
let particles = [];
let animFrame = null;

// ---- 初始化 Canvas ----
function resizeCanvas() {
  const container = document.getElementById('game-container');
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  if (gameState === 'playing') {
    calculateLayout();
  }
}

function calculateLayout() {
  const rows = maze.length;
  const cols = maze[0].length;
  const maxW = canvas.width - 20;
  const maxH = canvas.height - 70;
  cellSize = Math.floor(Math.min(maxW / cols, maxH / rows));
  offsetX = Math.floor((canvas.width - cols * cellSize) / 2);
  offsetY = Math.floor((canvas.height - rows * cellSize) / 2) + 25;
}

// ---- 获取迷宫空地 ----
function getOpenCells() {
  const cells = [];
  for (let r = 0; r < maze.length; r++) {
    for (let c = 0; c < maze[r].length; c++) {
      if (maze[r][c] === 0) {
        cells.push({ col: c, row: r });
      }
    }
  }
  return cells;
}

// ---- 创建玩家 ----
function createPlayer() {
  const open = getOpenCells();
  const start = open[0];
  return {
    col: start.col,
    row: start.row,
    x: start.col * cellSize + cellSize / 2,
    y: start.row * cellSize + cellSize / 2,
    targetX: 0,
    targetY: 0,
    speed: 3,
    size: cellSize * 0.35,
    color: '#fff',
    moving: false,
  };
}

// ---- 创建NPC ----
function createNPCs(count, speed) {
  const open = getOpenCells();
  const npcs = [];
  const used = new Set();
  used.add('0,0'); // 避免和玩家重叠

  for (let i = 0; i < count; i++) {
    let cell;
    let key;
    let attempts = 0;
    do {
      const idx = Math.floor(Math.random() * open.length);
      cell = open[idx];
      key = cell.col + ',' + cell.row;
      attempts++;
    } while (used.has(key) && attempts < 50);
    used.add(key);

    npcs.push({
      col: cell.col,
      row: cell.row,
      x: cell.col * cellSize + cellSize / 2,
      y: cell.row * cellSize + cellSize / 2,
      speed: speed,
      size: cellSize * 0.3,
      color: NPC_COLORS[i % NPC_COLORS.length],
      name: NPC_NAMES[i % NPC_NAMES.length],
      caught: false,
      dirTimer: 0,
      dir: { x: 0, y: 0 },
      hiding: Math.random() > 0.4, // 60%概率躲着不动
      moveTimer: Math.random() * 100,
    });
  }
  return npcs;
}

// ---- 碰撞检测 ----
function canMove(col, row) {
  if (row < 0 || row >= maze.length || col < 0 || col >= maze[0].length) return false;
  return maze[row][col] === 0;
}

// ---- 粒子效果 ----
function spawnParticles(x, y, color) {
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12;
    const speed = 2 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color,
      size: 3 + Math.random() * 4,
    });
  }
}

// ---- 开始游戏 ----
function startGame() {
  currentLevel = 0;
  startLevel();
}

function startLevel() {
  const level = LEVELS[currentLevel];
  maze = MAZES[level.maze].map(row => [...row]);
  timeLeft = level.time;
  caughtCount = 0;
  totalNpcs = level.npcCount;
  particles = [];

  calculateLayout();
  player = createPlayer();
  npcs = createNPCs(level.npcCount, level.npcSpeed);

  levelDisplay.textContent = level.name;
  timerDisplay.textContent = '⏱️ ' + timeLeft;
  caughtDisplay.textContent = '找到: 0/' + totalNpcs;

  overlay.classList.remove('show');
  gameState = 'playing';

  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (gameState !== 'playing') return;
    timeLeft--;
    timerDisplay.textContent = '⏱️ ' + timeLeft;
    if (timeLeft <= 0) {
      gameOver(false);
    }
  }, 1000);

  if (animFrame) cancelAnimationFrame(animFrame);
  gameLoop();
}

// ---- 游戏结束 ----
function gameOver(won) {
  gameState = won ? 'win' : 'lose';
  if (timerInterval) clearInterval(timerInterval);

  if (won) {
    if (currentLevel < LEVELS.length - 1) {
      overlayTitle.textContent = '太棒了！🎉';
      const stars = timeLeft > 30 ? '⭐⭐⭐' : timeLeft > 15 ? '⭐⭐' : '⭐';
      overlayText.textContent = `${stars} 用了 ${LEVELS[currentLevel].time - timeLeft} 秒！`;
      overlayBtn.textContent = '下一关';
      overlayBtn.onclick = () => {
        currentLevel++;
        startLevel();
      };
    } else {
      overlayTitle.textContent = '全部通关！🏆';
      overlayText.textContent = '你找到了所有小伙伴！太厉害了！';
      overlayBtn.textContent = '再玩一次';
      overlayBtn.onclick = startGame;
    }
  } else {
    overlayTitle.textContent = '时间到了 😢';
    overlayText.textContent = `找到了 ${caughtCount}/${totalNpcs} 个小伙伴`;
    overlayBtn.textContent = '再试一次';
    overlayBtn.onclick = () => startLevel();
  }

  overlay.classList.add('show');
}

// ---- 更新玩家 ----
function updatePlayer() {
  if (!player) return;

  let dx = 0, dy = 0;

  // 键盘输入
  if (keys['ArrowUp'] || keys['w'] || keys['W']) dy = -1;
  if (keys['ArrowDown'] || keys['s'] || keys['S']) dy = 1;
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx = -1;
  if (keys['ArrowRight'] || keys['d'] || keys['D']) dx = 1;

  // 触摸输入
  if (touchActive) {
    dx = touchDir.x;
    dy = touchDir.y;
  }

  if (dx === 0 && dy === 0) return;

  // 归一化
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 0) {
    dx /= len;
    dy /= len;
  }

  const newX = player.x + dx * player.speed;
  const newY = player.y + dy * player.speed;

  // 检查碰撞 - 分别检测x和y
  const newCol = Math.floor(newX / cellSize);
  const newRow = Math.floor(newY / cellSize);

  const margin = player.size * 0.6;

  // X方向
  const testColX = Math.floor((newX + (dx > 0 ? margin : -margin)) / cellSize);
  const testRowX = Math.floor(player.y / cellSize);
  if (canMove(testColX, testRowX)) {
    player.x = newX;
    player.col = Math.floor(player.x / cellSize);
  }

  // Y方向
  const testColY = Math.floor(player.x / cellSize);
  const testRowY = Math.floor((player.y + (dy > 0 ? margin : -margin)) / cellSize);
  if (canMove(testColY, testRowY)) {
    player.y = newY;
    player.row = Math.floor(player.y / cellSize);
  }

  // 检查抓到NPC
  for (const npc of npcs) {
    if (npc.caught) continue;
    const dist = Math.hypot(player.x - npc.x, player.y - npc.y);
    if (dist < player.size + npc.size) {
      npc.caught = true;
      caughtCount++;
      caughtDisplay.textContent = '找到: ' + caughtCount + '/' + totalNpcs;
      spawnParticles(npc.x + offsetX, npc.y + offsetY, npc.color);
      if (caughtCount >= totalNpcs) {
        gameOver(true);
      }
    }
  }
}

// ---- 更新NPC ----
function updateNPCs() {
  for (const npc of npcs) {
    if (npc.caught) continue;

    npc.moveTimer++;

    // 躲藏的NPC偶尔开始跑
    if (npc.hiding && npc.moveTimer > 120 + Math.random() * 180) {
      npc.hiding = false;
    }

    if (npc.hiding) continue;

    // 改变方向
    npc.dirTimer--;
    if (npc.dirTimer <= 0) {
      const dirs = [
        { x: 1, y: 0 }, { x: -1, y: 0 },
        { x: 0, y: 1 }, { x: 0, y: -1 },
      ];
      npc.dir = dirs[Math.floor(Math.random() * dirs.length)];
      npc.dirTimer = 30 + Math.floor(Math.random() * 60);
    }

    // 如果玩家靠近，逃跑
    if (player) {
      const dist = Math.hypot(player.x - npc.x, player.y - npc.y);
      if (dist < cellSize * 3) {
        const awayX = npc.x - player.x;
        const awayY = npc.y - player.y;
        const awayLen = Math.hypot(awayX, awayY);
        if (awayLen > 0) {
          npc.dir = { x: awayX / awayLen, y: awayY / awayLen };
          npc.dirTimer = 20;
        }
      }
    }

    // 移动
    const newX = npc.x + npc.dir.x * npc.speed;
    const newY = npc.y + npc.dir.y * npc.speed;

    const margin = npc.size * 0.6;
    const testCol = Math.floor((newX + (npc.dir.x > 0 ? margin : -margin)) / cellSize);
    const testRow = Math.floor((newY + (npc.dir.y > 0 ? margin : -margin)) / cellSize);

    let movedX = false, movedY = false;

    if (canMove(testCol, Math.floor(npc.y / cellSize))) {
      npc.x = newX;
      movedX = true;
    }
    if (canMove(Math.floor(npc.x / cellSize), testRow)) {
      npc.y = newY;
      movedY = true;
    }

    if (!movedX && !movedY) {
      npc.dirTimer = 0; // 碰墙换方向
    }
  }
}

// ---- 更新粒子 ----
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.02;
    p.vy += 0.05;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

// ---- 绘制 ----
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 背景
  ctx.fillStyle = '#2d2d44';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (gameState === 'menu') return;

  // 绘制迷宫
  for (let r = 0; r < maze.length; r++) {
    for (let c = 0; c < maze[r].length; c++) {
      const x = c * cellSize + offsetX;
      const y = r * cellSize + offsetY;
      if (maze[r][c] === 1) {
        // 墙壁
        ctx.fillStyle = '#4a4a6a';
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.fillStyle = '#5a5a7a';
        ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
      } else {
        // 地板
        ctx.fillStyle = '#3d3d5c';
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }
  }

  // 绘制NPC
  for (const npc of npcs) {
    if (npc.caught) continue;
    const nx = npc.x + offsetX;
    const ny = npc.y + offsetY;

    // 身体
    ctx.fillStyle = npc.color;
    ctx.beginPath();
    ctx.arc(nx, ny, npc.size, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(nx - npc.size * 0.3, ny - npc.size * 0.2, npc.size * 0.25, 0, Math.PI * 2);
    ctx.arc(nx + npc.size * 0.3, ny - npc.size * 0.2, npc.size * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(nx - npc.size * 0.25, ny - npc.size * 0.2, npc.size * 0.12, 0, Math.PI * 2);
    ctx.arc(nx + npc.size * 0.35, ny - npc.size * 0.2, npc.size * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // 躲藏的NPC有"嘘"标记
    if (npc.hiding) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = `${Math.floor(npc.size * 0.8)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('🤫', nx, ny - npc.size - 5);
    }
  }

  // 绘制玩家
  if (player) {
    const px = player.x + offsetX;
    const py = player.y + offsetY;

    // 身体
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px, py, player.size, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(px - player.size * 0.3, py - player.size * 0.15, player.size * 0.18, 0, Math.PI * 2);
    ctx.arc(px + player.size * 0.3, py - player.size * 0.15, player.size * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // 笑脸
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py + player.size * 0.05, player.size * 0.3, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    // 名字
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(player.size * 0.6)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('我', px, py - player.size - 5);
  }

  // 绘制已抓到的NPC（跟在玩家后面）
  let followIdx = 0;
  for (const npc of npcs) {
    if (!npc.caught) continue;
    followIdx++;
    const fx = player.x + offsetX + Math.sin(Date.now() / 300 + followIdx) * 8;
    const fy = player.y + offsetY + followIdx * (npc.size * 2.2) + Math.cos(Date.now() / 400 + followIdx) * 4;

    ctx.fillStyle = npc.color;
    ctx.beginPath();
    ctx.arc(fx, fy, npc.size * 0.8, 0, Math.PI * 2);
    ctx.fill();

    // 开心表情
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(fx - npc.size * 0.2, fy - npc.size * 0.15, npc.size * 0.15, 0, Math.PI * 2);
    ctx.arc(fx + npc.size * 0.2, fy - npc.size * 0.15, npc.size * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(fx - npc.size * 0.15, fy - npc.size * 0.15, npc.size * 0.08, 0, Math.PI * 2);
    ctx.arc(fx + npc.size * 0.25, fy - npc.size * 0.15, npc.size * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(fx, fy + npc.size * 0.05, npc.size * 0.2, 0, Math.PI);
    ctx.stroke();
  }

  // 绘制粒子
  for (const p of particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---- 游戏循环 ----
function gameLoop() {
  if (gameState === 'playing') {
    updatePlayer();
    updateNPCs();
    updateParticles();
  }
  draw();
  animFrame = requestAnimationFrame(gameLoop);
}

// ---- 键盘事件 ----
document.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault();
  }
});

document.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

// ---- 触摸事件 ----
let touchStartX = 0, touchStartY = 0;

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchActive = true;
  touchDir = { x: 0, y: 0 };
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!touchActive) return;
  const touch = e.touches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  const dist = Math.hypot(dx, dy);
  if (dist > 10) {
    touchDir = { x: dx / dist, y: dy / dist };
  }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  touchActive = false;
  touchDir = { x: 0, y: 0 };
}, { passive: false });

// ---- 窗口大小变化 ----
window.addEventListener('resize', resizeCanvas);

// ---- 启动 ----
resizeCanvas();
gameLoop();
