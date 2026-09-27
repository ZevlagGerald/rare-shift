# RARE//SHIFT V2-1 — COMBAT SANDBOX QUALIFICATION PROTOCOL

**Status:** ACTIVE — IMPLEMENTATION TRANCHE  
**Branch:** `feature/v2-1-combat-sandbox`  
**Base:** qualified `V2-ART-00` closeout `2307bf5bf5d89ccd751ef83274411d6c35cb3c06`  
**Scope:** first 30–60 seconds of survivor combat only

## 1. Purpose

V2-1 proves the smallest complete action loop before weapon breadth, EVO, bosses or RF economy are admitted.

Primary question:

> Is moving, surviving, auto-firing the selected Friend's canonical DELTA BURST, SHIFTing between A/B threat authority, collecting Signal XP and choosing a level upgrade readable and mechanically coherent enough to continue?

V2-1 is a qualification tranche, not the seven-minute game.

## 2. Inherited authority

V2-1 inherits without modification:

- V2 master implementation baseline;
- V2 survival governance;
- V2 visual/asset governance;
- V2 three-category governance;
- qualified V2-ART-00 procedural visual grammar;
- FriendSDK v0.1.2 wallet/Friend/canonical-sprite authority;
- frozen T4 fallback remains untouched.

## 3. Required runtime loop

The V2-1 playable path must demonstrate:

`SCAN → SIGNAL DESCENT → MOVE → AUTO DELTA BURST → A/B/COMMON ENEMIES → SHIFT → KILL → SIGNAL XP → LEVEL 2 → EXACTLY THREE CHOICES → SELECT DELTA BURST II → CONTINUE COMBAT`

The sandbox may continue after the qualification interaction; no boss or end-run result is required in V2-1.

## 4. Canonical Friend requirements

- Use the selected Friend's exact already-qualified canonical A/B pair.
- Render the currently active canonical pose without redraw/recolor.
- DELTA BURST Phase A geometry must derive from exact `A_ONLY` pixels.
- DELTA BURST Phase B geometry must derive from exact `B_ONLY` pixels.
- More DELTA pixels may create broader geometry but may not automatically increase total hit damage.
- Switching Friend must be capable of changing DELTA geometry while keeping the same rank damage contract.

## 5. Phase combat contract

Initial threat roles:

- `TRACE` = COMMON; corporeal/dangerous in A and B.
- `SPLIT_A` = corporeal/dangerous only in A.
- `SPLIT_B` = corporeal/dangerous only in B.

Off-phase split enemies remain visible but ghosted and cannot deal contact damage.

SHIFT must:

- toggle A ↔ B;
- swap the displayed canonical Friend pose;
- immediately change which SPLIT enemies are corporeal;
- never purchase or grant power;
- remain keyboard (`Space`) and touch accessible.

## 6. DELTA BURST V2-1 contract

DELTA BURST auto-fires. V2-1 supports Rank I and at least Rank II.

Rank changes may improve bounded damage/cadence. Canonical pixel count must not directly multiply damage.

Each firing event may damage a target at most once even when multiple projected DELTA pixels overlap it.

Exact tuning is PROVISIONAL; deterministic geometry and normalization are LOCKED.

## 7. Movement / damage

- world is larger than the 960×640 viewport;
- camera follows the Friend;
- desktop movement: WASD/arrows;
- touch: virtual joystick foundation;
- player HP is visible;
- contact damage has a bounded invulnerability window;
- off-phase SPLIT contact cannot damage;
- death/restart polish is not required for V2-1, but zero HP must fail closed rather than continue as alive.

## 8. Enemy pooling / performance

V2-1 must use bounded reusable enemy objects rather than unbounded creation.

Initial active-enemy cap is a safety ceiling, not a performance claim. Browser qualification must report observed active counts and frame/readability evidence before later raising the cap.

## 9. Signal XP and draft

- defeated enemies drop Signal XP;
- pickups are visibly non-hostile;
- pickup collection increments deterministic XP;
- crossing the level threshold opens a draft and pauses combat simulation;
- exactly three distinct choices are shown;
- V2-1 must include `DELTA BURST II` as a selectable upgrade when Rank I;
- selection must resume combat exactly once;
- pointer/touch and keyboard selection must work.

The two other V2-1 choices may be bounded utility choices; they are not proof of the full protocol/evolution system.

## 10. Determinism

Qualification uses a fixed seed.

The same seed + elapsed spawn index must reproduce:

- enemy kind sequence;
- spawn-side/position contract;
- draft ordering.

Player movement remains player-controlled and is not expected to be deterministic.

## 11. Pure-module requirements

Before Phaser qualification, pure deterministic modules must cover:

- enemy phase authority;
- DELTA geometry and normalization;
- DELTA rank damage/cadence contract;
- seeded spawning;
- XP thresholds;
- exactly-three draft generation;
- draft application;
- bounded V2-1 qualification predicate.

## 12. Browser qualification

Required automated widths:

- 960 reference host;
- ~390 narrow host.

Browser evidence must demonstrate:

- survival canvas mounts after SCAN;
- Friend identity/frame pair remains unchanged;
- movement changes world position;
- at least one accepted SHIFT changes phase;
- TRACE and split threats coexist;
- at least three kills occur through gameplay;
- XP reaches Level 2;
- exactly three draft cards appear;
- DELTA BURST II can be selected;
- gameplay resumes at Rank II;
- no SDK chrome covers critical controls;
- reduced-motion mode remains usable.

Physical-phone feel remains a later release gate, but the touch controls must already function in automation.

## 13. Admission threshold

A deterministic sandbox evidence state is considered interaction-complete only when all are true:

- elapsed active combat ≥ 20 seconds;
- HP > 0;
- kills ≥ 3;
- accepted SHIFTs ≥ 1;
- level ≥ 2;
- DELTA BURST rank ≥ 2.

This is a qualification predicate, not a player score.

## 14. Non-goals

V2-1 does not authorize:

- remaining four weapon families;
- protocols/evolution system;
- BEACON/ANCHOR/FLICKER;
- elites or THE DESYNC;
- complete seven-minute pacing;
- Signal Contracts / RF ledger / Deep Scan / Signal Forge;
- multiplayer/backend;
- merge to `main`;
- public production deployment;
- Vibeathon submission.

## 15. Decision gate

`V2_1_COMBAT_SANDBOX=PASS`

requires pure tests + TypeScript + FriendSDK check/build + 960/narrow browser interaction evidence + manual visual/readability review.

Fun remains a human evaluation. Automated PASS may prove the loop works; it may not claim the loop is fun.