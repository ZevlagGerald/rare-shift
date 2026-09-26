# RARE//SHIFT — T4 RECONSTRUCTION / IDENTITY RESTORED Protocol

**Status:** DESIGN LOCKED — IMPLEMENTATION NOT STARTED  
**Branch:** `feature/t4-reconstruction-finale`  
**Base:** T3 qualified closeout `db477eed836ca69f2347681c4e0ce7e52f959492`  
**FriendSDK:** v0.1.2  
**Engine:** Phaser 4.2.1  
**Primary category:** Character Spotlight

## 1. Purpose

T4 closes the competition experience after Chamber III without adding a fourth puzzle.

The finale must prove, visually and deterministically, that the world rules seen through SCAN, DISCOVER, TIMING and SYNCHRONIZE came from the selected Friend's exact canonical animation pixels.

The final thesis remains:

> **Your Friend is not a skin. Its animation is the rules.**

T4 is therefore a reconstruction + proof + result stage, not a new gameplay system.

## 2. Inherited locks

T4 must not modify any qualified T0–T3 behavior:

- FriendSDK remains authoritative for wallet/session/Friend identity;
- the selected canonical 64-frame corpus remains the only art authority;
- frame-pair selection remains unchanged;
- T0/T0.5 thresholds/scoring remain unchanged;
- Chamber I topology/solver remains unchanged;
- Chamber II PHASE PULSE remains unchanged;
- Chamber III B → A → B synchronization remains unchanged;
- SHIFT remains Space / touch SHIFT only;
- no live RF spending;
- no persistent state;
- no backend;
- no contract deployment;
- no new token/economy/progression system.

## 3. T4 experience flow

After Chamber III reaches `3/3 SYNCHRONIZED` and EXIT:

1. Chamber III completion is acknowledged.
2. Gameplay canvas is retired.
3. T4 `RECONSTRUCTION` begins using the already-prepared canonical frame pair and phase-field data.
4. Canonical phase components are shown as the source material:
   - `COMMON`;
   - `A_ONLY`;
   - `B_ONLY`.
5. The finale deterministically rebuilds the exact canonical pair:
   - `COMMON ∪ A_ONLY = FRAME A`;
   - `COMMON ∪ B_ONLY = FRAME B`.
6. Both reconstructed outputs are byte/pixel-equivalent to the original selected canonical frame rows.
7. The presentation resolves to:

   `IDENTITY RESTORED`

8. Results show the selected Friend identity and the unchanged proof chain from T1 through T3.
9. The player may choose `RUN AGAIN` for the same selected Friend.

No new movement, combat, timer, collectible, scoring system, upgrade, inventory, reward, or phase is introduced.

## 4. Canonical reconstruction invariant

T4 reconstruction is a mathematical identity, not an approximation.

For every pixel coordinate `(x, y)`:

- `FRAME_A(x,y) = COMMON(x,y) OR A_ONLY(x,y)`
- `FRAME_B(x,y) = COMMON(x,y) OR B_ONLY(x,y)`

The reconstructed rows must match the exact `SelectedFramePair.a.rows` and `SelectedFramePair.b.rows` already used by SCAN and all three chambers.

Acceptance requires strict row-for-row equality.

T4 must never:

- interpolate pixels;
- invent missing art;
- smooth or resample the 16×16 bitmap;
- substitute a generated portrait;
- use a different Friend frame than the selected pair;
- merge A_ONLY and B_ONLY into a fake third pose.

## 5. Visual reconstruction

Normal-motion presentation may animate the decomposition into the two final canonical poses.

Recommended sequence:

1. phase-field/XOR source appears;
2. COMMON pixels lock into both outputs;
3. A_ONLY pixels route to Frame A;
4. B_ONLY pixels route to Frame B;
5. both exact canonical frames resolve crisply;
6. final identity/result panel appears.

Animation is presentation only. Reconstruction correctness must already be determined synchronously by pure data.

For reduced-motion mode:

- skip travel/glitch movement;
- render the resolved reconstruction directly or via short discrete opacity changes;
- preserve all information and proof text.

No essential result may depend on motion.

## 6. Final result screen

The completed result must show at minimum:

- `IDENTITY RESTORED`;
- selected Friend ID;
- family;
- selected canonical frame indexes A ↔ B;
- exact reconstructed Frame A;
- exact reconstructed Frame B;
- T1 proof fingerprint;
- T2 timing fingerprint;
- T3 synchronization fingerprint;
- actual accepted SHIFT count for Chamber I;
- actual accepted SHIFT count for Chamber II;
- actual accepted SHIFT count for Chamber III;
- total accepted SHIFT count;
- deterministic minimum total SHIFTs for the qualified route (`6` under the current T1/T2/T3 contracts);
- deterministic final run proof;
- clear `RUN AGAIN` action.

The result screen must not claim a blockchain transaction, cryptographic signature, score ranking, token reward, RF reward, or leaderboard placement.

## 7. Actual run SHIFT statistics

T4 may expose existing per-stage `canvas.dataset.shifts` values before each completed Phaser stage is destroyed.

The React stage controller should capture:

- Chamber I actual SHIFTs;
- Chamber II actual SHIFTs;
- Chamber III actual SHIFTs.

The total is their sum.

The solver minimum total is the sum of the already-qualified solver minima:

`T1.minShifts + T2.minShifts + T3.minShifts = 2 + 2 + 2 = 6`.

This is informational only. The player is not failed for using additional SHIFTs.

Do not add a leaderboard or competitive time/score layer in T4.

## 8. Final run proof

T4 should produce one deterministic short fingerprint linking the complete qualified run identity.

Input authority must be limited to already-trusted deterministic values:

- selected Friend ID;
- family name;
- Frame A index;
- Frame B index;
- exact canonical Frame A rows;
- exact canonical Frame B rows;
- T1 fingerprint;
- T2 fingerprint;
- T3 fingerprint;
- T4 reconstruction schema/version string.

The fingerprint should use the same small deterministic hashing convention already used by the project unless implementation review finds a stronger existing shared helper.

UI label:

`RUN PROOF`

The UI and documentation must explicitly treat it as an internal deterministic run fingerprint, **not** a blockchain signature or cryptographic ownership proof.

Actual run SHIFT counts are intentionally excluded from this identity fingerprint so the same Friend/canonical pair produces the same proof independent of player efficiency.

## 9. Architecture

T4 should preserve the existing architecture split.

Recommended pure module:

`reconstruction-core.ts`

Responsibilities:

- derive phase components from the selected pair;
- rebuild canonical A and B rows;
- assert exact equality;
- produce deterministic T4/run fingerprint inputs;
- expose immutable reconstruction/result model.

React responsibilities:

- transition from completed Chamber III into T4;
- capture completed stage SHIFT counts;
- render the reconstruction/finale stage;
- `RUN AGAIN` reset to SCAN for the same active Friend.

Phaser should not be required for the final result screen unless implementation review identifies a compelling presentation-only reason. React/SVG is preferred because the finale is proof/result presentation rather than gameplay.

FriendSDK/session authority must not be duplicated.

## 10. RUN AGAIN behavior

`RUN AGAIN` must:

- preserve the currently selected Friend;
- clear only ephemeral run statistics;
- return to SCAN;
- reuse/recompute the same deterministic prepared run safely;
- not create a second wallet flow;
- not persist state in localStorage/IndexedDB;
- not issue a transaction;
- not spend RF.

Changing the selected Friend remains the responsibility of FriendSDK/host selection.

## 11. No new nine-family live-RPC gate by default

T4 does not introduce family-specific generation, topology, solver behavior, phase ordering, or a new canonical-pixel threshold.

Its central invariant is the exact set identity:

- `COMMON ∪ A_ONLY = A`;
- `COMMON ∪ B_ONLY = B`.

That invariant is universal for every pair already accepted by the qualified phase-field model.

Therefore a fourth owner-local nine-family live-RPC corpus is **not required by default** if automated/property tests prove reconstruction exactness and T0.5/T2/T3 nine-family evidence remains unchanged.

A new live corpus becomes required only if T4 implementation introduces any family-dependent branch, new frame selection, new source-pixel selection, new fallback, or new generation acceptance logic.

The existing nine-family evidence remains inherited qualification evidence.

## 12. Deterministic tests

T4 implementation must add bounded pure tests proving at minimum:

1. exact reconstruction of Frame A from COMMON + A_ONLY;
2. exact reconstruction of Frame B from COMMON + B_ONLY;
3. no B_ONLY pixel leaks into Frame A;
4. no A_ONLY pixel leaks into Frame B;
5. deterministic final run proof;
6. proof changes when canonical pair/rows or upstream proof chain changes;
7. actual SHIFT-stat capture does not affect the deterministic identity proof;
8. replay reset clears ephemeral stats without changing the selected Friend or deterministic proof;
9. reconstruction invariant across a deterministic synthetic/property corpus;
10. all existing T0–T3 tests remain PASS.

## 13. Browser qualification

The automated browser flow must run the complete experience at both:

- 960×640;
- FriendSDK narrow host around 390×260.

It must prove:

- SCAN still loads;
- Chambers I–III still complete under their existing authority rules;
- T4 appears only after valid Chamber III completion;
- reconstructed A equals the selected canonical A;
- reconstructed B equals the selected canonical B;
- Friend ID/family/frame indexes are unchanged;
- T1/T2/T3 fingerprints are unchanged;
- final RUN PROOF is present and deterministic;
- actual per-stage + total SHIFT statistics are displayed;
- `IDENTITY RESTORED` is visible;
- `RUN AGAIN` returns to SCAN;
- reduced-motion mode remains complete/readable;
- no critical finale control is covered by FriendSDK chrome;
- no horizontal overflow or unreadable result data at narrow width.

Evidence screenshots should include final result at 960 and 390.

## 14. Real-holder final gate

After automated qualification, one bounded real-holder end-to-end run with Friend `#13699` is required.

This is the final gameplay holder proof and replaces repeated per-stage manual retesting unless T4 changes earlier qualified logic.

Required holder evidence:

- SCAN identity still resolves to `#13699 / Cellular / 33 ↔ 34`;
- the player reaches T4 through normal T1/T2/T3 progression;
- T1 proof remains `fdef6617`;
- T2 proof remains `78145332`;
- T3 proof remains `2032f2f5`;
- reconstruction shows exact Frame 33 and Frame 34;
- `IDENTITY RESTORED` appears;
- actual SHIFT totals are internally consistent;
- RUN PROOF is stable after a fresh reload + repeat path to the finale.

For the final holder run, screenshots should be minimized to the final reconstruction/result screen plus any defect evidence if something fails.

## 15. Pre-submission gates after T4

T4 completion does not itself authorize submission.

Remaining release work includes:

- physical-phone touch qualification;
- wrong-network/ineligible/RPC/art-read/error-state checks;
- public HTTPS build qualification;
- mute/audio check if audio exists by submission time;
- fresh-session end-to-end run;
- privacy/secret/local-path audit;
- submission README/screenshots/video;
- official Vibeathon submission PR.

## 16. Rejected T4 scope

Do not add in this tranche:

- Chamber IV;
- combat/boss fight;
- HP/damage;
- new puzzle mechanic;
- randomized loot;
- gacha;
- inventory;
- achievements;
- XP/levels;
- crafting;
- token mint/burn/spend;
- leaderboard;
- backend account;
- cloud save;
- marketplace;
- social sharing integration;
- generated NFT artwork;
- downloadable NFT derivative;
- wallet transaction/signature request.

## 17. Competition-collision check

A bounded search of the current official Vibeathon PR field for `reconstruct`, `identity restored`, or `reassembly` returned no matching submission text at protocol time.

No redesign is justified.

The material-collision trigger remains unchanged: another entry would need to duplicate RARE//SHIFT's central mechanic of canonical animation-frame differences directly controlling world rules, not merely use a reconstruction/result presentation.

## 18. Implementation tranche after approval

If this protocol is approved, the next bounded implementation tranche is:

1. `reconstruction-core.ts` pure model + tests;
2. stage-stat capture for completed Chambers I–III;
3. T3 completion → T4 transition;
4. React/SVG reconstruction presentation;
5. deterministic RUN PROOF;
6. final result screen + RUN AGAIN;
7. 960/390 browser qualification;
8. visual review;
9. one final real-holder end-to-end qualification.

No submission/deployment/merge to `main` occurs as part of that implementation tranche.

## 19. Decision gate

**T4 design decision: GO FOR IMPLEMENTATION after owner review.**

Implementation remains blocked until this protocol has been reviewed. T3 remains the last qualified gameplay branch until then.
