import { applyCR2DraftCandidate } from "./cr2-draft-core.ts";
import { grantCR2EvolutionCores, restoreCR2Refract } from "./cr2-progression-core.ts";
import {
  validateV23BuildState,
  v23ProtocolSlotsUsed,
  v23WeaponSlotsUsed,
  type V23BuildState,
  type V23DraftCandidate,
  type V23ProtocolFamily,
  type V23WeaponFamily,
  type V23WeaponProgress,
} from "./progression-core.ts";

export interface CR2LiveSnapshot {
  readonly deltaRank: number;
  readonly vectorOwned: boolean;
  readonly vectorRank: number;
  readonly orbitOwned: boolean;
  readonly orbitRank: number;
  readonly echoOwned: boolean;
  readonly echoRank: number;
  readonly signalOwned: boolean;
  readonly signalRank: number;
  readonly evolvedWeapons: Readonly<Partial<Record<V23WeaponFamily, boolean>>>;
  readonly protocols: Readonly<Partial<Record<V23ProtocolFamily, number>>>;
  readonly evolutionCores: number;
  readonly refracts: number;
  readonly rerollNonce: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly pickupRadius: number;
  readonly weaponSlotsUsed: number;
}

export interface CR2LiveProjection extends CR2LiveSnapshot {
  readonly protocolSlotsUsed: number;
}

function weaponProgress(rank: number, evolved: boolean): V23WeaponProgress {
  return Object.freeze({ rank, evolved });
}

export function buildCR2StateFromLive(snapshot: CR2LiveSnapshot): V23BuildState {
  const weapons: Partial<Record<V23WeaponFamily, V23WeaponProgress>> = {
    DELTA: weaponProgress(snapshot.deltaRank, snapshot.evolvedWeapons.DELTA === true),
  };
  if (snapshot.vectorOwned) weapons.VECTOR = weaponProgress(snapshot.vectorRank, snapshot.evolvedWeapons.VECTOR === true);
  if (snapshot.orbitOwned) weapons.ORBIT = weaponProgress(snapshot.orbitRank, snapshot.evolvedWeapons.ORBIT === true);
  if (snapshot.echoOwned) weapons.ECHO = weaponProgress(snapshot.echoRank, snapshot.evolvedWeapons.ECHO === true);
  if (snapshot.signalOwned) weapons.SIGNAL = weaponProgress(snapshot.signalRank, snapshot.evolvedWeapons.SIGNAL === true);

  const state: V23BuildState = Object.freeze({
    weapons: Object.freeze(weapons),
    protocols: Object.freeze({ ...snapshot.protocols }),
    evolutionCores: snapshot.evolutionCores,
    refracts: snapshot.refracts,
    rerollNonce: snapshot.rerollNonce,
    hp: snapshot.hp,
    maxHp: snapshot.maxHp,
    pickupRadius: snapshot.pickupRadius,
  });
  validateV23BuildState(state);
  if (v23WeaponSlotsUsed(state) !== snapshot.weaponSlotsUsed) {
    throw new Error(`Live weapon slot count drift: snapshot=${snapshot.weaponSlotsUsed}, normalized=${v23WeaponSlotsUsed(state)}.`);
  }
  return state;
}

export function projectCR2StateToLive(state: V23BuildState): CR2LiveProjection {
  validateV23BuildState(state);
  const delta = state.weapons.DELTA;
  if (!delta) throw new Error("DELTA is required for live projection.");
  const evolvedWeapons: Partial<Record<V23WeaponFamily, boolean>> = {};
  for (const family of ["DELTA", "VECTOR", "ORBIT", "ECHO", "SIGNAL"] as const) {
    if (state.weapons[family]) evolvedWeapons[family] = state.weapons[family]?.evolved === true;
  }
  return Object.freeze({
    deltaRank: delta.rank,
    vectorOwned: state.weapons.VECTOR !== undefined,
    vectorRank: state.weapons.VECTOR?.rank ?? 1,
    orbitOwned: state.weapons.ORBIT !== undefined,
    orbitRank: state.weapons.ORBIT?.rank ?? 1,
    echoOwned: state.weapons.ECHO !== undefined,
    echoRank: state.weapons.ECHO?.rank ?? 1,
    signalOwned: state.weapons.SIGNAL !== undefined,
    signalRank: state.weapons.SIGNAL?.rank ?? 1,
    evolvedWeapons: Object.freeze(evolvedWeapons),
    protocols: Object.freeze({ ...state.protocols }),
    evolutionCores: state.evolutionCores,
    refracts: state.refracts,
    rerollNonce: state.rerollNonce,
    hp: state.hp,
    maxHp: state.maxHp,
    pickupRadius: state.pickupRadius,
    weaponSlotsUsed: v23WeaponSlotsUsed(state),
    protocolSlotsUsed: v23ProtocolSlotsUsed(state),
  });
}

export function applyCR2CandidateToLive(snapshot: CR2LiveSnapshot, candidate: V23DraftCandidate): CR2LiveProjection {
  const state = buildCR2StateFromLive(snapshot);
  return projectCR2StateToLive(applyCR2DraftCandidate(state, candidate));
}

export function grantCR2CoreToLive(snapshot: CR2LiveSnapshot, count = 1): CR2LiveProjection {
  const state = buildCR2StateFromLive(snapshot);
  return projectCR2StateToLive(grantCR2EvolutionCores(state, count));
}

export function restoreCR2RefractToLive(snapshot: CR2LiveSnapshot, cap = 1): CR2LiveProjection {
  const state = buildCR2StateFromLive(snapshot);
  return projectCR2StateToLive(restoreCR2Refract(state, cap));
}
