import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = resolve("scripts/local/cr3e2-run17-direct-control.mjs");
const generatedPath = resolve("scripts/local/.cr3e2-run17-checkpoint-elite-stage3.runner.mjs");
let source = await readFile(sourcePath, "utf8");

function replaceOnce(input, needle, replacement, label) {
  const first = input.indexOf(needle);
  assert.ok(first >= 0, `${label}: reviewed source fragment not found`);
  assert.equal(input.indexOf(needle, first + needle.length), -1, `${label}: reviewed source fragment is not unique`);
  return input.slice(0, first) + replacement + input.slice(first + needle.length);
}

function replaceRegexOnce(input, pattern, replacement, label) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const matches = [...input.matchAll(new RegExp(pattern.source, flags))];
  assert.equal(matches.length, 1, `${label}: reviewed source fragment must match exactly once; matches=${matches.length}`);
  return input.replace(pattern, replacement);
}

source = replaceOnce(
  source,
  'const TRIALS = Number(process.env.CR3E2_RUN17_CONTROL_TRIALS ?? "3");',
  'const TRIALS = Number(process.env.CR3E2_RUN17_STAGE3_TRIALS ?? "3");',
  "Stage-III trial env",
);

source = replaceOnce(
  source,
  "    bossPending: state.bossPending,\n    moveTick: state.moveTick,",
  "    bossPending: state.bossPending,\n    bossActive: state.bossActive,\n    gateResolvedCount: state.gateResolvedCount,\n    moveTick: state.moveTick,",
  "compact checkpoint diagnostics",
);

source = replaceOnce(
  source,
  "    timeout: 260_000,",
  "    timeout: 380_000,",
  "Stage-III test timeout",
);

source = replaceOnce(
  source,
  "      let minHp = Number.POSITIVE_INFINITY;\n      let runningProgress = 0;",
  "      let minHp = Number.POSITIVE_INFINITY;\n      let checkpointEliteActivated = false;\n      let checkpointEliteEntry = null;\n      let runningProgress = 0;",
  "checkpoint activation state",
);

source = replaceOnce(
  source,
  "      const wallDeadline = Date.now() + 220_000;",
  "      const wallDeadline = Date.now() + 330_000;",
  "Stage-III wall deadline",
);

const checkpointContinuation = `        if (state.gateActive === "CHECKPOINT_ELITE" && !checkpointEliteActivated) {
          const entry = compact({ ...state, moveTick, checkpointTick });
          console.log(\`CR3E2_RUN17_STAGE3_CHECKPOINT_ENTRY_T\${trial}=\${JSON.stringify(entry)}\`);
          assert.equal(state.progress, TARGET_PROGRESS, \`trial \${trial} CHECKPOINT_ELITE progress boundary\`);
          assert.equal(state.stage, "STAGE_II", \`trial \${trial} CHECKPOINT_ELITE stage boundary\`);
          assert.equal(state.gatePhase, "ELITE_ACTIVE", \`trial \${trial} CHECKPOINT_ELITE phase\`);
          assert.deepEqual(state.gateResolved, ["ELITE_I"], \`trial \${trial} resolved checkpoint prefix\`);
          assert.equal(state.elitesDefeated, 1, \`trial \${trial} exactly one elite defeat before checkpoint\`);
          assert.ok(state.cores >= 1, \`trial \${trial} expected at least one Evolution Core before second checkpoint\`);
          assert.equal(state.bossPending, false, \`trial \${trial} boss must not be pending at second checkpoint\`);
          assert.equal(state.bossActive, false, \`trial \${trial} boss must not be active at second checkpoint\`);
          assert.ok(state.hp > 25, \`trial \${trial} must preserve proven Stage-II HP margin at CHECKPOINT_ELITE; hp=\${state.hp}\`);
          checkpointEliteActivated = true;
          checkpointEliteEntry = entry;
        }

        const stage3Resumed = checkpointEliteActivated
          && state.stage === "STAGE_III"
          && state.progress > TARGET_PROGRESS
          && state.progress < 285_000
          && state.gatePhase === "RUNNING"
          && state.gateActive === ""
          && state.gateResolvedCount === 2
          && state.gateResolved.length === 2
          && state.gateResolved[0] === "ELITE_I"
          && state.gateResolved[1] === "CHECKPOINT_ELITE";

        if (stage3Resumed) {
          const final = compact({ ...state, moveTick, checkpointTick });
          console.log(\`CR3E2_RUN17_STAGE3_RESUME_T\${trial}=\${JSON.stringify(final)}\`);
          assert.equal(state.elitesDefeated, 2, \`trial \${trial} must record exactly two elite defeats at Stage-III resume\`);
          assert.ok(state.cores >= 1, \`trial \${trial} must preserve at least one Evolution Core at Stage-III resume\`);
          assert.equal(state.reservedActive, 0, \`trial \${trial} checkpoint reservation must clear before Stage-III resume\`);
          assert.equal(state.bossPending, false, \`trial \${trial} boss must not be pending at Stage-III resume\`);
          assert.equal(state.bossActive, false, \`trial \${trial} boss must not be active at Stage-III resume\`);
          assert.ok(state.hp > 25, \`trial \${trial} Stage-III resume HP must remain >25; hp=\${state.hp}\`);
          record = {
            trial,
            frameA,
            frameB,
            outcome: "STAGE_III_RESUMED",
            minHp,
            moveTick,
            checkpointTick,
            checkpointEliteEntry,
            final,
          };
          console.log(\`CR3E2_RUN17_STAGE3_RESULT_T\${trial}=\${JSON.stringify(record)}\`);
          return;
        }

        if (state.draftOpen) {`;

source = replaceRegexOnce(
  source,
  /        if \(state\.gateActive === "CHECKPOINT_ELITE"\) \{\r?\n[\s\S]*?          return;\r?\n        \}\r?\n\r?\n        if \(state\.draftOpen\) \{/,
  checkpointContinuation,
  "continue through CHECKPOINT_ELITE to Stage III",
);

source = source.replaceAll(
  "trial ${trial} Run-17 control timed out before CHECKPOINT_ELITE",
  "trial ${trial} Run-17 Stage-III control timed out before Stage III resume after CHECKPOINT_ELITE",
);

source = source.replaceAll("RARE_SHIFT_CR3E2_RUN17_CONTROL", "RARE_SHIFT_CR3E2_RUN17_STAGE3_CONTROL");
source = source.replaceAll("CR3E2_RUN17_DIRECT_CONTROL", "CR3E2_RUN17_STAGE3_CONTROL");
source = source.replaceAll("CR3E2_RUN17_CONTROL", "CR3E2_RUN17_STAGE3");

source = replaceOnce(
  source,
  'console.log("CR3E2_RUN17_STAGE3_CONTROL_STOP=CHECKPOINT_ELITE_AT_180000");',
  'console.log("CR3E2_RUN17_STAGE3_CONTROL_STOP=STAGE_III_RESUME_AFTER_CHECKPOINT_ELITE");\nconsole.log("CR3E2_RUN17_STAGE3_CONTROL_PRESERVE_STAGE2_HP_GT25=YES");',
  "Stage-III stop marker",
);

source = replaceOnce(
  source,
  'const passed = results.filter(result => result.outcome === "CHECKPOINT_ELITE_ACTIVE");',
  'const passed = results.filter(result => result.outcome === "STAGE_III_RESUMED");',
  "Stage-III passed outcome",
);

source = replaceRegexOnce(
  source,
  /const reliable = passed\.length === TRIALS\r?\n  && frameStable\r?\n  && passed\.every\(result =>\r?\n[\s\S]*?\r?\n  \);/,
  `const reliable = passed.length === TRIALS
  && frameStable
  && passed.every(result =>
    (result.checkpointEliteEntry?.hp ?? 0) > 25
    && result.checkpointEliteEntry?.progress === TARGET_PROGRESS
    && result.checkpointEliteEntry?.stage === "STAGE_II"
    && result.checkpointEliteEntry?.gateActive === "CHECKPOINT_ELITE"
    && result.checkpointEliteEntry?.gatePhase === "ELITE_ACTIVE"
    && result.checkpointEliteEntry?.elitesDefeated === 1
    && (result.final?.hp ?? 0) > 25
    && (result.final?.progress ?? 0) > TARGET_PROGRESS
    && (result.final?.progress ?? 0) < 285_000
    && result.final?.stage === "STAGE_III"
    && result.final?.gateActive === ""
    && result.final?.gatePhase === "RUNNING"
    && result.final?.gateResolvedCount === 2
    && result.final?.gateResolved?.length === 2
    && result.final?.gateResolved?.[0] === "ELITE_I"
    && result.final?.gateResolved?.[1] === "CHECKPOINT_ELITE"
    && result.final?.elitesDefeated === 2
    && (result.final?.cores ?? 0) >= 1
    && result.final?.reservedActive === 0
    && result.final?.bossPending === false
    && result.final?.bossActive === false
  );`,
  "Stage-III reliability predicate",
);

source = replaceOnce(
  source,
  "  minHp: passed.length ? Math.min(...passed.map(result => result.minHp)) : 0,\n  finalHp: passed.map(result => result.final?.hp ?? 0),",
  "  minHp: passed.length ? Math.min(...passed.map(result => result.minHp)) : 0,\n  checkpointEntryHp: passed.map(result => result.checkpointEliteEntry?.hp ?? 0),\n  checkpointEntryShifts: passed.map(result => result.checkpointEliteEntry?.shifts ?? 0),\n  finalHp: passed.map(result => result.final?.hp ?? 0),",
  "Stage-III summary checkpoint entry",
);

source = source.replaceAll(
  "Run-17 direct-control reliability gate failed",
  "Run-17 checkpoint-elite to Stage-III reliability gate failed",
);

await writeFile(generatedPath, source, "utf8");
execFileSync(process.execPath, ["--check", generatedPath], { stdio: "inherit" });
console.log("CR3E2_RUN17_STAGE3_WRAPPER=PASS");
console.log("CR3E2_RUN17_STAGE3_GENERATED_SYNTAX=PASS");
console.log("CR3E2_RUN17_STAGE3_SOURCE=PROVEN_DIRECT_RUN17_CONTROL_UNCHANGED_BEFORE_CHECKPOINT");
console.log("CR3E2_RUN17_STAGE3_LATER_GATE=HISTORICAL_THIN_COMBAT_REWARD_CALLER_SEMANTICS");
console.log("CR3E2_RUN17_STAGE3_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(`${pathToFileURL(generatedPath).href}?v=${Date.now()}`);
} finally {
  await unlink(generatedPath).catch(() => {});
}
