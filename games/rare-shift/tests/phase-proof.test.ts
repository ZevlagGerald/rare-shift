import assert from "node:assert/strict";
import test from "node:test";
import { buildProofChamber, derivePhaseField, measurePair, selectFramePair } from "../src/phase-core.ts";
import { solveProofChamber } from "../src/solver.ts";
import {
  ActivePulseClock,
  buildTimingChamber,
  buildTimingProfile,
  isTimingPassable,
  pulseSegmentAt,
} from "../src/timing-core.ts";
import { solveTimingChamber } from "../src/timing-solver.ts";
import type { FrameCandidate, TimingProfile } from "../src/types.ts";

const empty = () => Array.from({ length: 16 }, () => ".".repeat(16));
function frame(points: readonly [number, number][]): readonly string[] {
  const rows = empty().map(row => row.split(""));
  for (const [x, y] of points) rows[y][x] = "#";
  return rows.map(row => row.join(""));
}
const common: [number, number][] = [
  [6,4],[7,4],[8,4],[9,4],[5,5],[6,5],[7,5],[8,5],[9,5],[10,5],
  [6,6],[7,6],[8,6],[9,6],[7,7],[8,7],
];
const aExtra: [number, number][] = [[4,5],[5,4],[6,3],[7,3],[8,3]];
const bExtra: [number, number][] = [[10,4],[11,5],[9,3],[8,8],[7,8]];
const rowsA = frame([...common, ...aExtra]);
const rowsB = frame([...common, ...bExtra]);

const syntheticPair = () => ({
  a: { index: 32, rows: rowsA },
  b: { index: 35, rows: rowsB },
  metrics: measurePair(rowsA, rowsB),
  sourceGroup: 4,
});

test("phase field exactly classifies canonical bit differences", () => {
  const field = derivePhaseField(rowsA, rowsB);
  assert.equal(field[5][4], "A_ONLY");
  assert.equal(field[5][11], "B_ONLY");
  assert.equal(field[5][7], "COMMON");
  assert.equal(field[0][0], "VOID");
  const m = measurePair(rowsA, rowsB);
  assert.equal(m.aOnly, aExtra.length);
  assert.equal(m.bOnly, bExtra.length);
  assert.equal(m.common, common.length);
});

test("selector remains deterministic and prefers a qualifying same-clip pair", () => {
  const blank = frame([]);
  const frames: FrameCandidate[] = Array.from({ length: 64 }, (_, index) => ({ index, rows: blank }));
  frames[32] = { index: 32, rows: rowsA };
  frames[35] = { index: 35, rows: rowsB };
  const one = selectFramePair(frames), two = selectFramePair(frames);
  assert.equal(one.a.index, 32);
  assert.equal(one.b.index, 35);
  assert.equal(one.sourceGroup, 4);
  assert.deepEqual(one, two);
});

test("T0 chamber is deterministic, solvable, and mechanically requires two shifts", () => {
  const pair = syntheticPair();
  const a = buildProofChamber(pair), b = buildProofChamber(pair);
  assert.equal(a.fingerprint, b.fingerprint);
  assert.deepEqual(a.tiles, b.tiles);
  const solved = solveProofChamber(a);
  assert.equal(solved.solvable, true);
  assert.equal(solved.reachableWithoutShiftFromStartPhase, false);
  assert.equal(solved.minShifts, 2);
  assert.equal(solved.path.filter(step => step.action === "SHIFT").length, 2);
});

test("solver invariant holds across 128 deterministic two-way synthetic frame pairs", () => {
  let state = 0x5eeda11;
  const next = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state; };
  for (let sample = 0; sample < 128; sample++) {
    const shared = new Set<string>();
    const onlyA = new Set<string>();
    const onlyB = new Set<string>();
    while (shared.size < 22) shared.add(`${2 + ((next() >>> 16) % 12)},${2 + ((next() >>> 16) % 12)}`);
    while (onlyA.size < 6) { const p = `${2 + ((next() >>> 16) % 12)},${2 + ((next() >>> 16) % 12)}`; if (!shared.has(p)) onlyA.add(p); }
    while (onlyB.size < 6) { const p = `${2 + ((next() >>> 16) % 12)},${2 + ((next() >>> 16) % 12)}`; if (!shared.has(p) && !onlyA.has(p)) onlyB.add(p); }
    const parse = (items: Set<string>) => [...items].map(value => value.split(",").map(Number) as [number, number]);
    const aRows = frame([...parse(shared), ...parse(onlyA)]);
    const bRows = frame([...parse(shared), ...parse(onlyB)]);
    const pair = { a: { index: 8, rows: aRows }, b: { index: 9, rows: bRows }, metrics: measurePair(aRows, bRows), sourceGroup: 1 };
    const chamber = buildProofChamber(pair);
    const solved = solveProofChamber(chamber);
    assert.equal(solved.solvable, true, `sample ${sample}`);
    assert.equal(solved.reachableWithoutShiftFromStartPhase, false, `sample ${sample}`);
    assert.equal(solved.minShifts, 2, `sample ${sample}`);
  }
});

test("Phase Pulse clock is deterministic and pause freezes active timing", () => {
  const profile: TimingProfile = { segmentMs: 100, initialSegmentIndex: 0, initialOffsetMs: 0 };
  assert.equal(pulseSegmentAt(0, profile), "TELEGRAPH_A");
  assert.equal(pulseSegmentAt(100, profile), "OPEN_A");
  assert.equal(pulseSegmentAt(200, profile), "TELEGRAPH_B");
  assert.equal(pulseSegmentAt(300, profile), "OPEN_B");
  assert.equal(pulseSegmentAt(400, profile), "TELEGRAPH_A");

  const clock = new ActivePulseClock();
  clock.advance(100);
  assert.equal(clock.segment(profile), "OPEN_A");
  clock.setPaused(true);
  clock.advance(5000);
  assert.equal(clock.elapsed(), 100);
  assert.equal(clock.segment(profile), "OPEN_A");
  clock.setPaused(false);
  clock.advance(100);
  assert.equal(clock.segment(profile), "TELEGRAPH_B");
});

test("Chamber II generation is deterministic and canonical shutter sources stay phase-correct", () => {
  const pair = syntheticPair();
  const base = buildProofChamber(pair).fingerprint;
  const one = buildTimingChamber(pair, base);
  const two = buildTimingChamber(pair, base);
  assert.deepEqual(one, two);
  assert.deepEqual(buildTimingProfile(base), buildTimingProfile(base));

  const field = derivePhaseField(pair.a.rows, pair.b.rows);
  assert.equal(field[one.shutterASourcePixel.y][one.shutterASourcePixel.x], "A_ONLY");
  assert.equal(field[one.shutterBSourcePixel.y][one.shutterBSourcePixel.x], "B_ONLY");
});

test("timed shutters independently enforce PHASE and TIMING", () => {
  const pair = syntheticPair();
  const chamber = buildTimingChamber(pair, buildProofChamber(pair).fingerprint);
  const a = chamber.shutterA, b = chamber.shutterB;

  assert.equal(isTimingPassable(chamber, a.x, a.y, "A", "TELEGRAPH_A"), false);
  assert.equal(isTimingPassable(chamber, a.x, a.y, "B", "OPEN_A"), false);
  assert.equal(isTimingPassable(chamber, a.x, a.y, "A", "OPEN_A"), true);

  assert.equal(isTimingPassable(chamber, b.x, b.y, "B", "TELEGRAPH_B"), false);
  assert.equal(isTimingPassable(chamber, b.x, b.y, "A", "OPEN_B"), false);
  assert.equal(isTimingPassable(chamber, b.x, b.y, "B", "OPEN_B"), true);
});

test("time-expanded Chamber II solver proves bounded completion and two required shifts", () => {
  const pair = syntheticPair();
  const base = buildProofChamber(pair).fingerprint;
  const chamber = buildTimingChamber(pair, base);
  const profile = buildTimingProfile(base);
  const solved = solveTimingChamber(chamber, profile);
  assert.equal(solved.solvable, true);
  assert.equal(solved.reachableWithoutShiftFromStartPhase, false);
  assert.equal(solved.minShifts, 2);
  assert.equal(solved.path.filter(step => step.action === "SHIFT").length, 2);
  assert.ok((solved.waits ?? -1) >= 0);
  assert.ok(solved.path.some(step => step.action === "WAIT"), "timing solver must be able to wait for pulse windows");
});
