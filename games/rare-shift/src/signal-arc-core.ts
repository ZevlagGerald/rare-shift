import { isEnemyCorporeal, type V2EnemyKind } from "./phase-combat-core.ts";
import type { Phase } from "./types.ts";

export interface SignalArcProfile {
  readonly cooldownMs: number;
  readonly acquisitionRange: number;
  readonly relayRange: number;
  readonly maxTargets: number;
  readonly damages: readonly [number, number, number];
}

export interface SignalArcCandidate {
  readonly id: number;
  readonly kind: V2EnemyKind;
  readonly active: boolean;
  readonly x: number;
  readonly y: number;
}

export interface SignalArcHop {
  readonly id: number;
  readonly kind: V2EnemyKind;
  readonly x: number;
  readonly y: number;
  readonly damage: number;
}

export const SIGNAL_ARC_RANK_I: SignalArcProfile = Object.freeze({
  cooldownMs: 1250,
  acquisitionRange: 420,
  relayRange: 180,
  maxTargets: 3,
  damages: Object.freeze([10, 8, 6]) as readonly [10, 8, 6],
});

function nearestCandidate(
  candidates: readonly SignalArcCandidate[],
  phase: Phase,
  originX: number,
  originY: number,
  maxRange: number,
  visited: ReadonlySet<number>,
): SignalArcCandidate | null {
  let best: SignalArcCandidate | null = null;
  let bestDistanceSq = Number.POSITIVE_INFINITY;
  const rangeSq = maxRange * maxRange;
  for (const candidate of candidates) {
    if (!candidate.active || visited.has(candidate.id) || !isEnemyCorporeal(candidate.kind, phase)) continue;
    const dx = candidate.x - originX;
    const dy = candidate.y - originY;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq > rangeSq) continue;
    if (distanceSq < bestDistanceSq || (distanceSq === bestDistanceSq && (best === null || candidate.id < best.id))) {
      best = candidate;
      bestDistanceSq = distanceSq;
    }
  }
  return best;
}

export function planSignalArc(
  candidates: readonly SignalArcCandidate[],
  phase: Phase,
  originX: number,
  originY: number,
  profile: SignalArcProfile = SIGNAL_ARC_RANK_I,
): readonly SignalArcHop[] {
  const visited = new Set<number>();
  const path: SignalArcHop[] = [];
  let origin = { x: originX, y: originY };
  for (let index = 0; index < profile.maxTargets; index++) {
    const range = index === 0 ? profile.acquisitionRange : profile.relayRange;
    const candidate = nearestCandidate(candidates, phase, origin.x, origin.y, range, visited);
    if (!candidate) break;
    visited.add(candidate.id);
    path.push(Object.freeze({
      id: candidate.id,
      kind: candidate.kind,
      x: candidate.x,
      y: candidate.y,
      damage: profile.damages[Math.min(index, profile.damages.length - 1)],
    }));
    origin = { x: candidate.x, y: candidate.y };
  }
  return Object.freeze(path);
}

export function advanceSignalArcCooldown(currentMs: number, elapsedMs: number, profile: SignalArcProfile = SIGNAL_ARC_RANK_I): number {
  if (!Number.isFinite(currentMs) || currentMs < 0) throw new Error("SIGNAL ARC cooldown state must be finite and non-negative.");
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new Error("SIGNAL ARC elapsed time must be finite and non-negative.");
  return Math.min(profile.cooldownMs, currentMs + elapsedMs);
}

export function signalArcPhaseAfterSameTickShift(phase: Phase, shiftAccepted: boolean): Phase {
  return shiftAccepted ? (phase === "A" ? "B" : "A") : phase;
}
