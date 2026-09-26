import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createPublicClient, http } from "viem";
import { readGenerationEligibility } from "@rarefriends/friendsdk/identity";
import {
  createGenerationSpriteReader,
  decodeSpriteBitmap,
  GENERATION_FAMILY_NAMES,
  GENERATION_SPRITE_MANIFEST,
} from "@rarefriends/friendsdk/sprites";
import { buildProofChamber, selectFramePair } from "../games/rare-shift/src/phase-core.ts";
import { solveProofChamber } from "../games/rare-shift/src/solver.ts";

const MAX_IDS = 64;
const DEFAULT_OUTPUT = resolve("artifacts/t0-5-real-friend-corpus.json");

function usage(message) {
  if (message) console.error(message);
  console.error("Usage: npm run corpus:t0-5 -- --ids 123,456[,789] [--out path]");
  console.error("   or: npm run corpus:t0-5 -- --ids-file private/corpus-ids.txt [--out path]");
  process.exit(2);
}

function parseArgs(argv) {
  const result = { ids: null, idsFile: null, out: DEFAULT_OUTPUT };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--ids") result.ids = argv[++i] ?? usage("--ids requires a value.");
    else if (arg === "--ids-file") result.idsFile = argv[++i] ?? usage("--ids-file requires a path.");
    else if (arg === "--out") result.out = resolve(argv[++i] ?? usage("--out requires a path."));
    else usage(`Unknown argument: ${arg}`);
  }
  if ((result.ids === null) === (result.idsFile === null)) usage("Provide exactly one of --ids or --ids-file.");
  return result;
}

function parseTokenIds(text) {
  const pieces = text.split(/[\s,]+/).map(value => value.trim()).filter(Boolean);
  if (pieces.length === 0) usage("No token IDs were supplied.");
  if (pieces.length > MAX_IDS) usage(`T0.5 is bounded to at most ${MAX_IDS} explicit token IDs per run.`);
  const ids = pieces.map(value => {
    if (!/^[1-9][0-9]*$/.test(value)) usage(`Invalid positive integer token ID: ${value}`);
    return BigInt(value);
  });
  const unique = [...new Set(ids.map(id => id.toString()))].map(value => BigInt(value));
  if (unique.length !== ids.length) usage("Duplicate token IDs are not allowed.");
  return unique.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
}

function deterministicSnapshot(pair, chamber, solved) {
  return {
    pair: {
      a: pair.a.index,
      b: pair.b.index,
      sourceGroup: pair.sourceGroup,
      metrics: pair.metrics,
    },
    chamber: {
      fingerprint: chamber.fingerprint,
      gateA: chamber.gateA,
      gateB: chamber.gateB,
      gateASourcePixel: chamber.gateASourcePixel,
      gateBSourcePixel: chamber.gateBSourcePixel,
      tiles: chamber.tiles,
    },
    solved: {
      solvable: solved.solvable,
      reachableWithoutShiftFromStartPhase: solved.reachableWithoutShiftFromStartPhase,
      minShifts: solved.minShifts,
      path: solved.path,
    },
  };
}

function analyzeFrames(sprites) {
  const frames = sprites.frames.map((bitmap, index) => ({
    index,
    bitmap,
    rows: decodeSpriteBitmap(bitmap).rows,
  }));
  const run = () => {
    const pair = selectFramePair(frames);
    const chamber = buildProofChamber(pair);
    const solved = solveProofChamber(chamber);
    return { pair, chamber, solved };
  };
  const first = run();
  const second = run();
  const deterministic = JSON.stringify(deterministicSnapshot(first.pair, first.chamber, first.solved)) ===
    JSON.stringify(deterministicSnapshot(second.pair, second.chamber, second.solved));
  const accepted = deterministic && first.solved.solvable &&
    !first.solved.reachableWithoutShiftFromStartPhase && first.solved.minShifts === 2;
  return {
    deterministic,
    accepted,
    pair: {
      frameA: first.pair.a.index,
      frameB: first.pair.b.index,
      sourceGroup: first.pair.sourceGroup,
      selectionMode: first.pair.sourceGroup >= 0 ? "same-clip" : "cross-clip-fallback",
      metrics: first.pair.metrics,
    },
    chamber: {
      fingerprint: first.chamber.fingerprint,
      gateASourcePixel: first.chamber.gateASourcePixel,
      gateBSourcePixel: first.chamber.gateBSourcePixel,
    },
    solver: {
      solvable: first.solved.solvable,
      reachableWithoutShiftFromStartPhase: first.solved.reachableWithoutShiftFromStartPhase,
      minShifts: first.solved.minShifts,
    },
  };
}

async function inspectToken(client, spriteReader, tokenId) {
  const base = { tokenId: tokenId.toString() };
  try {
    const eligibility = await readGenerationEligibility(client, tokenId);
    if (!eligibility.hardwired) {
      return { ...base, status: "INELIGIBLE_GENERATION", generation: eligibility.generation, observedBlock: eligibility.blockNumber.toString() };
    }
    const sprites = await spriteReader.read(tokenId);
    try {
      const analysis = analyzeFrames(sprites);
      return {
        ...base,
        status: analysis.accepted ? "QUALIFIED" : "SOLVER_REJECT",
        generation: eligibility.generation,
        observedBlock: eligibility.blockNumber.toString(),
        familyId: sprites.familyId,
        familyName: sprites.familyName,
        seed: sprites.seed,
        ...analysis,
      };
    } catch (cause) {
      return {
        ...base,
        status: "NO_QUALIFYING_PAIR",
        generation: eligibility.generation,
        observedBlock: eligibility.blockNumber.toString(),
        familyId: sprites.familyId,
        familyName: sprites.familyName,
        seed: sprites.seed,
        error: cause instanceof Error ? cause.message : "Pair analysis failed.",
      };
    }
  } catch (cause) {
    return { ...base, status: "READ_ERROR", error: cause instanceof Error ? cause.message : "On-chain read failed." };
  }
}

const args = parseArgs(process.argv.slice(2));
const sourceText = args.ids !== null ? args.ids : await readFile(resolve(args.idsFile), "utf8");
const tokenIds = parseTokenIds(sourceText);
const rpcUrl = process.env.RARE_SHIFT_RPC_URL || GENERATION_SPRITE_MANIFEST.rpcUrl;
const client = createPublicClient({ transport: http(rpcUrl, { retryCount: 2, timeout: 15_000 }) });
const chainId = await client.getChainId();
if (chainId !== GENERATION_SPRITE_MANIFEST.chainId) {
  throw new Error(`STOP: corpus reader requires chain ${GENERATION_SPRITE_MANIFEST.chainId}; RPC returned ${chainId}.`);
}
const spriteReader = createGenerationSpriteReader(client, GENERATION_SPRITE_MANIFEST);
const rows = [];
for (const tokenId of tokenIds) {
  const row = await inspectToken(client, spriteReader, tokenId);
  rows.push(row);
  console.log(`Friend #${tokenId}: ${row.status}${row.familyName ? ` / ${row.familyName}` : ""}`);
}

const qualified = rows.filter(row => row.status === "QUALIFIED");
const familySet = new Set(qualified.map(row => row.familyName));
const familiesQualified = GENERATION_FAMILY_NAMES.filter(name => familySet.has(name));
const familiesMissing = GENERATION_FAMILY_NAMES.filter(name => !familySet.has(name));
const sameClip = qualified.filter(row => row.pair?.selectionMode === "same-clip").length;
const crossClip = qualified.filter(row => row.pair?.selectionMode === "cross-clip-fallback").length;
const report = {
  schema: "rare-shift-t0.5-corpus-v1",
  friendSdkVersion: "0.1.2",
  chainId,
  contract: GENERATION_SPRITE_MANIFEST.generations,
  registry: GENERATION_SPRITE_MANIFEST.registry,
  readOnly: true,
  ownerAddressesRecorded: false,
  explicitTokenIdsOnly: true,
  sampleCount: rows.length,
  summary: {
    qualified: qualified.length,
    sameClip,
    crossClip,
    sameClipRate: qualified.length ? sameClip / qualified.length : null,
    crossClipRate: qualified.length ? crossClip / qualified.length : null,
    familiesQualified,
    familiesMissing,
    allNineFamiliesQualified: familiesMissing.length === 0,
    readyForT1CorpusGate: familiesMissing.length === 0 && rows.every(row => row.status === "QUALIFIED"),
  },
  rows,
};

await mkdir(dirname(args.out), { recursive: true });
const json = `${JSON.stringify(report, null, 2)}\n`;
await writeFile(args.out, json, "utf8");
const sha256 = createHash("sha256").update(json).digest("hex");
console.log(`CORPUS_OUTPUT=${args.out}`);
console.log(`CORPUS_SHA256=${sha256}`);
console.log(`FAMILIES_QUALIFIED=${familiesQualified.length}/9`);
console.log(`T0_5_CORPUS_GATE=${report.summary.readyForT1CorpusGate ? "PASS" : "OPEN"}`);
if (rows.some(row => row.status === "READ_ERROR")) process.exitCode = 1;
