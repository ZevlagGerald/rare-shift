import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { testGame } from "@rarefriends/friendsdk/testing";

const gameDirectory = resolve("games/rare-shift");
await mkdir(resolve("artifacts"), { recursive: true });

function list(value) {
  return String(value ?? "").split(",").filter(Boolean);
}

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

async function chooseDraft(canvas, data) {
  const ids = list(await data("draft-ids"));
  const count = Number(await data("draft-count"));
  assert.equal(ids.length, count, "draft ids/count mismatch");
  const hp = Number(await data("hp"));
  const priority = hp <= 68
    ? ["FIELD_REPAIR", "ORBIT_RANK", "ECHO_RANK", "SIGNAL_RANK", "DELTA_RANK", "VECTOR_RANK", "ORBIT_NODES", "ECHO_MINE", "SIGNAL_ARC", "VECTOR_NEEDLE", "SIGNAL_MAGNET"]
    : ["ORBIT_NODES", "ECHO_MINE", "SIGNAL_ARC", "ORBIT_RANK", "ECHO_RANK", "SIGNAL_RANK", "DELTA_RANK", "VECTOR_NEEDLE", "VECTOR_RANK", "FIELD_REPAIR", "SIGNAL_MAGNET"];
  let index = -1;
  for (const id of priority) {
    index = ids.indexOf(id);
    if (index >= 0) break;
  }
  if (index < 0) index = 0;
  await clickDraft(canvas, index, count);
}

async function shift(canvas) {
  await canvas.press("Space");
}

async function moveSafeLane(canvas, data, tick) {
  const x = Number(await data("x"));
  const y = Number(await data("y"));
  let key;
  if (y < 250 && x < 1500) key = "ArrowRight";
  else if (x >= 1500 && y < 950) key = "ArrowDown";
  else if (y >= 950 && x > 300) key = "ArrowLeft";
  else if (x <= 300 && y > 250) key = "ArrowUp";
  else key = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"][Math.floor(tick / 10) % 4];
  await canvas.press(key, { delay: 420 });
}

async function moveTowardElite(canvas, data) {
  const x = Number(await data("x"));
  const y = Number(await data("y"));
  const eliteX = Number(await data("checkpoint-elite-x"));
  const eliteY = Number(await data("checkpoint-elite-y"));
  assert.ok(Number.isFinite(eliteX) && Number.isFinite(eliteY), "active checkpoint elite must expose deterministic diagnostics");
  const dx = eliteX - x;
  const dy = eliteY - y;
  const key = Math.abs(dx) >= Math.abs(dy)
    ? dx >= 0 ? "ArrowRight" : "ArrowLeft"
    : dy >= 0 ? "ArrowDown" : "ArrowUp";
  await canvas.press(key, { delay: 240 });
}

async function waitForCheckpointRuntime(page, canvas, width) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const state = await canvas.getAttribute("data-cr3e1-checkpoint-runtime");
    const error = await canvas.getAttribute("data-cr3e1-checkpoint-runtime-error");
    if (state === "ACTIVE") return;
    if (error) throw new Error(`CR-3E.1 runtime configuration failed at width ${width}: ${error}`);
    await page.waitForTimeout(100);
  }
  const state = await canvas.getAttribute("data-cr3e1-checkpoint-runtime");
  const error = await canvas.getAttribute("data-cr3e1-checkpoint-runtime-error");
  throw new Error(`CR-3E.1 runtime did not activate at width ${width}; state=${String(state)}; error=${String(error)}`);
}

function qualification(width) {
  return async ({ page, game }) => {
    await game.locator('[data-stage="scan"]').waitFor({ state: "visible" });
    const reduced = game.getByRole("checkbox", { name: /Reduce motion/i });
    if (width === 390) {
      await reduced.check();
      assert.equal(await reduced.isChecked(), true);
    }

    await game.getByRole("button", { name: /ENTER SIGNAL DESCENT/i }).click();
    const canvas = game.locator("canvas");
    await canvas.waitFor({ state: "visible" });
    await canvas.focus();
    const data = name => canvas.getAttribute(`data-${name}`);
    await waitForCheckpointRuntime(page, canvas, width);

    let tick = 0;
    const gateDeadline = Date.now() + 110_000;
    while (Date.now() < gateDeadline && String(await data("checkpoint-gate-active")) !== "ELITE_I") {
      assert.equal(await data("dead"), "false", `run died before ELITE_I gate at width ${width}`);
      if (await data("draft-open") === "true") {
        await chooseDraft(canvas, data);
        await page.waitForTimeout(70);
        continue;
      }
      await moveSafeLane(canvas, data, tick);
      tick += 1;
      if (tick % 7 === 0 && await data("draft-open") !== "true") await shift(canvas);
      await page.waitForTimeout(45);
    }

    assert.equal(await data("checkpoint-gate-active"), "ELITE_I", "ELITE_I checkpoint gate must activate naturally");
    assert.equal(await data("checkpoint-gate-phase"), "ELITE_ACTIVE");
    assert.equal(Number(await data("director-progress-ms")), 80_000, "director progression must stop exactly at the ELITE_I boundary");
    assert.equal(await data("director-stage"), "STAGE_I", "stage identity must remain Stage I until ELITE_I resolves");
    assert.equal(await data("boss-pending"), "false");

    const elapsedBeforeFreeze = Number(await data("director-elapsed-ms"));
    const spawnIndexBeforeFreeze = Number(await data("checkpoint-ordinary-spawn-index"));
    await canvas.press("ArrowLeft", { delay: 1_250 });
    await page.waitForTimeout(120);
    const elapsedAfterFreeze = Number(await data("director-elapsed-ms"));
    assert.ok(elapsedAfterFreeze > elapsedBeforeFreeze + 900, "combat/run clock must continue during checkpoint combat");
    assert.equal(Number(await data("director-progress-ms")), 80_000, "director progression must remain frozen while elite is unresolved");
    assert.equal(Number(await data("checkpoint-ordinary-spawn-index")), spawnIndexBeforeFreeze, "ordinary spawn sequence must not advance during checkpoint gate");
    assert.equal(await data("checkpoint-gate-active"), "ELITE_I");

    const resolveDeadline = Date.now() + 50_000;
    let huntTicks = 0;
    while (Date.now() < resolveDeadline && !list(await data("checkpoint-gate-resolved")).includes("ELITE_I")) {
      assert.equal(await data("dead"), "false", `run died while resolving ELITE_I at width ${width}`);
      if (await data("draft-open") === "true") {
        await chooseDraft(canvas, data);
        await page.waitForTimeout(70);
        continue;
      }
      const gatePhase = String(await data("checkpoint-gate-phase"));
      if (gatePhase === "ELITE_ACTIVE") {
        await moveTowardElite(canvas, data);
        huntTicks += 1;
        if (huntTicks % 6 === 0) await shift(canvas);
      } else {
        await page.waitForTimeout(90);
      }
      await page.waitForTimeout(35);
    }

    assert.ok(list(await data("checkpoint-gate-resolved")).includes("ELITE_I"), "ELITE_I gate must resolve after elite defeat and full reward collection");
    assert.equal(await data("checkpoint-gate-phase"), "RUNNING");
    assert.equal(await data("checkpoint-gate-active"), "");
    assert.equal(await data("checkpoint-gate-pending-rewards"), "");
    assert.equal(Number(await data("elites-defeated")), 1, "exactly one checkpoint elite must be credited");
    assert.ok(Number(await data("evolution-cores")) >= 1, "guaranteed ELITE_I Evolution Core must be collected before progression resumes");
    assert.equal(Number(await data("checkpoint-reserved-active")), 0, "reserved reward slots must be released after collection");

    await page.waitForTimeout(700);
    assert.ok(Number(await data("director-progress-ms")) > 80_000, "director progression must resume after full reward collection");
    assert.equal(await data("director-stage"), "STAGE_II", "Stage II must begin only after ELITE_I reward completion");
    assert.equal(await data("boss-pending"), "false");
    if (width === 390) assert.equal(await reduced.isChecked(), true, "reduced motion must remain enabled on narrow qualification");

    await page.locator(".rf-game-frame").screenshot({ path: resolve(`artifacts/rare-shift-cr3e1-checkpoint-${width}.png`) });
    console.log(`RARE_SHIFT_CR3E1_CHECKPOINT_${width}=PASS`);
    console.log(`RARE_SHIFT_CR3E1_CHECKPOINT_${width}_RUN_ELAPSED=${await data("director-elapsed-ms")}`);
    console.log(`RARE_SHIFT_CR3E1_CHECKPOINT_${width}_DIRECTOR_PROGRESS=${await data("director-progress-ms")}`);
    console.log(`RARE_SHIFT_CR3E1_CHECKPOINT_${width}_CORES=${await data("evolution-cores")}`);
  };
}

for (const width of [960, 390]) {
  await testGame(gameDirectory, {
    width,
    height: width === 960 ? 800 : 844,
    timeout: 170_000,
    screenshot: resolve(`artifacts/rare-shift-cr3e1-host-${width}.png`),
    check: qualification(width),
  });
}

console.log("RARE_SHIFT_CR3E1_CHECKPOINT_BROWSER=PASS");
