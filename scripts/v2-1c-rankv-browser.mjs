import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";
import { V21_SIGNAL_MAGNET_MAX_RADIUS } from "../games/rare-shift/src/draft-core.ts";

const gameDirectory = resolve("games/rare-shift");
await mkdir(resolve("artifacts"), { recursive: true });

function datasetBoolean(value) {
  assert.ok(value === "true" || value === "false", `expected boolean dataset, received ${String(value)}`);
  return value === "true";
}

function draftIds(value) {
  return String(value ?? "").split(",").filter(Boolean);
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

async function snapshot(data) {
  return {
    x: Number(await data("x")),
    y: Number(await data("y")),
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

async function screenshot(page, name) {
  await page.locator(".rf-game-frame").screenshot({
    path: resolve(`artifacts/rare-shift-v2-1c-${name}-960.png`),
  });
}

const POST_RANK_CORNERS = Object.freeze([
  Object.freeze({ x: 1350, y: 850 }),
  Object.freeze({ x: 450, y: 850 }),
  Object.freeze({ x: 450, y: 350 }),
  Object.freeze({ x: 1350, y: 350 }),
]);

function nearestCornerIndex(state) {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < POST_RANK_CORNERS.length; index += 1) {
    const corner = POST_RANK_CORNERS[index];
    const distance = Math.hypot(state.x - corner.x, state.y - corner.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return bestIndex;
}

function directionToward(state, corner) {
  if (Math.abs(state.x - corner.x) > 70) return state.x < corner.x ? "ArrowRight" : "ArrowLeft";
  if (Math.abs(state.y - corner.y) > 70) return state.y < corner.y ? "ArrowDown" : "ArrowUp";
  return null;
}

async function qualifyRankV({ page, game }) {
  const scan = game.locator('[data-stage="scan"]');
  await scan.waitFor({ state: "visible" });
  await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();

  const canvas = game.locator("canvas");
  await canvas.waitFor({ state: "visible" });
  await canvas.focus();
  const data = name => canvas.getAttribute(`data-${name}`);

  assert.equal(await data("stage"), "v2-survival");
  assert.equal(await data("delta-rank"), "1");
  assert.equal(await data("level"), "1");
  assert.equal(await data("dead"), "false");

  // Before Rank V, preserve the already-qualified compact route so the test
  // naturally earns kills and Signal XP. After Rank V, move around a larger
  // bounded rectangle in the actual world so the endurance extension does not
  // repeatedly cross the densest center cluster while waiting for level 6.
  const preRankRoute = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
  let routeIndex = 0;
  let postRankCornerIndex = 0;
  let postRankCornerInitialized = false;
  let deltaSelections = 0;
  let rankVReached = false;
  let postRankVDraftObserved = false;
  const deadline = Date.now() + 180_000;

  while (Date.now() < deadline && !postRankVDraftObserved) {
    const before = await snapshot(data);
    if (before.dead) {
      throw new Error(`Rank-V qualifier died before postfix draft: ${JSON.stringify(before)}`);
    }

    if (before.draftOpen) {
      const count = Number(await data("draft-count"));
      const ids = draftIds(await data("draft-ids"));
      assert.ok(count >= 1 && count <= 3, `draft must expose 1-3 actionable cards, received ${count}`);
      assert.equal(ids.length, count, "data-draft-ids must match rendered draft count");
      assert.equal(new Set(ids).size, ids.length, "rendered draft IDs must be distinct");
      assert.equal(await data("controls-dimmed"), "true");

      if (before.deltaRank < 5) {
        const deltaIndex = ids.indexOf("DELTA_RANK");
        assert.ok(deltaIndex >= 0, `DELTA must remain legal below Rank V: ${JSON.stringify(before)} ids=${ids.join(",")}`);
        await clickDraftChoice(canvas, deltaIndex, count);
        await page.waitForTimeout(200);
        assert.equal(await data("draft-open"), "false", "pointer-selected DELTA draft must close");
        const afterRank = Number(await data("delta-rank"));
        assert.equal(afterRank, before.deltaRank + 1, "DELTA pointer selection must increase exactly one rank");
        deltaSelections += 1;
        console.log(`RARE_SHIFT_V2_1C_DELTA_SELECTION_${deltaSelections}=RANK_${afterRank}`);

        if (afterRank === 5) {
          rankVReached = true;
          const reached = await snapshot(data);
          postRankCornerIndex = nearestCornerIndex(reached);
          postRankCornerInitialized = true;
          await screenshot(page, "rank-v-reached");
          console.log("RARE_SHIFT_V2_1C_NATURAL_RANK_V=PASS");
        }
      } else {
        rankVReached = true;
        assert.equal(ids.includes("DELTA_RANK"), false, `Rank-V DELTA must be absent from rendered postfix draft: ${ids.join(",")}`);
        assert.ok(ids.length >= 1, "bounded V2-1 postfix draft must expose at least one remaining actionable alternative here");
        if (before.hp >= 100) assert.equal(ids.includes("FIELD_REPAIR"), false, "full-HP FIELD REPAIR must be absent");
        if (before.pickupRadius >= V21_SIGNAL_MAGNET_MAX_RADIUS) assert.equal(ids.includes("SIGNAL_MAGNET"), false, "capped SIGNAL MAGNET must be absent");

        console.log(`RARE_SHIFT_V2_1C_POST_RANK_V_DRAFT_IDS=${ids.join(",")}`);
        await screenshot(page, "rank-v-postfix-draft");

        // Four preceding DELTA upgrades already prove the real pointer path.
        // Use the runtime's supported 1-3 keyboard path for the final postfix
        // selection so this assertion exercises the same chooseDraft() handler
        // without scaled-canvas coordinate sensitivity on a reduced card set.
        const selectedId = ids.includes("FIELD_REPAIR") ? "FIELD_REPAIR" : ids[0];
        const selectedIndex = ids.indexOf(selectedId);
        const hpBefore = before.hp;
        const radiusBefore = before.pickupRadius;
        await canvas.focus();
        await canvas.press(String(selectedIndex + 1));
        await page.waitForTimeout(200);
        assert.equal(await data("draft-open"), "false", "postfix keyboard selection must close the draft");
        assert.equal(Number(await data("delta-rank")), 5, "postfix selection must not change maxed DELTA rank");

        if (selectedId === "FIELD_REPAIR") {
          assert.ok(Number(await data("hp")) > hpBefore, "rendered FIELD REPAIR must change HP");
        } else if (selectedId === "SIGNAL_MAGNET") {
          assert.ok(Number(await data("pickup-radius")) > radiusBefore, "rendered SIGNAL MAGNET must change pickup radius");
        } else {
          throw new Error(`unexpected postfix V2-1 choice ${selectedId}`);
        }

        postRankVDraftObserved = true;
        console.log(`RARE_SHIFT_V2_1C_POST_RANK_V_CHOICE=${selectedId}`);
        console.log("RARE_SHIFT_V2_1C_POST_RANK_V_RENDER_FILTER=PASS");
        break;
      }
    }

    if (!rankVReached) {
      await canvas.press(preRankRoute[routeIndex % preRankRoute.length], { delay: 520 });
      routeIndex += 1;
      await page.waitForTimeout(520);
      if (routeIndex % 2 === 0 && !datasetBoolean(await data("draft-open"))) {
        await canvas.press("Space");
        await page.waitForTimeout(80);
      }
    } else {
      if (!postRankCornerInitialized) {
        postRankCornerIndex = nearestCornerIndex(before);
        postRankCornerInitialized = true;
      }
      let corner = POST_RANK_CORNERS[postRankCornerIndex];
      let direction = directionToward(before, corner);
      if (!direction) {
        postRankCornerIndex = (postRankCornerIndex + 1) % POST_RANK_CORNERS.length;
        corner = POST_RANK_CORNERS[postRankCornerIndex];
        direction = directionToward(before, corner);
      }
      assert.ok(direction, "post-Rank-V perimeter route must produce a direction");
      await canvas.press(direction, { delay: 760 });
      routeIndex += 1;
      await page.waitForTimeout(30);
      if (!datasetBoolean(await data("draft-open"))) {
        await canvas.press("Space");
        await page.waitForTimeout(50);
      }
    }

    if (routeIndex % 8 === 0) {
      console.log(`RARE_SHIFT_V2_1C_RANKV_STATE=${JSON.stringify(await snapshot(data))}`);
    }
  }

  const finalState = await snapshot(data);
  console.log(`RARE_SHIFT_V2_1C_RANKV_FINAL=${JSON.stringify(finalState)}`);

  assert.equal(rankVReached, true, `expected naturally reached Rank V; final=${JSON.stringify(finalState)}`);
  assert.equal(deltaSelections, 4, `expected four DELTA pointer upgrades from I to V; got ${deltaSelections}`);
  assert.equal(postRankVDraftObserved, true, `expected a genuine subsequent level-up draft after Rank V; final=${JSON.stringify(finalState)}`);
  assert.equal(finalState.deltaRank, 5);
  assert.equal(finalState.dead, false);
  assert.ok(finalState.level >= 6, `postfix draft should require level >= 6; final=${JSON.stringify(finalState)}`);
  assert.ok(finalState.kills >= 3);
  assert.ok(finalState.shifts >= 1);

  await screenshot(page, "rank-v-postfix-complete");
}

await testGame(gameDirectory, {
  width: 960,
  height: 800,
  timeout: 220_000,
  screenshot: resolve("artifacts/rare-shift-v2-1c-rankv-host-960.png"),
  check: qualifyRankV,
});

console.log("RARE_SHIFT_V2_1C_RANKV_BROWSER_960=PASS");
