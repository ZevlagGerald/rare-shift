import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const sourcePath = resolve("scripts/local/cr3e2-run17-direct-control.mjs");
const generatedPath = resolve("scripts/local/.cr3e2-run17-horizontal-260.runner.mjs");
const trials = Number(process.env.CR3E2_RUN17_HORIZONTAL260_TRIALS ?? "10");

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

const horizontal260Movement = [
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
  '  const horizontalStageTwo = postStageOne && (key === "ArrowRight" || key === "ArrowLeft");',
  '  const holdMs = postStageOne ? (horizontalStageTwo ? 260 : 520) : 420;',
  '  await canvas.press(key, { delay: holdMs, timeout: 2_500 });',
  '  const pressureShift = postStageOne && (state.activeEnemies >= 32 || state.hp <= 25);',
  '  return { settle: postStageOne ? 80 : 0, shiftModulo: pressureShift ? 5 : 7 };',
  '}',
].join("\n");

source = replaceOnce(source, baselineMovement, horizontal260Movement, "horizontal Stage-II hold duration");

writeFileSync(generatedPath, source, "utf8");

const syntax = spawnSync(process.execPath, ["--check", generatedPath], { encoding: "utf8" });
if (syntax.stdout) process.stdout.write(syntax.stdout);
if (syntax.stderr) process.stderr.write(syntax.stderr);
assert.equal(syntax.status, 0, "generated horizontal-260 runner syntax check failed");

console.log("CR3E2_RUN17_HORIZONTAL260_WRAPPER=PASS");
console.log("CR3E2_RUN17_HORIZONTAL260_GENERATED_SYNTAX=PASS");
console.log("CR3E2_RUN17_HORIZONTAL260_SOURCE=UNCHANGED_DIRECT_RUN17_CONTROL");
console.log("CR3E2_RUN17_HORIZONTAL260_ONLY_CHANGE=STAGE2_HORIZONTAL_HOLD_520_TO_260");
console.log("CR3E2_RUN17_HORIZONTAL260_TOP_ARROW_RIGHT_MS=260");
console.log("CR3E2_RUN17_HORIZONTAL260_BOTTOM_ARROW_LEFT_MS=260");
console.log("CR3E2_RUN17_HORIZONTAL260_VERTICAL_MS=520_UNCHANGED");
console.log("CR3E2_RUN17_HORIZONTAL260_STAGE1_MS=420_UNCHANGED");
console.log("CR3E2_RUN17_HORIZONTAL260_REFRACT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_HORIZONTAL260_PRESSURE_SHIFT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_HORIZONTAL260_DRAFT_PRIORITY=UNCHANGED");
console.log("CR3E2_RUN17_HORIZONTAL260_ROUTE_PREDICATES=UNCHANGED");
console.log("CR3E2_RUN17_HORIZONTAL260_ELITE_COMBAT=UNCHANGED");
console.log("CR3E2_RUN17_HORIZONTAL260_COUPLING_NOTE=MOVE_TICK_ADVANCES_FASTER_PER_GAME_TIME_ON_HORIZONTAL_LEGS");
console.log("CR3E2_RUN17_HORIZONTAL260_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(`${pathToFileURL(generatedPath).href}?v=${Date.now()}`);
} finally {
  rmSync(generatedPath, { force: true });
}
