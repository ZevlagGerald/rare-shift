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

function ids(value) {
  return String(value ?? "").split(",").filter(Boolean);
}

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

function qualify(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
    const canvas = game.locator("canvas");
    await canvas.waitFor({ state: "visible" });
    await canvas.focus();
    const data = name => canvas.getAttribute(`data-${name}`);

    assert.equal(await data("stage"), "v2-survival");
    assert.equal(await data("orbit-owned"), "false");
    assert.equal(await data("orbit-profile"), "rank1-phase-reversal");
    assert.equal(await data("delta-fx"), "canonical-exclusive");
    assert.equal(await data("orbit-direction"), "-1", "initial phase B must rotate in the negative direction");

    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;
    const draftDeadline = Date.now() + 58_000;
    while (Date.now() < draftDeadline && !bool(await data("draft-open"))) {
      if (bool(await data("dead"))) throw new Error("died before ORBIT acquisition draft");
      await canvas.press(route[routeIndex++ % route.length], { delay: 430 });
      await page.waitForTimeout(1200);
      if (routeIndex % 3 === 0 && !bool(await data("draft-open"))) {
        await shift(canvas, width);
        await page.waitForTimeout(120);
      }
    }

    assert.equal(await data("draft-open"), "true", "expected a real level-up draft");
    const draftCount = Number(await data("draft-count"));
    const draftIds = ids(await data("draft-ids"));
    assert.equal(draftCount, 3, "V2-2B discovery draft must expose exactly 3 actionable choices");
    assert.equal(draftIds.length, 3);
    assert.equal(new Set(draftIds).size, 3);
    const orbitIndex = draftIds.indexOf("ORBIT_NODES");
    assert.ok(orbitIndex >= 0, `ORBIT discovery guarantee missing: ${draftIds.join(",")}`);
    assert.ok(draftIds.includes("VECTOR_NEEDLE"), "VECTOR must remain available in the inherited discovery state");

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-2b-orbit-draft-${width}.png`) });
    await clickDraft(canvas, orbitIndex, draftCount);
    await page.waitForTimeout(250);
    assert.equal(await data("draft-open"), "false");
    assert.equal(await data("orbit-owned"), "true");
    assert.equal(await data("weapon-slots-used"), "2");
    assert.equal(await data("controls-dimmed"), "false");

    const firstAngle = Number(await data("orbit-angle"));
    await canvas.press(route[routeIndex++ % route.length], { delay: 420 });
    await page.waitForTimeout(550);
    const movedAngle = Number(await data("orbit-angle"));
    assert.ok(circularDistance(firstAngle, movedAngle) > 0.35, `ORBIT angle must move over time: ${firstAngle} -> ${movedAngle}`);

    const hitDeadline = Date.now() + 20_000;
    while (Date.now() < hitDeadline && Number(await data("orbit-hits")) < 1) {
      if (bool(await data("dead"))) throw new Error("died before ORBIT first legal hit");
      await canvas.press(route[routeIndex++ % route.length], { delay: 300 });
      await page.waitForTimeout(600);
    }
    assert.ok(Number(await data("orbit-hits")) >= 1, "ORBIT must damage at least one corporeal target in real combat");

    const phaseBefore = await data("phase");
    const directionBefore = Number(await data("orbit-direction"));
    const reversalsBefore = Number(await data("orbit-reversals"));
    const angleBeforeShift = Number(await data("orbit-angle"));
    await shift(canvas, width);
    await page.waitForTimeout(90);

    assert.notEqual(await data("phase"), phaseBefore);
    assert.equal(Number(await data("orbit-direction")), -directionBefore, "SHIFT must reverse ORBIT angular direction");
    assert.equal(Number(await data("orbit-reversals")), reversalsBefore + 1, "SHIFT must register exactly one ORBIT reversal");
    const anchor = Number(await data("orbit-last-shift-anchor"));
    assert.ok(Number.isFinite(anchor));
    assert.ok(circularDistance(anchor, angleBeforeShift) < 0.5, `SHIFT anchor must preserve current angle rather than reset: ${angleBeforeShift} -> ${anchor}`);
    assert.equal(await data("dead"), "false");
    assert.equal(await data("delta-fx"), "canonical-exclusive");

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-2b-orbit-qualified-${width}.png`) });
    console.log(`RARE_SHIFT_V2_2B_ORBIT_${width}=PASS`);
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 100_000,
    screenshot: resolve(`artifacts/rare-shift-v2-2b-host-${width}.png`),
    check: qualify(width),
  });
}
