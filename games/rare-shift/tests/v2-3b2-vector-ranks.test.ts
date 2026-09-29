import assert from "node:assert/strict";
import test from "node:test";
import { applyV21Draft, buildV21Draft, isV21DraftChoiceValid } from "../src/draft-core.ts";
import { applyV23ACandidate, enumerateV23ACandidates, type V23BuildState } from "../src/progression-core.ts";
import {
  VECTOR_PRIORITY_BAND_PX,
  VECTOR_TRANSFER_WINDOW_MS,
  acquirePriorityVectorTarget,
  armVectorTransfer,
  buildVectorProfile,
  consumeVectorTransfer,
  initialVectorLockState,
  isVectorTransferArmed,
  planVectorLineHits,
  recordVectorPrimaryHit,
  resetVectorLock,
  vectorPrimaryDamageForStacks,
  vectorPriorityTier,
  type VectorTargetCandidate,
} from "../src/vector-core.ts";

const TRACE = (id: number, x: number, y: number): VectorTargetCandidate => ({ id, kind: "TRACE", active: true, x, y });
const A = (id: number, x: number, y: number): VectorTargetCandidate => ({ id, kind: "SPLIT_A", active: true, x, y });
const B = (id: number, x: number, y: number): VectorTargetCandidate => ({ id, kind: "SPLIT_B", active: true, x, y });

test("VECTOR Rank I-V profiles are exact and bounded", () => {
  assert.deepEqual(buildVectorProfile(1), { rank: 1, damage: 10, cooldownMs: 760, range: 560, speed: 960, hitRadius: 18, maxInFlight: 2, maxHits: 1, damageSequence: [10], corridorRadius: 0, priorityBand: 0 });
  assert.deepEqual(buildVectorProfile(2), { rank: 2, damage: 10, cooldownMs: 760, range: 560, speed: 960, hitRadius: 18, maxInFlight: 2, maxHits: 2, damageSequence: [10, 7], corridorRadius: 20, priorityBand: 0 });
  assert.equal(buildVectorProfile(3).priorityBand, VECTOR_PRIORITY_BAND_PX);
  assert.deepEqual(buildVectorProfile(4, true).damageSequence, [10, 7, 5]);
  assert.equal(buildVectorProfile(4, true).maxHits, 3);
  assert.equal(buildVectorProfile(5).maxInFlight, 2);
  assert.throws(() => buildVectorProfile(0));
  assert.throws(() => buildVectorProfile(6));
});

test("Rank II CLEAN LINE uses a fixed corridor, total travel budget and stable order", () => {
  const primary = TRACE(10, 100, 0);
  const candidates = [TRACE(30, 300, 20), TRACE(20, 300, -20), TRACE(40, 561, 0), TRACE(50, 90, 0), primary];
  const hits = planVectorLineHits(candidates, "A", 0, 0, primary, 2);
  assert.deepEqual(hits.map(hit => hit.id), [10, 20]);
  const reversed = planVectorLineHits([...candidates].reverse(), "A", 0, 0, primary, 3);
  assert.deepEqual(reversed.map(hit => hit.id), [10, 20, 30]);
  assert.equal(reversed[1].perpendicularDistance, 20);
  assert.ok(reversed.every(hit => hit.alongRay <= 560));
});

test("Rank II excludes ghosts and candidates behind the primary", () => {
  const primary = A(1, 100, 0);
  const hits = planVectorLineHits([primary, B(2, 200, 0), A(3, 50, 0), A(4, 200, 21), A(5, 200, 20)], "A", 0, 0, primary, 3);
  assert.deepEqual(hits.map(hit => hit.id), [1, 5]);
});

test("Rank III PRIORITY TRACE applies D+120 band, priority, distance and stable ID", () => {
  assert.equal(vectorPriorityTier("TRACE"), 1);
  assert.equal(vectorPriorityTier("SPLIT_A"), 0);
  const candidates = [A(9, 100, 0), TRACE(8, 219, 0), TRACE(7, 219, 0), TRACE(6, 221, 0)];
  const target = acquirePriorityVectorTarget(candidates, "A", 0, 0);
  assert.equal(target?.id, 7);
  const noTraceInBand = acquirePriorityVectorTarget([A(9, 100, 0), TRACE(8, 221, 0)], "A", 0, 0);
  assert.equal(noTraceInBand?.id, 9);
});

test("VECTOR priority acquisition accepts a bounded non-default numeric band without changing the 120px default", () => {
  const candidates = [A(9, 100, 0), TRACE(8, 225, 0)];
  assert.equal(acquirePriorityVectorTarget(candidates, "A", 0, 0)?.id, 9, "default 120px band remains authoritative");
  assert.equal(acquirePriorityVectorTarget(candidates, "A", 0, 0, null, 560, 126)?.id, 8, "explicit widened band may admit a legal priority target");
  assert.equal(acquirePriorityVectorTarget([A(9, 100, 0), B(8, 225, 0)], "A", 0, 0, null, 560, 126)?.id, 9, "a wider band never legalizes an off-phase ghost");
});

test("Rank V lock preference only applies among tied highest-priority candidates", () => {
  const candidates = [TRACE(1, 130, 0), TRACE(2, 120, 0), A(3, 100, 0)];
  assert.equal(acquirePriorityVectorTarget(candidates, "A", 0, 0, 1)?.id, 1);
  assert.equal(acquirePriorityVectorTarget(candidates, "A", 0, 0, 99)?.id, 2);
});

test("Rank IV PHASE TRANSFER exact expiry and refresh-without-stack semantics", () => {
  const first = armVectorTransfer(1000, "A");
  assert.equal(first.expiresAtMs, 1000 + VECTOR_TRANSFER_WINDOW_MS);
  assert.equal(isVectorTransferArmed(first, 2199), true);
  assert.equal(isVectorTransferArmed(first, 2200), false);
  const refreshed = armVectorTransfer(1500, "B");
  assert.equal(refreshed.phase, "B");
  assert.equal(refreshed.expiresAtMs, 2700);
  const consumed = consumeVectorTransfer(refreshed, 1600);
  assert.equal(consumed.armed, false);
  assert.equal(isVectorTransferArmed(consumed, 1601), false);
});

test("Rank V VECTOR LOCK damage progression is deterministic and capped", () => {
  let state = initialVectorLockState();
  assert.equal(vectorPrimaryDamageForStacks(state.stacks), 10);
  state = recordVectorPrimaryHit(state, 7);
  assert.equal(state.stacks, 1);
  assert.equal(vectorPrimaryDamageForStacks(state.stacks), 12);
  state = recordVectorPrimaryHit(state, 7);
  assert.equal(vectorPrimaryDamageForStacks(state.stacks), 14);
  state = recordVectorPrimaryHit(state, 7);
  assert.equal(vectorPrimaryDamageForStacks(state.stacks), 16);
  state = recordVectorPrimaryHit(state, 7);
  assert.equal(state.stacks, 3);
  state = recordVectorPrimaryHit(state, 8);
  assert.deepEqual(state, { targetId: 8, stacks: 1 });
  assert.deepEqual(resetVectorLock(), { targetId: null, stacks: 0 });
});

test("bounded V2-3B2 live adapter is opt-in, monotonic and rejects Rank-V overflow", () => {
  const legacy = { deltaRank: 2, hp: 70, maxHp: 100, pickupRadius: 76, vectorEnabled: true, vectorOwned: true, vectorRank: 1, weaponSlotsUsed: 2, weaponSlotCap: 4 };
  assert.equal(isV21DraftChoiceValid(legacy, "VECTOR_RANK"), false);

  const enabled = { ...legacy, vectorRankEnabled: true };
  assert.equal(isV21DraftChoiceValid(enabled, "VECTOR_RANK"), true);
  assert.ok(buildV21Draft(13699, 5, enabled).some(choice => choice.id === "VECTOR_RANK"));
  const rank2 = applyV21Draft(enabled, "VECTOR_RANK");
  assert.equal(rank2.vectorRank, 2);
  assert.equal(rank2.weaponSlotsUsed, 2);

  let ranked = rank2;
  ranked = applyV21Draft(ranked, "VECTOR_RANK");
  ranked = applyV21Draft(ranked, "VECTOR_RANK");
  ranked = applyV21Draft(ranked, "VECTOR_RANK");
  assert.equal(ranked.vectorRank, 5);
  assert.throws(() => applyV21Draft(ranked, "VECTOR_RANK"), /already rank V/u);
});

test("bounded live VECTOR rank adapter matches normalized V2-3 next-rank semantics", () => {
  const normalized: V23BuildState = {
    weapons: { DELTA: { rank: 2, evolved: false }, VECTOR: { rank: 1, evolved: false } },
    protocols: {},
    evolutionCores: 0,
    refracts: 1,
    rerollNonce: 0,
    hp: 70,
    maxHp: 100,
    pickupRadius: 76,
  };
  const candidate = enumerateV23ACandidates(5, normalized).find(item => item.candidateId === "WEAPON_RANK:VECTOR:1->2");
  assert.ok(candidate);
  const normalizedNext = applyV23ACandidate(normalized, candidate);
  assert.equal(normalizedNext.weapons.VECTOR?.rank, 2);

  const liveNext = applyV21Draft({
    deltaRank: 2,
    hp: 70,
    maxHp: 100,
    pickupRadius: 76,
    vectorEnabled: true,
    vectorOwned: true,
    vectorRankEnabled: true,
    vectorRank: 1,
    weaponSlotsUsed: 2,
    weaponSlotCap: 4,
  }, "VECTOR_RANK");
  assert.equal(liveNext.vectorRank, normalizedNext.weapons.VECTOR?.rank);
});