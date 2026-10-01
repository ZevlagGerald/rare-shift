import assert from "node:assert/strict";
import test from "node:test";
import { syncHaloRuntimeRole } from "../src/evolution-phaser-runtime.ts";

test("production SYNC HALO role mapping preserves boss, elite, COMMON and normal resistance classes", () => {
  assert.equal(syncHaloRuntimeRole({ kind: "ANCHOR", elite: true, checkpointId: null }), "BOSS");
  assert.equal(syncHaloRuntimeRole({ kind: "ANCHOR", elite: true, checkpointId: "ELITE_I" }), "ELITE");
  assert.equal(syncHaloRuntimeRole({ kind: "TRACE", elite: false, checkpointId: null }), "COMMON");
  assert.equal(syncHaloRuntimeRole({ kind: "BEACON", elite: false, checkpointId: null }), "COMMON");
  assert.equal(syncHaloRuntimeRole({ kind: "SPLIT_A", elite: false, checkpointId: null }), "NORMAL");
  assert.equal(syncHaloRuntimeRole({ kind: "SPLIT_B", elite: false, checkpointId: null }), "NORMAL");
});
