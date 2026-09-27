import assert from "node:assert/strict";
import test from "node:test";
import { applyV21Draft, buildV21Draft, isV21DraftChoiceValid } from "../src/draft-core.ts";
import {
  buildDeltaProfile,
  deltaDamageForRank,
  enemyThreatPhase,
  isEnemyCorporeal,
} from "../src/phase-combat-core.ts";
import {
  advanceOrbitAngle,
  isOrbitContactLegal,
  normalizeOrbitAngle,
  orbitDirectionForPhase,
  orbitNodePosition,
  ORBIT_RANK_I,
} from "../src/orbit-core.ts";
import {
  addSignalXp,
  buildSpawnSpec,
  spawnKind,
  v21QualificationReached,
  xpThreshold,
} from "../src/survival-core.ts";
import { acquireVectorTarget, isVectorTargetLegal, VECTOR_RANK_I } from "../src/vector-core.ts";
import type { FrameRows } from "../src/types.ts";

function rows(active: readonly [number, number][]): FrameRows {
  const grid = Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => "."));
  for (const [x, y] of active) grid[y][x] = "#";
  return Object.freeze(grid.map(row => row.join("")));
}

function circularDistance(a: number, b: number): number {
  const raw = Math.abs(normalizeOrbitAngle(a) - normalizeOrbitAngle(b));
  return Math.min(raw, Math.PI * 2 - raw);
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

test("spawn sequence is deterministic and includes phased threats", () => {
  const first = Array.from({ length: 20 }, (_, i) => buildSpawnSpec(13699, i, i * 1500, { x: 900, y: 600 }));
  const again = Array.from({ length: 20 }, (_, i) => buildSpawnSpec(13699, i, i * 1500, { x: 900, y: 600 }));
  assert.deepEqual(first, again);
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

test("V2-1 draft exposes three distinct actionable choices when all three effects are valid", () => {
  const state = { deltaRank: 1, hp: 55, maxHp: 100, pickupRadius: 76 };
  const draft = buildV21Draft(13699, 2, state);
  assert.equal(draft.length, 3);
  assert.equal(new Set(draft.map(choice => choice.id)).size, 3);
  assert.ok(draft.every(choice => !choice.disabled && isV21DraftChoiceValid(state, choice.id)));
  assert.ok(draft.some(choice => choice.id === "DELTA_RANK"));
  assert.equal(applyV21Draft(state, "DELTA_RANK").deltaRank, 2);
  assert.equal(applyV21Draft(state, "FIELD_REPAIR").hp, 80);
  assert.equal(applyV21Draft(state, "SIGNAL_MAGNET").pickupRadius, 111);
});

test("DELTA Rank I-IV remains eligible while Rank V is absent rather than disabled", () => {
  for (let rank = 1; rank <= 4; rank++) {
    const state = { deltaRank: rank, hp: 50, maxHp: 100, pickupRadius: 76 };
    const draft = buildV21Draft(13699, rank + 1, state);
    assert.ok(draft.some(choice => choice.id === "DELTA_RANK"));
  }
  const maxed = { deltaRank: 5, hp: 50, maxHp: 100, pickupRadius: 76 };
  const draft = buildV21Draft(13699, 6, maxed);
  assert.equal(draft.some(choice => choice.id === "DELTA_RANK"), false);
  assert.equal(draft.some(choice => choice.disabled), false);
  assert.throws(() => applyV21Draft(maxed, "DELTA_RANK"), /already rank V/u);
});

test("FIELD REPAIR and SIGNAL MAGNET are filtered when they would be no-ops", () => {
  const fullHp = { deltaRank: 2, hp: 100, maxHp: 100, pickupRadius: 76 };
  assert.equal(buildV21Draft(13699, 3, fullHp).some(choice => choice.id === "FIELD_REPAIR"), false);
  assert.throws(() => applyV21Draft(fullHp, "FIELD_REPAIR"), /missing HP/u);
  const cappedMagnet = { deltaRank: 2, hp: 50, maxHp: 100, pickupRadius: 220 };
  assert.equal(buildV21Draft(13699, 3, cappedMagnet).some(choice => choice.id === "SIGNAL_MAGNET"), false);
  assert.throws(() => applyV21Draft(cappedMagnet, "SIGNAL_MAGNET"), /pickup-radius cap/u);
});

test("every rendered draft choice produces a real state change", () => {
  const states = [
    { deltaRank: 1, hp: 50, maxHp: 100, pickupRadius: 76 },
    { deltaRank: 5, hp: 50, maxHp: 100, pickupRadius: 76 },
    { deltaRank: 5, hp: 100, maxHp: 100, pickupRadius: 76 },
    { deltaRank: 2, hp: 50, maxHp: 100, pickupRadius: 220 },
  ];
  for (const [index, state] of states.entries()) {
    for (const choice of buildV21Draft(13699, index + 2, state)) assert.notDeepEqual(applyV21Draft(state, choice.id), state, `${choice.id} must change state`);
  }
});

test("partially exhausted draft pools remain deterministic and contain only valid alternatives", () => {
  const oneExhausted = { deltaRank: 5, hp: 50, maxHp: 100, pickupRadius: 76 };
  const a = buildV21Draft(13699, 6, oneExhausted);
  const b = buildV21Draft(13699, 6, oneExhausted);
  assert.deepEqual(a, b);
  assert.deepEqual(new Set(a.map(choice => choice.id)), new Set(["FIELD_REPAIR", "SIGNAL_MAGNET"]));
  const multipleExhausted = { deltaRank: 5, hp: 100, maxHp: 100, pickupRadius: 76 };
  assert.deepEqual(buildV21Draft(13699, 7, multipleExhausted).map(choice => choice.id), ["SIGNAL_MAGNET"]);
});

test("fully exhausted draft pool returns no dead or fake cards", () => {
  const exhausted = { deltaRank: 5, hp: 100, maxHp: 100, pickupRadius: 220 };
  assert.deepEqual(buildV21Draft(13699, 8, exhausted), []);
});

test("qualification gate requires the complete bounded V2-1 interaction", () => {
  const base = { elapsedMs: 20_000, phase: "B" as const, hp: 75, level: 2, xp: 0, kills: 3, shifts: 1, deltaRank: 2 };
  assert.equal(v21QualificationReached(base), true);
  assert.equal(v21QualificationReached({ ...base, shifts: 0 }), false);
  assert.equal(v21QualificationReached({ ...base, deltaRank: 1 }), false);
  assert.equal(v21QualificationReached({ ...base, hp: 0 }), false);
});

test("VECTOR Rank-I profile is exact and hard-capped", () => {
  assert.deepEqual(VECTOR_RANK_I, { damage: 10, cooldownMs: 760, range: 560, speed: 960, hitRadius: 18, maxInFlight: 2 });
});

test("VECTOR target legality follows corporeal phase authority and range", () => {
  const trace = { id: 1, kind: "TRACE" as const, active: true, x: 20, y: 0 };
  const a = { id: 2, kind: "SPLIT_A" as const, active: true, x: 30, y: 0 };
  const b = { id: 3, kind: "SPLIT_B" as const, active: true, x: 40, y: 0 };
  assert.equal(isVectorTargetLegal(trace, "A", 0, 0), true);
  assert.equal(isVectorTargetLegal(trace, "B", 0, 0), true);
  assert.equal(isVectorTargetLegal(a, "A", 0, 0), true);
  assert.equal(isVectorTargetLegal(a, "B", 0, 0), false);
  assert.equal(isVectorTargetLegal(b, "A", 0, 0), false);
  assert.equal(isVectorTargetLegal(b, "B", 0, 0), true);
  assert.equal(isVectorTargetLegal({ ...trace, active: false }, "A", 0, 0), false);
  assert.equal(isVectorTargetLegal({ ...trace, x: 561 }, "A", 0, 0), false);
});

test("VECTOR chooses nearest legal target and stable lower spawn id on ties", () => {
  const targets = [
    { id: 9, kind: "TRACE" as const, active: true, x: 100, y: 0 },
    { id: 4, kind: "TRACE" as const, active: true, x: 40, y: 0 },
    { id: 2, kind: "TRACE" as const, active: true, x: -40, y: 0 },
  ];
  assert.equal(acquireVectorTarget(targets, "A", 0, 0)?.id, 2);
  assert.equal(acquireVectorTarget([...targets].reverse(), "A", 0, 0)?.id, 2);
  assert.equal(acquireVectorTarget([{ ...targets[0], active: false }], "A", 0, 0), null);
});

test("VECTOR acquisition rewrites with phase authority", () => {
  const targets = [
    { id: 1, kind: "SPLIT_A" as const, active: true, x: 25, y: 0 },
    { id: 2, kind: "SPLIT_B" as const, active: true, x: 20, y: 0 },
    { id: 3, kind: "TRACE" as const, active: true, x: 80, y: 0 },
  ];
  assert.equal(acquireVectorTarget(targets, "A", 0, 0)?.id, 1);
  assert.equal(acquireVectorTarget(targets, "B", 0, 0)?.id, 2);
});

test("V2-2A draft guarantees one actionable VECTOR acquisition and never duplicates it", () => {
  const state = { deltaRank: 1, hp: 55, maxHp: 100, pickupRadius: 76, vectorEnabled: true, vectorOwned: false, weaponSlotsUsed: 1, weaponSlotCap: 4 };
  const draft = buildV21Draft(13699, 2, state);
  assert.equal(draft.length, 3);
  assert.equal(draft[0].id, "VECTOR_NEEDLE");
  assert.ok(draft.some(choice => choice.id === "DELTA_RANK"));
  assert.equal(new Set(draft.map(choice => choice.id)).size, 3);
  const acquired = applyV21Draft(state, "VECTOR_NEEDLE");
  assert.equal(acquired.vectorOwned, true);
  assert.equal(acquired.weaponSlotsUsed, 2);
  assert.equal(buildV21Draft(13699, 3, acquired).some(choice => choice.id === "VECTOR_NEEDLE"), false);
  assert.throws(() => applyV21Draft(acquired, "VECTOR_NEEDLE"), /already owned/u);
});

test("VECTOR acquisition is rejected when disabled or weapon slots are full", () => {
  const disabled = { deltaRank: 1, hp: 50, maxHp: 100, pickupRadius: 76 };
  assert.equal(isV21DraftChoiceValid(disabled, "VECTOR_NEEDLE"), false);
  assert.throws(() => applyV21Draft(disabled, "VECTOR_NEEDLE"), /not enabled/u);
  const full = { ...disabled, vectorEnabled: true, vectorOwned: false, weaponSlotsUsed: 4, weaponSlotCap: 4 };
  assert.equal(isV21DraftChoiceValid(full, "VECTOR_NEEDLE"), false);
  assert.throws(() => applyV21Draft(full, "VECTOR_NEEDLE"), /No active weapon slot/u);
});

test("ORBIT Rank-I profile is exact and bounded", () => {
  assert.deepEqual(ORBIT_RANK_I, {
    damage: 8,
    radius: 72,
    angularSpeed: 2.4,
    contactRadius: 26,
    contactIntervalMs: 700,
    nodeCount: 1,
  });
});

test("ORBIT phase directions are opposite and reversal preserves angular position", () => {
  assert.equal(orbitDirectionForPhase("A"), 1);
  assert.equal(orbitDirectionForPhase("B"), -1);
  const start = 1.234;
  const afterA = advanceOrbitAngle(start, "A", 425);
  const returned = advanceOrbitAngle(afterA, "B", 425);
  assert.ok(circularDistance(start, returned) < 1e-10, `${start} -> ${afterA} -> ${returned}`);
  assert.throws(() => advanceOrbitAngle(start, "A", -1), /non-negative/u);
});

test("ORBIT node position is deterministic and remains on the locked radius", () => {
  const point = orbitNodePosition(100, 200, Math.PI / 2);
  assert.ok(Math.abs(point.x - 100) < 1e-10);
  assert.ok(Math.abs(point.y - 272) < 1e-10);
  assert.ok(Math.abs(Math.hypot(point.x - 100, point.y - 200) - ORBIT_RANK_I.radius) < 1e-10);
  assert.deepEqual(orbitNodePosition(100, 200, Math.PI / 2), point);
});

test("ORBIT contact legality follows corporeal phase and per-target cooldown", () => {
  const trace = { id: 1, kind: "TRACE" as const, active: true, x: 10, y: 0 };
  const a = { id: 2, kind: "SPLIT_A" as const, active: true, x: 10, y: 0 };
  const b = { id: 3, kind: "SPLIT_B" as const, active: true, x: 10, y: 0 };
  assert.equal(isOrbitContactLegal(trace, "A", 0, 0, null, 1000), true);
  assert.equal(isOrbitContactLegal(trace, "B", 0, 0, null, 1000), true);
  assert.equal(isOrbitContactLegal(a, "A", 0, 0, null, 1000), true);
  assert.equal(isOrbitContactLegal(a, "B", 0, 0, null, 1000), false);
  assert.equal(isOrbitContactLegal(b, "A", 0, 0, null, 1000), false);
  assert.equal(isOrbitContactLegal(b, "B", 0, 0, null, 1000), true);
  assert.equal(isOrbitContactLegal({ ...trace, active: false }, "A", 0, 0, null, 1000), false);
  assert.equal(isOrbitContactLegal({ ...trace, x: 27 }, "A", 0, 0, null, 1000), false);
  assert.equal(isOrbitContactLegal(trace, "A", 0, 0, 400, 1000), false);
  assert.equal(isOrbitContactLegal(trace, "A", 0, 0, 300, 1000), true);
  assert.equal(isOrbitContactLegal(trace, "B", 0, 0, 400, 1000), false, "SHIFT must not reset the same target cooldown");
});

test("V2-2B discovery exposes ORBIT, preserves VECTOR, and consumes one slot", () => {
  const state = {
    deltaRank: 1,
    hp: 55,
    maxHp: 100,
    pickupRadius: 76,
    vectorEnabled: true,
    vectorOwned: false,
    orbitEnabled: true,
    orbitOwned: false,
    weaponSlotsUsed: 1,
    weaponSlotCap: 4,
  };
  const draft = buildV21Draft(13699, 2, state);
  assert.deepEqual(draft.map(choice => choice.id), ["ORBIT_NODES", "VECTOR_NEEDLE", "DELTA_RANK"]);
  assert.ok(draft.every(choice => !choice.disabled && isV21DraftChoiceValid(state, choice.id)));
  const acquired = applyV21Draft(state, "ORBIT_NODES");
  assert.equal(acquired.orbitOwned, true);
  assert.equal(acquired.weaponSlotsUsed, 2);
  assert.equal(buildV21Draft(13699, 3, acquired).some(choice => choice.id === "ORBIT_NODES"), false);
  assert.throws(() => applyV21Draft(acquired, "ORBIT_NODES"), /already owned/u);
});

test("ORBIT acquisition is rejected when disabled or active weapon slots are full", () => {
  const disabled = { deltaRank: 1, hp: 50, maxHp: 100, pickupRadius: 76 };
  assert.equal(isV21DraftChoiceValid(disabled, "ORBIT_NODES"), false);
  assert.throws(() => applyV21Draft(disabled, "ORBIT_NODES"), /not enabled/u);
  const full = { ...disabled, orbitEnabled: true, orbitOwned: false, weaponSlotsUsed: 4, weaponSlotCap: 4 };
  assert.equal(isV21DraftChoiceValid(full, "ORBIT_NODES"), false);
  assert.throws(() => applyV21Draft(full, "ORBIT_NODES"), /No active weapon slot/u);
});
