from pathlib import Path

path = Path("scripts/v2-3b3-orbit-browser.mjs")
source = path.read_text(encoding="utf-8")


def replace_once(label: str, before: str, after: str) -> None:
    global source
    count = source.count(before)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one anchor, found {count}")
    source = source.replace(before, after, 1)
    print(f"PATCHED={label}")


replace_once(
    "b3-production-draft-import",
    'import { testGame } from "@rarefriends/friendsdk/testing";\n',
    'import { testGame } from "@rarefriends/friendsdk/testing";\nimport { buildV23ADraft } from "../games/rare-shift/src/progression-core.ts";\n',
)

replace_once(
    "b3-live-progression-state-helper",
    'function list(value) { return String(value ?? "").split(",").filter(Boolean); }\n',
    '''function list(value) { return String(value ?? "").split(",").filter(Boolean); }
async function liveProgressionState(data) {
  const weapons = {
    DELTA: { rank: Number(await data("delta-rank")), evolved: false },
  };
  for (const [family, ownedKey, rankKey] of [
    ["VECTOR", "vector-owned", "vector-rank"],
    ["ORBIT", "orbit-owned", "orbit-rank"],
    ["ECHO", "echo-owned", "echo-rank"],
    ["SIGNAL", "signal-owned", "signal-rank"],
  ]) {
    if (bool(await data(ownedKey))) weapons[family] = { rank: Number(await data(rankKey)), evolved: false };
  }
  const protocols = {};
  for (const entry of list(await data("protocols"))) {
    const [family, rankText] = entry.split(":");
    const rank = Number(rankText);
    assert.ok(family && Number.isInteger(rank) && rank >= 1 && rank <= 3, `invalid live Protocol entry ${entry}`);
    protocols[family] = rank;
  }
  return {
    weapons,
    protocols,
    evolutionCores: Number(await data("evolution-cores")),
    refracts: Number(await data("refracts")),
    rerollNonce: Number(await data("reroll-nonce")),
    hp: Number(await data("hp")),
    maxHp: 100,
    pickupRadius: Number(await data("pickup-radius")),
  };
}
''',
)

before_natural = '''    let rankSelected = false;
    for (let targetLevel = 5; targetLevel <= 8 && !rankSelected; targetLevel += 1) {
      await moveUntilDraft(targetLevel, 90_000, `level-${targetLevel} ORBIT higher-rank draft`);
      const ids = list(await data("draft-ids"));
      const count = Number(await data("draft-count"));
      const orbitIndex = ids.indexOf("ORBIT_RANK");
      if (orbitIndex >= 0) {
        const shearBefore = Number(await data("orbit-shear-events"));
        console.log(`V2_3B3_RANK2_DRAFT_${width}=L${await data("level")}:HP${await data("hp")}:${ids.join(",")}=>ORBIT_RANK`);
        await clickDraft(canvas, orbitIndex, count);
        await page.waitForTimeout(80);
        assert.equal(await data("orbit-rank"), "2");
        assert.equal(await data("orbit-node-count"), "2");
        assert.equal(Number(await data("orbit-shear-events")), shearBefore, "Rank II selection must not manufacture PHASE SHEAR");
        rankSelected = true;
        break;
      }
      let fallback = ids.indexOf("FIELD_REPAIR");
      if (fallback < 0) fallback = ids.indexOf("DELTA_RANK");
      if (fallback < 0) fallback = ids.indexOf("SIGNAL_MAGNET");
      if (fallback < 0) fallback = 0;
      console.log(`V2_3B3_NATURAL_ROUTE_${width}=L${await data("level")}:${ids.join(",")}=>${ids[fallback]}`);
      await clickDraft(canvas, fallback, count);
      await page.waitForTimeout(180);
    }
    assert.equal(rankSelected, true, "natural production route must expose ORBIT I→II without injected progression state");
    assert.equal(await data("orbit-qualification-fixture"), "");

    const nodeAngles = numbers(await data("orbit-node-angles"));
    assert.equal(nodeAngles.length, 2);
    assert.ok(Math.abs(circularDistance(nodeAngles[0], nodeAngles[1]) - Math.PI) < 0.01, `Rank II nodes must be 180 degrees apart: ${nodeAngles.join(",")}`);

    const hitsBefore = Number(await data("orbit-hits"));
    const hitDeadline = Date.now() + 28_000;
    while (Date.now() < hitDeadline && Number(await data("orbit-hits")) <= hitsBefore) {
      if (bool(await data("draft-open"))) { await clearDraftAvoidOrbitRank(canvas, data); await page.waitForTimeout(100); continue; }
      if (bool(await data("dead"))) throw new Error("died during Rank-II ORBIT hit observation");
      await canvas.press(route[routeIndex++ % route.length], { delay: 320 });
      await page.waitForTimeout(220);
    }
    assert.ok(Number(await data("orbit-hits")) > hitsBefore, "Rank II must produce real normal ORBIT contact damage");
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduceMotion.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b3-natural-rank2-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B3_NATURAL_ORBIT_RANK2_${width}=PASS`);
    console.log(`RARE_SHIFT_V2_3B3_ORBIT_RANK2_SPACING_${width}=PASS`);'''

after_natural = '''    // CR-2 expands the Level-5+ draft economy with Protocols, so the inherited
    // requirement that ORBIT Rank II must surface before the natural browser bot
    // dies is no longer a stable progression invariant. Natural play still proves
    // genuine ORBIT acquisition and an exact handoff into the production CR-2 draft.
    await moveUntilDraft(5, 90_000, "level-5 CR-2 ORBIT handoff draft");
    assert.equal(await data("orbit-qualification-fixture"), "");
    assert.equal(await data("orbit-owned"), "true");
    assert.equal(await data("orbit-rank"), "1", "natural handoff must precede controlled higher-rank proof");
    assert.equal(await data("orbit-node-count"), "1");
    assert.equal(await data("weapon-slots-used"), "4");
    assert.equal(await data("cr2-draft-active"), "true");
    const ids = list(await data("draft-ids"));
    const count = Number(await data("draft-count"));
    assert.equal(count, 3, "CR-2 ORBIT handoff must render exactly three choices");
    assert.equal(ids.length, count, "CR-2 ORBIT handoff ids/count mismatch");
    assert.equal(new Set(ids).size, ids.length, "CR-2 ORBIT handoff choices must be distinct");
    const state = await liveProgressionState(data);
    const expected = buildV23ADraft(Number(await data("seed")), Number(await data("level")), state).choices.map(choice => choice.candidateId);
    assert.deepEqual(list(await data("draft-candidate-ids")), expected, "live ORBIT CR-2 handoff must exactly match deterministic production draft");
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduceMotion.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b3-natural-cr2-handoff-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B3_NATURAL_CR2_HANDOFF_${width}=PASS`);'''

replace_once("b3-natural-cr2-handoff", before_natural, after_natural)

rank2_fixture = '''
function rank2Qualification(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    const reduceMotion = await enableReducedMotion(game, width);
    await setRankFixture(game, 2);
    const canvas = await mount(game);
    const data = name => canvas.getAttribute(`data-${name}`);
    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;

    assert.equal(await data("orbit-qualification-fixture"), "ORBIT_RANK_2");
    assert.equal(await data("orbit-owned"), "true");
    assert.equal(await data("orbit-rank"), "2");
    assert.equal(await data("orbit-node-count"), "2");
    assert.equal(await data("orbit-shear-events"), "0", "Rank II fixture must not fabricate PHASE SHEAR history");

    const nodeAngles = numbers(await data("orbit-node-angles"));
    assert.equal(nodeAngles.length, 2);
    assert.ok(Math.abs(circularDistance(nodeAngles[0], nodeAngles[1]) - Math.PI) < 0.01, `Rank II nodes must be 180 degrees apart: ${nodeAngles.join(",")}`);

    const hitsBefore = Number(await data("orbit-hits"));
    const hitDeadline = Date.now() + 45_000;
    while (Date.now() < hitDeadline && Number(await data("orbit-hits")) <= hitsBefore) {
      if (bool(await data("draft-open"))) {
        await clearDraftAvoidOrbitRank(canvas, data);
        await page.waitForTimeout(100);
        continue;
      }
      if (bool(await data("dead"))) throw new Error("died before a real controlled Rank-II ORBIT contact hit");
      await canvas.press(route[routeIndex++ % route.length], { delay: 300 });
      await page.waitForTimeout(140);
      if (routeIndex % 5 === 0) {
        await shift(canvas, width);
        await page.waitForTimeout(70);
      }
    }

    assert.ok(Number(await data("orbit-hits")) > hitsBefore, "Rank II fixture must produce real normal ORBIT contact damage");
    assert.equal(await data("orbit-rank"), "2");
    assert.equal(await data("orbit-node-count"), "2");
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduceMotion.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b3-rank2-spacing-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B3_ORBIT_RANK2_SPACING_${width}=PASS`);
    console.log(`RARE_SHIFT_V2_3B3_ORBIT_RANK2_CONTACT_${width}=PASS`);
  };
}

'''

replace_once(
    "b3-rank2-controlled-proof",
    '\nfunction shearQualification(width) {\n',
    rank2_fixture + 'function shearQualification(width) {\n',
)

replace_once(
    "b3-run-rank2-controlled-proof",
    '''  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 75_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b3-shear-host-${width}.png`),
    check: shearQualification(width),
  });''',
    '''  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 75_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b3-rank2-host-${width}.png`),
    check: rank2Qualification(width),
  });
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 75_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b3-shear-host-${width}.png`),
    check: shearQualification(width),
  });''',
)

path.write_text(source, encoding="utf-8")
print("PATCHED=B3_ORBIT_NATURAL_CR2_HANDOFF")
