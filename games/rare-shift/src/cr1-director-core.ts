import { deterministicUnit, V21_WORLD_HEIGHT, V21_WORLD_WIDTH, type Vec2 } from "./survival-core.ts";
import type { V2EnemyKind } from "./phase-combat-core.ts";

export type CR1StageId = "STAGE_I" | "STAGE_II" | "STAGE_III" | "STAGE_IV" | "BOSS_PENDING";
export type CR1CheckpointId = "ELITE_I" | "CHECKPOINT_ELITE" | "ELITE_II";
export type CR1PickupKind = "SIGNAL_XP" | "REPAIR" | "VACUUM" | "DISCHARGE" | "EVOLUTION_CORE";

export interface CR1StageSpec {
  readonly id: CR1StageId;
  readonly label: string;
  readonly startsAtMs: number;
  readonly endsAtMs: number | null;
  readonly spawnIntervalMs: number | null;
}

export interface CR1DirectedSpawnSpec {
  readonly id: number;
  readonly kind: V2EnemyKind;
  readonly position: Vec2;
}

export interface CR1CheckpointSpec {
  readonly id: CR1CheckpointId;
  readonly atMs: number;
  readonly kind: V2EnemyKind;
  readonly hpMultiplier: number;
  readonly label: string;
}

export interface CR1RewardLedger {
  readonly ELITE_I: boolean;
  readonly CHECKPOINT_ELITE: boolean;
  readonly ELITE_II: boolean;
}

export interface CR1RewardClaim {
  readonly ledger: CR1RewardLedger;
  readonly rewards: readonly CR1PickupKind[];
  readonly newlyClaimed: boolean;
}

export const CR1_FLICKER_SWITCH_MS = 2200 as const;
export const CR1_FLICKER_WARNING_MS = 400 as const;
export const CR1_BEACON_TELEGRAPH_MS = 450 as const;
export const CR1_BEACON_COOLDOWN_MS = 2100 as const;
export const CR1_BEACON_PROJECTILE_LIFETIME_MS = 2600 as const;
export const CR1_BEACON_PROJECTILE_SPEED = 280 as const;
export const CR1_BEACON_PROJECTILE_DAMAGE = 7 as const;
export const CR1_MAX_BEACON_PROJECTILES = 24 as const;
export const CR1_ELITE_PULSE_TELEGRAPH_MS = 500 as const;
export const CR1_ELITE_PULSE_COOLDOWN_MS = 2800 as const;
export const CR1_ELITE_PULSE_RADIUS = 116 as const;
export const CR1_ELITE_PULSE_DAMAGE = 7 as const;

export const CR1_STAGES: readonly CR1StageSpec[] = Object.freeze([
  Object.freeze({ id: "STAGE_I", label: "STAGE I // ESTABLISH", startsAtMs: 0, endsAtMs: 80_000, spawnIntervalMs: 1100 }),
  Object.freeze({ id: "STAGE_II", label: "STAGE II // SPLIT PRESSURE", startsAtMs: 80_000, endsAtMs: 180_000, spawnIntervalMs: 920 }),
  Object.freeze({ id: "STAGE_III", label: "STAGE III // ESCALATION", startsAtMs: 180_000, endsAtMs: 285_000, spawnIntervalMs: 800 }),
  Object.freeze({ id: "STAGE_IV", label: "STAGE IV // COLLAPSE", startsAtMs: 285_000, endsAtMs: 360_000, spawnIntervalMs: 690 }),
  Object.freeze({ id: "BOSS_PENDING", label: "THE DESYNC // INCOMING", startsAtMs: 360_000, endsAtMs: null, spawnIntervalMs: null }),
]);

export const CR1_CHECKPOINTS: readonly CR1CheckpointSpec[] = Object.freeze([
  Object.freeze({ id: "ELITE_I", atMs: 80_000, kind: "ANCHOR", hpMultiplier: 2.2, label: "ELITE I // BULWARK" }),
  Object.freeze({ id: "CHECKPOINT_ELITE", atMs: 180_000, kind: "BEACON", hpMultiplier: 3.4, label: "CHECKPOINT ELITE // OVERWATCH" }),
  Object.freeze({ id: "ELITE_II", atMs: 285_000, kind: "FLICKER_A", hpMultiplier: 4.2, label: "ELITE II // PHASE HUNTER" }),
]);

export function selectCheckpointSpawnSlotIndex(
  slots: readonly { readonly active: boolean; readonly elite: boolean }[],
): number {
  const inactiveIndex = slots.findIndex(slot => !slot.active);
  if (inactiveIndex >= 0) return inactiveIndex;
  return slots.findIndex(slot => slot.active && !slot.elite);
}

export function stageForElapsedMs(elapsedMs: number): CR1StageSpec {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new Error("elapsedMs must be finite and non-negative.");
  return CR1_STAGES.find(stage => elapsedMs >= stage.startsAtMs && (stage.endsAtMs === null || elapsedMs < stage.endsAtMs)) ?? CR1_STAGES[CR1_STAGES.length - 1];
}

export function emptyCR1RewardLedger(): CR1RewardLedger {
  return Object.freeze({ ELITE_I: false, CHECKPOINT_ELITE: false, ELITE_II: false });
}

export function checkpointRewards(checkpoint: CR1CheckpointId, evolutionCoresOwned: number): readonly CR1PickupKind[] {
  if (!Number.isInteger(evolutionCoresOwned) || evolutionCoresOwned < 0) throw new Error("evolutionCoresOwned must be a non-negative integer.");
  if (checkpoint === "ELITE_I") return Object.freeze(["EVOLUTION_CORE", "REPAIR"]);
  if (checkpoint === "CHECKPOINT_ELITE") {
    return evolutionCoresOwned < 2
      ? Object.freeze(["EVOLUTION_CORE", "VACUUM"])
      : Object.freeze(["VACUUM"]);
  }
  return Object.freeze(["EVOLUTION_CORE", "DISCHARGE"]);
}

export function claimCheckpointRewards(
  ledger: CR1RewardLedger,
  checkpoint: CR1CheckpointId,
  evolutionCoresOwned: number,
): CR1RewardClaim {
  if (ledger[checkpoint]) return Object.freeze({ ledger, rewards: Object.freeze([]), newlyClaimed: false });
  const next: CR1RewardLedger = Object.freeze({ ...ledger, [checkpoint]: true });
  return Object.freeze({ ledger: next, rewards: checkpointRewards(checkpoint, evolutionCoresOwned), newlyClaimed: true });
}

export function dueCheckpoints(elapsedMs: number, spawned: ReadonlySet<CR1CheckpointId>): readonly CR1CheckpointSpec[] {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new Error("elapsedMs must be finite and non-negative.");
  return Object.freeze(CR1_CHECKPOINTS.filter(checkpoint => elapsedMs >= checkpoint.atMs && !spawned.has(checkpoint.id)));
}

export function isFlickerKind(kind: V2EnemyKind): kind is "FLICKER_A" | "FLICKER_B" {
  return kind === "FLICKER_A" || kind === "FLICKER_B";
}

export function nextFlickerKind(kind: "FLICKER_A" | "FLICKER_B"): "FLICKER_A" | "FLICKER_B" {
  return kind === "FLICKER_A" ? "FLICKER_B" : "FLICKER_A";
}

function directedKind(seed: number, spawnIndex: number, stage: CR1StageId): V2EnemyKind {
  if (spawnIndex === 0) return "TRACE";
  if (spawnIndex === 1) return "SPLIT_A";
  const roll = deterministicUnit(seed, spawnIndex, 40);
  const phaseRoll = deterministicUnit(seed, spawnIndex, 41);
  const split = phaseRoll < 0.5 ? "SPLIT_A" : "SPLIT_B";
  const flicker = phaseRoll < 0.5 ? "FLICKER_A" : "FLICKER_B";

  if (stage === "STAGE_I") return roll < 0.58 ? "TRACE" : split;
  if (stage === "STAGE_II") {
    if (roll < 0.30) return "TRACE";
    if (roll < 0.78) return split;
    return "BEACON";
  }
  if (stage === "STAGE_III") {
    if (roll < 0.20) return "TRACE";
    if (roll < 0.52) return split;
    if (roll < 0.67) return "BEACON";
    if (roll < 0.83) return "ANCHOR";
    return flicker;
  }
  if (stage === "STAGE_IV") {
    if (roll < 0.14) return "TRACE";
    if (roll < 0.42) return split;
    if (roll < 0.58) return "BEACON";
    if (roll < 0.74) return "ANCHOR";
    return flicker;
  }
  return "TRACE";
}

function safeSpawnPosition(seed: number, spawnIndex: number, player: Vec2): Vec2 {
  const side = Math.floor(deterministicUnit(seed, spawnIndex, 42) * 4) % 4;
  const along = deterministicUnit(seed, spawnIndex, 43);
  const margin = 110;
  let x = player.x;
  let y = player.y;
  if (side === 0) { x = player.x - 520; y = player.y + (along - 0.5) * 520; }
  else if (side === 1) { x = player.x + 520; y = player.y + (along - 0.5) * 520; }
  else if (side === 2) { x = player.x + (along - 0.5) * 760; y = player.y - 390; }
  else { x = player.x + (along - 0.5) * 760; y = player.y + 390; }
  x = Math.max(margin, Math.min(V21_WORLD_WIDTH - margin, x));
  y = Math.max(margin, Math.min(V21_WORLD_HEIGHT - margin, y));
  return Object.freeze({ x, y });
}

export function buildDirectedSpawnSpec(seed: number, spawnIndex: number, elapsedMs: number, player: Vec2): CR1DirectedSpawnSpec | null {
  if (!Number.isInteger(spawnIndex) || spawnIndex < 0) throw new Error("spawnIndex must be a non-negative integer.");
  const stage = stageForElapsedMs(elapsedMs);
  if (stage.id === "BOSS_PENDING") return null;
  return Object.freeze({
    id: spawnIndex,
    kind: directedKind(seed, spawnIndex, stage.id),
    position: safeSpawnPosition(seed, spawnIndex, player),
  });
}

export function buildCheckpointSpawnPosition(seed: number, checkpoint: CR1CheckpointId, player: Vec2): Vec2 {
  const index = CR1_CHECKPOINTS.findIndex(item => item.id === checkpoint);
  if (index < 0) throw new Error(`Unknown checkpoint ${checkpoint}.`);
  return safeSpawnPosition(seed ^ 0x435231, 10_000 + index, player);
}
