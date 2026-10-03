import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const sourcePath = resolve("scripts/local/cr3e2-stage2-activation-lab.mjs");
const generatedPath = resolve("scripts/local/.cr3e2-stage2-activation-v3.generated.mjs");
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

source = replaceRegexOnce(
  source,
  /const ELITE_MOVE_SLICE_MS = 140;\r?\n/,
  `const ELITE_MOVE_SLICE_MS = 140;\nconst STAGE2_SHIFT_INTERVAL_MS = 5_400;\nconst STAGE2_MOVE_HOLD_MS = 520;\nconst STAGE2_SETTLE_MS = 80;\nconst STAGE2_MIN_FINAL_HP = 25;\nconst SHIFT_BUTTON_GAME_X = 842;\nconst SHIFT_BUTTON_GAME_Y = 530;\nconst GAME_VIEW_W = 960;\nconst GAME_VIEW_H = 640;\n`,
  "stage2 constants",
);

source = replaceRegexOnce(
  source,
  /    draftCount: Number\(element\.dataset\.draftCount \?\? "0"\),\r?\n/,
  `    draftCount: Number(element.dataset.draftCount ?? "0"),\n    cr2DraftActive: element.dataset.cr2DraftActive === "true",\n    refracts: Number(element.dataset.refracts ?? "0"),\n    rerollNonce: Number(element.dataset.rerollNonce ?? "0"),\n`,
  "draft diagnostics",
);

source = replaceRegexOnce(
  source,
  /async function chooseDraft\(page, canvas, state, trial\) \{[\s\S]*?\r?\n\}\r?\n\r?\nfunction phaseThreats/,
  `async function chooseDraft(page, canvas, state, trial) {\n  assert.equal(state.draftIds.length, state.draftCount, \`trial \${trial} draft ids/count mismatch\`);\n  const onboarding = new Map([[2, "ORBIT_NODES"], [3, "ECHO_MINE"], [4, "SIGNAL_ARC"]]);\n  const required = onboarding.get(state.level);\n  let index = required ? state.draftIds.indexOf(required) : -1;\n\n  if (index >= 0) {\n    console.log(\`CR3E2_STAGE2_DRAFT_T\${trial}=L\${state.level}:HP\${state.hp}:\${state.draftIds.join(",")}=>\${state.draftIds[index]}\`);\n    await clickDraft(canvas, index, state.draftCount);\n    await page.waitForTimeout(75);\n    return;\n  }\n\n  const criticalRefract = state.level >= 5\n    && state.hp <= 25\n    && state.cr2DraftActive\n    && state.refracts > 0\n    && !state.draftIds.includes("FIELD_REPAIR");\n  if (criticalRefract) {\n    const beforeRefracts = state.refracts;\n    const beforeNonce = state.rerollNonce;\n    const beforeIds = state.draftIds.join(",");\n    await canvas.focus().catch(() => {});\n    await canvas.press("r", { timeout: 2_500 });\n    await page.waitForTimeout(110);\n    const replacement = await readState(canvas);\n    const accepted = replacement?.draftOpen\n      && (replacement.rerollNonce > beforeNonce || replacement.refracts < beforeRefracts);\n    if (accepted) {\n      console.log(\`CR3E2_STAGE2_REFRACT_T\${trial}=L\${state.level}:HP\${state.hp}:R\${beforeRefracts}->\${replacement.refracts}:NONCE\${beforeNonce}->\${replacement.rerollNonce}:\${beforeIds}=>\${replacement.draftIds.join(",")}\`);\n      state = replacement;\n    }\n  }\n\n  const pressureDraft = state.level >= 5 && (state.hp <= 60 || state.activeEnemies >= 32);\n  const lowHp = state.hp <= 72;\n  const priority = pressureDraft\n    ? [\n        "FIELD_REPAIR",\n        "PROTOCOL_ORBIT_STABILIZER",\n        "PROTOCOL_VECTOR_LENS",\n        "PROTOCOL_COMMON_CORE",\n        "DELTA_RANK",\n        "SIGNAL_RANK",\n        "ORBIT_RANK",\n        "ECHO_RANK",\n        "PROTOCOL_RESONANCE_COIL",\n        "PROTOCOL_MEMORY_FUSE",\n        "SIGNAL_MAGNET",\n        "EVOLUTION",\n        "VECTOR_RANK",\n        "ORBIT_NODES",\n        "ECHO_MINE",\n        "SIGNAL_ARC",\n        "VECTOR_NEEDLE",\n      ]\n    : lowHp\n      ? [\n          "FIELD_REPAIR",\n          "PROTOCOL_ORBIT_STABILIZER",\n          "PROTOCOL_VECTOR_LENS",\n          "PROTOCOL_MEMORY_FUSE",\n          "SIGNAL_MAGNET",\n          "PROTOCOL_RESONANCE_COIL",\n          "EVOLUTION",\n          "ORBIT_RANK",\n          "ECHO_RANK",\n          "SIGNAL_RANK",\n          "DELTA_RANK",\n          "VECTOR_RANK",\n          "PROTOCOL_COMMON_CORE",\n          "ORBIT_NODES",\n          "ECHO_MINE",\n          "SIGNAL_ARC",\n          "VECTOR_NEEDLE",\n        ]\n      : [\n          "ORBIT_NODES",\n          "ECHO_MINE",\n          "SIGNAL_ARC",\n          "EVOLUTION",\n          "SIGNAL_MAGNET",\n          "ORBIT_RANK",\n          "ECHO_RANK",\n          "SIGNAL_RANK",\n          "DELTA_RANK",\n          "VECTOR_RANK",\n          "PROTOCOL_ORBIT_STABILIZER",\n          "PROTOCOL_MEMORY_FUSE",\n          "PROTOCOL_COMMON_CORE",\n          "PROTOCOL_RESONANCE_COIL",\n          "PROTOCOL_VECTOR_LENS",\n          "VECTOR_NEEDLE",\n          "FIELD_REPAIR",\n        ];\n\n  index = -1;\n  for (const token of priority) {\n    index = state.draftIds.findIndex(id => id === token || id.startsWith(\`\${token}:\`));\n    if (index >= 0) break;\n  }\n  if (index < 0) index = 0;\n  console.log(\`CR3E2_STAGE2_DRAFT_T\${trial}=L\${state.level}:HP\${state.hp}:\${state.draftIds.join(",")}=>\${state.draftIds[index]}\`);\n  await clickDraft(canvas, index, state.draftCount);\n  await page.waitForTimeout(75);\n}\n\nfunction phaseThreats`,
  "Run-17 draft policy",
);

source = replaceRegexOnce(
  source,
  /async function acknowledgedShift\(page, canvas, state, trial\) \{[\s\S]*?\r?\n\}\r?\n\r?\nfunction progressionBehind/,
  `async function acknowledgedShift(page, canvas, state, trial) {\n  const before = state ?? await readState(canvas);\n  assert.ok(before, \`trial \${trial} SHIFT requires live canvas\`);\n  assert.equal(before.draftOpen, false, \`trial \${trial} SHIFT cannot be issued during draft\`);\n\n  const box = await canvas.boundingBox();\n  assert.ok(box, \`trial \${trial} SHIFT requires canvas bounds\`);\n  const position = {\n    x: box.width * SHIFT_BUTTON_GAME_X / GAME_VIEW_W,\n    y: box.height * SHIFT_BUTTON_GAME_Y / GAME_VIEW_H,\n  };\n\n  async function attempt() {\n    await canvas.click({ position, timeout: 2_500 });\n    const deadline = Date.now() + 1_500;\n    let observed = await readState(canvas);\n    while (Date.now() < deadline && observed && observed.shifts === before.shifts) {\n      await page.waitForTimeout(10);\n      observed = await readState(canvas);\n    }\n    return observed;\n  }\n\n  let after = await attempt();\n  if (!after) return null;\n  if (after.shifts === before.shifts) {\n    console.log(\`CR3E2_POINTER_SHIFT_RETRY_T\${trial}=BEFORE_\${before.shifts}\`);\n    await page.waitForTimeout(40);\n    after = await attempt();\n  }\n\n  if (!after) return null;\n  assert.equal(after.shifts, before.shifts + 1, \`trial \${trial} pointer SHIFT must increment exactly once\`);\n  assert.notEqual(after.phase, before.phase, \`trial \${trial} pointer SHIFT must toggle phase\`);\n  await page.waitForTimeout(30);\n  const settled = await readState(canvas);\n  if (settled) assert.equal(settled.shifts, after.shifts, \`trial \${trial} unsolicited duplicate pointer SHIFT\`);\n  return settled ?? after;\n}\n\nfunction progressionBehind`,
  "pointer SHIFT",
);

source = replaceRegexOnce(
  source,
  /async function moveForActiveMs\(page, canvas, state, key, activeMs, trial\) \{\r?\n  const deadline = state\.elapsed \+ activeMs;\r?\n  const wallDeadline = Date\.now\(\) \+ 2_500;\r?\n  await page\.keyboard\.down\(key\);/,
  `async function moveForActiveMs(page, canvas, state, key, activeMs, trial) {\n  const deadline = state.elapsed + activeMs;\n  const wallDeadline = Date.now() + 2_500;\n  await canvas.focus().catch(() => {});\n  await page.keyboard.down(key);`,
  "movement focus",
);

source = replaceRegexOnce(
  source,
  /function chooseStage2Mode\(state\) \{\r?\n  if \(state\.hp <= 55\) return "OUTER";\r?\n  if \(state\.activeEnemies >= 42\) return "OUTER";\r?\n  if \(state\.activeEnemies >= 30\) return state\.hp >= 72 \? "CRUISE" : "OUTER";\r?\n  if \(state\.activeEnemies <= 18 && state\.hp >= 72\) return "ENGAGE";\r?\n  return "CRUISE";\r?\n\}/,
  `function chooseStage2Mode(_state) {\n  return "RUN17_OUTER_LANE";\n}\n\nfunction shouldShiftStage2(state, lastShiftAt) {\n  return state.elapsed - lastShiftAt >= STAGE2_SHIFT_INTERVAL_MS;\n}\n\nasync function moveStage2OuterLane(page, canvas, state, tick, trial) {\n  const x = state.x;\n  const y = state.y;\n  let key;\n  if (y < 250 && x < 1500) key = "ArrowRight";\n  else if (x >= 1500 && y < 950) key = "ArrowDown";\n  else if (y >= 950 && x > 300) key = "ArrowLeft";\n  else if (x <= 300 && y > 250) key = "ArrowUp";\n  else key = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"][Math.floor(tick / 10) % 4];\n  return moveForActiveMs(page, canvas, state, key, STAGE2_MOVE_HOLD_MS, trial);\n}`,
  "Run-17 Stage-II movement policy",
);

source = replaceRegexOnce(
  source,
  /      mode = chooseStage2Mode\(state\);\r?\n      waypointIndex = nearestWaypointIndex\(state, WAYPOINTS\[mode\]\);\r?\n      lastShiftAt = state\.elapsed;/,
  `      mode = chooseStage2Mode(state);\n      lastShiftAt = state.elapsed;\n      let stage2MoveTick = 0;`,
  "Stage-II entry movement state",
);

const stage2Start = source.indexOf("      mode = chooseStage2Mode(state);\n      lastShiftAt = state.elapsed;\n      let stage2MoveTick = 0;");
assert.ok(stage2Start >= 0, "Stage-II V3 entry not found");
const prefix = source.slice(0, stage2Start);
let tail = source.slice(stage2Start);

tail = replaceExactOnce(
  tail,
  "        if (shouldShift(state, lastShiftAt)) {",
  "        if (shouldShiftStage2(state, lastShiftAt)) {",
  "Stage-II V3 shift cadence",
);

tail = replaceRegexOnce(
  tail,
  /        const nextMode = chooseStage2Mode\(state\);\r?\n        if \(nextMode !== mode\) \{\r?\n          mode = nextMode;\r?\n          waypointIndex = nearestWaypointIndex\(state, WAYPOINTS\[mode\]\);\r?\n        \}\r?\n        waypointIndex = await moveToWaypoint\(page, canvas, state, WAYPOINTS\[mode\], waypointIndex, trial\);/,
  `        mode = chooseStage2Mode(state);\n        const moved = await moveStage2OuterLane(page, canvas, state, stage2MoveTick, trial);\n        stage2MoveTick += 1;\n        if (!moved) break;\n        state = moved;\n        await page.waitForTimeout(STAGE2_SETTLE_MS);`,
  "Run-17 Stage-II movement loop",
);

tail = replaceExactOnce(
  tail,
  "    (result.final?.hp ?? 0) > 0",
  "    (result.final?.hp ?? 0) > STAGE2_MIN_FINAL_HP",
  "Stage-II final HP safety margin",
);

source = prefix + tail;

await writeFile(generatedPath, source, "utf8");
console.log("CR3E2_STAGE2_V3_DRIVER_PATCH=PASS");
console.log("CR3E2_STAGE2_V3_SHIFT_INPUT=RENDERED_POINTER_842_530");
console.log("CR3E2_STAGE2_V3_SHIFT_INTERVAL_MS=5400");
console.log("CR3E2_STAGE2_V3_MOVE_HOLD_MS=520");
console.log("CR3E2_STAGE2_V3_SETTLE_MS=80");
console.log("CR3E2_STAGE2_V3_FINAL_HP_MIN_EXCLUSIVE=25");
console.log("CR3E2_STAGE2_V3_ROUTE=RUN17_COARSE_OUTER_LANE");
console.log("CR3E2_STAGE2_V3_DRAFT_POLICY=RUN17_PRESSURE_LOWHP_REFRACT");

try {
  await import(`${pathToFileURL(generatedPath).href}?v=${Date.now()}`);
} finally {
  await unlink(generatedPath).catch(() => {});
}
