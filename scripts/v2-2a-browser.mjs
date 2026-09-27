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

function ids(value) {
  return String(value ?? "").split(",").filter(Boolean);
}

function centers(count) {
  if (count === 1) return [480];
  if (count === 2) return [350, 610];
  if (count === 3) return [220, 480, 740];
  throw new Error(`unexpected draft count ${count}`);
}

async function clickDraft(canvas, index, count) {
  const box = await canvas.boundingBox();
  assert.ok(box, "canvas must have a bounding box");
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
    await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
    const canvas = game.locator("canvas");
    await canvas.waitFor({ state: "visible" });
    await canvas.focus();
    const data = name => canvas.getAttribute(`data-${name}`);

    assert.equal(await data("stage"), "v2-survival");
    assert.equal(await data("vector-owned"), "false");
    assert.equal(await data("vector-profile"), "rank1-phase-targeted");
    assert.equal(await data("delta-fx"), "canonical-exclusive");

    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;
    const draftDeadline = Date.now() + 58_000;
    while (Date.now() < draftDeadline && !bool(await data("draft-open"))) {
      if (bool(await data("dead"))) throw new Error("died before VECTOR acquisition draft");
      await canvas.press(route[routeIndex++ % route.length], { delay: 430 });
      await page.waitForTimeout(1200);
      if (routeIndex % 3 === 0 && !bool(await data("draft-open"))) {
        await shift(canvas, width);
        await page.waitForTimeout(120);
      }
    }

    assert.equal(await data("draft-open"), "true", "expected a real level-up draft");
    const draftCount = Number(await data("draft-count"));
    const draftIds = ids(await data("draft-ids"));
    assert.equal(draftCount, 3, "V2-2A normal discovery draft must expose exactly 3 actionable choices");
    assert.equal(draftIds.length, 3);
    assert.equal(new Set(draftIds).size, 3);
    const vectorIndex = draftIds.indexOf("VECTOR_NEEDLE");
    assert.ok(vectorIndex >= 0, `VECTOR discovery guarantee missing: ${draftIds.join(",")}`);

    await game.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-2a-vector-draft-${width}.png`) });
    await clickDraft(canvas, vectorIndex, draftCount);
    await page.waitForTimeout(250);
    assert.equal(await data("draft-open"), "false");
    assert.equal(await data("vector-owned"), "true");
    assert.equal(await data("controls-dimmed"), "false");

    const fireDeadline = Date.now() + 18_000;
    while (Date.now() < fireDeadline && (Number(await data("vector-shots")) < 1 || Number(await data("vector-hits")) < 1)) {
      if (bool(await data("dead"))) throw new Error("died before VECTOR first hit");
      await canvas.press(route[routeIndex++ % route.length], { delay: 350 });
      await page.waitForTimeout(650);
    }
    assert.ok(Number(await data("vector-shots")) >= 1, "VECTOR must auto-fire after acquisition");
    assert.ok(Number(await data("vector-hits")) >= 1, "VECTOR must hit a corporeal target");
    assert.ok(Number(await data("vector-in-flight")) <= 2, "VECTOR in-flight pool must remain capped at 2");

    const acquisitionsBefore = Number(await data("vector-acquisitions"));
    const invalidationsBefore = Number(await data("vector-shift-invalidations"));
    const shotsBefore = Number(await data("vector-shots"));
    const phaseBefore = await data("phase");
    await shift(canvas, width);
    await page.waitForTimeout(180);
    assert.notEqual(await data("phase"), phaseBefore);
    assert.ok(Number(await data("vector-shift-invalidations")) > invalidationsBefore, "SHIFT must invalidate VECTOR state");

    const reacquireDeadline = Date.now() + 12_000;
    while (Date.now() < reacquireDeadline && (Number(await data("vector-acquisitions")) <= acquisitionsBefore || Number(await data("vector-shots")) <= shotsBefore)) {
      if (bool(await data("dead"))) throw new Error("died before VECTOR post-SHIFT reacquisition");
      await canvas.press(route[routeIndex++ % route.length], { delay: 300 });
      await page.waitForTimeout(500);
    }
    assert.ok(Number(await data("vector-acquisitions")) > acquisitionsBefore, "VECTOR must re-acquire after SHIFT");
    assert.ok(Number(await data("vector-shots")) > shotsBefore, "VECTOR must resume fire after phase rewrite");
    assert.ok(Number(await data("vector-in-flight")) <= 2);
    assert.equal(await data("dead"), "false");

    await game.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-2a-vector-qualified-${width}.png`) });
    console.log(`RARE_SHIFT_V2_2A_VECTOR_${width}=PASS`);
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 95_000,
    screenshot: resolve(`artifacts/rare-shift-v2-2a-host-${width}.png`),
    check: qualify(width),
  });
}
