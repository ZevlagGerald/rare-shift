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

    // Use the exact movement/SHIFT discipline already qualified by V2-2E at
    // both 960 and 390. V2-3B1 tests DELTA rank progression, not a new bot AI.
    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;
    let expectedDraftLevel = 2;
    const choices = [];

    assert.equal(await data("delta-rank"), "1");
    assert.equal(await data("delta-damage"), "12");
    assert.equal(await data("delta-cooldown-ms"), "860");
    assert.equal(await data("delta-world-scale"), "8");

    let acquiredOrbit = false;
    let acquiredEcho = false;
    let acquiredSignal = false;
    let provedRank4Echo = false;
    let rank4EchoProofPending = false;

    const moveUntilNextDraft = async (deadlineMs, label) => {
      const deadline = Date.now() + deadlineMs;
      while (Date.now() < deadline && !bool(await data("draft-open"))) {
        if (bool(await data("dead"))) {
          throw new Error(`died before ${label}; level=${await data("level")}; hp=${await data("hp")}; kills=${await data("kills")}; rank=${await data("delta-rank")}; choices=${choices.join("|")}`);
        }
        await canvas.press(route[routeIndex++ % route.length], { delay: expectedDraftLevel >= 4 ? 300 : 390 });
        await page.waitForTimeout(expectedDraftLevel >= 4 ? 650 : 900);
        if (routeIndex % 5 === 0 && !bool(await data("draft-open"))) {
          await shift(canvas, width);
          await page.waitForTimeout(95);
        }
      }
      assert.equal(await data("draft-open"), "true", `expected ${label}`);
      assert.equal(Number(await data("level")), expectedDraftLevel,
        `${label} must be sequential Level ${expectedDraftLevel}`);
    };

    const chooseCurrentDraft = async (desired, label) => {
      const ids = list(await data("draft-ids"));
      const count = Number(await data("draft-count"));
      const level = Number(await data("level"));
      const hp = Number(await data("hp"));
      assert.equal(level, expectedDraftLevel, `${label} draft sequence must remain exact`);
      assert.equal(ids.length, count, `${label} draft ids/count must agree`);
      const index = ids.indexOf(desired);
      assert.ok(index >= 0, `${label} requires ${desired}: ${ids.join(",")}`);
      choices.push(`L${level}:${desired}`);
      console.log(`V2_3B1_DRAFT_${width}=L${level}:HP${hp}:${ids.join(",")}=>${desired}`);
      const beforeRank = Number(await data("delta-rank"));
      await clickDraft(canvas, index, count);
      expectedDraftLevel += 1;
      await page.waitForTimeout(220);
      if (desired === "ORBIT_NODES") acquiredOrbit = true;
      if (desired === "ECHO_MINE") acquiredEcho = true;
      if (desired === "SIGNAL_ARC") acquiredSignal = true;
      if (desired === "DELTA_RANK") {
        assert.equal(Number(await data("delta-rank")), beforeRank + 1, `${label} must advance DELTA exactly one rank`);
      }
      if (bool(await data("draft-open"))) {
        assert.equal(Number(await data("level")), expectedDraftLevel,
          `immediate reopened draft must be exactly L${expectedDraftLevel}`);
      }
      return { ids, level, hp, beforeRank };
    };

    const proveRank4Echo = async () => {
      assert.equal(bool(await data("draft-open")), false, "Rank-IV PHASE ECHO proof requires resumed combat");
      const schedulesBefore = Number(await data("delta-echo-schedules"));
      const firesBefore = Number(await data("delta-echo-fires"));
      await shift(canvas, width);
      await page.waitForTimeout(240);
      assert.ok(Number(await data("delta-echo-schedules")) > schedulesBefore, "Rank IV SHIFT must schedule PHASE ECHO");
      assert.ok(Number(await data("delta-echo-fires")) > firesBefore, "Rank IV PHASE ECHO must fire after its bounded delay");
      provedRank4Echo = true;
      rank4EchoProofPending = false;
    };

    const resolveImmediateDraftsBeforeEchoProof = async () => {
      let resolved = 0;
      while (bool(await data("draft-open")) && resolved < 8) {
        const ids = list(await data("draft-ids"));
        const hp = Number(await data("hp"));
        let desired = "";
        if (hp <= 55 && ids.includes("FIELD_REPAIR")) desired = "FIELD_REPAIR";
        else if (ids.includes("SIGNAL_MAGNET")) desired = "SIGNAL_MAGNET";
        else desired = ids.find(id => id !== "DELTA_RANK") ?? "";
        assert.ok(desired, `Rank-IV echo bridge requires a legal non-DELTA choice: ${ids.join(",")}`);
        await chooseCurrentDraft(desired, "Rank-IV echo bridge");
        resolved += 1;
      }
      assert.equal(await data("draft-open"), "false", "Rank-IV echo bridge must eventually resume combat");
    };

    // First establish the already-qualified survival build. This keeps V2-3B1
    // focused on rank behavior instead of forcing a fragile DELTA-II-at-L2 path.
    await moveUntilNextDraft(58_000, "Level-2 ORBIT onboarding draft");
    await chooseCurrentDraft("ORBIT_NODES", "Level-2 ORBIT onboarding");
    assert.equal(await data("weapon-slots-used"), "2");

    await moveUntilNextDraft(64_000, "Level-3 ECHO onboarding draft");
    await chooseCurrentDraft("ECHO_MINE", "Level-3 ECHO onboarding");
    assert.equal(await data("weapon-slots-used"), "3");

    await moveUntilNextDraft(76_000, "Level-4 SIGNAL onboarding draft");
    await chooseCurrentDraft("SIGNAL_ARC", "Level-4 SIGNAL onboarding");
    assert.equal(await data("weapon-slots-used"), "4");
    assert.equal(acquiredOrbit, true);
    assert.equal(acquiredEcho, true);
    assert.equal(acquiredSignal, true);

    // Earn DELTA II-V only through subsequent real draft decisions. Critical
    // healing may delay a rank, but no HP/XP/rank state is injected.
    while (Number(await data("delta-rank")) < 5) {
      if (rank4EchoProofPending && !bool(await data("draft-open"))) await proveRank4Echo();
      if (!bool(await data("draft-open"))) {
        await moveUntilNextDraft(90_000, `DELTA progression draft L${expectedDraftLevel}`);
      }

      const ids = list(await data("draft-ids"));
      const hp = Number(await data("hp"));
      const rank = Number(await data("delta-rank"));
      let desired = "";

      if (rank === 4 && rank4EchoProofPending) {
        if (hp <= 55 && ids.includes("FIELD_REPAIR")) desired = "FIELD_REPAIR";
        else if (ids.includes("SIGNAL_MAGNET")) desired = "SIGNAL_MAGNET";
        else desired = ids.find(id => id !== "DELTA_RANK") ?? "";
        assert.ok(desired, `Rank-IV echo proof requires a legal bridge choice: ${ids.join(",")}`);
      } else if (hp <= 55 && ids.includes("FIELD_REPAIR")) {
        desired = "FIELD_REPAIR";
      } else if (ids.includes("DELTA_RANK")) {
        desired = "DELTA_RANK";
      } else if (ids.includes("SIGNAL_MAGNET")) {
        desired = "SIGNAL_MAGNET";
      } else {
        desired = ids[0];
      }

      const { beforeRank } = await chooseCurrentDraft(desired, `DELTA progression L${expectedDraftLevel - 1}`);
      if (desired !== "DELTA_RANK") continue;

      const afterRank = Number(await data("delta-rank"));
      assert.equal(afterRank, beforeRank + 1);
      if (afterRank === 2) {
        assert.equal(await data("weapon-slots-used"), "4");
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
        rank4EchoProofPending = true;
        if (bool(await data("draft-open"))) await resolveImmediateDraftsBeforeEchoProof();
        await proveRank4Echo();
      }
      if (afterRank === 5) {
        assert.equal(provedRank4Echo, true, "Rank IV PHASE ECHO must be proven before DELTA V");
        assert.equal(await data("delta-damage"), "14");
        assert.equal(await data("delta-cooldown-ms"), "720");
        assert.equal(await data("delta-world-scale"), "9.5");
      }
    }

    assert.equal(provedRank4Echo, true, "Rank IV echo must be proven before Rank V");
    assert.equal(await data("delta-rank"), "5");
    assert.equal(await data("delta-damage"), "14");
    assert.ok(expectedDraftLevel >= 9, "draft sequence must prove Level 2 through Level 8 without skipping");

    const staggerBefore = Number(await data("delta-staggers"));
    const staggerDeadline = Date.now() + 32_000;
    while (Date.now() < staggerDeadline && Number(await data("delta-staggers")) <= staggerBefore) {
      if (bool(await data("dead"))) throw new Error("died before Rank-V stagger observation");
      if (bool(await data("draft-open"))) {
        const ids = list(await data("draft-ids"));
        const hp = Number(await data("hp"));
        let desired = "";
        if (hp <= 55 && ids.includes("FIELD_REPAIR")) desired = "FIELD_REPAIR";
        else if (ids.includes("SIGNAL_MAGNET")) desired = "SIGNAL_MAGNET";
        else desired = ids[0];
        await chooseCurrentDraft(desired, "post-Rank-V survival draft");
        continue;
      }
      await canvas.press(route[routeIndex++ % route.length], { delay: 220 });
      await page.waitForTimeout(360);
      if (routeIndex % 4 === 0 && !bool(await data("draft-open"))) {
        await shift(canvas, width);
        await page.waitForTimeout(320);
      }
    }

    assert.ok(Number(await data("delta-staggers")) > staggerBefore, "Rank V matching-phase primary pulse must produce bounded normal-enemy stagger");
    assert.equal(await data("dead"), "false");
    assert.ok(Number(await data("active-enemies")) <= 48);
    assert.ok(Number(await data("delta-primary-pulses")) > 0);
    assert.ok(Number(await data("delta-echo-schedules")) >= 1);
    assert.ok(Number(await data("delta-echo-fires")) >= 1);

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b1-delta-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B1_PICKUP_LEVEL_INTEGRITY_${width}=PASS`);
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
    timeout: 420_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b1-host-${width}.png`),
    check: qualify(width),
  });
}
