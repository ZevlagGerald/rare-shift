import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCR2DraftCandidate,
  buildCR2Draft,
  enumerateCR2DraftCandidates,
  useCR2Refract,
} from "../src/cr2-draft-core.ts";
import {
  applyV23ACandidate,
  buildV23ADraft,
  createV23InitialBuildState,
  matchingProtocolForWeapon,
  type V23BuildState,
  type V23DraftCandidate,
  type V23ProtocolFamily,
  type V23WeaponFamily,
} from "../src/progression-core.ts";

const SEED = 13699;

function choice(draft: { readonly choices: readonly V23DraftCandidate[] }, id: string): V23DraftCandidate {
  const found = draft.choices.find(candidate => candidate.candidateId === id);
  assert.ok(found, `expected ${id}`);
  return found;
}

function evolutionReadyState(families: readonly V23WeaponFamily[], cores = 1): V23BuildState {
  const weapons: V23BuildState["weapons"] = { DELTA: { rank: families.includes("DELTA") ? 5 : 1, evolved: false } };
  const protocols: Partial<Record<V23ProtocolFamily, number>> = {};
  for (const family of families) {
    if (family !== "DELTA") weapons[family] = { rank: 5, evolved: false };
    protocols[matchingProtocolForWeapon(family)] = 1;
  }
  return {
    weapons,
    protocols,
    evolutionCores: cores,
    refracts: 1,
    rerollNonce: 0,
    hp: 60,
    maxHp: 100,
    pickupRadius: 76,
  };
}

test("CR-2 draft preserves the qualified Level 2-4 onboarding triples exactly", () => {
  let state = createV23InitialBuildState({ hp: 70, pickupRadius: 76 });
  for (const [level, selected] of [[2, "WEAPON_ACQUIRE:ORBIT"], [3, "WEAPON_ACQUIRE:ECHO"], [4, "WEAPON_ACQUIRE:SIGNAL"]] as const) {
    const inherited = buildV23ADraft(SEED, level, state);
    const cr2 = buildCR2Draft(SEED, level, state);
    assert.deepEqual(cr2.choices.map(item => item.candidateId), inherited.choices.map(item => item.candidateId), `level ${level}`);
    const selectedCandidate = choice(cr2, selected);
    state = applyCR2DraftCandidate(state, selectedCandidate);
  }
});

test("CR-2 Protocol candidates remain absent before Level 5 and enter the legal pool at Level 5", () => {
  const state = createV23InitialBuildState();
  for (const level of [2, 3, 4]) {
    assert.equal(enumerateCR2DraftCandidates(level, state).some(item => item.candidateType.startsWith("PROTOCOL")), false, `level ${level}`);
  }
  const atFive = enumerateCR2DraftCandidates(5, state);
  assert.equal(atFive.filter(item => item.candidateType === "PROTOCOL_ACQUIRE").length, 5);
});

test("CR-2 with no eligible Evolution delegates to the inherited deterministic production draft", () => {
  const state = createV23InitialBuildState({ hp: 50, pickupRadius: 76 });
  for (const level of [2, 3, 4, 5, 8]) {
    assert.deepEqual(buildCR2Draft(SEED, level, state), buildV23ADraft(SEED, level, state), `level ${level}`);
  }
});

test("CR-2 guarantees one legal Evolution in the next normal draft when Core gate opens", () => {
  const state = evolutionReadyState(["DELTA"], 1);
  const draft = buildCR2Draft(SEED, 12, state);
  assert.equal(draft.choices.length, 3);
  assert.equal(new Set(draft.choices.map(item => item.candidateId)).size, 3);
  assert.equal(draft.choices[0].candidateId, "EVOLUTION:DELTA:RECONSTRUCTION_FIELD");
  assert.equal(draft.choices[0].candidateType, "EVOLUTION");
  assert.equal(draft.choices[0].familyId, "DELTA");
});

test("CR-2 Evolution candidate disappears without a Core or after one-time application", () => {
  const withoutCore = evolutionReadyState(["DELTA"], 0);
  assert.equal(enumerateCR2DraftCandidates(12, withoutCore).some(item => item.candidateType === "EVOLUTION"), false);

  const ready = evolutionReadyState(["DELTA"], 1);
  const draft = buildCR2Draft(SEED, 12, ready);
  const evolved = applyCR2DraftCandidate(ready, draft.choices[0]);
  assert.equal(evolved.evolutionCores, 0);
  assert.equal(evolved.weapons.DELTA?.evolved, true);
  assert.equal(enumerateCR2DraftCandidates(13, evolved).some(item => item.candidateType === "EVOLUTION"), false);
});

test("CR-2 multiple eligible Evolutions select deterministically and never evolve more than chosen family", () => {
  const state = evolutionReadyState(["DELTA", "VECTOR", "ORBIT"], 2);
  const a = buildCR2Draft(SEED, 15, state);
  const b = buildCR2Draft(SEED, 15, state);
  assert.deepEqual(a, b);
  assert.equal(a.choices[0].candidateType, "EVOLUTION");
  const selected = a.choices[0].familyId as V23WeaponFamily;
  const next = applyCR2DraftCandidate(state, a.choices[0]);
  assert.equal(next.weapons[selected]?.evolved, true);
  assert.equal(next.evolutionCores, 1);
  for (const family of ["DELTA", "VECTOR", "ORBIT"] as const) {
    if (family !== selected) assert.equal(next.weapons[family]?.evolved, false, family);
  }
});

test("CR-2 REFRACT consumes one reroll, stays deterministic, and retains Evolution priority", () => {
  const state = evolutionReadyState(["DELTA", "VECTOR"], 2);
  const before = buildCR2Draft(SEED, 16, state);
  const rerolled = useCR2Refract(SEED, 16, state);
  assert.equal(rerolled.state.refracts, 0);
  assert.equal(rerolled.state.rerollNonce, 1);
  assert.equal(rerolled.draft.choices[0].candidateType, "EVOLUTION");
  assert.notDeepEqual(rerolled.draft.choices.map(item => item.candidateId), before.choices.map(item => item.candidateId));
  assert.deepEqual(useCR2Refract(SEED, 16, state), rerolled);
  assert.throws(() => useCR2Refract(SEED, 16, rerolled.state), /No REFRACT/u);
});

test("CR-2 non-Evolution candidates still apply through the normalized inherited state transition", () => {
  const state = createV23InitialBuildState({ hp: 50, pickupRadius: 76 });
  const draft = buildCR2Draft(SEED, 2, state);
  const orbit = choice(draft, "WEAPON_ACQUIRE:ORBIT");
  assert.deepEqual(applyCR2DraftCandidate(state, orbit), applyV23ACandidate(state, orbit));
});
