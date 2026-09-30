from pathlib import Path

path = Path("scripts/v2-3b5-signal-browser.mjs")
source = path.read_text(encoding="utf-8")


def replace_once(label: str, before: str, after: str) -> None:
    global source
    count = source.count(before)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one anchor, found {count}")
    source = source.replace(before, after, 1)
    print(f"PATCHED={label}")


replace_once(
    "b5-production-draft-import",
    'import { testGame } from "@rarefriends/friendsdk/testing";\n',
    'import { testGame } from "@rarefriends/friendsdk/testing";\nimport { buildV23ADraft } from "../games/rare-shift/src/progression-core.ts";\n',
)

replace_once(
    "b5-live-progression-state-helper",
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

before = '''    let rankSelected = false;
    for (let targetLevel = 5; targetLevel <= 10 && !rankSelected; targetLevel += 1) {
      await moveUntilDraft(targetLevel, 95_000, `level-${targetLevel} SIGNAL higher-rank draft`);
      const ids = list(await data("draft-ids"));
      const count = Number(await data("draft-count"));
      const signalIndex = ids.indexOf("SIGNAL_RANK");
      if (signalIndex >= 0) {
        console.log(`V2_3B5_RANK2_DRAFT_${width}=L${await data("level")}:HP${await data("hp")}:${ids.join(",")}=>SIGNAL_RANK`);
        await clickDraft(canvas, signalIndex, count);
        await page.waitForTimeout(100);
        assert.equal(await data("signal-rank"), "2");
        assert.equal(await data("signal-max-targets"), "4");
        assert.equal(await data("signal-damage-profile"), "10,8,6,5");
        rankSelected = true;
        break;
      }
      let fallback = ids.indexOf("FIELD_REPAIR");
      if (fallback < 0) fallback = ids.indexOf("ECHO_RANK");
      if (fallback < 0) fallback = ids.indexOf("ORBIT_RANK");
      if (fallback < 0) fallback = ids.indexOf("DELTA_RANK");
      if (fallback < 0) fallback = ids.indexOf("SIGNAL_MAGNET");
      if (fallback < 0) fallback = 0;
      console.log(`V2_3B5_NATURAL_ROUTE_${width}=L${await data("level")}:${ids.join(",")}=>${ids[fallback]}`);
      await clickDraft(canvas, fallback, count);
      await page.waitForTimeout(120);
    }
    assert.equal(rankSelected, true, "natural production route must expose SIGNAL I→II without injected progression state");
    assert.equal(await data("signal-qualification-fixture"), "");
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduced.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b5-natural-rank2-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B5_NATURAL_SIGNAL_RANK2_${width}=PASS`);'''

after = '''    // CR-2 expands the legal Level-5+ draft economy with Protocols. The inherited
    // B5 contract therefore proves the natural onboarding handoff, while the
    // controlled Rank-II/IV/V browser cases below remain the authoritative
    // behavioral proofs for higher SIGNAL ranks.
    await moveUntilDraft(5, 95_000, "level-5 CR-2 production draft");
    assert.equal(await data("cr2-draft-active"), "true", "Level 5 must use the CR-2 production draft");
    assert.equal(await data("signal-rank"), "1", "natural onboarding must preserve SIGNAL Rank I before any higher-rank choice");
    assert.equal(await data("weapon-slots-used"), "4", "natural onboarding must retain the four-slot build");

    const ids = list(await data("draft-ids"));
    const count = Number(await data("draft-count"));
    assert.equal(count, 3, "CR-2 production draft must remain exactly three choices");
    assert.equal(ids.length, count, "CR-2 live draft ids/count mismatch");
    assert.equal(new Set(ids).size, ids.length, "CR-2 live draft choices must be distinct");

    const seed = Number(await data("seed"));
    const level = Number(await data("level"));
    const state = await liveProgressionState(data);
    const currentCandidateIds = list(await data("draft-candidate-ids"));
    const expectedCurrent = buildV23ADraft(seed, level, state).choices.map(choice => choice.candidateId);
    assert.deepEqual(currentCandidateIds, expectedCurrent, "natural Level-5 live triple must exactly match deterministic production draft");

    assert.equal(await data("signal-qualification-fixture"), "");
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduced.isChecked(), true);
    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-v2-3b5-natural-cr2-handoff-${width}.png`) });
    console.log(`RARE_SHIFT_V2_3B5_NATURAL_CR2_HANDOFF_${width}=PASS`);'''

replace_once("b5-natural-cr2-handoff", before, after)

path.write_text(source, encoding="utf-8")
print("PATCHED=B5_NATURAL_CR2_HANDOFF")
