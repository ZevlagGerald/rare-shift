import assert from "node:assert/strict";
import test from "node:test";
import {
  syncHaloRuntimeRearmAnchor,
  syncHaloRuntimeRole,
} from "../src/evolution-phaser-runtime.ts";

test("production SYNC HALO role mapping preserves boss, elite, COMMON and normal resistance classes", () => {
  assert.equal(syncHaloRuntimeRole({ kind: "ANCHOR", elite: true, checkpointId: null }), "BOSS");
  assert.equal(syncHaloRuntimeRole({ kind: "ANCHOR", elite: true, checkpointId: "ELITE_I" }), "ELITE");
  assert.equal(syncHaloRuntimeRole({ kind: "TRACE", elite: false, checkpointId: null }), "COMMON");
  assert.equal(syncHaloRuntimeRole({ kind: "BEACON", elite: false, checkpointId: null }), "COMMON");
  assert.equal(syncHaloRuntimeRole({ kind: "SPLIT_A", elite: false, checkpointId: null }), "NORMAL");
  assert.equal(syncHaloRuntimeRole({ kind: "SPLIT_B", elite: false, checkpointId: null }), "NORMAL");
});

test("production SYNC HALO preserves inherited PHASE SHEAR rearm until its own control history exists", () => {
  assert.equal(syncHaloRuntimeRearmAnchor(null, null), null);
  assert.equal(syncHaloRuntimeRearmAnchor(null, 1_000), 1_000, "Evolution must inherit an existing PHASE SHEAR rearm timestamp");
  assert.equal(syncHaloRuntimeRearmAnchor(1_400, 1_000), 1_400, "after the first evolved control, its own later timestamp becomes authoritative");
});
