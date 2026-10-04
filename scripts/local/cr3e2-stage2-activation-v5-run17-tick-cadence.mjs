import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const sourcePath = resolve("scripts/local/cr3e2-stage2-activation-v4-literal-handoff.mjs");
const generatedWrapperPath = resolve("scripts/local/.cr3e2-stage2-activation-v5-run17-tick-cadence.wrapper.mjs");
let source = await readFile(sourcePath, "utf8");

function replaceRegexOnce(input, pattern, replacement, label) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const matches = [...input.matchAll(new RegExp(pattern.source, flags))];
  assert.equal(matches.length, 1, `${label}: reviewed source fragment must match exactly once; matches=${matches.length}`);
  return input.replace(pattern, replacement);
}

source = replaceRegexOnce(
  source,
  /const runnerPath = resolve\("scripts\/local\/\.cr3e2-stage2-activation-v4-literal-handoff\.runner\.mjs"\);/,
  'const runnerPath = resolve("scripts/local/.cr3e2-stage2-activation-v5-run17-tick-cadence.runner.mjs");',
  "V5 runner path",
);

source = replaceRegexOnce(
  source,
  /      let stage2LastShiftAt = state\.elapsed;\\n      let stage2MoveTick = 0;/,
  "      let stage2MoveTick = 0;",
  "remove fixed Stage-II elapsed cadence state",
);

const run17CadenceReplacement = [
  "        const pressureShift = state.activeEnemies >= 32 || state.hp <= 25;",
  "        const stage2ShiftModulo = pressureShift ? 5 : 7;",
  "        const moved = await moveStage2OuterLane(page, canvas, state, stage2MoveTick, trial);",
  "        stage2MoveTick += 1;",
  "        if (!moved) break;",
  "        state = moved;",
  "        await page.waitForTimeout(STAGE2_SETTLE_MS);",
  "",
  "        if (stage2MoveTick % stage2ShiftModulo === 0) {",
  "          const shifted = await acknowledgedPointerShiftStage2(page, canvas, state, trial);",
  "          if (!shifted) break;",
  "          state = shifted;",
  "        }",
].join("\\n");

source = replaceRegexOnce(
  source,
  /        if \(state\.elapsed - stage2LastShiftAt >= STAGE2_SHIFT_INTERVAL_MS\) \{\\n[\s\S]*?        await page\.waitForTimeout\(STAGE2_SETTLE_MS\);/,
  run17CadenceReplacement,
  "Run-17 Stage-II movement-tick cadence",
);

source = source.replaceAll("CR3E2_STAGE2_V4_", "CR3E2_STAGE2_V5_");
source = source.replace(
  'console.log("CR3E2_STAGE2_V5_STAGE2_SHIFT_INTERVAL_MS=5400");',
  'console.log("CR3E2_STAGE2_V5_STAGE2_SHIFT_CADENCE=NORMAL_MODULO_7_PRESSURE_MODULO_5");\nconsole.log("CR3E2_STAGE2_V5_STAGE2_PRESSURE=ACTIVE_ENEMIES_GTE_32_OR_HP_LTE_25");',
);

await writeFile(generatedWrapperPath, source, "utf8");
console.log("CR3E2_STAGE2_V5_RUN17_TICK_WRAPPER=PASS");
console.log("CR3E2_STAGE2_V5_PRE_STAGE2_SOURCE=V4_LITERAL_PROVEN_HANDOFF");
console.log("CR3E2_STAGE2_V5_CADENCE_SOURCE=RUN17_MOVE_TICK");
console.log("CR3E2_STAGE2_V5_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(`${pathToFileURL(generatedWrapperPath).href}?v=${Date.now()}`);
} finally {
  await unlink(generatedWrapperPath).catch(() => {});
}
