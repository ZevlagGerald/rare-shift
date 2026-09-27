import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";

const gameDirectory = resolve("games/rare-shift");
await mkdir(resolve("artifacts"), { recursive: true });

function bool(value) {
  assert.ok(value === "true" || value === "false", `expected dataset boolean, got ${String(value)}`);
  return value === "true";
}
function list(value) { return String(value ?? "").split(",").filter(Boolean); }
function centers(count) {
  if (count === 1) return [480];
  if (count === 2) return [350, 610];
  if (count === 3) return [220, 480, 740];
  throw new Error(`unexpected draft count ${count}`);
}
async function clickDraft(canvas, index, count) {
  const box = await canvas.boundingBox();
  assert.ok(box, "canvas must have a bounding box");
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
function assertChainPhase(kinds, phase) {
  for (const kind of kinds) {
    if (phase === "A") assert.notEqual(kind, "SPLIT_B", "Phase A ARC chain must exclude SPLIT_B ghosts");
    if (phase === "B") assert.notEqual(kind, "SPLIT_A", "Phase B ARC chain must exclude SPLIT_A ghosts");
  }
}

function qualify(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
    const canvas = game.locator("canvas");
    await canvas.waitFor({ state: "visible" });
    await canvas.focus();
    const data = name => canvas.getAttribute(`data-${name}`);
    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;

    assert.equal(await data("stage"), "v2-survival");
    assert.equal(await data("signal-owned"), "false");
    assert.equal(await data("signal-profile"), "rank1-phase-chain");
    assert.equal(await data("delta-fx"), "canonical-exclusive");

    const moveUntilDraft = async (minimumLevel, deadlineMs, label) => {
      const deadline = Date.now() + deadlineMs;
      while (Date.now() < deadline && !(bool(await data("draft-open")) && Number(await data("level")) >= minimumLevel)) {
        if (bool(await data("dead"))) throw new Error(`died before ${label}`);
        if (!bool(await data("draft-open"))) {
          await canvas.press(route[routeIndex++ % route.length], { delay: minimumLevel >= 4 ? 300 : 390 });
          await page.waitForTimeout(minimumLevel >= 4 ? 650 : 900);
          if (routeIndex % 5 === 0 && !bool(await data("draft-open"))) {
            await shift(canvas, width);
            await page.waitForTimeout(95);
          }
        }
      }
      assert.equal(await data("draft-open"), "true", `expected ${label}`);
      assert.ok(Number(await data("level")) >= minimumLevel, `${label} must be level ${minimumLevel}+`);
    };

    await moveUntilDraft(2, 58_000, "level-2 draft");
    const level2Ids = list(await data("draft-ids"));
    assert.equal(level2Ids.length, 3);
    assert.deepEqual(new Set(level2Ids), new Set(["ORBIT_NODES", "VECTOR_NEEDLE", "DELTA_RANK"]));
    assert.equal(level2Ids.includes("SIGNAL_ARC"), false);
    await clickDraft(canvas, level2Ids.indexOf("ORBIT_NODES"), 3);
    await page.waitForTimeout(220);
    assert.equal(await data("orbit-owned"), "true");
    assert.equal(await data("weapon-slots-used"), "2");

    await moveUntilDraft(3, 64_000, "level-3 ECHO draft");
    const level3Ids = list(await data("draft-ids"));
    assert.equal(level3Ids.length, 3);
    assert.equal(level3Ids.includes("ECHO_MINE"), true);
    assert.equal(level3Ids.includes("SIGNAL_ARC"), false, "SIGNAL ARC must not displace ECHO onboarding");
    await clickDraft(canvas, level3Ids.indexOf("ECHO_MINE"), 3);
    await page.waitForTimeout(240);
    assert.equal(await data("echo-owned"), "true");
    assert.equal(await data("weapon-slots-used"), "3");

    await moveUntilDraft(4, 76_000, "level-4 SIGNAL ARC draft");
    const level4Ids = list(await data("draft-ids"));
    assert.equal(level4Ids.length, 3, "level-4 ARC discovery must expose exactly three actionable choices");
    assert.equal(new Set(level4Ids).size, 3);
    const signalIndex = level4Ids.indexOf("SIGNAL_ARC");
    assert.ok(signalIndex >= 0, `SIGNAL ARC discovery guarantee missing: ${level4Ids.join(",")}`);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-2d-signal-draft-${width}.png`) });
    await clickDraft(canvas, signalIndex, 3);
    await page.waitForTimeout(260);
    assert.equal(await data("signal-owned"), "true");
    assert.equal(await data("weapon-slots-used"), "4");
    assert.equal(await data("draft-open"), "false");
    assert.equal(await data("controls-dimmed"), "false");

    const chainDeadline = Date.now() + 24_000;
    while (Date.now() < chainDeadline && Number(await data("signal-multi-target-casts")) < 1) {
      if (bool(await data("dead"))) throw new Error("died before SIGNAL ARC produced a natural multi-target cast");
      await canvas.press(route[routeIndex++ % route.length], { delay: 220 });
      await page.waitForTimeout(360);
    }
    assert.ok(Number(await data("signal-casts")) >= 1, "SIGNAL ARC must cast automatically");
    assert.ok(Number(await data("signal-hits")) >= 1, "SIGNAL ARC must deal real damage");
    assert.ok(Number(await data("signal-multi-target-casts")) >= 1, "SIGNAL ARC must prove real chain behavior");
    const preShiftIds = list(await data("signal-last-chain-ids"));
    const preShiftKinds = list(await data("signal-last-chain-kinds"));
    const preShiftDamage = list(await data("signal-last-chain-damage")).map(Number);
    assert.ok(preShiftIds.length >= 2 && preShiftIds.length <= 3);
    assert.equal(new Set(preShiftIds).size, preShiftIds.length);
    assert.deepEqual(preShiftDamage, [10, 8, 6].slice(0, preShiftIds.length));
    assertChainPhase(preShiftKinds, await data("signal-last-cast-phase"));

    const castsBeforeShift = Number(await data("signal-casts"));
    const invalidationsBefore = Number(await data("signal-shift-graph-invalidations"));
    const phaseBefore = await data("phase");
    await shift(canvas, width);
    await page.waitForTimeout(100);
    const phaseAfter = await data("phase");
    assert.notEqual(phaseAfter, phaseBefore);
    assert.ok(Number(await data("signal-shift-graph-invalidations")) > invalidationsBefore);
    assert.equal(await data("signal-last-chain-ids"), "", "SHIFT must invalidate cached ARC graph evidence");

    const postShiftDeadline = Date.now() + 12_000;
    while (Date.now() < postShiftDeadline && Number(await data("signal-casts")) <= castsBeforeShift) {
      if (bool(await data("dead"))) throw new Error("died before post-SHIFT SIGNAL ARC cast");
      await canvas.press(route[routeIndex++ % route.length], { delay: 180 });
      await page.waitForTimeout(300);
    }
    assert.ok(Number(await data("signal-casts")) > castsBeforeShift, "SIGNAL ARC must cast again after SHIFT");
    assert.equal(await data("signal-last-cast-phase"), phaseAfter, "post-SHIFT ARC cast must use rewritten phase authority");
    const postKinds = list(await data("signal-last-chain-kinds"));
    assertChainPhase(postKinds, phaseAfter);
    assert.ok(list(await data("signal-last-chain-ids")).length <= 3);
    assert.equal(await data("orbit-owned"), "true");
    assert.equal(await data("echo-owned"), "true");
    assert.equal(await data("delta-fx"), "canonical-exclusive");
    assert.equal(await data("dead"), "false");

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-2d-signal-qualified-${width}.png`) });
    console.log(`RARE_SHIFT_V2_2D_SIGNAL_${width}=PASS`);
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 215_000,
    screenshot: resolve(`artifacts/rare-shift-v2-2d-host-${width}.png`),
    check: qualify(width),
  });
}
