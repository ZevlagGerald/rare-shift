import assert from "node:assert/strict";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";

const gameDirectory = resolve("games/rare-shift");
const TARGET_PROGRESS = Number(process.env.CR3E2_LAB_TARGET ?? "80000");
const TRIALS = Number(process.env.CR3E2_LAB_TRIALS ?? "5");
const STRICT = process.env.CR3E2_LAB_STRICT === "1";
const CENTER = Object.freeze({ x: 900, y: 600 });
const SHIFT_MIN_MS = 1_800;
const SHIFT_MAX_MS = 4_200;
const MOVE_SLICE_MS = 160;

const RINGS = Object.freeze({
  ENGAGE: 220,
  CRUISE: 300,
  OUTER: 360,
});

function squareWaypoints(half) {
  return Object.freeze([
    Object.freeze({ x: CENTER.x, y: CENTER.y - half }),
    Object.freeze({ x: CENTER.x + half, y: CENTER.y - half }),
    Object.freeze({ x: CENTER.x + half, y: CENTER.y + half }),
    Object.freeze({ x: CENTER.x - half, y: CENTER.y + half }),
    Object.freeze({ x: CENTER.x - half, y: CENTER.y - half }),
  ]);
}

const WAYPOINTS = Object.freeze({
  ENGAGE: squareWaypoints(RINGS.ENGAGE),
  CRUISE: squareWaypoints(RINGS.CRUISE),
  OUTER: squareWaypoints(RINGS.OUTER),
});

function centers(count) {
  if (count === 1) return [480];
  if (count === 2) return [350, 610];
  if (count === 3) return [220, 480, 740];
  throw new Error(`unexpected draft count ${count}`);
}

async function clickDraft(canvas, index, count) {
  const box = await canvas.boundingBox();
  assert.ok(box, "draft canvas must have a bounding box");
  await canvas.click({
    position: { x: box.width * centers(count)[index] / 960, y: box.height * 320 / 640 },
    timeout: 2_500,
  });
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

async function chooseDraft(page, canvas, state, trial) {
  assert.equal(state.draftIds.length, state.draftCount, `trial ${trial} draft ids/count mismatch`);
  const onboarding = new Map([[2, "ORBIT_NODES"], [3, "ECHO_MINE"], [4, "SIGNAL_ARC"]]);
  const required = onboarding.get(state.level);
  let index = required ? state.draftIds.indexOf(required) : -1;

  if (index < 0) {
    const priority = [
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
    ];
    for (const token of priority) {
      index = state.draftIds.findIndex(id => id === token || id.startsWith(`${token}:`));
      if (index >= 0) break;
    }
  }

  if (index < 0) index = 0;
  console.log(`CR3E2_LOCAL_DRAFT_T${trial}=L${state.level}:HP${state.hp}:XP${state.xp}:${state.draftIds.join(",")}=>${state.draftIds[index]}`);
  await clickDraft(canvas, index, state.draftCount);
  await page.waitForTimeout(75);
}

function phaseThreats(state) {
  let a = 0;
  let b = 0;
  for (const kind of state.enemyKinds) {
    if (kind === "SPLIT_A" || kind === "FLICKER_A") a += 1;
    if (kind === "SPLIT_B" || kind === "FLICKER_B") b += 1;
  }
  return { a, b };
}

function shouldShift(state, lastShiftAt) {
  const since = state.elapsed - lastShiftAt;
  if (since < SHIFT_MIN_MS) return false;
  const { a, b } = phaseThreats(state);
  const current = state.phase === "A" ? a : b;
  const alternate = state.phase === "A" ? b : a;
  if (alternate + 2 < current) return true;
  return since >= SHIFT_MAX_MS;
}

async function acknowledgedShift(page, canvas, state, trial) {
  const before = state ?? await readState(canvas);
  assert.ok(before, `trial ${trial} SHIFT requires live canvas`);
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
  assert.equal(after.shifts, before.shifts + 1, `trial ${trial} SHIFT must increment exactly once`);
  assert.notEqual(after.phase, before.phase, `trial ${trial} SHIFT must toggle phase`);
  await page.waitForTimeout(30);
  const settled = await readState(canvas);
  if (settled) assert.equal(settled.shifts, after.shifts, `trial ${trial} unsolicited duplicate SHIFT`);
  return settled ?? after;
}

function progressionBehind(state) {
  if (state.elapsed >= 65_000 && state.level < 4) return true;
  if (state.elapsed >= 52_000 && state.level < 3) return true;
  if (state.elapsed >= 40_000 && state.level < 2) return true;
  if (state.elapsed >= 70_000 && state.kills < 35) return true;
  if (state.elapsed >= 60_000 && state.kills < 22) return true;
  return false;
}

function chooseMode(state) {
  if (state.hp <= 38) return "OUTER";
  if (state.hp <= 52) return "OUTER";

  const behind = progressionBehind(state);
  if (state.activeEnemies >= 42) {
    if (behind && state.hp >= 76) return "CRUISE";
    return "OUTER";
  }
  if (state.activeEnemies >= 30) {
    if (behind && state.hp >= 68) return "CRUISE";
    return "OUTER";
  }
  if (behind && state.hp >= 62) return "ENGAGE";
  if (state.activeEnemies <= 22 && state.hp >= 66) return "ENGAGE";
  return "CRUISE";
}

function nearestWaypointIndex(state, waypoints) {
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < waypoints.length; i += 1) {
    const dx = waypoints[i].x - state.x;
    const dy = waypoints[i].y - state.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      best = i;
      bestDist = dist;
    }
  }
  return best;
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
  const key = horizontal
    ? (dx >= 0 ? "ArrowRight" : "ArrowLeft")
    : (dy >= 0 ? "ArrowDown" : "ArrowUp");
  const activeDeadline = state.elapsed + MOVE_SLICE_MS;
  const wallDeadline = Date.now() + 2_500;

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
    throw new Error(`movement stalled key=${key}`);
  } finally {
    await page.keyboard.up(key);
  }
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

function compact(state) {
  return {
    elapsed: state.elapsed,
    progress: state.progress,
    hp: state.hp,
    level: state.level,
    xp: state.xp,
    kills: state.kills,
    shifts: state.shifts,
    phase: state.phase,
    x: Math.round(state.x),
    y: Math.round(state.y),
    activeEnemies: state.activeEnemies,
    gateActive: state.gateActive,
    gatePhase: state.gatePhase,
  };
}

const results = [];
for (let trial = 1; trial <= TRIALS; trial += 1) {
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
      let mode = chooseMode(state);
      let waypointIndex = nearestWaypointIndex(state, WAYPOINTS[mode]);
      let lastShiftAt = state.elapsed;
      let nextSnapshotAt = 10_000;
      let minHp = state.hp;
      let outcome = "UNKNOWN";
      const modeCounts = { ENGAGE: 0, CRUISE: 0, OUTER: 0 };
      const snapshots = [];
      const wallDeadline = Date.now() + 135_000;

      while (Date.now() < wallDeadline) {
        state = await readState(canvas);
        if (!state) {
          const resultStage = game.locator('[data-stage="results"]');
          outcome = (await resultStage.count())
            ? (await resultStage.getAttribute("data-outcome") ?? "TERMINAL")
            : "CANVAS_LOST";
          break;
        }

        minHp = Math.min(minHp, state.hp);
        while (state.elapsed >= nextSnapshotAt && nextSnapshotAt <= TARGET_PROGRESS) {
          const snapshot = { at: nextSnapshotAt, mode, ...compact(state) };
          snapshots.push(snapshot);
          console.log(`CR3E2_LOCAL_SNAPSHOT_T${trial}=${JSON.stringify(snapshot)}`);
          nextSnapshotAt += 10_000;
        }

        if (state.dead || state.hp <= 0) {
          outcome = "DEFEAT";
          break;
        }
        if (state.progress >= TARGET_PROGRESS) {
          state = await waitForEliteBoundary(page, canvas) ?? state;
          outcome = state.gateActive === "ELITE_I" && state.hp > 0
            ? "SURVIVED_TO_ELITE_I"
            : "BOUNDARY_MISSED";
          break;
        }
        if (state.draftOpen) {
          await chooseDraft(page, canvas, state, trial);
          continue;
        }

        if (shouldShift(state, lastShiftAt)) {
          const shifted = await acknowledgedShift(page, canvas, state, trial);
          if (!shifted) {
            outcome = "CANVAS_LOST";
            break;
          }
          state = shifted;
          lastShiftAt = state.elapsed;
        }

        const nextMode = chooseMode(state);
        if (nextMode !== mode) {
          mode = nextMode;
          waypointIndex = nearestWaypointIndex(state, WAYPOINTS[mode]);
        }
        modeCounts[mode] += 1;
        waypointIndex = await moveToWaypoint(page, canvas, state, WAYPOINTS[mode], waypointIndex);
        await page.waitForTimeout(8);
      }

      const finalState = await readState(canvas) ?? state;
      const record = {
        trial,
        frameA,
        frameB,
        outcome,
        minHp,
        modeCounts,
        snapshots,
        final: finalState ? compact(finalState) : null,
      };
      results.push(record);
      console.log(`CR3E2_LOCAL_RESULT_T${trial}=${JSON.stringify(record)}`);
    },
  });
}

const survived = results.filter(result => result.outcome === "SURVIVED_TO_ELITE_I");
const finalHp = survived.map(result => result.final?.hp ?? 0);
const finalKills = survived.map(result => result.final?.kills ?? 0);
const finalLevels = survived.map(result => result.final?.level ?? 0);
const frameStable = results.every(result => result.frameA === results[0]?.frameA && result.frameB === results[0]?.frameB);
const everyUseful = results.length > 0 && results.every(result =>
  result.outcome === "SURVIVED_TO_ELITE_I"
  && (result.final?.hp ?? 0) >= 20
  && (result.final?.level ?? 0) >= 2
  && (result.final?.kills ?? 0) >= 3
);

const summary = {
  targetProgress: TARGET_PROGRESS,
  trials: TRIALS,
  survived: survived.length,
  survivalRate: TRIALS > 0 ? survived.length / TRIALS : 0,
  frameStable,
  reliable: frameStable && everyUseful,
  hp: finalHp,
  kills: finalKills,
  levels: finalLevels,
  minSurvivorHp: finalHp.length ? Math.min(...finalHp) : 0,
  minSurvivorKills: finalKills.length ? Math.min(...finalKills) : 0,
};

console.log(`RARE_SHIFT_CR3E2_LOCAL_STAGE1_SUMMARY=${JSON.stringify(summary)}`);
if (STRICT) {
  assert.ok(summary.reliable, `local Stage-I reliability gate failed: ${JSON.stringify(summary)}`);
  console.log("RARE_SHIFT_CR3E2_LOCAL_STAGE1=PASS");
} else {
  console.log(`RARE_SHIFT_CR3E2_LOCAL_STAGE1=${summary.reliable ? "CANDIDATE_PASS" : "ITERATE"}`);
}
