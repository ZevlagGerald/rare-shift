import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const sourcePath = resolve("scripts/local/cr3e2-run17-direct-control.mjs");
const generatedPath = resolve("scripts/local/.cr3e2-run17-l6-delta.runner.mjs");
const trials = Number(process.env.CR3E2_RUN17_L6_DELTA_TRIALS ?? "10");

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

source = replaceOnce(
  source,
  'const TRIALS = Number(process.env.CR3E2_RUN17_CONTROL_TRIALS ?? "3");',
  `const TRIALS = ${trials};`,
  "trial count",
);

const priorityAnchor = "  const pressureDraft = state.level >= 5 && (state.hp <= 60 || state.activeEnemies >= 32);\n";
const l6DeltaOverride = [
  "  const forceL6Delta = state.level === 6",
  '    && !state.draftIds.includes("FIELD_REPAIR")',
  '    && state.draftIds.includes("DELTA_RANK")',
  '    && state.draftIds.includes("PROTOCOL_ORBIT_STABILIZER");',
  "  if (forceL6Delta) {",
  '    const deltaIndex = state.draftIds.indexOf("DELTA_RANK");',
  '    console.log(`CR3E2_RUN17_L6_DELTA_T${trial}=L${state.level}:HP${state.hp}:${state.draftIds.join(",")}=>DELTA_RANK`);',
  "    await clickDraft(canvas, deltaIndex, state.draftCount);",
  "    await page.waitForTimeout(90);",
  "    return;",
  "  }",
  "",
  priorityAnchor,
].join("\n");

source = replaceOnce(source, priorityAnchor, l6DeltaOverride, "L6 DELTA override insertion");

writeFileSync(generatedPath, source, "utf8");

const syntax = spawnSync(process.execPath, ["--check", generatedPath], { encoding: "utf8" });
if (syntax.stdout) process.stdout.write(syntax.stdout);
if (syntax.stderr) process.stderr.write(syntax.stderr);
assert.equal(syntax.status, 0, "generated L6 DELTA runner syntax check failed");

console.log("CR3E2_RUN17_L6_DELTA_WRAPPER=PASS");
console.log("CR3E2_RUN17_L6_DELTA_GENERATED_SYNTAX=PASS");
console.log("CR3E2_RUN17_L6_DELTA_ONLY_CHANGE=L6_DELTA_OVER_ORBIT_STABILIZER_WHEN_BOTH_PRESENT");
console.log("CR3E2_RUN17_L6_DELTA_FIELD_REPAIR=REMAINS_FIRST");
console.log("CR3E2_RUN17_L6_DELTA_REFRACT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_L6_DELTA_PRESSURE_SHIFT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_L6_DELTA_MOVEMENT=UNCHANGED");
console.log("CR3E2_RUN17_L6_DELTA_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(`${pathToFileURL(generatedPath).href}?v=${Date.now()}`);
} finally {
  rmSync(generatedPath, { force: true });
}
