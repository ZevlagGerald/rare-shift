import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const sourcePath = resolve("scripts/local/cr3e2-run17-direct-control.mjs");
const generatedPath = resolve("scripts/local/.cr3e2-run17-elite1-spacing.runner.mjs");
const trials = Number(process.env.CR3E2_RUN17_ELITE1_SPACING_TRIALS ?? "10");

function replaceOnce(source, needle, replacement, label) {
  const first = source.indexOf(needle);
  assert.ok(first >= 0, label + ": reviewed source fragment not found");
  assert.equal(source.indexOf(needle, first + needle.length), -1, label + ": reviewed source fragment not unique");
  return source.slice(0, first) + replacement + source.slice(first + needle.length);
}

let source = readFileSync(sourcePath, "utf8").replace(/\r\n/g, "\n");

assert.ok(source.includes("&& state.hp <= 25\n    && state.cr2DraftActive"), "baseline critical REFRACT HP25 policy missing");
assert.ok(source.includes("const pressureShift = postStageOne && (state.activeEnemies >= 32 || state.hp <= 25);"), "baseline pressure SHIFT HP25 policy missing");
assert.ok(source.includes('const minDistance = criticalLaterGate ? 220 : 140;'), "baseline elite min-distance policy missing");
assert.ok(source.includes('const maxDistance = criticalLaterGate ? 330 : 210;'), "baseline elite max-distance policy missing");
assert.ok(source.includes('await canvas.press(key, { delay: 180 });'), "baseline elite 180ms hold missing");
assert.ok(source.includes('else if (y >= 950 && x > 300) key = "ArrowLeft";'), "baseline Stage-II rectangle missing");
assert.ok(!source.includes("state.hp <= 35"), "rejected HP35 policy leaked into baseline source");
assert.ok(!source.includes("CR3E2_RUN17_L6_DELTA_T"), "rejected L6 DELTA override leaked into baseline source");
assert.ok(!source.includes("horizontalStageTwo"), "rejected horizontal-260 movement leaked into baseline source");
assert.ok(!source.includes("bottomY = postStageOne ? 850 : 950"), "rejected bottom-850 geometry leaked into baseline source");
assert.ok(!source.includes("leftX = postStageOne ? 800 : 300"), "rejected left-800 geometry leaked into baseline source");
assert.ok(!source.includes("stageTwoEntryAligned"), "rejected entry-up experiment leaked into baseline source");

source = replaceOnce(
  source,
  'const TRIALS = Number(process.env.CR3E2_RUN17_CONTROL_TRIALS ?? "3");',
  "const TRIALS = " + trials + ";",
  "trial count",
);

const eliteOld = [
  'async function moveEliteCombatLane(canvas, state, tick) {',
  '  assert.ok(Number.isFinite(state.eliteX) && Number.isFinite(state.eliteY), "active checkpoint elite must expose diagnostics");',
  '  const dx = state.eliteX - state.x;',
  '  const dy = state.eliteY - state.y;',
  '  const distance = Math.hypot(dx, dy);',
  '  const horizontalDominant = Math.abs(dx) >= Math.abs(dy);',
  '  const criticalLaterGate = state.gateActive !== "ELITE_I" && state.hp <= 25;',
  '  const minDistance = criticalLaterGate ? 220 : 140;',
  '  const maxDistance = criticalLaterGate ? 330 : 210;',
  '  let key;',
  '  if (distance > maxDistance) {',
  '    key = horizontalDominant',
  '      ? dx >= 0 ? "ArrowRight" : "ArrowLeft"',
  '      : dy >= 0 ? "ArrowDown" : "ArrowUp";',
  '  } else if (distance < minDistance) {',
  '    key = horizontalDominant',
  '      ? dx >= 0 ? "ArrowLeft" : "ArrowRight"',
  '      : dy >= 0 ? "ArrowUp" : "ArrowDown";',
  '  } else if (horizontalDominant) {',
  '    key = tick % 2 === 0 ? "ArrowUp" : "ArrowDown";',
  '  } else {',
  '    key = tick % 2 === 0 ? "ArrowLeft" : "ArrowRight";',
  '  }',
  '  await canvas.press(key, { delay: 180 });',
  '}',
].join("\n");

const eliteNew = [
  'async function moveEliteCombatLane(canvas, state, tick) {',
  '  assert.ok(Number.isFinite(state.eliteX) && Number.isFinite(state.eliteY), "active checkpoint elite must expose diagnostics");',
  '  const dx = state.eliteX - state.x;',
  '  const dy = state.eliteY - state.y;',
  '  const distance = Math.hypot(dx, dy);',
  '  const horizontalDominant = Math.abs(dx) >= Math.abs(dy);',
  '  const criticalLaterGate = state.gateActive !== "ELITE_I" && state.hp <= 25;',
  '  const minDistance = criticalLaterGate ? 220 : 140;',
  '  const maxDistance = criticalLaterGate ? 330 : 210;',
  '  let key;',
  '  let actionClass;',
  '  if (distance > maxDistance) {',
  '    actionClass = "APPROACH";',
  '    key = horizontalDominant',
  '      ? dx >= 0 ? "ArrowRight" : "ArrowLeft"',
  '      : dy >= 0 ? "ArrowDown" : "ArrowUp";',
  '  } else if (distance < minDistance) {',
  '    actionClass = "RETREAT";',
  '    key = horizontalDominant',
  '      ? dx >= 0 ? "ArrowLeft" : "ArrowRight"',
  '      : dy >= 0 ? "ArrowUp" : "ArrowDown";',
  '  } else if (horizontalDominant) {',
  '    actionClass = "ORBIT";',
  '    key = tick % 2 === 0 ? "ArrowUp" : "ArrowDown";',
  '  } else {',
  '    actionClass = "ORBIT";',
  '    key = tick % 2 === 0 ? "ArrowLeft" : "ArrowRight";',
  '  }',
  '  const distanceBand = distance < 140 ? "LT_140" : distance <= 210 ? "BAND_140_210" : "GT_210";',
  '  await canvas.press(key, { delay: 180 });',
  '  return { key, actionClass, distanceBand, distance, dx, dy, horizontalDominant, minDistance, maxDistance };',
  '}',
].join("\n");

source = replaceOnce(source, eliteOld, eliteNew, "elite movement metadata");

const varsAnchor = '      const wallDeadline = Date.now() + 220_000;\n\n';
const diagState = [
  '      let eliteSpacingStarted = false;',
  '      let eliteSpacingFinished = false;',
  '      let eliteSpacingEntry = null;',
  '      let eliteSpacingExit = null;',
  '      let eliteSpacingPreviousState = null;',
  '      let eliteSpacingPending = null;',
  '      let eliteSpacingLossEvents = 0;',
  '      let eliteSpacingUnattributedEvents = 0;',
  '      let eliteSpacingUnattributedHpLost = 0;',
  '      const eliteSpacingModes = ["APPROACH", "RETREAT", "ORBIT"];',
  '      const eliteSpacingBands = ["LT_140", "BAND_140_210", "GT_210"];',
  '      const eliteSpacingModeStats = Object.fromEntries(eliteSpacingModes.map(key => [key, { intervals: 0, damageEvents: 0, hpLost: 0, shiftIntervals: 0 }]));',
  '      const eliteSpacingBandStats = Object.fromEntries(eliteSpacingBands.map(key => [key, { intervals: 0, damageEvents: 0, hpLost: 0, shiftIntervals: 0 }]));',
  '      const eliteSpacingCrossStats = Object.fromEntries(eliteSpacingModes.flatMap(mode => eliteSpacingBands.map(band => [mode + "|" + band, { intervals: 0, damageEvents: 0, hpLost: 0, shiftIntervals: 0 }])));',
  '',
  '      const eliteSpacingSnapshot = state => ({',
  '        elapsed: state?.elapsed, progress: state?.progress, stage: state?.stage, hp: state?.hp,',
  '        level: state?.level, shifts: state?.shifts, phase: state?.phase,',
  '        x: Number.isFinite(state?.x) ? Math.round(state.x) : null,',
  '        y: Number.isFinite(state?.y) ? Math.round(state.y) : null,',
  '        eliteX: Number.isFinite(state?.eliteX) ? Math.round(state.eliteX) : null,',
  '        eliteY: Number.isFinite(state?.eliteY) ? Math.round(state.eliteY) : null,',
  '        eliteHp: Number.isFinite(state?.eliteHp) ? state.eliteHp : null,',
  '        activeEnemies: state?.activeEnemies, gatePhase: state?.gatePhase, gateActive: state?.gateActive,',
  '        elitesDefeated: state?.elitesDefeated, cores: state?.cores, moveTick, checkpointTick,',
  '      });',
  '',
  '      const eliteSpacingIsActive = state => state?.gateActive === "ELITE_I" && state?.gatePhase === "ELITE_ACTIVE";',
  '',
  '      const eliteSpacingObserve = (state, observation) => {',
  '        if (!state || eliteSpacingFinished) return;',
  '        if (!eliteSpacingStarted && eliteSpacingIsActive(state)) {',
  '          eliteSpacingStarted = true;',
  '          eliteSpacingEntry = { observation, state: eliteSpacingSnapshot(state) };',
  '          eliteSpacingPreviousState = state;',
  '          console.log(`CR3E2_RUN17_ELITE1_SPACING_ENTRY_T${trial}=${JSON.stringify(eliteSpacingEntry)}`);',
  '        }',
  '        if (!eliteSpacingStarted) return;',
  '        const hpLost = eliteSpacingPreviousState ? Math.max(0, eliteSpacingPreviousState.hp - state.hp) : 0;',
  '        if (eliteSpacingPending && eliteSpacingPreviousState) {',
  '          const action = eliteSpacingPending;',
  '          const modeBucket = eliteSpacingModeStats[action.actionClass];',
  '          const bandBucket = eliteSpacingBandStats[action.distanceBand];',
  '          const crossBucket = eliteSpacingCrossStats[action.actionClass + "|" + action.distanceBand];',
  '          for (const bucket of [modeBucket, bandBucket, crossBucket]) {',
  '            bucket.intervals += 1;',
  '            bucket.damageEvents += hpLost > 0 ? 1 : 0;',
  '            bucket.hpLost += hpLost;',
  '            bucket.shiftIntervals += action.shiftIncluded ? 1 : 0;',
  '          }',
  '          if (hpLost > 0) {',
  '            eliteSpacingLossEvents += 1;',
  '            console.log(`CR3E2_RUN17_ELITE1_SPACING_LOSS_T${trial}_${eliteSpacingLossEvents}=${JSON.stringify({',
  '              observation, hpLost, action,',
  '              before: eliteSpacingSnapshot(eliteSpacingPreviousState), after: eliteSpacingSnapshot(state),',
  '            })}`);',
  '          }',
  '          eliteSpacingPending = null;',
  '        } else if (hpLost > 0 && eliteSpacingIsActive(eliteSpacingPreviousState)) {',
  '          eliteSpacingUnattributedEvents += 1;',
  '          eliteSpacingUnattributedHpLost += hpLost;',
  '          console.log(`CR3E2_RUN17_ELITE1_SPACING_UNATTRIBUTED_T${trial}_${eliteSpacingUnattributedEvents}=${JSON.stringify({',
  '            observation, hpLost, before: eliteSpacingSnapshot(eliteSpacingPreviousState), after: eliteSpacingSnapshot(state),',
  '          })}`);',
  '        }',
  '        eliteSpacingPreviousState = state;',
  '        if (!eliteSpacingIsActive(state)) {',
  '          eliteSpacingExit = { observation, state: eliteSpacingSnapshot(state) };',
  '          console.log(`CR3E2_RUN17_ELITE1_SPACING_SUMMARY_T${trial}=${JSON.stringify({',
  '            entry: eliteSpacingEntry, exit: eliteSpacingExit, lossEvents: eliteSpacingLossEvents,',
  '            unattributedEvents: eliteSpacingUnattributedEvents, unattributedHpLost: eliteSpacingUnattributedHpLost,',
  '            modeStats: eliteSpacingModeStats, bandStats: eliteSpacingBandStats, crossStats: eliteSpacingCrossStats,',
  '          })}`);',
  '          eliteSpacingFinished = true;',
  '        }',
  '      };',
  '',
  '      const eliteSpacingSetAction = (state, action, tick) => {',
  '        if (!eliteSpacingStarted || eliteSpacingFinished || !eliteSpacingIsActive(state)) return;',
  '        eliteSpacingPending = {',
  '          tick, key: action.key, actionClass: action.actionClass, distanceBand: action.distanceBand,',
  '          distance: Math.round(action.distance), dx: Math.round(action.dx), dy: Math.round(action.dy),',
  '          horizontalDominant: action.horizontalDominant, shiftIncluded: false,',
  '          startHp: state.hp, startX: Math.round(state.x), startY: Math.round(state.y),',
  '          eliteX: Math.round(state.eliteX), eliteY: Math.round(state.eliteY), eliteHp: state.eliteHp,',
  '          phase: state.phase, shifts: state.shifts, activeEnemies: state.activeEnemies,',
  '        };',
  '      };',
  '',
].join("\n");
source = replaceOnce(source, varsAnchor, varsAnchor + diagState, "ELITE_I spacing state insertion");

const shiftOld = [
  '      const shiftAndObserve = async () => {',
  '        await canvas.press("Space", { timeout: 2_500 });',
  '        await page.waitForTimeout(105);',
  '        return readState(canvas);',
  '      };',
].join("\n");
const shiftNew = [
  '      const shiftAndObserve = async () => {',
  '        if (eliteSpacingPending) eliteSpacingPending.shiftIncluded = true;',
  '        await canvas.press("Space", { timeout: 2_500 });',
  '        await page.waitForTimeout(105);',
  '        const shiftedState = await readState(canvas);',
  '        eliteSpacingObserve(shiftedState, "EXISTING_SHIFT_READ");',
  '        return shiftedState;',
  '      };',
].join("\n");
source = replaceOnce(source, shiftOld, shiftNew, "existing SHIFT read reuse");

source = replaceOnce(
  source,
  '        minHp = Math.min(minHp, state.hp);\n\n        if (state.dead || state.hp <= 0) {',
  '        minHp = Math.min(minHp, state.hp);\n        eliteSpacingObserve(state, "EXISTING_LOOP_READ");\n\n        if (state.dead || state.hp <= 0) {',
  "existing loop read reuse",
);

const eliteCallerOld = [
  '          } else {',
  '            await moveEliteCombatLane(canvas, state, checkpointTick);',
  '            checkpointTick += 1;',
  '            if (checkpointTick % 6 === 0) await shiftAndObserve();',
  '            await page.waitForTimeout(35);',
  '          }',
].join("\n");
const eliteCallerNew = [
  '          } else {',
  '            const eliteTick = checkpointTick;',
  '            const eliteAction = await moveEliteCombatLane(canvas, state, checkpointTick);',
  '            eliteSpacingSetAction(state, eliteAction, eliteTick);',
  '            checkpointTick += 1;',
  '            if (checkpointTick % 6 === 0) await shiftAndObserve();',
  '            await page.waitForTimeout(35);',
  '          }',
].join("\n");
source = replaceOnce(source, eliteCallerOld, eliteCallerNew, "elite action attribution");

writeFileSync(generatedPath, source, "utf8");
const syntax = spawnSync(process.execPath, ["--check", generatedPath], { encoding: "utf8" });
if (syntax.stdout) process.stdout.write(syntax.stdout);
if (syntax.stderr) process.stderr.write(syntax.stderr);
assert.equal(syntax.status, 0, "generated ELITE_I spacing runner syntax check failed");

console.log("CR3E2_RUN17_ELITE1_SPACING_WRAPPER=PASS");
console.log("CR3E2_RUN17_ELITE1_SPACING_GENERATED_SYNTAX=PASS");
console.log("CR3E2_RUN17_ELITE1_SPACING_SOURCE=UNCHANGED_DIRECT_RUN17_CONTROL");
console.log("CR3E2_RUN17_ELITE1_SPACING_READS=EXISTING_LOOP_AND_SHIFT_READS_ONLY");
console.log("CR3E2_RUN17_ELITE1_SPACING_WINDOW=ELITE_I_ELITE_ACTIVE_ONLY");
console.log("CR3E2_RUN17_ELITE1_SPACING_ACTIONS=APPROACH,RETREAT,ORBIT");
console.log("CR3E2_RUN17_ELITE1_SPACING_BANDS=LT_140,BAND_140_210,GT_210");
console.log("CR3E2_RUN17_ELITE1_SPACING_HOLD_MS=BASELINE_180_UNCHANGED");
console.log("CR3E2_RUN17_ELITE1_SPACING_TARGET_POLICY=BASELINE_MIN140_MAX210_UNCHANGED");
console.log("CR3E2_RUN17_ELITE1_SPACING_SHIFT_CADENCE=BASELINE_EVERY_6_CHECKPOINT_TICKS");
console.log("CR3E2_RUN17_ELITE1_SPACING_DRAFT_PRIORITY=UNCHANGED");
console.log("CR3E2_RUN17_ELITE1_SPACING_STAGE2=UNCHANGED");
console.log("CR3E2_RUN17_ELITE1_SPACING_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(pathToFileURL(generatedPath).href + "?v=" + Date.now());
} finally {
  rmSync(generatedPath, { force: true });
}
