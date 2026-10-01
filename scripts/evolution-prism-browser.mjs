import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";

const gameDirectory = resolve("games/rare-shift");
await mkdir(resolve("artifacts"), { recursive: true });

async function waitForNumber(data, name, predicate, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  let value = Number(await data(name));
  while (Date.now() < deadline && !predicate(value)) {
    await new Promise(resolveWait => setTimeout(resolveWait, 60));
    value = Number(await data(name));
  }
  return value;
}

function qualify(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    await game.locator("body").evaluate(() => {
      window.__RARE_SHIFT_EV3B_PRISM__ = true;
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

    const fixtureDeadline = Date.now() + 8_000;
    while (Date.now() < fixtureDeadline && await data("prism-qualification-fixture") !== "PRISM_LANCE") {
      const fixtureError = await data("prism-qualification-error");
      if (fixtureError) throw new Error(`EV-3B fixture failed: ${fixtureError}`);
      await page.waitForTimeout(60);
    }

    assert.equal(await data("prism-qualification-fixture"), "PRISM_LANCE");
    assert.equal(await data("prism-evolved"), "true");
    assert.equal(await data("vector-owned"), "true");
    assert.equal(await data("vector-rank"), "5");
    assert.match(String(await data("protocols")), /VECTOR_LENS:1/u);
    assert.equal(await data("prism-damage"), "6");
    assert.equal(await data("prism-radius"), "220");
    assert.equal(await data("draft-open"), "false");

    const phase = await data("phase");
    assert.ok(phase === "A" || phase === "B", `unexpected phase ${String(phase)}`);
    assert.equal(await data("prism-legal-phase-kind"), `SPLIT_${phase}`);
    assert.notEqual(await data("prism-ghost-phase-kind"), `SPLIT_${phase}`);

    const primaryId = Number(await data("prism-primary-id"));
    const refractionId = Number(await data("prism-refraction-target-id"));
    const ghostId = Number(await data("prism-ghost-target-id"));
    assert.ok(Number.isInteger(primaryId) && Number.isInteger(refractionId) && Number.isInteger(ghostId));
    assert.equal(new Set([primaryId, refractionId, ghostId]).size, 3);

    const installShots = Number(await data("prism-install-vector-shots"));
    const installHits = Number(await data("prism-install-vector-hits"));
    const installPenetrations = Number(await data("prism-install-penetration-hits"));
    const primaryInitialHp = Number(await data("prism-primary-initial-hp"));
    const refractionInitialHp = Number(await data("prism-refraction-target-initial-hp"));
    const ghostInitialHp = Number(await data("prism-ghost-target-initial-hp"));

    assert.equal(installShots, 0, "controlled Evolution install must not manufacture a VECTOR shot");
    assert.equal(installHits, 0, "controlled Evolution install must not manufacture a VECTOR hit");
    assert.equal(installPenetrations, 0, "controlled Evolution install must not manufacture VECTOR penetration");
    assert.ok(primaryInitialHp > 0 && refractionInitialHp > 0 && ghostInitialHp > 0);
    assert.equal(Number(await data("prism-refractions")), 0, "PRISM must not fire before a genuine VECTOR primary hit");
    assert.equal(Number(await data("prism-hits")), 0, "PRISM must not damage before a genuine VECTOR primary hit");

    const vectorShots = await waitForNumber(data, "vector-shots", value => value >= 1);
    assert.ok(vectorShots >= 1, "Rank-V VECTOR must naturally fire before PRISM can refract");
    const vectorHits = await waitForNumber(data, "vector-hits", value => value >= 1);
    assert.ok(vectorHits >= 1, "Rank-V VECTOR must produce a real primary hit before PRISM can refract");
    const prismHits = await waitForNumber(data, "prism-hits", value => value >= 1);
    assert.ok(prismHits >= 1, "PRISM must refract from the genuine VECTOR primary hit");

    assert.equal(Number(await data("prism-last-primary-id")), primaryId, "PRISM origin must be the actual VECTOR primary target");
    assert.equal(Number(await data("prism-last-target-id")), refractionId, "PRISM must choose the phase-legal off-axis target");
    assert.equal(Number(await data("prism-last-distance-sq")), 8100, "PRISM refraction target must be exactly 90px from the primary hit");
    assert.ok(Number(await data("prism-last-distance-sq")) <= 220 * 220);
    assert.equal(Number(await data("vector-penetration-hits")), 0, "off-axis PRISM target must not be satisfied by ordinary VECTOR penetration");

    const refractionHp = Number(await data("prism-refraction-target-hp"));
    const ghostHp = Number(await data("prism-ghost-target-hp"));
    assert.equal(refractionHp, refractionInitialHp - 6, "phase-legal PRISM target must take exactly 6 refraction damage on the first event");
    assert.equal(ghostHp, ghostInitialHp, "closer phase ghost must remain untouched by PRISM");
    assert.equal(await data("dead"), "false");

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-ev3b-prism-${width}.png`) });
    console.log(`RARE_SHIFT_EV3B_PRISM_${width}=PASS`);
    if (width === 390) console.log("RARE_SHIFT_EV3B_PRISM_REDUCED_MOTION=PASS");
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 45_000,
    screenshot: resolve(`artifacts/rare-shift-ev3b-host-${width}.png`),
    check: qualify(width),
  });
}

console.log("RARE_SHIFT_EV3B_PRISM_BROWSER=PASS");
