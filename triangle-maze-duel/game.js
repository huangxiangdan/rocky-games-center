export const MAZE_ROWS = [
  "###################",
  "#...#.....#.......#",
  "#.#.#.###.#.#####.#",
  "#.#...#...#.....#.#",
  "#.#####.#######.#.#",
  "#.....#.....#...#.#",
  "#####.#####.#.###.#",
  "#...#.....#.#...#.#",
  "#.#.#####.#.###.#.#",
  "#.#.....#.#.....#.#",
  "#.#####.#.#######.#",
  "#.......#.........#",
  "###################",
];

export const WORLD = {
  cellSize: 48,
  width: MAZE_ROWS[0].length * 48,
  height: MAZE_ROWS.length * 48,
  playerRadius: 15,
  playerSpeed: 220,
  bulletRadius: 6,
  bulletSpeed: 460,
  fireCooldown: 0.34,
  maxHealth: 3,
  respawnShield: 0.8,
};

// Weapon definitions
export const WEAPONS = {
  pistol:  { name: "手枪🔫",   icon: "🔫", color: "#ccc",    bullets: 1, spread: 0,    damage: 1, piercing: false, explosive: false, cooldown: 0.34 },
  shotgun: { name: "散弹枪🔫", icon: "🔫", color: "#f39c12", bullets: 3, spread: 0.25,  damage: 1, piercing: false, explosive: false, cooldown: 0.5  },
  bomb:    { name: "炸弹💣",   icon: "💣", color: "#e74c3c", bullets: 1, spread: 0,    damage: 3, piercing: false, explosive: true,  cooldown: 0.8  },
  laser:   { name: "激光⚡",   icon: "⚡", color: "#9b59b6", bullets: 1, spread: 0,    damage: 1, piercing: true,  explosive: false, cooldown: 0.5  },
  shield:  { name: "护盾🛡️",  icon: "🛡️", color: "#3498db", bullets: 0, spread: 0,    damage: 0, piercing: false, explosive: false, cooldown: 0    },
};

export const WEAPON_DROP_CHANCE = 0.012; // per frame chance to spawn a weapon
export const WEAPON_DROP_DURATION = 8; // seconds before weapon disappears
export const WEAPON_EFFECT_DURATION = 6; // seconds for weapon effect
export const SHIELD_DURATION = 5; // seconds of invincibility

// col/row = grid coordinates, phase = cycle offset (0–1) so spikes stagger
export const SPIKES = [
  { col: 5,  row: 2,  phase: 0,    currentCol: 5,  currentRow: 2  },
  { col: 3,  row: 5,  phase: 0.33, currentCol: 3,  currentRow: 5  },
  { col: 9,  row: 3,  phase: 0.17, currentCol: 9,  currentRow: 3  },
  { col: 7,  row: 7,  phase: 0.5,  currentCol: 7,  currentRow: 7  },
  { col: 13, row: 5,  phase: 0.67, currentCol: 13, currentRow: 5  },
  { col: 5,  row: 9,  phase: 0.83, currentCol: 5,  currentRow: 9  },
];

// Spike cycle: retracted for 1.2 s, extended for 1.0 s (total 2.2 s per phase)
export const SPIKE_CYCLE   = 2.2;
export const SPIKE_EXTEND        = 0.45; // fraction of cycle where spike is extended
export const SPIKE_MOVE_INTERVAL = 2.5;

export function getOpenCells(maze = MAZE_ROWS) {
  const cells = [];
  for (let row = 0; row < maze.length; row += 1) {
    for (let col = 0; col < maze[row].length; col += 1) {
      if (maze[row][col] === ".") {
        cells.push({ col, row });
      }
    }
  }
  return cells;
}

export function isSpikeExtended(spike, worldTime) {
  const t = ((worldTime / SPIKE_CYCLE) + spike.phase) % 1;
  return t > (1 - SPIKE_EXTEND);
}

export const PLAYER_CONFIG = {
  green: {
    color: "#3fbf68",
    keys: { up: "w", down: "s", left: "a", right: "d", fire: "f" },
    spawn: { x: 84, y: 84 },
  },
  red: {
    color: "#d44a4a",
    keys: {
      up: "arrowup",
      down: "arrowdown",
      left: "arrowleft",
      right: "arrowright",
      fire: "/",
    },
    spawn: { x: WORLD.width - 84, y: WORLD.height - 84 },
  },
};

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeVector(dx, dy) {
  const length = Math.hypot(dx, dy);
  if (length === 0) {
    return { x: 0, y: 0 };
  }
  return { x: dx / length, y: dy / length };
}

export function createPlayer(id, level = 1, isBoss = false) {
  const config = PLAYER_CONFIG[id];
  const health = isBoss ? 10 : (id === "red" ? 2 + level : WORLD.maxHealth);

  return {
    id,
    x: config.spawn.x,
    y: config.spawn.y,
    angle: id === "green" ? 0 : Math.PI,
    health,
    maxHealth: health,
    cooldown: 0,
    shield: WORLD.respawnShield,
    alive: true,
    hitFlash: 0,
    weapon: "pistol",
    weaponTimer: 0,
    shieldTimer: 0,
    isBoss,
    bossScale: isBoss ? 2 : 1,
  };
}

export function createWeaponDrop() {
  const openCells = getOpenCells();
  const cell = openCells[Math.floor(Math.random() * openCells.length)];
  const types = ["shotgun", "bomb", "laser", "shield"];
  const type = types[Math.floor(Math.random() * types.length)];
  return {
    type,
    x: (cell.col + 0.5) * WORLD.cellSize,
    y: (cell.row + 0.5) * WORLD.cellSize,
    timer: WEAPON_DROP_DURATION,
    glow: 0,
  };
}

export function createInitialState() {
  return {
    running: false,
    mode: "single",
    winner: null,
    level: 1,
    levelTransition: 0, // countdown for level transition
    bossWarning: 0, // countdown for boss warning
    players: {
      green: createPlayer("green", 1, false),
      red: createPlayer("red", 1, false),
    },
    bullets: [],
    weaponDrops: [],
    keys: new Set(),
    worldTime: 0,
    spikeMoveTimer: 0,
  };
}

export function isWallCell(col, row, maze = MAZE_ROWS) {
  const line = maze[row];
  if (!line) {
    return true;
  }
  return line[col] === "#";
}

export function collidesWithMaze(x, y, radius, maze = MAZE_ROWS, cellSize = WORLD.cellSize) {
  const left = Math.floor((x - radius) / cellSize);
  const right = Math.floor((x + radius) / cellSize);
  const top = Math.floor((y - radius) / cellSize);
  const bottom = Math.floor((y + radius) / cellSize);

  for (let row = top; row <= bottom; row += 1) {
    for (let col = left; col <= right; col += 1) {
      if (!isWallCell(col, row, maze)) {
        continue;
      }

      const cellLeft = col * cellSize;
      const cellTop = row * cellSize;
      const closestX = clamp(x, cellLeft, cellLeft + cellSize);
      const closestY = clamp(y, cellTop, cellTop + cellSize);
      const gap = Math.hypot(x - closestX, y - closestY);

      if (gap < radius) {
        return true;
      }
    }
  }

  return false;
}

export function getInputVector(keys, mapping) {
  let dx = 0;
  let dy = 0;

  if (keys.has(mapping.up)) {
    dy -= 1;
  }
  if (keys.has(mapping.down)) {
    dy += 1;
  }
  if (keys.has(mapping.left)) {
    dx -= 1;
  }
  if (keys.has(mapping.right)) {
    dx += 1;
  }

  return normalizeVector(dx, dy);
}

export function hasLineOfSight(from, to, maze = MAZE_ROWS, cellSize = WORLD.cellSize) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.floor(distance / 12));

  for (let step = 1; step < steps; step += 1) {
    const progress = step / steps;
    const x = from.x + dx * progress;
    const y = from.y + dy * progress;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);

    if (isWallCell(col, row, maze)) {
      return false;
    }
  }

  return true;
}

// BFS from a world position, returns a 2D array of distances (-1 = unreachable/wall)
function bfsDistances(fromX, fromY, maze = MAZE_ROWS, cellSize = WORLD.cellSize) {
  const rows = maze.length;
  const cols = maze[0].length;
  const dist = Array.from({ length: rows }, () => new Int16Array(cols).fill(-1));
  const startCol = Math.floor(fromX / cellSize);
  const startRow = Math.floor(fromY / cellSize);
  if (startRow < 0 || startRow >= rows || startCol < 0 || startCol >= cols) return dist;
  dist[startRow][startCol] = 0;
  const queue = [[startCol, startRow]];
  let head = 0;
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  while (head < queue.length) {
    const [cx, cy] = queue[head++];
    const d = dist[cy][cx];
    for (const [ddx, ddy] of dirs) {
      const nx = cx + ddx, ny = cy + ddy;
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      if (dist[ny][nx] !== -1) continue;
      if (maze[ny][nx] === '#') continue;
      dist[ny][nx] = d + 1;
      queue.push([nx, ny]);
    }
  }
  return dist;
}

// Count open neighbors for a cell (dead-end detection)
function countOpenNeighbors(col, row, maze = MAZE_ROWS) {
  let count = 0;
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  for (const [dx, dy] of dirs) {
    const nc = col + dx, nr = row + dy;
    if (nr >= 0 && nr < maze.length && nc >= 0 && nc < maze[0].length && maze[nr][nc] !== '#') {
      count++;
    }
  }
  return count;
}

export function getAiInputVector(ai, target, phase = 0, canSeeTarget = true) {
  const cellSize = WORLD.cellSize;
  const aiCol = Math.floor(ai.x / cellSize);
  const aiRow = Math.floor(ai.y / cellSize);

  // BFS from the target (chaser) to know distances
  const targetDist = bfsDistances(target.x, target.y);

  // Check all 4 directions + stay
  const dirs = [
    { dx: 0, dy: -1 }, // up
    { dx: 0, dy: 1 },  // down
    { dx: -1, dy: 0 }, // left
    { dx: 1, dy: 0 },  // right
  ];

  let bestScore = -Infinity;
  let bestDir = { x: 0, y: 0 };

  for (const dir of dirs) {
    const nc = aiCol + dir.dx;
    const nr = aiRow + dir.dy;

    // Must be a valid open cell
    if (nr < 0 || nr >= MAZE_ROWS.length || nc < 0 || nc >= MAZE_ROWS[0].length) continue;
    if (MAZE_ROWS[nr][nc] === '#') continue;

    const d = targetDist[nr][nc];
    if (d === -1) continue; // unreachable

    // Score: prefer cells far from target
    // Bonus for cells with more open neighbors (avoid dead ends)
    const neighbors = countOpenNeighbors(nc, nr);
    const deadEndPenalty = neighbors <= 1 ? -8 : 0;
    const score = d + deadEndPenalty;

    if (score > bestScore) {
      bestScore = score;
      bestDir = normalizeVector(dir.dx, dir.dy);
    }
  }

  // If no good direction found, fall back to simple evasion
  if (bestScore === -Infinity) {
    const dx = target.x - ai.x;
    const dy = target.y - ai.y;
    return normalizeVector(-dx, -dy);
  }

  return bestDir;
}

export function shouldAiFire(ai, target, canSeeTarget) {
  return ai.alive && target.alive && target.shield <= 0 && target.shieldTimer <= 0 && ai.cooldown <= 0 && canSeeTarget;
}

export function movePlayer(player, vector, dt, maze = MAZE_ROWS) {
  const speed = player.isBoss ? WORLD.playerSpeed * 1.3 : WORLD.playerSpeed;
  let next = { ...player };
  const stepX = clamp(
    player.x + vector.x * speed * dt,
    WORLD.playerRadius * player.bossScale,
    WORLD.width - WORLD.playerRadius * player.bossScale,
  );
  const stepY = clamp(
    player.y + vector.y * speed * dt,
    WORLD.playerRadius * player.bossScale,
    WORLD.height - WORLD.playerRadius * player.bossScale,
  );

  if (!collidesWithMaze(stepX, player.y, WORLD.playerRadius * player.bossScale, maze)) {
    next.x = stepX;
  }

  if (!collidesWithMaze(next.x, stepY, WORLD.playerRadius * player.bossScale, maze)) {
    next.y = stepY;
  }

  if (vector.x !== 0 || vector.y !== 0) {
    next.angle = Math.atan2(vector.y, vector.x);
  }

  return next;
}

export function createBullet(player, weaponType = "pistol") {
  const weapon = WEAPONS[weaponType] || WEAPONS.pistol;
  const noseOffset = WORLD.playerRadius * player.bossScale + 8;
  const bullets = [];

  for (let i = 0; i < weapon.bullets; i++) {
    const spreadAngle = weapon.bullets > 1
      ? (i - (weapon.bullets - 1) / 2) * weapon.spread
      : 0;
    const angle = player.angle + spreadAngle;
    const vx = Math.cos(angle) * WORLD.bulletSpeed;
    const vy = Math.sin(angle) * WORLD.bulletSpeed;

    bullets.push({
      owner: player.id,
      x: player.x + Math.cos(angle) * noseOffset,
      y: player.y + Math.sin(angle) * noseOffset,
      vx,
      vy,
      damage: weapon.damage,
      piercing: weapon.piercing,
      explosive: weapon.explosive,
      weaponType,
    });
  }

  return bullets;
}

export function stepBullet(bullet, dt) {
  return {
    ...bullet,
    x: bullet.x + bullet.vx * dt,
    y: bullet.y + bullet.vy * dt,
  };
}

export function stepBullets(bullets, dt, maze = MAZE_ROWS) {
  return bullets
    .map((bullet) => stepBullet(bullet, dt))
    .filter(
      (bullet) =>
        bullet.x >= 0 &&
        bullet.y >= 0 &&
        bullet.x <= WORLD.width &&
        bullet.y <= WORLD.height &&
        !collidesWithMaze(bullet.x, bullet.y, WORLD.bulletRadius, maze),
    );
}

export function bulletHitsPlayer(bullet, player) {
  if (bullet.owner === player.id || !player.alive) {
    return false;
  }
  // Shield (respawn or weapon) blocks hits
  if (player.shield > 0 || player.shieldTimer > 0) {
    return false;
  }

  const effectiveRadius = WORLD.playerRadius * player.bossScale;
  return Math.hypot(bullet.x - player.x, bullet.y - player.y) <= effectiveRadius + WORLD.bulletRadius;
}

export function applyBulletHit(player, bullet) {
  const dmg = bullet ? (bullet.damage || 1) : 1;
  const nextHealth = Math.max(0, player.health - dmg);

  if (bullet) {
    // Knockback from bullet hit
    const dx = player.x - bullet.x;
    const dy = player.y - bullet.y;
    const len = Math.hypot(dx, dy) || 1;
    const knockback = bullet.explosive ? 80 : 40;
    let newX = player.x + (dx / len) * knockback;
    let newY = player.y + (dy / len) * knockback;
    newX = clamp(newX, WORLD.playerRadius * player.bossScale, WORLD.width - WORLD.playerRadius * player.bossScale);
    newY = clamp(newY, WORLD.playerRadius * player.bossScale, WORLD.height - WORLD.playerRadius * player.bossScale);
    if (!collidesWithMaze(newX, player.y, WORLD.playerRadius * player.bossScale)) {
      player.x = newX;
    }
    if (!collidesWithMaze(player.x, newY, WORLD.playerRadius * player.bossScale)) {
      player.y = newY;
    }
  } else {
    // Spike hit: teleport back to spawn
    const spawn = PLAYER_CONFIG[player.id].spawn;
    player.x = spawn.x;
    player.y = spawn.y;
  }

  return {
    ...player,
    health: nextHealth,
    shield: WORLD.respawnShield,
    alive: nextHealth > 0,
    hitFlash: 0.3,
  };
}

export function checkSpikeHits(players, worldTime) {
  let next = { ...players };
  const half = WORLD.cellSize / 2;

  for (const spike of SPIKES) {
    if (!isSpikeExtended(spike, worldTime)) continue;

    const cx = (spike.currentCol + 0.5) * WORLD.cellSize;
    const cy = (spike.currentRow + 0.5) * WORLD.cellSize;

    for (const id of ["green", "red"]) {
      const player = next[id];
      if (!player.alive || player.shield > 0 || player.shieldTimer > 0) continue;

      if (Math.abs(player.x - cx) < half - 4 && Math.abs(player.y - cy) < half - 4) {
        next = { ...next, [id]: applyBulletHit(player, null) };
      }
    }
  }

  return next;
}

export function resolveBulletHits(players, bullets) {
  let nextPlayers = { ...players };
  const keptBullets = [];
  const hitPlayerIds = new Set();

  for (const bullet of bullets) {
    const targetId = bullet.owner === "green" ? "red" : "green";
    const target = nextPlayers[targetId];

    if (bulletHitsPlayer(bullet, target)) {
      nextPlayers = {
        ...nextPlayers,
        [targetId]: applyBulletHit(target, bullet),
      };
      // Piercing bullets pass through
      if (bullet.piercing) {
        keptBullets.push(bullet);
      }
      // Explosive bullets: damage nearby area
      if (bullet.explosive) {
        const explosionRadius = 60;
        const otherId = bullet.owner;
        // Check if the owner is also in explosion range (self-damage)
        const owner = nextPlayers[otherId];
        if (owner.alive && owner.shield <= 0 && owner.shieldTimer <= 0) {
          if (Math.hypot(bullet.x - owner.x, bullet.y - owner.y) <= explosionRadius) {
            nextPlayers = {
              ...nextPlayers,
              [otherId]: applyBulletHit(owner, bullet),
            };
          }
        }
      }
      continue;
    }

    keptBullets.push(bullet);
  }

  return { players: nextPlayers, bullets: keptBullets };
}

function drawMaze(ctx) {
  ctx.fillStyle = "#4d7b67";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  for (let row = 0; row < MAZE_ROWS.length; row += 1) {
    for (let col = 0; col < MAZE_ROWS[row].length; col += 1) {
      if (MAZE_ROWS[row][col] !== "#") {
        continue;
      }

      const x = col * WORLD.cellSize;
      const y = row * WORLD.cellSize;
      ctx.fillStyle = "#274d3d";
      ctx.fillRect(x, y, WORLD.cellSize, WORLD.cellSize);
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.strokeRect(x, y, WORLD.cellSize, WORLD.cellSize);
    }
  }
}

function drawSpikes(ctx, worldTime) {
  const cs = WORLD.cellSize;
  const half = cs / 2;

  for (const spike of SPIKES) {
    const cx = (spike.currentCol + 0.5) * cs;
    const cy = (spike.currentRow + 0.5) * cs;
    const extended = isSpikeExtended(spike, worldTime);

    // Cycle position 0→1; warning = last 0.12 of retracted phase
    const t = ((worldTime / SPIKE_CYCLE) + spike.phase) % 1;
    const warning = !extended && t > (1 - SPIKE_EXTEND - 0.12);

    // Base plate
    ctx.fillStyle = warning ? "rgba(220,60,40,0.55)" : "rgba(160,40,30,0.3)";
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();

    if (extended) {
      ctx.fillStyle = "#c0392b";
      ctx.shadowColor = "#ff6b6b";
      ctx.shadowBlur = 8;
      // 4 spike triangles pointing N/S/E/W
      const dirs = [
        [0, -1], [0, 1], [1, 0], [-1, 0],
      ];
      const tip = 18;
      const base = 6;
      for (const [dx, dy] of dirs) {
        const px = -dy, py = dx;
        ctx.beginPath();
        ctx.moveTo(cx + dx * tip, cy + dy * tip);
        ctx.lineTo(cx + px * base, cy + py * base);
        ctx.lineTo(cx - px * base, cy - py * base);
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }
  }
}

function drawWeaponDrops(ctx, weaponDrops, worldTime) {
  for (const drop of weaponDrops) {
    const weapon = WEAPONS[drop.type];
    const glow = 0.5 + 0.5 * Math.sin(worldTime * 4);

    ctx.save();
    ctx.translate(drop.x, drop.y);

    // Glow circle
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fillStyle = weapon.color;
    ctx.globalAlpha = 0.2 + glow * 0.3;
    ctx.fill();

    // Inner circle
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fillStyle = weapon.color;
    ctx.fill();

    // Icon
    ctx.globalAlpha = 1;
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(weapon.icon, 0, 0);

    ctx.restore();
  }
}

function drawTriangle(ctx, player) {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);

  const scale = player.bossScale;
  ctx.scale(scale, scale);

  // Hit flash: white overlay
  const isFlashing = player.hitFlash > 0 && Math.floor(player.hitFlash * 10) % 2 === 0;
  const hasShield = player.shield > 0 || player.shieldTimer > 0;
  ctx.globalAlpha = hasShield ? 0.72 : (isFlashing ? 0.5 : 1);

  // Shield aura
  if (player.shieldTimer > 0) {
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.strokeStyle = "#3498db";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#3498db";
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Draw gun barrel
  const weapon = WEAPONS[player.weapon] || WEAPONS.pistol;
  ctx.fillStyle = isFlashing ? "#fff" : weapon.color;
  ctx.fillRect(10, -3, 14, 6);
  // Gun tip highlight
  ctx.fillStyle = isFlashing ? "#fff" : "#aaa";
  ctx.fillRect(20, -2, 4, 4);
  // Gun body
  ctx.fillStyle = isFlashing ? "#fff" : "#666";
  ctx.fillRect(4, -5, 10, 10);

  // Draw triangle body
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-12, -12);
  ctx.lineTo(-12, 12);
  ctx.closePath();
  ctx.fillStyle = isFlashing ? "#fff" : (player.isBoss ? "#9b59b6" : PLAYER_CONFIG[player.id].color);
  ctx.fill();

  // Boss crown
  if (player.isBoss) {
    ctx.fillStyle = "#f1c40f";
    ctx.beginPath();
    ctx.moveTo(-4, -14);
    ctx.lineTo(-8, -20);
    ctx.lineTo(-2, -17);
    ctx.lineTo(2, -22);
    ctx.lineTo(6, -17);
    ctx.lineTo(10, -20);
    ctx.lineTo(6, -14);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();

  // Draw health bar above player
  if (player.alive) {
    const barWidth = 30 * scale;
    const barHeight = 4 * scale;
    const barX = player.x - barWidth / 2;
    const barY = player.y - WORLD.playerRadius * scale - 12 * scale;
    const healthRatio = player.health / player.maxHealth;

    // Background
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Health fill
    const healthColor = healthRatio > 0.5 ? "#3fbf68" : healthRatio > 0.25 ? "#f1c40f" : "#e74c3c";
    ctx.fillStyle = healthColor;
    ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);

    // Border
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }
}

function drawBullets(ctx, bullets) {
  for (const bullet of bullets) {
    const weapon = WEAPONS[bullet.weaponType] || WEAPONS.pistol;
    if (bullet.explosive) {
      ctx.fillStyle = "#e74c3c";
      ctx.shadowColor = "#e74c3c";
      ctx.shadowBlur = 8;
    } else if (bullet.piercing) {
      ctx.fillStyle = "#9b59b6";
      ctx.shadowColor = "#9b59b6";
      ctx.shadowBlur = 8;
    } else {
      ctx.fillStyle = "#fff4db";
      ctx.shadowBlur = 0;
    }
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.explosive ? 8 : WORLD.bulletRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawBossWarning(ctx, timer) {
  if (timer <= 0) return;
  const alpha = 0.5 + 0.5 * Math.sin(timer * 12);
  ctx.save();
  ctx.fillStyle = `rgba(155, 89, 182, ${alpha * 0.3})`;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold 56px "Trebuchet MS", sans-serif`;
  ctx.fillStyle = `rgba(241, 196, 15, ${alpha})`;
  ctx.shadowColor = "#f1c40f";
  ctx.shadowBlur = 20;
  ctx.fillText("👾 BOSS来了！👾", WORLD.width / 2, WORLD.height / 2);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawLevelTransition(ctx, level, timer) {
  if (timer <= 0) return;
  const alpha = Math.min(1, timer / 0.5);
  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.6})`;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold 48px "Trebuchet MS", sans-serif`;
  ctx.fillStyle = `rgba(63, 191, 104, ${alpha})`;
  ctx.shadowColor = "#3fbf68";
  ctx.shadowBlur = 16;
  ctx.fillText(`⭐ 第 ${level} 关 ⭐`, WORLD.width / 2, WORLD.height / 2);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function createRuntime() {
  const canvas = document.querySelector("#arena");
  const greenHealthNode = document.querySelector("#greenHealth");
  const redHealthNode = document.querySelector("#redHealth");
  const greenScoreNode = document.querySelector("#greenScore");
  const redScoreNode = document.querySelector("#redScore");
  const levelNode = document.querySelector("#levelDisplay");
  const weaponNode = document.querySelector("#weaponDisplay");
  const statusNode = document.querySelector("#status");
  const startButton = document.querySelector("#startButton");
  const modeSelect = document.querySelector("#modeSelect");

  if (
    !canvas ||
    !(canvas instanceof HTMLCanvasElement) ||
    !greenHealthNode ||
    !redHealthNode ||
    !greenScoreNode ||
    !redScoreNode ||
    !levelNode ||
    !weaponNode ||
    !statusNode ||
    !startButton ||
    !modeSelect ||
    !(modeSelect instanceof HTMLSelectElement)
  ) {
    return null;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  canvas.width = WORLD.width;
  canvas.height = WORLD.height;

  const state = createInitialState();
  let frame = 0;
  let lastTime = 0;
  let dragging = null;
  let dragOffset = { x: 0, y: 0 };

  const setStatus = (text) => {
    statusNode.textContent = text;
  };

  const reset = () => {
    const next = createInitialState();
    state.running = next.running;
    state.mode = modeSelect.value;
    state.winner = next.winner;
    state.level = 1;
    state.levelTransition = 0;
    state.bossWarning = 0;
    state.players = next.players;
    state.bullets = next.bullets;
    state.weaponDrops = [];
    state.keys = next.keys;
    state.worldTime = next.worldTime;
    state.spikeMoveTimer = next.spikeMoveTimer;
    // Reset spike positions to original
    for (const spike of SPIKES) {
      spike.currentCol = spike.col;
      spike.currentRow = spike.row;
    }
    startButton.textContent = "开始对战";
    setStatus(
      state.mode === "single"
        ? "单人模式：你控制绿三角，红三角由电脑控制。按F/空格开枪，点击屏幕瞄准射击！"
        : "双人模式：绿三角和红三角都各有 3 滴血。先打空对方血量的人获胜。",
    );
    render();
  };

  const startLevel = (level) => {
    const isBoss = level % 3 === 0;
    state.level = level;
    state.levelTransition = 2;
    state.bossWarning = isBoss ? 2.5 : 0;
    state.bullets = [];
    state.weaponDrops = [];

    // Reset green player (always 3 HP)
    state.players.green = createPlayer("green", level, false);
    // Reset red player (AI, scales with level)
    state.players.red = createPlayer("red", level, isBoss);

    // Reset spike positions
    for (const spike of SPIKES) {
      spike.currentCol = spike.col;
      spike.currentRow = spike.row;
    }
  };

  const restart = () => {
    state.running = true;
    state.mode = modeSelect.value;
    state.winner = null;
    state.level = 1;
    state.levelTransition = 2;
    state.bossWarning = 0;
    state.bullets = [];
    state.weaponDrops = [];
    state.players.green = createPlayer("green", 1, false);
    state.players.red = createPlayer("red", 1, false);
    state.keys.clear();
    state.worldTime = 0;
    startButton.textContent = "重新开始";
    setStatus(
      state.mode === "single"
        ? "单人模式开战。按F/空格开枪，点击屏幕瞄准射击！"
        : "双人模式开战。躲开墙角，找角度开火。",
    );
    render();
  };

  const drawVictoryScreen = (winner) => {
    const w = canvas.width;
    const h = canvas.height;
    const isGreen = winner === "green";
    const winColor = isGreen ? "#3fbf68" : "#d44a4a";
    const label =
      state.mode === "single"
        ? isGreen
          ? "你赢了！"
          : "电脑获胜"
        : isGreen
          ? "绿三角获胜！"
          : "红三角获胜！";

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;

    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = winColor;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = winColor;
    ctx.font = `bold 64px "Trebuchet MS", sans-serif`;
    ctx.shadowColor = winColor;
    ctx.shadowBlur = 24;
    ctx.fillText(label, cx, cy - 18);

    ctx.font = `22px "Trebuchet MS", sans-serif`;
    ctx.fillStyle = "rgba(239,245,255,0.75)";
    ctx.shadowBlur = 0;

    if (isGreen && state.mode === "single") {
      ctx.fillText("进入下一关...", cx, cy + 52);
    } else {
      ctx.fillText("按「开始对战」再来一局", cx, cy + 52);
    }

    ctx.restore();
  };

  const drawGameOverScreen = () => {
    const w = canvas.width;
    const h = canvas.height;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#e74c3c";
    ctx.font = `bold 56px "Trebuchet MS", sans-serif`;
    ctx.shadowColor = "#e74c3c";
    ctx.shadowBlur = 20;
    ctx.fillText("游戏结束", cx, cy - 30);

    ctx.font = `24px "Trebuchet MS", sans-serif`;
    ctx.fillStyle = "rgba(239,245,255,0.8)";
    ctx.shadowBlur = 0;
    ctx.fillText(`你闯到了第 ${state.level} 关`, cx, cy + 20);
    ctx.fillText("按「开始对战」重新开始", cx, cy + 60);

    ctx.restore();
  };

  const render = () => {
    drawMaze(ctx);
    drawSpikes(ctx, state.worldTime);
    drawWeaponDrops(ctx, state.weaponDrops, state.worldTime);
    drawBullets(ctx, state.bullets);
    drawTriangle(ctx, state.players.green);
    drawTriangle(ctx, state.players.red);

    if (state.bossWarning > 0) {
      drawBossWarning(ctx, state.bossWarning);
    }
    if (state.levelTransition > 0) {
      drawLevelTransition(ctx, state.level, state.levelTransition);
    }

    if (state.winner === "green" && state.mode === "single") {
      // Level complete, will auto-advance
    } else if (state.winner) {
      drawVictoryScreen(state.winner);
    }

    if (!state.players.green.alive && state.mode === "single") {
      drawGameOverScreen();
    }

    greenHealthNode.textContent = `${state.players.green.health}`;
    redHealthNode.textContent = `${state.players.red.health}`;
    greenScoreNode.textContent = `${state.players.red.maxHealth - state.players.red.health}`;
    redScoreNode.textContent = `${state.players.green.maxHealth - state.players.green.health}`;
    levelNode.textContent = `${state.level}${state.players.red.isBoss ? " 👾BOSS" : ""}`;
    weaponNode.textContent = WEAPONS[state.players.green.weapon].name;
  };

  const onKeyChange = (event, pressed) => {
    const key = event.key.toLowerCase();
    const allowed = ["w", "a", "s", "d", "f", " ", "arrowup", "arrowdown", "arrowleft", "arrowright", "/"];

    if (!allowed.includes(key)) {
      return;
    }

    event.preventDefault();

    if (pressed) {
      state.keys.add(key);
    } else {
      state.keys.delete(key);
    }
  };

  const fireWeapon = (player) => {
    if (player.cooldown > 0 || !player.alive) return [];
    const weapon = WEAPONS[player.weapon] || WEAPONS.pistol;
    player.cooldown = weapon.cooldown;
    return createBullet(player, player.weapon);
  };

  const tick = (timestamp) => {
    if (!lastTime) {
      lastTime = timestamp;
    }

    const dt = Math.min((timestamp - lastTime) / 1000, 0.032);
    lastTime = timestamp;

    // Update level transition timer
    if (state.levelTransition > 0) {
      state.levelTransition -= dt;
    }
    if (state.bossWarning > 0) {
      state.bossWarning -= dt;
    }

    if (state.running) {
      const greenInput = dragging === 'green' ? { x: 0, y: 0 } : getInputVector(state.keys, PLAYER_CONFIG.green.keys);
      const redCanSeeGreen = hasLineOfSight(state.players.red, state.players.green);
      const aiPhase = Math.floor(timestamp / 520);
      const redInput =
        state.mode === "single"
          ? getAiInputVector(state.players.red, state.players.green, aiPhase, redCanSeeGreen)
          : getInputVector(state.keys, PLAYER_CONFIG.red.keys);

      state.players = {
        green: movePlayer(
          {
            ...state.players.green,
            cooldown: Math.max(0, state.players.green.cooldown - dt),
            shield: Math.max(0, state.players.green.shield - dt),
            hitFlash: Math.max(0, state.players.green.hitFlash - dt),
            weaponTimer: Math.max(0, state.players.green.weaponTimer - dt),
            shieldTimer: Math.max(0, state.players.green.shieldTimer - dt),
          },
          greenInput,
          dt,
        ),
        red: movePlayer(
          {
            ...state.players.red,
            cooldown: Math.max(0, state.players.red.cooldown - dt),
            shield: Math.max(0, state.players.red.shield - dt),
            hitFlash: Math.max(0, state.players.red.hitFlash - dt),
            weaponTimer: Math.max(0, state.players.red.weaponTimer - dt),
            shieldTimer: Math.max(0, state.players.red.shieldTimer - dt),
          },
          redInput,
          dt,
        ),
      };

      // Weapon timer: revert to pistol when expired
      if (state.players.green.weaponTimer <= 0 && state.players.green.weapon !== "pistol") {
        state.players.green.weapon = "pistol";
      }
      if (state.players.red.weaponTimer <= 0 && state.players.red.weapon !== "pistol") {
        state.players.red.weapon = "pistol";
      }

      let nextBullets = stepBullets(state.bullets, dt);

      // Single player: green can fire with F, Space, or tap
      if (state.mode === "single") {
        const green = state.players.green;
        const red = state.players.red;

        // Green fires with F or Space
        if ((state.keys.has(PLAYER_CONFIG.green.keys.fire) || state.keys.has(" ")) && green.cooldown <= 0 && green.alive) {
          nextBullets = nextBullets.concat(fireWeapon(green));
        }

        if (green.alive) {
          red.angle = Math.atan2(green.y - red.y, green.x - red.x);
        }

        if (shouldAiFire(red, green, redCanSeeGreen)) {
          nextBullets = nextBullets.concat(fireWeapon(red));
        }
      } else {
        // Multiplayer
        if (state.keys.has(PLAYER_CONFIG.green.keys.fire)) {
          nextBullets = nextBullets.concat(fireWeapon(state.players.green));
        }
        if (state.keys.has(PLAYER_CONFIG.red.keys.fire)) {
          nextBullets = nextBullets.concat(fireWeapon(state.players.red));
        }
      }

      const resolved = resolveBulletHits(state.players, nextBullets);
      state.players = resolved.players;
      state.bullets = resolved.bullets;

      state.worldTime += dt;

      // Weapon drops: spawn randomly
      if (Math.random() < WEAPON_DROP_CHANCE && state.weaponDrops.length < 3) {
        state.weaponDrops.push(createWeaponDrop());
      }

      // Update weapon drop timers and check pickup
      state.weaponDrops = state.weaponDrops.filter((drop) => {
        drop.timer -= dt;
        drop.glow += dt;
        if (drop.timer <= 0) return false;

        // Check if green player picks up
        const green = state.players.green;
        if (green.alive && Math.hypot(drop.x - green.x, drop.y - green.y) < 24) {
          if (drop.type === "shield") {
            green.shieldTimer = SHIELD_DURATION;
          } else {
            green.weapon = drop.type;
            green.weaponTimer = WEAPON_EFFECT_DURATION;
          }
          return false;
        }

        // Check if red player picks up (in single player, AI can also pick up)
        const red = state.players.red;
        if (red.alive && Math.hypot(drop.x - red.x, drop.y - red.y) < 24 * red.bossScale) {
          if (drop.type === "shield") {
            red.shieldTimer = SHIELD_DURATION;
          } else {
            red.weapon = drop.type;
            red.weaponTimer = WEAPON_EFFECT_DURATION;
          }
          return false;
        }

        return true;
      });

      // Randomly move spikes
      state.spikeMoveTimer += dt;
      if (state.spikeMoveTimer >= SPIKE_MOVE_INTERVAL) {
        state.spikeMoveTimer = 0;
        const openCells = getOpenCells();
        for (const spike of SPIKES) {
          const cell = openCells[Math.floor(Math.random() * openCells.length)];
          spike.currentCol = cell.col;
          spike.currentRow = cell.row;
        }
      }

      state.players = checkSpikeHits(state.players, state.worldTime);

      // Check win/lose conditions
      if (!state.players.red.alive) {
        // Red died - level complete (single player)
        if (state.mode === "single") {
          state.running = false;
          state.winner = "green";
          // Auto advance to next level after 2 seconds
          setTimeout(() => {
            if (state.winner === "green" && !state.players.green.alive === false) {
              startLevel(state.level + 1);
              state.running = true;
              state.winner = null;
            }
          }, 2000);
        } else {
          state.running = false;
          state.winner = "green";
          setStatus("绿三角获胜。");
        }
      }

      if (!state.players.green.alive) {
        state.running = false;
        state.winner = "red";
        setStatus(
          state.mode === "single"
            ? `游戏结束！你闯到了第 ${state.level} 关。`
            : "红三角获胜。"
        );
      }
    }

    render();
    frame = window.requestAnimationFrame(tick);
  };

  // --- Touch / Mouse drag support ---
  const getCanvasCoords = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const onDragStart = (clientX, clientY) => {
    const pos = getCanvasCoords(clientX, clientY);
    const green = state.players.green;
    const dist = Math.hypot(pos.x - green.x, pos.y - green.y);
    if (dist < WORLD.playerRadius + 10) {
      dragging = 'green';
      dragOffset = { x: green.x - pos.x, y: green.y - pos.y };
    }
  };

  const onDragMove = (clientX, clientY) => {
    if (!dragging) return;
    const pos = getCanvasCoords(clientX, clientY);
    const player = state.players[dragging];
    let newX = pos.x + dragOffset.x;
    let newY = pos.y + dragOffset.y;
    newX = clamp(newX, WORLD.playerRadius, WORLD.width - WORLD.playerRadius);
    newY = clamp(newY, WORLD.playerRadius, WORLD.height - WORLD.playerRadius);
    if (!collidesWithMaze(newX, player.y, WORLD.playerRadius)) {
      player.x = newX;
    }
    if (!collidesWithMaze(player.x, newY, WORLD.playerRadius)) {
      player.y = newY;
    }
  };

  const onDragEnd = () => {
    dragging = null;
  };

  // Tap on empty area to fire (single player mode)
  let tapStartTime = 0;
  let tapStartPos = null;

  canvas.addEventListener('mousedown', (e) => { e.preventDefault(); onDragStart(e.clientX, e.clientY); tapStartTime = Date.now(); tapStartPos = getCanvasCoords(e.clientX, e.clientY); });
  canvas.addEventListener('mousemove', (e) => { e.preventDefault(); onDragMove(e.clientX, e.clientY); });
  canvas.addEventListener('mouseup', (e) => {
    e.preventDefault();
    // If it was a quick tap not on the player, fire
    if (dragging === null && tapStartPos && Date.now() - tapStartTime < 250) {
      const pos = getCanvasCoords(e.clientX, e.clientY);
      const green = state.players.green;
      const dist = Math.hypot(pos.x - green.x, pos.y - green.y);
      if (dist > WORLD.playerRadius + 15 && state.mode === 'single' && green.alive && green.cooldown <= 0) {
        // Aim toward tap position and fire
        green.angle = Math.atan2(pos.y - green.y, pos.x - green.x);
        state.bullets = state.bullets.concat(fireWeapon(green));
      }
    }
    onDragEnd();
  });
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); const t = e.touches[0]; onDragStart(t.clientX, t.clientY); tapStartTime = Date.now(); tapStartPos = getCanvasCoords(t.clientX, t.clientY); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); const t = e.touches[0]; onDragMove(t.clientX, t.clientY); }, { passive: false });
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (dragging === null && tapStartPos && Date.now() - tapStartTime < 250) {
      const green = state.players.green;
      if (state.mode === 'single' && green.alive && green.cooldown <= 0) {
        green.angle = Math.atan2(tapStartPos.y - green.y, tapStartPos.x - green.x);
        state.bullets = state.bullets.concat(fireWeapon(green));
      }
    }
    onDragEnd();
  }, { passive: false });

  window.addEventListener("keydown", (event) => onKeyChange(event, true));
  window.addEventListener("keyup", (event) => onKeyChange(event, false));
  startButton.addEventListener("click", restart);

  reset();
  frame = window.requestAnimationFrame(tick);

  return {
    destroy() {
      window.cancelAnimationFrame(frame);
      reset();
    },
  };
}

if (typeof document !== "undefined") {
  createRuntime();
}
