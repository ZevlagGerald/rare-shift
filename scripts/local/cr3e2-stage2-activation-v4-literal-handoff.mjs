import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const sourcePath = resolve("scripts/local/cr3e2-elite1-transition-lab.mjs");
const runnerPath = resolve("scripts/local/.cr3e2-stage2-activation-v4-literal-handoff.runner.mjs");
let source = await readFile(sourcePath, "utf8");

function replaceExactOnce(input, from, to, label) {
  const first = input.indexOf(from);
  assert.ok(first >= 0, `${label}: reviewed source fragment not found`);
  assert.equal(input.indexOf(from, first + from.length), -1, `${label}: source fragment is not unique`);
  return input.slice(0, first) + to + input.slice(first + from.length);
}

function replaceRegexOnce(input, pattern, replacement, label) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const matches = [...input.matchAll(new RegExp(pattern.source, flags))];
  assert.equal(matches.length, 1, `${label}: reviewed source fragment must match exactly once; matches=${matches.length}`);
  return input.replace(pattern, replacement);
}

async function chooseDraftStage2(page, canvas, state, trial) {
  assert.equal(state.draftIds.length, state.draftCount, `trial ${trial} Stage-II draft ids/count mismatch`);
  const onboarding = new Map([[2, "ORBIT_NODES"], [3, "ECHO_MINE"], [4, "SIGNAL_ARC"]]);
  const required = onboarding.get(state.level);
  let index = required ? state.draftIds.indexOf(required) : -1;

  if (index >= 0) {
    console.log(`CR3E2_STAGE2_LITERAL_DRAFT_T${trial}=L${state.level}:HP${state.hp}:${state.draftIds.join(",")}=>${state.draftIds[index]}`);
    await clickDraft(canvas, index, state.draftCount);
    await page.waitForTimeout(75);
    return;
  }

  const criticalRefract = state.level >= 5
    && state.hp <= 25
    && state.cr2DraftActive
    && state.refracts > 0
    && !state.draftIds.includes("FIELD_REPAIR");

  if (criticalRefract) {
    const beforeRefracts = state.refracts;
    const beforeNonce = state.rerollNonce;
    const beforeIds = state.draftIds.join(",");
    await canvas.focus().catch(() => {});
    await canvas.press("r", { timeout: 2_500 });
    await page.waitForTimeout(110);
    const replacement = await readState(canvas);
    const accepted = replacement?.draftOpen
      && (replacement.rerollNonce > beforeNonce || replacement.refracts < beforeRefracts);
    if (accepted) {
      console.log(`CR3E2_STAGE2_LITERAL_REFRACT_T${trial}=L${state.level}:HP${state.hp}:R${beforeRefracts}->${replacement.refracts}:NONCE${beforeNonce}->${replacement.rerollNonce}:${beforeIds}=>${replacement.draftIds.join(",")}`);
      state = replacement;
    }
  }

  const pressureDraft = state.level >= 5 && (state.hp <= 60 || state.activeEnemies >= 32);
  const lowHp = state.hp <= 72;
  const priority = pressureDraft
    ? [
        "FIELD_REPAIR",
        "PROTOCOL_ORBIT_STABILIZER",
        "PROTOCOL_VECTOR_LENS",
        "PROTOCOL_COMMON_CORE",
        "DELTA_RANK",
        "SIGNAL_RANK",
        "ORBIT_RANK",
        "ECHO_RANK",
        "PROTOCOL_RESONANCE_COIL",
        "PROTOCOL_MEMORY_FUSE",
        "SIGNAL_MAGNET",
        "EVOLUTION",
        "VECTOR_RANK",
        "ORBIT_NODES",
        "ECHO_MINE",
        "SIGNAL_ARC",
        "VECTOR_NEEDLE",
      ]
    : lowHp
      ? [
          "FIELD_REPAIR",
          "PROTOCOL_ORBIT_STABILIZER",
          "PROTOCOL_VECTOR_LENS",
          "PROTOCOL_MEMORY_FUSE",
          "SIGNAL_MAGNET",
          "PROTOCOL_RESONANCE_COIL",
          "EVOLUTION",
          "ORBIT_RANK",
          "ECHO_RANK",
          "SIGNAL_RANK",
          "DELTA_RANK",
          "VECTOR_RANK",
          "PROTOCOL_COMMON_CORE",
          "ORBIT_NODES",
          "ECHO_MINE",
          "SIGNAL_ARC",
          "VECTOR_NEEDLE",
        ]
      : [
          "ORBIT_NODES",
          "ECHO_MINE",
          "SIGNAL_ARC",
          "EVOLUTION",
          "SIGNAL_MAGNET",
          "ORBIT_RANK",
          "ECHO_RANK",
          "SIGNAL_RANK",
          "DELTA_RANK",
          "VECTOR_RANK",
          "PROTOCOL_ORBIT_STABILIZER",
          "PROTOCOL_MEMORY_FUSE",
          "PROTOCOL_COMMON_CORE",
          "PROTOCOL_RESONANCE_COIL",
          "PROTOCOL_VECTOR_LENS",
          "VECTOR_NEEDLE",
          "FIELD_REPAIR",
        ];

  index = -1;
  for (const token of priority) {
    index = state.draftIds.findIndex(id => id === token || id.startsWith(`${token}:`));
    if (index >= 0) break;
  }
  if (index < 0) index = 0;

  console.log(`CR3E2_STAGE2_LITERAL_DRAFT_T${trial}=L${state.level}:HP${state.hp}:${state.draftIds.join(",")}=>${state.draftIds[index]}`);
  await clickDraft(canvas, index, state.draftCount);
  await page.waitForTimeout(75);
}

async function acknowledgedPointerShiftStage2(page, canvas, state, trial) {
  const before = state ?? await readState(canvas);
  assert.ok(before, `trial ${trial} Stage-II pointer SHIFT requires live canvas`);
  assert.equal(before.draftOpen, false, `trial ${trial} Stage-II pointer SHIFT cannot be issued during draft`);

  const box = await canvas.boundingBox();
  assert.ok(box, `trial ${trial} Stage-II pointer SHIFT requires canvas bounds`);
  const position = {
    x: box.width * SHIFT_BUTTON_GAME_X / GAME_VIEW_W,
    y: box.height * SHIFT_BUTTON_GAME_Y / GAME_VIEW_H,
  };

  async function attempt() {
    await canvas.click({ position, timeout: 2_500 });
    const deadline = Date.now() + 1_500;
    let observed = await readState(canvas);
    while (Date.now() < deadline && observed && observed.shifts === before.shifts) {
      await page.waitForTimeout(10);
      observed = await readState(canvas);
    }
    return observed;
  }

  let after = await attempt();
  if (!after) return null;
  if (after.shifts === before.shifts) {
    console.log(`CR3E2_STAGE2_LITERAL_POINTER_RETRY_T${trial}=BEFORE_${before.shifts}`);
    await page.waitForTimeout(40);
    let retryState = await readState(canvas);
    if (!retryState) return null;
    let draftRaceCount = 0;
    while (retryState.draftOpen && draftRaceCount < 6) {
      console.log(`CR3E2_STAGE2_LITERAL_POINTER_DRAFT_RACE_T${trial}=L${retryState.level}:HP${retryState.hp}:SHIFT${retryState.shifts}`);
      assert.equal(retryState.shifts, before.shifts, `trial ${trial} Stage-II draft race must not alter SHIFT count`);
      await chooseDraftStage2(page, canvas, retryState, trial);
      await page.waitForTimeout(75);
      retryState = await readState(canvas);
      if (!retryState) return null;
      draftRaceCount += 1;
    }
    assert.equal(retryState.draftOpen, false, `trial ${trial} Stage-II pointer retry blocked by unresolved draft`);
    assert.equal(retryState.shifts, before.shifts, `trial ${trial} Stage-II pre-retry SHIFT count drift`);
    await canvas.focus().catch(() => {});
    after = await attempt();
  }

  if (!after) return null;
  assert.equal(after.shifts, before.shifts + 1, `trial ${trial} Stage-II pointer SHIFT must increment exactly once`);
  assert.notEqual(after.phase, before.phase, `trial ${trial} Stage-II pointer SHIFT must toggle phase`);
  await page.waitForTimeout(30);
  const settled = await readState(canvas);
  if (settled) assert.equal(settled.shifts, after.shifts, `trial ${trial} unsolicited duplicate Stage-II pointer SHIFT`);
  return settled ?? after;
}

async function moveStage2OuterLane(page, canvas, state, tick, trial) {
  const x = state.x;
  const y = state.y;
  let key;
  if (y < 250 && x < 1500) key = "ArrowRight";
  else if (x >= 1500 && y < 950) key = "ArrowDown";
  else if (y >= 950 && x > 300) key = "ArrowLeft";
  else if (x <= 300 && y > 250) key = "ArrowUp";
  else key = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"][Math.floor(tick / 10) % 4];
  await canvas.focus().catch(() => {});
  return moveForActiveMs(page, canvas, state, key, STAGE2_MOVE_HOLD_MS, trial);
}

const chooseDraftStage2Source = chooseDraftStage2.toString();
const pointerShiftSource = acknowledgedPointerShiftStage2.toString();
const moveStage2Source = moveStage2OuterLane.toString();

source = replaceRegexOnce(
  source,
  /const TRIALS = Number\(process\.env\.CR3E2_ELITE1_TRIALS \?\? "3"\);\r?\nconst CENTER =/,
  `const TRIALS = Number(process.env.CR3E2_STAGE2_TRIALS ?? "3");\nconst CENTER =`,
  "Stage-II trial environment",
);

source = replaceRegexOnce(
  source,
  /const STAGE1_TARGET = 80_000;\r?\n/,
  `const STAGE1_TARGET = 80_000;\nconst STAGE2_TARGET = 180_000;\nconst STAGE2_SHIFT_INTERVAL_MS = 5_400;\nconst STAGE2_MOVE_HOLD_MS = 520;\nconst STAGE2_SETTLE_MS = 80;\nconst STAGE2_MIN_FINAL_HP = 25;\nconst SHIFT_BUTTON_GAME_X = 842;\nconst SHIFT_BUTTON_GAME_Y = 530;\nconst GAME_VIEW_W = 960;\nconst GAME_VIEW_H = 640;\n`,
  "Stage-II constants",
);

source = replaceRegexOnce(
  source,
  /    draftCount: Number\(element\.dataset\.draftCount \?\? "0"\),\r?\n/,
  `    draftCount: Number(element.dataset.draftCount ?? "0"),\n    cr2DraftActive: element.dataset.cr2DraftActive === "true",\n    refracts: Number(element.dataset.refracts ?? "0"),\n    rerollNonce: Number(element.dataset.rerollNonce ?? "0"),\n`,
  "Stage-II draft diagnostics",
);

source = replaceRegexOnce(
  source,
  /\nfunction phaseThreats\(state\) \{/,
  `\n${chooseDraftStage2Source}\n\n${pointerShiftSource}\n\n${moveStage2Source}\n\nfunction phaseThreats(state) {`,
  "Stage-II helper insertion",
);

source = replaceExactOnce(
  source,
  "    timeout: 190_000,",
  "    timeout: 320_000,",
  "Stage-II runtime timeout",
);

const recordNeedle = `      record = {\n        trial,\n        frameA,\n        frameB,\n        outcome: "STAGE_II_RESUMED",\n        minHp,\n        huntTicks: huntTick,\n        atElite,\n        afterResolve,\n        final,\n      };\n      console.log(\`CR3E2_ELITE1_RESULT_T\${trial}=\${JSON.stringify(record)}\`);`;

const recordReplacement = `      const stage2Start = final;\n      console.log(\`CR3E2_STAGE2_LITERAL_START_T\${trial}=\${JSON.stringify(stage2Start)}\`);\n\n      state = finalState;\n      let stage2LastShiftAt = state.elapsed;\n      let stage2MoveTick = 0;\n      let nextSnapshotAt = 100_000;\n      const snapshots = [];\n      const stage2WallDeadline = Date.now() + 145_000;\n\n      while (Date.now() < stage2WallDeadline) {\n        state = await readState(canvas);\n        if (!state) break;\n        minHp = Math.min(minHp, state.hp);\n\n        while (state.progress >= nextSnapshotAt && nextSnapshotAt <= STAGE2_TARGET) {\n          const snapshot = { at: nextSnapshotAt, mode: "RUN17_OUTER_LANE", ...compact(state) };\n          snapshots.push(snapshot);\n          console.log(\`CR3E2_STAGE2_LITERAL_SNAPSHOT_T\${trial}=\${JSON.stringify(snapshot)}\`);\n          nextSnapshotAt += 20_000;\n        }\n\n        if (state.dead || state.hp <= 0) break;\n        if (state.gateActive === "CHECKPOINT_ELITE" && state.progress === STAGE2_TARGET) break;\n\n        if (state.draftOpen) {\n          await chooseDraftStage2(page, canvas, state, trial);\n          continue;\n        }\n\n        if (state.elapsed - stage2LastShiftAt >= STAGE2_SHIFT_INTERVAL_MS) {\n          const shifted = await acknowledgedPointerShiftStage2(page, canvas, state, trial);\n          if (!shifted) break;\n          state = shifted;\n          stage2LastShiftAt = state.elapsed;\n        }\n\n        const moved = await moveStage2OuterLane(page, canvas, state, stage2MoveTick, trial);\n        stage2MoveTick += 1;\n        if (!moved) break;\n        state = moved;\n        await page.waitForTimeout(STAGE2_SETTLE_MS);\n      }\n\n      const checkpointState = await readState(canvas);\n      minHp = checkpointState ? Math.min(minHp, checkpointState.hp) : minHp;\n      const checkpointFinal = compact(checkpointState);\n      console.log(\`CR3E2_STAGE2_LITERAL_AT_CHECKPOINT_T\${trial}=\${JSON.stringify(checkpointFinal)}\`);\n\n      assert.ok(checkpointState, \`trial \${trial} lost canvas before CHECKPOINT_ELITE\`);\n      assert.equal(checkpointState.dead, false, \`trial \${trial} died before CHECKPOINT_ELITE\`);\n      assert.equal(checkpointState.progress, STAGE2_TARGET, \`trial \${trial} progress must stop exactly at 180000\`);\n      assert.equal(checkpointState.stage, "STAGE_II", \`trial \${trial} must remain Stage II at CHECKPOINT_ELITE\`);\n      assert.equal(checkpointState.gateActive, "CHECKPOINT_ELITE", \`trial \${trial} CHECKPOINT_ELITE must activate naturally\`);\n      assert.equal(checkpointState.gatePhase, "ELITE_ACTIVE", \`trial \${trial} CHECKPOINT_ELITE gate phase\`);\n      assert.ok(checkpointState.gateResolved.includes("ELITE_I"), \`trial \${trial} ELITE_I resolution must persist\`);\n      assert.ok(!checkpointState.gateResolved.includes("CHECKPOINT_ELITE"), \`trial \${trial} second checkpoint must remain unresolved\`);\n      assert.equal(checkpointState.elitesDefeated, 1, \`trial \${trial} only ELITE_I should be credited\`);\n      assert.ok(checkpointState.evolutionCores >= 1, \`trial \${trial} Evolution Core must persist\`);\n      assert.equal(checkpointState.bossPending, false, \`trial \${trial} boss must remain unavailable\`);\n\n      record = {\n        trial,\n        frameA,\n        frameB,\n        outcome: "CHECKPOINT_ELITE_ACTIVE",\n        minHp,\n        huntTicks: huntTick,\n        atElite,\n        afterResolve,\n        stage2Start,\n        snapshots,\n        final: checkpointFinal,\n      };\n      console.log(\`CR3E2_STAGE2_LITERAL_RESULT_T\${trial}=\${JSON.stringify(record)}\`);`;

source = replaceExactOnce(source, recordNeedle, recordReplacement, "Stage-II literal traversal");

source = source.replace(
  "console.log(`CR3E2_ELITE1_RESULT_T${trial}=${JSON.stringify(record)}`);",
  "console.log(`CR3E2_STAGE2_LITERAL_RESULT_T${trial}=${JSON.stringify(record)}`);",
);

const summaryPattern = /const passed = results\.filter\(result => result\.outcome === "STAGE_II_RESUMED"\);[\s\S]*?console\.log\(`RARE_SHIFT_CR3E2_ELITE1=\$\{summary\.reliable \? "CANDIDATE_PASS" : "ITERATE"\}`\);/;
const summaryReplacement = `const passed = results.filter(result => result.outcome === "CHECKPOINT_ELITE_ACTIVE");\nconst frameStable = passed.length === TRIALS\n  && passed.every(result => result.frameA === passed[0].frameA && result.frameB === passed[0].frameB);\nconst reliable = passed.length === TRIALS\n  && frameStable\n  && passed.every(result =>\n    (result.final?.hp ?? 0) > STAGE2_MIN_FINAL_HP\n    && (result.final?.evolutionCores ?? 0) >= 1\n    && result.final?.stage === "STAGE_II"\n    && result.final?.progress === STAGE2_TARGET\n    && result.final?.gateActive === "CHECKPOINT_ELITE"\n    && result.final?.gatePhase === "ELITE_ACTIVE"\n    && result.final?.elitesDefeated === 1\n    && result.final?.bossPending === false\n    && result.final?.gateResolved.includes("ELITE_I")\n    && !result.final?.gateResolved.includes("CHECKPOINT_ELITE")\n  );\n\nconst summary = {\n  trials: TRIALS,\n  passed: passed.length,\n  passRate: TRIALS > 0 ? passed.length / TRIALS : 0,\n  frameStable,\n  reliable,\n  minHp: passed.length ? Math.min(...passed.map(result => result.minHp)) : 0,\n  finalHp: passed.map(result => result.final?.hp ?? 0),\n  finalLevels: passed.map(result => result.final?.level ?? 0),\n  finalKills: passed.map(result => result.final?.kills ?? 0),\n  finalShifts: passed.map(result => result.final?.shifts ?? 0),\n  finalProgress: passed.map(result => result.final?.progress ?? 0),\n};\n\nconsole.log(\`RARE_SHIFT_CR3E2_STAGE2_LITERAL_SUMMARY=\${JSON.stringify(summary)}\`);\nconsole.log(\`RARE_SHIFT_CR3E2_STAGE2_LITERAL=\${summary.reliable ? "CANDIDATE_PASS" : "ITERATE"}\`);\nassert.ok(summary.reliable, \`Stage-II literal-handoff reliability gate failed: \${JSON.stringify(summary)}\`);`;

source = replaceRegexOnce(source, summaryPattern, summaryReplacement, "Stage-II strict summary");

await writeFile(runnerPath, source, "utf8");
console.log("CR3E2_STAGE2_V4_LITERAL_HANDOFF=PASS");
console.log("CR3E2_STAGE2_V4_PRE_STAGE2_SOURCE=ELITE1_TRANSITION_LAB_UNCHANGED");
console.log("CR3E2_STAGE2_V4_STAGE2_SHIFT=RENDERED_POINTER");
console.log("CR3E2_STAGE2_V4_STAGE2_SHIFT_INTERVAL_MS=5400");
console.log("CR3E2_STAGE2_V4_MOVE_HOLD_MS=520");
console.log("CR3E2_STAGE2_V4_SETTLE_MS=80");
console.log("CR3E2_STAGE2_V4_FINAL_HP_MIN_EXCLUSIVE=25");
console.log("CR3E2_STAGE2_V4_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(`${pathToFileURL(runnerPath).href}?v=${Date.now()}`);
} finally {
  await unlink(runnerPath).catch(() => {});
}
