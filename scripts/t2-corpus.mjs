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
import { buildTimingChamber, buildTimingProfile, isTimingPassable } from "../games/rare-shift/src/timing-core.ts";
import { solveTimingChamber } from "../games/rare-shift/src/timing-solver.ts";

const CANONICAL_IDS = [3112n, 13655n, 13699n, 14193n, 14223n, 14412n, 14584n, 289218n, 334511n];
const DEFAULT_OUTPUT = resolve("artifacts/t2-canonical-nine.json");

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

function snapshot(pair, chamber, profile, solved) {
  return JSON.stringify({
    frames: [pair.a.index, pair.b.index],
    sourceGroup: pair.sourceGroup,
    timingFingerprint: chamber.fingerprint,
    shutterA: chamber.shutterA,
    shutterB: chamber.shutterB,
    shutterASourcePixel: chamber.shutterASourcePixel,
    shutterBSourcePixel: chamber.shutterBSourcePixel,
    profile,
    solved: {
      solvable: solved.solvable,
      minShifts: solved.minShifts,
      waits: solved.waits,
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
    const profile = buildTimingProfile(chamberOne.fingerprint);
    const timing = buildTimingChamber(pair, chamberOne.fingerprint);
    const solved = solveTimingChamber(timing, profile);
    return { pair, chamberOne, profile, timing, solved };
  };
  const first = run(), second = run();
  const deterministic = snapshot(first.pair, first.timing, first.profile, first.solved) === snapshot(second.pair, second.timing, second.profile, second.solved);
  const field = derivePhaseField(first.pair.a.rows, first.pair.b.rows);
  const aSourceClass = field[first.timing.shutterASourcePixel.y][first.timing.shutterASourcePixel.x];
  const bSourceClass = field[first.timing.shutterBSourcePixel.y][first.timing.shutterBSourcePixel.x];
  const a = first.timing.shutterA, b = first.timing.shutterB;
  const timingAuthority = {
    aWrongPhaseOpen: isTimingPassable(first.timing, a.x, a.y, "B", "OPEN_A"),
    aCorrectPhaseClosed: isTimingPassable(first.timing, a.x, a.y, "A", "TELEGRAPH_A"),
    aCorrectPhaseOpen: isTimingPassable(first.timing, a.x, a.y, "A", "OPEN_A"),
    bWrongPhaseOpen: isTimingPassable(first.timing, b.x, b.y, "A", "OPEN_B"),
    bCorrectPhaseClosed: isTimingPassable(first.timing, b.x, b.y, "B", "TELEGRAPH_B"),
    bCorrectPhaseOpen: isTimingPassable(first.timing, b.x, b.y, "B", "OPEN_B"),
  };
  const timingRequired = !timingAuthority.aWrongPhaseOpen && !timingAuthority.aCorrectPhaseClosed && timingAuthority.aCorrectPhaseOpen &&
    !timingAuthority.bWrongPhaseOpen && !timingAuthority.bCorrectPhaseClosed && timingAuthority.bCorrectPhaseOpen;
  const accepted = deterministic && aSourceClass === "A_ONLY" && bSourceClass === "B_ONLY" && timingRequired &&
    first.solved.solvable && !first.solved.reachableWithoutShiftFromStartPhase && first.solved.minShifts === 2;
  return {
    accepted,
    deterministic,
    pair: { frameA: first.pair.a.index, frameB: first.pair.b.index, sourceGroup: first.pair.sourceGroup },
    chamberOneFingerprint: first.chamberOne.fingerprint,
    timing: {
      fingerprint: first.timing.fingerprint,
      shutterA: first.timing.shutterA,
      shutterB: first.timing.shutterB,
      shutterASourcePixel: first.timing.shutterASourcePixel,
      shutterBSourcePixel: first.timing.shutterBSourcePixel,
      aSourceClass,
      bSourceClass,
      profile: first.profile,
      authority: timingAuthority,
    },
    solver: {
      solvable: first.solved.solvable,
      minShifts: first.solved.minShifts,
      waits: first.solved.waits,
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
      status: analysis.accepted ? "QUALIFIED" : "T2_REJECT",
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
  schema: "rare-shift-t2-corpus-v1",
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
    solverPass: qualified.every(row => row.solver?.solvable && row.solver?.minShifts === 2),
    timingAuthorityPass: qualified.every(row => row.timing?.authority?.aCorrectPhaseOpen && row.timing?.authority?.bCorrectPhaseOpen),
    readyForT2HolderGate: rows.length === 9 && qualified.length === 9 && familiesMissing.length === 0,
  },
  rows,
};
await mkdir(dirname(args.out), { recursive: true });
const json = `${JSON.stringify(report, null, 2)}\n`;
await writeFile(args.out, json, "utf8");
const sha = createHash("sha256").update(json).digest("hex");
console.log(`T2_CORPUS_OUTPUT=${args.out}`);
console.log(`T2_CORPUS_SHA256=${sha}`);
console.log(`T2_FAMILIES_QUALIFIED=${familiesQualified.length}/9`);
console.log(`T2_CORPUS_GATE=${report.summary.readyForT2HolderGate ? "PASS" : "OPEN"}`);
if (rows.some(row => row.status === "READ_ERROR")) process.exitCode = 1;
