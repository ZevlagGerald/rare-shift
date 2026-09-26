# RARE//SHIFT — T0.5 Real-Friend Corpus Qualification Protocol

Status: CLOSED — QUALIFIED; see `T0_5_REAL_FRIEND_CORPUS_REPORT.md`.

## Purpose

T0.5 measures whether the already-qualified T0 frame-pair selector and two-phase chamber invariant behave consistently across real, minted Rare Friends before any T1 gameplay expansion or threshold tuning.

T0.5 is not a gameplay tranche. It must not change the T0 selector thresholds, chamber topology, solver acceptance rules, FriendSDK wallet gate, or production game scope.

## Safety and scope

- Read-only Robinhood mainnet chain `4663` only.
- FriendSDK v0.1.2 canonical Generations and Families Registry addresses only.
- Explicit token IDs only. No collection-wide token scan and no wallet enumeration.
- Each token ID must first pass the canonical Generations `ownerOf`/`generation` read through FriendSDK identity helpers. A nonexistent token or failed RPC read is not treated as a valid corpus sample.
- No signatures, private keys, transactions, approvals, RF spending, contract writes, backend state, or persistent browser state.
- Owner addresses are deliberately not written to the corpus artifact.
- Local token-ID input may be supplied through the CLI or an ignored file under `private/`.
- Generated corpus output stays under ignored `artifacts/` until explicitly reviewed for publication.

## Required row evidence

For every valid hardwired Friend sample record:

- token ID;
- generation;
- family ID/name;
- canonical seed;
- chosen frame A/B;
- same-clip group or cross-clip fallback;
- pair metrics (`occupiedA`, `occupiedB`, `common`, `aOnly`, `bOnly`, `difference`, `balance`, `score`);
- chamber fingerprint and source pixels;
- solver solvability, no-SHIFT reachability, and minimum SHIFT count;
- deterministic repeat result;
- final row status.

The selector and solver must be executed twice from the same immutable 64-frame input and produce byte-equivalent deterministic analysis state.

## Acceptance

A sample is `QUALIFIED` only when:

1. the token exists and `generation >= 1`;
2. canonical sprite reading succeeds;
3. a qualifying two-way frame pair exists under the unchanged T0 thresholds;
4. deterministic repeat comparison passes;
5. the chamber is solvable;
6. the exit is not reachable from the starting phase without SHIFT;
7. solver minimum SHIFT count is exactly `2`.

The corpus gate remains `OPEN` until at least one `QUALIFIED` real Friend exists for each of the nine canonical families:

1. Skeleton
2. Mask
3. Family
4. Cellular
5. Asymmetry
6. Hoverer
7. Colossus
8. Sparkling
9. Hollow

A complete nine-family pass is evidence for reviewing T1 readiness; it does not automatically authorize T1 or threshold changes.

## Metrics to review before T1

- family coverage;
- same-clip qualification count/rate;
- cross-clip fallback count/rate;
- no-qualifying-pair cases;
- solver rejects;
- determinism failures;
- any family-specific concentration of failures;
- Colossus behavior as raw canonical frame data, without inventing missing directional art.

## Governance rule

Do not tune thresholds from intuition or from one Friend. Any proposed selector normalization or fallback change requires a separate reviewed tranche based on corpus evidence and Owner approval.

## Closeout

The canonical one-per-family corpus qualified `9/9` real hardwired Friends across all nine canonical families and generations 2–6. All nine were deterministic, solver-valid, SHIFT-dependent, exactly two-SHIFT solvable, and selected same-clip pairs. No T0 selector/scoring threshold changes were authorized. Canonical local evidence artifact SHA-256: `41ecd3dc978e25baa70180e74f1ab8f7e9928b45f357ccdccf9953abcc5fffa4`.
