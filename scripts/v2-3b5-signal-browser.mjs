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
  const control = game.getByRole("checkbox", { name: /Reduce motion/i });
  if (width === 390) {
    await control.check();
    assert.equal(await control.isChecked(), true);
  }
  return control;
}
async function mount(game) {
  await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
  const canvas = game.locator("canvas");
  await canvas.waitFor({ state: "visible" });
  await canvas.focus();
  return canvas;
}
async function setFixture(game, rank) {
  await game.locator("body").evaluate((_, value) => { window.__RARE_SHIFT_V23B5_SIGNAL_RANK__ = value; }, rank);
}
async function clearDraft(canvas, data) {
  if (!bool(await data("draft-open"))) return;
  const ids = list(await data("draft-ids"));
  const count = Number(await data("draft-count"));
  let index = ids.indexOf("FIELD_REPAIR");
  if (index < 0) index = ids.indexOf("SIGNAL_MAGNET");
  if (index < 0) index = ids.indexOf("ECHO_RANK");
  if (index < 0) index = ids.indexOf("ORBIT_RANK");
  if (index < 0) index = ids.indexOf("DELTA_RANK");
  if (index < 0) index = ids.findIndex(id => id !== "SIGNAL_RANK");
  if (index < 0) index = 0;
  await clickDraft(canvas, index, count);
}

function naturalQualification(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    const reduced = await enableReducedMotion(game, width);
    const canvas = await mount(game);
    const data = name => canvas.getAttribute(`data-${name}`);
    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;

    const moveUntilDraft = async (minimumLevel, deadlineMs, label) => {
      const deadline = Date.now() + deadlineMs;
      while (Date.now() < deadline && !(bool(await data("draft-open")) && Number(await data("level")) >= minimumLevel)) {
        if (bool(await data("dead"))) throw new Error(`died before ${label}; L${await data("level")}; HP${await data("hp")}; K${await data("kills")}; E${await data("director-elapsed-ms")}`);
        if (!bool(await data("draft-open"))) {
          await canvas.press(route[routeIndex++ % route.length], { delay: 520 });
          await page.waitForTimeout(160);
          if (routeIndex % 5 === 0 && !bool(await data("draft-open"))) {
            await shift(canvas, width);
            await page.waitForTimeout(95);
          }
        }
      }
      assert.equal(await data("draft-open"), "true", `expected ${label}; L${await data("level")}; HP${await data("hp")}; K${await data("kills")}; E${await data("director-elapsed-ms")}`);
      assert.ok(Number(await data("level")) >= minimumLevel, `${label} must be level ${minimumLevel}+`);
    };

    const choose = async (id, label) => {
      const ids = list(await data("draft-ids"));
      const count = Number(await data("draft-count"));
      assert.equal(ids.length, count, `${label} ids/count mismatch`);
      assert.equal(new Set(ids).size, ids.length, `${label} choices must be distinct`);
      const index = ids.indexOf(id);
      assert.ok(index >= 0, `${label} requires ${id}: ${ids.join(",")}`);
      console.log(`V2_3B5_NATURAL_DRAFT_${width}=L${await data("level")}:HP${await data("hp")}:${ids.join(",")}=>${id}`);
      await clickDraft(canvas, index, count);
      await page.waitForTimeout(120);
    };

    assert.equal(await data("signal-qualification-fixture"), "");
    await moveUntilDraft(2, 60_000, "level-2 ORBIT draft");
    assert.deepEqual(new Set(list(await data("draft-ids"))), new Set(["ORBIT_NODES", "VECTOR_NEEDLE", "DELTA_RANK"]));
    await choose("ORBIT_NODES", "level-2 ORBIT draft");

    await moveUntilDraft(3, 70_000, "level-3 ECHO draft");
    await choose("ECHO_MINE", "level-3 ECHO draft");

    await moveUntilDraft(4, 85_000, "level-4 SIGNAL draft");
    await choose("SIGNAL_ARC", "level-4 SIGNAL draft");
    assert.equal(await data("signal-rank"), "1");
    assert.equal(await data("weapon-slots-used"), "4");

    // CR-2 expands the legal Level-5+ draft economy with Protocols. The inherited
    // B5 contract therefore proves the natural onboarding handoff, while the
    // controlled Rank-II/IV/V browser cases below remain the authoritative
    // behavioral proofs for higher SIGNAL ranks.
    await moveUntilDraft(5, 95_000, "level-5 CR-2 production draft");
    assert.equal(await data("cr2-draft-active"), "true", "Level 5 must use the CR-2 production draft");
    assert.equal(await data("signal-rank"), "1", "natural onboarding must preserve SIGNAL Rank I before any higher-rank choice");
    assert.equal(await data("weapon-slots-used"), "4", "natural onboarding must retain the four-slot build");

    const ids = list(await data("draft-ids"));
    const count = Number(await data("draft-count"));
    assert.equal(count, 3, "CR-2 production draft must remain exactly three choices");
    assert.equal(ids.length, count, "CR-2 live draft ids/count mismatch");
    assert.equal(new Set(ids).size, ids.length, "CR-2 live draft choices must be distinct");

    const seed = Number(await data("seed"));
    const level = Number(await data("level"));
    const state = await liveProgressionState(data);
    const currentCandidateIds = list(await data("draft-candidate-ids"));
    const expectedCurrent = buildV23ADraft(seed, level, state).choices.map(choice => choice.candidateId);
    assert.deepEqual(currentCandidateIds, expectedCurrent, "natural Level-5 live triple must exactly match deterministic production draft");

    assert.equal(await data("signal-qualification-fixture"), "");
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduced.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b5-natural-cr2-handoff-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B5_NATURAL_CR2_HANDOFF_${width}=PASS`);
  };
}

function rank2Qualification(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    const reduced = await enableReducedMotion(game, width);
    await setFixture(game, 2);
    const canvas = await mount(game);
    const data = name => canvas.getAttribute(`data-${name}`);
    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;

    assert.equal(await data("signal-qualification-fixture"), "SIGNAL_RANK_2");
    assert.equal(await data("signal-rank"), "2");
    assert.equal(await data("signal-max-targets"), "4");
    assert.equal(await data("signal-damage-profile"), "10,8,6,5");

    const deadline = Date.now() + 65_000;
    let fourTargetObserved = false;
    while (Date.now() < deadline && !fourTargetObserved) {
      if (bool(await data("dead"))) throw new Error("died before a real controlled Rank-II four-target SIGNAL cast");
      if (bool(await data("draft-open"))) { await clearDraft(canvas, data); await page.waitForTimeout(80); continue; }
      await canvas.press(route[routeIndex++ % route.length], { delay: 480 });
      await page.waitForTimeout(90);
      if (routeIndex % 5 === 0) { await shift(canvas, width); await page.waitForTimeout(70); }
      const ids = list(await data("signal-last-chain-ids"));
      const damages = list(await data("signal-last-chain-damage")).map(Number);
      if (ids.length === 4 && damages.join(",") === "10,8,6,5") fourTargetObserved = true;
    }
    assert.equal(fourTargetObserved, true, "Rank II must produce a real four-target [10,8,6,5] cast");
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduced.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b5-rank2-four-link-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B5_SIGNAL_RANK2_FOUR_LINK_${width}=PASS`);
  };
}

function rank4Qualification(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    const reduced = await enableReducedMotion(game, width);
    await setFixture(game, 4);
    const canvas = await mount(game);
    const data = name => canvas.getAttribute(`data-${name}`);
    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;

    assert.equal(await data("signal-qualification-fixture"), "SIGNAL_RANK_4");
    assert.equal(await data("signal-rank"), "4");
    assert.equal(await data("signal-common-bonus-range"), "240");
    assert.equal(await data("signal-routing"), "NEAREST");

    const beforeInvalidations = Number(await data("signal-shift-graph-invalidations"));
    await shift(canvas, width);
    await page.waitForTimeout(80);
    assert.ok(Number(await data("signal-shift-graph-invalidations")) > beforeInvalidations, "Rank IV SHIFT must invalidate prior graph evidence");

    // The qualification fixture may cast before this observation loop begins.
    // Use event-relative counters so an earlier qualifying cast cannot make us
    // inspect a later ordinary cast as if it were the boosted relay event.
    const extendedBefore = Number(await data("signal-extended-common-relay-casts"));
    const commonBonusBefore = Number(await data("signal-common-bonus-casts"));
    const deadline = Date.now() + 65_000;
    let extendedObserved = false;
    let observedEdgeRanges = [];
    let observedCommonBonus = [];
    while (Date.now() < deadline && !extendedObserved) {
      if (bool(await data("dead"))) throw new Error("died before real Rank-IV extended COMMON relay");
      if (bool(await data("draft-open"))) { await clearDraft(canvas, data); await page.waitForTimeout(80); continue; }
      await canvas.press(route[routeIndex++ % route.length], { delay: 480 });
      await page.waitForTimeout(90);
      if (routeIndex % 5 === 0) { await shift(canvas, width); await page.waitForTimeout(70); }
      const extendedNow = Number(await data("signal-extended-common-relay-casts"));
      if (extendedNow > extendedBefore) {
        observedEdgeRanges = list(await data("signal-last-chain-edge-ranges")).map(Number);
        observedCommonBonus = list(await data("signal-last-chain-common-bonus"));
        extendedObserved = true;
      }
    }
    assert.equal(extendedObserved, true, "Rank IV must produce a new real >180px <=240px COMMON relay edge during observation");
    assert.ok(Number(await data("signal-common-bonus-casts")) > commonBonusBefore, "Rank IV observed relay must increment the COMMON-bonus cast counter");
    assert.ok(observedEdgeRanges.includes(240), `qualifying Rank-IV relay must expose a 240px edge range: ${observedEdgeRanges.join(",")}`);
    assert.ok(observedCommonBonus.includes("1"), `qualifying Rank-IV relay must mark the COMMON bonus edge: ${observedCommonBonus.join(",")}`);
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduced.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b5-rank4-common-relay-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B5_SIGNAL_RANK4_RESONANT_RELAY_${width}=PASS`);
  };
}

function rank5Qualification(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    const reduced = await enableReducedMotion(game, width);
    await setFixture(game, 5);
    const canvas = await mount(game);
    const data = name => canvas.getAttribute(`data-${name}`);
    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;

    assert.equal(await data("signal-qualification-fixture"), "SIGNAL_RANK_5");
    assert.equal(await data("signal-rank"), "5");
    assert.equal(await data("signal-routing"), "FORWARD_DEGREE");
    assert.equal(await data("signal-damage-profile"), "10,9,8,7");

    const deadline = Date.now() + 70_000;
    let controlledObserved = false;
    while (Date.now() < deadline && !controlledObserved) {
      if (bool(await data("dead"))) throw new Error("died before real Rank-V controlled routing cast");
      if (bool(await data("draft-open"))) { await clearDraft(canvas, data); await page.waitForTimeout(80); continue; }
      await canvas.press(route[routeIndex++ % route.length], { delay: 480 });
      await page.waitForTimeout(90);
      if (routeIndex % 5 === 0) { await shift(canvas, width); await page.waitForTimeout(70); }
      controlledObserved = Number(await data("signal-controlled-routing-casts")) > 0;
    }
    assert.equal(controlledObserved, true, "Rank V must produce a real cast whose topology differs from nearest-only routing");
    const degrees = String(await data("signal-last-chain-forward-degrees")).split(",").filter(value => value !== "");
    assert.ok(degrees.length >= 1, "Rank V controlled route must expose forward-degree evidence");
    assert.ok(degrees.some(value => Number(value) >= 1));
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduced.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b5-rank5-chain-control-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B5_SIGNAL_RANK5_CHAIN_CONTROL_${width}=PASS`);
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 180_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b5-natural-host-${width}.png`),
    check: naturalQualification(width),
  });
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 100_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b5-rank2-host-${width}.png`),
    check: rank2Qualification(width),
  });
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 100_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b5-rank4-host-${width}.png`),
    check: rank4Qualification(width),
  });
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 105_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b5-rank5-host-${width}.png`),
    check: rank5Qualification(width),
  });
}

console.log("RARE_SHIFT_V2_3B5_REDUCED_MOTION=PASS");
console.log("RARE_SHIFT_V2_3B5_BROWSER=PASS");