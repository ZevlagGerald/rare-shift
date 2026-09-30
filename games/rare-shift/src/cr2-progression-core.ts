import {
  matchingProtocolForWeapon,
  validateV23BuildState,
  v23ProtocolSlotsUsed,
  v23WeaponSlotsUsed,
  V23_PROTOCOL_FAMILIES,
  V23_WEAPON_FAMILIES,
  V23_WEAPON_MAX_RANK,
  type V23BuildState,
  type V23ProtocolFamily,
  type V23WeaponFamily,
  type V23WeaponProgress,
} from "./progression-core.ts";

export type CR2ProtocolRank = 1 | 2 | 3;

export interface CR2ProtocolEffects {
  readonly deltaCooldownMultiplier?: number;
  readonly deltaFieldScaleMultiplier?: number;
  readonly deltaPostShiftStabilityMs?: number;
  readonly vectorProjectileSpeedMultiplier?: number;
  readonly vectorAcquisitionRangeMultiplier?: number;
  readonly vectorPostShiftRangeBonus?: number;
  readonly orbitContactIntervalMultiplier?: number;
  readonly orbitRadiusMultiplier?: number;
  readonly orbitShearRangeBonus?: number;
  readonly echoLifetimeMultiplier?: number;
  readonly echoReturnDelayMultiplier?: number;
  readonly echoTriggerRadiusMultiplier?: number;
  readonly signalCooldownMultiplier?: number;
  readonly signalRelayRangeBonus?: number;
  readonly signalPostShiftCommonBonus?: number;
  /** Matching-independent passives required by the locked CR-2 Protocol contract. */
  readonly playerMoveSpeedMultiplier?: number;
  readonly contactInvulnBonusMs?: number;
  readonly repairBonusHp?: number;
  readonly pickupRadiusBonus?: number;
  readonly pickupAttractionSpeedMultiplier?: number;
}

export interface CR2ProtocolProfile {
  readonly family: V23ProtocolFamily;
  readonly rank: CR2ProtocolRank;
  readonly effects: CR2ProtocolEffects;
}

/**
 * CR-2 tuning is deliberately conservative. Matching-weapon effects preserve
 * each weapon's identity. Matching-independent passives make every Protocol a
 * real bounded choice even when that weapon is not owned, as required by the
 * locked complete-run governance. None grant attacks, cooldown readiness,
 * weapon ownership, history or invulnerability.
 */
const PROTOCOL_PROFILES: Readonly<Record<V23ProtocolFamily, readonly CR2ProtocolProfile[]>> = Object.freeze({
  COMMON_CORE: Object.freeze([
    Object.freeze({ family: "COMMON_CORE", rank: 1, effects: Object.freeze({ deltaCooldownMultiplier: 0.97, deltaFieldScaleMultiplier: 1.02, deltaPostShiftStabilityMs: 0 }) }),
    Object.freeze({ family: "COMMON_CORE", rank: 2, effects: Object.freeze({ deltaCooldownMultiplier: 0.94, deltaFieldScaleMultiplier: 1.05, deltaPostShiftStabilityMs: 0 }) }),
    Object.freeze({ family: "COMMON_CORE", rank: 3, effects: Object.freeze({ deltaCooldownMultiplier: 0.90, deltaFieldScaleMultiplier: 1.08, deltaPostShiftStabilityMs: 120 }) }),
  ]),
  VECTOR_LENS: Object.freeze([
    Object.freeze({ family: "VECTOR_LENS", rank: 1, effects: Object.freeze({ vectorProjectileSpeedMultiplier: 1.06, vectorAcquisitionRangeMultiplier: 1.02, vectorPostShiftRangeBonus: 0, playerMoveSpeedMultiplier: 1.01 }) }),
    Object.freeze({ family: "VECTOR_LENS", rank: 2, effects: Object.freeze({ vectorProjectileSpeedMultiplier: 1.12, vectorAcquisitionRangeMultiplier: 1.05, vectorPostShiftRangeBonus: 0, playerMoveSpeedMultiplier: 1.02 }) }),
    Object.freeze({ family: "VECTOR_LENS", rank: 3, effects: Object.freeze({ vectorProjectileSpeedMultiplier: 1.18, vectorAcquisitionRangeMultiplier: 1.08, vectorPostShiftRangeBonus: 24, playerMoveSpeedMultiplier: 1.03 }) }),
  ]),
  ORBIT_STABILIZER: Object.freeze([
    Object.freeze({ family: "ORBIT_STABILIZER", rank: 1, effects: Object.freeze({ orbitContactIntervalMultiplier: 0.97, orbitRadiusMultiplier: 1.02, orbitShearRangeBonus: 0, contactInvulnBonusMs: 30 }) }),
    Object.freeze({ family: "ORBIT_STABILIZER", rank: 2, effects: Object.freeze({ orbitContactIntervalMultiplier: 0.94, orbitRadiusMultiplier: 1.04, orbitShearRangeBonus: 0, contactInvulnBonusMs: 60 }) }),
    Object.freeze({ family: "ORBIT_STABILIZER", rank: 3, effects: Object.freeze({ orbitContactIntervalMultiplier: 0.90, orbitRadiusMultiplier: 1.06, orbitShearRangeBonus: 16, contactInvulnBonusMs: 90 }) }),
  ]),
  MEMORY_FUSE: Object.freeze([
    Object.freeze({ family: "MEMORY_FUSE", rank: 1, effects: Object.freeze({ echoLifetimeMultiplier: 1.06, echoReturnDelayMultiplier: 0.97, echoTriggerRadiusMultiplier: 1.02, repairBonusHp: 2 }) }),
    Object.freeze({ family: "MEMORY_FUSE", rank: 2, effects: Object.freeze({ echoLifetimeMultiplier: 1.12, echoReturnDelayMultiplier: 0.94, echoTriggerRadiusMultiplier: 1.05, repairBonusHp: 4 }) }),
    Object.freeze({ family: "MEMORY_FUSE", rank: 3, effects: Object.freeze({ echoLifetimeMultiplier: 1.18, echoReturnDelayMultiplier: 0.90, echoTriggerRadiusMultiplier: 1.08, repairBonusHp: 6 }) }),
  ]),
  RESONANCE_COIL: Object.freeze([
    Object.freeze({ family: "RESONANCE_COIL", rank: 1, effects: Object.freeze({ signalCooldownMultiplier: 0.97, signalRelayRangeBonus: 4, signalPostShiftCommonBonus: 0, pickupRadiusBonus: 4, pickupAttractionSpeedMultiplier: 1.03 }) }),
    Object.freeze({ family: "RESONANCE_COIL", rank: 2, effects: Object.freeze({ signalCooldownMultiplier: 0.94, signalRelayRangeBonus: 8, signalPostShiftCommonBonus: 0, pickupRadiusBonus: 8, pickupAttractionSpeedMultiplier: 1.06 }) }),
    Object.freeze({ family: "RESONANCE_COIL", rank: 3, effects: Object.freeze({ signalCooldownMultiplier: 0.90, signalRelayRangeBonus: 12, signalPostShiftCommonBonus: 16, pickupRadiusBonus: 12, pickupAttractionSpeedMultiplier: 1.09 }) }),
  ]),
});

export type CR2EvolutionId =
  | "RECONSTRUCTION_FIELD"
  | "PRISM_LANCE"
  | "SYNC_HALO"
  | "MEMORY_COLLAPSE"
  | "CHAIN_RESONANCE";

export interface CR2EvolutionContract {
  readonly family: V23WeaponFamily;
  readonly id: CR2EvolutionId;
  readonly name: string;
  readonly requiredProtocol: V23ProtocolFamily;
  readonly coreCost: 1;
  readonly preservesWeaponSlot: true;
  readonly grantsImmediateAttack: false;
  readonly preservesRuntimeHistory: true;
}

export const CR2_EVOLUTION_CONTRACTS: Readonly<Record<V23WeaponFamily, CR2EvolutionContract>> = Object.freeze({
  DELTA: Object.freeze({ family: "DELTA", id: "RECONSTRUCTION_FIELD", name: "RECONSTRUCTION FIELD", requiredProtocol: "COMMON_CORE", coreCost: 1, preservesWeaponSlot: true, grantsImmediateAttack: false, preservesRuntimeHistory: true }),
  VECTOR: Object.freeze({ family: "VECTOR", id: "PRISM_LANCE", name: "PRISM LANCE", requiredProtocol: "VECTOR_LENS", coreCost: 1, preservesWeaponSlot: true, grantsImmediateAttack: false, preservesRuntimeHistory: true }),
  ORBIT: Object.freeze({ family: "ORBIT", id: "SYNC_HALO", name: "SYNC HALO", requiredProtocol: "ORBIT_STABILIZER", coreCost: 1, preservesWeaponSlot: true, grantsImmediateAttack: false, preservesRuntimeHistory: true }),
  ECHO: Object.freeze({ family: "ECHO", id: "MEMORY_COLLAPSE", name: "MEMORY COLLAPSE", requiredProtocol: "MEMORY_FUSE", coreCost: 1, preservesWeaponSlot: true, grantsImmediateAttack: false, preservesRuntimeHistory: true }),
  SIGNAL: Object.freeze({ family: "SIGNAL", id: "CHAIN_RESONANCE", name: "CHAIN RESONANCE", requiredProtocol: "RESONANCE_COIL", coreCost: 1, preservesWeaponSlot: true, grantsImmediateAttack: false, preservesRuntimeHistory: true }),
});

function freezeWeaponProgress(progress: V23WeaponProgress): V23WeaponProgress {
  return Object.freeze({ rank: progress.rank, evolved: progress.evolved });
}

function freezeBuildState(state: V23BuildState): V23BuildState {
  const weapons: Partial<Record<V23WeaponFamily, V23WeaponProgress>> = {};
  for (const family of V23_WEAPON_FAMILIES) {
    const progress = state.weapons[family];
    if (progress) weapons[family] = freezeWeaponProgress(progress);
  }
  const protocols: Partial<Record<V23ProtocolFamily, number>> = {};
  for (const family of V23_PROTOCOL_FAMILIES) {
    const rank = state.protocols[family];
    if (rank !== undefined) protocols[family] = rank;
  }
  const frozen = Object.freeze({ ...state, weapons: Object.freeze(weapons), protocols: Object.freeze(protocols) });
  validateV23BuildState(frozen);
  return frozen;
}

export function cr2ProtocolProfile(family: V23ProtocolFamily, rank: number): CR2ProtocolProfile {
  if (!Number.isInteger(rank) || rank < 1 || rank > 3) throw new Error("Protocol rank must be between I and III.");
  return PROTOCOL_PROFILES[family][rank - 1];
}

export function grantCR2EvolutionCores(state: V23BuildState, count = 1): V23BuildState {
  validateV23BuildState(state);
  if (!Number.isInteger(count) || count < 1) throw new Error("Evolution Core grant count must be a positive integer.");
  return freezeBuildState({ ...state, evolutionCores: state.evolutionCores + count });
}

export function cr2EvolutionEligible(state: V23BuildState, family: V23WeaponFamily): boolean {
  validateV23BuildState(state);
  if (state.evolutionCores < 1) return false;
  const progress = state.weapons[family];
  if (!progress || progress.evolved || progress.rank !== V23_WEAPON_MAX_RANK) return false;
  const protocol = matchingProtocolForWeapon(family);
  return (state.protocols[protocol] ?? 0) >= 1;
}

export function eligibleCR2EvolutionFamilies(state: V23BuildState): readonly V23WeaponFamily[] {
  validateV23BuildState(state);
  if (state.evolutionCores < 1) return Object.freeze([]);
  return Object.freeze(V23_WEAPON_FAMILIES.filter(family => cr2EvolutionEligible(state, family)));
}

export function applyCR2Evolution(state: V23BuildState, family: V23WeaponFamily): V23BuildState {
  validateV23BuildState(state);
  const progress = state.weapons[family];
  if (!progress) throw new Error(`${family} must be owned before Evolution.`);
  if (progress.evolved) throw new Error(`${family} is already evolved.`);
  if (progress.rank !== V23_WEAPON_MAX_RANK) throw new Error(`${family} must be Rank V before Evolution.`);
  const protocol = matchingProtocolForWeapon(family);
  if ((state.protocols[protocol] ?? 0) < 1) throw new Error(`${protocol} Rank I+ is required to evolve ${family}.`);
  if (state.evolutionCores < 1) throw new Error("An Evolution Core is required.");

  const weaponSlotsBefore = v23WeaponSlotsUsed(state);
  const protocolSlotsBefore = v23ProtocolSlotsUsed(state);
  const next = freezeBuildState({
    ...state,
    evolutionCores: state.evolutionCores - 1,
    weapons: {
      ...state.weapons,
      [family]: { rank: progress.rank, evolved: true },
    },
  });
  if (v23WeaponSlotsUsed(next) !== weaponSlotsBefore) throw new Error("Evolution may not consume an additional weapon slot.");
  if (v23ProtocolSlotsUsed(next) !== protocolSlotsBefore) throw new Error("Evolution may not mutate Protocol slot usage.");
  return next;
}

export function restoreCR2Refract(state: V23BuildState, cap = 1): V23BuildState {
  validateV23BuildState(state);
  if (!Number.isInteger(cap) || cap < 1) throw new Error("REFRACT cap must be a positive integer.");
  return freezeBuildState({ ...state, refracts: Math.min(cap, state.refracts + 1) });
}
