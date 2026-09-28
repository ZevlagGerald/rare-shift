# RARE//SHIFT V2-3B1 — DELTA Rank II–V Closeout Report

**Status:** PASS — V2-3B1 CLOSED  
**Date:** 2026-09-28  
**Branch:** `feature/v2-3b1-delta-ranks`  
**Owner-authorized V2-3B baseline:** `ab332a7159342f5d16cbb79e6e5926b669349d69`  
**Exact qualified implementation/test HEAD:** `46310cf6c6fa58cfa576d8a301c8ebbc3b6cc42a`  
**Authoritative workflow:** `36426785759` — SUCCESS

## 1. Authorized scope

V2-3B1 was authorized for DELTA BURST Rank II–V only:

- Rank II — DENSE SAMPLE;
- Rank III — FIELD SCALE;
- Rank IV — PHASE ECHO;
- Rank V — LOCKED IDENTITY;
- deterministic DELTA contracts;
- live production-draft/rank adapter behavior needed to expose an implemented higher rank;
- inherited V2-1 through V2-2E regression qualification.

This tranche does not authorize VECTOR/ORBIT/ECHO/SIGNAL higher ranks, Protocol runtime, Evolution, V2-4 pacing/enemies, `main` merge, or deployment.

## 2. DELTA Rank II–V mechanics — PROVEN

The qualified deterministic DELTA suite is **9/9 PASS** and proves the approved mechanics:

### Rank II — DENSE SAMPLE

- damage `12`;
- cooldown `720 ms`;
- canonical world scale `8.0`;
- I→II cooldown migration preserves readiness proportion;
- no manufactured backlog/free pulse.

### Rank III — FIELD SCALE

- damage `12`;
- cooldown `720 ms`;
- canonical world scale `9.5`;
- exact canonical point membership remains unchanged;
- sparse/dense Friend masks retain equal per-target authority.

### Rank IV — PHASE ECHO

- exact previous-phase canonical geometry;
- delay `140 ms`;
- damage `4`;
- world scale `9.5`;
- independent rearm `650 ms`;
- max pending echo `1`;
- excludes COMMON;
- excludes enemies corporeal in the new phase;
- no ordinary DELTA cooldown reset from SHIFT.

### Rank V — LOCKED IDENTITY

- primary damage `14`;
- cooldown `720 ms`;
- scale `9.5`;
- normal-enemy stagger `90 ms`;
- elite resistance hook bounded to `45 ms`;
- boss default `0 ms`;
- PHASE ECHO does not gain stagger.

## 3. Live runtime integration — PROVEN

The Phaser survival runtime consumes the same rank-aware DELTA profile and PHASE ECHO functions proven above.

Live rank application preserves the approved transition law:

- rank selection does not emit a free DELTA pulse;
- ordinary DELTA readiness migrates proportionally when cooldown changes;
- no cooldown reset/backlog is created;
- Rank IV PHASE ECHO requires a later accepted SHIFT;
- pending echo snapshots its bounded previous-phase profile;
- Rank V stagger comes only from matching-phase primary DELTA.

The inherited same-frame Signal pickup defect discovered during V2-3B1 was also repaired before closeout: once a collected pickup opens a level-up draft, the pickup loop stops for that update and leaves remaining pickups active for later frames. The final 960/390 browser proof confirms the first visible production draft is Level 2 rather than a skipped later level.

## 4. Browser qualification scope correction

The earlier V2-3B1 qualification harness attempted to require a **natural DELTA Rank I→V run** inside the current pre-V2-4 survival pacing.

Review of the Owner-approved V2-3B gate showed that requirement was stricter than the governing contract.

The approved browser gate requires, at both `960` and `390`:

> every family can naturally reach at least one higher rank through the production draft adapter.

It does not require each family to naturally reach Rank V in its individual B1–B5 tranche. Integrated higher-rank browser/readability qualification is explicitly sequenced to **V2-3B6** after all five families exist.

The corrected V2-3B1 browser proof therefore verifies the actual approved responsibility:

- natural first production draft;
- exact Level-2 sequence with no pickup skip;
- real pointer-selected `DELTA_RANK`;
- live Rank I→II transition;
- live Rank-II profile: `12 damage / 720 ms / scale 8`;
- rank selection creates no free primary pulse;
- 960 PASS;
- 390 PASS;
- reduced-motion PASS.

No gameplay numbers were changed to make this proof pass.

## 5. Why natural Rank V is deferred instead of forced

Prior browser investigation established that current **pre-V2-4** survival pressure and XP pacing are not a valid basis for forcing a natural Rank-V proof.

A safe 4/4 onboarding route could reach later levels, but subsequent real drafts repeatedly required FIELD REPAIR to remain alive. In another bounded route, the run survived six minutes but produced too few draft decisions for Rank V. These observations do not establish a DELTA mechanics defect and do not justify:

- inflating XP;
- weakening enemies;
- increasing DELTA raw damage;
- injecting rank state;
- adding hidden free upgrades;
- distorting the progression curve merely for a subsystem test.

Final XP/run pacing and enemy pressure are owned by V2-4.

Therefore:

`NATURAL_DELTA_RANK_V_FINAL_PACING = DEFERRED_TO_V2_4`

This is a declared dependency, not a hidden PASS claim.

## 6. Integrated Rank III–V browser/readability status

Rank III–V mechanics are **not untested**: their numerical, geometry, authority, rearm, migration, and stagger contracts are covered by the 9/9 deterministic DELTA suite and wired into the live runtime.

What remains deferred is the cross-family production browser/readability closeout after all weapon families have higher ranks:

`DELTA_RANK_III_V_INTEGRATED_BROWSER_READABILITY = DEFERRED_TO_V2_3B6`

This follows the approved V2-3B sequence:

1. V2-3B1 DELTA;
2. V2-3B2 VECTOR;
3. V2-3B3 ORBIT;
4. V2-3B4 ECHO;
5. V2-3B5 SIGNAL;
6. V2-3B6 integrated rank/draft/browser qualification.

## 7. Authoritative qualification evidence

### Exact candidate

`46310cf6c6fa58cfa576d8a301c8ebbc3b6cc42a`

### Workflow

`36426785759` — **SUCCESS**

All qualification steps completed successfully:

- deterministic core: **17/17 PASS**;
- V2 combat: **57/57 PASS**;
- V2-2E cross-weapon matrix: **7/7 PASS**;
- draft pointer/cardinality: **5/5 PASS**;
- V2-3A progression: **18/18 PASS**;
- V2-3B1 DELTA deterministic contracts: **9/9 PASS**;
- ART-00 deterministic/browser qualification: **PASS**;
- TypeScript core/game: **PASS**;
- FriendSDK check/build/smoke: **PASS**;
- FriendSDK build size: `6,214,453 bytes`;
- V2-1 960/390: **PASS / PASS**;
- VECTOR Rank-I 960/390: **PASS / PASS**;
- ORBIT Rank-I 960/390: **PASS / PASS**;
- ECHO Rank-I 960/390: **PASS / PASS**;
- SIGNAL ARC Rank-I 960/390: **PASS / PASS**;
- integrated V2-2E 4/4 960/390: **PASS / PASS**;
- V2-2E reduced motion: **PASS**;
- V2-3B1 natural higher-rank adapter 960/390: **PASS / PASS**;
- V2-3B1 pickup-level integrity 960/390: **PASS / PASS**;
- V2-3B1 Rank-II live profile 960/390: **PASS / PASS**;
- V2-3B1 reduced motion: **PASS**.

### Evidence artifact

- name: `rare-shift-v2-3b1-evidence-36426785759`;
- artifact ID: `10971699804`;
- files: `54`;
- size: `1,436,583 bytes`;
- SHA-256: `ff2fc903a80f3db2a50d294497aea680ad4b836e454ecae98b3d507c48dbfd1b`;
- retention expiry: `2026-10-12`.

The separate bounded browser probe also passed at run `36426700202` with 960/390 higher-rank, pickup-integrity, live-profile, and reduced-motion markers.

## 8. Final decision state

`V2_3B1_DELTA_MECHANICS = PASS`

`V2_3B1_DELTA_DETERMINISTIC_CONTRACTS = PASS`

`V2_3B1_LIVE_RANK_ADAPTER = PASS`

`V2_3B1_NATURAL_HIGHER_RANK_ADAPTER_960_390 = PASS`

`V2_3B1_PICKUP_LEVEL_INTEGRITY = PASS`

`V2_3B1_INHERITED_REGRESSION_THROUGH_V2_2E = PASS`

`DELTA_RANK_III_V_INTEGRATED_BROWSER_READABILITY = DEFERRED_TO_V2_3B6`

`NATURAL_DELTA_RANK_V_FINAL_PACING = DEFERRED_TO_V2_4`

`V2_3B1_OVERALL_DECISION = PASS`

`V2_3B1 = CLOSED`

`V2_3B2_VECTOR_RANKS = NOT_STARTED`

`MAIN_MERGE = NOT_AUTHORIZED`

`DEPLOYMENT = NOT_AUTHORIZED`

The next bounded milestone is V2-3B2 — VECTOR NEEDLE Rank II–V. It must not start implicitly from this closeout.