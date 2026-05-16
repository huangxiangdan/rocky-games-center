import test from "node:test";
import assert from "node:assert/strict";

import {
  applyTrapDamage,
  createCannonsForLevel,
  createCatSet,
  getCatSpeed,
  WORLD,
  LEVELS,
  clamp,
  clampPoint,
  createTrapSet,
  findCaughtCatIndex,
  getLevelConfig,
  isCaught,
  isLevelComplete,
  isProjectileHit,
  isTrapHit,
  moveToward,
  normalizeVector,
  spawnProjectileFromCannon,
  spawnCat,
  stepProjectile,
  stepCat,
} from "./game.js";

test("clamp 把数值约束在范围内", () => {
  assert.equal(clamp(-3, 0, 5), 0);
  assert.equal(clamp(3, 0, 5), 3);
  assert.equal(clamp(8, 0, 5), 5);
});

test("normalizeVector 对零向量返回原点", () => {
  assert.deepEqual(normalizeVector(0, 0), { x: 0, y: 0 });
});

test("moveToward 不会越过目标点", () => {
  const next = moveToward({ x: 0, y: 0 }, { x: 10, y: 0 }, 100, 1);
  assert.deepEqual(next, { x: 10, y: 0 });
});

test("stepCat 会远离老鼠移动", () => {
  const cat = { x: 300, y: 240 };
  const mouse = { x: 200, y: 240 };
  const next = stepCat(cat, mouse, WORLD, WORLD.catBaseSpeed, 0.1);
  assert.ok(next.x > cat.x);
});

test("stepCat 会避开挤在一起的其他猫", () => {
  const cat = { x: 300, y: 240 };
  const mouse = { x: 200, y: 240 };
  const otherCats = [
    { x: 312, y: 240 },
    { x: 316, y: 244 },
  ];

  const next = stepCat(cat, mouse, WORLD, WORLD.catBaseSpeed, 0.1, otherCats);
  assert.ok(next.y !== cat.y);
});

test("stepCat 在贴近边缘时会往场内修正", () => {
  const cat = { x: WORLD.width - 30, y: 120 };
  const mouse = { x: WORLD.width - 120, y: 120 };

  const next = stepCat(cat, mouse, WORLD, WORLD.catBaseSpeed, 0.1);
  assert.ok(next.x < cat.x);
});

test("clampPoint 会把点保持在场地内部", () => {
  const point = clampPoint({ x: -20, y: 999 }, WORLD, WORLD.mouseRadius);
  assert.equal(point.x, WORLD.mouseRadius);
  assert.equal(point.y, WORLD.height - WORLD.mouseRadius);
});

test("isCaught 只在足够接近时命中", () => {
  assert.equal(isCaught({ x: 0, y: 0 }, { x: 20, y: 20 }, 30), true);
  assert.equal(isCaught({ x: 0, y: 0 }, { x: 40, y: 40 }, 30), false);
});

test("spawnCat 会尽量避开老鼠初始位置", () => {
  const samples = [0.1, 0.1, 0.9, 0.9];
  let index = 0;
  const random = () => {
    const value = samples[index] ?? 0.8;
    index += 1;
    return value;
  };

  const mouse = { x: 100, y: 100 };
  const cat = spawnCat(WORLD, mouse, WORLD.catRadius, random);
  const gap = Math.hypot(cat.x - mouse.x, cat.y - mouse.y);
  assert.ok(gap >= 160);
});

test("createCatSet 会生成指定数量的猫", () => {
  const mouse = { x: 100, y: 100 };
  const cats = createCatSet(WORLD, mouse, 3, WORLD.catRadius, () => 0.8);

  assert.equal(cats.length, 3);
});

test("getLevelConfig 超出范围时返回最后一关", () => {
  assert.deepEqual(getLevelConfig(LEVELS.length + 3), LEVELS.at(-1));
});

test("isLevelComplete 在达到目标时返回 true", () => {
  assert.equal(isLevelComplete(LEVELS[0].goal, LEVELS[0]), true);
  assert.equal(isLevelComplete(LEVELS[0].goal - 1, LEVELS[0]), false);
});

test("每一关都有固定数量的大炮", () => {
  assert.ok(LEVELS.length >= 8);
  assert.equal(typeof LEVELS[0].cannonCount, "number");
  assert.ok(LEVELS[0].cannonCount > 0);
});

test("最后一关是 Boss 关", () => {
  assert.equal(LEVELS.at(-1).boss, true);
  assert.equal(LEVELS.at(-1).catCount, 1);
});

test("createCannonsForLevel 会生成关卡需要数量的大炮", () => {
  const cannons = createCannonsForLevel({ cannonCount: 4 }, WORLD);
  assert.equal(cannons.length, 4);
});

test("spawnProjectileFromCannon 会朝老鼠方向发射", () => {
  const cannon = { x: 0, y: 0 };
  const mouse = { x: 100, y: 0 };
  const projectile = spawnProjectileFromCannon(cannon, mouse, 300, 0);

  assert.ok(projectile.vx > 0);
  assert.equal(projectile.vy, 0);
});

test("stepProjectile 会按速度推进炮弹", () => {
  const next = stepProjectile({ x: 10, y: 20, vx: 30, vy: -10 }, 0.5);
  assert.deepEqual(next, { x: 25, y: 15, vx: 30, vy: -10 });
});

test("isProjectileHit 只在炮弹接近老鼠时命中", () => {
  assert.equal(isProjectileHit({ x: 100, y: 100 }, { x: 118, y: 110 }, 24), true);
  assert.equal(isProjectileHit({ x: 100, y: 100 }, { x: 180, y: 180 }, 24), false);
});

test("Boss 在贴近老鼠时会进入短冲刺", () => {
  const boss = { x: 300, y: 240, boss: true };
  const mouse = { x: 340, y: 240 };
  const nearSpeed = getCatSpeed(boss, 200, mouse, 12);
  const farSpeed = getCatSpeed(boss, 200, { x: 80, y: 80 }, 12);

  assert.ok(nearSpeed > farSpeed);
});

test("Boss 会通过假动作切换横向闪避方向", () => {
  const boss = { x: 300, y: 240, boss: true };
  const mouse = { x: 220, y: 240 };

  const early = stepCat(boss, mouse, WORLD, 220, 0.1, [], 0);
  const late = stepCat(boss, mouse, WORLD, 220, 0.1, [], 500);

  assert.notEqual(Math.sign(early.y - boss.y), Math.sign(late.y - boss.y));
});

test("findCaughtCatIndex 会找到被抓到的那只猫", () => {
  const mouse = { x: 100, y: 100 };
  const cats = [
    { x: 250, y: 250 },
    { x: 122, y: 116 },
    { x: 360, y: 200 },
  ];

  assert.equal(findCaughtCatIndex(mouse, cats, 30), 1);
});

test("findCaughtCatIndex 在没有命中时返回 -1", () => {
  const mouse = { x: 100, y: 100 };
  const cats = [
    { x: 250, y: 250 },
    { x: 180, y: 180 },
  ];

  assert.equal(findCaughtCatIndex(mouse, cats, 30), -1);
});

test("isTrapHit 只在老鼠接近夹子时触发", () => {
  assert.equal(isTrapHit({ x: 100, y: 100 }, { x: 112, y: 108 }, 20), true);
  assert.equal(isTrapHit({ x: 100, y: 100 }, { x: 160, y: 160 }, 20), false);
});

test("createTrapSet 会生成指定数量且避开老鼠的夹子", () => {
  const mouse = { x: 120, y: 120 };
  const traps = createTrapSet(WORLD, mouse, 4, WORLD.trapRadius, () => 0.85);

  assert.equal(traps.length, 4);

  for (const trap of traps) {
    const gap = Math.hypot(trap.x - mouse.x, trap.y - mouse.y);
    assert.ok(gap >= 120);
  }
});

test("applyTrapDamage 会扣除指定血量", () => {
  assert.equal(applyTrapDamage(3, 1), 2);
});

test("applyTrapDamage 不会把血量扣成负数", () => {
  assert.equal(applyTrapDamage(1, 3), 0);
});
