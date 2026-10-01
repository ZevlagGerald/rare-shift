import type { CR3BossAttackKind } from "./cr3-desync-core.ts";
import { deterministicUnit } from "./survival-core.ts";

export type CR3PressureGeometry = "RADIAL" | "LANE" | "ALIGNED_ADDS";

export const CR3_PRESSURE_TELEGRAPH_MS = 850 as const;
export const CR3_PRESSURE_DAMAGE = 10 as const;
export const CR3_RADIAL_HALF_WIDTH = 32 as const;
export const CR3_LANE_HALF_WIDTH = 54 as const;
export const CR3_ALIGNED_ADD_COUNT = 2 as const;
export const CR3_MAX_ACTIVE_ADDS = 4 as const;

const RADIAL_RADII = [210, 300] as const;
const LANE_ANGLES = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4] as const;
const LANE_OFFSETS = [-150, 0, 150] as const;

export interface CR3PressurePlan {
  readonly ordinal: number;
  readonly attack: CR3BossAttackKind;
  readonly geometry: CR3PressureGeometry;
  readonly damage: number;
  readonly telegraphMs: number;
  readonly radialRadius: number | null;
  readonly radialHalfWidth: number | null;
  readonly laneAngleRad: number | null;
  readonly laneOffset: number | null;
  readonly laneHalfWidth: number | null;
  readonly addCount: number;
}

function assertOrdinal(ordinal: number): void {
  if (!Number.isInteger(ordinal) || ordinal < 0) throw new Error("CR-3 pressure ordinal must be a non-negative integer.");
}

function pickIndex(seed: number, ordinal: number, channel: number, length: number): number {
  return Math.min(length - 1, Math.floor(deterministicUnit(seed, ordinal, channel) * length));
}

function radialPlan(seed: number, ordinal: number, attack: CR3BossAttackKind): CR3PressurePlan {
  const radius = RADIAL_RADII[pickIndex(seed, ordinal, 421, RADIAL_RADII.length)];
  return Object.freeze({
    ordinal,
    attack,
    geometry: "RADIAL",
    damage: CR3_PRESSURE_DAMAGE,
    telegraphMs: CR3_PRESSURE_TELEGRAPH_MS,
    radialRadius: radius,
    radialHalfWidth: CR3_RADIAL_HALF_WIDTH,
    laneAngleRad: null,
    laneOffset: null,
    laneHalfWidth: null,
    addCount: 0,
  });
}

function lanePlan(seed: number, ordinal: number, attack: CR3BossAttackKind): CR3PressurePlan {
  const angle = LANE_ANGLES[pickIndex(seed, ordinal, 422, LANE_ANGLES.length)];
  const offset = LANE_OFFSETS[pickIndex(seed, ordinal, 423, LANE_OFFSETS.length)];
  return Object.freeze({
    ordinal,
    attack,
    geometry: "LANE",
    damage: CR3_PRESSURE_DAMAGE,
    telegraphMs: CR3_PRESSURE_TELEGRAPH_MS,
    radialRadius: null,
    radialHalfWidth: null,
    laneAngleRad: angle,
    laneOffset: offset,
    laneHalfWidth: CR3_LANE_HALF_WIDTH,
    addCount: 0,
  });
}

export function planCR3Pressure(seed: number, ordinal: number, attack: CR3BossAttackKind): CR3PressurePlan {
  assertOrdinal(ordinal);
  if (attack === "COMMON_RADIAL") return radialPlan(seed, ordinal, attack);
  if (attack === "COMMON_LANE") return lanePlan(seed, ordinal, attack);
  if (attack === "ALIGNED_ADDS") {
    return Object.freeze({
      ordinal,
      attack,
      geometry: "ALIGNED_ADDS",
      damage: 0,
      telegraphMs: CR3_PRESSURE_TELEGRAPH_MS,
      radialRadius: null,
      radialHalfWidth: null,
      laneAngleRad: null,
      laneOffset: null,
      laneHalfWidth: null,
      addCount: CR3_ALIGNED_ADD_COUNT,
    });
  }
  return deterministicUnit(seed, ordinal, 424) < 0.5
    ? radialPlan(seed, ordinal, attack)
    : lanePlan(seed, ordinal, attack);
}

export function cr3PressureHitsPoint(
  plan: CR3PressurePlan,
  bossX: number,
  bossY: number,
  x: number,
  y: number,
): boolean {
  for (const [name, value] of [["bossX", bossX], ["bossY", bossY], ["x", x], ["y", y]] as const) {
    if (!Number.isFinite(value)) throw new Error(`CR-3 pressure ${name} must be finite.`);
  }
  if (plan.geometry === "ALIGNED_ADDS") return false;
  const dx = x - bossX;
  const dy = y - bossY;
  if (plan.geometry === "RADIAL") {
    if (plan.radialRadius === null || plan.radialHalfWidth === null) throw new Error("CR-3 radial plan is incomplete.");
    return Math.abs(Math.hypot(dx, dy) - plan.radialRadius) <= plan.radialHalfWidth;
  }
  if (plan.laneAngleRad === null || plan.laneOffset === null || plan.laneHalfWidth === null) throw new Error("CR-3 lane plan is incomplete.");
  const perpendicular = -Math.sin(plan.laneAngleRad) * dx + Math.cos(plan.laneAngleRad) * dy;
  return Math.abs(perpendicular - plan.laneOffset) <= plan.laneHalfWidth;
}

export function cr3PressureLaneCenter(
  plan: CR3PressurePlan,
  bossX: number,
  bossY: number,
): Readonly<{ x: number; y: number }> {
  if (plan.geometry !== "LANE" || plan.laneAngleRad === null || plan.laneOffset === null) {
    throw new Error("CR-3 lane center requires a lane plan.");
  }
  return Object.freeze({
    x: bossX - Math.sin(plan.laneAngleRad) * plan.laneOffset,
    y: bossY + Math.cos(plan.laneAngleRad) * plan.laneOffset,
  });
}
