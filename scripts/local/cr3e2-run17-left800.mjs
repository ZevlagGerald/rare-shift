import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const sourcePath = resolve("scripts/local/cr3e2-run17-direct-control.mjs");
const generatedPath = resolve("scripts/local/.cr3e2-run17-left800.runner.mjs");
const trials = Number(process.env.CR3E2_RUN17_LEFT800_TRIALS ?? "10");

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

source = replaceOnce(
  source,
  'const TRIALS = Number(process.env.CR3E2_RUN17_CONTROL_TRIALS ?? "3");',
  `const TRIALS = ${trials};`,
  "trial count",
);

const baselineMovement = [
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

const left800Movement = [
  'async function moveNaturalSurvivalLane(canvas, state, tick) {',
  '  const x = state.x;',
  '  const y = state.y;',
  '  const postStageOne = state.stage !== "STAGE_I";',
  '  const leftX = postStageOne ? 800 : 300;',
  '  let key;',
  '  if (y < 250 && x < 1500) key = "ArrowRight";',
  '  else if (x >= 1500 && y < 950) key = "ArrowDown";',
  '  else if (y >= 950 && x > leftX) key = "ArrowLeft";',
  '  else if (x <= leftX && y > 250) key = "ArrowUp";',
  '  else key = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"][Math.floor(tick / 10) % 4];',
  '  await canvas.press(key, { delay: postStageOne ? 520 : 420, timeout: 2_500 });',
  '  const pressureShift = postStageOne && (state.activeEnemies >= 32 || state.hp <= 25);',
  '  return { settle: postStageOne ? 80 : 0, shiftModulo: pressureShift ? 5 : 7 };',
  '}',
].join("\n");

source = replaceOnce(source, baselineMovement, left800Movement, "Stage-II left boundary geometry");

writeFileSync(generatedPath, source, "utf8");

const syntax = spawnSync(process.execPath, ["--check", generatedPath], { encoding: "utf8" });
if (syntax.stdout) process.stdout.write(syntax.stdout);
if (syntax.stderr) process.stderr.write(syntax.stderr);
assert.equal(syntax.status, 0, "generated left-800 runner syntax check failed");

console.log("CR3E2_RUN17_LEFT800_WRAPPER=PASS");
console.log("CR3E2_RUN17_LEFT800_GENERATED_SYNTAX=PASS");
console.log("CR3E2_RUN17_LEFT800_SOURCE=UNCHANGED_DIRECT_RUN17_CONTROL");
console.log("CR3E2_RUN17_LEFT800_ONLY_CHANGE=POST_STAGE1_LEFT_ROUTE_X_300_TO_800");
console.log("CR3E2_RUN17_LEFT800_BOTTOM_LEFT_BOUNDARY_X=800");
console.log("CR3E2_RUN17_LEFT800_LEFT_UP_BOUNDARY_X=800");
console.log("CR3E2_RUN17_LEFT800_STAGE1_LEFT_X=300_UNCHANGED");
console.log("CR3E2_RUN17_LEFT800_TOP_Y=250_UNCHANGED");
console.log("CR3E2_RUN17_LEFT800_BOTTOM_Y=950_UNCHANGED");
console.log("CR3E2_RUN17_LEFT800_RIGHT_X=1500_UNCHANGED");
console.log("CR3E2_RUN17_LEFT800_STAGE2_HOLD_MS=520_UNCHANGED");
console.log("CR3E2_RUN17_LEFT800_STAGE1_HOLD_MS=420_UNCHANGED");
console.log("CR3E2_RUN17_LEFT800_REFRACT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_LEFT800_PRESSURE_SHIFT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_LEFT800_DRAFT_PRIORITY=UNCHANGED");
console.log("CR3E2_RUN17_LEFT800_MOVE_TICK_CADENCE=UNCHANGED_PER_ACTION");
console.log("CR3E2_RUN17_LEFT800_ELITE_COMBAT=UNCHANGED");
console.log("CR3E2_RUN17_LEFT800_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(`${pathToFileURL(generatedPath).href}?v=${Date.now()}`);
} finally {
  rmSync(generatedPath, { force: true });
}
