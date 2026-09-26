# RARE//SHIFT — T0 Implementation Report

## Decision

**T0_FRAME_PHASE_PROOF: QUALIFIED — REAL-WALLET PASS; REAL-FRIEND CORPUS GATE NEXT**

The deterministic core, FriendSDK integration, build, canonical SDK smoke test, desktop/mobile browser mechanics, and one real eligible holder-wallet playthrough are qualified. T0 now proves the central RARE//SHIFT premise with an actual owned Rare Friend: canonical animation frames deterministically generate phase-dependent collision, two accepted SHIFT actions are required, and the chamber completes.

T1 gameplay expansion remains blocked until the bounded real-Friend corpus qualification evaluates behavior across all nine Rare Friends families.

## PROVEN

- Frame rows are validated as exact 16×16 `#`/`.` masks.
- `COMMON`, `A_ONLY`, `B_ONLY`, and `VOID` are derived exactly from two frames.
- Candidate selection prefers two qualifying frames from the same eight-frame canonical clip.
- Selection and tie-breaking are deterministic.
- The proof chamber fingerprint is deterministic from frame indices and exact frame rows.
- Gate A is sourced from a real `A_ONLY` pixel and Gate B from a real `B_ONLY` pixel.
- Chamber collision changes by phase.
- The solver proves the exit is reachable.
- The solver proves the start phase cannot complete without SHIFT.
- The T0 topology requires a minimum of exactly two SHIFT actions.
- 128 additional deterministic two-way synthetic frame pairs preserve the same solver invariant.
- Node core suite: 4 tests PASS, 0 fail.
- Full TypeScript compile against the pinned dependencies passes.
- FriendSDK v0.1.2 archive is verified before use against SHA-256 `a6352e187916089b6829c5387fe87f386c5774004f181990e4e3c8ae641cfe83`.
- `friendsdk check` passes.
- `friendsdk build` passes.
- Canonical `friendsdk test` automated fixture passes at 960px.
- Custom RARE//SHIFT mechanical browser proof passes at 960px.
- Custom RARE//SHIFT mechanical browser proof passes at 390px.
- The custom browser proof verifies Gate A blocks in Phase B, becomes passable after the first SHIFT, Gate B blocks in Phase A, becomes passable after the second SHIFT, and the exit completes after exactly two accepted SHIFT actions.
- Browser qualification runs in the version-matched `mcr.microsoft.com/playwright:v1.63.0-noble` container with Node 24.
- CI screenshot evidence is generated and hash-verified for the SDK smoke, 960px proof, and 390px proof.
- Successful baseline CI qualification run: GitHub Actions run `36239056226`, commit `4890e0e6da6fbdaa8d0eea18dd5edf76dc630dab`.
- Baseline screenshot SHA-256 values:
  - smoke: `db08ba2a1c26864101a9c7a684bce5f848f461884a7402966ec4c185eed72865`
  - 960px: `e56749db759236bb7d32f6e6ea9d71497bf393fa028cf519fba150ae7911cffa`
  - 390px: `844b769107788cb855851779c6506534f473f52002f2776cccccdf693b2ddaf6`
- Baseline CI evidence artifact ZIP digest: `sha256:ab7e1b32e61f94e3b45115ff75bc9b7125be1fadae991754961a2884708d52cd`.
- FriendSDK is not reimplemented: the React boundary calls the SDK's `createFriendReader()` and trusted `client.read()`.
- Phaser is mounted only after Friend/session equality and solver acceptance pass.
- No localStorage, IndexedDB, backend, signing flow, or parallel wallet flow is used.

## REAL HOLDER-WALLET QUALIFICATION

A real local FriendSDK runtime playthrough completed using owned Friend `#13699` through the SDK's wallet/ownership-gated preview flow.

Observed deterministic real-Friend evidence:

- Friend: `#13699`.
- Selected canonical frame pair: `33 ↔ 34`.
- Chamber fingerprint: `fdef6617`.
- Solver minimum: `2 SHIFTs`.
- Initial Phase B blocks the first phase gate.
- First accepted SHIFT changes the canonical frame/phase and permits traversal of the first gate.
- Phase A blocks the second phase gate.
- Second accepted SHIFT returns to Phase B and permits traversal of the second gate.
- EXIT is reached and `PROOF COMPLETE` is displayed.
- Reduced-motion mode remains playable through completion.
- Reloading and selecting the same Friend reproduces frame pair `33 ↔ 34`, fingerprint `fdef6617`, solver minimum `2`, and initial Phase B.

This qualifies one real Friend and the end-to-end holder-wallet path. It does not establish population-wide or family-wide behavior.

## QUALIFICATION DEFECTS FOUND AND RESOLVED

### Browser input timing

The first CI browser run exposed a test-input timing defect: immediately bursting keyboard events after a phase-render transition could leave the test at Gate B even though Phase B and the two accepted SHIFTs were correct. The game collision rules were not weakened or changed.

The browser harness was repaired to settle each simulated key input for one animation frame and contains an explicit assertion that the first move after the second SHIFT enters Gate B. The strengthened proof passes at both 960px and 390px.

### SHIFT control ambiguity and phase-panel overlap

Real-wallet testing exposed two UI defects:

- the visible `Space / SHIFT` wording could be misread as an instruction to press the physical Shift key, which can interact poorly with operating-system Sticky Keys behavior;
- the phase/frame label overlapped the `CANONICAL XOR` heading.

The repair keeps `SHIFT` as the mechanic name while binding keyboard activation to **SPACE** only; touch/mouse users retain the on-screen `SHIFT` button. The physical Shift key remains unbound. The initial instruction now reads `Press SPACE to SHIFT phase`, and the phase/XOR panel spacing is separated.

UI-repair qualification:

- repair commit: `f39394348b924ae6c1d2407449d356c29967bab2`.
- GitHub Actions run: `36239903133`.
- core tests PASS.
- TypeScript PASS.
- FriendSDK check PASS.
- build PASS.
- FriendSDK smoke PASS.
- 960px browser proof PASS.
- 390px browser proof PASS.
- screenshot verification PASS.
- CI evidence artifact digest: `sha256:f20787307bb3eae5bb0b50d864f50df7bedf014c0525e1a3557ffca46351990d`.
- generated CI screenshot review confirms the phase/frame label no longer overlaps `CANONICAL XOR` and the SPACE instruction is visible.

## STILL UNPROVEN / OPEN

- physical-phone touch playthrough.
- behavior across a real corpus covering all nine Rare Friends families.
- percentage of real Friends that qualify using a same-clip pair.
- cross-clip fallback rate.
- whether any real Friend has no pair satisfying the current T0 thresholds.
- whether T0 pair scoring needs family-specific normalization.
- whether Colossus or any other family needs family-specific handling beyond the canonical SDK sprite behavior.

Do not tune thresholds from intuition. Collect real corpus evidence first.

## Gate before T1

T0 acceptance requirements are satisfied:

- `CORE_TESTS=PASS`
- `TYPECHECK=PASS`
- `FRIENDSDK_CHECK=PASS`
- `BUILD=PASS`
- `FRIENDSDK_SMOKE=PASS`
- `RARE_SHIFT_BROWSER_960=PASS`
- `RARE_SHIFT_BROWSER_390=PASS`
- screenshot evidence PASS
- real eligible holder-wallet playthrough PASS
- real selected Friend canonical-frame retrieval PASS
- real phase-dependent collision and two-SHIFT completion PASS
- same-Friend reload determinism PASS

**Next gate:** run the bounded real-Friend corpus qualification before promoting more of the phase field into T1's final chamber topology. Physical-phone touch qualification remains a separate pre-submission requirement and is not implied by the automated 390px proof.
