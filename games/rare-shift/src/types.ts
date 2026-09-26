export type Phase = "A" | "B";
export type PixelClass = "COMMON" | "A_ONLY" | "B_ONLY" | "VOID";

export type FrameRows = readonly string[];

export interface FrameCandidate {
  index: number;
  rows: FrameRows;
  bitmap?: bigint;
}

export interface FramePairMetrics {
  occupiedA: number;
  occupiedB: number;
  common: number;
  aOnly: number;
  bOnly: number;
  difference: number;
  balance: number;
  score: number;
}

export interface SelectedFramePair {
  a: FrameCandidate;
  b: FrameCandidate;
  metrics: FramePairMetrics;
  sourceGroup: number;
}

export interface Point {
  x: number;
  y: number;
}

export type TileKind = "FLOOR" | "WALL" | "GATE_A" | "GATE_B";

export interface ProofChamber {
  width: number;
  height: number;
  tiles: readonly (readonly TileKind[])[];
  start: Point;
  exit: Point;
  startPhase: Phase;
  gateA: Point;
  gateB: Point;
  gateASourcePixel: Point;
  gateBSourcePixel: Point;
  frameAIndex: number;
  frameBIndex: number;
  fingerprint: string;
}

export interface SolveResult {
  solvable: boolean;
  minShifts: number | null;
  path: readonly SolverStep[];
  reachableWithoutShiftFromStartPhase: boolean;
}

export interface SolverStep {
  x: number;
  y: number;
  phase: Phase;
  action: "START" | "UP" | "DOWN" | "LEFT" | "RIGHT" | "SHIFT";
}
