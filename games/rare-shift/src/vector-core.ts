import { isEnemyCorporeal, type V2EnemyKind } from "./phase-combat-core.ts";
import type { Phase } from "./types.ts";

export interface VectorProfile {
  readonly damage: number;
  readonly cooldownMs: number;
  readonly range: number;
  readonly speed: number;
  readonly hitRadius: number;
  readonly maxInFlight: number;
}

export interface VectorTargetCandidate {
  readonly id: number;
  readonly kind: V2EnemyKind;
  readonly active: boolean;
  readonly x: number;
  readonly y: number;
}

export interface VectorTargetResult {
  readonly id: number;
  readonly kind: V2EnemyKind;
  readonly distanceSq: number;
}

export const VECTOR_RANK_I: VectorProfile = Object.freeze({
  damage: 10,
  cooldownMs: 760,
  range: 560,
  speed: 960,
  hitRadius: 18,
  maxInFlight: 2,
});

export function isVectorTargetLegal(
  candidate: VectorTargetCandidate,
  phase: Phase,
  originX: number,
  originY: number,
  range = VECTOR_RANK_I.range,
): boolean {
  if (!candidate.active || !isEnemyCorporeal(candidate.kind, phase)) return false;
  const dx = candidate.x - originX;
  const dy = candidate.y - originY;
  return dx * dx + dy * dy <= range * range;
}

export function acquireVectorTarget(
  candidates: readonly VectorTargetCandidate[],
  phase: Phase,
  originX: number,
  originY: number,
  range = VECTOR_RANK_I.range,
): VectorTargetResult | null {
  let best: VectorTargetResult | null = null;
  for (const candidate of candidates) {
    if (!isVectorTargetLegal(candidate, phase, originX, originY, range)) continue;
    const dx = candidate.x - originX;
    const dy = candidate.y - originY;
    const distanceSq = dx * dx + dy * dy;
    if (
      best === null
      || distanceSq < best.distanceSq
      || (distanceSq === best.distanceSq && candidate.id < best.id)
    ) {
      best = Object.freeze({ id: candidate.id, kind: candidate.kind, distanceSq });
    }
  }
  return best;
}
