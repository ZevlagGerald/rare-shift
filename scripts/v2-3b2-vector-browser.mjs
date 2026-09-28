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
  const reduceMotion = game.getByRole("checkbox", { name: /Reduce motion/i });
  if (width === 390) {
    await reduceMotion.check();
    assert.equal(await reduceMotion.isChecked(), true);
  }
  return reduceMotion;
}
async function mount(game) {
  await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
  const canvas = game.locator("canvas");
  await canvas.waitFor({ state: "visible" });
  await canvas.focus();
  return canvas;
}
async function setRankFixture(game, rank) {
  await game.locator("body").evaluate((_, value) => { window.__RARE_SHIFT_V23B2_VECTOR_RANK__ = value; }, rank);
}

function naturalQualification(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    const reduceMotion = await enableReducedMotion(game, width);
    const canvas = await mount(game);
    const data = name => canvas.getAttribute(`data-${name}`);
    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;

    assert.equal(await data("level"), "1");
    assert.equal(await data("vector-owned"), "false");
    assert.equal(await data("vector-qualification-fixture"), "");

    const moveUntilDraft = async (minimumLevel, deadlineMs, label) => {
      const deadline = Date.now() + deadlineMs;
      while (Date.now() < deadline && !(bool(await data("draft-open")) && Number(await data("level")) >= minimumLevel)) {
        if (bool(await data("dead"))) {
          throw new Error(`died before ${label}; L${await data("level")}; HP${await data("hp")}; K${await data("kills")}; V${await data("vector-rank")}`);
        }
        if (!bool(await data("draft-open"))) {
          await canvas.press(route[routeIndex++ % route.length], { delay: minimumLevel >= 4 ? 300 : 390 });
          await page.waitForTimeout(minimumLevel >= 4 ? 650 : 900);
          if (routeIndex % 5 === 0 && !bool(await data("draft-open"))) {
            await shift(canvas, width);
            await page.waitForTimeout(95);
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
      console.log(`V2_3B2_NATURAL_DRAFT_${width}=L${await data("level")}:HP${await data("hp")}:${ids.join(",")}=>${id}`);
      await clickDraft(canvas, index, count);
      await page.waitForTimeout(180);
    };

    await moveUntilDraft(2, 58_000, "level-2 VECTOR acquisition draft");
    assert.equal(await data("level"), "2", "same-frame pickup integrity must expose the Level-2 draft first");
    const l2 = list(await data("draft-ids"));
    assert.deepEqual(new Set(l2), new Set(["ORBIT_NODES", "VECTOR_NEEDLE", "DELTA_RANK"]));
    await choose("VECTOR_NEEDLE", "level-2 VECTOR acquisition draft");
    assert.equal(await data("vector-owned"), "true");
    assert.equal(await data("vector-rank"), "1");
    assert.equal(await data("weapon-slots-used"), "2");

    await moveUntilDraft(3, 68_000, "level-3 defensive acquisition draft");
    await choose("ORBIT_NODES", "level-3 defensive acquisition draft");
    assert.equal(await data("weapon-slots-used"), "3");

    await moveUntilDraft(4, 82_000, "level-4 memory acquisition draft");
    await choose("ECHO_MINE", "level-4 memory acquisition draft");
    assert.equal(await data("weapon-slots-used"), "4");

    let rankSelected = false;
    for (let targetLevel = 5; targetLevel <= 8 && !rankSelected; targetLevel += 1) {
      await moveUntilDraft(targetLevel, 90_000, `level-${targetLevel} VECTOR higher-rank draft`);
      const ids = list(await data("draft-ids"));
      const count = Number(await data("draft-count"));
      const vectorIndex = ids.indexOf("VECTOR_RANK");
      if (vectorIndex >= 0) {
        const shotsBefore = Number(await data("vector-shots"));
        console.log(`V2_3B2_RANK2_DRAFT_${width}=L${await data("level")}:HP${await data("hp")}:${ids.join(",")}=>VECTOR_RANK`);
        await clickDraft(canvas, vectorIndex, count);
        assert.equal(await data("vector-rank"), "2");
        assert.equal(Number(await data("vector-shots")), shotsBefore, "rank selection itself must not manufacture a free VECTOR projectile");
        rankSelected = true;
        break;
      }
      let fallback = ids.indexOf("FIELD_REPAIR");
      if (fallback < 0) fallback = ids.indexOf("DELTA_RANK");
      if (fallback < 0) fallback = ids.indexOf("SIGNAL_MAGNET");
      if (fallback < 0) fallback = 0;
      assert.ok(fallback >= 0 && fallback < count, "natural fallback must be a rendered legal card");
      console.log(`V2_3B2_NATURAL_ROUTE_${width}=L${await data("level")}:${ids.join(",")}=>${ids[fallback]}`);
      await clickDraft(canvas, fallback, count);
      await page.waitForTimeout(180);
    }
    assert.equal(rankSelected, true, "natural production route must expose VECTOR I→II without injected progression state");
    assert.equal(await data("vector-rank"), "2");
    assert.equal(await data("vector-qualification-fixture"), "");
    assert.equal(await data("dead"), "false");

    const penetrationBefore = Number(await data("vector-penetration-hits"));
    const penetrationDeadline = Date.now() + 32_000;
    while (Date.now() < penetrationDeadline && Number(await data("vector-penetration-hits")) <= penetrationBefore) {
      if (bool(await data("draft-open"))) {
        const ids = list(await data("draft-ids"));
        const count = Number(await data("draft-count"));
        let index = ids.indexOf("FIELD_REPAIR");
        if (index < 0) index = ids.indexOf("SIGNAL_MAGNET");
        if (index < 0) index = ids.indexOf("DELTA_RANK");
        if (index < 0) index = 0;
        await clickDraft(canvas, index, count);
        await page.waitForTimeout(160);
        continue;
      }
      if (bool(await data("dead"))) throw new Error("died during Rank-II penetration observation");
      await canvas.press(route[routeIndex++ % route.length], { delay: 200 });
      await page.waitForTimeout(260);
    }
    assert.ok(Number(await data("vector-penetration-hits")) > penetrationBefore, "Rank II must produce a real secondary line hit in browser combat");
    assert.equal(await data("vector-profile"), "rank2-phase-targeted");
    if (width === 390) assert.equal(await reduceMotion.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b2-natural-rank2-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B2_NATURAL_VECTOR_RANK2_${width}=PASS`);
    console.log(`RARE_SHIFT_V2_3B2_VECTOR_RANK2_PENETRATION_${width}=PASS`);
  };
}

function transferQualification(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    const reduceMotion = await enableReducedMotion(game, width);
    await setRankFixture(game, 4);
    const canvas = await mount(game);
    const data = name => canvas.getAttribute(`data-${name}`);

    assert.equal(await data("vector-qualification-fixture"), "VECTOR_RANK_4");
    assert.equal(await data("vector-rank"), "4");
    assert.equal(await data("vector-transfer-armed"), "false", "Rank IV fixture must not credit a historical SHIFT");

    const targetDeadline = Date.now() + 18_000;
    while (Date.now() < targetDeadline && !String(await data("vector-target-id"))) {
      if (bool(await data("dead"))) throw new Error("died before Rank-IV target acquisition");
      await page.waitForTimeout(80);
    }
    assert.ok(String(await data("vector-target-id")), "Rank-IV fixture must acquire a real corporeal target");

    const shotsBefore = Number(await data("vector-transfer-shots"));
    await shift(canvas, width);
    const shiftedPhase = await data("phase");
    assert.equal(await data("vector-transfer-armed"), "true");
    assert.equal(await data("vector-transfer-phase"), shiftedPhase, "transfer authority must bind to the latest accepted SHIFT phase");

    let sawTransferInFlight = false;
    const shotDeadline = Date.now() + 3_500;
    while (Date.now() < shotDeadline && Number(await data("vector-transfer-shots")) <= shotsBefore) {
      if (bool(await data("dead"))) throw new Error("died before Rank-IV transfer launch");
      if (await data("vector-in-flight-transfer") === "true") sawTransferInFlight = true;
      await page.waitForTimeout(25);
    }
    assert.ok(Number(await data("vector-transfer-shots")) > shotsBefore, "accepted SHIFT must enable one real enhanced post-SHIFT launch");
    assert.equal(await data("vector-transfer-armed"), "false", "valid transfer launch must consume the charge immediately");
    sawTransferInFlight ||= await data("vector-in-flight-transfer") === "true";
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b2-transfer-${width}.png`) });
    assert.equal(await data("vector-rank"), "4");
    assert.ok(Number(await data("vector-shift-invalidations")) >= 1);
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduceMotion.isChecked(), true);
    console.log(`V2_3B2_TRANSFER_IN_FLIGHT_OBSERVED_${width}=${sawTransferInFlight ? "YES" : "NO_FAST_PROJECTILE"}`);
    console.log(`RARE_SHIFT_V2_3B2_VECTOR_RANK4_TRANSFER_${width}=PASS`);
  };
}

function lockQualification(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    const reduceMotion = await enableReducedMotion(game, width);
    await setRankFixture(game, 5);
    const canvas = await mount(game);
    const data = name => canvas.getAttribute(`data-${name}`);

    assert.equal(await data("vector-qualification-fixture"), "VECTOR_RANK_5");
    assert.equal(await data("vector-rank"), "5");
    assert.equal(await data("vector-lock-stacks"), "0", "Rank V fixture must initialize lock at zero");

    const stackDeadline = Date.now() + 18_000;
    while (Date.now() < stackDeadline && Number(await data("vector-lock-peak-stacks")) < 1) {
      if (bool(await data("dead"))) throw new Error("died before Rank-V lock evidence");
      await page.waitForTimeout(40);
    }
    assert.ok(Number(await data("vector-lock-peak-stacks")) >= 1, "Rank V must earn lock only from a confirmed eligible primary hit");
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b2-lock-${width}.png`) });

    const resetBefore = Number(await data("vector-lock-resets"));
    const priorTarget = String(await data("vector-lock-target-id"));
    if (priorTarget) {
      await shift(canvas, width);
      assert.ok(Number(await data("vector-lock-resets")) > resetBefore, "accepted SHIFT/phase rewrite must clear live Rank-V lock state");
      assert.equal(await data("vector-lock-stacks"), "0");
    }
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduceMotion.isChecked(), true);
    console.log(`RARE_SHIFT_V2_3B2_VECTOR_RANK5_LOCK_${width}=PASS`);
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 330_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b2-natural-host-${width}.png`),
    check: naturalQualification(width),
  });
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 70_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b2-transfer-host-${width}.png`),
    check: transferQualification(width),
  });
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 70_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b2-lock-host-${width}.png`),
    check: lockQualification(width),
  });
}
