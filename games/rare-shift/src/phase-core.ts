import type {
  FrameCandidate,
  FramePairMetrics,
  FrameRows,
  Phase,
  PixelClass,
  Point,
  ProofChamber,
  SelectedFramePair,
  TileKind,
} from "./types.ts";

export const FRAME_SIZE = 16;

function assertRows(rows: FrameRows): void {
  if (rows.length !== FRAME_SIZE || rows.some(row => row.length !== FRAME_SIZE || /[^#.]/.test(row))) {
    throw new Error("Canonical frame rows must be exactly 16x16 using only # and .");
  }
}

export function classifyPixel(a: string, b: string): PixelClass {
  if (a === "#" && b === "#") return "COMMON";
  if (a === "#") return "A_ONLY";
  if (b === "#") return "B_ONLY";
  return "VOID";
}

export function derivePhaseField(a: FrameRows, b: FrameRows): readonly (readonly PixelClass[])[] {
  assertRows(a); assertRows(b);
  return Object.freeze(Array.from({ length: FRAME_SIZE }, (_, y) => Object.freeze(
    Array.from({ length: FRAME_SIZE }, (_, x) => classifyPixel(a[y][x], b[y][x])),
  )));
}

export function measurePair(a: FrameRows, b: FrameRows): FramePairMetrics {
  const field = derivePhaseField(a, b);
  let occupiedA = 0, occupiedB = 0, common = 0, aOnly = 0, bOnly = 0;
  for (const row of field) for (const cell of row) {
    if (cell === "COMMON") { common++; occupiedA++; occupiedB++; }
    else if (cell === "A_ONLY") { aOnly++; occupiedA++; }
    else if (cell === "B_ONLY") { bOnly++; occupiedB++; }
  }
  const difference = aOnly + bOnly;
  const balance = Math.min(aOnly, bOnly);
  const occupancySkew = Math.abs(occupiedA - occupiedB);
  const score = balance * 7 + common * 0.7 + Math.min(difference, 64) * 0.45 - occupancySkew * 0.8;
  return { occupiedA, occupiedB, common, aOnly, bOnly, difference, balance, score };
}

function pairQualifies(m: FramePairMetrics): boolean {
  return m.occupiedA >= 8 && m.occupiedB >= 8 && m.common >= 4 && m.aOnly >= 2 && m.bOnly >= 2 && m.difference >= 5;
}

export function selectFramePair(frames: readonly FrameCandidate[]): SelectedFramePair {
  if (frames.length !== 64) throw new Error(`Expected 64 canonical frames; received ${frames.length}.`);
  let best: SelectedFramePair | null = null;
  for (let group = 0; group < 8; group++) {
    const start = group * 8;
    for (let i = start; i < start + 8; i++) for (let j = i + 1; j < start + 8; j++) {
      const metrics = measurePair(frames[i].rows, frames[j].rows);
      if (!pairQualifies(metrics)) continue;
      const candidate: SelectedFramePair = { a: frames[i], b: frames[j], metrics, sourceGroup: group };
      if (!best || candidate.metrics.score > best.metrics.score ||
          (candidate.metrics.score === best.metrics.score && (candidate.a.index < best.a.index ||
            (candidate.a.index === best.a.index && candidate.b.index < best.b.index)))) best = candidate;
    }
  }
  if (best) return best;

  for (let i = 0; i < frames.length; i++) for (let j = i + 1; j < frames.length; j++) {
    const metrics = measurePair(frames[i].rows, frames[j].rows);
    if (!pairQualifies(metrics)) continue;
    const candidate: SelectedFramePair = { a: frames[i], b: frames[j], metrics, sourceGroup: -1 };
    if (!best || candidate.metrics.score > best.metrics.score ||
        (candidate.metrics.score === best.metrics.score && (candidate.a.index < best.a.index ||
          (candidate.a.index === best.a.index && candidate.b.index < best.b.index)))) best = candidate;
  }
  if (!best) throw new Error("This Friend did not expose a qualifying two-way frame delta for the T0 proof.");
  return best;
}

function pointsFor(field: readonly (readonly PixelClass[])[], target: PixelClass): Point[] {
  const result: Point[] = [];
  for (let y = 0; y < FRAME_SIZE; y++) for (let x = 0; x < FRAME_SIZE; x++) if (field[y][x] === target) result.push({ x, y });
  return result;
}

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function fingerprint(rowsA: FrameRows, rowsB: FrameRows, aIndex: number, bIndex: number): string {
  const hash = fnv1a(`${aIndex}|${bIndex}|${rowsA.join("")}|${rowsB.join("")}`);
  return hash.toString(16).padStart(8, "0");
}

export function buildProofChamber(pair: SelectedFramePair): ProofChamber {
  const field = derivePhaseField(pair.a.rows, pair.b.rows);
  const aPixels = pointsFor(field, "A_ONLY");
  const bPixels = pointsFor(field, "B_ONLY");
  if (!aPixels.length || !bPixels.length) throw new Error("Selected pair lacks two-way phase pixels.");
  const fp = fingerprint(pair.a.rows, pair.b.rows, pair.a.index, pair.b.index);
  const seed = Number.parseInt(fp, 16) >>> 0;
  const aPixel = aPixels[seed % aPixels.length];
  const bPixel = bPixels[Math.floor(seed / Math.max(1, aPixels.length)) % bPixels.length];

  const width = 16, height = 9, laneY = 4;
  const gateAX = 5 + (aPixel.x % 2);
  const gateBX = 10 + (bPixel.x % 2);
  const mutable: TileKind[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => x === 0 || y === 0 || x === width - 1 || y === height - 1 ? "WALL" : "FLOOR"));

  for (let y = 1; y < height - 1; y++) { mutable[y][gateAX] = "WALL"; mutable[y][gateBX] = "WALL"; }
  mutable[laneY][gateAX] = "GATE_A";
  mutable[laneY][gateBX] = "GATE_B";

  return Object.freeze({
    width, height,
    tiles: Object.freeze(mutable.map(row => Object.freeze(row.slice()))),
    start: Object.freeze({ x: 2, y: laneY }),
    exit: Object.freeze({ x: width - 3, y: laneY }),
    startPhase: "B" as Phase,
    gateA: Object.freeze({ x: gateAX, y: laneY }),
    gateB: Object.freeze({ x: gateBX, y: laneY }),
    gateASourcePixel: Object.freeze(aPixel),
    gateBSourcePixel: Object.freeze(bPixel),
    frameAIndex: pair.a.index,
    frameBIndex: pair.b.index,
    fingerprint: fp,
  });
}

export function isPassable(chamber: ProofChamber, x: number, y: number, phase: Phase): boolean {
  if (x < 0 || y < 0 || x >= chamber.width || y >= chamber.height) return false;
  const tile = chamber.tiles[y][x];
  if (tile === "WALL") return false;
  if (tile === "GATE_A") return phase === "A";
  if (tile === "GATE_B") return phase === "B";
  return true;
}

export function otherPhase(phase: Phase): Phase { return phase === "A" ? "B" : "A"; }
