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
function assertChainPhase(kinds, phase) {
  for (const kind of kinds) {
    if (phase === "A") assert.notEqual(kind, "SPLIT_B", "Phase A ARC chain must exclude SPLIT_B ghosts");
    if (phase === "B") assert.notEqual(kind, "SPLIT_A", "Phase B ARC chain must exclude SPLIT_A ghosts");
  }
}

function qualify(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });

    const reduceMotion = game.getByRole("checkbox", { name: /Reduce motion/i });
    if (width === 390) {
      await reduceMotion.check();
      assert.equal(await reduceMotion.isChecked(), true, "390 closeout route must mount survival in reduced-motion mode");
    }

    await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
    const canvas = game.locator("canvas");
    await canvas.waitFor({ state: "visible" });
    await canvas.focus();
    const data = name => canvas.getAttribute(`data-${name}`);
    // Reuse the exact four-direction movement discipline already qualified by
    // V2-2D on both desktop and narrow viewports. V2-2E should test integrated
    // weapon coexistence, not introduce a second survival-routing variable.
    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;

    assert.equal(await data("stage"), "v2-survival");
    assert.equal(await data("weapon-slots-used"), "1");
    assert.equal(await data("delta-fx"), "canonical-exclusive");
    assert.equal(await data("vector-owned"), "false");
    assert.equal(await data("orbit-owned"), "false");
    assert.equal(await data("echo-owned"), "false");
    assert.equal(await data("signal-owned"), "false");

    const moveUntilDraft = async (minimumLevel, deadlineMs, label) => {
      const deadline = Date.now() + deadlineMs;
      while (Date.now() < deadline && !(bool(await data("draft-open")) && Number(await data("level")) >= minimumLevel)) {
        if (bool(await data("dead"))) {
          throw new Error(`died before ${label}; level=${await data("level")}; hp=${await data("hp")}; kills=${await data("kills")}; deltaRank=${await data("delta-rank")}; slots=${await data("weapon-slots-used")}`);
        }
        if (!bool(await data("draft-open"))) {
          await canvas.press(route[routeIndex++ % route.length], { delay: minimumLevel >= 4 ? 300 : 390 });
          await page.waitForTimeout(minimumLevel >= 4 ? 650 : 900);
          if (routeIndex % 5 === 0 && !bool(await data("draft-open"))) {
            await shift(canvas, width);
            await page.waitForTimeout(95);
          }
        }
      }
      assert.equal(await data("draft-open"), "true", `expected ${label}`);
      assert.ok(Number(await data("level")) >= minimumLevel, `${label} must be level ${minimumLevel}+`);
    };

    const chooseBuildCard = async (expectedId, label) => {
      const ids = list(await data("draft-ids"));
      const count = Number(await data("draft-count"));
      assert.equal(ids.length, count, `${label} draft ids/count must agree`);
      const index = ids.indexOf(expectedId);
      assert.ok(index >= 0, `${label} requires ${expectedId}: ${ids.join(",")}`);
      console.log(`V2_2E_BUILD_DRAFT_${width}=L${await data("level")}:HP${await data("hp")}:${ids.join(",")}=>${expectedId}`);
      await clickDraft(canvas, index, count);
      await page.waitForTimeout(220);
    };

    const resolvePostBuildDrafts = async label => {
      let resolved = 0;
      while (bool(await data("draft-open")) && resolved < 8) {
        const ids = list(await data("draft-ids"));
        const count = Number(await data("draft-count"));
        assert.equal(ids.length, count, `${label} draft ids/count must agree`);
        assert.ok(count >= 1 && count <= 3, `${label} draft count must remain bounded`);
        let index = ids.indexOf("FIELD_REPAIR");
        if (index < 0) index = ids.indexOf("SIGNAL_MAGNET");
        if (index < 0) index = ids.indexOf("DELTA_RANK");
        if (index < 0) index = 0;
        console.log(`V2_2E_SURVIVAL_DRAFT_${width}=L${await data("level")}:HP${await data("hp")}:${ids.join(",")}=>${ids[index]}`);
        await clickDraft(canvas, index, count);
        await page.waitForTimeout(180);
        resolved += 1;
      }
      assert.equal(await data("draft-open"), "false", `${label} must resume combat after bounded legal draft resolution`);
    };

    // V2-2E proves the inherited integrated Rank-I four-slot surface, not V2-3B1
    // DELTA progression. Preserve the already-qualified onboarding route here:
    // ORBIT -> ECHO -> SIGNAL. DELTA remains mandatory Rank I and occupies slot 1;
    // the dedicated V2-3B1 proof owns DELTA II-V. No state is injected and every
    // acquisition is made through the real draft UI.
    await moveUntilDraft(2, 58_000, "level-2 integrated-build draft");
    const level2Ids = list(await data("draft-ids"));
    assert.deepEqual(new Set(level2Ids), new Set(["ORBIT_NODES", "VECTOR_NEEDLE", "DELTA_RANK"]));
    await chooseBuildCard("ORBIT_NODES", "level-2 integrated-build draft");
    assert.equal(await data("delta-rank"), "1");
    assert.equal(await data("orbit-owned"), "true");
    assert.equal(await data("weapon-slots-used"), "2");

    await moveUntilDraft(3, 64_000, "level-3 integrated-build draft");
    await chooseBuildCard("ECHO_MINE", "level-3 integrated-build draft");
    assert.equal(await data("echo-owned"), "true");
    assert.equal(await data("weapon-slots-used"), "3");

    await moveUntilDraft(4, 76_000, "level-4 integrated-build draft");
    await chooseBuildCard("SIGNAL_ARC", "level-4 integrated-build draft");
    assert.equal(await data("signal-owned"), "true");
    assert.equal(await data("weapon-slots-used"), "4");

    assert.equal(await data("orbit-owned"), "true");
    assert.equal(await data("echo-owned"), "true");
    assert.equal(await data("signal-owned"), "true");
    assert.equal(await data("vector-owned"), "false");
    if (bool(await data("draft-open"))) await resolvePostBuildDrafts("post-build");
    assert.equal(await data("controls-dimmed"), "false");
    assert.equal(await data("dead"), "false");

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-2e-full-build-${width}.png`) });

    const orbitHitsBefore = Number(await data("orbit-hits"));
    const echoPlacementsBefore = Number(await data("echo-placements"));
    const echoArmedBefore = Number(await data("echo-armed-transitions"));
    const echoReturnsBefore = Number(await data("echo-returns"));
    const signalCastsBefore = Number(await data("signal-casts"));
    const signalHitsBefore = Number(await data("signal-hits"));
    const signalMultiBefore = Number(await data("signal-multi-target-casts"));
    const signalInvalidationsBefore = Number(await data("signal-shift-graph-invalidations"));
    const shiftsBefore = Number(await data("shifts"));

    const integratedDeadline = Date.now() + 30_000;
    let cycles = 0;
    while (Date.now() < integratedDeadline) {
      if (bool(await data("draft-open"))) {
        await resolvePostBuildDrafts("integrated-observation");
        continue;
      }
      if (bool(await data("dead"))) throw new Error("died during V2-2E integrated four-weapon observation");
      assert.equal(Number(await data("weapon-slots-used")), 4, "weapon capacity must remain exactly 4/4");
      assert.ok(Number(await data("active-enemies")) <= 48, "enemy pool must remain hard-capped");
      assert.ok(Number(await data("echo-active-mines")) <= 3, "ECHO active mines must remain hard-capped");
      assert.ok(Number(await data("vector-in-flight")) <= 2, "VECTOR pool evidence must remain within global cap even when unowned");
      assert.ok(list(await data("signal-last-chain-ids")).length <= 3, "SIGNAL ARC chain must remain hard-capped");

      const integrated =
        Number(await data("orbit-hits")) > orbitHitsBefore
        && Number(await data("echo-placements")) > echoPlacementsBefore
        && Number(await data("echo-armed-transitions")) > echoArmedBefore
        && Number(await data("echo-returns")) > echoReturnsBefore
        && Number(await data("signal-casts")) > signalCastsBefore
        && Number(await data("signal-hits")) > signalHitsBefore
        && Number(await data("signal-multi-target-casts")) > signalMultiBefore
        && Number(await data("signal-shift-graph-invalidations")) > signalInvalidationsBefore
        && list(await data("signal-last-chain-ids")).length >= 1;
      if (integrated) break;

      // Keep the exact four-direction route and SHIFT schedule, but do not leave
      // the bot stationary for most of the full-build observation. The prior
      // 220ms move / 360ms idle cadence repeatedly died at low natural HP before
      // the unchanged coexistence assertions could be observed. This harness-only
      // duty-cycle repair changes no gameplay state, damage, HP, XP, spawns, ranks,
      // or evidence requirements.
      await canvas.press(route[routeIndex++ % route.length], { delay: 420 });
      await page.waitForTimeout(120);
      cycles += 1;
      if (cycles % 4 === 0 && !bool(await data("draft-open"))) {
        await shift(canvas, width);
        await page.waitForTimeout(320);
        if (!bool(await data("draft-open"))) {
          await shift(canvas, width);
          await page.waitForTimeout(320);
        }
      }
    }

    if (bool(await data("draft-open"))) await resolvePostBuildDrafts("final-integrated");
    assert.ok(Number(await data("orbit-hits")) > orbitHitsBefore, "ORBIT must continue real contact activity under 4/4 load");
    assert.ok(Number(await data("echo-placements")) > echoPlacementsBefore, "ECHO must continue placing mines under 4/4 load");
    assert.ok(Number(await data("echo-armed-transitions")) > echoArmedBefore, "ECHO must still arm when leaving its recorded phase");
    assert.ok(Number(await data("echo-returns")) > echoReturnsBefore, "ECHO must still register memory return under full load");
    assert.ok(Number(await data("signal-casts")) > signalCastsBefore, "SIGNAL ARC must continue automatic casting under full load");
    assert.ok(Number(await data("signal-hits")) > signalHitsBefore, "SIGNAL ARC must continue real damage under full load");
    assert.ok(Number(await data("signal-multi-target-casts")) > signalMultiBefore, "SIGNAL ARC must produce bounded multi-target activity under full load");
    assert.ok(Number(await data("signal-shift-graph-invalidations")) > signalInvalidationsBefore, "SHIFT must continue rewriting ARC graph authority under full load");
    assert.ok(Number(await data("shifts")) > shiftsBefore, "integrated proof must include real SHIFT input");

    const phase = await data("signal-last-cast-phase");
    const chainIds = list(await data("signal-last-chain-ids"));
    const chainKinds = list(await data("signal-last-chain-kinds"));
    assert.ok(chainIds.length >= 1 && chainIds.length <= 3);
    assert.equal(new Set(chainIds).size, chainIds.length);
    assertChainPhase(chainKinds, phase);

    assert.equal(await data("delta-fx"), "canonical-exclusive");
    assert.equal(await data("delta-rank"), "1");
    assert.equal(await data("orbit-owned"), "true");
    assert.equal(await data("echo-owned"), "true");
    assert.equal(await data("signal-owned"), "true");
    assert.equal(await data("vector-owned"), "false");
    assert.equal(await data("draft-open"), "false");
    assert.equal(await data("controls-dimmed"), "false");
    assert.equal(await data("dead"), "false");
    assert.equal(Number(await data("weapon-slots-used")), 4);
    assert.ok(Number(await data("echo-active-mines")) <= 3);
    assert.ok(Number(await data("active-enemies")) <= 48);

    if (width === 390) assert.equal(await reduceMotion.isChecked(), true, "reduced-motion mode must remain active through integrated proof");

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-2e-integrated-${width}.png`) });
    console.log(`RARE_SHIFT_V2_2E_CROSS_WEAPON_${width}=PASS`);
    if (width === 390) console.log("RARE_SHIFT_V2_2E_REDUCED_MOTION=PASS");
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 280_000,
    screenshot: resolve(`artifacts/rare-shift-v2-2e-host-${width}.png`),
    check: qualify(width),
  });
}
