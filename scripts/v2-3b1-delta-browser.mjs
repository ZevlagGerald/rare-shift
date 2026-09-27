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
  assert.ok(index >= 0 && index < count, `invalid draft index ${index}/${count}`);
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
    const reduceMotion = game.getByRole("checkbox", { name: /Reduce motion/i });
    if (width === 390) {
      await reduceMotion.check();
      assert.equal(await reduceMotion.isChecked(), true);
    }

    await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
    const canvas = game.locator("canvas");
    await canvas.waitFor({ state: "visible" });
    await canvas.focus();
    const data = name => canvas.getAttribute(`data-${name}`);
    // Long cardinal sweeps traverse the 1800x1200 world so naturally dropped
    // Signal pickups are collected instead of orbiting near spawn.
    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;

    const moveUntilDraft = async (minimumLevel, deadlineMs, label) => {
      const deadline = Date.now() + deadlineMs;
      while (Date.now() < deadline) {
        if (bool(await data("dead"))) throw new Error(`died before ${label}; level=${await data("level")} hp=${await data("hp")} kills=${await data("kills")} delta=${await data("delta-rank")}`);
        if (bool(await data("draft-open")) && Number(await data("level")) >= minimumLevel) return;
        if (!bool(await data("draft-open"))) {
          const key = route[routeIndex++ % route.length];
          const sweepMs = minimumLevel >= 5 ? 1250 : 850;
          await canvas.press(key, { delay: sweepMs });
          await page.waitForTimeout(80);
          if (routeIndex % 3 === 0 && !bool(await data("draft-open"))) {
            await shift(canvas, width);
            await page.waitForTimeout(90);
          }
        }
      }
      throw new Error(`timeout before ${label}; level=${await data("level")} hp=${await data("hp")} kills=${await data("kills")} delta=${await data("delta-rank")}`);
    };

    const choose = async (id, minimumLevel, label) => {
      await moveUntilDraft(minimumLevel, minimumLevel >= 5 ? 120_000 : 80_000, label);
      const ids = list(await data("draft-ids"));
      const index = ids.indexOf(id);
      assert.ok(index >= 0, `${id} must be offered at ${label}: ${ids.join(",")}`);
      await clickDraft(canvas, index, ids.length);
      await page.waitForTimeout(220);
      assert.equal(await data("draft-open"), "false", `${label} must resume combat`);
    };

    const investDelta = async (targetRank, label) => {
      let nextLevel = Number(await data("level")) + 1;
      let repairUsed = false;
      while (Number(await data("delta-rank")) < targetRank) {
        await moveUntilDraft(nextLevel, 135_000, label);
        const ids = list(await data("draft-ids"));
        const hp = Number(await data("hp"));
        const repairIndex = ids.indexOf("FIELD_REPAIR");
        const deltaIndex = ids.indexOf("DELTA_RANK");

        // At most one real repair may be taken between consecutive DELTA ranks.
        if (!repairUsed && hp <= 50 && repairIndex >= 0) {
          await clickDraft(canvas, repairIndex, ids.length);
          repairUsed = true;
          await page.waitForTimeout(220);
          assert.ok(Number(await data("hp")) > hp, `${label} repair must actually restore HP`);
          nextLevel = Number(await data("level")) + 1;
          continue;
        }

        assert.ok(deltaIndex >= 0, `${label} DELTA_RANK missing: ${ids.join(",")}`);
        await clickDraft(canvas, deltaIndex, ids.length);
        await page.waitForTimeout(220);
        assert.equal(await data("draft-open"), "false");
      }
      assert.equal(Number(await data("delta-rank")), targetRank);
    };

    assert.equal(await data("delta-rank"), "1");
    assert.equal(await data("delta-cooldown-ms"), "860");
    assert.equal(await data("delta-world-scale"), "8");
    assert.equal(await data("delta-damage"), "12");

    await choose("ORBIT_NODES", 2, "Level 2 ORBIT support acquisition");
    assert.equal(await data("orbit-owned"), "true");
    await choose("VECTOR_NEEDLE", 3, "Level 3 VECTOR support acquisition");
    assert.equal(await data("vector-owned"), "true");
    await choose("SIGNAL_ARC", 4, "Level 4 SIGNAL support acquisition");
    assert.equal(await data("signal-owned"), "true");
    assert.equal(await data("weapon-slots-used"), "4");

    await investDelta(2, "DELTA Rank II");
    assert.equal(await data("delta-cooldown-ms"), "720");
    assert.equal(await data("delta-world-scale"), "8");
    assert.equal(await data("delta-damage"), "12");

    await investDelta(3, "DELTA Rank III");
    assert.equal(await data("delta-cooldown-ms"), "720");
    assert.equal(await data("delta-world-scale"), "9.5");
    assert.equal(await data("delta-damage"), "12");
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b1-delta-rank3-${width}.png`) });

    await investDelta(4, "DELTA Rank IV");
    assert.equal(await data("delta-stagger-ms"), "0");

    const scheduledBefore = Number(await data("delta-echo-scheduled"));
    const firedBefore = Number(await data("delta-echo-fired"));
    await shift(canvas, width);
    await page.waitForTimeout(260);
    assert.equal(Number(await data("delta-echo-scheduled")), scheduledBefore + 1, "Rank IV accepted SHIFT must schedule exactly one PHASE ECHO");
    assert.equal(Number(await data("delta-echo-fired")), firedBefore + 1, "Rank IV PHASE ECHO must fire after its 140ms delay");
    assert.equal(await data("delta-echo-pending"), "false");

    const scheduledAfterFirst = Number(await data("delta-echo-scheduled"));
    await shift(canvas, width);
    await page.waitForTimeout(220);
    assert.equal(Number(await data("delta-echo-scheduled")), scheduledAfterFirst, "SHIFT inside 650ms rider rearm must not create another echo");

    await canvas.press("ArrowRight", { delay: 700 });
    await page.waitForTimeout(120);
    if (!bool(await data("draft-open")) && !bool(await data("dead"))) {
      const beforeRearmed = Number(await data("delta-echo-scheduled"));
      await shift(canvas, width);
      await page.waitForTimeout(240);
      assert.equal(Number(await data("delta-echo-scheduled")), beforeRearmed + 1, "rearmed Rank IV SHIFT must schedule another bounded echo");
    }

    await investDelta(5, "DELTA Rank V");
    assert.equal(await data("delta-cooldown-ms"), "720");
    assert.equal(await data("delta-world-scale"), "9.5");
    assert.equal(await data("delta-damage"), "14");
    assert.equal(await data("delta-stagger-ms"), "90");

    const pulsesBefore = Number(await data("delta-primary-pulses"));
    const rankVDeadline = Date.now() + 20_000;
    while (Date.now() < rankVDeadline && !bool(await data("dead"))) {
      if (Number(await data("delta-primary-pulses")) > pulsesBefore && Number(await data("delta-staggers")) > 0) break;
      if (!bool(await data("draft-open"))) {
        await canvas.press(route[routeIndex++ % route.length], { delay: 900 });
        await page.waitForTimeout(80);
      } else {
        const ids = list(await data("draft-ids"));
        const repairIndex = ids.indexOf("FIELD_REPAIR");
        const choiceIndex = Number(await data("hp")) <= 50 && repairIndex >= 0 ? repairIndex : 0;
        await clickDraft(canvas, choiceIndex, ids.length);
        await page.waitForTimeout(180);
      }
    }
    assert.ok(Number(await data("delta-primary-pulses")) > pulsesBefore, "Rank V must emit a real primary DELTA pulse");
    assert.ok(Number(await data("delta-staggers")) > 0, "Rank V matching-phase primary DELTA must produce bounded normal-enemy stagger during natural combat");
    assert.equal(bool(await data("dead")), false, "player must remain alive through V2-3B1 proof");

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b1-delta-rank5-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B1_DELTA_${width}=PASS`);
    if (width === 390) console.log("RARE_SHIFT_V2_3B1_DELTA_REDUCED_MOTION=PASS");
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 600_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b1-host-${width}.png`),
    check: qualify(width),
  });
}
