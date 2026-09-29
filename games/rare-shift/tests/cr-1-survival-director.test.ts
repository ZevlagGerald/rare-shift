import assert from "node:assert/strict";
import test from "node:test";
import {
  CR1_CHECKPOINTS,
  CR1_STAGES,
  buildDirectedSpawnSpec,
  checkpointRewards,
  claimCheckpointRewards,
  dueCheckpoints,
  emptyCR1RewardLedger,
  isFlickerKind,
  nextFlickerKind,
  selectCheckpointSpawnSlotIndex,
  stageForElapsedMs,
} from "../src/cr1-director-core.ts";
import { enemyBaseHp, enemyContactDamage, enemyMoveSpeed, enemyThreatPhase, isEnemyCorporeal } from "../src/phase-combat-core.ts";

test("CR-1 finite stage timeline has exact deterministic boundaries", () => {
  assert.deepEqual(CR1_STAGES.map(stage => stage.id), ["STAGE_I", "STAGE_II", "STAGE_III", "STAGE_IV", "BOSS_PENDING"]);
  assert.equal(stageForElapsedMs(0).id, "STAGE_I");
  assert.equal(stageForElapsedMs(79_999).id, "STAGE_I");
  assert.equal(stageForElapsedMs(80_000).id, "STAGE_II");
  assert.equal(stageForElapsedMs(179_999).id, "STAGE_II");
  assert.equal(stageForElapsedMs(180_000).id, "STAGE_III");
  assert.equal(stageForElapsedMs(284_999).id, "STAGE_III");
  assert.equal(stageForElapsedMs(285_000).id, "STAGE_IV");
  assert.equal(stageForElapsedMs(359_999).id, "STAGE_IV");
  assert.equal(stageForElapsedMs(360_000).id, "BOSS_PENDING");
  assert.equal(stageForElapsedMs(999_999).spawnIntervalMs, null);
});

test("CR-1 directed spawn sequence is deterministic and stage-gated", () => {
  const player = { x: 900, y: 600 };
  const snapshots = [20_000, 120_000, 220_000, 320_000].map((elapsedMs, stageIndex) =>
    Array.from({ length: 40 }, (_, i) => buildDirectedSpawnSpec(13699, stageIndex * 100 + i, elapsedMs, player)),
  );
  const again = [20_000, 120_000, 220_000, 320_000].map((elapsedMs, stageIndex) =>
    Array.from({ length: 40 }, (_, i) => buildDirectedSpawnSpec(13699, stageIndex * 100 + i, elapsedMs, player)),
  );
  assert.deepEqual(snapshots, again);

  const stageOneKinds = new Set(snapshots[0].map(spec => spec?.kind));
  assert.equal(stageOneKinds.has("BEACON"), false);
  assert.equal(stageOneKinds.has("ANCHOR"), false);
  assert.equal(stageOneKinds.has("FLICKER_A"), false);
  assert.equal(stageOneKinds.has("FLICKER_B"), false);

  const stageTwoKinds = new Set(snapshots[1].map(spec => spec?.kind));
  assert.ok(stageTwoKinds.has("BEACON"));
  assert.equal(stageTwoKinds.has("ANCHOR"), false);

  const stageThreeKinds = new Set(snapshots[2].map(spec => spec?.kind));
  assert.ok(stageThreeKinds.has("ANCHOR"));
  assert.ok(stageThreeKinds.has("FLICKER_A") || stageThreeKinds.has("FLICKER_B"));

  const stageFourKinds = new Set(snapshots[3].map(spec => spec?.kind));
  assert.ok(stageFourKinds.has("BEACON"));
  assert.ok(stageFourKinds.has("ANCHOR"));
  assert.ok(stageFourKinds.has("FLICKER_A") || stageFourKinds.has("FLICKER_B"));
  assert.equal(buildDirectedSpawnSpec(13699, 999, 360_000, player), null);
});

test("CR-1 checkpoint schedule is deterministic and reports each unspawned checkpoint once", () => {
  assert.deepEqual(CR1_CHECKPOINTS.map(checkpoint => [checkpoint.id, checkpoint.atMs]), [
    ["ELITE_I", 80_000],
    ["CHECKPOINT_ELITE", 180_000],
    ["ELITE_II", 285_000],
  ]);
  const spawned = new Set<"ELITE_I" | "CHECKPOINT_ELITE" | "ELITE_II">();
  assert.deepEqual(dueCheckpoints(79_999, spawned), []);
  assert.deepEqual(dueCheckpoints(80_000, spawned).map(item => item.id), ["ELITE_I"]);
  spawned.add("ELITE_I");
  assert.deepEqual(dueCheckpoints(180_000, spawned).map(item => item.id), ["CHECKPOINT_ELITE"]);
  spawned.add("CHECKPOINT_ELITE");
  assert.deepEqual(dueCheckpoints(285_000, spawned).map(item => item.id), ["ELITE_II"]);
});

test("CR-1 checkpoint slot selection preserves ordinary capacity and reclaims only regular enemies", () => {
  assert.equal(selectCheckpointSpawnSlotIndex([
    { active: true, elite: false },
    { active: false, elite: false },
    { active: true, elite: true },
  ]), 1);
  assert.equal(selectCheckpointSpawnSlotIndex([
    { active: true, elite: true },
    { active: true, elite: false },
    { active: true, elite: false },
  ]), 1);
  assert.equal(selectCheckpointSpawnSlotIndex([
    { active: true, elite: true },
    { active: true, elite: true },
  ]), -1);
});

test("CR-1 elite reward ledger is exactly-once and checkpoint core rule is bounded", () => {
  let ledger = emptyCR1RewardLedger();
  const first = claimCheckpointRewards(ledger, "ELITE_I", 0);
  assert.equal(first.newlyClaimed, true);
  assert.deepEqual(first.rewards, ["EVOLUTION_CORE", "REPAIR"]);
  ledger = first.ledger;
  const duplicate = claimCheckpointRewards(ledger, "ELITE_I", 0);
  assert.equal(duplicate.newlyClaimed, false);
  assert.deepEqual(duplicate.rewards, []);

  assert.deepEqual(checkpointRewards("CHECKPOINT_ELITE", 1), ["EVOLUTION_CORE", "VACUUM"]);
  assert.deepEqual(checkpointRewards("CHECKPOINT_ELITE", 2), ["VACUUM"]);
  assert.deepEqual(checkpointRewards("ELITE_II", 2), ["EVOLUTION_CORE", "DISCHARGE"]);
});

test("CR-1 enemy contracts expose distinct bounded pressure roles", () => {
  assert.equal(enemyThreatPhase("BEACON"), "COMMON");
  assert.equal(enemyThreatPhase("ANCHOR"), "COMMON");
  assert.equal(enemyThreatPhase("FLICKER_A"), "A");
  assert.equal(enemyThreatPhase("FLICKER_B"), "B");
  assert.equal(isEnemyCorporeal("FLICKER_A", "A"), true);
  assert.equal(isEnemyCorporeal("FLICKER_A", "B"), false);
  assert.ok(enemyBaseHp("ANCHOR") > enemyBaseHp("TRACE"));
  assert.ok(enemyMoveSpeed("ANCHOR") < enemyMoveSpeed("TRACE"));
  assert.ok(enemyContactDamage("ANCHOR") > enemyContactDamage("TRACE"));
  assert.ok(enemyBaseHp("BEACON") > enemyBaseHp("SPLIT_A"));
});

test("CR-1 FLICKER changes alignment without changing identity cadence helper semantics", () => {
  assert.equal(isFlickerKind("FLICKER_A"), true);
  assert.equal(isFlickerKind("FLICKER_B"), true);
  assert.equal(isFlickerKind("TRACE"), false);
  assert.equal(nextFlickerKind("FLICKER_A"), "FLICKER_B");
  assert.equal(nextFlickerKind("FLICKER_B"), "FLICKER_A");
});
