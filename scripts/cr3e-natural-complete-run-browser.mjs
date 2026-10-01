import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";
import { cr3PressureHitsPoint, planCR3Pressure } from "../games/rare-shift/src/cr3-pressure-core.ts";

const gameDirectory = resolve("games/rare-shift");
await mkdir(resolve("artifacts"), { recursive: true });

const PLAYER_SPEED = 220;
const BOSS_SEED_XOR = 0x43523342;

function bool(value) {
  assert.ok(value === "true" || value === "false", `expected dataset boolean, got ${String(value)}`);
  return value === "true";
}

function splitPreservingEmpty(value) {
  return String(value ?? "").split(",");
}

function list(value) {
  return splitPreservingEmpty(value).filter(Boolean);
}

function parseRows(serialized) {
  assert.equal(typeof serialized, "string", "canonical frame rows must be serialized");
  assert.equal(serialized.length, 256, `canonical frame serialization must contain 256 cells, got ${serialized.length}`);
  return Array.from({ length: 16 }, (_, y) => serialized.slice(y * 16, y * 16 + 16));
}

function deltaPoints(aRows, bRows, phase) {
  const points = [];
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const a = aRows[y][x] === "#";
      const b = bRows[y][x] === "#";
      if ((phase === "A" && a && !b) || (phase === "B" && b && !a)) {
        points.push(Object.freeze({ x: x - 7.5, y: y - 7.5 }));
      }
    }
  }
  assert.ok(points.length > 0, `Phase ${phase} must expose canonical DELTA geometry`);
  return Object.freeze(points);
}

function deltaWorldScale(rank) {
  return rank >= 3 ? 9.5 : 8;
}

function centers(count) {
  if (count === 1) return [480];
  if (count === 2) return [350, 610];
  if (count === 3) return [220, 480, 740];
  throw new Error(`unexpected draft count ${count}`);
}

async function clickDraft(canvas, index, count) {
  const box = await canvas.boundingBox();
  assert.ok(box, "draft canvas must have a bounding box");
  await canvas.click({ position: { x: box.width * centers(count)[index] / 960, y: box.height * 320 / 640 } });
}

function entryScore(entry, hp, allowRepair = true) {
  const candidate = entry.candidateId;
  const legacy = entry.id;
  const isRepair = candidate === "UTILITY:FIELD_REPAIR" || legacy === "FIELD_REPAIR";
  const isOrbitAcquire = candidate === "WEAPON_ACQUIRE:ORBIT" || legacy === "ORBIT_NODES";
  const isOrbitRank = candidate.startsWith("WEAPON_RANK:ORBIT:") || legacy === "ORBIT_RANK";
  if (allowRepair && hp <= 78 && isRepair) return 0;
  if (hp <= 40 && (isOrbitAcquire || isOrbitRank)) return 1;
  if (candidate.startsWith("EVOLUTION:DELTA:") || legacy.startsWith("EVOLUTION:DELTA:")) return 2;
  if (candidate.startsWith("WEAPON_RANK:DELTA:") || legacy === "DELTA_RANK") return 3;
  if (candidate === "PROTOCOL_ACQUIRE:COMMON_CORE" || legacy === "PROTOCOL_COMMON_CORE") return 4;
  if (candidate.startsWith("PROTOCOL_RANK:COMMON_CORE:") || legacy === "PROTOCOL_COMMON_CORE") return 5;
  if (candidate.startsWith("EVOLUTION:")) return 6;
  if (isOrbitAcquire) return 7;
  if (candidate === "WEAPON_ACQUIRE:ECHO" || legacy === "ECHO_MINE") return 8;
  if (candidate === "WEAPON_ACQUIRE:SIGNAL" || legacy === "SIGNAL_ARC") return 9;
  if (isOrbitRank) return 10;
  if (candidate.startsWith("WEAPON_RANK:ECHO:") || legacy === "ECHO_RANK") return 11;
  if (candidate.startsWith("WEAPON_RANK:SIGNAL:") || legacy === "SIGNAL_RANK") return 12;
  if (candidate === "PROTOCOL_ACQUIRE:ORBIT_STABILIZER") return 13;
  if (candidate === "PROTOCOL_ACQUIRE:MEMORY_FUSE") return 14;
  if (candidate === "PROTOCOL_ACQUIRE:RESONANCE_COIL") return 15;
  if (candidate.startsWith("PROTOCOL_RANK:")) return 16;
  if (candidate === "WEAPON_ACQUIRE:VECTOR" || legacy === "VECTOR_NEEDLE") return 17;
  if (candidate.startsWith("WEAPON_RANK:VECTOR:") || legacy === "VECTOR_RANK") return 18;
  if (isRepair) return allowRepair ? 19 : 80;
  if (candidate === "UTILITY:SIGNAL_MAGNET" || legacy === "SIGNAL_MAGNET") return 20;
  return 40;
}

async function chooseDraft(page, canvas, data, label, allowRepair = true) {
  const ids = splitPreservingEmpty(await data("draft-ids"));
  const candidateIds = splitPreservingEmpty(await data("draft-candidate-ids"));
  const count = Number(await data("draft-count"));
  assert.ok(count >= 1 && count <= 3, `unexpected draft count ${count}`);
  assert.equal(ids.length, count, `draft ids/count mismatch: ${ids.length}/${count}`);
  while (candidateIds.length < count) candidateIds.push("");
  const hp = Number(await data("hp"));
  const entries = ids.map((id, index) => ({ id, candidateId: candidateIds[index] ?? "", index }));
  entries.sort((a, b) => entryScore(a, hp, allowRepair) - entryScore(b, hp, allowRepair) || a.index - b.index);
  const selected = entries[0];
  console.log(`${label}_DRAFT=L${await data("level")}:HP${hp}:${ids.join("|")}=>${selected.id}:${selected.candidateId}`);
  await clickDraft(canvas, selected.index, count);
  await page.waitForTimeout(90);
}

async function shift(canvas, page) {
  await canvas.focus();
  await canvas.press("Space");
  await page.waitForTimeout(70);
}

async function pressFor(canvas, key, ms, page) {
  await canvas.focus();
  await canvas.press(key, { delay: Math.max(25, Math.min(180, Math.round(ms))) });
  await page.waitForTimeout(15);
}

async function canvasAlive(canvas) {
  try {
    return await canvas.isVisible();
  } catch {
    return false;
  }
}

async function moveToward(canvas, data, target, page, maxSteps = 28) {
  for (let step = 0; step < maxSteps; step += 1) {
    if (!await canvasAlive(canvas)) return false;
    let dead;
    let draftOpen;
    let x;
    let y;
    try {
      [dead, draftOpen, x, y] = await Promise.all([
        data("dead"),
        data("draft-open"),
        data("x"),
        data("y"),
      ]);
    } catch (cause) {
      if (!await canvasAlive(canvas)) return false;
      throw cause;
    }
    if (bool(dead) || bool(draftOpen)) return false;
    const dx = target.x - Number(x);
    const dy = target.y - Number(y);
    if (Math.abs(dx) <= 9 && Math.abs(dy) <= 9) return true;
    const horizontal = Math.abs(dx) >= Math.abs(dy);
    const distance = horizontal ? Math.abs(dx) : Math.abs(dy);
    const key = horizontal ? (dx > 0 ? "ArrowRight" : "ArrowLeft") : (dy > 0 ? "ArrowDown" : "ArrowUp");
    const duration = Math.max(30, Math.min(150, distance / PLAYER_SPEED * 1000 * 0.72));
    try {
      await pressFor(canvas, key, duration, page);
    } catch (cause) {
      if (!await canvasAlive(canvas)) return false;
      throw cause;
    }
  }
  return false;
}

async function patrol(canvas, data, page) {
  const x = Number(await data("x"));
  const y = Number(await data("y"));
  // Keep the ordinary run in a compact central circuit. Enemies naturally
  // chase toward this circuit, so their normal Signal-XP drops remain close
  // enough to be collected by normal movement instead of being abandoned on
  // the far perimeter. This uses only keyboard movement and no pickup state.
  let key;
  if (y > 430 && x <= 1180) key = "ArrowUp";
  else if (y <= 430 && x < 1180) key = "ArrowRight";
  else if (x >= 1180 && y < 770) key = "ArrowDown";
  else if (y >= 770 && x > 620) key = "ArrowLeft";
  else if (x <= 620 && y > 430) key = "ArrowUp";
  else key = "ArrowRight";
  await canvas.focus();
  await canvas.press(key, { delay: 420 });
  await page.waitForTimeout(55);
}

function currentPressurePlan(snapshot) {
  if (!snapshot.active) return null;
  const ordinal = Number(snapshot.ordinal);
  if (!Number.isInteger(ordinal) || ordinal < 0 || !snapshot.attack) return null;
  return planCR3Pressure((snapshot.seed ^ BOSS_SEED_XOR) >>> 0, ordinal, snapshot.attack);
}

function targetForPoint(bossX, bossY, point, scale) {
  return Object.freeze({ x: bossX - point.x * scale, y: bossY - point.y * scale });
}

function chooseDeltaTarget(points, bossX, bossY, scale, ordinal) {
  return targetForPoint(bossX, bossY, points[Math.abs(ordinal) % points.length], scale);
}

function chooseSafeDodgeTarget(bossX, bossY, plan, playerX, playerY) {
  const offsets = [
    [155, 0], [110, 110], [0, 155], [-110, 110],
    [-155, 0], [-110, -110], [0, -155], [110, -110],
  ];
  const candidates = offsets
    .map(([dx, dy]) => ({ x: bossX + dx, y: bossY + dy }))
    .filter(candidate => !plan || !cr3PressureHitsPoint(plan, bossX, bossY, candidate.x, candidate.y));
  assert.ok(candidates.length > 0, "boss telegraph must leave at least one deterministic dodge point");
  candidates.sort((a, b) => {
    const ad = (a.x - playerX) ** 2 + (a.y - playerY) ** 2;
    const bd = (b.x - playerX) ** 2 + (b.y - playerY) ** 2;
    return bd - ad;
  });
  return candidates[0];
}

async function naturalVictory() {
  await testGame(gameDirectory, {
    width: 960,
    height: 800,
    timeout: 720_000,
    screenshot: resolve("artifacts/rare-shift-cr3e-natural-win-host-960.png"),
    check: async ({ page, game }) => {
      await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
      const flags = await game.locator("body").evaluate(() => ({
        cr3b: window.__RARE_SHIFT_CR3B_RUNTIME__ === true,
        cr3d: window.__RARE_SHIFT_CR3D_RUNTIME__ === true,
      }));
      assert.deepEqual(flags, { cr3b: false, cr3d: false }, "CR-3E natural proof must not enable controlled runtime flags");

      const scan = game.locator('[data-stage="scan"]');
      const frameA = Number(await scan.getAttribute("data-frame-a"));
      const frameB = Number(await scan.getAttribute("data-frame-b"));
      const aRows = parseRows(await game.locator('[data-scan-view="frame-a"]').getAttribute("data-rows"));
      const bRows = parseRows(await game.locator('[data-scan-view="frame-b"]').getAttribute("data-rows"));
      const points = { A: deltaPoints(aRows, bRows, "A"), B: deltaPoints(aRows, bRows, "B") };

      await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
      const canvas = game.locator("canvas");
      await canvas.waitFor({ state: "visible" });
      await canvas.focus();
      const data = name => canvas.getAttribute(`data-${name}`, { timeout: 2_000 });

      const observedStages = new Set();
      const observedCheckpoints = new Set();
      const observedBossPhases = new Set();
      const observedEvolutions = new Set();
      let maxCores = 0;
      let maxElites = 0;
      let maxBossAcceptedDamage = 0;
      let maxBossShiftAccepted = 0;
      let maxPressureResolves = 0;
      let moveTicks = 0;
      let botShifts = 0;
      let bossAttackStep = 0;
      const seed = Number(await data("seed"));
      assert.ok(Number.isInteger(seed) && seed >= 0, `natural run seed must be present, got ${seed}`);

      const record = async () => {
        observedStages.add(String(await data("director-stage")));
        for (const checkpoint of list(await data("spawned-checkpoints"))) observedCheckpoints.add(checkpoint);
        for (const evolution of list(await data("cr3d-evolved-weapons"))) observedEvolutions.add(evolution);
        const bossPhase = String(await data("cr3-boss-phase") ?? "");
        if (bossPhase) observedBossPhases.add(bossPhase);
        maxCores = Math.max(maxCores, Number(await data("evolution-cores")) || 0);
        maxElites = Math.max(maxElites, Number(await data("elites-defeated")) || 0);
        maxBossAcceptedDamage = Math.max(maxBossAcceptedDamage, Number(await data("cr3-boss-damage-accepted")) || 0);
        maxBossShiftAccepted = Math.max(maxBossShiftAccepted, Number(await data("cr3-boss-shift-accepted")) || 0);
        maxPressureResolves = Math.max(maxPressureResolves, Number(await data("cr3-pressure-resolve-events")) || 0);
      };

      const failIfTerminatedBeforeBoss = async () => {
        const results = game.locator('[data-stage="results"]');
        if (await results.count()) {
          throw new Error(`CR-3E natural win terminated before boss: outcome=${await results.getAttribute("data-outcome")} finalHp=${await results.getAttribute("data-final-hp")} damage=${await results.getAttribute("data-damage-taken")}`);
        }
        if (!await canvasAlive(canvas)) throw new Error("CR-3E natural win lost the survival canvas before the boss handoff.");
      };

      const preBossDeadline = Date.now() + 430_000;
      while (Date.now() < preBossDeadline) {
        await failIfTerminatedBeforeBoss();
        await record();
        if (bool(await data("dead"))) {
          throw new Error(`CR-3E natural win died before boss: stage=${await data("director-stage")} elapsed=${await data("director-elapsed-ms")} hp=${await data("hp")} level=${await data("level")} kills=${await data("kills")}`);
        }
        if (bool(await data("draft-open"))) {
          await chooseDraft(page, canvas, data, "CR3E_WIN", true);
          continue;
        }
        if (bool(await data("boss-pending")) && String(await data("cr3-boss-active")) === "true") break;
        await patrol(canvas, data, page);
        moveTicks += 1;
        if (moveTicks % 7 === 0 && !bool(await data("draft-open"))) {
          await shift(canvas, page);
          botShifts += 1;
        }
      }

      await failIfTerminatedBeforeBoss();
      await record();
      assert.equal(await data("boss-pending"), "true", "natural run must reach the real BOSS_PENDING handoff");
      assert.equal(await data("cr3-boss-active"), "true", "THE DESYNC must initialize from the natural 360s handoff");
      assert.ok(Number(await data("director-elapsed-ms")) >= 360_000, "boss handoff may not be time-injected");
      for (const stage of ["STAGE_I", "STAGE_II", "STAGE_III", "STAGE_IV", "BOSS_PENDING"]) {
        assert.ok(observedStages.has(stage), `natural run must observe ${stage}; got ${[...observedStages].join(",")}`);
      }
      for (const checkpoint of ["ELITE_I", "CHECKPOINT_ELITE", "ELITE_II"]) {
        assert.ok(observedCheckpoints.has(checkpoint), `natural run must observe ${checkpoint}; got ${[...observedCheckpoints].join(",")}`);
      }
      assert.ok(botShifts >= 8, `natural run must exercise SHIFT repeatedly, got ${botShifts}`);
      console.log(`CR3E_BOSS_ENTRY=L${await data("level")}:HP${await data("hp")}:K${await data("kills")}:XP${await data("xp")}`);

      const bossDeadline = Date.now() + 150_000;
      while (Date.now() < bossDeadline) {
        const victory = game.locator('[data-stage="results"][data-outcome="VICTORY"]');
        if (await victory.count()) break;
        const defeat = game.locator('[data-stage="results"][data-outcome="DEFEAT"]');
        if (await defeat.count()) {
          throw new Error(`CR-3E natural win died during THE DESYNC: finalHp=${await defeat.getAttribute("data-final-hp")} damage=${await defeat.getAttribute("data-damage-taken")}`);
        }
        if (!await canvasAlive(canvas)) {
          await page.waitForTimeout(50);
          continue;
        }
        await record();
        if (bool(await data("dead"))) throw new Error(`CR-3E natural win died during THE DESYNC at HP=${await data("cr3-boss-hp")} phase=${await data("cr3-boss-phase")}`);
        if (bool(await data("draft-open"))) {
          await chooseDraft(page, canvas, data, "CR3E_BOSS", true);
          continue;
        }

        const bossPhase = String(await data("cr3-boss-phase") ?? "");
        if (bossPhase === "DEFEATED") {
          await page.waitForTimeout(40);
          continue;
        }
        const vulnerability = String(await data("cr3-boss-vulnerability") ?? "");
        assert.ok(vulnerability === "A" || vulnerability === "B", `boss vulnerability unavailable: ${vulnerability}`);

        if (bossPhase === "BREAK_WINDOW" && String(await data("cr3-boss-break-open")) !== "true") {
          const expected = String(await data("cr3-boss-expected-response") ?? "");
          assert.ok(expected === "A" || expected === "B", `BREAK expected response unavailable: ${expected}`);
          if (String(await data("phase")) === expected) {
            await shift(canvas, page);
            botShifts += 1;
          }
          await shift(canvas, page);
          botShifts += 1;
          await page.waitForTimeout(30);
          continue;
        }

        if (String(await data("phase")) !== vulnerability) {
          await shift(canvas, page);
          botShifts += 1;
          await page.waitForTimeout(25);
          continue;
        }

        const bossX = Number(await data("cr3-boss-x"));
        const bossY = Number(await data("cr3-boss-y"));
        const rank = Number(await data("delta-rank"));
        const scale = deltaWorldScale(rank);
        const pressureSnapshot = {
          active: String(await data("cr3-pressure-active")) === "true",
          seed,
          ordinal: await data("cr3-pressure-ordinal"),
          attack: String(await data("cr3-pressure-attack") ?? ""),
        };
        const plan = currentPressurePlan(pressureSnapshot);

        if (plan) {
          const playerX = Number(await data("x"));
          const playerY = Number(await data("y"));
          const dodge = chooseSafeDodgeTarget(bossX, bossY, plan, playerX, playerY);
          await moveToward(canvas, data, dodge, page, 2);
          await page.waitForTimeout(45);
          continue;
        }

        const attackTarget = chooseDeltaTarget(points[vulnerability], bossX, bossY, scale, bossAttackStep);
        bossAttackStep += 1;
        await moveToward(canvas, data, attackTarget, page, 2);
        await page.waitForTimeout(45);
      }

      const results = game.locator('[data-stage="results"][data-outcome="VICTORY"]');
      await results.waitFor({ state: "visible", timeout: 10_000 });
      assert.equal(Number(await results.getAttribute("data-terminal-pause-events")), 1, "terminal simulation must stop exactly once");
      assert.equal(await results.getAttribute("data-boss-result"), "DEFEATED");
      assert.equal(Number(await results.getAttribute("data-frame-a")), frameA);
      assert.equal(Number(await results.getAttribute("data-frame-b")), frameB);
      assert.ok(Number(await results.getAttribute("data-final-hp")) > 0, "natural win must remain alive");
      assert.match(await results.getAttribute("data-fingerprint"), /^CR3D-[0-9a-f]{8}$/u);
      await game.locator('[data-results-view="reconstruction-a"]').waitFor({ state: "visible" });
      await game.locator('[data-results-view="reconstruction-b"]').waitFor({ state: "visible" });

      for (const phase of ["ALIGNMENT", "CROSS_SPLIT", "BREAK_WINDOW", "DEFEATED"]) {
        assert.ok(observedBossPhases.has(phase) || phase === "DEFEATED", `natural boss proof must observe ${phase}; got ${[...observedBossPhases].join(",")}`);
      }
      assert.ok(maxBossAcceptedDamage > 0, "natural boss proof must produce accepted weapon damage");
      assert.ok(maxBossShiftAccepted > 0, "natural boss proof must open BREAK through accepted SHIFT response");
      assert.ok(maxPressureResolves > 0, "natural boss proof must survive resolved boss pressure");
      assert.ok(maxElites >= 2, `natural complete run must defeat multiple elites, got ${maxElites}`);

      await page.locator(".rf-game-frame").screenshot({ path: resolve("artifacts/rare-shift-cr3e-natural-win-960.png") });
      console.log(`CR3E_NATURAL_WIN_SEED=${seed}`);
      console.log(`CR3E_NATURAL_WIN_STAGES=${[...observedStages].join(",")}`);
      console.log(`CR3E_NATURAL_WIN_CHECKPOINTS=${[...observedCheckpoints].join(",")}`);
      console.log(`CR3E_NATURAL_WIN_BOSS_PHASES=${[...observedBossPhases].join(",")}`);
      console.log(`CR3E_NATURAL_WIN_EVOLUTIONS=${[...observedEvolutions].join(",") || "NONE"}`);
      console.log(`CR3E_NATURAL_WIN_MAX_CORES=${maxCores}`);
      console.log(`CR3E_NATURAL_WIN_MAX_ELITES=${maxElites}`);
      console.log("RARE_SHIFT_CR3E_NATURAL_WIN_960=PASS");
    },
  });
}

async function naturalDeathRetry() {
  await testGame(gameDirectory, {
    width: 960,
    height: 800,
    timeout: 180_000,
    screenshot: resolve("artifacts/rare-shift-cr3e-natural-death-host-960.png"),
    check: async ({ page, game }) => {
      await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
      const flags = await game.locator("body").evaluate(() => ({
        cr3b: window.__RARE_SHIFT_CR3B_RUNTIME__ === true,
        cr3d: window.__RARE_SHIFT_CR3D_RUNTIME__ === true,
      }));
      assert.deepEqual(flags, { cr3b: false, cr3d: false }, "CR-3E natural death proof must not enable controlled runtime flags");

      await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
      let canvas = game.locator("canvas");
      await canvas.waitFor({ state: "visible" });
      await canvas.focus();
      const data = name => canvas.getAttribute(`data-${name}`, { timeout: 2_000 });
      const seed = Number(await data("seed"));
      const deadline = Date.now() + 145_000;

      while (Date.now() < deadline) {
        const failure = game.locator('[data-stage="results"][data-outcome="DEFEAT"]');
        if (await failure.count()) break;
        if (!await canvasAlive(canvas)) {
          await page.waitForTimeout(50);
          continue;
        }
        if (bool(await data("draft-open"))) {
          await chooseDraft(page, canvas, data, "CR3E_DEATH", false);
          continue;
        }
        await page.waitForTimeout(250);
      }

      const failure = game.locator('[data-stage="results"][data-outcome="DEFEAT"]');
      await failure.waitFor({ state: "visible", timeout: 10_000 });
      assert.equal(Number(await failure.getAttribute("data-final-hp")), 0);
      assert.ok(Number(await failure.getAttribute("data-damage-taken")) > 0, "natural death must contain accepted combat damage");
      assert.equal(Number(await failure.getAttribute("data-terminal-pause-events")), 1);
      assert.match(await failure.getAttribute("data-fingerprint"), /^CR3D-[0-9a-f]{8}$/u);

      await game.getByRole("button", { name: /RUN AGAIN/i }).click();
      canvas = game.locator("canvas");
      await canvas.waitFor({ state: "visible" });
      assert.equal(await canvas.getAttribute("data-dead"), "false");
      assert.equal(Number(await canvas.getAttribute("data-hp")), 100);
      assert.ok(Number(await canvas.getAttribute("data-director-elapsed-ms")) < 2_000, "retry must start a fresh natural run");

      console.log(`CR3E_NATURAL_DEATH_SEED=${seed}`);
      console.log("RARE_SHIFT_CR3E_NATURAL_DEATH_RETRY_960=PASS");
    },
  });
}

await naturalVictory();
await naturalDeathRetry();
console.log("RARE_SHIFT_CR3E_COMPLETE_RUN_BROWSER=PASS");
