import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const sourcePath = resolve("scripts/local/cr3e2-run17-direct-control.mjs");
const generatedPath = resolve("scripts/local/.cr3e2-run17-elite1-health-transfer.runner.mjs");
const trials = Number(process.env.CR3E2_RUN17_HEALTH_TRANSFER_TRIALS ?? "10");

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
assert.ok(!source.includes("stageTwoEntryAligned"), "rejected entry-up experiment leaked into baseline source");

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
  '  let segment;',
  '  if (y < 250 && x < 1500) { key = "ArrowRight"; segment = x < 900 ? "TOP_LEFT" : "TOP_RIGHT"; }',
  '  else if (x >= 1500 && y < 950) { key = "ArrowDown"; segment = y < 600 ? "RIGHT_UPPER" : "RIGHT_LOWER"; }',
  '  else if (y >= 950 && x > 300) { key = "ArrowLeft"; segment = x < 900 ? "BOTTOM_LEFT" : "BOTTOM_RIGHT"; }',
  '  else if (x <= 300 && y > 250) { key = "ArrowUp"; segment = y < 600 ? "LEFT_UPPER" : "LEFT_LOWER"; }',
  '  else { key = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"][Math.floor(tick / 10) % 4]; segment = "FALLBACK"; }',
  '  const postStageOne = state.stage !== "STAGE_I";',
  '  await canvas.press(key, { delay: postStageOne ? 520 : 420, timeout: 2_500 });',
  '  const pressureShift = postStageOne && (state.activeEnemies >= 32 || state.hp <= 25);',
  '  return { settle: postStageOne ? 80 : 0, shiftModulo: pressureShift ? 5 : 7, key, segment };',
  '}',
].join("\n");

source = replaceOnce(source, movementOld, movementNew, "movement action metadata");

const varsAnchor = '      const wallDeadline = Date.now() + 220_000;\n\n';
const diagState = [
  '      let actionMapActive = false;',
  '      let actionMapFinished = false;',
  '      let actionMapPreviousState = null;',
  '      let actionMapPending = null;',
  '      let actionMapLossEvents = 0;',
  '      const actionMapSegments = ["TOP_LEFT", "TOP_RIGHT", "RIGHT_UPPER", "RIGHT_LOWER", "BOTTOM_RIGHT", "BOTTOM_LEFT", "LEFT_LOWER", "LEFT_UPPER", "FALLBACK", "DRAFT", "OTHER"];',
  '      const actionMapStats = Object.fromEntries(actionMapSegments.map(segment => [segment, {',
  '        intervals: 0, damageEvents: 0, hpLost: 0, shiftIntervals: 0,',
  '      }]));',
  '',
  '      let healthEliteEntry = null;',
  '      let healthEliteLastActive = null;',
  '      let healthEliteMinHp = null;',
  '      let healthEliteActiveObservations = 0;',
  '      let healthPostDefeat = null;',
  '      let healthRewardFirst = null;',
  '      let healthStageTwoFirst = null;',
  '',
  '      const healthSnapshot = state => ({',
  '        elapsed: state?.elapsed, progress: state?.progress, stage: state?.stage, hp: state?.hp,',
  '        level: state?.level, kills: state?.kills, shifts: state?.shifts, phase: state?.phase,',
  '        x: Number.isFinite(state?.x) ? Math.round(state.x) : null,',
  '        y: Number.isFinite(state?.y) ? Math.round(state.y) : null,',
  '        activeEnemies: state?.activeEnemies, enemyKinds: state?.enemyKinds,',
  '        elitesDefeated: state?.elitesDefeated, cores: state?.cores,',
  '        gatePhase: state?.gatePhase, gateActive: state?.gateActive, gateResolved: state?.gateResolved,',
  '        moveTick, checkpointTick,',
  '      });',
  '',
  '      const healthObserve = (state, observation) => {',
  '        if (!state) return;',
  '        if (state.gateActive === "ELITE_I") {',
  '          if (!healthEliteEntry) {',
  '            healthEliteEntry = { observation, state: healthSnapshot(state) };',
  '            console.log(`CR3E2_RUN17_HEALTH_ELITE_ENTRY_T${trial}=${JSON.stringify(healthEliteEntry)}`);',
  '          }',
  '          healthEliteActiveObservations += 1;',
  '          healthEliteMinHp = healthEliteMinHp === null ? state.hp : Math.min(healthEliteMinHp, state.hp);',
  '          healthEliteLastActive = { observation, state: healthSnapshot(state) };',
  '        }',
  '        const eliteResolved = Array.isArray(state.gateResolved) && state.gateResolved.includes("ELITE_I");',
  '        if (healthEliteEntry && eliteResolved && state.gateActive !== "ELITE_I" && !healthPostDefeat) {',
  '          healthPostDefeat = { observation, state: healthSnapshot(state) };',
  '          console.log(`CR3E2_RUN17_HEALTH_POST_DEFEAT_T${trial}=${JSON.stringify(healthPostDefeat)}`);',
  '        }',
  '        if (eliteResolved && state.gatePhase === "REWARD_PENDING" && !healthRewardFirst) {',
  '          healthRewardFirst = { observation, state: healthSnapshot(state) };',
  '          console.log(`CR3E2_RUN17_HEALTH_REWARD_T${trial}=${JSON.stringify(healthRewardFirst)}`);',
  '        }',
  '        if (eliteResolved && state.stage === "STAGE_II" && state.gatePhase === "RUNNING" && !healthStageTwoFirst) {',
  '          healthStageTwoFirst = { observation, state: healthSnapshot(state) };',
  '          console.log(`CR3E2_RUN17_HEALTH_STAGE2_ENTRY_T${trial}=${JSON.stringify(healthStageTwoFirst)}`);',
  '        }',
  '      };',
  '',
  '      const actionMapSnapshot = state => ({',
  '        elapsed: state?.elapsed, progress: state?.progress, stage: state?.stage, hp: state?.hp,',
  '        level: state?.level, kills: state?.kills, shifts: state?.shifts, phase: state?.phase,',
  '        x: Number.isFinite(state?.x) ? Math.round(state.x) : null,',
  '        y: Number.isFinite(state?.y) ? Math.round(state.y) : null,',
  '        activeEnemies: state?.activeEnemies, enemyKinds: state?.enemyKinds,',
  '        draftOpen: state?.draftOpen, draftIds: state?.draftIds, refracts: state?.refracts,',
  '        rerollNonce: state?.rerollNonce, gatePhase: state?.gatePhase, gateActive: state?.gateActive,',
  '        moveTick, checkpointTick,',
  '      });',
  '',
  '      const actionMapEligible = state => Boolean(state',
  '        && state.stage === "STAGE_II"',
  '        && Array.isArray(state.gateResolved)',
  '        && state.gateResolved.includes("ELITE_I"));',
  '',
  '      const actionMapStartIfNeeded = (state, observation) => {',
  '        if (actionMapActive || actionMapFinished || !actionMapEligible(state)) return;',
  '        actionMapActive = true;',
  '        actionMapPreviousState = state;',
  '        console.log(`CR3E2_RUN17_ACTION_MAP_START_T${trial}=${JSON.stringify({ observation, state: actionMapSnapshot(state) })}`);',
  '      };',
  '',
  '      const actionMapObserve = (state, observation) => {',
  '        if (!state || actionMapFinished) return;',
  '        actionMapStartIfNeeded(state, observation);',
  '        if (!actionMapActive) return;',
  '        if (actionMapPending && actionMapPreviousState) {',
  '          const hpLost = Math.max(0, actionMapPreviousState.hp - state.hp);',
  '          const segment = actionMapStats[actionMapPending.segment] ? actionMapPending.segment : "OTHER";',
  '          const bucket = actionMapStats[segment];',
  '          bucket.intervals += 1;',
  '          bucket.damageEvents += hpLost > 0 ? 1 : 0;',
  '          bucket.hpLost += hpLost;',
  '          bucket.shiftIntervals += actionMapPending.shiftIncluded ? 1 : 0;',
  '          if (hpLost > 0) {',
  '            actionMapLossEvents += 1;',
  '            console.log(`CR3E2_RUN17_ACTION_LOSS_T${trial}_${actionMapLossEvents}=${JSON.stringify({',
  '              observation, hpLost, action: actionMapPending,',
  '              before: actionMapSnapshot(actionMapPreviousState), after: actionMapSnapshot(state),',
  '            })}`);',
  '          }',
  '          actionMapPending = null;',
  '        }',
  '        actionMapPreviousState = state;',
  '        if (state.gateActive === "CHECKPOINT_ELITE" && state.progress === TARGET_PROGRESS) {',
  '          assert.ok(healthEliteEntry, `trial ${trial} missing observed ELITE_I entry`);',
  '          assert.ok(healthPostDefeat, `trial ${trial} missing observed post-ELITE_I state`);',
  '          assert.ok(healthStageTwoFirst, `trial ${trial} missing observed Stage-II entry`);',
  '          const stageTwoMappedHpLost = Object.values(actionMapStats).reduce((sum, bucket) => sum + bucket.hpLost, 0);',
  '          const healthSummary = {',
  '            eliteEntry: healthEliteEntry,',
  '            eliteMinHpObserved: healthEliteMinHp,',
  '            eliteActiveObservations: healthEliteActiveObservations,',
  '            eliteLastActive: healthEliteLastActive,',
  '            postDefeatFirst: healthPostDefeat,',
  '            rewardFirst: healthRewardFirst,',
  '            rewardWindowObserved: Boolean(healthRewardFirst),',
  '            stageTwoFirst: healthStageTwoFirst,',
  '            eliteObservedHpLost: Math.max(0, healthEliteEntry.state.hp - healthPostDefeat.state.hp),',
  '            eliteObservedHpDelta: healthPostDefeat.state.hp - healthEliteEntry.state.hp,',
  '            eliteCheckpointTickDelta: healthPostDefeat.state.checkpointTick - healthEliteEntry.state.checkpointTick,',
  '            eliteShiftDelta: healthPostDefeat.state.shifts - healthEliteEntry.state.shifts,',
  '            eliteObservedElapsedMs: healthPostDefeat.state.elapsed - healthEliteEntry.state.elapsed,',
  '            rewardHpDeltaObserved: healthRewardFirst ? healthStageTwoFirst.state.hp - healthRewardFirst.state.hp : null,',
  '            rewardCoreDeltaObserved: healthRewardFirst ? healthStageTwoFirst.state.cores - healthRewardFirst.state.cores : null,',
  '            stageTwoEntryHp: healthStageTwoFirst.state.hp,',
  '            stageTwoMappedHpLost,',
  '            stageTwoNetHpDelta: state.hp - healthStageTwoFirst.state.hp,',
  '            checkpointHp: state.hp,',
  '            checkpoint: healthSnapshot(state),',
  '          };',
  '          console.log(`CR3E2_RUN17_HEALTH_TRANSFER_SUMMARY_T${trial}=${JSON.stringify(healthSummary)}`);',
  '          console.log(`CR3E2_RUN17_ACTION_MAP_SUMMARY_T${trial}=${JSON.stringify({',
  '            checkpoint: actionMapSnapshot(state), lossEvents: actionMapLossEvents, stats: actionMapStats,',
  '          })}`);',
  '          actionMapFinished = true;',
  '        }',
  '      };',
  '',
  '      const actionMapSetMovement = (state, movement, tick) => {',
  '        if (!actionMapActive || actionMapFinished || state.stage !== "STAGE_II") return;',
  '        actionMapPending = {',
  '          type: "MOVE", key: movement.key, segment: movement.segment, tick,',
  '          shiftIncluded: false, startProgress: state.progress, startPhase: state.phase,',
  '          startX: Math.round(state.x), startY: Math.round(state.y),',
  '          startActiveEnemies: state.activeEnemies, startEnemyKinds: state.enemyKinds,',
  '        };',
  '      };',
  '',
].join("\n");
source = replaceOnce(source, varsAnchor, varsAnchor + diagState, "action-map state insertion");

const shiftOld = [
  '      const shiftAndObserve = async () => {',
  '        await canvas.press("Space", { timeout: 2_500 });',
  '        await page.waitForTimeout(105);',
  '        return readState(canvas);',
  '      };',
].join("\n");

const shiftNew = [
  '      const shiftAndObserve = async () => {',
  '        if (actionMapPending) actionMapPending.shiftIncluded = true;',
  '        await canvas.press("Space", { timeout: 2_500 });',
  '        await page.waitForTimeout(105);',
  '        const shiftedState = await readState(canvas);',
  '        healthObserve(shiftedState, "EXISTING_SHIFT_READ");',
  '        actionMapObserve(shiftedState, "EXISTING_SHIFT_READ");',
  '        return shiftedState;',
  '      };',
].join("\n");
source = replaceOnce(source, shiftOld, shiftNew, "existing SHIFT read reuse");

source = replaceOnce(
  source,
  '        minHp = Math.min(minHp, state.hp);\n\n        if (state.dead || state.hp <= 0) {',
  '        minHp = Math.min(minHp, state.hp);\n        healthObserve(state, "EXISTING_LOOP_READ");\n        actionMapObserve(state, "EXISTING_LOOP_READ");\n\n        if (state.dead || state.hp <= 0) {',
  "existing loop read reuse",
);

const draftOld = [
  '        if (state.draftOpen) {',
  '          await chooseDraft(canvas, state, page, trial);',
  '          continue;',
  '        }',
].join("\n");

const draftNew = [
  '        if (state.draftOpen) {',
  '          if (actionMapActive && !actionMapFinished) {',
  '            actionMapPending = {',
  '              type: "DRAFT", key: null, segment: "DRAFT", tick: moveTick, shiftIncluded: false,',
  '              startProgress: state.progress, startPhase: state.phase,',
  '              startX: Math.round(state.x), startY: Math.round(state.y),',
  '              startActiveEnemies: state.activeEnemies, startEnemyKinds: state.enemyKinds,',
  '            };',
  '          }',
  '          await chooseDraft(canvas, state, page, trial);',
  '          continue;',
  '        }',
].join("\n");
source = replaceOnce(source, draftOld, draftNew, "draft interval attribution");

const thinOld = [
  '          if (thinLaterCheckpointField) {',
  '            const movement = await moveNaturalSurvivalLane(canvas, state, moveTick);',
  '            moveTick += 1;',
  '            await page.waitForTimeout(movement.settle);',
  '            if (moveTick % movement.shiftModulo === 0) await shiftAndObserve();',
  '            await page.waitForTimeout(45);',
  '          } else {',
].join("\n");

const thinNew = [
  '          if (thinLaterCheckpointField) {',
  '            const actionTick = moveTick;',
  '            const movement = await moveNaturalSurvivalLane(canvas, state, moveTick);',
  '            actionMapSetMovement(state, movement, actionTick);',
  '            moveTick += 1;',
  '            await page.waitForTimeout(movement.settle);',
  '            if (moveTick % movement.shiftModulo === 0) await shiftAndObserve();',
  '            await page.waitForTimeout(45);',
  '          } else {',
].join("\n");
source = replaceOnce(source, thinOld, thinNew, "thin-field movement attribution");

const normalOld = [
  '        } else {',
  '          const movement = await moveNaturalSurvivalLane(canvas, state, moveTick);',
  '          moveTick += 1;',
  '          await page.waitForTimeout(movement.settle);',
  '          if (moveTick % movement.shiftModulo === 0) await shiftAndObserve();',
  '          await page.waitForTimeout(45);',
  '        }',
].join("\n");

const normalNew = [
  '        } else {',
  '          const actionTick = moveTick;',
  '          const movement = await moveNaturalSurvivalLane(canvas, state, moveTick);',
  '          actionMapSetMovement(state, movement, actionTick);',
  '          moveTick += 1;',
  '          await page.waitForTimeout(movement.settle);',
  '          if (moveTick % movement.shiftModulo === 0) await shiftAndObserve();',
  '          await page.waitForTimeout(45);',
  '        }',
].join("\n");
source = replaceOnce(source, normalOld, normalNew, "normal movement attribution");

writeFileSync(generatedPath, source, "utf8");

const syntax = spawnSync(process.execPath, ["--check", generatedPath], { encoding: "utf8" });
if (syntax.stdout) process.stdout.write(syntax.stdout);
if (syntax.stderr) process.stderr.write(syntax.stderr);
assert.equal(syntax.status, 0, "generated ELITE_I health-transfer runner syntax check failed");

console.log("CR3E2_RUN17_ACTION_MAP_WRAPPER=PASS");
console.log("CR3E2_RUN17_ACTION_MAP_GENERATED_SYNTAX=PASS");
console.log("CR3E2_RUN17_ACTION_MAP_SOURCE=UNCHANGED_DIRECT_RUN17_CONTROL");
console.log("CR3E2_RUN17_ACTION_MAP_WINDOW=STAGE2_RESUME_THROUGH_CHECKPOINT_ELITE_180000");
console.log("CR3E2_RUN17_ACTION_MAP_READS=EXISTING_LOOP_AND_SHIFT_READS_ONLY");
console.log("CR3E2_RUN17_ACTION_MAP_LOGGING=LOSS_EVENTS_PLUS_AGGREGATE_ONLY");
console.log("CR3E2_RUN17_ACTION_MAP_SEGMENTS=TOP_LEFT,TOP_RIGHT,RIGHT_UPPER,RIGHT_LOWER,BOTTOM_RIGHT,BOTTOM_LEFT,LEFT_LOWER,LEFT_UPPER,FALLBACK");
console.log("CR3E2_RUN17_ACTION_MAP_ROUTE=BASELINE_X300_X1500_Y250_Y950_UNCHANGED");
console.log("CR3E2_RUN17_ACTION_MAP_HOLD_MS=BASELINE_520_UNCHANGED");
console.log("CR3E2_RUN17_ACTION_MAP_REFRACT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_ACTION_MAP_PRESSURE_SHIFT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_ACTION_MAP_DRAFT_PRIORITY=UNCHANGED");
console.log("CR3E2_RUN17_ACTION_MAP_SHIFT_NOTE=MOVEMENT_PLUS_SCHEDULED_SHIFT_IS_ONE_COMBINED_EXISTING_READ_INTERVAL");
console.log("CR3E2_RUN17_ACTION_MAP_SCOPE=LOCAL_DRIVER_ONLY");
console.log("CR3E2_RUN17_HEALTH_TRANSFER_WRAPPER=PASS");
console.log("CR3E2_RUN17_HEALTH_TRANSFER_SOURCE=UNCHANGED_DIRECT_RUN17_CONTROL");
console.log("CR3E2_RUN17_HEALTH_TRANSFER_READS=EXISTING_LOOP_AND_SHIFT_READS_ONLY");
console.log("CR3E2_RUN17_HEALTH_TRANSFER_ELITE_DEFEAT=FIRST_EXISTING_OBSERVATION_AFTER_ELITE_I_RESOLVED");
console.log("CR3E2_RUN17_HEALTH_TRANSFER_REWARD=OBSERVED_REWARD_PENDING_TO_FIRST_STAGE2_RUNNING");
console.log("CR3E2_RUN17_HEALTH_TRANSFER_STAGE2_LOSS=LOW_OVERHEAD_ACTION_MAP");
console.log("CR3E2_RUN17_HEALTH_TRANSFER_POLICY=UNCHANGED");
console.log("CR3E2_RUN17_HEALTH_TRANSFER_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(`${pathToFileURL(generatedPath).href}?v=${Date.now()}`);
} finally {
  rmSync(generatedPath, { force: true });
}
