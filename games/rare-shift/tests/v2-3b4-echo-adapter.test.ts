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
    echoEnabled: true,
    echoOwned: true,
    echoRankEnabled: enabled,
    echoRank: rank,
    weaponSlotsUsed: 4,
    weaponSlotCap: 4,
  };
}

test("bounded live ECHO bridge is opt-in and slot neutral", () => {
  assert.equal(isV21DraftChoiceValid(live(1, false), "ECHO_RANK"), false);
  assert.equal(isV21DraftChoiceValid(live(1, true), "ECHO_RANK"), true);
  const next = applyV21Draft(live(1, true), "ECHO_RANK");
  assert.equal(next.echoRank, 2);
  assert.equal(next.weaponSlotsUsed, 4);
});

test("ECHO bridge is monotonic I-V and rejects disabled, unowned, and Rank V", () => {
  let state: V21BuildState = live(1, true);
  for (let rank = 2; rank <= 5; rank += 1) {
    state = applyV21Draft(state, "ECHO_RANK");
    assert.equal(state.echoRank, rank);
    assert.equal(state.weaponSlotsUsed, 4);
  }
  assert.equal(isV21DraftChoiceValid(state, "ECHO_RANK"), false);
  assert.throws(() => applyV21Draft(state, "ECHO_RANK"), /already rank V/u);
  assert.throws(() => applyV21Draft({ ...live(1, true), echoOwned: false }, "ECHO_RANK"), /before acquisition/u);
  assert.throws(() => applyV21Draft(live(1, false), "ECHO_RANK"), /not enabled/u);
});

test("legacy draft remains unchanged when ECHO rank bridge is disabled", () => {
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
    weaponSlotsUsed: 1,
    weaponSlotCap: 4,
  };
  assert.deepEqual(buildV21Draft(13699, 2, legacy).map(c => c.id), ["ORBIT_NODES", "VECTOR_NEEDLE", "DELTA_RANK"]);
  assert.equal(buildV21Draft(13699, 3, legacy).map(c => c.id).includes("ECHO_MINE"), true);
});

test("live ECHO rank transition matches normalized V2-3 next-rank semantics", () => {
  for (let rank = 1; rank < 5; rank += 1) {
    const normalized: V23BuildState = {
      weapons: {
        DELTA: { rank: 5, evolved: false },
        VECTOR: { rank: 1, evolved: false },
        ORBIT: { rank: 1, evolved: false },
        ECHO: { rank, evolved: false },
      },
      protocols: {},
      evolutionCores: 0,
      refracts: 1,
      rerollNonce: 0,
      hp: 80,
      maxHp: 100,
      pickupRadius: 111,
    };
    const candidate = enumerateV23ACandidates(9, normalized).find(c => c.candidateId === `WEAPON_RANK:ECHO:${rank}->${rank + 1}`);
    assert.ok(candidate);
    const normalizedNext = applyV23ACandidate(normalized, candidate);
    const liveNext = applyV21Draft(live(rank, true), "ECHO_RANK");
    assert.equal(normalizedNext.weapons.ECHO?.rank, liveNext.echoRank);
  }
});
