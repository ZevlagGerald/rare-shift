import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";

const gameDirectory = resolve("games/rare-shift");
await mkdir(resolve("artifacts"), { recursive: true });

async function waitForAttribute(locator, name, predicate, timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs;
  let value = await locator.getAttribute(name);
  while (Date.now() < deadline && !predicate(value)) {
    await new Promise(resolveWait => setTimeout(resolveWait, 35));
    value = await locator.getAttribute(name);
  }
  if (!predicate(value)) throw new Error(`CR-3D timed out waiting for ${name}; last=${String(value)}`);
  return value;
}

async function prepareBossFixture(canvas) {
  return canvas.evaluate(element => {
    const games = window.__RARE_SHIFT_CR3D_PHASER__?.GAMES;
    const activeGame = games?.find(candidate => candidate?.canvas === element);
    const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
    if (!scene) throw new Error("CR-3D survival scene is unavailable.");

    scene.scene.pause();
    for (const enemy of scene.enemies) {
      enemy.active = false;
      enemy.view?.setVisible(false);
      enemy.telegraphView?.clear().setVisible(false);
      enemy.healthView?.clear().setVisible(false);
    }
    for (const pickup of scene.pickups) {
      pickup.active = false;
      pickup.view?.setVisible(false);
    }
    scene.spawnAccumulator = 0;
    scene.attackAccumulator = 0;
    scene.lastContactAt = -99_999;
    scene.elapsedActiveMs = 359_999;
    scene.update(0, 1);
    scene.syncTestState();
    return {
      elapsed: scene.elapsedActiveMs,
      stage: scene.directorStage,
      bossPending: scene.bossPending,
      frameA: Number(element.dataset.frameA),
      frameB: Number(element.dataset.frameB),
    };
  });
}

async function defeatBoss(canvas) {
  await canvas.evaluate(element => {
    const games = window.__RARE_SHIFT_CR3D_PHASER__?.GAMES;
    const activeGame = games?.find(candidate => candidate?.canvas === element);
    const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
    if (!scene) throw new Error("CR-3D survival scene is unavailable.");

    const placeForDelta = () => {
      const vulnerability = element.dataset.cr3BossVulnerability;
      if (vulnerability !== "A" && vulnerability !== "B") throw new Error("CR-3D boss vulnerability is unavailable.");
      scene.phase = vulnerability;
      scene.paintFriend();
      const profile = scene.deltaCombatProfile();
      const point = profile.points[0];
      scene.friend.setPosition(
        Number(element.dataset.cr3BossX) - point.x * profile.worldScale,
        Number(element.dataset.cr3BossY) - point.y * profile.worldScale,
      );
      scene.fireDelta(profile);
    };

    let safety = 0;
    while ((element.dataset.cr3BossPhase === "ALIGNMENT" || element.dataset.cr3BossPhase === "CROSS_SPLIT") && safety < 160) {
      placeForDelta();
      safety += 1;
    }
    if (element.dataset.cr3BossPhase !== "BREAK_WINDOW") throw new Error(`CR-3D expected BREAK_WINDOW, got ${element.dataset.cr3BossPhase}`);

    const expected = element.dataset.cr3BossExpectedResponse;
    if (expected !== "A" && expected !== "B") throw new Error("CR-3D BREAK response is unavailable.");
    scene.phase = expected === "A" ? "B" : "A";
    scene.paintFriend();
    scene.shift();
    if (element.dataset.cr3BossBreakOpen !== "true") throw new Error("CR-3D could not open BREAK.");

    safety = 0;
    while (element.dataset.cr3BossPhase !== "DEFEATED" && safety < 160) {
      placeForDelta();
      safety += 1;
    }
    if (element.dataset.cr3BossPhase !== "DEFEATED") throw new Error("CR-3D could not defeat THE DESYNC.");
  });
}

async function qualify(width) {
  await testGame(gameDirectory, {
    width,
    height: width === 390 ? 844 : 720,
    timeout: 180_000,
    check: async ({ page, game }) => {
      await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
      await game.locator("body").evaluate(() => { window.__RARE_SHIFT_CR3D_RUNTIME__ = true; });

      if (width === 390) {
        const reduced = game.getByRole("checkbox", { name: /Reduce motion/i });
        await reduced.check();
        assert.equal(await reduced.isChecked(), true);
      }

      const scan = game.locator('[data-stage="scan"]');
      const startingFrameA = Number(await scan.getAttribute("data-frame-a"));
      const startingFrameB = Number(await scan.getAttribute("data-frame-b"));
      await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();

      let canvas = game.locator("canvas");
      await canvas.waitFor({ state: "visible" });
      await waitForAttribute(canvas, "data-cr3d-results-runtime", value => value === "ACTIVE");
      const fixture = await prepareBossFixture(canvas);
      assert.equal(fixture.elapsed, 360_000);
      assert.equal(fixture.stage, "BOSS_PENDING");
      assert.equal(fixture.bossPending, true);
      assert.equal(fixture.frameA, startingFrameA);
      assert.equal(fixture.frameB, startingFrameB);
      await waitForAttribute(canvas, "data-cr3-boss-active", value => value === "true");

      await defeatBoss(canvas);

      const results = game.locator('[data-stage="results"][data-outcome="VICTORY"]');
      await results.waitFor({ state: "visible" });
      assert.equal(Number(await results.getAttribute("data-terminal-pause-events")), 1);
      assert.equal(await results.getAttribute("data-boss-result"), "DEFEATED");
      assert.equal(Number(await results.getAttribute("data-frame-a")), startingFrameA);
      assert.equal(Number(await results.getAttribute("data-frame-b")), startingFrameB);
      assert.match(await results.getAttribute("data-fingerprint"), /^CR3D-[0-9a-f]{8}$/u);
      await game.locator('[data-results-view="reconstruction-a"]').waitFor({ state: "visible" });
      await game.locator('[data-results-view="reconstruction-b"]').waitFor({ state: "visible" });
      assert.equal(await game.locator('[data-change-friend-authority="trusted-host"]').count(), 1);

      const chooseFriend = page.getByRole("button", { name: "Choose Friend" });
      await chooseFriend.waitFor({ state: "visible" });

      if (width === 960) {
        await game.getByRole("button", { name: /RUN AGAIN/i }).click();
        canvas = game.locator("canvas");
        await canvas.waitFor({ state: "visible" });
        await waitForAttribute(canvas, "data-cr3d-results-runtime", value => value === "ACTIVE");
        assert.equal(await canvas.getAttribute("data-dead"), "false");
        assert.equal(Number(await canvas.getAttribute("data-cr3d-damage-taken")), 0);

        await canvas.evaluate(element => {
          const games = window.__RARE_SHIFT_CR3D_PHASER__?.GAMES;
          const activeGame = games?.find(candidate => candidate?.canvas === element);
          const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
          if (!scene) throw new Error("CR-3D retry scene is unavailable.");
          scene.scene.pause();
          scene.lastContactAt = -99_999;
          scene.applyPlayerDamage(999);
          scene.syncTestState();
        });

        const failure = game.locator('[data-stage="results"][data-outcome="DEFEAT"]');
        await failure.waitFor({ state: "visible" });
        assert.equal(Number(await failure.getAttribute("data-final-hp")), 0);
        assert.equal(Number(await failure.getAttribute("data-damage-taken")), 100);
        assert.equal(Number(await failure.getAttribute("data-terminal-pause-events")), 1);

        await chooseFriend.click();
        await page.getByRole("dialog", { name: "Choose your Friend" }).waitFor({ state: "visible" });
        console.log("RARE_SHIFT_CR3D_RUN_AGAIN_FAILURE_HOST_PICKER_960=PASS");
      }

      console.log(`RARE_SHIFT_CR3D_RESULTS_${width}=PASS`);
    },
  });
}

await qualify(960);
await qualify(390);
console.log("RARE_SHIFT_CR3D_RESULTS_REDUCED_MOTION=PASS");
console.log("RARE_SHIFT_CR3D_RESULTS_BROWSER=PASS");
