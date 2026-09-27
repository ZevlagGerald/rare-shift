import { exclusiveDeltaRows } from "./v2-art-core.ts";
import type { FrameRows, Phase } from "./types.ts";

export type V2EnemyKind = "TRACE" | "SPLIT_A" | "SPLIT_B";
export type V2ThreatPhase = "COMMON" | "A" | "B";
export type DeltaTargetRole = "NORMAL" | "ELITE" | "BOSS";

export interface DeltaPoint {
  readonly x: number;
  readonly y: number;
}

export interface DeltaProfile {
  readonly phase: Phase;
  readonly rank: number;
  readonly pixelCount: number;
  readonly points: readonly DeltaPoint[];
  readonly damage: number;
  readonly cooldownMs: number;
  readonly worldScale: number;
  readonly hitRadius: number;
  readonly staggerMs: number;
}

export interface DeltaEchoProfile {
  readonly phase: Phase;
  readonly pixelCount: number;
  readonly points: readonly DeltaPoint[];
  readonly damage: number;
  readonly delayMs: number;
  readonly rearmMs: number;
  readonly worldScale: number;
  readonly hitRadius: number;
}

export const DELTA_ECHO_DELAY_MS = 140;
export const DELTA_ECHO_REARM_MS = 650;
export const DELTA_ECHO_DAMAGE = 4;
export const DELTA_ECHO_WORLD_SCALE = 9.5;
export const DELTA_ECHO_HIT_RADIUS = 18;

export function enemyThreatPhase(kind: V2EnemyKind): V2ThreatPhase {
  if (kind === "TRACE") return "COMMON";
  return kind === "SPLIT_A" ? "A" : "B";
}

export function isEnemyCorporeal(kind: V2EnemyKind, phase: Phase): boolean {
  const threat = enemyThreatPhase(kind);
  return threat === "COMMON" || threat === phase;
}

export function enemyContactDamage(kind: V2EnemyKind): number {
  return kind === "TRACE" ? 4 : 5;
}

export function enemyBaseHp(kind: V2EnemyKind): number {
  return kind === "TRACE" ? 20 : 16;
}

export function enemyMoveSpeed(kind: V2EnemyKind): number {
  return kind === "TRACE" ? 54 : 62;
}

function assertDeltaRank(rank: number): void {
  if (!Number.isInteger(rank) || rank < 1 || rank > 5) throw new Error("DELTA BURST rank must be an integer from 1 to 5.");
}

export function deltaDamageForRank(rank: number): number {
  assertDeltaRank(rank);
  return rank === 5 ? 14 : 12;
}

export function deltaCooldownForRank(rank: number): number {
  assertDeltaRank(rank);
  return rank === 1 ? 860 : 720;
}

export function deltaWorldScaleForRank(rank: number): number {
  assertDeltaRank(rank);
  return rank >= 3 ? 9.5 : 8;
}

export function deltaStaggerDurationForRole(rank: number, role: DeltaTargetRole): number {
  assertDeltaRank(rank);
  if (rank < 5) return 0;
  if (role === "NORMAL") return 90;
  if (role === "ELITE") return 45;
  return 0;
}

export function migrateCooldownAccumulator(currentMs: number, oldCooldownMs: number, newCooldownMs: number): number {
  if (!Number.isFinite(currentMs) || currentMs < 0) throw new Error("Cooldown accumulator must be finite and non-negative.");
  if (!(oldCooldownMs > 0) || !(newCooldownMs > 0)) throw new Error("Cooldown values must be positive.");
  const progress = Math.max(0, Math.min(1, currentMs / oldCooldownMs));
  return progress * newCooldownMs;
}

export function migrateDeltaCooldownAccumulator(currentMs: number, oldRank: number, newRank: number): number {
  return migrateCooldownAccumulator(currentMs, deltaCooldownForRank(oldRank), deltaCooldownForRank(newRank));
}

function buildDeltaPoints(a: FrameRows, b: FrameRows, phase: Phase): readonly DeltaPoint[] {
  const rows = exclusiveDeltaRows(a, b, phase);
  const points: DeltaPoint[] = [];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (rows[y][x] === "#") points.push(Object.freeze({ x: x - 7.5, y: y - 7.5 }));
    }
  }
  if (points.length === 0) throw new Error(`Canonical Phase ${phase} has no exclusive DELTA pixels.`);
  return Object.freeze(points);
}

export function buildDeltaProfile(a: FrameRows, b: FrameRows, phase: Phase, rank: number): DeltaProfile {
  assertDeltaRank(rank);
  const points = buildDeltaPoints(a, b, phase);
  return Object.freeze({
    phase,
    rank,
    pixelCount: points.length,
    points,
    damage: deltaDamageForRank(rank),
    cooldownMs: deltaCooldownForRank(rank),
    worldScale: deltaWorldScaleForRank(rank),
    hitRadius: 18,
    staggerMs: deltaStaggerDurationForRole(rank, "NORMAL"),
  });
}

export function buildDeltaEchoProfile(a: FrameRows, b: FrameRows, previousPhase: Phase): DeltaEchoProfile {
  const points = buildDeltaPoints(a, b, previousPhase);
  return Object.freeze({
    phase: previousPhase,
    pixelCount: points.length,
    points,
    damage: DELTA_ECHO_DAMAGE,
    delayMs: DELTA_ECHO_DELAY_MS,
    rearmMs: DELTA_ECHO_REARM_MS,
    worldScale: DELTA_ECHO_WORLD_SCALE,
    hitRadius: DELTA_ECHO_HIT_RADIUS,
  });
}

function pointsHitTarget(
  points: readonly DeltaPoint[],
  hitRadius: number,
  targetDx: number,
  targetDy: number,
  pixelWorldScale: number,
): boolean {
  if (!(pixelWorldScale > 0)) throw new Error("pixelWorldScale must be positive.");
  const r2 = hitRadius * hitRadius;
  for (const point of points) {
    const dx = targetDx - point.x * pixelWorldScale;
    const dy = targetDy - point.y * pixelWorldScale;
    if (dx * dx + dy * dy <= r2) return true;
  }
  return false;
}

export function deltaHitsTarget(
  profile: DeltaProfile,
  targetDx: number,
  targetDy: number,
  pixelWorldScale = profile.worldScale,
): boolean {
  return pointsHitTarget(profile.points, profile.hitRadius, targetDx, targetDy, pixelWorldScale);
}

export function deltaEchoHitsTarget(
  profile: DeltaEchoProfile,
  targetDx: number,
  targetDy: number,
): boolean {
  return pointsHitTarget(profile.points, profile.hitRadius, targetDx, targetDy, profile.worldScale);
}

export function isDeltaEchoTargetEligible(kind: V2EnemyKind, previousPhase: Phase, currentPhase: Phase): boolean {
  if (previousPhase === currentPhase) return false;
  return enemyThreatPhase(kind) === previousPhase && !isEnemyCorporeal(kind, currentPhase);
}

export function canScheduleDeltaEcho(rank: number, lastScheduledAtMs: number | null, nowMs: number): boolean {
  assertDeltaRank(rank);
  if (!Number.isFinite(nowMs) || nowMs < 0) throw new Error("DELTA echo schedule time must be finite and non-negative.");
  if (rank < 4) return false;
  if (lastScheduledAtMs === null) return true;
  if (!Number.isFinite(lastScheduledAtMs) || lastScheduledAtMs < 0) throw new Error("DELTA echo prior schedule time must be finite and non-negative.");
  return nowMs - lastScheduledAtMs >= DELTA_ECHO_REARM_MS;
}
