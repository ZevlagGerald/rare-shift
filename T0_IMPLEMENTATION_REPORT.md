# RARE//SHIFT — T0 Implementation Report

## Decision

**T0_FRAME_PHASE_PROOF: IMPLEMENTED — PARTIALLY QUALIFIED**

The deterministic core is qualified locally. Full FriendSDK + Phaser runtime qualification remains pending because this build environment cannot download npm/GitHub dependencies or provide an eligible holder wallet.

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
- Pure-core TypeScript strict checking passes in the build environment.
- Node test suite: 4 tests PASS.
- FriendSDK is not reimplemented: the React boundary calls the SDK's `createFriendReader()` and trusted `client.read()`.
- Phaser is mounted only after Friend/session equality and solver acceptance pass.
- No localStorage, IndexedDB, backend, signing flow, or parallel wallet flow is used.
- A FriendSDK browser qualification script has been authored for 960px and 390px and asserts real collision changes through the sandboxed game frame.

## UNPROVEN IN THIS ENVIRONMENT

- npm installation of Phaser/React/Playwright.
- full TypeScript compile against actual Phaser 4.2.1 declarations.
- `friendsdk check`.
- `friendsdk build`.
- `friendsdk test` smoke check.
- custom FriendSDK browser interaction check.
- a real holder-wallet run on Robinhood mainnet.
- behavior across a real corpus covering all nine Rare Friends families.

These are explicitly included in `scripts/bootstrap.ps1` and `scripts/qualify.ps1` for the owner's Windows environment.

## UNKNOWN UNTIL CORPUS QUALIFICATION

- percentage of real Friends that qualify using a same-clip pair.
- cross-clip fallback rate.
- whether any real Friend has no pair satisfying the current T0 thresholds.
- whether T0 pair scoring needs family-specific normalization.

Do not tune thresholds from intuition. Collect real corpus evidence first.

## Acceptance gate before T1

T1 must not begin until the owner's environment reports:

- `CORE_TESTS=PASS`
- `TYPECHECK=PASS`
- `FRIENDSDK_CHECK=PASS`
- `BUILD=PASS`
- `FRIENDSDK_SMOKE=PASS`
- `RARE_SHIFT_BROWSER=PASS`
- at least one real eligible holder-wallet playthrough completed

Then run a bounded mainnet corpus reader before promoting more of the phase field into final chamber topology.
