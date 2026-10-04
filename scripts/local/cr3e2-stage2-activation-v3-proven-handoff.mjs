import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const sourcePath = resolve("scripts/local/cr3e2-stage2-activation-v3.mjs");
const runnerPath = resolve("scripts/local/.cr3e2-stage2-activation-v3-proven-handoff.runner.mjs");
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
  /async function chooseDraft\(page, canvas, state, trial\) \{/,
  "async function chooseDraftStage2Policy(page, canvas, state, trial) {",
  "rename Stage-II draft policy",
);

source = replaceRegexOnce(
  source,
  /\nfunction phaseThreats\(state\) \{/,
  `
async function chooseDraft(page, canvas, state, trial) {
  if (state.stage !== "STAGE_I") {
    return chooseDraftStage2Policy(page, canvas, state, trial);
  }

  assert.equal(state.draftIds.length, state.draftCount, \`trial \${trial} draft ids/count mismatch\`);
  const onboarding = new Map([[2, "ORBIT_NODES"], [3, "ECHO_MINE"], [4, "SIGNAL_ARC"]]);
  const required = onboarding.get(state.level);
  let index = required ? state.draftIds.indexOf(required) : -1;

  if (index < 0) {
    const priority = state.hp <= 68
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
      : [
          "ORBIT_NODES",
          "ECHO_MINE",
          "SIGNAL_ARC",
          "ORBIT_RANK",
          "ECHO_RANK",
          "SIGNAL_RANK",
          "DELTA_RANK",
          "VECTOR_NEEDLE",
          "VECTOR_RANK",
          "FIELD_REPAIR",
          "SIGNAL_MAGNET",
        ];
    for (const token of priority) {
      index = state.draftIds.findIndex(id => id === token || id.startsWith(\`\${token}:\`));
      if (index >= 0) break;
    }
  }

  if (index < 0) index = 0;
  console.log(\`CR3E2_PROVEN_HANDOFF_DRAFT_T\${trial}=L\${state.level}:HP\${state.hp}:\${state.draftIds.join(",")}=>\${state.draftIds[index]}\`);
  await clickDraft(canvas, index, state.draftCount);
  await page.waitForTimeout(75);
}

function phaseThreats(state) {`,
  "proven Stage-I/ELITE_I draft policy",
);

source = replaceRegexOnce(
  source,
  /async function acknowledgedShift\(page, canvas, state, trial\) \{/,
  "async function acknowledgedPointerShift(page, canvas, state, trial) {",
  "rename pointer SHIFT",
);

source = replaceRegexOnce(
  source,
  /  let after = await attempt\(\);\r?\n  if \(!after\) return null;\r?\n  if \(after\.shifts === before\.shifts\) \{\r?\n    console\.log\([^\r\n]*CR3E2_POINTER_SHIFT_RETRY[^\r\n]*\);\r?\n    await page\.waitForTimeout\(40\);\r?\n    after = await attempt\(\);\r?\n  \}/,
  "  let after = await attempt();\n  if (!after) return null;\n  if (after.shifts === before.shifts) {\n    console.log(\"CR3E2_POINTER_SHIFT_RETRY_T\" + trial + \"=BEFORE_\" + before.shifts);\n    await page.waitForTimeout(40);\n    let retryState = await readState(canvas);\n    if (!retryState) return null;\n    let draftRaceCount = 0;\n    while (retryState.draftOpen && draftRaceCount < 6) {\n      console.log(\"CR3E2_POINTER_SHIFT_DRAFT_RACE_T\" + trial + \"=L\" + retryState.level + \":HP\" + retryState.hp + \":SHIFT\" + retryState.shifts);\n      assert.equal(retryState.shifts, before.shifts, \"trial \" + trial + \" draft race must not alter SHIFT count\");\n      await chooseDraft(page, canvas, retryState, trial);\n      await page.waitForTimeout(75);\n      retryState = await readState(canvas);\n      if (!retryState) return null;\n      draftRaceCount += 1;\n    }\n    assert.equal(retryState.draftOpen, false, \"trial \" + trial + \" pointer SHIFT retry blocked by unresolved draft\");\n    assert.equal(retryState.shifts, before.shifts, \"trial \" + trial + \" pre-retry SHIFT count drift\");\n    await canvas.focus().catch(() => {});\n    after = await attempt();\n  }",
  "pointer SHIFT draft-race retry",
);

source = replaceRegexOnce(
  source,
  /\nfunction progressionBehind\(state\) \{/,
  `
async function acknowledgedShift(page, canvas, state, trial) {
  const before = state ?? await readState(canvas);
  assert.ok(before, \`trial \${trial} SHIFT requires live canvas\`);
  assert.equal(before.draftOpen, false, \`trial \${trial} SHIFT cannot be issued during draft\`);

  if (before.stage !== "STAGE_I") {
    return acknowledgedPointerShift(page, canvas, before, trial);
  }

  await canvas.focus().catch(() => {});
  await page.keyboard.down("Space");
  await page.waitForTimeout(18);
  await page.keyboard.up("Space");

  const deadline = Date.now() + 1_500;
  let after = await readState(canvas);
  while (Date.now() < deadline && after && after.shifts === before.shifts) {
    await page.waitForTimeout(10);
    after = await readState(canvas);
  }
  if (!after) return null;
  assert.equal(after.shifts, before.shifts + 1, \`trial \${trial} proven-handoff SHIFT must increment exactly once\`);
  assert.notEqual(after.phase, before.phase, \`trial \${trial} proven-handoff SHIFT must toggle phase\`);
  await page.waitForTimeout(30);
  const settled = await readState(canvas);
  if (settled) assert.equal(settled.shifts, after.shifts, \`trial \${trial} unsolicited duplicate proven-handoff SHIFT\`);
  return settled ?? after;
}

function progressionBehind(state) {`,
  "proven Stage-I/ELITE_I SHIFT handoff",
);
`;

source = source.slice(0, insertAt) + injection + source.slice(insertAt);
await writeFile(runnerPath, source, "utf8");
console.log("CR3E2_STAGE2_V3_PROVEN_HANDOFF=PASS");
console.log("CR3E2_STAGE2_V3_PRE_STAGE2_SHIFT=PROVEN_KEYBOARD_ACK");
console.log("CR3E2_STAGE2_V3_PRE_STAGE2_DRAFT=PROVEN_ELITE_TRANSITION_POLICY");
console.log("CR3E2_STAGE2_V3_STAGE2_SHIFT=RENDERED_POINTER");
console.log("CR3E2_STAGE2_V3_STAGE2_SHIFT_INTERVAL_MS=5400");
console.log("CR3E2_STAGE2_V3_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(`${pathToFileURL(runnerPath).href}?v=${Date.now()}`);
} finally {
  await unlink(runnerPath).catch(() => {});
}
