import assert from "node:assert/strict";
import test from "node:test";
import {
  CR3_ALIGNED_ADD_COUNT,
  CR3_MAX_ACTIVE_ADDS,
  CR3_PRESSURE_DAMAGE,
  CR3_PRESSURE_TELEGRAPH_MS,
  cr3PressureHitsPoint,
  cr3PressureLaneCenter,
  planCR3Pressure,
} from "../src/cr3-pressure-core.ts";

const SEED = 0x43523343;
const BOSS_X = 900;
const BOSS_Y = 420;

test("CR-3C pressure planning is deterministic for a fixed seed/ordinal/attack", () => {
  for (const attack of ["COMMON_RADIAL", "COMMON_LANE", "ALIGNED_ADDS", "BREAK_PRESSURE"] as const) {
    assert.deepEqual(planCR3Pressure(SEED, 7, attack), planCR3Pressure(SEED, 7, attack));
  }
});

test("CR-3C structural attacks map to the locked pressure identities", () => {
  const radial = planCR3Pressure(SEED, 1, "COMMON_RADIAL");
  const lane = planCR3Pressure(SEED, 2, "COMMON_LANE");
  const adds = planCR3Pressure(SEED, 3, "ALIGNED_ADDS");
  const breakPressure = planCR3Pressure(SEED, 4, "BREAK_PRESSURE");

  assert.equal(radial.geometry, "RADIAL");
  assert.equal(lane.geometry, "LANE");
  assert.equal(adds.geometry, "ALIGNED_ADDS");
  assert.ok(breakPressure.geometry === "RADIAL" || breakPressure.geometry === "LANE");
  assert.equal(radial.damage, CR3_PRESSURE_DAMAGE);
  assert.equal(lane.damage, CR3_PRESSURE_DAMAGE);
  assert.equal(breakPressure.damage, CR3_PRESSURE_DAMAGE);
  assert.equal(adds.damage, 0);
  assert.equal(radial.telegraphMs, CR3_PRESSURE_TELEGRAPH_MS);
  assert.equal(adds.addCount, CR3_ALIGNED_ADD_COUNT);
});

test("CR-3C radial geometry has an exact inclusive band boundary", () => {
  const plan = planCR3Pressure(SEED, 5, "COMMON_RADIAL");
  assert.equal(plan.geometry, "RADIAL");
  assert.notEqual(plan.radialRadius, null);
  assert.notEqual(plan.radialHalfWidth, null);
  const radius = plan.radialRadius!;
  const halfWidth = plan.radialHalfWidth!;

  assert.equal(cr3PressureHitsPoint(plan, BOSS_X, BOSS_Y, BOSS_X + radius, BOSS_Y), true);
  assert.equal(cr3PressureHitsPoint(plan, BOSS_X, BOSS_Y, BOSS_X + radius + halfWidth, BOSS_Y), true);
  assert.equal(cr3PressureHitsPoint(plan, BOSS_X, BOSS_Y, BOSS_X + radius + halfWidth + 0.001, BOSS_Y), false);
  assert.equal(cr3PressureHitsPoint(plan, BOSS_X, BOSS_Y, BOSS_X + radius - halfWidth, BOSS_Y), true);
  assert.equal(cr3PressureHitsPoint(plan, BOSS_X, BOSS_Y, BOSS_X + radius - halfWidth - 0.001, BOSS_Y), false);
});

test("CR-3C lane geometry has an exact inclusive half-width boundary", () => {
  const plan = planCR3Pressure(SEED, 6, "COMMON_LANE");
  assert.equal(plan.geometry, "LANE");
  assert.notEqual(plan.laneAngleRad, null);
  assert.notEqual(plan.laneHalfWidth, null);
  const center = cr3PressureLaneCenter(plan, BOSS_X, BOSS_Y);
  const angle = plan.laneAngleRad!;
  const halfWidth = plan.laneHalfWidth!;
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);

  assert.equal(cr3PressureHitsPoint(plan, BOSS_X, BOSS_Y, center.x, center.y), true);
  assert.equal(cr3PressureHitsPoint(plan, BOSS_X, BOSS_Y, center.x + nx * halfWidth, center.y + ny * halfWidth), true);
  assert.equal(cr3PressureHitsPoint(plan, BOSS_X, BOSS_Y, center.x + nx * (halfWidth + 0.001), center.y + ny * (halfWidth + 0.001)), false);
});

test("CR-3C aligned adds are non-damaging pressure geometry with hard bounded counts", () => {
  const plan = planCR3Pressure(SEED, 8, "ALIGNED_ADDS");
  assert.equal(plan.geometry, "ALIGNED_ADDS");
  assert.equal(plan.addCount, 2);
  assert.equal(cr3PressureHitsPoint(plan, BOSS_X, BOSS_Y, BOSS_X, BOSS_Y), false);
  assert.equal(CR3_ALIGNED_ADD_COUNT, 2);
  assert.equal(CR3_MAX_ACTIVE_ADDS, 4);
});

test("CR-3C BREAK pressure stays COMMON hazard geometry and cannot fabricate aligned adds", () => {
  for (let ordinal = 0; ordinal < 32; ordinal += 1) {
    const plan = planCR3Pressure(SEED, ordinal, "BREAK_PRESSURE");
    assert.ok(plan.geometry === "RADIAL" || plan.geometry === "LANE");
    assert.equal(plan.addCount, 0);
    assert.equal(plan.damage, CR3_PRESSURE_DAMAGE);
  }
});
