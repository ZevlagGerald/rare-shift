import type { Phase } from "./types.ts";
import { V2_PALETTE } from "./v2-art-core.ts";

export type V2EffectId = "SHIFT_TRANSITION" | "DELTA_BURST" | "ENEMY_SPAWN" | "ENEMY_HIT" | "ENEMY_DEATH";
export type V2EffectGeometry = "PHASE_RING" | "CANONICAL_DELTA" | "INWARD_BRACKETS" | "PIXEL_SPARK" | "OUTWARD_FRAGMENTS";

export interface V2EffectSpec {
  readonly id: V2EffectId;
  readonly geometry: V2EffectGeometry;
  readonly durationMs: number;
  readonly reducedMotionDurationMs: number;
  readonly maxParticles: number;
  readonly hazardLike: false;
  readonly blocksInput: false;
  readonly purpose: string;
}

export const V2_EFFECT_SPECS: Readonly<Record<V2EffectId, V2EffectSpec>> = Object.freeze({
  SHIFT_TRANSITION: Object.freeze({
    id: "SHIFT_TRANSITION",
    geometry: "PHASE_RING",
    durationMs: 180,
    reducedMotionDurationMs: 0,
    maxParticles: 6,
    hazardLike: false,
    blocksInput: false,
    purpose: "communicate A/B authority change without hiding movement or enemy telegraphs",
  }),
  DELTA_BURST: Object.freeze({
    id: "DELTA_BURST",
    geometry: "CANONICAL_DELTA",
    durationMs: 140,
    reducedMotionDurationMs: 60,
    maxParticles: 0,
    hazardLike: false,
    blocksInput: false,
    purpose: "project the selected Friend's exact active A_ONLY/B_ONLY attack geometry",
  }),
  ENEMY_SPAWN: Object.freeze({
    id: "ENEMY_SPAWN",
    geometry: "INWARD_BRACKETS",
    durationMs: 240,
    reducedMotionDurationMs: 80,
    maxParticles: 4,
    hazardLike: false,
    blocksInput: false,
    purpose: "telegraph enemy materialization with a shape distinct from live hazards",
  }),
  ENEMY_HIT: Object.freeze({
    id: "ENEMY_HIT",
    geometry: "PIXEL_SPARK",
    durationMs: 90,
    reducedMotionDurationMs: 40,
    maxParticles: 4,
    hazardLike: false,
    blocksInput: false,
    purpose: "confirm damage with minimal visual occupation",
  }),
  ENEMY_DEATH: Object.freeze({
    id: "ENEMY_DEATH",
    geometry: "OUTWARD_FRAGMENTS",
    durationMs: 200,
    reducedMotionDurationMs: 80,
    maxParticles: 8,
    hazardLike: false,
    blocksInput: false,
    purpose: "release a bounded pixel-fragment burst before Signal XP becomes readable",
  }),
});

export function effectDuration(id: V2EffectId, reducedMotion: boolean): number {
  const spec = V2_EFFECT_SPECS[id];
  return reducedMotion ? spec.reducedMotionDurationMs : spec.durationMs;
}

export function effectTone(id: V2EffectId, phase: Phase | "COMMON" = "COMMON"): string {
  if (id === "ENEMY_HIT" || id === "ENEMY_DEATH") return V2_PALETTE.common;
  if (phase === "A") return V2_PALETTE.phaseA;
  if (phase === "B") return V2_PALETTE.phaseB;
  return V2_PALETTE.common;
}
