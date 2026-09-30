import { enemyThreatPhase, isEnemyCorporeal, type DeltaPoint, type V2EnemyKind } from "./phase-combat-core.ts";
import type { SignalArcRankProfile } from "./signal-arc-core.ts";
import type { FrameRows, Phase } from "./types.ts";

export const RECONSTRUCTION_COMMON_DAMAGE = 4 as const;
export const RECONSTRUCTION_COMMON_DELAY_MS = 120 as const;
export const RECONSTRUCTION_COMMON_REARM_MS = 720 as const;
export const RECONSTRUCTION_COMMON_WORLD_SCALE = 9.5 as const;
export const RECONSTRUCTION_COMMON_HIT_RADIUS = 18 as const;

export interface ReconstructionCommonProfile {
  readonly points: readonly DeltaPoint[];
  readonly damage: typeof RECONSTRUCTION_COMMON_DAMAGE;
  readonly delayMs: typeof RECONSTRUCTION_COMMON_DELAY_MS;
  readonly rearmMs: typeof RECONSTRUCTION_COMMON_REARM_MS;
  readonly worldScale: typeof RECONSTRUCTION_COMMON_WORLD_SCALE;
  readonly hitRadius: typeof RECONSTRUCTION_COMMON_HIT_RADIUS;
}

function commonIntersectionPoints(a: FrameRows, b: FrameRows): readonly DeltaPoint[] {
  const points: DeltaPoint[] = [];
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      if (a[y]?.[x] === "#" && b[y]?.[x] === "#") points.push(Object.freeze({ x: x - 7.5, y: y - 7.5 }));
    }
  }
  return Object.freeze(points);
}

export function buildReconstructionCommonProfile(
  a: FrameRows,
  b: FrameRows,
  evolved: boolean,
): ReconstructionCommonProfile | null {
  if (!evolved) return null;
  return Object.freeze({
    points: commonIntersectionPoints(a, b),
    damage: RECONSTRUCTION_COMMON_DAMAGE,
    delayMs: RECONSTRUCTION_COMMON_DELAY_MS,
    rearmMs: RECONSTRUCTION_COMMON_REARM_MS,
    worldScale: RECONSTRUCTION_COMMON_WORLD_SCALE,
    hitRadius: RECONSTRUCTION_COMMON_HIT_RADIUS,
  });
}

export function canScheduleReconstructionCommon(
  evolved: boolean,
  lastScheduledAtMs: number | null,
  nowMs: number,
): boolean {
  if (!evolved) return false;
  if (!Number.isFinite(nowMs) || nowMs < 0) throw new Error("RECONSTRUCTION FIELD time must be finite and non-negative.");
  if (lastScheduledAtMs === null) return true;
  if (!Number.isFinite(lastScheduledAtMs) || lastScheduledAtMs < 0) throw new Error("RECONSTRUCTION FIELD prior schedule time must be finite and non-negative.");
  return nowMs - lastScheduledAtMs >= RECONSTRUCTION_COMMON_REARM_MS;
}

export function reconstructionCommonHitsTarget(
  profile: ReconstructionCommonProfile,
  targetDx: number,
  targetDy: number,
): boolean {
  const r2 = profile.hitRadius * profile.hitRadius;
  return profile.points.some(point => {
    const dx = targetDx - point.x * profile.worldScale;
    const dy = targetDy - point.y * profile.worldScale;
    return dx * dx + dy * dy <= r2;
  });
}

export function isReconstructionCommonTargetEligible(kind: V2EnemyKind): boolean {
  return enemyThreatPhase(kind) === "COMMON";
}

export const PRISM_REFRACTION_RADIUS = 220 as const;
export const PRISM_REFRACTION_DAMAGE = 6 as const;

export interface PrismTargetCandidate {
  readonly id: number;
  readonly kind: V2EnemyKind;
  readonly active: boolean;
  readonly x: number;
  readonly y: number;
}

export interface PrismRefractionTarget {
  readonly id: number;
  readonly kind: V2EnemyKind;
  readonly distanceSq: number;
  readonly damage: typeof PRISM_REFRACTION_DAMAGE;
}

export function selectPrismRefractionTarget(
  evolved: boolean,
  candidates: readonly PrismTargetCandidate[],
  phase: Phase,
  originX: number,
  originY: number,
  excludedIds: ReadonlySet<number>,
  radius = PRISM_REFRACTION_RADIUS,
): PrismRefractionTarget | null {
  if (!evolved) return null;
  if (!(radius > 0)) throw new Error("PRISM LANCE refraction radius must be positive.");
  const r2 = radius * radius;
  const legal = candidates
    .filter(candidate => candidate.active && !excludedIds.has(candidate.id) && isEnemyCorporeal(candidate.kind, phase))
    .map(candidate => {
      const dx = candidate.x - originX;
      const dy = candidate.y - originY;
      return { candidate, distanceSq: dx * dx + dy * dy };
    })
    .filter(item => item.distanceSq <= r2)
    .sort((a, b) => a.distanceSq - b.distanceSq || a.candidate.id - b.candidate.id);
  const winner = legal[0];
  if (!winner) return null;
  return Object.freeze({
    id: winner.candidate.id,
    kind: winner.candidate.kind,
    distanceSq: winner.distanceSq,
    damage: PRISM_REFRACTION_DAMAGE,
  });
}

export const SYNC_HALO_SAMPLE_COUNT = 6 as const;
export const SYNC_HALO_RADIUS = 84 as const;
export const SYNC_HALO_CONTROL_RADIUS = 112 as const;
export const SYNC_HALO_CONTROL_REARM_MS = 650 as const;
export const SYNC_HALO_CONTROL_TARGET_CAP = 6 as const;

export type SyncHaloControlRole = "NORMAL" | "COMMON" | "ELITE" | "BOSS";

export interface SyncHaloControlCandidate {
  readonly id: number;
  readonly kind: V2EnemyKind;
  readonly active: boolean;
  readonly x: number;
  readonly y: number;
  readonly role: SyncHaloControlRole;
}

export interface SyncHaloControlTarget {
  readonly id: number;
  readonly displacement: number;
}

export function syncHaloAngles(anchor: number, evolved: boolean): readonly number[] {
  if (!evolved) return Object.freeze([]);
  if (!Number.isFinite(anchor)) throw new Error("SYNC HALO anchor must be finite.");
  return Object.freeze(Array.from({ length: SYNC_HALO_SAMPLE_COUNT }, (_, index) => (
    anchor + index * Math.PI * 2 / SYNC_HALO_SAMPLE_COUNT
  )));
}

export function syncHaloPositions(
  centerX: number,
  centerY: number,
  anchor: number,
  evolved: boolean,
): readonly { readonly x: number; readonly y: number }[] {
  return Object.freeze(syncHaloAngles(anchor, evolved).map(angle => Object.freeze({
    x: centerX + Math.cos(angle) * SYNC_HALO_RADIUS,
    y: centerY + Math.sin(angle) * SYNC_HALO_RADIUS,
  })));
}

export function syncHaloDisplacement(role: SyncHaloControlRole): number {
  if (role === "BOSS") return 0;
  if (role === "ELITE") return 8;
  if (role === "COMMON") return 14;
  return 28;
}

export function canEmitSyncHaloControl(
  evolved: boolean,
  lastEmittedAtMs: number | null,
  nowMs: number,
): boolean {
  if (!evolved) return false;
  if (!Number.isFinite(nowMs) || nowMs < 0) throw new Error("SYNC HALO control time must be finite and non-negative.");
  if (lastEmittedAtMs === null) return true;
  if (!Number.isFinite(lastEmittedAtMs) || lastEmittedAtMs < 0) throw new Error("SYNC HALO prior control time must be finite and non-negative.");
  return nowMs - lastEmittedAtMs >= SYNC_HALO_CONTROL_REARM_MS;
}

export function planSyncHaloControlTargets(
  evolved: boolean,
  candidates: readonly SyncHaloControlCandidate[],
  phase: Phase,
  centerX: number,
  centerY: number,
): readonly SyncHaloControlTarget[] {
  if (!evolved) return Object.freeze([]);
  const r2 = SYNC_HALO_CONTROL_RADIUS * SYNC_HALO_CONTROL_RADIUS;
  const planned = candidates
    .filter(candidate => candidate.active && isEnemyCorporeal(candidate.kind, phase) && syncHaloDisplacement(candidate.role) > 0)
    .map(candidate => {
      const dx = candidate.x - centerX;
      const dy = candidate.y - centerY;
      return { candidate, distanceSq: dx * dx + dy * dy };
    })
    .filter(item => item.distanceSq <= r2)
    .sort((a, b) => a.distanceSq - b.distanceSq || a.candidate.id - b.candidate.id)
    .slice(0, SYNC_HALO_CONTROL_TARGET_CAP)
    .map(item => Object.freeze({ id: item.candidate.id, displacement: syncHaloDisplacement(item.candidate.role) }));
  return Object.freeze(planned);
}

export const MEMORY_COLLAPSE_LINK_RADIUS = 180 as const;
export const MEMORY_COLLAPSE_CHAIN_CAP = 3 as const;
export const MEMORY_COLLAPSE_PROPAGATED_DAMAGE_MULTIPLIER = 1 as const;

export interface MemoryCollapseMineCandidate {
  readonly id: number;
  readonly active: boolean;
  readonly armed: boolean;
  readonly triggerLegal: boolean;
  readonly x: number;
  readonly y: number;
}

export function planMemoryCollapseChain(
  evolved: boolean,
  mines: readonly MemoryCollapseMineCandidate[],
  startId: number,
): readonly number[] {
  if (!evolved) return Object.freeze([]);
  const byId = new Map(mines.map(mine => [mine.id, mine] as const));
  const start = byId.get(startId);
  if (!start || !start.active || !start.armed || !start.triggerLegal) return Object.freeze([]);

  const chain = [start.id];
  const visited = new Set(chain);
  let current = start;
  const r2 = MEMORY_COLLAPSE_LINK_RADIUS * MEMORY_COLLAPSE_LINK_RADIUS;

  while (chain.length < MEMORY_COLLAPSE_CHAIN_CAP) {
    const next = mines
      .filter(mine => mine.active && mine.armed && mine.triggerLegal && !visited.has(mine.id))
      .map(mine => {
        const dx = mine.x - current.x;
        const dy = mine.y - current.y;
        return { mine, distanceSq: dx * dx + dy * dy };
      })
      .filter(item => item.distanceSq <= r2)
      .sort((a, b) => a.distanceSq - b.distanceSq || a.mine.id - b.mine.id)[0]?.mine;
    if (!next) break;
    chain.push(next.id);
    visited.add(next.id);
    current = next;
  }
  return Object.freeze(chain);
}

export const CHAIN_RESONANCE_MAX_TARGETS = 5 as const;
export const CHAIN_RESONANCE_RELAY_RANGE = 200 as const;
export const CHAIN_RESONANCE_DAMAGES = Object.freeze([10, 9, 8, 8, 7] as const);
export const CHAIN_RESONANCE_POST_SHIFT_WINDOW_MS = 900 as const;

export interface ChainResonanceShiftState {
  readonly armed: boolean;
  readonly expiresAtMs: number | null;
  readonly phase: Phase | null;
}

export interface ChainResonanceProfile {
  readonly rank: 5;
  readonly cooldownMs: number;
  readonly acquisitionRange: number;
  readonly relayRange: number;
  readonly maxTargets: number;
  readonly damages: readonly number[];
  readonly commonRelayBonus: number;
  readonly commonBonusUses: 0 | 1 | 2;
  readonly routing: "FORWARD_DEGREE";
}

export function emptyChainResonanceShiftState(): ChainResonanceShiftState {
  return Object.freeze({ armed: false, expiresAtMs: null, phase: null });
}

export function armChainResonanceAfterShift(
  evolved: boolean,
  nowMs: number,
  phase: Phase,
): ChainResonanceShiftState {
  if (!evolved) return emptyChainResonanceShiftState();
  if (!Number.isFinite(nowMs) || nowMs < 0) throw new Error("CHAIN RESONANCE SHIFT time must be finite and non-negative.");
  return Object.freeze({ armed: true, expiresAtMs: nowMs + CHAIN_RESONANCE_POST_SHIFT_WINDOW_MS, phase });
}

export function isChainResonanceShiftArmed(state: ChainResonanceShiftState, nowMs: number): boolean {
  return state.armed && state.expiresAtMs !== null && nowMs < state.expiresAtMs;
}

export function consumeChainResonanceShift(
  _state: ChainResonanceShiftState,
  nowMs: number,
): ChainResonanceShiftState {
  if (!Number.isFinite(nowMs) || nowMs < 0) throw new Error("CHAIN RESONANCE cast time must be finite and non-negative.");
  return emptyChainResonanceShiftState();
}

export function buildChainResonanceProfile(
  base: SignalArcRankProfile,
  evolved: false,
  shiftState?: ChainResonanceShiftState,
  nowMs?: number,
): SignalArcRankProfile;
export function buildChainResonanceProfile(
  base: SignalArcRankProfile,
  evolved: true,
  shiftState?: ChainResonanceShiftState,
  nowMs?: number,
): ChainResonanceProfile;
export function buildChainResonanceProfile(
  base: SignalArcRankProfile,
  evolved: boolean,
  shiftState: ChainResonanceShiftState = emptyChainResonanceShiftState(),
  nowMs = 0,
): SignalArcRankProfile | ChainResonanceProfile {
  if (!evolved) return base;
  if (base.rank !== 5) throw new Error("CHAIN RESONANCE requires SIGNAL Rank V.");
  const postShiftCommon = isChainResonanceShiftArmed(shiftState, nowMs);
  return Object.freeze({
    rank: 5,
    cooldownMs: base.cooldownMs,
    acquisitionRange: base.acquisitionRange,
    relayRange: CHAIN_RESONANCE_RELAY_RANGE,
    maxTargets: CHAIN_RESONANCE_MAX_TARGETS,
    damages: CHAIN_RESONANCE_DAMAGES,
    commonRelayBonus: base.commonRelayBonus,
    commonBonusUses: (base.commonBonusUses + (postShiftCommon ? 1 : 0)) as 0 | 1 | 2,
    routing: "FORWARD_DEGREE",
  });
}
