import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";

const gameDirectory = resolve("games/rare-shift");
await mkdir(resolve("artifacts"), { recursive: true });

function list(value) {
  return String(value ?? "").split(",").filter(Boolean);
}

function bool(value) {
  assert.ok(value === "true" || value === "false", `expected dataset boolean, got ${String(value)}`);
  return value === "true";
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
  await canvas.click({ position: { x: box.width * centers(count)[index] / 960, y: box.height * 320 / 640 } });
}

async function mount(game) {
  await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
  const canvas = game.locator("canvas");
  await canvas.waitFor({ state: "visible" });
  await canvas.focus();
  return canvas;
}

async function readState(canvas) {
  return canvas.evaluate(element => ({
    stage: element.dataset.directorStage ?? "",
    elapsed: Number(element.dataset.directorElapsedMs ?? "0"),
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
    checkpoints: (element.dataset.spawnedCheckpoints ?? "").split(",").filter(Boolean),
    elitesDefeated: Number(element.dataset.elitesDefeated ?? "0"),
    cores: Number(element.dataset.evolutionCores ?? "0"),
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
  }));
}

async function resultState(game, timeout = 0) {
  const result = game.locator('[data-stage="results"]');
  if (!(await result.count())) {
    if (!timeout) return null;
    const visible = await result.waitFor({ state: "visible", timeout }).then(() => true).catch(() => false);
    if (!visible) return null;
  }
  return {
    locator: result,
    outcome: await result.getAttribute("data-outcome"),
  };
}

async function chooseDraft(canvas, state, page) {
  assert.equal(state.draftIds.length, state.draftCount, "draft ids/count mismatch");
  const lowHp = state.hp <= 72;
  const priority = lowHp
    ? ["FIELD_REPAIR", "SIGNAL_MAGNET", "EVOLUTION", "ORBIT_RANK", "ECHO_RANK", "SIGNAL_RANK", "DELTA_RANK", "VECTOR_RANK", "ORBIT_NODES", "ECHO_MINE", "SIGNAL_ARC", "VECTOR_NEEDLE"]
    : ["ORBIT_NODES", "ECHO_MINE", "SIGNAL_ARC", "EVOLUTION", "SIGNAL_MAGNET", "ORBIT_RANK", "ECHO_RANK", "SIGNAL_RANK", "DELTA_RANK", "VECTOR_RANK", "VECTOR_NEEDLE", "FIELD_REPAIR"];
  let index = -1;
  for (const token of priority) {
    index = state.draftIds.findIndex(id => id === token || id.startsWith(`${token}:`));
    if (index >= 0) break;
  }
  if (index < 0) index = 0;
  console.log(`CR3E_V2_DRAFT=L${state.level}:HP${state.hp}:${state.draftIds.join(",")}=>${state.draftIds[index]}`);
  await clickDraft(canvas, index, state.draftCount);
  await page.waitForTimeout(100);
}

async function naturalDeathQualification() {
  await testGame(gameDirectory, {
    width: 960,
    height: 800,
    timeout: 300_000,
    screenshot: resolve("artifacts/rare-shift-cr3e-v2-natural-death-host-960.png"),
    check: async ({ page, game }) => {
      await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
      const canvas = await mount(game);
      const deadline = Date.now() + 240_000;
      while (Date.now() < deadline) {
        const terminal = await resultState(game, 0);
        if (terminal) break;
        const state = await readState(canvas);
        if (state.draftOpen) {
          await chooseDraft(canvas, state, page);
          continue;
        }
        await page.waitForTimeout(250);
      }
      const failure = game.locator('[data-stage="results"][data-outcome="DEFEAT"]');
      await failure.waitFor({ state: "visible", timeout: 5_000 });
      assert.equal(Number(await failure.getAttribute("data-final-hp")), 0);
      assert.ok(Number(await failure.getAttribute("data-damage-taken")) > 0);
      assert.equal(Number(await failure.getAttribute("data-terminal-pause-events")), 1);
      assert.notEqual(await failure.getAttribute("data-boss-result"), "DEFEATED");
      await game.getByRole("button", { name: /RUN AGAIN/i }).click();
      const retryCanvas = game.locator("canvas");
      await retryCanvas.waitFor({ state: "visible" });
      assert.equal(await retryCanvas.getAttribute("data-dead"), "false");
      assert.equal(Number(await retryCanvas.getAttribute("data-hp")), 100);
      console.log("RARE_SHIFT_CR3E_V2_NATURAL_DEATH_RETRY_960=PASS");
    },
  });
}

async function naturalVictoryQualification() {
  await testGame(gameDirectory, {
    width: 960,
    height: 800,
    timeout: 780_000,
    screenshot: resolve("artifacts/rare-shift-cr3e-v2-natural-victory-host-960.png"),
    check: async ({ page, game }) => {
      const scan = game.locator('[data-stage="scan"]');
      await scan.waitFor({ state: "visible" });
      const frameA = Number(await scan.getAttribute("data-frame-a"));
      const frameB = Number(await scan.getAttribute("data-frame-b"));
      const canvas = await mount(game);
      const observedStages = new Set();
      const observedCheckpoints = new Set();
      const observedKinds = new Set();
      const observedBossPhases = new Set();
      let maxElites = 0;
      let maxCores = 0;
      let maxBossDamage = 0;
      let moveOrdinal = 0;
      let ordinaryAcceptedShifts = 0;
      let lastLogAt = 0;
      let lastState = await readState(canvas);
      let lastBossCycle = "";
      let bossOffsetOrdinal = 0;
      const deadline = Date.now() + 720_000;
      const tightRoute = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];

      const observe = state => {
        lastState = state;
        if (state.stage) observedStages.add(state.stage);
        for (const checkpoint of state.checkpoints) observedCheckpoints.add(checkpoint);
        for (const kind of state.enemyKinds) observedKinds.add(kind);
        if (state.bossPhase) observedBossPhases.add(state.bossPhase);
        maxElites = Math.max(maxElites, state.elitesDefeated);
        maxCores = Math.max(maxCores, state.cores);
        maxBossDamage = Math.max(maxBossDamage, state.bossDamageAccepted);
        if (state.elapsed - lastLogAt >= 30_000) {
          lastLogAt = state.elapsed;
          console.log(`CR3E_V2_STATE=${JSON.stringify({ stage: state.stage, elapsed: state.elapsed, hp: state.hp, level: state.level, kills: state.kills, shifts: state.shifts, bossPhase: state.bossPhase, bossHp: state.bossHp })}`);
        }
      };

      const pressShiftAndObserve = async () => {
        const before = (await readState(canvas)).shifts;
        await canvas.press("Space");
        await page.waitForTimeout(95);
        const after = await readState(canvas);
        if (after.shifts > before) ordinaryAcceptedShifts += 1;
        observe(after);
        return after;
      };

      const patrol = async state => {
        let key;
        if (state.level < 4) {
          key = tightRoute[moveOrdinal % tightRoute.length];
        } else if (state.y < 250 && state.x < 1500) key = "ArrowRight";
        else if (state.x >= 1500 && state.y < 950) key = "ArrowDown";
        else if (state.y >= 950 && state.x > 300) key = "ArrowLeft";
        else if (state.x <= 300 && state.y > 250) key = "ArrowUp";
        else key = tightRoute[Math.floor(moveOrdinal / 10) % tightRoute.length];
        await canvas.press(key, { delay: 520 });
        moveOrdinal += 1;
        await page.waitForTimeout(state.level < 4 ? 145 : 80);
        if (moveOrdinal % (state.level < 4 ? 5 : 7) === 0) await pressShiftAndObserve();
      };

      const alignBossPhase = async expected => {
        if (expected !== "A" && expected !== "B") return await readState(canvas);
        let state = await readState(canvas);
        for (let attempt = 0; attempt < 5 && state.phase !== expected; attempt += 1) {
          await canvas.press("Space");
          await page.waitForTimeout(120);
          state = await readState(canvas);
          observe(state);
        }
        return state;
      };

      const answerBreak = async state => {
        const expected = state.bossExpectedResponse;
        if (expected !== "A" && expected !== "B") return state;
        if (state.phase === expected) {
          await canvas.press("Space");
          await page.waitForTimeout(120);
          state = await readState(canvas);
          observe(state);
        }
        return alignBossPhase(expected);
      };

      const fightBoss = async state => {
        if (!state.bossPhase || state.bossPhase === "DEFEATED") return;
        if (state.bossPhase === "BREAK_WINDOW" && !state.bossBreakOpen) state = await answerBreak(state);
        state = await alignBossPhase(state.bossVulnerability);
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
          ? (dx > 0 ? "ArrowRight" : "ArrowLeft")
          : (dy > 0 ? "ArrowDown" : "ArrowUp");
        await canvas.press(key, { delay: 180 });
        await page.waitForTimeout(60);
        bossOffsetOrdinal += 1;
      };

      while (Date.now() < deadline) {
        const terminal = await resultState(game, 0);
        if (terminal) {
          if (terminal.outcome === "VICTORY") break;
          throw new Error(`CR-3E V2 natural victory route ended as ${terminal.outcome}; last=${JSON.stringify(lastState)}`);
        }

        let state;
        try {
          state = await readState(canvas);
        } catch (cause) {
          const terminalAfterRace = await resultState(game, 1_500);
          if (terminalAfterRace?.outcome === "VICTORY") break;
          if (terminalAfterRace) throw new Error(`CR-3E V2 natural victory route ended as ${terminalAfterRace.outcome}; last=${JSON.stringify(lastState)}`);
          throw cause;
        }
        observe(state);
        if (state.dead) throw new Error(`CR-3E V2 natural route died before results; last=${JSON.stringify(state)}`);
        if (state.draftOpen) {
          await chooseDraft(canvas, state, page);
          continue;
        }
        if (state.stage === "BOSS_PENDING" || state.bossActive) await fightBoss(state);
        else await patrol(state);
      }

      const victory = game.locator('[data-stage="results"][data-outcome="VICTORY"]');
      await victory.waitFor({ state: "visible", timeout: 5_000 });
      assert.equal(await victory.getAttribute("data-boss-result"), "DEFEATED");
      assert.ok(Number(await victory.getAttribute("data-final-hp")) > 0);
      assert.equal(Number(await victory.getAttribute("data-terminal-pause-events")), 1);
      assert.equal(Number(await victory.getAttribute("data-frame-a")), frameA);
      assert.equal(Number(await victory.getAttribute("data-frame-b")), frameB);
      assert.match(await victory.getAttribute("data-fingerprint"), /^CR3D-[0-9a-f]{8}$/u);
      for (const stage of ["STAGE_I", "STAGE_II", "STAGE_III", "STAGE_IV", "BOSS_PENDING"]) assert.ok(observedStages.has(stage), `missing ${stage}`);
      for (const checkpoint of ["ELITE_I", "CHECKPOINT_ELITE", "ELITE_II"]) assert.ok(observedCheckpoints.has(checkpoint), `missing ${checkpoint}`);
      for (const kind of ["BEACON", "ANCHOR"]) assert.ok(observedKinds.has(kind), `missing ${kind}`);
      assert.ok(observedKinds.has("FLICKER_A") || observedKinds.has("FLICKER_B"), "missing FLICKER");
      for (const phase of ["ALIGNMENT", "CROSS_SPLIT", "BREAK_WINDOW"]) assert.ok(observedBossPhases.has(phase), `missing boss phase ${phase}`);
      assert.ok(maxBossDamage > 0, "natural production auto-fire must damage THE DESYNC legally");
      assert.ok(maxElites >= 3, `expected three natural elite defeats, got ${maxElites}`);
      assert.ok(maxCores >= 1, "expected at least one natural Evolution Core");
      assert.ok(ordinaryAcceptedShifts >= 8, `expected repeated accepted SHIFT inputs, got ${ordinaryAcceptedShifts}`);
      await game.locator('[data-results-view="reconstruction-a"]').waitFor({ state: "visible" });
      await game.locator('[data-results-view="reconstruction-b"]').waitFor({ state: "visible" });
      await page.locator(".rf-game-frame").screenshot({ path: resolve("artifacts/rare-shift-cr3e-v2-natural-victory-results-960.png") });
      await game.getByRole("button", { name: /RUN AGAIN/i }).click();
      const retry = game.locator("canvas");
      await retry.waitFor({ state: "visible" });
      assert.equal(await retry.getAttribute("data-dead"), "false");
      assert.equal(Number(await retry.getAttribute("data-hp")), 100);
      console.log(`CR3E_V2_MAX_CORES=${maxCores}`);
      console.log(`CR3E_V2_MAX_ELITES=${maxElites}`);
      console.log(`CR3E_V2_BOSS_PHASES=${[...observedBossPhases].join(",")}`);
      console.log(`CR3E_V2_ACCEPTED_BOSS_DAMAGE_EVENTS=${maxBossDamage}`);
      console.log("RARE_SHIFT_CR3E_V2_NATURAL_COMPLETE_WIN_960=PASS");
    },
  });
}

await naturalDeathQualification();
await naturalVictoryQualification();
console.log("RARE_SHIFT_CR3E_V2_NATURAL_CLOSEOUT_BROWSER=PASS");