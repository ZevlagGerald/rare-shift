import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";

const gameDirectory = resolve("games/rare-shift");
await mkdir(resolve("artifacts"), { recursive: true });

async function completeProof({ game }) {
  const canvas = game.locator("canvas");
  const body = game.locator("body");
  await canvas.waitFor();
  await canvas.focus();
  await canvas.waitFor({ state: "visible" });
  const data = async name => canvas.getAttribute(`data-${name}`);
  const pressAndSettle = async key => {
    await canvas.press(key);
    await body.evaluate(() => new Promise(resolveFrame => requestAnimationFrame(() => resolveFrame())));
  };

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
  assert.match(await data("fingerprint"), /^[0-9a-f]{8}$/);
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 20_000,
    screenshot: resolve(`artifacts/rare-shift-t0-${width}.png`),
    check: completeProof,
  });
  console.log(`RARE_SHIFT_BROWSER_${width}=PASS`);
}
