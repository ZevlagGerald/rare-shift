import assert from "node:assert/strict";
import test from "node:test";
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
  assert.deepEqual(buildVectorProfile(1), { rank: 1, cooldownMs: 760, range: 560, speed: 960, hitRadius: 18, maxInFlight: 2, maxHits: 1, damageSequence: [10], corridorRadius: 0, priorityBand: 0 });
  assert.deepEqual(buildVectorProfile(2), { rank: 2, cooldownMs: 760, range: 560, speed: 960, hitRadius: 18, maxInFlight: 2, maxHits: 2, damageSequence: [10, 7], corridorRadius: 20, priorityBand: 0 });
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
