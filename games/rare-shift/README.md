# RARE//SHIFT — T1 SCAN + CHAMBER I / DISCOVER

**Status:** bounded T1 implementation; Chamber II/III and reconstruction remain out of scope.

RARE//SHIFT reads the selected ownership-verified Generations Friend through FriendSDK v0.1.2, evaluates its 64 canonical 16×16 frames, selects a deterministic useful pair, and turns the exact pixel delta into phase-controlled world rules.

> **Your Friend is not a skin. Its animation is the rules.**

## T1 sequence

1. **SCAN** — selected Friend identity and canonical family are shown before gameplay.
2. Exact canonical frame A/B pixel maps are displayed.
3. `COMMON`, `A_ONLY`, `B_ONLY`, and `VOID` are displayed as the canonical XOR/phase field.
4. Pair delta/balance, clip group, proof fingerprint and solver minimum are surfaced.
5. The player explicitly enters **CHAMBER I / DISCOVER**.
6. The qualified two-gate tutorial teaches SPACE/touch SHIFT.
7. Gate A requires the first SHIFT, Gate B requires the second, and EXIT completes Chamber I.

The T0/T0.5 deterministic selector thresholds, chamber topology and solver are unchanged in this tranche.

## Phase authority

- `COMMON = A ∩ B`
- `A_ONLY = A − B`
- `B_ONLY = B − A`
- `DELTA = A XOR B`
- one `A_ONLY` canonical pixel deterministically controls the Phase-A gate
- one `B_ONLY` canonical pixel deterministically controls the Phase-B gate
- the chamber begins in Phase B
- solver minimum is exactly two accepted SHIFT actions for the qualified topology

## Controls

- `WASD` / arrow keys: move one cell
- `Space`: SHIFT Phase A ↔ B
- touch directional buttons + SHIFT: mobile input

The physical Shift key is not bound. SHIFT is rejected when the destination phase would materialize collision under the player's current cell.

## FriendSDK boundary

FriendSDK remains responsible for wallet connection, hardwired generation eligibility, owned-Friend selection and the sandbox/runtime boundary. Phaser receives only already-selected, solver-qualified game data. No parallel wallet flow is implemented.

The economy schema in `game.json` is a FriendSDK reference definition. T1 never invokes `buy`, `play`, `settle`, or `redeem`, spends no RF, and makes no Token Activity claim.

## Development

On Windows PowerShell from the repository root:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\bootstrap.ps1
npm run dev
```

The bootstrap downloads the official FriendSDK v0.1.2 release archive and verifies SHA-256:

`a6352e187916089b6829c5387fe87f386c5774004f181990e4e3c8ae641cfe83`

A playable FriendSDK preview requires a browser wallet on Robinhood mainnet (`4663`) holding a hardwired Generations NFT with generation >= 1.

## Qualification

```powershell
.\scripts\qualify.ps1
```

CI additionally runs FriendSDK smoke and the custom browser proof at 960px and 390px. T1 browser proof must verify both the SCAN stage and the complete Chamber I two-SHIFT traversal.

## T1 acceptance criteria

- selected Friend/session equality is preserved;
- canonical 64-frame read works;
- SCAN visibly exposes Friend identity, family, frame A/B and phase field;
- pair selection and fingerprint remain deterministic;
- ENTER CHAMBER I explicitly transitions into gameplay;
- SHIFT modifies collision/passability;
- Gate A/Gate B behavior remains phase-correct;
- solver proves completion and SHIFT dependency;
- desktop and narrow browser proofs pass;
- reduced-motion mode remains playable;
- no persistent browser storage is required.

## Current limitations

- Chamber I intentionally retains the proven simple authored barrier geometry around source-derived gates.
- Chamber II timing, Chamber III synchronization, reconstruction, final audio and final submission polish are deferred.
- real cross-clip fallback occurrence remains unproven because the canonical nine-family T0.5 corpus qualified entirely through same-clip pairs.
- physical-phone touch qualification remains a separate pre-submission requirement.
