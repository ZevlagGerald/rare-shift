# RARE//SHIFT — T1 SCAN + CHAMBER I / DISCOVER Qualification Report

**Status:** QUALIFIED — AUTOMATED + REAL-HOLDER PASS  
**Qualified implementation commit:** `5a8cae44bd5538fa9caa25b30e0592db0be79973`  
**Base:** T0.5 qualified closeout `7cd70bd0d9a43819de613c21abdd8b37c41ed34f`  
**FriendSDK:** v0.1.2  
**Engine:** Phaser 4.2.1

## Decision

The bounded T1 implementation is fully qualified for the intended **SCAN → CHAMBER I / DISCOVER** sequence.

Automated browser qualification passed at desktop and narrow viewport, and the Owner subsequently completed the same T1 sequence with the real selected Friend `#13699`. The real-holder evidence reproduced the deterministic values established before T1 and completed Chamber I after exactly two accepted SHIFT actions.

The unchanged T0/T0.5 deterministic selector, chamber builder and solver remain the mechanical authority.

This report closes T1. It does not authorize Chamber III, reconstruction, economy, contracts, backend systems, selector-threshold changes or other unrelated scope expansion. Chamber II requires its own bounded protocol and branch.

## Implemented sequence

1. FriendSDK verifies the selected Friend/session.
2. The game reads all 64 canonical frames.
3. The unchanged deterministic selector chooses frame A/B.
4. The unchanged chamber builder and solver must pass.
5. **SCAN** appears before Phaser gameplay and exposes:
   - selected Friend ID;
   - canonical family;
   - exact canonical Frame A and Frame B pixel maps;
   - exact COMMON / A_ONLY / B_ONLY / VOID phase field;
   - difference and balance metrics;
   - source clip group;
   - deterministic fingerprint;
   - solver minimum SHIFT count.
6. The player explicitly chooses **ENTER CHAMBER I**.
7. **CHAMBER I // DISCOVER** reuses the qualified two-gate deterministic topology.
8. Gate A requires the first SPACE/touch SHIFT.
9. Gate B requires the second SHIFT.
10. EXIT reports Chamber I completion after exactly two accepted SHIFTs.

## Final automated evidence

GitHub Actions run: `36243095509`  
Head: `5a8cae44bd5538fa9caa25b30e0592db0be79973`  
Evidence artifact: `rare-shift-browser-evidence-36243095509`  
Artifact ID: `10905819961`  
Artifact ZIP digest: `sha256:8d8d0eac5b3d25ba69edb42a7a93b025d5146cd416d0fcd3d94f53b93614a745`

All workflow stages passed:

- FriendSDK archive SHA verification PASS;
- corpus reader syntax PASS;
- deterministic core tests `4/4` PASS;
- TypeScript PASS;
- `friendsdk check` PASS;
- `friendsdk build` PASS;
- canonical FriendSDK smoke PASS;
- T1 browser proof at 960px PASS;
- T1 browser proof at 390px PASS;
- screenshot evidence verification PASS.

Final screenshot SHA-256 values:

- FriendSDK smoke / T1 SCAN 960: `9c1a3194c4f21cbe093484da74abd14722bc8704023afdf97bf84a10df99ccdc`;
- T1 SCAN 390: `a75682c3fe05d4a12259fbbfb17865695282caa2f4c587d6479992d55de014c7`;
- T1 Chamber I complete 960: `98dc8bbaf7c50ba7c53c2a87363651e27a636d1a58d7c710cccf7a779a1b3683`;
- T1 Chamber I complete 390: `25fa47518855ab11d1a7df0d3acc378338fbeaafa6ef2e82bcbb99a3f2b36ddb`.

## Browser assertions proven

The custom browser qualifier verifies at both 960px and 390px:

- SCAN is the initial post-load game stage;
- fixture Friend identity remains attached to the scan;
- canonical family is present;
- frame A/B indices are present;
- canonical frame A view exists;
- canonical frame B view exists;
- canonical XOR/phase-field view exists;
- deterministic fingerprint is present;
- solver minimum equals `2`;
- ENTER CHAMBER I transitions into Phaser gameplay;
- initial phase is B;
- Phase B blocks Gate A;
- first SPACE SHIFT enters Phase A;
- Gate A becomes passable;
- Phase A blocks Gate B;
- second SPACE SHIFT returns to Phase B;
- accepted SHIFT count equals `2`;
- Gate B becomes passable;
- EXIT is reached;
- completion state becomes `chamber1-complete`.

## Real-holder T1 evidence

Owner-supplied runtime screenshots on 2026-09-26 prove the T1 flow with the selected eligible Friend `#13699`.

### SCAN

PASS. The real session visibly reproduced:

- Friend: `#13699`;
- family: `Cellular`;
- canonical frames: `33 ↔ 34`;
- deterministic fingerprint: `fdef6617`;
- delta: `25`;
- balance: `9`;
- source clip group: `4`;
- solver minimum: `2 SHIFT`;
- exact canonical Frame A, XOR field and Frame B presentation;
- reduced-motion mode enabled.

### CHAMBER I / DISCOVER

PASS. After the explicit SCAN transition, the same real Friend completed Chamber I. The completion state visibly reported:

- Friend `#13699`;
- family `Cellular`;
- canonical frames `33 ↔ 34`;
- fingerprint `fdef6617`;
- `CHAMBER I COMPLETE`;
- `2 SHIFTs`;
- final Phase B / Frame 34;
- reduced-motion mode still enabled.

No wallet address, private account data or wallet secret is recorded in this public qualification report.

## Visual review

The CI evidence screenshots and real-holder screenshots were reviewed rather than accepting only exit codes.

### SCAN 960

PASS. The composition clearly presents RARE//SHIFT, the central thesis, selected Friend/family/frame-pair/fingerprint, three canonical analysis panels, metric strip and ENTER CHAMBER I action. The design remains restrained and consistent with the canonical 1-bit × computational phase-space direction.

### SCAN 390

PASS after repair. FriendSDK preserves the 960:640 game aspect ratio, so a 390px-wide host gives only about 260px of game height. The repaired narrow layout keeps Frame A, XOR, Frame B, metrics and ENTER CHAMBER I visible together above the toolbar.

### Chamber I 960 / 390

PASS after repair. Final spacing separates diagnostics from the touch HUD. The narrow completion status and the complete touch-control cluster remain above the FriendSDK toolbar.

### Real-holder desktop

PASS. The real SCAN and completed Chamber I remain readable and consistent with the automated evidence. No blocking overlap or clipping is visible in the supplied screenshots.

## Mechanics preserved

T1 did not change:

- pair qualification thresholds;
- pair score formula;
- same-clip-first selection policy;
- cross-clip fallback behavior;
- chamber topology;
- phase passability rules;
- solver implementation;
- minimum two-SHIFT invariant;
- FriendSDK wallet/ownership boundary.

The physical Shift key remains unbound. Keyboard SHIFT action is SPACE; touch uses the dedicated on-screen SHIFT control.

## PROVEN

- T1 SCAN implementation exists and is deterministic from qualified canonical data.
- SCAN precedes chamber gameplay.
- SCAN communicates the NFT-to-world derivation rather than treating the Friend as a skin.
- Chamber I retains the solver-qualified two-phase lesson.
- Desktop and narrow automated runtime flows complete.
- Real-holder Friend `#13699` reproduces the expected deterministic SCAN and Chamber I result.
- Reduced-motion flow remains playable in automated and supplied real-holder evidence.
- FriendSDK check/build/smoke remain green.
- No RF spending or persistent state was introduced.

## OPEN / UNPROVEN

- physical-phone touch playthrough;
- real-world cross-clip fallback occurrence/rate;
- Chamber II implementation and qualification;
- Chamber III design/implementation;
- reconstruction finale;
- final audio and submission polish.

## T1 closeout

**T1_STATUS=QUALIFIED**  
**REAL_HOLDER_GATE=PASS**  
**NEXT=DESIGN T2 — CHAMBER II / TIMING UNDER A NEW ISOLATED BRANCH**

Do not silently advance beyond the bounded Chamber II tranche. Chamber III remains blocked until T2 is independently reviewed and qualified.
