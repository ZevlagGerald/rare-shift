import assert from "node:assert/strict";
import test from "node:test";
import {
  draftCardCenters,
  draftIndexForPoint,
  DRAFT_CARD_MAX_Y,
  DRAFT_CARD_MIN_Y,
} from "../src/draft-pointer-core.ts";

test("one-card draft center maps to index zero", () => {
  assert.deepEqual(draftCardCenters(1), [480]);
  assert.equal(draftIndexForPoint(480, 320, 1), 0);
  assert.equal(draftIndexForPoint(220, 320, 1), null);
  assert.equal(draftIndexForPoint(740, 320, 1), null);
});

test("two-card draft centers map to indices zero and one", () => {
  assert.deepEqual(draftCardCenters(2), [350, 610]);
  assert.equal(draftIndexForPoint(350, 320, 2), 0);
  assert.equal(draftIndexForPoint(610, 320, 2), 1);
  assert.equal(draftIndexForPoint(480, 320, 2), null);
});

test("three-card draft centers preserve indices zero one two", () => {
  assert.deepEqual(draftCardCenters(3), [220, 480, 740]);
  assert.equal(draftIndexForPoint(220, 320, 3), 0);
  assert.equal(draftIndexForPoint(480, 320, 3), 1);
  assert.equal(draftIndexForPoint(740, 320, 3), 2);
});

test("pointer mapping rejects clicks outside card vertical bounds", () => {
  assert.equal(draftIndexForPoint(480, DRAFT_CARD_MIN_Y - 1, 1), null);
  assert.equal(draftIndexForPoint(480, DRAFT_CARD_MAX_Y + 1, 1), null);
});

test("pointer mapping rejects invalid draft counts and non-finite coordinates", () => {
  assert.equal(draftIndexForPoint(480, 320, 0), null);
  assert.equal(draftIndexForPoint(480, 320, 4), null);
  assert.equal(draftIndexForPoint(Number.NaN, 320, 1), null);
  assert.equal(draftIndexForPoint(480, Number.POSITIVE_INFINITY, 1), null);
});
