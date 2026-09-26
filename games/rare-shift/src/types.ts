export type Phase = "A" | "B";
export type PixelClass = "COMMON" | "A_ONLY" | "B_ONLY" | "VOID";
export type PulseSegment = "TELEGRAPH_A" | "OPEN_A" | "TELEGRAPH_B" | "OPEN_B";
export type FrameRows = readonly string[];

export interface FrameCandidate { index: number; rows: FrameRows; bitmap?: bigint; }
export interface FramePairMetrics { occupiedA:number; occupiedB:number; common:number; aOnly:number; bOnly:number; difference:number; balance:number; score:number; }
export interface SelectedFramePair { a:FrameCandidate; b:FrameCandidate; metrics:FramePairMetrics; sourceGroup:number; }
export interface Point { x:number; y:number; }

export type TileKind = "FLOOR" | "WALL" | "GATE_A" | "GATE_B";
export interface ProofChamber {
  width:number; height:number; tiles:readonly (readonly TileKind[])[]; start:Point; exit:Point; startPhase:Phase;
  gateA:Point; gateB:Point; gateASourcePixel:Point; gateBSourcePixel:Point; frameAIndex:number; frameBIndex:number; fingerprint:string;
}
export interface SolveResult { solvable:boolean; minShifts:number|null; path:readonly SolverStep[]; reachableWithoutShiftFromStartPhase:boolean; }
export interface SolverStep { x:number; y:number; phase:Phase; action:"START"|"UP"|"DOWN"|"LEFT"|"RIGHT"|"SHIFT"; }

export type TimingTileKind = "FLOOR" | "WALL" | "SHUTTER_A" | "SHUTTER_B";
export interface TimingProfile { segmentMs:number; initialSegmentIndex:number; initialOffsetMs:number; }
export interface TimingChamber {
  width:number; height:number; tiles:readonly (readonly TimingTileKind[])[]; start:Point; exit:Point; startPhase:Phase;
  shutterA:Point; shutterB:Point; shutterASourcePixel:Point; shutterBSourcePixel:Point; frameAIndex:number; frameBIndex:number;
  baseFingerprint:string; fingerprint:string;
}
export interface TimingSolverStep { x:number; y:number; phase:Phase; pulse:PulseSegment; action:"START"|"UP"|"DOWN"|"LEFT"|"RIGHT"|"SHIFT"|"WAIT"; }
export interface TimingSolveResult { solvable:boolean; minShifts:number|null; path:readonly TimingSolverStep[]; reachableWithoutShiftFromStartPhase:boolean; waits:number|null; }

export type SyncProgress = 0 | 1 | 2 | 3;
export type SyncNodeIndex = 0 | 1 | 2;
export type SyncTileKind = "FLOOR" | "WALL" | "NODE_1" | "NODE_2" | "NODE_3" | "EXIT";
export type SyncContactEvent = "NONE" | "SYNCED" | "PHASE_MISMATCH" | "SIGNAL_NOT_ROUTED" | "ALREADY_SYNCED";
export interface SyncChamber {
  width:number; height:number; tiles:readonly (readonly SyncTileKind[])[]; start:Point; exit:Point; startPhase:Phase;
  nodes:readonly [Point,Point,Point]; nodeSourcePixels:readonly [Point,Point,Point]; nodeRequiredPhases:readonly [Phase,Phase,Phase];
  frameAIndex:number; frameBIndex:number; baseFingerprint:string; fingerprint:string;
}
export interface SyncContactResult { nextNode:SyncProgress; event:SyncContactEvent; nodeIndex:SyncNodeIndex|null; }
export interface SyncSolverStep { x:number; y:number; phase:Phase; nextNode:SyncProgress; action:"START"|"UP"|"DOWN"|"LEFT"|"RIGHT"|"SHIFT"; }
export interface SyncSolveResult { solvable:boolean; minShifts:number|null; path:readonly SyncSolverStep[]; reachableWithoutShiftFromStartPhase:boolean; }
