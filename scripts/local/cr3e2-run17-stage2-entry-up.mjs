import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const sourcePath = resolve("scripts/local/cr3e2-run17-direct-control.mjs");
const generatedPath = resolve("scripts/local/.cr3e2-run17-stage2-entry-up.runner.mjs");
const trials = Number(process.env.CR3E2_RUN17_ENTRY_UP_TRIALS ?? "10");

function replaceOnce(source, needle, replacement, label) {
  const first = source.indexOf(needle);
  assert.ok(first >= 0, label + ": reviewed source fragment not found");
  assert.equal(source.indexOf(needle, first + needle.length), -1, label + ": reviewed source fragment not unique");
  return source.slice(0, first) + replacement + source.slice(first + needle.length);
}

let source = readFileSync(sourcePath, "utf8").replace(/\r\n/g, "\n");

assert.ok(source.includes("&& state.hp <= 25\n    && state.cr2DraftActive"), "baseline critical REFRACT HP25 policy missing");
assert.ok(source.includes("const pressureShift = postStageOne && (state.activeEnemies >= 32 || state.hp <= 25);"), "baseline pressure SHIFT HP25 policy missing");
assert.ok(source.includes('if (y < 250 && x < 1500) key = "ArrowRight";'), "baseline top boundary missing");
assert.ok(source.includes('else if (x >= 1500 && y < 950) key = "ArrowDown";'), "baseline right/bottom boundary missing");
assert.ok(source.includes('else if (y >= 950 && x > 300) key = "ArrowLeft";'), "baseline bottom/left boundary missing");
assert.ok(source.includes('else if (x <= 300 && y > 250) key = "ArrowUp";'), "baseline left/top boundary missing");
assert.ok(source.includes('await canvas.press(key, { delay: postStageOne ? 520 : 420, timeout: 2_500 });'), "baseline 520/420 hold duration missing");
assert.ok(!source.includes("state.hp <= 35"), "rejected HP35 policy leaked into baseline source");
assert.ok(!source.includes("CR3E2_RUN17_L6_DELTA_T"), "rejected L6 DELTA override leaked into baseline source");
assert.ok(!source.includes("horizontalStageTwo"), "rejected horizontal-260 movement leaked into baseline source");
assert.ok(!source.includes("bottomY = postStageOne ? 850 : 950"), "rejected bottom-850 geometry leaked into baseline source");
assert.ok(!source.includes("leftX = postStageOne ? 800 : 300"), "rejected left-800 geometry leaked into baseline source");

source = replaceOnce(
  source,
  'const TRIALS = Number(process.env.CR3E2_RUN17_CONTROL_TRIALS ?? "3");',
  "const TRIALS = " + trials + ";",
  "trial count",
);

const varsAnchor = "      const wallDeadline = Date.now() + 220_000;\n\n";
const entryState = [
  "      let stageTwoEntryAligned = false;",
  "      let stageTwoEntryStarted = false;",
  "      let stageTwoEntryHolds = 0;",
  "      let stageTwoEntryStartState = null;",
  "",
  "      const entryCompact = state => ({",
  "        elapsed: state.elapsed, progress: state.progress, hp: state.hp, level: state.level,",
  "        shifts: state.shifts, phase: state.phase, x: Math.round(state.x), y: Math.round(state.y),",
  "        activeEnemies: state.activeEnemies, moveTick, checkpointTick,",
  "      });",
  "",
].join("\n");
source = replaceOnce(source, varsAnchor, varsAnchor + entryState, "Stage-II entry state insertion");

const normalOld = [
  "        } else {",
  "          const movement = await moveNaturalSurvivalLane(canvas, state, moveTick);",
  "          moveTick += 1;",
  "          await page.waitForTimeout(movement.settle);",
  "          if (moveTick % movement.shiftModulo === 0) await shiftAndObserve();",
  "          await page.waitForTimeout(45);",
  "        }",
].join("\n");

const normalNew = [
  "        } else {",
  '          const stageTwoEntryEligible = state.stage === "STAGE_II"',
  '            && state.gatePhase === "RUNNING"',
  "            && Array.isArray(state.gateResolved)",
  '            && state.gateResolved.includes("ELITE_I");',
  "",
  "          if (stageTwoEntryEligible && !stageTwoEntryAligned) {",
  "            if (!stageTwoEntryStarted) {",
  "              stageTwoEntryStarted = true;",
  "              stageTwoEntryStartState = entryCompact(state);",
  '              console.log("CR3E2_RUN17_ENTRY_UP_START_T" + trial + "=" + JSON.stringify(stageTwoEntryStartState));',
  "            }",
  "",
  "            if (state.y < 250) {",
  "              stageTwoEntryAligned = true;",
  '              console.log("CR3E2_RUN17_ENTRY_UP_COMPLETE_T" + trial + "=" + JSON.stringify({',
  "                holds: stageTwoEntryHolds, start: stageTwoEntryStartState, end: entryCompact(state),",
  "              }));",
  "            } else {",
  "              const entryTick = moveTick;",
  "              const pressureShift = state.activeEnemies >= 32 || state.hp <= 25;",
  "              const shiftModulo = pressureShift ? 5 : 7;",
  '              await canvas.press("ArrowUp", { delay: 520, timeout: 2_500 });',
  "              moveTick += 1;",
  "              stageTwoEntryHolds += 1;",
  "              await page.waitForTimeout(80);",
  "              if (moveTick % shiftModulo === 0) await shiftAndObserve();",
  "              await page.waitForTimeout(45);",
  '              console.log("CR3E2_RUN17_ENTRY_UP_HOLD_T" + trial + "_" + stageTwoEntryHolds + "=" + JSON.stringify({',
  "                tick: entryTick, startProgress: state.progress, startHp: state.hp,",
  "                startX: Math.round(state.x), startY: Math.round(state.y),",
  "                startActiveEnemies: state.activeEnemies, pressureShift, shiftModulo,",
  "              }));",
  "              continue;",
  "            }",
  "          }",
  "",
  "          const movement = await moveNaturalSurvivalLane(canvas, state, moveTick);",
  "          moveTick += 1;",
  "          await page.waitForTimeout(movement.settle);",
  "          if (moveTick % movement.shiftModulo === 0) await shiftAndObserve();",
  "          await page.waitForTimeout(45);",
  "        }",
].join("\n");

source = replaceOnce(source, normalOld, normalNew, "one-time Stage-II entry realignment");

const checkpointAnchor = "          const final = compact({ ...state, moveTick, checkpointTick });\n";
const checkpointReplacement = [
  '          assert.ok(stageTwoEntryStarted, "trial " + trial + " Stage-II entry realignment never started");',
  '          assert.ok(stageTwoEntryAligned, "trial " + trial + " Stage-II entry realignment never completed");',
  '          console.log("CR3E2_RUN17_ENTRY_UP_RESULT_T" + trial + "=" + JSON.stringify({',
  "            holds: stageTwoEntryHolds, start: stageTwoEntryStartState, checkpoint: entryCompact(state),",
  "          }));",
  "          const final = compact({ ...state, moveTick, checkpointTick });",
  "",
].join("\n");
source = replaceOnce(source, checkpointAnchor, checkpointReplacement, "entry realignment checkpoint proof");

writeFileSync(generatedPath, source, "utf8");

const syntax = spawnSync(process.execPath, ["--check", generatedPath], { encoding: "utf8" });
if (syntax.stdout) process.stdout.write(syntax.stdout);
if (syntax.stderr) process.stderr.write(syntax.stderr);
assert.equal(syntax.status, 0, "generated Stage-II entry-up runner syntax check failed");

console.log("CR3E2_RUN17_ENTRY_UP_WRAPPER=PASS");
console.log("CR3E2_RUN17_ENTRY_UP_GENERATED_SYNTAX=PASS");
console.log("CR3E2_RUN17_ENTRY_UP_SOURCE=UNCHANGED_DIRECT_RUN17_CONTROL");
console.log("CR3E2_RUN17_ENTRY_UP_ONLY_CHANGE=ONE_TIME_STAGE2_ENTRY_ARROWUP_TO_Y_LT_250");
console.log("CR3E2_RUN17_ENTRY_UP_TRIGGER=STAGE2_RUNNING_AFTER_ELITE_I_RESOLVED");
console.log("CR3E2_RUN17_ENTRY_UP_LATCH=ONCE_PER_TRIAL");
console.log("CR3E2_RUN17_ENTRY_UP_HOLD_MS=520_BASELINE_STAGE2");
console.log("CR3E2_RUN17_ENTRY_UP_SETTLE_MS=80_BASELINE_STAGE2");
console.log("CR3E2_RUN17_ENTRY_UP_POST_WAIT_MS=45_BASELINE");
console.log("CR3E2_RUN17_ENTRY_UP_MOVE_TICK=INCREMENTS_ON_EACH_REALIGNMENT_HOLD");
console.log("CR3E2_RUN17_ENTRY_UP_SHIFT_CADENCE=BASELINE_7_OR_PRESSURE_5_PER_MOVE_TICK");
console.log("CR3E2_RUN17_ENTRY_UP_AFTER_LATCH=EXACT_BASELINE_RECTANGLE");
console.log("CR3E2_RUN17_ENTRY_UP_STAGE1=UNCHANGED");
console.log("CR3E2_RUN17_ENTRY_UP_REFRACT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_ENTRY_UP_PRESSURE_SHIFT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_ENTRY_UP_DRAFT_PRIORITY=UNCHANGED");
console.log("CR3E2_RUN17_ENTRY_UP_ELITE_COMBAT=UNCHANGED");
console.log("CR3E2_RUN17_ENTRY_UP_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(pathToFileURL(generatedPath).href + "?v=" + Date.now());
} finally {
  rmSync(generatedPath, { force: true });
}
