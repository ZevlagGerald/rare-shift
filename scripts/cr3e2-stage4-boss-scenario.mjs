import assert from "node:assert/strict";
import { checkpointRewards } from "../games/rare-shift/src/cr1-director-core.ts";
import {
  CR3E_BOSS_HANDOFF_MS,
  advanceCR3ECheckpointGate,
  beginCR3ECheckpointRewards,
  canStartCR3EBoss,
  collectCR3ECheckpointReward,
  createCR3ECheckpointGateState,
  stageForCR3ECheckpointGate,
} from "../games/rare-shift/src/cr3e-checkpoint-gate-core.ts";
import {
  applyCR3BossDamage,
  applyCR3ShiftResponse,
  createCR3DesyncState,
} from "../games/rare-shift/src/cr3-desync-core.ts";
import {
  buildCR3RunResult,
  detectCR3TerminalOutcome,
} from "../games/rare-shift/src/cr3-results-core.ts";

function resolveCheckpoint(state, checkpointId, coresOwned) {
  const rewards = checkpointRewards(checkpointId, coresOwned);
  let next = beginCR3ECheckpointRewards(state, checkpointId, rewards);
  let cores = coresOwned;
  for (const reward of [...next.pendingRewards]) {
    const collected = collectCR3ECheckpointReward(next, checkpointId, reward);
    assert.equal(collected.accepted, true, `${checkpointId}:${reward} must be accepted`);
    next = collected.state;
    if (reward === "EVOLUTION_CORE") cores += 1;
  }
  assert.equal(next.phase, "RUNNING");
  assert.equal(next.activeCheckpoint, null);
  return { state: next, cores };
}

let gate = createCR3ECheckpointGateState();
let cores = 0;

let advanced = advanceCR3ECheckpointGate(gate, 80_000);
assert.equal(advanced.checkpointActivated, "ELITE_I");
({ state: gate, cores } = resolveCheckpoint(advanced.state, "ELITE_I", cores));

advanced = advanceCR3ECheckpointGate(gate, 100_000);
assert.equal(advanced.checkpointActivated, "CHECKPOINT_ELITE");
({ state: gate, cores } = resolveCheckpoint(advanced.state, "CHECKPOINT_ELITE", cores));

advanced = advanceCR3ECheckpointGate(gate, 105_000);
assert.equal(advanced.checkpointActivated, "ELITE_II");
({ state: gate, cores } = resolveCheckpoint(advanced.state, "ELITE_II", cores));

assert.deepEqual(gate.resolvedCheckpoints, ["ELITE_I", "CHECKPOINT_ELITE", "ELITE_II"]);
assert.ok(cores >= 1, "checkpoint route must naturally declare at least one Evolution Core reward");

advanced = advanceCR3ECheckpointGate(gate, 74_999);
gate = advanced.state;
assert.equal(gate.progressMs, 359_999);
assert.equal(stageForCR3ECheckpointGate(gate).id, "STAGE_IV");
assert.equal(canStartCR3EBoss(gate), false, "THE DESYNC must remain fail-closed before 360000ms");

advanced = advanceCR3ECheckpointGate(gate, 1);
gate = advanced.state;
assert.equal(gate.progressMs, CR3E_BOSS_HANDOFF_MS);
assert.equal(stageForCR3ECheckpointGate(gate).id, "BOSS_PENDING");
assert.equal(canStartCR3EBoss(gate), true);

const bossStart = CR3E_BOSS_HANDOFF_MS;
let boss = createCR3DesyncState(0x51f7a3, bossStart);
assert.equal(boss.phase, "ALIGNMENT");
assert.equal(boss.hp, 1000);

let damage = applyCR3BossDamage(boss, {
  source: "WEAPON",
  attackPhase: boss.vulnerability,
  amount: 300,
  atMs: bossStart + 100,
});
assert.equal(damage.accepted, true);
assert.equal(damage.state.hp, 700);
assert.equal(damage.state.phase, "CROSS_SPLIT");
boss = damage.state;

damage = applyCR3BossDamage(boss, {
  source: "WEAPON",
  attackPhase: boss.vulnerability,
  amount: 350,
  atMs: bossStart + 200,
});
assert.equal(damage.accepted, true);
assert.equal(damage.state.hp, 350);
assert.equal(damage.state.phase, "BREAK_WINDOW");
assert.ok(damage.state.expectedResponse === "A" || damage.state.expectedResponse === "B");
boss = damage.state;

const responsePhase = boss.expectedResponse;
assert.ok(responsePhase === "A" || responsePhase === "B");
const response = applyCR3ShiftResponse(boss, responsePhase, bossStart + 300);
assert.equal(response.accepted, true);
assert.equal(response.openedBreak, true);
assert.notEqual(response.state.breakOpenUntilMs, null);
boss = response.state;

damage = applyCR3BossDamage(boss, {
  source: "WEAPON",
  attackPhase: boss.vulnerability,
  amount: 350,
  atMs: bossStart + 400,
});
assert.equal(damage.accepted, true);
assert.equal(damage.defeatedNow, true);
assert.equal(damage.state.phase, "DEFEATED");
assert.equal(damage.state.hp, 0);
boss = damage.state;

const duplicate = applyCR3BossDamage(boss, {
  source: "WEAPON",
  attackPhase: "A",
  amount: 1,
  atMs: bossStart + 500,
});
assert.equal(duplicate.accepted, false);
assert.equal(duplicate.defeatedNow, false);
assert.equal(duplicate.rejection, "BOSS_DEFEATED");

const source = {
  cr3dResultsRuntime: "ACTIVE",
  cr3BossPhase: "DEFEATED",
  cr3BossDefeatEvents: "1",
  friend: "CR3E2_SCENARIO_FRIEND",
  family: "scenario",
  frameA: "11",
  frameB: "29",
  seed: String(0x51f7a3),
  directorElapsedMs: String(bossStart + 400),
  kills: "227",
  level: "10",
  hp: "5",
  phase: responsePhase,
  shifts: "101",
  cr3dDamageTaken: "95",
  deltaRank: "2",
  orbitOwned: "true",
  orbitRank: "2",
  echoOwned: "true",
  echoRank: "1",
  signalOwned: "true",
  signalRank: "1",
  vectorOwned: "false",
  vectorRank: "1",
  protocols: "PROTOCOL_COMMON_CORE,PROTOCOL_ORBIT_STABILIZER",
  evolutionCores: String(cores),
  elitesDefeated: "3",
  cr3dTerminalPauseEvents: "1",
  cr3dEvolvedWeapons: "",
};

const outcome = detectCR3TerminalOutcome(source);
assert.equal(outcome, "VICTORY");
const result = buildCR3RunResult(source, outcome);
assert.equal(result.outcome, "VICTORY");
assert.equal(result.bossResult, "DEFEATED");
assert.equal(result.bossDefeatEvents, 1);
assert.equal(result.terminalPauseEvents, 1);
assert.equal(result.elitesDefeated, 3);
assert.ok(result.finalHp > 0);
assert.match(result.fingerprint, /^CR3D-[0-9a-f]{8}$/u);

console.log(`RARE_SHIFT_CR3E2_STAGE4_HANDOFF=${gate.progressMs}`);
console.log(`RARE_SHIFT_CR3E2_STAGE4_RESOLVED=${gate.resolvedCheckpoints.join(",")}`);
console.log("RARE_SHIFT_CR3E2_STAGE4_BOSS_PHASES=ALIGNMENT,CROSS_SPLIT,BREAK_WINDOW,DEFEATED");
console.log(`RARE_SHIFT_CR3E2_STAGE4_RESULT_FINGERPRINT=${result.fingerprint}`);
console.log("RARE_SHIFT_CR3E2_STAGE4_BOSS_SCENARIO=PASS");
