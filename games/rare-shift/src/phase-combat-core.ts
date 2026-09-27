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
  readonly worldScale: number;
  readonly staggerMs: number;
}

export interface DeltaEchoProfile extends DeltaProfile {
  readonly rank: 4 | 5;
  readonly damage: 4;
  readonly cooldownMs: 0;
  readonly worldScale: 9.5;
  readonly staggerMs: 0;
}

export const DELTA_PHASE_ECHO_DELAY_MS = 140;
export const DELTA_PHASE_ECHO_REARM_MS = 650;
export const DELTA_PHASE_ECHO_DAMAGE = 4;
export const DELTA_RANK_V_NORMAL_STAGGER_MS = 90;
export const DELTA_RANK_V_ELITE_STAGGER_CAP_MS = 45;
export const DELTA_RANK_V_BOSS_STAGGER_DEFAULT_MS = 0;

const DELTA_DAMAGE_BY_RANK = Object.freeze([12, 12, 12, 12, 14] as const);
const DELTA_COOLDOWN_BY_RANK = Object.freeze([860, 720, 720, 720, 720] as const);

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

function assertDeltaRank(rank: number): asserts rank is 1 | 2 | 3 | 4 | 5 {
  if (!Number.isInteger(rank) || rank < 1 || rank > 5) throw new Error("DELTA BURST rank must be an integer from 1 to 5.");
}

export function deltaDamageForRank(rank: number): number {
  assertDeltaRank(rank);
  return DELTA_DAMAGE_BY_RANK[rank - 1];
}

export function deltaCooldownForRank(rank: number): number {
  assertDeltaRank(rank);
  return DELTA_COOLDOWN_BY_RANK[rank - 1];
}

export function deltaWorldScaleForRank(rank: number): number {
  assertDeltaRank(rank);
  return rank >= 3 ? 9.5 : 8;
}

export function deltaStaggerForRank(rank: number): number {
  assertDeltaRank(rank);
  return rank >= 5 ? DELTA_RANK_V_NORMAL_STAGGER_MS : 0;
}

export function migrateCooldownAccumulator(oldAccumulatorMs: number, oldCooldownMs: number, newCooldownMs: number): number {
  if (![oldAccumulatorMs, oldCooldownMs, newCooldownMs].every(Number.isFinite)) throw new Error("DELTA cooldown migration inputs must be finite.");
  if (oldAccumulatorMs < 0 || oldCooldownMs <= 0 || newCooldownMs <= 0) throw new Error("DELTA cooldown migration inputs are out of range.");
  const progress = Math.max(0, Math.min(1, oldAccumulatorMs / oldCooldownMs));
  return progress * newCooldownMs;
}

function deltaPoints(a: FrameRows, b: FrameRows, phase: Phase): readonly DeltaPoint[] {
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
  const points = deltaPoints(a, b, phase);
  return Object.freeze({
    phase,
    rank,
    pixelCount: points.length,
    points,
    damage: deltaDamageForRank(rank),
    cooldownMs: deltaCooldownForRank(rank),
    hitRadius: 18,
    worldScale: deltaWorldScaleForRank(rank),
    staggerMs: deltaStaggerForRank(rank),
  });
}

export function buildDeltaEchoProfile(a: FrameRows, b: FrameRows, previousPhase: Phase, rank: number): DeltaEchoProfile {
  if (rank !== 4 && rank !== 5) throw new Error("DELTA PHASE ECHO requires Rank IV or V.");
  const points = deltaPoints(a, b, previousPhase);
  return Object.freeze({
    phase: previousPhase,
    rank,
    pixelCount: points.length,
    points,
    damage: DELTA_PHASE_ECHO_DAMAGE,
    cooldownMs: 0,
    hitRadius: 18,
    worldScale: 9.5,
    staggerMs: 0,
  });
}

export function canScheduleDeltaPhaseEcho(rank: number, nowMs: number, rearmReadyAtMs: number): boolean {
  assertDeltaRank(rank);
  if (!Number.isFinite(nowMs) || !Number.isFinite(rearmReadyAtMs)) throw new Error("DELTA PHASE ECHO timing must be finite.");
  return rank >= 4 && nowMs >= rearmReadyAtMs;
}

export function isDeltaEchoTargetLegal(kind: V2EnemyKind, previousPhase: Phase, currentPhase: Phase): boolean {
  if (previousPhase === currentPhase) return false;
  return enemyThreatPhase(kind) === previousPhase && !isEnemyCorporeal(kind, currentPhase);
}

export function deltaHitsTarget(
  profile: DeltaProfile,
  targetDx: number,
  targetDy: number,
  pixelWorldScale = profile.worldScale,
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
