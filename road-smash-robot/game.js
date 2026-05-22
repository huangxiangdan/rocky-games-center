// ============================================
// 🤖 公路撞击机器人 - Road Smash Robot 🏎️
// ============================================

(function () {
  "use strict";

  // --- Canvas Setup ---
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // --- Constants ---
  const ROAD_LINE_SPEED = 3;
  const ENEMY_SPAWN_INTERVAL = 90; // frames
  const COIN_SPAWN_INTERVAL = 120;
  const MAX_HP = 100;
  const SMASHES_TO_TRANSFORM = 3;
  const COINS_TO_UNLOCK = 15;
  const PLAYER_SPEED = 4.5;
  const ROBOT_SPEED = 5.5;
  const ENEMY_BASE_SPEED = 2;
  const HIT_DAMAGE = 15;
  const ROBOT_HIT_DAMAGE = 30;
  const UNLOCKED_HIT_DAMAGE = 60;
  const INVINCIBLE_FRAMES = 40;

  // --- Colors ---
  const COLORS = {
    road: "#3a3a5c",
    roadLine: "#fbbf24",
    grass1: "#2d6a4f",
    grass2: "#40916c",
    p1Car: "#3b82f6",
    p1Robot: "#6366f1",
    p1Unlocked: "#a855f7",
    p2Car: "#ef4444",
    p2Robot: "#f97316",
    p2Unlocked: "#ec4899",
    enemy: ["#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4"],
    coin: "#fbbf24",
    coinShine: "#fef3c7",
    star: ["#fbbf24", "#f97316", "#ef4444", "#ec4899", "#8b5cf6"],
  };

  // --- Game State ---
  let gameRunning = false;
  let twoPlayerMode = false;
  let frameCount = 0;
  let players = [];
  let enemies = [];
  let coins = [];
  let particles = [];
  let roadOffset = 0;
  let unlockedCars = { p1: false, p2: false };

  // --- Input ---
  const keys = {};
  const touchDirs = { up: false, down: false, left: false, right: false };

  document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    // Prevent scrolling with arrow keys
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
      e.preventDefault();
    }
  });
  document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
  });

  // Touch controls
  const touchBtns = document.querySelectorAll(".touch-btn");
  touchBtns.forEach((btn) => {
    const dir = btn.dataset.dir;
    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      touchDirs[dir] = true;
    });
    btn.addEventListener("touchend", (e) => {
      e.preventDefault();
      touchDirs[dir] = false;
    });
    btn.addEventListener("touchcancel", () => {
      touchDirs[dir] = false;
    });
  });

  // --- UI Elements ---
  const startScreen = document.getElementById("start-screen");
  const gameoverScreen = document.getElementById("gameover-screen");
  const startBtn = document.getElementById("start-btn");
  const restartBtn = document.getElementById("restart-btn");
  const mode1p = document.getElementById("mode-1p");
  const mode2p = document.getElementById("mode-2p");
  const unlockNotify = document.getElementById("unlock-notify");
  const unlockText = document.getElementById("unlock-text");

  mode1p.addEventListener("click", () => {
    twoPlayerMode = false;
    mode1p.classList.add("active");
    mode2p.classList.remove("active");
  });
  mode2p.addEventListener("click", () => {
    twoPlayerMode = true;
    mode2p.classList.add("active");
    mode1p.classList.remove("active");
  });

  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", startGame);

  // --- Player Class ---
  function createPlayer(id, x, color, robotColor, unlockedColor) {
    return {
      id,
      x,
      y: canvas.height * 0.75,
      w: 40,
      h: 60,
      speed: PLAYER_SPEED,
      hp: MAX_HP,
      coins: 0,
      smashes: 0,
      isRobot: false,
      isUnlocked: false,
      color,
      robotColor,
      unlockedColor,
      invincible: 0,
      alive: true,
    };
  }

  // --- Start Game ---
  function startGame() {
    startScreen.style.display = "none";
    gameoverScreen.style.display = "none";
    gameRunning = true;
    frameCount = 0;
    enemies = [];
    coins = [];
    particles = [];
    unlockedCars = { p1: false, p2: false };

    const roadW = getRoadWidth();
    const roadX = getRoadX();

    players = [createPlayer("p1", roadX + roadW * 0.33, COLORS.p1Car, COLORS.p1Robot, COLORS.p1Unlocked)];
    if (twoPlayerMode) {
      players.push(createPlayer("p2", roadX + roadW * 0.66, COLORS.p2Car, COLORS.p2Robot, COLORS.p2Unlocked));
    }

    requestAnimationFrame(gameLoop);
  }

  // --- Road Helpers ---
  function getRoadWidth() {
    return Math.min(canvas.width * 0.6, 400);
  }

  function getRoadX() {
    return (canvas.width - getRoadWidth()) / 2;
  }

  function getLaneX(lane) {
    // 3 lanes
    const roadW = getRoadWidth();
    const roadX = getRoadX();
    const laneW = roadW / 3;
    return roadX + laneW * lane + laneW / 2;
  }

  // --- Spawn Enemies ---
  function spawnEnemy() {
    const lane = Math.floor(Math.random() * 3);
    const colorIdx = Math.floor(Math.random() * COLORS.enemy.length);
    const speed = ENEMY_BASE_SPEED + Math.random() * 1.5 + frameCount * 0.0005;
    enemies.push({
      x: getLaneX(lane),
      y: -60,
      w: 36,
      h: 54,
      speed,
      color: COLORS.enemy[colorIdx],
      lane,
      hp: 1,
    });
  }

  // --- Spawn Coins ---
  function spawnCoin() {
    const lane = Math.floor(Math.random() * 3);
    coins.push({
      x: getLaneX(lane),
      y: -30,
      r: 12,
      speed: ENEMY_BASE_SPEED + 0.5,
      angle: 0,
    });
  }

  // --- Particles ---
  function spawnStarParticles(x, y, count) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        size: 4 + Math.random() * 6,
        color: COLORS.star[Math.floor(Math.random() * COLORS.star.length)],
        type: "star",
      });
    }
  }

  function spawnCoinParticles(x, y) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 20 + Math.random() * 10,
        maxLife: 30,
        size: 3 + Math.random() * 3,
        color: COLORS.coin,
        type: "coin",
      });
    }
  }

  function spawnTransformParticles(x, y) {
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 3 + Math.random() * 5;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 40 + Math.random() * 20,
        maxLife: 60,
        size: 5 + Math.random() * 8,
        color: i % 2 === 0 ? "#818cf8" : "#c084fc",
        type: "transform",
      });
    }
  }

  // --- Collision ---
  function rectsOverlap(a, b) {
    return (
      a.x - a.w / 2 < b.x + b.w / 2 &&
      a.x + a.w / 2 > b.x - b.w / 2 &&
      a.y - a.h / 2 < b.y + b.h / 2 &&
      a.y + a.h / 2 > b.y - b.h / 2
    );
  }

  function circleRectOverlap(cx, cy, cr, rx, ry, rw, rh) {
    const closestX = Math.max(rx - rw / 2, Math.min(cx, rx + rw / 2));
    const closestY = Math.max(ry - rh / 2, Math.min(cy, ry + rh / 2));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy < cr * cr;
  }

  // --- Update Player ---
  function updatePlayer(p, up, down, left, right) {
    if (!p.alive) return;

    const speed = p.isRobot ? ROBOT_SPEED : PLAYER_SPEED;
    let dx = 0,
      dy = 0;

    if (keys[up] || touchDirs.up) dy -= speed;
    if (keys[down] || touchDirs.down) dy += speed;
    if (keys[left] || touchDirs.left) dx -= speed;
    if (keys[right] || touchDirs.right) dx += speed;

    // Normalize diagonal
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    p.x += dx;
    p.y += dy;

    // Clamp to road
    const roadX = getRoadX();
    const roadW = getRoadWidth();
    p.x = Math.max(roadX + p.w / 2 + 4, Math.min(roadX + roadW - p.w / 2 - 4, p.x));
    p.y = Math.max(p.h / 2 + 50, Math.min(canvas.height - p.h / 2 - 10, p.y));

    // Invincibility countdown
    if (p.invincible > 0) p.invincible--;
  }

  // --- Draw Star Shape ---
  function drawStar(cx, cy, spikes, outerR, innerR) {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.closePath();
    ctx.fill();
  }

  // --- Draw Car ---
  function drawCar(x, y, w, h, color, isRobot, isUnlocked, invincible) {
    ctx.save();
    ctx.translate(x, y);

    // Flash when invincible
    if (invincible > 0 && Math.floor(invincible / 4) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    if (isRobot) {
      // Robot form
      const bodyColor = isUnlocked ? color : color;
      
      // Body (boxier, robot-like)
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.roundRect(-w / 2 - 2, -h / 2, w + 4, h, 6);
      ctx.fill();

      // Head
      ctx.fillStyle = lightenColor(bodyColor, 40);
      ctx.beginPath();
      ctx.roundRect(-w / 2 + 4, -h / 2 - 8, w - 8, 20, 4);
      ctx.fill();

      // Eyes (glowing)
      ctx.fillStyle = "#fff";
      ctx.shadowColor = "#818cf8";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(-8, -h / 2 + 2, 5, 0, Math.PI * 2);
      ctx.arc(8, -h / 2 + 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Pupils
      ctx.fillStyle = "#1a1a2e";
      ctx.beginPath();
      ctx.arc(-8, -h / 2 + 2, 2.5, 0, Math.PI * 2);
      ctx.arc(8, -h / 2 + 2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Arms
      ctx.fillStyle = bodyColor;
      ctx.fillRect(-w / 2 - 8, -h / 2 + 20, 8, 16);
      ctx.fillRect(w / 2, -h / 2 + 20, 8, 16);

      // Fists
      ctx.fillStyle = lightenColor(bodyColor, 30);
      ctx.beginPath();
      ctx.arc(-w / 2 - 4, -h / 2 + 38, 5, 0, Math.PI * 2);
      ctx.arc(w / 2 + 4, -h / 2 + 38, 5, 0, Math.PI * 2);
      ctx.fill();

      // Legs
      ctx.fillStyle = darkenColor(bodyColor, 30);
      ctx.fillRect(-w / 2 + 4, h / 2 - 12, 10, 14);
      ctx.fillRect(w / 2 - 14, h / 2 - 12, 10, 14);

      // Chest detail
      if (isUnlocked) {
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        drawStar(0, 0, 5, 8, 4);
        ctx.fill();
      }

      // Antenna
      ctx.strokeStyle = lightenColor(bodyColor, 50);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -h / 2 - 8);
      ctx.lineTo(0, -h / 2 - 18);
      ctx.stroke();
      ctx.fillStyle = "#f87171";
      ctx.beginPath();
      ctx.arc(0, -h / 2 - 18, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Car form
      // Body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 8);
      ctx.fill();

      // Windshield
      ctx.fillStyle = "rgba(200, 220, 255, 0.6)";
      ctx.beginPath();
      ctx.roundRect(-w / 2 + 6, -h / 2 + 8, w - 12, 16, 4);
      ctx.fill();

      // Headlights
      ctx.fillStyle = "#fef3c7";
      ctx.beginPath();
      ctx.arc(-w / 2 + 8, -h / 2 + 4, 4, 0, Math.PI * 2);
      ctx.arc(w / 2 - 8, -h / 2 + 4, 4, 0, Math.PI * 2);
      ctx.fill();

      // Wheels
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(-w / 2 - 3, -h / 2 + 10, 5, 12);
      ctx.fillRect(w / 2 - 2, -h / 2 + 10, 5, 12);
      ctx.fillRect(-w / 2 - 3, h / 2 - 22, 5, 12);
      ctx.fillRect(w / 2 - 2, h / 2 - 22, 5, 12);

      // Stripe
      ctx.fillStyle = lightenColor(color, 30);
      ctx.fillRect(-3, -h / 2 + 2, 6, h - 4);
    }

    ctx.restore();
  }

  // --- Draw Enemy Car ---
  function drawEnemyCar(e) {
    ctx.save();
    ctx.translate(e.x, e.y);

    // Body
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.roundRect(-e.w / 2, -e.h / 2, e.w, e.h, 6);
    ctx.fill();

    // Windshield (back since enemy faces player)
    ctx.fillStyle = "rgba(200, 220, 255, 0.5)";
    ctx.beginPath();
    ctx.roundRect(-e.w / 2 + 5, e.h / 2 - 20, e.w - 10, 14, 3);
    ctx.fill();

    // Tail lights
    ctx.fillStyle = "#f87171";
    ctx.beginPath();
    ctx.arc(-e.w / 2 + 7, e.h / 2 - 4, 3, 0, Math.PI * 2);
    ctx.arc(e.w / 2 - 7, e.h / 2 - 4, 3, 0, Math.PI * 2);
    ctx.fill();

    // Wheels
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(-e.w / 2 - 2, -e.h / 2 + 8, 4, 10);
    ctx.fillRect(e.w / 2 - 2, -e.h / 2 + 8, 4, 10);
    ctx.fillRect(-e.w / 2 - 2, e.h / 2 - 18, 4, 10);
    ctx.fillRect(e.w / 2 - 2, e.h / 2 - 18, 4, 10);

    ctx.restore();
  }

  // --- Draw Coin ---
  function drawCoin(c) {
    ctx.save();
    ctx.translate(c.x, c.y);

    // Glow
    ctx.shadowColor = COLORS.coin;
    ctx.shadowBlur = 10;

    // Coin body
    ctx.fillStyle = COLORS.coin;
    ctx.beginPath();
    ctx.arc(0, 0, c.r, 0, Math.PI * 2);
    ctx.fill();

    // Shine
    ctx.fillStyle = COLORS.coinShine;
    ctx.beginPath();
    ctx.arc(-3, -3, c.r * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // $ symbol
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#92400e";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", 0, 1);

    ctx.restore();
  }

  // --- Color Helpers ---
  function lightenColor(hex, amount) {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
    return `rgb(${r},${g},${b})`;
  }

  function darkenColor(hex, amount) {
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
    return `rgb(${r},${g},${b})`;
  }

  // --- Draw Road ---
  function drawRoad() {
    const roadW = getRoadWidth();
    const roadX = getRoadX();

    // Grass
    ctx.fillStyle = COLORS.grass1;
    ctx.fillRect(0, 0, roadX, canvas.height);
    ctx.fillRect(roadX + roadW, 0, canvas.width - roadX - roadW, canvas.height);

    // Grass stripes
    ctx.fillStyle = COLORS.grass2;
    for (let y = (roadOffset * 0.5) % 40 - 40; y < canvas.height; y += 40) {
      ctx.fillRect(0, y, roadX, 4);
      ctx.fillRect(roadX + roadW, y, canvas.width - roadX - roadW, 4);
    }

    // Road
    ctx.fillStyle = COLORS.road;
    ctx.fillRect(roadX, 0, roadW, canvas.height);

    // Road border
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(roadX - 3, 0, 3, canvas.height);
    ctx.fillRect(roadX + roadW, 0, 3, canvas.height);

    // Lane lines (dashed)
    const laneW = roadW / 3;
    ctx.setLineDash([30, 20]);
    ctx.strokeStyle = COLORS.roadLine;
    ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      const lx = roadX + laneW * i;
      ctx.moveTo(lx, -roadOffset % 50);
      ctx.lineTo(lx, canvas.height);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // --- Draw Particles ---
  function drawParticles() {
    particles.forEach((p) => {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      if (p.type === "star") {
        drawStar(p.x, p.y, 5, p.size, p.size * 0.4);
      } else if (p.type === "transform") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
  }

  // --- Update HUD ---
  function updateHUD() {
    const hp1El = document.getElementById("hp1");
    const stat1El = document.getElementById("stat1");
    const hp2El = document.getElementById("hp2");
    const stat2El = document.getElementById("stat2");
    const hudP2 = document.getElementById("hud-p2");

    if (players[0]) {
      const p = players[0];
      const pct = Math.max(0, p.hp / MAX_HP) * 100;
      hp1El.style.width = pct + "%";
      hp1El.className = "hp-fill" + (pct < 30 ? " danger" : pct < 60 ? " warning" : "");
      const form = p.isUnlocked ? "🌟" : p.isRobot ? "🤖" : "🚗";
      stat1El.textContent = `💰${p.coins} | 💥${p.smashes} | ${form}`;
    }

    if (twoPlayerMode) {
      hudP2.style.display = "block";
      if (players[1]) {
        const p = players[1];
        const pct = Math.max(0, p.hp / MAX_HP) * 100;
        hp2El.style.width = pct + "%";
        hp2El.className = "hp-fill" + (pct < 30 ? " danger" : pct < 60 ? " warning" : "");
        const form = p.isUnlocked ? "🌟" : p.isRobot ? "🤖" : "🚗";
        stat2El.textContent = `💰${p.coins} | 💥${p.smashes} | ${form}`;
      }
    } else {
      hudP2.style.display = "none";
    }
  }

  // --- Show Unlock Notification ---
  function showUnlock(text) {
    unlockText.textContent = text;
    unlockNotify.style.display = "block";
    unlockNotify.style.animation = "none";
    // Force reflow
    void unlockNotify.offsetWidth;
    unlockNotify.style.animation = "popIn 0.4s ease-out";
    setTimeout(() => {
      unlockNotify.style.display = "none";
    }, 2000);
  }

  // --- Game Over ---
  function gameOver() {
    gameRunning = false;
    const title = document.getElementById("gameover-title");
    const info = document.getElementById("gameover-info");

    let bestPlayer = players[0];
    let bestCoins = players[0].coins;

    if (twoPlayerMode && players[1]) {
      if (players[1].coins > bestCoins) {
        bestPlayer = players[1];
        bestCoins = players[1].coins;
      }
    }

    if (twoPlayerMode) {
      const p1alive = players[0].alive;
      const p2alive = players[1] && players[1].alive;
      if (p1alive && !p2alive) {
        title.textContent = "P1 获胜！🏆";
      } else if (p2alive && !p1alive) {
        title.textContent = "P2 获胜！🏆";
      } else {
        title.textContent = "游戏结束 😢";
      }
      info.textContent = `P1: 💰${players[0].coins} 💥${players[0].smashes} | P2: 💰${players[1].coins} 💥${players[1].smashes}`;
    } else {
      title.textContent = "游戏结束 😢";
      info.textContent = `收集金币: ${bestPlayer.coins} | 撞毁敌车: ${bestPlayer.smashes}`;
    }

    gameoverScreen.style.display = "flex";
  }

  // --- Main Game Loop ---
  function gameLoop() {
    if (!gameRunning) return;

    frameCount++;
    roadOffset += ROAD_LINE_SPEED;

    // Spawn
    if (frameCount % ENEMY_SPAWN_INTERVAL === 0) spawnEnemy();
    if (frameCount % COIN_SPAWN_INTERVAL === 0) spawnCoin();

    // Increase difficulty
    if (frameCount % 600 === 0 && ENEMY_SPAWN_INTERVAL > 40) {
      // Gradually spawn faster (handled by checking frameCount mod)
    }

    // Update players
    updatePlayer(players[0], "w", "s", "a", "d");
    // Also support arrow keys for P1 in single player
    if (!twoPlayerMode) {
      const p = players[0];
      if (!p.alive) return;
      const speed = p.isRobot ? ROBOT_SPEED : PLAYER_SPEED;
      if (keys["ArrowUp"] || touchDirs.up) p.y -= speed;
      if (keys["ArrowDown"] || touchDirs.down) p.y += speed;
      if (keys["ArrowLeft"] || touchDirs.left) p.x -= speed;
      if (keys["ArrowRight"] || touchDirs.right) p.x += speed;
      // Re-clamp
      const roadX = getRoadX();
      const roadW = getRoadWidth();
      p.x = Math.max(roadX + p.w / 2 + 4, Math.min(roadX + roadW - p.w / 2 - 4, p.x));
      p.y = Math.max(p.h / 2 + 50, Math.min(canvas.height - p.h / 2 - 10, p.y));
    }

    if (twoPlayerMode && players[1]) {
      updatePlayer(players[1], "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight");
    }

    // Update enemies
    enemies.forEach((e) => {
      e.y += e.speed;
    });

    // Update coins
    coins.forEach((c) => {
      c.y += c.speed;
      c.angle += 0.05;
    });

    // Update particles
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.vx *= 0.96;
      p.vy *= 0.96;
    });

    // Clean up off-screen
    enemies = enemies.filter((e) => e.y < canvas.height + 80);
    coins = coins.filter((c) => c.y < canvas.height + 40);
    particles = particles.filter((p) => p.life > 0);

    // Collision: player vs enemy
    players.forEach((p) => {
      if (!p.alive) return;
      enemies.forEach((e, idx) => {
        if (e.hp <= 0) return;
        if (rectsOverlap(p, e)) {
          if (p.invincible > 0) return;

          // Player smashes enemy
          e.hp = 0;
          p.smashes++;
          spawnStarParticles(e.x, e.y, 10);

          // Check transform
          if (p.smashes >= SMASHES_TO_TRANSFORM && !p.isRobot) {
            p.isRobot = true;
            spawnTransformParticles(p.x, p.y);
            showUnlock(`🤖 P${p.id === "p1" ? "1" : "2"} 变身机器人！攻击力增强！`);
          }

          // Check unlock new car
          if (p.coins >= COINS_TO_UNLOCK && !p.isUnlocked) {
            p.isUnlocked = true;
            p.color = p.unlockedColor;
            spawnTransformParticles(p.x, p.y);
            showUnlock(`🌟 P${p.id === "p1" ? "1" : "2"} 解锁新车！攻击力翻倍！`);
          }

          // Player takes damage from collision
          const dmg = p.isUnlocked ? 5 : p.isRobot ? 8 : HIT_DAMAGE;
          p.hp -= dmg;
          p.invincible = INVINCIBLE_FRAMES;

          if (p.hp <= 0) {
            p.hp = 0;
            p.alive = false;
            spawnStarParticles(p.x, p.y, 20);
          }
        }
      });
    });

    // Remove dead enemies
    enemies = enemies.filter((e) => e.hp > 0);

    // Collision: player vs coin
    players.forEach((p) => {
      if (!p.alive) return;
      coins = coins.filter((c) => {
        if (circleRectOverlap(c.x, c.y, c.r, p.x, p.y, p.w, p.h)) {
          p.coins++;
          spawnCoinParticles(c.x, c.y);

          // Check unlock
          if (p.coins >= COINS_TO_UNLOCK && !p.isUnlocked) {
            p.isUnlocked = true;
            p.color = p.unlockedColor;
            spawnTransformParticles(p.x, p.y);
            showUnlock(`🌟 P${p.id === "p1" ? "1" : "2"} 解锁新车！攻击力翻倍！`);
          }

          return false;
        }
        return true;
      });
    });

    // Check game over
    const allDead = players.every((p) => !p.alive);
    if (allDead) {
      gameOver();
      return;
    }

    // --- Draw ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawRoad();

    // Draw coins
    coins.forEach(drawCoin);

    // Draw enemies
    enemies.forEach(drawEnemyCar);

    // Draw players
    players.forEach((p) => {
      if (!p.alive) return;
      const color = p.isUnlocked ? p.unlockedColor : p.isRobot ? p.robotColor : p.color;
      drawCar(p.x, p.y, p.w, p.h, color, p.isRobot, p.isUnlocked, p.invincible);
    });

    // Draw particles
    drawParticles();

    // Update HUD
    updateHUD();

    requestAnimationFrame(gameLoop);
  }

  // --- Initial HUD setup ---
  updateHUD();
})();
