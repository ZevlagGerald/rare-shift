import assert from "node:assert/strict";
import test from "node:test";
import {
  armChainResonanceAfterShift,
  buildChainResonanceProfile,
  buildReconstructionCommonProfile,
  canEmitSyncHaloControl,
  canScheduleReconstructionCommon,
  CHAIN_RESONANCE_DAMAGES,
  CHAIN_RESONANCE_MAX_TARGETS,
  CHAIN_RESONANCE_POST_SHIFT_WINDOW_MS,
  CHAIN_RESONANCE_RELAY_RANGE,
  consumeChainResonanceShift,
  emptyChainResonanceShiftState,
  isChainResonanceShiftArmed,
  isReconstructionCommonTargetEligible,
  MEMORY_COLLAPSE_CHAIN_CAP,
  MEMORY_COLLAPSE_LINK_RADIUS,
  MEMORY_COLLAPSE_PROPAGATED_DAMAGE_MULTIPLIER,
  planMemoryCollapseChain,
  planSyncHaloControlTargets,
  PRISM_REFRACTION_DAMAGE,
  PRISM_REFRACTION_RADIUS,
  reconstructionCommonHitsTarget,
  RECONSTRUCTION_COMMON_DAMAGE,
  RECONSTRUCTION_COMMON_DELAY_MS,
  RECONSTRUCTION_COMMON_REARM_MS,
  selectPrismRefractionTarget,
  SYNC_HALO_CONTROL_REARM_MS,
  SYNC_HALO_CONTROL_TARGET_CAP,
  SYNC_HALO_RADIUS,
  SYNC_HALO_SAMPLE_COUNT,
  syncHaloAngles,
  syncHaloDisplacement,
  syncHaloPositions,
} from "../src/evolution-runtime-core.ts";
import { buildSignalArcProfile } from "../src/signal-arc-core.ts";
import type { FrameRows } from "../src/types.ts";

function rows(active: readonly [number, number][]): FrameRows {
  const grid = Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => "."));
  for (const [x, y] of active) grid[y][x] = "#";
  return Object.freeze(grid.map(row => row.join("")));
}

const A = rows([[1, 1], [5, 5], [7, 7], [10, 10]]);
const B = rows([[2, 2], [5, 5], [7, 7], [12, 12]]);

test("RECONSTRUCTION FIELD derives only canonical A-intersection-B points and is inert when not evolved", () => {
  assert.equal(buildReconstructionCommonProfile(A, B, false), null);
  const profile = buildReconstructionCommonProfile(A, B, true);
  assert.ok(profile);
  assert.deepEqual(profile.points, [
    { x: -2.5, y: -2.5 },
    { x: -0.5, y: -0.5 },
  ]);
  assert.equal(profile.damage, RECONSTRUCTION_COMMON_DAMAGE);
  assert.equal(profile.damage, 4);
  assert.equal(profile.delayMs, RECONSTRUCTION_COMMON_DELAY_MS);
  assert.equal(profile.delayMs, 120);
});

test("RECONSTRUCTION FIELD COMMON authority cannot legalize A/B ghosts", () => {
  assert.equal(isReconstructionCommonTargetEligible("TRACE"), true);
  assert.equal(isReconstructionCommonTargetEligible("BEACON"), true);
  assert.equal(isReconstructionCommonTargetEligible("ANCHOR"), true);
  assert.equal(isReconstructionCommonTargetEligible("SPLIT_A"), false);
  assert.equal(isReconstructionCommonTargetEligible("SPLIT_B"), false);
  assert.equal(isReconstructionCommonTargetEligible("FLICKER_A"), false);
  assert.equal(isReconstructionCommonTargetEligible("FLICKER_B"), false);
});

test("RECONSTRUCTION FIELD rearm is exact and cannot fabricate a free follow-up", () => {
  assert.equal(canScheduleReconstructionCommon(false, null, 0), false);
  assert.equal(canScheduleReconstructionCommon(true, null, 0), true);
  assert.equal(canScheduleReconstructionCommon(true, 1000, 1000 + RECONSTRUCTION_COMMON_REARM_MS - 1), false);
  assert.equal(canScheduleReconstructionCommon(true, 1000, 1000 + RECONSTRUCTION_COMMON_REARM_MS), true);
});

test("RECONSTRUCTION FIELD silhouette uses bounded canonical geometry", () => {
  const profile = buildReconstructionCommonProfile(A, B, true);
  assert.ok(profile);
  const point = profile.points[0];
  assert.equal(reconstructionCommonHitsTarget(profile, point.x * profile.worldScale, point.y * profile.worldScale), true);
  assert.equal(reconstructionCommonHitsTarget(profile, 10_000, 10_000), false);
});

test("PRISM LANCE permits exactly one deterministic phase-legal refraction target", () => {
  const candidates = [
    { id: 9, kind: "SPLIT_A" as const, active: true, x: 180, y: 0 },
    { id: 4, kind: "TRACE" as const, active: true, x: 180, y: 0 },
    { id: 2, kind: "SPLIT_B" as const, active: true, x: 80, y: 0 },
    { id: 1, kind: "SPLIT_A" as const, active: true, x: 40, y: 0 },
  ];
  assert.equal(selectPrismRefractionTarget(false, candidates, "A", 0, 0, new Set([1])), null);
  const selected = selectPrismRefractionTarget(true, candidates, "A", 0, 0, new Set([1]));
  assert.deepEqual(selected, { id: 4, kind: "TRACE", distanceSq: 180 * 180, damage: PRISM_REFRACTION_DAMAGE });
  assert.equal(selected?.damage, 6);
  const reversed = selectPrismRefractionTarget(true, [...candidates].reverse(), "A", 0, 0, new Set([1]));
  assert.deepEqual(reversed, selected, "input order may not change refraction authority");
});

test("PRISM LANCE radius boundary is exact and already-hit targets stay excluded", () => {
  const atBoundary = { id: 7, kind: "TRACE" as const, active: true, x: PRISM_REFRACTION_RADIUS, y: 0 };
  assert.equal(selectPrismRefractionTarget(true, [atBoundary], "A", 0, 0, new Set())?.id, 7);
  assert.equal(selectPrismRefractionTarget(true, [{ ...atBoundary, x: PRISM_REFRACTION_RADIUS + 0.01 }], "A", 0, 0, new Set()), null);
  assert.equal(selectPrismRefractionTarget(true, [atBoundary], "A", 0, 0, new Set([7])), null);
});

test("SYNC HALO preserves the existing anchor while adding six equally spaced samples", () => {
  const anchor = 1.125;
  assert.deepEqual(syncHaloAngles(anchor, false), []);
  const angles = syncHaloAngles(anchor, true);
  assert.equal(angles.length, SYNC_HALO_SAMPLE_COUNT);
  assert.equal(angles[0], anchor);
  for (let index = 1; index < angles.length; index += 1) {
    assert.ok(Math.abs((angles[index] - angles[index - 1]) - Math.PI / 3) < 1e-12);
  }
  const positions = syncHaloPositions(50, 75, anchor, true);
  assert.equal(positions.length, 6);
  assert.ok(positions.every(point => Math.abs(Math.hypot(point.x - 50, point.y - 75) - SYNC_HALO_RADIUS) < 1e-10));
});

test("SYNC HALO control has explicit role resistance and zero boss displacement", () => {
  assert.equal(syncHaloDisplacement("NORMAL"), 28);
  assert.equal(syncHaloDisplacement("COMMON"), 14);
  assert.equal(syncHaloDisplacement("ELITE"), 8);
  assert.equal(syncHaloDisplacement("BOSS"), 0);
});

test("SYNC HALO control is phase-legal, deterministic, target-capped and rearm-bounded", () => {
  const candidates = Array.from({ length: 10 }, (_, index) => ({
    id: 10 - index,
    kind: index === 0 ? "SPLIT_B" as const : "TRACE" as const,
    active: true,
    x: 10 + index,
    y: 0,
    role: index === 1 ? "BOSS" as const : "COMMON" as const,
  }));
  const planned = planSyncHaloControlTargets(true, candidates, "A", 0, 0);
  assert.equal(planned.length, SYNC_HALO_CONTROL_TARGET_CAP);
  assert.equal(planned.some(item => item.id === 10), false, "off-phase SPLIT_B must stay illegal in Phase A");
  assert.equal(planned.some(item => item.id === 9), false, "boss displacement must remain zero");
  const reversed = planSyncHaloControlTargets(true, [...candidates].reverse(), "A", 0, 0);
  assert.deepEqual(reversed, planned);
  assert.equal(canEmitSyncHaloControl(false, null, 0), false);
  assert.equal(canEmitSyncHaloControl(true, 1000, 1000 + SYNC_HALO_CONTROL_REARM_MS - 1), false);
  assert.equal(canEmitSyncHaloControl(true, 1000, 1000 + SYNC_HALO_CONTROL_REARM_MS), true);
});

test("MEMORY COLLAPSE links only active armed trigger-legal mines with a hard chain cap", () => {
  const mines = [
    { id: 1, active: true, armed: true, triggerLegal: true, x: 0, y: 0 },
    { id: 5, active: true, armed: true, triggerLegal: true, x: 100, y: 0 },
    { id: 3, active: true, armed: true, triggerLegal: true, x: 100, y: 0 },
    { id: 7, active: true, armed: true, triggerLegal: true, x: 200, y: 0 },
    { id: 2, active: true, armed: false, triggerLegal: true, x: 10, y: 0 },
    { id: 4, active: true, armed: true, triggerLegal: false, x: 20, y: 0 },
  ];
  assert.deepEqual(planMemoryCollapseChain(false, mines, 1), []);
  assert.deepEqual(planMemoryCollapseChain(true, mines, 1), [1, 3, 5]);
  assert.equal(planMemoryCollapseChain(true, mines, 1).length, MEMORY_COLLAPSE_CHAIN_CAP);
  assert.equal(MEMORY_COLLAPSE_PROPAGATED_DAMAGE_MULTIPLIER, 1, "propagation must reuse existing ECHO damage/ledger authority rather than add hidden damage");
  assert.deepEqual(planMemoryCollapseChain(true, [...mines].reverse(), 1), [1, 3, 5]);
});

test("MEMORY COLLAPSE link radius boundary is exact and cannot fabricate an invalid start mine", () => {
  const exact = [
    { id: 1, active: true, armed: true, triggerLegal: true, x: 0, y: 0 },
    { id: 2, active: true, armed: true, triggerLegal: true, x: MEMORY_COLLAPSE_LINK_RADIUS, y: 0 },
  ];
  assert.deepEqual(planMemoryCollapseChain(true, exact, 1), [1, 2]);
  assert.deepEqual(planMemoryCollapseChain(true, [{ ...exact[0], armed: false }, exact[1]], 1), []);
  assert.deepEqual(planMemoryCollapseChain(true, [exact[0], { ...exact[1], x: MEMORY_COLLAPSE_LINK_RADIUS + 0.01 }], 1), [1]);
});

test("CHAIN RESONANCE preserves inherited SIGNAL cooldown/routing while adding one bounded jump with reduced decay", () => {
  const base = buildSignalArcProfile(5);
  assert.equal(buildChainResonanceProfile(base, false), base, "non-evolved SIGNAL must retain the exact inherited profile object");
  const evolved = buildChainResonanceProfile(base, true);
  assert.equal(evolved.rank, 5);
  assert.equal(evolved.cooldownMs, base.cooldownMs);
  assert.equal(evolved.acquisitionRange, base.acquisitionRange);
  assert.equal(evolved.routing, base.routing);
  assert.equal(evolved.relayRange, CHAIN_RESONANCE_RELAY_RANGE);
  assert.equal(evolved.maxTargets, CHAIN_RESONANCE_MAX_TARGETS);
  assert.deepEqual(CHAIN_RESONANCE_DAMAGES, [10, 9, 8, 8, 7]);
  assert.deepEqual(evolved.damages, CHAIN_RESONANCE_DAMAGES);
  assert.ok(evolved.damages[3] > base.damages[3], "Evolution must materially reduce late-chain decay versus Rank V");
  assert.equal(evolved.commonBonusUses, 1);
});

test("CHAIN RESONANCE post-SHIFT COMMON authority is one-cast, bounded and expires exactly", () => {
  const base = buildSignalArcProfile(5);
  const empty = emptyChainResonanceShiftState();
  assert.equal(isChainResonanceShiftArmed(empty, 0), false);
  const armed = armChainResonanceAfterShift(true, 1000, "B");
  assert.equal(armed.phase, "B");
  assert.equal(isChainResonanceShiftArmed(armed, 1000 + CHAIN_RESONANCE_POST_SHIFT_WINDOW_MS - 1), true);
  assert.equal(isChainResonanceShiftArmed(armed, 1000 + CHAIN_RESONANCE_POST_SHIFT_WINDOW_MS), false);
  const profile = buildChainResonanceProfile(base, true, armed, 1200);
  assert.equal(profile.commonBonusUses, 2, "accepted SHIFT may grant exactly one additional COMMON-origin relay opportunity");
  assert.equal(profile.maxTargets, 5);
  const consumed = consumeChainResonanceShift(armed, 1200);
  assert.equal(isChainResonanceShiftArmed(consumed, 1201), false);
  assert.equal(buildChainResonanceProfile(base, true, consumed, 1201).commonBonusUses, 1);
});

test("CHAIN RESONANCE rejects pre-Rank-V evolution and never changes ordinary cast readiness", () => {
  assert.throws(() => buildChainResonanceProfile(buildSignalArcProfile(4), true), /requires SIGNAL Rank V/u);
  const base = buildSignalArcProfile(5);
  const evolved = buildChainResonanceProfile(base, true, armChainResonanceAfterShift(true, 0, "A"), 1);
  assert.equal(evolved.cooldownMs, 1250, "Evolution and SHIFT must not grant an earlier cast");
  assert.equal(evolved.commonRelayBonus, base.commonRelayBonus);
});
