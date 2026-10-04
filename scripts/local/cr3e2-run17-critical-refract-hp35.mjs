import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = resolve("scripts/local/cr3e2-run17-direct-control.mjs");
const generatedPath = resolve("scripts/local/.cr3e2-run17-critical-refract-hp35.runner.mjs");
let source = (await readFile(sourcePath, "utf8")).replaceAll("\r\n", "\n");

function replaceOnce(input, needle, replacement, label) {
  const first = input.indexOf(needle);
  assert.ok(first >= 0, `${label}: reviewed source fragment not found`);
  assert.equal(input.indexOf(needle, first + needle.length), -1, `${label}: reviewed source fragment is not unique`);
  return input.slice(0, first) + replacement + input.slice(first + needle.length);
}

const baselinePressureShift = '  const pressureShift = postStageOne && (state.activeEnemies >= 32 || state.hp <= 25);';
assert.ok(source.includes(baselinePressureShift), "baseline pressure-SHIFT HP<=25 predicate missing");

source = replaceOnce(
  source,
  'const TRIALS = Number(process.env.CR3E2_RUN17_CONTROL_TRIALS ?? "3");',
  'const TRIALS = Number(process.env.CR3E2_RUN17_REFRACT35_TRIALS ?? "10");',
  "REFRACT35 trial env",
);

source = replaceOnce(
  source,
  '  const criticalRefract = state.level >= 5\n    && state.hp <= 25\n    && state.cr2DraftActive\n    && state.refracts > 0\n    && !state.draftIds.includes("FIELD_REPAIR");',
  '  const criticalRefract = state.level >= 5\n    && state.hp <= 35\n    && state.cr2DraftActive\n    && state.refracts > 0\n    && !state.draftIds.includes("FIELD_REPAIR");',
  "critical REFRACT HP threshold",
);

assert.ok(source.includes(baselinePressureShift), "pressure-SHIFT policy changed unexpectedly");
assert.ok(!source.includes('const pressureShift = postStageOne && (state.activeEnemies >= 32 || state.hp <= 35);'), "rejected HP35 pressure-SHIFT policy leaked into REFRACT35 experiment");

await writeFile(generatedPath, source, "utf8");
execFileSync(process.execPath, ["--check", generatedPath], { stdio: "inherit" });

console.log("CR3E2_RUN17_REFRACT35_WRAPPER=PASS");
console.log("CR3E2_RUN17_REFRACT35_GENERATED_SYNTAX=PASS");
console.log("CR3E2_RUN17_REFRACT35_SOURCE=PROVEN_DIRECT_RUN17_CONTROL");
console.log("CR3E2_RUN17_REFRACT35_ONLY_CHANGE=CRITICAL_REFRACT_HP_THRESHOLD_25_TO_35");
console.log("CR3E2_RUN17_REFRACT35_PRESSURE_SHIFT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_REFRACT35_DRAFT_PRIORITY=UNCHANGED");
console.log("CR3E2_RUN17_REFRACT35_MOVEMENT=UNCHANGED");
console.log("CR3E2_RUN17_REFRACT35_CHECKPOINT_COMBAT_POLICY=UNCHANGED");
console.log("CR3E2_RUN17_REFRACT35_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(`${pathToFileURL(generatedPath).href}?v=${Date.now()}`);
} finally {
  await unlink(generatedPath).catch(() => {});
}
