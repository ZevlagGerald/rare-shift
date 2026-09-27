import assert from "node:assert/strict";
import test from "node:test";
import { applyV21Draft, buildV21Draft, isV21DraftChoiceValid } from "../src/draft-core.ts";
import {
  advanceSignalArcCooldown,
  planSignalArc,
  SIGNAL_ARC_RANK_I,
  signalArcPhaseAfterSameTickShift,
} from "../src/signal-arc-core.ts";

const trace = (id: number, x: number, y: number) => ({ id, kind: "TRACE" as const, active: true, x, y });
const splitA = (id: number, x: number, y: number) => ({ id, kind: "SPLIT_A" as const, active: true, x, y });
const splitB = (id: number, x: number, y: number) => ({ id, kind: "SPLIT_B" as const, active: true, x, y });

test("SIGNAL ARC Rank-I profile is exact and bounded", () => {
  assert.deepEqual(SIGNAL_ARC_RANK_I, {
    cooldownMs: 1250,
    acquisitionRange: 420,
    relayRange: 180,
    maxTargets: 3,
    damages: [10, 8, 6],
  });
});

test("SIGNAL ARC excludes off-phase enemies from initial acquisition", () => {
  const path = planSignalArc([splitB(1, 20, 0), splitA(2, 40, 0)], "A", 0, 0);
  assert.deepEqual(path.map(hop => hop.id), [2]);
});

test("SIGNAL ARC nearest initial target wins", () => {
  const path = planSignalArc([trace(7, 80, 0), trace(3, 40, 0)], "A", 0, 0);
  assert.equal(path[0]?.id, 3);
});

test("SIGNAL ARC initial equal-distance tie uses lower stable id", () => {
  const path = planSignalArc([trace(9, -40, 0), trace(2, 40, 0)], "A", 0, 0);
  assert.equal(path[0]?.id, 2);
});

test("SIGNAL ARC relay selection originates from previous target", () => {
  const path = planSignalArc([trace(1, 100, 0), trace(2, 250, 0), trace(3, 70, 170)], "A", 0, 0);
  assert.deepEqual(path.map(hop => hop.id), [1, 2]);
});

test("SIGNAL ARC relay equal-distance tie uses lower stable id", () => {
  const path = planSignalArc([trace(1, 100, 0), trace(8, 160, 80), trace(4, 160, -80)], "A", 0, 0);
  assert.deepEqual(path.map(hop => hop.id), [1, 4, 8]);
});

test("SIGNAL ARC hard caps path at three unique targets", () => {
  const path = planSignalArc([trace(1, 50, 0), trace(2, 100, 0), trace(3, 150, 0), trace(4, 200, 0)], "A", 0, 0);
  assert.equal(path.length, 3);
  assert.equal(new Set(path.map(hop => hop.id)).size, 3);
});

test("SIGNAL ARC damage sequence is exactly 10 8 6", () => {
  const path = planSignalArc([trace(1, 50, 0), trace(2, 100, 0), trace(3, 150, 0)], "A", 0, 0);
  assert.deepEqual(path.map(hop => hop.damage), [10, 8, 6]);
});

test("SIGNAL ARC chain stops when relay exceeds 180 px", () => {
  const path = planSignalArc([trace(1, 100, 0), trace(2, 281, 0)], "A", 0, 0);
  assert.deepEqual(path.map(hop => hop.id), [1]);
});

test("SIGNAL ARC COMMON is eligible in both phases", () => {
  assert.deepEqual(planSignalArc([trace(1, 50, 0)], "A", 0, 0).map(hop => hop.id), [1]);
  assert.deepEqual(planSignalArc([trace(1, 50, 0)], "B", 0, 0).map(hop => hop.id), [1]);
});

test("SIGNAL ARC COMMON cannot relay into an off-phase ghost", () => {
  const path = planSignalArc([splitA(1, 40, 0), trace(2, 100, 0), splitB(3, 150, 0)], "A", 0, 0);
  assert.deepEqual(path.map(hop => hop.id), [1, 2]);
});

test("SIGNAL ARC SHIFT rewrites aligned graph while retaining COMMON", () => {
  const enemies = [splitA(1, 40, 0), trace(2, 90, 0), splitB(3, 140, 0)];
  assert.deepEqual(planSignalArc(enemies, "A", 0, 0).map(hop => hop.id), [1, 2]);
  assert.deepEqual(planSignalArc(enemies, "B", 0, 0).map(hop => hop.id), [2, 3]);
});

test("SIGNAL ARC same-tick accepted SHIFT uses post-SHIFT authority", () => {
  const enemies = [splitA(1, 40, 0), splitB(2, 50, 0)];
  const effective = signalArcPhaseAfterSameTickShift("A", true);
  assert.equal(effective, "B");
  assert.deepEqual(planSignalArc(enemies, effective, 0, 0).map(hop => hop.id), [2]);
});

test("SIGNAL ARC cooldown advances deterministically and caps", () => {
  assert.equal(advanceSignalArcCooldown(300, 400), 700);
  assert.equal(advanceSignalArcCooldown(1100, 400), 1250);
});

test("SIGNAL ARC no-target plan is empty", () => {
  assert.deepEqual(planSignalArc([splitB(1, 50, 0)], "A", 0, 0), []);
});

test("V2-2D preserves level-2 discovery and keeps SIGNAL absent", () => {
  const state = {
    deltaRank: 1, hp: 60, maxHp: 100, pickupRadius: 76,
    vectorEnabled: true, vectorOwned: false,
    orbitEnabled: true, orbitOwned: false,
    echoEnabled: false, echoOwned: false,
    signalEnabled: false, signalOwned: false,
    weaponSlotsUsed: 1, weaponSlotCap: 4,
  };
  assert.deepEqual(buildV21Draft(13699, 2, state).map(choice => choice.id), ["ORBIT_NODES", "VECTOR_NEEDLE", "DELTA_RANK"]);
});

test("V2-2D preserves level-3 ECHO discovery and keeps SIGNAL absent", () => {
  const state = {
    deltaRank: 1, hp: 60, maxHp: 100, pickupRadius: 76,
    vectorEnabled: true, vectorOwned: false,
    orbitEnabled: true, orbitOwned: true,
    echoEnabled: true, echoOwned: false,
    signalEnabled: false, signalOwned: false,
    weaponSlotsUsed: 2, weaponSlotCap: 4,
  };
  const ids = buildV21Draft(13699, 3, state).map(choice => choice.id);
  assert.equal(ids.includes("ECHO_MINE"), true);
  assert.equal(ids.includes("SIGNAL_ARC"), false);
});

test("V2-2D level-4 discovery guarantees SIGNAL when fourth slot remains", () => {
  const state = {
    deltaRank: 1, hp: 60, maxHp: 100, pickupRadius: 76,
    vectorEnabled: true, vectorOwned: false,
    orbitEnabled: true, orbitOwned: true,
    echoEnabled: true, echoOwned: true,
    signalEnabled: true, signalOwned: false,
    weaponSlotsUsed: 3, weaponSlotCap: 4,
  };
  const ids = buildV21Draft(13699, 4, state).map(choice => choice.id);
  assert.equal(ids.length, 3);
  assert.equal(ids.includes("SIGNAL_ARC"), true);
});

test("SIGNAL ARC acquisition consumes exactly one slot and cannot duplicate", () => {
  const state = {
    deltaRank: 1, hp: 70, maxHp: 100, pickupRadius: 76,
    signalEnabled: true, signalOwned: false,
    weaponSlotsUsed: 3, weaponSlotCap: 4,
  };
  assert.equal(isV21DraftChoiceValid(state, "SIGNAL_ARC"), true);
  const acquired = applyV21Draft(state, "SIGNAL_ARC");
  assert.equal(acquired.signalOwned, true);
  assert.equal(acquired.weaponSlotsUsed, 4);
  assert.equal(isV21DraftChoiceValid(acquired, "SIGNAL_ARC"), false);
  assert.throws(() => applyV21Draft(acquired, "SIGNAL_ARC"), /already owned/u);
});

test("SIGNAL ARC acquisition rejects disabled and full-slot states", () => {
  const disabled = { deltaRank: 1, hp: 70, maxHp: 100, pickupRadius: 76, weaponSlotsUsed: 3, weaponSlotCap: 4 };
  assert.equal(isV21DraftChoiceValid(disabled, "SIGNAL_ARC"), false);
  assert.throws(() => applyV21Draft(disabled, "SIGNAL_ARC"), /not enabled/u);
  const full = { ...disabled, signalEnabled: true, signalOwned: false, weaponSlotsUsed: 4 };
  assert.equal(isV21DraftChoiceValid(full, "SIGNAL_ARC"), false);
  assert.throws(() => applyV21Draft(full, "SIGNAL_ARC"), /No active weapon slot/u);
});
