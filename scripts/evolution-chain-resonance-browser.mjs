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
    const error = await data("chain-qualification-error");
    if (error) throw new Error(`EV-3E fixture failed: ${error}`);
    await new Promise(resolveWait => setTimeout(resolveWait, 50));
    value = await data(name);
  }
  return value;
}

function numbers(value) {
  return String(value ?? "").split(",").filter(Boolean).map(Number);
}

function booleans(value) {
  return String(value ?? "").split(",").filter(Boolean).map(item => item === "1");
}

async function shift(canvas, width) {
  if (width === 390) {
    const box = await canvas.boundingBox();
    assert.ok(box, "mobile SHIFT canvas must have a bounding box");
    await canvas.click({ position: { x: box.width * 842 / 960, y: box.height * 530 / 640 } });
  } else {
    await canvas.press("Space");
  }
}

function qualify(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    await game.locator("body").evaluate(() => {
      window.__RARE_SHIFT_EV3E_CHAIN_RESONANCE__ = true;
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

    await waitFor(data, "chain-qualification-fixture", value => value === "CHAIN_RESONANCE");
    assert.equal(await data("chain-qualification-fixture"), "CHAIN_RESONANCE");
    assert.equal(await data("chain-evolved"), "true");
    assert.equal(await data("signal-owned"), "true");
    assert.equal(await data("signal-rank"), "5");
    assert.match(String(await data("protocols")), /RESONANCE_COIL:1/u);
    assert.equal(await data("draft-open"), "false");

    assert.equal(await data("chain-max-targets"), "5");
    assert.equal(await data("chain-relay-range"), "200");
    assert.equal(await data("chain-damage-profile"), "10,9,8,8,7");
    assert.equal(await data("chain-post-shift-window-ms"), "900");
    assert.equal(await data("chain-inherited-max-targets"), "4");
    assert.equal(await data("chain-inherited-damage-profile"), "10,9,8,7");
    assert.equal(await data("chain-inherited-routing"), "FORWARD_DEGREE");
    assert.equal(await data("chain-evolved-routing"), "FORWARD_DEGREE");
    assert.equal(await data("chain-inherited-common-bonus-uses"), "1");
    assert.equal(await data("chain-evolved-common-bonus-uses"), "1");
    assert.equal(await data("chain-evolved-cooldown-ms"), await data("chain-inherited-cooldown-ms"), "Evolution must preserve inherited SIGNAL cooldown exactly");
    assert.ok(Number(await data("chain-inherited-relay-range")) < 200, "Rank-I RESONANCE COIL inherited relay must remain below the evolved 200px relay");

    assert.equal(await data("chain-install-casts-after"), await data("chain-install-casts-before"), "Evolution install must not fabricate a SIGNAL cast");
    assert.equal(await data("chain-install-hits-after"), await data("chain-install-hits-before"), "Evolution install must not fabricate SIGNAL hits");
    assert.equal(await data("chain-install-accumulator-after"), await data("chain-install-accumulator-before"), "Evolution install must preserve cooldown progress");
    assert.equal(await data("chain-install-weapon-slots-after-evolution"), await data("chain-install-weapon-slots-before-evolution"), "Evolution must remain weapon-slot neutral");

    await waitFor(data, "chain-stage", value => value === "POST_SHIFT_PREP");
    assert.equal(numbers(await data("chain-baseline-ids")).length, 5, "normal evolved SIGNAL must reach the bounded fifth target");
    assert.deepEqual(numbers(await data("chain-baseline-damages")), [10, 9, 8, 8, 7]);
    assert.deepEqual(numbers(await data("chain-baseline-edge-ranges")), [420, 260, 200, 200, 200], "normal evolved chain must use one COMMON bonus then the 200px evolved relay");
    assert.deepEqual(booleans(await data("chain-baseline-common-bonus")), [false, true, false, false, false]);
    assert.equal(await data("chain-baseline-armed-before"), "false");

    await waitFor(data, "chain-shift-ready", value => value === "true");
    const invalidationsBefore = Number(await data("signal-shift-graph-invalidations"));
    await shift(canvas, width);
    await waitFor(data, "chain-stage", value => value === "CONSUMED_WAIT");

    assert.ok(Number(await data("signal-shift-graph-invalidations")) > invalidationsBefore, "genuine SHIFT must invalidate prior SIGNAL graph evidence");
    assert.equal(await data("chain-post-shift-armed-before"), "true", "first post-SHIFT cast must observe the armed Evolution window");
    assert.ok(Number(await data("chain-post-shift-delay-ms")) >= 0);
    assert.ok(Number(await data("chain-post-shift-delay-ms")) < 900, "near-ready genuine SHIFT must cast inside the 900ms Evolution window");
    assert.equal(numbers(await data("chain-post-shift-ids")).length, 5, "post-SHIFT two-use authority must bridge the full five-target geometry");
    assert.deepEqual(numbers(await data("chain-post-shift-damages")), [10, 9, 8, 8, 7]);
    assert.deepEqual(numbers(await data("chain-post-shift-edge-ranges")), [420, 260, 260, 200, 200], "post-SHIFT cast must expose exactly two COMMON-boosted relay edges");
    assert.deepEqual(booleans(await data("chain-post-shift-common-bonus")), [false, true, true, false, false]);
    assert.equal(await data("chain-shift-state-armed"), "false", "post-SHIFT authority must be consumed by the first successful cast");

    await waitFor(data, "chain-stage", value => value === "EXPIRY_READY");
    assert.equal(await data("chain-consumed-armed-before"), "false", "second cast without another SHIFT must not inherit the extra use");
    assert.equal(numbers(await data("chain-consumed-ids")).length, 2, "consumed state must stop at the second 240px bridge");
    assert.deepEqual(numbers(await data("chain-consumed-edge-ranges")), [420, 260]);
    assert.deepEqual(booleans(await data("chain-consumed-common-bonus")), [false, true]);

    await shift(canvas, width);
    await waitFor(data, "chain-stage", value => value === "DONE", 14_000);
    assert.equal(await data("chain-expiry-armed-before"), "false", "cast after the 900ms window must see expired post-SHIFT authority");
    assert.ok(Number(await data("chain-expiry-delay-ms")) >= 900, "expiry proof cast must occur at or after the exact 900ms boundary");
    assert.equal(numbers(await data("chain-expiry-ids")).length, 2);
    assert.deepEqual(numbers(await data("chain-expiry-edge-ranges")), [420, 260]);
    assert.deepEqual(booleans(await data("chain-expiry-common-bonus")), [false, true]);
    assert.ok(Number(await data("chain-shift-expiry-events")) >= 1, "live qualification must observe post-SHIFT state expiry");
    assert.equal(Number(await data("chain-unexpected-pre-shift-casts")), 0, "qualification must not race an unshifted cast before its controlled SHIFT");
    assert.equal(Number(await data("chain-shift-arm-events")), 2, "qualification must use exactly two genuine accepted SHIFT arms");
    assert.equal(await data("dead"), "false");

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-ev3e-chain-resonance-${width}.png`) });
    console.log(`RARE_SHIFT_EV3E_CHAIN_RESONANCE_${width}=PASS`);
    if (width === 390) console.log("RARE_SHIFT_EV3E_CHAIN_RESONANCE_REDUCED_MOTION=PASS");
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 45_000,
    screenshot: resolve(`artifacts/rare-shift-ev3e-host-${width}.png`),
    check: qualify(width),
  });
}

console.log("RARE_SHIFT_EV3E_CHAIN_RESONANCE_BROWSER=PASS");
