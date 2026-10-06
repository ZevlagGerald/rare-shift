console.log("CR3E2_RUN17_POSTL6_DIAG_WRAPPER=PASS");
console.log("CR3E2_RUN17_POSTL6_DIAG_SOURCE=UNCHANGED_DIRECT_RUN17_CONTROL");
console.log("CR3E2_RUN17_POSTL6_DIAG_WINDOW=AFTER_L6_DRAFT_TO_CHECKPOINT_ELITE_180000");
console.log("CR3E2_RUN17_POSTL6_DIAG_HOLDS=EVERY_STAGE2_NATURAL_MOVEMENT_HOLD");
console.log("CR3E2_RUN17_POSTL6_DIAG_DAMAGE=EVERY_OBSERVED_HP_DECREASE");
console.log("CR3E2_RUN17_POSTL6_DIAG_SHIFT=PRE_AND_POST_STATE");
console.log("CR3E2_RUN17_POSTL6_DIAG_L7=OPEN_RESOLVED_PLUS_BASELINE_DRAFT_REFRACT_LOGS");
console.log("CR3E2_RUN17_POSTL6_DIAG_ROUTE=BASELINE_Y950_UNCHANGED");
console.log("CR3E2_RUN17_POSTL6_DIAG_HOLD_MS=BASELINE_520_UNCHANGED");
console.log("CR3E2_RUN17_POSTL6_DIAG_REFRACT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_POSTL6_DIAG_PRESSURE_SHIFT=BASELINE_HP25_UNCHANGED");
console.log("CR3E2_RUN17_POSTL6_DIAG_DRAFT_PRIORITY=UNCHANGED");
console.log("CR3E2_RUN17_POSTL6_DIAG_OBSERVER_NOTE=POST_ACTION_STATE_READS_ADD_DIAGNOSTIC_OVERHEAD");
console.log("CR3E2_RUN17_POSTL6_DIAG_SCOPE=LOCAL_DRIVER_ONLY");
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";

const gameDirectory = resolve("games/rare-shift");
const TRIALS = Number(process.env.CR3E2_RUN17_POSTL6_DIAG_TRIALS ?? "10");
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
  let edge;
  if (y < 250 && x < 1500) { key = "ArrowRight"; edge = "TOP"; }
  else if (x >= 1500 && y < 950) { key = "ArrowDown"; edge = "RIGHT"; }
  else if (y >= 950 && x > 300) { key = "ArrowLeft"; edge = "BOTTOM"; }
  else if (x <= 300 && y > 250) { key = "ArrowUp"; edge = "LEFT"; }
  else { key = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"][Math.floor(tick / 10) % 4]; edge = "FALLBACK"; }
  const postStageOne = state.stage !== "STAGE_I";
  await canvas.press(key, { delay: postStageOne ? 520 : 420, timeout: 2_500 });
  const pressureShift = postStageOne && (state.activeEnemies >= 32 || state.hp <= 25);
  return { settle: postStageOne ? 80 : 0, shiftModulo: pressureShift ? 5 : 7, key, edge };
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

      let postL6PendingStart = false;
      let postL6Active = false;
      let postL6Finished = false;
      let postL6PreviousHp = null;
      let postL6DamageEvents = 0;
      let postL6HoldCount = 0;
      let postL6ShiftCount = 0;
      let postL6LastAction = { type: "NONE" };
      const postL6Edges = ["TOP", "RIGHT", "BOTTOM", "LEFT", "FALLBACK"];
      const postL6Stats = Object.fromEntries(postL6Edges.map(edge => [edge, {
        A: { holds: 0, damageEvents: 0, hpLost: 0 },
        B: { holds: 0, damageEvents: 0, hpLost: 0 },
      }]));

      const postL6Snapshot = state => ({
        elapsed: state?.elapsed, progress: state?.progress, stage: state?.stage, hp: state?.hp,
        level: state?.level, kills: state?.kills, shifts: state?.shifts, phase: state?.phase,
        x: Number.isFinite(state?.x) ? Math.round(state.x) : null,
        y: Number.isFinite(state?.y) ? Math.round(state.y) : null,
        activeEnemies: state?.activeEnemies, enemyKinds: state?.enemyKinds,
        draftOpen: state?.draftOpen, draftIds: state?.draftIds, refracts: state?.refracts,
        rerollNonce: state?.rerollNonce, gatePhase: state?.gatePhase, gateActive: state?.gateActive,
        moveTick, checkpointTick,
      });

      const maybeStartPostL6 = (state, observation) => {
        if (!postL6PendingStart || postL6Active || postL6Finished || !state) return;
        const ready = state.stage === "STAGE_II"
          && state.level >= 6 && !state.draftOpen
          && Array.isArray(state.gateResolved) && state.gateResolved.includes("ELITE_I")
          && state.gateActive !== "CHECKPOINT_ELITE";
        if (!ready) return;
        postL6Active = true;
        postL6PreviousHp = state.hp;
        console.log(`CR3E2_RUN17_POSTL6_START_T${trial}=${JSON.stringify({ observation, state: postL6Snapshot(state) })}`);
      };

      const observePostL6 = (state, observation) => {
        if (!state || postL6Finished) return;
        maybeStartPostL6(state, observation);
        if (!postL6Active) return;
        if (postL6PreviousHp !== null && state.hp < postL6PreviousHp) {
          postL6DamageEvents += 1;
          console.log(`CR3E2_RUN17_POSTL6_DAMAGE_T${trial}_${postL6DamageEvents}=${JSON.stringify({
            observation, fromHp: postL6PreviousHp, toHp: state.hp, hpLost: postL6PreviousHp - state.hp,
            state: postL6Snapshot(state), precedingAction: postL6LastAction,
          })}`);
        }
        postL6PreviousHp = state.hp;
        if (state.gateActive === "CHECKPOINT_ELITE" && state.progress === TARGET_PROGRESS) {
          console.log(`CR3E2_RUN17_POSTL6_SUMMARY_T${trial}=${JSON.stringify({
            observation, checkpoint: postL6Snapshot(state), holds: postL6HoldCount,
            shiftsObserved: postL6ShiftCount, damageEvents: postL6DamageEvents, stats: postL6Stats,
          })}`);
          postL6Finished = true;
        }
      };
      const shiftAndObserve = async () => {
        const beforeShift = postL6Active && !postL6Finished ? await readState(canvas) : null;
        if (beforeShift) observePostL6(beforeShift, "PRE_SHIFT");
        await canvas.press("Space", { timeout: 2_500 });
        await page.waitForTimeout(105);
        const afterShift = await readState(canvas);
        if (postL6Active && !postL6Finished && beforeShift && afterShift) {
          postL6ShiftCount += 1;
          console.log(`CR3E2_RUN17_POSTL6_SHIFT_T${trial}_${postL6ShiftCount}=${JSON.stringify({ before: postL6Snapshot(beforeShift), after: postL6Snapshot(afterShift) })}`);
          postL6LastAction = { type: "SHIFT", beforeProgress: beforeShift.progress, beforeHp: beforeShift.hp,
            beforePhase: beforeShift.phase, beforeShifts: beforeShift.shifts, afterProgress: afterShift.progress,
            afterHp: afterShift.hp, afterPhase: afterShift.phase, afterShifts: afterShift.shifts };
          observePostL6(afterShift, "POST_SHIFT");
        }
        return afterShift;
      };

      while (Date.now() < wallDeadline) {
        let state = await readState(canvas);
        assert.ok(state, `trial ${trial} lost combat canvas`);
        minHp = Math.min(minHp, state.hp);
        observePostL6(state, "LOOP_READ");

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
          const resolvingL6 = state.level === 6;
          const laterDraft = postL6Active && state.level >= 7;
          if (laterDraft) console.log(`CR3E2_RUN17_POSTL6_DRAFT_OPEN_T${trial}=${JSON.stringify(postL6Snapshot(state))}`);
          await chooseDraft(canvas, state, page, trial);
          if (resolvingL6) postL6PendingStart = true;
          if (postL6PendingStart || postL6Active) {
            const afterDraft = await readState(canvas);
            if (afterDraft) {
              maybeStartPostL6(afterDraft, resolvingL6 ? "POST_L6_DRAFT" : "POST_DRAFT");
              observePostL6(afterDraft, resolvingL6 ? "POST_L6_DRAFT" : "POST_DRAFT");
              if (laterDraft) console.log(`CR3E2_RUN17_POSTL6_DRAFT_RESOLVED_T${trial}=${JSON.stringify(postL6Snapshot(afterDraft))}`);
            }
          }
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
          const diagnosticThisHold = postL6Active && !postL6Finished && state.stage === "STAGE_II";
          const diagnosticBefore = diagnosticThisHold ? state : null;
          const movement = await moveNaturalSurvivalLane(canvas, state, moveTick);
          const diagnosticTick = moveTick;
          moveTick += 1;
          await page.waitForTimeout(movement.settle);
          if (diagnosticThisHold) {
            const diagnosticAfter = await readState(canvas);
            assert.ok(diagnosticAfter, `trial ${trial} post-L6 diagnostic lost combat canvas after movement hold`);
            postL6HoldCount += 1;
            const phase = diagnosticBefore.phase === "B" ? "B" : "A";
            const bucket = postL6Stats[movement.edge][phase];
            const hpLost = Math.max(0, diagnosticBefore.hp - diagnosticAfter.hp);
            bucket.holds += 1; bucket.damageEvents += hpLost > 0 ? 1 : 0; bucket.hpLost += hpLost;
            postL6LastAction = { type: "MOVE", edge: movement.edge, key: movement.key, tick: diagnosticTick,
              startProgress: diagnosticBefore.progress, startHp: diagnosticBefore.hp,
              startX: Math.round(diagnosticBefore.x), startY: Math.round(diagnosticBefore.y),
              startPhase: diagnosticBefore.phase, startActiveEnemies: diagnosticBefore.activeEnemies };
            console.log(`CR3E2_RUN17_POSTL6_HOLD_T${trial}_${postL6HoldCount}=${JSON.stringify({
              edge: movement.edge, key: movement.key, tick: diagnosticTick, phase,
              hpBefore: diagnosticBefore.hp, hpAfter: diagnosticAfter.hp, hpLost,
              progressBefore: diagnosticBefore.progress, progressAfter: diagnosticAfter.progress,
              xBefore: Math.round(diagnosticBefore.x), yBefore: Math.round(diagnosticBefore.y),
              xAfter: Math.round(diagnosticAfter.x), yAfter: Math.round(diagnosticAfter.y),
              activeEnemiesBefore: diagnosticBefore.activeEnemies, activeEnemiesAfter: diagnosticAfter.activeEnemies,
              enemyKindsBefore: diagnosticBefore.enemyKinds, enemyKindsAfter: diagnosticAfter.enemyKinds,
              shiftsBefore: diagnosticBefore.shifts, shiftsAfter: diagnosticAfter.shifts,
              draftOpenAfter: diagnosticAfter.draftOpen, levelAfter: diagnosticAfter.level,
            })}`);
            observePostL6(diagnosticAfter, "POST_MOVE");
          }
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
