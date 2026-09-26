import { derivePhaseField } from "./phase-core.ts";
import type {
  Phase,
  Point,
  PulseSegment,
  SelectedFramePair,
  TimingChamber,
  TimingProfile,
  TimingTileKind,
} from "./types.ts";

export const PULSE_SEGMENT_MS = 1200;
export const PULSE_ORDER: readonly PulseSegment[] = Object.freeze([
  "TELEGRAPH_A",
  "OPEN_A",
  "TELEGRAPH_B",
  "OPEN_B",
]);

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function pointsFor(pair: SelectedFramePair, target: "A_ONLY" | "B_ONLY"): Point[] {
  const field = derivePhaseField(pair.a.rows, pair.b.rows);
  const points: Point[] = [];
  for (let y = 0; y < field.length; y++) {
    for (let x = 0; x < field[y].length; x++) {
      if (field[y][x] === target) points.push({ x, y });
    }
  }
  return points;
}

export function buildTimingProfile(baseFingerprint: string): TimingProfile {
  const seed = fnv1a(`${baseFingerprint}|RARE-SHIFT|T2|PHASE-PULSE`);
  const initialSegmentIndex = seed % PULSE_ORDER.length;
  return Object.freeze({
    segmentMs: PULSE_SEGMENT_MS,
    initialSegmentIndex,
    initialOffsetMs: initialSegmentIndex * PULSE_SEGMENT_MS,
  });
}

export function pulseSegmentAt(elapsedActiveMs: number, profile: TimingProfile): PulseSegment {
  if (!Number.isFinite(elapsedActiveMs) || elapsedActiveMs < 0) throw new Error("Active pulse time must be a finite non-negative number.");
  const cycleMs = profile.segmentMs * PULSE_ORDER.length;
  const within = (elapsedActiveMs + profile.initialOffsetMs) % cycleMs;
  return PULSE_ORDER[Math.floor(within / profile.segmentMs) % PULSE_ORDER.length];
}

export function pulseSegmentIndex(segment: PulseSegment): number {
  const index = PULSE_ORDER.indexOf(segment);
  if (index < 0) throw new Error(`Unknown pulse segment: ${segment}`);
  return index;
}

export function isOpenForPhase(phase: Phase, segment: PulseSegment): boolean {
  return (phase === "A" && segment === "OPEN_A") || (phase === "B" && segment === "OPEN_B");
}

export function buildTimingChamber(pair: SelectedFramePair, baseFingerprint: string): TimingChamber {
  const aPixels = pointsFor(pair, "A_ONLY");
  const bPixels = pointsFor(pair, "B_ONLY");
  if (!aPixels.length || !bPixels.length) throw new Error("Selected pair lacks two-way canonical pixels for Chamber II.");

  const seed = fnv1a(`${baseFingerprint}|T2|LAYOUT`);
  const aPixel = aPixels[seed % aPixels.length];
  const bPixel = bPixels[Math.floor(seed / Math.max(1, aPixels.length)) % bPixels.length];
  const width = 16, height = 9, laneY = 4;
  const shutterAX = 5 + (aPixel.x % 2);
  const shutterBX = 10 + (bPixel.x % 2);
  const mutable: TimingTileKind[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => x === 0 || y === 0 || x === width - 1 || y === height - 1 ? "WALL" : "FLOOR"));

  for (let y = 1; y < height - 1; y++) {
    mutable[y][shutterAX] = "WALL";
    mutable[y][shutterBX] = "WALL";
  }
  mutable[laneY][shutterAX] = "SHUTTER_A";
  mutable[laneY][shutterBX] = "SHUTTER_B";

  const timingFingerprint = fnv1a(
    `${baseFingerprint}|${pair.a.index}|${pair.b.index}|${aPixel.x},${aPixel.y}|${bPixel.x},${bPixel.y}|T2`,
  ).toString(16).padStart(8, "0");

  return Object.freeze({
    width,
    height,
    tiles: Object.freeze(mutable.map(row => Object.freeze(row.slice()))),
    start: Object.freeze({ x: 2, y: laneY }),
    exit: Object.freeze({ x: width - 3, y: laneY }),
    startPhase: "B" as Phase,
    shutterA: Object.freeze({ x: shutterAX, y: laneY }),
    shutterB: Object.freeze({ x: shutterBX, y: laneY }),
    shutterASourcePixel: Object.freeze(aPixel),
    shutterBSourcePixel: Object.freeze(bPixel),
    frameAIndex: pair.a.index,
    frameBIndex: pair.b.index,
    baseFingerprint,
    fingerprint: timingFingerprint,
  });
}

export function isTimingPassable(
  chamber: TimingChamber,
  x: number,
  y: number,
  phase: Phase,
  segment: PulseSegment,
): boolean {
  if (x < 0 || y < 0 || x >= chamber.width || y >= chamber.height) return false;
  const tile = chamber.tiles[y][x];
  if (tile === "WALL") return false;
  if (tile === "SHUTTER_A") return phase === "A" && segment === "OPEN_A";
  if (tile === "SHUTTER_B") return phase === "B" && segment === "OPEN_B";
  return true;
}

export function timingBlockReason(
  tile: TimingTileKind,
  phase: Phase,
  segment: PulseSegment,
): "WALL" | "PHASE" | "TIMING" | null {
  if (tile === "WALL") return "WALL";
  if (tile === "SHUTTER_A") {
    if (phase !== "A") return "PHASE";
    if (segment !== "OPEN_A") return "TIMING";
  }
  if (tile === "SHUTTER_B") {
    if (phase !== "B") return "PHASE";
    if (segment !== "OPEN_B") return "TIMING";
  }
  return null;
}

export class ActivePulseClock {
  private elapsedActiveMs = 0;
  private paused = false;

  constructor(initialElapsedMs = 0) {
    if (!Number.isFinite(initialElapsedMs) || initialElapsedMs < 0) throw new Error("Initial active pulse time must be non-negative.");
    this.elapsedActiveMs = initialElapsedMs;
  }

  setPaused(paused: boolean): void { this.paused = paused; }

  advance(deltaMs: number): void {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error("Pulse delta must be a finite non-negative number.");
    if (!this.paused) this.elapsedActiveMs += deltaMs;
  }

  elapsed(): number { return this.elapsedActiveMs; }

  segment(profile: TimingProfile): PulseSegment { return pulseSegmentAt(this.elapsedActiveMs, profile); }

  setElapsedForTest(elapsedMs: number): void {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new Error("Test pulse time must be non-negative.");
    this.elapsedActiveMs = elapsedMs;
  }
}
