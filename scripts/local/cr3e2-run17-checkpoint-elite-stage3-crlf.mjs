import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = resolve("scripts/local/cr3e2-run17-checkpoint-elite-stage3.mjs");
const generatedPath = resolve("scripts/local/.cr3e2-run17-checkpoint-elite-stage3-crlf.wrapper.mjs");
let source = (await readFile(sourcePath, "utf8")).replace(/\r\n/g, "\n");

const needle = 'let source = await readFile(sourcePath, "utf8");';
const replacement = 'let source = (await readFile(sourcePath, "utf8")).replace(/\\r\\n/g, "\\n");';
const first = source.indexOf(needle);
assert.ok(first >= 0, "Stage-III wrapper source-read anchor not found");
assert.equal(source.indexOf(needle, first + needle.length), -1, "Stage-III wrapper source-read anchor is not unique");
source = source.slice(0, first) + replacement + source.slice(first + needle.length);

await writeFile(generatedPath, source, "utf8");
execFileSync(process.execPath, ["--check", generatedPath], { stdio: "inherit" });
console.log("CR3E2_RUN17_STAGE3_CRLF_LAUNCHER=PASS");
console.log("CR3E2_RUN17_STAGE3_CRLF_POLICY=LINE_ENDING_NORMALIZATION_ONLY");
console.log("CR3E2_RUN17_STAGE3_CRLF_STAGE3_SEMANTICS=UNCHANGED");
console.log("CR3E2_RUN17_STAGE3_CRLF_SCOPE=LOCAL_DRIVER_ONLY");

try {
  await import(`${pathToFileURL(generatedPath).href}?v=${Date.now()}`);
} finally {
  await unlink(generatedPath).catch(() => {});
}
