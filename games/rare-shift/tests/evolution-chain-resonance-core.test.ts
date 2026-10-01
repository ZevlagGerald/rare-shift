import assert from "node:assert/strict";
import test from "node:test";
import {
  armChainResonanceAfterShift,
  buildChainResonanceProfile,
  emptyChainResonanceShiftState,
} from "../src/evolution-runtime-core.ts";
import {
  buildSignalArcProfile,
  planSignalArc,
  type SignalArcCandidate,
} from "../src/signal-arc-core.ts";

function trace(id: number, x: number): SignalArcCandidate {
  return Object.freeze({ id, kind: "TRACE", active: true, x, y: 0 });
}

const TWO_BRIDGE_GEOMETRY = Object.freeze([
  trace(1, 80),
  trace(2, 320),
  trace(3, 560),
  trace(4, 750),
  trace(5, 940),
]);

test("CHAIN RESONANCE planner consumes counted COMMON relay uses instead of collapsing them to a boolean", () => {
  const base = buildSignalArcProfile(5);
  const ordinary = buildChainResonanceProfile(base, true, emptyChainResonanceShiftState(), 0);
  const armed = armChainResonanceAfterShift(true, 1000, "A");
  const postShift = buildChainResonanceProfile(base, true, armed, 1100);

  const ordinaryPath = planSignalArc(TWO_BRIDGE_GEOMETRY, "A", 0, 0, ordinary);
  assert.deepEqual(ordinaryPath.map(hop => hop.id), [1, 2], "one ordinary COMMON use must bridge only the first 240px gap");
  assert.deepEqual(ordinaryPath.map(hop => hop.edgeRange), [420, 260]);
  assert.deepEqual(ordinaryPath.map(hop => hop.usedCommonBonus), [false, true]);

  const postShiftPath = planSignalArc(TWO_BRIDGE_GEOMETRY, "A", 0, 0, postShift);
  assert.deepEqual(postShiftPath.map(hop => hop.id), [1, 2, 3, 4, 5], "two post-SHIFT COMMON uses must bridge exactly two 240px gaps before normal 200px relays resume");
  assert.deepEqual(postShiftPath.map(hop => hop.damage), [10, 9, 8, 8, 7]);
  assert.deepEqual(postShiftPath.map(hop => hop.edgeRange), [420, 260, 260, 200, 200]);
  assert.deepEqual(postShiftPath.map(hop => hop.usedCommonBonus), [false, true, true, false, false]);
  assert.equal(postShiftPath.filter(hop => hop.usedCommonBonus).length, 2, "the extra authority must be bounded to exactly two total uses");
});

test("counted COMMON relay support preserves inherited zero/one-use SIGNAL semantics", () => {
  const rank3 = buildSignalArcProfile(3);
  const rank3Path = planSignalArc([trace(1, 80), trace(2, 250), trace(3, 420)], "A", 0, 0, rank3);
  assert.deepEqual(rank3Path.map(hop => hop.id), [1, 2, 3]);
  assert.deepEqual(rank3Path.map(hop => hop.usedCommonBonus), [false, false, false]);

  const rank5 = buildSignalArcProfile(5);
  const rank5Path = planSignalArc(TWO_BRIDGE_GEOMETRY, "A", 0, 0, rank5);
  assert.deepEqual(rank5Path.map(hop => hop.id), [1, 2], "inherited Rank V must still consume only its single COMMON relay use");
  assert.deepEqual(rank5Path.map(hop => hop.edgeRange), [420, 240]);
  assert.deepEqual(rank5Path.map(hop => hop.usedCommonBonus), [false, true]);
});
