import assert from "node:assert/strict";
import test from "node:test";
import { buildCR2Draft, enumerateCR2DraftCandidates } from "../src/cr2-draft-core.ts";
import {
  applyCR2CandidateToLive,
  buildCR2StateFromLive,
  grantCR2CoreToLive,
  projectCR2StateToLive,
  restoreCR2RefractToLive,
  type CR2LiveSnapshot,
} from "../src/cr2-live-state-core.ts";

const SEED = 13699;

function initialSnapshot(overrides: Partial<CR2LiveSnapshot> = {}): CR2LiveSnapshot {
  return {
    deltaRank: 1,
    vectorOwned: false,
    vectorRank: 1,
    orbitOwned: false,
    orbitRank: 1,
    echoOwned: false,
    echoRank: 1,
    signalOwned: false,
    signalRank: 1,
    evolvedWeapons: { DELTA: false },
    protocols: {},
    evolutionCores: 0,
    refracts: 1,
    rerollNonce: 0,
    hp: 100,
    maxHp: 100,
    pickupRadius: 76,
    weaponSlotsUsed: 1,
    ...overrides,
  };
}

function snapshotFields(projection: ReturnType<typeof projectCR2StateToLive>): CR2LiveSnapshot {
  const { protocolSlotsUsed: _protocolSlotsUsed, ...snapshot } = projection;
  return snapshot;
}

test("CR-2 live bridge round-trips the inherited initial survival state without drift", () => {
  const before = initialSnapshot();
  const normalized = buildCR2StateFromLive(before);
  const after = projectCR2StateToLive(normalized);
  assert.deepEqual(snapshotFields(after), before);
  assert.equal(after.protocolSlotsUsed, 0);
});

test("CR-2 live bridge round-trips a four-weapon ranked state with Protocol/Core/REFRACT history", () => {
  const before = initialSnapshot({
    deltaRank: 5,
    orbitOwned: true,
    orbitRank: 4,
    echoOwned: true,
    echoRank: 3,
    signalOwned: true,
    signalRank: 2,
    evolvedWeapons: { DELTA: false, ORBIT: false, ECHO: false, SIGNAL: false },
    protocols: { COMMON_CORE: 2, ORBIT_STABILIZER: 1, MEMORY_FUSE: 3 },
    evolutionCores: 2,
    refracts: 0,
    rerollNonce: 1,
    hp: 47,
    pickupRadius: 146,
    weaponSlotsUsed: 4,
  });
  const after = projectCR2StateToLive(buildCR2StateFromLive(before));
  assert.deepEqual(snapshotFields(after), before);
  assert.equal(after.protocolSlotsUsed, 3);
});

test("CR-2 live bridge rejects weapon-slot drift instead of silently repairing it", () => {
  const drifted = initialSnapshot({ orbitOwned: true, orbitRank: 1, weaponSlotsUsed: 1 });
  assert.throws(() => buildCR2StateFromLive(drifted), /Live weapon slot count drift/u);
});

test("CR-2 live candidate bridge acquires Level-2 ORBIT without mutating Core/Protocol/REFRACT history", () => {
  const before = initialSnapshot({ hp: 83 });
  const draft = buildCR2Draft(SEED, 2, buildCR2StateFromLive(before));
  const orbit = draft.choices.find(choice => choice.candidateId === "WEAPON_ACQUIRE:ORBIT");
  assert.ok(orbit);
  const after = applyCR2CandidateToLive(before, orbit);
  assert.equal(after.orbitOwned, true);
  assert.equal(after.orbitRank, 1);
  assert.equal(after.weaponSlotsUsed, 2);
  assert.equal(after.evolutionCores, before.evolutionCores);
  assert.deepEqual(after.protocols, before.protocols);
  assert.equal(after.refracts, before.refracts);
  assert.equal(after.rerollNonce, before.rerollNonce);
  assert.equal(after.hp, before.hp);
});

test("CR-2 live candidate bridge acquires a Level-5 Protocol without changing weapon state", () => {
  const before = initialSnapshot({
    orbitOwned: true,
    echoOwned: true,
    signalOwned: true,
    evolvedWeapons: { DELTA: false, ORBIT: false, ECHO: false, SIGNAL: false },
    weaponSlotsUsed: 4,
  });
  const state = buildCR2StateFromLive(before);
  const protocol = enumerateCR2DraftCandidates(5, state).find(choice => choice.candidateId === "PROTOCOL_ACQUIRE:COMMON_CORE");
  assert.ok(protocol);
  const after = applyCR2CandidateToLive(before, protocol);
  assert.equal(after.protocols.COMMON_CORE, 1);
  assert.equal(after.protocolSlotsUsed, 1);
  assert.equal(after.weaponSlotsUsed, 4);
  assert.equal(after.deltaRank, before.deltaRank);
  assert.equal(after.orbitRank, before.orbitRank);
  assert.equal(after.echoRank, before.echoRank);
  assert.equal(after.signalRank, before.signalRank);
  assert.equal(after.evolutionCores, before.evolutionCores);
});

test("CR-2 live Core grant changes only Core inventory", () => {
  const before = initialSnapshot({ hp: 71, pickupRadius: 111, refracts: 0, rerollNonce: 1 });
  const frozenCopy = structuredClone(before);
  const after = grantCR2CoreToLive(before, 2);
  assert.equal(after.evolutionCores, 2);
  assert.equal(after.refracts, before.refracts);
  assert.equal(after.rerollNonce, before.rerollNonce);
  assert.equal(after.hp, before.hp);
  assert.equal(after.pickupRadius, before.pickupRadius);
  assert.deepEqual(after.protocols, before.protocols);
  assert.equal(after.weaponSlotsUsed, before.weaponSlotsUsed);
  assert.deepEqual(before, frozenCopy, "bridge may not mutate caller snapshot");
});

test("CR-2 live REFRACT restore is bounded and preserves every non-REFRACT field", () => {
  const before = initialSnapshot({ evolutionCores: 1, refracts: 0, rerollNonce: 3, hp: 61 });
  const after = restoreCR2RefractToLive(before);
  assert.equal(after.refracts, 1);
  assert.equal(after.rerollNonce, 3);
  assert.equal(after.evolutionCores, 1);
  assert.equal(after.hp, 61);
  assert.equal(after.weaponSlotsUsed, 1);
  assert.deepEqual(after.protocols, {});
  assert.equal(restoreCR2RefractToLive(snapshotFields(after)).refracts, 1);
});

test("CR-2 live Evolution consumes one Core and preserves rank, slots, HP, Protocol and reroll history", () => {
  const before = initialSnapshot({
    deltaRank: 5,
    protocols: { COMMON_CORE: 1 },
    evolutionCores: 1,
    refracts: 0,
    rerollNonce: 2,
    hp: 54,
    pickupRadius: 146,
  });
  const state = buildCR2StateFromLive(before);
  const draft = buildCR2Draft(SEED, 12, state);
  const evolution = draft.choices.find(choice => choice.candidateId === "EVOLUTION:DELTA:RECONSTRUCTION_FIELD");
  assert.ok(evolution);
  const after = applyCR2CandidateToLive(before, evolution);
  assert.equal(after.evolvedWeapons.DELTA, true);
  assert.equal(after.deltaRank, 5);
  assert.equal(after.evolutionCores, 0);
  assert.equal(after.weaponSlotsUsed, 1);
  assert.equal(after.protocolSlotsUsed, 1);
  assert.equal(after.protocols.COMMON_CORE, 1);
  assert.equal(after.refracts, 0);
  assert.equal(after.rerollNonce, 2);
  assert.equal(after.hp, 54);
  assert.equal(after.pickupRadius, 146);
});

test("CR-2 live projection keeps unowned families unowned while exposing safe rank-one placeholders", () => {
  const after = projectCR2StateToLive(buildCR2StateFromLive(initialSnapshot()));
  assert.equal(after.vectorOwned, false);
  assert.equal(after.vectorRank, 1);
  assert.equal(after.orbitOwned, false);
  assert.equal(after.orbitRank, 1);
  assert.equal(after.echoOwned, false);
  assert.equal(after.echoRank, 1);
  assert.equal(after.signalOwned, false);
  assert.equal(after.signalRank, 1);
  assert.equal(after.evolvedWeapons.VECTOR, undefined);
  assert.equal(after.evolvedWeapons.ORBIT, undefined);
  assert.equal(after.evolvedWeapons.ECHO, undefined);
  assert.equal(after.evolvedWeapons.SIGNAL, undefined);
});
