import assert from "node:assert/strict";
import test from "node:test";
import { applyV21Draft, buildV21Draft, isV21DraftChoiceValid, type V21BuildState } from "../src/draft-core.ts";
import { applyV23ACandidate, enumerateV23ACandidates, type V23BuildState } from "../src/progression-core.ts";

function live(rank: number, enabled = true): V21BuildState {
  return {
    deltaRank: 5,
    hp: 80,
    maxHp: 100,
    pickupRadius: 111,
    signalEnabled: true,
    signalOwned: true,
    signalRankEnabled: enabled,
    signalRank: rank,
    weaponSlotsUsed: 4,
    weaponSlotCap: 4,
  };
}

test("bounded live SIGNAL bridge is opt-in and slot neutral", () => {
  assert.equal(isV21DraftChoiceValid(live(1, false), "SIGNAL_RANK"), false);
  assert.equal(isV21DraftChoiceValid(live(1, true), "SIGNAL_RANK"), true);
  const next = applyV21Draft(live(1, true), "SIGNAL_RANK");
  assert.equal(next.signalRank, 2);
  assert.equal(next.weaponSlotsUsed, 4);
});

test("SIGNAL bridge is monotonic I-V and rejects disabled, unowned, and Rank V", () => {
  let state: V21BuildState = live(1, true);
  for (let rank = 2; rank <= 5; rank += 1) {
    state = applyV21Draft(state, "SIGNAL_RANK");
    assert.equal(state.signalRank, rank);
    assert.equal(state.weaponSlotsUsed, 4);
  }
  assert.equal(isV21DraftChoiceValid(state, "SIGNAL_RANK"), false);
  assert.throws(() => applyV21Draft(state, "SIGNAL_RANK"), /already rank V/u);
  assert.throws(() => applyV21Draft({ ...live(1, true), signalOwned: false }, "SIGNAL_RANK"), /before acquisition/u);
  assert.throws(() => applyV21Draft(live(1, false), "SIGNAL_RANK"), /not enabled/u);
});

test("SIGNAL acquisition initializes Rank I and consumes exactly one slot", () => {
  const state: V21BuildState = {
    deltaRank: 1,
    hp: 80,
    maxHp: 100,
    pickupRadius: 76,
    signalEnabled: true,
    signalOwned: false,
    signalRankEnabled: true,
    weaponSlotsUsed: 3,
    weaponSlotCap: 4,
  };
  const next = applyV21Draft(state, "SIGNAL_ARC");
  assert.equal(next.signalOwned, true);
  assert.equal(next.signalRank, 1);
  assert.equal(next.weaponSlotsUsed, 4);
});

test("legacy draft remains unchanged when SIGNAL rank bridge is disabled", () => {
  const legacy = {
    deltaRank: 1,
    hp: 100,
    maxHp: 100,
    pickupRadius: 76,
    vectorEnabled: true,
    vectorOwned: false,
    orbitEnabled: true,
    orbitOwned: false,
    echoEnabled: true,
    echoOwned: false,
    signalEnabled: false,
    signalOwned: false,
    weaponSlotsUsed: 1,
    weaponSlotCap: 4,
  };
  assert.deepEqual(buildV21Draft(13699, 2, legacy).map(c => c.id), ["ORBIT_NODES", "VECTOR_NEEDLE", "DELTA_RANK"]);
  assert.equal(buildV21Draft(13699, 3, legacy).map(c => c.id).includes("ECHO_MINE"), true);
  assert.equal(buildV21Draft(13699, 4, legacy).map(c => c.id).includes("SIGNAL_RANK"), false);
});

test("live SIGNAL rank transition matches normalized V2-3 next-rank semantics", () => {
  for (let rank = 1; rank < 5; rank += 1) {
    const normalized: V23BuildState = {
      weapons: {
        DELTA: { rank: 5, evolved: false },
        VECTOR: { rank: 1, evolved: false },
        ORBIT: { rank: 1, evolved: false },
        SIGNAL: { rank, evolved: false },
      },
      protocols: {},
      evolutionCores: 0,
      refracts: 1,
      rerollNonce: 0,
      hp: 80,
      maxHp: 100,
      pickupRadius: 111,
    };
    const candidate = enumerateV23ACandidates(9, normalized).find(c => c.candidateId === `WEAPON_RANK:SIGNAL:${rank}->${rank + 1}`);
    assert.ok(candidate);
    const normalizedNext = applyV23ACandidate(normalized, candidate);
    const liveNext = applyV21Draft(live(rank, true), "SIGNAL_RANK");
    assert.equal(normalizedNext.weapons.SIGNAL?.rank, liveNext.signalRank);
  }
});
