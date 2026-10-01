import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";

const gameDirectory = resolve("games/rare-shift");
await mkdir(resolve("artifacts"), { recursive: true });

async function waitForNumber(data, name, predicate, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  let value = Number(await data(name));
  while (Date.now() < deadline && !predicate(value)) {
    await new Promise(resolveWait => setTimeout(resolveWait, 50));
    value = Number(await data(name));
  }
  return value;
}

function numbers(value) {
  return String(value ?? "").split(",").filter(Boolean).map(Number);
}

function haloPositions(value) {
  return String(value ?? "").split("|").filter(Boolean).map(entry => {
    const [x, y] = entry.split(":").map(Number);
    assert.ok(Number.isFinite(x) && Number.isFinite(y), `invalid halo position ${entry}`);
    return { x, y };
  });
}

function circularDistance(a, b) {
  const tau = Math.PI * 2;
  const normalize = value => ((value % tau) + tau) % tau;
  const raw = Math.abs(normalize(a) - normalize(b));
  return Math.min(raw, tau - raw);
}

async function shift(canvas, width) {
  if (width === 390) {
    const box = await canvas.boundingBox();
    assert.ok(box, "mobile SHIFT canvas must have a bounding box");
    await canvas.click({ position: { x: box.width * 842 / 960, y: box.height * 530 / 640 } });
  } else {
    await canvas.press("Space");
  }
}

function qualify(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    await game.locator("body").evaluate(() => {
      window.__RARE_SHIFT_EV3C_SYNC_HALO__ = true;
    });

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

    const fixtureDeadline = Date.now() + 8_000;
    while (Date.now() < fixtureDeadline && await data("sync-qualification-fixture") !== "SYNC_HALO") {
      const fixtureError = await data("sync-qualification-error");
      if (fixtureError) throw new Error(`EV-3C fixture failed: ${fixtureError}`);
      await page.waitForTimeout(50);
    }

    assert.equal(await data("sync-qualification-fixture"), "SYNC_HALO");
    assert.equal(await data("sync-evolved"), "true");
    assert.equal(await data("orbit-owned"), "true");
    assert.equal(await data("orbit-rank"), "5");
    assert.match(String(await data("protocols")), /ORBIT_STABILIZER:1/u);
    assert.equal(await data("sync-halo-sample-count"), "6");
    assert.equal(await data("sync-halo-radius"), "84");
    assert.equal(await data("sync-control-radius"), "112");
    assert.equal(await data("sync-control-rearm-ms"), "650");
    assert.equal(await data("sync-control-target-cap"), "6");
    assert.equal(await data("draft-open"), "false");
    assert.equal(Number(await data("sync-install-control-events")), 0, "controlled Evolution install must not manufacture a SYNC control event");
    assert.equal(Number(await data("sync-control-events")), 0, "SYNC HALO must wait for a genuine accepted SHIFT");

    const normalId = Number(await data("sync-normal-id"));
    const commonId = Number(await data("sync-common-id"));
    const eliteId = Number(await data("sync-elite-id"));
    const bossId = Number(await data("sync-boss-id"));
    const cappedId = Number(await data("sync-capped-id"));
    const ghostId = Number(await data("sync-ghost-id"));
    assert.equal(new Set([normalId, commonId, eliteId, bossId, cappedId, ghostId]).size, 6);

    const initial = {
      normal: Number(await data("sync-normal-initial-x")),
      common: Number(await data("sync-common-initial-x")),
      elite: Number(await data("sync-elite-initial-x")),
      boss: Number(await data("sync-boss-initial-x")),
      capped: Number(await data("sync-capped-initial-x")),
      ghost: Number(await data("sync-ghost-initial-x")),
    };

    await shift(canvas, width);
    const firstEvents = await waitForNumber(data, "sync-control-events", value => value >= 1);
    assert.equal(firstEvents, 1, "first accepted SHIFT must emit exactly one SYNC control event");

    const haloAnchor = Number(await data("sync-halo-anchor"));
    const sceneAnchor = Number(await data("sync-scene-anchor"));
    assert.ok(Number.isFinite(haloAnchor) && Number.isFinite(sceneAnchor));
    assert.ok(Math.abs(haloAnchor - sceneAnchor) < 0.000001, "SYNC HALO must preserve the exact Rank-V ORBIT SHIFT anchor");

    // Exercise the second accepted SHIFT immediately, before the 650ms active-time
    // rearm can expire. This must not produce a second control event.
    await shift(canvas, width);
    await page.waitForTimeout(80);
    assert.equal(Number(await data("sync-control-events")), 1, "SYNC HALO must not bypass its 650ms rearm");
    assert.ok(Number(await data("sync-control-rearm-blocks")) >= 1, "the immediate second SHIFT must be observed as a rearm block");

    const selected = numbers(await data("sync-first-target-ids"));
    const displacements = numbers(await data("sync-first-displacements"));
    assert.equal(selected.length, 6, "SYNC HALO must enforce its six-target hard cap");
    assert.equal(new Set(selected).size, 6, "SYNC HALO first control targets must be unique");
    assert.deepEqual(displacements, [28, 14, 8, 28, 28, 28], "first control must preserve exact NORMAL/COMMON/ELITE resistance values");
    assert.ok(selected.includes(normalId), "normal target must be selected");
    assert.ok(selected.includes(commonId), "COMMON target must be selected");
    assert.ok(selected.includes(eliteId), "elite target must be selected");
    assert.ok(!selected.includes(bossId), "boss-role target must have zero displacement authority");
    assert.ok(!selected.includes(cappedId), "seventh legal target must be excluded by the hard cap");
    assert.ok(!selected.includes(ghostId), "closer phase ghost must remain illegal");

    const current = {
      normal: Number(await data("sync-normal-x")),
      common: Number(await data("sync-common-x")),
      elite: Number(await data("sync-elite-x")),
      boss: Number(await data("sync-boss-x")),
      capped: Number(await data("sync-capped-x")),
      ghost: Number(await data("sync-ghost-x")),
    };
    assert.equal(current.normal - initial.normal, 28, "normal target must move exactly 28px");
    assert.equal(current.common - initial.common, 14, "COMMON target must move exactly 14px");
    assert.equal(current.elite - initial.elite, 8, "elite target must move exactly 8px");
    assert.equal(current.boss - initial.boss, 0, "boss-role target must not move");
    assert.equal(current.capped - initial.capped, 0, "seventh legal target must remain unmoved by cap");
    assert.equal(current.ghost - initial.ghost, 0, "phase ghost must remain unmoved");

    const points = haloPositions(await data("sync-halo-positions"));
    assert.equal(points.length, 6, "live SYNC HALO must expose exactly six samples");
    const centerX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const centerY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    const angles = points.map(point => Math.atan2(point.y - centerY, point.x - centerX));
    for (const point of points) {
      assert.ok(Math.abs(Math.hypot(point.x - centerX, point.y - centerY) - 84) < 0.02, "each live halo sample must remain on the 84px radius");
    }
    for (let index = 0; index < angles.length; index += 1) {
      const next = angles[(index + 1) % angles.length];
      assert.ok(Math.abs(circularDistance(angles[index], next) - Math.PI / 3) < 0.02, "live halo samples must remain equally spaced");
    }

    // Wait beyond the independent active-time rearm, SHIFT back into the original
    // controlled phase, and prove that a second legitimate SYNC event can occur.
    await page.waitForTimeout(760);
    await shift(canvas, width);
    const secondEvents = await waitForNumber(data, "sync-control-events", value => value >= 2);
    assert.equal(secondEvents, 2, "SYNC HALO must rearm after 650 active ms");
    assert.equal(Number(await data("sync-common-x")) - initial.common, 28, "COMMON resistance must remain 14px on the rearmed event");
    assert.equal(await data("dead"), "false");

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-ev3c-sync-halo-${width}.png`) });
    console.log(`RARE_SHIFT_EV3C_SYNC_HALO_${width}=PASS`);
    if (width === 390) console.log("RARE_SHIFT_EV3C_SYNC_HALO_REDUCED_MOTION=PASS");
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 45_000,
    screenshot: resolve(`artifacts/rare-shift-ev3c-host-${width}.png`),
    check: qualify(width),
  });
}

console.log("RARE_SHIFT_EV3C_SYNC_HALO_BROWSER=PASS");
