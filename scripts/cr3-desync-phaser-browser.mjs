import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";

const gameDirectory = resolve("games/rare-shift");
await mkdir(resolve("artifacts"), { recursive: true });

async function waitFor(data, name, predicate, timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs;
  let value = await data(name);
  while (Date.now() < deadline && !predicate(value)) {
    const error = await data("cr3-runtime-error");
    if (error) throw new Error(`CR-3B runtime failed: ${error}`);
    await new Promise(resolveWait => setTimeout(resolveWait, 50));
    value = await data(name);
  }
  return value;
}

function qualify(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    await game.locator("body").evaluate(() => {
      window.__RARE_SHIFT_CR3B_RUNTIME__ = true;
    });

    const reduced = game.getByRole("checkbox", { name: /Reduce motion/i });
    if (width === 390) {
      await reduced.check();
      assert.equal(await reduced.isChecked(), true);
    }

    await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
    const canvas = game.locator("canvas");
    await canvas.waitFor({ state: "visible" });
    await canvas.focus();
    const data = name => canvas.getAttribute(`data-${name}`);

    await waitFor(data, "cr3-runtime-adapter", value => value === "ACTIVE");
    assert.equal(await data("cr3-runtime-adapter"), "ACTIVE");
    assert.equal(await data("cr3-boss-active"), "false");

    const preBoundary = await canvas.evaluate(element => {
      const games = window.__RARE_SHIFT_CR3B_PHASER__?.GAMES;
      if (!Array.isArray(games)) throw new Error("CR-3B Phaser capture is unavailable.");
      const activeGame = games.find(candidate => candidate?.canvas === element);
      const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
      if (!scene) throw new Error("CR-3B survival scene is unavailable.");
      if (typeof scene.fireDelta !== "function" || typeof scene.shift !== "function" || typeof scene.syncTestState !== "function") {
        throw new Error("CR-3B live runtime hooks are unavailable.");
      }

      // Freeze only Phaser's automatic scene scheduling for this controlled fixture.
      // Direct calls below still execute the real qualified scene.update() method, so
      // the exact 360000ms CR-1 transition can be observed without wall-clock drift.
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
      scene.elapsedActiveMs = 359_998;
      scene.syncTestState();
      scene.update(0, 1);
      scene.syncTestState();
      return {
        elapsed: scene.elapsedActiveMs,
        stage: scene.directorStage,
        bossPending: scene.bossPending,
      };
    });

    assert.equal(preBoundary.elapsed, 359_999);
    assert.notEqual(preBoundary.stage, "BOSS_PENDING");
    assert.equal(preBoundary.bossPending, false);
    assert.equal(await data("cr3-boss-active"), "false", "boss must not materialize before the exact CR-1 boundary");

    const boundary = await canvas.evaluate(element => {
      const games = window.__RARE_SHIFT_CR3B_PHASER__?.GAMES;
      const activeGame = games?.find(candidate => candidate?.canvas === element);
      const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
      if (!scene) throw new Error("CR-3B lost the survival scene at the boundary.");
      scene.update(0, 1);
      scene.syncTestState();
      return {
        elapsed: scene.elapsedActiveMs,
        stage: scene.directorStage,
        bossPending: scene.bossPending,
      };
    });

    assert.equal(boundary.elapsed, 360_000);
    assert.equal(boundary.stage, "BOSS_PENDING");
    assert.equal(boundary.bossPending, true);
    await waitFor(data, "cr3-boss-active", value => value === "true");
    assert.equal(await data("cr3-boss-phase"), "ALIGNMENT");
    assert.equal(await data("cr3-boss-hp"), await data("cr3-boss-max-hp"));

    const wrongPhase = await canvas.evaluate(element => {
      const games = window.__RARE_SHIFT_CR3B_PHASER__?.GAMES;
      const activeGame = games?.find(candidate => candidate?.canvas === element);
      const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
      if (!scene) throw new Error("CR-3B scene unavailable for wrong-phase proof.");
      const vulnerability = element.dataset.cr3BossVulnerability;
      if (vulnerability !== "A" && vulnerability !== "B") throw new Error("CR-3B vulnerability is unavailable.");
      const attackPhase = vulnerability === "A" ? "B" : "A";
      scene.phase = attackPhase;
      scene.paintFriend();
      scene.updateHud();
      const profile = scene.deltaCombatProfile();
      const point = profile.points[0];
      const bossX = Number(element.dataset.cr3BossX);
      const bossY = Number(element.dataset.cr3BossY);
      scene.friend.setPosition(bossX - point.x * profile.worldScale, bossY - point.y * profile.worldScale);
      const hpBefore = Number(element.dataset.cr3BossHp);
      scene.fireDelta(profile);
      scene.syncTestState();
      return {
        hpBefore,
        hpAfter: Number(element.dataset.cr3BossHp),
        rejection: element.dataset.cr3BossLastDamageRejection,
      };
    });

    assert.equal(wrongPhase.hpAfter, wrongPhase.hpBefore);
    assert.equal(wrongPhase.rejection, "WRONG_PHASE");

    const matchingPhase = await canvas.evaluate(element => {
      const games = window.__RARE_SHIFT_CR3B_PHASER__?.GAMES;
      const activeGame = games?.find(candidate => candidate?.canvas === element);
      const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
      if (!scene) throw new Error("CR-3B scene unavailable for matching-phase proof.");
      const vulnerability = element.dataset.cr3BossVulnerability;
      scene.phase = vulnerability;
      scene.paintFriend();
      scene.updateHud();
      const profile = scene.deltaCombatProfile();
      const point = profile.points[0];
      const bossX = Number(element.dataset.cr3BossX);
      const bossY = Number(element.dataset.cr3BossY);
      scene.friend.setPosition(bossX - point.x * profile.worldScale, bossY - point.y * profile.worldScale);
      const hpBefore = Number(element.dataset.cr3BossHp);
      scene.fireDelta(profile);
      scene.syncTestState();
      return {
        hpBefore,
        hpAfter: Number(element.dataset.cr3BossHp),
        expectedDamage: profile.damage,
        rejection: element.dataset.cr3BossLastDamageRejection,
      };
    });

    assert.equal(matchingPhase.hpBefore - matchingPhase.hpAfter, matchingPhase.expectedDamage);
    assert.equal(matchingPhase.rejection, "NONE");

    const phaseDrive = await canvas.evaluate(element => {
      const games = window.__RARE_SHIFT_CR3B_PHASER__?.GAMES;
      const activeGame = games?.find(candidate => candidate?.canvas === element);
      const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
      if (!scene) throw new Error("CR-3B scene unavailable for phase-drive proof.");
      const seen = new Set([element.dataset.cr3BossPhase]);
      let safety = 0;
      while (element.dataset.cr3BossPhase !== "BREAK_WINDOW" && safety < 120) {
        const vulnerability = element.dataset.cr3BossVulnerability;
        scene.phase = vulnerability;
        scene.paintFriend();
        const profile = scene.deltaCombatProfile();
        const point = profile.points[0];
        const bossX = Number(element.dataset.cr3BossX);
        const bossY = Number(element.dataset.cr3BossY);
        scene.friend.setPosition(bossX - point.x * profile.worldScale, bossY - point.y * profile.worldScale);
        scene.fireDelta(profile);
        seen.add(element.dataset.cr3BossPhase);
        safety += 1;
      }
      scene.syncTestState();
      return {
        phase: element.dataset.cr3BossPhase,
        seen: [...seen],
        safety,
        hp: Number(element.dataset.cr3BossHp),
      };
    });

    assert.equal(phaseDrive.phase, "BREAK_WINDOW");
    assert.ok(phaseDrive.seen.includes("CROSS_SPLIT"), "live adapter must cross through CROSS_SPLIT before BREAK_WINDOW");
    assert.ok(phaseDrive.safety < 120);

    const closedBreak = await canvas.evaluate(element => {
      const games = window.__RARE_SHIFT_CR3B_PHASER__?.GAMES;
      const activeGame = games?.find(candidate => candidate?.canvas === element);
      const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
      if (!scene) throw new Error("CR-3B scene unavailable for closed-BREAK proof.");
      const vulnerability = element.dataset.cr3BossVulnerability;
      scene.phase = vulnerability;
      scene.paintFriend();
      const profile = scene.deltaCombatProfile();
      const point = profile.points[0];
      const bossX = Number(element.dataset.cr3BossX);
      const bossY = Number(element.dataset.cr3BossY);
      scene.friend.setPosition(bossX - point.x * profile.worldScale, bossY - point.y * profile.worldScale);
      const hpBefore = Number(element.dataset.cr3BossHp);
      scene.fireDelta(profile);
      return {
        hpBefore,
        hpAfter: Number(element.dataset.cr3BossHp),
        rejection: element.dataset.cr3BossLastDamageRejection,
        expectedResponse: element.dataset.cr3BossExpectedResponse,
      };
    });

    assert.equal(closedBreak.hpAfter, closedBreak.hpBefore);
    assert.equal(closedBreak.rejection, "BREAK_CLOSED");
    assert.ok(closedBreak.expectedResponse === "A" || closedBreak.expectedResponse === "B");

    const opened = await canvas.evaluate(element => {
      const games = window.__RARE_SHIFT_CR3B_PHASER__?.GAMES;
      const activeGame = games?.find(candidate => candidate?.canvas === element);
      const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
      if (!scene) throw new Error("CR-3B scene unavailable for SHIFT/BREAK proof.");
      const expected = element.dataset.cr3BossExpectedResponse;
      scene.phase = expected === "A" ? "B" : "A";
      scene.paintFriend();
      scene.updateHud();
      const shiftsBefore = scene.shifts;
      scene.shift();
      scene.syncTestState();
      return {
        expected,
        actualPhase: scene.phase,
        shiftsBefore,
        shiftsAfter: scene.shifts,
        breakOpen: element.dataset.cr3BossBreakOpen,
        accepted: Number(element.dataset.cr3BossShiftAccepted),
      };
    });

    assert.equal(opened.actualPhase, opened.expected);
    assert.equal(opened.shiftsAfter, opened.shiftsBefore + 1);
    assert.equal(opened.breakOpen, "true");
    assert.ok(opened.accepted >= 1);

    const defeat = await canvas.evaluate(element => {
      const games = window.__RARE_SHIFT_CR3B_PHASER__?.GAMES;
      const activeGame = games?.find(candidate => candidate?.canvas === element);
      const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
      if (!scene) throw new Error("CR-3B scene unavailable for defeat proof.");
      let safety = 0;
      while (element.dataset.cr3BossPhase !== "DEFEATED" && safety < 120) {
        const vulnerability = element.dataset.cr3BossVulnerability;
        scene.phase = vulnerability;
        scene.paintFriend();
        const profile = scene.deltaCombatProfile();
        const point = profile.points[0];
        const bossX = Number(element.dataset.cr3BossX);
        const bossY = Number(element.dataset.cr3BossY);
        scene.friend.setPosition(bossX - point.x * profile.worldScale, bossY - point.y * profile.worldScale);
        scene.fireDelta(profile);
        safety += 1;
      }
      const defeatEvents = Number(element.dataset.cr3BossDefeatEvents);
      const hp = Number(element.dataset.cr3BossHp);
      const profile = scene.deltaCombatProfile();
      scene.fireDelta(profile);
      return {
        phase: element.dataset.cr3BossPhase,
        hp,
        defeatEvents,
        defeatEventsAfterExtra: Number(element.dataset.cr3BossDefeatEvents),
        hpAfterExtra: Number(element.dataset.cr3BossHp),
        safety,
      };
    });

    assert.equal(defeat.phase, "DEFEATED");
    assert.equal(defeat.hp, 0);
    assert.equal(defeat.defeatEvents, 1);
    assert.equal(defeat.defeatEventsAfterExtra, 1);
    assert.equal(defeat.hpAfterExtra, 0);
    assert.ok(defeat.safety < 120);
    assert.equal(await data("dead"), "false", "CR-3B does not own victory/results state yet");
    if (width === 390) assert.equal(await reduced.isChecked(), true);

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-cr3b-desync-${width}.png`) });
    console.log(`RARE_SHIFT_CR3B_DESYNC_${width}=PASS`);
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 90_000,
    screenshot: resolve(`artifacts/rare-shift-cr3b-host-${width}.png`),
    check: qualify(width),
  });
}

console.log("RARE_SHIFT_CR3B_DESYNC_REDUCED_MOTION=PASS");
console.log("RARE_SHIFT_CR3B_DESYNC_BROWSER=PASS");
