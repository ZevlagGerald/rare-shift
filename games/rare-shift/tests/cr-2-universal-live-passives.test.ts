import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCR2ProtocolDraftChoiceToLive,
  buildCR2ProtocolDraftFromLive,
  resolveCR2PlayerProtocolRuntime,
} from "../src/cr2-live-tranche-core.ts";
import type { CR2LiveSnapshot } from "../src/cr2-live-state-core.ts";

function snapshot(overrides: Partial<CR2LiveSnapshot> = {}): CR2LiveSnapshot {
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
    evolvedWeapons: {},
    protocols: {},
    evolutionCores: 0,
    refracts: 1,
    rerollNonce: 0,
    hp: 70,
    maxHp: 100,
    pickupRadius: 76,
    weaponSlotsUsed: 1,
    ...overrides,
  };
}

test("unmatched live Protocols remain independently useful without acquiring their matching weapon", () => {
  const vectorOnly = snapshot({ protocols: { VECTOR_LENS: 1 } });
  assert.equal(vectorOnly.vectorOwned, false);
  assert.equal(resolveCR2PlayerProtocolRuntime(vectorOnly).moveSpeedMultiplier, 1.01);

  const orbitOnly = snapshot({ protocols: { ORBIT_STABILIZER: 1 } });
  assert.equal(orbitOnly.orbitOwned, false);
  assert.equal(resolveCR2PlayerProtocolRuntime(orbitOnly).contactInvulnBonusMs, 30);

  const memoryOnly = snapshot({ protocols: { MEMORY_FUSE: 1 } });
  assert.equal(memoryOnly.echoOwned, false);
  assert.equal(resolveCR2PlayerProtocolRuntime(memoryOnly).repairBonusHp, 2);

  const resonanceOnly = snapshot({ protocols: { RESONANCE_COIL: 1 } });
  assert.equal(resonanceOnly.signalOwned, false);
  const resonance = resolveCR2PlayerProtocolRuntime(resonanceOnly);
  assert.equal(resonance.pickupRadiusBonus, 4);
  assert.equal(resonance.pickupAttractionSpeedMultiplier, 1.03);
});

test("COMMON CORE remains useful in every valid live build through mandatory DELTA", () => {
  const live = snapshot({ protocols: { COMMON_CORE: 1 } });
  assert.equal(live.deltaRank, 1);
  assert.deepEqual(resolveCR2PlayerProtocolRuntime(live), {
    moveSpeedMultiplier: 1,
    contactInvulnBonusMs: 0,
    repairBonusHp: 0,
    pickupRadiusBonus: 0,
    pickupAttractionSpeedMultiplier: 1,
  });
});

test("MEMORY FUSE adds only its bounded bonus to a legitimate FIELD REPAIR draft selection", () => {
  const before = snapshot({
    protocols: { MEMORY_FUSE: 1 },
    hp: 40,
    refracts: 0,
  });

  let selectedSeed: number | null = null;
  for (let seed = 0; seed < 512; seed += 1) {
    const draft = buildCR2ProtocolDraftFromLive(seed, 5, before);
    if (draft.choices.some(candidate => candidate.candidateId === "UTILITY:FIELD_REPAIR")) {
      selectedSeed = seed;
      break;
    }
  }
  assert.notEqual(selectedSeed, null, "expected a deterministic seed exposing FIELD REPAIR");

  const result = applyCR2ProtocolDraftChoiceToLive(selectedSeed as number, 5, before, "UTILITY:FIELD_REPAIR");
  assert.equal(result.projection.hp, 67, "25 base repair + 2 MEMORY FUSE bonus");
  assert.deepEqual(result.projection.protocols, before.protocols);
  assert.equal(result.projection.weaponSlotsUsed, before.weaponSlotsUsed);
  assert.equal(result.projection.evolutionCores, before.evolutionCores);
  assert.equal(result.projection.refracts, before.refracts);
});

test("FIELD REPAIR remains exactly the inherited 25 HP without MEMORY FUSE", () => {
  const before = snapshot({ hp: 40, refracts: 0 });
  let selectedSeed: number | null = null;
  for (let seed = 0; seed < 512; seed += 1) {
    const draft = buildCR2ProtocolDraftFromLive(seed, 5, before);
    if (draft.choices.some(candidate => candidate.candidateId === "UTILITY:FIELD_REPAIR")) {
      selectedSeed = seed;
      break;
    }
  }
  assert.notEqual(selectedSeed, null);
  const result = applyCR2ProtocolDraftChoiceToLive(selectedSeed as number, 5, before, "UTILITY:FIELD_REPAIR");
  assert.equal(result.projection.hp, 65);
});
