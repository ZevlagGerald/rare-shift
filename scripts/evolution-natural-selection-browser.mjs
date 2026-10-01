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
    const error = await data("evolution-runtime-error");
    if (error) throw new Error(`EV-3G production runtime failed: ${error}`);
    await new Promise(resolveWait => setTimeout(resolveWait, 50));
    value = await data(name);
  }
  return value;
}

function qualify(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    await game.locator("body").evaluate(() => {
      window.__RARE_SHIFT_EV3F_PRODUCTION_RUNTIME__ = true;
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

    await waitFor(data, "evolution-runtime-adapter", value => value === "ACTIVE");
    assert.equal(await data("evolution-runtime-adapter"), "ACTIVE");

    const setup = await canvas.evaluate(element => {
      const games = window.__RARE_SHIFT_EV3F_PHASER__?.GAMES;
      if (!Array.isArray(games)) throw new Error("EV-3G Phaser capture is unavailable.");
      const activeGame = games.find(candidate => candidate?.canvas === element);
      const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
      if (!scene) throw new Error("EV-3G survival scene is unavailable.");
      if (typeof scene.openDraft !== "function" || typeof scene.syncTestState !== "function") {
        throw new Error("EV-3G natural draft hooks are unavailable.");
      }

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
      scene.spawnAccumulator = -1_000_000;
      scene.attackAccumulator = 0;
      scene.level = 12;
      scene.xp = 0;
      scene.hp = 73;
      scene.pickupRadius = 111;
      scene.deltaRank = 5;
      scene.vectorOwned = false;
      scene.vectorRank = 1;
      scene.orbitOwned = false;
      scene.orbitRank = 1;
      scene.echoOwned = false;
      scene.echoRank = 1;
      scene.signalOwned = false;
      scene.signalRank = 1;
      scene.weaponSlotsUsed = 1;
      scene.protocols = { COMMON_CORE: 1 };
      scene.evolutionCores = 1;
      scene.evolvedWeapons = {};
      scene.refracts = 1;
      scene.rerollNonce = 4;
      scene.syncTestState();

      const before = {
        pulses: scene.deltaPrimaryPulses,
        cooldown: scene.deltaCombatProfile().cooldownMs,
        accumulator: scene.attackAccumulator,
        cores: scene.evolutionCores,
        slots: scene.weaponSlotsUsed,
        hp: scene.hp,
        pickupRadius: scene.pickupRadius,
        refracts: scene.refracts,
        rerollNonce: scene.rerollNonce,
      };
      scene.openDraft();
      scene.syncTestState();
      return before;
    });

    assert.equal(setup.cores, 1);
    assert.equal(setup.slots, 1);
    assert.equal(setup.accumulator, 0);
    assert.ok(setup.cooldown > 0);
    assert.equal(await data("draft-open"), "true");
    assert.equal(await data("cr2-draft-active"), "true");
    const candidateIds = String(await data("draft-candidate-ids")).split(",").filter(Boolean);
    assert.equal(candidateIds[0], "EVOLUTION:DELTA:RECONSTRUCTION_FIELD", "eligible natural CR-2 draft must surface RECONSTRUCTION FIELD as the deterministic first choice");

    await canvas.press("1");
    await waitFor(data, "draft-open", value => value === "false");
    await waitFor(data, "evolution-runtime-delta", value => value === "true");

    assert.equal(await data("evolution-cores"), "0", "natural Evolution must consume exactly one Core");
    assert.equal(await data("delta-rank"), "5", "natural Evolution must preserve Rank V");
    assert.equal(await data("weapon-slots-used"), "1", "natural Evolution must not consume another weapon slot");
    assert.equal(await data("protocols"), "COMMON_CORE:1", "matching Protocol must be preserved");
    assert.equal(await data("hp"), String(setup.hp));
    assert.equal(await data("pickup-radius"), String(setup.pickupRadius));
    assert.equal(await data("refracts"), String(setup.refracts));
    assert.equal(await data("reroll-nonce"), String(setup.rerollNonce));
    assert.equal(await data("delta-primary-pulses"), String(setup.pulses), "Evolution selection itself must not grant an immediate DELTA attack");

    const boundary = await canvas.evaluate(element => {
      const games = window.__RARE_SHIFT_EV3F_PHASER__?.GAMES;
      const activeGame = games?.find(candidate => candidate?.canvas === element);
      const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
      if (!scene) throw new Error("EV-3G lost the survival scene after selection.");
      const profile = scene.deltaCombatProfile();
      const pulsesBefore = scene.deltaPrimaryPulses;
      scene.attackAccumulator = Math.max(0, profile.cooldownMs - 1);
      scene.update(0, 1);
      scene.syncTestState();
      return {
        pulsesBefore,
        pulsesAfter: scene.deltaPrimaryPulses,
        accumulatorAfter: scene.attackAccumulator,
        cooldownMs: profile.cooldownMs,
      };
    });

    assert.equal(boundary.pulsesAfter, boundary.pulsesBefore + 1, "post-selection exact cooldown boundary must fire one genuine DELTA burst");
    assert.ok(boundary.accumulatorAfter < boundary.cooldownMs, "ordinary cooldown must reset after the genuine post-Evolution burst");
    await waitFor(data, "evolution-runtime-reconstruction-schedules", value => Number(value) >= 1);
    await waitFor(data, "evolution-runtime-reconstruction-fires", value => Number(value) >= 1);

    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduced.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-ev3g-natural-evolution-${width}.png`) });
    console.log(`RARE_SHIFT_EV3G_NATURAL_EVOLUTION_${width}=PASS`);
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 90_000,
    screenshot: resolve(`artifacts/rare-shift-ev3g-host-${width}.png`),
    check: qualify(width),
  });
}

console.log("RARE_SHIFT_EV3G_NATURAL_EVOLUTION_REDUCED_MOTION=PASS");
console.log("RARE_SHIFT_EV3G_NATURAL_EVOLUTION_BROWSER=PASS");