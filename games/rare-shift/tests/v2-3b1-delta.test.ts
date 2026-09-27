import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDeltaEchoProfile,
  buildDeltaProfile,
  canScheduleDeltaPhaseEcho,
  DELTA_PHASE_ECHO_DAMAGE,
  DELTA_PHASE_ECHO_DELAY_MS,
  DELTA_PHASE_ECHO_REARM_MS,
  DELTA_RANK_V_BOSS_STAGGER_DEFAULT_MS,
  DELTA_RANK_V_ELITE_STAGGER_CAP_MS,
  DELTA_RANK_V_NORMAL_STAGGER_MS,
  deltaCooldownForRank,
  deltaDamageForRank,
  deltaHitsTarget,
  deltaStaggerForRank,
  deltaWorldScaleForRank,
  isDeltaEchoTargetLegal,
  migrateCooldownAccumulator,
} from "../src/phase-combat-core.ts";
import type { FrameRows } from "../src/types.ts";

function rows(active: readonly [number, number][]): FrameRows {
  const grid = Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => "."));
  for (const [x, y] of active) grid[y][x] = "#";
  return Object.freeze(grid.map(row => row.join("")));
}

const A = rows([[2, 2], [3, 3], [7, 7]]);
const B = rows([[12, 12], [11, 11], [7, 7]]);

test("DELTA Rank I-V locked profiles are exact", () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(deltaDamageForRank), [12, 12, 12, 12, 14]);
  assert.deepEqual([1, 2, 3, 4, 5].map(deltaCooldownForRank), [860, 720, 720, 720, 720]);
  assert.deepEqual([1, 2, 3, 4, 5].map(deltaWorldScaleForRank), [8, 8, 9.5, 9.5, 9.5]);
  assert.deepEqual([1, 2, 3, 4, 5].map(deltaStaggerForRank), [0, 0, 0, 0, 90]);
});

test("Rank II changes cadence without changing primary damage or geometry scale", () => {
  const one = buildDeltaProfile(A, B, "A", 1);
  const two = buildDeltaProfile(A, B, "A", 2);
  assert.equal(one.damage, two.damage);
  assert.equal(one.worldScale, two.worldScale);
  assert.equal(one.cooldownMs, 860);
  assert.equal(two.cooldownMs, 720);
});

test("Rank III expands world placement while preserving exact canonical membership", () => {
  const two = buildDeltaProfile(A, B, "A", 2);
  const three = buildDeltaProfile(A, B, "A", 3);
  assert.deepEqual(three.points, two.points);
  assert.equal(three.pixelCount, two.pixelCount);
  assert.equal(three.worldScale, 9.5);
  assert.equal(three.damage, 12);
});

test("DELTA authority is normalized independently of sparse or dense canonical masks", () => {
  const sparseA = rows([[1, 1]]);
  const denseA = rows([[1, 1], [2, 2], [3, 3], [4, 4], [5, 5]]);
  const other = rows([[14, 14]]);
  for (const rank of [1, 2, 3, 4, 5]) {
    const sparse = buildDeltaProfile(sparseA, other, "A", rank);
    const dense = buildDeltaProfile(denseA, other, "A", rank);
    assert.equal(sparse.damage, dense.damage);
    assert.equal(sparse.cooldownMs, dense.cooldownMs);
    assert.equal(sparse.worldScale, dense.worldScale);
    assert.equal(sparse.hitRadius, dense.hitRadius);
  }
});

test("cooldown migration preserves readiness ratio without backlog", () => {
  assert.equal(migrateCooldownAccumulator(430, 860, 720), 360);
  assert.equal(migrateCooldownAccumulator(860, 860, 720), 720);
  assert.equal(migrateCooldownAccumulator(9999, 860, 720), 720);
  assert.equal(migrateCooldownAccumulator(0, 860, 720), 0);
  assert.throws(() => migrateCooldownAccumulator(-1, 860, 720), /out of range/u);
});

test("Rank IV PHASE ECHO is exact previous-phase canonical geometry with reduced authority", () => {
  const primary = buildDeltaProfile(A, B, "A", 4);
  const echo = buildDeltaEchoProfile(A, B, "A", 4);
  assert.deepEqual(echo.points, primary.points);
  assert.equal(echo.damage, DELTA_PHASE_ECHO_DAMAGE);
  assert.equal(echo.damage, 4);
  assert.equal(echo.worldScale, 9.5);
  assert.equal(echo.staggerMs, 0);
  assert.equal(echo.cooldownMs, 0);
  assert.equal(DELTA_PHASE_ECHO_DELAY_MS, 140);
  assert.equal(DELTA_PHASE_ECHO_REARM_MS, 650);
});

test("PHASE ECHO targets only the aligned phase just left and excludes COMMON/new-phase threats", () => {
  assert.equal(isDeltaEchoTargetLegal("SPLIT_A", "A", "B"), true);
  assert.equal(isDeltaEchoTargetLegal("SPLIT_B", "A", "B"), false);
  assert.equal(isDeltaEchoTargetLegal("TRACE", "A", "B"), false);
  assert.equal(isDeltaEchoTargetLegal("SPLIT_B", "B", "A"), true);
  assert.equal(isDeltaEchoTargetLegal("SPLIT_A", "B", "A"), false);
  assert.equal(isDeltaEchoTargetLegal("TRACE", "B", "A"), false);
  assert.equal(isDeltaEchoTargetLegal("SPLIT_A", "A", "A"), false);
});

test("PHASE ECHO scheduling is unavailable below Rank IV and obeys independent 650ms rearm", () => {
  assert.equal(canScheduleDeltaPhaseEcho(3, 1000, 0), false);
  assert.equal(canScheduleDeltaPhaseEcho(4, 1000, 0), true);
  assert.equal(canScheduleDeltaPhaseEcho(4, 1649, 1650), false);
  assert.equal(canScheduleDeltaPhaseEcho(4, 1650, 1650), true);
  assert.equal(canScheduleDeltaPhaseEcho(5, 1650, 1650), true);
});

test("Rank IV acquisition cannot claim historical SHIFT because scheduling still requires a post-rank call", () => {
  assert.equal(canScheduleDeltaPhaseEcho(3, 5000, 0), false);
  assert.equal(canScheduleDeltaPhaseEcho(4, 5000, 5001), false);
  assert.equal(canScheduleDeltaPhaseEcho(4, 5001, 5001), true);
});

test("Rank V locks bounded primary authority and explicit future resistance hooks", () => {
  const five = buildDeltaProfile(A, B, "A", 5);
  assert.equal(five.damage, 14);
  assert.equal(five.cooldownMs, 720);
  assert.equal(five.worldScale, 9.5);
  assert.equal(five.staggerMs, DELTA_RANK_V_NORMAL_STAGGER_MS);
  assert.equal(DELTA_RANK_V_NORMAL_STAGGER_MS, 90);
  assert.equal(DELTA_RANK_V_ELITE_STAGGER_CAP_MS, 45);
  assert.equal(DELTA_RANK_V_BOSS_STAGGER_DEFAULT_MS, 0);
  assert.equal(buildDeltaEchoProfile(A, B, "A", 5).staggerMs, 0);
});

test("Rank III world scale materially changes spatial coverage without multiplying damage", () => {
  const two = buildDeltaProfile(A, B, "A", 2);
  const three = buildDeltaProfile(A, B, "A", 3);
  const point = two.points[0];
  const targetDx = point.x * three.worldScale;
  const targetDy = point.y * three.worldScale;
  assert.equal(deltaHitsTarget(three, targetDx, targetDy), true);
  assert.equal(three.damage, two.damage);
});

test("invalid ranks and invalid echo ranks fail loudly", () => {
  for (const rank of [0, 6, 1.5, Number.NaN]) {
    assert.throws(() => deltaDamageForRank(rank), /rank/u);
    assert.throws(() => deltaCooldownForRank(rank), /rank/u);
  }
  assert.throws(() => buildDeltaEchoProfile(A, B, "A", 3), /Rank IV or V/u);
});
