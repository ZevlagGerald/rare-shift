import assert from "node:assert/strict";
import test from "node:test";
import { checkpointRewards, type CR1CheckpointId } from "../src/cr1-director-core.ts";
import {
  CR3E_BOSS_HANDOFF_MS,
  CR3E_CHECKPOINT_REWARD_RESERVE_SIZE,
  advanceCR3ECheckpointGate,
  beginCR3ECheckpointRewards,
  canStartCR3EBoss,
  collectCR3ECheckpointReward,
  createCR3ECheckpointGateState,
  selectCR3ECheckpointRewardSlotIndex,
  selectCR3EOrdinaryPickupSlotIndex,
  stageForCR3ECheckpointGate,
  type CR3ECheckpointGateState,
} from "../src/cr3e-checkpoint-gate-core.ts";

function resolveCheckpoint(
  state: CR3ECheckpointGateState,
  checkpointId: CR1CheckpointId,
  evolutionCoresOwned: number,
): CR3ECheckpointGateState {
  let next = beginCR3ECheckpointRewards(state, checkpointId, checkpointRewards(checkpointId, evolutionCoresOwned));
  for (const reward of [...next.pendingRewards]) {
    const result = collectCR3ECheckpointReward(next, checkpointId, reward);
    assert.equal(result.accepted, true);
    next = result.state;
  }
  return next;
}

test("CR-3E.1 activates ELITE I exactly at the Stage-I boundary and freezes progression", () => {
  let state = createCR3ECheckpointGateState();
  state = advanceCR3ECheckpointGate(state, 79_999).state;
  assert.equal(state.progressMs, 79_999);
  assert.equal(stageForCR3ECheckpointGate(state).id, "STAGE_I");

  const boundary = advanceCR3ECheckpointGate(state, 1);
  state = boundary.state;
  assert.equal(boundary.checkpointActivated, "ELITE_I");
  assert.equal(state.progressMs, 80_000);
  assert.equal(state.phase, "ELITE_ACTIVE");
  assert.equal(state.activeCheckpoint, "ELITE_I");
  assert.equal(stageForCR3ECheckpointGate(state).id, "STAGE_I");

  const frozen = advanceCR3ECheckpointGate(state, 30_000);
  assert.equal(frozen.checkpointActivated, null);
  assert.deepEqual(frozen.state, state);
});

test("CR-3E.1 requires the complete declared reward package before stage progression resumes", () => {
  let state = advanceCR3ECheckpointGate(createCR3ECheckpointGateState(), 80_000).state;
  state = beginCR3ECheckpointRewards(state, "ELITE_I", ["EVOLUTION_CORE", "REPAIR"]);
  assert.equal(state.phase, "REWARD_PENDING");
  assert.deepEqual(state.pendingRewards, ["EVOLUTION_CORE", "REPAIR"]);

  const core = collectCR3ECheckpointReward(state, "ELITE_I", "EVOLUTION_CORE");
  assert.equal(core.accepted, true);
  assert.equal(core.checkpointResolved, false);
  assert.deepEqual(core.state.pendingRewards, ["REPAIR"]);
  assert.equal(advanceCR3ECheckpointGate(core.state, 5_000).state.progressMs, 80_000);

  const duplicate = collectCR3ECheckpointReward(core.state, "ELITE_I", "EVOLUTION_CORE");
  assert.equal(duplicate.accepted, false);
  assert.deepEqual(duplicate.state, core.state);

  const repair = collectCR3ECheckpointReward(core.state, "ELITE_I", "REPAIR");
  assert.equal(repair.accepted, true);
  assert.equal(repair.checkpointResolved, true);
  assert.equal(repair.state.phase, "RUNNING");
  assert.deepEqual(repair.state.resolvedCheckpoints, ["ELITE_I"]);

  const resumed = advanceCR3ECheckpointGate(repair.state, 1).state;
  assert.equal(resumed.progressMs, 80_001);
  assert.equal(stageForCR3ECheckpointGate(resumed).id, "STAGE_II");
});

test("CR-3E.1 rejects reward transitions for the wrong checkpoint or wrong gate phase", () => {
  const initial = createCR3ECheckpointGateState();
  assert.throws(
    () => beginCR3ECheckpointRewards(initial, "ELITE_I", ["EVOLUTION_CORE"]),
    /active elite gate/u,
  );

  const eliteOne = advanceCR3ECheckpointGate(initial, 80_000).state;
  assert.throws(
    () => beginCR3ECheckpointRewards(eliteOne, "CHECKPOINT_ELITE", ["VACUUM"]),
    /active elite gate/u,
  );
  const wrongCollect = collectCR3ECheckpointReward(eliteOne, "ELITE_I", "EVOLUTION_CORE");
  assert.equal(wrongCollect.accepted, false);
});

test("CR-3E.1 preserves checkpoint order and fail-closes THE DESYNC until all gates resolve", () => {
  let state = createCR3ECheckpointGateState();

  state = advanceCR3ECheckpointGate(state, 80_000).state;
  assert.equal(state.activeCheckpoint, "ELITE_I");
  assert.equal(canStartCR3EBoss(state), false);
  state = resolveCheckpoint(state, "ELITE_I", 0);

  state = advanceCR3ECheckpointGate(state, 100_000).state;
  assert.equal(state.progressMs, 180_000);
  assert.equal(state.activeCheckpoint, "CHECKPOINT_ELITE");
  assert.deepEqual(state.resolvedCheckpoints, ["ELITE_I"]);
  state = resolveCheckpoint(state, "CHECKPOINT_ELITE", 1);

  state = advanceCR3ECheckpointGate(state, 105_000).state;
  assert.equal(state.progressMs, 285_000);
  assert.equal(state.activeCheckpoint, "ELITE_II");
  assert.deepEqual(state.resolvedCheckpoints, ["ELITE_I", "CHECKPOINT_ELITE"]);
  state = resolveCheckpoint(state, "ELITE_II", 2);

  state = advanceCR3ECheckpointGate(state, 74_999).state;
  assert.equal(state.progressMs, 359_999);
  assert.equal(canStartCR3EBoss(state), false);
  assert.equal(stageForCR3ECheckpointGate(state).id, "STAGE_IV");

  state = advanceCR3ECheckpointGate(state, 1).state;
  assert.equal(state.progressMs, CR3E_BOSS_HANDOFF_MS);
  assert.equal(stageForCR3ECheckpointGate(state).id, "BOSS_PENDING");
  assert.equal(canStartCR3EBoss(state), true);
  assert.deepEqual(state.resolvedCheckpoints, ["ELITE_I", "CHECKPOINT_ELITE", "ELITE_II"]);
});

test("CR-3E.1 deterministic replay produces identical gate decisions", () => {
  const run = () => {
    let state = createCR3ECheckpointGateState();
    const events: string[] = [];
    for (const delta of [40_000, 39_999, 1]) {
      const result = advanceCR3ECheckpointGate(state, delta);
      state = result.state;
      if (result.checkpointActivated) events.push(result.checkpointActivated);
    }
    state = resolveCheckpoint(state, "ELITE_I", 0);
    for (const delta of [50_000, 49_999, 1]) {
      const result = advanceCR3ECheckpointGate(state, delta);
      state = result.state;
      if (result.checkpointActivated) events.push(result.checkpointActivated);
    }
    return { state, events };
  };
  assert.deepEqual(run(), run());
});

test("CR-3E.1 reserves checkpoint reward capacity independently of a saturated ordinary pickup pool", () => {
  const ordinary = Array.from({ length: 64 }, () => ({ active: true, reservedForCheckpoint: false }));
  const reserved = Array.from({ length: CR3E_CHECKPOINT_REWARD_RESERVE_SIZE }, () => ({ active: false, reservedForCheckpoint: true }));
  const slots = [...ordinary, ...reserved];
  assert.equal(selectCR3EOrdinaryPickupSlotIndex(slots), -1);
  assert.equal(selectCR3ECheckpointRewardSlotIndex(slots), 64);
  slots[64] = { active: true, reservedForCheckpoint: true };
  assert.equal(selectCR3ECheckpointRewardSlotIndex(slots), 65);
  slots[65] = { active: true, reservedForCheckpoint: true };
  assert.equal(selectCR3ECheckpointRewardSlotIndex(slots), -1);
});

test("CR-3E.1 reserved delivery capacity covers every declared checkpoint reward package", () => {
  assert.ok(checkpointRewards("ELITE_I", 0).length <= CR3E_CHECKPOINT_REWARD_RESERVE_SIZE);
  assert.ok(checkpointRewards("CHECKPOINT_ELITE", 0).length <= CR3E_CHECKPOINT_REWARD_RESERVE_SIZE);
  assert.ok(checkpointRewards("CHECKPOINT_ELITE", 2).length <= CR3E_CHECKPOINT_REWARD_RESERVE_SIZE);
  assert.ok(checkpointRewards("ELITE_II", 2).length <= CR3E_CHECKPOINT_REWARD_RESERVE_SIZE);
});
