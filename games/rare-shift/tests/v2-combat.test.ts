import assert from "node:assert/strict";
import test from "node:test";
import { applyV21Draft, buildV21Draft, isV21DraftChoiceEligible } from "../src/draft-core.ts";
import {
  buildDeltaProfile,
  deltaDamageForRank,
  enemyThreatPhase,
  isEnemyCorporeal,
} from "../src/phase-combat-core.ts";
import {
  addSignalXp,
  buildSpawnSpec,
  spawnKind,
  v21QualificationReached,
  xpThreshold,
} from "../src/survival-core.ts";
import type { FrameRows } from "../src/types.ts";

function rows(active: readonly [number, number][]): FrameRows {
  const grid = Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => "."));
  for (const [x, y] of active) grid[y][x] = "#";
  return Object.freeze(grid.map(row => row.join("")));
}

test("phase threats obey COMMON/A/B authority", () => {
  assert.equal(enemyThreatPhase("TRACE"), "COMMON");
  assert.equal(isEnemyCorporeal("TRACE", "A"), true);
  assert.equal(isEnemyCorporeal("TRACE", "B"), true);
  assert.equal(isEnemyCorporeal("SPLIT_A", "A"), true);
  assert.equal(isEnemyCorporeal("SPLIT_A", "B"), false);
  assert.equal(isEnemyCorporeal("SPLIT_B", "A"), false);
  assert.equal(isEnemyCorporeal("SPLIT_B", "B"), true);
});

test("DELTA BURST geometry is exact exclusive canonical geometry", () => {
  const a = rows([[7, 7], [8, 7], [2, 2]]);
  const b = rows([[7, 7], [8, 7], [13, 13]]);
  const pa = buildDeltaProfile(a, b, "A", 1);
  const pb = buildDeltaProfile(a, b, "B", 1);
  assert.equal(pa.pixelCount, 1);
  assert.equal(pb.pixelCount, 1);
  assert.deepEqual(pa.points, [{ x: -5.5, y: -5.5 }]);
  assert.deepEqual(pb.points, [{ x: 5.5, y: 5.5 }]);
});

test("DELTA rank power is normalized independently of canonical pixel count", () => {
  const sparseA = rows([[1, 1]]), sparseB = rows([[14, 14]]);
  const broadA = rows([[1, 1], [2, 2], [3, 3], [4, 4]]), broadB = rows([[14, 14]]);
  assert.equal(buildDeltaProfile(sparseA, sparseB, "A", 2).damage, buildDeltaProfile(broadA, broadB, "A", 2).damage);
  assert.equal(deltaDamageForRank(1), 12);
  assert.equal(deltaDamageForRank(5), 28);
});

test("spawn sequence is deterministic and teaches TRACE then SPLIT_A", () => {
  const first = Array.from({ length: 20 }, (_, i) => buildSpawnSpec(13699, i, i * 1500, { x: 900, y: 600 }));
  const again = Array.from({ length: 20 }, (_, i) => buildSpawnSpec(13699, i, i * 1500, { x: 900, y: 600 }));
  assert.deepEqual(first, again);
  assert.equal(first[0].kind, "TRACE");
  assert.equal(first[1].kind, "SPLIT_A");
  const kinds = new Set(first.map(item => item.kind));
  assert.ok(kinds.has("TRACE"));
  assert.ok(kinds.has("SPLIT_A") || kinds.has("SPLIT_B"));
  assert.equal(spawnKind(13699, 4, 6000), spawnKind(13699, 4, 6000));
});

test("Signal XP crosses deterministic level thresholds", () => {
  assert.equal(xpThreshold(1), 4);
  const result = addSignalXp(1, 3, 1);
  assert.equal(result.level, 2);
  assert.equal(result.xp, 0);
  assert.equal(result.levelsGained, 1);
});

test("V2-1 draft exposes three distinct valid choices while all are useful", () => {
  const state = { deltaRank: 1, hp: 55, maxHp: 100, pickupRadius: 76 };
  const draft = buildV21Draft(13699, 2, state);
  assert.equal(draft.length, 3);
  assert.equal(new Set(draft.map(choice => choice.id)).size, 3);
  assert.ok(draft.every(choice => !choice.disabled));
  assert.ok(draft.some(choice => choice.id === "DELTA_RANK"));
  assert.equal(applyV21Draft(state, "DELTA_RANK").deltaRank, 2);
  assert.equal(applyV21Draft(state, "FIELD_REPAIR").hp, 80);
  assert.equal(applyV21Draft(state, "SIGNAL_MAGNET").pickupRadius, 111);
});

test("max-rank DELTA BURST is removed instead of rendered disabled", () => {
  const state = { deltaRank: 5, hp: 30, maxHp: 100, pickupRadius: 76 };
  assert.equal(isV21DraftChoiceEligible(state, "DELTA_RANK"), false);
  const draft = buildV21Draft(13699, 6, state);
  assert.equal(draft.some(choice => choice.id === "DELTA_RANK"), false);
  assert.deepEqual(new Set(draft.map(choice => choice.id)), new Set(["FIELD_REPAIR", "SIGNAL_MAGNET"]));
  assert.throws(() => applyV21Draft(state, "DELTA_RANK"), /already rank V/u);
});

test("utilities with no remaining effect are also removed from draft", () => {
  const fullHp = { deltaRank: 3, hp: 100, maxHp: 100, pickupRadius: 76 };
  assert.equal(buildV21Draft(13699, 4, fullHp).some(choice => choice.id === "FIELD_REPAIR"), false);
  assert.throws(() => applyV21Draft(fullHp, "FIELD_REPAIR"), /no effect at full HP/u);

  const maxMagnet = { deltaRank: 3, hp: 50, maxHp: 100, pickupRadius: 220 };
  assert.equal(buildV21Draft(13699, 4, maxMagnet).some(choice => choice.id === "SIGNAL_MAGNET"), false);
  assert.throws(() => applyV21Draft(maxMagnet, "SIGNAL_MAGNET"), /maximum pickup radius/u);
});

test("fully exhausted V2-1 sandbox gets one useful RUN BONUS fallback", () => {
  const exhausted = { deltaRank: 5, hp: 100, maxHp: 100, pickupRadius: 220 };
  const draft = buildV21Draft(13699, 9, exhausted);
  assert.equal(draft.length, 1);
  assert.equal(draft[0].id, "RUN_BONUS");
  assert.equal(draft[0].disabled, false);
  const next = applyV21Draft(exhausted, "RUN_BONUS");
  assert.equal(next.pickupRadius, 240);
});

test("qualification gate requires the complete bounded V2-1 interaction", () => {
  const base = { elapsedMs: 20_000, phase: "B" as const, hp: 75, level: 2, xp: 0, kills: 3, shifts: 1, deltaRank: 2 };
  assert.equal(v21QualificationReached(base), true);
  assert.equal(v21QualificationReached({ ...base, shifts: 0 }), false);
  assert.equal(v21QualificationReached({ ...base, deltaRank: 1 }), false);
  assert.equal(v21QualificationReached({ ...base, hp: 0 }), false);
});
