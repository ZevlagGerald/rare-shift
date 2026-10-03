import assert from "node:assert/strict";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";

const gameDirectory = resolve("games/rare-shift");
const TARGET_PROGRESS = 80_000;
const CENTER = Object.freeze({ x: 900, y: 600 });
const STRATEGY = Object.freeze({ id: "HYBRID_350_220_ABSOLUTE", outer: 350, inner: 220, pulseStart: 18_000, pulseEvery: 12_000, pulseMs: 4_200, minEngageHp: 52 });
const SHIFT_INTERVAL = 2_940;
const PASSES = 3;

function squareWaypoints(half) {
  return Object.freeze([
    Object.freeze({ x: CENTER.x, y: CENTER.y - half }),
    Object.freeze({ x: CENTER.x + half, y: CENTER.y - half }),
    Object.freeze({ x: CENTER.x + half, y: CENTER.y + half }),
    Object.freeze({ x: CENTER.x - half, y: CENTER.y + half }),
    Object.freeze({ x: CENTER.x - half, y: CENTER.y - half }),
  ]);
}

function centers(count) {
  if (count === 1) return [480];
  if (count === 2) return [350, 610];
  if (count === 3) return [220, 480, 740];
  throw new Error(`unexpected draft count ${count}`);
}

async function clickDraft(canvas, index, count) {
  const box = await canvas.boundingBox();
  assert.ok(box, "draft canvas must have a bounding box");
  await canvas.click({ position: { x: box.width * centers(count)[index] / 960, y: box.height * 320 / 640 }, timeout: 2_500 });
}

async function readState(canvas) {
  if (!(await canvas.count())) return null;
  return canvas.evaluate(element => ({
    elapsed: Number(element.dataset.directorElapsedMs ?? "0"),
    progress: Number(element.dataset.directorProgressMs ?? "0"),
    hp: Number(element.dataset.hp ?? "0"),
    level: Number(element.dataset.level ?? "1"),
    xp: Number(element.dataset.xp ?? "0"),
    kills: Number(element.dataset.kills ?? "0"),
    shifts: Number(element.dataset.shifts ?? "0"),
    phase: element.dataset.phase ?? "",
    x: Number(element.dataset.x ?? "0"),
    y: Number(element.dataset.y ?? "0"),
    dead: element.dataset.dead === "true",
    draftOpen: element.dataset.draftOpen === "true",
    draftIds: (element.dataset.draftIds ?? "").split(",").filter(Boolean),
    draftCount: Number(element.dataset.draftCount ?? "0"),
    activeEnemies: Number(element.dataset.activeEnemies ?? "0"),
    gateRuntime: element.dataset.cr3e1CheckpointRuntime ?? "",
    gatePhase: element.dataset.checkpointGatePhase ?? "",
    gateActive: element.dataset.checkpointGateActive ?? "",
  })).catch(() => null);
}

async function waitForRuntime(page, canvas) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const state = await readState(canvas);
    if (state?.gateRuntime === "ACTIVE") return state;
    await page.waitForTimeout(25);
  }
  throw new Error("checkpoint runtime did not become ACTIVE");
}

async function chooseDraft(page, canvas, state, pass) {
  assert.equal(state.draftIds.length, state.draftCount, `pass ${pass} draft ids/count mismatch`);
  const onboarding = new Map([[2, "ORBIT_NODES"], [3, "ECHO_MINE"], [4, "SIGNAL_ARC"]]);
  const required = onboarding.get(state.level);
  let index = required ? state.draftIds.indexOf(required) : -1;
  if (index < 0) {
    const priority = [
      "FIELD_REPAIR", "PROTOCOL_ORBIT_STABILIZER", "PROTOCOL_VECTOR_LENS", "PROTOCOL_COMMON_CORE",
      "DELTA_RANK", "SIGNAL_RANK", "ORBIT_RANK", "ECHO_RANK", "PROTOCOL_RESONANCE_COIL",
      "PROTOCOL_MEMORY_FUSE", "SIGNAL_MAGNET", "EVOLUTION", "VECTOR_RANK", "ORBIT_NODES",
      "ECHO_MINE", "SIGNAL_ARC", "VECTOR_NEEDLE",
    ];
    for (const token of priority) {
      index = state.draftIds.findIndex(id => id === token || id.startsWith(`${token}:`));
      if (index >= 0) break;
    }
  }
  if (index < 0) index = 0;
  console.log(`CR3E2_STAGE1_RELIABILITY_V2_DRAFT_P${pass}=L${state.level}:HP${state.hp}:XP${state.xp}:${state.draftIds.join(",")}=>${state.draftIds[index]}`);
  await clickDraft(canvas, index, state.draftCount);
  await page.waitForTimeout(90);
}

async function acknowledgedShift(page, canvas, state, pass) {
  const before = state ?? await readState(canvas);
  assert.ok(before, `pass ${pass} SHIFT requires live canvas`);
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
  assert.equal(after.shifts, before.shifts + 1, `pass ${pass} SHIFT must increment exactly once`);
  assert.notEqual(after.phase, before.phase, `pass ${pass} SHIFT must toggle phase`);
  await page.waitForTimeout(35);
  const settled = await readState(canvas);
  if (settled) assert.equal(settled.shifts, after.shifts, `pass ${pass} unsolicited duplicate SHIFT`);
  return settled ?? after;
}

function nextWaypointIndex(current, length) {
  return current === length - 1 ? 1 : current + 1;
}

async function moveToWaypoint(page, canvas, state, waypoints, waypointIndex) {
  const target = waypoints[waypointIndex];
  const dx = target.x - state.x;
  const dy = target.y - state.y;
  if (Math.abs(dx) <= 10 && Math.abs(dy) <= 10) return nextWaypointIndex(waypointIndex, waypoints.length);
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const key = horizontal ? (dx >= 0 ? "ArrowRight" : "ArrowLeft") : (dy >= 0 ? "ArrowDown" : "ArrowUp");
  const startElapsed = state.elapsed;
  const activeDeadline = startElapsed + 260;
  const wallDeadline = Date.now() + 3_000;
  await page.keyboard.down(key);
  try {
    while (Date.now() < wallDeadline) {
      await page.waitForTimeout(8);
      const current = await readState(canvas);
      if (!current || current.dead || current.draftOpen) return waypointIndex;
      const crossed = horizontal
        ? (dx >= 0 ? current.x >= target.x - 6 : current.x <= target.x + 6)
        : (dy >= 0 ? current.y >= target.y - 6 : current.y <= target.y + 6);
      if (crossed) return nextWaypointIndex(waypointIndex, waypoints.length);
      if (current.elapsed >= activeDeadline) return waypointIndex;
    }
    throw new Error(`spatial movement stalled key=${key}`);
  } finally {
    await page.keyboard.up(key);
  }
}

function engagementWindow(state) {
  if (state.hp < STRATEGY.minEngageHp) return false;
  if (state.elapsed < STRATEGY.pulseStart || state.elapsed >= 72_000) return false;
  return ((state.elapsed - STRATEGY.pulseStart) % STRATEGY.pulseEvery) < STRATEGY.pulseMs;
}

async function waitForEliteBoundary(page, canvas) {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    const state = await readState(canvas);
    if (!state || state.dead || state.gateActive === "ELITE_I") return state;
    await page.waitForTimeout(20);
  }
  return readState(canvas);
}

const outer = squareWaypoints(STRATEGY.outer);
const inner = squareWaypoints(STRATEGY.inner);
const results = [];
for (let pass = 1; pass <= PASSES; pass += 1) {
  await testGame(gameDirectory, {
    width: 960,
    height: 800,
    timeout: 150_000,
    check: async ({ page, game }) => {
      const scan = game.locator('[data-stage="scan"]');
      await scan.waitFor({ state: "visible" });
      const frameA = Number(await scan.getAttribute("data-frame-a"));
      const frameB = Number(await scan.getAttribute("data-frame-b"));
      await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
      const canvas = game.locator("canvas[data-director-stage]").first();
      await canvas.waitFor({ state: "visible" });
      await canvas.focus();
      let state = await waitForRuntime(page, canvas);
      let outerIndex = 0;
      let innerIndex = 0;
      let nextShiftAt = SHIFT_INTERVAL;
      let minHp = state.hp;
      let outcome = "UNKNOWN";
      const wallDeadline = Date.now() + 135_000;

      while (Date.now() < wallDeadline) {
        state = await readState(canvas);
        if (!state) {
          const resultStage = game.locator('[data-stage="results"]');
          outcome = (await resultStage.count()) ? (await resultStage.getAttribute("data-outcome") ?? "TERMINAL") : "CANVAS_LOST";
          break;
        }
        minHp = Math.min(minHp, state.hp);
        if (state.dead || state.hp <= 0) { outcome = "DEFEAT"; break; }
        if (state.progress >= TARGET_PROGRESS) {
          state = await waitForEliteBoundary(page, canvas) ?? state;
          outcome = state.gateActive === "ELITE_I" && state.hp > 0 ? "SURVIVED_TO_ELITE_I" : "BOUNDARY_MISSED";
          break;
        }
        if (state.draftOpen) {
          await chooseDraft(page, canvas, state, pass);
          continue;
        }

        while (state.elapsed >= nextShiftAt && nextShiftAt < TARGET_PROGRESS) {
          const shifted = await acknowledgedShift(page, canvas, state, pass);
          if (!shifted) { outcome = "CANVAS_LOST"; break; }
          state = shifted;
          nextShiftAt += SHIFT_INTERVAL;
        }
        if (outcome === "CANVAS_LOST") break;

        if (engagementWindow(state)) innerIndex = await moveToWaypoint(page, canvas, state, inner, innerIndex);
        else outerIndex = await moveToWaypoint(page, canvas, state, outer, outerIndex);
        await page.waitForTimeout(10);
      }

      const finalState = await readState(canvas) ?? state;
      const record = {
        pass, frameA, frameB, outcome, minHp,
        final: finalState ? {
          elapsed: finalState.elapsed, progress: finalState.progress, hp: finalState.hp, level: finalState.level, xp: finalState.xp,
          kills: finalState.kills, shifts: finalState.shifts, phase: finalState.phase, x: Math.round(finalState.x), y: Math.round(finalState.y),
          activeEnemies: finalState.activeEnemies, gateActive: finalState.gateActive, gatePhase: finalState.gatePhase,
        } : null,
      };
      results.push(record);
      console.log(`CR3E2_STAGE1_RELIABILITY_V2_RESULT_P${pass}=${JSON.stringify(record)}`);

      assert.equal(outcome, "SURVIVED_TO_ELITE_I", `pass ${pass} must survive to ELITE_I`);
      assert.equal(finalState?.progress, TARGET_PROGRESS, `pass ${pass} must stop at exact 80k director progress`);
      assert.equal(finalState?.gateActive, "ELITE_I", `pass ${pass} must activate ELITE_I`);
      assert.ok((finalState?.hp ?? 0) >= 25, `pass ${pass} HP margin too low: ${finalState?.hp}`);
      assert.ok((finalState?.level ?? 1) >= 3, `pass ${pass} progression too low: level ${finalState?.level}`);
      assert.ok((finalState?.kills ?? 0) >= 20, `pass ${pass} kill progression too low: ${finalState?.kills}`);
    },
  });
}

assert.equal(results.length, PASSES);
for (const result of results.slice(1)) {
  assert.equal(result.frameA, results[0].frameA, "reliability-v2 frame A drift");
  assert.equal(result.frameB, results[0].frameB, "reliability-v2 frame B drift");
}
const hpValues = results.map(result => result.final?.hp ?? 0);
const killValues = results.map(result => result.final?.kills ?? 0);
const shiftValues = results.map(result => result.final?.shifts ?? 0);
assert.ok(Math.max(...hpValues) - Math.min(...hpValues) <= 15, `HP spread too wide: ${hpValues.join(",")}`);
assert.ok(Math.max(...killValues) - Math.min(...killValues) <= 15, `kill spread too wide: ${killValues.join(",")}`);
assert.ok(Math.max(...shiftValues) - Math.min(...shiftValues) <= 1, `SHIFT spread too wide: ${shiftValues.join(",")}`);
console.log(`CR3E2_STAGE1_RELIABILITY_V2_HP=${hpValues.join(",")}`);
console.log(`CR3E2_STAGE1_RELIABILITY_V2_KILLS=${killValues.join(",")}`);
console.log(`CR3E2_STAGE1_RELIABILITY_V2_SHIFTS=${shiftValues.join(",")}`);
console.log("RARE_SHIFT_CR3E2_STAGE1_HYBRID_RELIABILITY_V2=PASS");
