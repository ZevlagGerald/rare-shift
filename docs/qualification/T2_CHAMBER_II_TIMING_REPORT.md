# RARE//SHIFT — T2 CHAMBER II / TIMING Qualification Report

**Status:** T2 QUALIFIED — PHYSICAL-PHONE TOUCH GATE OPEN  
**Qualified implementation commit:** `0aaec2604c03f22388c0c188ba820a32e08c3017`  
**Automated qualification report commit:** `05703686f95ab35758ca4e6d17f0a082c6e12390`  
**Nine-family corpus closeout commit:** `e0417ab1aae9e0b70e8434e1b0fe22bb12cb5736`  
**Base:** T1 qualified closeout `dac2c405ad18a3f91a31c4764f79328aaef2e1cb`  
**FriendSDK:** v0.1.2  
**Engine:** Phaser 4.2.1

## Decision

The bounded T2 implementation is qualified for the intended **SCAN → CHAMBER I / DISCOVER → explicit transition → CHAMBER II / TIMING** sequence.

T2 introduces one new mechanic only: **PHASE PULSE**. A timed shutter is passable only when the selected Friend is in the matching canonical phase and the pulse clock is in that phase's matching OPEN segment.

The automated browser gate, canonical nine-family real-Friend corpus, and real-holder Friend `#13699` Chamber II playthrough all pass.

The physical-phone touch run remains a separate pre-submission qualification gate. This report does not authorize Chamber III implementation, reconstruction, economy, contracts, backend systems, selector-threshold changes, or other scope expansion.

## Mechanics implemented

The deterministic pulse cycle is:

1. `TELEGRAPH_A`
2. `OPEN_A`
3. `TELEGRAPH_B`
4. `OPEN_B`
5. repeat

Global pulse segment duration is `1200 ms`, identical for every Friend.

### A shutter

Passable only under:

- canonical phase `A`; and
- pulse state `OPEN_A`.

### B shutter

Passable only under:

- canonical phase `B`; and
- pulse state `OPEN_B`.

A failed crossing is non-lethal. The player remains in the safe staging area and receives an explicit `PHASE` or `TIMING` block explanation.

## Deterministic architecture

T2 added pure deterministic modules rather than placing timing authority in Phaser side effects:

- `timing-core.ts`
  - deterministic pulse profile;
  - deterministic active-time pulse segment;
  - canonical A_ONLY/B_ONLY shutter-source selection;
  - deterministic Chamber II timing fingerprint;
  - phase + timing passability;
  - active-time clock with pause semantics.
- `timing-solver.ts`
  - time-expanded state `(x, y, phase, pulseSegment)`;
  - movement, SHIFT, and WAIT transitions;
  - bounded reachability;
  - minimum SHIFT proof;
  - no-SHIFT reachability check.
- `phaser-timing.ts`
  - visual presentation/input only;
  - explicit Phase/Pulse HUD;
  - distinct A/B shutter patterns as non-color cues;
  - reduced-motion compatibility;
  - SDK pause freezes the timing clock.

The T0/T0.5 frame selector, scoring formula, qualification thresholds, same-clip-first policy, cross-clip fallback policy, and Chamber I solver/topology were not changed.

## Core qualification

Final CI proves eight deterministic core tests PASS:

1. exact canonical phase-field classification;
2. deterministic same-clip frame-pair selection;
3. Chamber I deterministic two-SHIFT invariant;
4. Chamber I invariant across 128 synthetic frame pairs;
5. deterministic PHASE PULSE sequence and pause freeze;
6. deterministic Chamber II generation with canonical source-class correctness;
7. independent PHASE vs TIMING shutter authority;
8. time-expanded Chamber II bounded completion with exactly two required SHIFTs and WAIT support.

Both core TypeScript and game TypeScript checks pass.

## Browser authority proof

The browser qualifier runs the full sequence at both 960px and 390px.

For each timed shutter it proves all three required cases:

- **wrong canonical phase + matching OPEN window => BLOCK**;
- **correct canonical phase + closed/telegraph window => BLOCK**;
- **correct canonical phase + matching OPEN window => PASS**.

The automated fixture then completes Chamber II with exactly two accepted SHIFTs.

The test-only pulse override is restricted to local test hosts (`localhost`, `127.0.0.1`, `::1`) so automated qualification can place the chamber at exact pulse boundaries without race-prone sleeps. Production behavior continues to use the deterministic active-time clock.

## Final automated evidence

GitHub Actions run: `36245753574`  
Head: `0aaec2604c03f22388c0c188ba820a32e08c3017`  
Evidence artifact: `rare-shift-browser-evidence-36245753574`  
Artifact ID: `10907496882`  
Artifact ZIP digest: `sha256:1ca76c86a55144d366801d54bb1763bc1f123907451efa01c52455590e804bea`

All workflow stages PASS:

- FriendSDK archive SHA verification;
- T0.5/T2 corpus-reader syntax;
- deterministic core tests `8/8`;
- core TypeScript;
- game TypeScript;
- `friendsdk check`;
- `friendsdk build`;
- canonical FriendSDK smoke;
- full T2 browser flow at 960px;
- full T2 browser flow at 390px;
- screenshot evidence verification.

Final screenshot SHA-256 values:

- FriendSDK smoke / SCAN 960: `9ddae53c907f66eabc1e7ee54a0eb119705a7dc27e2d1737d2bf6764310747e0`;
- T2 SCAN 960: `9ddae53c907f66eabc1e7ee54a0eb119705a7dc27e2d1737d2bf6764310747e0`;
- T2 SCAN 390: `a75682c3fe05d4a12259fbbfb17865695282caa2f4c587d6479992d55de014c7`;
- Chamber I → II transition 960: `8146dc84896584bd922477fb9c64132921c351b6a0ca1d90e7c5c06c37192d41`;
- Chamber I → II transition 390: `cc661dbb141627f90d39d934ad4fd69b56c2db0c04e176e0f2d14dda0791d093`;
- Chamber II complete 960: `27c3070267ba44710748f3810c72b81c321e9c8140178023397e4b8e7163039c`;
- Chamber II complete 390: `366afff0a4337698709a87df2e1c0d29837c74a360179a340835a442e1cd1190`.

## Canonical nine-family corpus evidence

Owner-local read-only corpus run was executed from exact T2 report head `05703686f95ab35758ca4e6d17f0a082c6e12390` using `npm run corpus:t2`.

Corpus artifact: `artifacts/t2-canonical-nine.json`  
Artifact SHA-256: `5c25e466feba6a811d5d4c7114e6989a174b25c827d8b33cb3ed0a622b963d6e`

Corpus summary:

- qualified: `9/9`;
- families qualified: `Skeleton, Mask, Family, Cellular, Asymmetry, Hoverer, Colossus, Sparkling, Hollow`;
- families missing: none;
- deterministic: PASS;
- solver: PASS;
- timing authority: PASS;
- ready for real-holder T2 gate: YES.

Per-family evidence:

| Family | Friend | Gen | Frames | T2 fingerprint | Pulse start | Waits | Min SHIFTs |
|---|---:|---:|---|---|---:|---:|---:|
| Skeleton | #13655 | 5 | 33↔34 | `7c517c3f` | 2 | 12 | 2 |
| Mask | #3112 | 3 | 41↔42 | `2c82db01` | 3 | 18 | 2 |
| Family | #289218 | 6 | 33↔34 | `bb36e92b` | 0 | 17 | 2 |
| Cellular | #13699 | 6 | 33↔34 | `78145332` | 2 | 12 | 2 |
| Asymmetry | #334511 | 6 | 33↔34 | `7a75df9b` | 3 | 15 | 2 |
| Hoverer | #14193 | 4 | 4↔6 | `64746e7c` | 0 | 14 | 2 |
| Colossus | #14223 | 4 | 48↔51 | `c97c9bae` | 1 | 16 | 2 |
| Sparkling | #14584 | 2 | 34↔37 | `3e21d08a` | 3 | 15 | 2 |
| Hollow | #14412 | 5 | 8↔11 | `ee666a66` | 3 | 18 | 2 |

Every corpus row independently proved:

- deterministic repeated generation;
- A shutter source is canonical `A_ONLY`;
- B shutter source is canonical `B_ONLY`;
- wrong phase during matching OPEN is blocked;
- correct phase during closed/telegraph is blocked;
- correct phase during matching OPEN passes;
- Chamber II solver is solvable;
- no-SHIFT completion is impossible;
- minimum accepted SHIFT count is exactly `2`.

The corpus includes multiple initial pulse offsets (`0`, `1`, `2`, `3`) and multiple solver WAIT counts (`12` through `18`), proving the chamber is not accidentally qualified only from one pulse starting state.

Colossus independently passes using frames `48↔51`, fingerprint `c97c9bae`, initial pulse segment `1`, and `16` WAIT transitions. No Colossus-specific exception was introduced.

The local run left only the pre-existing untracked `package-lock.json`; no corpus evidence required committing that local file.

## Real-holder T2 evidence — Friend #13699

The real-holder qualification used the normal FriendSDK wallet/Friend selection path and the production pulse clock. No test pulse override or debug state was used.

Observed identity remained stable:

- Friend: `#13699`;
- family: `Cellular`;
- generation: `6`;
- canonical frames: `33↔34`;
- T1/base fingerprint: `fdef6617`;
- T2 timing fingerprint: `78145332`;
- T2 solver minimum: `2 SHIFTs`.

The holder screenshots prove all required T2 authority conditions:

1. **PHASE authority PASS** — while in Phase B / Frame 34, the A shutter rejects movement with `BLOCKED: PHASE mismatch · SHIFT to the shutter's canonical phase.`
2. **TIMING authority PASS** — while in Phase A / Frame 33 and the pulse is outside `OPEN A`, the A shutter rejects movement with `BLOCKED: TIMING window closed · wait for matching OPEN A.`
3. **Valid crossing/completion PASS** — the same real Friend completes Chamber II under production timing rules.
4. **Minimum SHIFT proof PASS** — final holder completion reports `CHAMBER II COMPLETE · 78145332 · 2 SHIFTs · phase + timing synchronized.`
5. **Reload determinism PASS** — after a fresh reload and repeat of Chamber I, the transition screen regenerates `Timing proof 78145332 · solver minimum 2 SHIFTs` unchanged.

Earlier exploratory holder attempts completed the chamber with more than two accepted SHIFTs. Those attempts were retained as user-operation evidence, not treated as qualification failures, because the final clean holder run independently demonstrated the solver-minimal two-SHIFT path without any gameplay-rule change.

No wallet address, private key, seed phrase, recovery material, or other private holder credential is recorded in this report.

## Visual review

The evidence screenshots were manually reviewed rather than accepting only CI exit codes.

### SCAN

PASS. The qualified T1 SCAN remains unchanged and readable at 960px and inside the narrow FriendSDK host.

### Chamber I → Chamber II transition

PASS after repair. The final narrow layout reserves bottom clearance and keeps `ENTER CHAMBER II // TIMING` fully visible and clickable above SDK chrome.

### Chamber II 960

PASS after repair. Phase, frame, pulse label, pulse indicator, canonical phase field, source diagnostics, and touch controls remain separated without overlap.

### Chamber II 390

PASS. The complete touch cluster remains above FriendSDK chrome. The phase/pulse state and canonical field remain visible, and the chamber completion state fits inside the host.

### Real-holder desktop evidence

PASS. The holder screenshots visibly preserve Friend `#13699`, frames `33↔34`, timing fingerprint `78145332`, explicit PHASE/TIMING block messages, and the exact two-SHIFT completion state.

## Failure history retained

Two intermediate CI failures are intentionally recorded because they exposed real qualification issues:

1. Run `36245068096`: the browser test continued pressing movement after Chamber I had completed and React had destroyed its canvas during the explicit transition. This was a test-harness boundary race; the repair sends exactly the remaining moves to EXIT and waits for the transition.
2. Run `36245232093`: 960px passed, but the 390px FriendSDK toolbar intercepted the transition CTA. This was a real narrow-layout defect and was fixed in production CSS before acceptance.

No gameplay rule was weakened to make either test pass.

## PROVEN

- SCAN and qualified Chamber I remain intact.
- Chamber I transitions explicitly into Chamber II.
- Chamber II uses the same selected canonical pair.
- A/B shutter source pixels are canonical A_ONLY/B_ONLY authority.
- Chamber II generation is deterministic for the same canonical input.
- PHASE authority is mechanically independent from TIMING authority.
- Time-expanded solver finds bounded completion and requires exactly two SHIFTs.
- Pause behavior is deterministic in the timing core and the Phaser adapter freezes the active pulse clock when the SDK pauses the scene.
- Reduced motion does not alter timing rules.
- 960px and 390px browser flows pass.
- FriendSDK check/build/smoke remain green.
- canonical nine-family corpus passes `9/9`, including Colossus.
- all four deterministic pulse start offsets are represented in the nine-family corpus.
- real-holder Friend `#13699` proves PHASE blocking, TIMING blocking, exact two-SHIFT completion, and reload-stable T2 fingerprint.
- no RF spending, backend, contract, HP/death, inventory, or persistent state was introduced.

## OPEN / UNPROVEN

- physical-phone touch run;
- real-world cross-clip fallback occurrence/rate;
- Chamber III / SYNCHRONIZE;
- reconstruction finale;
- final audio/submission polish.

## Next gate

**T2 REAL-HOLDER GATE: CLOSED / PASS.**

T2 is qualified for desktop/browser holder behavior. The physical-phone touch run remains a separate pre-submission gate and should not be silently treated as complete.

Chamber III remains unimplemented. Any Chamber III / SYNCHRONIZE work requires a fresh review/design tranche and a new isolated branch. The qualified T2 branch should be treated as frozen after this holder closeout.