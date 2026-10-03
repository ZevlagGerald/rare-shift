import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const sourcePath = resolve("scripts/local/cr3e2-stage2-activation-lab.mjs");
const generatedPath = resolve("scripts/local/.cr3e2-stage2-activation-v2.generated.mjs");
let source = await readFile(sourcePath, "utf8");

function replaceExactOnce(input, from, to, label) {
  const first = input.indexOf(from);
  assert.ok(first >= 0, `${label}: reviewed source fragment not found`);
  assert.equal(input.indexOf(from, first + from.length), -1, `${label}: source fragment is not unique`);
  return input.slice(0, first) + to + input.slice(first + from.length);
}

source = replaceExactOnce(
  source,
  'const ELITE_MOVE_SLICE_MS = 140;\n',
  `const ELITE_MOVE_SLICE_MS = 140;\nconst STAGE2_SHIFT_INTERVAL_MS = 5_400;\nconst STAGE2_WAYPOINTS = Object.freeze([\n  Object.freeze({ x: 300, y: 250 }),\n  Object.freeze({ x: 1500, y: 250 }),\n  Object.freeze({ x: 1500, y: 950 }),\n  Object.freeze({ x: 300, y: 950 }),\n]);\n`,
  "stage2 constants",
);

const ackPattern = /async function acknowledgedShift\(page, canvas, state, trial\) \{[\s\S]*?\n\}\n\nfunction progressionBehind/;
const ackMatches = source.match(new RegExp(ackPattern.source, "g")) ?? [];
assert.equal(ackMatches.length, 1, "acknowledgedShift reviewed function must match exactly once");
source = source.replace(
  ackPattern,
  `async function acknowledgedShift(page, canvas, state, trial) {\n  const before = state ?? await readState(canvas);\n  assert.ok(before, \`trial \${trial} SHIFT requires live canvas\`);\n\n  async function attempt() {\n    await canvas.focus().catch(() => {});\n    await page.keyboard.down("Space");\n    await page.waitForTimeout(18);\n    await page.keyboard.up("Space");\n\n    const deadline = Date.now() + 1_500;\n    let observed = await readState(canvas);\n    while (Date.now() < deadline && observed && observed.shifts === before.shifts) {\n      await page.waitForTimeout(10);\n      observed = await readState(canvas);\n    }\n    return observed;\n  }\n\n  let after = await attempt();\n  if (!after) return null;\n\n  // Browser focus/event delivery can occasionally drop a physical key event.\n  // Retry only when the first attempt produced no SHIFT at all. Never retry an\n  // accepted SHIFT, and still fail closed on duplicate increments.\n  if (after.shifts === before.shifts) {\n    console.log(\`CR3E2_SHIFT_RETRY_T\${trial}=BEFORE_\${before.shifts}\`);\n    await page.waitForTimeout(40);\n    after = await attempt();\n  }\n\n  if (!after) return null;\n  assert.equal(after.shifts, before.shifts + 1, \`trial \${trial} SHIFT must increment exactly once\`);\n  assert.notEqual(after.phase, before.phase, \`trial \${trial} SHIFT must toggle phase\`);\n  await page.waitForTimeout(30);\n  const settled = await readState(canvas);\n  if (settled) assert.equal(settled.shifts, after.shifts, \`trial \${trial} unsolicited duplicate SHIFT\`);\n  return settled ?? after;\n}\n\nfunction progressionBehind`,
);

source = replaceExactOnce(
  source,
  `function chooseStage2Mode(state) {\n  if (state.hp <= 55) return "OUTER";\n  if (state.activeEnemies >= 42) return "OUTER";\n  if (state.activeEnemies >= 30) return state.hp >= 72 ? "CRUISE" : "OUTER";\n  if (state.activeEnemies <= 18 && state.hp >= 72) return "ENGAGE";\n  return "CRUISE";\n}\n`,
  `function chooseStage2Mode(_state) {\n  return "PERIMETER";\n}\n\nfunction shouldShiftStage2(state, lastShiftAt) {\n  return state.elapsed - lastShiftAt >= STAGE2_SHIFT_INTERVAL_MS;\n}\n`,
  "stage2 policy",
);

const stage2Marker = `      mode = chooseStage2Mode(state);\n      waypointIndex = nearestWaypointIndex(state, WAYPOINTS[mode]);\n      lastShiftAt = state.elapsed;`;
source = replaceExactOnce(
  source,
  stage2Marker,
  `      mode = chooseStage2Mode(state);\n      waypointIndex = nearestWaypointIndex(state, STAGE2_WAYPOINTS);\n      lastShiftAt = state.elapsed;`,
  "stage2 entry waypoint",
);

const stage2Start = source.indexOf('      mode = chooseStage2Mode(state);\n      waypointIndex = nearestWaypointIndex(state, STAGE2_WAYPOINTS);');
assert.ok(stage2Start >= 0, "stage2 transformed entry not found");
const prefix = source.slice(0, stage2Start);
let tail = source.slice(stage2Start);

tail = replaceExactOnce(
  tail,
  `        if (shouldShift(state, lastShiftAt)) {`,
  `        if (shouldShiftStage2(state, lastShiftAt)) {`,
  "stage2 shift cadence",
);

tail = replaceExactOnce(
  tail,
  `        const nextMode = chooseStage2Mode(state);\n        if (nextMode !== mode) {\n          mode = nextMode;\n          waypointIndex = nearestWaypointIndex(state, WAYPOINTS[mode]);\n        }\n        waypointIndex = await moveToWaypoint(page, canvas, state, WAYPOINTS[mode], waypointIndex, trial);`,
  `        mode = chooseStage2Mode(state);\n        waypointIndex = await moveToWaypoint(page, canvas, state, STAGE2_WAYPOINTS, waypointIndex, trial);`,
  "stage2 perimeter movement",
);

source = prefix + tail;

await writeFile(generatedPath, source, "utf8");
console.log("CR3E2_STAGE2_V2_DRIVER_PATCH=PASS");
console.log("CR3E2_STAGE2_V2_SHIFT_INTERVAL_MS=5400");
console.log("CR3E2_STAGE2_V2_PERIMETER=300,250|1500,250|1500,950|300,950");
console.log("CR3E2_STAGE2_V2_SHIFT_RETRY=FOCUS_AND_RETRY_ON_ZERO_ONLY");

try {
  await import(`${pathToFileURL(generatedPath).href}?v=${Date.now()}`);
} finally {
  await unlink(generatedPath).catch(() => {});
}
