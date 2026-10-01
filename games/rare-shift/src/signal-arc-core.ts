import { isEnemyCorporeal, type V2EnemyKind } from "./phase-combat-core.ts";
import type { Phase } from "./types.ts";

export type SignalArcRank = 1 | 2 | 3 | 4 | 5;
export type SignalArcRouting = "NEAREST" | "FORWARD_DEGREE";

export interface SignalArcProfile {
  readonly cooldownMs: number;
  readonly acquisitionRange: number;
  readonly relayRange: number;
  readonly maxTargets: number;
  readonly damages: readonly number[];
  readonly commonRelayBonus?: number;
  readonly commonBonusUses?: number;
  readonly routing?: SignalArcRouting;
}

export interface SignalArcRankProfile extends SignalArcProfile {
  readonly rank: SignalArcRank;
  readonly commonRelayBonus: number;
  readonly commonBonusUses: 0 | 1;
  readonly routing: SignalArcRouting;
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
  readonly edgeRange: number;
  readonly usedCommonBonus: boolean;
  readonly forwardDegree: number | null;
}

export const SIGNAL_ARC_RANK_I: SignalArcProfile = Object.freeze({
  cooldownMs: 1250,
  acquisitionRange: 420,
  relayRange: 180,
  maxTargets: 3,
  damages: Object.freeze([10, 8, 6]) as readonly [10, 8, 6],
});

function freezeDamages(values: readonly number[]): readonly number[] {
  return Object.freeze([...values]);
}

export function buildSignalArcProfile(rank: number): SignalArcRankProfile {
  if (!Number.isInteger(rank) || rank < 1 || rank > 5) throw new Error("SIGNAL ARC rank must be an integer from I to V.");
  if (rank === 1) {
    return Object.freeze({
      rank: 1,
      cooldownMs: 1250,
      acquisitionRange: 420,
      relayRange: 180,
      maxTargets: 3,
      damages: freezeDamages([10, 8, 6]),
      commonRelayBonus: 0,
      commonBonusUses: 0,
      routing: "NEAREST",
    });
  }
  if (rank === 2) {
    return Object.freeze({
      rank: 2,
      cooldownMs: 1250,
      acquisitionRange: 420,
      relayRange: 180,
      maxTargets: 4,
      damages: freezeDamages([10, 8, 6, 5]),
      commonRelayBonus: 0,
      commonBonusUses: 0,
      routing: "NEAREST",
    });
  }
  if (rank === 3) {
    return Object.freeze({
      rank: 3,
      cooldownMs: 1250,
      acquisitionRange: 420,
      relayRange: 180,
      maxTargets: 4,
      damages: freezeDamages([10, 9, 8, 7]),
      commonRelayBonus: 0,
      commonBonusUses: 0,
      routing: "NEAREST",
    });
  }
  return Object.freeze({
    rank: rank as 4 | 5,
    cooldownMs: 1250,
    acquisitionRange: 420,
    relayRange: 180,
    maxTargets: 4,
    damages: freezeDamages([10, 9, 8, 7]),
    commonRelayBonus: 60,
    commonBonusUses: 1,
    routing: rank >= 5 ? "FORWARD_DEGREE" : "NEAREST",
  });
}

function snapshotCandidates(candidates: readonly SignalArcCandidate[]): readonly SignalArcCandidate[] {
  return Object.freeze(candidates.map(candidate => Object.freeze({
    id: candidate.id,
    kind: candidate.kind,
    active: candidate.active,
    x: candidate.x,
    y: candidate.y,
  })));
}

function distanceSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function legalCandidates(
  candidates: readonly SignalArcCandidate[],
  phase: Phase,
  originX: number,
  originY: number,
  maxRange: number,
  visited: ReadonlySet<number>,
): readonly SignalArcCandidate[] {
  const rangeSq = maxRange * maxRange;
  return candidates.filter(candidate => (
    candidate.active
    && !visited.has(candidate.id)
    && isEnemyCorporeal(candidate.kind, phase)
    && distanceSq(candidate.x, candidate.y, originX, originY) <= rangeSq
  ));
}

function nearestCandidate(
  candidates: readonly SignalArcCandidate[],
  phase: Phase,
  originX: number,
  originY: number,
  maxRange: number,
  visited: ReadonlySet<number>,
): SignalArcCandidate | null {
  const legal = legalCandidates(candidates, phase, originX, originY, maxRange, visited);
  let best: SignalArcCandidate | null = null;
  let bestDistanceSq = Number.POSITIVE_INFINITY;
  for (const candidate of legal) {
    const candidateDistanceSq = distanceSq(candidate.x, candidate.y, originX, originY);
    if (candidateDistanceSq < bestDistanceSq || (candidateDistanceSq === bestDistanceSq && (best === null || candidate.id < best.id))) {
      best = candidate;
      bestDistanceSq = candidateDistanceSq;
    }
  }
  return best;
}

export function signalArcForwardDegree(
  candidate: SignalArcCandidate,
  candidates: readonly SignalArcCandidate[],
  phase: Phase,
  visited: ReadonlySet<number>,
  profile: SignalArcProfile,
  commonBonusUsesRemaining: number,
): number {
  const commonBonus = profile.commonRelayBonus ?? 0;
  const nextRange = profile.relayRange + (commonBonusUsesRemaining > 0 && candidate.kind === "TRACE" ? commonBonus : 0);
  const blocked = new Set(visited);
  blocked.add(candidate.id);
  return legalCandidates(candidates, phase, candidate.x, candidate.y, nextRange, blocked).length;
}

function selectRelayCandidate(
  candidates: readonly SignalArcCandidate[],
  phase: Phase,
  origin: SignalArcCandidate,
  maxRange: number,
  visited: ReadonlySet<number>,
  profile: SignalArcProfile,
  commonBonusUsesRemainingAfterCurrentEdge: number,
): { readonly candidate: SignalArcCandidate; readonly forwardDegree: number | null } | null {
  const legal = legalCandidates(candidates, phase, origin.x, origin.y, maxRange, visited);
  if (legal.length === 0) return null;
  if ((profile.routing ?? "NEAREST") !== "FORWARD_DEGREE") {
    const candidate = nearestCandidate(candidates, phase, origin.x, origin.y, maxRange, visited);
    return candidate ? Object.freeze({ candidate, forwardDegree: null }) : null;
  }

  let best: SignalArcCandidate | null = null;
  let bestDegree = -1;
  let bestDistanceSq = Number.POSITIVE_INFINITY;
  for (const candidate of legal) {
    const degree = signalArcForwardDegree(candidate, candidates, phase, visited, profile, commonBonusUsesRemainingAfterCurrentEdge);
    const candidateDistanceSq = distanceSq(candidate.x, candidate.y, origin.x, origin.y);
    if (
      degree > bestDegree
      || (degree === bestDegree && candidateDistanceSq < bestDistanceSq)
      || (degree === bestDegree && candidateDistanceSq === bestDistanceSq && (best === null || candidate.id < best.id))
    ) {
      best = candidate;
      bestDegree = degree;
      bestDistanceSq = candidateDistanceSq;
    }
  }
  return best ? Object.freeze({ candidate: best, forwardDegree: bestDegree }) : null;
}

export function planSignalArc(
  candidates: readonly SignalArcCandidate[],
  phase: Phase,
  originX: number,
  originY: number,
  profile: SignalArcProfile = SIGNAL_ARC_RANK_I,
): readonly SignalArcHop[] {
  const snapshot = snapshotCandidates(candidates);
  const visited = new Set<number>();
  const path: SignalArcHop[] = [];
  const initial = nearestCandidate(snapshot, phase, originX, originY, profile.acquisitionRange, visited);
  if (!initial) return Object.freeze(path);

  visited.add(initial.id);
  path.push(Object.freeze({
    id: initial.id,
    kind: initial.kind,
    x: initial.x,
    y: initial.y,
    damage: profile.damages[0] ?? 0,
    edgeRange: profile.acquisitionRange,
    usedCommonBonus: false,
    forwardDegree: null,
  }));

  let source = initial;
  let commonBonusUsesRemaining = Math.max(0, Math.floor(profile.commonBonusUses ?? 0));
  const commonBonus = profile.commonRelayBonus ?? 0;

  for (let index = 1; index < profile.maxTargets; index += 1) {
    const currentEdgeUsesBonus = commonBonusUsesRemaining > 0 && source.kind === "TRACE" && commonBonus > 0;
    const edgeRange = profile.relayRange + (currentEdgeUsesBonus ? commonBonus : 0);
    const bonusUsesAfterCurrentEdge = commonBonusUsesRemaining - (currentEdgeUsesBonus ? 1 : 0);
    const selected = selectRelayCandidate(snapshot, phase, source, edgeRange, visited, profile, bonusUsesAfterCurrentEdge);
    if (!selected) break;

    if (currentEdgeUsesBonus) commonBonusUsesRemaining -= 1;
    const candidate = selected.candidate;
    visited.add(candidate.id);
    path.push(Object.freeze({
      id: candidate.id,
      kind: candidate.kind,
      x: candidate.x,
      y: candidate.y,
      damage: profile.damages[Math.min(index, profile.damages.length - 1)] ?? 0,
      edgeRange,
      usedCommonBonus: currentEdgeUsesBonus,
      forwardDegree: selected.forwardDegree,
    }));
    source = candidate;
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
