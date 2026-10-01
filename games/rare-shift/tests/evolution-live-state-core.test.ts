import assert from "node:assert/strict";
import test from "node:test";
import { enumerateCR2DraftCandidates } from "../src/cr2-draft-core.ts";
import { buildCR2StateFromLive, type CR2LiveSnapshot } from "../src/cr2-live-state-core.ts";
import {
  applyEvolutionCandidateToLive,
  cloneEvolutionRuntimeHistory,
  type EvolutionRuntimeHistorySnapshot,
} from "../src/evolution-live-state-core.ts";
import type { V23ProtocolFamily, V23WeaponFamily } from "../src/progression-core.ts";

const MATCHING_PROTOCOL: Readonly<Record<V23WeaponFamily, V23ProtocolFamily>> = Object.freeze({
  DELTA: "COMMON_CORE",
  VECTOR: "VECTOR_LENS",
  ORBIT: "ORBIT_STABILIZER",
  ECHO: "MEMORY_FUSE",
  SIGNAL: "RESONANCE_COIL",
});

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
    evolvedWeapons: { DELTA: false },
    protocols: {},
    evolutionCores: 0,
    refracts: 1,
    rerollNonce: 2,
    hp: 63,
    maxHp: 100,
    pickupRadius: 146,
    weaponSlotsUsed: 1,
    ...overrides,
  };
}

function evolutionReadySnapshot(family: V23WeaponFamily): CR2LiveSnapshot {
  const protocol = MATCHING_PROTOCOL[family];
  const common = {
    protocols: { [protocol]: 1 },
    evolutionCores: 2,
  } as Partial<CR2LiveSnapshot>;
  if (family === "DELTA") return snapshot({ ...common, deltaRank: 5, evolvedWeapons: { DELTA: false } });
  if (family === "VECTOR") return snapshot({
    ...common,
    vectorOwned: true,
    vectorRank: 5,
    weaponSlotsUsed: 2,
    evolvedWeapons: { DELTA: false, VECTOR: false },
  });
  if (family === "ORBIT") return snapshot({
    ...common,
    orbitOwned: true,
    orbitRank: 5,
    weaponSlotsUsed: 2,
    evolvedWeapons: { DELTA: false, ORBIT: false },
  });
  if (family === "ECHO") return snapshot({
    ...common,
    echoOwned: true,
    echoRank: 5,
    weaponSlotsUsed: 2,
    evolvedWeapons: { DELTA: false, ECHO: false },
  });
  return snapshot({
    ...common,
    signalOwned: true,
    signalRank: 5,
    weaponSlotsUsed: 2,
    evolvedWeapons: { DELTA: false, SIGNAL: false },
  });
}

function combatHistory(): EvolutionRuntimeHistorySnapshot {
  return {
    runSeed: 13699,
    phase: "B",
    level: 12,
    xp: 41,
    elapsedActiveMs: 181_250,
    delta: {
      attackAccumulatorMs: 511,
      echoLastScheduledAtMs: 180_900,
      pendingEcho: { phase: "A", scheduledAtMs: 181_180 },
    },
    vector: {
      accumulatorMs: 617,
      targetId: 77,
      targetKind: "TRACE",
      transferState: { armed: true, expiresAtMs: 181_900, phase: "B" },
      lockState: { targetId: 77, stacks: 3 },
      activeProjectileCount: 2,
    },
    orbit: {
      angle: 5.8123,
      lastShiftAnchor: 5.7123,
      lastHitAt: [
        { targetId: 31, atMs: 180_500 },
        { targetId: 44, atMs: 180_820 },
      ],
      shearLastEmittedAtMs: 180_700,
    },
    echo: {
      placementAccumulatorMs: 1_277,
      nextId: 19,
      mines: [
        {
          id: 17,
          x: 420,
          y: 260,
          recordedPhase: "A",
          createdAtMs: 174_000,
          state: "RETURN_READY",
          returnedAtMs: 180_400,
          memoryDepth: 2,
          lastDepthIncrementAtMs: 180_400,
        },
        {
          id: 18,
          x: 498,
          y: 312,
          recordedPhase: "B",
          createdAtMs: 176_000,
          state: "ARMED_AWAY",
          returnedAtMs: null,
          memoryDepth: 1,
          lastDepthIncrementAtMs: 179_000,
        },
      ],
      burstLedger: [
        { targetId: 31, hitTimesMs: [181_010, 181_100] },
        { targetId: 44, hitTimesMs: [181_090] },
      ],
    },
    signal: {
      accumulatorMs: 944,
      lastCastPhase: "B",
      lastChainIds: [31, 44, 52],
      lastChainKinds: ["TRACE", "SPLIT_B", "ANCHOR"],
      lastChainDamage: [10, 9, 8],
      lastChainEdgeRanges: [420, 180, 180],
      lastChainCommonBonus: [false, true, false],
      lastChainForwardDegrees: [2, 1, 0],
    },
  };
}

function evolutionCandidate(family: V23WeaponFamily, before: CR2LiveSnapshot) {
  const state = buildCR2StateFromLive(before);
  const candidate = enumerateCR2DraftCandidates(12, state).find(item => (
    item.candidateType === "EVOLUTION" && item.familyId === family
  ));
  assert.ok(candidate, `${family} must expose its legal Evolution candidate`);
  return candidate;
}

test("EV-2 continuity snapshot deep-clones all mutable combat-history collections", () => {
  const ids = [31, 44, 52];
  const ledgerTimes = [181_010, 181_100];
  const source = combatHistory();
  const mutable = {
    ...source,
    signal: { ...source.signal, lastChainIds: ids },
    echo: {
      ...source.echo,
      burstLedger: [
        { targetId: 31, hitTimesMs: ledgerTimes },
        { targetId: 44, hitTimesMs: [181_090] },
      ],
    },
  } satisfies EvolutionRuntimeHistorySnapshot;
  const frozen = cloneEvolutionRuntimeHistory(mutable);
  ids.push(99);
  ledgerTimes.push(181_200);
  assert.deepEqual(frozen.signal.lastChainIds, [31, 44, 52]);
  assert.deepEqual(frozen.echo.burstLedger[0]?.hitTimesMs, [181_010, 181_100]);
  assert.notStrictEqual(frozen.vector.transferState, mutable.vector.transferState);
  assert.notStrictEqual(frozen.vector.lockState, mutable.vector.lockState);
  assert.notStrictEqual(frozen.echo.mines[0], mutable.echo.mines[0]);
});

test("EV-2 Evolution selection preserves combat history exactly for all five families", () => {
  const families: readonly V23WeaponFamily[] = ["DELTA", "VECTOR", "ORBIT", "ECHO", "SIGNAL"];
  for (const family of families) {
    const before = evolutionReadySnapshot(family);
    const history = combatHistory();
    const expectedHistory = cloneEvolutionRuntimeHistory(history);
    const candidate = evolutionCandidate(family, before);
    const result = applyEvolutionCandidateToLive(before, history, candidate);

    assert.equal(result.selected.candidateType, "EVOLUTION");
    assert.equal(result.selected.familyId, family);
    assert.equal(result.projection.evolvedWeapons[family], true);
    assert.equal(result.projection.evolutionCores, 1, `${family} must consume exactly one of two Cores`);
    assert.equal(result.projection.hp, before.hp);
    assert.equal(result.projection.maxHp, before.maxHp);
    assert.equal(result.projection.pickupRadius, before.pickupRadius);
    assert.equal(result.projection.weaponSlotsUsed, before.weaponSlotsUsed);
    assert.deepEqual(result.projection.protocols, before.protocols);
    assert.equal(result.projection.refracts, before.refracts);
    assert.equal(result.projection.rerollNonce, before.rerollNonce);
    assert.deepEqual(result.history, expectedHistory, `${family} may not rewrite scene-owned combat history on selection`);
  }
});

test("EV-2 selection preserves cooldown progress instead of granting immediate readiness", () => {
  const before = evolutionReadySnapshot("SIGNAL");
  const history = combatHistory();
  const result = applyEvolutionCandidateToLive(before, history, evolutionCandidate("SIGNAL", before));
  assert.equal(result.history.delta.attackAccumulatorMs, 511);
  assert.equal(result.history.vector.accumulatorMs, 617);
  assert.equal(result.history.echo.placementAccumulatorMs, 1_277);
  assert.equal(result.history.signal.accumulatorMs, 944);
  assert.equal(result.history.elapsedActiveMs, 181_250);
});

test("EV-2 preserves VECTOR transfer/lock, ORBIT angle, ECHO history and SIGNAL atomic graph", () => {
  const before = evolutionReadySnapshot("DELTA");
  const history = combatHistory();
  const result = applyEvolutionCandidateToLive(before, history, evolutionCandidate("DELTA", before));
  assert.deepEqual(result.history.vector.transferState, { armed: true, expiresAtMs: 181_900, phase: "B" });
  assert.deepEqual(result.history.vector.lockState, { targetId: 77, stacks: 3 });
  assert.equal(result.history.orbit.angle, 5.8123);
  assert.equal(result.history.orbit.lastShiftAnchor, 5.7123);
  assert.deepEqual(result.history.echo.mines, history.echo.mines);
  assert.deepEqual(result.history.echo.burstLedger, history.echo.burstLedger);
  assert.deepEqual(result.history.signal.lastChainIds, [31, 44, 52]);
  assert.deepEqual(result.history.signal.lastChainKinds, ["TRACE", "SPLIT_B", "ANCHOR"]);
  assert.deepEqual(result.history.signal.lastChainDamage, [10, 9, 8]);
  assert.deepEqual(result.history.signal.lastChainEdgeRanges, [420, 180, 180]);
  assert.deepEqual(result.history.signal.lastChainCommonBonus, [false, true, false]);
  assert.deepEqual(result.history.signal.lastChainForwardDegrees, [2, 1, 0]);
});

test("EV-2 bridge rejects non-Evolution choices and malformed atomic SIGNAL history", () => {
  const before = snapshot();
  const nonEvolution = enumerateCR2DraftCandidates(2, buildCR2StateFromLive(before)).find(item => item.candidateType !== "EVOLUTION");
  assert.ok(nonEvolution);
  assert.throws(
    () => applyEvolutionCandidateToLive(before, combatHistory(), nonEvolution),
    /accepts only an Evolution candidate/u,
  );

  const history = combatHistory();
  const malformed: EvolutionRuntimeHistorySnapshot = {
    ...history,
    signal: { ...history.signal, lastChainDamage: [10] },
  };
  assert.throws(() => cloneEvolutionRuntimeHistory(malformed), /atomic cast graph/u);
});
