import {
  applyCR2DraftCandidate,
  buildCR2Draft,
  useCR2Refract,
} from "./cr2-draft-core.ts";
import {
  applyCommonCoreToDelta,
  applyMemoryFuseToEcho,
  applyOrbitStabilizerToOrbit,
  applyResonanceCoilToSignal,
  applyVectorLensToVector,
  buildCR2PlayerProtocolRuntime,
  type CR2DeltaProtocolRuntime,
  type CR2PlayerProtocolRuntime,
  type CR2SignalProtocolRuntime,
  type CR2VectorProtocolRuntime,
} from "./cr2-protocol-runtime.ts";
import {
  buildCR2StateFromLive,
  grantCR2CoreToLive,
  projectCR2StateToLive,
  restoreCR2RefractToLive,
  type CR2LiveProjection,
  type CR2LiveSnapshot,
} from "./cr2-live-state-core.ts";
import type { CR1CheckpointId } from "./cr1-director-core.ts";
import type { EchoRankProfile } from "./echo-core.ts";
import type { OrbitRankProfile } from "./orbit-core.ts";
import type { DeltaProfile } from "./phase-combat-core.ts";
import type { SignalArcRankProfile } from "./signal-arc-core.ts";
import type { VectorRankProfile } from "./vector-core.ts";
import {
  buildV23ADraft,
  useV23ARefract,
  type V23BuildState,
  type V23DraftCandidate,
  type V23DraftResult,
  type V23ProtocolFamily,
} from "./progression-core.ts";
import type { CR2ProtocolRank } from "./cr2-progression-core.ts";

export interface CR2LiveDraftSelection {
  readonly selected: V23DraftCandidate;
  readonly projection: CR2LiveProjection;
}

export interface CR2LiveRefractResult {
  readonly projection: CR2LiveProjection;
  readonly draft: V23DraftResult;
}

function protocolRank(snapshot: CR2LiveSnapshot, family: V23ProtocolFamily): CR2ProtocolRank | null {
  const state = buildCR2StateFromLive(snapshot);
  const rank = state.protocols[family];
  if (rank === undefined) return null;
  if (rank < 1 || rank > 3) throw new Error(`${family} live Protocol rank is outside I-III.`);
  return rank as CR2ProtocolRank;
}

function applyCandidateWithUniversalPassives(state: V23BuildState, candidate: V23DraftCandidate): V23BuildState {
  const next = applyCR2DraftCandidate(state, candidate);
  if (candidate.candidateType !== "UTILITY" || candidate.familyId !== "FIELD_REPAIR") return next;
  const repairBonusHp = buildCR2PlayerProtocolRuntime(state.protocols).repairBonusHp;
  if (repairBonusHp <= 0 || next.hp >= next.maxHp) return next;
  return Object.freeze({ ...next, hp: Math.min(next.maxHp, next.hp + repairBonusHp) });
}

export function buildCR2DraftFromLive(seed: number, level: number, snapshot: CR2LiveSnapshot): V23DraftResult {
  return buildCR2Draft(seed, level, buildCR2StateFromLive(snapshot));
}

/**
 * Live Protocol integration deliberately excludes Evolution candidates until
 * the five evolved combat behaviors are wired and separately qualified.
 * This keeps Protocol drafting real without ever exposing a selectable no-op
 * Evolution in the Phaser scene.
 */
export function buildCR2ProtocolDraftFromLive(seed: number, level: number, snapshot: CR2LiveSnapshot): V23DraftResult {
  return buildV23ADraft(seed, level, buildCR2StateFromLive(snapshot));
}

export function applyCR2DraftChoiceToLive(
  seed: number,
  level: number,
  snapshot: CR2LiveSnapshot,
  candidateId: string,
): CR2LiveDraftSelection {
  const state = buildCR2StateFromLive(snapshot);
  const draft = buildCR2Draft(seed, level, state);
  const selected = draft.choices.find(candidate => candidate.candidateId === candidateId);
  if (!selected) throw new Error(`CR-2 draft choice ${candidateId} is not present in the current legal triple.`);
  return Object.freeze({
    selected,
    projection: projectCR2StateToLive(applyCandidateWithUniversalPassives(state, selected)),
  });
}

export function applyCR2ProtocolDraftChoiceToLive(
  seed: number,
  level: number,
  snapshot: CR2LiveSnapshot,
  candidateId: string,
): CR2LiveDraftSelection {
  const state = buildCR2StateFromLive(snapshot);
  const draft = buildV23ADraft(seed, level, state);
  const selected = draft.choices.find(candidate => candidate.candidateId === candidateId);
  if (!selected) throw new Error(`CR-2 Protocol draft choice ${candidateId} is not present in the current legal triple.`);
  return Object.freeze({
    selected,
    projection: projectCR2StateToLive(applyCandidateWithUniversalPassives(state, selected)),
  });
}

export function useCR2RefractFromLive(seed: number, level: number, snapshot: CR2LiveSnapshot): CR2LiveRefractResult {
  const result = useCR2Refract(seed, level, buildCR2StateFromLive(snapshot));
  return Object.freeze({ projection: projectCR2StateToLive(result.state), draft: result.draft });
}

export function useCR2ProtocolRefractFromLive(seed: number, level: number, snapshot: CR2LiveSnapshot): CR2LiveRefractResult {
  const result = useV23ARefract(seed, level, buildCR2StateFromLive(snapshot));
  return Object.freeze({ projection: projectCR2StateToLive(result.state), draft: result.draft });
}

export function collectCR2EvolutionCoreLive(snapshot: CR2LiveSnapshot, count = 1): CR2LiveProjection {
  return grantCR2CoreToLive(snapshot, count);
}

/**
 * CR-1 owns checkpoint/reward exactly-once authority. CR-2 adds the one
 * progression-side reward that is not represented by a pickup: the midpoint
 * CHECKPOINT_ELITE restores one REFRACT up to the locked cap.
 */
export function applyCR2CheckpointProgressionReward(
  snapshot: CR2LiveSnapshot,
  checkpoint: CR1CheckpointId,
  newlyClaimed: boolean,
): CR2LiveProjection {
  const state = buildCR2StateFromLive(snapshot);
  if (!newlyClaimed || checkpoint !== "CHECKPOINT_ELITE") return projectCR2StateToLive(state);
  return restoreCR2RefractToLive(snapshot, 1);
}

export function resolveCR2PlayerProtocolRuntime(snapshot: CR2LiveSnapshot): CR2PlayerProtocolRuntime {
  return buildCR2PlayerProtocolRuntime(buildCR2StateFromLive(snapshot).protocols);
}

export function resolveCR2DeltaProtocolRuntime(base: DeltaProfile, snapshot: CR2LiveSnapshot): CR2DeltaProtocolRuntime {
  const rank = protocolRank(snapshot, "COMMON_CORE");
  if (rank === null) return Object.freeze({ profile: base, postShiftStabilityMs: 0 });
  return applyCommonCoreToDelta(base, rank);
}

export function resolveCR2VectorProtocolRuntime(base: VectorRankProfile, snapshot: CR2LiveSnapshot): CR2VectorProtocolRuntime {
  const rank = protocolRank(snapshot, "VECTOR_LENS");
  if (rank === null) return Object.freeze({ profile: base, postShiftRangeBonus: 0 });
  return applyVectorLensToVector(base, rank);
}

export function resolveCR2OrbitProtocolRuntime(base: OrbitRankProfile, snapshot: CR2LiveSnapshot): OrbitRankProfile {
  const rank = protocolRank(snapshot, "ORBIT_STABILIZER");
  return rank === null ? base : applyOrbitStabilizerToOrbit(base, rank);
}

export function resolveCR2EchoProtocolRuntime(base: EchoRankProfile, snapshot: CR2LiveSnapshot): EchoRankProfile {
  const rank = protocolRank(snapshot, "MEMORY_FUSE");
  return rank === null ? base : applyMemoryFuseToEcho(base, rank);
}

export function resolveCR2SignalProtocolRuntime(base: SignalArcRankProfile, snapshot: CR2LiveSnapshot): CR2SignalProtocolRuntime {
  const rank = protocolRank(snapshot, "RESONANCE_COIL");
  if (rank === null) return Object.freeze({ profile: base, postShiftCommonBonus: 0 });
  return applyResonanceCoilToSignal(base, rank);
}
