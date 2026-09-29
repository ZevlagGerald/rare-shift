import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCR2Evolution,
  CR2_EVOLUTION_CONTRACTS,
  cr2EvolutionEligible,
  cr2ProtocolProfile,
  eligibleCR2EvolutionFamilies,
  grantCR2EvolutionCores,
  restoreCR2Refract,
} from "../src/cr2-progression-core.ts";
import {
  matchingProtocolForWeapon,
  validateV23BuildState,
  v23ProtocolSlotsUsed,
  v23WeaponSlotsUsed,
  V23_PROTOCOL_FAMILIES,
  V23_WEAPON_FAMILIES,
  type V23BuildState,
  type V23ProtocolFamily,
  type V23WeaponFamily,
} from "../src/progression-core.ts";

function stateForEvolution(family: V23WeaponFamily, input: {
  readonly cores?: number;
  readonly weaponRank?: number;
  readonly protocolRank?: number;
  readonly evolved?: boolean;
} = {}): V23BuildState {
  const weapons: V23BuildState["weapons"] = family === "DELTA"
    ? { DELTA: { rank: input.weaponRank ?? 5, evolved: input.evolved ?? false } }
    : {
        DELTA: { rank: 1, evolved: false },
        [family]: { rank: input.weaponRank ?? 5, evolved: input.evolved ?? false },
      };
  const protocol = matchingProtocolForWeapon(family);
  const protocols: Partial<Record<V23ProtocolFamily, number>> = {};
  if ((input.protocolRank ?? 1) > 0) protocols[protocol] = input.protocolRank ?? 1;
  const state: V23BuildState = {
    weapons,
    protocols,
    evolutionCores: input.cores ?? 1,
    refracts: 1,
    rerollNonce: 0,
    hp: 73,
    maxHp: 100,
    pickupRadius: 111,
  };
  validateV23BuildState(state);
  return state;
}

test("CR-2 Protocol profiles expose exactly five families with Rank I-III bounded identities", () => {
  for (const family of V23_PROTOCOL_FAMILIES) {
    const profiles = [1, 2, 3].map(rank => cr2ProtocolProfile(family, rank));
    assert.deepEqual(profiles.map(profile => profile.family), [family, family, family]);
    assert.deepEqual(profiles.map(profile => profile.rank), [1, 2, 3]);
    assert.throws(() => cr2ProtocolProfile(family, 0), /between I and III/u);
    assert.throws(() => cr2ProtocolProfile(family, 4), /between I and III/u);
  }
});

test("CR-2 Protocol tuning is monotonic and conservative without zero cooldown multipliers", () => {
  const common = [1, 2, 3].map(rank => cr2ProtocolProfile("COMMON_CORE", rank).effects);
  assert.deepEqual(common.map(p => p.deltaCooldownMultiplier), [0.97, 0.94, 0.90]);
  assert.deepEqual(common.map(p => p.deltaFieldScaleMultiplier), [1.02, 1.05, 1.08]);
  assert.deepEqual(common.map(p => p.deltaPostShiftStabilityMs), [0, 0, 120]);

  const vector = [1, 2, 3].map(rank => cr2ProtocolProfile("VECTOR_LENS", rank).effects);
  assert.deepEqual(vector.map(p => p.vectorProjectileSpeedMultiplier), [1.06, 1.12, 1.18]);
  assert.deepEqual(vector.map(p => p.vectorAcquisitionRangeMultiplier), [1.02, 1.05, 1.08]);

  const orbit = [1, 2, 3].map(rank => cr2ProtocolProfile("ORBIT_STABILIZER", rank).effects);
  assert.deepEqual(orbit.map(p => p.orbitContactIntervalMultiplier), [0.97, 0.94, 0.90]);
  assert.deepEqual(orbit.map(p => p.orbitRadiusMultiplier), [1.02, 1.04, 1.06]);

  const memory = [1, 2, 3].map(rank => cr2ProtocolProfile("MEMORY_FUSE", rank).effects);
  assert.deepEqual(memory.map(p => p.echoLifetimeMultiplier), [1.06, 1.12, 1.18]);
  assert.deepEqual(memory.map(p => p.echoReturnDelayMultiplier), [0.97, 0.94, 0.90]);

  const resonance = [1, 2, 3].map(rank => cr2ProtocolProfile("RESONANCE_COIL", rank).effects);
  assert.deepEqual(resonance.map(p => p.signalCooldownMultiplier), [0.97, 0.94, 0.90]);
  assert.deepEqual(resonance.map(p => p.signalRelayRangeBonus), [4, 8, 12]);
});

test("CR-2 Evolution contracts map all five weapons to their locked Protocol and evolved identity", () => {
  const expected = {
    DELTA: ["COMMON_CORE", "RECONSTRUCTION_FIELD"],
    VECTOR: ["VECTOR_LENS", "PRISM_LANCE"],
    ORBIT: ["ORBIT_STABILIZER", "SYNC_HALO"],
    ECHO: ["MEMORY_FUSE", "MEMORY_COLLAPSE"],
    SIGNAL: ["RESONANCE_COIL", "CHAIN_RESONANCE"],
  } as const;
  for (const family of V23_WEAPON_FAMILIES) {
    const contract = CR2_EVOLUTION_CONTRACTS[family];
    assert.equal(contract.requiredProtocol, expected[family][0]);
    assert.equal(contract.id, expected[family][1]);
    assert.equal(contract.requiredProtocol, matchingProtocolForWeapon(family));
    assert.equal(contract.coreCost, 1);
    assert.equal(contract.preservesWeaponSlot, true);
    assert.equal(contract.grantsImmediateAttack, false);
    assert.equal(contract.preservesRuntimeHistory, true);
  }
});

test("CR-2 evolution eligibility requires Rank V, matching Protocol, an unspent Core, and unevolved state", () => {
  for (const family of V23_WEAPON_FAMILIES) {
    assert.equal(cr2EvolutionEligible(stateForEvolution(family), family), true, family);
    assert.equal(cr2EvolutionEligible(stateForEvolution(family, { cores: 0 }), family), false, `${family}: core gate`);
    assert.equal(cr2EvolutionEligible(stateForEvolution(family, { weaponRank: 4 }), family), false, `${family}: Rank V gate`);
    assert.equal(cr2EvolutionEligible(stateForEvolution(family, { protocolRank: 0 }), family), false, `${family}: Protocol gate`);
    assert.equal(cr2EvolutionEligible(stateForEvolution(family, { evolved: true }), family), false, `${family}: one-time gate`);
  }
});

test("CR-2 Core grants change only deterministic Core inventory", () => {
  const before = stateForEvolution("DELTA", { cores: 0 });
  const after = grantCR2EvolutionCores(before, 2);
  assert.equal(after.evolutionCores, 2);
  assert.deepEqual(after.weapons, before.weapons);
  assert.deepEqual(after.protocols, before.protocols);
  assert.equal(after.refracts, before.refracts);
  assert.equal(after.rerollNonce, before.rerollNonce);
  assert.equal(after.hp, before.hp);
  assert.equal(after.pickupRadius, before.pickupRadius);
  assert.throws(() => grantCR2EvolutionCores(before, 0), /positive integer/u);
});

test("CR-2 all five controlled Evolution fixtures consume one Core and preserve build/history state", () => {
  for (const family of V23_WEAPON_FAMILIES) {
    const before = stateForEvolution(family, { cores: 2 });
    const weaponSlots = v23WeaponSlotsUsed(before);
    const protocolSlots = v23ProtocolSlotsUsed(before);
    const after = applyCR2Evolution(before, family);
    assert.equal(after.evolutionCores, 1, `${family}: exactly one Core consumed`);
    assert.equal(after.weapons[family]?.rank, 5, `${family}: Rank V preserved`);
    assert.equal(after.weapons[family]?.evolved, true, `${family}: evolved exactly once`);
    assert.equal(v23WeaponSlotsUsed(after), weaponSlots, `${family}: weapon slots stable`);
    assert.equal(v23ProtocolSlotsUsed(after), protocolSlots, `${family}: Protocol slots stable`);
    assert.deepEqual(after.protocols, before.protocols, `${family}: Protocol history stable`);
    assert.equal(after.refracts, before.refracts, `${family}: REFRACT history stable`);
    assert.equal(after.rerollNonce, before.rerollNonce, `${family}: reroll history stable`);
    assert.equal(after.hp, before.hp, `${family}: HP not fabricated`);
    assert.equal(after.pickupRadius, before.pickupRadius, `${family}: pickup history stable`);
  }
});

test("CR-2 Evolution application rejects every missing prerequisite and duplicate evolution", () => {
  for (const family of V23_WEAPON_FAMILIES) {
    assert.throws(() => applyCR2Evolution(stateForEvolution(family, { cores: 0 }), family), /Evolution Core/u);
    assert.throws(() => applyCR2Evolution(stateForEvolution(family, { weaponRank: 4 }), family), /Rank V/u);
    assert.throws(() => applyCR2Evolution(stateForEvolution(family, { protocolRank: 0 }), family), /Rank I\+/u);
    assert.throws(() => applyCR2Evolution(stateForEvolution(family, { evolved: true }), family), /already evolved/u);
  }
});

test("CR-2 multiple eligible Evolutions remain deterministic in stable weapon-family order", () => {
  const state: V23BuildState = {
    weapons: {
      DELTA: { rank: 5, evolved: false },
      VECTOR: { rank: 5, evolved: false },
      ORBIT: { rank: 5, evolved: false },
      ECHO: { rank: 1, evolved: false },
    },
    protocols: { COMMON_CORE: 1, VECTOR_LENS: 2, ORBIT_STABILIZER: 3, MEMORY_FUSE: 1 },
    evolutionCores: 2,
    refracts: 1,
    rerollNonce: 0,
    hp: 100,
    maxHp: 100,
    pickupRadius: 76,
  };
  assert.deepEqual(eligibleCR2EvolutionFamilies(state), ["DELTA", "VECTOR", "ORBIT"]);
  const evolved = applyCR2Evolution(state, "VECTOR");
  assert.deepEqual(eligibleCR2EvolutionFamilies(evolved), ["DELTA", "ORBIT"]);
  assert.equal(evolved.evolutionCores, 1);
});

test("CR-2 checkpoint REFRACT restore is bounded by cap and never creates a paid/power overflow", () => {
  const base = stateForEvolution("DELTA");
  const empty = { ...base, refracts: 0 };
  assert.equal(restoreCR2Refract(empty).refracts, 1);
  assert.equal(restoreCR2Refract(base).refracts, 1);
  assert.equal(restoreCR2Refract({ ...base, refracts: 1 }, 2).refracts, 2);
  assert.throws(() => restoreCR2Refract(base, 0), /positive integer/u);
});
