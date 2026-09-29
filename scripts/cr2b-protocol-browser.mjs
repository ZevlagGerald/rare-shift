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
  assert.ok(box, "draft canvas must have a bounding box");
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
async function enableReducedMotion(game, width) {
  const control = game.getByRole("checkbox", { name: /Reduce motion/i });
  if (width === 390) {
    await control.check();
    assert.equal(await control.isChecked(), true);
  }
  return control;
}
async function mount(game) {
  await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
  const canvas = game.locator("canvas");
  await canvas.waitFor({ state: "visible" });
  await canvas.focus();
  return canvas;
}

function naturalProtocolQualification(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    const reduced = await enableReducedMotion(game, width);
    const canvas = await mount(game);
    const data = name => canvas.getAttribute(`data-${name}`);
    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;

    const moveUntilDraft = async (minimumLevel, deadlineMs, label) => {
      const deadline = Date.now() + deadlineMs;
      while (Date.now() < deadline && !(bool(await data("draft-open")) && Number(await data("level")) >= minimumLevel)) {
        if (bool(await data("dead"))) {
          throw new Error(`died before ${label}; L${await data("level")}; HP${await data("hp")}; K${await data("kills")}; E${await data("director-elapsed-ms")}`);
        }
        if (!bool(await data("draft-open"))) {
          await canvas.press(route[routeIndex++ % route.length], { delay: 520 });
          await page.waitForTimeout(160);
          if (routeIndex % 5 === 0 && !bool(await data("draft-open"))) {
            await shift(canvas, width);
            await page.waitForTimeout(95);
          }
        }
      }
      assert.equal(await data("draft-open"), "true", `expected ${label}; L${await data("level")}; HP${await data("hp")}; K${await data("kills")}; E${await data("director-elapsed-ms")}`);
      assert.ok(Number(await data("level")) >= minimumLevel, `${label} must be level ${minimumLevel}+`);
    };

    const chooseLegacy = async (id, label) => {
      const ids = list(await data("draft-ids"));
      const count = Number(await data("draft-count"));
      assert.equal(ids.length, count, `${label} ids/count mismatch`);
      assert.equal(new Set(ids).size, ids.length, `${label} choices must be distinct`);
      const index = ids.indexOf(id);
      assert.ok(index >= 0, `${label} requires ${id}: ${ids.join(",")}`);
      console.log(`CR2B_NATURAL_DRAFT_${width}=L${await data("level")}:HP${await data("hp")}:${ids.join(",")}=>${id}`);
      await clickDraft(canvas, index, count);
      await page.waitForTimeout(120);
    };

    assert.equal(await data("protocol-slots-used"), "0");
    assert.equal(await data("refracts"), "1");
    assert.equal(await data("reroll-nonce"), "0");

    await moveUntilDraft(2, 60_000, "level-2 ORBIT draft");
    assert.deepEqual(new Set(list(await data("draft-ids"))), new Set(["ORBIT_NODES", "VECTOR_NEEDLE", "DELTA_RANK"]));
    await chooseLegacy("ORBIT_NODES", "level-2 ORBIT draft");

    await moveUntilDraft(3, 70_000, "level-3 ECHO draft");
    await chooseLegacy("ECHO_MINE", "level-3 ECHO draft");

    await moveUntilDraft(4, 85_000, "level-4 SIGNAL draft");
    await chooseLegacy("SIGNAL_ARC", "level-4 SIGNAL draft");
    assert.equal(await data("weapon-slots-used"), "4");
    assert.equal(await data("protocol-slots-used"), "0");

    await moveUntilDraft(5, 95_000, "first Level-5+ Protocol draft");
    const beforeRefract = list(await data("draft-candidate-ids"));
    assert.equal(beforeRefract.length, 3);
    assert.equal(new Set(beforeRefract).size, 3);
    assert.equal(await data("refracts"), "1");
    assert.equal(await data("reroll-nonce"), "0");
    await canvas.press("r");
    await page.waitForTimeout(120);
    assert.equal(await data("draft-open"), "true");
    assert.equal(await data("refracts"), "0");
    assert.equal(await data("reroll-nonce"), "1");
    const afterRefract = list(await data("draft-candidate-ids"));
    assert.equal(afterRefract.length, 3);
    assert.equal(new Set(afterRefract).size, 3);
    assert.notDeepEqual(afterRefract, beforeRefract, "REFRACT must replace the ordered triple when alternatives exist");
    console.log(`CR2B_NATURAL_REFRACT_${width}=BEFORE:${beforeRefract.join("|")}=>AFTER:${afterRefract.join("|")}`);

    let selectedProtocol = "";
    for (let targetLevel = 5; targetLevel <= 12 && !selectedProtocol; targetLevel += 1) {
      if (!(bool(await data("draft-open")) && Number(await data("level")) >= targetLevel)) {
        await moveUntilDraft(targetLevel, 100_000, `level-${targetLevel} Protocol opportunity`);
      }
      const candidateIds = list(await data("draft-candidate-ids"));
      const legacyIds = list(await data("draft-ids"));
      const count = Number(await data("draft-count"));
      assert.equal(candidateIds.length, count);
      assert.equal(legacyIds.length, count);
      let protocolIndex = candidateIds.findIndex(id => id.startsWith("PROTOCOL_ACQUIRE:"));
      if (protocolIndex >= 0) {
        const candidateId = candidateIds[protocolIndex];
        const family = candidateId.split(":")[1];
        const baseRadiusBefore = Number(await data("pickup-radius"));
        const effectiveBefore = Number(await data("effective-pickup-radius"));
        assert.equal(effectiveBefore, baseRadiusBefore, "before first Protocol, effective radius must equal base radius");
        console.log(`CR2B_NATURAL_PROTOCOL_DRAFT_${width}=L${await data("level")}:HP${await data("hp")}:${candidateIds.join(",")}=>${candidateId}`);
        await clickDraft(canvas, protocolIndex, count);
        await page.waitForTimeout(140);
        assert.equal(await data("protocol-slots-used"), "1");
        assert.match(String(await data("protocols")), new RegExp(`(?:^|,)${family}:1(?:,|$)`, "u"));
        const baseRadiusAfter = Number(await data("pickup-radius"));
        const effectiveAfter = Number(await data("effective-pickup-radius"));
        assert.equal(baseRadiusAfter, baseRadiusBefore, "Protocol acquisition must not mutate base pickup radius");
        assert.equal(effectiveAfter, Math.min(240, baseRadiusAfter + 4), "Rank-I Protocol must provide the bounded +4px standalone field benefit");
        selectedProtocol = family;
        break;
      }

      let fallback = legacyIds.indexOf("FIELD_REPAIR");
      if (fallback < 0) fallback = legacyIds.indexOf("ORBIT_RANK");
      if (fallback < 0) fallback = legacyIds.indexOf("DELTA_RANK");
      if (fallback < 0) fallback = legacyIds.indexOf("SIGNAL_MAGNET");
      if (fallback < 0) fallback = candidateIds.findIndex(id => !id.startsWith("PROTOCOL_"));
      if (fallback < 0) fallback = 0;
      console.log(`CR2B_NATURAL_PROTOCOL_ROUTE_${width}=L${await data("level")}:${candidateIds.join(",")}=>${candidateIds[fallback]}`);
      await clickDraft(canvas, fallback, count);
      await page.waitForTimeout(120);
    }

    assert.notEqual(selectedProtocol, "", "natural production route must expose and acquire a Protocol by level 12");
    assert.equal(await data("dead"), "false");
    assert.equal(await data("refracts"), "0");
    assert.equal(await data("reroll-nonce"), "1");
    if (width === 390) assert.equal(await reduced.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-cr2b-natural-protocol-${width}.png`) });
    console.log(`RARE_SHIFT_CR2B_NATURAL_PROTOCOL_REFRACT_${width}=PASS:${selectedProtocol}`);
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 190_000,
    screenshot: resolve(`artifacts/rare-shift-cr2b-natural-host-${width}.png`),
    check: naturalProtocolQualification(width),
  });
}

console.log("RARE_SHIFT_CR2B_PROTOCOL_BROWSER=PASS");
