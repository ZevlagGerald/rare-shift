import { deterministicUnit } from "./survival-core.ts";
import type { Phase } from "./types.ts";

export type CR3BossPhase = "ALIGNMENT" | "CROSS_SPLIT" | "BREAK_WINDOW" | "DEFEATED";
export type CR3ActiveBossPhase = Exclude<CR3BossPhase, "DEFEATED">;
export type CR3CyclingBossPhase = Extract<CR3BossPhase, "ALIGNMENT" | "CROSS_SPLIT">;
export type CR3BossAttackKind = "COMMON_RADIAL" | "COMMON_LANE" | "ALIGNED_ADDS" | "BREAK_PRESSURE";
export type CR3DamageSource = "WEAPON" | "DISCHARGE";
export type CR3DamageRejection =
  | "NONE"
  | "BOSS_DEFEATED"
  | "DISCHARGE_IMMUNE"
  | "WRONG_PHASE"
  | "BREAK_CLOSED";

export interface CR3DesyncProfile {
  readonly maxHp: number;
  readonly crossSplitAtHp: number;
  readonly breakWindowAtHp: number;
  readonly alignmentCadenceMs: number;
  readonly crossSplitCadenceMs: number;
  readonly breakTellMs: number;
  readonly breakWindowMs: number;
}

/**
 * PROVISIONAL balance/timing profile for deterministic qualification only.
 * CR-3 browser/Owner playtest may tune these numbers without changing the
 * structural legality contracts in this module.
 */
export const CR3_DESYNC_PROVISIONAL_PROFILE: CR3DesyncProfile = Object.freeze({
  maxHp: 1000,
  crossSplitAtHp: 700,
  breakWindowAtHp: 350,
  alignmentCadenceMs: 4000,
  crossSplitCadenceMs: 2800,
  breakTellMs: 1400,
  breakWindowMs: 1800,
});

export interface CR3BossDecision {
  readonly ordinal: number;
  readonly vulnerability: Phase;
  readonly attack: CR3BossAttackKind;
  readonly addPhase: Phase | null;
}

export interface CR3DesyncState {
  readonly seed: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly phase: CR3BossPhase;
  readonly phaseStartedAtMs: number;
  readonly lastAdvancedAtMs: number;
  readonly cycleOrdinal: number;
  readonly vulnerability: Phase;
  readonly attack: CR3BossAttackKind;
  readonly addPhase: Phase | null;
  readonly nextCycleAtMs: number | null;
  readonly expectedResponse: Phase | null;
  readonly responseDeadlineMs: number | null;
  readonly breakOpenUntilMs: number | null;
  readonly defeatedAtMs: number | null;
}

export interface CR3DamageResult {
  readonly state: CR3DesyncState;
  readonly accepted: boolean;
  readonly appliedDamage: number;
  readonly rejection: CR3DamageRejection;
  readonly defeatedNow: boolean;
}

export interface CR3ShiftResponseResult {
  readonly state: CR3DesyncState;
  readonly accepted: boolean;
  readonly openedBreak: boolean;
}

function assertFiniteNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be finite and non-negative.`);
}

function assertProfile(profile: CR3DesyncProfile): void {
  if (!Number.isFinite(profile.maxHp) || profile.maxHp <= 0) throw new Error("CR-3 maxHp must be positive.");
  if (!Number.isFinite(profile.crossSplitAtHp) || profile.crossSplitAtHp <= 0 || profile.crossSplitAtHp >= profile.maxHp) {
    throw new Error("CR-3 crossSplitAtHp must be between zero and maxHp.");
  }
  if (!Number.isFinite(profile.breakWindowAtHp) || profile.breakWindowAtHp <= 0 || profile.breakWindowAtHp >= profile.crossSplitAtHp) {
    throw new Error("CR-3 breakWindowAtHp must be between zero and crossSplitAtHp.");
  }
  for (const [name, value] of [
    ["alignmentCadenceMs", profile.alignmentCadenceMs],
    ["crossSplitCadenceMs", profile.crossSplitCadenceMs],
    ["breakTellMs", profile.breakTellMs],
    ["breakWindowMs", profile.breakWindowMs],
  ] as const) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`CR-3 ${name} must be positive.`);
  }
}

function oppositePhase(phase: Phase): Phase {
  return phase === "A" ? "B" : "A";
}

function seededPhase(seed: number, ordinal: number, channel: number): Phase {
  return deterministicUnit(seed, ordinal, channel) < 0.5 ? "A" : "B";
}

export function planCR3BossDecision(seed: number, phase: CR3ActiveBossPhase, ordinal: number): CR3BossDecision {
  if (!Number.isInteger(ordinal) || ordinal < 0) throw new Error("CR-3 decision ordinal must be a non-negative integer.");
  const vulnerability = seededPhase(seed, ordinal, phase === "ALIGNMENT" ? 301 : phase === "CROSS_SPLIT" ? 302 : 303);
  if (phase === "ALIGNMENT") {
    const attack = deterministicUnit(seed, ordinal, 311) < 0.5 ? "COMMON_RADIAL" : "COMMON_LANE";
    return Object.freeze({ ordinal, vulnerability, attack, addPhase: null });
  }
  if (phase === "CROSS_SPLIT") {
    const attack = deterministicUnit(seed, ordinal, 312) < 0.5 ? "COMMON_LANE" : "ALIGNED_ADDS";
    const addPhase = attack === "ALIGNED_ADDS" ? oppositePhase(vulnerability) : null;
    return Object.freeze({ ordinal, vulnerability, attack, addPhase });
  }
  return Object.freeze({ ordinal, vulnerability, attack: "BREAK_PRESSURE", addPhase: null });
}

function cycleCadence(profile: CR3DesyncProfile, phase: CR3CyclingBossPhase): number {
  return phase === "ALIGNMENT" ? profile.alignmentCadenceMs : profile.crossSplitCadenceMs;
}

function stateForCyclingDecision(
  state: CR3DesyncState,
  phase: CR3CyclingBossPhase,
  decision: CR3BossDecision,
  atMs: number,
  profile: CR3DesyncProfile,
): CR3DesyncState {
  return Object.freeze({
    ...state,
    cycleOrdinal: decision.ordinal,
    vulnerability: decision.vulnerability,
    attack: decision.attack,
    addPhase: decision.addPhase,
    nextCycleAtMs: atMs + cycleCadence(profile, phase),
    expectedResponse: null,
    responseDeadlineMs: null,
    breakOpenUntilMs: null,
    lastAdvancedAtMs: atMs,
  });
}

export function createCR3DesyncState(
  seed: number,
  startedAtMs: number,
  profile: CR3DesyncProfile = CR3_DESYNC_PROVISIONAL_PROFILE,
): CR3DesyncState {
  assertFiniteNonNegative(startedAtMs, "CR-3 start time");
  assertProfile(profile);
  const decision = planCR3BossDecision(seed, "ALIGNMENT", 0);
  return Object.freeze({
    seed: seed >>> 0,
    hp: profile.maxHp,
    maxHp: profile.maxHp,
    phase: "ALIGNMENT",
    phaseStartedAtMs: startedAtMs,
    lastAdvancedAtMs: startedAtMs,
    cycleOrdinal: 0,
    vulnerability: decision.vulnerability,
    attack: decision.attack,
    addPhase: decision.addPhase,
    nextCycleAtMs: startedAtMs + profile.alignmentCadenceMs,
    expectedResponse: null,
    responseDeadlineMs: null,
    breakOpenUntilMs: null,
    defeatedAtMs: null,
  });
}

function enterPhase(
  state: CR3DesyncState,
  phase: CR3ActiveBossPhase,
  atMs: number,
  profile: CR3DesyncProfile,
): CR3DesyncState {
  const nextOrdinal = state.cycleOrdinal + 1;
  const decision = planCR3BossDecision(state.seed, phase, nextOrdinal);
  return Object.freeze({
    ...state,
    phase,
    phaseStartedAtMs: atMs,
    cycleOrdinal: nextOrdinal,
    vulnerability: decision.vulnerability,
    attack: decision.attack,
    addPhase: decision.addPhase,
    nextCycleAtMs: phase === "ALIGNMENT"
      ? atMs + profile.alignmentCadenceMs
      : phase === "CROSS_SPLIT"
        ? atMs + profile.crossSplitCadenceMs
        : null,
    expectedResponse: phase === "BREAK_WINDOW" ? decision.vulnerability : null,
    responseDeadlineMs: phase === "BREAK_WINDOW" ? atMs + profile.breakTellMs : null,
    breakOpenUntilMs: null,
    lastAdvancedAtMs: atMs,
  });
}

function nextBreakTell(state: CR3DesyncState, atMs: number, profile: CR3DesyncProfile): CR3DesyncState {
  const nextOrdinal = state.cycleOrdinal + 1;
  const decision = planCR3BossDecision(state.seed, "BREAK_WINDOW", nextOrdinal);
  return Object.freeze({
    ...state,
    cycleOrdinal: nextOrdinal,
    vulnerability: decision.vulnerability,
    attack: decision.attack,
    addPhase: null,
    expectedResponse: decision.vulnerability,
    responseDeadlineMs: atMs + profile.breakTellMs,
    breakOpenUntilMs: null,
    lastAdvancedAtMs: atMs,
  });
}

export function advanceCR3Desync(
  state: CR3DesyncState,
  nowMs: number,
  profile: CR3DesyncProfile = CR3_DESYNC_PROVISIONAL_PROFILE,
): CR3DesyncState {
  assertFiniteNonNegative(nowMs, "CR-3 advance time");
  assertProfile(profile);
  if (nowMs < state.lastAdvancedAtMs) throw new Error("CR-3 time cannot move backwards.");
  if (state.phase === "DEFEATED") return state;

  let next = state;
  if (state.phase === "ALIGNMENT" || state.phase === "CROSS_SPLIT") {
    const cyclingPhase: CR3CyclingBossPhase = state.phase;
    const cadence = cycleCadence(profile, cyclingPhase);
    while (next.nextCycleAtMs !== null && nowMs >= next.nextCycleAtMs) {
      const cycleAt = next.nextCycleAtMs;
      const decision = planCR3BossDecision(next.seed, cyclingPhase, next.cycleOrdinal + 1);
      next = stateForCyclingDecision(next, cyclingPhase, decision, cycleAt, profile);
      if (next.nextCycleAtMs === cycleAt) throw new Error("CR-3 cycle cadence did not advance.");
      if (next.nextCycleAtMs !== null && next.nextCycleAtMs - cycleAt !== cadence) throw new Error("CR-3 cycle cadence drifted.");
    }
    return Object.freeze({ ...next, lastAdvancedAtMs: nowMs });
  }

  while (next.phase === "BREAK_WINDOW") {
    if (next.breakOpenUntilMs !== null) {
      if (nowMs < next.breakOpenUntilMs) break;
      next = nextBreakTell(next, next.breakOpenUntilMs, profile);
      continue;
    }
    if (next.responseDeadlineMs !== null && nowMs >= next.responseDeadlineMs) {
      next = nextBreakTell(next, next.responseDeadlineMs, profile);
      continue;
    }
    break;
  }
  return Object.freeze({ ...next, lastAdvancedAtMs: nowMs });
}

export function applyCR3ShiftResponse(
  state: CR3DesyncState,
  playerPhase: Phase,
  atMs: number,
  profile: CR3DesyncProfile = CR3_DESYNC_PROVISIONAL_PROFILE,
): CR3ShiftResponseResult {
  assertFiniteNonNegative(atMs, "CR-3 SHIFT response time");
  assertProfile(profile);
  if (atMs < state.lastAdvancedAtMs) throw new Error("CR-3 time cannot move backwards.");

  // An input arriving exactly on/after the boundary belongs to the expired
  // window. Advance scheduling, but never recycle that same input into a tell
  // that only becomes visible because the boundary was processed.
  if (state.phase === "BREAK_WINDOW") {
    const expiredTell = state.breakOpenUntilMs === null
      && state.responseDeadlineMs !== null
      && atMs >= state.responseDeadlineMs;
    const expiredBreak = state.breakOpenUntilMs !== null
      && atMs >= state.breakOpenUntilMs;
    if (expiredTell || expiredBreak) {
      const advanced = advanceCR3Desync(state, atMs, profile);
      return Object.freeze({ state: advanced, accepted: false, openedBreak: false });
    }
  }

  const advanced = advanceCR3Desync(state, atMs, profile);
  if (advanced.phase !== "BREAK_WINDOW" || advanced.breakOpenUntilMs !== null || advanced.responseDeadlineMs === null || advanced.expectedResponse === null) {
    return Object.freeze({ state: advanced, accepted: false, openedBreak: false });
  }
  if (atMs >= advanced.responseDeadlineMs || playerPhase !== advanced.expectedResponse) {
    return Object.freeze({ state: advanced, accepted: false, openedBreak: false });
  }
  const opened: CR3DesyncState = Object.freeze({
    ...advanced,
    vulnerability: playerPhase,
    responseDeadlineMs: null,
    breakOpenUntilMs: atMs + profile.breakWindowMs,
    lastAdvancedAtMs: atMs,
  });
  return Object.freeze({ state: opened, accepted: true, openedBreak: true });
}

function rejectionForDamage(state: CR3DesyncState, source: CR3DamageSource, attackPhase: Phase): CR3DamageRejection {
  if (state.phase === "DEFEATED") return "BOSS_DEFEATED";
  if (source === "DISCHARGE") return "DISCHARGE_IMMUNE";
  if (state.phase === "BREAK_WINDOW") {
    if (state.breakOpenUntilMs === null) return "BREAK_CLOSED";
    return attackPhase === state.vulnerability ? "NONE" : "WRONG_PHASE";
  }
  return attackPhase === state.vulnerability ? "NONE" : "WRONG_PHASE";
}

export function applyCR3BossDamage(
  state: CR3DesyncState,
  intent: { readonly source: CR3DamageSource; readonly attackPhase: Phase; readonly amount: number; readonly atMs: number },
  profile: CR3DesyncProfile = CR3_DESYNC_PROVISIONAL_PROFILE,
): CR3DamageResult {
  assertFiniteNonNegative(intent.atMs, "CR-3 damage time");
  if (!Number.isFinite(intent.amount) || intent.amount <= 0) throw new Error("CR-3 damage amount must be positive.");
  let advanced = advanceCR3Desync(state, intent.atMs, profile);
  const rejection = rejectionForDamage(advanced, intent.source, intent.attackPhase);
  if (rejection !== "NONE") {
    return Object.freeze({ state: advanced, accepted: false, appliedDamage: 0, rejection, defeatedNow: false });
  }

  const hp = Math.max(0, advanced.hp - intent.amount);
  if (hp === 0) {
    const defeated = Object.freeze({
      ...advanced,
      hp: 0,
      phase: "DEFEATED" as const,
      phaseStartedAtMs: intent.atMs,
      nextCycleAtMs: null,
      expectedResponse: null,
      responseDeadlineMs: null,
      breakOpenUntilMs: null,
      defeatedAtMs: intent.atMs,
      lastAdvancedAtMs: intent.atMs,
    });
    return Object.freeze({ state: defeated, accepted: true, appliedDamage: advanced.hp, rejection: "NONE", defeatedNow: true });
  }

  advanced = Object.freeze({ ...advanced, hp, lastAdvancedAtMs: intent.atMs });
  if (advanced.phase === "ALIGNMENT" && hp <= profile.crossSplitAtHp) {
    advanced = enterPhase(advanced, "CROSS_SPLIT", intent.atMs, profile);
  }
  if (advanced.phase === "CROSS_SPLIT" && hp <= profile.breakWindowAtHp) {
    advanced = enterPhase(advanced, "BREAK_WINDOW", intent.atMs, profile);
  }
  return Object.freeze({ state: advanced, accepted: true, appliedDamage: intent.amount, rejection: "NONE", defeatedNow: false });
}

export function isCR3BreakOpen(state: CR3DesyncState, nowMs: number): boolean {
  return state.phase === "BREAK_WINDOW" && state.breakOpenUntilMs !== null && nowMs < state.breakOpenUntilMs;
}
