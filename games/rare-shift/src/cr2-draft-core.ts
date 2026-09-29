import {
  applyV23ACandidate,
  buildV23ADraft,
  buildV23AFallbackDraft,
  enumerateV23ACandidates,
  validateV23BuildState,
  type V23BuildState,
  type V23DraftCandidate,
  type V23DraftResult,
  type V23WeaponFamily,
} from "./progression-core.ts";
import {
  applyCR2Evolution,
  CR2_EVOLUTION_CONTRACTS,
  eligibleCR2EvolutionFamilies,
} from "./cr2-progression-core.ts";

function evolutionCandidate(family: V23WeaponFamily): V23DraftCandidate {
  const contract = CR2_EVOLUTION_CONTRACTS[family];
  return Object.freeze({
    candidateId: `EVOLUTION:${family}:${contract.id}`,
    candidateType: "EVOLUTION",
    familyId: family,
    fromRank: 5,
    toRank: 5,
    priorityClass: 1,
    name: contract.name,
    description: `${family} Rank V + ${contract.requiredProtocol} + 1 Evolution Core → ${contract.name}.`,
  });
}

function frozenDraft(choices: readonly V23DraftCandidate[], legalCandidateCount: number, rerollNonce: number): V23DraftResult {
  if (choices.length !== 3 || new Set(choices.map(choice => choice.candidateId)).size !== 3) {
    throw new Error("CR-2 production draft must contain exactly three distinct legal choices.");
  }
  return Object.freeze({ choices: Object.freeze([...choices]), legalCandidateCount, rerollNonce });
}

function deterministicEvolutionChoice(
  seed: number,
  level: number,
  rerollNonce: number,
  eligible: readonly V23WeaponFamily[],
): V23WeaponFamily {
  if (eligible.length === 0) throw new Error("No eligible Evolution family exists.");
  const index = ((seed >>> 0) + level + rerollNonce) % eligible.length;
  return eligible[index];
}

export function enumerateCR2DraftCandidates(level: number, state: V23BuildState): readonly V23DraftCandidate[] {
  validateV23BuildState(state);
  const base = enumerateV23ACandidates(level, state);
  const evolutions = eligibleCR2EvolutionFamilies(state).map(evolutionCandidate);
  return Object.freeze([...base, ...evolutions].sort((a, b) => a.candidateId.localeCompare(b.candidateId)));
}

/**
 * CR-2 preserves the qualified V2-3 production draft exactly until an Evolution
 * is genuinely eligible. Once a Core + Rank-V + matching-Protocol gate opens,
 * one deterministic legal Evolution is guaranteed in the next normal draft.
 */
export function buildCR2Draft(seed: number, level: number, state: V23BuildState): V23DraftResult {
  validateV23BuildState(state);
  const eligible = eligibleCR2EvolutionFamilies(state);
  if (eligible.length === 0) return buildV23ADraft(seed, level, state);

  const baseCandidates = enumerateV23ACandidates(level, state);
  const baseDraft = buildV23AFallbackDraft(seed, level, state);
  const selectedFamily = deterministicEvolutionChoice(seed, level, state.rerollNonce, eligible);
  const evolution = evolutionCandidate(selectedFamily);
  const allEvolutionCandidates = eligible.map(evolutionCandidate);
  const supplemental = [
    ...baseDraft.choices,
    ...baseCandidates,
    ...allEvolutionCandidates,
  ].filter(candidate => candidate.candidateId !== evolution.candidateId);
  const distinctSupplemental = supplemental.filter((candidate, index, list) => (
    list.findIndex(item => item.candidateId === candidate.candidateId) === index
  ));
  const remaining = distinctSupplemental.slice(0, 2);
  const legalCount = baseCandidates.length + eligible.length;
  if (legalCount < 3 || remaining.length < 2) {
    throw new Error(`CR-2 production draft exhausted: only ${legalCount} legal candidates at level ${level}.`);
  }
  return frozenDraft([evolution, ...remaining], legalCount, state.rerollNonce);
}

export function applyCR2DraftCandidate(state: V23BuildState, candidate: V23DraftCandidate): V23BuildState {
  validateV23BuildState(state);
  if (candidate.candidateType === "EVOLUTION") {
    return applyCR2Evolution(state, candidate.familyId as V23WeaponFamily);
  }
  return applyV23ACandidate(state, candidate);
}

export function useCR2Refract(seed: number, level: number, state: V23BuildState): {
  readonly state: V23BuildState;
  readonly draft: V23DraftResult;
} {
  validateV23BuildState(state);
  if (state.refracts <= 0) throw new Error("No REFRACT rerolls remain.");
  const previous = buildCR2Draft(seed, level, state);
  const nextState: V23BuildState = Object.freeze({
    ...state,
    refracts: state.refracts - 1,
    rerollNonce: state.rerollNonce + 1,
  });
  validateV23BuildState(nextState);
  const next = buildCR2Draft(seed, level, nextState);
  if (previous.legalCandidateCount >= 4) {
    const before = previous.choices.map(choice => choice.candidateId).join("|");
    const after = next.choices.map(choice => choice.candidateId).join("|");
    if (before === after) throw new Error("CR-2 REFRACT failed to produce a different ordered triple despite sufficient alternatives.");
  }
  return Object.freeze({ state: nextState, draft: next });
}
