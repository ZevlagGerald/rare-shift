# RARE//SHIFT — T3 CHAMBER III / SYNCHRONIZE Qualification Report

**Status:** AUTOMATED + NINE-FAMILY CORPUS PASS — REAL-HOLDER T3 GATE OPEN  
**Qualified implementation commit:** `649a803d54606ed7b8c8bd9b9c52fe17b05eaacc`  
**Automated qualification report commit:** `5ef4bd6bfa10439ddfd5353d767c270a782bc16c`  
**Base:** T2 qualified closeout `f767f392b101e23e6afe0d7f037b0444df94409c`  
**FriendSDK:** v0.1.2  
**Engine:** Phaser 4.2.1

## Decision

The bounded T3 implementation passes automated qualification and the canonical nine-family real-Friend corpus for the intended sequence:

`SCAN → CHAMBER I / DISCOVER → CHAMBER II / TIMING → CHAMBER III / SYNCHRONIZE`

T3 introduces one new mechanic only: three ordered canonical SYNC NODES. Their authority sequence is fixed at `B → A → B`, with source coordinates selected deterministically from the selected Friend's real `B_ONLY → A_ONLY → distinct B_ONLY` frame-difference pixels.

The automated gate and live read-only nine-family corpus now both pass. The bounded real-holder Friend `#13699` T3 run is authorized as the final T3 qualification gate. Reconstruction/finale remains out of scope.

## Mechanics implemented

Chamber III begins in Phase B and requires:

1. Node 1 — canonical Phase B;
2. Node 2 — canonical Phase A;
3. Node 3 — canonical Phase B;
4. EXIT after `3/3 SYNCHRONIZED`.

The intended minimum solution is exactly two accepted SHIFTs:

`B Node 1 → SHIFT → A Node 2 → SHIFT → B Node 3 → EXIT`

The state machine independently enforces:

- wrong phase => `PHASE MISMATCH` and no progress;
- future node => `SIGNAL NOT ROUTED` and no progress;
- duplicate contact => no duplicate credit;
- EXIT sealed before `3/3`;
- EXIT open after `3/3`.

Failures are non-lethal and do not reset valid synchronization progress.

## Deterministic architecture

T3 adds pure deterministic modules rather than placing synchronization authority inside Phaser:

- `sync-core.ts`
  - canonical B/A/B source selection;
  - distinct Node 1 / Node 3 B_ONLY source enforcement;
  - deterministic authored-safe Chamber III shell;
  - deterministic T3 fingerprint;
  - pure node-contact state transitions;
  - EXIT lock authority.
- `sync-solver.ts`
  - state `(x, y, phase, nextNode)`;
  - deterministic movement and SHIFT transitions;
  - bounded reachability;
  - no-SHIFT reachability proof;
  - exact minimum-SHIFT proof.
- `phaser-sync.ts`
  - presentation/input only;
  - numbered nodes with A/B pattern cues;
  - visible routed conduit;
  - persistent `SYNC n/3` state;
  - sealed/open EXIT presentation;
  - keyboard and touch controls;
  - reduced-motion-safe presentation.

The qualified T0/T0.5 selector/scoring/thresholds, T1 Chamber I mechanics, and T2 PHASE PULSE mechanics were not changed.

## Core qualification

Final CI proves twelve deterministic core tests PASS:

- eight existing T0/T1/T2 regression tests;
- deterministic Chamber III canonical B/A/B source generation;
- T3 phase/order/duplicate/EXIT state-machine authority;
- T3 solver bounded completion with exactly two required SHIFTs;
- T3 invariant across 128 deterministic qualified two-way synthetic pairs.

Both core TypeScript and game TypeScript checks pass.

## Browser authority proof

The browser qualifier runs the complete T3 flow at both 960px and 390px.

For Chamber III it proves:

- EXIT is blocked at `0/3`;
- Node 3 cannot advance before Nodes 1 and 2;
- Node 1 advances only under Phase B;
- Node 2 is blocked under Phase B and advances under Phase A;
- Node 3 is blocked under Phase A and advances under Phase B;
- final synchronization reaches `3/3`;
- EXIT becomes reachable only after `3/3`;
- successful completion uses exactly two accepted SHIFTs.

## Narrow-host repair

Initial T3 CI run `36252641252` proved all static/core/SDK gates and the complete 960px flow, but the 390px Chamber II → III transition CTA was intercepted by the FriendSDK toolbar.

The defect was presentation-only. Commit `649a803d54606ed7b8c8bd9b9c52fe17b05eaacc` extended the already-qualified compact transition CSS to the Chamber II → III transition. No synchronization, collision, solver, selector, timing, or phase logic changed.

The repaired 390px flow then passed completely.

## Final automated evidence

GitHub Actions run: `36252903009`  
Head: `649a803d54606ed7b8c8bd9b9c52fe17b05eaacc`  
Evidence artifact: `rare-shift-browser-evidence-36252903009`  
Artifact ID: `10910101420`  
Artifact ZIP digest: `sha256:5438c44c407ce66ef4759c44669a733c48e82c98ad9bc56ad76a23c9e9ccb160`

All workflow stages PASS:

- FriendSDK archive SHA verification;
- T0.5/T2/T3 corpus-reader syntax;
- deterministic core tests `12/12`;
- core TypeScript;
- game TypeScript;
- `friendsdk check`;
- `friendsdk build`;
- FriendSDK smoke;
- full T3 browser flow at 960px;
- full T3 browser flow at 390px;
- screenshot evidence verification.

Final screenshot SHA-256 values:

- FriendSDK smoke / T3 SCAN 960: `1704797b674243b92a4c8df9e47b8c4f6f3e2698ffcf0b235c0327b3cc6228be`;
- T3 SCAN 390: `a75682c3fe05d4a12259fbbfb17865695282caa2f4c587d6479992d55de014c7`;
- Chamber I → II transition 960: `ae0bea4f2a2ec2b3c7d3ba962d7e75681c71758de7249915130360be018d2b63`;
- Chamber I → II transition 390: `cc661dbb141627f90d39d934ad4fd69b56c2db0c04e176e0f2d14dda0791d093`;
- Chamber II → III transition 960: `c187a5486ad94ee48fb0eae9a5d93cf9645deb46de62b2c8768d0ed928144209`;
- Chamber II → III transition 390: `f7c6d5686e47c6f342bbf22bfe5f509304cecde819c08eca1f8be1f74cfffdb6`;
- Chamber III complete 960: `5ce87e2f89c23b71ef52cff2062c0b8b412612a614fd03d279cf2df180216c31`;
- Chamber III complete 390: `b30bff9f06535131b1ff1592cbc417af20c18f0a6c5492277a8b3dbdff3a933a`.

Manual visual review of the evidence bundle found no remaining SDK-toolbar collision, touch-control overlap, diagnostic overlap, or SCAN regression. Chamber III completion visibly reports `3/3 SYNCHRONIZED · 2 SHIFTs` and preserves the canonical phase-field/source diagnostics.

## Canonical nine-family corpus evidence

Owner-local read-only corpus run was executed from exact automated-report head `5ef4bd6bfa10439ddfd5353d767c270a782bc16c` using `npm run corpus:t3`.

Corpus artifact: `artifacts/t3-canonical-nine.json`  
Artifact SHA-256: `00b699da14781b4186e3608fe088797a5147e211b882c233686e25fb96b1e918`

Corpus summary:

- qualified: `9/9`;
- families qualified: `Skeleton, Mask, Family, Cellular, Asymmetry, Hoverer, Colossus, Sparkling, Hollow`;
- families missing: none;
- deterministic: PASS;
- canonical source authority: PASS;
- synchronization sequence authority: PASS;
- solver: PASS;
- ready for real-holder T3 gate: YES.

Per-family evidence:

| Family | Friend | Gen | Frames | T3 fingerprint | Node 1 | Node 2 | Node 3 | Min SHIFTs |
|---|---:|---:|---|---|---|---|---|---:|
| Skeleton | #13655 | 5 | 33↔34 | `f3c6d9c2` | `(7,4) B_ONLY` | `(9,14) A_ONLY` | `(8,4) B_ONLY` | 2 |
| Mask | #3112 | 3 | 41↔42 | `53bd1944` | `(6,2) B_ONLY` | `(3,9) A_ONLY` | `(4,8) B_ONLY` | 2 |
| Family | #289218 | 6 | 33↔34 | `91c3eb0f` | `(9,3) B_ONLY` | `(9,5) A_ONLY` | `(6,7) B_ONLY` | 2 |
| Cellular | #13699 | 6 | 33↔34 | `2032f2f5` | `(9,9) B_ONLY` | `(10,8) A_ONLY` | `(6,5) B_ONLY` | 2 |
| Asymmetry | #334511 | 6 | 33↔34 | `6901969c` | `(11,8) B_ONLY` | `(4,14) A_ONLY` | `(4,8) B_ONLY` | 2 |
| Hoverer | #14193 | 4 | 4↔6 | `d1ce7542` | `(12,6) B_ONLY` | `(9,4) A_ONLY` | `(11,6) B_ONLY` | 2 |
| Colossus | #14223 | 4 | 48↔51 | `14efeac9` | `(9,13) B_ONLY` | `(7,14) A_ONLY` | `(10,11) B_ONLY` | 2 |
| Sparkling | #14584 | 2 | 34↔37 | `c478a3f9` | `(10,7) B_ONLY` | `(2,2) A_ONLY` | `(8,10) B_ONLY` | 2 |
| Hollow | #14412 | 5 | 8↔11 | `14d30bcb` | `(10,4) B_ONLY` | `(6,3) A_ONLY` | `(9,4) B_ONLY` | 2 |

Every corpus row independently proved:

- deterministic repeated T3 generation;
- exact source-class sequence `B_ONLY / A_ONLY / B_ONLY`;
- Node 1 / Node 3 B sources are distinct;
- phase authority;
- ordered-routing authority;
- duplicate-credit protection;
- EXIT lock before `3/3` and unlock after `3/3`;
- Chamber III solver is solvable;
- no-SHIFT completion is impossible;
- minimum accepted SHIFT count is exactly `2`.

The corpus includes the Colossus vertical-family case and Hollow's lower-delta qualified pair without any family-specific exception.

## Remaining gates

- T3 canonical nine-family real-Friend corpus: **PASS**;
- T3 bounded real-holder Friend `#13699` run: **OPEN / AUTHORIZED**;
- physical-phone touch: **OPEN / PRE-SUBMISSION**;
- reconstruction/finale: **NOT AUTHORIZED**.
