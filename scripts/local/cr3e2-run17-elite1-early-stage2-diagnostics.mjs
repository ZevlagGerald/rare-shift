import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = resolve("scripts/local/cr3e2-run17-direct-control.mjs");
const generatedPath = resolve("scripts/local/.cr3e2-run17-elite1-early-stage2-diagnostics.runner.mjs");
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
  'const TRIALS = Number(process.env.CR3E2_RUN17_ELITE1_DIAG_TRIALS ?? "10");',
  "ELITE_I diagnostic trial env",
);

source = replaceOnce(
  source,
  '      let minHp = Number.POSITIVE_INFINITY;\n      let runningProgress = 0;',
  '      let minHp = Number.POSITIVE_INFINITY;\n      let elite1DiagSeen = false;\n      let elite1DiagLastTick = -6;\n      let elite1DiagLastTransition = "";\n      let elite1DiagResolvedLogged = false;\n      let elite1DiagCoreLogged = false;\n      let elite1DiagStage2ResumeLogged = false;\n      let nextEarlyStage2Progress = 100_000;\n      let runningProgress = 0;',
  "ELITE_I diagnostic state",
);

const diagnosticBlock = `        minHp = Math.min(minHp, state.hp);

        const diagDistance = Number.isFinite(state.eliteX) && Number.isFinite(state.eliteY)
          ? Math.round(Math.hypot(state.eliteX - state.x, state.eliteY - state.y))
          : null;

        if (state.gateActive === "ELITE_I" && state.gatePhase === "ELITE_ACTIVE") {
          const shouldSampleElite = !elite1DiagSeen
            || checkpointTick - elite1DiagLastTick >= 6
            || state.draftOpen;
          if (shouldSampleElite) {
            elite1DiagSeen = true;
            elite1DiagLastTick = checkpointTick;
            console.log(\`CR3E2_RUN17_ELITE1_DIAG_T\${trial}=\${JSON.stringify({
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
              eliteX: Number.isFinite(state.eliteX) ? Math.round(state.eliteX) : null,
              eliteY: Number.isFinite(state.eliteY) ? Math.round(state.eliteY) : null,
              eliteHp: Number.isFinite(state.eliteHp) ? state.eliteHp : null,
              eliteDistance: diagDistance,
              draftOpen: state.draftOpen,
              draftIds: state.draftIds,
              refracts: state.refracts,
              rerollNonce: state.rerollNonce,
              gatePhase: state.gatePhase,
              gateActive: state.gateActive,
              elitesDefeated: state.elitesDefeated,
              cores: state.cores,
              reservedActive: state.reservedActive,
              moveTick,
              checkpointTick,
            })}\`);
          }
        }

        if (elite1DiagSeen && state.progress <= 150_500) {
          const transitionSignature = [
            state.stage,
            state.gatePhase,
            state.gateActive,
            state.elitesDefeated,
            state.cores,
            state.reservedActive,
          ].join("|");
          if (transitionSignature !== elite1DiagLastTransition) {
            elite1DiagLastTransition = transitionSignature;
            console.log(\`CR3E2_RUN17_ELITE1_TRANSITION_T\${trial}=\${JSON.stringify({
              elapsed: state.elapsed,
              progress: state.progress,
              stage: state.stage,
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
              gatePendingRewards: state.gatePendingRewards,
              gateResolved: state.gateResolved,
              elitesDefeated: state.elitesDefeated,
              cores: state.cores,
              reservedActive: state.reservedActive,
              eliteHp: Number.isFinite(state.eliteHp) ? state.eliteHp : null,
              eliteDistance: diagDistance,
              moveTick,
              checkpointTick,
            })}\`);
          }

          if (!elite1DiagResolvedLogged && state.elitesDefeated >= 1) {
            elite1DiagResolvedLogged = true;
            console.log(\`CR3E2_RUN17_ELITE1_DEFEAT_T\${trial}=\${JSON.stringify({
              elapsed: state.elapsed,
              progress: state.progress,
              stage: state.stage,
              hp: state.hp,
              kills: state.kills,
              shifts: state.shifts,
              gatePhase: state.gatePhase,
              gateActive: state.gateActive,
              gatePendingRewards: state.gatePendingRewards,
              gateResolved: state.gateResolved,
              elitesDefeated: state.elitesDefeated,
              cores: state.cores,
              reservedActive: state.reservedActive,
              moveTick,
              checkpointTick,
            })}\`);
          }

          if (!elite1DiagCoreLogged && state.cores >= 1) {
            elite1DiagCoreLogged = true;
            console.log(\`CR3E2_RUN17_ELITE1_CORE_T\${trial}=\${JSON.stringify({
              elapsed: state.elapsed,
              progress: state.progress,
              stage: state.stage,
              hp: state.hp,
              gatePhase: state.gatePhase,
              gateActive: state.gateActive,
              gatePendingRewards: state.gatePendingRewards,
              gateResolved: state.gateResolved,
              elitesDefeated: state.elitesDefeated,
              cores: state.cores,
              reservedActive: state.reservedActive,
              moveTick,
              checkpointTick,
            })}\`);
          }

          if (!elite1DiagStage2ResumeLogged
            && state.stage === "STAGE_II"
            && state.gatePhase === "RUNNING"
            && state.progress > 80_000) {
            elite1DiagStage2ResumeLogged = true;
            console.log(\`CR3E2_RUN17_ELITE1_STAGE2_RESUME_T\${trial}=\${JSON.stringify({
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
              gateResolved: state.gateResolved,
              elitesDefeated: state.elitesDefeated,
              cores: state.cores,
              moveTick,
              checkpointTick,
            })}\`);
          }

          if (state.draftOpen) {
            console.log(\`CR3E2_RUN17_EARLY_STAGE2_DRAFT_T\${trial}=\${JSON.stringify({
              elapsed: state.elapsed,
              progress: state.progress,
              stage: state.stage,
              hp: state.hp,
              level: state.level,
              kills: state.kills,
              shifts: state.shifts,
              phase: state.phase,
              x: Math.round(state.x),
              y: Math.round(state.y),
              activeEnemies: state.activeEnemies,
              draftIds: state.draftIds,
              refracts: state.refracts,
              rerollNonce: state.rerollNonce,
              cr2DraftActive: state.cr2DraftActive,
              moveTick,
              checkpointTick,
            })}\`);
          }
        }

        if (elite1DiagSeen
          && state.stage === "STAGE_II"
          && nextEarlyStage2Progress <= 150_000
          && state.progress >= nextEarlyStage2Progress) {
          console.log(\`CR3E2_RUN17_EARLY_STAGE2_SNAPSHOT_T\${trial}=\${JSON.stringify({
            threshold: nextEarlyStage2Progress,
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
            refracts: state.refracts,
            rerollNonce: state.rerollNonce,
            moveTick,
            checkpointTick,
          })}\`);
          nextEarlyStage2Progress += 25_000;
        }`;

source = replaceOnce(
  source,
  '        minHp = Math.min(minHp, state.hp);',
  diagnosticBlock,
  "ELITE_I and early Stage-II telemetry",
);

assert.ok(source.includes(baselineCriticalRefract), "critical REFRACT policy changed unexpectedly");
assert.ok(source.includes(baselinePressureShift), "pressure-SHIFT policy changed unexpectedly");

await writeFile(generatedPath, source, "utf8");
execFileSync(process.execPath, ["--check", generatedPath], { stdio: "inherit" });

console.log("CR3E2_RUN17_ELITE1_DIAG_WRAPPER=PASS");
console.log("CR3E2_RUN17_ELITE1_DIAG_GENERATED_SYNTAX=PASS");
console.log("CR3E2_RUN17_ELITE1_DIAG_SOURCE=UNCHANGED_DIRECT_RUN17_CONTROL");
console.log("CR3E2_RUN17_ELITE1_DIAG_ONLY_CHANGE=TELEMETRY_ELITE1_TO_150000");
console.log("CR3E2_RUN17_ELITE1_DIAG_COMBAT_SAMPLE_EVERY_TICKS=6");
console.log("CR3E2_RUN17_ELITE1_DIAG_STAGE2_SNAPSHOTS=100000_125000_150000");
console.log("CR3E2_RUN17_ELITE1_DIAG_REFRACT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_ELITE1_DIAG_PRESSURE_SHIFT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_ELITE1_DIAG_DRAFT_PRIORITY=UNCHANGED");
console.log("CR3E2_RUN17_ELITE1_DIAG_MOVEMENT=UNCHANGED");
console.log("CR3E2_RUN17_ELITE1_DIAG_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(`${pathToFileURL(generatedPath).href}?v=${Date.now()}`);
} finally {
  await unlink(generatedPath).catch(() => {});
}
