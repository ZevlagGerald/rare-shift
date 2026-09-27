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

export type EchoMineState = "DORMANT_HOME" | "ARMED_AWAY" | "RETURN_READY";

export interface EchoMineCore {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly recordedPhase: Phase;
  readonly createdAtMs: number;
  readonly state: EchoMineState;
  readonly returnedAtMs: number | null;
}

export interface EchoEnemyCandidate {
  readonly id: number;
  readonly kind: V2EnemyKind;
  readonly active: boolean;
  readonly x: number;
  readonly y: number;
}

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

export function createEchoMine(
  id: number,
  x: number,
  y: number,
  recordedPhase: Phase,
  createdAtMs: number,
): EchoMineCore {
  if (!Number.isInteger(id) || id < 0) throw new Error("ECHO mine id must be a non-negative integer.");
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(createdAtMs)) throw new Error("ECHO mine coordinates/time must be finite.");
  return Object.freeze({ id, x, y, recordedPhase, createdAtMs, state: "DORMANT_HOME", returnedAtMs: null });
}

export function transitionEchoMineForPhase(mine: EchoMineCore, nextPhase: Phase, nowMs: number): EchoMineCore {
  if (!Number.isFinite(nowMs)) throw new Error("ECHO transition time must be finite.");

  if (nextPhase !== mine.recordedPhase) {
    if (mine.state === "ARMED_AWAY") return mine;
    return Object.freeze({ ...mine, state: "ARMED_AWAY" as const, returnedAtMs: null });
  }

  if (mine.state === "ARMED_AWAY") {
    return Object.freeze({ ...mine, state: "RETURN_READY" as const, returnedAtMs: nowMs });
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
