import test from "node:test";
import assert from "node:assert/strict";
import {
  acquireVectorTargetForRank,
  advanceVectorLockAfterPrimaryHit,
  armVectorPhaseTransfer,
  buildVectorRankProfile,
  createVectorLockState,
  isVectorPhaseTransferArmed,
  planVectorShot,
  vectorPrimaryDamageForLockStacks,
} from "../src/vector-core.ts";
import { applyV21Draft, buildV21Draft } from "../src/draft-core.ts";
import { applyV23ACandidate, createV23InitialBuildState, enumerateV23ACandidates } from "../src/progression-core.ts";

test("VECTOR Rank I-V profiles match the approved behavior-first table", () => {
  const ranks = [1, 2, 3, 4, 5].map(buildVectorRankProfile);
  assert.deepEqual(ranks.map(profile => profile.cooldownMs), [760, 760, 760, 760, 760]);
  assert.deepEqual(ranks.map(profile => profile.range), [560, 560, 560, 560, 560]);
  assert.deepEqual(ranks.map(profile => profile.normalMaxHits), [1, 2, 2, 2, 2]);
  assert.deepEqual(ranks.map(profile => profile.corridorRadius), [0, 20, 20, 20, 20]);
  assert.deepEqual(ranks.map(profile => profile.priorityBand), [0, 0, 120, 120, 120]);
  assert.deepEqual(ranks.map(profile => profile.transferWindowMs), [0, 0, 0, 1200, 1200]);
  assert.deepEqual(ranks.map(profile => profile.lockMaxStacks), [0, 0, 0, 0, 3]);
});

test("VECTOR Rank II CLEAN LINE uses fixed geometry, exact corridor and stable ordering", () => {
  const candidates = [
    { id: 1, kind: "TRACE" as const, active: true, x: 100, y: 0 },
    { id: 4, kind: "TRACE" as const, active: true, x: 220, y: 20 },
    { id: 3, kind: "TRACE" as const, active: true, x: 220, y: 20 },
    { id: 5, kind: "TRACE" as const, active: true, x: 230, y: 21 },
    { id: 6, kind: "TRACE" as const, active: true, x: 561, y: 0 },
  ];
  const plan = planVectorShot(candidates, "A", 0, 0, 2, 1);
  assert.equal(plan.fixedRay, true);
  assert.deepEqual(plan.targets.map(target => target.id), [1, 3]);
  assert.deepEqual(plan.targets.map(target => target.damage), [10, 7]);
  const reversed = planVectorShot([...candidates].reverse(), "A", 0, 0, 2, 1);
  assert.deepEqual(reversed.targets, plan.targets);
});

test("VECTOR Rank III PRIORITY TRACE honors D+120 band before stable distance and id", () => {
  const candidates = [
    { id: 1, kind: "SPLIT_A" as const, active: true, x: 100, y: 0 },
    { id: 9, kind: "TRACE" as const, active: true, x: 210, y: 0 },
    { id: 4, kind: "TRACE" as const, active: true, x: 210, y: 0 },
  ];
  assert.equal(acquireVectorTargetForRank(candidates, "A", 0, 0, 3)?.id, 4);
  assert.equal(acquireVectorTargetForRank([...candidates].reverse(), "A", 0, 0, 3)?.id, 4);
  const outside = [{ ...candidates[0] }, { ...candidates[1], x: 221 }];
  assert.equal(acquireVectorTargetForRank(outside, "A", 0, 0, 3)?.id, 1);
});

test("VECTOR Rank IV PHASE TRANSFER expires exactly, refreshes without stacking and plans 10/7/5", () => {
  const first = armVectorPhaseTransfer(4, "A", 1000);
  assert.ok(first);
  assert.equal(isVectorPhaseTransferArmed(first, "A", 2199), true);
  assert.equal(isVectorPhaseTransferArmed(first, "A", 2200), false);
  const refreshed = armVectorPhaseTransfer(4, "B", 1500);
  assert.deepEqual(refreshed, { phase: "B", armedAtMs: 1500, expiresAtMs: 2700 });
  const candidates = [
    { id: 1, kind: "TRACE" as const, active: true, x: 100, y: 0 },
    { id: 2, kind: "TRACE" as const, active: true, x: 200, y: 0 },
    { id: 3, kind: "TRACE" as const, active: true, x: 300, y: 0 },
    { id: 4, kind: "TRACE" as const, active: true, x: 400, y: 0 },
  ];
  const plan = planVectorShot(candidates, "B", 0, 0, 4, 1, { transfer: true });
  assert.equal(plan.transfer, true);
  assert.deepEqual(plan.targets.map(target => target.id), [1, 2, 3]);
  assert.deepEqual(plan.targets.map(target => target.damage), [10, 7, 5]);
});

test("VECTOR Rank V lock prefers equal-tier lock, yields to higher priority, and caps 10/12/14/16", () => {
  const equalTier = [
    { id: 1, kind: "TRACE" as const, active: true, x: 220, y: 0 },
    { id: 2, kind: "TRACE" as const, active: true, x: 120, y: 0 },
  ];
  assert.equal(acquireVectorTargetForRank(equalTier, "A", 0, 0, 5, 1)?.id, 1);
  const higher = [...equalTier, { id: 3, kind: "TRACE" as const, active: true, x: 200, y: 0, priorityTier: 2 }];
  assert.equal(acquireVectorTargetForRank(higher, "A", 0, 0, 5, 1)?.id, 3);
  assert.deepEqual([0, 1, 2, 3].map(vectorPrimaryDamageForLockStacks), [10, 12, 14, 16]);
  let lock = createVectorLockState();
  lock = advanceVectorLockAfterPrimaryHit(lock, equalTier[0], "A", 0, 0);
  lock = advanceVectorLockAfterPrimaryHit(lock, equalTier[0], "A", 0, 0);
  lock = advanceVectorLockAfterPrimaryHit(lock, equalTier[0], "A", 0, 0);
  lock = advanceVectorLockAfterPrimaryHit(lock, equalTier[0], "A", 0, 0);
  assert.deepEqual(lock, { targetId: 1, stacks: 3 });
  assert.deepEqual(advanceVectorLockAfterPrimaryHit(lock, { id: 8, kind: "SPLIT_B", active: true, x: 100, y: 0 }, "A", 0, 0), { targetId: null, stacks: 0 });
});

test("VECTOR launch plans snapshot rank behavior and reject invalid rank state", () => {
  const candidates = [{ id: 1, kind: "TRACE" as const, active: true, x: 100, y: 0 }];
  const oldPlan = planVectorShot(candidates, "A", 0, 0, 2, 1);
  const newPlan = planVectorShot(candidates, "A", 0, 0, 5, 1, { lockStacks: 3 });
  assert.equal(oldPlan.rank, 2);
  assert.deepEqual(oldPlan.targets.map(target => target.damage), [10]);
  assert.equal(newPlan.rank, 5);
  assert.deepEqual(newPlan.targets.map(target => target.damage), [16]);
  assert.throws(() => buildVectorRankProfile(0), /integer from 1 to 5/u);
  assert.throws(() => buildVectorRankProfile(6), /integer from 1 to 5/u);
});

test("bounded live adapter exposes natural VECTOR I->II and matches normalized progression semantics", () => {
  const liveBase = { deltaRank: 1, hp: 70, maxHp: 100, pickupRadius: 76, vectorEnabled: true, vectorOwned: false, orbitEnabled: true, orbitOwned: false, echoEnabled: true, echoOwned: false, weaponSlotsUsed: 1, weaponSlotCap: 4 };
  const acquired = applyV21Draft(liveBase, "VECTOR_NEEDLE");
  assert.equal(acquired.vectorRank, 1);
  const nextDraft = buildV21Draft(13699, 3, acquired);
  assert.ok(nextDraft.some(choice => choice.id === "VECTOR_RANK"));
  const ranked = applyV21Draft(acquired, "VECTOR_RANK");
  assert.equal(ranked.vectorRank, 2);

  let normalized = createV23InitialBuildState({ hp: 70 });
  const acquireCandidate = enumerateV23ACandidates(2, normalized).find(candidate => candidate.candidateId === "WEAPON_ACQUIRE:VECTOR");
  assert.ok(acquireCandidate);
  normalized = applyV23ACandidate(normalized, acquireCandidate);
  const rankCandidate = enumerateV23ACandidates(3, normalized).find(candidate => candidate.candidateId === "WEAPON_RANK:VECTOR:1->2");
  assert.ok(rankCandidate);
  normalized = applyV23ACandidate(normalized, rankCandidate);
  assert.equal(normalized.weapons.VECTOR?.rank, 2);
});

test("VECTOR rank adapter rejects unowned and max-rank transitions", () => {
  const unowned = { deltaRank: 1, hp: 80, maxHp: 100, pickupRadius: 76, vectorEnabled: true, vectorOwned: false, vectorRank: 0 };
  assert.throws(() => applyV21Draft(unowned, "VECTOR_RANK"), /before acquisition/u);
  const maxed = { ...unowned, vectorOwned: true, vectorRank: 5 };
  assert.throws(() => applyV21Draft(maxed, "VECTOR_RANK"), /already Rank V/u);
});
