import { deterministicUnit } from "./survival-core.ts";

export type V21DraftId = "DELTA_RANK" | "FIELD_REPAIR" | "SIGNAL_MAGNET";

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
}

export const V21_DELTA_MAX_RANK = 5;
export const V21_SIGNAL_MAGNET_MAX_RADIUS = 220;

const DEFINITIONS: Readonly<Record<V21DraftId, Omit<V21DraftChoice, "disabled">>> = Object.freeze({
  DELTA_RANK: Object.freeze({ id: "DELTA_RANK", name: "DELTA BURST", category: "WEAPON", description: "Rank up the canonical phase burst: more damage and faster cadence." }),
  FIELD_REPAIR: Object.freeze({ id: "FIELD_REPAIR", name: "FIELD REPAIR", category: "UTILITY", description: "Restore 25 HP immediately. Does not increase maximum HP." }),
  SIGNAL_MAGNET: Object.freeze({ id: "SIGNAL_MAGNET", name: "SIGNAL MAGNET", category: "UTILITY", description: "Increase Signal XP pickup radius for this run." }),
});

export function isV21DraftChoiceValid(state: V21BuildState, id: V21DraftId): boolean {
  if (id === "DELTA_RANK") return state.deltaRank < V21_DELTA_MAX_RANK;
  if (id === "FIELD_REPAIR") return state.hp < state.maxHp;
  return state.pickupRadius < V21_SIGNAL_MAGNET_MAX_RADIUS;
}

export function buildV21Draft(seed: number, level: number, state: V21BuildState): readonly V21DraftChoice[] {
  if (!Number.isInteger(level) || level < 2) throw new Error("A V2-1 draft requires level 2 or higher.");
  const ids: V21DraftId[] = ["DELTA_RANK", "FIELD_REPAIR", "SIGNAL_MAGNET"];
  const rotate = Math.floor(deterministicUnit(seed, level, 41) * ids.length) % ids.length;
  const ordered = [...ids.slice(rotate), ...ids.slice(0, rotate)];
  return Object.freeze(ordered
    .filter(id => isV21DraftChoiceValid(state, id))
    .map(id => Object.freeze({ ...DEFINITIONS[id], disabled: false })));
}

export function applyV21Draft(state: V21BuildState, id: V21DraftId): V21BuildState {
  if (!isV21DraftChoiceValid(state, id)) {
    if (id === "DELTA_RANK") throw new Error("DELTA BURST is already rank V.");
    if (id === "FIELD_REPAIR") throw new Error("FIELD REPAIR requires missing HP.");
    throw new Error("SIGNAL MAGNET is already at its V2-1 pickup-radius cap.");
  }

  if (id === "DELTA_RANK") {
    return Object.freeze({ ...state, deltaRank: state.deltaRank + 1 });
  }
  if (id === "FIELD_REPAIR") {
    return Object.freeze({ ...state, hp: Math.min(state.maxHp, state.hp + 25) });
  }
  return Object.freeze({ ...state, pickupRadius: Math.min(V21_SIGNAL_MAGNET_MAX_RADIUS, state.pickupRadius + 35) });
}
