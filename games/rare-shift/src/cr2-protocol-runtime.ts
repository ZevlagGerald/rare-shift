import { cr2ProtocolProfile, type CR2ProtocolRank } from "./cr2-progression-core.ts";
import { ECHO_RETURN_DELAY_FLOOR_MS, type EchoRankProfile } from "./echo-core.ts";
import type { OrbitRankProfile } from "./orbit-core.ts";
import type { DeltaProfile } from "./phase-combat-core.ts";
import type { V23ProtocolFamily } from "./progression-core.ts";
import type { SignalArcRankProfile } from "./signal-arc-core.ts";
import type { VectorRankProfile } from "./vector-core.ts";

export interface CR2DeltaProtocolRuntime {
  readonly profile: DeltaProfile;
  readonly postShiftStabilityMs: number;
}

export interface CR2VectorProtocolRuntime {
  readonly profile: VectorRankProfile;
  readonly postShiftRangeBonus: number;
}

export interface CR2SignalProtocolRuntime {
  readonly profile: SignalArcRankProfile;
  readonly postShiftCommonBonus: number;
}

export interface CR2PlayerProtocolRuntime {
  /** VECTOR LENS trajectory discipline: small always-useful movement quality. */
  readonly moveSpeedMultiplier: number;
  /** ORBIT STABILIZER local stability: bounded extension of the normal damage grace window. */
  readonly contactInvulnBonusMs: number;
  /** MEMORY FUSE retention: bounded additional value from legitimate repair effects. */
  readonly repairBonusHp: number;
  /** RESONANCE COIL collection quality: bounded Signal pickup reach and attraction speed. */
  readonly pickupRadiusBonus: number;
  readonly pickupAttractionSpeedMultiplier: number;
}

function positiveIntegerMs(value: number): number {
  return Math.max(1, Math.round(value));
}

function legalProtocolRank(family: V23ProtocolFamily, rank: number | undefined): CR2ProtocolRank | null {
  if (rank === undefined) return null;
  if (!Number.isInteger(rank) || rank < 1 || rank > 3) throw new Error(`${family} Protocol rank must be between I and III.`);
  return rank as CR2ProtocolRank;
}

/**
 * Compose the matching-independent part of the locked CR-2 Protocol contract.
 * These passives are intentionally orthogonal and conservative; they never
 * create attacks, cooldown readiness, weapon ownership, fake pickups, combat
 * history or absolute invulnerability.
 */
export function buildCR2PlayerProtocolRuntime(
  protocols: Readonly<Partial<Record<V23ProtocolFamily, number>>>,
): CR2PlayerProtocolRuntime {
  const vectorRank = legalProtocolRank("VECTOR_LENS", protocols.VECTOR_LENS);
  const orbitRank = legalProtocolRank("ORBIT_STABILIZER", protocols.ORBIT_STABILIZER);
  const memoryRank = legalProtocolRank("MEMORY_FUSE", protocols.MEMORY_FUSE);
  const resonanceRank = legalProtocolRank("RESONANCE_COIL", protocols.RESONANCE_COIL);

  const vector = vectorRank === null ? null : cr2ProtocolProfile("VECTOR_LENS", vectorRank).effects;
  const orbit = orbitRank === null ? null : cr2ProtocolProfile("ORBIT_STABILIZER", orbitRank).effects;
  const memory = memoryRank === null ? null : cr2ProtocolProfile("MEMORY_FUSE", memoryRank).effects;
  const resonance = resonanceRank === null ? null : cr2ProtocolProfile("RESONANCE_COIL", resonanceRank).effects;

  return Object.freeze({
    moveSpeedMultiplier: vector?.playerMoveSpeedMultiplier ?? 1,
    contactInvulnBonusMs: orbit?.contactInvulnBonusMs ?? 0,
    repairBonusHp: memory?.repairBonusHp ?? 0,
    pickupRadiusBonus: resonance?.pickupRadiusBonus ?? 0,
    pickupAttractionSpeedMultiplier: resonance?.pickupAttractionSpeedMultiplier ?? 1,
  });
}

export function applyCommonCoreToDelta(base: DeltaProfile, rank: CR2ProtocolRank): CR2DeltaProtocolRuntime {
  const effects = cr2ProtocolProfile("COMMON_CORE", rank).effects;
  const cooldownMultiplier = effects.deltaCooldownMultiplier ?? 1;
  const fieldScaleMultiplier = effects.deltaFieldScaleMultiplier ?? 1;
  return Object.freeze({
    profile: Object.freeze({
      ...base,
      points: base.points,
      cooldownMs: positiveIntegerMs(base.cooldownMs * cooldownMultiplier),
      worldScale: base.worldScale * fieldScaleMultiplier,
    }),
    postShiftStabilityMs: effects.deltaPostShiftStabilityMs ?? 0,
  });
}

export function applyVectorLensToVector(base: VectorRankProfile, rank: CR2ProtocolRank): CR2VectorProtocolRuntime {
  const effects = cr2ProtocolProfile("VECTOR_LENS", rank).effects;
  return Object.freeze({
    profile: Object.freeze({
      ...base,
      damageSequence: base.damageSequence,
      speed: base.speed * (effects.vectorProjectileSpeedMultiplier ?? 1),
      range: base.range * (effects.vectorAcquisitionRangeMultiplier ?? 1),
    }),
    postShiftRangeBonus: effects.vectorPostShiftRangeBonus ?? 0,
  });
}

export function applyOrbitStabilizerToOrbit(base: OrbitRankProfile, rank: CR2ProtocolRank): OrbitRankProfile {
  const effects = cr2ProtocolProfile("ORBIT_STABILIZER", rank).effects;
  const shearRangeBonus = base.rank >= 4 ? (effects.orbitShearRangeBonus ?? 0) : 0;
  return Object.freeze({
    ...base,
    radius: base.radius * (effects.orbitRadiusMultiplier ?? 1),
    contactIntervalMs: positiveIntegerMs(base.contactIntervalMs * (effects.orbitContactIntervalMultiplier ?? 1)),
    shearContactRadius: base.shearContactRadius + shearRangeBonus,
  });
}

export function applyMemoryFuseToEcho(base: EchoRankProfile, rank: CR2ProtocolRank): EchoRankProfile {
  const effects = cr2ProtocolProfile("MEMORY_FUSE", rank).effects;
  return Object.freeze({
    ...base,
    lifetimeMs: positiveIntegerMs(base.lifetimeMs * (effects.echoLifetimeMultiplier ?? 1)),
    returnDelayMs: Math.max(
      ECHO_RETURN_DELAY_FLOOR_MS,
      positiveIntegerMs(base.returnDelayMs * (effects.echoReturnDelayMultiplier ?? 1)),
    ),
    triggerRadius: base.triggerRadius * (effects.echoTriggerRadiusMultiplier ?? 1),
  });
}

export function applyResonanceCoilToSignal(base: SignalArcRankProfile, rank: CR2ProtocolRank): CR2SignalProtocolRuntime {
  const effects = cr2ProtocolProfile("RESONANCE_COIL", rank).effects;
  return Object.freeze({
    profile: Object.freeze({
      ...base,
      damages: base.damages,
      cooldownMs: positiveIntegerMs(base.cooldownMs * (effects.signalCooldownMultiplier ?? 1)),
      relayRange: base.relayRange + (effects.signalRelayRangeBonus ?? 0),
    }),
    postShiftCommonBonus: effects.signalPostShiftCommonBonus ?? 0,
  });
}
