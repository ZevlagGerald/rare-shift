import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";
import { buildV21Draft, V21_SIGNAL_MAGNET_MAX_RADIUS } from "../games/rare-shift/src/draft-core.ts";

const gameDirectory = resolve("games/rare-shift");
await mkdir(resolve("artifacts"), { recursive: true });

const maxedDeltaProbe = buildV21Draft(13699, 6, { deltaRank: 5, hp: 50, maxHp: 100, pickupRadius: 76 });
assert.equal(maxedDeltaProbe.some(choice => choice.id === "DELTA_RANK"), false, "Rank-V DELTA must be absent from the browser qualification candidate pool");
assert.ok(maxedDeltaProbe.every(choice => !choice.disabled), "browser qualification must not receive disabled/dead cards");
assert.deepEqual(buildV21Draft(13699, 8, { deltaRank: 5, hp: 100, maxHp: 100, pickupRadius: V21_SIGNAL_MAGNET_MAX_RADIUS }), []);
console.log("RARE_SHIFT_V2_1C_MAXED_DELTA_ABSENT=PASS");
console.log("RARE_SHIFT_V2_1C_EXHAUSTED_POOL=PASS");

async function screenshot(page, width, name) {
  await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-1-${name}-${width}.png`) });
}

function datasetBoolean(value) {
  assert.ok(value === "true" || value === "false", `expected boolean dataset, received ${String(value)}`);
  return value === "true";
}

function draftIds(value) {
  return String(value ?? "").split(",").filter(Boolean);
}

async function combatSnapshot(data) {
  return {
    hp: Number(await data("hp")),
    level: Number(await data("level")),
    xp: Number(await data("xp")),
    kills: Number(await data("kills")),
    shifts: Number(await data("shifts")),
    deltaRank: Number(await data("delta-rank")),
    pickupRadius: Number(await data("pickup-radius")),
    activeEnemies: Number(await data("active-enemies")),
    phase: await data("phase"),
    draftOpen: datasetBoolean(await data("draft-open")),
    qualified: datasetBoolean(await data("qualified")),
    dead: datasetBoolean(await data("dead")),
  };
}

function draftCenters(count) {
  if (count === 1) return [480];
  if (count === 2) return [350, 610];
  if (count === 3) return [220, 480, 740];
  throw new Error(`unexpected draft count ${count}`);
}

async function clickDraftChoice(canvas, index, count) {
  const box = await canvas.boundingBox();
  assert.ok(box, "draft canvas must have a bounding box");
  const centers = draftCenters(count);
  assert.ok(index >= 0 && index < centers.length, `draft index ${index} must fit ${count} choices`);
  await canvas.click({
    position: {
      x: box.width * centers[index] / 960,
      y: box.height * 320 / 640,
    },
  });
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

    const initialGuide = game.locator('[data-survival-guide="AUTO-FIRE"]');
    await initialGuide.waitFor({ state: "visible" });
    assert.match(await initialGuide.textContent(), /attacks automatically/i);

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
    let pointerDraftSelected = false;
    let pointerDeltaSelected = false;
    const deadline = Date.now() + 58_000;

    while (Date.now() < deadline) {
      const before = await combatSnapshot(data);
      if (before.dead) throw new Error(`V2-1 browser route died before qualification: ${JSON.stringify(before)}`);

      if (before.draftOpen) {
        const count = Number(await data("draft-count"));
        const ids = draftIds(await data("draft-ids"));
        assert.ok(count >= 1 && count <= 3, `draft must expose 1-3 actionable cards, received ${count}`);
        assert.equal(ids.length, count, "data-draft-ids must match rendered draft count");
        assert.equal(new Set(ids).size, ids.length, "rendered draft IDs must be distinct");
        assert.equal(await data("controls-dimmed"), "true");
        if (before.deltaRank >= 5) assert.equal(ids.includes("DELTA_RANK"), false, "Rank-V DELTA must never render");
        if (before.hp >= 100) assert.equal(ids.includes("FIELD_REPAIR"), false, "full-HP FIELD REPAIR must never render");
        if (before.pickupRadius >= V21_SIGNAL_MAGNET_MAX_RADIUS) assert.equal(ids.includes("SIGNAL_MAGNET"), false, "capped SIGNAL MAGNET must never render");

        const guide = game.locator('[data-survival-guide="LEVEL UP"]');
        await guide.waitFor({ state: "visible" });
        assert.match(await guide.textContent(), /click\/tap a card/i);
        await screenshot(page, width, "draft");
        draftCaptured = true;

        const deltaIndex = ids.indexOf("DELTA_RANK");
        const selectedIndex = deltaIndex >= 0 ? deltaIndex : 0;
        const selectedId = ids[selectedIndex];
        const deltaBefore = before.deltaRank;

        // Mandatory pointer path: do not use keyboard 1–3 here. This reproduces the
        // real FriendSDK preview interaction that owner review found broken.
        await clickDraftChoice(canvas, selectedIndex, count);
        await page.waitForTimeout(250);
        assert.equal(await data("draft-open"), "false", "pointer click must close the actionable draft");
        assert.equal(await data("controls-dimmed"), "false");
        pointerDraftSelected = true;
        if (selectedId === "DELTA_RANK") {
          assert.equal(Number(await data("delta-rank")), deltaBefore + 1, "pointer-selected DELTA upgrade must apply exactly one rank");
          pointerDeltaSelected = true;
        }
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
    assert.equal(pointerDraftSelected, true, "actual mouse/touch pointer selection must be proven");
    assert.equal(pointerDeltaSelected, true, "an actionable DELTA rank-up must be selected by pointer before qualification");
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
