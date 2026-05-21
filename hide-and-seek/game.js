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
  { maze: 0, npcCount: 4, npcSpeed: 1.2, name: '关卡 1' },
  { maze: 1, npcCount: 5, npcSpeed: 1.5, name: '关卡 2' },
  { maze: 2, npcCount: 6, npcSpeed: 1.8, name: '关卡 3' },
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
let timeLeft = Infinity;
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

// ---- 子弹和眩晕系统 ----
let bullets = [];
let playerStunned = false;
let playerStunTimer = 0;
const STUN_DURATION = 120; // 2秒 (60fps * 2)
const BULLET_SPEED = 5;
const BULLET_SIZE = 4;
const SHOOT_COOLDOWN = 90; // 1.5秒冷却
const NPC_SHOOT_RANGE = cellSize * 5; // NPC射击距离

// BFS距离图缓存
let bfsDistanceMap = null;
let bfsCacheKey = '';

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
      speed: speed * 1.3, // 稍微加快
      size: cellSize * 0.3,
      color: NPC_COLORS[i % NPC_COLORS.length],
      name: NPC_NAMES[i % NPC_NAMES.length],
      caught: false,
      dirTimer: 0,
      dir: { x: 0, y: 0 },
      hiding: false, // 不再躲着不动，更聪明地跑
      moveTimer: Math.random() * 100,
      shootCooldown: 0, // 射击冷却
      hasGun: true, // 每个NPC都有枪
      gunAngle: 0, // 枪口朝向
    });
  }
  return npcs;
}

// ---- 碰撞检测 ----
function canMove(col, row) {
  if (row < 0 || row >= maze.length || col < 0 || col >= maze[0].length) return false;
  return maze[row][col] === 0;
}

// ---- BFS计算从指定位置到所有可达格子的距离 ----
function computeBFS(startCol, startRow) {
  const rows = maze.length;
  const cols = maze[0].length;
  const dist = Array.from({ length: rows }, () => new Array(cols).fill(-1));
  dist[startRow][startCol] = 0;
  const queue = [{ col: startCol, row: startRow }];
  let head = 0;
  const dirs = [{ dc: 1, dr: 0 }, { dc: -1, dr: 0 }, { dc: 0, dr: 1 }, { dc: 0, dr: -1 }];
  while (head < queue.length) {
    const { col, row } = queue[head++];
    for (const { dc, dr } of dirs) {
      const nc = col + dc;
      const nr = row + dr;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && maze[nr][nc] === 0 && dist[nr][nc] === -1) {
        dist[nr][nc] = dist[row][col] + 1;
        queue.push({ col: nc, row: nr });
      }
    }
  }
  return dist;
}

// ---- 计算某个格子有多少个出口（避免死胡同）----
function countExits(col, row) {
  let count = 0;
  if (canMove(col + 1, row)) count++;
  if (canMove(col - 1, row)) count++;
  if (canMove(col, row + 1)) count++;
  if (canMove(col, row - 1)) count++;
  return count;
}

// ---- 获取玩家BFS距离图（带缓存）----
function getPlayerBFSMap() {
  if (!player) return null;
  const pCol = Math.floor(player.x / cellSize);
  const pRow = Math.floor(player.y / cellSize);
  const key = pCol + ',' + pRow;
  if (bfsCacheKey !== key) {
    bfsDistanceMap = computeBFS(pCol, pRow);
    bfsCacheKey = key;
  }
  return bfsDistanceMap;
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
  timeLeft = Infinity;
  caughtCount = 0;
  totalNpcs = level.npcCount;
  particles = [];
  bullets = [];
  playerStunned = false;
  playerStunTimer = 0;
  bfsDistanceMap = null;
  bfsCacheKey = '';

  calculateLayout();
  player = createPlayer();
  npcs = createNPCs(level.npcCount, level.npcSpeed);

  levelDisplay.textContent = level.name;
  timerDisplay.style.display = 'none';
  caughtDisplay.textContent = '找到: 0/' + totalNpcs;

  overlay.classList.remove('show');
  gameState = 'playing';

  // No timer - game has no time limit

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
      overlayText.textContent = '⭐⭐⭐ 你找到了所有小伙伴！';
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
    overlayTitle.textContent = '没找到全部 😢';
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

  // 眩晕时不能移动
  if (playerStunned) return;

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

// ---- 更新NPC（智能躲避 + 射击）----
function updateNPCs() {
  const bfsMap = getPlayerBFSMap();

  for (const npc of npcs) {
    if (npc.caught) continue;

    npc.moveTimer++;
    if (npc.shootCooldown > 0) npc.shootCooldown--;

    // ===== 智能躲避逻辑 =====
    npc.dirTimer--;
    if (npc.dirTimer <= 0 || npc.moveTimer % 10 === 0) {
      const npcCol = Math.floor(npc.x / cellSize);
      const npcRow = Math.floor(npc.y / cellSize);

      if (bfsMap && npcCol >= 0 && npcCol < maze[0].length && npcRow >= 0 && npcRow < maze.length) {
        const playerDist = bfsMap[npcRow][npcCol];

        // 获取所有可走方向
        const possibleDirs = [];
        const dirs = [
          { x: 1, y: 0 }, { x: -1, y: 0 },
          { x: 0, y: 1 }, { x: 0, y: -1 },
        ];

        for (const d of dirs) {
          const nextCol = npcCol + (d.x > 0 ? 1 : d.x < 0 ? -1 : 0);
          const nextRow = npcRow + (d.y > 0 ? 1 : d.y < 0 ? -1 : 0);
          if (canMove(nextCol, nextRow)) {
            const nextDist = bfsMap[nextRow][nextCol];
            const exits = countExits(nextCol, nextRow);
            possibleDirs.push({
              dir: d,
              dist: nextDist,
              exits: exits,
            });
          }
        }

        if (possibleDirs.length > 0) {
          // 根据玩家距离决定策略
          if (playerDist >= 0 && playerDist < 6) {
            // 玩家很近：优先远离 + 避免死胡同
            possibleDirs.sort((a, b) => {
              // 首先按距离降序（远离玩家）
              const distDiff = (b.dist === -1 ? -999 : b.dist) - (a.dist === -1 ? -999 : a.dist);
              if (Math.abs(distDiff) > 1) return distDiff;
              // 距离差不多时，优先出口多的方向
              return b.exits - a.exits;
            });
            // 80%选最优，20%随机（增加趣味性）
            npc.dir = Math.random() < 0.8 ? possibleDirs[0].dir : possibleDirs[Math.floor(Math.random() * possibleDirs.length)].dir;
            npc.dirTimer = 15 + Math.floor(Math.random() * 15);
          } else if (playerDist >= 0 && playerDist < 10) {
            // 玩家中等距离：适度远离
            possibleDirs.sort((a, b) => {
              const distDiff = (b.dist === -1 ? -999 : b.dist) - (a.dist === -1 ? -999 : a.dist);
              if (Math.abs(distDiff) > 2) return distDiff;
              return b.exits - a.exits;
            });
            npc.dir = Math.random() < 0.6 ? possibleDirs[0].dir : possibleDirs[Math.floor(Math.random() * possibleDirs.length)].dir;
            npc.dirTimer = 20 + Math.floor(Math.random() * 20);
          } else {
            // 玩家很远：随机走，但避开死胡同
            const goodDirs = possibleDirs.filter(d => d.exits >= 2);
            const pool = goodDirs.length > 0 ? goodDirs : possibleDirs;
            npc.dir = pool[Math.floor(Math.random() * pool.length)].dir;
            npc.dirTimer = 30 + Math.floor(Math.random() * 40);
          }
        } else {
          // 无路可走
          npc.dir = { x: 0, y: 0 };
          npc.dirTimer = 10;
        }
      } else {
        // BFS不可用，回退到随机
        const dirs = [
          { x: 1, y: 0 }, { x: -1, y: 0 },
          { x: 0, y: 1 }, { x: 0, y: -1 },
        ];
        npc.dir = dirs[Math.floor(Math.random() * dirs.length)];
        npc.dirTimer = 30 + Math.floor(Math.random() * 30);
      }
    }

    // ===== 射击逻辑 =====
    if (npc.hasGun && player && !playerStunned && npc.shootCooldown <= 0) {
      const distToPlayer = Math.hypot(player.x - npc.x, player.y - npc.y);
      if (distToPlayer < cellSize * 5 && distToPlayer > cellSize * 1.5) {
        // 30%概率射击（不是每次都射，增加趣味性）
        if (Math.random() < 0.02) {
          const angle = Math.atan2(player.y - npc.y, player.x - npc.x);
          bullets.push({
            x: npc.x,
            y: npc.y,
            vx: Math.cos(angle) * BULLET_SPEED,
            vy: Math.sin(angle) * BULLET_SPEED,
            life: 120, // 2秒存活
            fromNpc: true,
            color: npc.color,
          });
          npc.shootCooldown = SHOOT_COOLDOWN;
          npc.gunAngle = angle;
        }
      }
    }

    // ===== 移动 =====
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

    // 更新枪口朝向（朝向玩家或移动方向）
    if (player) {
      npc.gunAngle = Math.atan2(player.y - npc.y, player.x - npc.x);
    } else if (npc.dir.x !== 0 || npc.dir.y !== 0) {
      npc.gunAngle = Math.atan2(npc.dir.y, npc.dir.x);
    }
  }
}

// ---- 更新子弹 ----
function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    b.life--;

    // 检查是否撞墙
    const bCol = Math.floor(b.x / cellSize);
    const bRow = Math.floor(b.y / cellSize);
    if (!canMove(bCol, bRow)) {
      spawnParticles(b.x + offsetX, b.y + offsetY, b.color || '#ff0');
      bullets.splice(i, 1);
      continue;
    }

    // 检查是否击中玩家（NPC的子弹）
    if (b.fromNpc && player && !playerStunned) {
      const dist = Math.hypot(b.x - player.x, b.y - player.y);
      if (dist < player.size + BULLET_SIZE) {
        playerStunned = true;
        playerStunTimer = STUN_DURATION;
        spawnParticles(player.x + offsetX, player.y + offsetY, '#ff0');
        bullets.splice(i, 1);
        continue;
      }
    }

    // 超时消失
    if (b.life <= 0) {
      bullets.splice(i, 1);
    }
  }

  // 更新玩家眩晕
  if (playerStunned) {
    playerStunTimer--;
    if (playerStunTimer <= 0) {
      playerStunned = false;
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

    // 枪（画在NPC旁边）
    if (npc.hasGun) {
      const gunLen = npc.size * 1.2;
      const gunW = npc.size * 0.25;
      const gx = nx + Math.cos(npc.gunAngle) * npc.size * 0.5;
      const gy = ny + Math.sin(npc.gunAngle) * npc.size * 0.5;
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(npc.gunAngle);
      // 枪身
      ctx.fillStyle = '#666';
      ctx.fillRect(0, -gunW / 2, gunLen, gunW);
      // 枪口
      ctx.fillStyle = '#444';
      ctx.fillRect(gunLen * 0.8, -gunW * 0.7, gunLen * 0.2, gunW * 1.4);
      ctx.restore();
    }

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
  }

  // 绘制子弹
  for (const b of bullets) {
    const bx = b.x + offsetX;
    const by = b.y + offsetY;
    ctx.fillStyle = b.color || '#ff0';
    ctx.shadowColor = b.color || '#ff0';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(bx, by, BULLET_SIZE, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // 绘制玩家
  if (player) {
    const px = player.x + offsetX;
    const py = player.y + offsetY;

    // 眩晕效果
    if (playerStunned) {
      ctx.fillStyle = 'rgba(255, 255, 0, ' + (0.3 + 0.2 * Math.sin(Date.now() / 100)) + ')';
      ctx.beginPath();
      ctx.arc(px, py, player.size * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 身体
    ctx.fillStyle = playerStunned ? '#aaa' : '#fff';
    ctx.beginPath();
    ctx.arc(px, py, player.size, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛
    ctx.fillStyle = '#333';
    if (playerStunned) {
      // 眩晕时画X眼
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#333';
      const eyeSize = player.size * 0.15;
      // 左眼X
      ctx.beginPath();
      ctx.moveTo(px - player.size * 0.3 - eyeSize, py - player.size * 0.15 - eyeSize);
      ctx.lineTo(px - player.size * 0.3 + eyeSize, py - player.size * 0.15 + eyeSize);
      ctx.moveTo(px - player.size * 0.3 + eyeSize, py - player.size * 0.15 - eyeSize);
      ctx.lineTo(px - player.size * 0.3 - eyeSize, py - player.size * 0.15 + eyeSize);
      ctx.stroke();
      // 右眼X
      ctx.beginPath();
      ctx.moveTo(px + player.size * 0.3 - eyeSize, py - player.size * 0.15 - eyeSize);
      ctx.lineTo(px + player.size * 0.3 + eyeSize, py - player.size * 0.15 + eyeSize);
      ctx.moveTo(px + player.size * 0.3 + eyeSize, py - player.size * 0.15 - eyeSize);
      ctx.lineTo(px + player.size * 0.3 - eyeSize, py - player.size * 0.15 + eyeSize);
      ctx.stroke();
    } else {
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
    }

    // 名字
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(player.size * 0.6)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(playerStunned ? '😵' : '我', px, py - player.size - 5);
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
    updateBullets();
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
