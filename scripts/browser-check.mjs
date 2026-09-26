import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";

const gameDirectory = resolve("games/rare-shift");
await mkdir(resolve("artifacts"), { recursive: true });

function qualifyDiscover(width) {
  return async function completeDiscover({ page, game, friendId }) {
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

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-t1-scan-${width}.png`) });

    await game.getByRole("button", { name: /ENTER CHAMBER I/i }).click();

    const canvas = game.locator("canvas");
    await canvas.waitFor({ state: "visible" });
    await canvas.focus();

    const data = async name => canvas.getAttribute(`data-${name}`);
    const pressAndSettle = async key => {
      await canvas.press(key);
      await body.evaluate(() => new Promise(resolveFrame => requestAnimationFrame(() => resolveFrame())));
    };

    assert.equal(await root.getAttribute("data-app-stage"), "chamber");
    assert.equal(await data("stage"), "chamber1");
    assert.equal(await data("friend"), String(friendId));
    assert.ok((await data("family"))?.length, "Chamber I must retain Friend family identity");
    assert.equal(await data("phase"), "B");
    assert.equal(await data("complete"), "false");
    assert.equal(await data("min-shifts"), "2");

    const gateA = Number(await data("gate-a"));
    const gateB = Number(await data("gate-b"));
    const exitX = Number(await data("exit-x"));
    assert.ok(Number.isInteger(gateA) && Number.isInteger(gateB) && gateA < gateB && gateB < exitX);

    for (let i = 0; i < 20; i++) await pressAndSettle("d");
    assert.equal(Number(await data("x")), gateA - 1, "Phase-B collision must block Gate A");

    await pressAndSettle("Space");
    assert.equal(await data("phase"), "A");
    await pressAndSettle("d");
    assert.equal(Number(await data("x")), gateA, "Gate A must become passable after SHIFT");

    for (let i = 0; i < 20; i++) await pressAndSettle("d");
    assert.equal(Number(await data("x")), gateB - 1, "Phase-A collision must block Gate B");

    await pressAndSettle("Space");
    assert.equal(await data("phase"), "B");
    assert.equal(await data("shifts"), "2");

    await pressAndSettle("d");
    assert.equal(Number(await data("x")), gateB, "Gate B must become passable after the second SHIFT");

    for (let i = 0; i < 20; i++) await pressAndSettle("d");
    assert.equal(Number(await data("x")), exitX);
    assert.equal(await data("complete"), "true");
    assert.equal(await data("stage"), "chamber1-complete");
    assert.match(await data("fingerprint"), /^[0-9a-f]{8}$/);
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 20_000,
    screenshot: resolve(`artifacts/rare-shift-t1-${width}.png`),
    check: qualifyDiscover(width),
  });
  console.log(`RARE_SHIFT_T1_BROWSER_${width}=PASS`);
}
