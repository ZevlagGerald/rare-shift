# RARE//SHIFT — T0 Implementation Report

## Decision

**T0_FRAME_PHASE_PROOF: AUTOMATED QUALIFICATION PASS — REAL-WALLET GATE REMAINS OPEN**

The deterministic core, FriendSDK integration, build, canonical SDK smoke test, and RARE//SHIFT desktop/mobile browser mechanics are now qualified. The remaining T0 acceptance item is a real eligible holder-wallet playthrough on Robinhood mainnet (4663), followed by the planned real-Friend corpus qualification.

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
- Successful CI qualification run: GitHub Actions run `36239056226`, commit `4890e0e6da6fbdaa8d0eea18dd5edf76dc630dab`.
- Successful screenshot SHA-256 values:
  - smoke: `db08ba2a1c26864101a9c7a684bce5f848f461884a7402966ec4c185eed72865`
  - 960px: `e56749db759236bb7d32f6e6ea9d71497bf393fa028cf519fba150ae7911cffa`
  - 390px: `844b769107788cb855851779c6506534f473f52002f2776cccccdf693b2ddaf6`
- CI evidence artifact ZIP digest: `sha256:ab7e1b32e61f94e3b45115ff75bc9b7125be1fadae991754961a2884708d52cd`.
- FriendSDK is not reimplemented: the React boundary calls the SDK's `createFriendReader()` and trusted `client.read()`.
- Phaser is mounted only after Friend/session equality and solver acceptance pass.
- No localStorage, IndexedDB, backend, signing flow, or parallel wallet flow is used.

## QUALIFICATION DEFECT FOUND AND RESOLVED

The first CI browser run exposed a test-input timing defect: immediately bursting keyboard events after a phase-render transition could leave the test at Gate B even though Phase B and the two accepted SHIFTs were correct. The game collision rules were not weakened or changed.

The browser harness was repaired to settle each simulated key input for one animation frame and now contains an additional explicit assertion that the first move after the second SHIFT enters Gate B. The strengthened proof then passed at both 960px and 390px.

## STILL UNPROVEN / OPEN

- real eligible holder-wallet run on Robinhood mainnet (chain 4663).
- real selected Friend canonical-frame retrieval outside the automated fixture.
- physical-phone touch playthrough.
- behavior across a real corpus covering all nine Rare Friends families.
- percentage of real Friends that qualify using a same-clip pair.
- cross-clip fallback rate.
- whether any real Friend has no pair satisfying the current T0 thresholds.
- whether T0 pair scoring needs family-specific normalization.

Do not tune thresholds from intuition. Collect real corpus evidence first.

## Acceptance gate before T1

Automated requirements are satisfied:

- `CORE_TESTS=PASS`
- `TYPECHECK=PASS`
- `FRIENDSDK_CHECK=PASS`
- `BUILD=PASS`
- `FRIENDSDK_SMOKE=PASS`
- `RARE_SHIFT_BROWSER_960=PASS`
- `RARE_SHIFT_BROWSER_390=PASS`
- screenshot evidence PASS

T1 must not begin until at least one real eligible holder-wallet playthrough is completed on Robinhood mainnet. After that, run the bounded mainnet corpus reader before promoting more of the phase field into final chamber topology.
