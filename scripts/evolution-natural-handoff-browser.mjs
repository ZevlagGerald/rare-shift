import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";

const gameDirectory = resolve("games/rare-shift");
await mkdir(resolve("artifacts"), { recursive: true });

const FAMILIES = ["DELTA", "VECTOR", "ORBIT", "ECHO", "SIGNAL"];
const PROTOCOL = Object.freeze({
  DELTA: "COMMON_CORE",
  VECTOR: "VECTOR_LENS",
  ORBIT: "ORBIT_STABILIZER",
  ECHO: "MEMORY_FUSE",
  SIGNAL: "RESONANCE_COIL",
});

async function waitFor(data, name, predicate, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  let value = await data(name);
  while (Date.now() < deadline && !predicate(value)) {
    const handoffError = await data("evolution-natural-handoff-error");
    const runtimeError = await data("evolution-runtime-error");
    if (handoffError) throw new Error(`EV-4 natural handoff failed: ${handoffError}`);
    if (runtimeError) throw new Error(`EV-4 production runtime failed: ${runtimeError}`);
    await new Promise(resolveWait => setTimeout(resolveWait, 40));
    value = await data(name);
  }
  return value;
}

function runtimeFlag(family) {
  return `evolution-runtime-${family.toLowerCase()}`;
}

function qualify(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    await game.locator("body").evaluate(() => {
      window.__RARE_SHIFT_EV4_NATURAL_EVOLUTION__ = true;
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

    await waitFor(data, "evolution-runtime-adapter", value => value === "ACTIVE");
    await waitFor(data, "evolution-natural-handoff", value => value === "ACTIVE");
    assert.equal(await data("evolution-runtime-adapter"), "ACTIVE");
    assert.equal(await data("evolution-natural-handoff"), "ACTIVE");

    let expectedSelections = 0;

    for (const family of FAMILIES) {
      const setup = await canvas.evaluate((element, input) => {
        const games = window.__RARE_SHIFT_EV4_PHASER__?.GAMES;
        if (!Array.isArray(games)) throw new Error("EV-4 Phaser capture is unavailable.");
        const activeGame = games.find(candidate => candidate?.canvas === element);
        const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
        if (!scene) throw new Error("EV-4 survival scene is unavailable.");

        if (scene.draftOpen) throw new Error(`EV-4 ${input.family} setup encountered an unexpected open draft.`);
        for (const enemy of scene.enemies) {
          enemy.active = false;
          enemy.view?.setVisible(false);
          enemy.telegraphView?.clear().setVisible(false);
          enemy.healthView?.clear().setVisible(false);
        }
        for (const runtime of scene.echoMines) {
          runtime.active = false;
          runtime.mine = null;
          runtime.view?.clear().setVisible(false);
        }

        scene.spawnAccumulator = -1_000_000;
        scene.attackAccumulator = input.family === "DELTA" ? 333 : -1_000_000;
        scene.vectorAccumulator = input.family === "VECTOR" ? 444 : 0;
        scene.signalAccumulator = input.family === "SIGNAL" ? 555 : 0;
        scene.echoPlacementAccumulator = input.family === "ECHO" ? 222 : 0;
        scene.orbitAngle = input.family === "ORBIT" ? 0.75 : 0;

        scene.level = 10;
        scene.xp = 0;
        scene.evolutionCores = 1;
        scene.refracts = 1;
        scene.rerollNonce = 0;
        scene.evolvedWeapons = {};
        scene.protocols = { [input.protocol]: 1 };

        scene.deltaRank = input.family === "DELTA" ? 5 : 1;
        scene.vectorOwned = input.family === "VECTOR";
        scene.vectorRank = input.family === "VECTOR" ? 5 : 1;
        scene.orbitOwned = input.family === "ORBIT";
        scene.orbitRank = input.family === "ORBIT" ? 5 : 1;
        scene.echoOwned = input.family === "ECHO";
        scene.echoRank = input.family === "ECHO" ? 5 : 1;
        scene.signalOwned = input.family === "SIGNAL";
        scene.signalRank = input.family === "SIGNAL" ? 5 : 1;
        scene.weaponSlotsUsed = input.family === "DELTA" ? 1 : 2;

        scene.cr2DraftActive = false;
        scene.cr2DraftLegalCandidateCount = 0;
        scene.draftChoices = [];
        scene.syncTestState();

        const continuityBefore = input.family === "DELTA"
          ? scene.attackAccumulator
          : input.family === "VECTOR"
            ? scene.vectorAccumulator
            : input.family === "ORBIT"
              ? scene.orbitAngle
              : input.family === "ECHO"
                ? scene.echoPlacementAccumulator
                : scene.signalAccumulator;
        const slotsBefore = scene.weaponSlotsUsed;
        const protocolBefore = { ...scene.protocols };

        scene.openDraft();
        scene.syncTestState();
        const choices = scene.draftChoices.map((choice, index) => ({
          index,
          candidateId: choice.candidateId,
          candidateType: choice.candidateType,
          familyId: choice.familyId,
          name: choice.name,
        }));
        const evolution = choices.find(choice => choice.candidateType === "EVOLUTION" && choice.familyId === input.family) ?? null;
        return {
          continuityBefore,
          slotsBefore,
          protocolBefore,
          choices,
          evolution,
          cores: scene.evolutionCores,
          refracts: scene.refracts,
        };
      }, { family, protocol: PROTOCOL[family] });

      assert.equal(setup.cores, 1, `${family} natural fixture must begin with exactly one Evolution Core`);
      assert.ok(setup.evolution, `${family} must appear naturally in the full CR-2 draft`);
      assert.match(String(setup.evolution.candidateId), new RegExp(`^EVOLUTION:${family}:`, "u"));
      assert.equal(await data("draft-open"), "true");
      assert.equal(await data("cr2-draft-active"), "true");
      assert.match(String(await data("evolution-natural-eligible-ids")), new RegExp(`EVOLUTION:${family}:`, "u"));

      if (family === "SIGNAL") {
        const refract = await canvas.evaluate(element => {
          const activeGame = window.__RARE_SHIFT_EV4_PHASER__.GAMES.find(candidate => candidate?.canvas === element);
          const scene = activeGame.scene.getScene("RareShiftV21Survival");
          const before = scene.refracts;
          scene.refractDraft();
          scene.syncTestState();
          const choices = scene.draftChoices.map((choice, index) => ({ index, candidateId: choice.candidateId, candidateType: choice.candidateType, familyId: choice.familyId }));
          return { before, after: scene.refracts, choices, cores: scene.evolutionCores };
        });
        assert.equal(refract.before, 1);
        assert.equal(refract.after, 0, "natural CR-2 REFRACT must consume exactly one reroll");
        assert.equal(refract.cores, 1, "REFRACT must not consume the Evolution Core");
        const refreshedEvolution = refract.choices.find(choice => choice.candidateType === "EVOLUTION" && choice.familyId === family);
        assert.ok(refreshedEvolution, "eligible Evolution must remain represented after full CR-2 REFRACT");
        setup.evolution = refreshedEvolution;
      }

      const choiceIndex = setup.evolution.index;
      await canvas.focus();
      await canvas.press(String(choiceIndex + 1));
      await waitFor(data, "draft-open", value => value === "false");
      expectedSelections += 1;
      await waitFor(data, "evolution-natural-selections", value => Number(value) === expectedSelections);
      await waitFor(data, runtimeFlag(family), value => value === "true");

      const observed = await canvas.evaluate((element, input) => {
        const activeGame = window.__RARE_SHIFT_EV4_PHASER__.GAMES.find(candidate => candidate?.canvas === element);
        const scene = activeGame.scene.getScene("RareShiftV21Survival");
        const continuityAfter = input.family === "DELTA"
          ? scene.attackAccumulator
          : input.family === "VECTOR"
            ? scene.vectorAccumulator
            : input.family === "ORBIT"
              ? scene.orbitAngle
              : input.family === "ECHO"
                ? scene.echoPlacementAccumulator
                : scene.signalAccumulator;
        const targetRank = input.family === "DELTA"
          ? scene.deltaRank
          : input.family === "VECTOR"
            ? scene.vectorRank
            : input.family === "ORBIT"
              ? scene.orbitRank
              : input.family === "ECHO"
                ? scene.echoRank
                : scene.signalRank;
        const owned = input.family === "DELTA" ? true
          : input.family === "VECTOR" ? scene.vectorOwned
            : input.family === "ORBIT" ? scene.orbitOwned
              : input.family === "ECHO" ? scene.echoOwned
                : scene.signalOwned;
        const evolvedFamilies = Object.entries(scene.evolvedWeapons).filter(([, value]) => value === true).map(([key]) => key).sort();
        const signalProfile = input.family === "SIGNAL" ? scene.signalCombatProfile() : null;
        return {
          continuityAfter,
          targetRank,
          owned,
          evolvedFamilies,
          slotsAfter: scene.weaponSlotsUsed,
          protocolAfter: { ...scene.protocols },
          coresAfter: scene.evolutionCores,
          signalProfile: signalProfile ? {
            maxTargets: signalProfile.maxTargets,
            damages: [...signalProfile.damages],
            relayRange: signalProfile.relayRange,
          } : null,
        };
      }, { family });

      assert.equal(observed.coresAfter, 0, `${family} natural selection must consume exactly one Evolution Core`);
      assert.deepEqual(observed.evolvedFamilies, [family], `${family} selection must evolve only the selected family`);
      assert.equal(observed.targetRank, 5, `${family} Evolution must preserve Rank V`);
      assert.equal(observed.owned, true, `${family} Evolution must preserve ownership`);
      assert.equal(observed.slotsAfter, setup.slotsBefore, `${family} Evolution must preserve weapon slot usage`);
      assert.deepEqual(observed.protocolAfter, setup.protocolBefore, `${family} Evolution must preserve matching Protocol state`);
      assert.equal(observed.continuityAfter, setup.continuityBefore, `${family} Evolution must preserve its existing live continuity state`);
      assert.equal(await data("evolution-natural-last-family"), family);

      if (family === "SIGNAL") {
        assert.deepEqual(observed.signalProfile?.damages, [10, 9, 8, 8, 7], "natural CHAIN RESONANCE must immediately resolve through the production evolved profile");
        assert.equal(observed.signalProfile?.maxTargets, 5);
        assert.equal(observed.signalProfile?.relayRange, 200);
      }
    }

    assert.equal(Number(await data("evolution-natural-selections")), 5);
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduceMotion.isChecked(), true);

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-ev4-natural-evolution-${width}.png`) });
    console.log(`RARE_SHIFT_EV4_NATURAL_EVOLUTION_${width}=PASS`);
    if (width === 390) console.log("RARE_SHIFT_EV4_NATURAL_EVOLUTION_REDUCED_MOTION=PASS");
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 60_000,
    screenshot: resolve(`artifacts/rare-shift-ev4-natural-host-${width}.png`),
    check: qualify(width),
  });
}

console.log("RARE_SHIFT_EV4_NATURAL_EVOLUTION_BROWSER=PASS");
