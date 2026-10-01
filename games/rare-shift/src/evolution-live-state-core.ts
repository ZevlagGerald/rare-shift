import { applyCR2CandidateToLive, type CR2LiveProjection, type CR2LiveSnapshot } from "./cr2-live-state-core.ts";
import type { EchoMineCore } from "./echo-core.ts";
import type { V2EnemyKind } from "./phase-combat-core.ts";
import type { Phase } from "./types.ts";
import type { VectorLockState, VectorTransferState } from "./vector-core.ts";
import type { V23DraftCandidate, V23WeaponFamily } from "./progression-core.ts";

export interface EvolutionPendingDeltaEchoHistory {
  readonly phase: Phase;
  readonly scheduledAtMs: number;
}

export interface EvolutionTargetTimeEntry {
  readonly targetId: number;
  readonly atMs: number;
}

export interface EvolutionEchoLedgerEntry {
  readonly targetId: number;
  readonly hitTimesMs: readonly number[];
}

export interface EvolutionRuntimeHistorySnapshot {
  readonly runSeed: number;
  readonly phase: Phase;
  readonly level: number;
  readonly xp: number;
  readonly elapsedActiveMs: number;
  readonly delta: {
    readonly attackAccumulatorMs: number;
    readonly echoLastScheduledAtMs: number | null;
    readonly pendingEcho: EvolutionPendingDeltaEchoHistory | null;
  };
  readonly vector: {
    readonly accumulatorMs: number;
    readonly targetId: number | null;
    readonly targetKind: V2EnemyKind | null;
    readonly transferState: VectorTransferState;
    readonly lockState: VectorLockState;
    readonly activeProjectileCount: number;
  };
  readonly orbit: {
    readonly angle: number;
    readonly lastShiftAnchor: number | null;
    readonly lastHitAt: readonly EvolutionTargetTimeEntry[];
    readonly shearLastEmittedAtMs: number | null;
  };
  readonly echo: {
    readonly placementAccumulatorMs: number;
    readonly nextId: number;
    readonly mines: readonly EchoMineCore[];
    readonly burstLedger: readonly EvolutionEchoLedgerEntry[];
  };
  readonly signal: {
    readonly accumulatorMs: number;
    readonly lastCastPhase: Phase | null;
    readonly lastChainIds: readonly number[];
    readonly lastChainKinds: readonly V2EnemyKind[];
    readonly lastChainDamage: readonly number[];
    readonly lastChainEdgeRanges: readonly number[];
    readonly lastChainCommonBonus: readonly boolean[];
    readonly lastChainForwardDegrees: readonly (number | null)[];
  };
}

export interface EvolutionLiveSelection {
  readonly selected: V23DraftCandidate;
  readonly projection: CR2LiveProjection;
  readonly history: EvolutionRuntimeHistorySnapshot;
}

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be finite and non-negative.`);
}

function assertOptionalFiniteNonNegative(value: number | null, label: string): void {
  if (value !== null) assertFiniteNonNegative(value, label);
}

function freezeTargetTimes(entries: readonly EvolutionTargetTimeEntry[]): readonly EvolutionTargetTimeEntry[] {
  const seen = new Set<number>();
  const cloned = entries.map(entry => {
    if (!Number.isInteger(entry.targetId) || entry.targetId < 0) throw new Error("Evolution target-history IDs must be non-negative integers.");
    if (seen.has(entry.targetId)) throw new Error(`Duplicate Evolution target-history ID ${entry.targetId}.`);
    seen.add(entry.targetId);
    assertFiniteNonNegative(entry.atMs, "Evolution target-history time");
    return Object.freeze({ targetId: entry.targetId, atMs: entry.atMs });
  });
  return Object.freeze(cloned);
}

function freezeEchoLedger(entries: readonly EvolutionEchoLedgerEntry[]): readonly EvolutionEchoLedgerEntry[] {
  const seen = new Set<number>();
  const cloned = entries.map(entry => {
    if (!Number.isInteger(entry.targetId) || entry.targetId < 0) throw new Error("Evolution ECHO ledger target IDs must be non-negative integers.");
    if (seen.has(entry.targetId)) throw new Error(`Duplicate Evolution ECHO ledger target ID ${entry.targetId}.`);
    seen.add(entry.targetId);
    const hitTimesMs = entry.hitTimesMs.map(time => {
      assertFiniteNonNegative(time, "Evolution ECHO ledger hit time");
      return time;
    });
    return Object.freeze({ targetId: entry.targetId, hitTimesMs: Object.freeze(hitTimesMs) });
  });
  return Object.freeze(cloned);
}

function freezeMine(mine: EchoMineCore): EchoMineCore {
  if (!Number.isInteger(mine.id) || mine.id < 0) throw new Error("Evolution ECHO mine IDs must be non-negative integers.");
  assertFiniteNonNegative(mine.createdAtMs, "Evolution ECHO mine creation time");
  assertOptionalFiniteNonNegative(mine.returnedAtMs, "Evolution ECHO mine return time");
  assertOptionalFiniteNonNegative(mine.lastDepthIncrementAtMs, "Evolution ECHO depth time");
  return Object.freeze({ ...mine });
}

export function cloneEvolutionRuntimeHistory(history: EvolutionRuntimeHistorySnapshot): EvolutionRuntimeHistorySnapshot {
  if (!Number.isInteger(history.runSeed) || history.runSeed < 0) throw new Error("Evolution run seed must be a non-negative integer.");
  if (!Number.isInteger(history.level) || history.level < 1) throw new Error("Evolution level must be a positive integer.");
  assertFiniteNonNegative(history.xp, "Evolution XP");
  assertFiniteNonNegative(history.elapsedActiveMs, "Evolution elapsed time");

  assertFiniteNonNegative(history.delta.attackAccumulatorMs, "DELTA cooldown accumulator");
  assertOptionalFiniteNonNegative(history.delta.echoLastScheduledAtMs, "DELTA echo schedule time");
  if (history.delta.pendingEcho) assertFiniteNonNegative(history.delta.pendingEcho.scheduledAtMs, "DELTA pending echo time");

  assertFiniteNonNegative(history.vector.accumulatorMs, "VECTOR cooldown accumulator");
  if (history.vector.targetId !== null && (!Number.isInteger(history.vector.targetId) || history.vector.targetId < 0)) {
    throw new Error("VECTOR target ID must be null or a non-negative integer.");
  }
  if (!Number.isInteger(history.vector.activeProjectileCount) || history.vector.activeProjectileCount < 0) {
    throw new Error("VECTOR active projectile count must be a non-negative integer.");
  }

  if (!Number.isFinite(history.orbit.angle)) throw new Error("ORBIT angle must be finite.");
  if (history.orbit.lastShiftAnchor !== null && !Number.isFinite(history.orbit.lastShiftAnchor)) throw new Error("ORBIT last SHIFT anchor must be finite or null.");
  assertOptionalFiniteNonNegative(history.orbit.shearLastEmittedAtMs, "ORBIT shear time");

  assertFiniteNonNegative(history.echo.placementAccumulatorMs, "ECHO placement accumulator");
  if (!Number.isInteger(history.echo.nextId) || history.echo.nextId < 0) throw new Error("ECHO next ID must be a non-negative integer.");
  const mineIds = new Set<number>();
  const mines = history.echo.mines.map(mine => {
    const clone = freezeMine(mine);
    if (mineIds.has(clone.id)) throw new Error(`Duplicate Evolution ECHO mine ID ${clone.id}.`);
    mineIds.add(clone.id);
    return clone;
  });

  assertFiniteNonNegative(history.signal.accumulatorMs, "SIGNAL cooldown accumulator");
  const signalLengths = [
    history.signal.lastChainIds.length,
    history.signal.lastChainKinds.length,
    history.signal.lastChainDamage.length,
    history.signal.lastChainEdgeRanges.length,
    history.signal.lastChainCommonBonus.length,
    history.signal.lastChainForwardDegrees.length,
  ];
  if (!signalLengths.every(length => length === signalLengths[0])) throw new Error("SIGNAL history arrays must describe one atomic cast graph.");
  for (const id of history.signal.lastChainIds) if (!Number.isInteger(id) || id < 0) throw new Error("SIGNAL history IDs must be non-negative integers.");
  for (const damage of history.signal.lastChainDamage) assertFiniteNonNegative(damage, "SIGNAL history damage");
  for (const range of history.signal.lastChainEdgeRanges) assertFiniteNonNegative(range, "SIGNAL history edge range");
  for (const degree of history.signal.lastChainForwardDegrees) if (degree !== null && (!Number.isInteger(degree) || degree < 0)) throw new Error("SIGNAL forward degree must be null or a non-negative integer.");

  return Object.freeze({
    runSeed: history.runSeed,
    phase: history.phase,
    level: history.level,
    xp: history.xp,
    elapsedActiveMs: history.elapsedActiveMs,
    delta: Object.freeze({
      attackAccumulatorMs: history.delta.attackAccumulatorMs,
      echoLastScheduledAtMs: history.delta.echoLastScheduledAtMs,
      pendingEcho: history.delta.pendingEcho === null ? null : Object.freeze({ ...history.delta.pendingEcho }),
    }),
    vector: Object.freeze({
      accumulatorMs: history.vector.accumulatorMs,
      targetId: history.vector.targetId,
      targetKind: history.vector.targetKind,
      transferState: Object.freeze({ ...history.vector.transferState }),
      lockState: Object.freeze({ ...history.vector.lockState }),
      activeProjectileCount: history.vector.activeProjectileCount,
    }),
    orbit: Object.freeze({
      angle: history.orbit.angle,
      lastShiftAnchor: history.orbit.lastShiftAnchor,
      lastHitAt: freezeTargetTimes(history.orbit.lastHitAt),
      shearLastEmittedAtMs: history.orbit.shearLastEmittedAtMs,
    }),
    echo: Object.freeze({
      placementAccumulatorMs: history.echo.placementAccumulatorMs,
      nextId: history.echo.nextId,
      mines: Object.freeze(mines),
      burstLedger: freezeEchoLedger(history.echo.burstLedger),
    }),
    signal: Object.freeze({
      accumulatorMs: history.signal.accumulatorMs,
      lastCastPhase: history.signal.lastCastPhase,
      lastChainIds: Object.freeze([...history.signal.lastChainIds]),
      lastChainKinds: Object.freeze([...history.signal.lastChainKinds]),
      lastChainDamage: Object.freeze([...history.signal.lastChainDamage]),
      lastChainEdgeRanges: Object.freeze([...history.signal.lastChainEdgeRanges]),
      lastChainCommonBonus: Object.freeze([...history.signal.lastChainCommonBonus]),
      lastChainForwardDegrees: Object.freeze([...history.signal.lastChainForwardDegrees]),
    }),
  });
}

function assertEvolutionProjectionContinuity(before: CR2LiveSnapshot, after: CR2LiveProjection, family: V23WeaponFamily): void {
  if (after.evolvedWeapons[family] !== true) throw new Error(`${family} Evolution did not project evolved=true.`);
  if (after.evolutionCores !== before.evolutionCores - 1) throw new Error(`${family} Evolution must consume exactly one Core.`);
  if (after.hp !== before.hp || after.maxHp !== before.maxHp || after.pickupRadius !== before.pickupRadius) {
    throw new Error(`${family} Evolution changed player continuity fields.`);
  }
  if (after.weaponSlotsUsed !== before.weaponSlotsUsed) throw new Error(`${family} Evolution changed weapon-slot count.`);
  if (after.refracts !== before.refracts || after.rerollNonce !== before.rerollNonce) throw new Error(`${family} Evolution changed REFRACT history.`);
  const beforeProtocols = JSON.stringify(before.protocols);
  const afterProtocols = JSON.stringify(after.protocols);
  if (beforeProtocols !== afterProtocols) throw new Error(`${family} Evolution changed Protocol inventory.`);
}

export function applyEvolutionCandidateToLive(
  snapshot: CR2LiveSnapshot,
  history: EvolutionRuntimeHistorySnapshot,
  candidate: V23DraftCandidate,
): EvolutionLiveSelection {
  if (candidate.candidateType !== "EVOLUTION") throw new Error("EV-2 live bridge accepts only an Evolution candidate.");
  const family = candidate.familyId as V23WeaponFamily;
  const frozenHistory = cloneEvolutionRuntimeHistory(history);
  const projection = applyCR2CandidateToLive(snapshot, candidate);
  assertEvolutionProjectionContinuity(snapshot, projection, family);
  return Object.freeze({ selected: candidate, projection, history: frozenHistory });
}
