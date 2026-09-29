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
async function reduceIfNarrow(game, width) {
  const control = game.getByRole("checkbox", { name: /Reduce motion/i });
  if (width === 390) { await control.check(); assert.equal(await control.isChecked(), true); }
  return control;
}
async function mount(game) {
  await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
  const canvas = game.locator("canvas"); await canvas.waitFor({ state: "visible" }); await canvas.focus(); return canvas;
}
async function setFixture(game, rank) {
  await game.locator("body").evaluate((_, value) => { window.__RARE_SHIFT_V23B4_ECHO_RANK__ = value; }, rank);
}
async function clearDraft(canvas, data) {
  if (!bool(await data("draft-open"))) return;
  const ids = list(await data("draft-ids")); const count = Number(await data("draft-count"));
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
    const reduced = await reduceIfNarrow(game, width);
    const canvas = await mount(game); const data = name => canvas.getAttribute(`data-${name}`);
    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"]; let ri = 0;

    const moveUntilDraft = async (minimumLevel, deadlineMs, label, allowShift = true) => {
      const deadline = Date.now() + deadlineMs;
      while (Date.now() < deadline && !(bool(await data("draft-open")) && Number(await data("level")) >= minimumLevel)) {
        if (bool(await data("dead"))) throw new Error(`died before ${label}; L${await data("level")}; HP${await data("hp")}`);
        if (!bool(await data("draft-open"))) {
          await canvas.press(route[ri++ % route.length], { delay: 520 }); await page.waitForTimeout(150);
          if (allowShift && ri % 6 === 0 && !bool(await data("draft-open"))) { await shift(canvas, width); await page.waitForTimeout(80); }
        }
      }
      assert.equal(await data("draft-open"), "true", `expected ${label}`);
    };
    const choose = async (id, label) => {
      const ids = list(await data("draft-ids")); const count = Number(await data("draft-count"));
      assert.equal(ids.length, count); assert.equal(new Set(ids).size, ids.length);
      const index = ids.indexOf(id); assert.ok(index >= 0, `${label} requires ${id}: ${ids.join(",")}`);
      console.log(`V2_3B4_NATURAL_DRAFT_${width}=L${await data("level")}:HP${await data("hp")}:${ids.join(",")}=>${id}`);
      await clickDraft(canvas, index, count); await page.waitForTimeout(160);
    };

    assert.equal(await data("echo-qualification-fixture"), "");
    await moveUntilDraft(2, 60_000, "level-2 ORBIT draft");
    assert.deepEqual(new Set(list(await data("draft-ids"))), new Set(["ORBIT_NODES", "VECTOR_NEEDLE", "DELTA_RANK"]));
    await choose("ORBIT_NODES", "level-2 ORBIT draft");
    await moveUntilDraft(3, 70_000, "level-3 ECHO draft");
    await choose("ECHO_MINE", "level-3 ECHO draft");
    assert.equal(await data("echo-rank"), "1"); assert.equal(await data("echo-max-active"), "3");

    // From acquisition onward, do not SHIFT. Every mine observed for the Rank-II
    // capacity proof must therefore be a genuine DORMANT_HOME path-memory mine.
    await moveUntilDraft(4, 85_000, "level-4 SIGNAL draft", false);
    await choose("SIGNAL_ARC", "level-4 SIGNAL draft");
    assert.equal(await data("weapon-slots-used"), "4");

    let selected = false;
    for (let level = 5; level <= 9 && !selected; level += 1) {
      await moveUntilDraft(level, 95_000, `level-${level} ECHO rank draft`, false);
      const ids = list(await data("draft-ids")); const count = Number(await data("draft-count")); const index = ids.indexOf("ECHO_RANK");
      if (index >= 0) {
        const triggers = Number(await data("echo-triggers")); const placements = Number(await data("echo-placements"));
        await clickDraft(canvas, index, count); await page.waitForTimeout(70);
        assert.equal(await data("echo-rank"), "2"); assert.equal(await data("echo-max-active"), "4");
        assert.equal(Number(await data("echo-triggers")), triggers, "rank card must not detonate a mine");
        assert.equal(Number(await data("echo-placements")), placements, "rank card must not manufacture a mine");
        selected = true; break;
      }
      let fallback = ids.indexOf("FIELD_REPAIR"); if (fallback < 0) fallback = ids.indexOf("DELTA_RANK"); if (fallback < 0) fallback = ids.indexOf("SIGNAL_MAGNET"); if (fallback < 0) fallback = 0;
      await clickDraft(canvas, fallback, count); await page.waitForTimeout(130);
    }
    assert.equal(selected, true, "natural production route must expose ECHO I→II");

    const fourDeadline = Date.now() + 16_000;
    while (Date.now() < fourDeadline && Number(await data("echo-active-mines")) < 4) {
      if (bool(await data("dead"))) throw new Error("died before four real Rank-II mines coexisted");
      if (bool(await data("draft-open"))) { await clearDraft(canvas, data); continue; }
      await canvas.press(route[ri++ % route.length], { delay: 540 }); await page.waitForTimeout(150);
    }
    assert.equal(Number(await data("echo-active-mines")), 4, "Rank II must support four naturally placed mines");
    const states = String(await data("echo-mine-states"));
    assert.equal(states.split("|").length, 4); assert.ok(states.split("|").every(state => state.includes("DORMANT_HOME")), states);
    assert.equal(await data("echo-qualification-fixture"), ""); assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduced.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b4-natural-rank2-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B4_NATURAL_ECHO_RANK2_${width}=PASS`);
    console.log(`RARE_SHIFT_V2_3B4_ECHO_FOUR_MINE_CAPACITY_${width}=PASS`);
  };
}

function rank4Qualification(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" }); const reduced = await reduceIfNarrow(game, width); await setFixture(game, 4);
    const canvas = await mount(game); const data = name => canvas.getAttribute(`data-${name}`); const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"]; let ri = 0;
    assert.equal(await data("echo-qualification-fixture"), "ECHO_RANK_4"); assert.equal(await data("echo-rank"), "4"); assert.equal(await data("echo-return-delay-ms"), "140");
    const deadline = Date.now() + 9_000;
    while (Date.now() < deadline && Number(await data("echo-active-mines")) < 1) { await canvas.press(route[ri++ % 4], { delay: 360 }); await page.waitForTimeout(220); }
    assert.ok(Number(await data("echo-active-mines")) >= 1);
    const triggers = Number(await data("echo-triggers")); const returns = Number(await data("echo-returns"));
    await shift(canvas, width); await page.waitForTimeout(90); await shift(canvas, width); await page.waitForTimeout(70);
    assert.ok(Number(await data("echo-returns")) > returns); assert.equal(Number(await data("echo-triggers")), triggers, "Rank-IV return must not detonate before 140ms");
    const hitBefore = Number(await data("echo-hits")); const hitDeadline = Date.now() + 24_000;
    while (Date.now() < hitDeadline && Number(await data("echo-hits")) <= hitBefore) {
      if (bool(await data("dead"))) throw new Error("died before Rank-IV real ECHO hit");
      if (bool(await data("draft-open"))) { await clearDraft(canvas, data); continue; }
      await canvas.press(route[ri++ % 4], { delay: 380 }); await page.waitForTimeout(220);
    }
    assert.ok(Number(await data("echo-hits")) > hitBefore); assert.equal(await data("dead"), "false"); if (width === 390) assert.equal(await reduced.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b4-rank4-recall-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B4_ECHO_RANK4_FAST_RECALL_${width}=PASS`);
  };
}

function rank5Qualification(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" }); const reduced = await reduceIfNarrow(game, width); await setFixture(game, 5);
    const canvas = await mount(game); const data = name => canvas.getAttribute(`data-${name}`); const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"]; let ri = 0;
    assert.equal(await data("echo-qualification-fixture"), "ECHO_RANK_5"); assert.equal(await data("echo-rank"), "5"); assert.equal(await data("echo-depth-increments"), "0");
    const mineDeadline = Date.now() + 9_000;
    while (Date.now() < mineDeadline && Number(await data("echo-active-mines")) < 1) { await canvas.press(route[ri++ % 4], { delay: 360 }); await page.waitForTimeout(220); }
    assert.ok(Number(await data("echo-active-mines")) >= 1);

    await shift(canvas, width); await page.waitForTimeout(60); await shift(canvas, width); await page.waitForTimeout(35);
    assert.ok(Number(await data("echo-depth-increments")) >= 1); assert.match(String(await data("echo-memory-depths")), /:1(?:,|$)/u);
    await shift(canvas, width); await page.waitForTimeout(120); await shift(canvas, width); await page.waitForTimeout(35);
    assert.equal(Number(await data("echo-depth-increments")), 1, "too-fast second cycle must not earn depth");
    await shift(canvas, width); await page.waitForTimeout(950); await shift(canvas, width); await page.waitForTimeout(50);
    assert.ok(Number(await data("echo-depth-increments")) >= 2, "legal >=900ms return cycle must reach depth 2"); assert.match(String(await data("echo-memory-depths")), /:2(?:,|$)/u);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b4-rank5-depth2-${width}.png`) });

    const deepBefore = Number(await data("echo-depth2-hits")); const deadline = Date.now() + 25_000;
    while (Date.now() < deadline && Number(await data("echo-depth2-hits")) <= deepBefore) {
      if (bool(await data("dead"))) throw new Error("died before Rank-V depth-2 real hit");
      if (bool(await data("draft-open"))) { await clearDraft(canvas, data); continue; }
      await canvas.press(route[ri++ % 4], { delay: 360 }); await page.waitForTimeout(220);
    }
    assert.ok(Number(await data("echo-depth2-hits")) > deepBefore, "depth-2 profile must hit a real corporeal enemy"); assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduced.isChecked(), true);
    console.log(`RARE_SHIFT_V2_3B4_ECHO_RANK5_DEEP_MEMORY_${width}=PASS`);
    console.log(`RARE_SHIFT_V2_3B4_ECHO_BURST_CAP_DIRECT_${width}=DEFERRED_V2_4_HIGH_HP_THREAT`);
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, { width, height: width === 960 ? 800 : 844, timeout: 160_000, screenshot: resolve(`artifacts/rare-shift-v2-3b4-natural-host-${width}.png`), check: naturalQualification(width) });
  await testGame(gameDirectory, { width, height: width === 960 ? 800 : 844, timeout: 80_000, screenshot: resolve(`artifacts/rare-shift-v2-3b4-rank4-host-${width}.png`), check: rank4Qualification(width) });
  await testGame(gameDirectory, { width, height: width === 960 ? 800 : 844, timeout: 90_000, screenshot: resolve(`artifacts/rare-shift-v2-3b4-rank5-host-${width}.png`), check: rank5Qualification(width) });
}
console.log("RARE_SHIFT_V2_3B4_REDUCED_MOTION=PASS");
console.log("RARE_SHIFT_V2_3B4_BROWSER=PASS");
