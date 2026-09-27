import assert from "node:assert/strict";
import test from "node:test";
import { planSignalArc } from "../src/signal-arc-core.ts";

const trace = (id: number, x: number, y: number, active = true) => ({ id, kind: "TRACE" as const, active, x, y });

test("SIGNAL ARC ignores inactive candidates", () => {
  const path = planSignalArc([trace(1, 20, 0, false), trace(2, 40, 0)], "A", 0, 0);
  assert.deepEqual(path.map(hop => hop.id), [2]);
});

test("SIGNAL ARC initial acquisition is hard-capped at 420 px", () => {
  assert.deepEqual(planSignalArc([trace(1, 421, 0)], "A", 0, 0), []);
  assert.deepEqual(planSignalArc([trace(1, 420, 0)], "A", 0, 0).map(hop => hop.id), [1]);
});

test("SIGNAL ARC target plan is invariant to candidate array order", () => {
  const a = [trace(7, 80, 0), trace(2, 80, 0), trace(4, 150, 0), trace(9, 220, 0)];
  const b = [...a].reverse();
  assert.deepEqual(planSignalArc(a, "A", 0, 0), planSignalArc(b, "A", 0, 0));
});
