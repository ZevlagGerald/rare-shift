import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEchoProfile,
  canApplyEchoDamage,
  canPlaceEchoMine,
  createEchoMine,
  echoBlastTargetIds,
  echoTriggerCandidateIds,
  ECHO_BURST_MAX_HITS,
  ECHO_BURST_WINDOW_MS,
  ECHO_DEPTH_CAP,
  ECHO_DEPTH_INCREMENT_GUARD_MS,
  ECHO_RANK_I,
  initializeEchoMineForRankV,
  isEchoMineExpired,
  isEchoTriggerWindowOpen,
  planEchoDamageTargets,
  recordEchoDamage,
  selectEchoReplacementId,
  transitionEchoMineForPhase,
  type EchoBurstLedger,
} from "../src/echo-core.ts";

const trace = (id: number, x: number, y: number, active = true) => ({ id, kind: "TRACE" as const, active, x, y });
const splitA = (id: number, x: number, y: number, active = true) => ({ id, kind: "SPLIT_A" as const, active, x, y });
const splitB = (id: number, x: number, y: number, active = true) => ({ id, kind: "SPLIT_B" as const, active, x, y });

test("ECHO Rank-I public profile remains exactly compatible", () => {
  assert.deepEqual(ECHO_RANK_I, {
    placementIntervalMs: 1800,
    maxActive: 3,
    minSeparation: 56,
    lifetimeMs: 9000,
    returnDelayMs: 250,
    triggerRadius: 68,
    blastRadius: 84,
    damage: 16,
  });
});

test("ECHO Rank II-V profiles are exact", () => {
  assert.deepEqual(buildEchoProfile(2, 0), {
    rank: 2, memoryDepth: 0, placementIntervalMs: 1800, maxActive: 4, minSeparation: 56,
    lifetimeMs: 12000, returnDelayMs: 250, triggerRadius: 68, blastRadius: 84, damage: 16,
  });
  assert.deepEqual(buildEchoProfile(3, 0), {
    rank: 3, memoryDepth: 0, placementIntervalMs: 1800, maxActive: 4, minSeparation: 56,
    lifetimeMs: 12000, returnDelayMs: 250, triggerRadius: 76, blastRadius: 108, damage: 16,
  });
  assert.deepEqual(buildEchoProfile(4, 0), {
    rank: 4, memoryDepth: 0, placementIntervalMs: 1800, maxActive: 4, minSeparation: 56,
    lifetimeMs: 12000, returnDelayMs: 140, triggerRadius: 76, blastRadius: 108, damage: 16,
  });
  assert.deepEqual(buildEchoProfile(5, 1), {
    rank: 5, memoryDepth: 1, placementIntervalMs: 1800, maxActive: 4, minSeparation: 56,
    lifetimeMs: 12000, returnDelayMs: 140, triggerRadius: 76, blastRadius: 108, damage: 16,
  });
  assert.deepEqual(buildEchoProfile(5, 2), {
    rank: 5, memoryDepth: 2, placementIntervalMs: 1800, maxActive: 4, minSeparation: 56,
    lifetimeMs: 12000, returnDelayMs: 140, triggerRadius: 84, blastRadius: 120, damage: 20,
  });
});

test("ECHO rejects invalid rank and memory depth", () => {
  assert.throws(() => buildEchoProfile(0), /rank/u);
  assert.throws(() => buildEchoProfile(6), /rank/u);
  assert.throws(() => buildEchoProfile(5, -1), /memory depth/u);
  assert.throws(() => buildEchoProfile(5, 3), /memory depth/u);
});

test("Rank-V acquisition initializes active mines to neutral depth without fabricating history", () => {
  const base = createEchoMine(4, 10, 20, "A", 100);
  const returned = transitionEchoMineForPhase(transitionEchoMineForPhase(base, "B", 200, 4), "A", 300, 4);
  const migrated = initializeEchoMineForRankV({ ...returned, memoryDepth: 2, lastDepthIncrementAtMs: 250 });
  assert.equal(migrated.id, 4);
  assert.equal(migrated.x, 10);
  assert.equal(migrated.y, 20);
  assert.equal(migrated.recordedPhase, "A");
  assert.equal(migrated.createdAtMs, 100);
  assert.equal(migrated.state, "RETURN_READY");
  assert.equal(migrated.returnedAtMs, 300);
  assert.equal(migrated.memoryDepth, 0);
  assert.equal(migrated.lastDepthIncrementAtMs, null);
});

test("Rank V depth requires genuine away-return cycles and staying home adds nothing", () => {
  const mine = createEchoMine(1, 0, 0, "A", 0);
  assert.equal(transitionEchoMineForPhase(mine, "A", 1000, 5).memoryDepth, 0);
  const away = transitionEchoMineForPhase(mine, "B", 100, 5);
  const returned = transitionEchoMineForPhase(away, "A", 200, 5);
  assert.equal(returned.memoryDepth, 1);
  assert.equal(returned.lastDepthIncrementAtMs, 200);
  assert.equal(transitionEchoMineForPhase(returned, "A", 1200, 5).memoryDepth, 1);
});

test("Rank V depth guard is exact at 899/900ms and caps at two", () => {
  let mine = createEchoMine(2, 0, 0, "A", 0);
  mine = transitionEchoMineForPhase(mine, "B", 50, 5);
  mine = transitionEchoMineForPhase(mine, "A", 100, 5);
  assert.equal(mine.memoryDepth, 1);

  mine = transitionEchoMineForPhase(mine, "B", 500, 5);
  mine = transitionEchoMineForPhase(mine, "A", 999, 5);
  assert.equal(mine.memoryDepth, 1, "899ms must not increment");
  assert.equal(mine.returnedAtMs, 999, "state transition still occurs when depth increment is rejected");

  mine = transitionEchoMineForPhase(mine, "B", 1000, 5);
  mine = transitionEchoMineForPhase(mine, "A", 1000, 5);
  assert.equal(mine.memoryDepth, 2, "900ms must increment");
  assert.equal(mine.lastDepthIncrementAtMs, 1000);

  mine = transitionEchoMineForPhase(mine, "B", 2500, 5);
  mine = transitionEchoMineForPhase(mine, "A", 2600, 5);
  assert.equal(mine.memoryDepth, ECHO_DEPTH_CAP);
  assert.equal(mine.lastDepthIncrementAtMs, 1000, "cap prevents a synthetic accepted increment");
});

test("Rank IV fast recall has exact 140ms boundary", () => {
  const base = createEchoMine(3, 0, 0, "A", 0);
  const ready = transitionEchoMineForPhase(transitionEchoMineForPhase(base, "B", 100, 4), "A", 200, 4);
  const profile = buildEchoProfile(4, 0);
  assert.equal(isEchoTriggerWindowOpen(ready, "A", 339, profile), false);
  assert.equal(isEchoTriggerWindowOpen(ready, "A", 340, profile), true);
});

test("Existing mines immediately adopt higher-rank numeric lifetime from original creation time", () => {
  const mine = createEchoMine(5, 0, 0, "A", 1000);
  assert.equal(isEchoMineExpired(mine, 9999, buildEchoProfile(1)), false);
  assert.equal(isEchoMineExpired(mine, 10_000, buildEchoProfile(1)), true);
  assert.equal(isEchoMineExpired(mine, 10_000, buildEchoProfile(2)), false);
  assert.equal(isEchoMineExpired(mine, 12_999, buildEchoProfile(2)), false);
  assert.equal(isEchoMineExpired(mine, 13_000, buildEchoProfile(2)), true);
});

test("Rank III and deep Rank V geometry remain phase-corporeal and stable-id sorted", () => {
  const base = createEchoMine(6, 0, 0, "A", 0);
  const ready = transitionEchoMineForPhase(transitionEchoMineForPhase(base, "B", 10, 5), "A", 20, 5);
  const enemies = [splitB(9, 10, 0), trace(7, 82, 0), splitA(4, 80, 0), trace(2, 75, 0)];
  assert.deepEqual(echoTriggerCandidateIds(ready, "A", 160, enemies, buildEchoProfile(5, 2)), [2, 4, 7]);
  assert.deepEqual(echoBlastTargetIds(ready, "A", enemies, buildEchoProfile(5, 2)), [2, 4, 7]);
});

test("Rank II oldest-id replacement uses four-mine cap deterministically", () => {
  const profile = buildEchoProfile(2);
  const mines = [
    createEchoMine(9, 0, 0, "A", 0),
    createEchoMine(3, 100, 0, "A", 1),
    createEchoMine(7, 200, 0, "A", 2),
    createEchoMine(5, 300, 0, "A", 3),
  ];
  assert.equal(selectEchoReplacementId(mines, profile), 3);
  assert.equal(selectEchoReplacementId(mines.slice(0, 3), profile), null);
  assert.equal(canPlaceEchoMine(100, 0, mines, 3, profile), true);
  assert.equal(canPlaceEchoMine(205, 0, mines, 3, profile), false);
});

test("Rank-V burst ledger permits exactly two hits inside rolling 250ms window", () => {
  let ledger: EchoBurstLedger = new Map();
  assert.equal(canApplyEchoDamage(5, ledger, 11, 1000), true);
  ledger = recordEchoDamage(ledger, 11, 1000);
  assert.equal(canApplyEchoDamage(5, ledger, 11, 1100), true);
  ledger = recordEchoDamage(ledger, 11, 1100);
  assert.equal(canApplyEchoDamage(5, ledger, 11, 1249), false);
  assert.equal(ECHO_BURST_MAX_HITS, 2);
  assert.equal(ECHO_BURST_WINDOW_MS, 250);
});

test("Rank-V burst ledger exact boundary makes a hit eligible at 250ms", () => {
  let ledger: EchoBurstLedger = new Map();
  ledger = recordEchoDamage(ledger, 12, 1000);
  ledger = recordEchoDamage(ledger, 12, 1100);
  assert.equal(canApplyEchoDamage(5, ledger, 12, 1249), false);
  assert.equal(canApplyEchoDamage(5, ledger, 12, 1250), true);
});

test("Burst cap is target-local and blocked damage is not queued", () => {
  let ledger: EchoBurstLedger = new Map();
  ledger = recordEchoDamage(recordEchoDamage(ledger, 1, 1000), 1, 1050);
  const plan = planEchoDamageTargets([2, 1, 3, 1], 5, 1100, ledger);
  assert.deepEqual(plan.targetIds, [2, 3]);
  assert.equal(canApplyEchoDamage(5, plan.ledger, 1, 1100), false);
  assert.equal(canApplyEchoDamage(5, plan.ledger, 2, 1100), true, "second accepted hit was recorded once and remains below cap");
  assert.equal(canApplyEchoDamage(5, plan.ledger, 3, 1100), true);
});

test("Burst planning is invariant to candidate input order", () => {
  const ledger: EchoBurstLedger = new Map([[5, [1000, 1050]]]);
  const a = planEchoDamageTargets([8, 5, 2, 7], 5, 1100, ledger);
  const b = planEchoDamageTargets([7, 2, 5, 8], 5, 1100, ledger);
  assert.deepEqual(a.targetIds, [2, 7, 8]);
  assert.deepEqual(b.targetIds, a.targetIds);
  assert.deepEqual([...a.ledger.entries()], [...b.ledger.entries()]);
});

test("pre-Rank-V ECHO damage is not suppressed by the Rank-V ledger", () => {
  const ledger: EchoBurstLedger = new Map([[3, [1000, 1010, 1020, 1030]]]);
  assert.equal(canApplyEchoDamage(4, ledger, 3, 1040), true);
  assert.deepEqual(planEchoDamageTargets([3, 4], 4, 1040, ledger).targetIds, [3, 4]);
});

test("depth timing constants remain locked", () => {
  assert.equal(ECHO_DEPTH_INCREMENT_GUARD_MS, 900);
  assert.equal(ECHO_DEPTH_CAP, 2);
});
