import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const sourcePath = resolve("scripts/local/cr3e2-stage2-activation-v4-literal-handoff.mjs");
const generatedWrapperPath = resolve("scripts/local/.cr3e2-stage2-activation-v7-complete-tick.wrapper.mjs");
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
  'const runnerPath = resolve("scripts/local/.cr3e2-stage2-activation-v7-complete-tick.runner.mjs");',
  "V7 runner path",
);

source = replaceRegexOnce(
  source,
  /  else key = \["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"\]\[Math\.floor\(tick \/ 10\) % 4\];/,
  `  else {\n    const nearest = [\n      { distance: Math.abs(y - 250), key: "ArrowRight", edge: "TOP" },\n      { distance: Math.abs(x - 1500), key: "ArrowDown", edge: "RIGHT" },\n      { distance: Math.abs(y - 950), key: "ArrowLeft", edge: "BOTTOM" },\n      { distance: Math.abs(x - 300), key: "ArrowUp", edge: "LEFT" },\n    ].sort((a, b) => a.distance - b.distance || a.edge.localeCompare(b.edge))[0];\n    key = nearest.key;\n  }`,
  "nearest-edge clockwise fallback",
);

source = replaceRegexOnce(
  source,
  /      let stage2LastShiftAt = state\.elapsed;\\n      let stage2MoveTick = 0;/,
  "      let stage2MoveTick = 0;",
  "remove fixed Stage-II elapsed cadence state",
);

const completeTickCadenceReplacement = [
  "        const pressureShift = state.activeEnemies >= 32 || state.hp <= 25;",
  "        const stage2ShiftModulo = pressureShift ? 5 : 7;",
  "        const movementStartElapsed = state.elapsed;",
  "        const moved = await moveStage2OuterLane(page, canvas, state, stage2MoveTick, trial);",
  "        if (!moved) break;",
  "        state = moved;",
  "        if (state.dead || state.hp <= 0) break;",
  "",
  "        if (state.draftOpen) {",
  "          console.log(`CR3E2_STAGE2_LITERAL_INTERRUPTED_TICK_DRAFT_T${trial}=L${state.level}:HP${state.hp}:TICK${stage2MoveTick}`);",
  "          assert.ok(state.elapsed < movementStartElapsed + STAGE2_MOVE_HOLD_MS, `trial ${trial} interrupted Stage-II tick unexpectedly reached full active hold`);",
  "          await chooseDraftStage2(page, canvas, state, trial);",
  "          continue;",
  "        }",
  "",
  "        assert.ok(state.elapsed >= movementStartElapsed + STAGE2_MOVE_HOLD_MS, `trial ${trial} Stage-II movement tick must complete full active hold`);",
  "        stage2MoveTick += 1;",
  "        await page.waitForTimeout(STAGE2_SETTLE_MS);",
  "",
  "        const postSettle = await readState(canvas);",
  "        if (!postSettle) break;",
  "        state = postSettle;",
  "        if (state.dead || state.hp <= 0) break;",
  "",
  "        let postMoveDraftCount = 0;",
  "        while (state.draftOpen && postMoveDraftCount < 6) {",
  "          console.log(`CR3E2_STAGE2_LITERAL_POST_MOVE_DRAFT_T${trial}=L${state.level}:HP${state.hp}:TICK${stage2MoveTick}`);",
  "          await chooseDraftStage2(page, canvas, state, trial);",
  "          await page.waitForTimeout(75);",
  "          state = await readState(canvas);",
  "          if (!state) break;",
  "          postMoveDraftCount += 1;",
  "        }",
  "        if (!state) break;",
  "        assert.equal(state.draftOpen, false, `trial ${trial} Stage-II post-move draft must resolve before scheduled SHIFT`);",
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
  completeTickCadenceReplacement,
  "complete-only Run-17 Stage-II movement-tick cadence",
);

source = source.replaceAll("CR3E2_STAGE2_V4_", "CR3E2_STAGE2_V7_");
source = source.replace(
  'console.log("CR3E2_STAGE2_V7_STAGE2_SHIFT_INTERVAL_MS=5400");',
  'console.log("CR3E2_STAGE2_V7_STAGE2_SHIFT_CADENCE=NORMAL_MODULO_7_PRESSURE_MODULO_5");\nconsole.log("CR3E2_STAGE2_V7_STAGE2_PRESSURE=ACTIVE_ENEMIES_GTE_32_OR_HP_LTE_25");\nconsole.log("CR3E2_STAGE2_V7_ROUTE_FALLBACK=NEAREST_EDGE_CLOCKWISE");\nconsole.log("CR3E2_STAGE2_V7_TICK_COMPLETION=FULL_ACTIVE_HOLD_ONLY");',
);

await writeFile(generatedWrapperPath, source, "utf8");
console.log("CR3E2_STAGE2_V7_COMPLETE_TICK_WRAPPER=PASS");
console.log("CR3E2_STAGE2_V7_PRE_STAGE2_SOURCE=V4_LITERAL_PROVEN_HANDOFF");
console.log("CR3E2_STAGE2_V7_CADENCE_SOURCE=RUN17_MOVE_TICK");
console.log("CR3E2_STAGE2_V7_ROUTE_FALLBACK=NEAREST_EDGE_CLOCKWISE");
console.log("CR3E2_STAGE2_V7_TICK_COMPLETION=FULL_ACTIVE_HOLD_ONLY");
console.log("CR3E2_STAGE2_V7_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(`${pathToFileURL(generatedWrapperPath).href}?v=${Date.now()}`);
} finally {
  await unlink(generatedWrapperPath).catch(() => {});
}
