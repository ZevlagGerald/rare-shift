import type { Phase } from "./types.ts";
import type { V2EnemyKind } from "./phase-combat-core.ts";

export const V21_WORLD_WIDTH = 1800 as const;
export const V21_WORLD_HEIGHT = 1200 as const;
export const V21_PLAYER_MAX_HP: number = 100;
export const V21_CONTACT_INVULN_MS = 900 as const;
// V2-1 is the learning slice. A slower fixed cadence prevents the first 30–40 s
// from saturating the safety pool before the player reaches their first draft.
// Later tranches may replace this with a measured run-pacing curve.
export const V21_SPAWN_INTERVAL_MS = 1100 as const;
export const V21_MAX_ACTIVE_ENEMIES = 48 as const;

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface SpawnSpec {
  readonly id: number;
  readonly kind: V2EnemyKind;
  readonly position: Vec2;
}

export interface LevelProgress {
  readonly level: number;
  readonly xp: number;
  readonly xpToNext: number;
  readonly levelsGained: number;
}

export interface V21RunStats {
  readonly elapsedMs: number;
  readonly phase: Phase;
  readonly hp: number;
  readonly level: number;
  readonly xp: number;
  readonly kills: number;
  readonly shifts: number;
  readonly deltaRank: number;
}

function mix32(value: number): number {
  let x = value >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

export function deterministicUnit(seed: number, index: number, channel = 0): number {
  const mixed = mix32((seed >>> 0) ^ Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(channel + 17, 0x85ebca6b));
  return mixed / 0x100000000;
}

export function xpThreshold(level: number): number {
  if (!Number.isInteger(level) || level < 1) throw new Error("level must be a positive integer.");
  return 4 + (level - 1) * 3;
}

export function addSignalXp(level: number, xp: number, amount: number): LevelProgress {
  if (!Number.isInteger(level) || level < 1) throw new Error("level must be a positive integer.");
  if (!Number.isInteger(xp) || xp < 0 || !Number.isInteger(amount) || amount < 0) throw new Error("XP values must be non-negative integers.");
  let nextLevel = level;
  let nextXp = xp + amount;
  let gained = 0;
  while (nextXp >= xpThreshold(nextLevel)) {
    nextXp -= xpThreshold(nextLevel);
    nextLevel += 1;
    gained += 1;
  }
  return Object.freeze({ level: nextLevel, xp: nextXp, xpToNext: xpThreshold(nextLevel), levelsGained: gained });
}

export function clampPlayerPosition(position: Vec2, radius = 24): Vec2 {
  if (!(radius >= 0)) throw new Error("radius must be non-negative.");
  return Object.freeze({
    x: Math.max(radius, Math.min(V21_WORLD_WIDTH - radius, position.x)),
    y: Math.max(radius, Math.min(V21_WORLD_HEIGHT - radius, position.y)),
  });
}

export function spawnKind(seed: number, spawnIndex: number, elapsedMs: number): V2EnemyKind {
  // V2-1B onboarding contract: every player first sees an always-corporeal TRACE
  // so auto-fire is observable, then a Phase-A split threat while the run begins
  // in Phase B so SHIFT has an immediately legible purpose. Normal deterministic
  // weighting resumes from spawn 2 onward.
  if (spawnIndex === 0) return "TRACE";
  if (spawnIndex === 1) return "SPLIT_A";

  const roll = deterministicUnit(seed, spawnIndex, 0);
  const splitWeight = elapsedMs < 12_000 ? 0.28 : elapsedMs < 30_000 ? 0.42 : 0.5;
  if (roll >= splitWeight) return "TRACE";
  return deterministicUnit(seed, spawnIndex, 1) < 0.5 ? "SPLIT_A" : "SPLIT_B";
}

export function buildSpawnSpec(seed: number, spawnIndex: number, elapsedMs: number, player: Vec2): SpawnSpec {
  if (!Number.isInteger(spawnIndex) || spawnIndex < 0) throw new Error("spawnIndex must be a non-negative integer.");
  const side = Math.floor(deterministicUnit(seed, spawnIndex, 2) * 4) % 4;
  const along = deterministicUnit(seed, spawnIndex, 3);
  const margin = 110;
  let x = player.x;
  let y = player.y;
  if (side === 0) { x = player.x - 520; y = player.y + (along - 0.5) * 520; }
  else if (side === 1) { x = player.x + 520; y = player.y + (along - 0.5) * 520; }
  else if (side === 2) { x = player.x + (along - 0.5) * 760; y = player.y - 390; }
  else { x = player.x + (along - 0.5) * 760; y = player.y + 390; }
  x = Math.max(margin, Math.min(V21_WORLD_WIDTH - margin, x));
  y = Math.max(margin, Math.min(V21_WORLD_HEIGHT - margin, y));
  return Object.freeze({ id: spawnIndex, kind: spawnKind(seed, spawnIndex, elapsedMs), position: Object.freeze({ x, y }) });
}

export function v21QualificationReached(stats: V21RunStats): boolean {
  return stats.elapsedMs >= 20_000
    && stats.kills >= 3
    && stats.shifts >= 1
    && stats.level >= 2
    && stats.deltaRank >= 2
    && stats.hp > 0;
}