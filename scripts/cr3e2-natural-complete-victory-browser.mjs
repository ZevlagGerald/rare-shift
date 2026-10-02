import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";

const gameDirectory = resolve("games/rare-shift");
await mkdir(resolve("artifacts"), { recursive: true });

const CHECKPOINT_ORDER = Object.freeze(["ELITE_I", "CHECKPOINT_ELITE", "ELITE_II"]);
const CHECKPOINT_BOUNDARIES = Object.freeze({
  ELITE_I: Object.freeze({ progress: 80_000, stage: "STAGE_I" }),
  CHECKPOINT_ELITE: Object.freeze({ progress: 180_000, stage: "STAGE_II" }),
  ELITE_II: Object.freeze({ progress: 285_000, stage: "STAGE_III" }),
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
  await canvas.click({ position: { x: box.width * centers(count)[index] / 960, y: box.height * 320 / 640 } });
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
    bossPhase: element.dataset.cr3BossPhase ?? "",
    bossHp: Number(element.dataset.cr3BossHp ?? "0"),
    bossX: Number(element.dataset.cr3BossX ?? "0"),
    bossY: Number(element.dataset.cr3BossY ?? "0"),
    bossVulnerability: element.dataset.cr3BossVulnerability ?? "",
    bossExpectedResponse: element.dataset.cr3BossExpectedResponse ?? "",
    bossBreakOpen: element.dataset.cr3BossBreakOpen === "true",
    bossCycleOrdinal: element.dataset.cr3BossCycleOrdinal ?? "",
    bossDamageAccepted: Number(element.dataset.cr3BossDamageAccepted ?? "0"),
    bossDefeatEvents: Number(element.dataset.cr3BossDefeatEvents ?? "0"),
  }));
}

async function readCombatState(canvas) {
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
    bossPhase: element.dataset.cr3BossPhase ?? "",
    bossHp: Number(element.dataset.cr3BossHp ?? "0"),
    bossX: Number(element.dataset.cr3BossX ?? "0"),
    bossY: Number(element.dataset.cr3BossY ?? "0"),
    bossVulnerability: element.dataset.cr3BossVulnerability ?? "",
    bossExpectedResponse: element.dataset.cr3BossExpectedResponse ?? "",
    bossBreakOpen: element.dataset.cr3BossBreakOpen === "true",
    bossCycleOrdinal: element.dataset.cr3BossCycleOrdinal ?? "",
    bossDamageAccepted: Number(element.dataset.cr3BossDamageAccepted ?? "0"),
    bossDefeatEvents: Number(element.dataset.cr3BossDefeatEvents ?? "0"),
  })).catch(() => null);
}

async function resultState(game, timeout = 0) {
  const result = game.locator('[data-stage="results"]');
  if (!(await result.count())) {
    if (!timeout) return null;
    const visible = await result.waitFor({ state: "visible", timeout }).then(() => true).catch(() => false);
    if (!visible) return null;
  } else if (!(await result.isVisible().catch(() => false))) {
    if (!timeout) return null;
    const visible = await result.waitFor({ state: "visible", timeout }).then(() => true).catch(() => false);
    if (!visible) return null;
  }
  return { locator: result, outcome: await result.getAttribute("data-outcome") };
}

async function waitForCheckpointRuntime(page, canvas, width) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const state = await canvas.getAttribute("data-cr3e1-checkpoint-runtime");
    const error = await canvas.getAttribute("data-cr3e1-checkpoint-runtime-error");
    if (state === "ACTIVE") return;
    if (error) throw new Error(`CR-3E.2 checkpoint runtime failed at width ${width}: ${error}`);
    await page.waitForTimeout(100);
  }
  throw new Error(`CR-3E.2 checkpoint runtime did not activate at width ${width}`);
}

async function chooseDraft(canvas, state, page, width) {
  assert.equal(state.draftIds.length, state.draftCount, `draft ids/count mismatch at width ${width}`);

  const qualifiedOnboarding = new Map([
    [2, "ORBIT_NODES"],
    [3, "ECHO_MINE"],
    [4, "SIGNAL_ARC"],
  ]);
  const onboardingChoice = qualifiedOnboarding.get(state.level);
  if (onboardingChoice) {
    const onboardingIndex = state.draftIds.indexOf(onboardingChoice);
    if (onboardingIndex >= 0) {
      console.log(`CR3E2_DRAFT_${width}=L${state.level}:HP${state.hp}:${state.draftIds.join(",")}=>${state.draftIds[onboardingIndex]}`);
      await clickDraft(canvas, onboardingIndex, state.draftCount);
      await page.waitForTimeout(90);
      return;
    }
  }

  const lowHp = state.hp <= 72;
  const priority = lowHp
    ? [
        "FIELD_REPAIR",
        "SIGNAL_MAGNET",
        "EVOLUTION",
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
  console.log(`CR3E2_DRAFT_${width}=L${state.level}:HP${state.hp}:${state.draftIds.join(",")}=>${state.draftIds[index]}`);
  await clickDraft(canvas, index, state.draftCount);
  await page.waitForTimeout(90);
}

async function moveNaturalSurvivalLane(canvas, state, tick) {
  let key;
  if (state.y < 250 && state.x < 1500) key = "ArrowRight";
  else if (state.x >= 1500 && state.y < 950) key = "ArrowDown";
  else if (state.y >= 950 && state.x > 300) key = "ArrowLeft";
  else if (state.x <= 300 && state.y > 250) key = "ArrowUp";
  else key = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"][Math.floor(tick / 10) % 4];
  await canvas.press(key, { delay: 420 });
  return { settle: 0, shiftModulo: 7 };
}

async function moveEliteCombatLane(canvas, state, tick) {
  assert.ok(Number.isFinite(state.eliteX) && Number.isFinite(state.eliteY), "active checkpoint elite must expose diagnostics");
  const dx = state.eliteX - state.x;
  const dy = state.eliteY - state.y;
  const distance = Math.hypot(dx, dy);
  const horizontalDominant = Math.abs(dx) >= Math.abs(dy);
  let key;
  if (distance > 210) {
    key = horizontalDominant
      ? dx >= 0 ? "ArrowRight" : "ArrowLeft"
      : dy >= 0 ? "ArrowDown" : "ArrowUp";
  } else if (distance < 140) {
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

function assertResolvedPrefix(state, width) {
  assert.equal(state.gateResolvedCount, state.gateResolved.length, `resolved count/list mismatch at width ${width}`);
  assert.deepEqual(state.gateResolved, CHECKPOINT_ORDER.slice(0, state.gateResolved.length), `checkpoint resolution order drift at width ${width}`);
}

function qualification(width) {
  return async ({ page, game }) => {
    const scan = game.locator('[data-stage="scan"]');
    await scan.waitFor({ state: "visible" });
    const frameA = Number(await scan.getAttribute("data-frame-a"));
    const frameB = Number(await scan.getAttribute("data-frame-b"));
    const reduced = game.getByRole("checkbox", { name: /Reduce motion/i });
    if (width === 390) {
      await reduced.check();
      assert.equal(await reduced.isChecked(), true, "390 qualification must enable reduced motion");
    }

    const canvas = await mount(game);
    await waitForCheckpointRuntime(page, canvas, width);

    const observedStages = new Set();
    const observedKinds = new Set();
    const observedBossPhases = new Set();
    const observedCheckpointActivations = [];
    let maxElites = 0;
    let maxCores = 0;
    let maxBossDamage = 0;
    let maxBossDefeatEvents = 0;
    let maxShifts = 0;
    let moveTick = 0;
    let checkpointTick = 0;
    let lastLogAt = -30_000;
    let lastGateActive = "";
    let lastCheckpointPosition = null;
    let lastBossCycle = "";
    let bossOffsetOrdinal = 0;
    let bossReadyObserved = false;
    let lastState = await readState(canvas);
    const deadline = Date.now() + 720_000;

    const observe = state => {
      lastState = state;
      if (state.stage) observedStages.add(state.stage);
      for (const kind of state.enemyKinds) observedKinds.add(kind);
      if (state.bossPhase) observedBossPhases.add(state.bossPhase);
      maxElites = Math.max(maxElites, state.elitesDefeated);
      maxCores = Math.max(maxCores, state.cores);
      maxBossDamage = Math.max(maxBossDamage, state.bossDamageAccepted);
      maxBossDefeatEvents = Math.max(maxBossDefeatEvents, state.bossDefeatEvents);
      maxShifts = Math.max(maxShifts, state.shifts);
      bossReadyObserved ||= state.gateBossReady;
      assertResolvedPrefix(state, width);

      if (state.gateResolvedCount < 3) {
        assert.equal(state.bossPending, false, `THE DESYNC became pending before all checkpoints resolved at width ${width}`);
        assert.equal(state.bossActive, false, `THE DESYNC became active before all checkpoints resolved at width ${width}`);
        assert.equal(state.gateBossReady, false, `checkpoint authority reported boss-ready too early at width ${width}`);
      }

      if (state.gateActive && state.gateActive !== lastGateActive) {
        const expected = CHECKPOINT_ORDER[observedCheckpointActivations.length];
        assert.equal(state.gateActive, expected, `checkpoint activation order drift at width ${width}`);
        const boundary = CHECKPOINT_BOUNDARIES[state.gateActive];
        assert.equal(state.progress, boundary.progress, `${state.gateActive} activated at wrong director boundary at width ${width}`);
        assert.equal(state.stage, boundary.stage, `${state.gateActive} changed stage before resolution at width ${width}`);
        observedCheckpointActivations.push(state.gateActive);
        lastGateActive = state.gateActive;
        console.log(`CR3E2_CHECKPOINT_${width}=${state.gateActive}@${state.progress}`);
      }
      if (!state.gateActive) lastGateActive = "";

      if (Number.isFinite(state.eliteX) && Number.isFinite(state.eliteY)) {
        lastCheckpointPosition = { x: state.eliteX, y: state.eliteY };
      }

      if (state.elapsed - lastLogAt >= 30_000) {
        lastLogAt = state.elapsed;
        console.log(`CR3E2_STATE_${width}=${JSON.stringify({
          stage: state.stage,
          elapsed: state.elapsed,
          progress: state.progress,
          gate: state.gateActive,
          gatePhase: state.gatePhase,
          resolved: state.gateResolved,
          hp: state.hp,
          level: state.level,
          kills: state.kills,
          shifts: state.shifts,
          bossPhase: state.bossPhase,
          bossHp: state.bossHp,
        })}`);
      }
    };

    const shiftAndObserve = async () => {
      await canvas.press("Space");
      await page.waitForTimeout(105);
      const state = await readCombatState(canvas);
      if (state) observe(state);
      return state;
    };

    const alignBossPhase = async expected => {
      if (expected !== "A" && expected !== "B") return readCombatState(canvas);
      let state = await readCombatState(canvas);
      if (!state) return null;
      for (let attempt = 0; attempt < 5 && state.phase !== expected; attempt += 1) {
        state = await shiftAndObserve();
        if (!state) return null;
      }
      return state;
    };

    const answerBreak = async state => {
      if (!state) return null;
      const expected = state.bossExpectedResponse;
      if (expected !== "A" && expected !== "B") return state;
      if (state.phase === expected) {
        state = await shiftAndObserve();
        if (!state) return null;
      }
      return alignBossPhase(expected);
    };

    const fightBoss = async state => {
      if (!state || !state.bossPhase || state.bossPhase === "DEFEATED") return;
      assert.equal(state.gateResolvedCount, 3, `boss combat began before all checkpoint gates resolved at width ${width}`);
      assert.ok(state.progress >= 360_000, `boss combat began before director handoff at width ${width}`);
      if (state.bossPhase === "BREAK_WINDOW" && !state.bossBreakOpen) {
        state = await answerBreak(state);
        if (!state) return;
      }
      state = await alignBossPhase(state.bossVulnerability);
      if (!state) return;
      const cycle = `${state.bossPhase}:${state.bossCycleOrdinal}:${state.bossVulnerability}:${state.bossBreakOpen}`;
      if (cycle !== lastBossCycle) {
        lastBossCycle = cycle;
        bossOffsetOrdinal = 0;
      }
      const offsets = [[0,112],[112,0],[0,-112],[-112,0],[82,82],[82,-82],[-82,82],[-82,-82],[0,150],[150,0],[0,-150],[-150,0]];
      const [ox, oy] = offsets[bossOffsetOrdinal % offsets.length];
      const dx = state.bossX + ox - state.x;
      const dy = state.bossY + oy - state.y;
      const key = Math.abs(dx) >= Math.abs(dy)
        ? dx > 0 ? "ArrowRight" : "ArrowLeft"
        : dy > 0 ? "ArrowDown" : "ArrowUp";
      await canvas.press(key, { delay: 180 });
      await page.waitForTimeout(60);
      bossOffsetOrdinal += 1;
    };

    const terminalOrThrow = async context => {
      const terminal = await resultState(game, 1_500);
      if (!terminal) {
        throw new Error(`CR-3E.2 ${context} lost the combat canvas without a terminal Results state at width ${width}; last=${JSON.stringify(lastState)}`);
      }
      if (terminal.outcome === "VICTORY") return "VICTORY";
      throw new Error(`CR-3E.2 natural victory route ended as ${terminal.outcome} at width ${width}; last=${JSON.stringify(lastState)}`);
    };

    runLoop:
    while (Date.now() < deadline) {
      const terminal = await resultState(game, 0);
      if (terminal) {
        if (terminal.outcome === "VICTORY") break;
        throw new Error(`CR-3E.2 natural victory route ended as ${terminal.outcome} at width ${width}; last=${JSON.stringify(lastState)}`);
      }

      const state = await readCombatState(canvas);
      if (!state) {
        const outcome = await terminalOrThrow("state-read transition");
        if (outcome === "VICTORY") break;
      }

      observe(state);
      assert.equal(state.gateRuntime, "ACTIVE", `checkpoint runtime lost authority on a live combat canvas at width ${width}`);
      if (state.dead) throw new Error(`CR-3E.2 natural route died before results at width ${width}; last=${JSON.stringify(state)}`);
      if (state.draftOpen) {
        try {
          await chooseDraft(canvas, state, page, width);
        } catch (cause) {
          const outcome = await resultState(game, 1_500);
          if (outcome?.outcome === "VICTORY") break;
          if (outcome) throw new Error(`CR-3E.2 route ended as ${outcome.outcome} during draft input at width ${width}; last=${JSON.stringify(lastState)}`, { cause });
          throw cause;
        }
        continue;
      }

      try {
        if (state.bossActive || state.stage === "BOSS_PENDING") {
          await fightBoss(state);
        } else if (state.gatePhase === "ELITE_ACTIVE") {
          await moveEliteCombatLane(canvas, state, checkpointTick);
          checkpointTick += 1;
          if (checkpointTick % 6 === 0) await shiftAndObserve();
          await page.waitForTimeout(35);
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
      } catch (cause) {
        const terminalAfterAction = await resultState(game, 1_500);
        if (terminalAfterAction?.outcome === "VICTORY") break runLoop;
        if (terminalAfterAction) {
          throw new Error(`CR-3E.2 natural victory route ended as ${terminalAfterAction.outcome} during combat input at width ${width}; last=${JSON.stringify(lastState)}`, { cause });
        }
        throw cause;
      }
    }

    const victory = game.locator('[data-stage="results"][data-outcome="VICTORY"]');
    await victory.waitFor({ state: "visible", timeout: 5_000 });
    assert.deepEqual(observedCheckpointActivations, CHECKPOINT_ORDER, `missing or reordered checkpoint activations at width ${width}`);
    assert.deepEqual(lastState.gateResolved, CHECKPOINT_ORDER, `all checkpoint gates must resolve before victory at width ${width}`);
    assert.ok(observedStages.has("STAGE_I"), `missing STAGE_I at width ${width}`);
    assert.ok(observedStages.has("STAGE_II"), `missing STAGE_II at width ${width}`);
    assert.ok(observedStages.has("STAGE_III"), `missing STAGE_III at width ${width}`);
    assert.ok(observedStages.has("STAGE_IV"), `missing STAGE_IV at width ${width}`);
    assert.ok(observedStages.has("BOSS_PENDING"), `missing BOSS_PENDING at width ${width}`);
    assert.ok(bossReadyObserved, `checkpoint authority never reported boss-ready at width ${width}`);
    assert.ok(maxElites >= 3, `expected three natural checkpoint elite defeats at width ${width}, got ${maxElites}`);
    assert.ok(maxCores >= 1, `expected at least one natural Evolution Core at width ${width}`);
    assert.ok(maxShifts >= 8, `expected repeated accepted SHIFT inputs at width ${width}, got ${maxShifts}`);
    assert.ok(observedKinds.has("BEACON"), `missing BEACON pressure at width ${width}`);
    assert.ok(observedKinds.has("ANCHOR"), `missing ANCHOR pressure at width ${width}`);
    assert.ok(observedKinds.has("FLICKER_A") || observedKinds.has("FLICKER_B"), `missing FLICKER pressure at width ${width}`);
    for (const phase of ["ALIGNMENT", "CROSS_SPLIT", "BREAK_WINDOW"]) {
      assert.ok(observedBossPhases.has(phase), `missing boss phase ${phase} at width ${width}`);
    }
    assert.ok(maxBossDamage > 0, `production auto-fire never recorded legal boss damage at width ${width}`);
    assert.equal(maxBossDefeatEvents, 1, `THE DESYNC must record exactly one defeat event at width ${width}`);

    assert.equal(await victory.getAttribute("data-boss-result"), "DEFEATED");
    assert.ok(Number(await victory.getAttribute("data-final-hp")) > 0, `victory must preserve positive HP at width ${width}`);
    assert.equal(Number(await victory.getAttribute("data-terminal-pause-events")), 1);
    assert.equal(Number(await victory.getAttribute("data-frame-a")), frameA);
    assert.equal(Number(await victory.getAttribute("data-frame-b")), frameB);
    assert.match(await victory.getAttribute("data-fingerprint"), /^CR3D-[0-9a-f]{8}$/u);
    await game.locator('[data-results-view="reconstruction-a"]').waitFor({ state: "visible" });
    await game.locator('[data-results-view="reconstruction-b"]').waitFor({ state: "visible" });
    if (width === 390) assert.equal(await reduced.isChecked(), true, "reduced motion must remain enabled through victory");

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-cr3e2-natural-victory-results-${width}.png`) });
    await game.getByRole("button", { name: /RUN AGAIN/i }).click();
    const retry = game.locator("canvas[data-director-stage]").first();
    await retry.waitFor({ state: "visible" });
    assert.equal(await retry.getAttribute("data-dead"), "false");
    assert.equal(Number(await retry.getAttribute("data-hp")), 100);

    console.log(`RARE_SHIFT_CR3E2_NATURAL_COMPLETE_WIN_${width}=PASS`);
    console.log(`RARE_SHIFT_CR3E2_${width}_MAX_CORES=${maxCores}`);
    console.log(`RARE_SHIFT_CR3E2_${width}_MAX_ELITES=${maxElites}`);
    console.log(`RARE_SHIFT_CR3E2_${width}_BOSS_PHASES=${[...observedBossPhases].join(",")}`);
    console.log(`RARE_SHIFT_CR3E2_${width}_ACCEPTED_BOSS_DAMAGE_EVENTS=${maxBossDamage}`);
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 780_000,
    screenshot: resolve(`artifacts/rare-shift-cr3e2-natural-victory-host-${width}.png`),
    check: qualification(width),
  });
}

console.log("RARE_SHIFT_CR3E2_REDUCED_MOTION=PASS");
console.log("RARE_SHIFT_CR3E2_NATURAL_COMPLETE_VICTORY_BROWSER=PASS");