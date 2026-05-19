export const WORLD = {
  width: 720,
  height: 480,
  mouseRadius: 22,
  catRadius: 22,
  trapRadius: 18,
  cannonRadius: 26,
  projectileRadius: 12,
  catchDistance: 44,
  trapHitDistance: 30,
  projectileHitDistance: 26,
  mouseSpeed: 280,
  catBaseSpeed: 160,
  projectileSpeed: 290,
  catCount: 6,
  trapCount: 5,
  maxHealth: 7,
  trapDamage: 1,
  cannonDamage: 1,
};

const CAT_WALL_PADDING = 72;
const CAT_SEPARATION_RADIUS = 64;
const CAT_DODGE_DISTANCE = 150;
const BOSS_FAKEOUT_INTERVAL_MS = 420;
const CAT_SCARED_ENTER_DISTANCE = 110;
const CAT_SCARED_EXIT_DISTANCE = 140;

export const LEVELS = [
  { goal: 3, catCount: 4, trapCount: 2, cannonCount: 2, catSpeedBonus: 0, name: "热身" },
  { goal: 4, catCount: 5, trapCount: 2, cannonCount: 2, catSpeedBonus: 20, name: "穿巷" },
  { goal: 4, catCount: 5, trapCount: 3, cannonCount: 3, catSpeedBonus: 35, name: "夜奔" },
  { goal: 5, catCount: 6, trapCount: 3, cannonCount: 3, catSpeedBonus: 55, name: "围追" },
  { goal: 5, catCount: 6, trapCount: 4, cannonCount: 4, catSpeedBonus: 75, name: "急转" },
  { goal: 6, catCount: 7, trapCount: 4, cannonCount: 4, catSpeedBonus: 95, name: "乱流" },
  { goal: 6, catCount: 7, trapCount: 5, cannonCount: 5, catSpeedBonus: 115, name: "追猎" },
  {
    goal: 3,
    catCount: 1,
    trapCount: 6,
    cannonCount: 6,
    catSpeedBonus: 170,
    name: "Boss：夜王",
    boss: true,
  },
];

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalizeVector(dx, dy) {
  const length = Math.hypot(dx, dy);

  if (length === 0) {
    return { x: 0, y: 0 };
  }

  return { x: dx / length, y: dy / length };
}

export function moveToward(current, target, speed, dt) {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const gap = Math.hypot(dx, dy);

  if (gap === 0) {
    return { x: current.x, y: current.y };
  }

  const step = Math.min(gap, speed * dt);
  const vector = normalizeVector(dx, dy);

  return {
    x: current.x + vector.x * step,
    y: current.y + vector.y * step,
  };
}

export function clampPoint(point, bounds, radius) {
  return {
    x: clamp(point.x, radius, bounds.width - radius),
    y: clamp(point.y, radius, bounds.height - radius),
  };
}

export function getCatSpeed(cat, baseSpeed, mouse, levelProgress = 0) {
  if (!cat.boss) {
    return baseSpeed;
  }

  let nextSpeed = baseSpeed * 1.1;

  if (distance(cat, mouse) < 190) {
    nextSpeed *= 1.18;
  }

  if (levelProgress >= 0.5) {
    nextSpeed *= 1.12;
  }

  return nextSpeed;
}

export function stepCat(cat, mouse, bounds, speed, dt, otherCats = [], fakeoutClock = 0) {
  const flee = normalizeVector(cat.x - mouse.x, cat.y - mouse.y);
  let dx = flee.x;
  let dy = flee.y;

  if (cat.x < CAT_WALL_PADDING) {
    dx += 1.1;
  }
  if (cat.x > bounds.width - CAT_WALL_PADDING) {
    dx -= 1.1;
  }
  if (cat.y < CAT_WALL_PADDING) {
    dy += 1.1;
  }
  if (cat.y > bounds.height - CAT_WALL_PADDING) {
    dy -= 1.1;
  }

  if (distance(cat, mouse) < CAT_DODGE_DISTANCE) {
    const lateral = { x: -flee.y, y: flee.x };
    let dodgeDirection = cat.x + cat.y > bounds.width / 2 + bounds.height / 2 ? 1 : -1;
    let lateralWeight = 0.75;

    if (cat.boss) {
      dodgeDirection = Math.floor(fakeoutClock / BOSS_FAKEOUT_INTERVAL_MS) % 2 === 0 ? 1 : -1;
      lateralWeight = 1.35;
    }

    dx += lateral.x * lateralWeight * dodgeDirection;
    dy += lateral.y * lateralWeight * dodgeDirection;
  }

  for (const otherCat of otherCats) {
    const gap = distance(cat, otherCat);

    if (gap === 0 || gap > CAT_SEPARATION_RADIUS) {
      continue;
    }

    const push = normalizeVector(cat.x - otherCat.x, cat.y - otherCat.y);
    const weight = (CAT_SEPARATION_RADIUS - gap) / CAT_SEPARATION_RADIUS;
    dx += push.x * weight * 1.2;
    dy += push.y * weight * 1.2;
  }

  const vector = normalizeVector(dx, dy);

  return clampPoint(
    {
      x: cat.x + vector.x * speed * dt,
      y: cat.y + vector.y * speed * dt,
    },
    bounds,
    WORLD.catRadius,
  );
}

export function isCaught(mouse, cat, catchDistance = WORLD.catchDistance) {
  return distance(mouse, cat) <= catchDistance;
}

export function findCaughtCatIndex(mouse, cats, catchDistance = WORLD.catchDistance) {
  return cats.findIndex((cat) => isCaught(mouse, cat, catchDistance));
}

export function isTrapHit(mouse, trap, trapHitDistance = WORLD.trapHitDistance) {
  return distance(mouse, trap) <= trapHitDistance;
}

export function isProjectileHit(
  mouse,
  projectile,
  projectileHitDistance = WORLD.projectileHitDistance,
) {
  return distance(mouse, projectile) <= projectileHitDistance;
}

export function applyTrapDamage(health, damage = WORLD.trapDamage) {
  return Math.max(0, health - damage);
}

export function createCatSet(bounds, mouse, count, radius, random = Math.random) {
  return Array.from({ length: count }, () => spawnCat(bounds, mouse, radius, random));
}

export function createCannonsForLevel(levelConfig, bounds) {
  const anchors = [
    { x: 40, y: 40 },
    { x: bounds.width - 40, y: 40 },
    { x: bounds.width - 40, y: bounds.height - 40 },
    { x: 40, y: bounds.height - 40 },
    { x: bounds.width / 2, y: 40 },
    { x: bounds.width / 2, y: bounds.height - 40 },
  ];

  return anchors.slice(0, levelConfig.cannonCount);
}

export function spawnProjectileFromCannon(cannon, mouse, speed, createdAt) {
  const vector = normalizeVector(mouse.x - cannon.x, mouse.y - cannon.y);

  return {
    x: cannon.x,
    y: cannon.y,
    vx: vector.x * speed,
    vy: vector.y * speed,
    createdAt,
  };
}

export function stepProjectile(projectile, dt) {
  return {
    ...projectile,
    x: projectile.x + projectile.vx * dt,
    y: projectile.y + projectile.vy * dt,
  };
}

export function createCatsForLevel(levelConfig, bounds, mouse, radius, random = Math.random) {
  const cats = createCatSet(bounds, mouse, levelConfig.catCount, radius, random);

  if (!levelConfig.boss) {
    return cats;
  }

  return cats.map((cat) => ({ ...cat, boss: true }));
}

export function getLevelConfig(level) {
  const index = clamp(level - 1, 0, LEVELS.length - 1);
  return LEVELS[index];
}

export function isLevelComplete(score, levelConfig) {
  return score >= levelConfig.goal;
}

export function spawnCat(bounds, mouse, radius, random = Math.random) {
  let fallback = {
    x: bounds.width - radius - 24,
    y: radius + 24,
  };

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const point = {
      x: radius + random() * (bounds.width - radius * 2),
      y: radius + random() * (bounds.height - radius * 2),
    };

    fallback = point;

    if (distance(point, mouse) >= 160) {
      return point;
    }
  }

  return fallback;
}

export function spawnTrap(bounds, mouse, radius, random = Math.random) {
  let fallback = {
    x: bounds.width / 2,
    y: bounds.height / 2,
  };

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const point = {
      x: radius + random() * (bounds.width - radius * 2),
      y: radius + random() * (bounds.height - radius * 2),
    };

    fallback = point;

    if (distance(point, mouse) >= 120) {
      return point;
    }
  }

  return fallback;
}

export function createTrapSet(bounds, mouse, count, radius, random = Math.random) {
  return Array.from({ length: count }, () => spawnTrap(bounds, mouse, radius, random));
}

function createInitialState() {
  const level = 1;
  const levelConfig = getLevelConfig(level);

  return {
    running: false,
    level,
    score: 0,
    levelScore: 0,
    health: WORLD.maxHealth,
    mouse: { x: 180, y: 240 },
    cats: createCatsForLevel(levelConfig, WORLD, { x: 180, y: 240 }, WORLD.catRadius),
    traps: createTrapSet(WORLD, { x: 180, y: 240 }, levelConfig.trapCount, WORLD.trapRadius),
    cannons: createCannonsForLevel(levelConfig, WORLD),
    projectiles: [],
    pointerTarget: null,
    keys: new Set(),
  };
}

function createRuntime() {
  const board = document.querySelector("#board");
  const mouseNode = document.querySelector("#mouse");
  const pointerNode = document.querySelector("#pointer");
  const levelNode = document.querySelector("#level");
  const scoreNode = document.querySelector("#score");
  const levelScoreNode = document.querySelector("#levelScore");
  const healthNode = document.querySelector("#health");
  const cannonNode = document.querySelector("#cannons");
  const goalNode = document.querySelector("#goal");
  const meterBarNode = document.querySelector("#meterBar");
  const statusNode = document.querySelector("#status");
  const startButton = document.querySelector("#startButton");
  const startButtonMobile = document.querySelector("#startButtonMobile");

  if (
    !board ||
    !mouseNode ||
    !pointerNode ||
    !levelNode ||
    !scoreNode ||
    !levelScoreNode ||
    !healthNode ||
    !cannonNode ||
    !goalNode ||
    !meterBarNode ||
    !statusNode ||
    !startButton ||
    !startButtonMobile
  ) {
    return null;
  }

  const state = createInitialState();
  const catNodes = [];
  const trapNodes = [];
  const cannonNodes = [];
  const projectileNodes = [];
  let frame = 0;
  let lastTime = 0;
  let activePointerId = null;

  const setStatus = (text) => {
    statusNode.textContent = text;
  };

  const setStartButtonText = (text) => {
    startButton.textContent = text;
    startButtonMobile.textContent = text;
  };

  const syncActorNodes = (nodes, count, className, emoji) => {
    while (nodes.length < count) {
      nodes.push(createActorNode(className, emoji));
    }

    while (nodes.length > count) {
      const node = nodes.pop();
      node?.remove();
    }
  };

  const refreshActorsForLevel = () => {
    const levelConfig = getLevelConfig(state.level);
    syncActorNodes(catNodes, levelConfig.catCount, "cat", "🐱");
    syncActorNodes(trapNodes, levelConfig.trapCount, "trap", "🪤");
    syncActorNodes(cannonNodes, levelConfig.cannonCount, "cannon", "🔫");
  };

  const renderActor = (node, actor) => {
    node.style.left = `${(actor.x / WORLD.width) * 100}%`;
    node.style.top = `${(actor.y / WORLD.height) * 100}%`;
  };

  const createActorNode = (className, emoji) => {
    const node = document.createElement("div");
    node.className = `actor ${className}`;
    node.setAttribute("aria-hidden", "true");
    node.textContent = emoji;
    board.append(node);
    return node;
  };

  const syncProjectileNodes = () => {
    while (projectileNodes.length < state.projectiles.length) {
      projectileNodes.push(createActorNode("projectile", "💥"));
    }

    while (projectileNodes.length > state.projectiles.length) {
      const node = projectileNodes.pop();
      node?.remove();
    }
  };

  refreshActorsForLevel();

  const renderPointer = () => {
    if (!state.pointerTarget) {
      pointerNode.classList.remove("visible");
      return;
    }

    pointerNode.classList.add("visible");
    pointerNode.style.left = `${(state.pointerTarget.x / WORLD.width) * 100}%`;
    pointerNode.style.top = `${(state.pointerTarget.y / WORLD.height) * 100}%`;
  };

  const render = () => {
    const levelConfig = getLevelConfig(state.level);

    refreshActorsForLevel();
    renderActor(mouseNode, state.mouse);
    state.cats.forEach((cat, index) => {
      const node = catNodes[index];
      node.classList.toggle("boss", cat.boss === true);
      node.classList.toggle("cat", cat.boss !== true);
      node.textContent = cat.boss ? "😾" : "🐱";
      renderActor(node, cat);
    });
    state.traps.forEach((trap, index) => {
      renderActor(trapNodes[index], trap);
    });
    state.cannons.forEach((cannon, index) => {
      renderActor(cannonNodes[index], cannon);
    });
    syncProjectileNodes();
    state.projectiles.forEach((projectile, index) => {
      renderActor(projectileNodes[index], projectile);
    });
    renderPointer();
    levelNode.textContent = `${state.level}`;
    scoreNode.textContent = `${state.score}`;
    levelScoreNode.textContent = `${state.levelScore}`;
    healthNode.textContent = `${state.health}`;
    cannonNode.textContent = `${state.cannons.length}`;
    goalNode.textContent = `${levelConfig.goal}`;
    meterBarNode.style.transform = `scaleX(${state.levelScore / levelConfig.goal})`;

    state.cats.forEach((cat, index) => {
      const gap = distance(state.mouse, cat);
      const node = catNodes[index];
      const wasThreatened = node.classList.contains("scared");
      const threatened = wasThreatened
        ? gap < CAT_SCARED_EXIT_DISTANCE
        : gap < CAT_SCARED_ENTER_DISTANCE;
      node.classList.toggle("scared", threatened);
    });
  };

  const reset = () => {
    const next = createInitialState();
    state.running = next.running;
    state.level = next.level;
    state.score = next.score;
    state.levelScore = next.levelScore;
    state.health = next.health;
    state.mouse = next.mouse;
    state.cats = next.cats;
    state.traps = next.traps;
    state.cannons = next.cannons;
    state.projectiles = next.projectiles;
    state.pointerTarget = next.pointerTarget;
    state.keys = next.keys;
    setStartButtonText("开始游戏");
    setStatus("点击开始游戏，拿下第 1 关。先抓满目标数量，再带着剩余血量冲进下一关。");
    render();
  };

  const screenToWorld = (event) => {
    const rect = board.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * WORLD.width;
    const y = ((event.clientY - rect.top) / rect.height) * WORLD.height;

    return clampPoint({ x, y }, WORLD, WORLD.mouseRadius);
  };

  const restart = () => {
    const level = 1;
    const levelConfig = getLevelConfig(level);

    state.running = true;
    state.level = level;
    state.score = 0;
    state.levelScore = 0;
    state.health = WORLD.maxHealth;
    state.mouse = { x: 180, y: 240 };
    state.cats = createCatsForLevel(levelConfig, WORLD, state.mouse, WORLD.catRadius);
    state.traps = createTrapSet(WORLD, state.mouse, levelConfig.trapCount, WORLD.trapRadius);
    state.cannons = createCannonsForLevel(levelConfig, WORLD);
    state.projectiles = [];
    state.pointerTarget = null;
    state.keys.clear();
    setStartButtonText("重新开始");
    setStatus(`第 ${state.level} 关开始。小心大炮火力，先抓到 ${levelConfig.goal} 只猫。`);
    render();
  };

  const onKeyChange = (event, pressed) => {
    const key = event.key.toLowerCase();
    const allowed = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"];

    if (!allowed.includes(key)) {
      return;
    }

    event.preventDefault();

    if (pressed) {
      state.keys.add(key);
      state.pointerTarget = null;
    } else {
      state.keys.delete(key);
    }
  };

  const moveMouse = (dt) => {
    let dx = 0;
    let dy = 0;

    if (state.keys.has("arrowup") || state.keys.has("w")) {
      dy -= 1;
    }
    if (state.keys.has("arrowdown") || state.keys.has("s")) {
      dy += 1;
    }
    if (state.keys.has("arrowleft") || state.keys.has("a")) {
      dx -= 1;
    }
    if (state.keys.has("arrowright") || state.keys.has("d")) {
      dx += 1;
    }

    if (dx !== 0 || dy !== 0) {
      const vector = normalizeVector(dx, dy);
      state.mouse = clampPoint(
        {
          x: state.mouse.x + vector.x * WORLD.mouseSpeed * dt,
          y: state.mouse.y + vector.y * WORLD.mouseSpeed * dt,
        },
        WORLD,
        WORLD.mouseRadius,
      );
      return;
    }

    if (state.pointerTarget) {
      const next = moveToward(state.mouse, state.pointerTarget, WORLD.mouseSpeed, dt);
      state.mouse = clampPoint(next, WORLD, WORLD.mouseRadius);

      if (distance(state.mouse, state.pointerTarget) < 8) {
        state.pointerTarget = null;
      }
    }
  };

  const tick = (timestamp) => {
    if (!lastTime) {
      lastTime = timestamp;
    }

    const previousTime = lastTime;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.032);
    lastTime = timestamp;

    if (state.running) {
      const levelConfig = getLevelConfig(state.level);
      moveMouse(dt);
      const levelProgress = levelConfig.goal === 0 ? 0 : state.levelScore / levelConfig.goal;

      state.cats = state.cats.map((cat, index) => {
        const otherCats = state.cats.filter((_, otherIndex) => otherIndex !== index);
        const baseSpeed = WORLD.catBaseSpeed + state.score * 14 + levelConfig.catSpeedBonus;
        const catSpeed = getCatSpeed(cat, baseSpeed, state.mouse, levelProgress);
        return stepCat(cat, state.mouse, WORLD, catSpeed, dt, otherCats, timestamp);
      });

      if (Math.floor(previousTime / 1500) !== Math.floor(timestamp / 1500)) {
        state.projectiles = state.projectiles.concat(
          state.cannons.map((cannon) =>
            spawnProjectileFromCannon(cannon, state.mouse, WORLD.projectileSpeed, timestamp),
          ),
        );
      }

      state.projectiles = state.projectiles
        .map((projectile) => stepProjectile(projectile, dt))
        .filter(
          (projectile) =>
            projectile.x >= -40 &&
            projectile.x <= WORLD.width + 40 &&
            projectile.y >= -40 &&
            projectile.y <= WORLD.height + 40,
        );

      const caughtIndex = findCaughtCatIndex(state.mouse, state.cats);
      const trapIndex = state.traps.findIndex((trap) => isTrapHit(state.mouse, trap));
      const projectileIndex = state.projectiles.findIndex((projectile) =>
        isProjectileHit(state.mouse, projectile),
      );

      if (caughtIndex >= 0) {
        state.score += 1;
        state.levelScore += 1;
        state.cats = state.cats.map((cat, index) =>
          index === caughtIndex
            ? {
                ...spawnCat(WORLD, state.mouse, WORLD.catRadius),
                boss: levelConfig.boss === true,
              }
            : cat,
        );
        if (isLevelComplete(state.levelScore, levelConfig)) {
          if (state.level < LEVELS.length) {
            state.level += 1;
            const nextLevel = getLevelConfig(state.level);
            state.levelScore = 0;
            state.cats = createCatsForLevel(nextLevel, WORLD, state.mouse, WORLD.catRadius);
            state.traps = createTrapSet(WORLD, state.mouse, nextLevel.trapCount, WORLD.trapRadius);
            state.cannons = createCannonsForLevel(nextLevel, WORLD);
            state.projectiles = [];
            setStatus(
              nextLevel.boss
                ? `最终 Boss 战开始：${nextLevel.name}。它会边闪躲边让炮台集火你，抓住它 ${nextLevel.goal} 次。`
                : `进入第 ${state.level} 关 ${nextLevel.name}。炮台变多了，目标是 ${nextLevel.goal} 只猫。`,
            );
          } else {
            state.running = false;
            setStatus(`Boss 被拿下。全部通关，你抓到了 ${state.score} 只猫，还剩 ${state.health} 点血量。`);
          }
        } else {
          setStatus(
            levelConfig.boss
              ? `Boss 已被抓到 ${state.levelScore} / ${levelConfig.goal} 次，总计 ${state.score} 分。`
              : `本关已抓到 ${state.levelScore} / ${levelConfig.goal} 只猫，总计 ${state.score} 分。`,
          );
        }
      } else if (trapIndex >= 0) {
        state.health = applyTrapDamage(state.health);
        state.traps = state.traps.map((trap, index) =>
          index === trapIndex ? spawnTrap(WORLD, state.mouse, WORLD.trapRadius) : trap,
        );
        setStatus(`踩到老鼠夹，失去 ${WORLD.trapDamage} 点血量。`);

        if (state.health === 0) {
          state.running = false;
          setStatus(`血量耗尽。你一共抓到了 ${state.score} 只猫。`);
        }
      } else if (projectileIndex >= 0) {
        state.health = applyTrapDamage(state.health, WORLD.cannonDamage);
        state.projectiles = state.projectiles.filter((_, index) => index !== projectileIndex);
        setStatus(`被大炮命中，失去 ${WORLD.cannonDamage} 点血量。`);

        if (state.health === 0) {
          state.running = false;
          setStatus(`被炮火击倒。你一共抓到了 ${state.score} 只猫。`);
        }
      }
    }

    render();
    frame = window.requestAnimationFrame(tick);
  };

  board.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") {
      return;
    }
    activePointerId = event.pointerId;
    board.setPointerCapture(event.pointerId);
    state.pointerTarget = screenToWorld(event);
  });

  board.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") {
      return;
    }
    if (activePointerId !== event.pointerId) {
      return;
    }
    state.pointerTarget = screenToWorld(event);
  });

  board.addEventListener("pointerup", (event) => {
    if (event.pointerType === "touch") {
      return;
    }
    activePointerId = null;
  });

  board.addEventListener("pointercancel", (event) => {
    if (event.pointerType === "touch") {
      return;
    }
    activePointerId = null;
  });

  board.addEventListener("touchstart", (event) => {
    event.preventDefault();
    const touch = event.changedTouches[0];
    state.pointerTarget = screenToWorld({ clientX: touch.clientX, clientY: touch.clientY });
  }, { passive: false });

  board.addEventListener("touchmove", (event) => {
    event.preventDefault();
    const touch = event.changedTouches[0];
    state.pointerTarget = screenToWorld({ clientX: touch.clientX, clientY: touch.clientY });
  }, { passive: false });

  board.addEventListener("touchend", (event) => {
    event.preventDefault();
  }, { passive: false });

  window.addEventListener("keydown", (event) => onKeyChange(event, true));
  window.addEventListener("keyup", (event) => onKeyChange(event, false));
  startButton.addEventListener("click", restart);
  startButtonMobile.addEventListener("click", restart);

  render();
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
