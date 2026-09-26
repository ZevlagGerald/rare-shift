# RARE//SHIFT — T0.5 Real-Friend Corpus Qualification Report

**Status:** QUALIFIED — CORPUS GATE PASS; T1 READINESS REVIEW PASS  
**Observed branch baseline:** `4d6df2684a310270b1495114351a027ea5064b27`  
**FriendSDK:** v0.1.2  
**Chain:** Robinhood mainnet `4663`  
**Canonical corpus artifact SHA-256:** `41ecd3dc978e25baa70180e74f1ab8f7e9928b45f357ccdccf9953abcc5fffa4`

## Decision

T0.5 is qualified. The unchanged T0 frame-pair selector and two-phase chamber invariant passed one real, hardwired Generations Friend from each of the nine canonical Rare Friends families.

This result authorizes a bounded T1 design/implementation tranche under the existing design governance. It does not authorize selector-threshold changes, economy work, Chamber II/III, reconstruction, live contracts, or any other scope expansion.

## Canonical nine-family corpus

| Family | Friend | Generation | Frames | Source group | Selection | Difference | Balance | Score | Fingerprint |
| --- | ---: | ---: | --- | ---: | --- | ---: | ---: | ---: | --- |
| Skeleton | `#13655` | 5 | `33 ↔ 34` | 4 | same-clip | 20 | 6 | 85.2 | `47ea85c6` |
| Mask | `#3112` | 3 | `41 ↔ 42` | 5 | same-clip | 29 | 11 | 131.35 | `4d42dceb` |
| Family | `#289218` | 6 | `33 ↔ 34` | 4 | same-clip | 18 | 4 | 81.3 | `943c62ac` |
| Cellular | `#13699` | 6 | `33 ↔ 34` | 4 | same-clip | 25 | 9 | 101.55 | `fdef6617` |
| Asymmetry | `#334511` | 6 | `33 ↔ 34` | 4 | same-clip | 19 | 6 | 82.05 | `14e9b2d5` |
| Hoverer | `#14193` | 4 | `4 ↔ 6` | 0 | same-clip | 36 | 18 | 195.4 | `74b07681` |
| Colossus | `#14223` | 4 | `48 ↔ 51` | 6 | same-clip | 32 | 15 | 187.8 | `af707b1b` |
| Sparkling | `#14584` | 2 | `34 ↔ 37` | 4 | same-clip | 33 | 14 | 157.85 | `5aad3dc9` |
| Hollow | `#14412` | 5 | `8 ↔ 11` | 1 | same-clip | 14 | 6 | 80.3 | `a1ecb2a1` |

## Hard acceptance evidence

- sample count: `9`;
- qualified: `9/9`;
- family coverage: `9/9`;
- generations covered: `2,3,4,5,6`;
- deterministic repeat: `9/9 PASS`;
- solver solvable: `9/9 PASS`;
- no-SHIFT completion blocked: `9/9 PASS`;
- minimum SHIFT count: exactly `2` for all nine;
- same-clip selection: `9/9`;
- cross-clip fallback: `0/9`;
- no-qualifying-pair cases: `0` in the canonical corpus;
- solver rejects: `0`;
- determinism failures: `0`;
- `allNineFamiliesQualified=true`;
- `readyForT1CorpusGate=true`.

## Review conclusions

### Selector concentration

Five of nine canonical samples selected source group 4. This is not treated as a defect. The selector evaluates qualifying pairs across all eight same-clip groups and chooses the highest deterministic score; the corpus also selected groups 0, 1, 5 and 6. The observed distribution does not justify normalization or family-specific scoring.

### Thresholds

No threshold change is justified. The weakest canonical sample by total difference is Hollow `#14412` at `difference=14`, while the current T0 requirement is only `difference>=5`. The lowest observed balance is Family `#289218` at `balance=4`, still above the two-way requirement of at least two A-only and two B-only pixels. All nine samples satisfy the mechanical invariant without tuning.

### Colossus

Colossus `#14223` qualifies directly from raw canonical frames `48 ↔ 51`, source group 6, with `difference=32`, `balance=15`, deterministic solver acceptance and exactly two SHIFTs. T0/T1 does not require a family-specific Colossus exception or invented directional art.

### Cross-clip fallback

Real cross-clip fallback performance remains unproven because all nine canonical samples qualified through the preferred same-clip path. The deterministic fallback remains in the implementation but must not be represented as corpus-proven behavior.

### Candidate discovery quality

Public candidate snapshots were used only for bounded token-ID discovery. The RARE//SHIFT reader independently revalidated current `ownerOf`/`generation`, canonical frames, family, deterministic pair selection and solver behavior. Two discovered candidates (`#10476` and `#11274`) were rejected because `generation=0`, demonstrating why RARE//SHIFT's stricter hardwired-generation gate is necessary.

## T1 readiness

**T1_READINESS: GO — bounded SCAN + CHAMBER I / DISCOVER only.**

Authorized next scope:

1. selected Friend enters the trusted FriendSDK session;
2. SCAN visibly communicates canonical-frame analysis;
3. selected A/B frames and phase derivation are presented clearly;
4. Chamber I materializes deterministically from the selected Friend;
5. SPACE/touch SHIFT is taught safely;
6. phase-dependent traversal is required;
7. solver-qualified exit completes Chamber I.

Not authorized in this transition:

- Chamber II timing hazards;
- Chamber III Memory Cores/synchronization;
- reconstruction finale;
- selector/scoring threshold changes;
- economy or RF spending;
- backend/accounts;
- contracts or transactions;
- leaderboard/progression expansion.

## Remaining open qualification

- physical-phone touch playthrough;
- real-world cross-clip fallback occurrence/rate;
- broader population qualification rate beyond the bounded nine-family corpus;
- later T1-specific browser/real-wallet qualification after implementation.

These remain explicit limitations. They do not invalidate the completed T0.5 acceptance gate.
