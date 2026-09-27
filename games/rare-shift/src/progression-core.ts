import { deterministicUnit } from "./survival-core.ts";

export const V23_WEAPON_SLOT_CAP = 4 as const;
export const V23_PROTOCOL_SLOT_CAP = 4 as const;
export const V23_WEAPON_MAX_RANK = 5 as const;
export const V23_PROTOCOL_MAX_RANK = 3 as const;
export const V23_INITIAL_REFRACTS = 1 as const;
export const V23_PROTOCOL_DISCOVERY_LEVEL = 5 as const;
export const V23_SIGNAL_MAGNET_MAX_RADIUS = 220 as const;

export const V23_WEAPON_FAMILIES = Object.freeze([
  "DELTA",
  "VECTOR",
  "ORBIT",
  "ECHO",
  "SIGNAL",
] as const);

export type V23WeaponFamily = (typeof V23_WEAPON_FAMILIES)[number];

export const V23_PROTOCOL_FAMILIES = Object.freeze([
  "COMMON_CORE",
  "VECTOR_LENS",
  "ORBIT_STABILIZER",
  "MEMORY_FUSE",
  "RESONANCE_COIL",
] as const);

export type V23ProtocolFamily = (typeof V23_PROTOCOL_FAMILIES)[number];

export type V23CandidateType =
  | "WEAPON_ACQUIRE"
  | "WEAPON_RANK"
  | "PROTOCOL_ACQUIRE"
  | "PROTOCOL_RANK"
  | "EVOLUTION"
  | "UTILITY";

export interface V23WeaponProgress {
  readonly rank: number;
  readonly evolved: boolean;
}

export interface V23BuildState {
  readonly weapons: Readonly<Partial<Record<V23WeaponFamily, V23WeaponProgress>>>;
  readonly protocols: Readonly<Partial<Record<V23ProtocolFamily, number>>>;
  readonly evolutionCores: number;
  readonly refracts: number;
  readonly rerollNonce: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly pickupRadius: number;
}

export interface V23DraftCandidate {
  readonly candidateId: string;
  readonly candidateType: V23CandidateType;
  readonly familyId: V23WeaponFamily | V23ProtocolFamily | "FIELD_REPAIR" | "SIGNAL_MAGNET";
  readonly fromRank: number | null;
  readonly toRank: number | null;
  readonly priorityClass: number;
  readonly name: string;
  readonly description: string;
}

export interface V23DraftResult {
  readonly choices: readonly V23DraftCandidate[];
  readonly legalCandidateCount: number;
  readonly rerollNonce: number;
}

const WEAPON_NAMES: Readonly<Record<V23WeaponFamily, string>> = Object.freeze({
  DELTA: "DELTA BURST",
  VECTOR: "VECTOR NEEDLE",
  ORBIT: "ORBIT NODES",
  ECHO: "ECHO MINE",
  SIGNAL: "SIGNAL ARC",
});

const PROTOCOL_NAMES: Readonly<Record<V23ProtocolFamily, string>> = Object.freeze({
  COMMON_CORE: "COMMON CORE",
  VECTOR_LENS: "VECTOR LENS",
  ORBIT_STABILIZER: "ORBIT STABILIZER",
  MEMORY_FUSE: "MEMORY FUSE",
  RESONANCE_COIL: "RESONANCE COIL",
});

const PROTOCOL_FOR_WEAPON: Readonly<Record<V23WeaponFamily, V23ProtocolFamily>> = Object.freeze({
  DELTA: "COMMON_CORE",
  VECTOR: "VECTOR_LENS",
  ORBIT: "ORBIT_STABILIZER",
  ECHO: "MEMORY_FUSE",
  SIGNAL: "RESONANCE_COIL",
});

const DISCOVERY_LEVEL: Readonly<Record<V23WeaponFamily, number>> = Object.freeze({
  DELTA: 1,
  VECTOR: 2,
  ORBIT: 2,
  ECHO: 3,
  SIGNAL: 4,
});

const TYPE_WEIGHT: Readonly<Record<V23CandidateType, number>> = Object.freeze({
  EVOLUTION: 7.0,
  WEAPON_RANK: 4.5,
  PROTOCOL_RANK: 3.8,
  PROTOCOL_ACQUIRE: 3.6,
  WEAPON_ACQUIRE: 3.2,
  UTILITY: 1.2,
});

function freezeWeaponProgress(progress: V23WeaponProgress): V23WeaponProgress {
  return Object.freeze({ rank: progress.rank, evolved: progress.evolved });
}

function freezeState(state: V23BuildState): V23BuildState {
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
  return Object.freeze({
    ...state,
    weapons: Object.freeze(weapons),
    protocols: Object.freeze(protocols),
  });
}

function assertInteger(name: string, value: number, min: number): void {
  if (!Number.isInteger(value) || value < min) throw new Error(`${name} must be an integer >= ${min}.`);
}

export function validateV23BuildState(state: V23BuildState): void {
  assertInteger("evolutionCores", state.evolutionCores, 0);
  assertInteger("refracts", state.refracts, 0);
  assertInteger("rerollNonce", state.rerollNonce, 0);
  assertInteger("hp", state.hp, 0);
  assertInteger("maxHp", state.maxHp, 1);
  assertInteger("pickupRadius", state.pickupRadius, 0);
  if (state.hp > state.maxHp) throw new Error("hp may not exceed maxHp.");
  const delta = state.weapons.DELTA;
  if (!delta) throw new Error("DELTA BURST is mandatory in V2-3 progression state.");
  for (const family of V23_WEAPON_FAMILIES) {
    const progress = state.weapons[family];
    if (!progress) continue;
    if (!Number.isInteger(progress.rank) || progress.rank < 1 || progress.rank > V23_WEAPON_MAX_RANK) {
      throw new Error(`${family} weapon rank must be between I and V.`);
    }
  }
  for (const family of V23_PROTOCOL_FAMILIES) {
    const rank = state.protocols[family];
    if (rank === undefined) continue;
    if (!Number.isInteger(rank) || rank < 1 || rank > V23_PROTOCOL_MAX_RANK) {
      throw new Error(`${family} protocol rank must be between I and III.`);
    }
  }
  if (v23WeaponSlotsUsed(state) > V23_WEAPON_SLOT_CAP) throw new Error("Active weapon slot cap exceeded.");
  if (v23ProtocolSlotsUsed(state) > V23_PROTOCOL_SLOT_CAP) throw new Error("Protocol slot cap exceeded.");
}

export function createV23InitialBuildState(input: {
  readonly hp?: number;
  readonly maxHp?: number;
  readonly pickupRadius?: number;
} = {}): V23BuildState {
  const maxHp = input.maxHp ?? 100;
  const state: V23BuildState = {
    weapons: { DELTA: { rank: 1, evolved: false } },
    protocols: {},
    evolutionCores: 0,
    refracts: V23_INITIAL_REFRACTS,
    rerollNonce: 0,
    hp: input.hp ?? maxHp,
    maxHp,
    pickupRadius: input.pickupRadius ?? 76,
  };
  validateV23BuildState(state);
  return freezeState(state);
}

export function v23WeaponSlotsUsed(state: V23BuildState): number {
  return V23_WEAPON_FAMILIES.reduce((count, family) => count + (state.weapons[family] ? 1 : 0), 0);
}

export function v23ProtocolSlotsUsed(state: V23BuildState): number {
  return V23_PROTOCOL_FAMILIES.reduce((count, family) => count + (state.protocols[family] !== undefined ? 1 : 0), 0);
}

export function matchingProtocolForWeapon(family: V23WeaponFamily): V23ProtocolFamily {
  return PROTOCOL_FOR_WEAPON[family];
}

function weaponAcquireCandidate(family: Exclude<V23WeaponFamily, "DELTA">): V23DraftCandidate {
  return Object.freeze({
    candidateId: `WEAPON_ACQUIRE:${family}`,
    candidateType: "WEAPON_ACQUIRE",
    familyId: family,
    fromRank: 0,
    toRank: 1,
    priorityClass: 4,
    name: WEAPON_NAMES[family],
    description: `Acquire ${WEAPON_NAMES[family]} at Rank I.`,
  });
}

function weaponRankCandidate(family: V23WeaponFamily, fromRank: number): V23DraftCandidate {
  return Object.freeze({
    candidateId: `WEAPON_RANK:${family}:${fromRank}->${fromRank + 1}`,
    candidateType: "WEAPON_RANK",
    familyId: family,
    fromRank,
    toRank: fromRank + 1,
    priorityClass: 2,
    name: WEAPON_NAMES[family],
    description: `${WEAPON_NAMES[family]} Rank ${roman(fromRank)} → ${roman(fromRank + 1)}.`,
  });
}

function protocolAcquireCandidate(family: V23ProtocolFamily): V23DraftCandidate {
  return Object.freeze({
    candidateId: `PROTOCOL_ACQUIRE:${family}`,
    candidateType: "PROTOCOL_ACQUIRE",
    familyId: family,
    fromRank: 0,
    toRank: 1,
    priorityClass: 3,
    name: PROTOCOL_NAMES[family],
    description: `Acquire ${PROTOCOL_NAMES[family]} Rank I.`,
  });
}

function protocolRankCandidate(family: V23ProtocolFamily, fromRank: number): V23DraftCandidate {
  return Object.freeze({
    candidateId: `PROTOCOL_RANK:${family}:${fromRank}->${fromRank + 1}`,
    candidateType: "PROTOCOL_RANK",
    familyId: family,
    fromRank,
    toRank: fromRank + 1,
    priorityClass: 3,
    name: PROTOCOL_NAMES[family],
    description: `${PROTOCOL_NAMES[family]} Rank ${roman(fromRank)} → ${roman(fromRank + 1)}.`,
  });
}

function utilityCandidate(id: "FIELD_REPAIR" | "SIGNAL_MAGNET"): V23DraftCandidate {
  return Object.freeze({
    candidateId: `UTILITY:${id}`,
    candidateType: "UTILITY",
    familyId: id,
    fromRank: null,
    toRank: null,
    priorityClass: 5,
    name: id === "FIELD_REPAIR" ? "FIELD REPAIR" : "SIGNAL MAGNET",
    description: id === "FIELD_REPAIR"
      ? "Restore 25 HP immediately."
      : "Increase Signal XP pickup radius for this run.",
  });
}

function roman(rank: number): string {
  return ["0", "I", "II", "III", "IV", "V"][rank] ?? String(rank);
}

export function enumerateV23ACandidates(level: number, state: V23BuildState): readonly V23DraftCandidate[] {
  if (!Number.isInteger(level) || level < 2) throw new Error("V2-3 drafts require level 2 or higher.");
  validateV23BuildState(state);
  const candidates: V23DraftCandidate[] = [];
  const weaponSlotsUsed = v23WeaponSlotsUsed(state);
  const protocolSlotsUsed = v23ProtocolSlotsUsed(state);

  for (const family of V23_WEAPON_FAMILIES) {
    const progress = state.weapons[family];
    if (progress) {
      if (!progress.evolved && progress.rank < V23_WEAPON_MAX_RANK) candidates.push(weaponRankCandidate(family, progress.rank));
      continue;
    }
    if (family === "DELTA") continue;
    if (level >= DISCOVERY_LEVEL[family] && weaponSlotsUsed < V23_WEAPON_SLOT_CAP) candidates.push(weaponAcquireCandidate(family));
  }

  if (level >= V23_PROTOCOL_DISCOVERY_LEVEL) {
    for (const family of V23_PROTOCOL_FAMILIES) {
      const rank = state.protocols[family];
      if (rank === undefined) {
        if (protocolSlotsUsed < V23_PROTOCOL_SLOT_CAP) candidates.push(protocolAcquireCandidate(family));
      } else if (rank < V23_PROTOCOL_MAX_RANK) {
        candidates.push(protocolRankCandidate(family, rank));
      }
    }
  }

  if (state.hp < state.maxHp) candidates.push(utilityCandidate("FIELD_REPAIR"));
  if (state.pickupRadius < V23_SIGNAL_MAGNET_MAX_RADIUS) candidates.push(utilityCandidate("SIGNAL_MAGNET"));

  // EVOLUTION is intentionally defined but not enumerated in V2-3A. Eligibility,
  // Core consumption and evolved runtime behavior belong to V2-3D.
  return Object.freeze(candidates.sort((a, b) => a.candidateId.localeCompare(b.candidateId)));
}

function hashString32(value: string): number {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

function weightedOrder(seed: number, level: number, candidates: readonly V23DraftCandidate[]): V23DraftCandidate[] {
  return [...candidates].sort((a, b) => {
    const ua = Math.max(1e-9, deterministicUnit((seed ^ hashString32(a.candidateId)) >>> 0, level, 71));
    const ub = Math.max(1e-9, deterministicUnit((seed ^ hashString32(b.candidateId)) >>> 0, level, 71));
    const ka = -Math.log(ua) / TYPE_WEIGHT[a.candidateType];
    const kb = -Math.log(ub) / TYPE_WEIGHT[b.candidateType];
    return ka - kb || a.priorityClass - b.priorityClass || a.candidateId.localeCompare(b.candidateId);
  });
}

function findCandidate(candidates: readonly V23DraftCandidate[], candidateId: string): V23DraftCandidate | undefined {
  return candidates.find(candidate => candidate.candidateId === candidateId);
}

function withForcedCandidate(
  forced: V23DraftCandidate,
  ordered: readonly V23DraftCandidate[],
): V23DraftCandidate[] {
  return [forced, ...ordered.filter(candidate => candidate.candidateId !== forced.candidateId)].slice(0, 3);
}

function initialOrderedTriple(seed: number, level: number, candidates: readonly V23DraftCandidate[]): V23DraftCandidate[] {
  const ordered = weightedOrder(seed, level, candidates);
  if (level === 2) {
    const orbit = findCandidate(candidates, "WEAPON_ACQUIRE:ORBIT");
    const vector = findCandidate(candidates, "WEAPON_ACQUIRE:VECTOR");
    const delta = candidates.find(candidate => candidate.candidateId.startsWith("WEAPON_RANK:DELTA:"));
    if (orbit && vector && delta) return [orbit, vector, delta];
  }
  if (level === 3) {
    const echo = findCandidate(candidates, "WEAPON_ACQUIRE:ECHO");
    if (echo) return withForcedCandidate(echo, ordered);
  }
  if (level === 4) {
    const signal = findCandidate(candidates, "WEAPON_ACQUIRE:SIGNAL");
    if (signal) return withForcedCandidate(signal, ordered);
  }
  return ordered.slice(0, 3);
}

function rerolledTriple(seed: number, level: number, nonce: number, candidates: readonly V23DraftCandidate[]): V23DraftCandidate[] {
  const ordered = weightedOrder(seed, level, candidates);
  if (ordered.length <= 3) return ordered.slice(0, 3);
  const offset = 1 + ((nonce - 1) % (ordered.length - 1));
  const rotated = [...ordered.slice(offset), ...ordered.slice(0, offset)];
  return rotated.slice(0, 3);
}

export function buildV23ADraft(seed: number, level: number, state: V23BuildState): V23DraftResult {
  assertInteger("seed", seed, 0);
  const candidates = enumerateV23ACandidates(level, state);
  if (candidates.length < 3) {
    throw new Error(`V2-3 production draft exhausted: only ${candidates.length} legal candidates at level ${level}.`);
  }
  const choices = state.rerollNonce === 0
    ? initialOrderedTriple(seed, level, candidates)
    : rerolledTriple(seed, level, state.rerollNonce, candidates);
  if (choices.length !== 3 || new Set(choices.map(choice => choice.candidateId)).size !== 3) {
    throw new Error("V2-3 production draft must contain exactly three distinct choices.");
  }
  return Object.freeze({
    choices: Object.freeze(choices),
    legalCandidateCount: candidates.length,
    rerollNonce: state.rerollNonce,
  });
}

export function buildV23AFallbackDraft(seed: number, level: number, state: V23BuildState): V23DraftResult {
  assertInteger("seed", seed, 0);
  const candidates = enumerateV23ACandidates(level, state);
  const choices = state.rerollNonce === 0
    ? initialOrderedTriple(seed, level, candidates)
    : rerolledTriple(seed, level, state.rerollNonce, candidates);
  return Object.freeze({
    choices: Object.freeze(choices.slice(0, 3)),
    legalCandidateCount: candidates.length,
    rerollNonce: state.rerollNonce,
  });
}

function replaceWeapon(
  state: V23BuildState,
  family: V23WeaponFamily,
  progress: V23WeaponProgress,
): V23BuildState {
  return freezeState({
    ...state,
    weapons: { ...state.weapons, [family]: progress },
  });
}

function replaceProtocol(state: V23BuildState, family: V23ProtocolFamily, rank: number): V23BuildState {
  return freezeState({
    ...state,
    protocols: { ...state.protocols, [family]: rank },
  });
}

export function applyV23ACandidate(state: V23BuildState, candidate: V23DraftCandidate): V23BuildState {
  validateV23BuildState(state);
  if (candidate.candidateType === "EVOLUTION") {
    throw new Error("EVOLUTION application is reserved for V2-3D.");
  }

  if (candidate.candidateType === "WEAPON_ACQUIRE") {
    const family = candidate.familyId as V23WeaponFamily;
    if (family === "DELTA" || state.weapons[family]) throw new Error("Weapon acquisition is not legal for this family.");
    if (v23WeaponSlotsUsed(state) >= V23_WEAPON_SLOT_CAP) throw new Error("No active weapon slot is available.");
    const next = replaceWeapon(state, family, { rank: 1, evolved: false });
    validateV23BuildState(next);
    return next;
  }

  if (candidate.candidateType === "WEAPON_RANK") {
    const family = candidate.familyId as V23WeaponFamily;
    const progress = state.weapons[family];
    if (!progress) throw new Error("Cannot rank an unowned weapon.");
    if (progress.rank >= V23_WEAPON_MAX_RANK) throw new Error("Weapon is already Rank V.");
    if (candidate.fromRank !== progress.rank || candidate.toRank !== progress.rank + 1) throw new Error("Weapon rank transition is stale or skips a rank.");
    const next = replaceWeapon(state, family, { rank: progress.rank + 1, evolved: progress.evolved });
    validateV23BuildState(next);
    return next;
  }

  if (candidate.candidateType === "PROTOCOL_ACQUIRE") {
    const family = candidate.familyId as V23ProtocolFamily;
    if (state.protocols[family] !== undefined) throw new Error("Protocol is already owned.");
    if (v23ProtocolSlotsUsed(state) >= V23_PROTOCOL_SLOT_CAP) throw new Error("No Protocol slot is available.");
    const next = replaceProtocol(state, family, 1);
    validateV23BuildState(next);
    return next;
  }

  if (candidate.candidateType === "PROTOCOL_RANK") {
    const family = candidate.familyId as V23ProtocolFamily;
    const rank = state.protocols[family];
    if (rank === undefined) throw new Error("Cannot rank an unowned Protocol.");
    if (rank >= V23_PROTOCOL_MAX_RANK) throw new Error("Protocol is already Rank III.");
    if (candidate.fromRank !== rank || candidate.toRank !== rank + 1) throw new Error("Protocol rank transition is stale or skips a rank.");
    const next = replaceProtocol(state, family, rank + 1);
    validateV23BuildState(next);
    return next;
  }

  if (candidate.familyId === "FIELD_REPAIR") {
    if (state.hp >= state.maxHp) throw new Error("FIELD REPAIR requires missing HP.");
    return freezeState({ ...state, hp: Math.min(state.maxHp, state.hp + 25) });
  }
  if (candidate.familyId === "SIGNAL_MAGNET") {
    if (state.pickupRadius >= V23_SIGNAL_MAGNET_MAX_RADIUS) throw new Error("SIGNAL MAGNET is already capped.");
    return freezeState({ ...state, pickupRadius: Math.min(V23_SIGNAL_MAGNET_MAX_RADIUS, state.pickupRadius + 35) });
  }
  throw new Error("Unknown V2-3A utility candidate.");
}

export function useV23ARefract(seed: number, level: number, state: V23BuildState): {
  readonly state: V23BuildState;
  readonly draft: V23DraftResult;
} {
  validateV23BuildState(state);
  if (state.refracts <= 0) throw new Error("No REFRACT rerolls remain.");
  const previous = buildV23ADraft(seed, level, state);
  const nextState = freezeState({
    ...state,
    refracts: state.refracts - 1,
    rerollNonce: state.rerollNonce + 1,
  });
  const next = buildV23ADraft(seed, level, nextState);
  if (previous.legalCandidateCount >= 4) {
    const before = previous.choices.map(choice => choice.candidateId).join("|");
    const after = next.choices.map(choice => choice.candidateId).join("|");
    if (before === after) throw new Error("REFRACT failed to produce a different ordered triple despite sufficient alternatives.");
  }
  return Object.freeze({ state: nextState, draft: next });
}
