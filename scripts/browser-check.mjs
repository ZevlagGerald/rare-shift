import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";

const gameDirectory = resolve("games/rare-shift");
await mkdir(resolve("artifacts"), { recursive: true });

function qualifyTiming(width) {
  return async function completeTiming({ page, game, friendId }) {
    const body = game.locator("body");
    const root = game.locator(".rare-shift-proof");
    const scan = game.locator('[data-stage="scan"]');

    await scan.waitFor({ state: "visible" });
    assert.equal(await root.getAttribute("data-app-stage"), "scan");
    assert.equal(await scan.getAttribute("data-friend"), String(friendId));
    assert.ok((await scan.getAttribute("data-family"))?.length, "SCAN must expose the canonical family");
    assert.match(await scan.getAttribute("data-frame-a"), /^\d+$/);
    assert.match(await scan.getAttribute("data-frame-b"), /^\d+$/);
    assert.match(await scan.getAttribute("data-fingerprint"), /^[0-9a-f]{8}$/);
    assert.equal(await scan.getAttribute("data-solver-min"), "2");
    assert.equal(await game.locator('svg[data-scan-view="frame-a"]').count(), 1);
    assert.equal(await game.locator('svg[data-scan-view="frame-b"]').count(), 1);
    assert.equal(await game.locator('svg[data-scan-view="phase-field"]').count(), 1);

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-t2-scan-${width}.png`) });
    await game.getByRole("button", { name: /ENTER CHAMBER I/i }).click();

    let canvas = game.locator("canvas");
    await canvas.waitFor({ state: "visible" });
    await canvas.focus();

    let data = async name => canvas.getAttribute(`data-${name}`);
    const settle = async () => body.evaluate(() => new Promise(resolveFrame => requestAnimationFrame(() => resolveFrame())));
    const pressAndSettle = async key => { await canvas.press(key); await settle(); };

    assert.equal(await root.getAttribute("data-app-stage"), "chamber1");
    assert.equal(await data("stage"), "chamber1");
    assert.equal(await data("phase"), "B");
    assert.equal(await data("min-shifts"), "2");

    const gateA = Number(await data("gate-a"));
    const gateB = Number(await data("gate-b"));
    const exitX = Number(await data("exit-x"));
    for (let i = 0; i < 20; i++) await pressAndSettle("d");
    assert.equal(Number(await data("x")), gateA - 1, "Phase B must block Chamber I Gate A");
    await pressAndSettle("Space");
    await pressAndSettle("d");
    for (let i = 0; i < 20; i++) await pressAndSettle("d");
    assert.equal(Number(await data("x")), gateB - 1, "Phase A must block Chamber I Gate B");
    await pressAndSettle("Space");
    await pressAndSettle("d");
    for (let i = 0; i < 20; i++) await pressAndSettle("d");
    assert.equal(Number(await data("x")), exitX);
    assert.equal(await data("complete"), "true");

    const transition = game.locator('[data-stage="chamber1-transition"]');
    await transition.waitFor({ state: "visible" });
    assert.equal(await root.getAttribute("data-app-stage"), "between");
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-t2-transition-${width}.png`) });
    await game.getByRole("button", { name: /ENTER CHAMBER II/i }).click();

    canvas = game.locator("canvas");
    await canvas.waitFor({ state: "visible" });
    await canvas.focus();
    data = async name => canvas.getAttribute(`data-${name}`);
    const pressT2 = async key => { await canvas.press(key); await settle(); };
    const setPulse = async segment => {
      await canvas.evaluate((element, value) => { element.dataset.testPulse = value; }, segment);
      await settle();
      assert.equal(await data("pulse"), segment, `manual test pulse must settle at ${segment}`);
    };

    assert.equal(await root.getAttribute("data-app-stage"), "chamber2");
    assert.equal(await data("stage"), "chamber2");
    assert.equal(await data("friend"), String(friendId));
    assert.equal(await data("phase"), "B");
    assert.equal(await data("complete"), "false");
    assert.match(await data("fingerprint"), /^[0-9a-f]{8}$/);
    assert.match(await data("base-fingerprint"), /^[0-9a-f]{8}$/);
    assert.equal(await data("min-shifts"), "2");

    const shutterA = Number(await data("shutter-a"));
    const shutterB = Number(await data("shutter-b"));
    const timingExitX = Number(await data("exit-x"));
    assert.ok(Number.isInteger(shutterA) && Number.isInteger(shutterB) && shutterA < shutterB && shutterB < timingExitX);

    for (let i = 0; i < 20; i++) await pressT2("d");
    assert.equal(Number(await data("x")), shutterA - 1);

    await setPulse("OPEN_A");
    await pressT2("d");
    assert.equal(Number(await data("x")), shutterA - 1, "wrong phase must block A shutter even during OPEN_A");

    await pressT2("Space");
    assert.equal(await data("phase"), "A");
    await setPulse("TELEGRAPH_A");
    await pressT2("d");
    assert.equal(Number(await data("x")), shutterA - 1, "closed timing window must block A shutter in correct phase");

    await setPulse("OPEN_A");
    await pressT2("d");
    assert.equal(Number(await data("x")), shutterA, "Phase A + OPEN_A must pass A shutter");

    for (let i = 0; i < 20; i++) await pressT2("d");
    assert.equal(Number(await data("x")), shutterB - 1);

    await setPulse("OPEN_B");
    await pressT2("d");
    assert.equal(Number(await data("x")), shutterB - 1, "wrong phase must block B shutter even during OPEN_B");

    await pressT2("Space");
    assert.equal(await data("phase"), "B");
    assert.equal(await data("shifts"), "2");
    await setPulse("TELEGRAPH_B");
    await pressT2("d");
    assert.equal(Number(await data("x")), shutterB - 1, "closed timing window must block B shutter in correct phase");

    await setPulse("OPEN_B");
    await pressT2("d");
    assert.equal(Number(await data("x")), shutterB, "Phase B + OPEN_B must pass B shutter");

    for (let i = 0; i < 20; i++) await pressT2("d");
    assert.equal(Number(await data("x")), timingExitX);
    assert.equal(await data("complete"), "true");
    assert.equal(await data("stage"), "chamber2-complete");

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-t2-${width}.png`) });
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 30_000,
    screenshot: resolve(`artifacts/rare-shift-t2-final-${width}.png`),
    check: qualifyTiming(width),
  });
  console.log(`RARE_SHIFT_T2_BROWSER_${width}=PASS`);
}
