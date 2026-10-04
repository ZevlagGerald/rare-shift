import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const sourcePath = resolve("scripts/local/cr3e2-run17-direct-control.mjs");
const generatedPath = resolve("scripts/local/.cr3e2-run17-stage2-damage-events.runner.mjs");
const trials = Number(process.env.CR3E2_RUN17_DAMAGE_DIAG_TRIALS ?? "10");

function replaceOnce(source, needle, replacement, label) {
  const first = source.indexOf(needle);
  assert.ok(first >= 0, `${label}: reviewed source fragment not found`);
  assert.equal(source.indexOf(needle, first + needle.length), -1, `${label}: reviewed source fragment not unique`);
  return source.slice(0, first) + replacement + source.slice(first + needle.length);
}

let source = readFileSync(sourcePath, "utf8").replace(/\r\n/g, "\n");

assert.ok(source.includes("&& state.hp <= 25\n    && state.cr2DraftActive"), "baseline critical REFRACT HP25 policy missing");
assert.ok(source.includes("const pressureShift = postStageOne && (state.activeEnemies >= 32 || state.hp <= 25);"), "baseline pressure SHIFT HP25 policy missing");
assert.ok(!source.includes("state.hp <= 35"), "rejected HP35 policy leaked into baseline source");
assert.ok(!source.includes("CR3E2_RUN17_L6_DELTA_T"), "rejected L6 DELTA override leaked into baseline source");

source = replaceOnce(
  source,
  'const TRIALS = Number(process.env.CR3E2_RUN17_CONTROL_TRIALS ?? "3");',
  `const TRIALS = ${trials};`,
  "trial count",
);

source = replaceOnce(
  source,
  'const HISTORICAL_HEAD = "051c95e86c56e12852fd21debf31d1f2be7288de";\n',
  'const HISTORICAL_HEAD = "051c95e86c56e12852fd21debf31d1f2be7288de";\nlet damageDiagMovementObserver = null;\n',
  "diagnostic movement observer declaration",
);

source = replaceOnce(
  source,
  '  await canvas.press(key, { delay: postStageOne ? 520 : 420, timeout: 2_500 });\n  const pressureShift = postStageOne && (state.activeEnemies >= 32 || state.hp <= 25);',
  '  await canvas.press(key, { delay: postStageOne ? 520 : 420, timeout: 2_500 });\n  damageDiagMovementObserver?.({ key, state, tick, postStageOne });\n  const pressureShift = postStageOne && (state.activeEnemies >= 32 || state.hp <= 25);',
  "movement action observation",
);

const runVarsAnchor = '      const wallDeadline = Date.now() + 220_000;\n\n';
const diagnostics = [
  '      let damageDiagActive = false;',
  '      let damageDiagFinished = false;',
  '      let damageDiagPreviousHp = null;',
  '      let damageDiagEvents = 0;',
  '      let damageDiagLastAction = { type: "NONE" };',
  '',
  '      const damageDiagSnapshot = (state, observation) => ({',
  '        observation,',
  '        elapsed: state.elapsed,',
  '        progress: state.progress,',
  '        hp: state.hp,',
  '        level: state.level,',
  '        kills: state.kills,',
  '        shifts: state.shifts,',
  '        phase: state.phase,',
  '        x: Math.round(state.x),',
  '        y: Math.round(state.y),',
  '        activeEnemies: state.activeEnemies,',
  '        enemyKinds: state.enemyKinds,',
  '        draftOpen: state.draftOpen,',
  '        draftIds: state.draftIds,',
  '        refracts: state.refracts,',
  '        rerollNonce: state.rerollNonce,',
  '        moveTick,',
  '        checkpointTick,',
  '      });',
  '',
  '      const observeDamageDiag = (state, observation) => {',
  '        if (!state || damageDiagFinished) return;',
  '        const stage2Running = state.stage === "STAGE_II"',
  '          && state.gatePhase === "RUNNING"',
  '          && state.gateResolved.includes("ELITE_I");',
  '        if (!damageDiagActive && stage2Running && state.level < 6) {',
  '          damageDiagActive = true;',
  '          damageDiagPreviousHp = state.hp;',
  '          console.log(`CR3E2_RUN17_DAMAGE_DIAG_RESUME_T${trial}=${JSON.stringify({',
  '            ...damageDiagSnapshot(state, observation),',
  '            precedingAction: damageDiagLastAction,',
  '          })}`);',
  '        }',
  '        if (!damageDiagActive) return;',
  '        if (damageDiagPreviousHp !== null && state.hp < damageDiagPreviousHp) {',
  '          damageDiagEvents += 1;',
  '          console.log(`CR3E2_RUN17_DAMAGE_EVENT_T${trial}_${damageDiagEvents}=${JSON.stringify({',
  '            fromHp: damageDiagPreviousHp,',
  '            toHp: state.hp,',
  '            delta: state.hp - damageDiagPreviousHp,',
  '            ...damageDiagSnapshot(state, observation),',
  '            precedingAction: damageDiagLastAction,',
  '          })}`);',
  '        }',
  '        damageDiagPreviousHp = state.hp;',
  '        if (state.draftOpen && state.level === 6) {',
  '          console.log(`CR3E2_RUN17_DAMAGE_DIAG_L6_T${trial}=${JSON.stringify({',
  '            ...damageDiagSnapshot(state, observation),',
  '            damageEvents: damageDiagEvents,',
  '            precedingAction: damageDiagLastAction,',
  '          })}`);',
  '          damageDiagFinished = true;',
  '        }',
  '      };',
  '',
  '      damageDiagMovementObserver = ({ key, state: actionState, tick, postStageOne }) => {',
  '        if (!damageDiagActive || damageDiagFinished || !postStageOne) return;',
  '        damageDiagLastAction = {',
  '          type: "MOVE",',
  '          key,',
  '          tick,',
  '          startProgress: actionState.progress,',
  '          startHp: actionState.hp,',
  '          startX: Math.round(actionState.x),',
  '          startY: Math.round(actionState.y),',
  '          startPhase: actionState.phase,',
  '          startActiveEnemies: actionState.activeEnemies,',
  '        };',
  '      };',
  '',
].join("\n");
source = replaceOnce(source, runVarsAnchor, runVarsAnchor + diagnostics, "damage diagnostic state insertion");

const shiftAnchor = [
  '      const shiftAndObserve = async () => {',
  '        await canvas.press("Space", { timeout: 2_500 });',
  '        await page.waitForTimeout(105);',
  '        return readState(canvas);',
  '      };',
].join("\n");
const shiftReplacement = [
  '      const shiftAndObserve = async () => {',
  '        const beforeShift = await readState(canvas);',
  '        observeDamageDiag(beforeShift, "PRE_SHIFT");',
  '        await canvas.press("Space", { timeout: 2_500 });',
  '        await page.waitForTimeout(105);',
  '        const afterShift = await readState(canvas);',
  '        if (damageDiagActive && !damageDiagFinished && beforeShift && afterShift) {',
  '          console.log(`CR3E2_RUN17_DAMAGE_SHIFT_T${trial}=${JSON.stringify({',
  '            before: damageDiagSnapshot(beforeShift, "PRE_SHIFT"),',
  '            after: damageDiagSnapshot(afterShift, "POST_SHIFT"),',
  '          })}`);',
  '          damageDiagLastAction = {',
  '            type: "SHIFT",',
  '            beforeProgress: beforeShift.progress,',
  '            beforeHp: beforeShift.hp,',
  '            beforePhase: beforeShift.phase,',
  '            beforeShifts: beforeShift.shifts,',
  '            afterProgress: afterShift.progress,',
  '            afterHp: afterShift.hp,',
  '            afterPhase: afterShift.phase,',
  '            afterShifts: afterShift.shifts,',
  '          };',
  '        }',
  '        observeDamageDiag(afterShift, "POST_SHIFT");',
  '        return afterShift;',
  '      };',
].join("\n");
source = replaceOnce(source, shiftAnchor, shiftReplacement, "SHIFT damage diagnostics");

source = replaceOnce(
  source,
  '        minHp = Math.min(minHp, state.hp);\n\n        if (state.dead || state.hp <= 0) {',
  '        minHp = Math.min(minHp, state.hp);\n        observeDamageDiag(state, "LOOP_READ");\n\n        if (state.dead || state.hp <= 0) {',
  "loop HP observation",
);

writeFileSync(generatedPath, source, "utf8");

const syntax = spawnSync(process.execPath, ["--check", generatedPath], { encoding: "utf8" });
if (syntax.stdout) process.stdout.write(syntax.stdout);
if (syntax.stderr) process.stderr.write(syntax.stderr);
assert.equal(syntax.status, 0, "generated Stage-II damage diagnostic runner syntax check failed");

console.log("CR3E2_RUN17_DAMAGE_DIAG_WRAPPER=PASS");
console.log("CR3E2_RUN17_DAMAGE_DIAG_GENERATED_SYNTAX=PASS");
console.log("CR3E2_RUN17_DAMAGE_DIAG_SOURCE=UNCHANGED_DIRECT_RUN17_CONTROL");
console.log("CR3E2_RUN17_DAMAGE_DIAG_ONLY_CHANGE=TELEMETRY_STAGE2_RESUME_TO_L6");
console.log("CR3E2_RUN17_DAMAGE_DIAG_HP_EVENTS=EVERY_OBSERVED_DECREASE");
console.log("CR3E2_RUN17_DAMAGE_DIAG_SHIFT=PRE_AND_POST_STATE");
console.log("CR3E2_RUN17_DAMAGE_DIAG_REFRACT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_DAMAGE_DIAG_PRESSURE_SHIFT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_DAMAGE_DIAG_DRAFT_PRIORITY=UNCHANGED");
console.log("CR3E2_RUN17_DAMAGE_DIAG_MOVEMENT=UNCHANGED");
console.log("CR3E2_RUN17_DAMAGE_DIAG_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(`${pathToFileURL(generatedPath).href}?v=${Date.now()}`);
} finally {
  rmSync(generatedPath, { force: true });
}
