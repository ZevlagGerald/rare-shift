import assert from "node:assert/strict";
import test from "node:test";
import {
  applyV21Draft,
  buildV21Draft,
  isV21DraftChoiceValid,
  V22_ACTIVE_WEAPON_SLOT_CAP,
  type V21BuildState,
  type V21DraftId,
} from "../src/draft-core.ts";
import { ECHO_RANK_I } from "../src/echo-core.ts";
import { ORBIT_RANK_I } from "../src/orbit-core.ts";
import { SIGNAL_ARC_RANK_I } from "../src/signal-arc-core.ts";
import { V21_MAX_ACTIVE_ENEMIES } from "../src/survival-core.ts";
import { VECTOR_RANK_I } from "../src/vector-core.ts";

const OPTIONAL_WEAPONS = ["VECTOR_NEEDLE", "ORBIT_NODES", "ECHO_MINE", "SIGNAL_ARC"] as const;
type OptionalWeapon = typeof OPTIONAL_WEAPONS[number];

function baseState(): V21BuildState {
  return Object.freeze({
    deltaRank: 1,
    hp: 75,
    maxHp: 100,
    pickupRadius: 76,
    vectorEnabled: true,
    vectorOwned: false,
    orbitEnabled: true,
    orbitOwned: false,
    echoEnabled: true,
    echoOwned: false,
    signalEnabled: true,
    signalOwned: false,
    weaponSlotsUsed: 1,
    weaponSlotCap: V22_ACTIVE_WEAPON_SLOT_CAP,
  });
}

function permutationsOfThree(): readonly (readonly OptionalWeapon[])[] {
  const result: OptionalWeapon[][] = [];
  for (const first of OPTIONAL_WEAPONS) {
    for (const second of OPTIONAL_WEAPONS) {
      if (second === first) continue;
      for (const third of OPTIONAL_WEAPONS) {
        if (third === first || third === second) continue;
        result.push([first, second, third]);
      }
    }
  }
  return Object.freeze(result.map(sequence => Object.freeze(sequence)));
}

function ownedOptionalWeapons(state: V21BuildState): OptionalWeapon[] {
  const owned: OptionalWeapon[] = [];
  if (state.vectorOwned) owned.push("VECTOR_NEEDLE");
  if (state.orbitOwned) owned.push("ORBIT_NODES");
  if (state.echoOwned) owned.push("ECHO_MINE");
  if (state.signalOwned) owned.push("SIGNAL_ARC");
  return owned;
}

test("V2-2E enumerates all 24 ordered three-family acquisition paths", () => {
  const sequences = permutationsOfThree();
  assert.equal(sequences.length, 24);
  assert.equal(new Set(sequences.map(sequence => sequence.join(">"))).size, 24);
});

test("every ordered full-build path stops exactly at DELTA plus three optional weapons", () => {
  for (const [index, sequence] of permutationsOfThree().entries()) {
    let state = baseState();
    sequence.forEach((weapon, step) => {
      assert.equal(isV21DraftChoiceValid(state, weapon), true, `${sequence.join(">")} step ${step + 1} must be legal`);
      state = applyV21Draft(state, weapon);
      assert.equal(state.weaponSlotsUsed, step + 2, `${sequence.join(">")} must consume one slot per acquisition`);
    });

    assert.equal(state.weaponSlotsUsed, 4);
    assert.deepEqual(new Set(ownedOptionalWeapons(state)), new Set(sequence));

    const remaining = OPTIONAL_WEAPONS.find(weapon => !sequence.includes(weapon));
    assert.ok(remaining, "one optional family must remain excluded");
    assert.equal(isV21DraftChoiceValid(state, remaining), false, `${remaining} must be blocked at 4/4`);
    assert.throws(() => applyV21Draft(state, remaining), /No active weapon slot is available/u);

    const draft = buildV21Draft(0x5220 + index, 4, state);
    assert.equal(draft.some(choice => choice.id === remaining), false, "blocked fifth family must not be rendered");
    for (const choice of draft) assert.equal(isV21DraftChoiceValid(state, choice.id), true, `${choice.id} must remain actionable`);
  }
});

test("all four possible DELTA plus three-family full-build combinations are reachable", () => {
  const combinations = new Set<string>();
  for (const sequence of permutationsOfThree()) combinations.add([...sequence].sort().join("+"));
  assert.equal(combinations.size, 4);
  assert.deepEqual(combinations, new Set([
    ["VECTOR_NEEDLE", "ORBIT_NODES", "ECHO_MINE"].sort().join("+"),
    ["VECTOR_NEEDLE", "ORBIT_NODES", "SIGNAL_ARC"].sort().join("+"),
    ["VECTOR_NEEDLE", "ECHO_MINE", "SIGNAL_ARC"].sort().join("+"),
    ["ORBIT_NODES", "ECHO_MINE", "SIGNAL_ARC"].sort().join("+"),
  ]));
});

test("DELTA rank and utility upgrades never consume additional active weapon slots", () => {
  let state = baseState();
  state = applyV21Draft(state, "ORBIT_NODES");
  state = applyV21Draft(state, "ECHO_MINE");
  state = applyV21Draft(state, "SIGNAL_ARC");
  assert.equal(state.weaponSlotsUsed, 4);

  const before = state.weaponSlotsUsed;
  state = applyV21Draft(state, "DELTA_RANK");
  assert.equal(state.weaponSlotsUsed, before);
  state = applyV21Draft(state, "FIELD_REPAIR");
  assert.equal(state.weaponSlotsUsed, before);
  state = applyV21Draft(state, "SIGNAL_MAGNET");
  assert.equal(state.weaponSlotsUsed, before);
});

test("full-slot drafts remain actionable without leaking blocked weapon acquisitions", () => {
  let state = baseState();
  for (const weapon of ["VECTOR_NEEDLE", "ORBIT_NODES", "SIGNAL_ARC"] as const) state = applyV21Draft(state, weapon);
  assert.equal(state.weaponSlotsUsed, 4);
  const draft = buildV21Draft(0x22e, 6, state);
  assert.ok(draft.length >= 1 && draft.length <= 3);
  assert.equal(draft.some(choice => choice.id === "ECHO_MINE"), false);
  for (const choice of draft) assert.equal(isV21DraftChoiceValid(state, choice.id), true);
});

test("Rank-I cross-weapon runtime surfaces are all hard bounded", () => {
  assert.equal(V22_ACTIVE_WEAPON_SLOT_CAP, 4);
  assert.equal(VECTOR_RANK_I.maxInFlight, 2);
  assert.equal(ORBIT_RANK_I.nodeCount, 1);
  assert.equal(ECHO_RANK_I.maxActive, 3);
  assert.equal(SIGNAL_ARC_RANK_I.maxTargets, 3);
  assert.ok(V21_MAX_ACTIVE_ENEMIES > 0 && V21_MAX_ACTIVE_ENEMIES <= 64);

  // Worst persistent optional-weapon object pool among any legal three-family build:
  // VECTOR projectiles (2) + ORBIT node (1) + ECHO mines (3) = 6.
  // SIGNAL ARC builds an ephemeral path capped at three and owns no projectile pool.
  const persistentOptionalObjectCap = VECTOR_RANK_I.maxInFlight + ORBIT_RANK_I.nodeCount + ECHO_RANK_I.maxActive;
  assert.equal(persistentOptionalObjectCap, 6);
});

test("representative level-4 full-build route offers three real choices before final slot is consumed", () => {
  let state = baseState();
  state = applyV21Draft(state, "ORBIT_NODES");
  state = applyV21Draft(state, "ECHO_MINE");
  assert.equal(state.weaponSlotsUsed, 3);

  const draft = buildV21Draft(0x522e, 4, state);
  assert.equal(draft.length, 3);
  assert.equal(new Set(draft.map(choice => choice.id)).size, 3);
  assert.equal(draft.some(choice => choice.id === "SIGNAL_ARC"), true);
  assert.equal(draft.some(choice => choice.id === "VECTOR_NEEDLE"), true);
  for (const choice of draft) assert.equal(isV21DraftChoiceValid(state, choice.id as V21DraftId), true);
});
