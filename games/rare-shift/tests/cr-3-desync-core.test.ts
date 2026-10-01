import test from "node:test";
import assert from "node:assert/strict";
import {
  CR3_DESYNC_PROVISIONAL_PROFILE,
  advanceCR3Desync,
  applyCR3BossDamage,
  applyCR3ShiftResponse,
  createCR3DesyncState,
  isCR3BreakOpen,
  planCR3BossDecision,
  type CR3DesyncState,
} from "../src/cr3-desync-core.ts";
import type { Phase } from "../src/types.ts";

const PROFILE = CR3_DESYNC_PROVISIONAL_PROFILE;

function other(phase: Phase): Phase {
  return phase === "A" ? "B" : "A";
}

function damage(state: CR3DesyncState, amount: number, atMs: number, attackPhase: Phase = state.vulnerability): CR3DesyncState {
  const result = applyCR3BossDamage(state, { source: "WEAPON", attackPhase, amount, atMs }, PROFILE);
  assert.equal(result.accepted, true);
  assert.equal(result.rejection, "NONE");
  return result.state;
}

function reachBreak(seed = 0x435233): CR3DesyncState {
  let state = createCR3DesyncState(seed, 0, PROFILE);
  state = damage(state, PROFILE.maxHp - PROFILE.crossSplitAtHp, 100, state.vulnerability);
  assert.equal(state.phase, "CROSS_SPLIT");
  state = damage(state, PROFILE.crossSplitAtHp - PROFILE.breakWindowAtHp, 200, state.vulnerability);
  assert.equal(state.phase, "BREAK_WINDOW");
  assert.ok(state.expectedResponse === "A" || state.expectedResponse === "B");
  return state;
}

test("CR-3A creates deterministic seeded boss decisions", () => {
  const a = createCR3DesyncState(123456, 360_000, PROFILE);
  const b = createCR3DesyncState(123456, 360_000, PROFILE);
  assert.deepEqual(a, b);
  assert.equal(a.phase, "ALIGNMENT");
  assert.equal(a.hp, PROFILE.maxHp);
  assert.equal(a.phaseStartedAtMs, 360_000);
  assert.equal(a.defeatedAtMs, null);

  for (const phase of ["ALIGNMENT", "CROSS_SPLIT", "BREAK_WINDOW"] as const) {
    assert.deepEqual(planCR3BossDecision(991, phase, 7), planCR3BossDecision(991, phase, 7));
  }
});

test("CR-3A rejects illegal wrong-phase boss damage", () => {
  const state = createCR3DesyncState(7, 0, PROFILE);
  const result = applyCR3BossDamage(state, {
    source: "WEAPON",
    attackPhase: other(state.vulnerability),
    amount: 999,
    atMs: 10,
  }, PROFILE);
  assert.equal(result.accepted, false);
  assert.equal(result.appliedDamage, 0);
  assert.equal(result.rejection, "WRONG_PHASE");
  assert.equal(result.state.hp, PROFILE.maxHp);
  assert.equal(result.state.phase, "ALIGNMENT");
});

test("CR-3A accepts matching-phase damage and crosses phases monotonically", () => {
  let state = createCR3DesyncState(17, 0, PROFILE);
  state = damage(state, PROFILE.maxHp - PROFILE.crossSplitAtHp, 100, state.vulnerability);
  assert.equal(state.hp, PROFILE.crossSplitAtHp);
  assert.equal(state.phase, "CROSS_SPLIT");
  assert.equal(state.phaseStartedAtMs, 100);

  state = damage(state, PROFILE.crossSplitAtHp - PROFILE.breakWindowAtHp, 200, state.vulnerability);
  assert.equal(state.hp, PROFILE.breakWindowAtHp);
  assert.equal(state.phase, "BREAK_WINDOW");
  assert.equal(state.phaseStartedAtMs, 200);
  assert.notEqual(state.expectedResponse, null);
});

test("CR-3A makes DISCHARGE boss-immune in every living phase", () => {
  let state = createCR3DesyncState(23, 0, PROFILE);
  for (const atMs of [10, 20]) {
    const result = applyCR3BossDamage(state, {
      source: "DISCHARGE",
      attackPhase: state.vulnerability,
      amount: PROFILE.maxHp,
      atMs,
    }, PROFILE);
    assert.equal(result.accepted, false);
    assert.equal(result.rejection, "DISCHARGE_IMMUNE");
    assert.equal(result.state.hp, state.hp);
    state = result.state;
  }
});

test("CR-3A BREAK opens only for the correct response inside the tell boundary", () => {
  const breakState = reachBreak(31);
  const expected = breakState.expectedResponse!;

  const wrong = applyCR3ShiftResponse(breakState, other(expected), 300, PROFILE);
  assert.equal(wrong.accepted, false);
  assert.equal(wrong.openedBreak, false);
  assert.equal(wrong.state.breakOpenUntilMs, null);

  const correct = applyCR3ShiftResponse(wrong.state, expected, 301, PROFILE);
  assert.equal(correct.accepted, true);
  assert.equal(correct.openedBreak, true);
  assert.equal(correct.state.breakOpenUntilMs, 301 + PROFILE.breakWindowMs);
  assert.equal(isCR3BreakOpen(correct.state, 301), true);

  const lateBase = reachBreak(32);
  const deadline = lateBase.responseDeadlineMs!;
  const late = applyCR3ShiftResponse(lateBase, lateBase.expectedResponse!, deadline, PROFILE);
  assert.equal(late.openedBreak, false);
});

test("CR-3A rejects Phase-3 damage outside BREAK and enforces phase legality inside BREAK", () => {
  let state = reachBreak(41);
  const closed = applyCR3BossDamage(state, {
    source: "WEAPON",
    attackPhase: state.vulnerability,
    amount: 50,
    atMs: 250,
  }, PROFILE);
  assert.equal(closed.accepted, false);
  assert.equal(closed.rejection, "BREAK_CLOSED");

  const opened = applyCR3ShiftResponse(closed.state, closed.state.expectedResponse!, 251, PROFILE);
  assert.equal(opened.openedBreak, true);
  state = opened.state;

  const wrong = applyCR3BossDamage(state, {
    source: "WEAPON",
    attackPhase: other(state.vulnerability),
    amount: 50,
    atMs: 252,
  }, PROFILE);
  assert.equal(wrong.accepted, false);
  assert.equal(wrong.rejection, "WRONG_PHASE");
  assert.equal(wrong.state.hp, PROFILE.breakWindowAtHp);

  const legal = applyCR3BossDamage(wrong.state, {
    source: "WEAPON",
    attackPhase: wrong.state.vulnerability,
    amount: 50,
    atMs: 253,
  }, PROFILE);
  assert.equal(legal.accepted, true);
  assert.equal(legal.state.hp, PROFILE.breakWindowAtHp - 50);
});

test("CR-3A BREAK closes exactly at its end boundary and advances to a new deterministic tell", () => {
  const base = reachBreak(51);
  const opened = applyCR3ShiftResponse(base, base.expectedResponse!, 300, PROFILE).state;
  const end = opened.breakOpenUntilMs!;
  assert.equal(isCR3BreakOpen(opened, end - 1), true);
  assert.equal(isCR3BreakOpen(opened, end), false);

  const advanced = advanceCR3Desync(opened, end, PROFILE);
  assert.equal(advanced.phase, "BREAK_WINDOW");
  assert.equal(advanced.breakOpenUntilMs, null);
  assert.notEqual(advanced.responseDeadlineMs, null);
  assert.equal(advanced.cycleOrdinal, opened.cycleOrdinal + 1);
});

test("CR-3A defeat is exactly once and terminal", () => {
  const base = reachBreak(61);
  let state = applyCR3ShiftResponse(base, base.expectedResponse!, 300, PROFILE).state;
  const lethal = applyCR3BossDamage(state, {
    source: "WEAPON",
    attackPhase: state.vulnerability,
    amount: 10_000,
    atMs: 301,
  }, PROFILE);
  assert.equal(lethal.accepted, true);
  assert.equal(lethal.defeatedNow, true);
  assert.equal(lethal.state.hp, 0);
  assert.equal(lethal.state.phase, "DEFEATED");
  assert.equal(lethal.state.defeatedAtMs, 301);

  state = lethal.state;
  const repeat = applyCR3BossDamage(state, {
    source: "WEAPON",
    attackPhase: state.vulnerability,
    amount: 1,
    atMs: 302,
  }, PROFILE);
  assert.equal(repeat.accepted, false);
  assert.equal(repeat.defeatedNow, false);
  assert.equal(repeat.rejection, "BOSS_DEFEATED");
  assert.equal(repeat.state.defeatedAtMs, 301);
});

test("CR-3A seeded replay produces the same state trace", () => {
  function replay(seed: number): readonly CR3DesyncState[] {
    const trace: CR3DesyncState[] = [];
    let state = createCR3DesyncState(seed, 360_000, PROFILE);
    trace.push(state);
    state = advanceCR3Desync(state, 368_000, PROFILE); trace.push(state);
    state = damage(state, 300, 368_100, state.vulnerability); trace.push(state);
    state = advanceCR3Desync(state, 374_000, PROFILE); trace.push(state);
    state = damage(state, 350, 374_100, state.vulnerability); trace.push(state);
    const response = applyCR3ShiftResponse(state, state.expectedResponse!, 374_200, PROFILE);
    state = response.state; trace.push(state);
    state = damage(state, 100, 374_300, state.vulnerability); trace.push(state);
    return trace;
  }

  assert.deepEqual(replay(0x52415245), replay(0x52415245));
});
