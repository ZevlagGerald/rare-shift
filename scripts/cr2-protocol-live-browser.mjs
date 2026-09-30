import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";
import { buildV23ADraft, useV23ARefract } from "../games/rare-shift/src/progression-core.ts";

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
    assert.ok(box, "narrow canvas must have a bounding box");
    await canvas.click({ position: { x: box.width * 842 / 960, y: box.height * 530 / 640 } });
  } else {
    await canvas.press("Space");
  }
}
async function mount(game) {
  await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
  const canvas = game.locator("canvas");
  await canvas.waitFor({ state: "visible" });
  await canvas.focus();
  return canvas;
}
async function liveProgressionState(data) {
  const weapons = { DELTA: { rank: Number(await data("delta-rank")), evolved: false } };
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

function qualification(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    const reduced = game.getByRole("checkbox", { name: /Reduce motion/i });
    if (width === 390) {
      await reduced.check();
      assert.equal(await reduced.isChecked(), true);
    }

    const canvas = await mount(game);
    const data = name => canvas.getAttribute(`data-${name}`);
    const route = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    let routeIndex = 0;

    const moveUntilDraft = async (minimumLevel, deadlineMs, label) => {
      const deadline = Date.now() + deadlineMs;
      while (Date.now() < deadline && !(bool(await data("draft-open")) && Number(await data("level")) >= minimumLevel)) {
        if (bool(await data("dead"))) throw new Error(`died before ${label}; L${await data("level")}; HP${await data("hp")}; K${await data("kills")}; E${await data("director-elapsed-ms")}`);
        if (!bool(await data("draft-open"))) {
          await canvas.press(route[routeIndex++ % route.length], { delay: 520 });
          await page.waitForTimeout(150);
          if (routeIndex % 5 === 0 && !bool(await data("draft-open"))) {
            await shift(canvas, width);
            await page.waitForTimeout(90);
          }
        }
      }
      assert.equal(await data("draft-open"), "true", `expected ${label}`);
      assert.ok(Number(await data("level")) >= minimumLevel, `${label} must reach level ${minimumLevel}+`);
    };

    const chooseLegacy = async (id, label) => {
      const ids = list(await data("draft-ids"));
      const count = Number(await data("draft-count"));
      assert.equal(ids.length, count, `${label} ids/count mismatch`);
      const index = ids.indexOf(id);
      assert.ok(index >= 0, `${label} requires ${id}: ${ids.join(",")}`);
      await clickDraft(canvas, index, count);
      await page.waitForTimeout(110);
    };

    // Use the already-qualified B2 natural onboarding route. By Level 5 this
    // owns VECTOR, ORBIT and ECHO, giving MEMORY FUSE both a matching ECHO
    // effect and its matching-independent repair passive.
    await moveUntilDraft(2, 60_000, "level-2 VECTOR draft");
    await chooseLegacy("VECTOR_NEEDLE", "level-2 VECTOR draft");
    await moveUntilDraft(3, 70_000, "level-3 ORBIT draft");
    await chooseLegacy("ORBIT_NODES", "level-3 ORBIT draft");
    await moveUntilDraft(4, 85_000, "level-4 ECHO draft");
    await chooseLegacy("ECHO_MINE", "level-4 ECHO draft");

    await moveUntilDraft(5, 95_000, "level-5 CR-2 Protocol draft");
    assert.equal(await data("cr2-draft-active"), "true");
    assert.equal(await data("weapon-slots-used"), "4");
    assert.equal(await data("protocol-slots-used"), "0");

    const seed = Number(await data("seed"));
    const level5 = Number(await data("level"));
    const state5 = await liveProgressionState(data);
    const level5Candidates = list(await data("draft-candidate-ids"));
    const expected5 = buildV23ADraft(seed, level5, state5).choices.map(choice => choice.candidateId);
    assert.deepEqual(level5Candidates, expected5, "Level-5 live CR-2 draft must exactly match deterministic production draft");
    assert.equal(level5Candidates.some(id => id.startsWith("EVOLUTION:")), false, "Protocol-only live draft must not leak Evolution choices");

    const memoryCandidate = "PROTOCOL_ACQUIRE:MEMORY_FUSE";
    const memoryIndex = level5Candidates.indexOf(memoryCandidate);
    assert.ok(memoryIndex >= 0, `qualified natural Level-5 route must expose ${memoryCandidate}: ${level5Candidates.join(",")}`);

    const beforeProtocol = {
      echoLifetimeMs: Number(await data("echo-protocol-lifetime-ms")),
      echoReturnDelayMs: Number(await data("echo-return-delay-ms")),
      echoTriggerRadius: Number(await data("echo-protocol-trigger-radius")),
      repairBonusHp: Number(await data("protocol-repair-bonus-hp")),
      slots: Number(await data("protocol-slots-used")),
    };
    await clickDraft(canvas, memoryIndex, Number(await data("draft-count")));
    await page.waitForTimeout(120);

    assert.equal(await data("draft-open"), "false");
    assert.ok(list(await data("protocols")).includes("MEMORY_FUSE:1"), "MEMORY FUSE Rank I must persist in live Protocol inventory");
    assert.equal(Number(await data("protocol-slots-used")), beforeProtocol.slots + 1);
    assert.equal(Number(await data("protocol-repair-bonus-hp")), 2, "MEMORY FUSE universal repair passive must be live");
    assert.ok(Number(await data("echo-protocol-lifetime-ms")) > beforeProtocol.echoLifetimeMs, "MEMORY FUSE must increase live ECHO lifetime");
    assert.ok(Number(await data("echo-return-delay-ms")) < beforeProtocol.echoReturnDelayMs, "MEMORY FUSE must reduce live ECHO return delay");
    assert.ok(Number(await data("echo-protocol-trigger-radius")) > beforeProtocol.echoTriggerRadius, "MEMORY FUSE must increase live ECHO trigger radius");

    // Persistence + real keyboard REFRACT interaction are qualified on the next
    // natural CR-2 draft rather than through a fixture.
    await moveUntilDraft(6, 105_000, "level-6 CR-2 REFRACT draft");
    assert.ok(list(await data("protocols")).includes("MEMORY_FUSE:1"), "Protocol inventory must persist across later levels");
    assert.equal(Number(await data("protocol-slots-used")), 1);
    assert.equal(await data("cr2-draft-active"), "true");

    const level6 = Number(await data("level"));
    const state6 = await liveProgressionState(data);
    const initialCandidates = list(await data("draft-candidate-ids"));
    const initialDraft = buildV23ADraft(seed, level6, state6);
    assert.deepEqual(initialCandidates, initialDraft.choices.map(choice => choice.candidateId));
    assert.ok(initialDraft.legalCandidateCount > 3, "REFRACT qualification requires at least four legal alternatives");
    assert.equal(initialCandidates.some(id => id.startsWith("EVOLUTION:")), false);
    assert.equal(state6.refracts, 1, "natural CR-2 run must still own its initial REFRACT before use");

    const expectedReroll = useV23ARefract(seed, level6, state6);
    await canvas.press("r");
    await page.waitForTimeout(120);

    const replacementCandidates = list(await data("draft-candidate-ids"));
    assert.equal(await data("draft-open"), "true", "REFRACT must keep the replacement draft open");
    assert.equal(Number(await data("refracts")), expectedReroll.state.refracts);
    assert.equal(Number(await data("reroll-nonce")), expectedReroll.state.rerollNonce);
    assert.deepEqual(replacementCandidates, expectedReroll.draft.choices.map(choice => choice.candidateId), "live REFRACT replacement triple must exactly match deterministic core");
    assert.notDeepEqual(replacementCandidates, initialCandidates, "REFRACT must produce a different ordered triple when alternatives exist");
    assert.equal(replacementCandidates.some(id => id.startsWith("EVOLUTION:")), false, "REFRACT must not leak Evolution choices before evolved runtime qualification");
    assert.ok(list(await data("protocols")).includes("MEMORY_FUSE:1"), "REFRACT must not mutate owned Protocol inventory");
    assert.equal(Number(await data("protocol-slots-used")), 1);
    assert.equal(await data("dead"), "false");
    if (width === 390) assert.equal(await reduced.isChecked(), true);

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-cr2-protocol-live-${width}.png`) });
    console.log(`RARE_SHIFT_CR2_PROTOCOL_LIVE_${width}=PASS`);
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 360_000,
    screenshot: resolve(`artifacts/rare-shift-cr2-protocol-host-${width}.png`),
    check: qualification(width),
  });
}

console.log("RARE_SHIFT_CR2_PROTOCOL_BROWSER=PASS");
