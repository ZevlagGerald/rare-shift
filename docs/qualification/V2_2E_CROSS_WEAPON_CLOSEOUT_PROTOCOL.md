# RARE//SHIFT V2-2E — CROSS-WEAPON / FOUR-SLOT CLOSEOUT PROTOCOL

**Status:** ACTIVE QUALIFICATION GATE — OWNER AUTHORIZED  
**Date:** 2026-09-27  
**Source branch:** `feature/v2-2d-signal-arc-rank1`  
**Source HEAD:** `ddc15c53a15c75d637733857a27248b0c1e29b57`  
**Qualification branch:** `qualification/v2-2e-cross-weapon-closeout`  
**Gameplay mutation authorization:** NONE by default — qualification-first. Repair gameplay only if a V2-2E test proves a tranche-local defect.

## 1. Purpose

V2-2A/B/C/D qualified the four new Rank-I weapon families independently. V2-2E closes V2-2 by proving that the complete weapon architecture behaves correctly as one system before any V2-3 Rank II-V, protocol or evolution work begins.

This gate does not add a weapon, add a rank, change balance values, change enemy pacing, change SHIFT timing, merge to `main`, or deploy.

## 2. Locked inherited architecture

The active weapon set remains:

1. DELTA BURST — mandatory slot 1;
2. VECTOR NEEDLE — precision / focused pressure;
3. ORBIT NODES — close defense / reversal;
4. ECHO MINE — phase-memory route denial;
5. SIGNAL ARC — bounded corporeal-graph wave clear.

Only four active weapon slots may exist at one time, including mandatory DELTA. Therefore each legal full build contains DELTA plus exactly three of the four optional Rank-I families.

## 3. V2-2E qualification questions

V2-2E must answer all of these before V2-2 can close:

1. Can all legal DELTA + three-family combinations be represented without exceeding four slots?
2. Does acquisition order remain deterministic and reject the fifth family once capacity is full?
3. Are multiple valid full-build paths possible, rather than one forced sequence?
4. Can three optional weapon systems operate simultaneously in the real Phaser runtime without corrupting each other's state?
5. Do SHIFT-dependent systems retain their own phase contracts while active together?
6. Does a full build remain readable at both 960 and 390 viewport classes?
7. Does reduced-motion mode preserve the full build's mechanics and evidence while shortening presentation effects only?
8. Do runtime object/search surfaces remain hard-bounded under the current Rank-I profiles?
9. Do all inherited V2-1, VECTOR, ORBIT, ECHO and SIGNAL ARC qualifications remain green?

## 4. Deterministic build-state matrix

The deterministic closeout must cover all four possible optional-family exclusions:

- DELTA + VECTOR + ORBIT + ECHO; SIGNAL excluded by capacity;
- DELTA + VECTOR + ORBIT + SIGNAL; ECHO excluded by capacity;
- DELTA + VECTOR + ECHO + SIGNAL; ORBIT excluded by capacity;
- DELTA + ORBIT + ECHO + SIGNAL; VECTOR excluded by capacity.

It must also test every ordered three-family acquisition permutation from the four optional families. After the third optional acquisition:

- `weaponSlotsUsed === 4`;
- the remaining optional family is invalid;
- applying the remaining acquisition throws rather than producing slot 5;
- ordinary draft generation cannot surface that blocked fifth acquisition.

Utilities and DELTA rank-up remain governed by their own validity rules and are not counted as new active weapon slots.

## 5. Bounded runtime-load contract

V2-2E is not final seven-minute stress qualification. It is a bounded cross-system integration gate.

The existing Rank-I hard limits must remain visible and enforced:

- VECTOR maximum in-flight projectiles: bounded by `VECTOR_RANK_I.maxInFlight`;
- ORBIT node count: bounded by `ORBIT_RANK_I.nodeCount`;
- ECHO active mines: bounded by `ECHO_RANK_I.maxActive`;
- SIGNAL ARC path: bounded by `SIGNAL_ARC_RANK_I.maxTargets`;
- enemy pool: bounded by the existing V2-1 active-enemy cap;
- draft weapon capacity: exactly four including DELTA.

No V2-2E proof may require recursive weapon effects, unbounded arrays, injected enemies, injected XP, forced ownership, forced phase, or direct damage hooks.

## 6. Integrated browser proof

At both 960 and 390 viewport classes, a real FriendSDK/Phaser route must naturally acquire and operate a representative 4/4 build through rendered draft UI.

Primary integrated proof build:

`DELTA + ORBIT + ECHO + SIGNAL ARC`

The proof must verify after 4/4 acquisition:

- combat resumes normally;
- ORBIT continues rotating/hitting when legal;
- ECHO continues placement/phase-memory behavior;
- SIGNAL ARC continues automatic bounded chaining;
- DELTA remains the canonical-exclusive identity weapon;
- SHIFT changes phase authority while all three optional systems remain active;
- no active weapon slot exceeds 4;
- no active mine exceeds its cap;
- SIGNAL ARC paths never exceed three targets;
- player survives the bounded observation window;
- no draft/controls deadlock occurs.

A deterministic matrix, rather than four separate long browser runs, will prove the alternate full-build combinations and acquisition orders.

## 7. Reduced-motion proof

At least one integrated full-build browser pass must begin with `prefers-reduced-motion: reduce` or activate the in-game Reduce motion control before the survival scene is mounted.

Qualification requires:

- the same weapon ownership and combat authority;
- the same deterministic gameplay counters/state transitions;
- shortened/less animated presentation only;
- no missing SHIFT, weapon, draft or hit behavior caused by reduced-motion mode.

## 8. Readability evidence

Screenshots must capture:

- the 4/4 build at 960;
- the 4/4 build at 390;
- reduced-motion full-build state;
- a post-SHIFT full-build state.

V2-2E may report visual readability as TECHNICALLY QUALIFIED only for these bounded viewport checks. Physical-phone feel and competition-length swarm readability remain owner/manual gates.

## 9. Required inherited regression gates

The closeout workflow must retain:

- deterministic core tests;
- full V2 combat contracts;
- ART-00 deterministic and browser proofs;
- TypeScript core/game checks;
- FriendSDK archive hash verification;
- `friendsdk check`;
- `friendsdk build`;
- FriendSDK smoke;
- V2-1 browser proof;
- V2-2A VECTOR browser proof;
- V2-2B ORBIT browser proof;
- V2-2C ECHO browser proof;
- V2-2D SIGNAL ARC browser proof;
- dedicated V2-2E integrated browser proof.

## 10. PASS criteria

V2-2E may be marked PASS only if:

- deterministic cross-weapon matrix passes;
- exact four-slot cap is proven across all ordered acquisition permutations;
- at least one real integrated full build passes at 960 and 390;
- reduced-motion full-build proof passes;
- simultaneous ORBIT/ECHO/SIGNAL runtime activity is observed without state corruption;
- inherited qualification gates remain green;
- no gameplay source mutation was required, or any required repair is separately documented and requalified at exact HEAD;
- an evidence artifact is uploaded from the exact qualified HEAD;
- final PROVEN / UNPROVEN / UNKNOWN reconciliation is recorded.

## 11. Explicit non-goals

V2-2E does not authorize or prove:

- Rank II-V;
- protocols;
- EVO;
- CHAIN RESONANCE / PRISM LANCE / SYNC HALO / MEMORY COLLAPSE;
- final seven-minute balance;
- final draft weighting;
- final SHIFT commitment timing;
- BEACON / ANCHOR / FLICKER / elites;
- THE DESYNC;
- RF/economy systems;
- merge to `main`;
- production deployment.

## 12. Advancement rule

A technical PASS closes the V2-2 implementation/automation gate. V2-3 still requires an explicit owner decision after the V2-2E closeout report and owner gameplay-review status are presented.
