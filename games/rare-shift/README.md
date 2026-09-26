# RARE//SHIFT — T0 Frame/Phase Proof

**Status:** engineering proof, not final Vibeathon presentation.

RARE//SHIFT reads the selected ownership-verified Generations Friend through FriendSDK v0.1.2, evaluates its 64 canonical 16×16 frames, selects a useful pair from the same eight-frame animation clip where possible, and turns their exact pixel delta into a two-phase collision proof.

## T0 proof

- `COMMON = A ∩ B`
- `A_ONLY = A − B`
- `B_ONLY = B − A`
- `DELTA = A XOR B`
- one `A_ONLY` canonical pixel deterministically controls the Phase-A gate
- one `B_ONLY` canonical pixel deterministically controls the Phase-B gate
- the proof begins in Phase B, so the first A gate requires SHIFT and the later B gate requires another SHIFT
- a deterministic 0-1 BFS validates that the exit is reachable and reports the minimum number of SHIFT actions
- the Phaser scene is not mounted if the solver acceptance gate fails

The T0 chamber intentionally uses simple authored barrier geometry around the source-derived gates. Later production tranches may promote more of the 16×16 phase field into topology only after corpus testing proves generation safety.

## Controls

- `WASD` / arrow keys: move one cell
- `Space`: SHIFT Phase A ↔ B
- touch directional buttons + SHIFT: mobile input

SHIFT is rejected when the destination phase would materialize collision under the player's current cell.

## FriendSDK boundary

FriendSDK remains responsible for wallet connection, eligible Friend selection and the sandbox/runtime boundary. Phaser receives only already-selected game data. No parallel wallet flow is implemented.

The economy schema in `game.json` is a reference definition required by the SDK; this T0 proof never invokes `buy`, `play`, `settle`, or `redeem` and makes no Token Activity claim.

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

The bounded qualification runs core deterministic tests, TypeScript, FriendSDK validation, static build, and the SDK browser test with screenshot output.

## T0 acceptance criteria

- canonical 64-frame read works
- same-frame pair selection is deterministic
- same Friend/frame pair creates the same fingerprint/chamber
- SHIFT modifies collision/passability
- solver proves completion
- solver proves SHIFT is necessary
- SDK ownership/runtime boundary remains unchanged
- no persistent browser storage is required

## Current limitations

- T0 uses only two source-derived phase gates as collision authority; it is not the final three-chamber design.
- final art, audio, economy, scan sequence and reconstruction sequence are intentionally deferred.
- a real-wallet hosted playthrough is still required before this tranche can be marked fully qualified.
