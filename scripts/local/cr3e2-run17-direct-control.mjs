import assert from "node:assert/strict";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";

const gameDirectory = resolve("games/rare-shift");
const TRIALS = Number(process.env.CR3E2_RUN17_CONTROL_TRIALS ?? "3");
const TARGET_PROGRESS = 180_000;
const HISTORICAL_HEAD = "051c95e86c56e12852fd21debf31d1f2be7288de";

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

async function mount(game) {
  await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
  const anyCanvas = game.locator("canvas").first();
  await anyCanvas.waitFor({ state: "visible" });
  const canvas = game.locator("canvas[data-director-stage]").first();
  await canvas.waitFor({ state: "visible" });
  await canvas.focus();
  return canvas;
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
    cr2DraftActive: element.dataset.cr2DraftActive === "true",
    refracts: Number(element.dataset.refracts ?? "0"),
    rerollNonce: Number(element.dataset.rerollNonce ?? "0"),
    activeEnemies: Number(element.dataset.activeEnemies ?? "0"),
    enemyKinds: (element.dataset.enemyKinds ?? "").split(",").filter(Boolean),
    elitesDefeated: Number(element.dataset.elitesDefeated ?? "0"),
    cores: Number(element.dataset.evolutionCores ?? "0"),
    gateRuntime: element.dataset.cr3e1CheckpointRuntime ?? "",
    gatePhase: element.dataset.checkpointGatePhase ?? "",
    gateActive: element.dataset.checkpointGateActive ?? "",
    gatePendingRewards: (element.dataset.checkpointGatePendingRewards ?? "").split(",").filter(Boolean),
    gateResolved: (element.dataset.checkpointGateResolved ?? "").split(",").filter(Boolean),
    gateResolvedCount: Number(element.dataset.checkpointGateResolvedCount ?? "0"),
    gateBossReady: element.dataset.checkpointGateBossReady === "true",
    reservedActive: Number(element.dataset.checkpointReservedActive ?? "0"),
    eliteX: Number(element.dataset.checkpointEliteX ?? "NaN"),
    eliteY: Number(element.dataset.checkpointEliteY ?? "NaN"),
    eliteHp: Number(element.dataset.checkpointEliteHp ?? "NaN"),
    bossPending: element.dataset.bossPending === "true",
    bossActive: element.dataset.cr3BossActive === "true",
  })).catch(() => null);
}

async function waitForCheckpointRuntime(page, canvas, trial) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const state = await canvas.getAttribute("data-cr3e1-checkpoint-runtime");
    const error = await canvas.getAttribute("data-cr3e1-checkpoint-runtime-error");
    if (state === "ACTIVE") return;
    if (error) throw new Error(`trial ${trial} checkpoint runtime failed: ${error}`);
    await page.waitForTimeout(100);
  }
  throw new Error(`trial ${trial} checkpoint runtime did not activate`);
}

async function chooseDraft(canvas, state, page, trial) {
  assert.equal(state.draftIds.length, state.draftCount, `trial ${trial} draft ids/count mismatch`);

  const qualifiedOnboarding = new Map([
    [2, "ORBIT_NODES"],
    [3, "ECHO_MINE"],
    [4, "SIGNAL_ARC"],
  ]);
  const onboardingChoice = qualifiedOnboarding.get(state.level);
  if (onboardingChoice) {
    const onboardingIndex = state.draftIds.indexOf(onboardingChoice);
    if (onboardingIndex >= 0) {
      console.log(`CR3E2_RUN17_DRAFT_T${trial}=L${state.level}:HP${state.hp}:${state.draftIds.join(",")}=>${state.draftIds[onboardingIndex]}`);
      await clickDraft(canvas, onboardingIndex, state.draftCount);
      await page.waitForTimeout(90);
      return;
    }
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
    await canvas.press("r", { timeout: 2_500 });
    await page.waitForTimeout(110);
    const replacement = await readState(canvas);
    const accepted = replacement
      && replacement.draftOpen
      && (replacement.rerollNonce > beforeNonce || replacement.refracts < beforeRefracts);
    if (accepted) {
      assert.equal(replacement.draftIds.length, replacement.draftCount, `trial ${trial} REFRACT replacement ids/count mismatch`);
      console.log(`CR3E2_RUN17_REFRACT_T${trial}=L${state.level}:HP${state.hp}:R${beforeRefracts}->${replacement.refracts}:NONCE${beforeNonce}->${replacement.rerollNonce}:${beforeIds}=>${replacement.draftIds.join(",")}`);
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

  let index = -1;
  for (const token of priority) {
    index = state.draftIds.findIndex(id => id === token || id.startsWith(`${token}:`));
    if (index >= 0) break;
  }
  if (index < 0) index = 0;
  console.log(`CR3E2_RUN17_DRAFT_T${trial}=L${state.level}:HP${state.hp}:${state.draftIds.join(",")}=>${state.draftIds[index]}`);
  await clickDraft(canvas, index, state.draftCount);
  await page.waitForTimeout(90);
}

async function moveNaturalSurvivalLane(canvas, state, tick) {
  const x = state.x;
  const y = state.y;
  let key;
  if (y < 250 && x < 1500) key = "ArrowRight";
  else if (x >= 1500 && y < 950) key = "ArrowDown";
  else if (y >= 950 && x > 300) key = "ArrowLeft";
  else if (x <= 300 && y > 250) key = "ArrowUp";
  else key = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"][Math.floor(tick / 10) % 4];
  const postStageOne = state.stage !== "STAGE_I";
  await canvas.press(key, { delay: postStageOne ? 520 : 420, timeout: 2_500 });
  const pressureShift = postStageOne && (state.activeEnemies >= 32 || state.hp <= 25);
  return { settle: postStageOne ? 80 : 0, shiftModulo: pressureShift ? 5 : 7 };
}

async function moveEliteCombatLane(canvas, state, tick) {
  assert.ok(Number.isFinite(state.eliteX) && Number.isFinite(state.eliteY), "active checkpoint elite must expose diagnostics");
  const dx = state.eliteX - state.x;
  const dy = state.eliteY - state.y;
  const distance = Math.hypot(dx, dy);
  const horizontalDominant = Math.abs(dx) >= Math.abs(dy);
  const criticalLaterGate = state.gateActive !== "ELITE_I" && state.hp <= 25;
  const minDistance = criticalLaterGate ? 220 : 140;
  const maxDistance = criticalLaterGate ? 330 : 210;
  let key;
  if (distance > maxDistance) {
    key = horizontalDominant
      ? dx >= 0 ? "ArrowRight" : "ArrowLeft"
      : dy >= 0 ? "ArrowDown" : "ArrowUp";
  } else if (distance < minDistance) {
    key = horizontalDominant
      ? dx >= 0 ? "ArrowLeft" : "ArrowRight"
      : dy >= 0 ? "ArrowUp" : "ArrowDown";
  } else if (horizontalDominant) {
    key = tick % 2 === 0 ? "ArrowUp" : "ArrowDown";
  } else {
    key = tick % 2 === 0 ? "ArrowLeft" : "ArrowRight";
  }
  await canvas.press(key, { delay: 180 });
}

async function moveTowardPoint(canvas, state, point) {
  const dx = point.x - state.x;
  const dy = point.y - state.y;
  if (Math.hypot(dx, dy) < 42) {
    await canvas.press("ArrowRight", { delay: 80 });
    return;
  }
  const key = Math.abs(dx) >= Math.abs(dy)
    ? dx >= 0 ? "ArrowRight" : "ArrowLeft"
    : dy >= 0 ? "ArrowDown" : "ArrowUp";
  await canvas.press(key, { delay: 150 });
}

function compact(state) {
  if (!state) return null;
  return {
    elapsed: state.elapsed,
    progress: state.progress,
    stage: state.stage,
    hp: state.hp,
    level: state.level,
    kills: state.kills,
    shifts: state.shifts,
    phase: state.phase,
    x: Math.round(state.x),
    y: Math.round(state.y),
    activeEnemies: state.activeEnemies,
    gatePhase: state.gatePhase,
    gateActive: state.gateActive,
    gateResolved: state.gateResolved,
    elitesDefeated: state.elitesDefeated,
    cores: state.cores,
    reservedActive: state.reservedActive,
    bossPending: state.bossPending,
    moveTick: state.moveTick,
    checkpointTick: state.checkpointTick,
  };
}

async function runTrial(trial) {
  let record = null;
  await testGame(gameDirectory, {
    width: 960,
    height: 800,
    timeout: 260_000,
    check: async ({ page, game }) => {
      const scan = game.locator('[data-stage="scan"]');
      await scan.waitFor({ state: "visible" });
      const frameA = Number(await scan.getAttribute("data-frame-a"));
      const frameB = Number(await scan.getAttribute("data-frame-b"));
      const canvas = await mount(game);
      await waitForCheckpointRuntime(page, canvas, trial);

      let moveTick = 0;
      let checkpointTick = 0;
      let lastCheckpointPosition = null;
      let minHp = Number.POSITIVE_INFINITY;
      let runningProgress = 0;
      let runningProgressAt = Date.now();
      const wallDeadline = Date.now() + 220_000;

      const shiftAndObserve = async () => {
        await canvas.press("Space", { timeout: 2_500 });
        await page.waitForTimeout(105);
        return readState(canvas);
      };

      while (Date.now() < wallDeadline) {
        let state = await readState(canvas);
        assert.ok(state, `trial ${trial} lost combat canvas`);
        minHp = Math.min(minHp, state.hp);

        if (state.dead || state.hp <= 0) {
          throw new Error(`trial ${trial} Run-17 control died before checkpoint; last=${JSON.stringify(compact({ ...state, moveTick, checkpointTick }))}`);
        }
        assert.equal(state.gateRuntime, "ACTIVE", `trial ${trial} checkpoint runtime lost authority`);

        if (state.gateResolvedCount < 3) {
          assert.equal(state.bossPending, false, `trial ${trial} boss became pending before checkpoint completion`);
          assert.equal(state.bossActive, false, `trial ${trial} boss became active before checkpoint completion`);
          assert.equal(state.gateBossReady, false, `trial ${trial} boss-ready appeared too early`);
        }

        if (Number.isFinite(state.eliteX) && Number.isFinite(state.eliteY)) {
          lastCheckpointPosition = { x: state.eliteX, y: state.eliteY };
        }

        if (state.gateActive === "ELITE_I") {
          assert.equal(state.progress, 80_000, `trial ${trial} ELITE_I progress boundary`);
          assert.equal(state.stage, "STAGE_I", `trial ${trial} ELITE_I stage boundary`);
        }

        if (state.gateActive === "CHECKPOINT_ELITE") {
          const final = compact({ ...state, moveTick, checkpointTick });
          console.log(`CR3E2_RUN17_CONTROL_CHECKPOINT_T${trial}=${JSON.stringify(final)}`);
          assert.equal(state.progress, TARGET_PROGRESS, `trial ${trial} CHECKPOINT_ELITE progress boundary`);
          assert.equal(state.stage, "STAGE_II", `trial ${trial} CHECKPOINT_ELITE stage boundary`);
          assert.equal(state.gatePhase, "ELITE_ACTIVE", `trial ${trial} CHECKPOINT_ELITE phase`);
          assert.deepEqual(state.gateResolved, ["ELITE_I"], `trial ${trial} resolved checkpoint prefix`);
          assert.equal(state.elitesDefeated, 1, `trial ${trial} exactly one elite defeat before checkpoint`);
          assert.ok(state.cores >= 1, `trial ${trial} expected at least one Evolution Core`);
          assert.equal(state.bossPending, false, `trial ${trial} boss must not be pending`);
          record = {
            trial,
            frameA,
            frameB,
            outcome: "CHECKPOINT_ELITE_ACTIVE",
            minHp,
            moveTick,
            checkpointTick,
            final,
          };
          console.log(`CR3E2_RUN17_CONTROL_RESULT_T${trial}=${JSON.stringify(record)}`);
          return;
        }

        if (state.draftOpen) {
          await chooseDraft(canvas, state, page, trial);
          continue;
        }

        if (state.gatePhase === "RUNNING" && !state.bossActive && state.stage !== "BOSS_PENDING") {
          if (state.progress > runningProgress) {
            runningProgress = state.progress;
            runningProgressAt = Date.now();
          } else if (Date.now() - runningProgressAt > 8_000) {
            throw new Error(`trial ${trial} RUNNING progress stalled for >8s; last=${JSON.stringify(compact({ ...state, moveTick, checkpointTick }))}`);
          }
        } else {
          runningProgress = state.progress;
          runningProgressAt = Date.now();
        }

        if (state.gatePhase === "ELITE_ACTIVE") {
          const thinLaterCheckpointField = state.gateActive !== "ELITE_I" && state.activeEnemies > 1;
          if (thinLaterCheckpointField) {
            const movement = await moveNaturalSurvivalLane(canvas, state, moveTick);
            moveTick += 1;
            await page.waitForTimeout(movement.settle);
            if (moveTick % movement.shiftModulo === 0) await shiftAndObserve();
            await page.waitForTimeout(45);
          } else {
            await moveEliteCombatLane(canvas, state, checkpointTick);
            checkpointTick += 1;
            if (checkpointTick % 6 === 0) await shiftAndObserve();
            await page.waitForTimeout(35);
          }
        } else if (state.gatePhase === "REWARD_PENDING") {
          if (lastCheckpointPosition) await moveTowardPoint(canvas, state, lastCheckpointPosition);
          await page.waitForTimeout(80);
        } else {
          const movement = await moveNaturalSurvivalLane(canvas, state, moveTick);
          moveTick += 1;
          await page.waitForTimeout(movement.settle);
          if (moveTick % movement.shiftModulo === 0) await shiftAndObserve();
          await page.waitForTimeout(45);
        }
      }

      throw new Error(`trial ${trial} Run-17 control timed out before CHECKPOINT_ELITE`);
    },
  });
  return record;
}

console.log("CR3E2_RUN17_DIRECT_CONTROL=START");
console.log(`CR3E2_RUN17_DIRECT_CONTROL_HISTORICAL_HEAD=${HISTORICAL_HEAD}`);
console.log("CR3E2_RUN17_DIRECT_CONTROL_SOURCE=HISTORICAL_CALLER_SEMANTICS_PLUS_RUN17_WORKFLOW_PATCHES");
console.log("CR3E2_RUN17_DIRECT_CONTROL_MOVE_TICK=GLOBAL_ACROSS_NORMAL_SURVIVAL");
console.log("CR3E2_RUN17_DIRECT_CONTROL_CHECKPOINT_TICK=SEPARATE_ELITE_COUNTER");
console.log("CR3E2_RUN17_DIRECT_CONTROL_STOP=CHECKPOINT_ELITE_AT_180000");
console.log("CR3E2_RUN17_DIRECT_CONTROL_FINAL_HP_MIN_EXCLUSIVE=25");
console.log("CR3E2_RUN17_DIRECT_CONTROL_SCOPE=LOCAL_DRIVER_ONLY");

const results = [];
for (let trial = 1; trial <= TRIALS; trial += 1) {
  try {
    const result = await runTrial(trial);
    if (result) results.push(result);
  } catch (error) {
    const result = {
      trial,
      outcome: "ERROR",
      message: error instanceof Error ? error.message : String(error),
    };
    results.push(result);
    console.log(`CR3E2_RUN17_CONTROL_RESULT_T${trial}=${JSON.stringify(result)}`);
  }
}

const passed = results.filter(result => result.outcome === "CHECKPOINT_ELITE_ACTIVE");
const frameStable = passed.length === TRIALS
  && passed.every(result => result.frameA === passed[0].frameA && result.frameB === passed[0].frameB);
const reliable = passed.length === TRIALS
  && frameStable
  && passed.every(result =>
    (result.final?.hp ?? 0) > 25
    && result.final?.progress === TARGET_PROGRESS
    && result.final?.stage === "STAGE_II"
    && result.final?.gateActive === "CHECKPOINT_ELITE"
    && result.final?.gatePhase === "ELITE_ACTIVE"
    && result.final?.elitesDefeated === 1
    && (result.final?.cores ?? 0) >= 1
    && result.final?.bossPending === false
  );

const summary = {
  trials: TRIALS,
  passed: passed.length,
  passRate: TRIALS > 0 ? passed.length / TRIALS : 0,
  frameStable,
  reliable,
  minHp: passed.length ? Math.min(...passed.map(result => result.minHp)) : 0,
  finalHp: passed.map(result => result.final?.hp ?? 0),
  finalShifts: passed.map(result => result.final?.shifts ?? 0),
  finalProgress: passed.map(result => result.final?.progress ?? 0),
  moveTicks: passed.map(result => result.moveTick ?? 0),
  checkpointTicks: passed.map(result => result.checkpointTick ?? 0),
};

console.log(`RARE_SHIFT_CR3E2_RUN17_CONTROL_SUMMARY=${JSON.stringify(summary)}`);
console.log(`RARE_SHIFT_CR3E2_RUN17_CONTROL=${reliable ? "CANDIDATE_PASS" : "ITERATE"}`);
assert.ok(reliable, `Run-17 direct-control reliability gate failed: ${JSON.stringify(summary)}`);
