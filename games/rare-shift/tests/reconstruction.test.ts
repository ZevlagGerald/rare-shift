import assert from "node:assert/strict";
import test from "node:test";
import { measurePair } from "../src/phase-core.ts";
import {
  buildReconstruction,
  emptyRunShiftStats,
  totalRunShifts,
} from "../src/reconstruction-core.ts";

const empty = () => Array.from({ length: 16 }, () => ".".repeat(16));
function frame(points: readonly [number, number][]): readonly string[] {
  const rows = empty().map(row => row.split(""));
  for (const [x, y] of points) rows[y][x] = "#";
  return rows.map(row => row.join(""));
}

const common: [number, number][] = [[6,4],[7,4],[8,4],[9,4],[6,5],[7,5],[8,5],[9,5],[7,6],[8,6]];
const aOnly: [number, number][] = [[5,4],[5,5],[6,6],[7,7]];
const bOnly: [number, number][] = [[10,4],[10,5],[9,6],[8,7]];
const rowsA = frame([...common, ...aOnly]);
const rowsB = frame([...common, ...bOnly]);
const pair = {
  a: { index: 33, rows: rowsA },
  b: { index: 34, rows: rowsB },
  metrics: measurePair(rowsA, rowsB),
  sourceGroup: 4,
};

function model(overrides: Partial<Parameters<typeof buildReconstruction>[0]> = {}) {
  return buildReconstruction({
    friendId: "13699",
    familyName: "Cellular",
    pair,
    t1Fingerprint: "fdef6617",
    t2Fingerprint: "78145332",
    t3Fingerprint: "2032f2f5",
    ...overrides,
  });
}

test("T4 reconstructs exact canonical A and B from phase components", () => {
  const result = model();
  assert.equal(result.exactA, true);
  assert.equal(result.exactB, true);
  assert.deepEqual(result.reconstructedA, rowsA);
  assert.deepEqual(result.reconstructedB, rowsB);
});

test("T4 keeps A_ONLY and B_ONLY isolated between reconstructed poses", () => {
  const result = model();
  for (const [x, y] of aOnly) {
    assert.equal(result.components.aOnly[y][x], "#");
    assert.equal(result.components.bOnly[y][x], ".");
    assert.equal(result.reconstructedA[y][x], "#");
    assert.equal(result.reconstructedB[y][x], ".");
  }
  for (const [x, y] of bOnly) {
    assert.equal(result.components.bOnly[y][x], "#");
    assert.equal(result.components.aOnly[y][x], ".");
    assert.equal(result.reconstructedB[y][x], "#");
    assert.equal(result.reconstructedA[y][x], ".");
  }
});

test("T4 RUN PROOF is deterministic and reacts to trusted identity inputs", () => {
  const first = model();
  const second = model();
  assert.equal(first.runProof, second.runProof);
  assert.match(first.runProof, /^[0-9a-f]{8}$/);
  assert.notEqual(model({ familyName: "Family" }).runProof, first.runProof);
  assert.notEqual(model({ t3Fingerprint: "ffffffff" }).runProof, first.runProof);
});

test("SHIFT statistics remain ephemeral and cannot alter RUN PROOF", () => {
  const proof = model().runProof;
  const stats = { chamber1: 4, chamber2: 12, chamber3: 6 };
  assert.equal(totalRunShifts(stats), 22);
  assert.deepEqual(emptyRunShiftStats(), { chamber1: 0, chamber2: 0, chamber3: 0 });
  assert.equal(model().runProof, proof);
});

test("T4 reconstruction invariant holds across 128 deterministic synthetic pairs", () => {
  let state = 0x4f31a2;
  const next = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state; };
  for (let sample = 0; sample < 128; sample++) {
    const shared = new Set<string>(), onlyA = new Set<string>(), onlyB = new Set<string>();
    while (shared.size < 18) shared.add(`${1 + ((next() >>> 16) % 14)},${1 + ((next() >>> 16) % 14)}`);
    while (onlyA.size < 5) {
      const p = `${1 + ((next() >>> 16) % 14)},${1 + ((next() >>> 16) % 14)}`;
      if (!shared.has(p)) onlyA.add(p);
    }
    while (onlyB.size < 5) {
      const p = `${1 + ((next() >>> 16) % 14)},${1 + ((next() >>> 16) % 14)}`;
      if (!shared.has(p) && !onlyA.has(p)) onlyB.add(p);
    }
    const parse = (set: Set<string>) => [...set].map(value => value.split(",").map(Number) as [number, number]);
    const a = frame([...parse(shared), ...parse(onlyA)]);
    const b = frame([...parse(shared), ...parse(onlyB)]);
    const candidate = {
      a: { index: 8, rows: a },
      b: { index: 9, rows: b },
      metrics: measurePair(a, b),
      sourceGroup: 1,
    };
    const result = buildReconstruction({
      friendId: String(sample + 1), familyName: "Synthetic", pair: candidate,
      t1Fingerprint: "11111111", t2Fingerprint: "22222222", t3Fingerprint: "33333333",
    });
    assert.deepEqual(result.reconstructedA, a, `sample ${sample} A`);
    assert.deepEqual(result.reconstructedB, b, `sample ${sample} B`);
  }
});
