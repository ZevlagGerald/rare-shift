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
  await game.locator("body").evaluate((_, value) => { window.__RARE_SHIFT_V23B4_ECHO_RANK__ = value; }, rank);
}
async function clearDraft(canvas, data) {
  if (!bool(await data("draft-open"))) return;
  const ids = list(await data("draft-ids"));
  const count = Number(await data("draft-count"));
  let index = ids.indexOf("FIELD_REPAIR");
  if (index < 0) index = ids.indexOf("SIGNAL_MAGNET");
  if (index < 0) index = ids.indexOf("DELTA_RANK");
  if (index < 0) index = ids.findIndex(id => id !== "ECHO_RANK");
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
        if (bool(await data("dead"))) throw new Error(`died before ${label}; L${await data("level")}; HP${await data("hp")}; K${await data("kills")}; E${await data("director-elapsed-ms")}`);
        if (!bool(await data("draft-open"))) {
          await canvas.press(route[routeIndex++ % route.length], { delay: 520 });
          await page.waitForTimeout(150);
          if (routeIndex % 6 === 0 && !bool(await data("draft-open"))) {
            await shift(canvas, width);
            await page.waitForTimeout(80);
          }
        }
      }
      assert.equal(await data("draft-open"), "true", `expected ${label}; L${await data("level")}; HP${await data("hp")}; K${await data("kills")}; E${await data("director-elapsed-ms")}`);
      assert.ok(Number(await data("level")) >= minimumLevel, `${label} must be level ${minimumLevel}+`);
    };

    const choose = async (id, label) => {
      const ids = list(await data("draft-ids"));
      const count = Number(await data("draft-count"));
      assert.equal(ids.length, count, `${label} ids/count mismatch`);
      assert.equal(new Set(ids).size, ids.length, `${label} choices must be distinct`);
      const index = ids.indexOf(id);
      assert.ok(index >= 0, `${label} requires ${id}: ${ids.join(",")}`);
      console.log(`V2_3B4_NATURAL_DRAFT_${width}=L${await data("level")}:HP${await data("hp")}:${ids.join(",")}=>${id}`);
      await clickDraft(canvas, index, count);
      await page.waitForTimeout(160);
    };

    assert.equal(await data("echo-qualification-fixture"), "");
    await moveUntilDraft(2, 60_000, "level-2 ORBIT draft");
    assert.deepEqual(new Set(list(await data("draft-ids"))), new Set(["ORBIT_NODES", "VECTOR_NEEDLE", "DELTA_RANK"]));
    await choose("ORBIT_NODES", "level-2 ORBIT draft");

    await moveUntilDraft(3, 70_000, "level-3 ECHO draft");
    await choose("ECHO_MINE", "level-3 ECHO draft");
    assert.equal(await data("echo-rank"), "1");
    assert.equal(await data("echo-max-active"), "3");

    // Natural I→II progression should use ordinary player mechanics, including
    // SHIFT. Four-mine DORMANT_HOME capacity is qualified independently below
    // so that capacity correctness is not coupled to a one-hit endurance margin.
    await moveUntilDraft(4, 85_000, "level-4 SIGNAL draft");
    await choose("SIGNAL_ARC", "level-4 SIGNAL draft");
    assert.equal(await data("weapon-slots-used"), "4");

    let rankSelected = false;
    for (let targetLevel = 5; targetLevel <= 9 && !rankSelected; targetLevel += 1) {
      await moveUntilDraft(targetLevel, 95_000, `level-${targetLevel} ECHO higher-rank draft`);
      const ids = list(await data("draft-ids"));
      const count = Number(await data("draft-count"));
      const echoIndex = ids.indexOf("ECHO_RANK");
      if (echoIndex >= 0) {
        console.log(`V2_3B4_RANK2_DRAFT_${width}=L${await data("level")}:HP${await data("hp")}:${ids.join(",")}=>ECHO_RANK`);
        await clickDraft(canvas, echoIndex, count);
        await page.waitForTimeout(70);
        assert.equal(await data("echo-rank"), "2");
        assert.equal(await data("echo-max-active"), "4");
        assert.equal(await data("echo-rank-choice-trigger-delta"), "0", "ECHO rank transaction must not detonate a mine");
        assert.equal(await data("echo-rank-choice-placement-delta"), "0", "ECHO rank transaction must not manufacture a mine");
        rankSelected = true;
        break;
      }
      let fallback = ids.indexOf("FIELD_REPAIR");
      if (fallback < 0) fallback = ids.indexOf("DELTA_RANK");
      if (fallback < 0) fallback = ids.indexOf("SIGNAL_MAGNET");
      if (fallback < 0) fallback = 0;
      console.log(`V2_3B4_NATURAL_ROUTE_${width}=L${await data("level")}:${ids.join(",")}=>${ids[fallback]}`);
      await clickDraft(canvas, fallback, count);
      await page.waitForTimeout(130);
    }
    assert.equal(rankSelected, true, "natural production route must expose ECHO I→II without injected progression state");
    assert.equal(await data("echo-qualification-fixture"), "");
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduced.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b4-natural-rank2-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B4_NATURAL_ECHO_RANK2_${width}=PASS`);
  };
}

function rank2CapacityQualification(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    const reduced = await enableReducedMotion(game, width);
    await setFixture(game, 2);
    const canvas = await mount(game);
    const data = name => canvas.getAttribute(`data-${name}`);
    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;

    assert.equal(await data("echo-qualification-fixture"), "ECHO_RANK_2");
    assert.equal(await data("echo-rank"), "2");
    assert.equal(await data("echo-max-active"), "4");
    assert.equal(await data("echo-placements"), "0", "Rank-II fixture must not fabricate placements");
    assert.equal(await data("echo-active-mines"), "0", "Rank-II fixture must start without fabricated mines");

    const fourDeadline = Date.now() + 20_000;
    while (Date.now() < fourDeadline && Number(await data("echo-active-mines")) < 4) {
      if (bool(await data("dead"))) throw new Error(`died before four real Rank-II mines coexisted; HP${await data("hp")}; K${await data("kills")}; E${await data("director-elapsed-ms")}`);
      if (bool(await data("draft-open"))) { await clearDraft(canvas, data); await page.waitForTimeout(90); continue; }
      await canvas.press(route[routeIndex++ % route.length], { delay: 680 });
      await page.waitForTimeout(45);
    }

    assert.equal(Number(await data("echo-active-mines")), 4, "Rank II must support four naturally timed mines");
    assert.equal(Number(await data("echo-placements")), 4, "capacity proof must contain exactly four real placements");
    const states = String(await data("echo-mine-states")).split("|");
    assert.equal(states.length, 4);
    assert.ok(states.every(state => state.includes("DORMANT_HOME")), states.join("|"));
    assert.equal(await data("echo-triggers"), "0", "no-SHIFT capacity proof must not trigger a mine");
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduced.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b4-rank2-capacity-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B4_ECHO_FOUR_MINE_CAPACITY_${width}=PASS`);
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

    assert.equal(await data("echo-qualification-fixture"), "ECHO_RANK_4");
    assert.equal(await data("echo-rank"), "4");
    assert.equal(await data("echo-return-delay-ms"), "140");

    const mineDeadline = Date.now() + 9_000;
    while (Date.now() < mineDeadline && Number(await data("echo-active-mines")) < 1) {
      if (bool(await data("dead"))) throw new Error("died before Rank-IV mine placement");
      await canvas.press(route[routeIndex++ % route.length], { delay: 360 });
      await page.waitForTimeout(220);
    }
    assert.ok(Number(await data("echo-active-mines")) >= 1);

    const triggersBefore = Number(await data("echo-triggers"));
    const returnsBefore = Number(await data("echo-returns"));
    await shift(canvas, width);
    await page.waitForTimeout(90);
    await shift(canvas, width);
    await page.waitForTimeout(70);
    assert.ok(Number(await data("echo-returns")) > returnsBefore, "Rank-IV real return must be observed");
    assert.equal(Number(await data("echo-triggers")), triggersBefore, "Rank-IV return must not detonate before 140ms");

    const hitsBefore = Number(await data("echo-hits"));
    const hitDeadline = Date.now() + 24_000;
    while (Date.now() < hitDeadline && Number(await data("echo-hits")) <= hitsBefore) {
      if (bool(await data("dead"))) throw new Error("died before Rank-IV real ECHO hit");
      if (bool(await data("draft-open"))) { await clearDraft(canvas, data); await page.waitForTimeout(90); continue; }
      await canvas.press(route[routeIndex++ % route.length], { delay: 380 });
      await page.waitForTimeout(220);
    }
    assert.ok(Number(await data("echo-hits")) > hitsBefore, "Rank IV must produce a real post-return ECHO hit");
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduced.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b4-rank4-recall-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B4_ECHO_RANK4_FAST_RECALL_${width}=PASS`);
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

    assert.equal(await data("echo-qualification-fixture"), "ECHO_RANK_5");
    assert.equal(await data("echo-rank"), "5");
    assert.equal(await data("echo-depth-increments"), "0");

    const mineDeadline = Date.now() + 9_000;
    while (Date.now() < mineDeadline && Number(await data("echo-active-mines")) < 1) {
      if (bool(await data("dead"))) throw new Error("died before Rank-V mine placement");
      await canvas.press(route[routeIndex++ % route.length], { delay: 360 });
      await page.waitForTimeout(220);
    }
    assert.ok(Number(await data("echo-active-mines")) >= 1);

    await shift(canvas, width);
    await page.waitForTimeout(60);
    await shift(canvas, width);
    await page.waitForTimeout(35);
    const firstDepthCount = Number(await data("echo-depth-increments"));
    assert.ok(firstDepthCount >= 1, "first genuine Rank-V return cycle must add memory depth");
    assert.match(String(await data("echo-memory-depths")), /:1(?:,|$)/u);

    // Immediately leave again before the 140ms trigger window, then return far
    // inside the 900ms depth guard. All mines that existed for the first cycle
    // must transition normally but earn no additional depth.
    await shift(canvas, width);
    await page.waitForTimeout(120);
    await shift(canvas, width);
    await page.waitForTimeout(35);
    assert.equal(Number(await data("echo-depth-increments")), firstDepthCount, "too-fast second cycle must not earn depth");

    await shift(canvas, width);
    await page.waitForTimeout(950);
    await shift(canvas, width);
    await page.waitForTimeout(50);
    assert.ok(Number(await data("echo-depth-increments")) > firstDepthCount, "legal >=900ms return cycle must add depth again");
    assert.match(String(await data("echo-memory-depths")), /:2(?:,|$)/u);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b4-rank5-depth2-${width}.png`) });

    const deepHitsBefore = Number(await data("echo-depth2-hits"));
    const hitDeadline = Date.now() + 25_000;
    while (Date.now() < hitDeadline && Number(await data("echo-depth2-hits")) <= deepHitsBefore) {
      if (bool(await data("dead"))) throw new Error("died before Rank-V depth-2 real hit");
      if (bool(await data("draft-open"))) { await clearDraft(canvas, data); await page.waitForTimeout(90); continue; }
      await canvas.press(route[routeIndex++ % route.length], { delay: 360 });
      await page.waitForTimeout(220);
    }
    assert.ok(Number(await data("echo-depth2-hits")) > deepHitsBefore, "depth-2 profile must hit a real corporeal enemy");
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduced.isChecked(), true);
    console.log(`RARE_SHIFT_V2_3B4_ECHO_RANK5_DEEP_MEMORY_${width}=PASS`);
    console.log(`RARE_SHIFT_V2_3B4_ECHO_BURST_CAP_DIRECT_${width}=DEFERRED_V2_4_HIGH_HP_THREAT`);
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 160_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b4-natural-host-${width}.png`),
    check: naturalQualification(width),
  });
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 55_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b4-rank2-capacity-host-${width}.png`),
    check: rank2CapacityQualification(width),
  });
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 80_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b4-rank4-host-${width}.png`),
    check: rank4Qualification(width),
  });
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 90_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b4-rank5-host-${width}.png`),
    check: rank5Qualification(width),
  });
}

console.log("RARE_SHIFT_V2_3B4_REDUCED_MOTION=PASS");
console.log("RARE_SHIFT_V2_3B4_BROWSER=PASS");
