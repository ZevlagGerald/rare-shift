import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCommonCoreToDelta,
  applyMemoryFuseToEcho,
  applyOrbitStabilizerToOrbit,
  applyResonanceCoilToSignal,
  applyVectorLensToVector,
  buildCR2PlayerProtocolRuntime,
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

test("Protocol player runtime is exactly neutral with no Protocols", () => {
  assert.deepEqual(buildCR2PlayerProtocolRuntime({}), {
    moveSpeedMultiplier: 1,
    contactInvulnBonusMs: 0,
    repairBonusHp: 0,
    pickupRadiusBonus: 0,
    pickupAttractionSpeedMultiplier: 1,
  });
});

test("every non-COMMON Protocol has a bounded useful passive without requiring its matching weapon", () => {
  const vector = buildCR2PlayerProtocolRuntime({ VECTOR_LENS: 1 });
  assert.equal(vector.moveSpeedMultiplier, 1.01);
  assert.equal(vector.contactInvulnBonusMs, 0);
  assert.equal(vector.repairBonusHp, 0);
  assert.equal(vector.pickupRadiusBonus, 0);

  const orbit = buildCR2PlayerProtocolRuntime({ ORBIT_STABILIZER: 1 });
  assert.equal(orbit.moveSpeedMultiplier, 1);
  assert.equal(orbit.contactInvulnBonusMs, 30);
  assert.equal(orbit.repairBonusHp, 0);
  assert.equal(orbit.pickupRadiusBonus, 0);

  const memory = buildCR2PlayerProtocolRuntime({ MEMORY_FUSE: 1 });
  assert.equal(memory.moveSpeedMultiplier, 1);
  assert.equal(memory.contactInvulnBonusMs, 0);
  assert.equal(memory.repairBonusHp, 2);
  assert.equal(memory.pickupRadiusBonus, 0);

  const resonance = buildCR2PlayerProtocolRuntime({ RESONANCE_COIL: 1 });
  assert.equal(resonance.moveSpeedMultiplier, 1);
  assert.equal(resonance.contactInvulnBonusMs, 0);
  assert.equal(resonance.repairBonusHp, 0);
  assert.equal(resonance.pickupRadiusBonus, 4);
  assert.equal(resonance.pickupAttractionSpeedMultiplier, 1.03);
});

test("matching-independent Protocol passives scale monotonically and remain conservative", () => {
  assert.deepEqual([1, 2, 3].map(rank => buildCR2PlayerProtocolRuntime({ VECTOR_LENS: rank }).moveSpeedMultiplier), [1.01, 1.02, 1.03]);
  assert.deepEqual([1, 2, 3].map(rank => buildCR2PlayerProtocolRuntime({ ORBIT_STABILIZER: rank }).contactInvulnBonusMs), [30, 60, 90]);
  assert.deepEqual([1, 2, 3].map(rank => buildCR2PlayerProtocolRuntime({ MEMORY_FUSE: rank }).repairBonusHp), [2, 4, 6]);
  assert.deepEqual([1, 2, 3].map(rank => buildCR2PlayerProtocolRuntime({ RESONANCE_COIL: rank }).pickupRadiusBonus), [4, 8, 12]);
  assert.deepEqual([1, 2, 3].map(rank => buildCR2PlayerProtocolRuntime({ RESONANCE_COIL: rank }).pickupAttractionSpeedMultiplier), [1.03, 1.06, 1.09]);
});

test("universal Protocol composition is additive by identity and cannot create weapon/combat history", () => {
  const runtime = buildCR2PlayerProtocolRuntime({ VECTOR_LENS: 3, ORBIT_STABILIZER: 3, MEMORY_FUSE: 3, RESONANCE_COIL: 3 });
  assert.deepEqual(runtime, {
    moveSpeedMultiplier: 1.03,
    contactInvulnBonusMs: 90,
    repairBonusHp: 6,
    pickupRadiusBonus: 12,
    pickupAttractionSpeedMultiplier: 1.09,
  });
  assert.deepEqual(Object.keys(runtime).sort(), [
    "contactInvulnBonusMs",
    "moveSpeedMultiplier",
    "pickupAttractionSpeedMultiplier",
    "pickupRadiusBonus",
    "repairBonusHp",
  ]);
});

test("COMMON CORE is always useful because every legal build has mandatory DELTA", () => {
  const a = rows([[2, 2], [7, 7]]);
  const b = rows([[13, 13], [7, 7]]);
  const base = buildDeltaProfile(a, b, "A", 1);
  const tuned = applyCommonCoreToDelta(base, 1);
  assert.ok(tuned.profile.cooldownMs < base.cooldownMs);
  assert.ok(tuned.profile.worldScale > base.worldScale);
  assert.deepEqual(buildCR2PlayerProtocolRuntime({ COMMON_CORE: 1 }), buildCR2PlayerProtocolRuntime({}));
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
  assert.equal(tuned.postShiftStabilityMs, 0, "post-SHIFT Protocol semantics remain deferred in CR-2");
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
  assert.equal(tuned.postShiftRangeBonus, 0, "post-SHIFT Protocol semantics remain deferred in CR-2");
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
  assert.equal(tuned.postShiftCommonBonus, 0, "post-SHIFT Protocol semantics remain deferred in CR-2");
});
