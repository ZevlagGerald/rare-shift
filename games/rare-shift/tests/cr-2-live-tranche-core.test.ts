import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCR2CheckpointProgressionReward,
  applyCR2DraftChoiceToLive,
  applyCR2ProtocolDraftChoiceToLive,
  buildCR2DraftFromLive,
  buildCR2ProtocolDraftFromLive,
  collectCR2EvolutionCoreLive,
  resolveCR2DeltaProtocolRuntime,
  resolveCR2EchoProtocolRuntime,
  resolveCR2OrbitProtocolRuntime,
  resolveCR2SignalProtocolRuntime,
  resolveCR2VectorProtocolRuntime,
  useCR2ProtocolRefractFromLive,
  useCR2RefractFromLive,
} from "../src/cr2-live-tranche-core.ts";
import { buildEchoProfile } from "../src/echo-core.ts";
import { buildOrbitProfile } from "../src/orbit-core.ts";
import { buildDeltaProfile } from "../src/phase-combat-core.ts";
import { buildSignalArcProfile } from "../src/signal-arc-core.ts";
import { buildVectorProfile } from "../src/vector-core.ts";
import type { FrameRows } from "../src/types.ts";
import type { CR2LiveSnapshot } from "../src/cr2-live-state-core.ts";

const SEED = 13699;

function rows(active: readonly [number, number][]): FrameRows {
  const grid = Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => "."));
  for (const [x, y] of active) grid[y][x] = "#";
  return Object.freeze(grid.map(row => row.join("")));
}

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

test("live CR-2 draft preserves the inherited Level-2 onboarding triple", () => {
  const draft = buildCR2DraftFromLive(SEED, 2, snapshot());
  assert.deepEqual(draft.choices.map(choice => choice.candidateId), [
    "WEAPON_ACQUIRE:ORBIT",
    "WEAPON_ACQUIRE:VECTOR",
    "WEAPON_RANK:DELTA:1->2",
  ]);
});

test("live CR-2 draft exposes Protocol choices from Level 5 through the normalized state", () => {
  const draft = buildCR2DraftFromLive(SEED, 5, snapshot({ hp: 100, pickupRadius: 220 }));
  assert.ok(draft.legalCandidateCount >= 5);
  const allIds = draft.choices.map(choice => choice.candidateId).join("|");
  assert.ok(allIds.length > 0);
});

test("production compatibility draft exposes the same eligible Evolution after EV-3F runtime qualification", () => {
  const ready = snapshot({
    deltaRank: 5,
    protocols: { COMMON_CORE: 1 },
    evolutionCores: 1,
  });
  const full = buildCR2DraftFromLive(SEED, 12, ready);
  assert.equal(full.choices[0].candidateId, "EVOLUTION:DELTA:RECONSTRUCTION_FIELD");
  const production = buildCR2ProtocolDraftFromLive(SEED, 12, ready);
  assert.deepEqual(production, full);
});

test("live CR-2 selection rejects candidates outside the current deterministic triple", () => {
  assert.throws(
    () => applyCR2DraftChoiceToLive(SEED, 2, snapshot(), "PROTOCOL_ACQUIRE:COMMON_CORE"),
    /not present in the current legal triple/u,
  );
});

test("live CR-2 selection applies the chosen normalized candidate without slot drift", () => {
  const result = applyCR2DraftChoiceToLive(SEED, 2, snapshot(), "WEAPON_ACQUIRE:ORBIT");
  assert.equal(result.selected.familyId, "ORBIT");
  assert.equal(result.projection.orbitOwned, true);
  assert.equal(result.projection.orbitRank, 1);
  assert.equal(result.projection.weaponSlotsUsed, 2);
});

test("production compatibility selection applies a real Evolution with exact Core and continuity semantics", () => {
  const before = snapshot({
    deltaRank: 5,
    protocols: { COMMON_CORE: 1 },
    evolutionCores: 1,
    hp: 73,
    pickupRadius: 111,
    refracts: 1,
    rerollNonce: 4,
  });
  const candidateId = "EVOLUTION:DELTA:RECONSTRUCTION_FIELD";
  const applied = applyCR2ProtocolDraftChoiceToLive(SEED, 12, before, candidateId);
  assert.equal(applied.selected.candidateId, candidateId);
  assert.equal(applied.projection.evolvedWeapons.DELTA, true);
  assert.equal(applied.projection.evolutionCores, 0);
  assert.equal(applied.projection.deltaRank, 5);
  assert.equal(applied.projection.weaponSlotsUsed, before.weaponSlotsUsed);
  assert.deepEqual(applied.projection.protocols, before.protocols);
  assert.equal(applied.projection.hp, before.hp);
  assert.equal(applied.projection.pickupRadius, before.pickupRadius);
  assert.equal(applied.projection.refracts, before.refracts);
  assert.equal(applied.projection.rerollNonce, before.rerollNonce);
});

test("live Evolution Core collection mutates only Core inventory", () => {
  const before = snapshot({ hp: 41, pickupRadius: 111, refracts: 0 });
  const after = collectCR2EvolutionCoreLive(before);
  assert.equal(after.evolutionCores, 1);
  assert.equal(after.hp, before.hp);
  assert.equal(after.pickupRadius, before.pickupRadius);
  assert.equal(after.refracts, before.refracts);
  assert.equal(after.weaponSlotsUsed, before.weaponSlotsUsed);
});

test("CHECKPOINT_ELITE restores exactly one REFRACT up to cap only on a new claim", () => {
  const empty = snapshot({ refracts: 0 });
  assert.equal(applyCR2CheckpointProgressionReward(empty, "CHECKPOINT_ELITE", true).refracts, 1);
  assert.equal(applyCR2CheckpointProgressionReward(empty, "CHECKPOINT_ELITE", false).refracts, 0);
  assert.equal(applyCR2CheckpointProgressionReward(snapshot({ refracts: 1 }), "CHECKPOINT_ELITE", true).refracts, 1);
  assert.equal(applyCR2CheckpointProgressionReward(empty, "ELITE_I", true).refracts, 0);
  assert.equal(applyCR2CheckpointProgressionReward(empty, "ELITE_II", true).refracts, 0);
});

test("live REFRACT consumes one charge and produces a deterministic replacement triple", () => {
  const before = snapshot({ hp: 50, pickupRadius: 76, refracts: 1 });
  const initial = buildCR2DraftFromLive(SEED, 5, before);
  const rerolled = useCR2RefractFromLive(SEED, 5, before);
  assert.equal(rerolled.projection.refracts, 0);
  assert.equal(rerolled.projection.rerollNonce, 1);
  assert.notDeepEqual(rerolled.draft.choices.map(choice => choice.candidateId), initial.choices.map(choice => choice.candidateId));
  assert.deepEqual(useCR2RefractFromLive(SEED, 5, before), rerolled);
});

test("production compatibility REFRACT preserves Evolution priority deterministically", () => {
  const before = snapshot({
    deltaRank: 5,
    protocols: { COMMON_CORE: 1 },
    evolutionCores: 1,
    refracts: 1,
  });
  const rerolled = useCR2ProtocolRefractFromLive(SEED, 12, before);
  assert.equal(rerolled.projection.refracts, 0);
  assert.equal(rerolled.projection.rerollNonce, 1);
  assert.equal(rerolled.draft.choices[0].candidateId, "EVOLUTION:DELTA:RECONSTRUCTION_FIELD");
  assert.deepEqual(useCR2ProtocolRefractFromLive(SEED, 12, before), rerolled);
});

test("absent Protocols are exact combat-profile no-ops", () => {
  const live = snapshot();
  const a = rows([[2, 2], [7, 7]]);
  const b = rows([[13, 13], [7, 7]]);
  const delta = buildDeltaProfile(a, b, "A", 5);
  const vector = buildVectorProfile(5, true);
  const orbit = buildOrbitProfile(5);
  const echo = buildEchoProfile(5, 2);
  const signal = buildSignalArcProfile(5);
  assert.strictEqual(resolveCR2DeltaProtocolRuntime(delta, live).profile, delta);
  assert.strictEqual(resolveCR2VectorProtocolRuntime(vector, live).profile, vector);
  assert.strictEqual(resolveCR2OrbitProtocolRuntime(orbit, live), orbit);
  assert.strictEqual(resolveCR2EchoProtocolRuntime(echo, live), echo);
  assert.strictEqual(resolveCR2SignalProtocolRuntime(signal, live).profile, signal);
});

test("owned Rank-III Protocols resolve all five bounded combat adapters", () => {
  const live = snapshot({
    protocols: {
      COMMON_CORE: 3,
      VECTOR_LENS: 3,
      ORBIT_STABILIZER: 3,
      MEMORY_FUSE: 3,
    },
  });
  const signalLive = snapshot({ protocols: { RESONANCE_COIL: 3 } });
  const a = rows([[2, 2], [7, 7]]);
  const b = rows([[13, 13], [7, 7]]);
  const delta = buildDeltaProfile(a, b, "A", 5);
  const vector = buildVectorProfile(5, true);
  const orbit = buildOrbitProfile(5);
  const echo = buildEchoProfile(5, 2);
  const signal = buildSignalArcProfile(5);

  assert.ok(resolveCR2DeltaProtocolRuntime(delta, live).profile.cooldownMs < delta.cooldownMs);
  assert.ok(resolveCR2VectorProtocolRuntime(vector, live).profile.speed > vector.speed);
  assert.ok(resolveCR2OrbitProtocolRuntime(orbit, live).radius > orbit.radius);
  assert.ok(resolveCR2EchoProtocolRuntime(echo, live).lifetimeMs > echo.lifetimeMs);
  assert.ok(resolveCR2SignalProtocolRuntime(signal, signalLive).profile.relayRange > signal.relayRange);
});