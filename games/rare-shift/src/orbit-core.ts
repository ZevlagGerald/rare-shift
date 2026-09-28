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

export interface OrbitRankProfile extends OrbitProfile {
  readonly rank: number;
  readonly shearArcRad: number;
  readonly shearDurationMs: number;
  readonly shearContactRadius: number;
  readonly shearDamage: number;
  readonly shearRearmMs: number;
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

export const ORBIT_SHEAR_ARC_RAD = Math.PI / 3;
export const ORBIT_SHEAR_DURATION_MS = 160;
export const ORBIT_SHEAR_REARM_MS = 650;

const TAU = Math.PI * 2;

export function buildOrbitProfile(rank: number): OrbitRankProfile {
  if (!Number.isInteger(rank) || rank < 1 || rank > 5) throw new Error("ORBIT rank must be an integer between I and V.");
  const radius = rank >= 3 ? 80 : 72;
  const angularSpeed = rank >= 3 ? 2.55 : 2.4;
  const contactRadius = rank >= 3 ? 30 : 26;
  const nodeCount = rank >= 5 ? 3 : rank >= 2 ? 2 : 1;
  const contactIntervalMs = rank >= 5 ? 650 : 700;
  return Object.freeze({
    rank,
    damage: 8,
    radius,
    angularSpeed,
    contactRadius,
    contactIntervalMs,
    nodeCount,
    shearArcRad: rank >= 4 ? ORBIT_SHEAR_ARC_RAD : 0,
    shearDurationMs: rank >= 4 ? ORBIT_SHEAR_DURATION_MS : 0,
    shearContactRadius: rank >= 4 ? 30 : 0,
    shearDamage: rank >= 4 ? 6 : 0,
    shearRearmMs: rank >= 4 ? ORBIT_SHEAR_REARM_MS : 0,
  });
}

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

export function orbitNodeAngles(anchorAngle: number, nodeCount: number): readonly number[] {
  if (!Number.isInteger(nodeCount) || nodeCount < 1 || nodeCount > 3) throw new Error("ORBIT node count must be between 1 and 3.");
  const spacing = TAU / nodeCount;
  return Object.freeze(Array.from({ length: nodeCount }, (_, index) => normalizeOrbitAngle(anchorAngle + spacing * index)));
}

export function orbitNodePositions(
  originX: number,
  originY: number,
  anchorAngle: number,
  profile: OrbitProfile,
): readonly OrbitPoint[] {
  return Object.freeze(orbitNodeAngles(anchorAngle, profile.nodeCount).map(angle => orbitNodePosition(originX, originY, angle, profile.radius)));
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

export function canEmitOrbitShear(rank: number, lastShearAtMs: number | null, nowMs: number): boolean {
  if (!Number.isFinite(nowMs) || nowMs < 0) throw new Error("ORBIT shear time must be finite and non-negative.");
  if (rank < 4) return false;
  if (lastShearAtMs === null) return true;
  return nowMs - lastShearAtMs >= ORBIT_SHEAR_REARM_MS;
}

function directedAngularDistance(startAngle: number, targetAngle: number, direction: 1 | -1): number {
  return direction === 1
    ? normalizeOrbitAngle(targetAngle - startAngle)
    : normalizeOrbitAngle(startAngle - targetAngle);
}

function pointDistanceToDirectedOrbitArc(
  originX: number,
  originY: number,
  targetX: number,
  targetY: number,
  radius: number,
  startAngle: number,
  direction: 1 | -1,
  arcRad: number,
): number {
  const dx = targetX - originX;
  const dy = targetY - originY;
  const targetRadius = Math.hypot(dx, dy);
  const targetAngle = Math.atan2(dy, dx);
  const progress = directedAngularDistance(startAngle, targetAngle, direction);
  if (progress <= arcRad) return Math.abs(targetRadius - radius);

  const endAngle = startAngle + direction * arcRad;
  const start = orbitNodePosition(originX, originY, startAngle, radius);
  const end = orbitNodePosition(originX, originY, endAngle, radius);
  return Math.min(Math.hypot(targetX - start.x, targetY - start.y), Math.hypot(targetX - end.x, targetY - end.y));
}

export function planOrbitShearTargetIds(
  candidates: readonly OrbitContactCandidate[],
  phase: Phase,
  originX: number,
  originY: number,
  anchorAngle: number,
  profile: OrbitRankProfile,
): readonly number[] {
  if (profile.rank < 4 || profile.shearArcRad <= 0) return Object.freeze([]);
  const direction = orbitDirectionForPhase(phase);
  const nodeAngles = orbitNodeAngles(anchorAngle, profile.nodeCount);
  const ids = new Set<number>();

  for (const candidate of candidates) {
    if (!candidate.active || !isEnemyCorporeal(candidate.kind, phase)) continue;
    const hit = nodeAngles.some(nodeAngle => pointDistanceToDirectedOrbitArc(
      originX,
      originY,
      candidate.x,
      candidate.y,
      profile.radius,
      nodeAngle,
      direction,
      profile.shearArcRad,
    ) <= profile.shearContactRadius);
    if (hit) ids.add(candidate.id);
  }

  return Object.freeze([...ids].sort((a, b) => a - b));
}
