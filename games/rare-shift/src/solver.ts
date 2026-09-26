import { isPassable, otherPhase } from "./phase-core.ts";
import type { Phase, ProofChamber, SolveResult, SolverStep } from "./types.ts";

interface NodeState { x: number; y: number; phase: Phase; shifts: number; path: SolverStep[]; }

const key = (x: number, y: number, phase: Phase) => `${x},${y},${phase}`;
const directions = [
  { dx: 0, dy: -1, action: "UP" as const },
  { dx: 0, dy: 1, action: "DOWN" as const },
  { dx: -1, dy: 0, action: "LEFT" as const },
  { dx: 1, dy: 0, action: "RIGHT" as const },
];

function canReachWithoutShift(chamber: ProofChamber): boolean {
  const phase = chamber.startPhase;
  const queue = [{ ...chamber.start }];
  const seen = new Set([`${chamber.start.x},${chamber.start.y}`]);
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (current.x === chamber.exit.x && current.y === chamber.exit.y) return true;
    for (const d of directions) {
      const x = current.x + d.dx, y = current.y + d.dy, k = `${x},${y}`;
      if (!seen.has(k) && isPassable(chamber, x, y, phase)) { seen.add(k); queue.push({ x, y }); }
    }
  }
  return false;
}

export function solveProofChamber(chamber: ProofChamber): SolveResult {
  const start: NodeState = {
    ...chamber.start, phase: chamber.startPhase, shifts: 0,
    path: [{ ...chamber.start, phase: chamber.startPhase, action: "START" }],
  };
  const deque: NodeState[] = [start];
  const best = new Map<string, number>([[key(start.x, start.y, start.phase), 0]]);
  let winner: NodeState | null = null;

  while (deque.length) {
    const current = deque.shift()!;
    if (current.x === chamber.exit.x && current.y === chamber.exit.y) { winner = current; break; }

    for (const d of directions) {
      const x = current.x + d.dx, y = current.y + d.dy;
      if (!isPassable(chamber, x, y, current.phase)) continue;
      const k = key(x, y, current.phase), old = best.get(k);
      if (old !== undefined && old <= current.shifts) continue;
      best.set(k, current.shifts);
      deque.unshift({ x, y, phase: current.phase, shifts: current.shifts,
        path: [...current.path, { x, y, phase: current.phase, action: d.action }] });
    }

    const shifted = otherPhase(current.phase);
    if (isPassable(chamber, current.x, current.y, shifted)) {
      const k = key(current.x, current.y, shifted), nextCost = current.shifts + 1, old = best.get(k);
      if (old === undefined || nextCost < old) {
        best.set(k, nextCost);
        deque.push({ x: current.x, y: current.y, phase: shifted, shifts: nextCost,
          path: [...current.path, { x: current.x, y: current.y, phase: shifted, action: "SHIFT" }] });
      }
    }
  }

  return {
    solvable: Boolean(winner),
    minShifts: winner?.shifts ?? null,
    path: winner?.path ?? [],
    reachableWithoutShiftFromStartPhase: canReachWithoutShift(chamber),
  };
}
