# RARE//SHIFT

**Your Friend is not a skin. Its animation is the rules.**

RARE//SHIFT is a Rare Friends Vibeathon survival-action roguelite where the selected Rare Friend's canonical animation drives the signature weapon geometry and the battlefield's A/B phase law.

## Play

**Public FriendSDK preview:** https://zevlaggerald.github.io/rare-shift/

The preview requires:

- a browser wallet;
- Robinhood mainnet (`4663`);
- a hardwired Rare Friends Generations NFT, generation 1 or higher.

The preview uses the FriendSDK ownership gate. No RF funding or transaction signature is required for the submitted gameplay MVP.

## Competition

- Event: Rare Friends Vibeathon 2026
- Primary category: **Character Spotlight**
- Builder: **Gerald / ZevByte**
- GitHub: `@ZevlagGerald`
- X: `@IiGalvez`
- FriendSDK: **v0.1.2**
- Engine: **Phaser 4.2.1**

## Core interaction

Move through an escalating arena while auto-firing phase-aware weapons. Press **SHIFT** to flip the battlefield between Phase A and Phase B:

- A-aligned threats are corporeal in A and ghosted in B;
- B-aligned threats are corporeal in B and ghosted in A;
- COMMON threats remain dangerous in both;
- SHIFT rewrites target authority, weapon behavior, and battlefield phase;
- the selected Friend's canonical animation determines DELTA weapon geometry rather than acting as a cosmetic skin.

### Controls

- `WASD` / arrow keys — move
- `Space` — SHIFT Phase A ↔ B
- touch controls — movement and SHIFT on supported narrow screens
- draft cards — click/tap to choose upgrades
- weapons auto-fire

## Qualified weapon system

Four active weapon slots are available, with DELTA mandatory as the identity weapon:

1. **DELTA BURST** — canonical Friend geometry and phase echo progression
2. **VECTOR NEEDLE** — fixed-ray penetration, post-SHIFT transfer, priority lock
3. **ORBIT NODES** — phase-reversing orbit, shear, synchronized ring
4. **ECHO MINE** — leave/return phase memory, deeper collapse progression
5. **SIGNAL ARC** — deterministic relay graph, resonant COMMON extension, chain control

All five families have qualified Rank I→V behavior. Optional weapon families change geometry and tactical coverage rather than creating an NFT rarity power ladder.

## Progression

- exactly 4 active weapon slots;
- weapons rank I→V;
- deterministic legality-first draft system;
- normal level-up presents exactly 3 distinct legal state-changing choices when the current production pool supports them;
- one free deterministic REFRACT reroll in the normalized progression model;
- no paid rerolls or pay-to-win progression in the submitted MVP.

Protocol/evolution expansion and later pacing content remain future work and are not required to play the qualified submission build.

## Verification

The current submission line has passed:

- deterministic combat/progression tests;
- TypeScript qualification;
- FriendSDK `check`, build, and smoke validation;
- automated browser qualification at `960` and `390` widths;
- reduced-motion checks;
- inherited regression through DELTA, VECTOR, ORBIT, ECHO, and SIGNAL Rank II–V tranches.

The exact B5 qualified gameplay/test head is:

`66e2b17cfaa94ba197cd4f77875008bfc87a3b81`

Authoritative B5 workflow run:

`36530277127` — PASS

## Run locally

Node.js 22+ is required. The repository pins FriendSDK v0.1.2 by verified release archive.

```sh
mkdir -p vendor
curl -L -o vendor/rarefriends-friendsdk-0.1.2.tgz \
  https://github.com/spokesz/friendsdk/releases/download/v0.1.2/rarefriends-friendsdk-0.1.2.tgz
npm install --no-audit --no-fund
npm run dev
```

Useful qualification commands:

```sh
npm run typecheck
npm run check
npm run build
npm run test:sdk
npm run test:v2-3b5-signal
npm run test:v2-3b5-signal-browser
```

## Known limitations

- The submitted MVP has no live RF spending or real-money economy action; economy-related future features remain simulated/deferred.
- FriendSDK session state is not a persistent save system.
- Direct browser proof of the Rank-V ECHO third-hit burst suppression is deferred until a legitimate higher-HP V2-4 threat exists; the `2 hits / target / rolling 250 ms` ledger is fully deterministic-tested now.
- Additional Protocol/evolution, elite/boss, final pacing, audio, and tournament-scale content are post-submission expansion work.

## Privacy

This public repository must not contain private keys, seed phrases, wallet secrets or credentials. The designated competition wallet remains private-by-default unless the organizer specifically requires disclosure.
