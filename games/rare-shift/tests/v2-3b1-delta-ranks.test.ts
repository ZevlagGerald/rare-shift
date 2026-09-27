import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDeltaEchoProfile,
  buildDeltaProfile,
  canScheduleDeltaEcho,
  DELTA_ECHO_DAMAGE,
  DELTA_ECHO_DELAY_MS,
  DELTA_ECHO_REARM_MS,
  deltaDamageForRank,
  deltaEchoHitsTarget,
  deltaHitsTarget,
  deltaStaggerDurationForRole,
  deltaWorldScaleForRank,
  isDeltaEchoTargetEligible,
  migrateDeltaCooldownAccumulator,
} from "../src/phase-combat-core.ts";
import type { FrameRows } from "../src/types.ts";

function rows(active: readonly [number, number][]): FrameRows {
  const grid = Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => "."));
  for (const [x, y] of active) grid[y][x] = "#";
  return Object.freeze(grid.map(row => row.join("")));
}

const FRAME_A = rows([[1, 1], [3, 3], [7, 7]]);
const FRAME_B = rows([[7, 7], [12, 12]]);

test("DELTA Rank I-V profiles match the approved behavior-first table", () => {
  const expected = [
    { rank: 1, damage: 12, cooldownMs: 860, worldScale: 8, hitRadius: 18, staggerMs: 0 },
    { rank: 2, damage: 12, cooldownMs: 720, worldScale: 8, hitRadius: 18, staggerMs: 0 },
    { rank: 3, damage: 12, cooldownMs: 720, worldScale: 9.5, hitRadius: 18, staggerMs: 0 },
    { rank: 4, damage: 12, cooldownMs: 720, worldScale: 9.5, hitRadius: 18, staggerMs: 0 },
    { rank: 5, damage: 14, cooldownMs: 720, worldScale: 9.5, hitRadius: 18, staggerMs: 90 },
  ];
  for (const item of expected) {
    const profile = buildDeltaProfile(FRAME_A, FRAME_B, "A", item.rank);
    assert.equal(profile.rank, item.rank);
    assert.equal(profile.damage, item.damage);
    assert.equal(profile.cooldownMs, item.cooldownMs);
    assert.equal(profile.worldScale, item.worldScale);
    assert.equal(profile.hitRadius, item.hitRadius);
    assert.equal(profile.staggerMs, item.staggerMs);
  }
});

test("DELTA damage remains independent of sparse or dense canonical pixel count", () => {
  const sparseA = rows([[1, 1]]);
  const denseA = rows([[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6]]);
  const b = rows([[14, 14]]);
  for (let rank = 1; rank <= 5; rank++) {
    assert.equal(buildDeltaProfile(sparseA, b, "A", rank).damage, buildDeltaProfile(denseA, b, "A", rank).damage);
  }
  assert.deepEqual([1, 2, 3, 4, 5].map(deltaDamageForRank), [12, 12, 12, 12, 14]);
});

test("DELTA Rank III expands placement scale without changing canonical point membership", () => {
  const rank2 = buildDeltaProfile(FRAME_A, FRAME_B, "A", 2);
  const rank3 = buildDeltaProfile(FRAME_A, FRAME_B, "A", 3);
  assert.deepEqual(rank3.points, rank2.points);
  assert.equal(rank2.worldScale, 8);
  assert.equal(rank3.worldScale, 9.5);
  assert.equal(deltaWorldScaleForRank(3), 9.5);

  const point = rank3.points[0];
  const targetDx = point.x * 9.5;
  const targetDy = point.y * 9.5;
  assert.equal(deltaHitsTarget(rank3, targetDx, targetDy), true);
});

test("DELTA I to II cooldown migration preserves readiness proportion without a free backlog", () => {
  assert.equal(migrateDeltaCooldownAccumulator(0, 1, 2), 0);
  assert.equal(migrateDeltaCooldownAccumulator(430, 1, 2), 360);
  assert.equal(migrateDeltaCooldownAccumulator(860, 1, 2), 720);
  assert.equal(migrateDeltaCooldownAccumulator(10_000, 1, 2), 720);
  assert.equal(migrateDeltaCooldownAccumulator(360, 2, 3), 360);
});

test("DELTA Rank IV echo is exact previous-phase geometry with bounded authority", () => {
  const echoA = buildDeltaEchoProfile(FRAME_A, FRAME_B, "A");
  assert.equal(echoA.phase, "A");
  assert.equal(echoA.damage, DELTA_ECHO_DAMAGE);
  assert.equal(echoA.delayMs, DELTA_ECHO_DELAY_MS);
  assert.equal(echoA.rearmMs, DELTA_ECHO_REARM_MS);
  assert.equal(echoA.worldScale, 9.5);
  assert.deepEqual(echoA.points, buildDeltaProfile(FRAME_A, FRAME_B, "A", 4).points);
  const point = echoA.points[0];
  assert.equal(deltaEchoHitsTarget(echoA, point.x * 9.5, point.y * 9.5), true);
});

test("DELTA Rank IV echo targets only the phase just left and excludes COMMON/new-phase corporeal enemies", () => {
  assert.equal(isDeltaEchoTargetEligible("SPLIT_A", "A", "B"), true);
  assert.equal(isDeltaEchoTargetEligible("SPLIT_B", "A", "B"), false);
  assert.equal(isDeltaEchoTargetEligible("TRACE", "A", "B"), false);
  assert.equal(isDeltaEchoTargetEligible("SPLIT_B", "B", "A"), true);
  assert.equal(isDeltaEchoTargetEligible("SPLIT_A", "B", "A"), false);
  assert.equal(isDeltaEchoTargetEligible("TRACE", "B", "A"), false);
  assert.equal(isDeltaEchoTargetEligible("SPLIT_A", "A", "A"), false);
});

test("DELTA PHASE ECHO rearm boundary is exact and independent of ordinary cooldown", () => {
  assert.equal(canScheduleDeltaEcho(3, null, 0), false);
  assert.equal(canScheduleDeltaEcho(4, null, 0), true);
  assert.equal(canScheduleDeltaEcho(4, 1000, 1649), false);
  assert.equal(canScheduleDeltaEcho(4, 1000, 1650), true);
  assert.equal(canScheduleDeltaEcho(5, 1000, 1650), true);
});

test("DELTA Rank V stagger hooks preserve normal elite boss resistance bounds", () => {
  assert.equal(deltaStaggerDurationForRole(4, "NORMAL"), 0);
  assert.equal(deltaStaggerDurationForRole(5, "NORMAL"), 90);
  assert.equal(deltaStaggerDurationForRole(5, "ELITE"), 45);
  assert.equal(deltaStaggerDurationForRole(5, "BOSS"), 0);
});

test("DELTA rank helpers reject invalid rank state", () => {
  assert.throws(() => buildDeltaProfile(FRAME_A, FRAME_B, "A", 0), /rank must be an integer from 1 to 5/u);
  assert.throws(() => buildDeltaProfile(FRAME_A, FRAME_B, "A", 6), /rank must be an integer from 1 to 5/u);
  assert.throws(() => canScheduleDeltaEcho(6, null, 0), /rank must be an integer from 1 to 5/u);
});
