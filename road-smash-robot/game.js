// ============================================
// 🤖 公路撞击机器人 - Road Smash Robot 🏎️
// v2.0 - Major Gameplay Improvements
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
  const ENEMY_SPAWN_INITIAL = 40; // Initial spawn interval (frames)
  const ENEMY_SPAWN_MIN = 20; // Fastest spawn interval
  const COIN_SPAWN_INTERVAL = 60;
  const ITEM_SPAWN_INTERVAL = 70;
  const MAX_HP = 100;
  const SMASHES_TO_TRANSFORM = 3;
  const COINS_TO_UNLOCK = 15;
  const PLAYER_SPEED = 5.5;
  const ROBOT_SPEED = 7;
  const ENEMY_BASE_SPEED = 2.5;
  const HIT_DAMAGE_CAR = 5; // Car form hits enemy
  const HIT_DAMAGE_ROBOT = 2; // Robot form hits enemy
  const HIT_DAMAGE_UNLOCKED = 1; // Unlocked form hits enemy
  const SIDE_HIT_DAMAGE = 8; // Side collision damage
  const INVINCIBLE_FRAMES = 30;
  const COMBO_WINDOW = 120; // frames to maintain combo

  // --- Level System ---
  const LEVELS = [
    { name: "新手公路", targetScore: 20, enemySpeedMul: 1.0, spawnMul: 1.0, emoji: "🛣️" },
    { name: "城市快车道", targetScore: 35, enemySpeedMul: 1.15, spawnMul: 1.15, emoji: "🏙️" },
    { name: "沙漠风暴", targetScore: 50, enemySpeedMul: 1.3, spawnMul: 1.3, emoji: "🏜️" },
    { name: "雪山险路", targetScore: 70, enemySpeedMul: 1.5, spawnMul: 1.5, emoji: "🏔️" },
    { name: "终极挑战", targetScore: 100, enemySpeedMul: 1.8, spawnMul: 1.7, emoji: "🔥" },
  ];
  const LAST_LEVEL_INDEX = LEVELS.length - 1;

  // Boss constants
  const BOSS_HP = 10;
  const BOSS_W = 60;
  const BOSS_H = 90;
  const BOSS_SPEED = 1.2;
  const BOSS_SHOOT_INTERVAL = 90; // frames between shots
  const BOSS_PROJECTILE_SPEED = 4;
  const BOSS_PROJECTILE_DAMAGE = 8;
  const BOSS_SPAWN_SCORE = 50; // score threshold to spawn boss in final level
  const BOSS_WARNING_DURATION = 120; // frames of warning before boss appears

  // Item types
  const ITEM_HEAL = "heal";
  const ITEM_BOOST = "boost";
  const ITEM_SHIELD = "shield";

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
    healItem: "#f87171",
    boostItem: "#60a5fa",
    shieldItem: "#34d399",
    bossBody: "#dc2626",
    bossHorn: "#fbbf24",
    bossEye: "#fef3c7",
    bossProjectile: "#f97316",
    bossHpBar: "#dc2626",
    bossHpBg: "rgba(0,0,0,0.7)",
    bossGlow: "#ef4444",
  };

  // --- Game State ---
  let gameRunning = false;
  let twoPlayerMode = false;
  let frameCount = 0;
  let players = [];
  let enemies = [];
  let coins = [];
  let items = [];
  let particles = [];
  let floatingTexts = [];
  let screenFlashes = [];
  let roadOffset = 0;
  let unlockedCars = { p1: false, p2: false };
  let currentEnemySpawnInterval = ENEMY_SPAWN_INITIAL;
  let gameTimeSeconds = 0;
  // Level state
  let currentLevelIndex = 0;
  let levelScore = 0; // score for current level (coins + smashes)
  let levelTransitioning = false;
  let levelTransitionTimer = 0;
  let gameCompleted = false;
  // Per-level coin/smash counters (reset each level)
  let levelCoins = 0;
  let levelSmashes = 0;

  // Boss state
  let boss = null; // active boss object
  let bossProjectiles = []; // boss's fired projectiles
  let bossSpawned = false; // whether boss has appeared this level
  let bossDefeated = false; // whether boss was defeated
  let bossWarningTimer = 0; // countdown before boss appears
  let bossVictoryTimer = 0; // celebration after boss defeated

  // --- Input ---
  const keys = {};
  const touchDirs = { up: false, down: false, left: false, right: false };

  document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
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

  // Level UI elements
  const levelCompleteScreen = document.getElementById("level-complete-screen");
  const levelCompleteTitle = document.getElementById("level-complete-title");
  const levelCompleteInfo = document.getElementById("level-complete-info");
  const nextLevelBtn = document.getElementById("next-level-btn");
  const gameCompleteScreen = document.getElementById("game-complete-screen");
  const gameCompleteInfo = document.getElementById("game-complete-info");
  const playAgainBtn = document.getElementById("play-again-btn");

  if (nextLevelBtn) nextLevelBtn.addEventListener("click", nextLevel);
  if (playAgainBtn) playAgainBtn.addEventListener("click", startGame);

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
      // Combo system
      comboCount: 0,
      comboTimer: 0,
      // Item effects
      boostTimer: 0,
      shieldTimer: 0,
      // Trail particles timer
      trailTimer: 0,
    };
  }

  // --- Start Game ---
  function startGame() {
    startScreen.style.display = "none";
    gameoverScreen.style.display = "none";
    if (levelCompleteScreen) levelCompleteScreen.style.display = "none";
    if (gameCompleteScreen) gameCompleteScreen.style.display = "none";
    gameRunning = true;
    frameCount = 0;
    gameTimeSeconds = 0;
    enemies = [];
    coins = [];
    items = [];
    particles = [];
    floatingTexts = [];
    screenFlashes = [];
    unlockedCars = { p1: false, p2: false };
    currentEnemySpawnInterval = ENEMY_SPAWN_INITIAL;
    currentLevelIndex = 0;
    levelScore = 0;
    levelCoins = 0;
    levelSmashes = 0;
    levelTransitioning = false;
    levelTransitionTimer = 0;
    gameCompleted = false;
    boss = null;
    bossProjectiles = [];
    bossSpawned = false;
    bossDefeated = false;
    bossWarningTimer = 0;
    bossVictoryTimer = 0;

    const roadW = getRoadWidth();
    const roadX = getRoadX();

    players = [createPlayer("p1", roadX + roadW * 0.33, COLORS.p1Car, COLORS.p1Robot, COLORS.p1Unlocked)];
    if (twoPlayerMode) {
      players.push(createPlayer("p2", roadX + roadW * 0.66, COLORS.p2Car, COLORS.p2Robot, COLORS.p2Unlocked));
    }

    requestAnimationFrame(gameLoop);
  }

  // --- Next Level ---
  function nextLevel() {
    if (levelCompleteScreen) levelCompleteScreen.style.display = "none";
    currentLevelIndex++;
    levelScore = 0;
    levelCoins = 0;
    levelSmashes = 0;
    levelTransitioning = false;
    levelTransitionTimer = 0;
    frameCount = 0;
    gameTimeSeconds = 0;
    enemies = [];
    coins = [];
    items = [];
    particles = [];
    floatingTexts = [];
    screenFlashes = [];
    currentEnemySpawnInterval = ENEMY_SPAWN_INITIAL;
    boss = null;
    bossProjectiles = [];
    bossSpawned = false;
    bossDefeated = false;
    bossWarningTimer = 0;
    bossVictoryTimer = 0;
    unlockedCars = { p1: false, p2: false };

    // Heal players partially for next level
    players.forEach((p) => {
      if (p.alive) {
        p.hp = Math.min(MAX_HP, p.hp + 30);
      }
      // Reset per-level tracking for transform/unlock checks
      p.coins = 0;
      p.smashes = 0;
      p.isRobot = false;
      p.isUnlocked = false;
      p.invincible = 0;
      p.comboCount = 0;
      p.comboTimer = 0;
      p.boostTimer = 0;
      p.shieldTimer = 0;
    });

    gameRunning = true;
    requestAnimationFrame(gameLoop);
  }

  // --- Level Complete ---
  function showLevelComplete() {
    gameRunning = false;
    levelTransitioning = false;

    const level = LEVELS[currentLevelIndex];

    if (currentLevelIndex >= LAST_LEVEL_INDEX) {
      // Game completed!
      gameCompleted = true;
      if (gameCompleteScreen) {
        let info = "";
        const bossText = bossDefeated ? "💀 BOSS已击败！" : "";
        if (twoPlayerMode) {
          info = `本关 - P1: 💰${players[0].coins} 💥${players[0].smashes} | P2: 💰${players[1].coins} 💥${players[1].smashes} | 本关得分: ${levelScore} ${bossText}`;
        } else {
          info = `本关 - 收集金币: ${levelCoins} | 撞毁敌车: ${levelSmashes} | 本关得分: ${levelScore} ${bossText}`;
        }
        if (gameCompleteInfo) gameCompleteInfo.textContent = info;
        gameCompleteScreen.style.display = "flex";
      }
    } else {
      if (levelCompleteScreen) {
        if (levelCompleteTitle) levelCompleteTitle.textContent = `${level.emoji} ${level.name} 通过！`;
        let info = `本关得分: ${levelScore}/${level.targetScore}`;
        const nextLevel = LEVELS[currentLevelIndex + 1];
        info += ` | 下一关: ${nextLevel.emoji} ${nextLevel.name}`;
        if (levelCompleteInfo) levelCompleteInfo.textContent = info;
        levelCompleteScreen.style.display = "flex";
      }
    }

    // Celebration particles
    for (let i = 0; i < 30; i++) {
      setTimeout(() => {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height * 0.5;
        spawnStarParticles(x, y, 5);
      }, i * 50);
    }
  }

  // --- Get Level Score (uses per-level counters) ---
  function getLevelScoreForPlayer() {
    return levelCoins + levelSmashes * 2; // smashes are worth more
  }

  // --- Road Helpers ---
  function getRoadWidth() {
    return Math.min(canvas.width * 0.6, 400);
  }

  function getRoadX() {
    return (canvas.width - getRoadWidth()) / 2;
  }

  function getLaneX(lane) {
    const roadW = getRoadWidth();
    const roadX = getRoadX();
    const laneW = roadW / 3;
    return roadX + laneW * lane + laneW / 2;
  }

  // --- Difficulty Scaling ---
  function getDifficultyMultiplier() {
    // First 10 seconds (600 frames at 60fps) are easy, then ramps up
    const t = Math.max(0, gameTimeSeconds - 10);
    return 1 + t * 0.03; // +3% per second after first 10s
  }

  function getEnemySpawnInterval() {
    const level = LEVELS[currentLevelIndex];
    const t = Math.max(0, gameTimeSeconds - 10);
    // Gradually decrease from ENEMY_SPAWN_INITIAL to ENEMY_SPAWN_MIN
    const interval = ENEMY_SPAWN_INITIAL - t * 0.15;
    const baseInterval = Math.max(ENEMY_SPAWN_MIN, Math.floor(interval));
    // Apply level spawn multiplier (lower = harder)
    return Math.max(ENEMY_SPAWN_MIN, Math.floor(baseInterval / level.spawnMul));
  }

  function getEnemySpeed() {
    const level = LEVELS[currentLevelIndex];
    const base = ENEMY_BASE_SPEED + Math.random() * 1.5;
    return base * getDifficultyMultiplier() * level.enemySpeedMul;
  }

  // --- Spawn Enemies ---
  function spawnEnemy() {
    // Spawn 1-3 enemies at once
    const count = Math.random() < 0.3 ? (Math.random() < 0.3 ? 3 : 2) : 1;
    const usedLanes = [];
    for (let i = 0; i < count; i++) {
      let lane;
      let attempts = 0;
      do {
        lane = Math.floor(Math.random() * 3);
        attempts++;
      } while (usedLanes.includes(lane) && attempts < 5);

      if (!usedLanes.includes(lane)) {
        usedLanes.push(lane);
        const colorIdx = Math.floor(Math.random() * COLORS.enemy.length);
        const speed = getEnemySpeed();
        enemies.push({
          x: getLaneX(lane),
          y: -60 - i * 30,
          w: 36,
          h: 54,
          speed,
          color: COLORS.enemy[colorIdx],
          lane,
          hp: 1,
          wasHitByPlayer: null, // Track which player hit it
        });
      }
    }
  }

  // --- Spawn Coins ---
  function spawnCoin() {
    // Sometimes spawn 2-3 coins
    const count = Math.random() < 0.35 ? (Math.random() < 0.3 ? 3 : 2) : 1;
    for (let i = 0; i < count; i++) {
      const lane = Math.floor(Math.random() * 3);
      coins.push({
        x: getLaneX(lane),
        y: -30 - i * 35,
        r: 12,
        speed: ENEMY_BASE_SPEED + 0.5,
        angle: 0,
      });
    }
  }

  // --- Spawn Items ---
  function spawnItem() {
    const lane = Math.floor(Math.random() * 3);
    const rand = Math.random();
    let type, color, emoji;
    if (rand < 0.4) {
      type = ITEM_HEAL;
      color = COLORS.healItem;
      emoji = "❤️";
    } else if (rand < 0.7) {
      type = ITEM_BOOST;
      color = COLORS.boostItem;
      emoji = "⚡";
    } else {
      type = ITEM_SHIELD;
      color = COLORS.shieldItem;
      emoji = "🛡️";
    }
    items.push({
      x: getLaneX(lane),
      y: -30,
      r: 16,
      speed: ENEMY_BASE_SPEED + 0.3,
      type,
      color,
      emoji,
      angle: 0,
      pulseTimer: 0,
    });
  }

  // --- Spawn Boss ---
  function spawnBoss() {
    const roadW = getRoadWidth();
    const roadX = getRoadX();
    boss = {
      x: roadX + roadW / 2,
      y: -BOSS_H,
      w: BOSS_W,
      h: BOSS_H,
      hp: BOSS_HP,
      maxHp: BOSS_HP,
      speed: BOSS_SPEED,
      shootTimer: BOSS_SHOOT_INTERVAL,
      phaseTimer: 0, // for movement patterns
      entering: true, // boss is entering the screen
      shakeTimer: 0,
      deathTimer: 0,
    };
    bossSpawned = true;
    addScreenFlash("#dc2626");
    addFloatingText(canvas.width / 2, canvas.height / 2 - 60, "⚠️ BOSS来袭！⚠️", "#dc2626", 36);
  }

  // --- Draw Boss ---
  function drawBoss(b) {
    ctx.save();
    ctx.translate(b.x, b.y);

    // Screen shake offset
    let shakeX = 0, shakeY = 0;
    if (b.shakeTimer > 0) {
      shakeX = (Math.random() - 0.5) * 4;
      shakeY = (Math.random() - 0.5) * 4;
      ctx.translate(shakeX, shakeY);
      b.shakeTimer--;
    }

    // Pulsing glow
    const glowPulse = Math.sin(frameCount * 0.08) * 0.3 + 0.7;
    ctx.save();
    ctx.globalAlpha = glowPulse * 0.2;
    ctx.fillStyle = COLORS.bossGlow;
    ctx.beginPath();
    ctx.arc(0, 0, b.w * 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Main body (tank-like shape)
    ctx.fillStyle = COLORS.bossBody;
    ctx.beginPath();
    ctx.roundRect(-b.w / 2, -b.h / 2, b.w, b.h, 8);
    ctx.fill();

    // Armor plating (darker strips)
    ctx.fillStyle = "#991b1b";
    ctx.fillRect(-b.w / 2 + 4, -b.h / 2 + 20, b.w - 8, 6);
    ctx.fillRect(-b.w / 2 + 4, -b.h / 2 + 35, b.w - 8, 6);
    ctx.fillRect(-b.w / 2 + 4, b.h / 2 - 20, b.w - 8, 6);

    // Horns
    ctx.fillStyle = COLORS.bossHorn;
    ctx.beginPath();
    ctx.moveTo(-b.w / 2 + 6, -b.h / 2 + 2);
    ctx.lineTo(-b.w / 2 - 8, -b.h / 2 - 16);
    ctx.lineTo(-b.w / 2 + 16, -b.h / 2 + 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(b.w / 2 - 6, -b.h / 2 + 2);
    ctx.lineTo(b.w / 2 + 8, -b.h / 2 - 16);
    ctx.lineTo(b.w / 2 - 16, -b.h / 2 + 2);
    ctx.fill();

    // Angry eyes (glowing)
    ctx.fillStyle = COLORS.bossEye;
    ctx.shadowColor = "#fbbf24";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(-12, -b.h / 2 + 12, 7, 0, Math.PI * 2);
    ctx.arc(12, -b.h / 2 + 12, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Angry pupils
    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.arc(-12, -b.h / 2 + 12, 3.5, 0, Math.PI * 2);
    ctx.arc(12, -b.h / 2 + 12, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Angry eyebrows
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-18, -b.h / 2 + 5);
    ctx.lineTo(-6, -b.h / 2 + 9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(18, -b.h / 2 + 5);
    ctx.lineTo(6, -b.h / 2 + 9);
    ctx.stroke();

    // Mouth (angry grille)
    ctx.fillStyle = "#450a0a";
    ctx.beginPath();
    ctx.roundRect(-12, b.h / 2 - 18, 24, 8, 2);
    ctx.fill();
    // Teeth
    ctx.fillStyle = "#fbbf24";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(-10 + i * 6, b.h / 2 - 18, 3, 4);
    }

    // Flame exhaust (bottom)
    const flameFlicker = Math.random() * 4;
    ctx.fillStyle = "#f97316";
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(-b.w / 2 + 8, b.h / 2);
    ctx.lineTo(-b.w / 2 + 14, b.h / 2 + 12 + flameFlicker);
    ctx.lineTo(-b.w / 2 + 20, b.h / 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(b.w / 2 - 8, b.h / 2);
    ctx.lineTo(b.w / 2 - 14, b.h / 2 + 12 + flameFlicker);
    ctx.lineTo(b.w / 2 - 20, b.h / 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Gold trim on edges
    ctx.strokeStyle = COLORS.bossHorn;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-b.w / 2, -b.h / 2, b.w, b.h, 8);
    ctx.stroke();

    // Skull emblem on center
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("💀", 0, 5);

    ctx.restore();
  }

  // --- Draw Boss Health Bar ---
  function drawBossHpBar(b) {
    const barW = b.w + 40;
    const barH = 10;
    const barX = b.x - barW / 2;
    const barY = b.y - b.h / 2 - 22;
    const pct = Math.max(0, b.hp / b.maxHp);

    // Background
    ctx.fillStyle = COLORS.bossHpBg;
    ctx.beginPath();
    ctx.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 6);
    ctx.fill();

    // Track
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 5);
    ctx.fill();

    // Fill
    const gradient = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    gradient.addColorStop(0, "#dc2626");
    gradient.addColorStop(1, "#f97316");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * pct, barH, 5);
    ctx.fill();

    // Boss name
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText("👾 BOSS 💀", b.x, barY - 3);

    // HP text
    ctx.fillStyle = "#fff";
    ctx.font = "bold 9px sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(`${b.hp}/${b.maxHp}`, b.x, barY + barH / 2);
  }

  // --- Draw Boss Projectile ---
  function drawBossProjectile(proj) {
    ctx.save();
    ctx.translate(proj.x, proj.y);

    // Glow
    ctx.shadowColor = COLORS.bossProjectile;
    ctx.shadowBlur = 8;

    // Fireball
    ctx.fillStyle = COLORS.bossProjectile;
    ctx.beginPath();
    ctx.arc(0, 0, proj.r, 0, Math.PI * 2);
    ctx.fill();

    // Inner core
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(0, 0, proj.r * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Trail particles
    if (frameCount % 2 === 0) {
      particles.push({
        x: proj.x + (Math.random() - 0.5) * 6,
        y: proj.y - proj.r,
        vx: (Math.random() - 0.5) * 1,
        vy: -0.5 + Math.random() * 0.5,
        life: 10 + Math.random() * 8,
        maxLife: 18,
        size: 3 + Math.random() * 3,
        color: Math.random() > 0.5 ? "#f97316" : "#fbbf24",
        type: "trail",
      });
    }

    ctx.restore();
  }

  // --- Spawn Boss Projectiles ---
  function spawnBossProjectiles(b) {
    if (!b || b.entering || b.deathTimer > 0) return;

    // Fire toward each alive player
    players.forEach(p => {
      if (!p.alive) return;
      const dx = p.x - b.x;
      const dy = p.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) return;
      const vx = (dx / dist) * BOSS_PROJECTILE_SPEED;
      const vy = (dy / dist) * BOSS_PROJECTILE_SPEED;
      bossProjectiles.push({
        x: b.x,
        y: b.y + b.h / 2,
        r: 8,
        vx: vx,
        vy: vy,
      });
    });
  }

  // --- Floating Text ---
  function addFloatingText(x, y, text, color, size) {
    floatingTexts.push({
      x,
      y,
      text,
      color: color || "#fff",
      size: size || 18,
      life: 60,
      maxLife: 60,
      vy: -2,
    });
  }

  // --- Screen Flash ---
  function addScreenFlash(color) {
    screenFlashes.push({
      color,
      life: 15,
      maxLife: 15,
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

  function spawnTrailParticle(x, y, color) {
    particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y,
      vx: (Math.random() - 0.5) * 0.5,
      vy: 1 + Math.random() * 2,
      life: 10 + Math.random() * 10,
      maxLife: 20,
      size: 3 + Math.random() * 4,
      color: color,
      type: "trail",
    });
  }

  function spawnItemParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10;
      const speed = 2 + Math.random() * 3;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 25 + Math.random() * 15,
        maxLife: 40,
        size: 4 + Math.random() * 4,
        color: color,
        type: "item",
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

  // Determine if collision is from side (passive) or head-on (active smash)
  function isSideCollision(player, enemy) {
    // If player is moving primarily sideways relative to enemy, it's a side hit
    const yOverlap = Math.min(player.y + player.h / 2, enemy.y + enemy.h / 2) -
                     Math.max(player.y - player.h / 2, enemy.y - enemy.h / 2);
    const xOverlap = Math.min(player.x + player.w / 2, enemy.x + enemy.w / 2) -
                     Math.max(player.x - player.w / 2, enemy.x - enemy.w / 2);
    // If x overlap is small relative to y overlap, it's a side hit
    return xOverlap < yOverlap * 0.6;
  }

  // --- Combo System ---
  function handleCombo(player) {
    player.comboCount++;
    player.comboTimer = COMBO_WINDOW;

    if (player.comboCount >= 3) {
      const comboBonus = player.comboCount;
      player.coins += comboBonus;
      levelCoins += comboBonus;
      addFloatingText(
        player.x,
        player.y - 40,
        `COMBO x${player.comboCount}! +${comboBonus}💰`,
        "#fbbf24",
        22
      );
      // Show text animation
      const texts = ["NICE!", "AWESOME!", "COMBO!", "WOW!"];
      const randomText = texts[Math.floor(Math.random() * texts.length)];
      addFloatingText(player.x, player.y - 65, randomText, "#f97316", 16);
    }
  }

  // --- Text Animations (replacing sound effects) ---
  function showHitText(x, y, isSmash) {
    const texts = isSmash
      ? ["BOOM!", "SMASH!", "BAM!", "POW!", "CRASH!"]
      : ["OUCH!", "HEY!", "NO!"];
    const text = texts[Math.floor(Math.random() * texts.length)];
    const color = isSmash ? "#f59e0b" : "#f87171";
    addFloatingText(x, y - 20, text, color, isSmash ? 20 : 14);
  }

  function showItemText(x, y, type) {
    let text, color;
    switch (type) {
      case ITEM_HEAL:
        text = "+30 HP!";
        color = "#f87171";
        break;
      case ITEM_BOOST:
        text = "⚡ SPEED!";
        color = "#60a5fa";
        break;
      case ITEM_SHIELD:
        text = "🛡️ SHIELD!";
        color = "#34d399";
        break;
      default:
        text = "NICE!";
        color = "#fbbf24";
    }
    addFloatingText(x, y - 20, text, color, 18);
  }

  // --- Update Player ---
  function updatePlayer(p, up, down, left, right) {
    if (!p.alive) return;

    let speed = p.isRobot ? ROBOT_SPEED : PLAYER_SPEED;

    // Boost effect
    if (p.boostTimer > 0) {
      speed *= 1.8;
      p.boostTimer--;
    }

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

    // Shield countdown
    if (p.shieldTimer > 0) p.shieldTimer--;

    // Combo timer countdown
    if (p.comboTimer > 0) {
      p.comboTimer--;
      if (p.comboTimer <= 0) {
        p.comboCount = 0;
      }
    }

    // Trail effect - spawn trail particles behind player
    p.trailTimer++;
    if (p.trailTimer % 3 === 0) {
      const trailColor = p.boostTimer > 0 ? "#60a5fa" :
                         p.isUnlocked ? "#c084fc" :
                         p.isRobot ? "#818cf8" :
                         "#6366f1";
      spawnTrailParticle(p.x, p.y + p.h / 2, trailColor);
      if (p.boostTimer > 0) {
        // Extra trail particles during boost
        spawnTrailParticle(p.x - 8, p.y + p.h / 2, "#fbbf24");
        spawnTrailParticle(p.x + 8, p.y + p.h / 2, "#fbbf24");
      }
    }
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
  function drawCar(x, y, w, h, color, isRobot, isUnlocked, invincible, shieldTimer, boostTimer) {
    ctx.save();
    ctx.translate(x, y);

    // Shield aura
    if (shieldTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.2 + Math.sin(frameCount * 0.15) * 0.1;
      ctx.fillStyle = COLORS.shieldItem;
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.shieldItem;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.restore();
    }

    // Flash when invincible
    if (invincible > 0 && Math.floor(invincible / 4) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Boost glow
    if (boostTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.15 + Math.sin(frameCount * 0.3) * 0.05;
      ctx.fillStyle = COLORS.boostItem;
      ctx.beginPath();
      ctx.arc(0, 0, w * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
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

  // --- Draw Item ---
  function drawItem(item) {
    ctx.save();
    ctx.translate(item.x, item.y);

    item.pulseTimer++;

    // Pulsing glow
    const pulse = Math.sin(item.pulseTimer * 0.1) * 0.3 + 0.7;
    ctx.globalAlpha = pulse;
    ctx.shadowColor = item.color;
    ctx.shadowBlur = 15;

    // Background circle
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(0, 0, item.r, 0, Math.PI * 2);
    ctx.fill();

    // Inner circle
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.arc(0, 0, item.r * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Emoji
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.font = "18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.emoji, 0, 1);

    ctx.restore();
  }

  // --- Draw Floating Texts ---
  function drawFloatingTexts() {
    floatingTexts.forEach((ft) => {
      const alpha = ft.life / ft.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ft.color;
      ctx.font = `bold ${ft.size}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Shadow for readability
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;

      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });
  }

  // --- Draw Screen Flashes ---
  function drawScreenFlashes() {
    screenFlashes.forEach((flash) => {
      const alpha = (flash.life / flash.maxLife) * 0.3;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = flash.color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    });
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
      } else if (p.type === "trail") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
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
      const effects = [];
      if (p.shieldTimer > 0) effects.push("🛡️");
      if (p.boostTimer > 0) effects.push("⚡");
      const comboText = p.comboCount >= 3 ? ` | 🔥x${p.comboCount}` : "";
      const effectText = effects.length > 0 ? ` | ${effects.join("")}` : "";
      stat1El.textContent = `💰${levelCoins} | 💥${levelSmashes} | ${form}${comboText}${effectText}`;
    }

    if (twoPlayerMode) {
      hudP2.style.display = "block";
      if (players[1]) {
        const p = players[1];
        const pct = Math.max(0, p.hp / MAX_HP) * 100;
        hp2El.style.width = pct + "%";
        hp2El.className = "hp-fill" + (pct < 30 ? " danger" : pct < 60 ? " warning" : "");
        const form = p.isUnlocked ? "🌟" : p.isRobot ? "🤖" : "🚗";
        const effects = [];
        if (p.shieldTimer > 0) effects.push("🛡️");
        if (p.boostTimer > 0) effects.push("⚡");
        const comboText = p.comboCount >= 3 ? ` | 🔥x${p.comboCount}` : "";
        const effectText = effects.length > 0 ? ` | ${effects.join("")}` : "";
        stat2El.textContent = `💰${levelCoins} | 💥${levelSmashes} | ${form}${comboText}${effectText}`;
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
    void unlockNotify.offsetWidth;
    unlockNotify.style.animation = "popIn 0.4s ease-out";
    setTimeout(() => {
      unlockNotify.style.display = "none";
    }, 2000);
  }

  // --- Game Over ---
  function gameOver() {
    gameRunning = false;
    levelTransitioning = false;
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

    const level = LEVELS[currentLevelIndex];

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
      info.textContent = `关卡${currentLevelIndex + 1}: ${level.emoji}${level.name} | P1: 💰${players[0].coins} 💥${players[0].smashes} | P2: 💰${players[1].coins} 💥${players[1].smashes}`;
    } else {
      title.textContent = "游戏结束 😢";
      info.textContent = `关卡${currentLevelIndex + 1}: ${level.emoji}${level.name} | 本关得分: ${levelScore}/${level.targetScore} | 💰${levelCoins} 💥${levelSmashes}`;
    }

    gameoverScreen.style.display = "flex";
  }

  // --- Main Game Loop ---
  function gameLoop() {
    if (!gameRunning) return;

    frameCount++;
    gameTimeSeconds = frameCount / 60;
    roadOffset += ROAD_LINE_SPEED;

    // Update spawn interval based on difficulty
    currentEnemySpawnInterval = getEnemySpawnInterval();

    // Spawn enemies (reduce when boss is present)
    const bossActive = boss !== null && !boss.entering && boss.deathTimer === 0;
    const spawnSkipChance = bossActive ? 0.5 : 0; // 50% chance to skip when boss active
    if (frameCount % currentEnemySpawnInterval === 0 && Math.random() > spawnSkipChance) spawnEnemy();

    // Spawn coins (60 frame interval, sometimes multiple)
    if (frameCount % COIN_SPAWN_INTERVAL === 0) spawnCoin();

    // Spawn items
    if (frameCount % ITEM_SPAWN_INTERVAL === 0 && Math.random() < 0.6) spawnItem();

    // Update players
    updatePlayer(players[0], "w", "s", "a", "d");
    // Also support arrow keys for P1 in single player
    if (!twoPlayerMode) {
      const p = players[0];
      if (!p.alive) return;
      let speed = p.isRobot ? ROBOT_SPEED : PLAYER_SPEED;
      if (p.boostTimer > 0) speed *= 1.8;
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

    // --- Boss Logic ---
    // Check if boss should spawn (final level only)
    if (currentLevelIndex === LAST_LEVEL_INDEX && !bossSpawned && !bossDefeated && levelScore >= BOSS_SPAWN_SCORE) {
      bossWarningTimer = BOSS_WARNING_DURATION;
      bossSpawned = true; // mark as spawned to prevent re-triggering
    }

    // Boss warning phase
    if (bossWarningTimer > 0) {
      bossWarningTimer--;
      // Flash warning text
      if (bossWarningTimer % 30 < 15) {
        addFloatingText(canvas.width / 2, canvas.height / 2 - 80, "⚠️ BOSS即将出现！⚠️", "#fbbf24", 28);
      }
      // Spawn boss when warning ends
      if (bossWarningTimer <= 0) {
        spawnBoss();
      }
    }

    // Update boss
    if (boss) {
      if (boss.entering) {
        // Boss enters from top
        boss.y += boss.speed;
        if (boss.y >= canvas.height * 0.2) {
          boss.entering = false;
          boss.y = canvas.height * 0.2;
        }
      } else if (boss.deathTimer > 0) {
        // Boss death animation
        boss.deathTimer--;
        if (boss.deathTimer % 5 === 0) {
          spawnStarParticles(boss.x + (Math.random() - 0.5) * boss.w, boss.y + (Math.random() - 0.5) * boss.h, 5);
        }
        if (boss.deathTimer <= 0) {
          // Boss fully defeated
          boss = null;
          bossDefeated = true;
          bossVictoryTimer = 120;
          addScreenFlash("#fbbf24");
          // Big celebration
          for (let i = 0; i < 40; i++) {
            setTimeout(() => {
              spawnStarParticles(Math.random() * canvas.width, Math.random() * canvas.height * 0.6, 4);
            }, i * 30);
          }
          addFloatingText(canvas.width / 2, canvas.height / 2, "🎉 BOSS击败！通关！🎉", "#fbbf24", 36);
        }
      } else {
        // Boss active - movement pattern
        boss.phaseTimer++;
        // Slow horizontal weaving
        const roadW = getRoadWidth();
        const roadX = getRoadX();
        const centerX = roadX + roadW / 2;
        boss.x = centerX + Math.sin(boss.phaseTimer * 0.02) * (roadW * 0.3);
        // Slight vertical bob
        boss.y = canvas.height * 0.2 + Math.sin(boss.phaseTimer * 0.03) * 15;

        // Shooting
        boss.shootTimer--;
        if (boss.shootTimer <= 0) {
          spawnBossProjectiles(boss);
          boss.shootTimer = BOSS_SHOOT_INTERVAL;
        }
      }
    }

    // Update boss projectiles
    bossProjectiles.forEach(proj => {
      proj.x += proj.vx;
      proj.y += proj.vy;
    });

    // Boss victory timer
    if (bossVictoryTimer > 0) {
      bossVictoryTimer--;
      if (bossVictoryTimer <= 0) {
        showLevelComplete();
        return;
      }
    }

    // Update coins
    coins.forEach((c) => {
      c.y += c.speed;
      c.angle += 0.05;
    });

    // Update items
    items.forEach((item) => {
      item.y += item.speed;
      item.angle += 0.03;
    });

    // Update particles
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.vx *= 0.96;
      p.vy *= 0.96;
    });

    // Update floating texts
    floatingTexts.forEach((ft) => {
      ft.y += ft.vy;
      ft.life--;
    });

    // Update screen flashes
    screenFlashes.forEach((flash) => {
      flash.life--;
    });

    // Clean up off-screen
    enemies = enemies.filter((e) => e.y < canvas.height + 80);
    coins = coins.filter((c) => c.y < canvas.height + 40);
    items = items.filter((item) => item.y < canvas.height + 40);
    bossProjectiles = bossProjectiles.filter((proj) =>
      proj.x > -50 && proj.x < canvas.width + 50 &&
      proj.y > -50 && proj.y < canvas.height + 50
    );
    particles = particles.filter((p) => p.life > 0);
    floatingTexts = floatingTexts.filter((ft) => ft.life > 0);
    screenFlashes = screenFlashes.filter((flash) => flash.life > 0);

    // Collision: player vs enemy
    players.forEach((p) => {
      if (!p.alive) return;
      enemies.forEach((e, idx) => {
        if (e.hp <= 0) return;
        if (rectsOverlap(p, e)) {
          // If shield active, destroy enemy without taking damage
          if (p.shieldTimer > 0) {
            e.hp = 0;
            p.smashes++;
            levelSmashes++;
            spawnStarParticles(e.x, e.y, 8);
            showHitText(e.x, e.y, true);
            handleCombo(p);
            return;
          }

          if (p.invincible > 0) return;

          // Player smashes enemy
          e.hp = 0;
          p.smashes++;
          levelSmashes++;
          spawnStarParticles(e.x, e.y, 10);

          // Determine damage based on collision type
          let dmg;
          const isSide = isSideCollision(p, e);
          if (isSide) {
            dmg = SIDE_HIT_DAMAGE;
          } else if (p.isUnlocked) {
            dmg = HIT_DAMAGE_UNLOCKED;
          } else if (p.isRobot) {
            dmg = HIT_DAMAGE_ROBOT;
          } else {
            dmg = HIT_DAMAGE_CAR;
          }

          p.hp -= dmg;
          p.invincible = INVINCIBLE_FRAMES;

          // Show damage text
          if (!isSide) {
            showHitText(e.x, e.y, true);
            handleCombo(p);
          } else {
            showHitText(p.x, p.y, false);
          }

          // Show damage number
          addFloatingText(p.x, p.y - 30, `-${dmg}`, "#f87171", 14);

          // Check transform
          if (p.smashes >= SMASHES_TO_TRANSFORM && !p.isRobot) {
            p.isRobot = true;
            spawnTransformParticles(p.x, p.y);
            addScreenFlash("#818cf8");
            showUnlock(`🤖 P${p.id === "p1" ? "1" : "2"} 变身机器人！攻击力增强！`);
          }

          // Check unlock new car
          if (p.coins >= COINS_TO_UNLOCK && !p.isUnlocked) {
            p.isUnlocked = true;
            p.color = p.unlockedColor;
            spawnTransformParticles(p.x, p.y);
            addScreenFlash("#fbbf24");
            showUnlock(`🌟 P${p.id === "p1" ? "1" : "2"} 解锁新车！攻击力翻倍！`);
          }

          if (p.hp <= 0) {
            p.hp = 0;
            p.alive = false;
            spawnStarParticles(p.x, p.y, 20);
            addScreenFlash("#ef4444");
          }
        }
      });
    });

    // Remove dead enemies
    enemies = enemies.filter((e) => e.hp > 0);

    // Collision: player vs boss
    if (boss && !boss.entering && boss.deathTimer === 0) {
      players.forEach((p) => {
        if (!p.alive || p.invincible > 0) return;
        if (!rectsOverlap(p, boss)) return;

        // Player collided with boss
        const isSide = isSideCollision(p, boss);

        if (p.shieldTimer > 0) {
          // Shield: damage boss, no damage to player
          boss.hp--;
          boss.shakeTimer = 8;
          spawnStarParticles(boss.x, boss.y, 8);
          addFloatingText(boss.x, boss.y - 30, "-1", "#fbbf24", 20);
          addFloatingText(p.x, p.y - 20, "🛡️ BLOCK!", COLORS.shieldItem, 16);
        } else if (!isSide) {
          // Head-on smash: damage boss AND player
          boss.hp--;
          boss.shakeTimer = 8;
          let dmg;
          if (p.isUnlocked) dmg = HIT_DAMAGE_UNLOCKED;
          else if (p.isRobot) dmg = HIT_DAMAGE_ROBOT;
          else dmg = HIT_DAMAGE_CAR;
          p.hp -= dmg;
          p.invincible = INVINCIBLE_FRAMES;
          spawnStarParticles(boss.x, boss.y, 8);
          showHitText(p.x, p.y, true);
          addFloatingText(boss.x, boss.y - 30, "-1", "#fbbf24", 20);
          addFloatingText(p.x, p.y - 30, `-${dmg}`, "#f87171", 14);
          handleCombo(p);
        } else {
          // Side collision: damage player only
          p.hp -= SIDE_HIT_DAMAGE;
          p.invincible = INVINCIBLE_FRAMES;
          addFloatingText(p.x, p.y - 30, `-${SIDE_HIT_DAMAGE}`, "#f87171", 14);
          showHitText(p.x, p.y, false);
        }

        // Check player death
        if (p.hp <= 0) {
          p.hp = 0;
          p.alive = false;
          spawnStarParticles(p.x, p.y, 20);
          addScreenFlash("#ef4444");
        }

        // Check boss death
        if (boss.hp <= 0) {
          boss.hp = 0;
          boss.deathTimer = 60;
          addScreenFlash("#fbbf24");
          addFloatingText(canvas.width / 2, canvas.height / 2 - 40, "💥 BOSS击毁！💥", "#fbbf24", 32);
          // Kill all remaining enemies and projectiles
          enemies.forEach(e => { e.hp = 0; spawnStarParticles(e.x, e.y, 4); });
          bossProjectiles = [];
        }
      });
    }

    // Collision: player vs boss projectile
    players.forEach((p) => {
      if (!p.alive) return;
      bossProjectiles = bossProjectiles.filter((proj) => {
        if (circleRectOverlap(proj.x, proj.y, proj.r, p.x, p.y, p.w, p.h)) {
          if (p.shieldTimer > 0) {
            // Shield blocks projectile
            spawnStarParticles(proj.x, proj.y, 5);
            addFloatingText(proj.x, proj.y - 10, "🛡️ BLOCK!", COLORS.shieldItem, 16);
            return false;
          }
          if (p.invincible > 0) return true;
          p.hp -= BOSS_PROJECTILE_DAMAGE;
          p.invincible = INVINCIBLE_FRAMES;
          addFloatingText(p.x, p.y - 30, `-${BOSS_PROJECTILE_DAMAGE}`, "#f87171", 16);
          showHitText(p.x, p.y, false);
          spawnStarParticles(proj.x, proj.y, 6);
          if (p.hp <= 0) {
            p.hp = 0;
            p.alive = false;
            spawnStarParticles(p.x, p.y, 20);
            addScreenFlash("#ef4444");
          }
          return false;
        }
        return true;
      });
    });

    // Collision: player vs coin
    players.forEach((p) => {
      if (!p.alive) return;
      coins = coins.filter((c) => {
        if (circleRectOverlap(c.x, c.y, c.r, p.x, p.y, p.w, p.h)) {
          p.coins++;
          levelCoins++;
          spawnCoinParticles(c.x, c.y);
          // Floating +1 coin text
          addFloatingText(c.x, c.y - 10, "+1💰", COLORS.coin, 16);

          // Check unlock
          if (p.coins >= COINS_TO_UNLOCK && !p.isUnlocked) {
            p.isUnlocked = true;
            p.color = p.unlockedColor;
            spawnTransformParticles(p.x, p.y);
            addScreenFlash("#fbbf24");
            showUnlock(`🌟 P${p.id === "p1" ? "1" : "2"} 解锁新车！攻击力翻倍！`);
          }

          return false;
        }
        return true;
      });
    });

    // Collision: player vs item
    players.forEach((p) => {
      if (!p.alive) return;
      items = items.filter((item) => {
        if (circleRectOverlap(item.x, item.y, item.r, p.x, p.y, p.w, p.h)) {
          // Apply item effect
          switch (item.type) {
            case ITEM_HEAL:
              p.hp = Math.min(MAX_HP, p.hp + 30);
              addFloatingText(item.x, item.y - 15, "+30 HP", COLORS.healItem, 18);
              break;
            case ITEM_BOOST:
              p.boostTimer = 180; // 3 seconds at 60fps
              addFloatingText(item.x, item.y - 15, "⚡ SPEED!", COLORS.boostItem, 18);
              break;
            case ITEM_SHIELD:
              p.shieldTimer = 180; // 3 seconds at 60fps
              addFloatingText(item.x, item.y - 15, "🛡️ SHIELD!", COLORS.shieldItem, 18);
              break;
          }

          spawnItemParticles(item.x, item.y, item.color);
          showItemText(item.x, item.y, item.type);
          return false;
        }
        return true;
      });
    });

    // Check level completion
    const level = LEVELS[currentLevelIndex];
    // Calculate level score from per-level counters
    levelScore = getLevelScoreForPlayer();

    // In final level, completion requires defeating the boss
    // In other levels, use normal score threshold
    const isFinalLevel = currentLevelIndex === LAST_LEVEL_INDEX;
    const shouldComplete = isFinalLevel
      ? bossDefeated && bossVictoryTimer <= 0 && !levelTransitioning
      : levelScore >= level.targetScore && !levelTransitioning;

    if (shouldComplete && !isFinalLevel) {
      levelTransitioning = true;
      levelTransitionTimer = 90; // 1.5 second celebration before showing screen
      addScreenFlash("#fbbf24");
      // Show big text
      addFloatingText(canvas.width / 2, canvas.height / 2 - 40, "🎉 关卡通过！🎉", "#fbbf24", 32);
    }

    if (levelTransitioning) {
      levelTransitionTimer--;
      if (levelTransitionTimer <= 0) {
        showLevelComplete();
        return;
      }
    }

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

    // Draw items
    items.forEach(drawItem);

    // Draw enemies
    enemies.forEach(drawEnemyCar);

    // Draw boss
    if (boss) {
      drawBoss(boss);
      if (!boss.entering) {
        drawBossHpBar(boss);
      }
    }

    // Draw boss projectiles
    bossProjectiles.forEach(drawBossProjectile);

    // Draw players
    players.forEach((p) => {
      if (!p.alive) return;
      const color = p.isUnlocked ? p.unlockedColor : p.isRobot ? p.robotColor : p.color;
      drawCar(p.x, p.y, p.w, p.h, color, p.isRobot, p.isUnlocked, p.invincible, p.shieldTimer, p.boostTimer);
    });

    // Draw particles
    drawParticles();

    // Draw floating texts
    drawFloatingTexts();

    // Draw screen flashes
    drawScreenFlashes();

    // Draw level progress bar
    drawLevelProgress();

    // Update HUD
    updateHUD();

    requestAnimationFrame(gameLoop);
  }

  // --- Draw Level Progress Bar ---
  function drawLevelProgress() {
    const level = LEVELS[currentLevelIndex];
    const barW = Math.min(280, canvas.width * 0.5);
    const barH = 20;
    const barX = (canvas.width - barW) / 2;
    const barY = 52;

    // For final level with boss, show boss progress instead
    const isFinalLevel = currentLevelIndex === LAST_LEVEL_INDEX;
    let pct, barText;

    if (isFinalLevel && bossSpawned) {
      // Show boss HP progress
      if (boss) {
        pct = 1 - (boss.hp / boss.maxHp); // progress = damage dealt
        barText = `${level.emoji} 关卡${currentLevelIndex + 1}: ${level.name}  BOSS HP: ${boss.hp}/${boss.maxHp}`;
      } else if (bossDefeated) {
        pct = 1;
        barText = `${level.emoji} 关卡${currentLevelIndex + 1}: ${level.name}  ✅ BOSS已击败!`;
      } else {
        pct = Math.min(1, levelScore / BOSS_SPAWN_SCORE);
        barText = `${level.emoji} 关卡${currentLevelIndex + 1}: ${level.name}  ${levelScore}/${BOSS_SPAWN_SCORE} → BOSS`;
      }
    } else if (isFinalLevel) {
      // Before boss spawned, show score toward boss
      pct = Math.min(1, levelScore / BOSS_SPAWN_SCORE);
      barText = `${level.emoji} 关卡${currentLevelIndex + 1}: ${level.name}  ${levelScore}/${BOSS_SPAWN_SCORE} → BOSS`;
    } else {
      pct = Math.min(1, levelScore / level.targetScore);
      barText = `${level.emoji} 关卡${currentLevelIndex + 1}: ${level.name}  ${levelScore}/${level.targetScore}`;
    }

    // Background
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.roundRect(barX - 2, barY - 2, barW + 4, barH + 4, 12);
    ctx.fill();

    // Track
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 10);
    ctx.fill();

    // Fill
    const gradient = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    if (isFinalLevel && bossSpawned) {
      gradient.addColorStop(0, "#dc2626");
      gradient.addColorStop(1, "#f97316");
    } else {
      gradient.addColorStop(0, "#6366f1");
      gradient.addColorStop(1, "#a855f7");
    }
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * pct, barH, 10);
    ctx.fill();

    // Text
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(barText, canvas.width / 2, barY + barH / 2);
  }

  // --- Initial HUD setup ---
  updateHUD();
})();
