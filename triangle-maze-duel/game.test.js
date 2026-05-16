import test from "node:test";
import assert from "node:assert/strict";

import {
  WORLD,
  applyBulletHit,
  bulletHitsPlayer,
  clamp,
  collidesWithMaze,
  createBullet,
  createPlayer,
  getAiInputVector,
  getInputVector,
  hasLineOfSight,
  movePlayer,
  normalizeVector,
  resolveBulletHits,
  shouldAiFire,
  stepBullet,
  stepBullets,
} from "./game.js";

test("clamp 会把值限制到范围内", () => {
  assert.equal(clamp(-2, 0, 4), 0);
  assert.equal(clamp(3, 0, 4), 3);
  assert.equal(clamp(8, 0, 4), 4);
});

test("normalizeVector 会返回单位向量", () => {
  assert.deepEqual(normalizeVector(0, 0), { x: 0, y: 0 });
  const vector = normalizeVector(3, 4);
  assert.equal(vector.x, 0.6);
  assert.equal(vector.y, 0.8);
});

test("collidesWithMaze 能识别墙体碰撞", () => {
  assert.equal(collidesWithMaze(24, 24, 12), true);
  assert.equal(collidesWithMaze(84, 84, 12), false);
});

test("getInputVector 会把按键映射成方向", () => {
  const keys = new Set(["w", "d"]);
  const vector = getInputVector(keys, {
    up: "w",
    down: "s",
    left: "a",
    right: "d",
  });

  assert.ok(vector.x > 0);
  assert.ok(vector.y < 0);
});

test("movePlayer 遇墙时不会穿过去", () => {
  const player = createPlayer("green");
  const moved = movePlayer(player, { x: -1, y: 0 }, 0.5);
  assert.equal(moved.x, player.x);
});

test("createBullet 会沿玩家朝向生成子弹", () => {
  const bullet = createBullet({ id: "green", x: 100, y: 100, angle: 0 });
  assert.ok(bullet.x > 100);
  assert.equal(bullet.y, 100);
});

test("stepBullet 会推进子弹", () => {
  const bullet = stepBullet({ x: 10, y: 20, vx: 30, vy: -10 }, 0.5);
  assert.deepEqual(bullet, { x: 25, y: 15, vx: 30, vy: -10 });
});

test("stepBullets 会移除撞墙子弹", () => {
  const bullets = stepBullets([{ x: 50, y: 50, vx: -200, vy: 0 }], 0.5);
  assert.equal(bullets.length, 0);
});

test("bulletHitsPlayer 只在真正命中时生效", () => {
  const player = { ...createPlayer("red"), shield: 0, alive: true };
  const hit = bulletHitsPlayer({ owner: "green", x: player.x, y: player.y }, player);
  const miss = bulletHitsPlayer({ owner: "green", x: player.x + 90, y: player.y }, player);

  assert.equal(hit, true);
  assert.equal(miss, false);
});

test("applyBulletHit 会扣血并回出生点", () => {
  const player = { ...createPlayer("green"), shield: 0, health: 3, x: 300, y: 280 };
  const next = applyBulletHit(player);

  assert.equal(next.health, 2);
  assert.equal(next.x, 84);
  assert.equal(next.y, 84);
});

test("resolveBulletHits 会消费命中的子弹", () => {
  const green = { ...createPlayer("green"), shield: 0 };
  const red = { ...createPlayer("red"), shield: 0 };
  const bullets = [{ owner: "green", x: red.x, y: red.y, vx: 0, vy: 0 }];

  const resolved = resolveBulletHits({ green, red }, bullets);
  assert.equal(resolved.bullets.length, 0);
  assert.equal(resolved.players.red.health, 2);
});

test("hasLineOfSight 能识别通路和墙阻挡", () => {
  assert.equal(hasLineOfSight({ x: 84, y: 84 }, { x: 300, y: 84 }), false);
  assert.equal(hasLineOfSight({ x: 84, y: 84 }, { x: 84, y: 180 }), true);
});

test("getAiInputVector 在看见目标且太远时会靠近", () => {
  const vector = getAiInputVector(
    { x: 300, y: 300 },
    { x: 560, y: 300 },
    0,
    true,
  );
  assert.ok(vector.x > 0);
});

test("shouldAiFire 只在有视线且冷却结束时触发", () => {
  const ai = { ...createPlayer("red"), cooldown: 0, alive: true };
  const target = { ...createPlayer("green"), alive: true, shield: 0 };

  assert.equal(shouldAiFire(ai, target, true), true);
  assert.equal(shouldAiFire({ ...ai, cooldown: 0.2 }, target, true), false);
  assert.equal(shouldAiFire(ai, target, false), false);
});
