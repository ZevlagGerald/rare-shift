import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const sourcePath = resolve("scripts/local/cr3e2-run17-direct-control.mjs");
const generatedPath = resolve("scripts/local/.cr3e2-run17-elite1-prelude7.runner.mjs");
const trials = Number(process.env.CR3E2_RUN17_ELITE1_PRELUDE7_TRIALS ?? "10");

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
assert.ok(source.includes('const thinLaterCheckpointField = state.gateActive !== "ELITE_I" && state.activeEnemies > 1;'), "baseline later-checkpoint thin-field policy missing");
assert.ok(source.includes('await canvas.press(key, { delay: postStageOne ? 520 : 420, timeout: 2_500 });'), "baseline survival timing missing");
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
  "trial count"
);

const varsAnchor = "      const wallDeadline = Date.now() + 220_000;\n\n";
const vars = [
  "      let preludeStarted = false;",
  "      let preludeHolds = 0;",
  "      let preludeScheduledShifts = 0;",
  "      let preludeStart = null;",
  "      let preludeEndObservation = null;",
  "      let preludeMinHp = Number.POSITIVE_INFINITY;",
  "      let preludeMinActiveEnemies = Number.POSITIVE_INFINITY;",
  "",
  "      const preludeCompact = state => ({",
  "        elapsed: state.elapsed, progress: state.progress, stage: state.stage, hp: state.hp,",
  "        level: state.level, kills: state.kills, shifts: state.shifts, phase: state.phase,",
  "        x: Math.round(state.x), y: Math.round(state.y), activeEnemies: state.activeEnemies,",
  "        enemyKinds: state.enemyKinds, eliteHp: Number.isFinite(state.eliteHp) ? state.eliteHp : null,",
  "        gatePhase: state.gatePhase, gateActive: state.gateActive, moveTick, checkpointTick,",
  "      });",
  "",
  "      const observePrelude = state => {",
  "        if (!preludeStarted || !state) return;",
  "        preludeMinHp = Math.min(preludeMinHp, state.hp);",
  "        preludeMinActiveEnemies = Math.min(preludeMinActiveEnemies, state.activeEnemies);",
  "      };",
  "",
].join("\n");
source = replaceOnce(source, varsAnchor, varsAnchor + vars, "prelude state insertion");

const shiftOld = [
  '      const shiftAndObserve = async () => {',
  '        await canvas.press("Space", { timeout: 2_500 });',
  '        await page.waitForTimeout(105);',
  '        return readState(canvas);',
  '      };',
].join("\n");
const shiftNew = [
  '      const shiftAndObserve = async () => {',
  '        await canvas.press("Space", { timeout: 2_500 });',
  '        await page.waitForTimeout(105);',
  '        const shifted = await readState(canvas);',
  '        observePrelude(shifted);',
  '        if (preludeStarted && preludeHolds === 7 && !preludeEndObservation) {',
  '          preludeEndObservation = { observation: "EXISTING_SHIFT_READ", state: shifted };',
  '        }',
  '        return shifted;',
  '      };',
].join("\n");
source = replaceOnce(source, shiftOld, shiftNew, "existing SHIFT read reuse");

const loopAnchor = "        minHp = Math.min(minHp, state.hp);\n\n        if (state.dead || state.hp <= 0) {";
const loopReplacement = [
  "        minHp = Math.min(minHp, state.hp);",
  "        observePrelude(state);",
  "",
  "        if (preludeStarted && preludeHolds === 7) {",
  '          if (!preludeEndObservation) preludeEndObservation = { observation: "EXISTING_LOOP_READ", state };',
  "          const endState = preludeEndObservation.state;",
  '          assert.ok(preludeStart, "trial " + trial + " missing prelude start");',
  "          const preludeSummary = {",
  '            trial, frameA, frameB, outcome: "ELITE1_PRELUDE7_COMPLETE", holds: preludeHolds,',
  "            scheduledShifts: preludeScheduledShifts, start: preludeStart,",
  "            endObservation: preludeEndObservation.observation, end: preludeCompact(endState),",
  "            minHp: preludeMinHp, minActiveEnemies: preludeMinActiveEnemies,",
  "            hpDelta: endState.hp - preludeStart.hp,",
  "            killsDelta: endState.kills - preludeStart.kills,",
  "            activeEnemiesDelta: endState.activeEnemies - preludeStart.activeEnemies,",
  "            eliteHpDelta: Number.isFinite(preludeStart.eliteHp) && Number.isFinite(endState.eliteHp)",
  "              ? endState.eliteHp - preludeStart.eliteHp : null,",
  "            shiftsDelta: endState.shifts - preludeStart.shifts,",
  "            elapsedDeltaMs: endState.elapsed - preludeStart.elapsed,",
  "          };",
  '          console.log("CR3E2_RUN17_ELITE1_PRELUDE7_SUMMARY_T" + trial + "=" + JSON.stringify(preludeSummary));',
  "          record = preludeSummary;",
  "          return;",
  "        }",
  "",
  "        if (state.dead || state.hp <= 0) {",
].join("\n");
source = replaceOnce(source, loopAnchor, loopReplacement, "prelude completion observation");

const eliteOld = [
  '        if (state.gatePhase === "ELITE_ACTIVE") {',
  '          const thinLaterCheckpointField = state.gateActive !== "ELITE_I" && state.activeEnemies > 1;',
  '          if (thinLaterCheckpointField) {',
  '            const movement = await moveNaturalSurvivalLane(canvas, state, moveTick);',
  '            moveTick += 1;',
  '            await page.waitForTimeout(movement.settle);',
  '            if (moveTick % movement.shiftModulo === 0) await shiftAndObserve();',
  '            await page.waitForTimeout(45);',
  '          } else {',
  '            await moveEliteCombatLane(canvas, state, checkpointTick);',
  '            checkpointTick += 1;',
  '            if (checkpointTick % 6 === 0) await shiftAndObserve();',
  '            await page.waitForTimeout(35);',
  '          }',
  '        } else if (state.gatePhase === "REWARD_PENDING") {',
].join("\n");

const eliteNew = [
  '        if (state.gatePhase === "ELITE_ACTIVE") {',
  '          if (state.gateActive === "ELITE_I" && preludeHolds < 7) {',
  "            if (!preludeStarted) {",
  "              preludeStarted = true;",
  "              preludeStart = preludeCompact(state);",
  "              observePrelude(state);",
  '              console.log("CR3E2_RUN17_ELITE1_PRELUDE7_START_T" + trial + "=" + JSON.stringify(preludeStart));',
  "            }",
  "            const movement = await moveNaturalSurvivalLane(canvas, state, moveTick);",
  "            preludeHolds += 1;",
  "            moveTick += 1;",
  "            await page.waitForTimeout(movement.settle);",
  "            if (moveTick % movement.shiftModulo === 0) {",
  "              preludeScheduledShifts += 1;",
  "              await shiftAndObserve();",
  "            }",
  "            await page.waitForTimeout(45);",
  "            continue;",
  "          }",
  '          const thinLaterCheckpointField = state.gateActive !== "ELITE_I" && state.activeEnemies > 1;',
  "          if (thinLaterCheckpointField) {",
  "            const movement = await moveNaturalSurvivalLane(canvas, state, moveTick);",
  "            moveTick += 1;",
  "            await page.waitForTimeout(movement.settle);",
  "            if (moveTick % movement.shiftModulo === 0) await shiftAndObserve();",
  "            await page.waitForTimeout(45);",
  "          } else {",
  "            await moveEliteCombatLane(canvas, state, checkpointTick);",
  "            checkpointTick += 1;",
  "            if (checkpointTick % 6 === 0) await shiftAndObserve();",
  "            await page.waitForTimeout(35);",
  "          }",
  '        } else if (state.gatePhase === "REWARD_PENDING") {',
].join("\n");
source = replaceOnce(source, eliteOld, eliteNew, "seven-hold ELITE_I prelude");

writeFileSync(generatedPath, source, "utf8");

const syntax = spawnSync(process.execPath, ["--check", generatedPath], { encoding: "utf8" });
if (syntax.stdout) process.stdout.write(syntax.stdout);
if (syntax.stderr) process.stderr.write(syntax.stderr);
assert.equal(syntax.status, 0, "generated ELITE_I seven-hold prelude runner syntax check failed");

console.log("CR3E2_RUN17_ELITE1_PRELUDE7_WRAPPER=PASS");
console.log("CR3E2_RUN17_ELITE1_PRELUDE7_GENERATED_SYNTAX=PASS");
console.log("CR3E2_RUN17_ELITE1_PRELUDE7_SOURCE=UNCHANGED_DIRECT_RUN17_CONTROL");
console.log("CR3E2_RUN17_ELITE1_PRELUDE7_ONLY_CHANGE=FIRST_7_ELITE_I_ACTIONS_USE_BASELINE_NATURAL_SURVIVAL_LANE");
console.log("CR3E2_RUN17_ELITE1_PRELUDE7_STOP=AFTER_NEXT_EXISTING_OBSERVATION_FOLLOWING_HOLD_7");
console.log("CR3E2_RUN17_ELITE1_PRELUDE7_HOLD_MS=BASELINE_STAGE1_420");
console.log("CR3E2_RUN17_ELITE1_PRELUDE7_MOVE_TICK=GLOBAL_BASELINE_INCREMENT");
console.log("CR3E2_RUN17_ELITE1_PRELUDE7_SHIFT_CADENCE=BASELINE_MODULO_7_ONE_SHIFT_PER_7_HOLDS");
console.log("CR3E2_RUN17_ELITE1_PRELUDE7_READS=EXISTING_LOOP_AND_SHIFT_READS_ONLY");
console.log("CR3E2_RUN17_ELITE1_PRELUDE7_ELITE_COMBAT=NOT_ENTERED_IN_DIAGNOSTIC_TRANCHE");
console.log("CR3E2_RUN17_ELITE1_PRELUDE7_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(pathToFileURL(generatedPath).href + "?v=" + Date.now());
} finally {
  rmSync(generatedPath, { force: true });
}
