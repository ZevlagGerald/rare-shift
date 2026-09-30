from pathlib import Path

path = Path("scripts/v2-3b2-vector-browser.mjs")
source = path.read_text(encoding="utf-8")


def replace_once(label: str, before: str, after: str) -> None:
    global source
    count = source.count(before)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one anchor, found {count}")
    source = source.replace(before, after, 1)
    print(f"PATCHED={label}")


replace_once(
    "b2-production-draft-import",
    'import { testGame } from "@rarefriends/friendsdk/testing";\n',
    'import { testGame } from "@rarefriends/friendsdk/testing";\nimport { buildV23ADraft } from "../games/rare-shift/src/progression-core.ts";\n',
)

replace_once(
    "b2-live-progression-state-helper",
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
      await moveUntilDraft(targetLevel, 90_000, `level-${targetLevel} VECTOR higher-rank draft`);
      const ids = list(await data("draft-ids"));
      const count = Number(await data("draft-count"));
      const vectorIndex = ids.indexOf("VECTOR_RANK");
      if (vectorIndex >= 0) {
        const shotsBefore = Number(await data("vector-shots"));
        console.log(`V2_3B2_RANK2_DRAFT_${width}=L${await data("level")}:HP${await data("hp")}:${ids.join(",")}=>VECTOR_RANK`);
        await clickDraft(canvas, vectorIndex, count);
        assert.equal(await data("vector-rank"), "2");
        assert.equal(Number(await data("vector-shots")), shotsBefore, "rank selection itself must not manufacture a free VECTOR projectile");
        rankSelected = true;
        break;
      }
      let fallback = ids.indexOf("FIELD_REPAIR");
      if (fallback < 0) fallback = ids.indexOf("DELTA_RANK");
      if (fallback < 0) fallback = ids.indexOf("SIGNAL_MAGNET");
      if (fallback < 0) fallback = 0;
      assert.ok(fallback >= 0 && fallback < count, "natural fallback must be a rendered legal card");
      console.log(`V2_3B2_NATURAL_ROUTE_${width}=L${await data("level")}:${ids.join(",")}=>${ids[fallback]}`);
      await clickDraft(canvas, fallback, count);
      await page.waitForTimeout(180);
    }
    assert.equal(rankSelected, true, "natural production route must expose VECTOR I→II without injected progression state");
    assert.equal(await data("vector-rank"), "2");
    assert.equal(await data("vector-qualification-fixture"), "");
    assert.equal(await data("dead"), "false");

    const penetrationBefore = Number(await data("vector-penetration-hits"));
    const penetrationDeadline = Date.now() + 32_000;
    while (Date.now() < penetrationDeadline && Number(await data("vector-penetration-hits")) <= penetrationBefore) {
      if (bool(await data("draft-open"))) {
        const ids = list(await data("draft-ids"));
        const count = Number(await data("draft-count"));
        let index = ids.indexOf("FIELD_REPAIR");
        if (index < 0) index = ids.indexOf("SIGNAL_MAGNET");
        if (index < 0) index = ids.indexOf("DELTA_RANK");
        if (index < 0) index = 0;
        await clickDraft(canvas, index, count);
        await page.waitForTimeout(160);
        continue;
      }
      if (bool(await data("dead"))) throw new Error("died during Rank-II penetration observation");
      await canvas.press(route[routeIndex++ % route.length], { delay: 200 });
      await page.waitForTimeout(260);
    }
    assert.ok(Number(await data("vector-penetration-hits")) > penetrationBefore, "Rank II must produce a real secondary line hit in browser combat");
    assert.equal(await data("vector-profile"), "rank2-phase-targeted");
    if (width === 390) assert.equal(await reduceMotion.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b2-natural-rank2-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B2_NATURAL_VECTOR_RANK2_${width}=PASS`);
    console.log(`RARE_SHIFT_V2_3B2_VECTOR_RANK2_PENETRATION_${width}=PASS`);'''

after_natural = '''    // CR-2 expands the legal Level-5+ draft economy with Protocols. The inherited
    // B2 requirement that VECTOR Rank II must appear before a browser bot dies is
    // therefore no longer a stable mechanic proof. Natural play still proves the
    // qualified acquisition path and must hand off exactly into the deterministic
    // production CR-2 draft without any qualification fixture or injected state.
    await moveUntilDraft(5, 90_000, "level-5 CR-2 VECTOR handoff draft");
    assert.equal(await data("vector-qualification-fixture"), "");
    assert.equal(await data("vector-owned"), "true");
    assert.equal(await data("vector-rank"), "1", "natural handoff must precede any controlled higher-rank fixture");
    assert.equal(await data("weapon-slots-used"), "4");
    assert.equal(await data("cr2-draft-active"), "true");
    const ids = list(await data("draft-ids"));
    const count = Number(await data("draft-count"));
    assert.equal(count, 3, "CR-2 production handoff must render exactly three choices");
    assert.equal(ids.length, count, "CR-2 handoff ids/count mismatch");
    assert.equal(new Set(ids).size, ids.length, "CR-2 handoff choices must be distinct");
    const state = await liveProgressionState(data);
    const expected = buildV23ADraft(Number(await data("seed")), Number(await data("level")), state).choices.map(choice => choice.candidateId);
    assert.deepEqual(list(await data("draft-candidate-ids")), expected, "live VECTOR CR-2 handoff must exactly match deterministic production draft");
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduceMotion.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b2-natural-cr2-handoff-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B2_NATURAL_CR2_HANDOFF_${width}=PASS`);'''

replace_once("b2-natural-cr2-handoff", before_natural, after_natural)

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

    assert.equal(await data("vector-qualification-fixture"), "VECTOR_RANK_2");
    assert.equal(await data("vector-owned"), "true");
    assert.equal(await data("vector-rank"), "2");
    assert.equal(await data("vector-profile"), "rank2-phase-targeted");

    const penetrationBefore = Number(await data("vector-penetration-hits"));
    const penetrationDeadline = Date.now() + 45_000;
    while (Date.now() < penetrationDeadline && Number(await data("vector-penetration-hits")) <= penetrationBefore) {
      if (bool(await data("draft-open"))) {
        const ids = list(await data("draft-ids"));
        const count = Number(await data("draft-count"));
        let index = ids.indexOf("FIELD_REPAIR");
        if (index < 0) index = ids.indexOf("SIGNAL_MAGNET");
        if (index < 0) index = ids.indexOf("DELTA_RANK");
        if (index < 0) index = 0;
        await clickDraft(canvas, index, count);
        await page.waitForTimeout(120);
        continue;
      }
      if (bool(await data("dead"))) throw new Error("died before a real controlled Rank-II VECTOR penetration hit");
      await canvas.press(route[routeIndex++ % route.length], { delay: 260 });
      await page.waitForTimeout(120);
      if (routeIndex % 5 === 0) {
        await shift(canvas, width);
        await page.waitForTimeout(70);
      }
    }

    assert.ok(Number(await data("vector-penetration-hits")) > penetrationBefore, "Rank II fixture must produce a real secondary line hit in browser combat");
    assert.equal(await data("vector-rank"), "2");
    assert.equal(await data("vector-profile"), "rank2-phase-targeted");
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduceMotion.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b2-rank2-penetration-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B2_VECTOR_RANK2_PENETRATION_${width}=PASS`);
  };
}

'''

replace_once(
    "b2-rank2-controlled-proof",
    '\nfunction transferQualification(width) {\n',
    rank2_fixture + 'function transferQualification(width) {\n',
)

replace_once(
    "b2-run-rank2-controlled-proof",
    '''  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 70_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b2-transfer-host-${width}.png`),
    check: transferQualification(width),
  });''',
    '''  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 75_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b2-rank2-host-${width}.png`),
    check: rank2Qualification(width),
  });
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 70_000,
    screenshot: resolve(`artifacts/rare-shift-v2-3b2-transfer-host-${width}.png`),
    check: transferQualification(width),
  });''',
)

path.write_text(source, encoding="utf-8")
print("PATCHED=B2_VECTOR_NATURAL_CR2_HANDOFF")
