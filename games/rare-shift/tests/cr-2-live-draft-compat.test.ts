import assert from "node:assert/strict";
import test from "node:test";
import { buildCR2Draft, applyCR2DraftCandidate } from "../src/cr2-draft-core.ts";
import { cr2DraftCategory, cr2LegacyCompatibleDraftId } from "../src/cr2-live-draft-compat.ts";
import { createV23InitialBuildState, type V23BuildState } from "../src/progression-core.ts";

const SEED = 13699;

function ids(level: number, state: V23BuildState): readonly string[] {
  return buildCR2Draft(SEED, level, state).choices.map(cr2LegacyCompatibleDraftId);
}

function choose(level: number, state: V23BuildState, id: string): V23BuildState {
  const draft = buildCR2Draft(SEED, level, state);
  const index = draft.choices.findIndex(candidate => cr2LegacyCompatibleDraftId(candidate) === id);
  assert.ok(index >= 0, `expected ${id} at level ${level}: ${draft.choices.map(cr2LegacyCompatibleDraftId).join(",")}`);
  return applyCR2DraftCandidate(state, draft.choices[index]);
}

test("CR-2B preserves exact legacy Level 2 onboarding draft ids", () => {
  const state = createV23InitialBuildState({ hp: 70, pickupRadius: 76 });
  assert.deepEqual(new Set(ids(2, state)), new Set(["ORBIT_NODES", "VECTOR_NEEDLE", "DELTA_RANK"]));
});

test("CR-2B legacy ids remain attached to the same normalized state transitions", () => {
  let state = createV23InitialBuildState({ hp: 70, pickupRadius: 76 });
  state = choose(2, state, "ORBIT_NODES");
  assert.equal(state.weapons.ORBIT?.rank, 1);
  state = choose(3, state, "ECHO_MINE");
  assert.equal(state.weapons.ECHO?.rank, 1);
  state = choose(4, state, "SIGNAL_ARC");
  assert.equal(state.weapons.SIGNAL?.rank, 1);
  assert.equal(Object.keys(state.weapons).length, 4);
});

test("CR-2B Protocol and Evolution cards remain explicitly new categories", () => {
  let state = createV23InitialBuildState({ hp: 70, pickupRadius: 76 });
  state = choose(2, state, "ORBIT_NODES");
  state = choose(3, state, "ECHO_MINE");
  state = choose(4, state, "SIGNAL_ARC");
  const draft = buildCR2Draft(SEED, 5, state);
  for (const candidate of draft.choices) {
    const category = cr2DraftCategory(candidate);
    assert.ok(["WEAPON", "UTILITY", "PROTOCOL", "EVOLUTION"].includes(category));
    if (category === "PROTOCOL") assert.match(cr2LegacyCompatibleDraftId(candidate), /^PROTOCOL_/u);
  }
});

test("CR-2B deterministic production route still exposes SIGNAL Rank II by level 10", () => {
  let state = createV23InitialBuildState({ hp: 35, pickupRadius: 76 });
  state = choose(2, state, "ORBIT_NODES");
  state = choose(3, state, "ECHO_MINE");
  state = choose(4, state, "SIGNAL_ARC");

  let found = false;
  for (let level = 5; level <= 10; level += 1) {
    const draft = buildCR2Draft(SEED, level, state);
    const mapped = draft.choices.map(cr2LegacyCompatibleDraftId);
    const target = mapped.indexOf("SIGNAL_RANK");
    if (target >= 0) {
      state = applyCR2DraftCandidate(state, draft.choices[target]);
      found = true;
      break;
    }
    let fallback = mapped.indexOf("FIELD_REPAIR");
    if (fallback < 0) fallback = mapped.indexOf("ORBIT_RANK");
    if (fallback < 0) fallback = mapped.indexOf("DELTA_RANK");
    if (fallback < 0) fallback = mapped.indexOf("SIGNAL_MAGNET");
    if (fallback < 0) fallback = 0;
    state = applyCR2DraftCandidate(state, draft.choices[fallback]);
  }
  assert.equal(found, true);
  assert.equal(state.weapons.SIGNAL?.rank, 2);
});
