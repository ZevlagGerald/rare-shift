import { isEnemyCorporeal, type V2EnemyKind } from "./phase-combat-core.ts";
import type { Phase } from "./types.ts";

export interface OrbitProfile {
  readonly damage: number;
  readonly radius: number;
  readonly angularSpeed: number;
  readonly contactRadius: number;
  readonly contactIntervalMs: number;
  readonly nodeCount: number;
}

export interface OrbitContactCandidate {
  readonly id: number;
  readonly kind: V2EnemyKind;
  readonly active: boolean;
  readonly x: number;
  readonly y: number;
}

export interface OrbitPoint {
  readonly x: number;
  readonly y: number;
}

export const ORBIT_RANK_I: OrbitProfile = Object.freeze({
  damage: 8,
  radius: 72,
  angularSpeed: 2.4,
  contactRadius: 26,
  contactIntervalMs: 700,
  nodeCount: 1,
});

const TAU = Math.PI * 2;

export function orbitDirectionForPhase(phase: Phase): 1 | -1 {
  return phase === "A" ? 1 : -1;
}

export function normalizeOrbitAngle(angle: number): number {
  const normalized = angle % TAU;
  return normalized < 0 ? normalized + TAU : normalized;
}

export function advanceOrbitAngle(
  angle: number,
  phase: Phase,
  elapsedMs: number,
  angularSpeed = ORBIT_RANK_I.angularSpeed,
): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new Error("ORBIT elapsed time must be finite and non-negative.");
  return normalizeOrbitAngle(angle + orbitDirectionForPhase(phase) * angularSpeed * elapsedMs / 1000);
}

export function orbitNodePosition(
  originX: number,
  originY: number,
  angle: number,
  radius = ORBIT_RANK_I.radius,
): OrbitPoint {
  return Object.freeze({
    x: originX + Math.cos(angle) * radius,
    y: originY + Math.sin(angle) * radius,
  });
}

export function isOrbitContactLegal(
  candidate: OrbitContactCandidate,
  phase: Phase,
  nodeX: number,
  nodeY: number,
  lastHitAtMs: number | null,
  nowMs: number,
  profile: OrbitProfile = ORBIT_RANK_I,
): boolean {
  if (!candidate.active || !isEnemyCorporeal(candidate.kind, phase)) return false;
  if (lastHitAtMs !== null && nowMs - lastHitAtMs < profile.contactIntervalMs) return false;
  const dx = candidate.x - nodeX;
  const dy = candidate.y - nodeY;
  return dx * dx + dy * dy <= profile.contactRadius * profile.contactRadius;
}
