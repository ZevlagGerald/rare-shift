import { otherPhase } from "./phase-core.ts";
import { applySyncContact, isSyncPassable } from "./sync-core.ts";
import type { Phase, SyncChamber, SyncProgress, SyncSolveResult, SyncSolverStep } from "./types.ts";

interface NodeState {
  x: number;
  y: number;
  phase: Phase;
  nextNode: SyncProgress;
  shifts: number;
  path: SyncSolverStep[];
}

const directions = [
  { dx: 0, dy: -1, action: "UP" as const },
  { dx: 0, dy: 1, action: "DOWN" as const },
  { dx: -1, dy: 0, action: "LEFT" as const },
  { dx: 1, dy: 0, action: "RIGHT" as const },
];

const key = (x: number, y: number, phase: Phase, nextNode: SyncProgress) => `${x},${y},${phase},${nextNode}`;

function canReachWithoutShift(chamber: SyncChamber): boolean {
  const start: NodeState = {
    ...chamber.start,
    phase: chamber.startPhase,
    nextNode: 0,
    shifts: 0,
    path: [],
  };
  const queue = [start];
  const seen = new Set([key(start.x, start.y, start.phase, start.nextNode)]);

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (current.x === chamber.exit.x && current.y === chamber.exit.y && current.nextNode === 3) return true;

    for (const d of directions) {
      const x = current.x + d.dx, y = current.y + d.dy;
      if (!isSyncPassable(chamber, x, y, current.nextNode)) continue;
      const contact = applySyncContact(chamber, x, y, current.phase, current.nextNode);
      const k = key(x, y, current.phase, contact.nextNode);
      if (seen.has(k)) continue;
      seen.add(k);
      queue.push({ x, y, phase: current.phase, nextNode: contact.nextNode, shifts: 0, path: [] });
    }
  }
  return false;
}

export function solveSyncChamber(chamber: SyncChamber): SyncSolveResult {
  const start: NodeState = {
    ...chamber.start,
    phase: chamber.startPhase,
    nextNode: 0,
    shifts: 0,
    path: [{ ...chamber.start, phase: chamber.startPhase, nextNode: 0, action: "START" }],
  };

  const deque: NodeState[] = [start];
  const best = new Map<string, number>([[key(start.x, start.y, start.phase, start.nextNode), 0]]);
  let winner: NodeState | null = null;

  while (deque.length) {
    const current = deque.shift()!;
    if (current.x === chamber.exit.x && current.y === chamber.exit.y && current.nextNode === 3) {
      winner = current;
      break;
    }

    for (const d of directions) {
      const x = current.x + d.dx, y = current.y + d.dy;
      if (!isSyncPassable(chamber, x, y, current.nextNode)) continue;
      const contact = applySyncContact(chamber, x, y, current.phase, current.nextNode);
      const k = key(x, y, current.phase, contact.nextNode);
      const old = best.get(k);
      if (old !== undefined && old <= current.shifts) continue;
      best.set(k, current.shifts);
      deque.unshift({
        x,
        y,
        phase: current.phase,
        nextNode: contact.nextNode,
        shifts: current.shifts,
        path: [...current.path, { x, y, phase: current.phase, nextNode: contact.nextNode, action: d.action }],
      });
    }

    const nextPhase = otherPhase(current.phase);
    const shiftKey = key(current.x, current.y, nextPhase, current.nextNode);
    const nextCost = current.shifts + 1;
    const old = best.get(shiftKey);
    if (old === undefined || nextCost < old) {
      best.set(shiftKey, nextCost);
      deque.push({
        x: current.x,
        y: current.y,
        phase: nextPhase,
        nextNode: current.nextNode,
        shifts: nextCost,
        path: [...current.path, {
          x: current.x,
          y: current.y,
          phase: nextPhase,
          nextNode: current.nextNode,
          action: "SHIFT",
        }],
      });
    }
  }

  return {
    solvable: Boolean(winner),
    minShifts: winner?.shifts ?? null,
    path: winner?.path ?? [],
    reachableWithoutShiftFromStartPhase: canReachWithoutShift(chamber),
  };
}
