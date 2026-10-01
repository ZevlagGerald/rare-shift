import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";

const gameDirectory = resolve("games/rare-shift");
await mkdir(resolve("artifacts"), { recursive: true });

async function waitFor(data, name, predicate, timeoutMs = 18_000) {
  const deadline = Date.now() + timeoutMs;
  let value = await data(name);
  while (Date.now() < deadline && !predicate(value)) {
    const error = await data("memory-qualification-error");
    if (error) throw new Error(`EV-3D fixture failed: ${error}`);
    await new Promise(resolveWait => setTimeout(resolveWait, 50));
    value = await data(name);
  }
  return value;
}

function numbers(value) {
  return String(value ?? "").split(",").filter(Boolean).map(Number);
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
      window.__RARE_SHIFT_EV3D_MEMORY_COLLAPSE__ = true;
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

    await waitFor(data, "memory-qualification-fixture", value => value === "MEMORY_COLLAPSE");
    assert.equal(await data("memory-qualification-fixture"), "MEMORY_COLLAPSE");
    assert.equal(await data("memory-evolved"), "true");
    assert.equal(await data("echo-owned"), "true");
    assert.equal(await data("echo-rank"), "5");
    assert.match(String(await data("protocols")), /MEMORY_FUSE:1/u);
    assert.equal(await data("memory-link-radius"), "180");
    assert.equal(await data("memory-chain-cap"), "3");
    assert.equal(await data("memory-damage-multiplier"), "1");
    assert.equal(await data("draft-open"), "false");

    assert.equal(Number(await data("memory-install-mine-count")), 0, "Evolution install must not fabricate ECHO mines");
    assert.equal(Number(await data("memory-install-placements")), 0, "Evolution install must not fabricate ECHO placement history");
    assert.equal(Number(await data("memory-install-triggers")), 0, "Evolution install must not fabricate ECHO trigger history");
    assert.equal(Number(await data("memory-natural-trigger-events")), 0, "MEMORY COLLAPSE must wait for a genuine eligible ECHO trigger");

    await waitFor(data, "memory-stage", value => value === "CAP_READY_TO_ARM");
    const capMineIds = numbers(await data("memory-cap-mine-ids"));
    assert.equal(capMineIds.length, 4, "Rank-V ECHO must create four legitimate live mines through its normal placement cadence");
    assert.equal(new Set(capMineIds).size, 4);

    await shift(canvas, width);
    await waitFor(data, "memory-stage", value => value === "CAP_AWAY");
    await shift(canvas, width);
    await waitFor(data, "memory-stage", value => value === "CAP_PROVEN");

    assert.equal(Number(await data("memory-natural-trigger-events")), 1, "cap round must originate from exactly one genuine ECHO trigger");
    const capChainIds = numbers(await data("memory-cap-chain-ids"));
    const capLegalIds = numbers(await data("memory-cap-legal-ids"));
    const capExcludedId = Number(await data("memory-cap-excluded-id"));
    assert.equal(capLegalIds.length, 4, "cap round must begin with four legitimate trigger-legal mines");
    assert.equal(capChainIds.length, 3, "MEMORY COLLAPSE must hard-cap the total chain at three mines");
    assert.deepEqual(capChainIds, capLegalIds.slice(0, 3), "60px spacing must deterministically select nearest mines in stable-ID order");
    assert.equal(capExcludedId, capLegalIds[3], "the fourth legal mine must remain excluded by the hard chain cap");
    assert.ok(!capChainIds.includes(capExcludedId));

    const startDamage = Number(await data("memory-cap-start-damage"));
    const propagatedDamages = numbers(await data("memory-cap-propagated-damages"));
    assert.ok(startDamage > 0, "the genuine start mine must expose inherited Rank-V ECHO damage");
    assert.deepEqual(propagatedDamages, [startDamage, startDamage], "propagated mines must reuse inherited ECHO damage at exactly 1x");
    assert.equal(Number(await data("memory-cap-suppressed-hits")), 1, "the third same-target hit inside 250ms must be suppressed by the inherited Rank-V ledger");

    const ledgerInitialHp = Number(await data("memory-ledger-initial-hp"));
    const ledgerHp = Number(await data("memory-ledger-hp"));
    assert.equal(ledgerInitialHp - ledgerHp, startDamage * 2, "shared target must take exactly two ECHO hits inside the 250ms ledger window");

    const triggerInitialHp = Number(await data("memory-trigger-initial-hp"));
    const triggerHp = Number(await data("memory-trigger-hp"));
    assert.equal(triggerInitialHp - triggerHp, startDamage, "genuine trigger target must take exactly the inherited start-mine damage");

    await shift(canvas, width);
    await waitFor(data, "memory-stage", value => value === "EXCLUSION_PLACEMENT");
    await waitFor(data, "memory-stage", value => value === "EXCLUSION_READY_TO_ARM");

    const exclusionMineIds = numbers(await data("memory-exclusion-mine-ids"));
    assert.equal(exclusionMineIds.length, 3, "exclusion round must create three new legitimate ECHO mines without fabricating history");

    await shift(canvas, width);
    await waitFor(data, "memory-stage", value => value === "EXCLUSION_HALF");
    await shift(canvas, width);
    await waitFor(data, "memory-stage", value => value === "DONE");

    assert.equal(Number(await data("memory-natural-trigger-events")), 2, "both MEMORY COLLAPSE rounds must originate from genuine ECHO trigger events");
    const exclusionChainIds = numbers(await data("memory-exclusion-chain-ids"));
    const invalidId = Number(await data("memory-exclusion-invalid-id"));
    assert.equal(exclusionChainIds.length, 3, "three trigger-legal new mines must form the bounded second chain");
    assert.ok(!exclusionChainIds.includes(invalidId), "the retained invalid mine must not enter the chain");
    assert.equal(await data("memory-exclusion-invalid-state"), "ARMED_AWAY", "retained mine must be genuinely off-phase through a real SHIFT");
    assert.equal(await data("memory-exclusion-invalid-trigger-legal"), "false");
    assert.ok(Number(await data("memory-exclusion-invalid-distance")) > 180, "retained invalid mine must also be outside the 180px link radius");
    assert.equal(await data("dead"), "false");

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-ev3d-memory-collapse-${width}.png`) });
    console.log(`RARE_SHIFT_EV3D_MEMORY_COLLAPSE_${width}=PASS`);
    if (width === 390) console.log("RARE_SHIFT_EV3D_MEMORY_COLLAPSE_REDUCED_MOTION=PASS");
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 55_000,
    screenshot: resolve(`artifacts/rare-shift-ev3d-host-${width}.png`),
    check: qualify(width),
  });
}

console.log("RARE_SHIFT_EV3D_MEMORY_COLLAPSE_BROWSER=PASS");
