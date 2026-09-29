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

export interface VectorRankProfile extends VectorProfile {
  readonly rank: number;
  readonly maxHits: number;
  readonly damageSequence: readonly number[];
  readonly corridorRadius: number;
  readonly priorityBand: number;
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

export interface VectorLineHit {
  readonly id: number;
  readonly kind: V2EnemyKind;
  readonly alongRay: number;
  readonly perpendicularDistance: number;
}

export interface VectorTransferState {
  readonly armed: boolean;
  readonly expiresAtMs: number | null;
  readonly phase: Phase | null;
}

export interface VectorLockState {
  readonly targetId: number | null;
  readonly stacks: number;
}

export const VECTOR_TRANSFER_WINDOW_MS = 1200 as const;
export const VECTOR_PRIORITY_BAND_PX = 120 as const;
export const VECTOR_LINE_CORRIDOR_RADIUS = 20 as const;
export const VECTOR_MAX_LOCK_STACKS = 3 as const;

export const VECTOR_RANK_I: VectorProfile = Object.freeze({
  damage: 10,
  cooldownMs: 760,
  range: 560,
  speed: 960,
  hitRadius: 18,
  maxInFlight: 2,
});

function assertRank(rank: number): void {
  if (!Number.isInteger(rank) || rank < 1 || rank > 5) throw new Error("VECTOR rank must be an integer from 1 to 5.");
}

export function vectorPriorityTier(kind: V2EnemyKind): number {
  return kind === "TRACE" ? 1 : 0;
}

export function buildVectorProfile(rank: number, transferShot = false): VectorRankProfile {
  assertRank(rank);
  const maxHits = rank === 1 ? 1 : transferShot && rank >= 4 ? 3 : 2;
  const damageSequence = maxHits === 1 ? [10] : maxHits === 2 ? [10, 7] : [10, 7, 5];
  return Object.freeze({
    rank,
    damage: 10,
    cooldownMs: VECTOR_RANK_I.cooldownMs,
    range: VECTOR_RANK_I.range,
    speed: VECTOR_RANK_I.speed,
    hitRadius: VECTOR_RANK_I.hitRadius,
    maxInFlight: VECTOR_RANK_I.maxInFlight,
    maxHits,
    damageSequence: Object.freeze(damageSequence),
    corridorRadius: rank >= 2 ? VECTOR_LINE_CORRIDOR_RADIUS : 0,
    priorityBand: rank >= 3 ? VECTOR_PRIORITY_BAND_PX : 0,
  });
}

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

function distanceSq(candidate: VectorTargetCandidate, originX: number, originY: number): number {
  const dx = candidate.x - originX;
  const dy = candidate.y - originY;
  return dx * dx + dy * dy;
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
    const d2 = distanceSq(candidate, originX, originY);
    if (best === null || d2 < best.distanceSq || (d2 === best.distanceSq && candidate.id < best.id)) {
      best = Object.freeze({ id: candidate.id, kind: candidate.kind, distanceSq: d2 });
    }
  }
  return best;
}

export function acquirePriorityVectorTarget(
  candidates: readonly VectorTargetCandidate[],
  phase: Phase,
  originX: number,
  originY: number,
  lockedTargetId: number | null = null,
  range = VECTOR_RANK_I.range,
  priorityBand: number = VECTOR_PRIORITY_BAND_PX,
): VectorTargetResult | null {
  const legal = candidates
    .filter(candidate => isVectorTargetLegal(candidate, phase, originX, originY, range))
    .map(candidate => ({ candidate, d2: distanceSq(candidate, originX, originY) }));
  if (legal.length === 0) return null;
  const nearest = Math.sqrt(Math.min(...legal.map(item => item.d2)));
  const maxDistance = Math.min(range, nearest + priorityBand);
  const band = legal.filter(item => Math.sqrt(item.d2) <= maxDistance);
  const highestTier = Math.max(...band.map(item => vectorPriorityTier(item.candidate.kind)));
  const finalists = band.filter(item => vectorPriorityTier(item.candidate.kind) === highestTier);
  finalists.sort((a, b) => {
    const aLocked = a.candidate.id === lockedTargetId ? 0 : 1;
    const bLocked = b.candidate.id === lockedTargetId ? 0 : 1;
    return aLocked - bLocked || a.d2 - b.d2 || a.candidate.id - b.candidate.id;
  });
  const winner = finalists[0];
  return Object.freeze({ id: winner.candidate.id, kind: winner.candidate.kind, distanceSq: winner.d2 });
}

export function planVectorLineHits(
  candidates: readonly VectorTargetCandidate[],
  phase: Phase,
  originX: number,
  originY: number,
  primary: VectorTargetCandidate,
  maxHits: 2 | 3,
  range: number = VECTOR_RANK_I.range,
  corridorRadius: number = VECTOR_LINE_CORRIDOR_RADIUS,
): readonly VectorLineHit[] {
  if (!isVectorTargetLegal(primary, phase, originX, originY, range)) return Object.freeze([]);
  const vx = primary.x - originX;
  const vy = primary.y - originY;
  const primaryDistance = Math.hypot(vx, vy);
  if (primaryDistance <= 0) return Object.freeze([]);
  const ux = vx / primaryDistance;
  const uy = vy / primaryDistance;
  const hits: VectorLineHit[] = [Object.freeze({ id: primary.id, kind: primary.kind, alongRay: primaryDistance, perpendicularDistance: 0 })];
  const secondaries = candidates
    .filter(candidate => candidate.id !== primary.id && isVectorTargetLegal(candidate, phase, originX, originY, range))
    .map(candidate => {
      const dx = candidate.x - originX;
      const dy = candidate.y - originY;
      const along = dx * ux + dy * uy;
      const perp = Math.abs(dx * uy - dy * ux);
      return { candidate, along, perp };
    })
    .filter(item => item.along > primaryDistance && item.along <= range && item.perp <= corridorRadius)
    .sort((a, b) => a.along - b.along || a.candidate.id - b.candidate.id);
  for (const item of secondaries.slice(0, maxHits - 1)) {
    hits.push(Object.freeze({ id: item.candidate.id, kind: item.candidate.kind, alongRay: item.along, perpendicularDistance: item.perp }));
  }
  return Object.freeze(hits);
}

export function armVectorTransfer(nowMs: number, phase: Phase): VectorTransferState {
  if (!Number.isFinite(nowMs) || nowMs < 0) throw new Error("VECTOR transfer time must be finite and non-negative.");
  return Object.freeze({ armed: true, expiresAtMs: nowMs + VECTOR_TRANSFER_WINDOW_MS, phase });
}

export function isVectorTransferArmed(state: VectorTransferState, nowMs: number): boolean {
  return state.armed && state.expiresAtMs !== null && nowMs < state.expiresAtMs;
}

export function consumeVectorTransfer(state: VectorTransferState, nowMs: number): VectorTransferState {
  if (!isVectorTransferArmed(state, nowMs)) return Object.freeze({ armed: false, expiresAtMs: null, phase: null });
  return Object.freeze({ armed: false, expiresAtMs: null, phase: null });
}

export function initialVectorLockState(): VectorLockState {
  return Object.freeze({ targetId: null, stacks: 0 });
}

export function vectorPrimaryDamageForStacks(stacks: number): number {
  if (!Number.isInteger(stacks) || stacks < 0 || stacks > VECTOR_MAX_LOCK_STACKS) throw new Error("VECTOR lock stacks must be 0..3.");
  return [10, 12, 14, 16][stacks];
}

export function recordVectorPrimaryHit(state: VectorLockState, targetId: number): VectorLockState {
  if (!Number.isInteger(targetId) || targetId < 0) throw new Error("VECTOR lock target ID must be a non-negative integer.");
  if (state.targetId !== targetId) return Object.freeze({ targetId, stacks: 1 });
  return Object.freeze({ targetId, stacks: Math.min(VECTOR_MAX_LOCK_STACKS, state.stacks + 1) });
}

export function resetVectorLock(): VectorLockState {
  return initialVectorLockState();
}