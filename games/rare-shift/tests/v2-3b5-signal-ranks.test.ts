import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceSignalArcCooldown,
  buildSignalArcProfile,
  planSignalArc,
  signalArcForwardDegree,
  SIGNAL_ARC_RANK_I,
} from "../src/signal-arc-core.ts";

const trace = (id: number, x: number, y: number, active = true) => ({ id, kind: "TRACE" as const, active, x, y });
const splitA = (id: number, x: number, y: number, active = true) => ({ id, kind: "SPLIT_A" as const, active, x, y });
const splitB = (id: number, x: number, y: number, active = true) => ({ id, kind: "SPLIT_B" as const, active, x, y });

test("SIGNAL Rank-I public constant remains exact while Rank I-V profiles are bounded", () => {
  assert.deepEqual(SIGNAL_ARC_RANK_I, {
    cooldownMs: 1250,
    acquisitionRange: 420,
    relayRange: 180,
    maxTargets: 3,
    damages: [10, 8, 6],
  });
  assert.deepEqual(buildSignalArcProfile(1), {
    rank: 1, cooldownMs: 1250, acquisitionRange: 420, relayRange: 180, maxTargets: 3,
    damages: [10, 8, 6], commonRelayBonus: 0, commonBonusUses: 0, routing: "NEAREST",
  });
  assert.deepEqual(buildSignalArcProfile(2), {
    rank: 2, cooldownMs: 1250, acquisitionRange: 420, relayRange: 180, maxTargets: 4,
    damages: [10, 8, 6, 5], commonRelayBonus: 0, commonBonusUses: 0, routing: "NEAREST",
  });
  assert.deepEqual(buildSignalArcProfile(3), {
    rank: 3, cooldownMs: 1250, acquisitionRange: 420, relayRange: 180, maxTargets: 4,
    damages: [10, 9, 8, 7], commonRelayBonus: 0, commonBonusUses: 0, routing: "NEAREST",
  });
  assert.deepEqual(buildSignalArcProfile(4), {
    rank: 4, cooldownMs: 1250, acquisitionRange: 420, relayRange: 180, maxTargets: 4,
    damages: [10, 9, 8, 7], commonRelayBonus: 60, commonBonusUses: 1, routing: "NEAREST",
  });
  assert.deepEqual(buildSignalArcProfile(5), {
    rank: 5, cooldownMs: 1250, acquisitionRange: 420, relayRange: 180, maxTargets: 4,
    damages: [10, 9, 8, 7], commonRelayBonus: 60, commonBonusUses: 1, routing: "FORWARD_DEGREE",
  });
  assert.throws(() => buildSignalArcProfile(0), /rank/u);
  assert.throws(() => buildSignalArcProfile(6), /rank/u);
});

test("Rank II EXTRA LINK reaches four unique targets with exact 10 8 6 5 damage", () => {
  const path = planSignalArc(
    [trace(1, 50, 0), trace(2, 100, 0), trace(3, 150, 0), trace(4, 200, 0), trace(5, 250, 0)],
    "A", 0, 0, buildSignalArcProfile(2),
  );
  assert.deepEqual(path.map(hop => hop.id), [1, 2, 3, 4]);
  assert.deepEqual(path.map(hop => hop.damage), [10, 8, 6, 5]);
  assert.equal(new Set(path.map(hop => hop.id)).size, 4);
});

test("Rank III LOWER DECAY keeps four-target graph and exact 10 9 8 7 damage", () => {
  const path = planSignalArc(
    [trace(1, 50, 0), trace(2, 100, 0), trace(3, 150, 0), trace(4, 200, 0)],
    "A", 0, 0, buildSignalArcProfile(3),
  );
  assert.deepEqual(path.map(hop => hop.damage), [10, 9, 8, 7]);
});

test("Rank IV RESONANT RELAY extends exactly one edge from first COMMON relay to 240px", () => {
  const candidates = [splitA(1, 40, 0), trace(2, 180, 0), splitA(3, 410, 0)];
  const rank3 = planSignalArc(candidates, "A", 0, 0, buildSignalArcProfile(3));
  const rank4 = planSignalArc(candidates, "A", 0, 0, buildSignalArcProfile(4));
  assert.deepEqual(rank3.map(hop => hop.id), [1, 2]);
  assert.deepEqual(rank4.map(hop => hop.id), [1, 2, 3]);
  assert.equal(rank4[2]?.edgeRange, 240);
  assert.equal(rank4[2]?.usedCommonBonus, true);
});

test("Rank IV COMMON bonus is consumed by its first successful relay even when edge is within 180px", () => {
  const path = planSignalArc(
    [trace(1, 40, 0), splitA(2, 140, 0), trace(3, 240, 0), splitA(4, 460, 0)],
    "A", 0, 0, buildSignalArcProfile(4),
  );
  assert.deepEqual(path.map(hop => hop.id), [1, 2, 3]);
  assert.equal(path[1]?.usedCommonBonus, true);
  assert.equal(path[1]?.edgeRange, 240);
});

test("Rank IV boosted edge still obeys corporeal authority and cannot legalize a ghost", () => {
  const path = planSignalArc(
    [splitA(1, 40, 0), trace(2, 180, 0), splitB(3, 410, 0), splitA(4, 400, 20)],
    "A", 0, 0, buildSignalArcProfile(4),
  );
  assert.equal(path.some(hop => hop.id === 3), false);
  assert.equal(path.some(hop => hop.id === 4), true);
});

test("Rank V CHAIN CONTROL prefers greater forward degree over a nearer relay", () => {
  const candidates = [
    splitA(1, 50, 0),
    splitA(2, 100, 0),
    splitA(3, 50, 150),
    splitA(4, 50, 300),
    splitA(5, 100, 300),
  ];
  const rank4 = planSignalArc(candidates, "A", 0, 0, buildSignalArcProfile(4));
  const rank5 = planSignalArc(candidates, "A", 0, 0, buildSignalArcProfile(5));
  assert.equal(rank4[1]?.id, 2);
  assert.equal(rank5[1]?.id, 3);
  assert.ok((rank5[1]?.forwardDegree ?? -1) > 0);
});

test("Rank V forward degree uses remaining COMMON authority for the candidate's next edge", () => {
  const profile = buildSignalArcProfile(5);
  const candidates = [trace(2, 160, 0), splitA(3, 80, 100), splitA(4, 380, 0)];
  const visited = new Set<number>([1]);
  assert.equal(signalArcForwardDegree(candidates[0], candidates, "A", visited, profile, true), 2);
  assert.equal(signalArcForwardDegree(candidates[0], candidates, "A", visited, profile, false), 1);
});

test("Rank V current COMMON edge consumes the one bonus before forward-degree lookahead", () => {
  const path = planSignalArc(
    [trace(1, 40, 0), splitA(2, 100, 0), trace(3, 180, 0), splitA(4, 400, 0)],
    "A", 0, 0, buildSignalArcProfile(5),
  );
  assert.equal(path[1]?.usedCommonBonus, true);
  assert.equal(path.some(hop => hop.id === 4), false);
});

test("Rank V forward-degree ties fall back to shortest edge then lower stable id", () => {
  const profile = buildSignalArcProfile(5);
  const shortest = planSignalArc(
    [splitA(1, 40, 0), splitA(2, 80, 0), splitA(3, 40, 140)],
    "A", 0, 0, profile,
  );
  assert.equal(shortest[1]?.id, 2);
  const stable = planSignalArc(
    [splitA(1, 40, 0), splitA(9, 100, 80), splitA(4, 100, -80)],
    "A", 0, 0, profile,
  );
  assert.equal(stable[1]?.id, 4);
});

test("Rank V planning is invariant to candidate input order", () => {
  const profile = buildSignalArcProfile(5);
  const candidates = [splitA(1, 40, 0), trace(7, 150, 0), splitA(3, 80, 120), splitA(4, 300, 0), splitA(5, 80, 280)];
  const a = planSignalArc(candidates, "A", 0, 0, profile);
  const b = planSignalArc([...candidates].reverse(), "A", 0, 0, profile);
  assert.deepEqual(a, b);
});

test("SIGNAL cast plan snapshots target geometry and authority at cast start", () => {
  const mutable = { id: 1, kind: "TRACE" as const, active: true, x: 40, y: 0 };
  const second = { id: 2, kind: "SPLIT_A" as const, active: true, x: 100, y: 0 };
  const path = planSignalArc([mutable, second], "A", 0, 0, buildSignalArcProfile(5));
  mutable.x = 999;
  mutable.active = false;
  assert.equal(path[0]?.x, 40);
  assert.equal(path[0]?.kind, "TRACE");
  assert.deepEqual(path.map(hop => hop.id), [1, 2]);
});

test("all SIGNAL ranks preserve the same 1250ms ordinary cooldown without free readiness", () => {
  for (let rank = 1; rank <= 5; rank += 1) {
    const profile = buildSignalArcProfile(rank);
    assert.equal(profile.cooldownMs, 1250);
    assert.equal(advanceSignalArcCooldown(600, 400, profile), 1000);
    assert.equal(advanceSignalArcCooldown(1200, 100, profile), 1250);
  }
});
