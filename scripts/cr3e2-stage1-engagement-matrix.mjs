import assert from "node:assert/strict";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";

const gameDirectory = resolve("games/rare-shift");
const TARGET_PROGRESS = 80_000;
const WAYPOINTS = Object.freeze([
  Object.freeze({ x: 900, y: 350 }),
  Object.freeze({ x: 1300, y: 350 }),
  Object.freeze({ x: 1300, y: 850 }),
  Object.freeze({ x: 500, y: 850 }),
  Object.freeze({ x: 500, y: 350 }),
]);
const STRATEGIES = Object.freeze([
  Object.freeze({ id: "INNER_DWELL_25", dwellMs: 25 }),
  Object.freeze({ id: "INNER_DWELL_35", dwellMs: 35 }),
  Object.freeze({ id: "INNER_DWELL_45", dwellMs: 45 }),
]);

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
    stage: element.dataset.directorStage ?? "",
    elapsed: Number(element.dataset.directorElapsedMs ?? "0"),
    progress: Number(element.dataset.directorProgressMs ?? "0"),
    hp: Number(element.dataset.hp ?? "0"),
    level: Number(element.dataset.level ?? "1"),
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
    enemyKinds: (element.dataset.enemyKinds ?? "").split(",").filter(Boolean),
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

async function chooseDraft(page, canvas, state, strategyId) {
  assert.equal(state.draftIds.length, state.draftCount, `${strategyId} draft ids/count mismatch`);
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
  console.log(`CR3E2_STAGE1_ENGAGE_DRAFT_${strategyId}=L${state.level}:HP${state.hp}:${state.draftIds.join(",")}=>${state.draftIds[index]}`);
  await clickDraft(canvas, index, state.draftCount);
  await page.waitForTimeout(90);
}

async function acknowledgedShift(page, canvas, state, strategyId) {
  const before = state ?? await readState(canvas);
  assert.ok(before, `${strategyId} SHIFT requires live canvas`);
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
  assert.equal(after.shifts, before.shifts + 1, `${strategyId} SHIFT must increment exactly once`);
  assert.notEqual(after.phase, before.phase, `${strategyId} SHIFT must toggle phase`);
  await page.waitForTimeout(60);
  const settled = await readState(canvas);
  if (settled) assert.equal(settled.shifts, after.shifts, `${strategyId} unsolicited duplicate SHIFT`);
  return settled ?? after;
}

async function holdKeyForActiveMs(page, canvas, key, activeMs) {
  const start = await readState(canvas);
  if (!start) return null;
  const target = start.elapsed + activeMs;
  const deadline = Date.now() + 3_000;
  await page.keyboard.down(key);
  try {
    while (Date.now() < deadline) {
      await page.waitForTimeout(8);
      const current = await readState(canvas);
      if (!current || current.dead || current.draftOpen || current.elapsed >= target) return current;
    }
    throw new Error(`active-time movement stalled key=${key} target=${target}`);
  } finally {
    await page.keyboard.up(key);
  }
}

function nextWaypointIndex(current) {
  return current === WAYPOINTS.length - 1 ? 1 : current + 1;
}

async function moveTowardWaypoint(page, canvas, state, waypointIndex) {
  const target = WAYPOINTS[waypointIndex];
  const dx = target.x - state.x;
  const dy = target.y - state.y;
  if (Math.abs(dx) <= 14 && Math.abs(dy) <= 14) return nextWaypointIndex(waypointIndex);
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const key = horizontal ? (dx >= 0 ? "ArrowRight" : "ArrowLeft") : (dy >= 0 ? "ArrowDown" : "ArrowUp");
  const updated = await holdKeyForActiveMs(page, canvas, key, 120);
  if (!updated) return waypointIndex;
  const reached = horizontal
    ? (dx >= 0 ? updated.x >= target.x - 10 : updated.x <= target.x + 10)
    : (dy >= 0 ? updated.y >= target.y - 10 : updated.y <= target.y + 10);
  return reached ? nextWaypointIndex(waypointIndex) : waypointIndex;
}

function shouldThreatShift(state) {
  const a = state.enemyKinds.filter(kind => kind === "SPLIT_A" || kind === "FLICKER_A").length;
  const b = state.enemyKinds.filter(kind => kind === "SPLIT_B" || kind === "FLICKER_B").length;
  const current = state.phase === "A" ? a : b;
  const alternate = state.phase === "A" ? b : a;
  return alternate + 2 < current;
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

const results = [];
for (const strategy of STRATEGIES) {
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
      let waypointIndex = 0;
      let nextPeriodicShiftAt = 2_940;
      let nextSnapshotAt = 10_000;
      let minHp = state.hp;
      const snapshots = [];
      const wallDeadline = Date.now() + 135_000;
      let outcome = "UNKNOWN";

      while (Date.now() < wallDeadline) {
        state = await readState(canvas);
        if (!state) {
          const resultStage = game.locator('[data-stage="results"]');
          outcome = (await resultStage.count()) ? (await resultStage.getAttribute("data-outcome") ?? "TERMINAL") : "CANVAS_LOST";
          break;
        }
        minHp = Math.min(minHp, state.hp);
        while (state.elapsed >= nextSnapshotAt && nextSnapshotAt <= TARGET_PROGRESS) {
          const snapshot = {
            at: nextSnapshotAt, elapsed: state.elapsed, progress: state.progress, hp: state.hp,
            level: state.level, kills: state.kills, shifts: state.shifts, phase: state.phase,
            x: Math.round(state.x), y: Math.round(state.y), activeEnemies: state.activeEnemies,
          };
          snapshots.push(snapshot);
          console.log(`CR3E2_STAGE1_ENGAGE_SNAPSHOT_${strategy.id}=${JSON.stringify(snapshot)}`);
          nextSnapshotAt += 10_000;
        }
        if (state.dead || state.hp <= 0) { outcome = "DEFEAT"; break; }
        if (state.progress >= TARGET_PROGRESS) {
          state = await waitForEliteBoundary(page, canvas) ?? state;
          outcome = state.gateActive === "ELITE_I" && state.hp > 0 ? "SURVIVED_TO_ELITE_I" : "BOUNDARY_MISSED";
          break;
        }
        if (state.draftOpen) {
          await chooseDraft(page, canvas, state, strategy.id);
          continue;
        }

        const periodicDue = state.elapsed >= nextPeriodicShiftAt;
        const threatDue = shouldThreatShift(state) && state.elapsed + 350 < nextPeriodicShiftAt;
        if (periodicDue || threatDue) {
          const shifted = await acknowledgedShift(page, canvas, state, strategy.id);
          if (!shifted) { outcome = "CANVAS_LOST"; break; }
          state = shifted;
          nextPeriodicShiftAt = state.elapsed + 2_940;
        }

        waypointIndex = await moveTowardWaypoint(page, canvas, state, waypointIndex);
        await page.waitForTimeout(strategy.dwellMs);
      }

      const finalState = await readState(canvas) ?? state;
      const ready = outcome === "SURVIVED_TO_ELITE_I" && (finalState?.level ?? 0) >= 4 && (finalState?.kills ?? 0) >= 21;
      const record = {
        strategy: strategy.id, dwellMs: strategy.dwellMs, frameA, frameB, outcome, ready, minHp, snapshots,
        final: finalState ? {
          elapsed: finalState.elapsed, progress: finalState.progress, hp: finalState.hp, level: finalState.level,
          kills: finalState.kills, shifts: finalState.shifts, phase: finalState.phase,
          x: Math.round(finalState.x), y: Math.round(finalState.y), activeEnemies: finalState.activeEnemies,
          gateActive: finalState.gateActive, gatePhase: finalState.gatePhase,
        } : null,
      };
      results.push(record);
      console.log(`CR3E2_STAGE1_ENGAGE_RESULT_${strategy.id}=${JSON.stringify(record)}`);
    },
  });
}

assert.equal(results.length, STRATEGIES.length);
for (const result of results.slice(1)) {
  assert.equal(result.frameA, results[0].frameA, "engagement matrix frame A drift");
  assert.equal(result.frameB, results[0].frameB, "engagement matrix frame B drift");
}
const ranked = [...results].sort((a, b) => {
  if (Number(a.ready) !== Number(b.ready)) return Number(b.ready) - Number(a.ready);
  const aSurvived = a.outcome === "SURVIVED_TO_ELITE_I" ? 1 : 0;
  const bSurvived = b.outcome === "SURVIVED_TO_ELITE_I" ? 1 : 0;
  if (aSurvived !== bSurvived) return bSurvived - aSurvived;
  if ((a.final?.level ?? 0) !== (b.final?.level ?? 0)) return (b.final?.level ?? 0) - (a.final?.level ?? 0);
  if ((a.final?.kills ?? 0) !== (b.final?.kills ?? 0)) return (b.final?.kills ?? 0) - (a.final?.kills ?? 0);
  return (b.final?.hp ?? 0) - (a.final?.hp ?? 0);
});
console.log(`CR3E2_STAGE1_ENGAGE_READY=${results.filter(r => r.ready).map(r => r.strategy).join(",") || "NONE"}`);
console.log(`CR3E2_STAGE1_ENGAGE_BEST=${ranked[0].strategy}`);
console.log("RARE_SHIFT_CR3E2_STAGE1_ENGAGEMENT_MATRIX=COMPLETE");
