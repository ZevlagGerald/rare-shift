import { isEnemyCorporeal, type V2EnemyKind } from "./phase-combat-core.ts";
import type { Phase } from "./types.ts";

export type VectorRank = 1 | 2 | 3 | 4 | 5;

export interface VectorProfile {
  readonly damage: number;
  readonly cooldownMs: number;
  readonly range: number;
  readonly speed: number;
  readonly hitRadius: number;
  readonly maxInFlight: number;
}

export interface VectorRankProfile extends VectorProfile {
  readonly rank: VectorRank;
  readonly normalMaxHits: number;
  readonly corridorRadius: number;
  readonly priorityBand: number;
  readonly transferWindowMs: number;
  readonly lockMaxStacks: number;
}

export interface VectorTargetCandidate {
  readonly id: number;
  readonly kind: V2EnemyKind;
  readonly active: boolean;
  readonly x: number;
  readonly y: number;
  readonly priorityTier?: number;
}

export interface VectorTargetResult {
  readonly id: number;
  readonly kind: V2EnemyKind;
  readonly distanceSq: number;
  readonly priorityTier: number;
}

export interface VectorShotTarget {
  readonly id: number;
  readonly kind: V2EnemyKind;
  readonly damage: number;
  readonly alongDistance: number;
}

export interface VectorShotPlan {
  readonly rank: VectorRank;
  readonly phase: Phase;
  readonly originX: number;
  readonly originY: number;
  readonly dirX: number;
  readonly dirY: number;
  readonly fixedRay: boolean;
  readonly transfer: boolean;
  readonly speed: number;
  readonly hitRadius: number;
  readonly travelBudget: number;
  readonly targets: readonly VectorShotTarget[];
}

export interface VectorTransferCharge {
  readonly phase: Phase;
  readonly armedAtMs: number;
  readonly expiresAtMs: number;
}

export interface VectorLockState {
  readonly targetId: number | null;
  readonly stacks: number;
}

export const VECTOR_TRANSFER_WINDOW_MS = 1200;
export const VECTOR_PRIORITY_BAND = 120;
export const VECTOR_LINE_CORRIDOR_RADIUS = 20;

export const VECTOR_RANK_I: VectorProfile = Object.freeze({
  damage: 10,
  cooldownMs: 760,
  range: 560,
  speed: 960,
  hitRadius: 18,
  maxInFlight: 2,
});

function assertVectorRank(rank: number): asserts rank is VectorRank {
  if (!Number.isInteger(rank) || rank < 1 || rank > 5) throw new Error("VECTOR rank must be an integer from 1 to 5.");
}

export function buildVectorRankProfile(rank: number): VectorRankProfile {
  assertVectorRank(rank);
  return Object.freeze({
    ...VECTOR_RANK_I,
    rank,
    normalMaxHits: rank === 1 ? 1 : 2,
    corridorRadius: rank >= 2 ? VECTOR_LINE_CORRIDOR_RADIUS : 0,
    priorityBand: rank >= 3 ? VECTOR_PRIORITY_BAND : 0,
    transferWindowMs: rank >= 4 ? VECTOR_TRANSFER_WINDOW_MS : 0,
    lockMaxStacks: rank >= 5 ? 3 : 0,
  });
}

export function vectorPriorityTier(candidate: VectorTargetCandidate): number {
  if (candidate.priorityTier !== undefined) {
    if (!Number.isInteger(candidate.priorityTier) || candidate.priorityTier < 0) throw new Error("VECTOR priority tier must be a non-negative integer.");
    return candidate.priorityTier;
  }
  return candidate.kind === "TRACE" ? 1 : 0;
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

function resultFor(candidate: VectorTargetCandidate, originX: number, originY: number): VectorTargetResult {
  const dx = candidate.x - originX;
  const dy = candidate.y - originY;
  return Object.freeze({
    id: candidate.id,
    kind: candidate.kind,
    distanceSq: dx * dx + dy * dy,
    priorityTier: vectorPriorityTier(candidate),
  });
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
    const result = resultFor(candidate, originX, originY);
    if (
      best === null
      || result.distanceSq < best.distanceSq
      || (result.distanceSq === best.distanceSq && result.id < best.id)
    ) best = result;
  }
  return best;
}

export function acquireVectorTargetForRank(
  candidates: readonly VectorTargetCandidate[],
  phase: Phase,
  originX: number,
  originY: number,
  rank: number,
  lockTargetId: number | null = null,
): VectorTargetResult | null {
  const profile = buildVectorRankProfile(rank);
  if (rank < 3) return acquireVectorTarget(candidates, phase, originX, originY, profile.range);
  const legal = candidates
    .filter(candidate => isVectorTargetLegal(candidate, phase, originX, originY, profile.range))
    .map(candidate => resultFor(candidate, originX, originY));
  if (legal.length === 0) return null;
  const nearestDistance = Math.sqrt(Math.min(...legal.map(result => result.distanceSq)));
  const bandLimit = Math.min(profile.range, nearestDistance + profile.priorityBand);
  const inBand = legal.filter(result => result.distanceSq <= bandLimit * bandLimit + 1e-9);
  const highestTier = Math.max(...inBand.map(result => result.priorityTier));
  const highest = inBand.filter(result => result.priorityTier === highestTier);
  if (rank >= 5 && lockTargetId !== null) {
    const locked = highest.find(result => result.id === lockTargetId);
    if (locked) return locked;
  }
  highest.sort((a, b) => a.distanceSq - b.distanceSq || a.id - b.id);
  return highest[0] ?? null;
}

export function vectorPrimaryDamageForLockStacks(stacks: number): number {
  if (!Number.isInteger(stacks) || stacks < 0 || stacks > 3) throw new Error("VECTOR lock stacks must be an integer from 0 to 3.");
  return [10, 12, 14, 16][stacks];
}

export function createVectorLockState(): VectorLockState {
  return Object.freeze({ targetId: null, stacks: 0 });
}

export function isVectorLockEligible(
  candidate: VectorTargetCandidate,
  phase: Phase,
  originX: number,
  originY: number,
): boolean {
  return isVectorTargetLegal(candidate, phase, originX, originY) && vectorPriorityTier(candidate) >= 1;
}

export function advanceVectorLockAfterPrimaryHit(
  state: VectorLockState,
  candidate: VectorTargetCandidate,
  phase: Phase,
  originX: number,
  originY: number,
): VectorLockState {
  if (!isVectorLockEligible(candidate, phase, originX, originY)) return createVectorLockState();
  if (state.targetId === candidate.id) return Object.freeze({ targetId: candidate.id, stacks: Math.min(3, state.stacks + 1) });
  return Object.freeze({ targetId: candidate.id, stacks: 1 });
}

export function planVectorShot(
  candidates: readonly VectorTargetCandidate[],
  phase: Phase,
  originX: number,
  originY: number,
  rank: number,
  primaryTargetId: number,
  options: { readonly transfer?: boolean; readonly lockStacks?: number } = {},
): VectorShotPlan {
  const profile = buildVectorRankProfile(rank);
  const primary = candidates.find(candidate => candidate.id === primaryTargetId) ?? null;
  if (!primary || !isVectorTargetLegal(primary, phase, originX, originY, profile.range)) throw new Error("VECTOR primary target must be active, corporeal and in range at launch.");
  const pdx = primary.x - originX;
  const pdy = primary.y - originY;
  const primaryDistance = Math.hypot(pdx, pdy);
  if (!(primaryDistance > 0)) throw new Error("VECTOR launch ray requires a non-zero primary distance.");
  const dirX = pdx / primaryDistance;
  const dirY = pdy / primaryDistance;
  const transfer = options.transfer === true && rank >= 4;
  const maxHits = transfer ? 3 : profile.normalMaxHits;
  const lockStacks = rank >= 5 ? (options.lockStacks ?? 0) : 0;
  const primaryDamage = rank >= 5 ? vectorPrimaryDamageForLockStacks(lockStacks) : VECTOR_RANK_I.damage;
  const targets: VectorShotTarget[] = [{ id: primary.id, kind: primary.kind, damage: primaryDamage, alongDistance: primaryDistance }];
  if (maxHits > 1) {
    const secondaries = candidates.flatMap(candidate => {
      if (candidate.id === primary.id || !isVectorTargetLegal(candidate, phase, originX, originY, profile.range)) return [];
      const dx = candidate.x - originX;
      const dy = candidate.y - originY;
      const alongDistance = dx * dirX + dy * dirY;
      if (alongDistance <= primaryDistance + 1e-9 || alongDistance > profile.range + 1e-9) return [];
      const perpendicularSq = Math.max(0, dx * dx + dy * dy - alongDistance * alongDistance);
      if (perpendicularSq > profile.corridorRadius * profile.corridorRadius + 1e-9) return [];
      return [{ candidate, alongDistance }];
    }).sort((a, b) => a.alongDistance - b.alongDistance || a.candidate.id - b.candidate.id);
    for (const secondary of secondaries.slice(0, maxHits - 1)) {
      const index = targets.length;
      targets.push(Object.freeze({
        id: secondary.candidate.id,
        kind: secondary.candidate.kind,
        damage: index === 1 ? 7 : 5,
        alongDistance: secondary.alongDistance,
      }));
    }
  }
  return Object.freeze({
    rank: profile.rank,
    phase,
    originX,
    originY,
    dirX,
    dirY,
    fixedRay: rank >= 2,
    transfer,
    speed: profile.speed,
    hitRadius: profile.hitRadius,
    travelBudget: profile.range,
    targets: Object.freeze(targets.map(target => Object.freeze(target))),
  });
}

export function armVectorPhaseTransfer(rank: number, phase: Phase, nowMs: number): VectorTransferCharge | null {
  assertVectorRank(rank);
  if (!Number.isFinite(nowMs) || nowMs < 0) throw new Error("VECTOR transfer time must be finite and non-negative.");
  if (rank < 4) return null;
  return Object.freeze({ phase, armedAtMs: nowMs, expiresAtMs: nowMs + VECTOR_TRANSFER_WINDOW_MS });
}

export function isVectorPhaseTransferArmed(charge: VectorTransferCharge | null, phase: Phase, nowMs: number): boolean {
  if (!Number.isFinite(nowMs) || nowMs < 0) throw new Error("VECTOR transfer time must be finite and non-negative.");
  return charge !== null && charge.phase === phase && nowMs < charge.expiresAtMs;
}
