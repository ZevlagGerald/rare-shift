import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const sourcePath = resolve("scripts/local/cr3e2-stage2-activation-v3.mjs");
const runnerPath = resolve("scripts/local/.cr3e2-stage2-activation-v3-draft-guard.runner.mjs");
let source = await readFile(sourcePath, "utf8");

const marker = "const stage2Start = source.indexOf(";
const insertAt = source.indexOf(marker);
assert.ok(insertAt >= 0, "Stage-II V3 insertion marker not found");
assert.equal(source.indexOf(marker, insertAt + marker.length), -1, "Stage-II V3 insertion marker is not unique");

const injection = `source = replaceExactOnce(\n  source,\n  \"          if (!moved) break;\\n          state = moved;\\n\\n          if (huntTick % 6 === 0 && state.gatePhase === \\\"ELITE_ACTIVE\\\") {\",\n  \"          if (!moved) break;\\n          state = moved;\\n\\n          if (state.draftOpen) {\\n            await chooseDraft(page, canvas, state, trial);\\n            continue;\\n          }\\n\\n          if (huntTick % 6 === 0 && state.gatePhase === \\\"ELITE_ACTIVE\\\") {\",\n  \"ELITE_I post-move draft guard\",\n);\n\n`;

source = source.slice(0, insertAt) + injection + source.slice(insertAt);
await writeFile(runnerPath, source, "utf8");
console.log("CR3E2_STAGE2_V3_ELITE_DRAFT_GUARD=PASS");
console.log("CR3E2_STAGE2_V3_ELITE_DRAFT_GUARD_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(`${pathToFileURL(runnerPath).href}?v=${Date.now()}`);
} finally {
  await unlink(runnerPath).catch(() => {});
}
