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
    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;

    const moveUntilDraft = async (minimumLevel, deadlineMs, label) => {
      const deadline = Date.now() + deadlineMs;
      while (Date.now() < deadline) {
        if (bool(await data("dead"))) throw new Error(`died before ${label}`);
        if (bool(await data("draft-open")) && Number(await data("level")) >= minimumLevel) return;
        if (!bool(await data("draft-open"))) {
          await canvas.press(route[routeIndex++ % route.length], { delay: minimumLevel >= 5 ? 260 : 330 });
          await page.waitForTimeout(minimumLevel >= 5 ? 520 : 700);
          if (routeIndex % 7 === 0 && !bool(await data("draft-open"))) {
            await shift(canvas, width);
            await page.waitForTimeout(110);
          }
        }
      }
      throw new Error(`timeout before ${label}; level=${await data("level")} hp=${await data("hp")} kills=${await data("kills")}`);
    };

    const choose = async (id, minimumLevel, label) => {
      await moveUntilDraft(minimumLevel, minimumLevel >= 5 ? 95_000 : 75_000, label);
      const ids = list(await data("draft-ids"));
      const index = ids.indexOf(id);
      assert.ok(index >= 0, `${id} must be offered at ${label}: ${ids.join(",")}`);
      await clickDraft(canvas, index, ids.length);
      await page.waitForTimeout(240);
      assert.equal(await data("draft-open"), "false", `${label} must resume combat`);
    };

    assert.equal(await data("delta-rank"), "1");
    assert.equal(await data("delta-cooldown-ms"), "860");
    assert.equal(await data("delta-world-scale"), "8");
    assert.equal(await data("delta-damage"), "12");

    // Preserve the qualified onboarding surface while making DELTA rank cards
    // naturally available at every subsequent level.
    await choose("ORBIT_NODES", 2, "Level 2 ORBIT support acquisition");
    assert.equal(await data("orbit-owned"), "true");

    await choose("DELTA_RANK", 3, "DELTA Rank II");
    assert.equal(await data("delta-rank"), "2");
    assert.equal(await data("delta-cooldown-ms"), "720");
    assert.equal(await data("delta-world-scale"), "8");
    assert.equal(await data("delta-damage"), "12");

    await choose("ECHO_MINE", 4, "Level 4 ECHO support acquisition");
    assert.equal(await data("echo-owned"), "true");

    await choose("DELTA_RANK", 5, "DELTA Rank III");
    assert.equal(await data("delta-rank"), "3");
    assert.equal(await data("delta-cooldown-ms"), "720");
    assert.equal(await data("delta-world-scale"), "9.5");
    assert.equal(await data("delta-damage"), "12");
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b1-delta-rank3-${width}.png`) });

    await choose("DELTA_RANK", 6, "DELTA Rank IV");
    assert.equal(await data("delta-rank"), "4");
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

    // Let active combat time clear the rider rearm without injecting clock state.
    await canvas.press("ArrowRight", { delay: 420 });
    await page.waitForTimeout(420);
    if (!bool(await data("draft-open")) && !bool(await data("dead"))) {
      const beforeRearmed = Number(await data("delta-echo-scheduled"));
      await shift(canvas, width);
      await page.waitForTimeout(240);
      assert.equal(Number(await data("delta-echo-scheduled")), beforeRearmed + 1, "rearmed Rank IV SHIFT must schedule another bounded echo");
    }

    await choose("DELTA_RANK", 7, "DELTA Rank V");
    assert.equal(await data("delta-rank"), "5");
    assert.equal(await data("delta-cooldown-ms"), "720");
    assert.equal(await data("delta-world-scale"), "9.5");
    assert.equal(await data("delta-damage"), "14");
    assert.equal(await data("delta-stagger-ms"), "90");

    const pulsesBefore = Number(await data("delta-primary-pulses"));
    const rankVDeadline = Date.now() + 18_000;
    while (Date.now() < rankVDeadline && !bool(await data("dead"))) {
      if (Number(await data("delta-primary-pulses")) > pulsesBefore && Number(await data("delta-staggers")) > 0) break;
      if (!bool(await data("draft-open"))) {
        await canvas.press(route[routeIndex++ % route.length], { delay: 240 });
        await page.waitForTimeout(400);
      } else {
        // Higher-level drafts are outside this bounded proof; choose a real card
        // only to keep natural combat running, never by state injection.
        const count = Number(await data("draft-count"));
        assert.ok(count >= 1 && count <= 3);
        await clickDraft(canvas, 0, count);
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
    timeout: 420_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b1-host-${width}.png`),
    check: qualify(width),
  });
}
