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
async function shift(canvas, width) {
  if (width === 390) {
    const box = await canvas.boundingBox();
    assert.ok(box, "narrow canvas must have a bounding box");
    await canvas.click({ position: { x: box.width * 842 / 960, y: box.height * 530 / 640 } });
  } else {
    await canvas.press("Space");
  }
}
async function mount(game) {
  await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
  const canvas = game.locator("canvas");
  await canvas.waitFor({ state: "visible" });
  await canvas.focus();
  return canvas;
}

function qualification(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    const reduced = game.getByRole("checkbox", { name: /Reduce motion/i });
    if (width === 390) {
      await reduced.check();
      assert.equal(await reduced.isChecked(), true);
    }

    const canvas = await mount(game);
    const data = name => canvas.getAttribute(`data-${name}`);
    const observedStages = new Set();
    const observedKinds = new Set();
    const observedCheckpoints = new Set();
    let maxCores = 0;
    let maxElitesDefeated = 0;
    let shifts = 0;
    let moveTicks = 0;

    const chooseDraft = async () => {
      const ids = list(await data("draft-ids"));
      const count = Number(await data("draft-count"));
      assert.equal(ids.length, count, "draft ids/count mismatch");
      assert.ok(count >= 1 && count <= 3, `unexpected draft count ${count}`);
      assert.equal(new Set(ids).size, ids.length, "draft choices must remain distinct");
      const hp = Number(await data("hp"));

      const priority = hp <= 68
        ? ["FIELD_REPAIR", "ORBIT_RANK", "ECHO_RANK", "SIGNAL_RANK", "DELTA_RANK", "VECTOR_RANK", "ORBIT_NODES", "ECHO_MINE", "SIGNAL_ARC", "VECTOR_NEEDLE", "SIGNAL_MAGNET"]
        : ["ORBIT_NODES", "ECHO_MINE", "SIGNAL_ARC", "ORBIT_RANK", "ECHO_RANK", "SIGNAL_RANK", "DELTA_RANK", "VECTOR_NEEDLE", "VECTOR_RANK", "FIELD_REPAIR", "SIGNAL_MAGNET"];
      let index = -1;
      for (const id of priority) {
        index = ids.indexOf(id);
        if (index >= 0) break;
      }
      if (index < 0) index = 0;
      console.log(`CR1_DRAFT_${width}=L${await data("level")}:HP${hp}:${ids.join(",")}=>${ids[index]}`);
      await clickDraft(canvas, index, count);
      await page.waitForTimeout(90);
    };

    const record = async () => {
      observedStages.add(String(await data("director-stage")));
      for (const kind of list(await data("enemy-kinds"))) observedKinds.add(kind);
      for (const checkpoint of list(await data("spawned-checkpoints"))) observedCheckpoints.add(checkpoint);
      maxCores = Math.max(maxCores, Number(await data("evolution-cores")) || 0);
      maxElitesDefeated = Math.max(maxElitesDefeated, Number(await data("elites-defeated")) || 0);
    };

    const moveTowardSafeLane = async () => {
      const x = Number(await data("x"));
      const y = Number(await data("y"));
      // Patrol a large inset rectangle. This is ordinary player movement, not a
      // qualification fixture: it avoids camping while keeping lanes readable.
      let key;
      if (y < 250 && x < 1500) key = "ArrowRight";
      else if (x >= 1500 && y < 950) key = "ArrowDown";
      else if (y >= 950 && x > 300) key = "ArrowLeft";
      else if (x <= 300 && y > 250) key = "ArrowUp";
      else {
        const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
        key = route[Math.floor(moveTicks / 10) % route.length];
      }
      await canvas.press(key, { delay: 520 });
      moveTicks += 1;
    };

    const deadline = Date.now() + 390_000;
    let reachedStageIV = false;
    while (Date.now() < deadline) {
      await record();
      if (bool(await data("dead"))) {
        throw new Error(`natural CR-1 run died before Stage-IV proof; stage=${await data("director-stage")}; elapsed=${await data("director-elapsed-ms")}; level=${await data("level")}; hp=${await data("hp")}; kills=${await data("kills")}; checkpoints=${await data("spawned-checkpoints")}`);
      }
      if (bool(await data("draft-open"))) {
        await chooseDraft();
        continue;
      }

      if (String(await data("director-stage")) === "STAGE_IV") {
        reachedStageIV = true;
        if (Number(await data("director-elapsed-ms")) >= 300_000) break;
      }

      await moveTowardSafeLane();
      await page.waitForTimeout(80);
      if (moveTicks % 7 === 0 && !bool(await data("draft-open"))) {
        await shift(canvas, width);
        shifts += 1;
        await page.waitForTimeout(70);
      }
    }

    await record();
    assert.equal(reachedStageIV, true, "natural production run must reach Stage IV");
    assert.equal(await data("dead"), "false", "Stage-IV proof must remain alive");
    assert.ok(Number(await data("director-elapsed-ms")) >= 285_000, "Stage-IV boundary must be reached naturally");
    assert.ok(observedStages.has("STAGE_I"));
    assert.ok(observedStages.has("STAGE_II"));
    assert.ok(observedStages.has("STAGE_III"));
    assert.ok(observedStages.has("STAGE_IV"));
    assert.ok(observedKinds.has("BEACON"), `BEACON must appear naturally: ${[...observedKinds].join(",")}`);
    assert.ok(observedKinds.has("ANCHOR"), `ANCHOR must appear naturally: ${[...observedKinds].join(",")}`);
    assert.ok(observedKinds.has("FLICKER_A") || observedKinds.has("FLICKER_B"), `FLICKER must appear naturally: ${[...observedKinds].join(",")}`);
    assert.ok(observedCheckpoints.has("ELITE_I"), `ELITE_I must spawn: ${[...observedCheckpoints].join(",")}`);
    assert.ok(observedCheckpoints.has("CHECKPOINT_ELITE"), `CHECKPOINT_ELITE must spawn: ${[...observedCheckpoints].join(",")}`);
    assert.ok(observedCheckpoints.has("ELITE_II"), `ELITE_II must spawn by Stage IV: ${[...observedCheckpoints].join(",")}`);
    assert.ok(shifts >= 8, `natural run must exercise SHIFT repeatedly, got ${shifts}`);
    if (width === 390) assert.equal(await reduced.isChecked(), true, "narrow qualification must retain reduced motion");

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-cr1-stage4-${width}.png`) });
    console.log(`CR1_STAGE4_${width}=PASS`);
    console.log(`CR1_STAGE4_${width}_ELAPSED=${await data("director-elapsed-ms")}`);
    console.log(`CR1_STAGE4_${width}_HP=${await data("hp")}`);
    console.log(`CR1_STAGE4_${width}_LEVEL=${await data("level")}`);
    console.log(`CR1_STAGE4_${width}_KILLS=${await data("kills")}`);
    console.log(`CR1_STAGE4_${width}_OBSERVED_STAGES=${[...observedStages].join(",")}`);
    console.log(`CR1_STAGE4_${width}_OBSERVED_KINDS=${[...observedKinds].join(",")}`);
    console.log(`CR1_STAGE4_${width}_CHECKPOINTS=${[...observedCheckpoints].join(",")}`);
    console.log(`CR1_STAGE4_${width}_MAX_CORES=${maxCores}`);
    console.log(`CR1_STAGE4_${width}_MAX_ELITES_DEFEATED=${maxElitesDefeated}`);
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 420_000,
    screenshot: resolve(`artifacts/rare-shift-cr1-host-${width}.png`),
    check: qualification(width),
  });
}

console.log("RARE_SHIFT_CR1_BROWSER=PASS");
