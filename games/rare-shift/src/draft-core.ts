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

const DEFINITIONS: Readonly<Record<V21DraftId, Omit<V21DraftChoice, "disabled">>> = Object.freeze({
  DELTA_RANK: Object.freeze({ id: "DELTA_RANK", name: "DELTA BURST", category: "WEAPON", description: "Rank up the canonical phase burst: more damage and faster cadence." }),
  FIELD_REPAIR: Object.freeze({ id: "FIELD_REPAIR", name: "FIELD REPAIR", category: "UTILITY", description: "Restore 25 HP immediately. Does not increase maximum HP." }),
  SIGNAL_MAGNET: Object.freeze({ id: "SIGNAL_MAGNET", name: "SIGNAL MAGNET", category: "UTILITY", description: "Increase Signal XP pickup radius for this run." }),
});

export function buildV21Draft(seed: number, level: number, state: V21BuildState): readonly V21DraftChoice[] {
  if (!Number.isInteger(level) || level < 2) throw new Error("A V2-1 draft requires level 2 or higher.");
  const ids: V21DraftId[] = ["DELTA_RANK", "FIELD_REPAIR", "SIGNAL_MAGNET"];
  const rotate = Math.floor(deterministicUnit(seed, level, 41) * ids.length) % ids.length;
  const ordered = [...ids.slice(rotate), ...ids.slice(0, rotate)];
  return Object.freeze(ordered.map(id => Object.freeze({
    ...DEFINITIONS[id],
    disabled: id === "DELTA_RANK" && state.deltaRank >= 5,
  })));
}

export function applyV21Draft(state: V21BuildState, id: V21DraftId): V21BuildState {
  if (id === "DELTA_RANK") {
    if (state.deltaRank >= 5) throw new Error("DELTA BURST is already rank V.");
    return Object.freeze({ ...state, deltaRank: state.deltaRank + 1 });
  }
  if (id === "FIELD_REPAIR") {
    return Object.freeze({ ...state, hp: Math.min(state.maxHp, state.hp + 25) });
  }
  return Object.freeze({ ...state, pickupRadius: Math.min(220, state.pickupRadius + 35) });
}
