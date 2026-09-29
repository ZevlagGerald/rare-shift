import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCommonCoreToDelta,
  applyMemoryFuseToEcho,
  applyOrbitStabilizerToOrbit,
  applyResonanceCoilToSignal,
  applyVectorLensToVector,
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
  assert.equal(tuned.profile.worldScale, 10.26);
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
  assert.equal(tuned.profile.speed, 1132.8);
  assert.equal(tuned.profile.range, 604.8000000000001);
  assert.equal(tuned.postShiftRangeBonus, 24);
});

test("ORBIT STABILIZER preserves node count/rotation identity and only strengthens bounded coverage cadence", () => {
  const base = buildOrbitProfile(5);
  const tuned = applyOrbitStabilizerToOrbit(base, 3);
  assert.equal(tuned.damage, base.damage);
  assert.equal(tuned.nodeCount, base.nodeCount);
  assert.equal(tuned.angularSpeed, base.angularSpeed);
  assert.equal(tuned.rank, base.rank);
  assert.equal(tuned.radius, 84.80000000000001);
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
  assert.equal(tuned.triggerRadius, 90.72000000000001);
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
