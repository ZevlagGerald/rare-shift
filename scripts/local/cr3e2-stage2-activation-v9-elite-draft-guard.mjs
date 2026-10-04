import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const sourcePath = resolve("scripts/local/cr3e2-stage2-activation-v8-complete-tick-safe.mjs");
const wrapperPath = resolve("scripts/local/.cr3e2-stage2-activation-v9-elite-draft-guard.wrapper.mjs");
let source = await readFile(sourcePath, "utf8");

const marker = 'source = source.replaceAll("CR3E2_STAGE2_V4_", "CR3E2_STAGE2_V8_");';
const insertAt = source.indexOf(marker);
assert.ok(insertAt >= 0, "V8 marker for ELITE_I guard insertion not found");
assert.equal(source.indexOf(marker, insertAt + marker.length), -1, "V8 marker for ELITE_I guard insertion is not unique");

const injection = [
  'const eliteGuardMarker = "const recordNeedle =";',
  'const eliteGuardInsertAt = source.indexOf(eliteGuardMarker);',
  'assert.ok(eliteGuardInsertAt >= 0, "V4 record marker for ELITE_I guard not found");',
  'assert.equal(source.indexOf(eliteGuardMarker, eliteGuardInsertAt + eliteGuardMarker.length), -1, "V4 record marker for ELITE_I guard is not unique");',
  '',
  'const eliteGuardInjection = [',
  '  "source = replaceRegexOnce(",',
  '  "  source,",',
  '  "  /          if \\\\(!moved\\\\) break;\\\\r?\\\\n          state = moved;\\\\r?\\\\n\\\\r?\\\\n          \\\\/\\\\/ Preserve the qualified CR-3E\\\\.1 rhythm, but acknowledge every input\\\\./,",',
  '  "  \\\"          if (!moved) break;\\\\n          state = moved;\\\\n\\\\n          if (state.draftOpen) {\\\\n            await chooseDraft(page, canvas, state, trial);\\\\n            continue;\\\\n          }\\\\n\\\\n          // Preserve the qualified CR-3E.1 rhythm, but acknowledge every input.\\\",",',
  '  "  \\\"ELITE_I post-move draft guard\\\",",',
  '  ");",',
  '  "",',
  '].join("\\\\n");',
  '',
  'source = source.slice(0, eliteGuardInsertAt) + eliteGuardInjection + source.slice(eliteGuardInsertAt);',
  'console.log("CR3E2_STAGE2_V9_ELITE_POST_MOVE_DRAFT_GUARD=PASS");',
  '',
].join("\n");

source = source.slice(0, insertAt) + injection + source.slice(insertAt);
source = source.replaceAll("CR3E2_STAGE2_V8_", "CR3E2_STAGE2_V9_");
source = source.replaceAll("v8-complete-tick-safe", "v9-elite-draft-guard");

await writeFile(wrapperPath, source, "utf8");
console.log("CR3E2_STAGE2_V9_WRAPPER=PASS");
console.log("CR3E2_STAGE2_V9_CHANGE=ELITE_I_POST_MOVE_DRAFT_GUARD_ONLY");
console.log("CR3E2_STAGE2_V9_STAGE2_POLICY=V8_UNCHANGED");
console.log("CR3E2_STAGE2_V9_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(`${pathToFileURL(wrapperPath).href}?v=${Date.now()}`);
} finally {
  await unlink(wrapperPath).catch(() => {});
}
