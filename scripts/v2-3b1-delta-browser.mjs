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
    assert.ok(box);
    await canvas.click({ position: { x: box.width * 842 / 960, y: box.height * 530 / 640 } });
  } else {
    await canvas.press("Space");
  }
}

function qualify(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    const reduceMotion = game.getByRole("checkbox", { name: /Reduce motion/i });
    if (width === 390) {
      await reduceMotion.check();
      assert.equal(await reduceMotion.isChecked(), true);
    }

    await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
    const canvas = game.locator("canvas");
    await canvas.waitFor({ state: "visible" });
    await canvas.focus();
    const data = name => canvas.getAttribute(`data-${name}`);

    assert.equal(await data("level"), "1");
    assert.equal(await data("delta-rank"), "1");
    assert.equal(await data("delta-damage"), "12");
    assert.equal(await data("delta-cooldown-ms"), "860");
    assert.equal(await data("delta-world-scale"), "8");
    assert.equal(await data("draft-open"), "false");
    assert.equal(await data("dead"), "false");

    // Use the already-qualified V2-1 pursuit cadence only until the first real
    // production draft. V2-3B's approved browser gate requires each family to
    // naturally reach at least one higher rank; Rank-V reachability under final
    // XP/enemy pacing belongs to V2-4, not this family mechanics tranche.
    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;
    const deadline = Date.now() + 58_000;
    while (Date.now() < deadline && !bool(await data("draft-open"))) {
      if (bool(await data("dead"))) {
        throw new Error(`died before Level-2 DELTA draft; level=${await data("level")}; hp=${await data("hp")}; kills=${await data("kills")}`);
      }
      await canvas.press(route[routeIndex % route.length], { delay: 460 });
      routeIndex += 1;
      await page.waitForTimeout(1400);
      if (routeIndex % 2 === 0 && !bool(await data("draft-open"))) {
        await shift(canvas, width);
        await page.waitForTimeout(120);
      }
    }

    assert.equal(await data("draft-open"), "true", "expected first production level-up draft");
    assert.equal(await data("level"), "2", "pickup integrity must expose Level 2 before any later draft");
    assert.equal(await data("controls-dimmed"), "true");

    const ids = list(await data("draft-ids"));
    const count = Number(await data("draft-count"));
    assert.equal(ids.length, count);
    assert.equal(new Set(ids).size, ids.length);
    const deltaIndex = ids.indexOf("DELTA_RANK");
    assert.ok(deltaIndex >= 0, `Level-2 production draft must expose DELTA_RANK: ${ids.join(",")}`);

    const primaryPulsesBefore = Number(await data("delta-primary-pulses"));
    console.log(`V2_3B1_RANK2_DRAFT_${width}=L2:HP${await data("hp")}:${ids.join(",")}=>DELTA_RANK`);
    await clickDraft(canvas, deltaIndex, count);

    // chooseDraft synchronously updates dataset state before combat resumes.
    assert.equal(await data("draft-open"), "false");
    assert.equal(await data("controls-dimmed"), "false");
    assert.equal(await data("delta-rank"), "2");
    assert.equal(await data("delta-damage"), "12");
    assert.equal(await data("delta-cooldown-ms"), "720");
    assert.equal(await data("delta-world-scale"), "8");
    assert.equal(Number(await data("delta-primary-pulses")), primaryPulsesBefore,
      "rank selection itself must not manufacture a free DELTA pulse");
    assert.equal(await data("dead"), "false");

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b1-rank2-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B1_PICKUP_LEVEL_INTEGRITY_${width}=PASS`);
    console.log(`RARE_SHIFT_V2_3B1_NATURAL_HIGHER_RANK_${width}=PASS`);
    console.log(`RARE_SHIFT_V2_3B1_DELTA_RANK2_LIVE_PROFILE_${width}=PASS`);
    if (width === 390) console.log("RARE_SHIFT_V2_3B1_REDUCED_MOTION=PASS");
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 80_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b1-host-${width}.png`),
    check: qualify(width),
  });
}
