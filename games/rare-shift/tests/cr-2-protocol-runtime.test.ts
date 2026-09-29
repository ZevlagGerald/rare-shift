import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCommonCoreToDelta,
  applyMemoryFuseToEcho,
  applyOrbitStabilizerToOrbit,
  applyResonanceCoilToSignal,
  applyVectorLensToVector,
  cr2EffectivePickupRadius,
  cr2ProtocolFieldPickupRadiusBonus,
} from "../src/cr2-protocol-runtime.ts";
import { buildEchoProfile, ECHO_RETURN_DELAY_FLOOR_MS } from "../src/echo-core.ts";
import { buildOrbitProfile } from "../src/orbit-core.ts";
import { buildDeltaProfile } from "../src/phase-combat-core.ts";
import { buildSignalArcProfile } from "../src/signal-arc-core.ts";
import { buildVectorProfile } from "../src/vector-core.ts";
import type { FrameRows } from "../src/types.ts";

function rows(active: readonly [number, number][]): FrameRows {
  const grid = Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => "."));
  for (const [x, y] of active) grid[y][x] = "#";
  return Object.freeze(grid.map(row => row.join("")));
}

function assertNear(actual: number, expected: number, tolerance = 1e-9): void {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} to be within ${tolerance} of ${expected}`);
}

test("every Protocol has bounded standalone field utility even without its matching weapon", () => {
  for (const family of ["COMMON_CORE", "VECTOR_LENS", "ORBIT_STABILIZER", "MEMORY_FUSE", "RESONANCE_COIL"] as const) {
    assert.equal(cr2ProtocolFieldPickupRadiusBonus({ [family]: 1 }), 4, family);
    assert.equal(cr2EffectivePickupRadius(76, { [family]: 1 }), 80, family);
  }
  assert.equal(cr2ProtocolFieldPickupRadiusBonus({
    COMMON_CORE: 3,
    VECTOR_LENS: 3,
    ORBIT_STABILIZER: 3,
    MEMORY_FUSE: 3,
  }), 48);
  assert.equal(cr2EffectivePickupRadius(220, { COMMON_CORE: 3, VECTOR_LENS: 3, ORBIT_STABILIZER: 3, MEMORY_FUSE: 3 }), 240);
  assert.throws(() => cr2ProtocolFieldPickupRadiusBonus({ COMMON_CORE: 4 }), /ranks I-III/u);
});

test("COMMON CORE composes only bounded DELTA cadence/field support and preserves canonical authority", () => {
  const a = rows([[2, 2], [7, 7]]);
  const b = rows([[13, 13], [7, 7]]);
  const base = buildDeltaProfile(a, b, "A", 5);
  const tuned = applyCommonCoreToDelta(base, 3);
  assert.equal(tuned.profile.damage, base.damage);
  assert.equal(tuned.profile.rank, base.rank);
  assert.equal(tuned.profile.phase, base.phase);
  assert.equal(tuned.profile.pixelCount, base.pixelCount);
  assert.strictEqual(tuned.profile.points, base.points);
  assert.equal(tuned.profile.cooldownMs, 648);
  assertNear(tuned.profile.worldScale, 10.26);
  assert.equal(tuned.profile.hitRadius, base.hitRadius);
  assert.equal(tuned.profile.staggerMs, base.staggerMs);
  assert.equal(tuned.postShiftStabilityMs, 120);
  assert.equal(base.cooldownMs, 720, "base DELTA profile must remain immutable");
});

test("VECTOR LENS improves travel/acquisition only and cannot fabricate hits or cooldown", () => {
  const base = buildVectorProfile(5, true);
  const tuned = applyVectorLensToVector(base, 3);
  assert.equal(tuned.profile.damage, base.damage);
  assert.equal(tuned.profile.cooldownMs, base.cooldownMs);
  assert.equal(tuned.profile.maxInFlight, base.maxInFlight);
  assert.equal(tuned.profile.maxHits, base.maxHits);
  assert.strictEqual(tuned.profile.damageSequence, base.damageSequence);
  assertNear(tuned.profile.speed, 1132.8);
  assertNear(tuned.profile.range, 604.8);
  assert.equal(tuned.postShiftRangeBonus, 24);
});

test("ORBIT STABILIZER preserves node count/rotation identity and only strengthens bounded coverage cadence", () => {
  const base = buildOrbitProfile(5);
  const tuned = applyOrbitStabilizerToOrbit(base, 3);
  assert.equal(tuned.damage, base.damage);
  assert.equal(tuned.nodeCount, base.nodeCount);
  assert.equal(tuned.angularSpeed, base.angularSpeed);
  assert.equal(tuned.rank, base.rank);
  assertNear(tuned.radius, 84.8);
  assert.equal(tuned.contactIntervalMs, 585);
  assert.equal(tuned.shearContactRadius, 46);
  assert.equal(tuned.shearDamage, base.shearDamage);
  assert.equal(tuned.shearRearmMs, base.shearRearmMs);
});

test("ORBIT STABILIZER cannot fabricate PHASE SHEAR before ORBIT Rank IV", () => {
  const base = buildOrbitProfile(3);
  const tuned = applyOrbitStabilizerToOrbit(base, 3);
  assert.equal(base.shearArcRad, 0);
  assert.equal(tuned.shearArcRad, 0);
  assert.equal(tuned.shearDurationMs, 0);
  assert.equal(tuned.shearContactRadius, 0);
  assert.equal(tuned.shearDamage, 0);
  assert.equal(tuned.shearRearmMs, 0);
});

test("MEMORY FUSE preserves ECHO memory/depth/damage and only improves bounded persistence/readiness", () => {
  const base = buildEchoProfile(5, 2);
  const tuned = applyMemoryFuseToEcho(base, 3);
  assert.equal(tuned.rank, base.rank);
  assert.equal(tuned.memoryDepth, base.memoryDepth);
  assert.equal(tuned.maxActive, base.maxActive);
  assert.equal(tuned.placementIntervalMs, base.placementIntervalMs);
  assert.equal(tuned.minSeparation, base.minSeparation);
  assert.equal(tuned.damage, base.damage);
  assert.equal(tuned.blastRadius, base.blastRadius);
  assert.equal(tuned.lifetimeMs, 14160);
  assert.equal(tuned.returnDelayMs, 126);
  assert.ok(tuned.returnDelayMs >= ECHO_RETURN_DELAY_FLOOR_MS);
  assertNear(tuned.triggerRadius, 90.72);
});

test("RESONANCE COIL preserves SIGNAL graph cap/damage/routing and only improves bounded cadence/relay reach", () => {
  const base = buildSignalArcProfile(5);
  const tuned = applyResonanceCoilToSignal(base, 3);
  assert.equal(tuned.profile.rank, base.rank);
  assert.equal(tuned.profile.maxTargets, base.maxTargets);
  assert.strictEqual(tuned.profile.damages, base.damages);
  assert.equal(tuned.profile.routing, base.routing);
  assert.equal(tuned.profile.commonRelayBonus, base.commonRelayBonus);
  assert.equal(tuned.profile.commonBonusUses, base.commonBonusUses);
  assert.equal(tuned.profile.cooldownMs, 1125);
  assert.equal(tuned.profile.relayRange, 192);
  assert.equal(tuned.postShiftCommonBonus, 16);
});
