import { isTimingPassable, PULSE_ORDER, pulseSegmentIndex } from "./timing-core.ts";
import { otherPhase } from "./phase-core.ts";
import type {
  Phase,
  PulseSegment,
  TimingChamber,
  TimingProfile,
  TimingSolveResult,
  TimingSolverStep,
} from "./types.ts";

interface NodeState {
  x: number;
  y: number;
  phase: Phase;
  pulseIndex: number;
  shifts: number;
  waits: number;
  path: TimingSolverStep[];
}

const directions = [
  { dx: 0, dy: -1, action: "UP" as const },
  { dx: 0, dy: 1, action: "DOWN" as const },
  { dx: -1, dy: 0, action: "LEFT" as const },
  { dx: 1, dy: 0, action: "RIGHT" as const },
];

const pulseAt = (index: number): PulseSegment => PULSE_ORDER[((index % PULSE_ORDER.length) + PULSE_ORDER.length) % PULSE_ORDER.length];
const key = (x: number, y: number, phase: Phase, pulseIndex: number) => `${x},${y},${phase},${pulseIndex}`;

function canReachWithoutShift(chamber: TimingChamber, profile: TimingProfile): boolean {
  const startPulse = profile.initialSegmentIndex % PULSE_ORDER.length;
  const queue = [{ x: chamber.start.x, y: chamber.start.y, pulseIndex: startPulse }];
  const seen = new Set([`${chamber.start.x},${chamber.start.y},${startPulse}`]);

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (current.x === chamber.exit.x && current.y === chamber.exit.y) return true;
    const segment = pulseAt(current.pulseIndex);
    for (const d of directions) {
      const x = current.x + d.dx, y = current.y + d.dy;
      const k = `${x},${y},${current.pulseIndex}`;
      if (!seen.has(k) && isTimingPassable(chamber, x, y, chamber.startPhase, segment)) {
        seen.add(k);
        queue.push({ x, y, pulseIndex: current.pulseIndex });
      }
    }
    const nextPulse = (current.pulseIndex + 1) % PULSE_ORDER.length;
    const waitKey = `${current.x},${current.y},${nextPulse}`;
    if (!seen.has(waitKey)) {
      seen.add(waitKey);
      queue.push({ x: current.x, y: current.y, pulseIndex: nextPulse });
    }
  }
  return false;
}

export function solveTimingChamber(chamber: TimingChamber, profile: TimingProfile): TimingSolveResult {
  const startPulseIndex = profile.initialSegmentIndex % PULSE_ORDER.length;
  const startPulse = pulseAt(startPulseIndex);
  const start: NodeState = {
    ...chamber.start,
    phase: chamber.startPhase,
    pulseIndex: startPulseIndex,
    shifts: 0,
    waits: 0,
    path: [{ ...chamber.start, phase: chamber.startPhase, pulse: startPulse, action: "START" }],
  };

  const deque: NodeState[] = [start];
  const best = new Map<string, number>([[key(start.x, start.y, start.phase, start.pulseIndex), 0]]);
  let winner: NodeState | null = null;

  while (deque.length) {
    const current = deque.shift()!;
    if (current.x === chamber.exit.x && current.y === chamber.exit.y) {
      winner = current;
      break;
    }

    const segment = pulseAt(current.pulseIndex);
    for (const d of directions) {
      const x = current.x + d.dx, y = current.y + d.dy;
      if (!isTimingPassable(chamber, x, y, current.phase, segment)) continue;
      const k = key(x, y, current.phase, current.pulseIndex);
      const old = best.get(k);
      if (old !== undefined && old <= current.shifts) continue;
      best.set(k, current.shifts);
      deque.unshift({
        x,
        y,
        phase: current.phase,
        pulseIndex: current.pulseIndex,
        shifts: current.shifts,
        waits: current.waits,
        path: [...current.path, { x, y, phase: current.phase, pulse: segment, action: d.action }],
      });
    }

    const nextPhase = otherPhase(current.phase);
    if (isTimingPassable(chamber, current.x, current.y, nextPhase, segment)) {
      const k = key(current.x, current.y, nextPhase, current.pulseIndex);
      const nextCost = current.shifts + 1;
      const old = best.get(k);
      if (old === undefined || nextCost < old) {
        best.set(k, nextCost);
        deque.push({
          x: current.x,
          y: current.y,
          phase: nextPhase,
          pulseIndex: current.pulseIndex,
          shifts: nextCost,
          waits: current.waits,
          path: [...current.path, { x: current.x, y: current.y, phase: nextPhase, pulse: segment, action: "SHIFT" }],
        });
      }
    }

    const nextPulseIndex = (current.pulseIndex + 1) % PULSE_ORDER.length;
    const nextPulse = pulseAt(nextPulseIndex);
    const waitKey = key(current.x, current.y, current.phase, nextPulseIndex);
    const oldWait = best.get(waitKey);
    if (oldWait === undefined || current.shifts < oldWait) {
      best.set(waitKey, current.shifts);
      deque.unshift({
        x: current.x,
        y: current.y,
        phase: current.phase,
        pulseIndex: nextPulseIndex,
        shifts: current.shifts,
        waits: current.waits + 1,
        path: [...current.path, { x: current.x, y: current.y, phase: current.phase, pulse: nextPulse, action: "WAIT" }],
      });
    }
  }

  return {
    solvable: Boolean(winner),
    minShifts: winner?.shifts ?? null,
    waits: winner?.waits ?? null,
    path: winner?.path ?? [],
    reachableWithoutShiftFromStartPhase: canReachWithoutShift(chamber, profile),
  };
}

export function solverPulseIndex(segment: PulseSegment): number {
  return pulseSegmentIndex(segment);
}
