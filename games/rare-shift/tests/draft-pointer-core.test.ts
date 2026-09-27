import assert from "node:assert/strict";
import test from "node:test";
import {
  draftCardCenters,
  draftIndexAtVirtualPoint,
  V21_DRAFT_CARD_Y_MAX,
  V21_DRAFT_CARD_Y_MIN,
} from "../src/draft-pointer-core.ts";

test("draft pointer centers exactly match rendered 1 2 and 3 card layouts", () => {
  assert.deepEqual(draftCardCenters(1), [480]);
  assert.deepEqual(draftCardCenters(2), [350, 610]);
  assert.deepEqual(draftCardCenters(3), [220, 480, 740]);
});

test("one-card centered click maps to choice index zero", () => {
  assert.equal(draftIndexAtVirtualPoint(1, 480, 320), 0);
  assert.notEqual(draftIndexAtVirtualPoint(1, 480, 320), 1);
});

test("two-card clicks map to their rendered left and right indices", () => {
  assert.equal(draftIndexAtVirtualPoint(2, 350, 320), 0);
  assert.equal(draftIndexAtVirtualPoint(2, 610, 320), 1);
  assert.equal(draftIndexAtVirtualPoint(2, 480, 320), null, "gap between two cards must not select either choice");
});

test("three-card clicks preserve existing left center right mapping", () => {
  assert.equal(draftIndexAtVirtualPoint(3, 220, 320), 0);
  assert.equal(draftIndexAtVirtualPoint(3, 480, 320), 1);
  assert.equal(draftIndexAtVirtualPoint(3, 740, 320), 2);
});

test("pointer mapping rejects outside-card and invalid-cardinality input", () => {
  assert.equal(draftIndexAtVirtualPoint(1, 480, V21_DRAFT_CARD_Y_MIN - 1), null);
  assert.equal(draftIndexAtVirtualPoint(1, 480, V21_DRAFT_CARD_Y_MAX + 1), null);
  assert.equal(draftIndexAtVirtualPoint(0, 480, 320), null);
  assert.equal(draftIndexAtVirtualPoint(4, 480, 320), null);
  assert.equal(draftIndexAtVirtualPoint(Number.NaN, 480, 320), null);
});
