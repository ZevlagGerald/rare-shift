import assert from "node:assert/strict";
import test from "node:test";
import { applyV21Draft, buildV21Draft, isV21DraftChoiceValid } from "../src/draft-core.ts";
import {
  buildOrbitProfile,
  canEmitOrbitShear,
  isOrbitContactLegal,
  normalizeOrbitAngle,
  orbitDirectionForPhase,
  orbitNodeAngles,
  orbitNodePositions,
  ORBIT_RANK_I,
  ORBIT_SHEAR_ARC_RAD,
  ORBIT_SHEAR_DURATION_MS,
  ORBIT_SHEAR_REARM_MS,
  planOrbitShearTargetIds,
  type OrbitContactCandidate,
} from "../src/orbit-core.ts";
import { applyV23ACandidate, enumerateV23ACandidates, type V23BuildState } from "../src/progression-core.ts";

const TRACE = (id: number, x: number, y: number): OrbitContactCandidate => ({ id, kind: "TRACE", active: true, x, y });
const A = (id: number, x: number, y: number): OrbitContactCandidate => ({ id, kind: "SPLIT_A", active: true, x, y });
const B = (id: number, x: number, y: number): OrbitContactCandidate => ({ id, kind: "SPLIT_B", active: true, x, y });
const circularDistance = (a: number, b: number): number => {
  const raw = Math.abs(normalizeOrbitAngle(a) - normalizeOrbitAngle(b));
  return Math.min(raw, Math.PI * 2 - raw);
};

test("ORBIT Rank I-V profiles match the locked V2-3B table", () => {
  assert.deepEqual(ORBIT_RANK_I, { damage: 8, radius: 72, angularSpeed: 2.4, contactRadius: 26, contactIntervalMs: 700, nodeCount: 1 });
  assert.deepEqual(buildOrbitProfile(1), { rank: 1, damage: 8, radius: 72, angularSpeed: 2.4, contactRadius: 26, contactIntervalMs: 700, nodeCount: 1, shearArcRad: 0, shearDurationMs: 0, shearContactRadius: 0, shearDamage: 0, shearRearmMs: 0 });
  assert.equal(buildOrbitProfile(2).nodeCount, 2);
  assert.deepEqual({ radius: buildOrbitProfile(3).radius, angularSpeed: buildOrbitProfile(3).angularSpeed, contactRadius: buildOrbitProfile(3).contactRadius }, { radius: 80, angularSpeed: 2.55, contactRadius: 30 });
  assert.deepEqual({ arc: buildOrbitProfile(4).shearArcRad, duration: buildOrbitProfile(4).shearDurationMs, damage: buildOrbitProfile(4).shearDamage, rearm: buildOrbitProfile(4).shearRearmMs }, { arc: ORBIT_SHEAR_ARC_RAD, duration: ORBIT_SHEAR_DURATION_MS, damage: 6, rearm: ORBIT_SHEAR_REARM_MS });
  assert.deepEqual({ nodes: buildOrbitProfile(5).nodeCount, interval: buildOrbitProfile(5).contactIntervalMs }, { nodes: 3, interval: 650 });
  assert.throws(() => buildOrbitProfile(0));
  assert.throws(() => buildOrbitProfile(6));
});

test("ORBIT node geometry preserves one anchor and exact equal spacing", () => {
  const anchor = 1.2345;
  const rank2 = orbitNodeAngles(anchor, buildOrbitProfile(2).nodeCount);
  assert.equal(rank2.length, 2);
  assert.ok(circularDistance(rank2[0], anchor) < 1e-12);
  assert.ok(Math.abs(circularDistance(rank2[0], rank2[1]) - Math.PI) < 1e-12);

  const rank5 = orbitNodeAngles(anchor, buildOrbitProfile(5).nodeCount);
  assert.equal(rank5.length, 3);
  assert.ok(circularDistance(rank5[0], anchor) < 1e-12);
  assert.ok(Math.abs(circularDistance(rank5[0], rank5[1]) - 2 * Math.PI / 3) < 1e-12);
  assert.ok(Math.abs(circularDistance(rank5[1], rank5[2]) - 2 * Math.PI / 3) < 1e-12);

  const positions = orbitNodePositions(100, 200, anchor, buildOrbitProfile(5));
  assert.equal(positions.length, 3);
  assert.ok(positions.every(point => Math.abs(Math.hypot(point.x - 100, point.y - 200) - 80) < 1e-10));
});

test("ORBIT shared normal ledger prevents multi-node same-target DPS multiplication", () => {
  const profile = buildOrbitProfile(2);
  const points = orbitNodePositions(0, 0, 0, profile);
  const candidate = TRACE(1, points[0].x, points[0].y);
  assert.equal(isOrbitContactLegal(candidate, "A", points[0].x, points[0].y, null, 1000, profile), true);
  assert.equal(isOrbitContactLegal({ ...candidate, x: points[1].x, y: points[1].y }, "A", points[1].x, points[1].y, 1000, 1699, profile), false);
  assert.equal(isOrbitContactLegal({ ...candidate, x: points[1].x, y: points[1].y }, "A", points[1].x, points[1].y, 1000, 1700, profile), true);

  const rank5 = buildOrbitProfile(5);
  assert.equal(isOrbitContactLegal(candidate, "A", points[0].x, points[0].y, 1000, 1649, rank5), false);
  assert.equal(isOrbitContactLegal(candidate, "A", points[0].x, points[0].y, 1000, 1650, rank5), true);
});

test("ORBIT PHASE SHEAR uses the preserved anchor and new post-SHIFT direction", () => {
  const profile = buildOrbitProfile(4);
  const anchor = 0;
  const onForwardArc = TRACE(2, Math.cos(Math.PI / 6) * 80, Math.sin(Math.PI / 6) * 80);
  const outsideArc = TRACE(3, Math.cos(Math.PI / 2) * 80, Math.sin(Math.PI / 2) * 80);
  const ghost = B(4, Math.cos(Math.PI / 6) * 80, Math.sin(Math.PI / 6) * 80);
  const commonDuplicate = TRACE(2, Math.cos(Math.PI / 6) * 80, Math.sin(Math.PI / 6) * 80);

  assert.equal(orbitDirectionForPhase("A"), 1);
  assert.deepEqual(planOrbitShearTargetIds([outsideArc, ghost, onForwardArc, commonDuplicate], "A", 0, 0, anchor, profile), [2]);

  const reverseArc = TRACE(5, Math.cos(-Math.PI / 6) * 80, Math.sin(-Math.PI / 6) * 80);
  assert.deepEqual(planOrbitShearTargetIds([onForwardArc, reverseArc], "B", 0, 0, anchor, profile), [5]);
});

test("ORBIT shear authority is post-SHIFT corporeal and input-order invariant", () => {
  const profile = buildOrbitProfile(5);
  const anchor = 0;
  const common = TRACE(9, 80, 0);
  const a = A(7, 80, 0);
  const b = B(8, 80, 0);
  const ordered = planOrbitShearTargetIds([b, common, a], "A", 0, 0, anchor, profile);
  const reversed = planOrbitShearTargetIds([a, common, b].reverse(), "A", 0, 0, anchor, profile);
  assert.deepEqual(ordered, [7, 9]);
  assert.deepEqual(reversed, ordered);
});

test("ORBIT shear rearm has an exact 650ms boundary and does not exist before Rank IV", () => {
  assert.equal(canEmitOrbitShear(3, null, 0), false);
  assert.equal(canEmitOrbitShear(4, null, 1000), true);
  assert.equal(canEmitOrbitShear(4, 1000, 1649), false);
  assert.equal(canEmitOrbitShear(4, 1000, 1650), true);
  assert.equal(canEmitOrbitShear(5, 1000, 1650), true);
});

test("bounded live ORBIT rank adapter is opt-in, monotonic and preserves weapon slots", () => {
  const legacy = { deltaRank: 2, hp: 70, maxHp: 100, pickupRadius: 76, orbitEnabled: true, orbitOwned: true, orbitRank: 1, weaponSlotsUsed: 2, weaponSlotCap: 4 };
  assert.equal(isV21DraftChoiceValid(legacy, "ORBIT_RANK"), false);

  let ranked = { ...legacy, orbitRankEnabled: true };
  assert.equal(isV21DraftChoiceValid(ranked, "ORBIT_RANK"), true);
  ranked = applyV21Draft(ranked, "ORBIT_RANK") as typeof ranked;
  assert.equal(ranked.orbitRank, 2);
  assert.equal(ranked.weaponSlotsUsed, 2);
  ranked = applyV21Draft(ranked, "ORBIT_RANK") as typeof ranked;
  ranked = applyV21Draft(ranked, "ORBIT_RANK") as typeof ranked;
  ranked = applyV21Draft(ranked, "ORBIT_RANK") as typeof ranked;
  assert.equal(ranked.orbitRank, 5);
  assert.throws(() => applyV21Draft(ranked, "ORBIT_RANK"), /already rank V/u);
  assert.ok(buildV21Draft(13699, 8, ranked).every(choice => choice.id !== "ORBIT_RANK"));
});

test("bounded live ORBIT rank adapter matches normalized V2-3 next-rank semantics", () => {
  const normalized: V23BuildState = {
    weapons: { DELTA: { rank: 2, evolved: false }, ORBIT: { rank: 1, evolved: false } },
    protocols: {}, evolutionCores: 0, refracts: 1, rerollNonce: 0, hp: 70, maxHp: 100, pickupRadius: 76,
  };
  const candidate = enumerateV23ACandidates(5, normalized).find(item => item.candidateId === "WEAPON_RANK:ORBIT:1->2");
  assert.ok(candidate);
  const normalizedNext = applyV23ACandidate(normalized, candidate);
  assert.equal(normalizedNext.weapons.ORBIT?.rank, 2);

  const liveNext = applyV21Draft({
    deltaRank: 2, hp: 70, maxHp: 100, pickupRadius: 76,
    orbitEnabled: true, orbitOwned: true, orbitRankEnabled: true, orbitRank: 1,
    weaponSlotsUsed: 2, weaponSlotCap: 4,
  }, "ORBIT_RANK");
  assert.equal(liveNext.orbitRank, normalizedNext.weapons.ORBIT?.rank);
});
