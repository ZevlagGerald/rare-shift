import assert from "node:assert/strict";
import test from "node:test";
import { buildCR3RunResult, detectCR3TerminalOutcome } from "../src/cr3-results-core.ts";

const base = Object.freeze({
  cr3dResultsRuntime: "ACTIVE",
  friend: "1234",
  family: "Signals",
  frameA: "7",
  frameB: "13",
  seed: "305419896",
  directorElapsedMs: "421337",
  kills: "84",
  level: "11",
  hp: "37",
  phase: "B",
  shifts: "19",
  cr3dDamageTaken: "143",
  deltaRank: "5",
  vectorOwned: "true",
  vectorRank: "4",
  orbitOwned: "false",
  orbitRank: "1",
  echoOwned: "true",
  echoRank: "5",
  signalOwned: "true",
  signalRank: "3",
  cr3dEvolvedWeapons: "ECHO,DELTA",
  protocols: "COMMON_CORE:2,MEMORY_FUSE:1",
  evolutionCores: "1",
  elitesDefeated: "3",
  cr3BossPhase: "DEFEATED",
  cr3BossDefeatEvents: "1",
  cr3dTerminalPauseEvents: "1",
});

test("CR-3D terminal detection requires active CR-3D authority", () => {
  assert.equal(detectCR3TerminalOutcome({ ...base, cr3dResultsRuntime: "SUPPRESSED_FOR_CR3B_QUALIFICATION" }), null);
  assert.equal(detectCR3TerminalOutcome({ ...base, cr3dResultsRuntime: undefined }), null);
});

test("CR-3D terminal detection prefers verified boss victory and otherwise reports death", () => {
  assert.equal(detectCR3TerminalOutcome({ ...base, dead: "true" }), "VICTORY");
  assert.equal(detectCR3TerminalOutcome({ ...base, cr3BossPhase: "BREAK_WINDOW", cr3BossDefeatEvents: "0", dead: "true" }), "DEFEAT");
  assert.equal(detectCR3TerminalOutcome({ ...base, cr3BossPhase: "BREAK_WINDOW", cr3BossDefeatEvents: "0", dead: "false" }), null);
});

test("CR-3D result snapshot is deterministic and preserves complete run identity", () => {
  const first = buildCR3RunResult(base, "VICTORY");
  const second = buildCR3RunResult(base, "VICTORY");
  assert.deepEqual(first, second);
  assert.equal(first.friend, "1234");
  assert.equal(first.frameA, 7);
  assert.equal(first.frameB, 13);
  assert.equal(first.elapsedMs, 421337);
  assert.equal(first.damageTaken, 143);
  assert.equal(first.bossResult, "DEFEATED");
  assert.equal(first.terminalPauseEvents, 1);
  assert.match(first.fingerprint, /^CR3D-[0-9a-f]{8}$/u);
});

test("CR-3D derives Core acquired/spent accounting from held Cores and one-Core Evolutions", () => {
  const result = buildCR3RunResult(base, "VICTORY");
  assert.equal(result.evolutionCoresCurrent, 1);
  assert.equal(result.evolutionCoresSpent, 2);
  assert.equal(result.evolutionCoresAcquired, 3);
  assert.deepEqual(result.weapons.filter(weapon => weapon.evolved).map(weapon => weapon.family), ["DELTA", "ECHO"]);
});

test("CR-3D preserves owned weapon/rank state without fabricating an unowned family", () => {
  const result = buildCR3RunResult(base, "VICTORY");
  assert.deepEqual(result.weapons.map(weapon => [weapon.family, weapon.owned, weapon.rank]), [
    ["DELTA", true, 5],
    ["VECTOR", true, 4],
    ["ORBIT", false, 1],
    ["ECHO", true, 5],
    ["SIGNAL", true, 3],
  ]);
});

test("CR-3D failure snapshot keeps the observed boss state and does not claim victory", () => {
  const result = buildCR3RunResult({
    ...base,
    cr3BossPhase: "ALIGNMENT",
    cr3BossDefeatEvents: "0",
    hp: "0",
    dead: "true",
  }, "DEFEAT");
  assert.equal(result.outcome, "DEFEAT");
  assert.equal(result.finalHp, 0);
  assert.equal(result.bossResult, "ALIGNMENT");
  assert.equal(result.bossDefeatEvents, 0);
});

test("CR-3D fingerprint changes when authoritative run evidence changes", () => {
  const first = buildCR3RunResult(base, "VICTORY");
  const changed = buildCR3RunResult({ ...base, seed: "305419897" }, "VICTORY");
  assert.notEqual(first.fingerprint, changed.fingerprint);
});
