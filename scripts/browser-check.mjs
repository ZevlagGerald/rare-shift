import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";

const gameDirectory = resolve("games/rare-shift");
await mkdir(resolve("artifacts"), { recursive: true });

function qualifyT3(width) {
  return async function completeT3({ page, game, friendId }) {
    const body = game.locator("body");
    const root = game.locator(".rare-shift-proof");
    const scan = game.locator('[data-stage="scan"]');

    await scan.waitFor({ state: "visible" });
    assert.equal(await root.getAttribute("data-app-stage"), "scan");
    assert.equal(await scan.getAttribute("data-friend"), String(friendId));
    assert.ok((await scan.getAttribute("data-family"))?.length);
    assert.match(await scan.getAttribute("data-frame-a"), /^\d+$/);
    assert.match(await scan.getAttribute("data-frame-b"), /^\d+$/);
    assert.match(await scan.getAttribute("data-fingerprint"), /^[0-9a-f]{8}$/);
    assert.equal(await scan.getAttribute("data-solver-min"), "2");
    assert.equal(await game.locator('svg[data-scan-view="frame-a"]').count(), 1);
    assert.equal(await game.locator('svg[data-scan-view="frame-b"]').count(), 1);
    assert.equal(await game.locator('svg[data-scan-view="phase-field"]').count(), 1);

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-t3-scan-${width}.png`) });
    await game.getByRole("button", { name: /ENTER CHAMBER I/i }).click();

    let canvas = game.locator("canvas");
    await canvas.waitFor({ state: "visible" });
    await canvas.focus();

    let data = async name => canvas.getAttribute(`data-${name}`);
    const settle = async () => body.evaluate(() => new Promise(resolveFrame => requestAnimationFrame(() => resolveFrame())));
    const press = async key => { await canvas.press(key); await settle(); };

    assert.equal(await root.getAttribute("data-app-stage"), "chamber1");
    assert.equal(await data("stage"), "chamber1");
    assert.equal(await data("phase"), "B");
    assert.equal(await data("min-shifts"), "2");

    const gateA = Number(await data("gate-a"));
    const gateB = Number(await data("gate-b"));
    const exitX = Number(await data("exit-x"));

    for (let i = 0; i < 20; i++) await press("d");
    assert.equal(Number(await data("x")), gateA - 1);
    await press("Space");
    await press("d");
    for (let i = 0; i < 20; i++) await press("d");
    assert.equal(Number(await data("x")), gateB - 1);
    await press("Space");
    await press("d");

    const movesToExit = exitX - Number(await data("x"));
    for (let i = 0; i < movesToExit - 1; i++) await press("d");
    await canvas.press("d");

    const transition1 = game.locator('[data-stage="chamber1-transition"]');
    await transition1.waitFor({ state: "visible" });
    assert.equal(await root.getAttribute("data-app-stage"), "between");
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-t3-transition1-${width}.png`) });
    await game.getByRole("button", { name: /ENTER CHAMBER II/i }).click();

    canvas = game.locator("canvas");
    await canvas.waitFor({ state: "visible" });
    await canvas.focus();
    data = async name => canvas.getAttribute(`data-${name}`);
    const pressT2 = async key => { await canvas.press(key); await settle(); };
    const setPulse = async segment => {
      await canvas.evaluate((element, value) => { element.dataset.testPulse = value; }, segment);
      await settle();
      assert.equal(await data("pulse"), segment);
    };

    assert.equal(await root.getAttribute("data-app-stage"), "chamber2");
    assert.equal(await data("stage"), "chamber2");
    assert.equal(await data("phase"), "B");
    assert.equal(await data("min-shifts"), "2");

    const shutterA = Number(await data("shutter-a"));
    const shutterB = Number(await data("shutter-b"));
    const timingExitX = Number(await data("exit-x"));

    for (let i = 0; i < 20; i++) await pressT2("d");
    assert.equal(Number(await data("x")), shutterA - 1);
    await setPulse("OPEN_A");
    await pressT2("d");
    assert.equal(Number(await data("x")), shutterA - 1);
    await pressT2("Space");
    await setPulse("TELEGRAPH_A");
    await pressT2("d");
    assert.equal(Number(await data("x")), shutterA - 1);
    await setPulse("OPEN_A");
    await pressT2("d");
    assert.equal(Number(await data("x")), shutterA);

    for (let i = 0; i < 20; i++) await pressT2("d");
    assert.equal(Number(await data("x")), shutterB - 1);
    await setPulse("OPEN_B");
    await pressT2("d");
    assert.equal(Number(await data("x")), shutterB - 1);
    await pressT2("Space");
    assert.equal(await data("shifts"), "2");
    await setPulse("TELEGRAPH_B");
    await pressT2("d");
    assert.equal(Number(await data("x")), shutterB - 1);
    await setPulse("OPEN_B");
    await pressT2("d");
    assert.equal(Number(await data("x")), shutterB);

    const t2Remaining = timingExitX - Number(await data("x"));
    for (let i = 0; i < t2Remaining - 1; i++) await pressT2("d");
    await canvas.press("d");

    const transition2 = game.locator('[data-stage="chamber2-transition"]');
    await transition2.waitFor({ state: "visible" });
    assert.equal(await root.getAttribute("data-app-stage"), "between2");
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-t3-transition2-${width}.png`) });
    await game.getByRole("button", { name: /ENTER CHAMBER III/i }).click();

    canvas = game.locator("canvas");
    await canvas.waitFor({ state: "visible" });
    await canvas.focus();
    data = async name => canvas.getAttribute(`data-${name}`);
    const pressT3 = async key => { await canvas.press(key); await settle(); };

    assert.equal(await root.getAttribute("data-app-stage"), "chamber3");
    assert.equal(await data("stage"), "chamber3");
    assert.equal(await data("friend"), String(friendId));
    assert.equal(await data("phase"), "B");
    assert.equal(await data("next-node"), "0");
    assert.equal(await data("min-shifts"), "2");
    assert.match(await data("fingerprint"), /^[0-9a-f]{8}$/);
    assert.match(await data("base-fingerprint"), /^[0-9a-f]{8}$/);

    const node1 = { x: Number(await data("node1-x")), y: Number(await data("node1-y")) };
    const node2 = { x: Number(await data("node2-x")), y: Number(await data("node2-y")) };
    const node3 = { x: Number(await data("node3-x")), y: Number(await data("node3-y")) };
    const syncExit = { x: Number(await data("exit-x")), y: Number(await data("exit-y")) };

    const moveTo = async (targetX, targetY) => {
      let x = Number(await data("x")), y = Number(await data("y"));
      while (y > targetY) { await pressT3("ArrowUp"); y--; }
      while (y < targetY) { await pressT3("ArrowDown"); y++; }
      while (x > targetX) { await pressT3("ArrowLeft"); x--; }
      while (x < targetX) { await pressT3("ArrowRight"); x++; }
      assert.equal(Number(await data("x")), targetX);
      assert.equal(Number(await data("y")), targetY);
    };

    await moveTo(2, 1);
    await moveTo(syncExit.x - 1, 1);
    await moveTo(syncExit.x - 1, syncExit.y);
    await pressT3("ArrowRight");
    assert.equal(Number(await data("x")), syncExit.x - 1);
    assert.equal(await data("next-node"), "0");

    await moveTo(syncExit.x - 1, 1);
    await moveTo(node3.x, 1);
    await moveTo(node3.x, node3.y);
    assert.equal(await data("next-node"), "0");

    await moveTo(node3.x, 1);
    await moveTo(2, 1);
    await moveTo(2, 4);
    await moveTo(node1.x, node1.y);
    assert.equal(await data("next-node"), "1");

    await moveTo(node2.x, node2.y);
    assert.equal(await data("next-node"), "1");
    await pressT3("Space");
    assert.equal(await data("phase"), "A");
    assert.equal(await data("shifts"), "1");
    await pressT3("ArrowLeft");
    await pressT3("ArrowRight");
    assert.equal(await data("next-node"), "2");

    await moveTo(node3.x, node3.y);
    assert.equal(await data("next-node"), "2");
    await pressT3("Space");
    assert.equal(await data("phase"), "B");
    assert.equal(await data("shifts"), "2");
    await pressT3("ArrowLeft");
    await pressT3("ArrowRight");
    assert.equal(await data("next-node"), "3");

    await moveTo(syncExit.x, syncExit.y);
    assert.equal(await data("complete"), "true");
    assert.equal(await data("stage"), "chamber3-complete");
    assert.equal(await data("shifts"), "2");
    assert.equal(await data("sync-count"), "3");

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-t3-${width}.png`) });
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 45_000,
    screenshot: resolve(`artifacts/rare-shift-t3-final-${width}.png`),
    check: qualifyT3(width),
  });
  console.log(`RARE_SHIFT_T3_BROWSER_${width}=PASS`);
}
