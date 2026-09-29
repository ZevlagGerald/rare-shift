# RARE//SHIFT — Vibeathon Submission Build

**Status:** submission-ready V2 survival-action MVP with DELTA, VECTOR, ORBIT, ECHO, and SIGNAL weapon progression qualified through Rank V.

RARE//SHIFT uses FriendSDK v0.1.2 to ownership-verify a selected Rare Friends Generations NFT, reads its canonical animation, and makes that animation part of the combat rules. The Friend's canonical frame delta drives DELTA weapon geometry while the arena flips between Phase A and Phase B.

> **Your Friend is not a skin. Its animation is the rules.**

## Public preview

https://zevlaggerald.github.io/rare-shift/

Requirements:

- browser wallet;
- Robinhood mainnet (`4663`);
- hardwired Generations NFT, generation 1 or higher.

No RF funding or transaction signature is required for the submitted MVP.

## Gameplay

RARE//SHIFT is a movement-and-phase-reading survival game with auto-fire.

- A-aligned threats are corporeal in Phase A and ghosted in Phase B.
- B-aligned threats are corporeal in Phase B and ghosted in Phase A.
- COMMON threats remain corporeal in both phases.
- SHIFT changes target authority and phase-sensitive weapon behavior.
- Level-up drafts expand the build through weapon acquisition and rank progression.

### Controls

- `WASD` / arrow keys — move
- `Space` — SHIFT Phase A ↔ B
- touch controls — move and SHIFT on supported narrow screens
- click/tap draft cards — choose upgrades
- weapons auto-fire

## Active weapons

Exactly four active weapon slots are available; DELTA is mandatory.

- **DELTA BURST** — canonical Friend geometry, stronger cadence/scale, phase echo progression
- **VECTOR NEEDLE** — penetration, priority trace, post-SHIFT transfer, vector lock
- **ORBIT NODES** — multi-node coverage, stable orbit, phase shear, synchronized ring
- **ECHO MINE** — leave/return phase memory, wider collapse, fast recall, deep memory
- **SIGNAL ARC** — extra relay, lower decay, resonant COMMON relay, chain-control routing

Each family is qualified from Rank I through Rank V.

## Development

From the repository root with Node.js 22+:

```sh
mkdir -p vendor
curl -L -o vendor/rarefriends-friendsdk-0.1.2.tgz \
  https://github.com/spokesz/friendsdk/releases/download/v0.1.2/rarefriends-friendsdk-0.1.2.tgz
npm install --no-audit --no-fund
npm run dev
```

The FriendSDK release archive is verified in CI against SHA-256:

`a6352e187916089b6829c5387fe87f386c5774004f181990e4e3c8ae641cfe83`

## Build and validate

```sh
npm run typecheck
npm run check
npm run build
npm run test:sdk
```

Higher-rank deterministic/browser qualification includes:

```sh
npm run test:v2-3b1-delta
npm run test:v2-3b2-vector
npm run test:v2-3b3-orbit
npm run test:v2-3b4-echo
npm run test:v2-3b5-signal
npm run test:v2-3b5-signal-browser
```

Exact qualified B5 gameplay/test head:

`66e2b17cfaa94ba197cd4f77875008bfc87a3b81`

Authoritative workflow run:

`36530277127` — PASS

## FriendSDK boundary

FriendSDK remains responsible for wallet connection, Robinhood-network handling, hardwired generation eligibility, owned-Friend selection, and the sandbox/runtime boundary. RARE//SHIFT does not implement a parallel wallet flow.

The submitted gameplay does not invoke live RF spending or real-money transactions. Economy expansion remains simulated/deferred.

## Known limitations / deferred work

- Protocol/evolution runtime is not part of the submission-critical MVP.
- Elite/boss pacing and final tournament-scale progression are future tranches.
- Persistent saves are not supplied by the current FriendSDK session model.
- Direct browser observation of Rank-V ECHO third-hit suppression is deferred until a legitimate higher-HP threat exists; the burst ledger is deterministic-tested.
- Final audio/presentation polish can continue after the contest submission is safely open.
