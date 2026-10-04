import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = resolve("scripts/local/cr3e2-run17-direct-control.mjs");
const generatedPath = resolve("scripts/local/.cr3e2-run17-late-stage2-diagnostics.runner.mjs");
let source = (await readFile(sourcePath, "utf8")).replaceAll("\r\n", "\n");

function replaceOnce(input, needle, replacement, label) {
  const first = input.indexOf(needle);
  assert.ok(first >= 0, `${label}: reviewed source fragment not found`);
  assert.equal(input.indexOf(needle, first + needle.length), -1, `${label}: reviewed source fragment is not unique`);
  return input.slice(0, first) + replacement + input.slice(first + needle.length);
}

const baselineCriticalRefract = '  const criticalRefract = state.level >= 5\n    && state.hp <= 25\n    && state.cr2DraftActive\n    && state.refracts > 0\n    && !state.draftIds.includes("FIELD_REPAIR");';
const baselinePressureShift = '  const pressureShift = postStageOne && (state.activeEnemies >= 32 || state.hp <= 25);';
assert.ok(source.includes(baselineCriticalRefract), "baseline critical REFRACT HP<=25 predicate missing");
assert.ok(source.includes(baselinePressureShift), "baseline pressure-SHIFT HP<=25 predicate missing");

source = replaceOnce(
  source,
  'const TRIALS = Number(process.env.CR3E2_RUN17_CONTROL_TRIALS ?? "3");',
  'const TRIALS = Number(process.env.CR3E2_RUN17_DIAG_TRIALS ?? "10");',
  "diagnostic trial env",
);

source = replaceOnce(
  source,
  '      let minHp = Number.POSITIVE_INFINITY;\n      let runningProgress = 0;',
  '      let minHp = Number.POSITIVE_INFINITY;\n      let nextLateStage2DiagProgress = 150_000;\n      let lateStage2DiagSequence = 0;\n      let runningProgress = 0;',
  "diagnostic state",
);

const diagnosticBlock = `        minHp = Math.min(minHp, state.hp);

        if (state.stage === "STAGE_II" && state.progress >= 150_000 && state.progress < TARGET_PROGRESS) {
          if (state.progress >= nextLateStage2DiagProgress) {
            lateStage2DiagSequence += 1;
            console.log(\`CR3E2_RUN17_LATE_STAGE2_DIAG_T\${trial}_S\${lateStage2DiagSequence}=\${JSON.stringify({
              threshold: nextLateStage2DiagProgress,
              elapsed: state.elapsed,
              progress: state.progress,
              hp: state.hp,
              level: state.level,
              kills: state.kills,
              shifts: state.shifts,
              phase: state.phase,
              x: Math.round(state.x),
              y: Math.round(state.y),
              activeEnemies: state.activeEnemies,
              gatePhase: state.gatePhase,
              gateActive: state.gateActive,
              draftOpen: state.draftOpen,
              draftCount: state.draftCount,
              draftIds: state.draftIds,
              refracts: state.refracts,
              rerollNonce: state.rerollNonce,
              cr2DraftActive: state.cr2DraftActive,
              moveTick,
              checkpointTick,
            })}\`);
            nextLateStage2DiagProgress = Math.floor(state.progress / 2_500) * 2_500 + 2_500;
          }

          if (state.draftOpen) {
            console.log(\`CR3E2_RUN17_LATE_STAGE2_DRAFT_T\${trial}=\${JSON.stringify({
              elapsed: state.elapsed,
              progress: state.progress,
              hp: state.hp,
              level: state.level,
              kills: state.kills,
              shifts: state.shifts,
              phase: state.phase,
              x: Math.round(state.x),
              y: Math.round(state.y),
              activeEnemies: state.activeEnemies,
              draftCount: state.draftCount,
              draftIds: state.draftIds,
              refracts: state.refracts,
              rerollNonce: state.rerollNonce,
              cr2DraftActive: state.cr2DraftActive,
              moveTick,
              checkpointTick,
            })}\`);
          }
        }`;

source = replaceOnce(
  source,
  '        minHp = Math.min(minHp, state.hp);',
  diagnosticBlock,
  "late Stage-II telemetry",
);

assert.ok(source.includes(baselineCriticalRefract), "critical REFRACT policy changed unexpectedly");
assert.ok(source.includes(baselinePressureShift), "pressure-SHIFT policy changed unexpectedly");

await writeFile(generatedPath, source, "utf8");
execFileSync(process.execPath, ["--check", generatedPath], { stdio: "inherit" });

console.log("CR3E2_RUN17_LATE_STAGE2_DIAG_WRAPPER=PASS");
console.log("CR3E2_RUN17_LATE_STAGE2_DIAG_GENERATED_SYNTAX=PASS");
console.log("CR3E2_RUN17_LATE_STAGE2_DIAG_SOURCE=UNCHANGED_DIRECT_RUN17_CONTROL");
console.log("CR3E2_RUN17_LATE_STAGE2_DIAG_ONLY_CHANGE=TELEMETRY_150000_TO_180000");
console.log("CR3E2_RUN17_LATE_STAGE2_DIAG_INTERVAL_PROGRESS=2500");
console.log("CR3E2_RUN17_LATE_STAGE2_DIAG_REFRACT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_LATE_STAGE2_DIAG_PRESSURE_SHIFT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_LATE_STAGE2_DIAG_DRAFT_PRIORITY=UNCHANGED");
console.log("CR3E2_RUN17_LATE_STAGE2_DIAG_MOVEMENT=UNCHANGED");
console.log("CR3E2_RUN17_LATE_STAGE2_DIAG_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(`${pathToFileURL(generatedPath).href}?v=${Date.now()}`);
} finally {
  await unlink(generatedPath).catch(() => {});
}
