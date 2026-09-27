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

function qualify(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
    const canvas = game.locator("canvas");
    await canvas.waitFor({ state: "visible" });
    await canvas.focus();
    const data = name => canvas.getAttribute(`data-${name}`);

    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;
    const deadline = Date.now() + 65_000;
    while (Date.now() < deadline && !bool(await data("draft-open"))) {
      assert.equal(await data("dead"), "false", "must reach first draft alive");
      await canvas.press(route[routeIndex++ % route.length], { delay: 390 });
      await page.waitForTimeout(850);
      if (routeIndex % 5 === 0 && !bool(await data("draft-open"))) {
        if (width === 390) {
          const box = await canvas.boundingBox();
          assert.ok(box);
          await canvas.click({ position: { x: box.width * 842 / 960, y: box.height * 530 / 640 } });
        } else {
          await canvas.press("Space");
        }
        await page.waitForTimeout(95);
      }
    }

    assert.equal(await data("draft-open"), "true", "expected a natural draft before pointer probe");
    const ids = list(await data("draft-ids"));
    assert.equal(ids.length, 3, "first draft should expose the qualified three-card surface before the synthetic cardinality probe");
    const expectedFirst = ids[0];

    // UI-regression probe only: reproduce the exact one-card adapter condition without
    // changing gameplay ownership, XP, HP, phase, enemy state, or draft choices.
    await canvas.evaluate(node => { node.dataset.draftCount = "1"; });
    const box = await canvas.boundingBox();
    assert.ok(box, "canvas must have a bounding box");
    await canvas.click({ position: { x: box.width * 480 / 960, y: box.height * 320 / 640 } });
    await page.waitForTimeout(250);

    assert.equal(await data("draft-open"), "false", "centered one-card click must choose index zero and resume combat");

    if (expectedFirst === "ORBIT_NODES") assert.equal(await data("orbit-owned"), "true");
    else if (expectedFirst === "VECTOR_NEEDLE") assert.equal(await data("vector-owned"), "true");
    else if (expectedFirst === "DELTA_RANK") assert.equal(await data("delta-rank"), "2");
    else throw new Error(`unexpected first draft choice ${expectedFirst}`);

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-2e-pointer-one-card-${width}.png`) });
    console.log(`RARE_SHIFT_V2_2E_ONE_CARD_POINTER_${width}=PASS`);
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 100_000,
    screenshot: resolve(`artifacts/rare-shift-v2-2e-pointer-host-${width}.png`),
    check: qualify(width),
  });
}
