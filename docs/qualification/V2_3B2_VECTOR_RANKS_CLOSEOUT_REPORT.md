# RARE//SHIFT V2-3B2 — VECTOR NEEDLE RANK II–V CLOSEOUT REPORT

**Status:** PASS — V2-3B2 CLOSED  
**Date:** 2026-09-29  
**Branch:** `feature/v2-3b2-vector-ranks-clean`  
**V2-3B1 documentation baseline:** `57e266282f5b394c233952a74ae3749370c6dff7`  
**Exact qualified implementation/test HEAD:** `1fb8db95a36dcdac2faa1f1ef12500cb5688a30b`  
**Authoritative workflow:** `RARE SHIFT V2-3B2 VECTOR Qualification`  
**Authoritative workflow run:** `36464850233` — SUCCESS  
**Main merge:** NOT AUTHORIZED  
**Production deployment:** NOT AUTHORIZED

---

## 1. Scope and decision

V2-3B2 implemented and qualified **VECTOR NEEDLE Rank II–V only**, preserving the already-qualified Rank-I phase-targeting contract and the locked cross-family weapon architecture.

This tranche does not authorize or implement:

- ORBIT NODES Rank II–V;
- ECHO MINE Rank II–V;
- SIGNAL ARC Rank II–V;
- Protocol live passives;
- Evolution / PRISM LANCE;
- V2-4 final pacing, elites or bosses;
- economy/token/RF changes;
- `main` merge;
- production deployment.

The governing phase-materiality requirement remains satisfied: VECTOR higher ranks rely on corporeal A/B authority, SHIFT transfer state and phase-aware target priority rather than generic survivor-style damage scaling.

---

## 2. Qualified VECTOR rank contracts

### Rank I — inherited baseline

Preserved from V2-2A:

- damage `10`;
- cooldown `760 ms`;
- range `560 px`;
- speed `960 px/s`;
- hit radius `18 px`;
- max in-flight `2`;
- one intended target;
- deterministic corporeal-only target acquisition;
- stable-ID tie breaking;
- Rank-I in-flight projectile dissipation on accepted SHIFT.

### Rank II — CLEAN LINE

Qualified behavior:

- fixed launch ray through the primary target;
- maximum two hits;
- damage sequence `10 / 7`;
- secondary line-corridor radius `20 px`;
- total acquisition/travel budget `560 px`;
- candidates behind the primary are excluded;
- off-phase ghosts are excluded;
- deterministic along-ray ordering with stable-ID tie breaking;
- projectile geometry/profile is snapshotted at launch.

Rank II+ intentionally does not use Rank-I homing behavior. The shot is committed to the launch ray.

### Rank III — PRIORITY TRACE

Qualified behavior:

- nearest legal target distance `D` establishes the local band;
- priority band extends through `D + 120 px`, capped by the existing `560 px` range;
- current priority tiers: `TRACE = 1`, `SPLIT_A = 0`, `SPLIT_B = 0`;
- highest priority tier inside the band wins;
- distance then stable ID resolve deterministic ties;
- current Rank-V lock preference applies only among candidates tied for the highest available priority tier;
- a genuinely higher-priority legal target may take over.

This deterministic core leaves room for later V2-4 target roles without using mutable Phaser pool order as gameplay semantics.

### Rank IV — PHASE TRANSFER

Qualified behavior:

- accepted SHIFT arms/refeshes exactly one transfer charge;
- no historical SHIFT credit is granted when Rank IV is acquired;
- transfer window is exactly `1200 ms`;
- `1199 ms` remains armed; `1200 ms` is expired;
- repeated SHIFT refreshes the one charge rather than stacking charges;
- latest accepted SHIFT phase is the transfer authority;
- first valid enhanced launch consumes the charge immediately;
- no valid target does not consume the charge;
- consumed charge is not refunded if the projectile later dissipates;
- transfer launch maximum three hits;
- transfer damage sequence `10 / 7 / 5`;
- ordinary VECTOR `760 ms` cooldown is not reset by SHIFT;
- pre-SHIFT in-flight VECTOR projectiles still dissipate on accepted SHIFT and are never retroactively upgraded.

### Rank V — VECTOR LOCK

Qualified behavior:

- lock starts at zero on Rank-V acquisition;
- primary damage snapshots at launch from current lock stacks;
- stack/damage progression is `0→10`, `1→12`, `2→14`, `3→16`;
- stacks increment only after a confirmed eligible primary damage event;
- stack cap is `3`;
- miss/dissipation does not grant a stack;
- target death, inactivity, phase loss, range break or primary-target change resets the lock;
- a higher-priority target can take authority from the current lock;
- no historical hit record seeds Rank-V lock state.

---

## 3. Runtime integration and migration law

The production Phaser runtime is now rank-aware for VECTOR while preserving the previously qualified Rank-I surface.

Qualified runtime rules include:

- `vectorRank` is explicit rather than inferred only from ownership;
- rank progression uses a bounded live adapter aligned with normalized V2-3 next-rank semantics;
- rank-up is monotonic and rejects Rank-V overflow;
- selecting a rank card does not manufacture a free projectile;
- existing in-flight projectiles preserve their launch profile across rank-up;
- Rank II+ projectiles preserve fixed launch ray data and bounded planned hit sequence;
- rank-up does not reset ordinary cooldown or create a backlog of owed shots;
- Rank IV transfer state is independent from ordinary cooldown;
- Rank V lock state is not retroactively seeded;
- projectile pool remains hard-capped at two in-flight projectiles.

The normalized V2-3 progression model remains the long-term progression source of truth. B2 does not silently broaden into Protocol/Evolution integration.

---

## 4. Deterministic qualification

On exact qualified HEAD `1fb8db95a36dcdac2faa1f1ef12500cb5688a30b`, authoritative workflow run `36464850233` passed:

- inherited deterministic core: **17 / 17 PASS**;
- inherited V2 combat contracts: **57 / 57 PASS**;
- V2-2E cross-weapon deterministic matrix: **7 / 7 PASS**;
- V2-2 draft pointer regression: **5 / 5 PASS**;
- V2-3A progression contracts: **18 / 18 PASS**;
- V2-3B1 DELTA Rank II–V contracts: **9 / 9 PASS**;
- V2-3B2 VECTOR Rank II–V contracts: **9 / 9 PASS**;
- V2 ART-00 deterministic/browser regression: **PASS**;
- core TypeScript: **PASS**;
- game TypeScript: **PASS**;
- FriendSDK check/build/smoke: **PASS**.

FriendSDK reported build size:

`6,231,456 bytes`

---

## 5. Natural production browser proof — VECTOR I → II

The B2 browser proof did not inject XP, HP, enemies, spawn state, invulnerability, pickups or free rank state into the natural I→II route.

The production-facing path used real draft cards and real pointer selection.

### 960 viewport

Observed natural route:

- Level 2: HP `83`; `ORBIT_NODES / VECTOR_NEEDLE / DELTA_RANK` → `VECTOR_NEEDLE`;
- Level 3: HP `73`; `ECHO_MINE / ORBIT_NODES / DELTA_RANK` → `ORBIT_NODES`;
- Level 4: HP `64`; `SIGNAL_ARC / ECHO_MINE / DELTA_RANK` → `ECHO_MINE`;
- Level 5: HP `51`; `DELTA_RANK / VECTOR_RANK / FIELD_REPAIR` → `VECTOR_RANK`.

Qualified markers:

- natural VECTOR Rank I → II: **PASS**;
- rank selection itself creates no free projectile: **PASS**;
- real Rank-II secondary line penetration: **PASS**;
- player alive: **PASS**.

### 390 viewport / reduced motion

Observed natural route:

- Level 2: HP `79`; `ORBIT_NODES / VECTOR_NEEDLE / DELTA_RANK` → `VECTOR_NEEDLE`;
- Level 3: HP `61`; `ECHO_MINE / ORBIT_NODES / DELTA_RANK` → `ORBIT_NODES`;
- Level 4: HP `57`; `SIGNAL_ARC / ECHO_MINE / DELTA_RANK` → `ECHO_MINE`;
- Level 5: HP `39`; `DELTA_RANK / VECTOR_RANK / FIELD_REPAIR` → `VECTOR_RANK`.

Qualified markers:

- natural VECTOR Rank I → II: **PASS**;
- real Rank-II secondary line penetration: **PASS**;
- reduced-motion route preserved: **PASS**;
- player alive: **PASS**.

This proves the bounded production adapter exposes a real higher-rank VECTOR choice naturally at both required viewport classes.

---

## 6. Controlled higher-rank browser proof

The approved V2-3B qualification design allows explicitly labelled controlled rank fixtures for higher-rank mechanical verification so qualification does not distort natural pacing before V2-4.

The controlled fixture sets only the starting VECTOR rank before survival mount. It does not grant HP, XP, invulnerability, fake pickups, enemy changes, damage changes or production-rank rewards.

### Rank IV — PHASE TRANSFER

Both 960 and 390 proved:

- Rank IV begins without historical transfer credit;
- real accepted SHIFT arms transfer authority;
- transfer authority binds to the shifted phase;
- one enhanced launch occurs and consumes the charge;
- a real transfer projectile was observed in flight;
- SHIFT invalidation remains active;
- player remains alive.

Markers:

`RARE_SHIFT_V2_3B2_VECTOR_RANK4_TRANSFER_960 = PASS`

`RARE_SHIFT_V2_3B2_VECTOR_RANK4_TRANSFER_390 = PASS`

### Rank V — VECTOR LOCK

Both 960 and 390 proved:

- fixture begins at zero lock stacks;
- stacks are earned from confirmed eligible primary hits;
- accepted phase rewrite clears live lock state where applicable;
- player remains alive.

Markers:

`RARE_SHIFT_V2_3B2_VECTOR_RANK5_LOCK_960 = PASS`

`RARE_SHIFT_V2_3B2_VECTOR_RANK5_LOCK_390 = PASS`

---

## 7. Inherited regression and harness evidence repairs

B2 qualification exposed three inherited browser-evidence weaknesses. They were repaired without changing production gameplay values or weakening the mechanics being proven.

### V2-2E integrated four-slot survival driver

Repeated exact-head runs showed the inherited bot entering the full-build observation at critically low HP because its movement duty cycle left it stationary for most active combat time.

Bounded harness repair:

- preserved the same ORBIT → ECHO → SIGNAL build route;
- preserved real natural pickups and drafts;
- preserved SHIFT schedule and all weapon/coexistence assertions;
- increased movement duty cycle only;
- changed no HP, XP, spawns, enemies, weapon values or production state.

Final exact-head proof:

- 960: Level-2 HP `79`, Level-3 HP `58`, Level-4 HP `54` → PASS;
- 390: Level-2 HP `79`, Level-3 HP `66`, Level-4 HP `43` → PASS;
- reduced motion: PASS.

### V2-2D SIGNAL ARC survival driver

The inherited 390 route reproduced death while waiting for the mandatory post-SHIFT ARC cast, despite deterministic SIGNAL contracts remaining green and 960 passing.

Bounded harness repair:

- retained ORBIT → ECHO → SIGNAL natural acquisition;
- retained the real SHIFT and graph invalidation requirement;
- retained chain cap, phase-authority and `10 / 8 / 6` damage-sequence assertions;
- retained mandatory post-SHIFT ARC cast;
- increased movement duty cycle only;
- changed no production gameplay state.

Final exact-head markers:

`RARE_SHIFT_V2_2D_SIGNAL_960 = PASS`

`RARE_SHIFT_V2_2D_SIGNAL_390 = PASS`

### V2-2C ECHO transient-state observation race

At 390, the real return event occurred, but `RETURN_READY` could be consumed by immediate corporeal pressure before the next DOM snapshot. The previous assertion sampled a transient state rather than a durable event.

Bounded evidence repair:

- retained DORMANT_HOME proof;
- retained real SHIFT-away and `ARMED_AWAY` proof;
- retained real return SHIFT;
- retained the monotonic `echo-returns` event requirement;
- retained the `250 ms` no-immediate-trigger rule;
- retained subsequent real trigger/hit/cap/death assertions;
- removed only the racy requirement that a DOM snapshot must still contain the transient `RETURN_READY` string after the return event had already been proven.

Final exact-head markers:

`RARE_SHIFT_V2_2C_ECHO_960 = PASS`

`RARE_SHIFT_V2_2C_ECHO_390 = PASS`

These changes improve qualification reliability without tuning production gameplay for the test bot.

---

## 8. Inherited B1 regression

The exact B2 qualified head preserved B1 higher-rank adapter behavior:

- B1 pickup level integrity 960/390: PASS;
- natural DELTA higher-rank adapter 960/390: PASS;
- live DELTA Rank-II profile 960/390: PASS;
- B1 reduced-motion proof: PASS.

No B1 mechanic was weakened for B2.

---

## 9. Evidence artifact

Artifact:

`rare-shift-v2-3b2-evidence-36464850233`

- Artifact ID: `10989378649`
- Files uploaded: `66`
- Size: `1,689,806 bytes`
- SHA-256: `4e278ae6503da7ac75e81670952b525c7c16e4fe588abe4fae41e8115aa2b6bb`
- Created: `2026-09-28T18:33:41Z`
- Expiry: `2026-10-12T18:33:40Z`
- Expired: `false`
- Evidence HEAD: `1fb8db95a36dcdac2faa1f1ef12500cb5688a30b`

---

## 10. Scope-integrity diff

Relative to V2-3B1 documentation baseline `57e266282f5b394c233952a74ae3749370c6dff7`, exact qualified implementation/test HEAD `1fb8db95a36dcdac2faa1f1ef12500cb5688a30b` is:

- `22` commits ahead;
- `0` commits behind.

Changed files are bounded to:

- `.github/workflows/v2-3b2-vector-core-qualification.yml`;
- `.github/workflows/v2-3b2-vector-qualification.yml`;
- `games/rare-shift/src/draft-core.ts`;
- `games/rare-shift/src/phaser-survival.ts`;
- `games/rare-shift/src/vector-core.ts`;
- `games/rare-shift/tests/v2-3b2-vector-ranks.test.ts`;
- `package.json`;
- `scripts/v2-2c-browser.mjs` — inherited evidence-race correction only;
- `scripts/v2-2d-browser.mjs` — inherited survival-driver correction only;
- `scripts/v2-2e-browser.mjs` — inherited survival-driver correction only;
- `scripts/v2-3b2-vector-browser.mjs`;
- `tsconfig.core.json`.

No ORBIT/ECHO/SIGNAL higher-rank runtime implementation, Protocol runtime, economy, blockchain, deployment or DNS source is included.

---

## 11. PROVEN

- VECTOR Rank II–V deterministic mechanics match the approved rank gate and hardening addendum.
- Rank II fixed-ray two-hit penetration works in deterministic core and real browser combat.
- Rank III deterministic priority-band selection is implemented and tested.
- Rank IV exact transfer expiry/refresh/consumption semantics are deterministic and real post-SHIFT transfer launches pass at 960/390.
- Rank V lock progression/reset helpers are deterministic and real confirmed-hit lock evidence passes at 960/390.
- Existing projectiles snapshot their launch profile and do not retroactively upgrade.
- Rank-up does not create a free projectile or reset ordinary VECTOR cooldown.
- Natural production VECTOR I→II progression works at 960 and 390.
- Rank-I VECTOR regression remains green.
- All inherited deterministic and browser gates pass on the exact qualified B2 HEAD.
- ART, TypeScript and FriendSDK check/build/smoke pass.
- Evidence artifact was uploaded successfully.

---

## 12. UNPROVEN / DEFERRED

This tranche does not claim:

- natural progression all the way to VECTOR Rank V under final seven-minute pacing;
- final endgame VECTOR balance;
- integrated natural Rank III–V readability under the complete five-family higher-rank system;
- PRISM LANCE Evolution;
- elite/boss priority tiers beyond the current bounded normal-enemy model;
- V2-4 pacing/enemy balance;
- production deployment;
- merge to `main`.

Final natural Rank-V pacing remains owned by V2-4. Integrated higher-rank cross-family browser/readability remains a later V2-3B integration responsibility rather than being fabricated inside this family tranche.

---

## 13. Final decision state

`V2_3B2_VECTOR_DETERMINISTIC_CONTRACTS = PASS`

`V2_3B2_VECTOR_RUNTIME = PASS`

`V2_3B2_NATURAL_VECTOR_I_TO_II_960_390 = PASS`

`V2_3B2_RANK_II_REAL_PENETRATION_960_390 = PASS`

`V2_3B2_RANK_IV_CONTROLLED_BROWSER_960_390 = PASS`

`V2_3B2_RANK_V_CONTROLLED_BROWSER_960_390 = PASS`

`V2_3B2_INHERITED_REGRESSION = PASS`

`V2_3B2_EVIDENCE_ARTIFACT = PASS`

`V2_3B2_OVERALL_DECISION = PASS`

`V2_3B2 = CLOSED`

`V2_3B3_ORBIT_RANKS = NOT_STARTED`

`MAIN_MERGE = NOT_AUTHORIZED`

`PRODUCTION_DEPLOYMENT = NOT_AUTHORIZED`

---

## 14. Next bounded gate

The next family tranche is **V2-3B3 — ORBIT NODES Rank II–V**.

It is **not started and not implicitly authorized by this closeout**. The next action should be a planning/review gate against the already approved ORBIT rank contracts, current Rank-I runtime, migration/state hazards and qualification strategy before any ORBIT higher-rank code mutation.
