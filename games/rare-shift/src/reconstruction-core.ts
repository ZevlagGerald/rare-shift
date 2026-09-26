import { derivePhaseField } from "./phase-core.ts";
import type { FrameRows, PixelClass, SelectedFramePair } from "./types.ts";

export const RECONSTRUCTION_SCHEMA = "rare-shift-t4-reconstruction-v1";

export interface ReconstructionInputs {
  friendId: string;
  familyName: string;
  pair: SelectedFramePair;
  t1Fingerprint: string;
  t2Fingerprint: string;
  t3Fingerprint: string;
}

export interface ReconstructionComponents {
  common: FrameRows;
  aOnly: FrameRows;
  bOnly: FrameRows;
}

export interface ReconstructionModel {
  schema: string;
  components: ReconstructionComponents;
  reconstructedA: FrameRows;
  reconstructedB: FrameRows;
  exactA: boolean;
  exactB: boolean;
  runProof: string;
}

export interface RunShiftStats {
  chamber1: number;
  chamber2: number;
  chamber3: number;
}

export function emptyRunShiftStats(): RunShiftStats {
  return { chamber1: 0, chamber2: 0, chamber3: 0 };
}

export function totalRunShifts(stats: RunShiftStats): number {
  return stats.chamber1 + stats.chamber2 + stats.chamber3;
}

function rowsFor(field: readonly (readonly PixelClass[])[], target: PixelClass): FrameRows {
  return Object.freeze(field.map(row => row.map(cell => cell === target ? "#" : ".").join("")));
}

function unionRows(left: FrameRows, right: FrameRows): FrameRows {
  return Object.freeze(left.map((row, y) => [...row].map((cell, x) => cell === "#" || right[y][x] === "#" ? "#" : ".").join("")));
}

function rowsEqual(left: FrameRows, right: FrameRows): boolean {
  return left.length === right.length && left.every((row, index) => row === right[index]);
}

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function runProof(inputs: ReconstructionInputs): string {
  const payload = [
    RECONSTRUCTION_SCHEMA,
    inputs.friendId,
    inputs.familyName,
    String(inputs.pair.a.index),
    String(inputs.pair.b.index),
    inputs.pair.a.rows.join(""),
    inputs.pair.b.rows.join(""),
    inputs.t1Fingerprint,
    inputs.t2Fingerprint,
    inputs.t3Fingerprint,
  ].join("|");
  return fnv1a(payload).toString(16).padStart(8, "0");
}

export function buildReconstruction(inputs: ReconstructionInputs): ReconstructionModel {
  const field = derivePhaseField(inputs.pair.a.rows, inputs.pair.b.rows);
  const common = rowsFor(field, "COMMON");
  const aOnly = rowsFor(field, "A_ONLY");
  const bOnly = rowsFor(field, "B_ONLY");
  const reconstructedA = unionRows(common, aOnly);
  const reconstructedB = unionRows(common, bOnly);
  const exactA = rowsEqual(reconstructedA, inputs.pair.a.rows);
  const exactB = rowsEqual(reconstructedB, inputs.pair.b.rows);
  if (!exactA || !exactB) throw new Error("Canonical reconstruction failed exact row equality.");

  return Object.freeze({
    schema: RECONSTRUCTION_SCHEMA,
    components: Object.freeze({ common, aOnly, bOnly }),
    reconstructedA,
    reconstructedB,
    exactA,
    exactB,
    runProof: runProof(inputs),
  });
}
