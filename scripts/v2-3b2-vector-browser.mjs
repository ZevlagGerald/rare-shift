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
  const box = await canvas.boundingBox(); assert.ok(box);
  await canvas.click({ position: { x: box.width * centers(count)[index] / 960, y: box.height * 320 / 640 } });
}
async function shift(canvas, width) {
  if (width === 390) {
    const box = await canvas.boundingBox(); assert.ok(box);
    await canvas.click({ position: { x: box.width * 842 / 960, y: box.height * 530 / 640 } });
  } else await canvas.press("Space");
}
async function applyFixture(canvas, rank, scenario = "default") {
  await canvas.evaluate((_, input) => {
    const fn = window.__rareShiftVectorQualifier;
    if (typeof fn !== "function") throw new Error("VECTOR qualification fixture missing");
    fn(input.rank, input.scenario);
  }, { rank, scenario });
}
async function waitForNumber(page, data, name, minimum, timeout = 8000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = Number(await data(name));
    if (value >= minimum) return value;
    await page.waitForTimeout(80);
  }
  throw new Error(`${name} did not reach ${minimum}; final=${await data(name)}`);
}
async function reachDraft(page, canvas, data, width, expectedLevel, timeout = 60000) {
  const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
  let routeIndex = 0;
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline && !bool(await data("draft-open"))) {
    if (bool(await data("dead"))) throw new Error(`died before Level ${expectedLevel} draft; level=${await data("level")}; hp=${await data("hp")}`);
    await canvas.press(route[routeIndex % route.length], { delay: 420 });
    routeIndex += 1;
    await page.waitForTimeout(1200);
    if (routeIndex % 2 === 0 && !bool(await data("draft-open"))) { await shift(canvas, width); await page.waitForTimeout(100); }
  }
  assert.equal(await data("draft-open"), "true");
  assert.equal(await data("level"), String(expectedLevel));
}

function qualify(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    const reduceMotion = game.getByRole("checkbox", { name: /Reduce motion/i });
    if (width === 390) { await reduceMotion.check(); assert.equal(await reduceMotion.isChecked(), true); }
    await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
    const canvas = game.locator("canvas"); await canvas.waitFor({ state: "visible" }); await canvas.focus();
    const data = name => canvas.getAttribute(`data-${name}`);

    await reachDraft(page, canvas, data, width, 2);
    let ids = list(await data("draft-ids"));
    let count = Number(await data("draft-count"));
    const vectorAcquire = ids.indexOf("VECTOR_NEEDLE");
    assert.ok(vectorAcquire >= 0, `VECTOR_NEEDLE missing: ${ids.join(",")}`);
    await clickDraft(canvas, vectorAcquire, count);
    assert.equal(await data("vector-owned"), "true");
    assert.equal(await data("vector-rank"), "1");

    await reachDraft(page, canvas, data, width, 3, 70000);
    ids = list(await data("draft-ids")); count = Number(await data("draft-count"));
    const vectorRank = ids.indexOf("VECTOR_RANK");
    assert.ok(vectorRank >= 0, `VECTOR_RANK missing from natural Level-3 route: ${ids.join(",")}`);
    const shotsBeforeRank = Number(await data("vector-shots"));
    await clickDraft(canvas, vectorRank, count);
    assert.equal(await data("vector-rank"), "2");
    assert.equal(Number(await data("vector-shots")), shotsBeforeRank, "rank selection must not manufacture a free projectile");
    console.log(`RARE_SHIFT_V2_3B2_NATURAL_VECTOR_RANK2_${width}=PASS`);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b2-natural-rank2-${width}.png`) });

    await applyFixture(canvas, 2);
    await waitForNumber(page, data, "vector-penetration-hits", 1);
    assert.deepEqual(list(await data("vector-last-shot-target-ids")), ["9001", "9002"]);
    assert.equal(await data("vector-last-shot-damage"), "10,7");
    console.log(`RARE_SHIFT_V2_3B2_CLEAN_LINE_${width}=PASS`);

    await applyFixture(canvas, 3);
    assert.equal(await data("vector-target-id"), "9002", "TRACE priority target must beat nearer aligned SPLIT inside D+120");
    assert.equal(await data("vector-target-kind"), "TRACE");
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b2-priority-rank3-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B2_PRIORITY_TRACE_${width}=PASS`);

    await applyFixture(canvas, 4, "expiry");
    const expiryTransferShots = Number(await data("vector-transfer-shots"));
    await shift(canvas, width);
    assert.equal(await data("vector-transfer-armed"), "true");
    await page.waitForTimeout(1300);
    assert.equal(await data("vector-transfer-armed"), "false");
    assert.equal(Number(await data("vector-transfer-shots")), expiryTransferShots, "expired no-target transfer must create no transfer projectile/backlog");
    assert.equal(await data("vector-last-shot-transfer"), "false", "any later ordinary shot must remain ordinary after transfer expiry");
    console.log(`RARE_SHIFT_V2_3B2_TRANSFER_EXPIRY_${width}=PASS`);

    await applyFixture(canvas, 4, "transfer");
    await shift(canvas, width);
    await waitForNumber(page, data, "vector-transfer-shots", 1);
    assert.equal(await data("vector-last-shot-transfer"), "true");
    assert.equal(await data("vector-last-shot-target-ids"), "9001,9002,9003");
    assert.equal(await data("vector-last-shot-damage"), "10,7,5");
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b2-transfer-rank4-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B2_PHASE_TRANSFER_${width}=PASS`);

    await applyFixture(canvas, 5);
    assert.equal(await data("vector-qualification-synthetic-hp"), "true");
    await waitForNumber(page, data, "vector-lock-stacks", 3, 6000);
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline && !String(await data("vector-last-shot-damage")).startsWith("16")) await page.waitForTimeout(100);
    assert.ok(String(await data("vector-last-shot-damage")).startsWith("16"), `Rank-V locked shot did not reach 16: ${await data("vector-last-shot-damage")}`);
    assert.equal(await data("vector-lock-target-id"), "9001");
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b2-lock-rank5-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B2_VECTOR_LOCK_${width}=PASS`);
    if (width === 390) console.log("RARE_SHIFT_V2_3B2_REDUCED_MOTION=PASS");
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 125_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b2-host-${width}.png`),
    check: qualify(width),
  });
}
