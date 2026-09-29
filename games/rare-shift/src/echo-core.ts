import { isEnemyCorporeal, type V2EnemyKind } from "./phase-combat-core.ts";
import type { Phase } from "./types.ts";

export interface EchoProfile {
  readonly placementIntervalMs: number;
  readonly maxActive: number;
  readonly minSeparation: number;
  readonly lifetimeMs: number;
  readonly returnDelayMs: number;
  readonly triggerRadius: number;
  readonly blastRadius: number;
  readonly damage: number;
}

export interface EchoRankProfile extends EchoProfile {
  readonly rank: number;
  readonly memoryDepth: number;
}

export type EchoMineState = "DORMANT_HOME" | "ARMED_AWAY" | "RETURN_READY";

export interface EchoMineCore {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly recordedPhase: Phase;
  readonly createdAtMs: number;
  readonly state: EchoMineState;
  readonly returnedAtMs: number | null;
  readonly memoryDepth: number;
  readonly lastDepthIncrementAtMs: number | null;
}

export interface EchoEnemyCandidate {
  readonly id: number;
  readonly kind: V2EnemyKind;
  readonly active: boolean;
  readonly x: number;
  readonly y: number;
}

export type EchoBurstLedger = ReadonlyMap<number, readonly number[]>;

export interface EchoDamagePlan {
  readonly targetIds: readonly number[];
  readonly ledger: EchoBurstLedger;
}

export const ECHO_DEPTH_CAP = 2;
export const ECHO_DEPTH_INCREMENT_GUARD_MS = 900;
export const ECHO_RETURN_DELAY_FLOOR_MS = 100;
export const ECHO_BURST_WINDOW_MS = 250;
export const ECHO_BURST_MAX_HITS = 2;

export const ECHO_RANK_I: EchoProfile = Object.freeze({
  placementIntervalMs: 1800,
  maxActive: 3,
  minSeparation: 56,
  lifetimeMs: 9000,
  returnDelayMs: 250,
  triggerRadius: 68,
  blastRadius: 84,
  damage: 16,
});

function assertEchoRank(rank: number): void {
  if (!Number.isInteger(rank) || rank < 1 || rank > 5) throw new Error("ECHO MINE rank must be an integer from 1 to 5.");
}

function assertMemoryDepth(memoryDepth: number): void {
  if (!Number.isInteger(memoryDepth) || memoryDepth < 0 || memoryDepth > ECHO_DEPTH_CAP) {
    throw new Error(`ECHO memory depth must be an integer from 0 to ${ECHO_DEPTH_CAP}.`);
  }
}

export function buildEchoProfile(rank: number, memoryDepth = 0): EchoRankProfile {
  assertEchoRank(rank);
  assertMemoryDepth(memoryDepth);
  const deep = rank >= 5 && memoryDepth >= ECHO_DEPTH_CAP;
  return Object.freeze({
    rank,
    memoryDepth,
    placementIntervalMs: 1800,
    maxActive: rank >= 2 ? 4 : 3,
    minSeparation: 56,
    lifetimeMs: rank >= 2 ? 12000 : 9000,
    returnDelayMs: rank >= 4 ? 140 : 250,
    triggerRadius: deep ? 84 : rank >= 3 ? 76 : 68,
    blastRadius: deep ? 120 : rank >= 3 ? 108 : 84,
    damage: deep ? 20 : 16,
  });
}

export function createEchoMine(
  id: number,
  x: number,
  y: number,
  recordedPhase: Phase,
  createdAtMs: number,
): EchoMineCore {
  if (!Number.isInteger(id) || id < 0) throw new Error("ECHO mine id must be a non-negative integer.");
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(createdAtMs)) throw new Error("ECHO mine coordinates/time must be finite.");
  return Object.freeze({
    id,
    x,
    y,
    recordedPhase,
    createdAtMs,
    state: "DORMANT_HOME",
    returnedAtMs: null,
    memoryDepth: 0,
    lastDepthIncrementAtMs: null,
  });
}

export function initializeEchoMineForRankV(mine: EchoMineCore): EchoMineCore {
  return Object.freeze({ ...mine, memoryDepth: 0, lastDepthIncrementAtMs: null });
}

export function transitionEchoMineForPhase(
  mine: EchoMineCore,
  nextPhase: Phase,
  nowMs: number,
  rank = 1,
): EchoMineCore {
  assertEchoRank(rank);
  if (!Number.isFinite(nowMs)) throw new Error("ECHO transition time must be finite.");

  if (nextPhase !== mine.recordedPhase) {
    if (mine.state === "ARMED_AWAY") return mine;
    return Object.freeze({ ...mine, state: "ARMED_AWAY" as const, returnedAtMs: null });
  }

  if (mine.state === "ARMED_AWAY") {
    let memoryDepth = mine.memoryDepth;
    let lastDepthIncrementAtMs = mine.lastDepthIncrementAtMs;
    if (rank >= 5 && memoryDepth < ECHO_DEPTH_CAP) {
      const incrementAllowed = lastDepthIncrementAtMs === null
        || nowMs - lastDepthIncrementAtMs >= ECHO_DEPTH_INCREMENT_GUARD_MS;
      if (incrementAllowed) {
        memoryDepth += 1;
        lastDepthIncrementAtMs = nowMs;
      }
    }
    return Object.freeze({
      ...mine,
      state: "RETURN_READY" as const,
      returnedAtMs: nowMs,
      memoryDepth,
      lastDepthIncrementAtMs,
    });
  }

  return mine;
}

export function isEchoMineExpired(mine: EchoMineCore, nowMs: number, profile = ECHO_RANK_I): boolean {
  return nowMs - mine.createdAtMs >= profile.lifetimeMs;
}

export function isEchoTriggerWindowOpen(
  mine: EchoMineCore,
  currentPhase: Phase,
  nowMs: number,
  profile = ECHO_RANK_I,
): boolean {
  return mine.state === "RETURN_READY"
    && currentPhase === mine.recordedPhase
    && mine.returnedAtMs !== null
    && nowMs - mine.returnedAtMs >= profile.returnDelayMs
    && !isEchoMineExpired(mine, nowMs, profile);
}

function distanceSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

export function selectEchoReplacementId(
  activeMines: readonly EchoMineCore[],
  profile = ECHO_RANK_I,
): number | null {
  if (activeMines.length < profile.maxActive) return null;
  if (activeMines.length === 0) return null;
  return activeMines.reduce((oldest, mine) => mine.id < oldest.id ? mine : oldest).id;
}

export function canPlaceEchoMine(
  x: number,
  y: number,
  activeMines: readonly EchoMineCore[],
  replacementId: number | null = selectEchoReplacementId(activeMines),
  profile = ECHO_RANK_I,
): boolean {
  const minSq = profile.minSeparation * profile.minSeparation;
  return activeMines.every(mine => mine.id === replacementId || distanceSq(x, y, mine.x, mine.y) >= minSq);
}

export function echoTriggerCandidateIds(
  mine: EchoMineCore,
  currentPhase: Phase,
  nowMs: number,
  enemies: readonly EchoEnemyCandidate[],
  profile = ECHO_RANK_I,
): readonly number[] {
  if (!isEchoTriggerWindowOpen(mine, currentPhase, nowMs, profile)) return Object.freeze([]);
  const radiusSq = profile.triggerRadius * profile.triggerRadius;
  return Object.freeze(enemies
    .filter(enemy => enemy.active
      && isEnemyCorporeal(enemy.kind, currentPhase)
      && distanceSq(mine.x, mine.y, enemy.x, enemy.y) <= radiusSq)
    .map(enemy => enemy.id)
    .sort((a, b) => a - b));
}

export function echoBlastTargetIds(
  mine: EchoMineCore,
  currentPhase: Phase,
  enemies: readonly EchoEnemyCandidate[],
  profile = ECHO_RANK_I,
): readonly number[] {
  const radiusSq = profile.blastRadius * profile.blastRadius;
  return Object.freeze(enemies
    .filter(enemy => enemy.active
      && isEnemyCorporeal(enemy.kind, currentPhase)
      && distanceSq(mine.x, mine.y, enemy.x, enemy.y) <= radiusSq)
    .map(enemy => enemy.id)
    .sort((a, b) => a - b));
}

function activeBurstTimes(times: readonly number[] | undefined, nowMs: number): readonly number[] {
  if (!times) return Object.freeze([]);
  return Object.freeze(times
    .filter(time => Number.isFinite(time) && time <= nowMs && nowMs - time < ECHO_BURST_WINDOW_MS)
    .sort((a, b) => a - b));
}

export function canApplyEchoDamage(
  rank: number,
  ledger: EchoBurstLedger,
  targetId: number,
  nowMs: number,
): boolean {
  assertEchoRank(rank);
  if (!Number.isInteger(targetId) || targetId < 0) throw new Error("ECHO burst target id must be a non-negative integer.");
  if (!Number.isFinite(nowMs)) throw new Error("ECHO burst time must be finite.");
  if (rank < 5) return true;
  return activeBurstTimes(ledger.get(targetId), nowMs).length < ECHO_BURST_MAX_HITS;
}

export function recordEchoDamage(
  ledger: EchoBurstLedger,
  targetId: number,
  nowMs: number,
): EchoBurstLedger {
  if (!Number.isInteger(targetId) || targetId < 0) throw new Error("ECHO burst target id must be a non-negative integer.");
  if (!Number.isFinite(nowMs)) throw new Error("ECHO burst time must be finite.");
  const next = new Map<number, readonly number[]>();
  for (const [id, times] of ledger.entries()) {
    const active = activeBurstTimes(times, nowMs);
    if (active.length > 0) next.set(id, active);
  }
  const current = [...(next.get(targetId) ?? []), nowMs].sort((a, b) => a - b);
  next.set(targetId, Object.freeze(current));
  return next;
}

export function planEchoDamageTargets(
  targetIds: readonly number[],
  rank: number,
  nowMs: number,
  ledger: EchoBurstLedger,
): EchoDamagePlan {
  assertEchoRank(rank);
  if (!Number.isFinite(nowMs)) throw new Error("ECHO burst time must be finite.");
  const orderedIds = [...new Set(targetIds)].sort((a, b) => a - b);
  const accepted: number[] = [];
  let nextLedger = ledger;
  for (const id of orderedIds) {
    if (!canApplyEchoDamage(rank, nextLedger, id, nowMs)) continue;
    accepted.push(id);
    if (rank >= 5) nextLedger = recordEchoDamage(nextLedger, id, nowMs);
  }
  return Object.freeze({ targetIds: Object.freeze(accepted), ledger: nextLedger });
}
