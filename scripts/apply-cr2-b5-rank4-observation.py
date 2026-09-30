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


before = '''    const deadline = Date.now() + 65_000;
    let extendedObserved = false;
    while (Date.now() < deadline && !extendedObserved) {
      if (bool(await data("dead"))) throw new Error("died before real Rank-IV extended COMMON relay");
      if (bool(await data("draft-open"))) { await clearDraft(canvas, data); await page.waitForTimeout(80); continue; }
      await canvas.press(route[routeIndex++ % route.length], { delay: 480 });
      await page.waitForTimeout(90);
      if (routeIndex % 5 === 0) { await shift(canvas, width); await page.waitForTimeout(70); }
      extendedObserved = Number(await data("signal-extended-common-relay-casts")) > 0;
    }
    assert.equal(extendedObserved, true, "Rank IV must produce a real >180px <=240px COMMON relay edge");
    assert.ok(Number(await data("signal-common-bonus-casts")) > 0);
    assert.ok(list(await data("signal-last-chain-edge-ranges")).map(Number).includes(240));
    assert.ok(list(await data("signal-last-chain-common-bonus")).includes("1"));'''

after = '''    // The qualification fixture may cast before this observation loop begins.
    // Use event-relative counters so an earlier qualifying cast cannot make us
    // inspect a later ordinary cast as if it were the boosted relay event.
    const extendedBefore = Number(await data("signal-extended-common-relay-casts"));
    const commonBonusBefore = Number(await data("signal-common-bonus-casts"));
    const deadline = Date.now() + 65_000;
    let extendedObserved = false;
    let observedEdgeRanges = [];
    let observedCommonBonus = [];
    while (Date.now() < deadline && !extendedObserved) {
      if (bool(await data("dead"))) throw new Error("died before real Rank-IV extended COMMON relay");
      if (bool(await data("draft-open"))) { await clearDraft(canvas, data); await page.waitForTimeout(80); continue; }
      await canvas.press(route[routeIndex++ % route.length], { delay: 480 });
      await page.waitForTimeout(90);
      if (routeIndex % 5 === 0) { await shift(canvas, width); await page.waitForTimeout(70); }
      const extendedNow = Number(await data("signal-extended-common-relay-casts"));
      if (extendedNow > extendedBefore) {
        observedEdgeRanges = list(await data("signal-last-chain-edge-ranges")).map(Number);
        observedCommonBonus = list(await data("signal-last-chain-common-bonus"));
        extendedObserved = true;
      }
    }
    assert.equal(extendedObserved, true, "Rank IV must produce a new real >180px <=240px COMMON relay edge during observation");
    assert.ok(Number(await data("signal-common-bonus-casts")) > commonBonusBefore, "Rank IV observed relay must increment the COMMON-bonus cast counter");
    assert.ok(observedEdgeRanges.includes(240), `qualifying Rank-IV relay must expose a 240px edge range: ${observedEdgeRanges.join(",")}`);
    assert.ok(observedCommonBonus.includes("1"), `qualifying Rank-IV relay must mark the COMMON bonus edge: ${observedCommonBonus.join(",")}`);'''

replace_once("b5-rank4-event-relative-observation", before, after)

path.write_text(source, encoding="utf-8")
print("PATCHED=B5_RANK4_EVENT_RELATIVE_OBSERVATION")
