# RARE//SHIFT V2-3B1 — DELTA Rank II–V HOLD Report

**Status:** HOLD — DELTA IMPLEMENTATION TECHNICALLY GREEN; LIVE PROGRESSION INTEGRITY BLOCKER FOUND  
**Date:** 2026-09-28  
**Branch:** `feature/v2-3b1-delta-ranks`  
**Owner-authorized V2-3B baseline:** `ab332a7159342f5d16cbb79e6e5926b669349d69`  
**Latest browser-route HEAD before this report:** `bd194a1463d572ce6601546e70ce3d01311efbdd`

## 1. Authorized scope

V2-3B1 was authorized for DELTA BURST Rank II–V only:

- Rank II DENSE SAMPLE;
- Rank III FIELD SCALE;
- Rank IV PHASE ECHO;
- Rank V LOCKED IDENTITY;
- deterministic DELTA contracts;
- live DELTA rank/draft integration necessary to expose implemented ranks;
- inherited V2-1 through V2-2E regression qualification.

It did not authorize VECTOR/ORBIT/ECHO/SIGNAL higher ranks, Protocol runtime, EVO, V2-4 pacing/enemies, `main` merge, or deployment.

## 2. DELTA implementation — PROVEN

Deterministic DELTA Rank II–V tests are green at 9/9 and prove:

- exact Rank I–V profiles;
- Friend pixel density does not alter raw DELTA authority;
- Rank III changes world-space canonical placement without changing canonical point membership;
- Rank I→II cooldown migration preserves readiness proportion without manufacturing backlog;
- Rank IV PHASE ECHO uses exact previous-phase geometry with bounded authority;
- PHASE ECHO excludes COMMON and newly corporeal opposite-set targets;
- independent 650 ms PHASE ECHO rearm is exact;
- Rank V normal/elite/boss stagger hooks are bounded;
- invalid rank states are rejected.

The live runtime also preserves the approved rank-transition rules:

- no rank-up emits a free DELTA pulse;
- no rank-up resets ordinary DELTA cooldown;
- Rank IV echo is scheduled only by a later accepted SHIFT;
- pending echo snapshots its profile;
- Rank V stagger applies only to matching-phase primary DELTA.

## 3. Inherited regression — PROVEN on full qualification run through V2-2E

On full V2-3B1 qualification run `36334641624`, before the new natural Rank-II–V browser proof completed, all of the following were green:

- inherited deterministic core tests;
- inherited V2 combat deterministic contracts;
- V2-2E cross-weapon deterministic matrix;
- V2-2 pointer-cardinality regression;
- V2-3A progression contracts;
- V2-3B1 DELTA contracts;
- ART-00 regression;
- TypeScript;
- FriendSDK check/build/smoke;
- V2-1 browser proof;
- VECTOR Rank-I browser proof;
- ORBIT Rank-I browser proof;
- ECHO Rank-I browser proof;
- SIGNAL ARC Rank-I browser proof;
- integrated V2-2E 4/4 browser proof.

Therefore no inherited combat regression is currently demonstrated by the DELTA Rank II–V implementation.

## 4. Qualification-route findings

### 4.1 Early route deaths were harness movement, not established DELTA balance defects

Initial natural browser routes traced a tiny four-step square around spawn and repeatedly died near Level 5.

A wide-perimeter movement route materially changed the result:

- survived the entire six-minute qualification window;
- reached Level 7;
- finished at 65 HP after taking a real FIELD REPAIR;
- accumulated 120 kills;
- maintained a full 4/4 active build.

Accordingly the earlier deaths are not sufficient evidence to change DELTA damage, enemy damage, spawn rate, or XP pacing.

`DELTA_BALANCE_DEFECT_FROM_EARLY_BROWSER_DEATHS = NOT_PROVEN`

### 4.2 Natural Rank-V proof is currently blocked by pre-V2-4 pacing

The wide-perimeter route still reached only DELTA Rank II during the bounded six-minute proof.

Current XP/draft pacing therefore does not provide enough ordinary draft decisions to prove Rank V naturally within that horizon.

Final XP/run pacing is owned by V2-4. V2-3B1 must not inflate XP, weaken enemies, or add hidden rank grants merely to satisfy a subsystem browser test.

`NATURAL_DELTA_RANK_V_WITH_CURRENT_PRE_V2_4_PACING = UNPROVEN`

`FINAL_RANK_V_REACHABILITY_IN_TARGET_RUN = DEFERRED_TO_V2_4_PACING`

## 5. Progression-integrity blocker — PROVEN defect

The wide-perimeter telemetry exposed a separate inherited live-progression bug: the first visible draft could occur at Level 3 rather than Level 2.

Current Phaser update law is:

1. a frame starts with `draftOpen == false`;
2. `updatePickups()` iterates all active overlapping pickups;
3. the first collected pickup may cross an XP threshold and call `openDraft()`;
4. the same `for` loop continues processing additional pickups during that frame;
5. another pickup may advance another level and call `openDraft()` again before the next frame reaches the top-level `draftOpen` pause guard.

This means multiple pickups collected in one frame can advance more than one level while preserving only one visible draft decision.

That violates the progression contract that each level-up produces its corresponding choice opportunity.

`SAME_FRAME_MULTI_PICKUP_LEVEL_SKIP = PROVEN`

`LIVE_PROGRESSION_INTEGRITY = FAIL`

## 6. Required bounded repair before V2-3B1 closeout

Recommended repair scope:

- once a pickup opens a level-up draft, stop processing additional pickups in that update;
- leave remaining pickups active/unconsumed;
- combat remains paused while the draft is open;
- after the player chooses, remaining pickups may be collected normally on later updates;
- no XP is discarded;
- no free/duplicate draft is manufactured;
- add regression proof that a clustered pickup frame cannot skip Level-2/Level-N draft decisions;
- rerun all inherited tests plus V2-3B1 qualification.

This is an inherited live-progression integrity repair, not a DELTA balance change.

## 7. Decision state

`V2_3B1_DELTA_CORE_MECHANICS = PROVEN`

`V2_3B1_DELTA_UNIT_CONTRACTS = PASS`

`V2_3B1_INHERITED_RUNTIME_REGRESSION_THROUGH_V2_2E = PASS`

`V2_3B1_NATURAL_RANK_V_BROWSER = UNPROVEN`

`SAME_FRAME_MULTI_PICKUP_LEVEL_SKIP = PROVEN`

`V2_3B1_OVERALL = HOLD`

`V2_3B2_VECTOR_RANKS = BLOCKED`

`MAIN_MERGE = NOT_AUTHORIZED`

`DEPLOYMENT = NOT_AUTHORIZED`

The next legitimate action is the bounded same-frame pickup / level-up integrity repair followed by exact-head requalification. The V2-3B1 gate must not be closed by weakening its assertions or changing combat balance to satisfy the harness.