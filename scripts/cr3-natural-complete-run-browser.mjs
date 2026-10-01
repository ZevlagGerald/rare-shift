import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";

const gameDirectory = resolve("games/rare-shift");
await mkdir(resolve("artifacts"), { recursive: true });

function bool(value) {
  assert.ok(value === "true" || value === "false", `expected dataset boolean, got ${String(value)}`);
  return value === "true";
}
function list(value) { return String(value ?? "").split(",").filter(Boolean); }
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
async function pressShift(canvas) { await canvas.press("Space"); }
async function mount(game) {
  await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
  const canvas = game.locator("canvas");
  await canvas.waitFor({ state: "visible" });
  await canvas.focus();
  return canvas;
}
async function waitForShift(canvas, before, timeoutMs = 1_200) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const after = Number(await canvas.getAttribute("data-shifts", { timeout: 350 }));
    if (after > before) return after;
    await new Promise(resolveWait => setTimeout(resolveWait, 45));
  }
  return Number(await canvas.getAttribute("data-shifts", { timeout: 350 }));
}
async function acceptedShift(canvas) {
  const before = Number(await canvas.getAttribute("data-shifts", { timeout: 350 }));
  await pressShift(canvas);
  return (await waitForShift(canvas, before)) > before;
}
async function moveToward(canvas, data, targetX, targetY, holdMs = 180) {
  const x = Number(await data("x"));
  const y = Number(await data("y"));
  const dx = targetX - x;
  const dy = targetY - y;
  if (Math.abs(dx) <= 26 && Math.abs(dy) <= 26) return false;
  const key = Math.abs(dx) >= Math.abs(dy)
    ? (dx > 0 ? "ArrowRight" : "ArrowLeft")
    : (dy > 0 ? "ArrowDown" : "ArrowUp");
  await canvas.press(key, { delay: holdMs });
  return true;
}

async function chooseNaturalDraft(canvas, data, page, healingBias = true) {
  const ids = list(await data("draft-ids"));
  const count = Number(await data("draft-count"));
  assert.equal(ids.length, count, "draft ids/count mismatch");
  assert.ok(count >= 1 && count <= 3, `unexpected draft count ${count}`);
  const hp = Number(await data("hp"));
  const prefer = healingBias && hp <= 70
    ? ["FIELD_REPAIR", "ORBIT_RANK", "ECHO_RANK", "SIGNAL_RANK", "DELTA_RANK", "VECTOR_RANK", "ORBIT_NODES", "ECHO_MINE", "SIGNAL_ARC", "VECTOR_NEEDLE", "EVOLUTION", "SIGNAL_MAGNET"]
    : ["ORBIT_NODES", "ECHO_MINE", "SIGNAL_ARC", "ORBIT_RANK", "ECHO_RANK", "SIGNAL_RANK", "DELTA_RANK", "VECTOR_NEEDLE", "VECTOR_RANK", "EVOLUTION", "FIELD_REPAIR", "SIGNAL_MAGNET"];
  let index = -1;
  for (const token of prefer) {
    index = ids.findIndex(id => id === token || id.startsWith(`${token}:`));
    if (index >= 0) break;
  }
  if (index < 0) index = 0;
  console.log(`CR3E_DRAFT=L${await data("level")}:HP${hp}:${ids.join(",")}=>${ids[index]}`);
  await clickDraft(canvas, index, count);
  await page.waitForTimeout(90);
}

async function naturalDeathQualification() {
  await testGame(gameDirectory, {
    width: 960,
    height: 800,
    timeout: 300_000,
    screenshot: resolve("artifacts/rare-shift-cr3e-natural-death-host-960.png"),
    check: async ({ page, game }) => {
      await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
      const canvas = await mount(game);
      const data = name => canvas.getAttribute(`data-${name}`);
      const deadline = Date.now() + 240_000;
      while (Date.now() < deadline) {
        const failure = game.locator('[data-stage="results"][data-outcome="DEFEAT"]');
        if (await failure.count()) break;
        if (bool(await data("draft-open"))) {
          await chooseNaturalDraft(canvas, data, page, false);
          continue;
        }
        await page.waitForTimeout(250);
      }
      const failure = game.locator('[data-stage="results"][data-outcome="DEFEAT"]');
      await failure.waitFor({ state: "visible", timeout: 5_000 });
      assert.equal(Number(await failure.getAttribute("data-final-hp")), 0);
      assert.ok(Number(await failure.getAttribute("data-damage-taken")) > 0, "natural death must record real accepted damage");
      assert.equal(Number(await failure.getAttribute("data-terminal-pause-events")), 1);
      assert.notEqual(await failure.getAttribute("data-boss-result"), "DEFEATED");
      await game.getByRole("button", { name: /RUN AGAIN/i }).click();
      const retryCanvas = game.locator("canvas");
      await retryCanvas.waitFor({ state: "visible" });
      assert.equal(await retryCanvas.getAttribute("data-dead"), "false");
      assert.equal(Number(await retryCanvas.getAttribute("data-hp")), 100);
      console.log("RARE_SHIFT_CR3E_NATURAL_DEATH_RETRY_960=PASS");
    },
  });
}

async function naturalVictoryQualification() {
  await testGame(gameDirectory, {
    width: 960,
    height: 800,
    timeout: 760_000,
    screenshot: resolve("artifacts/rare-shift-cr3e-natural-victory-host-960.png"),
    check: async ({ page, game }) => {
      const scan = game.locator('[data-stage="scan"]');
      await scan.waitFor({ state: "visible" });
      const startingFrameA = Number(await scan.getAttribute("data-frame-a"));
      const startingFrameB = Number(await scan.getAttribute("data-frame-b"));
      const canvas = await mount(game);
      const data = name => canvas.getAttribute(`data-${name}`, { timeout: 750 });
      const observedStages = new Set();
      const observedCheckpoints = new Set();
      const observedKinds = new Set();
      const observedBossPhases = new Set();
      let maxElitesDefeated = 0;
      let maxCores = 0;
      let maxAcceptedBossDamageEvents = 0;
      let movementTicks = 0;
      let ordinaryShifts = 0;
      let bossSearchOrdinal = 0;
      let lastBossCycle = "";
      let lastSnapshot = null;
      const deadline = Date.now() + 700_000;

      const terminalOutcome = async timeoutMs => {
        const terminal = game.locator('[data-stage="results"]');
        if (!(await terminal.count())) {
          if (!timeoutMs) return null;
          const visible = await terminal.waitFor({ state: "visible", timeout: timeoutMs }).then(() => true).catch(() => false);
          if (!visible) return null;
        }
        return {
          locator: terminal,
          outcome: await terminal.getAttribute("data-outcome"),
        };
      };

      const record = async () => {
        const stage = String(await data("director-stage"));
        const bossPhase = String(await data("cr3-boss-phase") ?? "");
        lastSnapshot = {
          stage,
          elapsed: Number(await data("director-elapsed-ms")),
          hp: Number(await data("hp")),
          level: Number(await data("level")),
          kills: Number(await data("kills")),
          shifts: Number(await data("shifts")),
          bossPhase,
          bossHp: Number(await data("cr3-boss-hp") || 0),
        };
        observedStages.add(stage);
        for (const checkpoint of list(await data("spawned-checkpoints"))) observedCheckpoints.add(checkpoint);
        for (const kind of list(await data("enemy-kinds"))) observedKinds.add(kind);
        if (bossPhase) observedBossPhases.add(bossPhase);
        maxElitesDefeated = Math.max(maxElitesDefeated, Number(await data("elites-defeated")) || 0);
        maxCores = Math.max(maxCores, Number(await data("evolution-cores")) || 0);
        maxAcceptedBossDamageEvents = Math.max(maxAcceptedBossDamageEvents, Number(await data("cr3-boss-damage-accepted")) || 0);
      };

      const patrolStages = async () => {
        // Exact CR-1 natural Stage-IV survival navigation: a large inset rectangle
        // with the same non-blocking SHIFT cadence used by the qualified CR-1 proof.
        const x = Number(await data("x"));
        const y = Number(await data("y"));
        let key;
        if (y < 250 && x < 1500) key = "ArrowRight";
        else if (x >= 1500 && y < 950) key = "ArrowDown";
        else if (y >= 950 && x > 300) key = "ArrowLeft";
        else if (x <= 300 && y > 250) key = "ArrowUp";
        else {
          const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
          key = route[Math.floor(movementTicks / 10) % route.length];
        }
        await canvas.press(key, { delay: 520 });
        movementTicks += 1;
        await page.waitForTimeout(80);
        if (movementTicks % 7 === 0 && !bool(await data("draft-open"))) {
          const before = Number(await data("shifts"));
          await pressShift(canvas);
          await page.waitForTimeout(70);
          const after = Number(await data("shifts"));
          if (after > before) ordinaryShifts += 1;
        }
        if (movementTicks % 60 === 0) console.log(`CR3E_NATURAL_STATE=${JSON.stringify(lastSnapshot)}`);
      };

      const alignTo = async targetPhase => {
        if (targetPhase !== "A" && targetPhase !== "B") return;
        if (await data("phase") !== targetPhase) {
          await acceptedShift(canvas);
          await page.waitForTimeout(80);
        }
      };

      const answerBreakTell = async expected => {
        if (expected !== "A" && expected !== "B") throw new Error(`invalid BREAK expected response ${String(expected)}`);
        let current = await data("phase");
        if (current === expected) {
          const movedAway = await acceptedShift(canvas);
          if (!movedAway) return;
          await page.waitForTimeout(90);
          current = await data("phase");
        }
        if (current !== expected) {
          const deadlineShift = Date.now() + 1_050;
          while (Date.now() < deadlineShift && await data("phase") !== expected && await data("cr3-boss-break-open") !== "true") {
            await acceptedShift(canvas);
            await page.waitForTimeout(80);
          }
        }
      };

      const fightBoss = async () => {
        const bossPhase = String(await data("cr3-boss-phase") ?? "");
        if (!bossPhase) { await page.waitForTimeout(80); return; }
        observedBossPhases.add(bossPhase);
        if (bossPhase === "DEFEATED") return;
        if (bossPhase === "BREAK_WINDOW" && await data("cr3-boss-break-open") !== "true") {
          await answerBreakTell(await data("cr3-boss-expected-response"));
          await page.waitForTimeout(60);
        }
        const vulnerability = await data("cr3-boss-vulnerability");
        await alignTo(vulnerability);
        const bossX = Number(await data("cr3-boss-x"));
        const bossY = Number(await data("cr3-boss-y"));
        const cycle = `${bossPhase}:${await data("cr3-boss-cycle-ordinal")}:${vulnerability}:${await data("cr3-boss-break-open")}`;
        if (cycle !== lastBossCycle) { lastBossCycle = cycle; bossSearchOrdinal = 0; }
        const offsets = [
          [0, 96], [96, 0], [0, -96], [-96, 0],
          [72, 72], [72, -72], [-72, 72], [-72, -72],
          [0, 132], [132, 0], [0, -132], [-132, 0],
        ];
        const [ox, oy] = offsets[bossSearchOrdinal % offsets.length];
        const moved = await moveToward(canvas, data, bossX + ox, bossY + oy, 145);
        if (!moved) {
          await page.waitForTimeout(420);
          bossSearchOrdinal += 1;
        } else {
          await page.waitForTimeout(45);
        }
      };

      while (Date.now() < deadline) {
        const terminal = await terminalOutcome(0);
        if (terminal) {
          if (terminal.outcome === "VICTORY") break;
          throw new Error(`natural CR-3E win route terminated as ${terminal.outcome}; last=${JSON.stringify(lastSnapshot)}; damageTaken=${await terminal.locator.getAttribute("data-damage-taken")}; bossResult=${await terminal.locator.getAttribute("data-boss-result")}`);
        }
        try {
          await record();
          if (bool(await data("dead"))) throw new Error(`natural CR-3E win route died before result transition; last=${JSON.stringify(lastSnapshot)}`);
          if (bool(await data("draft-open"))) {
            await chooseNaturalDraft(canvas, data, page, true);
            continue;
          }
          if (await data("director-stage") === "BOSS_PENDING" || await data("cr3-boss-active") === "true") await fightBoss();
          else await patrolStages();
        } catch (cause) {
          const terminalAfterRace = await terminalOutcome(1_500);
          if (terminalAfterRace) {
            if (terminalAfterRace.outcome === "VICTORY") break;
            throw new Error(`natural CR-3E win route terminated as ${terminalAfterRace.outcome}; last=${JSON.stringify(lastSnapshot)}; damageTaken=${await terminalAfterRace.locator.getAttribute("data-damage-taken")}; bossResult=${await terminalAfterRace.locator.getAttribute("data-boss-result")}`);
          }
          throw cause;
        }
      }

      const victory = game.locator('[data-stage="results"][data-outcome="VICTORY"]');
      await victory.waitFor({ state: "visible", timeout: 5_000 });
      assert.equal(await victory.getAttribute("data-boss-result"), "DEFEATED");
      assert.ok(Number(await victory.getAttribute("data-final-hp")) > 0, "natural winning run must finish alive");
      assert.equal(Number(await victory.getAttribute("data-terminal-pause-events")), 1);
      assert.equal(Number(await victory.getAttribute("data-frame-a")), startingFrameA);
      assert.equal(Number(await victory.getAttribute("data-frame-b")), startingFrameB);
      assert.match(await victory.getAttribute("data-fingerprint"), /^CR3D-[0-9a-f]{8}$/u);
      assert.ok(observedStages.has("STAGE_I"));
      assert.ok(observedStages.has("STAGE_II"));
      assert.ok(observedStages.has("STAGE_III"));
      assert.ok(observedStages.has("STAGE_IV"));
      assert.ok(observedStages.has("BOSS_PENDING"));
      assert.ok(observedCheckpoints.has("ELITE_I"));
      assert.ok(observedCheckpoints.has("CHECKPOINT_ELITE"));
      assert.ok(observedCheckpoints.has("ELITE_II"));
      assert.ok(observedKinds.has("BEACON"));
      assert.ok(observedKinds.has("ANCHOR"));
      assert.ok(observedKinds.has("FLICKER_A") || observedKinds.has("FLICKER_B"));
      assert.ok(observedBossPhases.has("ALIGNMENT"));
      assert.ok(observedBossPhases.has("CROSS_SPLIT"));
      assert.ok(observedBossPhases.has("BREAK_WINDOW"));
      assert.ok(maxAcceptedBossDamageEvents > 0, "natural auto-fire must produce legal accepted boss damage");
      assert.ok(maxElitesDefeated >= 3, `expected all three elites defeated, got ${maxElitesDefeated}`);
      assert.ok(maxCores >= 1, "natural run must acquire at least one Evolution Core");
      assert.ok(ordinaryShifts >= 8, `natural pre-boss run must repeatedly exercise SHIFT, got ${ordinaryShifts}`);
      await game.locator('[data-results-view="reconstruction-a"]').waitFor({ state: "visible" });
      await game.locator('[data-results-view="reconstruction-b"]').waitFor({ state: "visible" });
      await page.locator(".rf-game-frame").screenshot({ path: resolve("artifacts/rare-shift-cr3e-natural-victory-results-960.png") });
      await game.getByRole("button", { name: /RUN AGAIN/i }).click();
      const retryCanvas = game.locator("canvas");
      await retryCanvas.waitFor({ state: "visible" });
      assert.equal(await retryCanvas.getAttribute("data-dead"), "false");
      assert.equal(Number(await retryCanvas.getAttribute("data-hp")), 100);
      console.log(`CR3E_NATURAL_VICTORY_MAX_CORES=${maxCores}`);
      console.log(`CR3E_NATURAL_VICTORY_MAX_ELITES=${maxElitesDefeated}`);
      console.log(`CR3E_NATURAL_VICTORY_BOSS_PHASES=${[...observedBossPhases].join(",")}`);
      console.log(`CR3E_NATURAL_VICTORY_ACCEPTED_BOSS_DAMAGE_EVENTS=${maxAcceptedBossDamageEvents}`);
      console.log("RARE_SHIFT_CR3E_NATURAL_COMPLETE_WIN_960=PASS");
    },
  });
}

await naturalDeathQualification();
await naturalVictoryQualification();
console.log("RARE_SHIFT_CR3E_NATURAL_CLOSEOUT_BROWSER=PASS");