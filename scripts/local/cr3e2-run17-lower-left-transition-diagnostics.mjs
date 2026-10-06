import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const sourcePath = resolve("scripts/local/cr3e2-run17-direct-control.mjs");
const generatedPath = resolve("scripts/local/.cr3e2-run17-lower-left-transition-diagnostics.runner.mjs");
const trials = Number(process.env.CR3E2_RUN17_TURN_DIAG_TRIALS ?? "10");

function replaceOnce(source, needle, replacement, label) {
  const first = source.indexOf(needle);
  assert.ok(first >= 0, `${label}: reviewed source fragment not found`);
  assert.equal(source.indexOf(needle, first + needle.length), -1, `${label}: reviewed source fragment not unique`);
  return source.slice(0, first) + replacement + source.slice(first + needle.length);
}

let source = readFileSync(sourcePath, "utf8").replace(/\r\n/g, "\n");

assert.ok(source.includes("&& state.hp <= 25\n    && state.cr2DraftActive"), "baseline critical REFRACT HP25 policy missing");
assert.ok(source.includes("const pressureShift = postStageOne && (state.activeEnemies >= 32 || state.hp <= 25);"), "baseline pressure SHIFT HP25 policy missing");
assert.ok(source.includes('else if (x >= 1500 && y < 950) key = "ArrowDown";'), "baseline right-edge y950 boundary missing");
assert.ok(source.includes('else if (y >= 950 && x > 300) key = "ArrowLeft";'), "baseline bottom-edge x300 boundary missing");
assert.ok(source.includes('else if (x <= 300 && y > 250) key = "ArrowUp";'), "baseline left-edge x300 boundary missing");
assert.ok(source.includes('await canvas.press(key, { delay: postStageOne ? 520 : 420, timeout: 2_500 });'), "baseline 520/420 hold duration missing");
assert.ok(!source.includes("state.hp <= 35"), "rejected HP35 policy leaked into baseline source");
assert.ok(!source.includes("CR3E2_RUN17_L6_DELTA_T"), "rejected L6 DELTA override leaked into baseline source");
assert.ok(!source.includes("horizontalStageTwo"), "rejected horizontal-260 movement leaked into baseline source");
assert.ok(!source.includes("bottomY = postStageOne ? 850 : 950"), "rejected bottom-850 geometry leaked into baseline source");
assert.ok(!source.includes("leftX = postStageOne ? 800 : 300"), "rejected left-800 geometry leaked into baseline source");

source = replaceOnce(
  source,
  'const TRIALS = Number(process.env.CR3E2_RUN17_CONTROL_TRIALS ?? "3");',
  `const TRIALS = ${trials};`,
  "trial count",
);

const movementOld = [
  'async function moveNaturalSurvivalLane(canvas, state, tick) {',
  '  const x = state.x;',
  '  const y = state.y;',
  '  let key;',
  '  if (y < 250 && x < 1500) key = "ArrowRight";',
  '  else if (x >= 1500 && y < 950) key = "ArrowDown";',
  '  else if (y >= 950 && x > 300) key = "ArrowLeft";',
  '  else if (x <= 300 && y > 250) key = "ArrowUp";',
  '  else key = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"][Math.floor(tick / 10) % 4];',
  '  const postStageOne = state.stage !== "STAGE_I";',
  '  await canvas.press(key, { delay: postStageOne ? 520 : 420, timeout: 2_500 });',
  '  const pressureShift = postStageOne && (state.activeEnemies >= 32 || state.hp <= 25);',
  '  return { settle: postStageOne ? 80 : 0, shiftModulo: pressureShift ? 5 : 7 };',
  '}',
].join("\n");

const movementNew = [
  'async function moveNaturalSurvivalLane(canvas, state, tick) {',
  '  const x = state.x;',
  '  const y = state.y;',
  '  let key;',
  '  let edge;',
  '  if (y < 250 && x < 1500) { key = "ArrowRight"; edge = "TOP"; }',
  '  else if (x >= 1500 && y < 950) { key = "ArrowDown"; edge = "RIGHT"; }',
  '  else if (y >= 950 && x > 300) { key = "ArrowLeft"; edge = "BOTTOM"; }',
  '  else if (x <= 300 && y > 250) { key = "ArrowUp"; edge = "LEFT"; }',
  '  else { key = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"][Math.floor(tick / 10) % 4]; edge = "FALLBACK"; }',
  '  const postStageOne = state.stage !== "STAGE_I";',
  '  await canvas.press(key, { delay: postStageOne ? 520 : 420, timeout: 2_500 });',
  '  const pressureShift = postStageOne && (state.activeEnemies >= 32 || state.hp <= 25);',
  '  return { settle: postStageOne ? 80 : 0, shiftModulo: pressureShift ? 5 : 7, key, edge };',
  '}',
].join("\n");

source = replaceOnce(source, movementOld, movementNew, "movement metadata instrumentation");

const varsAnchor = '      const wallDeadline = Date.now() + 220_000;\n\n';
const diagnostics = [
  '      let turnDiagEpisode = 0;',
  '      let turnDiagActive = false;',
  '      let turnDiagCurrent = null;',
  '      let turnDiagLastState = null;',
  '      const turnDiagEpisodes = [];',
  '',
  '      const turnDiagSnapshot = state => ({',
  '        elapsed: state?.elapsed, progress: state?.progress, stage: state?.stage, hp: state?.hp,',
  '        level: state?.level, kills: state?.kills, shifts: state?.shifts, phase: state?.phase,',
  '        x: Number.isFinite(state?.x) ? Math.round(state.x) : null,',
  '        y: Number.isFinite(state?.y) ? Math.round(state.y) : null,',
  '        activeEnemies: state?.activeEnemies, enemyKinds: state?.enemyKinds,',
  '        draftOpen: state?.draftOpen, draftIds: state?.draftIds, refracts: state?.refracts,',
  '        gatePhase: state?.gatePhase, gateActive: state?.gateActive, moveTick, checkpointTick,',
  '      });',
  '',
  '      const turnDiagEligible = state => Boolean(state',
  '        && state.stage === "STAGE_II"',
  '        && state.gatePhase === "RUNNING"',
  '        && Array.isArray(state.gateResolved)',
  '        && state.gateResolved.includes("ELITE_I")',
  '        && !state.draftOpen);',
  '',
  '      const maybeStartTurnDiag = (state, observation) => {',
  '        if (turnDiagActive || !turnDiagEligible(state)) return;',
  '        if (!(state.x <= 1000 && state.y >= 900)) return;',
  '        turnDiagEpisode += 1;',
  '        turnDiagActive = true;',
  '        turnDiagLastState = state;',
  '        turnDiagCurrent = {',
  '          episode: turnDiagEpisode, start: turnDiagSnapshot(state), holds: 0, movementDamageEvents: 0,',
  '          movementHpLost: 0, shiftEvents: 0, shiftHpLost: 0, boundaryCrossings: 0,',
  '          totalOvershootPx: 0, maxOvershootPx: 0,',
  '        };',
  '        console.log(`CR3E2_RUN17_TURN_START_T${trial}_E${turnDiagEpisode}=${JSON.stringify({ observation, ...turnDiagCurrent })}`);',
  '      };',
  '',
  '      const finishTurnDiag = (state, observation) => {',
  '        if (!turnDiagActive || !turnDiagCurrent) return;',
  '        const summary = { ...turnDiagCurrent, end: turnDiagSnapshot(state), observation };',
  '        turnDiagEpisodes.push(summary);',
  '        console.log(`CR3E2_RUN17_TURN_SUMMARY_T${trial}_E${turnDiagCurrent.episode}=${JSON.stringify(summary)}`);',
  '        turnDiagActive = false;',
  '        turnDiagCurrent = null;',
  '        turnDiagLastState = null;',
  '      };',
  '',
  '      const observeTurnDiagState = (state, observation) => {',
  '        if (!state) return;',
  '        maybeStartTurnDiag(state, observation);',
  '        if (turnDiagActive && state.y < 700) finishTurnDiag(state, observation);',
  '      };',
  '',
].join("\n");
source = replaceOnce(source, varsAnchor, varsAnchor + diagnostics, "turn diagnostic state insertion");

const shiftOld = [
  '      const shiftAndObserve = async () => {',
  '        await canvas.press("Space", { timeout: 2_500 });',
  '        await page.waitForTimeout(105);',
  '        return readState(canvas);',
  '      };',
].join("\n");

const shiftNew = [
  '      const shiftAndObserve = async () => {',
  '        const beforeShift = turnDiagActive ? turnDiagLastState : null;',
  '        await canvas.press("Space", { timeout: 2_500 });',
  '        await page.waitForTimeout(105);',
  '        const afterShift = await readState(canvas);',
  '        if (turnDiagActive && turnDiagCurrent && beforeShift && afterShift) {',
  '          const hpLost = Math.max(0, beforeShift.hp - afterShift.hp);',
  '          turnDiagCurrent.shiftEvents += 1;',
  '          turnDiagCurrent.shiftHpLost += hpLost;',
  '          console.log(`CR3E2_RUN17_TURN_SHIFT_T${trial}_E${turnDiagCurrent.episode}_${turnDiagCurrent.shiftEvents}=${JSON.stringify({',
  '            before: turnDiagSnapshot(beforeShift), after: turnDiagSnapshot(afterShift), hpLost,',
  '          })}`);',
  '          turnDiagLastState = afterShift;',
  '          if (afterShift.y < 700) finishTurnDiag(afterShift, "POST_SHIFT");',
  '        }',
  '        return afterShift;',
  '      };',
].join("\n");
source = replaceOnce(source, shiftOld, shiftNew, "turn diagnostic SHIFT observation");

source = replaceOnce(
  source,
  '        minHp = Math.min(minHp, state.hp);\n\n        if (state.dead || state.hp <= 0) {',
  '        minHp = Math.min(minHp, state.hp);\n        observeTurnDiagState(state, "LOOP_READ");\n\n        if (state.dead || state.hp <= 0) {',
  "loop transition observation",
);

const moveOld = [
  '        } else {',
  '          const movement = await moveNaturalSurvivalLane(canvas, state, moveTick);',
  '          moveTick += 1;',
  '          await page.waitForTimeout(movement.settle);',
  '          if (moveTick % movement.shiftModulo === 0) await shiftAndObserve();',
  '          await page.waitForTimeout(45);',
  '        }',
].join("\n");

const moveNew = [
  '        } else {',
  '          maybeStartTurnDiag(state, "PRE_MOVE");',
  '          const diagnosticThisHold = turnDiagActive && turnDiagCurrent && state.stage === "STAGE_II";',
  '          const diagnosticBefore = diagnosticThisHold ? state : null;',
  '          const movement = await moveNaturalSurvivalLane(canvas, state, moveTick);',
  '          const diagnosticTick = moveTick;',
  '          moveTick += 1;',
  '          await page.waitForTimeout(movement.settle);',
  '          if (diagnosticThisHold) {',
  '            const diagnosticAfter = await readState(canvas);',
  '            assert.ok(diagnosticAfter, `trial ${trial} lower-left transition diagnostic lost combat canvas after hold`);',
  '            const hpLost = Math.max(0, diagnosticBefore.hp - diagnosticAfter.hp);',
  '            const dx = diagnosticAfter.x - diagnosticBefore.x;',
  '            const dy = diagnosticAfter.y - diagnosticBefore.y;',
  '            const distanceMoved = Math.hypot(dx, dy);',
  '            const crossedLeftBoundary = movement.key === "ArrowLeft" && diagnosticBefore.x > 300 && diagnosticAfter.x <= 300;',
  '            const overshootPx = crossedLeftBoundary ? Math.max(0, 300 - diagnosticAfter.x) : 0;',
  '            turnDiagCurrent.holds += 1;',
  '            turnDiagCurrent.movementDamageEvents += hpLost > 0 ? 1 : 0;',
  '            turnDiagCurrent.movementHpLost += hpLost;',
  '            turnDiagCurrent.boundaryCrossings += crossedLeftBoundary ? 1 : 0;',
  '            turnDiagCurrent.totalOvershootPx += overshootPx;',
  '            turnDiagCurrent.maxOvershootPx = Math.max(turnDiagCurrent.maxOvershootPx, overshootPx);',
  '            console.log(`CR3E2_RUN17_TURN_HOLD_T${trial}_E${turnDiagCurrent.episode}_${turnDiagCurrent.holds}=${JSON.stringify({',
  '              edge: movement.edge, key: movement.key, tick: diagnosticTick,',
  '              before: turnDiagSnapshot(diagnosticBefore), after: turnDiagSnapshot(diagnosticAfter), hpLost,',
  '              dx: Math.round(dx), dy: Math.round(dy), distanceMoved: Math.round(distanceMoved),',
  '              crossedLeftBoundary, overshootPx: Math.round(overshootPx),',
  '            })}`);',
  '            turnDiagLastState = diagnosticAfter;',
  '            if (diagnosticAfter.y < 700) finishTurnDiag(diagnosticAfter, "POST_MOVE");',
  '          }',
  '          if (moveTick % movement.shiftModulo === 0) await shiftAndObserve();',
  '          await page.waitForTimeout(45);',
  '        }',
].join("\n");
source = replaceOnce(source, moveOld, moveNew, "normal Stage-II transition instrumentation");

const checkpointAnchor = '          const final = compact({ ...state, moveTick, checkpointTick });\n';
const checkpointReplacement = [
  '          if (turnDiagActive) finishTurnDiag(state, "CHECKPOINT_ELITE");',
  '          console.log(`CR3E2_RUN17_TURN_TRIAL_T${trial}=${JSON.stringify({ episodes: turnDiagEpisodes.length, summaries: turnDiagEpisodes })}`);',
  '          const final = compact({ ...state, moveTick, checkpointTick });',
  '',
].join("\n");
source = replaceOnce(source, checkpointAnchor, checkpointReplacement, "checkpoint transition diagnostic finalization");

writeFileSync(generatedPath, source, "utf8");

const syntax = spawnSync(process.execPath, ["--check", generatedPath], { encoding: "utf8" });
if (syntax.stdout) process.stdout.write(syntax.stdout);
if (syntax.stderr) process.stderr.write(syntax.stderr);
assert.equal(syntax.status, 0, "generated lower-left transition diagnostic runner syntax check failed");

console.log("CR3E2_RUN17_TURN_DIAG_WRAPPER=PASS");
console.log("CR3E2_RUN17_TURN_DIAG_GENERATED_SYNTAX=PASS");
console.log("CR3E2_RUN17_TURN_DIAG_SOURCE=UNCHANGED_DIRECT_RUN17_CONTROL");
console.log("CR3E2_RUN17_TURN_DIAG_WINDOW=X_LE_1000_Y_GE_900_THROUGH_UP_LEG_Y_LT_700");
console.log("CR3E2_RUN17_TURN_DIAG_ROUTE=BASELINE_X300_Y950_UNCHANGED");
console.log("CR3E2_RUN17_TURN_DIAG_HOLD_MS=BASELINE_520_UNCHANGED");
console.log("CR3E2_RUN17_TURN_DIAG_OVERSHOOT=MEASURE_X300_CROSSING_ONLY");
console.log("CR3E2_RUN17_TURN_DIAG_SHIFT=OBSERVE_WITHOUT_EXTRA_PRE_SHIFT_READ");
console.log("CR3E2_RUN17_TURN_DIAG_REFRACT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_TURN_DIAG_PRESSURE_SHIFT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_TURN_DIAG_DRAFT_PRIORITY=UNCHANGED");
console.log("CR3E2_RUN17_TURN_DIAG_OBSERVER_NOTE=POST_MOVE_STATE_READS_ONLY_WHILE_WINDOW_ACTIVE");
console.log("CR3E2_RUN17_TURN_DIAG_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(`${pathToFileURL(generatedPath).href}?v=${Date.now()}`);
} finally {
  rmSync(generatedPath, { force: true });
}
