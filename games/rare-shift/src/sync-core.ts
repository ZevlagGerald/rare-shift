import { derivePhaseField } from "./phase-core.ts";
import type {
  Phase,
  Point,
  SelectedFramePair,
  SyncChamber,
  SyncContactResult,
  SyncNodeIndex,
  SyncProgress,
  SyncTileKind,
} from "./types.ts";

const REQUIRED_PHASES = Object.freeze(["B", "A", "B"] as const);

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

export function requiredPhaseForNode(index: SyncNodeIndex): Phase {
  return REQUIRED_PHASES[index];
}

export function buildSyncChamber(pair: SelectedFramePair, baseFingerprint: string): SyncChamber {
  const aPixels = pointsFor(pair, "A_ONLY");
  const bPixels = pointsFor(pair, "B_ONLY");
  if (aPixels.length < 1 || bPixels.length < 2) {
    throw new Error("Selected pair lacks canonical pixels required for Chamber III B/A/B synchronization.");
  }

  const seed = fnv1a(`${baseFingerprint}|RARE-SHIFT|T3|SYNC`);
  const b1Index = seed % bPixels.length;
  const b3Offset = 1 + (Math.floor(seed / bPixels.length) % (bPixels.length - 1));
  const b3Index = (b1Index + b3Offset) % bPixels.length;
  const aIndex = Math.floor(seed / 97) % aPixels.length;

  const sources = Object.freeze([
    Object.freeze({ ...bPixels[b1Index] }),
    Object.freeze({ ...aPixels[aIndex] }),
    Object.freeze({ ...bPixels[b3Index] }),
  ]) as readonly [Point, Point, Point];

  const width = 16, height = 9;
  const nodes = Object.freeze([
    Object.freeze({ x: 4, y: 3 + (sources[0].y % 3) }),
    Object.freeze({ x: 8, y: 3 + (sources[1].y % 3) }),
    Object.freeze({ x: 11, y: 3 + (sources[2].y % 3) }),
  ]) as readonly [Point, Point, Point];

  const mutable: SyncTileKind[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) =>
      x === 0 || y === 0 || x === width - 1 || y === height - 1 ? "WALL" : "FLOOR"));

  mutable[nodes[0].y][nodes[0].x] = "NODE_1";
  mutable[nodes[1].y][nodes[1].x] = "NODE_2";
  mutable[nodes[2].y][nodes[2].x] = "NODE_3";
  const exit = Object.freeze({ x: width - 3, y: 4 });
  mutable[exit.y][exit.x] = "EXIT";

  const fingerprint = fnv1a(
    `${baseFingerprint}|${pair.a.index}|${pair.b.index}|` +
    `${sources.map(point => `${point.x},${point.y}`).join("|")}|` +
    `${nodes.map(point => `${point.x},${point.y}`).join("|")}|T3`,
  ).toString(16).padStart(8, "0");

  return Object.freeze({
    width,
    height,
    tiles: Object.freeze(mutable.map(row => Object.freeze(row.slice()))),
    start: Object.freeze({ x: 2, y: 4 }),
    exit,
    startPhase: "B" as Phase,
    nodes,
    nodeSourcePixels: sources,
    nodeRequiredPhases: REQUIRED_PHASES,
    frameAIndex: pair.a.index,
    frameBIndex: pair.b.index,
    baseFingerprint,
    fingerprint,
  });
}

export function nodeIndexAt(chamber: SyncChamber, x: number, y: number): SyncNodeIndex | null {
  for (let index = 0; index < chamber.nodes.length; index++) {
    const node = chamber.nodes[index];
    if (node.x === x && node.y === y) return index as SyncNodeIndex;
  }
  return null;
}

export function isSyncPassable(chamber: SyncChamber, x: number, y: number, nextNode: SyncProgress): boolean {
  if (x < 0 || y < 0 || x >= chamber.width || y >= chamber.height) return false;
  const tile = chamber.tiles[y][x];
  if (tile === "WALL") return false;
  if (tile === "EXIT") return nextNode === 3;
  return true;
}

export function applySyncContact(
  chamber: SyncChamber,
  x: number,
  y: number,
  phase: Phase,
  nextNode: SyncProgress,
): SyncContactResult {
  const nodeIndex = nodeIndexAt(chamber, x, y);
  if (nodeIndex === null) return { nextNode, event: "NONE", nodeIndex: null };
  if (nodeIndex < nextNode) return { nextNode, event: "ALREADY_SYNCED", nodeIndex };
  if (nodeIndex > nextNode) return { nextNode, event: "SIGNAL_NOT_ROUTED", nodeIndex };

  const required = requiredPhaseForNode(nodeIndex);
  if (phase !== required) return { nextNode, event: "PHASE_MISMATCH", nodeIndex };

  return {
    nextNode: (nextNode + 1) as SyncProgress,
    event: "SYNCED",
    nodeIndex,
  };
}
