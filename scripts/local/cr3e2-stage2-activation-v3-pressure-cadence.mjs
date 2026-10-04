import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const sourcePath = resolve("scripts/local/cr3e2-stage2-activation-v3.mjs");
const runnerPath = resolve("scripts/local/.cr3e2-stage2-activation-v3-pressure-cadence.runner.mjs");
let source = await readFile(sourcePath, "utf8");

const marker = "source = prefix + tail;";
const markerAt = source.indexOf(marker);
assert.ok(markerAt >= 0, "Stage-II V3 final-source marker not found");
assert.equal(source.indexOf(marker, markerAt + marker.length), -1, "Stage-II V3 final-source marker is not unique");
const insertAt = markerAt + marker.length;

const injection = String.raw`

source = replaceRegexOnce(
  source,
  /          if \(!moved\) break;\r?\n          state = moved;\r?\n\r?\n          if \(huntTick % 6 === 0 && state\.gatePhase === "ELITE_ACTIVE"\) \{/,
  "          if (!moved) break;\n          state = moved;\n\n          if (state.draftOpen) {\n            await chooseDraft(page, canvas, state, trial);\n            continue;\n          }\n\n          if (huntTick % 6 === 0 && state.gatePhase === \"ELITE_ACTIVE\") {",
  "ELITE_I post-move draft guard",
);

source = replaceRegexOnce(
  source,
  /  let after = await attempt\(\);\r?\n  if \(!after\) return null;\r?\n  if \(after\.shifts === before\.shifts\) \{\r?\n    console\.log\([^\r\n]*CR3E2_POINTER_SHIFT_RETRY[^\r\n]*\);\r?\n    await page\.waitForTimeout\(40\);\r?\n    after = await attempt\(\);\r?\n  \}/,
  "  let after = await attempt();\n  if (!after) return null;\n  if (after.shifts === before.shifts) {\n    console.log(\"CR3E2_POINTER_SHIFT_RETRY_T\" + trial + \"=BEFORE_\" + before.shifts);\n    await page.waitForTimeout(40);\n    let retryState = await readState(canvas);\n    if (!retryState) return null;\n    let draftRaceCount = 0;\n    while (retryState.draftOpen && draftRaceCount < 6) {\n      console.log(\"CR3E2_POINTER_SHIFT_DRAFT_RACE_T\" + trial + \"=L\" + retryState.level + \":HP\" + retryState.hp + \":SHIFT\" + retryState.shifts);\n      assert.equal(retryState.shifts, before.shifts, \"trial \" + trial + \" draft race must not alter SHIFT count\");\n      await chooseDraft(page, canvas, retryState, trial);\n      await page.waitForTimeout(75);\n      retryState = await readState(canvas);\n      if (!retryState) return null;\n      draftRaceCount += 1;\n    }\n    assert.equal(retryState.draftOpen, false, \"trial \" + trial + \" pointer SHIFT retry blocked by unresolved draft\");\n    assert.equal(retryState.shifts, before.shifts, \"trial \" + trial + \" pre-retry SHIFT count drift\");\n    await canvas.focus().catch(() => {});\n    after = await attempt();\n  }",
  "pointer SHIFT draft-race retry",
);

source = replaceRegexOnce(
  source,
  /function shouldShiftStage2\(state, lastShiftAt\) \{\r?\n  return state\.elapsed - lastShiftAt >= STAGE2_SHIFT_INTERVAL_MS;\r?\n\}/,
  "function shouldShiftStage2(state, stage2MoveTick) {\n  const pressureShift = state.activeEnemies >= 32 || state.hp <= 25;\n  const shiftModulo = pressureShift ? 5 : 7;\n  return stage2MoveTick > 0 && stage2MoveTick % shiftModulo === 0;\n}",
  "Run-17 Stage-II pressure SHIFT cadence",
);

source = replaceExactOnce(
  source,
  "        if (shouldShiftStage2(state, lastShiftAt)) {",
  "        if (shouldShiftStage2(state, stage2MoveTick)) {",
  "Run-17 Stage-II pressure SHIFT callsite",
);
`;

source = source.slice(0, insertAt) + injection + source.slice(insertAt);

const oldLog = 'console.log("CR3E2_STAGE2_V3_SHIFT_INTERVAL_MS=5400");';
const newLog = 'console.log("CR3E2_STAGE2_V3_SHIFT_CADENCE=RUN17_MODULO_7_PRESSURE_5");';
const logAt = source.indexOf(oldLog);
assert.ok(logAt >= 0, "Stage-II V3 shift diagnostic marker not found");
assert.equal(source.indexOf(oldLog, logAt + oldLog.length), -1, "Stage-II V3 shift diagnostic marker is not unique");
source = source.slice(0, logAt) + newLog + source.slice(logAt + oldLog.length);

await writeFile(runnerPath, source, "utf8");
console.log("CR3E2_STAGE2_V3_ELITE_DRAFT_GUARD=PASS");
console.log("CR3E2_STAGE2_V3_POINTER_DRAFT_RACE_GUARD=PASS");
console.log("CR3E2_STAGE2_V3_PRESSURE_CADENCE=RUN17_MODULO_7_PRESSURE_5");
console.log("CR3E2_STAGE2_V3_PRESSURE_RULE=ACTIVE_ENEMIES_GTE_32_OR_HP_LTE_25");
console.log("CR3E2_STAGE2_V3_GUARD_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(`${pathToFileURL(runnerPath).href}?v=${Date.now()}`);
} finally {
  await unlink(runnerPath).catch(() => {});
}
