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
    if (error) throw new Error(`EV-3F production runtime failed: ${error}`);
    await new Promise(resolveWait => setTimeout(resolveWait, 50));
    value = await data(name);
  }
  return value;
}

function numbers(value) {
  return String(value ?? "").split(",").filter(Boolean).map(Number);
}

function qualify(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    await game.locator("body").evaluate(() => {
      window.__RARE_SHIFT_EV3F_PRODUCTION_RUNTIME__ = true;
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
    assert.equal(await data("evolution-runtime-adapter"), "ACTIVE");
    assert.equal(await data("evolution-runtime-delta"), "false");
    assert.equal(await data("evolution-runtime-vector"), "false");
    assert.equal(await data("evolution-runtime-orbit"), "false");
    assert.equal(await data("evolution-runtime-echo"), "false");
    assert.equal(await data("evolution-runtime-signal"), "false");

    const deltaSetup = await canvas.evaluate(element => {
      const games = window.__RARE_SHIFT_EV3F_PHASER__?.GAMES;
      if (!Array.isArray(games)) throw new Error("EV-3F Phaser capture is unavailable.");
      const activeGame = games.find(candidate => candidate?.canvas === element);
      const scene = activeGame?.scene?.getScene?.("RareShiftV21Survival");
      if (!scene) throw new Error("EV-3F survival scene is unavailable.");

      for (const enemy of scene.enemies) {
        enemy.active = false;
        enemy.view?.setVisible(false);
        enemy.telegraphView?.clear().setVisible(false);
        enemy.healthView?.clear().setVisible(false);
      }
      scene.spawnAccumulator = -1_000_000;
      scene.attackAccumulator = -1_000_000;
      scene.vectorOwned = false;
      scene.orbitOwned = false;
      scene.echoOwned = false;
      scene.signalOwned = false;
      scene.evolvedWeapons = { DELTA: true };
      scene.protocols = { COMMON_CORE: 1 };
      scene.deltaRank = 5;

      const points = [];
      for (let y = 0; y < 16; y += 1) {
        for (let x = 0; x < 16; x += 1) {
          if (scene.pair.a.rows[y]?.[x] === "#" && scene.pair.b.rows[y]?.[x] === "#") points.push({ x: x - 7.5, y: y - 7.5 });
        }
      }
      if (points.length === 0) throw new Error("EV-3F DELTA proof requires a canonical COMMON point.");
      const point = points.sort((a, b) => Math.hypot(b.x, b.y) - Math.hypot(a.x, a.y))[0];
      const slot = scene.enemies[0];
      scene.activateEnemy(slot, 9_003_601, "TRACE", scene.friend.x + point.x * 9.5, scene.friend.y + point.y * 9.5, false, null, 1000);
      slot.staggerUntilMs = Number.POSITIVE_INFINITY;
      const hpBefore = slot.hp;
      const primaryBefore = scene.deltaPrimaryPulses;
      const schedulesBefore = Number(element.dataset.evolutionRuntimeReconstructionSchedules ?? "0");
      scene.fireDelta(scene.deltaCombatProfile());
      scene.syncTestState();
      return { hpBefore, primaryBefore, schedulesBefore, targetId: slot.id };
    });

    await waitFor(data, "evolution-runtime-reconstruction-schedules", value => Number(value) === deltaSetup.schedulesBefore + 1);
    await waitFor(data, "evolution-runtime-reconstruction-fires", value => Number(value) >= 1);
    await waitFor(data, "evolution-runtime-reconstruction-hits", value => Number(value) >= 1);
    const deltaObserved = await canvas.evaluate(element => {
      const activeGame = window.__RARE_SHIFT_EV3F_PHASER__.GAMES.find(candidate => candidate?.canvas === element);
      const scene = activeGame.scene.getScene("RareShiftV21Survival");
      const target = scene.enemies.find(enemy => enemy.active && enemy.id === 9_003_601);
      return { hp: target?.hp ?? null, primary: scene.deltaPrimaryPulses };
    });
    assert.equal(deltaObserved.primary, deltaSetup.primaryBefore + 1, "production RECONSTRUCTION must attach to one genuine DELTA primary pulse");
    assert.equal(deltaObserved.hp, deltaSetup.hpBefore - 4, "production RECONSTRUCTION must apply exactly the locked COMMON damage");
    assert.equal(await data("evolution-runtime-delta"), "true");

    const prism = await canvas.evaluate(element => {
      const activeGame = window.__RARE_SHIFT_EV3F_PHASER__.GAMES.find(candidate => candidate?.canvas === element);
      const scene = activeGame.scene.getScene("RareShiftV21Survival");
      for (const enemy of scene.enemies) {
        enemy.active = false;
        enemy.view?.setVisible(false);
        enemy.telegraphView?.clear().setVisible(false);
        enemy.healthView?.clear().setVisible(false);
      }
      scene.evolvedWeapons = { VECTOR: true };
      scene.protocols = { VECTOR_LENS: 1 };
      scene.vectorOwned = true;
      scene.vectorRank = 5;
      scene.attackAccumulator = -1_000_000;
      scene.echoOwned = false;
      scene.signalOwned = false;
      scene.orbitOwned = false;
      const legalKind = scene.phase === "A" ? "SPLIT_A" : "SPLIT_B";
      const primary = scene.enemies[0];
      const target = scene.enemies[1];
      scene.activateEnemy(primary, 9_003_611, "TRACE", scene.friend.x + 120, scene.friend.y, false, null, 1000);
      scene.activateEnemy(target, 9_003_612, legalKind, scene.friend.x + 120, scene.friend.y + 90, false, null, 1000);
      primary.staggerUntilMs = Number.POSITIVE_INFINITY;
      target.staggerUntilMs = Number.POSITIVE_INFINITY;
      const hpBefore = target.hp;
      const profile = scene.vectorCombatProfile();
      const projectile = {
        active: true,
        launchPhase: scene.phase,
        profile,
        transferShot: false,
        hitIds: [primary.id],
        hitDamages: [1],
      };
      scene.applyVectorProjectileHit(projectile, 0);
      scene.syncTestState();
      return { hpBefore, hpAfter: target.hp, primaryId: primary.id, targetId: target.id };
    });
    assert.equal(prism.hpAfter, prism.hpBefore - 6, "production PRISM must apply exactly one 6-damage refraction");
    assert.equal(Number(await data("evolution-runtime-prism-refractions")), 1);
    assert.equal(Number(await data("evolution-runtime-prism-hits")), 1);
    assert.equal(Number(await data("evolution-runtime-prism-last-primary-id")), prism.primaryId);
    assert.equal(Number(await data("evolution-runtime-prism-last-target-id")), prism.targetId);
    assert.equal(await data("evolution-runtime-vector"), "true");

    const sync = await canvas.evaluate(element => {
      const activeGame = window.__RARE_SHIFT_EV3F_PHASER__.GAMES.find(candidate => candidate?.canvas === element);
      const scene = activeGame.scene.getScene("RareShiftV21Survival");
      for (const enemy of scene.enemies) {
        enemy.active = false;
        enemy.view?.setVisible(false);
        enemy.telegraphView?.clear().setVisible(false);
        enemy.healthView?.clear().setVisible(false);
      }
      scene.evolvedWeapons = { ORBIT: true };
      scene.protocols = { ORBIT_STABILIZER: 1 };
      scene.orbitOwned = true;
      scene.orbitRank = 5;
      scene.orbitShearLastEmittedAt = null;
      scene.attackAccumulator = -1_000_000;
      scene.vectorOwned = false;
      scene.echoOwned = false;
      scene.signalOwned = false;
      const legalKind = scene.phase === "A" ? "SPLIT_A" : "SPLIT_B";
      const normal = scene.enemies[0];
      const common = scene.enemies[1];
      const elite = scene.enemies[2];
      const boss = scene.enemies[3];
      scene.activateEnemy(normal, 9_003_621, legalKind, scene.friend.x + 50, scene.friend.y, false, null, 1000);
      scene.activateEnemy(common, 9_003_622, "TRACE", scene.friend.x + 60, scene.friend.y, false, null, 1000);
      scene.activateEnemy(elite, 9_003_623, "ANCHOR", scene.friend.x + 70, scene.friend.y, true, "ELITE_I", 1000);
      scene.activateEnemy(boss, 9_003_624, "ANCHOR", scene.friend.x + 80, scene.friend.y, true, null, 1000);
      for (const enemy of [normal, common, elite, boss]) enemy.staggerUntilMs = Number.POSITIVE_INFINITY;
      const before = [normal.x, common.x, elite.x, boss.x];
      scene.tryEmitOrbitShear(scene.orbitAngle);
      const after = [normal.x, common.x, elite.x, boss.x];
      scene.syncTestState();
      return { before, after, ids: [normal.id, common.id, elite.id, boss.id] };
    });
    assert.deepEqual(sync.after.map((value, index) => Math.round(value - sync.before[index])), [28, 14, 8, 0], "production SYNC HALO must apply explicit role resistance and zero boss displacement");
    assert.equal(Number(await data("evolution-runtime-sync-control-events")), 1);
    assert.deepEqual(numbers(await data("evolution-runtime-sync-last-target-ids")), sync.ids.slice(0, 3));
    assert.equal(await data("evolution-runtime-orbit"), "true");

    const memory = await canvas.evaluate(element => {
      const activeGame = window.__RARE_SHIFT_EV3F_PHASER__.GAMES.find(candidate => candidate?.canvas === element);
      const scene = activeGame.scene.getScene("RareShiftV21Survival");
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
      scene.evolvedWeapons = { ECHO: true };
      scene.protocols = { MEMORY_FUSE: 1 };
      scene.echoOwned = true;
      scene.echoRank = 5;
      scene.echoPlacementAccumulator = -1_000_000;
      scene.echoBurstLedger = new Map();
      scene.attackAccumulator = -1_000_000;
      scene.vectorOwned = false;
      scene.orbitOwned = false;
      scene.signalOwned = false;
      const now = scene.elapsedActiveMs;
      if (now < 300) throw new Error(`EV-3F ECHO fixture needs active time >=300ms, got ${now}`);
      const baseX = scene.friend.x;
      const baseY = scene.friend.y;
      const returnedAtMs = now - 200;
      const createdAtMs = Math.max(0, now - 1000);
      const mines = [
        Object.freeze({ id: 9_003_631, x: baseX, y: baseY, recordedPhase: scene.phase, createdAtMs, state: "RETURN_READY", returnedAtMs, memoryDepth: 2, lastDepthIncrementAtMs: returnedAtMs }),
        Object.freeze({ id: 9_003_632, x: baseX + 160, y: baseY, recordedPhase: scene.phase, createdAtMs, state: "RETURN_READY", returnedAtMs, memoryDepth: 2, lastDepthIncrementAtMs: returnedAtMs }),
      ];
      mines.forEach((mine, index) => {
        const runtime = scene.echoMines[index];
        runtime.active = true;
        runtime.mine = mine;
        runtime.view?.setPosition(mine.x, mine.y).setVisible(true);
      });
      const trigger = scene.enemies[0];
      const propagated = scene.enemies[1];
      scene.activateEnemy(trigger, 9_003_633, "TRACE", baseX, baseY, false, null, 1000);
      scene.activateEnemy(propagated, 9_003_634, "TRACE", baseX + 260, baseY, false, null, 1000);
      trigger.staggerUntilMs = Number.POSITIVE_INFINITY;
      propagated.staggerUntilMs = Number.POSITIVE_INFINITY;
      const hpBefore = propagated.hp;
      scene.updateEcho(0);
      scene.syncTestState();
      return { hpBefore, hpAfter: propagated.hp, startId: mines[0].id, linkedId: mines[1].id, linkedActive: scene.echoMines[1].active };
    });
    assert.equal(memory.linkedActive, false, "production MEMORY COLLAPSE must consume the propagated linked mine");
    assert.equal(memory.hpAfter, memory.hpBefore - 20, "production MEMORY COLLAPSE must reuse deep Rank-V ECHO damage through the inherited ledger");
    assert.equal(Number(await data("evolution-runtime-memory-events")), 1);
    assert.equal(Number(await data("evolution-runtime-memory-propagated-mines")), 1);
    assert.equal(Number(await data("evolution-runtime-memory-hits")), 1);
    assert.deepEqual(numbers(await data("evolution-runtime-memory-last-chain-ids")), [memory.startId, memory.linkedId]);
    assert.equal(await data("evolution-runtime-echo"), "true");

    const signalSetup = await canvas.evaluate(element => {
      const activeGame = window.__RARE_SHIFT_EV3F_PHASER__.GAMES.find(candidate => candidate?.canvas === element);
      const scene = activeGame.scene.getScene("RareShiftV21Survival");
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
      scene.evolvedWeapons = { SIGNAL: true };
      scene.protocols = { RESONANCE_COIL: 1 };
      scene.signalOwned = true;
      scene.signalRank = 5;
      scene.signalAccumulator = 0;
      scene.attackAccumulator = -1_000_000;
      scene.vectorOwned = false;
      scene.orbitOwned = false;
      scene.echoOwned = false;
      scene.spawnAccumulator = -1_000_000;
      const offsets = [80, 320, 560, 750, 940];
      offsets.forEach((offset, index) => {
        const enemy = scene.enemies[index];
        scene.activateEnemy(enemy, 9_003_641 + index, "TRACE", scene.friend.x + offset, scene.friend.y, false, null, 1000);
        enemy.staggerUntilMs = Number.POSITIVE_INFINITY;
        enemy.beaconNextShotAt = Number.POSITIVE_INFINITY;
        enemy.flickerNextSwitchAt = Number.POSITIVE_INFINITY;
        enemy.eliteNextPulseAt = Number.POSITIVE_INFINITY;
      });
      const profile = scene.signalCombatProfile();
      scene.syncTestState();
      return { castsBefore: scene.signalCasts, cooldownMs: profile.cooldownMs, maxTargets: profile.maxTargets, commonBonusUses: profile.commonBonusUses };
    });
    assert.equal(signalSetup.maxTargets, 5, "production adapter must expose the evolved five-target SIGNAL profile");
    assert.equal(signalSetup.commonBonusUses, 1, "normal evolved SIGNAL must preserve one inherited COMMON relay use before SHIFT");
    await page.waitForTimeout(80);
    assert.equal(Number(await data("signal-casts")), signalSetup.castsBefore, "enabling production CHAIN RESONANCE must not fabricate a cast");

    const signal = await canvas.evaluate(element => {
      const activeGame = window.__RARE_SHIFT_EV3F_PHASER__.GAMES.find(candidate => candidate?.canvas === element);
      const scene = activeGame.scene.getScene("RareShiftV21Survival");
      const profile = scene.signalCombatProfile();
      scene.signalAccumulator = profile.cooldownMs - 1;
      const shiftsBefore = scene.shifts;
      const castsBefore = scene.signalCasts;
      scene.shift();
      const postShiftProfile = scene.signalCombatProfile();
      scene.updateSignalArc(1);
      scene.syncTestState();
      return {
        shiftsBefore,
        shiftsAfter: scene.shifts,
        castsBefore,
        castsAfter: scene.signalCasts,
        postShiftCommonBonusUses: postShiftProfile.commonBonusUses,
      };
    });
    assert.equal(signal.shiftsAfter, signal.shiftsBefore + 1, "production CHAIN RESONANCE proof must use one genuine accepted SHIFT");
    assert.equal(signal.postShiftCommonBonusUses, 2, "accepted SHIFT must grant exactly one additional COMMON relay use");
    assert.equal(signal.castsAfter, signal.castsBefore + 1, "near-ready SHIFT must still require the ordinary cooldown boundary before casting");
    assert.equal(numbers(await data("signal-last-chain-ids")).length, 5);
    assert.deepEqual(numbers(await data("signal-last-chain-damage")), [10, 9, 8, 8, 7]);
    assert.equal(String(await data("signal-last-chain-common-bonus")).split(",").filter(value => value === "1").length, 2);
    assert.equal(Number(await data("evolution-runtime-chain-arm-events")), 1);
    assert.equal(Number(await data("evolution-runtime-chain-consume-events")), 1);
    assert.equal(await data("evolution-runtime-chain-armed"), "false");
    assert.equal(await data("evolution-runtime-signal"), "true");
    assert.equal(await data("dead"), "false");

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-ev3f-production-runtime-${width}.png`) });
    console.log(`RARE_SHIFT_EV3F_PRODUCTION_RUNTIME_${width}=PASS`);
    if (width === 390) console.log("RARE_SHIFT_EV3F_PRODUCTION_RUNTIME_REDUCED_MOTION=PASS");
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 45_000,
    screenshot: resolve(`artifacts/rare-shift-ev3f-host-${width}.png`),
    check: qualify(width),
  });
}

console.log("RARE_SHIFT_EV3F_PRODUCTION_RUNTIME_BROWSER=PASS");
