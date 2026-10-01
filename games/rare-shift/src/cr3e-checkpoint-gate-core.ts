import {
  CR1_CHECKPOINTS,
  stageForElapsedMs,
  type CR1CheckpointId,
  type CR1PickupKind,
  type CR1StageSpec,
} from "./cr1-director-core.ts";

export type CR3ECheckpointGatePhase = "RUNNING" | "ELITE_ACTIVE" | "REWARD_PENDING";

export interface CR3ECheckpointGateState {
  readonly progressMs: number;
  readonly phase: CR3ECheckpointGatePhase;
  readonly activeCheckpoint: CR1CheckpointId | null;
  readonly pendingRewards: readonly CR1PickupKind[];
  readonly resolvedCheckpoints: readonly CR1CheckpointId[];
}

export interface CR3ECheckpointAdvanceResult {
  readonly state: CR3ECheckpointGateState;
  readonly checkpointActivated: CR1CheckpointId | null;
}

export interface CR3ECheckpointRewardResult {
  readonly state: CR3ECheckpointGateState;
  readonly accepted: boolean;
  readonly checkpointResolved: boolean;
}

export interface CR3EPickupSlotCandidate {
  readonly active: boolean;
  readonly reservedForCheckpoint?: boolean;
}

export const CR3E_CHECKPOINT_REWARD_RESERVE_SIZE = 2 as const;
export const CR3E_BOSS_HANDOFF_MS = 360_000 as const;

const CHECKPOINT_ORDER: readonly CR1CheckpointId[] = Object.freeze(CR1_CHECKPOINTS.map(checkpoint => checkpoint.id));

function freezeState(state: CR3ECheckpointGateState): CR3ECheckpointGateState {
  return Object.freeze({
    ...state,
    pendingRewards: Object.freeze([...state.pendingRewards]),
    resolvedCheckpoints: Object.freeze([...state.resolvedCheckpoints]),
  });
}

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be finite and non-negative.`);
}

function hasResolved(state: CR3ECheckpointGateState, checkpointId: CR1CheckpointId): boolean {
  return state.resolvedCheckpoints.includes(checkpointId);
}

function unresolvedCheckpointAtOrAfter(state: CR3ECheckpointGateState): (typeof CR1_CHECKPOINTS)[number] | null {
  return CR1_CHECKPOINTS.find(checkpoint => !hasResolved(state, checkpoint.id) && checkpoint.atMs >= state.progressMs) ?? null;
}

export function createCR3ECheckpointGateState(): CR3ECheckpointGateState {
  return freezeState({
    progressMs: 0,
    phase: "RUNNING",
    activeCheckpoint: null,
    pendingRewards: [],
    resolvedCheckpoints: [],
  });
}

export function advanceCR3ECheckpointGate(
  state: CR3ECheckpointGateState,
  deltaMs: number,
): CR3ECheckpointAdvanceResult {
  assertFiniteNonNegative(state.progressMs, "CR-3E director progress");
  assertFiniteNonNegative(deltaMs, "CR-3E director delta");
  if (state.phase !== "RUNNING" || state.activeCheckpoint !== null) {
    return Object.freeze({ state, checkpointActivated: null });
  }

  const checkpoint = unresolvedCheckpointAtOrAfter(state);
  const target = state.progressMs + deltaMs;
  if (checkpoint && target >= checkpoint.atMs) {
    return Object.freeze({
      state: freezeState({
        ...state,
        progressMs: checkpoint.atMs,
        phase: "ELITE_ACTIVE",
        activeCheckpoint: checkpoint.id,
        pendingRewards: [],
      }),
      checkpointActivated: checkpoint.id,
    });
  }

  return Object.freeze({
    state: freezeState({ ...state, progressMs: target }),
    checkpointActivated: null,
  });
}

export function beginCR3ECheckpointRewards(
  state: CR3ECheckpointGateState,
  checkpointId: CR1CheckpointId,
  rewards: readonly CR1PickupKind[],
): CR3ECheckpointGateState {
  if (state.phase !== "ELITE_ACTIVE" || state.activeCheckpoint !== checkpointId) {
    throw new Error(`CR-3E checkpoint ${checkpointId} reward transition requires its active elite gate.`);
  }
  if (rewards.length === 0) throw new Error(`CR-3E checkpoint ${checkpointId} must declare at least one reward.`);
  if (rewards.length > CR3E_CHECKPOINT_REWARD_RESERVE_SIZE) {
    throw new Error(`CR-3E checkpoint ${checkpointId} reward package exceeds reserved delivery capacity.`);
  }
  return freezeState({
    ...state,
    phase: "REWARD_PENDING",
    pendingRewards: rewards,
  });
}

export function collectCR3ECheckpointReward(
  state: CR3ECheckpointGateState,
  checkpointId: CR1CheckpointId,
  reward: CR1PickupKind,
): CR3ECheckpointRewardResult {
  if (state.phase !== "REWARD_PENDING" || state.activeCheckpoint !== checkpointId) {
    return Object.freeze({ state, accepted: false, checkpointResolved: false });
  }
  const rewardIndex = state.pendingRewards.indexOf(reward);
  if (rewardIndex < 0) return Object.freeze({ state, accepted: false, checkpointResolved: false });

  const pendingRewards = state.pendingRewards.filter((_, index) => index !== rewardIndex);
  if (pendingRewards.length > 0) {
    return Object.freeze({
      state: freezeState({ ...state, pendingRewards }),
      accepted: true,
      checkpointResolved: false,
    });
  }

  const resolvedCheckpoints = CHECKPOINT_ORDER.filter(id => id === checkpointId || hasResolved(state, id));
  return Object.freeze({
    state: freezeState({
      ...state,
      phase: "RUNNING",
      activeCheckpoint: null,
      pendingRewards: [],
      resolvedCheckpoints,
    }),
    accepted: true,
    checkpointResolved: true,
  });
}

export function stageForCR3ECheckpointGate(state: CR3ECheckpointGateState): CR1StageSpec {
  const stageTime = state.phase === "RUNNING"
    ? state.progressMs
    : Math.max(0, state.progressMs - 1);
  return stageForElapsedMs(stageTime);
}

export function cr3eCheckpointGateResolvedCount(state: CR3ECheckpointGateState): number {
  return state.resolvedCheckpoints.length;
}

export function canStartCR3EBoss(state: CR3ECheckpointGateState): boolean {
  return state.phase === "RUNNING"
    && state.activeCheckpoint === null
    && state.progressMs >= CR3E_BOSS_HANDOFF_MS
    && CHECKPOINT_ORDER.every(checkpointId => hasResolved(state, checkpointId));
}

export function selectCR3EOrdinaryPickupSlotIndex(slots: readonly CR3EPickupSlotCandidate[]): number {
  return slots.findIndex(slot => !slot.active && !slot.reservedForCheckpoint);
}

export function selectCR3ECheckpointRewardSlotIndex(slots: readonly CR3EPickupSlotCandidate[]): number {
  return slots.findIndex(slot => !slot.active && slot.reservedForCheckpoint === true);
}
