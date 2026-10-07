import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const sourcePath = resolve("scripts/local/cr3e2-run17-direct-control.mjs");
const generatedPath = resolve("scripts/local/.cr3e2-run17-spawn-clamp-map.runner.mjs");
const trials = Number(process.env.CR3E2_RUN17_SPAWN_CLAMP_TRIALS ?? "10");

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
  '      const clampExposureKeys = ["ANY", "NONE", "LEFT", "RIGHT", "TOP", "BOTTOM", "CORNER"];',
  '      const clampExposureStats = Object.fromEntries(clampExposureKeys.map(key => [key, {',
  '        intervals: 0, damageEvents: 0, hpLost: 0, shiftIntervals: 0,',
  '      }]));',
  '      const clampSourceKeys = ["HP3_BEACON_CONTACT", "HP4_TRACE_CONTACT", "HP5_SPLIT_CONTACT", "HP7_BEACON_PROJECTILE", "OTHER_OR_MULTI"];',
  '      const clampSourceStats = Object.fromEntries(clampSourceKeys.map(key => [key, {',
  '        events: 0, hpLost: 0, anyCompressed: 0, noneCompressed: 0,',
  '      }]));',
  '',
  '      const clampCompressionFor = state => {',
  '        const left = state.x < 630;',
  '        const right = state.x > 1170;',
  '        const top = state.y < 500;',
  '        const bottom = state.y > 700;',
  '        const sides = [left && "LEFT", right && "RIGHT", top && "TOP", bottom && "BOTTOM"].filter(Boolean);',
  '        return { left, right, top, bottom, any: sides.length > 0, corner: sides.length > 1, sides };',
  '      };',
  '',
  '      const clampSourceForLoss = hpLost => {',
  '        if (hpLost === 3) return "HP3_BEACON_CONTACT";',
  '        if (hpLost === 4) return "HP4_TRACE_CONTACT";',
  '        if (hpLost === 5) return "HP5_SPLIT_CONTACT";',
  '        if (hpLost === 7) return "HP7_BEACON_PROJECTILE";',
  '        return "OTHER_OR_MULTI";',
  '      };',
  '',
  '      const clampAddExposure = (compression, hpLost, shiftIncluded) => {',
  '        const keys = compression.any ? ["ANY", ...compression.sides] : ["NONE"];',
  '        if (compression.corner) keys.push("CORNER");',
  '        for (const key of keys) {',
  '          const bucket = clampExposureStats[key];',
  '          bucket.intervals += 1;',
  '          bucket.damageEvents += hpLost > 0 ? 1 : 0;',
  '          bucket.hpLost += hpLost;',
  '          bucket.shiftIntervals += shiftIncluded ? 1 : 0;',
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
  '        console.log(`CR3E2_RUN17_SPAWN_CLAMP_START_T${trial}=${JSON.stringify({ observation, state: actionMapSnapshot(state) })}`);',
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
  '          const compression = actionMapPending.compression;',
  '          clampAddExposure(compression, hpLost, actionMapPending.shiftIncluded);',
  '          if (hpLost > 0) {',
  '            actionMapLossEvents += 1;',
  '            const sourceSignature = clampSourceForLoss(hpLost);',
  '            const sourceBucket = clampSourceStats[sourceSignature];',
  '            sourceBucket.events += 1;',
  '            sourceBucket.hpLost += hpLost;',
  '            sourceBucket.anyCompressed += compression.any ? 1 : 0;',
  '            sourceBucket.noneCompressed += compression.any ? 0 : 1;',
  '            console.log(`CR3E2_RUN17_CLAMP_LOSS_T${trial}_${actionMapLossEvents}=${JSON.stringify({',
  '              observation, hpLost, sourceSignature, action: actionMapPending,',
  '              before: actionMapSnapshot(actionMapPreviousState), after: actionMapSnapshot(state),',
  '            })}`);',
  '          }',
  '          actionMapPending = null;',
  '        }',
  '        actionMapPreviousState = state;',
  '        if (state.gateActive === "CHECKPOINT_ELITE" && state.progress === TARGET_PROGRESS) {',
  '          console.log(`CR3E2_RUN17_SPAWN_CLAMP_SUMMARY_T${trial}=${JSON.stringify({',
  '            checkpoint: actionMapSnapshot(state), lossEvents: actionMapLossEvents, segmentStats: actionMapStats, exposureStats: clampExposureStats, sourceStats: clampSourceStats,',
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
  '          compression: clampCompressionFor(state),',
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
  '        actionMapObserve(shiftedState, "EXISTING_SHIFT_READ");',
  '        return shiftedState;',
  '      };',
].join("\n");
source = replaceOnce(source, shiftOld, shiftNew, "existing SHIFT read reuse");

source = replaceOnce(
  source,
  '        minHp = Math.min(minHp, state.hp);\n\n        if (state.dead || state.hp <= 0) {',
  '        minHp = Math.min(minHp, state.hp);\n        actionMapObserve(state, "EXISTING_LOOP_READ");\n\n        if (state.dead || state.hp <= 0) {',
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
  '              compression: clampCompressionFor(state),',
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
assert.equal(syntax.status, 0, "generated Stage-II spawn-clamp map runner syntax check failed");

console.log("CR3E2_RUN17_SPAWN_CLAMP_WRAPPER=PASS");
console.log("CR3E2_RUN17_SPAWN_CLAMP_GENERATED_SYNTAX=PASS");
console.log("CR3E2_RUN17_SPAWN_CLAMP_SOURCE=UNCHANGED_DIRECT_RUN17_CONTROL");
console.log("CR3E2_RUN17_SPAWN_CLAMP_WINDOW=STAGE2_RESUME_THROUGH_CHECKPOINT_ELITE_180000");
console.log("CR3E2_RUN17_SPAWN_CLAMP_READS=EXISTING_LOOP_AND_SHIFT_READS_ONLY");
console.log("CR3E2_RUN17_SPAWN_CLAMP_LOGGING=LOSS_EVENTS_PLUS_AGGREGATE_ONLY");
console.log("CR3E2_RUN17_SPAWN_CLAMP_SEGMENTS=TOP_LEFT,TOP_RIGHT,RIGHT_UPPER,RIGHT_LOWER,BOTTOM_RIGHT,BOTTOM_LEFT,LEFT_LOWER,LEFT_UPPER,FALLBACK");
console.log("CR3E2_RUN17_SPAWN_CLAMP_ROUTE=BASELINE_X300_X1500_Y250_Y950_UNCHANGED");
console.log("CR3E2_RUN17_SPAWN_CLAMP_HOLD_MS=BASELINE_520_UNCHANGED");
console.log("CR3E2_RUN17_SPAWN_CLAMP_REFRACT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_SPAWN_CLAMP_PRESSURE_SHIFT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_SPAWN_CLAMP_DRAFT_PRIORITY=UNCHANGED");
console.log("CR3E2_RUN17_SPAWN_CLAMP_SHIFT_NOTE=MOVEMENT_PLUS_SCHEDULED_SHIFT_IS_ONE_COMBINED_EXISTING_READ_INTERVAL");
console.log("CR3E2_RUN17_SPAWN_CLAMP_THRESHOLDS=LEFT_X_LT_630,RIGHT_X_GT_1170,TOP_Y_LT_500,BOTTOM_Y_GT_700");
console.log("CR3E2_RUN17_SPAWN_CLAMP_THRESHOLD_SOURCE=WORLD_MARGIN_110_PLUS_SPAWN_OFFSETS_X520_Y390");
console.log("CR3E2_RUN17_SPAWN_CLAMP_DAMAGE_SIGNATURES=HP3_BEACON_CONTACT,HP4_TRACE_CONTACT,HP5_SPLIT_CONTACT,HP7_BEACON_PROJECTILE,OTHER_OR_MULTI");
console.log("CR3E2_RUN17_SPAWN_CLAMP_DAMAGE_NOTE=SIGNATURE_CLASSIFICATION_NOT_ENGINE_EVENT_INSTRUMENTATION");
console.log("CR3E2_RUN17_SPAWN_CLAMP_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(`${pathToFileURL(generatedPath).href}?v=${Date.now()}`);
} finally {
  rmSync(generatedPath, { force: true });
}
