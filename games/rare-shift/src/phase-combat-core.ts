import { exclusiveDeltaRows } from "./v2-art-core.ts";
import type { FrameRows, Phase } from "./types.ts";

export type V2EnemyKind = "TRACE" | "SPLIT_A" | "SPLIT_B";
export type V2ThreatPhase = "COMMON" | "A" | "B";

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
  readonly hitRadius: number;
}

export function enemyThreatPhase(kind: V2EnemyKind): V2ThreatPhase {
  if (kind === "TRACE") return "COMMON";
  return kind === "SPLIT_A" ? "A" : "B";
}

export function isEnemyCorporeal(kind: V2EnemyKind, phase: Phase): boolean {
  const threat = enemyThreatPhase(kind);
  return threat === "COMMON" || threat === phase;
}

export function enemyContactDamage(kind: V2EnemyKind): number {
  return kind === "TRACE" ? 8 : 10;
}

export function enemyBaseHp(kind: V2EnemyKind): number {
  return kind === "TRACE" ? 20 : 16;
}

export function enemyMoveSpeed(kind: V2EnemyKind): number {
  return kind === "TRACE" ? 54 : 62;
}

export function deltaDamageForRank(rank: number): number {
  if (!Number.isInteger(rank) || rank < 1 || rank > 5) throw new Error("DELTA BURST rank must be an integer from 1 to 5.");
  return 12 + (rank - 1) * 4;
}

export function deltaCooldownForRank(rank: number): number {
  if (!Number.isInteger(rank) || rank < 1 || rank > 5) throw new Error("DELTA BURST rank must be an integer from 1 to 5.");
  return Math.max(460, 860 - (rank - 1) * 85);
}

export function buildDeltaProfile(a: FrameRows, b: FrameRows, phase: Phase, rank: number): DeltaProfile {
  const rows = exclusiveDeltaRows(a, b, phase);
  const points: DeltaPoint[] = [];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (rows[y][x] === "#") points.push(Object.freeze({ x: x - 7.5, y: y - 7.5 }));
    }
  }
  if (points.length === 0) throw new Error(`Canonical Phase ${phase} has no exclusive DELTA pixels.`);
  return Object.freeze({
    phase,
    rank,
    pixelCount: points.length,
    points: Object.freeze(points),
    damage: deltaDamageForRank(rank),
    cooldownMs: deltaCooldownForRank(rank),
    hitRadius: rank >= 4 ? 8 : 7,
  });
}

export function deltaHitsTarget(
  profile: DeltaProfile,
  targetDx: number,
  targetDy: number,
  pixelWorldScale = 8,
): boolean {
  if (!(pixelWorldScale > 0)) throw new Error("pixelWorldScale must be positive.");
  const r2 = profile.hitRadius * profile.hitRadius;
  for (const point of profile.points) {
    const dx = targetDx - point.x * pixelWorldScale;
    const dy = targetDy - point.y * pixelWorldScale;
    if (dx * dx + dy * dy <= r2) return true;
  }
  return false;
}
