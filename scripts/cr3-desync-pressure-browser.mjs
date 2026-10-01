import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";
import { cr3PressureLaneCenter, planCR3Pressure } from "../games/rare-shift/src/cr3-pressure-core.ts";

const gameDirectory = resolve("games/rare-shift");
await mkdir(resolve("artifacts"), { recursive: true });

async function waitFor(data, name, predicate, timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs;
  let value = await data(name);
  while (Date.now() < deadline && !predicate(value)) {
    const error = await data("cr3-runtime-error");
    if (error) throw new Error(`CR-3C runtime failed: ${error}`);
    await new Promise(resolveWait => setTimeout(resolveWait, 40));
    value = await data(name);
  }
  return value;
}

function pressurePoint(plan, bossX, bossY) {
  if (plan.geometry === "RADIAL") {
    assert.notEqual(plan.radialRadius, null);
    return { x: bossX + plan.radialRadius, y: bossY };
  }
  if (plan.geometry === "LANE") return cr3PressureLaneCenter(plan, bossX, bossY);
  throw new Error(`pressure point requested for ${plan.geometry}`);
}

async function sceneEvaluate(canvas, fn, arg) {
  return canvas.evaluate((element, payload) => {
    const games = window.__RARE_SHIFT_CR3B_PHASER__?.GAMES;
    if (!Array.isArray(games)) throw new Error("CR-3C Phaser capture is unavailable.");
    const activeGame = games.find(candidate => candidate?.canvas === element);
    const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
    if (!scene) throw new Error("CR-3C survival scene is unavailable.");
    return payload.fn(scene, element, payload.arg);
  }, { fn, arg });
}

function qualify(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    await game.locator("body").evaluate(() => { window.__RARE_SHIFT_CR3B_RUNTIME__ = true; });

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

    const fixture = await canvas.evaluate(element => {
      const games = window.__RARE_SHIFT_CR3B_PHASER__?.GAMES;
      const activeGame = games?.find(candidate => candidate?.canvas === element);
      const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
      if (!scene) throw new Error("CR-3C survival scene is unavailable.");
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
      return { sceneSeed: scene.seed, elapsed: scene.elapsedActiveMs, stage: scene.directorStage, bossPending: scene.bossPending };
    });

    assert.equal(fixture.elapsed, 360_000);
    assert.equal(fixture.stage, "BOSS_PENDING");
    assert.equal(fixture.bossPending, true);
    await waitFor(data, "cr3-boss-active", value => value === "true");
    await waitFor(data, "cr3-pressure-telegraph-visible", value => value === "true");

    const bossSeed = (fixture.sceneSeed ^ 0x43523342) >>> 0;
    const bossX = Number(await data("cr3-boss-x"));
    const bossY = Number(await data("cr3-boss-y"));
    const firstOrdinal = Number(await data("cr3-pressure-ordinal"));
    const firstAttack = await data("cr3-pressure-attack");
    assert.ok(firstAttack === "COMMON_RADIAL" || firstAttack === "COMMON_LANE");
    const firstPlan = planCR3Pressure(bossSeed, firstOrdinal, firstAttack);
    assert.ok(firstPlan.geometry === "RADIAL" || firstPlan.geometry === "LANE");
    const firstPoint = pressurePoint(firstPlan, bossX, bossY);

    const hpBeforeFirstPressure = Number(await data("hp"));
    const resolveBefore = Number(await data("cr3-pressure-resolve-events"));
    const firstResolveAt = Number(await data("cr3-pressure-resolve-at"));
    await canvas.evaluate((element, point) => {
      const games = window.__RARE_SHIFT_CR3B_PHASER__?.GAMES;
      const activeGame = games?.find(candidate => candidate?.canvas === element);
      const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
      scene.friend.setPosition(point.x, point.y);
      scene.lastContactAt = -99_999;
      scene.elapsedActiveMs = point.resolveAt;
      scene.syncTestState();
    }, { ...firstPoint, resolveAt: firstResolveAt });
    await waitFor(data, "cr3-pressure-resolve-events", value => Number(value) === resolveBefore + 1);
    assert.equal(Number(await data("hp")), hpBeforeFirstPressure - firstPlan.damage);
    assert.equal(await data("cr3-pressure-last-hit"), "true");
    assert.equal(Number(await data("cr3-pressure-damage-events")), 1);

    await canvas.evaluate((element, nextElapsed) => {
      const games = window.__RARE_SHIFT_CR3B_PHASER__?.GAMES;
      const activeGame = games?.find(candidate => candidate?.canvas === element);
      const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
      scene.elapsedActiveMs = nextElapsed;
      scene.syncTestState();
    }, firstResolveAt + 120);
    await page.waitForTimeout(80);
    assert.equal(Number(await data("cr3-pressure-resolve-events")), resolveBefore + 1, "one boss decision must resolve pressure at most once");

    await canvas.evaluate(element => {
      const games = window.__RARE_SHIFT_CR3B_PHASER__?.GAMES;
      const activeGame = games?.find(candidate => candidate?.canvas === element);
      const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
      let safety = 0;
      while (element.dataset.cr3BossPhase === "ALIGNMENT" && safety < 80) {
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
      scene.syncTestState();
      if (element.dataset.cr3BossPhase !== "CROSS_SPLIT") throw new Error("CR-3C could not reach CROSS_SPLIT.");
    });
    await waitFor(data, "cr3-boss-phase", value => value === "CROSS_SPLIT");

    async function advanceToAlignedAdds() {
      for (let attempt = 0; attempt < 16; attempt += 1) {
        if (await data("cr3-pressure-attack") === "ALIGNED_ADDS") return;
        const startedAt = Number(await data("cr3-pressure-resolve-at")) - 850;
        const ordinalBefore = Number(await data("cr3-boss-cycle-ordinal"));
        await canvas.evaluate((element, nextElapsed) => {
          const games = window.__RARE_SHIFT_CR3B_PHASER__?.GAMES;
          const activeGame = games?.find(candidate => candidate?.canvas === element);
          const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
          scene.elapsedActiveMs = nextElapsed;
          scene.lastContactAt = nextElapsed;
          scene.syncTestState();
        }, startedAt + 2800);
        await waitFor(data, "cr3-boss-cycle-ordinal", value => Number(value) > ordinalBefore);
      }
      throw new Error("CR-3C deterministic CROSS_SPLIT sequence did not expose ALIGNED_ADDS within 16 cycles.");
    }

    const addSpawnsBefore = Number(await data("cr3-pressure-add-spawns"));
    await advanceToAlignedAdds();
    const firstAddPhase = await data("cr3-boss-add-phase");
    assert.ok(firstAddPhase === "A" || firstAddPhase === "B");
    const addResolveAt1 = Number(await data("cr3-pressure-resolve-at"));
    await canvas.evaluate((element, nextElapsed) => {
      const games = window.__RARE_SHIFT_CR3B_PHASER__?.GAMES;
      const activeGame = games?.find(candidate => candidate?.canvas === element);
      const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
      scene.elapsedActiveMs = nextElapsed;
      scene.syncTestState();
    }, addResolveAt1);
    await waitFor(data, "cr3-pressure-add-spawns", value => Number(value) === addSpawnsBefore + 2);
    assert.equal(Number(await data("cr3-pressure-boss-owned-adds")), 2);
    assert.equal(await data("cr3-pressure-last-add-kind"), firstAddPhase === "A" ? "SPLIT_A" : "SPLIT_B");

    await advanceToAlignedAdds();
    const addResolveAt2 = Number(await data("cr3-pressure-resolve-at"));
    await canvas.evaluate((element, nextElapsed) => {
      const games = window.__RARE_SHIFT_CR3B_PHASER__?.GAMES;
      const activeGame = games?.find(candidate => candidate?.canvas === element);
      const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
      scene.elapsedActiveMs = nextElapsed;
      scene.syncTestState();
    }, addResolveAt2);
    await waitFor(data, "cr3-pressure-boss-owned-adds", value => Number(value) === 4);
    assert.equal(Number(await data("cr3-pressure-add-spawns")), addSpawnsBefore + 4);

    await advanceToAlignedAdds();
    const addResolveAt3 = Number(await data("cr3-pressure-resolve-at"));
    await canvas.evaluate((element, nextElapsed) => {
      const games = window.__RARE_SHIFT_CR3B_PHASER__?.GAMES;
      const activeGame = games?.find(candidate => candidate?.canvas === element);
      const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
      scene.elapsedActiveMs = nextElapsed;
      scene.syncTestState();
    }, addResolveAt3);
    await page.waitForTimeout(80);
    assert.equal(Number(await data("cr3-pressure-boss-owned-adds")), 4);
    assert.equal(Number(await data("cr3-pressure-add-spawns")), addSpawnsBefore + 4, "boss-owned add cap must prevent a fifth add");

    await canvas.evaluate(element => {
      const games = window.__RARE_SHIFT_CR3B_PHASER__?.GAMES;
      const activeGame = games?.find(candidate => candidate?.canvas === element);
      const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
      let safety = 0;
      while (element.dataset.cr3BossPhase === "CROSS_SPLIT" && safety < 80) {
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
      scene.syncTestState();
      if (element.dataset.cr3BossPhase !== "BREAK_WINDOW") throw new Error("CR-3C could not reach BREAK_WINDOW.");
    });
    await waitFor(data, "cr3-boss-phase", value => value === "BREAK_WINDOW");
    assert.equal(await data("cr3-pressure-attack"), "BREAK_PRESSURE");
    assert.ok(["RADIAL", "LANE"].includes(await data("cr3-pressure-geometry")));
    assert.equal(await data("cr3-pressure-telegraph-visible"), "true");

    const expected = await data("cr3-boss-expected-response");
    assert.ok(expected === "A" || expected === "B");
    await canvas.evaluate((element, expectedPhase) => {
      const games = window.__RARE_SHIFT_CR3B_PHASER__?.GAMES;
      const activeGame = games?.find(candidate => candidate?.canvas === element);
      const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
      scene.phase = expectedPhase === "A" ? "B" : "A";
      scene.paintFriend();
      scene.shift();
      scene.syncTestState();
    }, expected);
    assert.equal(await data("cr3-boss-break-open"), "true");

    const breakOrdinal = Number(await data("cr3-pressure-ordinal"));
    const breakPlan = planCR3Pressure(bossSeed, breakOrdinal, "BREAK_PRESSURE");
    const breakPoint = pressurePoint(breakPlan, bossX, bossY);
    const breakResolveAt = Number(await data("cr3-pressure-resolve-at"));
    const damageEventsBeforeBreak = Number(await data("cr3-pressure-damage-events"));
    const hpBeforeBreakPressure = Number(await data("hp"));
    await canvas.evaluate((element, payload) => {
      const games = window.__RARE_SHIFT_CR3B_PHASER__?.GAMES;
      const activeGame = games?.find(candidate => candidate?.canvas === element);
      const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
      scene.friend.setPosition(payload.x, payload.y);
      scene.lastContactAt = -99_999;
      scene.elapsedActiveMs = payload.resolveAt;
      scene.syncTestState();
    }, { ...breakPoint, resolveAt: breakResolveAt });
    await waitFor(data, "cr3-pressure-damage-events", value => Number(value) === damageEventsBeforeBreak + 1);
    assert.equal(Number(await data("hp")), hpBeforeBreakPressure - breakPlan.damage);
    assert.equal(await data("cr3-boss-break-open"), "true", "COMMON BREAK pressure must not bypass or close the qualified BREAK law");

    await canvas.evaluate(element => {
      const games = window.__RARE_SHIFT_CR3B_PHASER__?.GAMES;
      const activeGame = games?.find(candidate => candidate?.canvas === element);
      const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
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
      scene.syncTestState();
      if (element.dataset.cr3BossPhase !== "DEFEATED") throw new Error("CR-3C could not defeat THE DESYNC inside the open BREAK window.");
    });
    await waitFor(data, "cr3-boss-phase", value => value === "DEFEATED");
    await waitFor(data, "cr3-pressure-boss-owned-adds", value => value === "0");
    assert.equal(await data("cr3-pressure-active"), "false");
    assert.equal(await data("cr3-pressure-telegraph-visible"), "false");

    const terminalResolveEvents = Number(await data("cr3-pressure-resolve-events"));
    const terminalAddSpawns = Number(await data("cr3-pressure-add-spawns"));
    await canvas.evaluate(element => {
      const games = window.__RARE_SHIFT_CR3B_PHASER__?.GAMES;
      const activeGame = games?.find(candidate => candidate?.canvas === element);
      const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
      scene.elapsedActiveMs += 10_000;
      scene.syncTestState();
    });
    await page.waitForTimeout(100);
    assert.equal(Number(await data("cr3-pressure-resolve-events")), terminalResolveEvents);
    assert.equal(Number(await data("cr3-pressure-add-spawns")), terminalAddSpawns);
    assert.equal(await data("dead"), "false", "CR-3C does not own victory/results state yet");
    if (width === 390) assert.equal(await reduced.isChecked(), true);

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-cr3c-pressure-${width}.png`) });
    console.log(`RARE_SHIFT_CR3C_PRESSURE_${width}=PASS`);
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 120_000,
    screenshot: resolve(`artifacts/rare-shift-cr3c-host-${width}.png`),
    check: qualify(width),
  });
}

console.log("RARE_SHIFT_CR3C_PRESSURE_REDUCED_MOTION=PASS");
console.log("RARE_SHIFT_CR3C_PRESSURE_BROWSER=PASS");
