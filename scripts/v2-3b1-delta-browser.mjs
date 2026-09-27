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
  assert.ok(box);
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
    const reduceMotion = game.getByRole("checkbox", { name: /Reduce motion/i });
    if (width === 390) await reduceMotion.check();

    await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
    const canvas = game.locator("canvas");
    await canvas.waitFor({ state: "visible" });
    await canvas.focus();
    const data = name => canvas.getAttribute(`data-${name}`);
    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;

    assert.equal(await data("delta-rank"), "1");
    assert.equal(await data("delta-damage"), "12");
    assert.equal(await data("delta-cooldown-ms"), "860");
    assert.equal(await data("delta-world-scale"), "8");

    let acquiredSignal = false;
    let acquiredOrbit = false;
    let provedRank4Echo = false;
    let rank5Reached = false;
    const choices = [];

    const deadline = Date.now() + 300_000;
    while (Date.now() < deadline && !rank5Reached) {
      if (bool(await data("dead"))) throw new Error(`died before DELTA Rank V at level ${await data("level")}; choices=${choices.join("|")}`);

      if (bool(await data("draft-open"))) {
        const ids = list(await data("draft-ids"));
        const count = Number(await data("draft-count"));
        assert.equal(ids.length, count);
        const rank = Number(await data("delta-rank"));
        const level = Number(await data("level"));

        let desired = "";
        // DELTA-specific natural route. Rank II is taken at the level-2 learning
        // surface, ORBIT provides close defense, SIGNAL provides wave clear, and
        // all later legal DELTA cards are taken immediately. The inherited V2-2E
        // suite separately proves a real 4/4 build, so this proof must not delay
        // DELTA qualification merely to fill the fourth slot.
        if (rank === 1 && ids.includes("DELTA_RANK")) desired = "DELTA_RANK";
        else if (!acquiredOrbit && ids.includes("ORBIT_NODES")) desired = "ORBIT_NODES";
        else if (!acquiredSignal && ids.includes("SIGNAL_ARC")) desired = "SIGNAL_ARC";
        else if (ids.includes("DELTA_RANK")) desired = "DELTA_RANK";
        else desired = ids[0];

        choices.push(`L${level}:${desired}`);
        console.log(`V2_3B1_DRAFT_${width}=L${level}:${ids.join(",")}=>${desired}`);
        const index = ids.indexOf(desired);
        assert.ok(index >= 0, `desired ${desired} missing from ${ids.join(",")}`);
        const beforeRank = rank;
        await clickDraft(canvas, index, count);
        await page.waitForTimeout(220);
        assert.equal(await data("draft-open"), "false");

        if (desired === "SIGNAL_ARC") acquiredSignal = true;
        if (desired === "ORBIT_NODES") acquiredOrbit = true;

        const afterRank = Number(await data("delta-rank"));
        if (desired === "DELTA_RANK") {
          assert.equal(afterRank, beforeRank + 1);
          if (afterRank === 2) {
            assert.equal(await data("delta-damage"), "12");
            assert.equal(await data("delta-cooldown-ms"), "720");
            assert.equal(await data("delta-world-scale"), "8");
          }
          if (afterRank === 3) {
            assert.equal(await data("delta-damage"), "12");
            assert.equal(await data("delta-cooldown-ms"), "720");
            assert.equal(await data("delta-world-scale"), "9.5");
          }
          if (afterRank === 4) {
            const schedulesBefore = Number(await data("delta-echo-schedules"));
            const firesBefore = Number(await data("delta-echo-fires"));
            await shift(canvas, width);
            await page.waitForTimeout(240);
            assert.ok(Number(await data("delta-echo-schedules")) > schedulesBefore, "Rank IV SHIFT must schedule PHASE ECHO");
            assert.ok(Number(await data("delta-echo-fires")) > firesBefore, "Rank IV PHASE ECHO must fire after its bounded delay");
            provedRank4Echo = true;
          }
          if (afterRank === 5) {
            assert.equal(await data("delta-damage"), "14");
            assert.equal(await data("delta-cooldown-ms"), "720");
            assert.equal(await data("delta-world-scale"), "9.5");
            rank5Reached = true;
          }
        }
      }

      if (rank5Reached) break;
      await canvas.press(route[routeIndex++ % route.length], { delay: 620 });
      await page.waitForTimeout(90);
      if (routeIndex % 4 === 0 && !bool(await data("draft-open"))) {
        await shift(canvas, width);
        await page.waitForTimeout(90);
      }
    }

    if (!rank5Reached) {
      console.log(`V2_3B1_TIMEOUT_STATE_${width}=${JSON.stringify({
        level: Number(await data("level")),
        hp: Number(await data("hp")),
        kills: Number(await data("kills")),
        deltaRank: Number(await data("delta-rank")),
        weaponSlotsUsed: Number(await data("weapon-slots-used")),
        choices,
      })}`);
    }
    assert.equal(rank5Reached, true, "natural draft route must reach DELTA Rank V");
    assert.equal(provedRank4Echo, true, "Rank IV echo must be proven before Rank V");
    assert.equal(await data("delta-rank"), "5");
    assert.equal(await data("delta-damage"), "14");
    assert.equal(acquiredOrbit, true, "natural qualification must include ORBIT close defense");
    assert.equal(acquiredSignal, true, "natural qualification must include SIGNAL wave clear");

    const staggerBefore = Number(await data("delta-staggers"));
    const staggerDeadline = Date.now() + 32_000;
    while (Date.now() < staggerDeadline && Number(await data("delta-staggers")) <= staggerBefore) {
      if (bool(await data("dead"))) throw new Error("died before Rank-V stagger observation");
      if (bool(await data("draft-open"))) {
        const ids = list(await data("draft-ids"));
        const count = Number(await data("draft-count"));
        const heal = ids.indexOf("FIELD_REPAIR");
        await clickDraft(canvas, heal >= 0 ? heal : 0, count);
        await page.waitForTimeout(160);
      } else {
        await canvas.press(route[routeIndex++ % route.length], { delay: 560 });
        await page.waitForTimeout(80);
      }
    }
    assert.ok(Number(await data("delta-staggers")) > staggerBefore, "Rank V matching-phase primary pulse must produce bounded normal-enemy stagger");
    assert.equal(await data("dead"), "false");
    assert.ok(Number(await data("active-enemies")) <= 48);
    assert.ok(Number(await data("delta-primary-pulses")) > 0);
    assert.ok(Number(await data("delta-echo-schedules")) >= 1);
    assert.ok(Number(await data("delta-echo-fires")) >= 1);

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b1-delta-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B1_DELTA_${width}=PASS`);
    if (width === 390) {
      assert.equal(await reduceMotion.isChecked(), true);
      console.log("RARE_SHIFT_V2_3B1_REDUCED_MOTION=PASS");
    }
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 360_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b1-host-${width}.png`),
    check: qualify(width),
  });
}
