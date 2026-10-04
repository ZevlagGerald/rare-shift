import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const sourcePath = resolve("scripts/local/cr3e2-run17-direct-control.mjs");
const generatedPath = resolve("scripts/local/.cr3e2-run17-movement-denominator.runner.mjs");
const trials = Number(process.env.CR3E2_RUN17_MOVE_DENOM_TRIALS ?? "10");

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

const movementFunction = [
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

const movementFunctionDiagnostic = [
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

source = replaceOnce(source, movementFunction, movementFunctionDiagnostic, "movement metadata instrumentation");

const runVarsAnchor = '      const wallDeadline = Date.now() + 220_000;\n\n';
const diagnosticState = [
  '      let moveDenomStarted = false;',
  '      let moveDenomFinished = false;',
  '      let moveDenomHold = 0;',
  '      const moveDenomEdges = ["TOP", "RIGHT", "BOTTOM", "LEFT", "FALLBACK"];',
  '      const moveDenomStats = Object.fromEntries(moveDenomEdges.map(edge => [edge, {',
  '        A: { holds: 0, damageEvents: 0, hpLost: 0 },',
  '        B: { holds: 0, damageEvents: 0, hpLost: 0 },',
  '      }]));',
  '',
  '      const moveDenomSnapshot = state => ({',
  '        elapsed: state?.elapsed,',
  '        progress: state?.progress,',
  '        hp: state?.hp,',
  '        level: state?.level,',
  '        kills: state?.kills,',
  '        shifts: state?.shifts,',
  '        phase: state?.phase,',
  '        x: Number.isFinite(state?.x) ? Math.round(state.x) : null,',
  '        y: Number.isFinite(state?.y) ? Math.round(state.y) : null,',
  '        activeEnemies: state?.activeEnemies,',
  '        enemyKinds: state?.enemyKinds,',
  '        draftOpen: state?.draftOpen,',
  '        draftIds: state?.draftIds,',
  '        moveTick,',
  '        checkpointTick,',
  '      });',
  '',
  '      const moveDenomEligible = state => Boolean(state',
  '        && state.stage === "STAGE_II"',
  '        && state.gatePhase === "RUNNING"',
  '        && Array.isArray(state.gateResolved)',
  '        && state.gateResolved.includes("ELITE_I")',
  '        && state.level < 6',
  '        && !state.draftOpen);',
  '',
  '      const maybeStartMoveDenom = state => {',
  '        if (!moveDenomStarted && !moveDenomFinished && moveDenomEligible(state)) {',
  '          moveDenomStarted = true;',
  '          console.log(`CR3E2_RUN17_MOVE_DENOM_RESUME_T${trial}=${JSON.stringify(moveDenomSnapshot(state))}`);',
  '        }',
  '      };',
  '',
  '      const finalizeMoveDenom = (state, observation) => {',
  '        if (!moveDenomStarted || moveDenomFinished || !state || !(state.draftOpen && state.level === 6)) return;',
  '        moveDenomFinished = true;',
  '        console.log(`CR3E2_RUN17_MOVE_DENOM_L6_T${trial}=${JSON.stringify({',
  '          observation,',
  '          l6: moveDenomSnapshot(state),',
  '          holds: moveDenomHold,',
  '          stats: moveDenomStats,',
  '        })}`);',
  '      };',
  '',
].join("\n");
source = replaceOnce(source, runVarsAnchor, runVarsAnchor + diagnosticState, "movement denominator state insertion");

source = replaceOnce(
  source,
  '        minHp = Math.min(minHp, state.hp);\n\n        if (state.dead || state.hp <= 0) {',
  '        minHp = Math.min(minHp, state.hp);\n        maybeStartMoveDenom(state);\n        finalizeMoveDenom(state, "LOOP_READ");\n\n        if (state.dead || state.hp <= 0) {',
  "loop movement denominator observation",
);

const normalMovementBlock = [
  '        } else {',
  '          const movement = await moveNaturalSurvivalLane(canvas, state, moveTick);',
  '          moveTick += 1;',
  '          await page.waitForTimeout(movement.settle);',
  '          if (moveTick % movement.shiftModulo === 0) await shiftAndObserve();',
  '          await page.waitForTimeout(45);',
  '        }',
].join("\n");

const diagnosticMovementBlock = [
  '        } else {',
  '          const diagnosticThisHold = moveDenomStarted && !moveDenomFinished && moveDenomEligible(state);',
  '          const diagnosticBefore = diagnosticThisHold ? state : null;',
  '          const movement = await moveNaturalSurvivalLane(canvas, state, moveTick);',
  '          const diagnosticTick = moveTick;',
  '          moveTick += 1;',
  '          await page.waitForTimeout(movement.settle);',
  '          if (diagnosticThisHold) {',
  '            const diagnosticAfter = await readState(canvas);',
  '            assert.ok(diagnosticAfter, `trial ${trial} movement denominator lost combat canvas after hold`);',
  '            moveDenomHold += 1;',
  '            const phase = diagnosticBefore.phase === "B" ? "B" : "A";',
  '            const bucket = moveDenomStats[movement.edge][phase];',
  '            const hpLost = Math.max(0, diagnosticBefore.hp - diagnosticAfter.hp);',
  '            bucket.holds += 1;',
  '            bucket.damageEvents += hpLost > 0 ? 1 : 0;',
  '            bucket.hpLost += hpLost;',
  '            console.log(`CR3E2_RUN17_MOVE_HOLD_T${trial}_${moveDenomHold}=${JSON.stringify({',
  '              edge: movement.edge,',
  '              key: movement.key,',
  '              tick: diagnosticTick,',
  '              phase,',
  '              hpBefore: diagnosticBefore.hp,',
  '              hpAfter: diagnosticAfter.hp,',
  '              hpLost,',
  '              progressBefore: diagnosticBefore.progress,',
  '              progressAfter: diagnosticAfter.progress,',
  '              xBefore: Math.round(diagnosticBefore.x),',
  '              yBefore: Math.round(diagnosticBefore.y),',
  '              xAfter: Math.round(diagnosticAfter.x),',
  '              yAfter: Math.round(diagnosticAfter.y),',
  '              activeEnemiesBefore: diagnosticBefore.activeEnemies,',
  '              activeEnemiesAfter: diagnosticAfter.activeEnemies,',
  '              enemyKindsBefore: diagnosticBefore.enemyKinds,',
  '              enemyKindsAfter: diagnosticAfter.enemyKinds,',
  '              shiftsBefore: diagnosticBefore.shifts,',
  '              shiftsAfter: diagnosticAfter.shifts,',
  '              draftOpenAfter: diagnosticAfter.draftOpen,',
  '              levelAfter: diagnosticAfter.level,',
  '            })}`);',
  '            finalizeMoveDenom(diagnosticAfter, "POST_MOVE");',
  '          }',
  '          if (moveTick % movement.shiftModulo === 0) await shiftAndObserve();',
  '          await page.waitForTimeout(45);',
  '        }',
].join("\n");

source = replaceOnce(source, normalMovementBlock, diagnosticMovementBlock, "normal Stage-II movement denominator instrumentation");

writeFileSync(generatedPath, source, "utf8");

const syntax = spawnSync(process.execPath, ["--check", generatedPath], { encoding: "utf8" });
if (syntax.stdout) process.stdout.write(syntax.stdout);
if (syntax.stderr) process.stderr.write(syntax.stderr);
assert.equal(syntax.status, 0, "generated movement denominator runner syntax check failed");

console.log("CR3E2_RUN17_MOVE_DENOM_WRAPPER=PASS");
console.log("CR3E2_RUN17_MOVE_DENOM_GENERATED_SYNTAX=PASS");
console.log("CR3E2_RUN17_MOVE_DENOM_SOURCE=UNCHANGED_DIRECT_RUN17_CONTROL");
console.log("CR3E2_RUN17_MOVE_DENOM_ONLY_CHANGE=TELEMETRY_EVERY_STAGE2_MOVE_RESUME_TO_L6");
console.log("CR3E2_RUN17_MOVE_DENOM_EDGES=TOP_RIGHT_BOTTOM_LEFT_FALLBACK");
console.log("CR3E2_RUN17_MOVE_DENOM_PHASE_SPLIT=A_B");
console.log("CR3E2_RUN17_MOVE_DENOM_REFRACT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_MOVE_DENOM_PRESSURE_SHIFT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_MOVE_DENOM_DRAFT_PRIORITY=UNCHANGED");
console.log("CR3E2_RUN17_MOVE_DENOM_MOVEMENT_ACTIONS=UNCHANGED");
console.log("CR3E2_RUN17_MOVE_DENOM_OBSERVER_NOTE=POST_MOVE_STATE_READ_ADDS_DIAGNOSTIC_OVERHEAD");
console.log("CR3E2_RUN17_MOVE_DENOM_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(`${pathToFileURL(generatedPath).href}?v=${Date.now()}`);
} finally {
  rmSync(generatedPath, { force: true });
}
