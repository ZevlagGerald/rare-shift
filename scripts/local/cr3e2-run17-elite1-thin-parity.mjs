import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const sourcePath = resolve("scripts/local/cr3e2-run17-direct-control.mjs");
const generatedPath = resolve("scripts/local/.cr3e2-run17-elite1-thin-parity.runner.mjs");
const trials = Number(process.env.CR3E2_RUN17_ELITE1_THIN_TRIALS ?? "10");

function replaceOnce(source, needle, replacement, label) {
  const first = source.indexOf(needle);
  assert.ok(first >= 0, label + ": reviewed source fragment not found");
  assert.equal(source.indexOf(needle, first + needle.length), -1, label + ": reviewed source fragment not unique");
  return source.slice(0, first) + replacement + source.slice(first + needle.length);
}

let source = readFileSync(sourcePath, "utf8").replace(/\r\n/g, "\n");

assert.ok(source.includes("&& state.hp <= 25\n    && state.cr2DraftActive"), "baseline critical REFRACT HP25 policy missing");
assert.ok(source.includes("const pressureShift = postStageOne && (state.activeEnemies >= 32 || state.hp <= 25);"), "baseline pressure SHIFT HP25 policy missing");
assert.ok(source.includes('const minDistance = criticalLaterGate ? 220 : 140;'), "baseline elite min-distance policy missing");
assert.ok(source.includes('const maxDistance = criticalLaterGate ? 330 : 210;'), "baseline elite max-distance policy missing");
assert.ok(source.includes('await canvas.press(key, { delay: 180 });'), "baseline elite 180ms hold missing");
assert.ok(source.includes('const thinLaterCheckpointField = state.gateActive !== "ELITE_I" && state.activeEnemies > 1;'), "baseline later-only thin-field guard missing");
assert.ok(source.includes('await canvas.press(key, { delay: postStageOne ? 520 : 420, timeout: 2_500 });'), "baseline survival hold timing missing");
assert.ok(!source.includes("state.hp <= 35"), "rejected HP35 policy leaked into baseline source");
assert.ok(!source.includes("CR3E2_RUN17_L6_DELTA_T"), "rejected L6 DELTA override leaked into baseline source");
assert.ok(!source.includes("horizontalStageTwo"), "rejected horizontal-260 movement leaked into baseline source");
assert.ok(!source.includes("bottomY = postStageOne ? 850 : 950"), "rejected bottom-850 geometry leaked into baseline source");
assert.ok(!source.includes("leftX = postStageOne ? 800 : 300"), "rejected left-800 geometry leaked into baseline source");
assert.ok(!source.includes("stageTwoEntryAligned"), "rejected entry-up experiment leaked into baseline source");

source = replaceOnce(
  source,
  'const TRIALS = Number(process.env.CR3E2_RUN17_CONTROL_TRIALS ?? "3");',
  "const TRIALS = " + trials + ";",
  "trial count",
);

const varsAnchor = "      const wallDeadline = Date.now() + 220_000;\n\n";
const vars = [
  "      let elite1ThinStarted = false;",
  "      let elite1ThinCompleted = false;",
  "      let elite1ThinStart = null;",
  "      let elite1ThinComplete = null;",
  "      let elite1ThinMoveHolds = 0;",
  "",
  "      const elite1ThinCompact = state => ({",
  "        elapsed: state.elapsed, progress: state.progress, hp: state.hp, level: state.level,",
  "        kills: state.kills, shifts: state.shifts, phase: state.phase,",
  "        x: Math.round(state.x), y: Math.round(state.y), activeEnemies: state.activeEnemies,",
  "        enemyKinds: state.enemyKinds, eliteHp: Number.isFinite(state.eliteHp) ? state.eliteHp : null,",
  "        moveTick, checkpointTick,",
  "      });",
  "",
].join("\n");
source = replaceOnce(source, varsAnchor, varsAnchor + vars, "thin-state insertion");

const branchOld = [
  '        if (state.gatePhase === "ELITE_ACTIVE") {',
  '          const thinLaterCheckpointField = state.gateActive !== "ELITE_I" && state.activeEnemies > 1;',
  '          if (thinLaterCheckpointField) {',
  '            const movement = await moveNaturalSurvivalLane(canvas, state, moveTick);',
  '            moveTick += 1;',
  '            await page.waitForTimeout(movement.settle);',
  '            if (moveTick % movement.shiftModulo === 0) await shiftAndObserve();',
  '            await page.waitForTimeout(45);',
  '          } else {',
  '            await moveEliteCombatLane(canvas, state, checkpointTick);',
  '            checkpointTick += 1;',
  '            if (checkpointTick % 6 === 0) await shiftAndObserve();',
  '            await page.waitForTimeout(35);',
  '          }',
  '        } else if (state.gatePhase === "REWARD_PENDING") {',
].join("\n");

const branchNew = [
  '        if (state.gatePhase === "ELITE_ACTIVE") {',
  '          const thinCheckpointField = state.activeEnemies > 1;',
  '          if (state.gateActive === "ELITE_I" && thinCheckpointField && !elite1ThinStarted) {',
  '            elite1ThinStarted = true;',
  '            elite1ThinStart = elite1ThinCompact(state);',
  '            console.log("CR3E2_RUN17_ELITE1_THIN_START_T" + trial + "=" + JSON.stringify(elite1ThinStart));',
  '          }',
  '          if (state.gateActive === "ELITE_I" && !thinCheckpointField && elite1ThinStarted && !elite1ThinCompleted) {',
  '            elite1ThinCompleted = true;',
  '            elite1ThinComplete = elite1ThinCompact(state);',
  '            console.log("CR3E2_RUN17_ELITE1_THIN_COMPLETE_T" + trial + "=" + JSON.stringify({',
  '              start: elite1ThinStart, complete: elite1ThinComplete, holds: elite1ThinMoveHolds,',
  '              hpDelta: elite1ThinComplete.hp - elite1ThinStart.hp,',
  '            }));',
  '          }',
  '          if (thinCheckpointField) {',
  '            const movement = await moveNaturalSurvivalLane(canvas, state, moveTick);',
  '            if (state.gateActive === "ELITE_I") elite1ThinMoveHolds += 1;',
  '            moveTick += 1;',
  '            await page.waitForTimeout(movement.settle);',
  '            if (moveTick % movement.shiftModulo === 0) await shiftAndObserve();',
  '            await page.waitForTimeout(45);',
  '          } else {',
  '            await moveEliteCombatLane(canvas, state, checkpointTick);',
  '            checkpointTick += 1;',
  '            if (checkpointTick % 6 === 0) await shiftAndObserve();',
  '            await page.waitForTimeout(35);',
  '          }',
  '        } else if (state.gatePhase === "REWARD_PENDING") {',
].join("\n");

source = replaceOnce(source, branchOld, branchNew, "ELITE_I thin-field parity");

const checkpointAnchor = "          const final = compact({ ...state, moveTick, checkpointTick });\n";
const checkpointReplacement = [
  '          assert.ok(elite1ThinStarted, "trial " + trial + " ELITE_I thin-field parity never activated");',
  '          assert.ok(elite1ThinCompleted, "trial " + trial + " ELITE_I thin-field parity never completed");',
  '          console.log("CR3E2_RUN17_ELITE1_THIN_RESULT_T" + trial + "=" + JSON.stringify({',
  '            start: elite1ThinStart, complete: elite1ThinComplete, holds: elite1ThinMoveHolds,',
  '            checkpointHp: state.hp, moveTick, checkpointTick,',
  '          }));',
  '          const final = compact({ ...state, moveTick, checkpointTick });',
  '',
].join("\n");
source = replaceOnce(source, checkpointAnchor, checkpointReplacement, "checkpoint proof");

writeFileSync(generatedPath, source, "utf8");

const syntax = spawnSync(process.execPath, ["--check", generatedPath], { encoding: "utf8" });
if (syntax.stdout) process.stdout.write(syntax.stdout);
if (syntax.stderr) process.stderr.write(syntax.stderr);
assert.equal(syntax.status, 0, "generated ELITE_I thin-field parity runner syntax check failed");

console.log("CR3E2_RUN17_ELITE1_THIN_WRAPPER=PASS");
console.log("CR3E2_RUN17_ELITE1_THIN_GENERATED_SYNTAX=PASS");
console.log("CR3E2_RUN17_ELITE1_THIN_SOURCE=UNCHANGED_DIRECT_RUN17_CONTROL");
console.log("CR3E2_RUN17_ELITE1_THIN_ONLY_CHANGE=ELITE_I_USES_EXISTING_ACTIVE_ENEMIES_GT_1_THIN_BRANCH");
console.log("CR3E2_RUN17_ELITE1_THIN_SURVIVAL_HOLD=BASELINE_STAGE1_420MS_DURING_ELITE_I");
console.log("CR3E2_RUN17_ELITE1_THIN_MOVE_TICK=INCREMENTS_DURING_THINNING");
console.log("CR3E2_RUN17_ELITE1_THIN_SHIFT_CADENCE=BASELINE_SURVIVAL_MODULO_7_DURING_ELITE_I");
console.log("CR3E2_RUN17_ELITE1_THIN_ENGAGE_CONDITION=ACTIVE_ENEMIES_LE_1");
console.log("CR3E2_RUN17_ELITE1_THIN_ELITE_COMBAT=BASELINE_140_210_180MS_UNCHANGED_AFTER_THINNING");
console.log("CR3E2_RUN17_ELITE1_THIN_REFRACT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_ELITE1_THIN_DRAFT_PRIORITY=UNCHANGED");
console.log("CR3E2_RUN17_ELITE1_THIN_STAGE2=UNCHANGED");
console.log("CR3E2_RUN17_ELITE1_THIN_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(pathToFileURL(generatedPath).href + "?v=" + Date.now());
} finally {
  rmSync(generatedPath, { force: true });
}
