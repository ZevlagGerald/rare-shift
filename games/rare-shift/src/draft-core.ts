import { deterministicUnit } from "./survival-core.ts";

export type V21DraftId = "DELTA_RANK" | "VECTOR_NEEDLE" | "ORBIT_NODES" | "ECHO_MINE" | "SIGNAL_ARC" | "FIELD_REPAIR" | "SIGNAL_MAGNET";

export interface V21DraftChoice {
  readonly id: V21DraftId;
  readonly name: string;
  readonly category: "WEAPON" | "UTILITY";
  readonly description: string;
  readonly disabled: boolean;
}

export interface V21BuildState {
  readonly deltaRank: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly pickupRadius: number;
  readonly vectorEnabled?: boolean;
  readonly vectorOwned?: boolean;
  readonly orbitEnabled?: boolean;
  readonly orbitOwned?: boolean;
  readonly echoEnabled?: boolean;
  readonly echoOwned?: boolean;
  readonly signalEnabled?: boolean;
  readonly signalOwned?: boolean;
  readonly weaponSlotsUsed?: number;
  readonly weaponSlotCap?: number;
}

export const V21_DELTA_MAX_RANK = 5;
export const V21_SIGNAL_MAGNET_MAX_RADIUS = 220;
export const V22_ACTIVE_WEAPON_SLOT_CAP = 4;
export const V22C_ECHO_DISCOVERY_LEVEL = 3;
export const V22D_SIGNAL_DISCOVERY_LEVEL = 4;

const DEFINITIONS: Readonly<Record<V21DraftId, Omit<V21DraftChoice, "disabled">>> = Object.freeze({
  DELTA_RANK: Object.freeze({ id: "DELTA_RANK", name: "DELTA BURST", category: "WEAPON", description: "Advance the canonical DELTA phase mechanic to its next behavior rank." }),
  VECTOR_NEEDLE: Object.freeze({ id: "VECTOR_NEEDLE", name: "VECTOR NEEDLE", category: "WEAPON", description: "Acquire Rank I precision auto-fire. SHIFT rewrites which corporeal threat it can target." }),
  ORBIT_NODES: Object.freeze({ id: "ORBIT_NODES", name: "ORBIT NODES", category: "WEAPON", description: "Acquire one close-defense node. SHIFT reverses its phase-driven sweep without resetting position." }),
  ECHO_MINE: Object.freeze({ id: "ECHO_MINE", name: "ECHO MINE", category: "WEAPON", description: "Leave phase-memory mines on your path. Leave their reality, then return to make them live." }),
  SIGNAL_ARC: Object.freeze({ id: "SIGNAL_ARC", name: "SIGNAL ARC", category: "WEAPON", description: "Chain through the current corporeal graph. SHIFT rewrites which clusters and COMMON relays are legal." }),
  FIELD_REPAIR: Object.freeze({ id: "FIELD_REPAIR", name: "FIELD REPAIR", category: "UTILITY", description: "Restore 25 HP immediately. Does not increase maximum HP." }),
  SIGNAL_MAGNET: Object.freeze({ id: "SIGNAL_MAGNET", name: "SIGNAL MAGNET", category: "UTILITY", description: "Increase Signal XP pickup radius for this run." }),
});

function weaponSlotAvailable(state: V21BuildState): boolean {
  const used = state.weaponSlotsUsed ?? 1;
  const cap = state.weaponSlotCap ?? V22_ACTIVE_WEAPON_SLOT_CAP;
  return used < cap;
}

export function isV21DraftChoiceValid(state: V21BuildState, id: V21DraftId): boolean {
  if (id === "DELTA_RANK") return state.deltaRank < V21_DELTA_MAX_RANK;
  if (id === "VECTOR_NEEDLE") return state.vectorEnabled === true && state.vectorOwned !== true && weaponSlotAvailable(state);
  if (id === "ORBIT_NODES") return state.orbitEnabled === true && state.orbitOwned !== true && weaponSlotAvailable(state);
  if (id === "ECHO_MINE") return state.echoEnabled === true && state.echoOwned !== true && weaponSlotAvailable(state);
  if (id === "SIGNAL_ARC") return state.signalEnabled === true && state.signalOwned !== true && weaponSlotAvailable(state);
  if (id === "FIELD_REPAIR") return state.hp < state.maxHp;
  return state.pickupRadius < V21_SIGNAL_MAGNET_MAX_RADIUS;
}

function rotateDeterministically(seed: number, level: number, ids: readonly V21DraftId[]): V21DraftId[] {
  if (ids.length <= 1) return [...ids];
  const rotate = Math.floor(deterministicUnit(seed, level, 41) * ids.length) % ids.length;
  return [...ids.slice(rotate), ...ids.slice(0, rotate)];
}

export function buildV21Draft(seed: number, level: number, state: V21BuildState): readonly V21DraftChoice[] {
  if (!Number.isInteger(level) || level < 2) throw new Error("A V2-1 draft requires level 2 or higher.");

  const baseIds: V21DraftId[] = ["DELTA_RANK", "FIELD_REPAIR", "SIGNAL_MAGNET"];
  const validBase = rotateDeterministically(seed, level, baseIds).filter(id => isV21DraftChoiceValid(state, id));
  const acquisitions: V21DraftId[] = [];

  // V2-2D bounded onboarding/discovery order. SIGNAL ARC begins at level 4,
  // preserving the already-qualified level-2 ORBIT/VECTOR/DELTA surface and
  // the level-3 ECHO introduction. This is not final V2-3 weighting.
  if (level >= V22D_SIGNAL_DISCOVERY_LEVEL && isV21DraftChoiceValid(state, "SIGNAL_ARC")) acquisitions.push("SIGNAL_ARC");
  if (level >= V22C_ECHO_DISCOVERY_LEVEL && isV21DraftChoiceValid(state, "ECHO_MINE")) acquisitions.push("ECHO_MINE");
  if (isV21DraftChoiceValid(state, "ORBIT_NODES")) acquisitions.push("ORBIT_NODES");
  if (isV21DraftChoiceValid(state, "VECTOR_NEEDLE")) acquisitions.push("VECTOR_NEEDLE");

  let selected: V21DraftId[];
  if (acquisitions.length > 0) {
    selected = [...acquisitions];
    if (selected.length < 3 && isV21DraftChoiceValid(state, "DELTA_RANK")) selected.push("DELTA_RANK");
    for (const id of validBase) {
      if (selected.length >= 3) break;
      if (!selected.includes(id)) selected.push(id);
    }
    selected = selected.slice(0, 3);
  } else {
    selected = validBase.slice(0, 3);
  }

  return Object.freeze(selected.map(id => Object.freeze({ ...DEFINITIONS[id], disabled: false })));
}

export function applyV21Draft(state: V21BuildState, id: V21DraftId): V21BuildState {
  if (!isV21DraftChoiceValid(state, id)) {
    if (id === "DELTA_RANK") throw new Error("DELTA BURST is already rank V.");
    if (id === "VECTOR_NEEDLE") {
      if (state.vectorEnabled !== true) throw new Error("VECTOR NEEDLE is not enabled in this tranche.");
      if (state.vectorOwned === true) throw new Error("VECTOR NEEDLE is already owned.");
      throw new Error("No active weapon slot is available for VECTOR NEEDLE.");
    }
    if (id === "ORBIT_NODES") {
      if (state.orbitEnabled !== true) throw new Error("ORBIT NODES is not enabled in this tranche.");
      if (state.orbitOwned === true) throw new Error("ORBIT NODES is already owned.");
      throw new Error("No active weapon slot is available for ORBIT NODES.");
    }
    if (id === "ECHO_MINE") {
      if (state.echoEnabled !== true) throw new Error("ECHO MINE is not enabled in this progression step.");
      if (state.echoOwned === true) throw new Error("ECHO MINE is already owned.");
      throw new Error("No active weapon slot is available for ECHO MINE.");
    }
    if (id === "SIGNAL_ARC") {
      if (state.signalEnabled !== true) throw new Error("SIGNAL ARC is not enabled in this progression step.");
      if (state.signalOwned === true) throw new Error("SIGNAL ARC is already owned.");
      throw new Error("No active weapon slot is available for SIGNAL ARC.");
    }
    if (id === "FIELD_REPAIR") throw new Error("FIELD REPAIR requires missing HP.");
    throw new Error("SIGNAL MAGNET is already at its V2-1 pickup-radius cap.");
  }

  if (id === "DELTA_RANK") return Object.freeze({ ...state, deltaRank: state.deltaRank + 1 });
  if (id === "VECTOR_NEEDLE") {
    return Object.freeze({ ...state, vectorOwned: true, weaponSlotsUsed: (state.weaponSlotsUsed ?? 1) + 1 });
  }
  if (id === "ORBIT_NODES") {
    return Object.freeze({ ...state, orbitOwned: true, weaponSlotsUsed: (state.weaponSlotsUsed ?? 1) + 1 });
  }
  if (id === "ECHO_MINE") {
    return Object.freeze({ ...state, echoOwned: true, weaponSlotsUsed: (state.weaponSlotsUsed ?? 1) + 1 });
  }
  if (id === "SIGNAL_ARC") {
    return Object.freeze({ ...state, signalOwned: true, weaponSlotsUsed: (state.weaponSlotsUsed ?? 1) + 1 });
  }
  if (id === "FIELD_REPAIR") return Object.freeze({ ...state, hp: Math.min(state.maxHp, state.hp + 25) });
  return Object.freeze({ ...state, pickupRadius: Math.min(V21_SIGNAL_MAGNET_MAX_RADIUS, state.pickupRadius + 35) });
}
