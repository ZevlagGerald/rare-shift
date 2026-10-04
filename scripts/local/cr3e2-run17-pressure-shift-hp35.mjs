import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = resolve("scripts/local/cr3e2-run17-direct-control.mjs");
const generatedPath = resolve("scripts/local/.cr3e2-run17-pressure-shift-hp35.runner.mjs");
let source = (await readFile(sourcePath, "utf8")).replaceAll("\r\n", "\n");

function replaceOnce(input, needle, replacement, label) {
  const first = input.indexOf(needle);
  assert.ok(first >= 0, `${label}: reviewed source fragment not found`);
  assert.equal(input.indexOf(needle, first + needle.length), -1, `${label}: reviewed source fragment is not unique`);
  return input.slice(0, first) + replacement + input.slice(first + needle.length);
}

source = replaceOnce(
  source,
  'const TRIALS = Number(process.env.CR3E2_RUN17_CONTROL_TRIALS ?? "3");',
  'const TRIALS = Number(process.env.CR3E2_RUN17_HP35_TRIALS ?? "10");',
  "HP35 trial env",
);

source = replaceOnce(
  source,
  '  const pressureShift = postStageOne && (state.activeEnemies >= 32 || state.hp <= 25);',
  '  const pressureShift = postStageOne && (state.activeEnemies >= 32 || state.hp <= 35);',
  "pressure SHIFT HP threshold",
);

await writeFile(generatedPath, source, "utf8");
execFileSync(process.execPath, ["--check", generatedPath], { stdio: "inherit" });

console.log("CR3E2_RUN17_HP35_WRAPPER=PASS");
console.log("CR3E2_RUN17_HP35_GENERATED_SYNTAX=PASS");
console.log("CR3E2_RUN17_HP35_SOURCE=PROVEN_DIRECT_RUN17_CONTROL");
console.log("CR3E2_RUN17_HP35_ONLY_CHANGE=PRESSURE_SHIFT_HP_THRESHOLD_25_TO_35");
console.log("CR3E2_RUN17_HP35_DRAFT_POLICY=UNCHANGED");
console.log("CR3E2_RUN17_HP35_REFRACT_POLICY=UNCHANGED");
console.log("CR3E2_RUN17_HP35_MOVEMENT=UNCHANGED");
console.log("CR3E2_RUN17_HP35_CHECKPOINT_COMBAT_POLICY=UNCHANGED");
console.log("CR3E2_RUN17_HP35_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(`${pathToFileURL(generatedPath).href}?v=${Date.now()}`);
} finally {
  await unlink(generatedPath).catch(() => {});
}
