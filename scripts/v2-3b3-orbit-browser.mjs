import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";
import { buildV23ADraft } from "../games/rare-shift/src/progression-core.ts";

const gameDirectory = resolve("games/rare-shift");
await mkdir(resolve("artifacts"), { recursive: true });

function bool(value) {
  assert.ok(value === "true" || value === "false", `expected dataset boolean, got ${String(value)}`);
  return value === "true";
}
function list(value) { return String(value ?? "").split(",").filter(Boolean); }
async function liveProgressionState(data) {
  const weapons = {
    DELTA: { rank: Number(await data("delta-rank")), evolved: false },
  };
  for (const [family, ownedKey, rankKey] of [
    ["VECTOR", "vector-owned", "vector-rank"],
    ["ORBIT", "orbit-owned", "orbit-rank"],
    ["ECHO", "echo-owned", "echo-rank"],
    ["SIGNAL", "signal-owned", "signal-rank"],
  ]) {
    if (bool(await data(ownedKey))) weapons[family] = { rank: Number(await data(rankKey)), evolved: false };
  }
  const protocols = {};
  for (const entry of list(await data("protocols"))) {
    const [family, rankText] = entry.split(":");
    const rank = Number(rankText);
    assert.ok(family && Number.isInteger(rank) && rank >= 1 && rank <= 3, `invalid live Protocol entry ${entry}`);
    protocols[family] = rank;
  }
  return {
    weapons,
    protocols,
    evolutionCores: Number(await data("evolution-cores")),
    refracts: Number(await data("refracts")),
    rerollNonce: Number(await data("reroll-nonce")),
    hp: Number(await data("hp")),
    maxHp: 100,
    pickupRadius: Number(await data("pickup-radius")),
  };
}
function numbers(value) { return list(value).map(Number); }
function centers(count) {
  if (count === 1) return [480];
  if (count === 2) return [350, 610];
  if (count === 3) return [220, 480, 740];
  throw new Error(`unexpected draft count ${count}`);
}
function circularDistance(a, b) {
  const tau = Math.PI * 2;
  const normalize = value => ((value % tau) + tau) % tau;
  const raw = Math.abs(normalize(a) - normalize(b));
  return Math.min(raw, tau - raw);
}
async function clickDraft(canvas, index, count) {
  const box = await canvas.boundingBox();
  assert.ok(box, "draft canvas must have a bounding box");
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
async function enableReducedMotion(game, width) {
  const reduceMotion = game.getByRole("checkbox", { name: /Reduce motion/i });
  if (width === 390) {
    await reduceMotion.check();
    assert.equal(await reduceMotion.isChecked(), true);
  }
  return reduceMotion;
}
async function mount(game) {
  await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
  const canvas = game.locator("canvas");
  await canvas.waitFor({ state: "visible" });
  await canvas.focus();
  return canvas;
}
async function setRankFixture(game, rank) {
  await game.locator("body").evaluate((_, value) => { window.__RARE_SHIFT_V23B3_ORBIT_RANK__ = value; }, rank);
}
async function clearDraftAvoidOrbitRank(canvas, data) {
  if (!bool(await data("draft-open"))) return;
  const ids = list(await data("draft-ids"));
  const count = Number(await data("draft-count"));
  let index = ids.indexOf("FIELD_REPAIR");
  if (index < 0) index = ids.indexOf("SIGNAL_MAGNET");
  if (index < 0) index = ids.indexOf("DELTA_RANK");
  if (index < 0) index = ids.findIndex(id => id !== "ORBIT_RANK");
  if (index < 0) index = 0;
  await clickDraft(canvas, index, count);
}

function naturalQualification(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    const reduceMotion = await enableReducedMotion(game, width);
    const canvas = await mount(game);
    const data = name => canvas.getAttribute(`data-${name}`);
    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;

    assert.equal(await data("level"), "1");
    assert.equal(await data("orbit-owned"), "false");
    assert.equal(await data("orbit-qualification-fixture"), "");

    const moveUntilDraft = async (minimumLevel, deadlineMs, label) => {
      const deadline = Date.now() + deadlineMs;
      while (Date.now() < deadline && !(bool(await data("draft-open")) && Number(await data("level")) >= minimumLevel)) {
        if (bool(await data("dead"))) throw new Error(`died before ${label}; L${await data("level")}; HP${await data("hp")}; K${await data("kills")}; O${await data("orbit-rank")}`);
        if (!bool(await data("draft-open"))) {
          await canvas.press(route[routeIndex++ % route.length], { delay: 520 });
          await page.waitForTimeout(160);
          if (routeIndex % 5 === 0 && !bool(await data("draft-open"))) {
            await shift(canvas, width);
            await page.waitForTimeout(95);
          }
        }
      }
      assert.equal(await data("draft-open"), "true", `expected ${label}`);
      assert.ok(Number(await data("level")) >= minimumLevel, `${label} must be level ${minimumLevel}+`);
    };

    const choose = async (id, label) => {
      const ids = list(await data("draft-ids"));
      const count = Number(await data("draft-count"));
      assert.equal(ids.length, count, `${label} ids/count mismatch`);
      assert.equal(new Set(ids).size, ids.length, `${label} choices must be distinct`);
      const index = ids.indexOf(id);
      assert.ok(index >= 0, `${label} requires ${id}: ${ids.join(",")}`);
      console.log(`V2_3B3_NATURAL_DRAFT_${width}=L${await data("level")}:HP${await data("hp")}:${ids.join(",")}=>${id}`);
      await clickDraft(canvas, index, count);
      await page.waitForTimeout(180);
    };

    await moveUntilDraft(2, 58_000, "level-2 ORBIT acquisition draft");
    assert.equal(await data("level"), "2", "same-frame pickup integrity must expose Level 2 first");
    const l2 = list(await data("draft-ids"));
    assert.deepEqual(new Set(l2), new Set(["ORBIT_NODES", "VECTOR_NEEDLE", "DELTA_RANK"]));
    await choose("ORBIT_NODES", "level-2 ORBIT acquisition draft");
    assert.equal(await data("orbit-owned"), "true");
    assert.equal(await data("orbit-rank"), "1");
    assert.equal(await data("orbit-node-count"), "1");

    await moveUntilDraft(3, 68_000, "level-3 local-memory draft");
    await choose("ECHO_MINE", "level-3 local-memory draft");

    await moveUntilDraft(4, 82_000, "level-4 wave-clear draft");
    await choose("SIGNAL_ARC", "level-4 wave-clear draft");
    assert.equal(await data("weapon-slots-used"), "4");

    // CR-2 expands the Level-5+ draft economy with Protocols, so the inherited
    // requirement that ORBIT Rank II must surface before the natural browser bot
    // dies is no longer a stable progression invariant. Natural play still proves
    // genuine ORBIT acquisition and an exact handoff into the production CR-2 draft.
    await moveUntilDraft(5, 90_000, "level-5 CR-2 ORBIT handoff draft");
    assert.equal(await data("orbit-qualification-fixture"), "");
    assert.equal(await data("orbit-owned"), "true");
    assert.equal(await data("orbit-rank"), "1", "natural handoff must precede controlled higher-rank proof");
    assert.equal(await data("orbit-node-count"), "1");
    assert.equal(await data("weapon-slots-used"), "4");
    assert.equal(await data("cr2-draft-active"), "true");
    const ids = list(await data("draft-ids"));
    const count = Number(await data("draft-count"));
    assert.equal(count, 3, "CR-2 ORBIT handoff must render exactly three choices");
    assert.equal(ids.length, count, "CR-2 ORBIT handoff ids/count mismatch");
    assert.equal(new Set(ids).size, ids.length, "CR-2 ORBIT handoff choices must be distinct");
    const state = await liveProgressionState(data);
    const expected = buildV23ADraft(Number(await data("seed")), Number(await data("level")), state).choices.map(choice => choice.candidateId);
    assert.deepEqual(list(await data("draft-candidate-ids")), expected, "live ORBIT CR-2 handoff must exactly match deterministic production draft");
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduceMotion.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b3-natural-cr2-handoff-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B3_NATURAL_CR2_HANDOFF_${width}=PASS`);
  };
}

function rank2Qualification(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    const reduceMotion = await enableReducedMotion(game, width);
    await setRankFixture(game, 2);
    const canvas = await mount(game);
    const data = name => canvas.getAttribute(`data-${name}`);
    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;

    assert.equal(await data("orbit-qualification-fixture"), "ORBIT_RANK_2");
    assert.equal(await data("orbit-owned"), "true");
    assert.equal(await data("orbit-rank"), "2");
    assert.equal(await data("orbit-node-count"), "2");
    assert.equal(await data("orbit-shear-events"), "0", "Rank II fixture must not fabricate PHASE SHEAR history");

    const nodeAngles = numbers(await data("orbit-node-angles"));
    assert.equal(nodeAngles.length, 2);
    assert.ok(Math.abs(circularDistance(nodeAngles[0], nodeAngles[1]) - Math.PI) < 0.01, `Rank II nodes must be 180 degrees apart: ${nodeAngles.join(",")}`);

    const hitsBefore = Number(await data("orbit-hits"));
    const hitDeadline = Date.now() + 45_000;
    while (Date.now() < hitDeadline && Number(await data("orbit-hits")) <= hitsBefore) {
      if (bool(await data("draft-open"))) {
        await clearDraftAvoidOrbitRank(canvas, data);
        await page.waitForTimeout(100);
        continue;
      }
      if (bool(await data("dead"))) throw new Error("died before a real controlled Rank-II ORBIT contact hit");
      await canvas.press(route[routeIndex++ % route.length], { delay: 300 });
      await page.waitForTimeout(140);
      if (routeIndex % 5 === 0) {
        await shift(canvas, width);
        await page.waitForTimeout(70);
      }
    }

    assert.ok(Number(await data("orbit-hits")) > hitsBefore, "Rank II fixture must produce real normal ORBIT contact damage");
    assert.equal(await data("orbit-rank"), "2");
    assert.equal(await data("orbit-node-count"), "2");
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduceMotion.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b3-rank2-spacing-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B3_ORBIT_RANK2_SPACING_${width}=PASS`);
    console.log(`RARE_SHIFT_V2_3B3_ORBIT_RANK2_CONTACT_${width}=PASS`);
  };
}

function shearQualification(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    const reduceMotion = await enableReducedMotion(game, width);
    await setRankFixture(game, 4);
    const canvas = await mount(game);
    const data = name => canvas.getAttribute(`data-${name}`);
    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;

    assert.equal(await data("orbit-qualification-fixture"), "ORBIT_RANK_4");
    assert.equal(await data("orbit-rank"), "4");
    assert.equal(await data("orbit-node-count"), "2");
    assert.equal(await data("orbit-shear-events"), "0", "Rank IV fixture must not credit a historical shear");
    assert.equal(await data("orbit-shear-ready"), "true");

    await page.waitForTimeout(1800);
    const angleBefore = Number(await data("orbit-angle"));
    const directionBefore = Number(await data("orbit-direction"));
    const reversalsBefore = Number(await data("orbit-reversals"));
    await shift(canvas, width);
    await page.waitForTimeout(70);
    assert.equal(Number(await data("orbit-reversals")), reversalsBefore + 1);
    assert.equal(Number(await data("orbit-direction")), -directionBefore);
    assert.equal(Number(await data("orbit-shear-events")), 1, "first eligible Rank-IV SHIFT must emit exactly one shear event");
    assert.equal(await data("orbit-shear-ready"), "false");
    const anchor = Number(await data("orbit-last-shift-anchor"));
    assert.ok(circularDistance(anchor, angleBefore) < 0.5, `Rank IV SHIFT must preserve the live anchor: ${angleBefore} -> ${anchor}`);

    const blocksBefore = Number(await data("orbit-shear-rearm-blocks"));
    const eventsBeforeBlockedShift = Number(await data("orbit-shear-events"));
    await shift(canvas, width);
    await page.waitForTimeout(70);
    assert.equal(Number(await data("orbit-shear-events")), eventsBeforeBlockedShift, "SHIFT inside 650ms rearm must not emit another shear");
    assert.ok(Number(await data("orbit-shear-rearm-blocks")) > blocksBefore, "blocked SHIFT must be observable without suppressing reversal");

    const hitBefore = Number(await data("orbit-shear-hits"));
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline && Number(await data("orbit-shear-hits")) <= hitBefore) {
      if (bool(await data("dead"))) throw new Error("died before real Rank-IV PHASE SHEAR hit");
      if (bool(await data("draft-open"))) { await clearDraftAvoidOrbitRank(canvas, data); await page.waitForTimeout(100); continue; }
      await canvas.press(route[routeIndex++ % route.length], { delay: 390 });
      await page.waitForTimeout(350);
      await shift(canvas, width);
      await page.waitForTimeout(80);
    }
    assert.ok(Number(await data("orbit-shear-hits")) > hitBefore, "Rank IV must produce a real post-SHIFT shear hit against a corporeal target");
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduceMotion.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b3-rank4-shear-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B3_ORBIT_RANK4_SHEAR_${width}=PASS`);
    console.log(`RARE_SHIFT_V2_3B3_ORBIT_RANK4_REARM_${width}=PASS`);
  };
}

function ringQualification(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    const reduceMotion = await enableReducedMotion(game, width);
    await setRankFixture(game, 5);
    const canvas = await mount(game);
    const data = name => canvas.getAttribute(`data-${name}`);

    assert.equal(await data("orbit-qualification-fixture"), "ORBIT_RANK_5");
    assert.equal(await data("orbit-rank"), "5");
    assert.equal(await data("orbit-node-count"), "3");
    assert.equal(await data("orbit-shear-events"), "0", "Rank V fixture must not reset/credit shear history");
    const angles = numbers(await data("orbit-node-angles"));
    assert.equal(angles.length, 3);
    for (let index = 0; index < 3; index += 1) {
      const next = (index + 1) % 3;
      assert.ok(Math.abs(circularDistance(angles[index], angles[next]) - 2 * Math.PI / 3) < 0.01, `Rank V nodes must be 120 degrees apart: ${angles.join(",")}`);
    }

    const reversalsBefore = Number(await data("orbit-reversals"));
    await page.waitForTimeout(900);
    await shift(canvas, width);
    await page.waitForTimeout(90);
    assert.equal(Number(await data("orbit-reversals")), reversalsBefore + 1);
    assert.equal(Number(await data("orbit-shear-events")), 1, "Rank V must retain Rank-IV shear behavior");
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduceMotion.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b3-rank5-ring-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B3_ORBIT_RANK5_RING_${width}=PASS`);
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 120_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b3-natural-host-${width}.png`),
    check: naturalQualification(width),
  });
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 75_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b3-rank2-host-${width}.png`),
    check: rank2Qualification(width),
  });
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 75_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b3-shear-host-${width}.png`),
    check: shearQualification(width),
  });
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 45_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b3-ring-host-${width}.png`),
    check: ringQualification(width),
  });
}

console.log("RARE_SHIFT_V2_3B3_REDUCED_MOTION=PASS");
