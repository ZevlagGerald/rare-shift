import assert from "node:assert/strict";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";

const gameDirectory = resolve("games/rare-shift");
const TRIALS = Number(process.env.CR3E2_STAGE2_TRIALS ?? "3");
const CENTER = Object.freeze({ x: 900, y: 600 });
const STAGE1_TARGET = 80_000;
const STAGE2_TARGET = 180_000;
const SHIFT_MIN_MS = 1_800;
const SHIFT_MAX_MS = 4_200;
const MOVE_SLICE_MS = 160;
const ELITE_MOVE_SLICE_MS = 140;

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
    stage: element.dataset.directorStage ?? "",
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
    gateResolved: (element.dataset.checkpointGateResolved ?? "").split(",").filter(Boolean),
    pendingRewards: element.dataset.checkpointGatePendingRewards ?? "",
    elitesDefeated: Number(element.dataset.elitesDefeated ?? "0"),
    evolutionCores: Number(element.dataset.evolutionCores ?? "0"),
    reservedActive: Number(element.dataset.checkpointReservedActive ?? "0"),
    eliteX: Number(element.dataset.checkpointEliteX ?? "NaN"),
    eliteY: Number(element.dataset.checkpointEliteY ?? "NaN"),
    ordinarySpawnIndex: Number(element.dataset.checkpointOrdinarySpawnIndex ?? "0"),
    bossPending: element.dataset.bossPending === "true",
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
      index = state.draftIds.findIndex(id => id === token || id.startsWith(`${token}:`));
      if (index >= 0) break;
    }
  }

  if (index < 0) index = 0;
  console.log(`CR3E2_STAGE2_DRAFT_T${trial}=L${state.level}:HP${state.hp}:${state.draftIds.join(",")}=>${state.draftIds[index]}`);
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

function chooseStage1Mode(state) {
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

function chooseStage2Mode(state) {
  if (state.hp <= 55) return "OUTER";
  if (state.activeEnemies >= 42) return "OUTER";
  if (state.activeEnemies >= 30) return state.hp >= 72 ? "CRUISE" : "OUTER";
  if (state.activeEnemies <= 18 && state.hp >= 72) return "ENGAGE";
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

async function moveForActiveMs(page, canvas, state, key, activeMs, trial) {
  const deadline = state.elapsed + activeMs;
  const wallDeadline = Date.now() + 2_500;
  await page.keyboard.down(key);
  try {
    while (Date.now() < wallDeadline) {
      await page.waitForTimeout(8);
      const current = await readState(canvas);
      if (!current || current.dead || current.draftOpen) return current;
      if (current.elapsed >= deadline) return current;
    }
    throw new Error(`trial ${trial} movement stalled key=${key}`);
  } finally {
    await page.keyboard.up(key);
  }
}

async function moveToWaypoint(page, canvas, state, waypoints, waypointIndex, trial) {
  const target = waypoints[waypointIndex];
  const dx = target.x - state.x;
  const dy = target.y - state.y;
  if (Math.abs(dx) <= 10 && Math.abs(dy) <= 10) return nextWaypointIndex(waypointIndex, waypoints.length);

  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const key = horizontal
    ? (dx >= 0 ? "ArrowRight" : "ArrowLeft")
    : (dy >= 0 ? "ArrowDown" : "ArrowUp");

  const moved = await moveForActiveMs(page, canvas, state, key, MOVE_SLICE_MS, trial);
  if (!moved) return waypointIndex;
  const crossed = horizontal
    ? (dx >= 0 ? moved.x >= target.x - 6 : moved.x <= target.x + 6)
    : (dy >= 0 ? moved.y >= target.y - 6 : moved.y <= target.y + 6);
  return crossed ? nextWaypointIndex(waypointIndex, waypoints.length) : waypointIndex;
}

async function moveEliteCombatLane(page, canvas, state, huntTick, trial) {
  assert.ok(Number.isFinite(state.eliteX) && Number.isFinite(state.eliteY), `trial ${trial} active elite must expose coordinates`);
  const dx = state.eliteX - state.x;
  const dy = state.eliteY - state.y;
  const distance = Math.hypot(dx, dy);
  const horizontalDominant = Math.abs(dx) >= Math.abs(dy);
  let key;

  if (distance > 210) {
    key = horizontalDominant
      ? (dx >= 0 ? "ArrowRight" : "ArrowLeft")
      : (dy >= 0 ? "ArrowDown" : "ArrowUp");
  } else if (distance < 140) {
    key = horizontalDominant
      ? (dx >= 0 ? "ArrowLeft" : "ArrowRight")
      : (dy >= 0 ? "ArrowUp" : "ArrowDown");
  } else if (horizontalDominant) {
    key = huntTick % 2 === 0 ? "ArrowUp" : "ArrowDown";
  } else {
    key = huntTick % 2 === 0 ? "ArrowLeft" : "ArrowRight";
  }

  return moveForActiveMs(page, canvas, state, key, ELITE_MOVE_SLICE_MS, trial);
}

function compact(state) {
  if (!state) return null;
  return {
    elapsed: state.elapsed,
    progress: state.progress,
    stage: state.stage,
    hp: state.hp,
    level: state.level,
    xp: state.xp,
    kills: state.kills,
    shifts: state.shifts,
    phase: state.phase,
    x: Math.round(state.x),
    y: Math.round(state.y),
    activeEnemies: state.activeEnemies,
    gatePhase: state.gatePhase,
    gateActive: state.gateActive,
    gateResolved: state.gateResolved,
    pendingRewards: state.pendingRewards,
    elitesDefeated: state.elitesDefeated,
    evolutionCores: state.evolutionCores,
    reservedActive: state.reservedActive,
    bossPending: state.bossPending,
  };
}

async function runTrial(trial) {
  let record = null;
  await testGame(gameDirectory, {
    width: 960,
    height: 800,
    timeout: 320_000,
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
      let mode = chooseStage1Mode(state);
      let waypointIndex = nearestWaypointIndex(state, WAYPOINTS[mode]);
      let lastShiftAt = state.elapsed;
      let minHp = state.hp;
      const stage1WallDeadline = Date.now() + 135_000;

      while (Date.now() < stage1WallDeadline) {
        state = await readState(canvas);
        if (!state) break;
        minHp = Math.min(minHp, state.hp);
        if (state.dead || state.hp <= 0) break;
        if (state.gateActive === "ELITE_I" && state.progress === STAGE1_TARGET) break;

        if (state.draftOpen) {
          await chooseDraft(page, canvas, state, trial);
          continue;
        }
        if (shouldShift(state, lastShiftAt)) {
          const shifted = await acknowledgedShift(page, canvas, state, trial);
          if (!shifted) break;
          state = shifted;
          lastShiftAt = state.elapsed;
        }

        const nextMode = chooseStage1Mode(state);
        if (nextMode !== mode) {
          mode = nextMode;
          waypointIndex = nearestWaypointIndex(state, WAYPOINTS[mode]);
        }
        waypointIndex = await moveToWaypoint(page, canvas, state, WAYPOINTS[mode], waypointIndex, trial);
        await page.waitForTimeout(8);
      }

      state = await readState(canvas);
      const atElite1 = compact(state);
      console.log(`CR3E2_STAGE2_AT_ELITE1_T${trial}=${JSON.stringify(atElite1)}`);

      assert.ok(state, `trial ${trial} lost canvas before ELITE_I`);
      assert.equal(state.dead, false, `trial ${trial} died before ELITE_I`);
      assert.equal(state.gateActive, "ELITE_I", `trial ${trial} must activate ELITE_I naturally`);
      assert.equal(state.gatePhase, "ELITE_ACTIVE", `trial ${trial} ELITE_I gate phase`);
      assert.equal(state.progress, STAGE1_TARGET, `trial ${trial} progress must freeze at 80000`);
      assert.equal(state.stage, "STAGE_I", `trial ${trial} must remain Stage I while ELITE_I is unresolved`);
      assert.equal(state.bossPending, false, `trial ${trial} boss must not be pending`);

      const spawnIndexAtGate = state.ordinarySpawnIndex;
      let huntTick = 0;
      let eliteLastShiftAt = state.elapsed;
      const resolveWallDeadline = Date.now() + 70_000;

      while (Date.now() < resolveWallDeadline) {
        state = await readState(canvas);
        if (!state) break;
        minHp = Math.min(minHp, state.hp);
        if (state.dead || state.hp <= 0) break;
        if (state.gateResolved.includes("ELITE_I")) break;

        if (state.draftOpen) {
          await chooseDraft(page, canvas, state, trial);
          continue;
        }

        if (state.gatePhase === "ELITE_ACTIVE") {
          const moved = await moveEliteCombatLane(page, canvas, state, huntTick, trial);
          huntTick += 1;
          if (!moved) break;
          state = moved;

          if (huntTick % 6 === 0 && state.gatePhase === "ELITE_ACTIVE") {
            const shifted = await acknowledgedShift(page, canvas, state, trial);
            if (!shifted) break;
            state = shifted;
            eliteLastShiftAt = state.elapsed;
          } else if (shouldShift(state, eliteLastShiftAt)) {
            const shifted = await acknowledgedShift(page, canvas, state, trial);
            if (!shifted) break;
            state = shifted;
            eliteLastShiftAt = state.elapsed;
          }
        } else {
          await page.waitForTimeout(80);
        }
        await page.waitForTimeout(20);
      }

      state = await readState(canvas);
      assert.ok(state, `trial ${trial} lost canvas resolving ELITE_I`);
      assert.equal(state.dead, false, `trial ${trial} died resolving ELITE_I`);
      assert.ok(state.gateResolved.includes("ELITE_I"), `trial ${trial} ELITE_I must resolve`);
      assert.equal(state.gatePhase, "RUNNING", `trial ${trial} gate must return to RUNNING`);
      assert.equal(state.gateActive, "", `trial ${trial} ELITE_I active gate must clear`);
      assert.equal(state.pendingRewards, "", `trial ${trial} pending rewards must be empty`);
      assert.equal(state.elitesDefeated, 1, `trial ${trial} exactly one elite must be credited`);
      assert.ok(state.evolutionCores >= 1, `trial ${trial} must collect ELITE_I Evolution Core`);
      assert.equal(state.reservedActive, 0, `trial ${trial} reserved reward slots must release`);
      assert.equal(state.ordinarySpawnIndex, spawnIndexAtGate, `trial ${trial} ordinary spawn sequence must freeze during ELITE_I`);

      const resumeDeadline = Date.now() + 3_000;
      while (Date.now() < resumeDeadline) {
        state = await readState(canvas);
        if (!state || state.dead) break;
        if (state.progress > STAGE1_TARGET && state.stage === "STAGE_II") break;
        await page.waitForTimeout(40);
      }

      state = await readState(canvas);
      const stage2Start = compact(state);
      console.log(`CR3E2_STAGE2_START_T${trial}=${JSON.stringify(stage2Start)}`);

      assert.ok(state, `trial ${trial} lost canvas before Stage II traversal`);
      assert.equal(state.dead, false, `trial ${trial} died before Stage II traversal`);
      assert.equal(state.stage, "STAGE_II", `trial ${trial} must enter Stage II`);
      assert.ok(state.progress > STAGE1_TARGET, `trial ${trial} Stage II progress must resume above 80000`);
      assert.ok(state.gateResolved.includes("ELITE_I"), `trial ${trial} ELITE_I resolution must persist`);
      assert.equal(state.bossPending, false, `trial ${trial} boss must remain unavailable`);

      mode = chooseStage2Mode(state);
      waypointIndex = nearestWaypointIndex(state, WAYPOINTS[mode]);
      lastShiftAt = state.elapsed;
      let nextSnapshotAt = 100_000;
      const snapshots = [];
      const stage2WallDeadline = Date.now() + 145_000;

      while (Date.now() < stage2WallDeadline) {
        state = await readState(canvas);
        if (!state) break;
        minHp = Math.min(minHp, state.hp);

        while (state.progress >= nextSnapshotAt && nextSnapshotAt <= STAGE2_TARGET) {
          const snapshot = { at: nextSnapshotAt, mode, ...compact(state) };
          snapshots.push(snapshot);
          console.log(`CR3E2_STAGE2_SNAPSHOT_T${trial}=${JSON.stringify(snapshot)}`);
          nextSnapshotAt += 20_000;
        }

        if (state.dead || state.hp <= 0) break;
        if (state.gateActive === "CHECKPOINT_ELITE" && state.progress === STAGE2_TARGET) break;

        if (state.draftOpen) {
          await chooseDraft(page, canvas, state, trial);
          continue;
        }

        if (shouldShift(state, lastShiftAt)) {
          const shifted = await acknowledgedShift(page, canvas, state, trial);
          if (!shifted) break;
          state = shifted;
          lastShiftAt = state.elapsed;
        }

        const nextMode = chooseStage2Mode(state);
        if (nextMode !== mode) {
          mode = nextMode;
          waypointIndex = nearestWaypointIndex(state, WAYPOINTS[mode]);
        }
        waypointIndex = await moveToWaypoint(page, canvas, state, WAYPOINTS[mode], waypointIndex, trial);
        await page.waitForTimeout(8);
      }

      state = await readState(canvas);
      const atCheckpointElite = compact(state);
      console.log(`CR3E2_STAGE2_AT_CHECKPOINT_T${trial}=${JSON.stringify(atCheckpointElite)}`);

      assert.ok(state, `trial ${trial} lost canvas before CHECKPOINT_ELITE`);
      assert.equal(state.dead, false, `trial ${trial} died before CHECKPOINT_ELITE`);
      assert.equal(state.progress, STAGE2_TARGET, `trial ${trial} progress must stop exactly at 180000`);
      assert.equal(state.stage, "STAGE_II", `trial ${trial} stage must remain Stage II at CHECKPOINT_ELITE activation`);
      assert.equal(state.gateActive, "CHECKPOINT_ELITE", `trial ${trial} CHECKPOINT_ELITE must activate naturally`);
      assert.equal(state.gatePhase, "ELITE_ACTIVE", `trial ${trial} CHECKPOINT_ELITE gate phase`);
      assert.ok(state.gateResolved.includes("ELITE_I"), `trial ${trial} ELITE_I resolution must persist`);
      assert.ok(!state.gateResolved.includes("CHECKPOINT_ELITE"), `trial ${trial} second checkpoint must remain unresolved`);
      assert.equal(state.elitesDefeated, 1, `trial ${trial} only ELITE_I should be credited before second checkpoint combat`);
      assert.ok(state.evolutionCores >= 1, `trial ${trial} ELITE_I core must persist`);
      assert.equal(state.bossPending, false, `trial ${trial} boss must not be pending at 180000`);

      record = {
        trial,
        frameA,
        frameB,
        outcome: "CHECKPOINT_ELITE_ACTIVE",
        minHp,
        huntTicks: huntTick,
        stage2Start,
        snapshots,
        final: atCheckpointElite,
      };
      console.log(`CR3E2_STAGE2_RESULT_T${trial}=${JSON.stringify(record)}`);
    },
  });
  return record;
}

const results = [];
for (let trial = 1; trial <= TRIALS; trial += 1) {
  try {
    const record = await runTrial(trial);
    if (record) results.push(record);
  } catch (error) {
    const record = {
      trial,
      outcome: "ERROR",
      message: error instanceof Error ? error.message : String(error),
    };
    results.push(record);
    console.log(`CR3E2_STAGE2_RESULT_T${trial}=${JSON.stringify(record)}`);
  }
}

const passed = results.filter(result => result.outcome === "CHECKPOINT_ELITE_ACTIVE");
const frameStable = passed.length === TRIALS
  && passed.every(result => result.frameA === passed[0].frameA && result.frameB === passed[0].frameB);
const reliable = passed.length === TRIALS
  && frameStable
  && passed.every(result =>
    (result.final?.hp ?? 0) > 0
    && result.final?.progress === STAGE2_TARGET
    && result.final?.stage === "STAGE_II"
    && result.final?.gateActive === "CHECKPOINT_ELITE"
    && result.final?.bossPending === false
    && (result.final?.evolutionCores ?? 0) >= 1
  );

const summary = {
  trials: TRIALS,
  passed: passed.length,
  passRate: TRIALS > 0 ? passed.length / TRIALS : 0,
  frameStable,
  reliable,
  minHp: passed.length ? Math.min(...passed.map(result => result.minHp)) : 0,
  finalHp: passed.map(result => result.final?.hp ?? 0),
  finalLevels: passed.map(result => result.final?.level ?? 0),
  finalKills: passed.map(result => result.final?.kills ?? 0),
  finalShifts: passed.map(result => result.final?.shifts ?? 0),
  finalProgress: passed.map(result => result.final?.progress ?? 0),
};

console.log(`RARE_SHIFT_CR3E2_STAGE2_SUMMARY=${JSON.stringify(summary)}`);
console.log(`RARE_SHIFT_CR3E2_STAGE2=${summary.reliable ? "CANDIDATE_PASS" : "ITERATE"}`);
