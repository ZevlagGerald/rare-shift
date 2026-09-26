import type { FrameRows, Phase } from "./types.ts";

export const V2_ART_SCHEMA_VERSION = 1 as const;
export const V2_ART_GRID_SIZE = 16 as const;

export const V2_PALETTE = Object.freeze({
  phaseA: "#4cc9f0",
  phaseB: "#f72585",
  common: "#e8edf2",
  void: "#202832",
  backgroundPrimary: "#0b0e12",
  backgroundSecondary: "#11151b",
  gridLine: "#273240",
  warning: "#f6c85f",
} as const);

export type V2SpriteId = "TRACE" | "SPLIT_A" | "SPLIT_B" | "SIGNAL_XP";
export type V2PhaseCue = "SYMMETRIC_CORE" | "A_LEFT_BREAK" | "B_RIGHT_BREAK" | "DIAMOND_SIGNAL";
export type FractureCell = "QUIET" | "GRID" | "FRACTURE" | "COMMON_MARK";

export interface V2ArtSprite {
  readonly id: V2SpriteId;
  readonly rows: FrameRows;
  readonly cue: V2PhaseCue;
  readonly role: string;
}

function defineRows(rows: readonly string[]): FrameRows {
  if (rows.length !== V2_ART_GRID_SIZE) {
    throw new Error(`V2 art sprite must contain ${V2_ART_GRID_SIZE} rows.`);
  }
  for (const [index, row] of rows.entries()) {
    if (row.length !== V2_ART_GRID_SIZE || /[^.#]/u.test(row)) {
      throw new Error(`Invalid V2 art row ${index}: expected exactly 16 '.'/'#' cells.`);
    }
  }
  return Object.freeze([...rows]);
}

const TRACE_ROWS = defineRows([
  "................",
  "................",
  ".......##.......",
  "......####......",
  ".....######.....",
  "....###..###....",
  "....##.##.##....",
  "...###....###...",
  "...###....###...",
  "....##.##.##....",
  "....###..###....",
  ".....######.....",
  "......####......",
  ".......##.......",
  "................",
  "................",
]);

const SPLIT_A_ROWS = defineRows([
  "................",
  ".......##.......",
  "......###.......",
  ".....####.......",
  "....#####.......",
  "...######.......",
  "..####.##.......",
  ".####..##.......",
  ".####..##.......",
  "..####.##.......",
  "...######.......",
  "....#####.......",
  ".....####.......",
  "......###.......",
  ".......##.......",
  "................",
]);

const SPLIT_B_ROWS = defineRows([
  "................",
  ".......##.......",
  ".......###......",
  ".......####.....",
  ".......#####....",
  ".......######...",
  ".......##.####..",
  ".......##..####.",
  ".......##..####.",
  ".......##.####..",
  ".......######...",
  ".......#####....",
  ".......####.....",
  ".......###......",
  ".......##.......",
  "................",
]);

const SIGNAL_XP_ROWS = defineRows([
  "................",
  "................",
  ".......##.......",
  "......####......",
  ".....##..##.....",
  "....##....##....",
  "...##..##..##...",
  "..##...##...##..",
  "..##...##...##..",
  "...##..##..##...",
  "....##....##....",
  ".....##..##.....",
  "......####......",
  ".......##.......",
  "................",
  "................",
]);

export const V2_ART_SPRITES: Readonly<Record<V2SpriteId, V2ArtSprite>> = Object.freeze({
  TRACE: Object.freeze({
    id: "TRACE",
    rows: TRACE_ROWS,
    cue: "SYMMETRIC_CORE",
    role: "COMMON baseline chaser; stable bilateral silhouette",
  }),
  SPLIT_A: Object.freeze({
    id: "SPLIT_A",
    rows: SPLIT_A_ROWS,
    cue: "A_LEFT_BREAK",
    role: "Phase-A chaser; mass and broken edge bias to the left",
  }),
  SPLIT_B: Object.freeze({
    id: "SPLIT_B",
    rows: SPLIT_B_ROWS,
    cue: "B_RIGHT_BREAK",
    role: "Phase-B chaser; mirrored mass and offset edge bias to the right",
  }),
  SIGNAL_XP: Object.freeze({
    id: "SIGNAL_XP",
    rows: SIGNAL_XP_ROWS,
    cue: "DIAMOND_SIGNAL",
    role: "high-contrast non-hazard progression pickup",
  }),
});

export function countArtPixels(rows: FrameRows): number {
  let count = 0;
  for (const row of rows) for (const cell of row) if (cell === "#") count += 1;
  return count;
}

export function artRowsDiffer(a: FrameRows, b: FrameRows): boolean {
  if (a.length !== b.length) return true;
  return a.some((row, index) => row !== b[index]);
}

export function exclusiveDeltaRows(a: FrameRows, b: FrameRows, phase: Phase): FrameRows {
  if (a.length !== V2_ART_GRID_SIZE || b.length !== V2_ART_GRID_SIZE) {
    throw new Error("DELTA geometry requires two 16-row canonical frames.");
  }

  const rows: string[] = [];
  for (let y = 0; y < V2_ART_GRID_SIZE; y++) {
    const aRow = a[y];
    const bRow = b[y];
    if (aRow.length !== V2_ART_GRID_SIZE || bRow.length !== V2_ART_GRID_SIZE) {
      throw new Error("DELTA geometry requires canonical 16×16 rows.");
    }
    let row = "";
    for (let x = 0; x < V2_ART_GRID_SIZE; x++) {
      const active = phase === "A"
        ? aRow[x] === "#" && bRow[x] !== "#"
        : bRow[x] === "#" && aRow[x] !== "#";
      row += active ? "#" : ".";
    }
    rows.push(row);
  }
  return Object.freeze(rows);
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

export function fractureCellAt(x: number, y: number, seed = 0x52415245): FractureCell {
  const xi = Math.trunc(x);
  const yi = Math.trunc(y);
  const hash = mix32(seed ^ Math.imul(xi + 0x51ed270b, 0x1f123bb5) ^ Math.imul(yi + 0x6d2b79f5, 0x5f356495));
  const bucket = hash % 100;
  if (bucket < 4) return "COMMON_MARK";
  if (bucket < 15) return "FRACTURE";
  if (bucket < 38) return "GRID";
  return "QUIET";
}

export function buildFractureGrid(width: number, height: number, seed = 0x52415245): readonly (readonly FractureCell[])[] {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error("FRACTURE GRID dimensions must be positive integers.");
  }
  return Object.freeze(Array.from({ length: height }, (_, y) =>
    Object.freeze(Array.from({ length: width }, (_, x) => fractureCellAt(x, y, seed))),
  ));
}

function escapeAttribute(value: string): string {
  return value.replace(/&/gu, "&amp;").replace(/"/gu, "&quot;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");
}

export function renderPixelRowsSvg(rows: FrameRows, fill: string, label: string, pixelSize = 4): string {
  if (!Number.isInteger(pixelSize) || pixelSize <= 0) throw new Error("pixelSize must be a positive integer.");
  if (rows.length !== V2_ART_GRID_SIZE || rows.some(row => row.length !== V2_ART_GRID_SIZE)) {
    throw new Error("Pixel SVG rendering requires 16×16 rows.");
  }
  const rects: string[] = [];
  for (let y = 0; y < V2_ART_GRID_SIZE; y++) {
    for (let x = 0; x < V2_ART_GRID_SIZE; x++) {
      if (rows[y][x] === "#") rects.push(`<rect x="${x * pixelSize}" y="${y * pixelSize}" width="${pixelSize}" height="${pixelSize}"/>`);
    }
  }
  const size = V2_ART_GRID_SIZE * pixelSize;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${escapeAttribute(label)}" shape-rendering="crispEdges"><g fill="${escapeAttribute(fill)}">${rects.join("")}</g></svg>`;
}

export function phaseTone(phase: Phase): string {
  return phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB;
}
