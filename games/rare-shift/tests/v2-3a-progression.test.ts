import assert from "node:assert/strict";
import test from "node:test";
import {
  applyV23ACandidate,
  buildV23ADraft,
  buildV23AFallbackDraft,
  createV23InitialBuildState,
  enumerateV23ACandidates,
  matchingProtocolForWeapon,
  useV23ARefract,
  validateV23BuildState,
  v23ProtocolSlotsUsed,
  v23WeaponSlotsUsed,
  V23_PROTOCOL_MAX_RANK,
  V23_PROTOCOL_SLOT_CAP,
  V23_WEAPON_MAX_RANK,
  V23_WEAPON_SLOT_CAP,
  type V23BuildState,
  type V23DraftCandidate,
  type V23ProtocolFamily,
  type V23WeaponFamily,
} from "../src/progression-core.ts";

const SEED = 13699;

function candidate(state: V23BuildState, level: number, id: string): V23DraftCandidate {
  const found = enumerateV23ACandidates(level, state).find(item => item.candidateId === id);
  assert.ok(found, `expected candidate ${id}`);
  return found;
}

function applyById(state: V23BuildState, level: number, id: string): V23BuildState {
  return applyV23ACandidate(state, candidate(state, level, id));
}

function stateWithFourWeapons(): V23BuildState {
  let state = createV23InitialBuildState({ hp: 100, pickupRadius: 220 });
  state = applyById(state, 2, "WEAPON_ACQUIRE:ORBIT");
  state = applyById(state, 3, "WEAPON_ACQUIRE:ECHO");
  state = applyById(state, 4, "WEAPON_ACQUIRE:SIGNAL");
  return state;
}

function stateWithFourProtocols(): V23BuildState {
  let state = stateWithFourWeapons();
  for (const family of ["COMMON_CORE", "VECTOR_LENS", "ORBIT_STABILIZER", "MEMORY_FUSE"] as const) {
    state = applyById(state, 5, `PROTOCOL_ACQUIRE:${family}`);
  }
  return state;
}

test("V2-3A initial state locks DELTA slot one and one free REFRACT", () => {
  const state = createV23InitialBuildState();
  assert.deepEqual(state.weapons.DELTA, { rank: 1, evolved: false });
  assert.equal(v23WeaponSlotsUsed(state), 1);
  assert.equal(v23ProtocolSlotsUsed(state), 0);
  assert.equal(state.refracts, 1);
  assert.equal(state.rerollNonce, 0);
  validateV23BuildState(state);
});

test("level 2 preserves the qualified ORBIT VECTOR DELTA learning surface", () => {
  const draft = buildV23ADraft(SEED, 2, createV23InitialBuildState());
  assert.deepEqual(draft.choices.map(choice => choice.candidateId), [
    "WEAPON_ACQUIRE:ORBIT",
    "WEAPON_ACQUIRE:VECTOR",
    "WEAPON_RANK:DELTA:1->2",
  ]);
  assert.equal(draft.choices.length, 3);
});

test("level 3 guarantees ECHO introduction while level 4 guarantees SIGNAL when a slot remains", () => {
  let state = createV23InitialBuildState({ hp: 100, pickupRadius: 220 });
  state = applyById(state, 2, "WEAPON_ACQUIRE:ORBIT");
  const level3 = buildV23ADraft(SEED, 3, state);
  assert.equal(level3.choices[0].candidateId, "WEAPON_ACQUIRE:ECHO");
  state = applyById(state, 3, "WEAPON_ACQUIRE:ECHO");
  const level4 = buildV23ADraft(SEED, 4, state);
  assert.equal(level4.choices[0].candidateId, "WEAPON_ACQUIRE:SIGNAL");
});

test("Protocols are absent before level 5 and appear at level 5", () => {
  const state = stateWithFourWeapons();
  assert.equal(enumerateV23ACandidates(4, state).some(choice => choice.candidateType.startsWith("PROTOCOL")), false);
  const atFive = enumerateV23ACandidates(5, state);
  assert.equal(atFive.filter(choice => choice.candidateType === "PROTOCOL_ACQUIRE").length, 5);
});

test("normal production draft is exactly three distinct legal state-changing candidates", () => {
  const state = stateWithFourWeapons();
  const draft = buildV23ADraft(SEED, 5, state);
  assert.equal(draft.choices.length, 3);
  assert.equal(new Set(draft.choices.map(choice => choice.candidateId)).size, 3);
  for (const choice of draft.choices) assert.notDeepEqual(applyV23ACandidate(state, choice), state, choice.candidateId);
});

test("same seed level state and nonce produce the same ordered triple", () => {
  const state = stateWithFourWeapons();
  const a = buildV23ADraft(SEED, 9, state);
  const b = buildV23ADraft(SEED, 9, state);
  assert.deepEqual(a, b);
});

test("REFRACT consumes exactly one reroll and changes the triple when alternatives exist", () => {
  const state = stateWithFourWeapons();
  const before = buildV23ADraft(SEED, 6, state);
  assert.ok(before.legalCandidateCount >= 4);
  const refracted = useV23ARefract(SEED, 6, state);
  assert.equal(refracted.state.refracts, 0);
  assert.equal(refracted.state.rerollNonce, 1);
  assert.notDeepEqual(
    refracted.draft.choices.map(choice => choice.candidateId),
    before.choices.map(choice => choice.candidateId),
  );
  assert.throws(() => useV23ARefract(SEED, 6, refracted.state), /No REFRACT/u);
});

test("weapon ranks advance one step only through Rank V and never create V to V", () => {
  let state = stateWithFourWeapons();
  for (let from = 1; from < V23_WEAPON_MAX_RANK; from += 1) {
    const id = `WEAPON_RANK:DELTA:${from}->${from + 1}`;
    state = applyById(state, 8 + from, id);
    assert.equal(state.weapons.DELTA?.rank, from + 1);
  }
  assert.equal(enumerateV23ACandidates(20, state).some(item => item.candidateId.startsWith("WEAPON_RANK:DELTA:")), false);
  assert.equal(state.weapons.DELTA?.rank, 5);
});

test("four active slots are hard-capped while owned weapon ranks remain legal", () => {
  const state = stateWithFourWeapons();
  assert.equal(v23WeaponSlotsUsed(state), V23_WEAPON_SLOT_CAP);
  assert.equal(enumerateV23ACandidates(10, state).some(item => item.candidateType === "WEAPON_ACQUIRE"), false);
  assert.equal(enumerateV23ACandidates(10, state).some(item => item.candidateType === "WEAPON_RANK"), true);
});

test("Protocols use the accepted I to III model and never consume extra slots when ranked", () => {
  let state = stateWithFourWeapons();
  state = applyById(state, 5, "PROTOCOL_ACQUIRE:COMMON_CORE");
  assert.equal(v23ProtocolSlotsUsed(state), 1);
  state = applyById(state, 6, "PROTOCOL_RANK:COMMON_CORE:1->2");
  assert.equal(v23ProtocolSlotsUsed(state), 1);
  state = applyById(state, 7, "PROTOCOL_RANK:COMMON_CORE:2->3");
  assert.equal(state.protocols.COMMON_CORE, V23_PROTOCOL_MAX_RANK);
  assert.equal(v23ProtocolSlotsUsed(state), 1);
  assert.equal(enumerateV23ACandidates(8, state).some(item => item.candidateId.startsWith("PROTOCOL_RANK:COMMON_CORE:")), false);
});

test("four Protocol slots block new acquisitions but preserve legal Protocol ranks", () => {
  const state = stateWithFourProtocols();
  assert.equal(v23ProtocolSlotsUsed(state), V23_PROTOCOL_SLOT_CAP);
  const legal = enumerateV23ACandidates(10, state);
  assert.equal(legal.some(item => item.candidateType === "PROTOCOL_ACQUIRE"), false);
  assert.equal(legal.some(item => item.candidateType === "PROTOCOL_RANK"), true);
});

test("Protocol ownership is independent of active weapon ownership", () => {
  let state = stateWithFourWeapons();
  assert.equal(state.weapons.VECTOR, undefined);
  state = applyById(state, 5, "PROTOCOL_ACQUIRE:VECTOR_LENS");
  assert.equal(state.protocols.VECTOR_LENS, 1);
  assert.equal(matchingProtocolForWeapon("VECTOR"), "VECTOR_LENS");
});

test("no-op utilities are removed before deterministic selection", () => {
  const full = stateWithFourWeapons();
  assert.equal(full.hp, 100);
  assert.equal(full.pickupRadius, 220);
  const ids = enumerateV23ACandidates(10, full).map(item => item.candidateId);
  assert.equal(ids.includes("UTILITY:FIELD_REPAIR"), false);
  assert.equal(ids.includes("UTILITY:SIGNAL_MAGNET"), false);

  const actionable = createV23InitialBuildState({ hp: 50, pickupRadius: 76 });
  const actionableIds = enumerateV23ACandidates(5, actionable).map(item => item.candidateId);
  assert.equal(actionableIds.includes("UTILITY:FIELD_REPAIR"), true);
  assert.equal(actionableIds.includes("UTILITY:SIGNAL_MAGNET"), true);
});

test("V2-3A does not enumerate Evolution before V2-3D Core logic", () => {
  let state = stateWithFourWeapons();
  for (let rank = 1; rank < 5; rank += 1) state = applyById(state, 10 + rank, `WEAPON_RANK:DELTA:${rank}->${rank + 1}`);
  state = applyById(state, 15, "PROTOCOL_ACQUIRE:COMMON_CORE");
  const coreBearing: V23BuildState = Object.freeze({ ...state, evolutionCores: 1 });
  validateV23BuildState(coreBearing);
  assert.equal(enumerateV23ACandidates(16, coreBearing).some(item => item.candidateType === "EVOLUTION"), false);
});

test("production progression stays at exactly three choices through level 30 without filler utilities", () => {
  let state = createV23InitialBuildState({ hp: 100, pickupRadius: 220 });
  for (let level = 2; level <= 30; level += 1) {
    const draft = buildV23ADraft(SEED, level, state);
    assert.equal(draft.choices.length, 3, `level ${level}`);
    assert.equal(draft.choices.some(choice => choice.candidateType === "UTILITY"), false, `level ${level}`);
    state = applyV23ACandidate(state, draft.choices[0]);
  }
  assert.equal(v23WeaponSlotsUsed(state), 4);
  assert.ok(v23ProtocolSlotsUsed(state) <= 4);
});

test("production draft fails loudly instead of rendering one fake final choice", () => {
  const exhausted: V23BuildState = Object.freeze({
    weapons: Object.freeze({
      DELTA: Object.freeze({ rank: 5, evolved: false }),
      ORBIT: Object.freeze({ rank: 5, evolved: false }),
      ECHO: Object.freeze({ rank: 5, evolved: false }),
      SIGNAL: Object.freeze({ rank: 5, evolved: false }),
    }),
    protocols: Object.freeze({
      COMMON_CORE: 3,
      VECTOR_LENS: 3,
      ORBIT_STABILIZER: 3,
      MEMORY_FUSE: 3,
    }),
    evolutionCores: 0,
    refracts: 0,
    rerollNonce: 1,
    hp: 100,
    maxHp: 100,
    pickupRadius: 220,
  });
  validateV23BuildState(exhausted);
  assert.throws(() => buildV23ADraft(SEED, 31, exhausted), /production draft exhausted/u);
  assert.deepEqual(buildV23AFallbackDraft(SEED, 31, exhausted).choices, []);
});

test("invalid over-cap and out-of-range progression states are rejected", () => {
  const base = createV23InitialBuildState();
  const fiveWeapons: V23BuildState = {
    ...base,
    weapons: {
      DELTA: { rank: 1, evolved: false },
      VECTOR: { rank: 1, evolved: false },
      ORBIT: { rank: 1, evolved: false },
      ECHO: { rank: 1, evolved: false },
      SIGNAL: { rank: 1, evolved: false },
    },
  };
  assert.throws(() => validateV23BuildState(fiveWeapons), /weapon slot cap/u);

  const badProtocols: V23BuildState = {
    ...base,
    protocols: { COMMON_CORE: 4 as number },
  };
  assert.throws(() => validateV23BuildState(badProtocols), /between I and III/u);
});

test("all five weapon to Protocol evolution pairings remain stable", () => {
  const expected: Readonly<Record<V23WeaponFamily, V23ProtocolFamily>> = {
    DELTA: "COMMON_CORE",
    VECTOR: "VECTOR_LENS",
    ORBIT: "ORBIT_STABILIZER",
    ECHO: "MEMORY_FUSE",
    SIGNAL: "RESONANCE_COIL",
  };
  for (const family of Object.keys(expected) as V23WeaponFamily[]) {
    assert.equal(matchingProtocolForWeapon(family), expected[family]);
  }
});
