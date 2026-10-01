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
    await new Promise(resolveWait => setTimeout(resolveWait, 60));
    value = Number(await data(name));
  }
  return value;
}

function qualify(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    await game.locator("body").evaluate(() => {
      window.__RARE_SHIFT_EV3A_RECONSTRUCTION__ = true;
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
    while (Date.now() < fixtureDeadline && await data("reconstruction-qualification-fixture") !== "RECONSTRUCTION_FIELD") {
      const fixtureError = await data("reconstruction-qualification-error");
      if (fixtureError) throw new Error(`EV-3A fixture initialization failed: ${fixtureError}`);
      await page.waitForTimeout(60);
    }

    assert.equal(await data("reconstruction-qualification-fixture"), "RECONSTRUCTION_FIELD");
    assert.equal(await data("reconstruction-evolved"), "true");
    assert.equal(await data("delta-rank"), "5");
    assert.match(String(await data("protocols")), /COMMON_CORE:1/u);
    assert.equal(await data("reconstruction-damage"), "4");
    assert.equal(await data("reconstruction-delay-ms"), "120");
    assert.equal(await data("reconstruction-rearm-ms"), "720");
    assert.ok(Number(await data("reconstruction-point-count")) > 0, "canonical A-intersection-B silhouette must contain at least one point");
    assert.equal(await data("draft-open"), "false");

    const installedPrimaryPulses = Number(await data("reconstruction-install-primary-pulses"));
    const schedulesAtInstall = Number(await data("reconstruction-schedules"));
    const firesAtInstall = Number(await data("reconstruction-fires"));
    const hitsAtInstall = Number(await data("reconstruction-hits"));
    const initialTargetHp = Number(await data("reconstruction-target-initial-hp"));

    assert.equal(installedPrimaryPulses, 0, "controlled Evolution install must not manufacture a DELTA primary pulse");
    assert.equal(schedulesAtInstall, 0, "controlled Evolution install must not manufacture a RECONSTRUCTION schedule");
    assert.equal(firesAtInstall, 0, "controlled Evolution install must not manufacture a RECONSTRUCTION fire");
    assert.equal(hitsAtInstall, 0, "controlled Evolution install must not manufacture RECONSTRUCTION damage");
    assert.ok(initialTargetHp > 0);

    const primaryPulses = await waitForNumber(data, "delta-primary-pulses", value => value >= 1);
    assert.ok(primaryPulses >= 1, "Rank-V DELTA must naturally reach a primary cooldown before RECONSTRUCTION can follow");

    const schedules = await waitForNumber(data, "reconstruction-schedules", value => value >= 1);
    const fires = await waitForNumber(data, "reconstruction-fires", value => value >= 1);
    const hits = await waitForNumber(data, "reconstruction-hits", value => value >= 1);
    assert.ok(schedules >= 1);
    assert.ok(fires >= 1);
    assert.ok(hits >= 1);

    const scheduledAt = Number(await data("reconstruction-last-schedule-at-ms"));
    const firedAt = Number(await data("reconstruction-last-fire-at-ms"));
    assert.ok(Number.isFinite(scheduledAt));
    assert.ok(Number.isFinite(firedAt));
    assert.ok(firedAt - scheduledAt >= 120, `RECONSTRUCTION must respect the 120ms active-time delay, got ${firedAt - scheduledAt}`);

    const targetHp = Number(await data("reconstruction-target-hp"));
    assert.ok(targetHp < initialTargetHp, "live COMMON target must take real RECONSTRUCTION damage");
    assert.equal(await data("dead"), "false");

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-ev3a-reconstruction-${width}.png`) });
    console.log(`RARE_SHIFT_EV3A_RECONSTRUCTION_${width}=PASS`);
    if (width === 390) console.log("RARE_SHIFT_EV3A_RECONSTRUCTION_REDUCED_MOTION=PASS");
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 45_000,
    screenshot: resolve(`artifacts/rare-shift-ev3a-host-${width}.png`),
    check: qualify(width),
  });
}

console.log("RARE_SHIFT_EV3A_RECONSTRUCTION_BROWSER=PASS");
