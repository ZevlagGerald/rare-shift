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
    "b5-progression-preview-import",
    'import { testGame } from "@rarefriends/friendsdk/testing";\n',
    'import { testGame } from "@rarefriends/friendsdk/testing";\nimport { buildV23ADraft, useV23ARefract } from "../games/rare-shift/src/progression-core.ts";\n',
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

before = '''      const ids = list(await data("draft-ids"));
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
      await page.waitForTimeout(120);'''

after = '''      let ids = list(await data("draft-ids"));
      let count = Number(await data("draft-count"));
      let signalIndex = ids.indexOf("SIGNAL_RANK");

      if (signalIndex < 0 && bool(await data("cr2-draft-active")) && Number(await data("refracts")) > 0) {
        const seed = Number(await data("seed"));
        const level = Number(await data("level"));
        const state = await liveProgressionState(data);
        const currentCandidateIds = list(await data("draft-candidate-ids"));
        const expectedCurrent = buildV23ADraft(seed, level, state).choices.map(choice => choice.candidateId);
        assert.deepEqual(currentCandidateIds, expectedCurrent, "live CR-2 triple must match deterministic production draft before REFRACT preview");

        const preview = useV23ARefract(seed, level, state);
        const previewCandidateIds = preview.draft.choices.map(choice => choice.candidateId);
        const previewHasSignal = preview.draft.choices.some(choice => choice.candidateType === "WEAPON_RANK" && choice.familyId === "SIGNAL");

        if (previewHasSignal) {
          const beforeIds = ids.join(",");
          const beforeNonce = Number(await data("reroll-nonce"));
          const beforeRefracts = Number(await data("refracts"));
          await canvas.press("r");
          await page.waitForTimeout(140);
          assert.equal(await data("draft-open"), "true", "REFRACT must keep the draft open");
          assert.equal(Number(await data("refracts")), beforeRefracts - 1, "natural REFRACT must consume exactly one charge");
          assert.equal(Number(await data("reroll-nonce")), beforeNonce + 1, "natural REFRACT must advance reroll nonce exactly once");
          assert.deepEqual(list(await data("draft-candidate-ids")), previewCandidateIds, "live REFRACT replacement must match deterministic production preview");
          ids = list(await data("draft-ids"));
          count = Number(await data("draft-count"));
          assert.equal(ids.length, count, "REFRACT replacement ids/count mismatch");
          assert.equal(new Set(ids).size, ids.length, "REFRACT replacement choices must be distinct");
          assert.notEqual(ids.join(","), beforeIds, "REFRACT must replace the visible triple when alternatives exist");
          console.log(`V2_3B5_NATURAL_REFRACT_${width}=L${level}:HP${await data("hp")}:${beforeIds}=>${ids.join(",")}`);
          signalIndex = ids.indexOf("SIGNAL_RANK");
          assert.ok(signalIndex >= 0, "deterministic REFRACT preview promised SIGNAL_RANK but live triple did not expose it");
        } else {
          console.log(`V2_3B5_REFRACT_SAVED_${width}=L${level}:HP${await data("hp")}:${ids.join(",")}=>NO_SIGNAL_IN_PREVIEW`);
        }
      }

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

      const survivabilityOrder = [
        "FIELD_REPAIR",
        "PROTOCOL_ORBIT_STABILIZER",
        "SIGNAL_MAGNET",
        "PROTOCOL_RESONANCE_COIL",
        "PROTOCOL_COMMON_CORE",
        "ECHO_RANK",
        "ORBIT_RANK",
        "DELTA_RANK",
        "PROTOCOL_VECTOR_LENS",
        "PROTOCOL_MEMORY_FUSE",
      ];
      let fallback = -1;
      for (const preferred of survivabilityOrder) {
        fallback = ids.indexOf(preferred);
        if (fallback >= 0) break;
      }
      if (fallback < 0) fallback = 0;
      console.log(`V2_3B5_NATURAL_ROUTE_${width}=L${await data("level")}:${ids.join(",")}=>${ids[fallback]}`);
      await clickDraft(canvas, fallback, count);
      await page.waitForTimeout(120);'''

replace_once("b5-deterministic-refract-route", before, after)

path.write_text(source, encoding="utf-8")
print("PATCHED=B5_DETERMINISTIC_REFRACT_ROUTE")
