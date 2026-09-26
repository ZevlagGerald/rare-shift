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
import { buildProofChamber, derivePhaseField, selectFramePair } from "../games/rare-shift/src/phase-core.ts";
import { buildTimingChamber } from "../games/rare-shift/src/timing-core.ts";
import { applySyncContact, buildSyncChamber, isSyncPassable } from "../games/rare-shift/src/sync-core.ts";
import { solveSyncChamber } from "../games/rare-shift/src/sync-solver.ts";

const CANONICAL_IDS = [3112n, 13655n, 13699n, 14193n, 14223n, 14412n, 14584n, 289218n, 334511n];
const DEFAULT_OUTPUT = resolve("artifacts/t3-canonical-nine.json");

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

function snapshot(pair, sync, solved) {
  return JSON.stringify({
    frames: [pair.a.index, pair.b.index],
    sourceGroup: pair.sourceGroup,
    fingerprint: sync.fingerprint,
    nodes: sync.nodes,
    sources: sync.nodeSourcePixels,
    required: sync.nodeRequiredPhases,
    solved: {
      solvable: solved.solvable,
      minShifts: solved.minShifts,
      reachableWithoutShiftFromStartPhase: solved.reachableWithoutShiftFromStartPhase,
      path: solved.path,
    },
  });
}

function analyzeSprites(sprites) {
  const frames = sprites.frames.map((bitmap, index) => ({ index, bitmap, rows: decodeSpriteBitmap(bitmap).rows }));
  const run = () => {
    const pair = selectFramePair(frames);
    const chamberOne = buildProofChamber(pair);
    const timing = buildTimingChamber(pair, chamberOne.fingerprint);
    const sync = buildSyncChamber(pair, timing.fingerprint);
    const solved = solveSyncChamber(sync);
    return { pair, chamberOne, timing, sync, solved };
  };

  const first = run(), second = run();
  const deterministic = snapshot(first.pair, first.sync, first.solved) === snapshot(second.pair, second.sync, second.solved);
  const field = derivePhaseField(first.pair.a.rows, first.pair.b.rows);
  const sourceClasses = first.sync.nodeSourcePixels.map(point => field[point.y][point.x]);
  const sourcesDistinct = first.sync.nodeSourcePixels[0].x !== first.sync.nodeSourcePixels[2].x ||
    first.sync.nodeSourcePixels[0].y !== first.sync.nodeSourcePixels[2].y;

  const [n1, n2, n3] = first.sync.nodes;
  const wrongPhaseN1 = applySyncContact(first.sync, n1.x, n1.y, "A", 0);
  const correctN1 = applySyncContact(first.sync, n1.x, n1.y, "B", 0);
  const futureN3 = applySyncContact(first.sync, n3.x, n3.y, "B", 0);
  const wrongPhaseN2 = applySyncContact(first.sync, n2.x, n2.y, "B", 1);
  const correctN2 = applySyncContact(first.sync, n2.x, n2.y, "A", 1);
  const correctN3 = applySyncContact(first.sync, n3.x, n3.y, "B", 2);
  const duplicateN1 = applySyncContact(first.sync, n1.x, n1.y, "B", 1);

  const authority = {
    node1WrongPhaseBlocked: wrongPhaseN1.nextNode === 0 && wrongPhaseN1.event === "PHASE_MISMATCH",
    node1CorrectPhaseAdvances: correctN1.nextNode === 1 && correctN1.event === "SYNCED",
    futureNodeBlocked: futureN3.nextNode === 0 && futureN3.event === "SIGNAL_NOT_ROUTED",
    node2WrongPhaseBlocked: wrongPhaseN2.nextNode === 1 && wrongPhaseN2.event === "PHASE_MISMATCH",
    node2CorrectPhaseAdvances: correctN2.nextNode === 2 && correctN2.event === "SYNCED",
    node3CorrectPhaseAdvances: correctN3.nextNode === 3 && correctN3.event === "SYNCED",
    duplicateDoesNotAdvance: duplicateN1.nextNode === 1 && duplicateN1.event === "ALREADY_SYNCED",
    exitLockedBeforeComplete: !isSyncPassable(first.sync, first.sync.exit.x, first.sync.exit.y, 2),
    exitOpenAfterComplete: isSyncPassable(first.sync, first.sync.exit.x, first.sync.exit.y, 3),
  };
  const authorityPass = Object.values(authority).every(Boolean);

  const accepted = deterministic &&
    sourceClasses[0] === "B_ONLY" &&
    sourceClasses[1] === "A_ONLY" &&
    sourceClasses[2] === "B_ONLY" &&
    sourcesDistinct &&
    authorityPass &&
    first.solved.solvable &&
    !first.solved.reachableWithoutShiftFromStartPhase &&
    first.solved.minShifts === 2;

  return {
    accepted,
    deterministic,
    pair: { frameA: first.pair.a.index, frameB: first.pair.b.index, sourceGroup: first.pair.sourceGroup },
    chamberOneFingerprint: first.chamberOne.fingerprint,
    timingFingerprint: first.timing.fingerprint,
    sync: {
      fingerprint: first.sync.fingerprint,
      nodes: first.sync.nodes,
      nodeSourcePixels: first.sync.nodeSourcePixels,
      sourceClasses,
      requiredPhases: first.sync.nodeRequiredPhases,
      sourcesDistinct,
      authority,
    },
    solver: {
      solvable: first.solved.solvable,
      minShifts: first.solved.minShifts,
      reachableWithoutShiftFromStartPhase: first.solved.reachableWithoutShiftFromStartPhase,
    },
  };
}

async function inspect(client, reader, tokenId) {
  const base = { tokenId: tokenId.toString() };
  try {
    const eligibility = await readGenerationEligibility(client, tokenId);
    if (!eligibility.hardwired) return { ...base, status: "INELIGIBLE_GENERATION", generation: eligibility.generation };
    const sprites = await reader.read(tokenId);
    const analysis = analyzeSprites(sprites);
    return {
      ...base,
      status: analysis.accepted ? "QUALIFIED" : "T3_REJECT",
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
if (chainId !== GENERATION_SPRITE_MANIFEST.chainId) throw new Error(`STOP: expected chain ${GENERATION_SPRITE_MANIFEST.chainId}; got ${chainId}.`);
const reader = createGenerationSpriteReader(client, GENERATION_SPRITE_MANIFEST);
const rows = [];

for (const tokenId of args.ids) {
  const row = await inspect(client, reader, tokenId);
  rows.push(row);
  console.log(`Friend #${tokenId}: ${row.status}${row.familyName ? ` / ${row.familyName}` : ""}`);
}

const qualified = rows.filter(row => row.status === "QUALIFIED");
const familySet = new Set(qualified.map(row => row.familyName));
const familiesQualified = GENERATION_FAMILY_NAMES.filter(name => familySet.has(name));
const familiesMissing = GENERATION_FAMILY_NAMES.filter(name => !familySet.has(name));
const report = {
  schema: "rare-shift-t3-corpus-v1",
  friendSdkVersion: "0.1.2",
  chainId,
  readOnly: true,
  ownerAddressesRecorded: false,
  sampleCount: rows.length,
  summary: {
    qualified: qualified.length,
    familiesQualified,
    familiesMissing,
    allNineFamiliesQualified: familiesMissing.length === 0,
    deterministic: qualified.every(row => row.deterministic),
    sourceAuthorityPass: qualified.every(row =>
      row.sync?.sourceClasses?.[0] === "B_ONLY" &&
      row.sync?.sourceClasses?.[1] === "A_ONLY" &&
      row.sync?.sourceClasses?.[2] === "B_ONLY" &&
      row.sync?.sourcesDistinct),
    sequenceAuthorityPass: qualified.every(row => row.sync?.authority && Object.values(row.sync.authority).every(Boolean)),
    solverPass: qualified.every(row => row.solver?.solvable && row.solver?.minShifts === 2 && !row.solver?.reachableWithoutShiftFromStartPhase),
    readyForT3HolderGate: rows.length === 9 && qualified.length === 9 && familiesMissing.length === 0,
  },
  rows,
};

await mkdir(dirname(args.out), { recursive: true });
const json = `${JSON.stringify(report, null, 2)}\n`;
await writeFile(args.out, json, "utf8");
const sha = createHash("sha256").update(json).digest("hex");
console.log(`T3_CORPUS_OUTPUT=${args.out}`);
console.log(`T3_CORPUS_SHA256=${sha}`);
console.log(`T3_FAMILIES_QUALIFIED=${familiesQualified.length}/9`);
console.log(`T3_CORPUS_GATE=${report.summary.readyForT3HolderGate ? "PASS" : "OPEN"}`);
if (rows.some(row => row.status === "READ_ERROR")) process.exitCode = 1;
