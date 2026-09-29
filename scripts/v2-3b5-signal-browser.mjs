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
async function enableReducedMotion(game, width) {
  const control = game.getByRole("checkbox", { name: /Reduce motion/i });
  if (width === 390) {
    await control.check();
    assert.equal(await control.isChecked(), true);
  }
  return control;
}
async function mount(game) {
  await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
  const canvas = game.locator("canvas");
  await canvas.waitFor({ state: "visible" });
  await canvas.focus();
  return canvas;
}
async function setFixture(game, rank) {
  await game.locator("body").evaluate((_, value) => { window.__RARE_SHIFT_V23B5_SIGNAL_RANK__ = value; }, rank);
}
async function clearDraft(canvas, data) {
  if (!bool(await data("draft-open"))) return;
  const ids = list(await data("draft-ids"));
  const count = Number(await data("draft-count"));
  let index = ids.indexOf("FIELD_REPAIR");
  if (index < 0) index = ids.indexOf("SIGNAL_MAGNET");
  if (index < 0) index = ids.indexOf("DELTA_RANK");
  if (index < 0) index = ids.findIndex(id => id !== "SIGNAL_RANK");
  if (index < 0) index = 0;
  await clickDraft(canvas, index, count);
}

function naturalQualification(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    const reduced = await enableReducedMotion(game, width);
    const canvas = await mount(game);
    const data = name => canvas.getAttribute(`data-${name}`);
    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;

    const moveUntilDraft = async (minimumLevel, deadlineMs, label) => {
      const deadline = Date.now() + deadlineMs;
      while (Date.now() < deadline && !(bool(await data("draft-open")) && Number(await data("level")) >= minimumLevel)) {
        if (bool(await data("dead"))) throw new Error(`died before ${label}; L${await data("level")}; HP${await data("hp")}; K${await data("kills")}`);
        if (!bool(await data("draft-open"))) {
          await canvas.press(route[routeIndex++ % route.length], { delay: 620 });
          await page.waitForTimeout(70);
          if (routeIndex % 6 === 0 && !bool(await data("draft-open"))) {
            await shift(canvas, width);
            await page.waitForTimeout(70);
          }
        }
      }
      assert.equal(await data("draft-open"), "true", `expected ${label}`);
      assert.ok(Number(await data("level")) >= minimumLevel, `${label} must be level ${minimumLevel}+`);
    };

    const choose = async (id, label) => {
      const ids = list(await data("draft-ids"));
      const count = Number(await data("draft-count"));
      assert.equal(ids.length, count, `${label} ids/count mismatch`);
      assert.equal(new Set(ids).size, ids.length, `${label} choices must be distinct`);
      const index = ids.indexOf(id);
      assert.ok(index >= 0, `${label} requires ${id}: ${ids.join(",")}`);
      console.log(`V2_3B5_NATURAL_DRAFT_${width}=L${await data("level")}:HP${await data("hp")}:${ids.join(",")}=>${id}`);
      await clickDraft(canvas, index, count);
      await page.waitForTimeout(120);
    };

    assert.equal(await data("signal-qualification-fixture"), "");
    await moveUntilDraft(2, 60_000, "level-2 ORBIT draft");
    assert.deepEqual(new Set(list(await data("draft-ids"))), new Set(["ORBIT_NODES", "VECTOR_NEEDLE", "DELTA_RANK"]));
    await choose("ORBIT_NODES", "level-2 ORBIT draft");

    await moveUntilDraft(3, 70_000, "level-3 ECHO draft");
    await choose("ECHO_MINE", "level-3 ECHO draft");

    await moveUntilDraft(4, 85_000, "level-4 SIGNAL draft");
    await choose("SIGNAL_ARC", "level-4 SIGNAL draft");
    assert.equal(await data("signal-rank"), "1");
    assert.equal(await data("weapon-slots-used"), "4");

    let rankSelected = false;
    for (let targetLevel = 5; targetLevel <= 10 && !rankSelected; targetLevel += 1) {
      await moveUntilDraft(targetLevel, 95_000, `level-${targetLevel} SIGNAL higher-rank draft`);
      const ids = list(await data("draft-ids"));
      const count = Number(await data("draft-count"));
      const signalIndex = ids.indexOf("SIGNAL_RANK");
      if (signalIndex >= 0) {
        console.log(`V2_3B5_RANK2_DRAFT_${width}=L${await data("level")}:HP${await data("hp")}:${ids.join(",")}=>SIGNAL_RANK`);
        await clickDraft(canvas, signalIndex, count);
        await page.waitForTimeout(100);
        assert.equal(await data("signal-rank"), "2");
        assert.equal(await data("signal-max-targets"), "4");
        assert.equal(await data("signal-damage-profile"), "10,8,6,5");
        rankSelected = true;
        break;
      }
      let fallback = ids.indexOf("FIELD_REPAIR");
      if (fallback < 0) fallback = ids.indexOf("DELTA_RANK");
      if (fallback < 0) fallback = ids.indexOf("SIGNAL_MAGNET");
      if (fallback < 0) fallback = 0;
      console.log(`V2_3B5_NATURAL_ROUTE_${width}=L${await data("level")}:${ids.join(",")}=>${ids[fallback]}`);
      await clickDraft(canvas, fallback, count);
      await page.waitForTimeout(120);
    }
    assert.equal(rankSelected, true, "natural production route must expose SIGNAL I→II without injected progression state");

    const castDeadline = Date.now() + 45_000;
    let fourTargetObserved = false;
    while (Date.now() < castDeadline && !fourTargetObserved) {
      if (bool(await data("dead"))) throw new Error("died before a real Rank-II four-target SIGNAL cast");
      if (bool(await data("draft-open"))) { await clearDraft(canvas, data); await page.waitForTimeout(90); continue; }
      await canvas.press(route[routeIndex++ % route.length], { delay: 520 });
      await page.waitForTimeout(100);
      if (routeIndex % 6 === 0) { await shift(canvas, width); await page.waitForTimeout(60); }
      const ids = list(await data("signal-last-chain-ids"));
      const damages = list(await data("signal-last-chain-damage")).map(Number);
      if (ids.length === 4 && damages.join(",") === "10,8,6,5") fourTargetObserved = true;
    }
    assert.equal(fourTargetObserved, true, "Rank II must produce a real four-target [10,8,6,5] cast");
    assert.equal(await data("signal-qualification-fixture"), "");
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduced.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b5-natural-rank2-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B5_NATURAL_SIGNAL_RANK2_${width}=PASS`);
    console.log(`RARE_SHIFT_V2_3B5_SIGNAL_RANK2_FOUR_LINK_${width}=PASS`);
  };
}

function rank4Qualification(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    const reduced = await enableReducedMotion(game, width);
    await setFixture(game, 4);
    const canvas = await mount(game);
    const data = name => canvas.getAttribute(`data-${name}`);
    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;

    assert.equal(await data("signal-qualification-fixture"), "SIGNAL_RANK_4");
    assert.equal(await data("signal-rank"), "4");
    assert.equal(await data("signal-common-bonus-range"), "240");
    assert.equal(await data("signal-routing"), "NEAREST");

    const beforeInvalidations = Number(await data("signal-shift-graph-invalidations"));
    await shift(canvas, width);
    await page.waitForTimeout(80);
    assert.ok(Number(await data("signal-shift-graph-invalidations")) > beforeInvalidations, "Rank IV SHIFT must invalidate prior graph evidence");

    const deadline = Date.now() + 65_000;
    let extendedObserved = false;
    while (Date.now() < deadline && !extendedObserved) {
      if (bool(await data("dead"))) throw new Error("died before real Rank-IV extended COMMON relay");
      if (bool(await data("draft-open"))) { await clearDraft(canvas, data); await page.waitForTimeout(80); continue; }
      await canvas.press(route[routeIndex++ % route.length], { delay: 480 });
      await page.waitForTimeout(90);
      if (routeIndex % 5 === 0) { await shift(canvas, width); await page.waitForTimeout(70); }
      extendedObserved = Number(await data("signal-extended-common-relay-casts")) > 0;
    }
    assert.equal(extendedObserved, true, "Rank IV must produce a real >180px <=240px COMMON relay edge");
    assert.ok(Number(await data("signal-common-bonus-casts")) > 0);
    assert.ok(list(await data("signal-last-chain-edge-ranges")).map(Number).includes(240));
    assert.ok(list(await data("signal-last-chain-common-bonus")).includes("1"));
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduced.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b5-rank4-common-relay-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B5_SIGNAL_RANK4_RESONANT_RELAY_${width}=PASS`);
  };
}

function rank5Qualification(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    const reduced = await enableReducedMotion(game, width);
    await setFixture(game, 5);
    const canvas = await mount(game);
    const data = name => canvas.getAttribute(`data-${name}`);
    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;

    assert.equal(await data("signal-qualification-fixture"), "SIGNAL_RANK_5");
    assert.equal(await data("signal-rank"), "5");
    assert.equal(await data("signal-routing"), "FORWARD_DEGREE");
    assert.equal(await data("signal-damage-profile"), "10,9,8,7");

    const deadline = Date.now() + 70_000;
    let controlledObserved = false;
    while (Date.now() < deadline && !controlledObserved) {
      if (bool(await data("dead"))) throw new Error("died before real Rank-V controlled routing cast");
      if (bool(await data("draft-open"))) { await clearDraft(canvas, data); await page.waitForTimeout(80); continue; }
      await canvas.press(route[routeIndex++ % route.length], { delay: 480 });
      await page.waitForTimeout(90);
      if (routeIndex % 5 === 0) { await shift(canvas, width); await page.waitForTimeout(70); }
      controlledObserved = Number(await data("signal-controlled-routing-casts")) > 0;
    }
    assert.equal(controlledObserved, true, "Rank V must produce a real cast whose topology differs from nearest-only routing");
    const degrees = String(await data("signal-last-chain-forward-degrees")).split(",").filter(value => value !== "");
    assert.ok(degrees.length >= 1, "Rank V controlled route must expose forward-degree evidence");
    assert.ok(degrees.some(value => Number(value) >= 1));
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduced.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b5-rank5-chain-control-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B5_SIGNAL_RANK5_CHAIN_CONTROL_${width}=PASS`);
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 180_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b5-natural-host-${width}.png`),
    check: naturalQualification(width),
  });
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 100_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b5-rank4-host-${width}.png`),
    check: rank4Qualification(width),
  });
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 105_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b5-rank5-host-${width}.png`),
    check: rank5Qualification(width),
  });
}

console.log("RARE_SHIFT_V2_3B5_REDUCED_MOTION=PASS");
console.log("RARE_SHIFT_V2_3B5_BROWSER=PASS");
