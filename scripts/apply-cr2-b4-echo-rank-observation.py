from pathlib import Path

phaser_path = Path("games/rare-shift/src/phaser-survival.ts")
phaser = phaser_path.read_text(encoding="utf-8")

def replace_once(text: str, label: str, before: str, after: str) -> str:
    count = text.count(before)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one anchor, found {count}")
    print(f"PATCHED={label}")
    return text.replace(before, after, 1)

phaser = replace_once(
    phaser,
    "b4-causal-rank-choice-diagnostics",
    '''      const result = applyCR2ProtocolDraftChoiceToLive(this.seed, this.level, this.buildCR2LiveSnapshot(), choice.candidateId);
      this.applyCR2Projection(result.projection);
      for (const view of this.draftViews) view.destroy(true);''',
    '''      const echoPlacementsBeforeChoice = this.echoPlacements;
      const echoTriggersBeforeChoice = this.echoTriggers;
      const result = applyCR2ProtocolDraftChoiceToLive(this.seed, this.level, this.buildCR2LiveSnapshot(), choice.candidateId);
      this.applyCR2Projection(result.projection);
      if (choice.id === "ECHO_RANK") {
        this.game.canvas.dataset.echoRankChoicePlacementDelta = String(this.echoPlacements - echoPlacementsBeforeChoice);
        this.game.canvas.dataset.echoRankChoiceTriggerDelta = String(this.echoTriggers - echoTriggersBeforeChoice);
      }
      for (const view of this.draftViews) view.destroy(true);''',
)
phaser_path.write_text(phaser, encoding="utf-8")

browser_path = Path("scripts/v2-3b4-echo-browser.mjs")
browser = browser_path.read_text(encoding="utf-8")

browser = replace_once(
    browser,
    "b4-rank2-causal-observation",
    '''        const triggersBefore = Number(await data("echo-triggers"));
        const placementsBefore = Number(await data("echo-placements"));
        console.log(`V2_3B4_RANK2_DRAFT_${width}=L${await data("level")}:HP${await data("hp")}:${ids.join(",")}=>ECHO_RANK`);
        await clickDraft(canvas, echoIndex, count);
        await page.waitForTimeout(70);
        assert.equal(await data("echo-rank"), "2");
        assert.equal(await data("echo-max-active"), "4");
        assert.equal(Number(await data("echo-triggers")), triggersBefore, "rank card must not detonate a mine");
        assert.equal(Number(await data("echo-placements")), placementsBefore, "rank card must not manufacture a mine");''',
    '''        console.log(`V2_3B4_RANK2_DRAFT_${width}=L${await data("level")}:HP${await data("hp")}:${ids.join(",")}=>ECHO_RANK`);
        await clickDraft(canvas, echoIndex, count);
        await page.waitForTimeout(70);
        assert.equal(await data("echo-rank"), "2");
        assert.equal(await data("echo-max-active"), "4");
        assert.equal(await data("echo-rank-choice-trigger-delta"), "0", "ECHO rank transaction must not detonate a mine");
        assert.equal(await data("echo-rank-choice-placement-delta"), "0", "ECHO rank transaction must not manufacture a mine");''',
)
browser_path.write_text(browser, encoding="utf-8")

print("PATCHED=B4_ECHO_CAUSAL_RANK_OBSERVATION")
