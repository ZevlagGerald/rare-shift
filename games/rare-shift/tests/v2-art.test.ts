import assert from "node:assert/strict";
import test from "node:test";
import {
  V2_ART_GRID_SIZE,
  V2_ART_SPRITES,
  V2_PALETTE,
  artRowsDiffer,
  buildFractureGrid,
  countArtPixels,
  exclusiveDeltaRows,
  fractureCellAt,
  renderPixelRowsSvg,
} from "../src/v2-art-core.ts";
import { V2_EFFECT_SPECS, effectDuration, effectTone } from "../src/v2-fx-core.ts";
import type { FrameRows } from "../src/types.ts";

function emptyRows(): string[][] {
  return Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => "."));
}

function frame(points: readonly [number, number][]): FrameRows {
  const rows = emptyRows();
  for (const [x, y] of points) rows[y][x] = "#";
  return rows.map(row => row.join(""));
}

const common: [number, number][] = [
  [6,4],[7,4],[8,4],[9,4],[5,5],[6,5],[7,5],[8,5],[9,5],[10,5],
  [6,6],[7,6],[8,6],[9,6],[7,7],[8,7],
];
const aOnly: [number, number][] = [[4,5],[5,4],[6,3],[7,3],[8,3]];
const bOnly: [number, number][] = [[10,4],[11,5],[9,3],[8,8],[7,8]];
const frameA = frame([...common, ...aOnly]);
const frameB = frame([...common, ...bOnly]);

function pointsFromRows(rows: FrameRows): Set<string> {
  const points = new Set<string>();
  rows.forEach((row, y) => [...row].forEach((cell, x) => { if (cell === "#") points.add(`${x},${y}`); }));
  return points;
}

test("V2 production sprite primitives are valid 16x16 deterministic pixel masks", () => {
  for (const sprite of Object.values(V2_ART_SPRITES)) {
    assert.equal(sprite.rows.length, V2_ART_GRID_SIZE, sprite.id);
    for (const row of sprite.rows) {
      assert.equal(row.length, V2_ART_GRID_SIZE, sprite.id);
      assert.match(row, /^[.#]{16}$/u, sprite.id);
    }
    assert.ok(countArtPixels(sprite.rows) > 0, sprite.id);
  }
});

test("TRACE, SPLIT-A, and SPLIT-B remain distinct without color", () => {
  const trace = V2_ART_SPRITES.TRACE.rows;
  const a = V2_ART_SPRITES.SPLIT_A.rows;
  const b = V2_ART_SPRITES.SPLIT_B.rows;
  assert.equal(artRowsDiffer(trace, a), true);
  assert.equal(artRowsDiffer(trace, b), true);
  assert.equal(artRowsDiffer(a, b), true);
  assert.deepEqual(b, a.map(row => [...row].reverse().join("")), "A/B silhouettes should encode mirrored non-color phase grammar");
  assert.equal(V2_ART_SPRITES.SPLIT_A.cue, "A_LEFT_BREAK");
  assert.equal(V2_ART_SPRITES.SPLIT_B.cue, "B_RIGHT_BREAK");
});

test("DELTA BURST rows are exact canonical A_ONLY and B_ONLY geometry", () => {
  const deltaA = exclusiveDeltaRows(frameA, frameB, "A");
  const deltaB = exclusiveDeltaRows(frameA, frameB, "B");
  assert.deepEqual(pointsFromRows(deltaA), new Set(aOnly.map(([x, y]) => `${x},${y}`)));
  assert.deepEqual(pointsFromRows(deltaB), new Set(bOnly.map(([x, y]) => `${x},${y}`)));
  for (const [x, y] of common) {
    assert.equal(deltaA[y][x], ".");
    assert.equal(deltaB[y][x], ".");
  }
});

test("FRACTURE GRID visual texture is deterministic, bounded, and seed-sensitive", () => {
  const one = buildFractureGrid(32, 20, 0x12345678);
  const two = buildFractureGrid(32, 20, 0x12345678);
  const other = buildFractureGrid(32, 20, 0x87654321);
  assert.deepEqual(one, two);
  assert.notDeepEqual(one, other);
  assert.equal(one.length, 20);
  assert.equal(one[0].length, 32);
  for (const row of one) for (const cell of row) assert.match(cell, /^(QUIET|GRID|FRACTURE|COMMON_MARK)$/u);
  assert.equal(fractureCellAt(7, 11, 99), fractureCellAt(7, 11, 99));
});

test("pixel SVG renderer preserves crisp nearest-neighbor presentation", () => {
  const svg = renderPixelRowsSvg(V2_ART_SPRITES.SIGNAL_XP.rows, V2_PALETTE.common, "Signal XP", 4);
  assert.match(svg, /width="64" height="64"/u);
  assert.match(svg, /shape-rendering="crispEdges"/u);
  assert.match(svg, /aria-label="Signal XP"/u);
  assert.match(svg, new RegExp(`fill="${V2_PALETTE.common}"`, "u"));
  assert.equal((svg.match(/<rect /gu) ?? []).length, countArtPixels(V2_ART_SPRITES.SIGNAL_XP.rows));
});

test("locked V2 phase palette remains aligned with governance", () => {
  assert.deepEqual(
    {
      phaseA: V2_PALETTE.phaseA,
      phaseB: V2_PALETTE.phaseB,
      common: V2_PALETTE.common,
      void: V2_PALETTE.void,
      backgroundPrimary: V2_PALETTE.backgroundPrimary,
      backgroundSecondary: V2_PALETTE.backgroundSecondary,
    },
    {
      phaseA: "#4cc9f0",
      phaseB: "#f72585",
      common: "#e8edf2",
      void: "#202832",
      backgroundPrimary: "#0b0e12",
      backgroundSecondary: "#11151b",
    },
  );
});

test("combat FX stay brief, bounded, non-hazard-like, and reduced-motion safe", () => {
  assert.deepEqual(Object.keys(V2_EFFECT_SPECS).sort(), ["DELTA_BURST", "ENEMY_DEATH", "ENEMY_HIT", "ENEMY_SPAWN", "SHIFT_TRANSITION"].sort());
  for (const spec of Object.values(V2_EFFECT_SPECS)) {
    assert.ok(spec.durationMs >= 0 && spec.durationMs <= 240, spec.id);
    assert.ok(spec.reducedMotionDurationMs >= 0 && spec.reducedMotionDurationMs <= spec.durationMs, spec.id);
    assert.ok(spec.maxParticles >= 0 && spec.maxParticles <= 8, spec.id);
    assert.equal(spec.hazardLike, false, spec.id);
    assert.equal(spec.blocksInput, false, spec.id);
    assert.equal(effectDuration(spec.id, false), spec.durationMs);
    assert.equal(effectDuration(spec.id, true), spec.reducedMotionDurationMs);
  }
  assert.equal(effectDuration("SHIFT_TRANSITION", true), 0);
  assert.equal(effectTone("SHIFT_TRANSITION", "A"), V2_PALETTE.phaseA);
  assert.equal(effectTone("SHIFT_TRANSITION", "B"), V2_PALETTE.phaseB);
  assert.equal(effectTone("ENEMY_DEATH", "A"), V2_PALETTE.common);
});
