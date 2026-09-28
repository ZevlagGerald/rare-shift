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

function ids(value) {
  return String(value ?? "").split(",").filter(Boolean);
}

function centers(count) {
  if (count === 1) return [480];
  if (count === 2) return [350, 610];
  if (count === 3) return [220, 480, 740];
  throw new Error(`unexpected draft count ${count}`);
}

async function clickDraft(canvas, index, count) {
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
    await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
    const canvas = game.locator("canvas");
    await canvas.waitFor({ state: "visible" });
    await canvas.focus();
    const data = name => canvas.getAttribute(`data-${name}`);

    assert.equal(await data("stage"), "v2-survival");
    assert.equal(await data("echo-owned"), "false");
    assert.equal(await data("echo-profile"), "rank1-phase-memory");
    assert.equal(await data("delta-fx"), "canonical-exclusive");

    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;

    // Preserve the already-qualified level-2 discovery surface.
    const firstDraftDeadline = Date.now() + 58_000;
    while (Date.now() < firstDraftDeadline && !bool(await data("draft-open"))) {
      if (bool(await data("dead"))) throw new Error("died before level-2 discovery draft");
      await canvas.press(route[routeIndex++ % route.length], { delay: 430 });
      await page.waitForTimeout(1050);
      if (routeIndex % 4 === 0 && !bool(await data("draft-open"))) {
        await shift(canvas, width);
        await page.waitForTimeout(110);
      }
    }

    assert.equal(await data("draft-open"), "true", "expected real level-2 draft");
    assert.equal(Number(await data("level")), 2);
    const firstCount = Number(await data("draft-count"));
    const firstIds = ids(await data("draft-ids"));
    assert.equal(firstCount, 3);
    assert.deepEqual(new Set(firstIds), new Set(["ORBIT_NODES", "VECTOR_NEEDLE", "DELTA_RANK"]));
    assert.equal(firstIds.includes("ECHO_MINE"), false, "ECHO must not displace level-2 onboarding");

    const orbitIndex = firstIds.indexOf("ORBIT_NODES");
    assert.ok(orbitIndex >= 0);
    await clickDraft(canvas, orbitIndex, firstCount);
    await page.waitForTimeout(220);
    assert.equal(await data("orbit-owned"), "true");
    assert.equal(await data("weapon-slots-used"), "2");

    // Earn the next level naturally. ECHO must enter the real level-3 draft.
    const echoDraftDeadline = Date.now() + 62_000;
    while (Date.now() < echoDraftDeadline && !(bool(await data("draft-open")) && Number(await data("level")) >= 3)) {
      if (bool(await data("dead"))) throw new Error("died before ECHO discovery draft");
      if (!bool(await data("draft-open"))) {
        await canvas.press(route[routeIndex++ % route.length], { delay: 380 });
        await page.waitForTimeout(850);
        if (routeIndex % 5 === 0 && !bool(await data("draft-open"))) {
          await shift(canvas, width);
          await page.waitForTimeout(100);
        }
      }
    }

    assert.equal(await data("draft-open"), "true", "expected a real level-3+ ECHO draft");
    assert.ok(Number(await data("level")) >= 3);
    const echoCount = Number(await data("draft-count"));
    const echoIds = ids(await data("draft-ids"));
    assert.equal(echoCount, 3, "ECHO discovery must still present exactly three actionable choices");
    assert.equal(new Set(echoIds).size, 3);
    const echoIndex = echoIds.indexOf("ECHO_MINE");
    assert.ok(echoIndex >= 0, `ECHO discovery guarantee missing: ${echoIds.join(",")}`);

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-2c-echo-draft-${width}.png`) });
    await clickDraft(canvas, echoIndex, echoCount);
    await page.waitForTimeout(250);
    assert.equal(await data("draft-open"), "false");
    assert.equal(await data("echo-owned"), "true");
    assert.equal(await data("weapon-slots-used"), "3");
    assert.equal(await data("controls-dimmed"), "false");

    // Move without SHIFT so the first mine remains DORMANT_HOME.
    const mineDeadline = Date.now() + 9_000;
    while (Date.now() < mineDeadline && Number(await data("echo-active-mines")) < 1) {
      if (bool(await data("dead"))) throw new Error("died before first ECHO placement");
      await canvas.press(route[routeIndex++ % route.length], { delay: 260 });
      await page.waitForTimeout(350);
    }
    assert.ok(Number(await data("echo-active-mines")) >= 1, "ECHO must place a real mine while moving");
    assert.ok(Number(await data("echo-active-mines")) <= 3, "ECHO active mine cap must remain <= 3");
    assert.ok(Number(await data("echo-placements")) >= 1);
    assert.match(String(await data("echo-mine-states")), /DORMANT_HOME/u);

    const armedBefore = Number(await data("echo-armed-transitions"));
    const returnsBefore = Number(await data("echo-returns"));
    const triggersBefore = Number(await data("echo-triggers"));
    const phaseBefore = await data("phase");

    await shift(canvas, width);
    await page.waitForTimeout(90);
    assert.notEqual(await data("phase"), phaseBefore);
    assert.ok(Number(await data("echo-armed-transitions")) > armedBefore, "leaving recorded phase must arm a mine");
    assert.equal(Number(await data("echo-triggers")), triggersBefore, "SHIFT-away itself must not detonate ECHO");
    assert.match(String(await data("echo-mine-states")), /ARMED_AWAY/u);

    await page.waitForTimeout(320);
    assert.equal(Number(await data("echo-triggers")), triggersBefore, "mine cannot trigger while player remains away");

    await shift(canvas, width);
    await page.waitForTimeout(100);
    assert.equal(await data("phase"), phaseBefore);
    assert.ok(Number(await data("echo-returns")) > returnsBefore, "returning to recorded phase must register memory return");
    assert.equal(Number(await data("echo-triggers")), triggersBefore, "return must respect the 250ms activation delay");
    // RETURN_READY is intentionally transient: under real corporeal pressure a mine
    // can become ready and be consumed before the next DOM snapshot. The monotonic
    // echo-returns counter is the stable event evidence; the delayed trigger/hit
    // assertions below still prove that return authority leads to real damage.

    const triggerDeadline = Date.now() + 14_000;
    while (Date.now() < triggerDeadline && Number(await data("echo-triggers")) <= triggersBefore) {
      if (bool(await data("dead"))) throw new Error("died before a returned ECHO mine triggered");
      await canvas.press(route[routeIndex++ % route.length], { delay: 180 });
      await page.waitForTimeout(320);
      assert.ok(Number(await data("echo-active-mines")) <= 3, "runtime must never exceed the three-mine cap");
    }

    assert.ok(Number(await data("echo-triggers")) > triggersBefore, "a returned mine must trigger against real corporeal pressure");
    assert.ok(Number(await data("echo-hits")) >= 1, "ECHO detonation must hit at least one corporeal enemy");
    assert.equal(await data("dead"), "false");
    assert.equal(await data("delta-fx"), "canonical-exclusive");

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-2c-echo-qualified-${width}.png`) });
    console.log(`RARE_SHIFT_V2_2C_ECHO_${width}=PASS`);
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 145_000,
    screenshot: resolve(`artifacts/rare-shift-v2-2c-host-${width}.png`),
    check: qualify(width),
  });
}
