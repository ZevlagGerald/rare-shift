import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";

const gameDirectory = resolve("games/rare-shift");
await mkdir(resolve("artifacts"), { recursive: true });

function mix32(value) {
  let x = value >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

function deterministicUnit(seed, index, channel = 0) {
  const mixed = mix32((seed >>> 0) ^ Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(channel + 17, 0x85ebca6b));
  return mixed / 0x100000000;
}

function deltaChoiceKey(seed, level) {
  const ids = ["DELTA_RANK", "FIELD_REPAIR", "SIGNAL_MAGNET"];
  const rotate = Math.floor(deterministicUnit(seed, level, 41) * ids.length) % ids.length;
  const ordered = [...ids.slice(rotate), ...ids.slice(0, rotate)];
  const index = ordered.indexOf("DELTA_RANK");
  assert.notEqual(index, -1);
  return String(index + 1);
}

async function screenshot(page, width, name) {
  await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-1-${name}-${width}.png`) });
}

function datasetBoolean(value) {
  assert.ok(value === "true" || value === "false", `expected boolean dataset, received ${String(value)}`);
  return value === "true";
}

async function combatSnapshot(data) {
  return {
    hp: Number(await data("hp")),
    level: Number(await data("level")),
    xp: Number(await data("xp")),
    kills: Number(await data("kills")),
    shifts: Number(await data("shifts")),
    deltaRank: Number(await data("delta-rank")),
    activeEnemies: Number(await data("active-enemies")),
    phase: await data("phase"),
    draftOpen: datasetBoolean(await data("draft-open")),
    qualified: datasetBoolean(await data("qualified")),
    dead: datasetBoolean(await data("dead")),
  };
}

function qualifyV21(width) {
  return async function completeV21({ page, game, friendId }) {
    const root = game.locator(".rare-shift-proof");
    const scan = game.locator('[data-stage="scan"]');
    await scan.waitFor({ state: "visible" });

    assert.equal(await root.getAttribute("data-app-stage"), "scan");
    assert.equal(await scan.getAttribute("data-friend"), String(friendId));
    assert.ok((await scan.getAttribute("data-family"))?.length);
    assert.match(await scan.getAttribute("data-frame-a"), /^\d+$/);
    assert.match(await scan.getAttribute("data-frame-b"), /^\d+$/);
    assert.match(await scan.getAttribute("data-delta"), /^\d+$/);
    assert.equal((await game.locator('svg[data-scan-view="frame-a"]').getAttribute("data-rows"))?.length, 256);
    assert.equal((await game.locator('svg[data-scan-view="frame-b"]').getAttribute("data-rows"))?.length, 256);
    assert.equal(await game.locator('svg[data-scan-view="phase-field"]').count(), 1);
    await screenshot(page, width, "scan");

    await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
    const canvas = game.locator("canvas");
    await canvas.waitFor({ state: "visible" });
    await canvas.focus();

    const data = name => canvas.getAttribute(`data-${name}`);
    await assertDataset(data, "stage", "v2-survival");
    assert.equal(await data("friend"), String(friendId));
    assert.match(await data("frame-a"), /^\d+$/);
    assert.match(await data("frame-b"), /^\d+$/);
    assert.equal(await data("phase"), "B");
    assert.equal(await data("delta-rank"), "1");
    assert.equal(await data("level"), "1");
    assert.equal(await data("dead"), "false");
    assert.equal(await data("delta-fx"), "canonical-exclusive");
    assert.equal(await data("controls-dimmed"), "false");

    await screenshot(page, width, "initial");

    const startX = Number(await data("x"));
    await canvas.press("ArrowRight", { delay: 650 });
    const movedX = Number(await data("x"));
    assert.ok(movedX > startX, `expected movement: ${startX} -> ${movedX}`);

    const initialPhase = await data("phase");
    if (width === 390) {
      const box = await canvas.boundingBox();
      assert.ok(box);
      await canvas.click({ position: { x: box.width * 842 / 960, y: box.height * 530 / 640 } });
    } else {
      await canvas.press("Space");
    }
    assert.notEqual(await data("phase"), initialPhase);
    assert.ok(Number(await data("shifts")) >= 1);

    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;
    let draftCaptured = false;
    const deadline = Date.now() + 58_000;

    while (Date.now() < deadline) {
      const before = await combatSnapshot(data);
      if (before.dead) throw new Error(`V2-1 browser route died before qualification: ${JSON.stringify(before)}`);

      if (before.draftOpen) {
        assert.equal(await data("draft-count"), "3");
        assert.equal(await data("controls-dimmed"), "true");
        await screenshot(page, width, "draft");
        draftCaptured = true;
        const seed = Number(await data("seed"));
        const level = Number(await data("level"));
        const key = deltaChoiceKey(seed, level);
        await canvas.press(key);
        await page.waitForTimeout(150);
        assert.equal(await data("draft-open"), "false");
        assert.equal(await data("controls-dimmed"), "false");
        assert.ok(Number(await data("delta-rank")) >= 2);
      }

      if (datasetBoolean(await data("qualified"))) break;

      await canvas.press(route[routeIndex % route.length], { delay: 460 });
      routeIndex += 1;
      await page.waitForTimeout(1400);

      if (routeIndex % 2 === 0 && !datasetBoolean(await data("draft-open"))) {
        await canvas.press("Space");
        await page.waitForTimeout(120);
      }

      if (routeIndex % 5 === 0) {
        console.log(`V2_1_STATE_${width}=${JSON.stringify(await combatSnapshot(data))}`);
      }
    }

    const finalState = await combatSnapshot(data);
    console.log(`V2_1_FINAL_STATE_${width}=${JSON.stringify(finalState)}`);

    assert.equal(draftCaptured, true, `expected an actual level-up draft; final=${JSON.stringify(finalState)}`);
    assert.equal(finalState.qualified, true);
    assert.equal(finalState.dead, false);
    assert.ok(finalState.kills >= 3);
    assert.ok(finalState.shifts >= 1);
    assert.ok(finalState.level >= 2);
    assert.ok(finalState.deltaRank >= 2);
    assert.ok(finalState.hp > 0);
    assert.ok(finalState.activeEnemies <= 48);

    await screenshot(page, width, "qualified");

    const reduce = game.getByLabel("Reduce motion");
    await reduce.check();
    assert.equal(await reduce.isChecked(), true);
    if (!datasetBoolean(await data("draft-open"))) await canvas.press("Space");
    assert.equal(await data("dead"), "false");
  };
}

async function assertDataset(data, name, expected) {
  assert.equal(await data(name), expected, `data-${name}`);
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 80_000,
    screenshot: resolve(`artifacts/rare-shift-v2-1-host-${width}.png`),
    check: qualifyV21(width),
  });
  console.log(`RARE_SHIFT_V2_1_BROWSER_${width}=PASS`);
}