# RARE//SHIFT — T4 RECONSTRUCTION / IDENTITY RESTORED Qualification Report

**Status:** QUALIFIED — REAL-HOLDER FINALE + RELOAD DETERMINISM PASS  
**Qualified implementation commit:** `21b6bc02bf80d837439d1c5d2a1445c808048576`  
**Base:** T3 qualified closeout `db477eed836ca69f2347681c4e0ce7e52f959492`  
**FriendSDK:** v0.1.2  
**Engine:** Phaser 4.2.1

## Decision

The bounded T4 implementation and final real-holder qualification PASS for the complete competition-facing sequence:

`SCAN → CHAMBER I / DISCOVER → CHAMBER II / TIMING → CHAMBER III / SYNCHRONIZE → RECONSTRUCTION / IDENTITY RESTORED`

T4 adds no fourth puzzle and does not modify the qualified T0–T3 gameplay contracts. The finale reconstructs the exact selected canonical pair from the existing phase decomposition, captures ephemeral accepted SHIFT counts from the three completed chambers, displays the unchanged T1/T2/T3 proof chain, and produces one deterministic internal RUN PROOF.

The final real-holder Friend `#13699` end-to-end run and fresh-session repeat both PASS. Full gameplay qualification is therefore CLOSED / PASS for the currently qualified feature branch.

Deployment, submission, and merge to `main` remain unauthorized by this report.

## Exact reconstruction authority

The pure `reconstruction-core.ts` model implements the locked identities:

- `COMMON ∪ A_ONLY = FRAME A`;
- `COMMON ∪ B_ONLY = FRAME B`.

Acceptance is strict row-for-row equality against the same `SelectedFramePair.a.rows` and `SelectedFramePair.b.rows` already used by SCAN and Chambers I–III. The model throws if either reconstruction differs.

T4 does not interpolate, resample, invent, smooth, or substitute canonical art.

## RUN PROOF

The finale produces an 8-hex deterministic internal fingerprint over trusted deterministic identity inputs only:

- T4 schema/version;
- selected Friend ID;
- family;
- selected frame A/B indexes;
- exact canonical frame A/B rows;
- T1 fingerprint;
- T2 fingerprint;
- T3 fingerprint.

Accepted SHIFT counts are intentionally excluded, so player efficiency does not change the identity proof.

The UI explicitly states that RUN PROOF is an internal deterministic game fingerprint and is not a blockchain signature or ownership proof.

## Run statistics

The React stage controller captures each qualified Phaser canvas `data-shifts` value at completion before that stage is retired:

- Chamber I actual accepted SHIFTs;
- Chamber II actual accepted SHIFTs;
- Chamber III actual accepted SHIFTs.

The finale displays those three values, their total, and the inherited deterministic minimum total `2 + 2 + 2 = 6`.

`RUN AGAIN` clears only ephemeral run statistics and returns to SCAN for the same currently selected Friend.

## Core qualification

Final CI proves `17/17` deterministic core tests PASS.

The five T4-specific tests prove:

1. exact Frame A and Frame B reconstruction;
2. A_ONLY/B_ONLY isolation with no cross-pose leakage;
3. deterministic RUN PROOF and sensitivity to trusted identity/proof inputs;
4. ephemeral SHIFT statistics do not alter RUN PROOF;
5. exact reconstruction across 128 deterministic synthetic frame pairs.

All twelve inherited T0–T3 tests also remain PASS.

Core TypeScript and game TypeScript both pass.

## Browser qualification

The browser qualifier executes the full experience at both 960px and the FriendSDK narrow host around 390px.

It proves:

- SCAN identity and canonical frame rows are captured;
- Chambers I, II and III retain their qualified authority and complete with two accepted SHIFTs each in the automated route;
- T4 appears only after valid Chamber III completion;
- reconstructed A row string exactly equals SCAN's original canonical A row string;
- reconstructed B row string exactly equals SCAN's original canonical B row string;
- Friend identity/family and T1/T2/T3 fingerprints remain unchanged;
- RUN PROOF is present and deterministic in format;
- actual SHIFT stats are `2 / 2 / 2`, total `6`, minimum `6` in the qualification route;
- `IDENTITY RESTORED` is present;
- both reconstructed canonical SVG outputs are present;
- `RUN AGAIN` returns to SCAN for the same Friend with the same T1 proof.

## Initial visual defect and bounded repair

Initial T4 CI run `36255399197` passed all programmatic qualification stages. Manual screenshot review nevertheless found one presentation defect: the bottom-positioned `RUN AGAIN` control was partially covered by FriendSDK footer chrome, especially at the 390px host.

This was a presentation-only failure and was not accepted as the final visual gate.

Commit `21b6bc02bf80d837439d1c5d2a1445c808048576` moved only the replay control into the reserved top-left safe area. Reconstruction data, proof generation, SHIFT capture, Phaser chamber rules, selectors, solvers, and canonical authority were unchanged.

The repaired evidence was manually reviewed at both widths. `RUN AGAIN` is fully accessible, all critical reconstruction/proof/stat information remains visible, and no FriendSDK chrome covers a critical finale control.

## Final automated evidence

GitHub Actions run: `36255625914`  
Head: `21b6bc02bf80d837439d1c5d2a1445c808048576`  
Evidence artifact: `rare-shift-browser-evidence-36255625914`  
Artifact ID: `10910556753`  
Artifact ZIP digest: `sha256:461dab6271510fb7f3954a58562c71d42481871726c0b58f2f0df913a79e0d2e`

All workflow stages PASS:

- FriendSDK archive SHA verification;
- inherited corpus-reader syntax checks;
- deterministic core tests `17/17`;
- core TypeScript;
- game TypeScript;
- `friendsdk check`;
- `friendsdk build`;
- FriendSDK smoke;
- complete T4 browser flow at 960px;
- complete T4 browser flow at 390px;
- screenshot evidence verification.

Final repaired screenshot SHA-256 values:

- T4 final 960: `76a34b3d4959abc048073d6015b645d3ecda60be7d0621910e2a2b587ca16f81`;
- T4 final 390: `ec2cbd86abf09f92a5b222475eae4ee3954bf3151340514ae5359188f574d81a`.

## Final real-holder evidence — Friend #13699

The final manual holder qualification used the normal FriendSDK wallet/Friend flow with real Friend `#13699` and no test-only state overrides.

Both complete finale runs visibly reproduced:

- Friend: `#13699`;
- family: `Cellular`;
- selected canonical frames: `33 ↔ 34`;
- T1 proof: `fdef6617`;
- T2 proof: `78145332`;
- T3 proof: `2032f2f5`;
- RUN PROOF: `14e271f4`;
- Chamber I accepted SHIFTs: `2`;
- Chamber II accepted SHIFTs: `2`;
- Chamber III accepted SHIFTs: `2`;
- total accepted SHIFTs: `6`;
- qualified minimum: `6`;
- finale state: `IDENTITY RESTORED`.

The browser was fully refreshed between the two end-to-end runs. The second run reproduced the same Friend identity, frame pair, T1/T2/T3 proof chain, and exact RUN PROOF `14e271f4`.

Therefore:

- final real-holder end-to-end T4 run: **PASS**;
- fresh-session RUN PROOF stability: **PASS**;
- identity/proof-chain continuity: **PASS**;
- exact `2 / 2 / 2 = 6` SHIFT accounting: **PASS**;
- final gameplay qualification: **PASS**.

No wallet address, credential, secret, or private holder information is recorded in this report.

## Nine-family evidence

No new live-RPC nine-family T4 corpus was run, by design.

T4 introduces no family-dependent topology, frame selector, threshold, fallback, source-pixel selection, or solver/generation rule. Its new exact reconstruction invariant is universal for every already-qualified pair. The existing T0.5/T2/T3 nine-family live evidence is therefore inherited, as specified by the locked T4 protocol.

A new live corpus becomes mandatory if later changes introduce family-dependent reconstruction behavior or alter canonical pair selection/acceptance.

## Remaining release / submission gates

Gameplay qualification is complete. The remaining work is release/submission qualification rather than another gameplay tranche:

- physical-phone touch: **OPEN / PRE-SUBMISSION**;
- wrong-network / ineligible Friend / RPC failure / art-read failure / paused-session error-state checks: **OPEN**;
- public HTTPS qualification: **OPEN**;
- privacy and submission-artifact audit: **OPEN**;
- competition README / screenshots / short gameplay evidence packaging: **OPEN**;
- merge to `main`: **NOT AUTHORIZED BY THIS REPORT**;
- deployment/public preview: **NOT AUTHORIZED BY THIS REPORT**;
- official Vibeathon submission PR: **NOT AUTHORIZED BY THIS REPORT**.

T4 and the complete gameplay loop are qualified. Further work must proceed as a separate pre-submission/release tranche under explicit review.
