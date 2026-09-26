import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createPublicClient, http } from "viem";
import { readGenerationEligibility } from "@rarefriends/friendsdk/identity";
import {
  createGenerationSpriteReader,
  decodeSpriteBitmap,
  GENERATION_FAMILY_NAMES,
  GENERATION_SPRITE_MANIFEST,
} from "@rarefriends/friendsdk/sprites";
import { measurePair, selectFramePair } from "../games/rare-shift/src/phase-core.ts";

const CANONICAL_IDS = [3112n, 13655n, 13699n, 14193n, 14223n, 14412n, 14584n, 289218n, 334511n];
const DEFAULT_OUTPUT = resolve("artifacts/t5-alternate-pair-census.json");

const BASELINE_FREE_PAIRS = Object.freeze({
  "3112": { frameA: 41, frameB: 42, sourceGroup: 5 },
  "13655": { frameA: 33, frameB: 34, sourceGroup: 4 },
  "13699": { frameA: 33, frameB: 34, sourceGroup: 4 },
  "14193": { frameA: 4, frameB: 6, sourceGroup: 0 },
  "14223": { frameA: 48, frameB: 51, sourceGroup: 6 },
  "14412": { frameA: 8, frameB: 11, sourceGroup: 1 },
  "14584": { frameA: 34, frameB: 37, sourceGroup: 4 },
  "289218": { frameA: 33, frameB: 34, sourceGroup: 4 },
  "334511": { frameA: 33, frameB: 34, sourceGroup: 4 },
});

function parseArgs(argv) {
  let ids = CANONICAL_IDS;
  let out = DEFAULT_OUTPUT;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--ids") {
      const value = argv[++i];
      if (!value) throw new Error("--ids requires a comma-separated value.");
      ids = value.split(",").map(item => {
        const trimmed = item.trim();
        if (!/^[1-9][0-9]*$/.test(trimmed)) throw new Error(`Invalid token ID: ${trimmed}`);
        return BigInt(trimmed);
      });
    } else if (argv[i] === "--out") {
      const value = argv[++i];
      if (!value) throw new Error("--out requires a path.");
      out = resolve(value);
    } else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return { ids: [...new Set(ids.map(id => id.toString()))].map(BigInt), out };
}

function pairQualifies(metrics) {
  return metrics.occupiedA >= 8 &&
    metrics.occupiedB >= 8 &&
    metrics.common >= 4 &&
    metrics.aOnly >= 2 &&
    metrics.bOnly >= 2 &&
    metrics.difference >= 5;
}

function compareCandidates(left, right) {
  if (left.metrics.score !== right.metrics.score) return right.metrics.score - left.metrics.score;
  if (left.a.index !== right.a.index) return left.a.index - right.a.index;
  return left.b.index - right.b.index;
}

function enumerateSameClipPairs(frames) {
  const result = [];
  for (let group = 0; group < 8; group++) {
    const start = group * 8;
    for (let i = start; i < start + 8; i++) {
      for (let j = i + 1; j < start + 8; j++) {
        const metrics = measurePair(frames[i].rows, frames[j].rows);
        if (!pairQualifies(metrics)) continue;
        result.push({ a: frames[i], b: frames[j], metrics, sourceGroup: group });
      }
    }
  }
  return result.sort(compareCandidates);
}

function compactPair(pair) {
  return {
    frameA: pair.a.index,
    frameB: pair.b.index,
    sourceGroup: pair.sourceGroup,
    metrics: pair.metrics,
  };
}

function samePair(left, right) {
  return left.a.index === right.a.index &&
    left.b.index === right.b.index &&
    left.sourceGroup === right.sourceGroup;
}

function analyzeSprites(tokenId, sprites) {
  const frames = sprites.frames.map((bitmap, index) => ({
    index,
    bitmap,
    rows: decodeSpriteBitmap(bitmap).rows,
  }));

  const run = () => {
    const primary = selectFramePair(frames);
    const ranked = enumerateSameClipPairs(frames);
    const alternates = ranked.filter(pair => !samePair(pair, primary));
    const primaryRank = ranked.findIndex(pair => samePair(pair, primary));
    const alternateGroups = [...new Set(alternates.map(pair => pair.sourceGroup))].sort((a, b) => a - b);
    const diverseGroups = alternateGroups.filter(group => group !== primary.sourceGroup);
    return {
      primary,
      primaryRank,
      rankedCount: ranked.length,
      alternates,
      alternateGroups,
      diverseGroups,
    };
  };

  const first = run();
  const second = run();
  const deterministic = JSON.stringify({
    primary: compactPair(first.primary),
    ranked: first.alternates.map(compactPair),
  }) === JSON.stringify({
    primary: compactPair(second.primary),
    ranked: second.alternates.map(compactPair),
  });

  const expected = BASELINE_FREE_PAIRS[tokenId.toString()] ?? null;
  const freePairStable = expected !== null &&
    first.primary.a.index === expected.frameA &&
    first.primary.b.index === expected.frameB &&
    first.primary.sourceGroup === expected.sourceGroup;

  const primaryIsTopRankedSameClip = first.primaryRank === 0;
  const alternateCount = first.alternates.length;
  const hasAlternate = alternateCount >= 1;
  const preferredThreeAlternates = alternateCount >= 3;

  return {
    accepted: deterministic && freePairStable && primaryIsTopRankedSameClip && hasAlternate,
    deterministic,
    freePairStable,
    primaryIsTopRankedSameClip,
    primary: compactPair(first.primary),
    qualifyingSameClipPairs: first.rankedCount,
    alternateCount,
    preferredThreeAlternates,
    alternateSourceGroups: first.alternateGroups,
    distinctAlternateSourceGroupCount: first.alternateGroups.length,
    differentFromPrimaryGroupCount: first.diverseGroups.length,
    topAlternates: first.alternates.slice(0, 12).map(compactPair),
  };
}

async function inspect(client, reader, tokenId) {
  const base = { tokenId: tokenId.toString() };
  try {
    const eligibility = await readGenerationEligibility(client, tokenId);
    if (!eligibility.hardwired) return { ...base, status: "INELIGIBLE_GENERATION", generation: eligibility.generation };
    const sprites = await reader.read(tokenId);
    const analysis = analyzeSprites(tokenId, sprites);
    return {
      ...base,
      status: analysis.accepted ? "QUALIFIED" : "T5_CENSUS_REJECT",
      generation: eligibility.generation,
      familyId: sprites.familyId,
      familyName: sprites.familyName,
      seed: sprites.seed,
      ...analysis,
    };
  } catch (cause) {
    return { ...base, status: "READ_ERROR", error: cause instanceof Error ? cause.message : "Unknown read failure." };
  }
}

const args = parseArgs(process.argv.slice(2));
const rpcUrl = process.env.RARE_SHIFT_RPC_URL || GENERATION_SPRITE_MANIFEST.rpcUrl;
const client = createPublicClient({ transport: http(rpcUrl, { retryCount: 2, timeout: 15_000 }) });
const chainId = await client.getChainId();
if (chainId !== GENERATION_SPRITE_MANIFEST.chainId) {
  throw new Error(`STOP: expected chain ${GENERATION_SPRITE_MANIFEST.chainId}; got ${chainId}.`);
}
const reader = createGenerationSpriteReader(client, GENERATION_SPRITE_MANIFEST);
const rows = [];

for (const tokenId of args.ids) {
  const row = await inspect(client, reader, tokenId);
  rows.push(row);
  console.log(`Friend #${tokenId}: ${row.status}${row.familyName ? ` / ${row.familyName}` : ""}${Number.isInteger(row.alternateCount) ? ` / alternates=${row.alternateCount}` : ""}`);
}

const qualified = rows.filter(row => row.status === "QUALIFIED");
const familySet = new Set(qualified.map(row => row.familyName));
const familiesQualified = GENERATION_FAMILY_NAMES.filter(name => familySet.has(name));
const familiesMissing = GENERATION_FAMILY_NAMES.filter(name => !familySet.has(name));
const minAlternateCount = qualified.length ? Math.min(...qualified.map(row => row.alternateCount)) : 0;
const minDistinctAlternateSourceGroups = qualified.length ? Math.min(...qualified.map(row => row.distinctAlternateSourceGroupCount)) : 0;

const hardGate = rows.length === 9 &&
  qualified.length === 9 &&
  familiesMissing.length === 0 &&
  qualified.every(row => row.deterministic && row.freePairStable && row.primaryIsTopRankedSameClip && row.alternateCount >= 1);

const report = {
  schema: "rare-shift-t5-alternate-pair-census-v1",
  friendSdkVersion: "0.1.2",
  chainId,
  readOnly: true,
  ownerAddressesRecorded: false,
  sampleCount: rows.length,
  thresholds: {
    occupiedA: 8,
    occupiedB: 8,
    common: 4,
    aOnly: 2,
    bOnly: 2,
    difference: 5,
  },
  summary: {
    qualified: qualified.length,
    familiesQualified,
    familiesMissing,
    allNineFamiliesQualified: familiesMissing.length === 0,
    deterministic: qualified.every(row => row.deterministic),
    freePairStable: qualified.every(row => row.freePairStable),
    allHaveAlternate: qualified.every(row => row.alternateCount >= 1),
    allMeetPreferredThreeAlternates: qualified.every(row => row.alternateCount >= 3),
    minAlternateCount,
    minDistinctAlternateSourceGroups,
    readyForT5EconomyImplementationReview: hardGate,
  },
  rows,
};

await mkdir(dirname(args.out), { recursive: true });
const json = `${JSON.stringify(report, null, 2)}\n`;
await writeFile(args.out, json, "utf8");
const sha = createHash("sha256").update(json).digest("hex");

console.log(`T5_CENSUS_OUTPUT=${args.out}`);
console.log(`T5_CENSUS_SHA256=${sha}`);
console.log(`T5_FAMILIES_QUALIFIED=${familiesQualified.length}/9`);
console.log(`T5_MIN_ALTERNATES=${minAlternateCount}`);
console.log(`T5_MIN_DISTINCT_ALT_GROUPS=${minDistinctAlternateSourceGroups}`);
console.log(`T5_PREFERRED_THREE=${report.summary.allMeetPreferredThreeAlternates ? "PASS" : "OPEN"}`);
console.log(`T5_ECONOMY_GATE=${hardGate ? "PASS" : "OPEN"}`);

if (rows.some(row => row.status === "READ_ERROR")) process.exitCode = 1;
