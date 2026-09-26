import assert from "node:assert/strict";
import test from "node:test";
import { buildProofChamber, derivePhaseField, measurePair } from "../src/phase-core.ts";
import {
  applySyncContact,
  buildSyncChamber,
  isSyncPassable,
  requiredPhaseForNode,
} from "../src/sync-core.ts";
import { solveSyncChamber } from "../src/sync-solver.ts";

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
const pair = {
  a: { index: 32, rows: rowsA },
  b: { index: 35, rows: rowsB },
  metrics: measurePair(rowsA, rowsB),
  sourceGroup: 4,
};

function chamber() {
  const base = buildProofChamber(pair).fingerprint;
  return buildSyncChamber(pair, `t2-${base}`);
}

test("Chamber III generation is deterministic and B/A/B sources are canonical", () => {
  const one = chamber(), two = chamber();
  assert.deepEqual(one, two);
  assert.deepEqual(one.nodeRequiredPhases, ["B", "A", "B"]);
  assert.notDeepEqual(one.nodeSourcePixels[0], one.nodeSourcePixels[2]);

  const field = derivePhaseField(pair.a.rows, pair.b.rows);
  assert.equal(field[one.nodeSourcePixels[0].y][one.nodeSourcePixels[0].x], "B_ONLY");
  assert.equal(field[one.nodeSourcePixels[1].y][one.nodeSourcePixels[1].x], "A_ONLY");
  assert.equal(field[one.nodeSourcePixels[2].y][one.nodeSourcePixels[2].x], "B_ONLY");
});

test("SYNC node state machine enforces phase, order, duplicate safety, and exit lock", () => {
  const c = chamber();
  const [n1, n2, n3] = c.nodes;

  assert.equal(requiredPhaseForNode(0), "B");
  assert.equal(requiredPhaseForNode(1), "A");
  assert.equal(requiredPhaseForNode(2), "B");

  let state = applySyncContact(c, n1.x, n1.y, "A", 0);
  assert.equal(state.event, "PHASE_MISMATCH");
  assert.equal(state.nextNode, 0);

  state = applySyncContact(c, n3.x, n3.y, "B", 0);
  assert.equal(state.event, "SIGNAL_NOT_ROUTED");
  assert.equal(state.nextNode, 0);

  state = applySyncContact(c, n1.x, n1.y, "B", 0);
  assert.equal(state.event, "SYNCED");
  assert.equal(state.nextNode, 1);

  const duplicate = applySyncContact(c, n1.x, n1.y, "B", 1);
  assert.equal(duplicate.event, "ALREADY_SYNCED");
  assert.equal(duplicate.nextNode, 1);

  state = applySyncContact(c, n2.x, n2.y, "B", 1);
  assert.equal(state.event, "PHASE_MISMATCH");
  assert.equal(state.nextNode, 1);

  state = applySyncContact(c, n2.x, n2.y, "A", 1);
  assert.equal(state.event, "SYNCED");
  assert.equal(state.nextNode, 2);

  state = applySyncContact(c, n3.x, n3.y, "B", 2);
  assert.equal(state.event, "SYNCED");
  assert.equal(state.nextNode, 3);

  assert.equal(isSyncPassable(c, c.exit.x, c.exit.y, 0), false);
  assert.equal(isSyncPassable(c, c.exit.x, c.exit.y, 2), false);
  assert.equal(isSyncPassable(c, c.exit.x, c.exit.y, 3), true);
});

test("Chamber III solver proves three-node completion and exactly two required shifts", () => {
  const c = chamber();
  const solved = solveSyncChamber(c);
  assert.equal(solved.solvable, true);
  assert.equal(solved.reachableWithoutShiftFromStartPhase, false);
  assert.equal(solved.minShifts, 2);
  assert.equal(solved.path.filter(step => step.action === "SHIFT").length, 2);
  assert.equal(solved.path.at(-1)?.nextNode, 3);
  assert.deepEqual([...new Set(solved.path.map(step => step.nextNode))], [0, 1, 2, 3]);
});

test("Chamber III invariant holds across 128 deterministic qualified two-way pairs", () => {
  let state = 0x71a5c3;
  const next = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state; };

  for (let sample = 0; sample < 128; sample++) {
    const shared = new Set<string>();
    const onlyA = new Set<string>();
    const onlyB = new Set<string>();
    while (shared.size < 22) shared.add(`${2 + ((next() >>> 16) % 12)},${2 + ((next() >>> 16) % 12)}`);
    while (onlyA.size < 6) {
      const p = `${2 + ((next() >>> 16) % 12)},${2 + ((next() >>> 16) % 12)}`;
      if (!shared.has(p)) onlyA.add(p);
    }
    while (onlyB.size < 6) {
      const p = `${2 + ((next() >>> 16) % 12)},${2 + ((next() >>> 16) % 12)}`;
      if (!shared.has(p) && !onlyA.has(p)) onlyB.add(p);
    }
    const parse = (items: Set<string>) => [...items].map(value => value.split(",").map(Number) as [number, number]);
    const aRows = frame([...parse(shared), ...parse(onlyA)]);
    const bRows = frame([...parse(shared), ...parse(onlyB)]);
    const candidate = {
      a: { index: 8, rows: aRows },
      b: { index: 9, rows: bRows },
      metrics: measurePair(aRows, bRows),
      sourceGroup: 1,
    };
    const c = buildSyncChamber(candidate, `sample-${sample}`);
    const solved = solveSyncChamber(c);
    assert.equal(solved.solvable, true, `sample ${sample}`);
    assert.equal(solved.reachableWithoutShiftFromStartPhase, false, `sample ${sample}`);
    assert.equal(solved.minShifts, 2, `sample ${sample}`);
  }
});
