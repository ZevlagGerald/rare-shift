import assert from "node:assert/strict";
import test from "node:test";
import { applyV21Draft, buildV21Draft, isV21DraftChoiceValid } from "../src/draft-core.ts";
import {
  canPlaceEchoMine,
  createEchoMine,
  echoBlastTargetIds,
  echoTriggerCandidateIds,
  ECHO_RANK_I,
  isEchoMineExpired,
  isEchoTriggerWindowOpen,
  selectEchoReplacementId,
  transitionEchoMineForPhase,
} from "../src/echo-core.ts";

const trace = (id: number, x: number, y: number) => ({ id, kind: "TRACE" as const, active: true, x, y });
const splitA = (id: number, x: number, y: number) => ({ id, kind: "SPLIT_A" as const, active: true, x, y });
const splitB = (id: number, x: number, y: number) => ({ id, kind: "SPLIT_B" as const, active: true, x, y });

test("ECHO Rank-I profile is exact and hard-capped", () => {
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

test("ECHO requires a genuine leave-and-return memory cycle", () => {
  const dormant = createEchoMine(1, 100, 100, "A", 0);
  assert.equal(dormant.state, "DORMANT_HOME");
  assert.equal(isEchoTriggerWindowOpen(dormant, "A", 500), false);
  assert.deepEqual(echoTriggerCandidateIds(dormant, "A", 500, [trace(1, 100, 100)]), []);

  const stillHome = transitionEchoMineForPhase(dormant, "A", 600);
  assert.equal(stillHome, dormant);

  const away = transitionEchoMineForPhase(dormant, "B", 700);
  assert.equal(away.state, "ARMED_AWAY");
  assert.equal(isEchoTriggerWindowOpen(away, "B", 1200), false);
  assert.deepEqual(echoTriggerCandidateIds(away, "B", 1200, [trace(1, 100, 100)]), []);

  const returned = transitionEchoMineForPhase(away, "A", 1300);
  assert.equal(returned.state, "RETURN_READY");
  assert.equal(returned.returnedAtMs, 1300);
  assert.equal(isEchoTriggerWindowOpen(returned, "A", 1549), false);
  assert.equal(isEchoTriggerWindowOpen(returned, "A", 1550), true);
});

test("ECHO leaving again preserves memory but requires a fresh return delay", () => {
  const dormant = createEchoMine(2, 0, 0, "B", 0);
  const away = transitionEchoMineForPhase(dormant, "A", 100);
  const returned = transitionEchoMineForPhase(away, "B", 200);
  assert.equal(returned.state, "RETURN_READY");
  const awayAgain = transitionEchoMineForPhase(returned, "A", 300);
  assert.equal(awayAgain.state, "ARMED_AWAY");
  assert.equal(awayAgain.returnedAtMs, null);
  const returnedAgain = transitionEchoMineForPhase(awayAgain, "B", 400);
  assert.equal(isEchoTriggerWindowOpen(returnedAgain, "B", 649), false);
  assert.equal(isEchoTriggerWindowOpen(returnedAgain, "B", 650), true);
});

test("COMMON cannot bypass ECHO phase memory", () => {
  const dormant = createEchoMine(3, 50, 50, "A", 0);
  assert.deepEqual(echoTriggerCandidateIds(dormant, "A", 1000, [trace(7, 50, 50)]), []);
  const away = transitionEchoMineForPhase(dormant, "B", 1100);
  assert.deepEqual(echoTriggerCandidateIds(away, "B", 1500, [trace(7, 50, 50)]), []);
  const returned = transitionEchoMineForPhase(away, "A", 1600);
  assert.deepEqual(echoTriggerCandidateIds(returned, "A", 1849, [trace(7, 50, 50)]), []);
  assert.deepEqual(echoTriggerCandidateIds(returned, "A", 1850, [trace(7, 50, 50)]), [7]);
});

test("ECHO trigger and blast authority exclude off-phase ghosts and sort stable ids", () => {
  const base = createEchoMine(4, 0, 0, "A", 0);
  const ready = transitionEchoMineForPhase(transitionEchoMineForPhase(base, "B", 100), "A", 200);
  const enemies = [splitB(8, 5, 0), trace(6, 8, 0), splitA(9, 10, 0), trace(2, 12, 0)];
  assert.deepEqual(echoTriggerCandidateIds(ready, "A", 450, enemies), [2, 6, 9]);
  assert.deepEqual(echoBlastTargetIds(ready, "A", enemies), [2, 6, 9]);
});

test("ECHO placement spacing and deterministic oldest replacement are bounded", () => {
  const mines = [
    createEchoMine(2, 0, 0, "A", 0),
    createEchoMine(5, 100, 0, "A", 100),
    createEchoMine(8, 200, 0, "A", 200),
  ];
  assert.equal(selectEchoReplacementId(mines), 2);
  assert.equal(canPlaceEchoMine(0, 0, mines), true, "candidate may reuse the position of the mine that will be replaced");
  assert.equal(canPlaceEchoMine(110, 0, mines), false, "candidate too close to retained mine must be rejected");
  assert.equal(selectEchoReplacementId(mines.slice(0, 2)), null);
});

test("ECHO expiry is exact and silent by age contract", () => {
  const mine = createEchoMine(9, 0, 0, "A", 1000);
  assert.equal(isEchoMineExpired(mine, 9999), false);
  assert.equal(isEchoMineExpired(mine, 10_000), true);
});

test("V2-2C preserves level-2 discovery and introduces ECHO at level 3", () => {
  const state = {
    deltaRank: 1,
    hp: 60,
    maxHp: 100,
    pickupRadius: 76,
    vectorEnabled: true,
    vectorOwned: false,
    orbitEnabled: true,
    orbitOwned: false,
    echoEnabled: true,
    echoOwned: false,
    weaponSlotsUsed: 1,
    weaponSlotCap: 4,
  };
  assert.deepEqual(buildV21Draft(13699, 2, state).map(choice => choice.id), ["ORBIT_NODES", "VECTOR_NEEDLE", "DELTA_RANK"]);
  assert.deepEqual(buildV21Draft(13699, 3, state).map(choice => choice.id), ["ECHO_MINE", "ORBIT_NODES", "VECTOR_NEEDLE"]);
});

test("ECHO acquisition consumes one slot and cannot duplicate", () => {
  const state = {
    deltaRank: 2,
    hp: 70,
    maxHp: 100,
    pickupRadius: 76,
    echoEnabled: true,
    echoOwned: false,
    weaponSlotsUsed: 2,
    weaponSlotCap: 4,
  };
  assert.equal(isV21DraftChoiceValid(state, "ECHO_MINE"), true);
  const acquired = applyV21Draft(state, "ECHO_MINE");
  assert.equal(acquired.echoOwned, true);
  assert.equal(acquired.weaponSlotsUsed, 3);
  assert.equal(isV21DraftChoiceValid(acquired, "ECHO_MINE"), false);
  assert.throws(() => applyV21Draft(acquired, "ECHO_MINE"), /already owned/u);
});

test("ECHO acquisition rejects disabled and full-slot states", () => {
  const disabled = { deltaRank: 2, hp: 70, maxHp: 100, pickupRadius: 76, weaponSlotsUsed: 2, weaponSlotCap: 4 };
  assert.equal(isV21DraftChoiceValid(disabled, "ECHO_MINE"), false);
  assert.throws(() => applyV21Draft(disabled, "ECHO_MINE"), /not enabled/u);
  const full = { ...disabled, echoEnabled: true, echoOwned: false, weaponSlotsUsed: 4 };
  assert.equal(isV21DraftChoiceValid(full, "ECHO_MINE"), false);
  assert.throws(() => applyV21Draft(full, "ECHO_MINE"), /No active weapon slot/u);
});
