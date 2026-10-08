import assert from "node:assert/strict";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const sourcePath = resolve("scripts/local/cr3e2-run17-direct-control.mjs");
const generatedPath = resolve("scripts/local/.cr3e2-run17-elite1-engagement-ab.runner.mjs");
const pairs = Number(process.env.CR3E2_RUN17_ELITE1_ENGAGEMENT_PAIRS ?? "5");

function replaceOnce(source, needle, replacement, label) {
  const first = source.indexOf(needle);
  assert.ok(first >= 0, label + ": reviewed source fragment not found");
  assert.equal(source.indexOf(needle, first + needle.length), -1, label + ": reviewed source fragment not unique");
  return source.slice(0, first) + replacement + source.slice(first + needle.length);
}

const baseline = readFileSync(sourcePath, "utf8").replace(/\r\n/g, "\n");

assert.ok(baseline.includes("&& state.hp <= 25\n    && state.cr2DraftActive"), "baseline critical REFRACT HP25 policy missing");
assert.ok(baseline.includes("const pressureShift = postStageOne && (state.activeEnemies >= 32 || state.hp <= 25);"), "baseline pressure SHIFT HP25 policy missing");
assert.ok(baseline.includes('const minDistance = criticalLaterGate ? 220 : 140;'), "baseline elite min-distance policy missing");
assert.ok(baseline.includes('const maxDistance = criticalLaterGate ? 330 : 210;'), "baseline elite max-distance policy missing");
assert.ok(baseline.includes('await canvas.press(key, { delay: 180 });'), "baseline elite 180ms hold missing");
assert.ok(baseline.includes('const thinLaterCheckpointField = state.gateActive !== "ELITE_I" && state.activeEnemies > 1;'), "baseline later thin-field guard missing");
assert.ok(baseline.includes('await canvas.press(key, { delay: postStageOne ? 520 : 420, timeout: 2_500 });'), "baseline survival timing missing");
assert.ok(!baseline.includes("state.hp <= 35"), "rejected HP35 policy leaked into baseline source");
assert.ok(!baseline.includes("CR3E2_RUN17_L6_DELTA_T"), "rejected L6 DELTA override leaked into baseline source");
assert.ok(!baseline.includes("horizontalStageTwo"), "rejected horizontal-260 movement leaked into baseline source");
assert.ok(!baseline.includes("bottomY = postStageOne ? 850 : 950"), "rejected bottom-850 geometry leaked into baseline source");
assert.ok(!baseline.includes("leftX = postStageOne ? 800 : 300"), "rejected left-800 geometry leaked into baseline source");
assert.ok(!baseline.includes("stageTwoEntryAligned"), "rejected entry-up experiment leaked into baseline source");

function buildVariant(mode, pair) {
  let source = baseline;

  source = replaceOnce(
    source,
    'const TRIALS = Number(process.env.CR3E2_RUN17_CONTROL_TRIALS ?? "3");',
    "const TRIALS = 1;",
    "trial count"
  );

  source = replaceOnce(
    source,
    'const HISTORICAL_HEAD = "051c95e86c56e12852fd21debf31d1f2be7288de";',
    'const HISTORICAL_HEAD = "051c95e86c56e12852fd21debf31d1f2be7288de";\nconst AB_MODE = "' + mode + '";\nconst AB_PAIR = ' + pair + ';',
    "A/B constants"
  );

  const eliteOld = [
    'async function moveEliteCombatLane(canvas, state, tick) {',
    '  assert.ok(Number.isFinite(state.eliteX) && Number.isFinite(state.eliteY), "active checkpoint elite must expose diagnostics");',
    '  const dx = state.eliteX - state.x;',
    '  const dy = state.eliteY - state.y;',
    '  const distance = Math.hypot(dx, dy);',
    '  const horizontalDominant = Math.abs(dx) >= Math.abs(dy);',
    '  const criticalLaterGate = state.gateActive !== "ELITE_I" && state.hp <= 25;',
    '  const minDistance = criticalLaterGate ? 220 : 140;',
    '  const maxDistance = criticalLaterGate ? 330 : 210;',
    '  let key;',
    '  if (distance > maxDistance) {',
    '    key = horizontalDominant',
    '      ? dx >= 0 ? "ArrowRight" : "ArrowLeft"',
    '      : dy >= 0 ? "ArrowDown" : "ArrowUp";',
    '  } else if (distance < minDistance) {',
    '    key = horizontalDominant',
    '      ? dx >= 0 ? "ArrowLeft" : "ArrowRight"',
    '      : dy >= 0 ? "ArrowUp" : "ArrowDown";',
    '  } else if (horizontalDominant) {',
    '    key = tick % 2 === 0 ? "ArrowUp" : "ArrowDown";',
    '  } else {',
    '    key = tick % 2 === 0 ? "ArrowLeft" : "ArrowRight";',
    '  }',
    '  await canvas.press(key, { delay: 180 });',
    '}',
  ].join("\n");

  const eliteNew = [
    'async function moveEliteCombatLane(canvas, state, tick) {',
    '  assert.ok(Number.isFinite(state.eliteX) && Number.isFinite(state.eliteY), "active checkpoint elite must expose diagnostics");',
    '  const dx = state.eliteX - state.x;',
    '  const dy = state.eliteY - state.y;',
    '  const distance = Math.hypot(dx, dy);',
    '  const horizontalDominant = Math.abs(dx) >= Math.abs(dy);',
    '  const criticalLaterGate = state.gateActive !== "ELITE_I" && state.hp <= 25;',
    '  const minDistance = criticalLaterGate ? 220 : 140;',
    '  const maxDistance = criticalLaterGate ? 330 : 210;',
    '  let key;',
    '  let actionClass;',
    '  if (distance > maxDistance) {',
    '    actionClass = "APPROACH";',
    '    key = horizontalDominant',
    '      ? dx >= 0 ? "ArrowRight" : "ArrowLeft"',
    '      : dy >= 0 ? "ArrowDown" : "ArrowUp";',
    '  } else if (distance < minDistance) {',
    '    actionClass = "RETREAT";',
    '    key = horizontalDominant',
    '      ? dx >= 0 ? "ArrowLeft" : "ArrowRight"',
    '      : dy >= 0 ? "ArrowUp" : "ArrowDown";',
    '  } else if (horizontalDominant) {',
    '    actionClass = "ORBIT";',
    '    key = tick % 2 === 0 ? "ArrowUp" : "ArrowDown";',
    '  } else {',
    '    actionClass = "ORBIT";',
    '    key = tick % 2 === 0 ? "ArrowLeft" : "ArrowRight";',
    '  }',
    '  await canvas.press(key, { delay: 180 });',
    '  return { key, actionClass, distance, dx, dy };',
    '}',
  ].join("\n");

  source = replaceOnce(source, eliteOld, eliteNew, "elite metadata return");

  const varsAnchor = "      const wallDeadline = Date.now() + 220_000;\n\n";
  const vars = [
    "      let abStarted = false;",
    "      let abEntry = null;",
    "      let abEntryWallMs = 0;",
    "      let abPreludeHolds = 0;",
    "      let abPreludeShifts = 0;",
    "      let abCombatStart = null;",
    "      let abCombatHolds = 0;",
    "      let abPendingAction = null;",
    "      let abLastObservedState = null;",
    "      let abFirstHit = null;",
    "      let abPostHitHolds = 0;",
    "      let abEndObservation = null;",
    "      let abEndReason = null;",
    "      const abActions = [];",
    "      const abLossSignatures = { HP4: 0, HP5: 0, HP7: 0, HP11: 0, OTHER: 0 };",
    "      const abApproachHoldCap = 96;",
    "      const abWallCapMs = 70_000;",
    "",
    "      const abCompact = state => ({",
    "        elapsed: state.elapsed, progress: state.progress, hp: state.hp, kills: state.kills, shifts: state.shifts,",
    "        phase: state.phase, x: Math.round(state.x), y: Math.round(state.y), activeEnemies: state.activeEnemies,",
    "        eliteX: Number.isFinite(state.eliteX) ? Math.round(state.eliteX) : null,",
    "        eliteY: Number.isFinite(state.eliteY) ? Math.round(state.eliteY) : null,",
    "        eliteHp: Number.isFinite(state.eliteHp) ? state.eliteHp : null, moveTick, checkpointTick,",
    "      });",
    "",
    "      const abSignature = hpLost => {",
    "        if (hpLost === 4) return \"HP4\";",
    "        if (hpLost === 5) return \"HP5\";",
    "        if (hpLost === 7) return \"HP7\";",
    "        if (hpLost === 11) return \"HP11\";",
    "        return \"OTHER\";",
    "      };",
    "",
    "      const abObserve = (state, observation) => {",
    "        if (!abStarted || !state) return;",
    "        let action = null;",
    "        if (abPendingAction) {",
    "          action = abPendingAction;",
    "          const hpLost = Math.max(0, action.beforeHp - state.hp);",
    "          const signature = hpLost > 0 ? abSignature(hpLost) : null;",
    "          if (signature) abLossSignatures[signature] += 1;",
    "          const eliteHpDelta = Number.isFinite(action.beforeEliteHp) && Number.isFinite(state.eliteHp)",
    "            ? state.eliteHp - action.beforeEliteHp : null;",
    "          abActions.push({ ...action.meta, observation, hpLost, signature, eliteHpDelta,",
    "            afterHp: state.hp, afterEliteHp: Number.isFinite(state.eliteHp) ? state.eliteHp : null,",
    "            afterActiveEnemies: state.activeEnemies });",
    "          abPendingAction = null;",
    "        }",
    "        const prevEliteHp = abLastObservedState?.eliteHp;",
    "        if (!abFirstHit && Number.isFinite(prevEliteHp) && Number.isFinite(state.eliteHp)",
    "            && state.eliteHp < prevEliteHp) {",
    "          const hitKind = action ? 'COMBAT' : 'PRELUDE_OR_OTHER';",
    "          abFirstHit = { observation, kind: hitKind, combatHold: abCombatHolds,",
    "            beforeEliteHp: prevEliteHp, damageObserved: prevEliteHp - state.eliteHp,",
    "            state: abCompact(state), distanceOnHitAction: action?.meta.distance ?? null };",
    "          console.log(\"CR3E2_RUN17_ELITE1_ENGAGE_FIRST_HIT_\" + AB_MODE + \"_P\" + AB_PAIR + \"=\" + JSON.stringify(abFirstHit));",
    "        } else if (abFirstHit && action && action.meta.hold > abFirstHit.combatHold) {",
    "          abPostHitHolds += 1;",
    "        }",
    "        abLastObservedState = state;",
    "        if (abFirstHit && abPostHitHolds === 6 && !abEndObservation) {",
    "          abEndObservation = { observation, state }; abEndReason = \"ENGAGED_POST6_COMPLETE\";",
    "        } else if (!abFirstHit && abCombatHolds === abApproachHoldCap && !abEndObservation) {",
    "          abEndObservation = { observation, state }; abEndReason = \"NO_ENGAGEMENT_ACTION_CAP\";",
    "        }",
    "      };",
    "",
  ].join("\n");
  source = replaceOnce(source, varsAnchor, varsAnchor + vars, "A/B state insertion");

  const shiftOld = [
    '      const shiftAndObserve = async () => {',
    '        await canvas.press("Space", { timeout: 2_500 });',
    '        await page.waitForTimeout(105);',
    '        return readState(canvas);',
    '      };',
  ].join("\n");
  const shiftNew = [
    '      const shiftAndObserve = async () => {',
    '        await canvas.press("Space", { timeout: 2_500 });',
    '        await page.waitForTimeout(105);',
    '        const shifted = await readState(canvas);',
    '        abObserve(shifted, "EXISTING_SHIFT_READ");',
    '        return shifted;',
    '      };',
  ].join("\n");
  source = replaceOnce(source, shiftOld, shiftNew, "existing SHIFT read reuse");

  const loopAnchor = "        minHp = Math.min(minHp, state.hp);\n\n        if (state.dead || state.hp <= 0) {";
  const loopReplacement = [
    "        minHp = Math.min(minHp, state.hp);",
    "        abObserve(state, \"EXISTING_LOOP_READ\");",
    "",
    "        if (abStarted && !abEndObservation && Date.now() - abEntryWallMs >= abWallCapMs) {",
    "          abEndObservation = { observation: \"WALL_CAP_LOOP_READ\", state };",
    "          abEndReason = abFirstHit ? \"POST_HIT_WALL_CAP\" : \"NO_ENGAGEMENT_WALL_CAP\";",
    "        }",
    "        if (abStarted && !abEndObservation && state.gateActive !== 'ELITE_I') {",
    "          abEndObservation = { observation: \"ELITE_EXIT_LOOP_READ\", state };",
    "          abEndReason = abFirstHit ? \"ELITE_EXIT_BEFORE_POST6\" : \"NO_ENGAGEMENT_ELITE_EXIT\";",
    "        }",
    "        if (abStarted && !abEndObservation && (state.dead || state.hp <= 0)) {",
    "          abEndObservation = { observation: \"DEATH_LOOP_READ\", state };",
    "          abEndReason = \"DEATH_BEFORE_COMPLETE\";",
    "        }",
    "        if (abEndObservation) {",
    "          const endState = abEndObservation.state;",
    "          assert.ok(abEntry && abCombatStart, \"trial \" + trial + \" missing A/B boundary state\");",
    "          const outcome = abEndReason === \"ENGAGED_POST6_COMPLETE\" ? \"ENGAGED\" :",
    "            abEndReason.startsWith(\"NO_ENGAGEMENT\") ? \"NO_ENGAGEMENT\" : \"INCOMPLETE\";",
    "          const summary = {",
    "            trial, pair: AB_PAIR, mode: AB_MODE, frameA, frameB, outcome, endReason: abEndReason,",
    "            entry: abEntry, combatStart: abCombatStart, firstHit: abFirstHit,",
    "            endObservation: abEndObservation.observation, end: abCompact(endState),",
    "            preludeHolds: abPreludeHolds, preludeShifts: abPreludeShifts,",
    "            combatHolds: abCombatHolds, postHitHolds: abPostHitHolds,",
    "            approachHoldCap: abApproachHoldCap, engagementWallCapMs: abWallCapMs,",
    "            totalHpDelta: endState.hp - abEntry.hp,",
    "            preludeHpDelta: abCombatStart.hp - abEntry.hp,",
    "            combatHpDelta: endState.hp - abCombatStart.hp,",
    "            approachHpDelta: abFirstHit ? abFirstHit.state.hp - abCombatStart.hp : null,",
    "            postHitHpDelta: abFirstHit ? endState.hp - abFirstHit.state.hp : null,",
    "            combatElapsedMs: endState.elapsed - abCombatStart.elapsed,",
    "            approachElapsedMs: abFirstHit ? abFirstHit.state.elapsed - abCombatStart.elapsed : null,",
    "            activeEnemiesDelta: endState.activeEnemies - abCombatStart.activeEnemies,",
    "            killsDelta: endState.kills - abCombatStart.kills,",
    "            eliteHpDelta: Number.isFinite(abCombatStart.eliteHp) && Number.isFinite(endState.eliteHp)",
    "              ? endState.eliteHp - abCombatStart.eliteHp : null,",
    "            lossSignatures: abLossSignatures, actions: abActions,",
    "          };",
    "          console.log(\"CR3E2_RUN17_ELITE1_ENGAGE_SUMMARY_\" + AB_MODE + \"_P\" + AB_PAIR + \"=\" + JSON.stringify(summary));",
    "          record = summary;",
    "          return;",
    "        }",
    "",
    "        if (state.dead || state.hp <= 0) {",
  ].join("\n");
  source = replaceOnce(source, loopAnchor, loopReplacement, "A/B completion");

  const eliteBranchOld = [
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

  const eliteBranchNew = [
    "        if (state.gatePhase === \"ELITE_ACTIVE\") {",
    "          if (state.gateActive === \"ELITE_I\" && !abStarted) {",
    "            abStarted = true;",
    "            abEntry = abCompact(state);",
    "            abEntryWallMs = Date.now();",
    "            abLastObservedState = state;",
    "            console.log(\"CR3E2_RUN17_ELITE1_ENGAGE_ENTRY_\" + AB_MODE + \"_P\" + AB_PAIR + \"=\" + JSON.stringify(abEntry));",
    "          }",
    "          if (state.gateActive === \"ELITE_I\" && AB_MODE === \"PRELUDE\" && abPreludeHolds < 7) {",
    "            const movement = await moveNaturalSurvivalLane(canvas, state, moveTick);",
    "            abPreludeHolds += 1;",
    "            moveTick += 1;",
    "            await page.waitForTimeout(movement.settle);",
    "            if (moveTick % movement.shiftModulo === 0) {",
    "              abPreludeShifts += 1;",
    "              await shiftAndObserve();",
    "            }",
    "            await page.waitForTimeout(45);",
    "            continue;",
    "          }",
    "          if (state.gateActive === \"ELITE_I\" && (abFirstHit || abCombatHolds < abApproachHoldCap)) {",
    "            if (!abCombatStart) {",
    "              abCombatStart = abCompact(state);",
    "              console.log(\"CR3E2_RUN17_ELITE1_ENGAGE_COMBAT_START_\" + AB_MODE + \"_P\" + AB_PAIR + \"=\" + JSON.stringify(abCombatStart));",
    "            }",
    "            const eliteTick = checkpointTick;",
    "            const eliteAction = await moveEliteCombatLane(canvas, state, checkpointTick);",
    "            abCombatHolds += 1;",
    "            abPendingAction = {",
    "              beforeHp: state.hp, beforeEliteHp: state.eliteHp,",
    "              meta: {",
    "                hold: abCombatHolds, tick: eliteTick, key: eliteAction.key, actionClass: eliteAction.actionClass,",
    "                distance: Math.round(eliteAction.distance), dx: Math.round(eliteAction.dx), dy: Math.round(eliteAction.dy),",
    "                startPhase: state.phase, startHp: state.hp, startEliteHp: state.eliteHp,",
    "                startActiveEnemies: state.activeEnemies,",
    "              },",
    "            };",
    "            checkpointTick += 1;",
    "            if (checkpointTick % 6 === 0) await shiftAndObserve();",
    "            await page.waitForTimeout(35);",
    "            continue;",
    "          }",
    "          assert.fail(\"ELITE_I combat cap did not terminate trial\");",
    "        } else if (state.gatePhase === \"REWARD_PENDING\") {",
  ].join("\n");
  source = replaceOnce(source, eliteBranchOld, eliteBranchNew, "paired first-cycle branch");

  const footerIndex = source.indexOf("const results = [];");
  assert.ok(footerIndex >= 0, "baseline footer not found");
  const footer = [
    "let result;",
    "try {",
    "  result = await runTrial(1);",
    "} catch (error) {",
    "  result = { trial: 1, pair: AB_PAIR, mode: AB_MODE, outcome: \"ERROR\",",
    "    message: error instanceof Error ? error.message : String(error) };",
    "  console.log(\"CR3E2_RUN17_ELITE1_ENGAGE_ERROR_\" + AB_MODE + \"_P\" + AB_PAIR + \"=\" + JSON.stringify(result));",
    "}",
    "export default result;",
    "",
  ].join("\n");
  return source.slice(0, footerIndex) + footer;
}

console.log("CR3E2_RUN17_ELITE1_ENGAGE_WRAPPER=PASS");
console.log("CR3E2_RUN17_ELITE1_ENGAGE_SOURCE=UNCHANGED_DIRECT_RUN17_CONTROL");
console.log("CR3E2_RUN17_ELITE1_ENGAGE_PAIRS=" + pairs);
console.log("CR3E2_RUN17_ELITE1_ENGAGE_CONTROL=IMMEDIATE_BASELINE_ELITE_COMBAT");
console.log("CR3E2_RUN17_ELITE1_ENGAGE_PRELUDE=7_BASELINE_SURVIVAL_HOLDS_ONE_SHIFT_THEN_BASELINE_ELITE_COMBAT");
console.log("CR3E2_RUN17_ELITE1_ENGAGE_FIRST_HIT=FIRST_EXISTING_OBSERVATION_WITH_ELITE_HP_DECREASE");
console.log("CR3E2_RUN17_ELITE1_ENGAGE_AFTER_HIT=6_ADDITIONAL_ELITE_HOLDS");
console.log("CR3E2_RUN17_ELITE1_ENGAGE_MAX_APPROACH_HOLDS=96");
console.log("CR3E2_RUN17_ELITE1_ENGAGE_MAX_WALL_MS=70000");
console.log("CR3E2_RUN17_ELITE1_ENGAGE_NO_HIT=NO_ENGAGEMENT_NOT_EXCLUDED");
console.log("CR3E2_RUN17_ELITE1_ENGAGE_READS=EXISTING_LOOP_AND_SHIFT_READS_ONLY");
console.log("CR3E2_RUN17_ELITE1_ENGAGE_COMBAT_POLICY=BASELINE_140_210_180MS_AND_SHIFT_EVERY_6");
console.log("CR3E2_RUN17_ELITE1_ENGAGE_DAMAGE=HP4_HP5_HP7_HP11_ARE_SIGNATURES_NOT_DIRECT_ENGINE_EVENT_LOGS");
console.log("CR3E2_RUN17_ELITE1_ENGAGE_PAIRS=EXECUTION_ORDER_ONLY_NOT_MATCHED_RANDOM_SEEDS");
console.log("CR3E2_RUN17_ELITE1_ENGAGE_SCOPE=LOCAL_DRIVER_ONLY");

const results = [];
try {
  for (let pair = 1; pair <= pairs; pair += 1) {
    for (const mode of ["CONTROL", "PRELUDE"]) {
      const generated = buildVariant(mode, pair);
      writeFileSync(generatedPath, generated, "utf8");
      const syntax = spawnSync(process.execPath, ["--check", generatedPath], { encoding: "utf8" });
      if (syntax.stdout) process.stdout.write(syntax.stdout);
      if (syntax.stderr) process.stderr.write(syntax.stderr);
      assert.equal(syntax.status, 0, "generated " + mode + " pair " + pair + " syntax check failed");
      const module = await import(pathToFileURL(generatedPath).href + "?pair=" + pair + "&mode=" + mode + "&v=" + Date.now());
      results.push(module.default);
    }
  }
} finally {
  rmSync(generatedPath, { force: true });
}

const controls = results.filter(result => result.mode === "CONTROL");
const preludes = results.filter(result => result.mode === "PRELUDE");
const frameStable = results.length === pairs * 2 && results.every(result => result.frameA === 4 && result.frameB === 6);
const eligible = results.filter(result => result.outcome === "ENGAGED" || result.outcome === "NO_ENGAGEMENT");
const diagnosticComplete = controls.length === pairs && preludes.length === pairs
  && eligible.length === pairs * 2 && frameStable
  && controls.every(result => result.preludeHolds === 0)
  && preludes.every(result => result.preludeHolds === 7 && result.preludeShifts === 1)
  && eligible.every(result => result.outcome !== "ENGAGED" || result.postHitHolds === 6);
const avg = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const engaged = results.filter(result => result.outcome === "ENGAGED");
const noEngagement = results.filter(result => result.outcome === "NO_ENGAGEMENT");
const summary = {
  pairs, totalRuns: pairs * 2, completed: results.length, diagnosticComplete, frameStable,
  engaged: engaged.length, noEngagement: noEngagement.length,
  controlOutcomes: controls.map(result => result.outcome),
  preludeOutcomes: preludes.map(result => result.outcome),
  controlApproachHpDelta: controls.map(result => result.approachHpDelta ?? null),
  preludeApproachHpDelta: preludes.map(result => result.approachHpDelta ?? null),
  controlPostHitHpDelta: controls.map(result => result.postHitHpDelta ?? null),
  preludePostHitHpDelta: preludes.map(result => result.postHitHpDelta ?? null),
  controlEliteHpDelta: controls.map(result => result.eliteHpDelta ?? null),
  preludeEliteHpDelta: preludes.map(result => result.eliteHpDelta ?? null),
  controlApproachHolds: controls.map(result => result.firstHit?.combatHold ?? null),
  preludeApproachHolds: preludes.map(result => result.firstHit?.combatHold ?? null),
  controlAvgPostHitHpDelta: avg(controls.filter(result => result.outcome === "ENGAGED").map(result => result.postHitHpDelta)),
  preludeAvgPostHitHpDelta: avg(preludes.filter(result => result.outcome === "ENGAGED").map(result => result.postHitHpDelta)),
};
console.log("RARE_SHIFT_CR3E2_ELITE1_ENGAGE_AB_SUMMARY=" + JSON.stringify(summary));
console.log("RARE_SHIFT_CR3E2_ELITE1_ENGAGE_AB=" + (diagnosticComplete ? "COMPLETE" : "INCOMPLETE"));
assert.ok(diagnosticComplete, "ELITE_I engagement-aligned A/B diagnostic incomplete: " + JSON.stringify(summary));

