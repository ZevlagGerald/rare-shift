from pathlib import Path

path = Path("scripts/v2-3b5-signal-browser.mjs")
source = path.read_text(encoding="utf-8")

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
        const beforeIds = ids.join(",");
        const beforeNonce = Number(await data("reroll-nonce"));
        await canvas.press("r");
        await page.waitForTimeout(140);
        assert.equal(await data("draft-open"), "true", "REFRACT must keep the draft open");
        assert.equal(Number(await data("refracts")), 0, "natural REFRACT must consume exactly one charge");
        assert.equal(Number(await data("reroll-nonce")), beforeNonce + 1, "natural REFRACT must advance reroll nonce exactly once");
        ids = list(await data("draft-ids"));
        count = Number(await data("draft-count"));
        assert.equal(ids.length, count, "REFRACT replacement ids/count mismatch");
        assert.equal(new Set(ids).size, ids.length, "REFRACT replacement choices must be distinct");
        assert.notEqual(ids.join(","), beforeIds, "REFRACT must replace the visible triple when alternatives exist");
        console.log(`V2_3B5_NATURAL_REFRACT_${width}=L${await data("level")}:HP${await data("hp")}:${beforeIds}=>${ids.join(",")}`);
        signalIndex = ids.indexOf("SIGNAL_RANK");
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
      let fallback = ids.indexOf("FIELD_REPAIR");
      if (fallback < 0) fallback = ids.indexOf("ECHO_RANK");
      if (fallback < 0) fallback = ids.indexOf("ORBIT_RANK");
      if (fallback < 0) fallback = ids.indexOf("DELTA_RANK");
      if (fallback < 0) fallback = ids.indexOf("SIGNAL_MAGNET");
      if (fallback < 0) fallback = 0;
      console.log(`V2_3B5_NATURAL_ROUTE_${width}=L${await data("level")}:${ids.join(",")}=>${ids[fallback]}`);
      await clickDraft(canvas, fallback, count);
      await page.waitForTimeout(120);'''

count = source.count(before)
if count != 1:
    raise RuntimeError(f"B5 REFRACT route anchor: expected exactly one block, found {count}")

path.write_text(source.replace(before, after, 1), encoding="utf-8")
print("PATCHED=B5_NATURAL_REFRACT_ROUTE")
