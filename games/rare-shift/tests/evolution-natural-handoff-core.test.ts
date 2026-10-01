import assert from "node:assert/strict";
import test from "node:test";
import { naturalEvolutionDraftViewChoice } from "../src/evolution-natural-handoff.ts";
import type { V23DraftCandidate } from "../src/progression-core.ts";

const evolution: V23DraftCandidate = Object.freeze({
  candidateId: "EVOLUTION:SIGNAL:CHAIN_RESONANCE",
  candidateType: "EVOLUTION",
  familyId: "SIGNAL",
  fromRank: 5,
  toRank: 5,
  priorityClass: 1,
  name: "CHAIN RESONANCE",
  description: "SIGNAL Rank V + RESONANCE_COIL + 1 Evolution Core → CHAIN RESONANCE.",
});

test("natural Evolution draft view preserves exact CR-2 candidate identity and Rank-V boundary", () => {
  const view = naturalEvolutionDraftViewChoice(evolution);
  assert.equal(view.id, evolution.candidateId);
  assert.equal(view.candidateId, evolution.candidateId);
  assert.equal(view.candidateType, "EVOLUTION");
  assert.equal(view.familyId, "SIGNAL");
  assert.equal(view.fromRank, 5);
  assert.equal(view.toRank, 5);
  assert.equal(view.name, "CHAIN RESONANCE");
  assert.equal(view.disabled, false);
  assert.equal(view.category, "WEAPON");
});
