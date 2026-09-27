# RARE//SHIFT V2-2A — VECTOR NEEDLE RANK I QUALIFICATION PROTOCOL

**Status:** ACTIVE PLANNING PROTOCOL — IMPLEMENTATION NOT YET AUTHORIZED  
**Date:** 2026-09-27  
**Planning branch:** `planning/v2-2a-vector-needle-protocol`  
**Parent design gate:** `planning/v2-2-phase-weapon-gate` @ `032bbeed60f521b9da4b65ff996fcb7d25067d7d`  
**Latest canonical V2-1 feature HEAD reviewed:** `31c6cd7a5f0160ee15a1ba0f631df095271a8521`  
**Gameplay implementation baseline remains:** `687f5f99d967387a929ae641d900bf9aed2e3ce6` plus documentation-only V2-1C reconciliation  
**V2-1C owner manual postfix gate:** `UNPROVEN`  
**V2-2A code authorization:** `BLOCKED` until owner explicitly passes or waives that gate and authorizes implementation.

---

## 1. Purpose

This protocol defines the first bounded implementation tranche after V2-1:

> **V2-2A = VECTOR NEEDLE Rank I only.**

It exists so the next gameplay patch can be implemented and qualified without broadening into the rest of V2-2 or V2-3.

The tranche must prove that a second automatic weapon can coexist with DELTA BURST while remaining mechanically dependent on the A/B phase law.

The governing product thesis remains:

> **Your Friend is not a skin. Its animation is your weapon and the battlefield's phase law.**

VECTOR NEEDLE supports that thesis by making target acquisition depend on which enemies are currently corporeal. It must not compete with DELTA BURST as the primary Friend-geometry spectacle.

---

## 2. Source review / existing implementation seams

The current V2-1 runtime already provides the correct integration seams:

- `isEnemyCorporeal(kind, phase)` centralizes COMMON/A/B target authority;
- `enemyThreatPhase(kind)` maps TRACE to COMMON and SPLIT_A/SPLIT_B to A/B;
- enemies move continuously even while ghosted;
- DELTA BURST already fires automatically from the survival update loop;
- the player has no manual attack input;
- SHIFT is centralized in one scene method;
- deterministic spawn specs already carry a stable spawn `id`;
- the current draft system validates candidates before rendering;
- test state is exposed through canvas `data-*` attributes for browser qualification.

V2-2A must extend these seams. It must not create a second competing phase model, a second enemy-authority function, or a separate random targeting subsystem.

### Implementation note for later code tranche

`SpawnSpec` already has a deterministic `id`, but `EnemyRuntime` currently does not retain that ID after spawn. V2-2A will need a stable runtime identifier for deterministic tie-breaking.

The implementation should therefore retain the spawn ID on the runtime enemy object rather than using mutable pool-array order as game semantics.

---

## 3. Scope

### 3.1 IN SCOPE

Only the following gameplay behavior is authorized by this protocol once the code gate is later opened:

1. VECTOR NEEDLE acquisition as a level-up choice;
2. VECTOR NEEDLE Rank I automatic targeting;
3. one fast single-target needle projectile;
4. corporeal-only target legality;
5. deterministic nearest-target acquisition;
6. deterministic tie-breaking;
7. acquisition invalidation on SHIFT;
8. Rank-I in-flight projectile dissipation on SHIFT;
9. readable but restrained target/shot feedback;
10. deterministic unit tests;
11. desktop and narrow/touch browser qualification;
12. required test-state instrumentation;
13. regression qualification of all existing V2-1 contracts.

### 3.2 OUT OF SCOPE

V2-2A must **not** implement:

- VECTOR NEEDLE Rank II, III, IV or V;
- PRISM LANCE evolution;
- penetration;
- elite/boss target weighting;
- phase-transfer shots;
- repeated-target lock bonuses;
- critical hits;
- random targeting;
- ORBIT NODES;
- ECHO MINE;
- SIGNAL ARC;
- protocols;
- EVO system;
- new enemies;
- elites;
- bosses;
- final seven-minute pacing;
- RF/token/economy systems;
- NFT rarity-based combat power;
- new active combat buttons;
- production deployment;
- merge to `main`.

If a required implementation change cannot remain within this boundary, V2-2A must stop for review rather than silently widen scope.

---

## 4. Rank-I gameplay contract

### 4.1 Role

**VECTOR NEEDLE** is the build's **precision / single-target pressure** weapon.

Its player-facing question is:

> **Which threat becomes my precision target when I rewrite reality?**

DELTA BURST remains the signature Friend-derived spatial weapon. VECTOR is deliberately simpler visually and more reliable spatially, but it is limited to one target and receives no Rank-II+ benefits in this tranche.

### 4.2 Automatic fire only

VECTOR NEEDLE has no dedicated attack button.

The control model remains:

- MOVE;
- SHIFT;
- weapons auto-fire.

No mouse aiming, stick aiming, click-to-target, manual lock, charge button or alternate fire may be added.

### 4.3 Valid target set

A target is legal only when all of these are true at acquisition time:

1. enemy runtime is active;
2. enemy is currently CORPOREAL under `isEnemyCorporeal(enemy.kind, currentPhase)`;
3. enemy is inside VECTOR Rank-I acquisition range;
4. enemy is not already dead/deactivated.

Consequences:

- TRACE is legal in both phases because it is COMMON;
- SPLIT_A is legal only in Phase A;
- SPLIT_B is legal only in Phase B;
- off-phase ghosts are not normal targets;
- a weapon may have no target and therefore skip a shot.

There is no fallback that damages a ghost merely because no corporeal target exists.

### 4.4 Deterministic acquisition order

From the legal target set:

1. choose the enemy with minimum squared distance from the Friend;
2. when squared distance is exactly tied, choose the lower stable spawn ID;
3. do not use `Math.random()`;
4. do not use enemy pool index as a hidden gameplay tie-break if a stable spawn ID is available.

The targeting function should be implementable as a pure deterministic core helper so it can be exhaustively unit-tested outside Phaser.

### 4.5 Rank-I provisional profile

Initial qualification values are **PROVISIONAL**, not final balance locks:

- acquisition range: **560 world px**;
- damage: **10**;
- cooldown: **760 ms**;
- projectile speed: **960 world px/s**;
- hit radius / arrival tolerance: **18 px**;
- penetration: **0**;
- chain count: **0**;
- retarget after firing: **NO**;
- maximum in-flight projectiles: **2 hard cap**.

These values are intentionally conservative relative to DELTA BURST:

- VECTOR is reliable against one selected target;
- DELTA can affect multiple corporeal enemies through canonical geometry;
- VECTOR must not replace DELTA as the dominant all-purpose damage source.

These numbers may move during V2-2A qualification if evidence shows a readability or balance problem, but any change must remain within Rank-I scope and be recorded in the qualification report.

### 4.6 Projectile behavior

When a shot fires:

1. the currently selected enemy is stored as the shot's intended target ID;
2. the projectile visually travels toward that target;
3. the projectile may gently track that same target so the precision weapon does not miss solely because the target moved during normal pursuit;
4. the projectile may **not** retarget to another enemy if the intended target dies, deactivates or becomes illegal;
5. if the intended target is gone before impact, the projectile dissipates;
6. Rank I has no penetration and no secondary target;
7. successful impact damages only the intended legal target once;
8. the same projectile may never produce multiple damage events.

### 4.7 SHIFT interaction — mandatory Rank-I phase materiality

SHIFT must materially affect VECTOR immediately.

When SHIFT occurs:

1. the current VECTOR acquisition is invalidated;
2. any in-flight Rank-I VECTOR projectiles are dissipated without damage;
3. the next eligible shot re-acquires from the newly corporeal target set;
4. COMMON enemies remain eligible after SHIFT but are re-evaluated normally with the new full target set;
5. no projectile is transferred across phases at Rank I.

This is intentional.

The later V2-3 Rank-IV design reserves **PHASE TRANSFER** as an upgrade. Rank I must not silently implement that advanced behavior early.

### 4.8 No-target behavior

If the cooldown is ready but no valid target exists:

- no projectile is created;
- the fire-ready state may remain armed so a valid target can be fired on promptly when one enters range;
- the runtime must not create a projectile every frame;
- the runtime must not accumulate an unbounded backlog of owed shots.

Recommended behavior:

- clamp the VECTOR attack accumulator at one ready cooldown interval while targetless;
- fire one shot when a legal target becomes available;
- restart normal cadence from that shot.

---

## 5. Draft acquisition contract

V2-2A introduces VECTOR as a **new weapon acquisition**, not a rank-up family yet.

### 5.1 Build-state extension

The deterministic build state should gain at least:

- `vectorOwned: boolean`.

No Rank-II+ VECTOR rank integer is required for V2-2A. If a rank field is introduced for forward compatibility, its only legal values in this tranche are `0` and `1` and no Rank-I → Rank-II draft may exist.

### 5.2 Candidate validity

`VECTOR_NEEDLE` acquisition is valid only if:

- VECTOR is not already owned;
- a weapon slot is available.

The locked architecture allows four active weapon slots including DELTA. In V2-2A only DELTA and VECTOR exist as active weapon families, so slot exhaustion should not normally occur; however the validity rule should still be explicit and forward-compatible.

Once VECTOR is acquired:

- the acquisition card disappears;
- VECTOR Rank II is **not** offered;
- no duplicate acquisition may be applied directly or through UI.

### 5.3 Exactly-three production rule

The production-facing normal rule remains:

> **A normal level-up draft presents exactly three actionable choices whenever at least three legal choices exist.**

Adding VECTOR creates a candidate pool larger than the V2-1 temporary three-card pool.

Therefore V2-2A must not simply render every legal candidate.

The draft builder must deterministically select at most three legal choices.

### 5.4 V2-2A discovery guarantee

For this bounded tranche, while VECTOR is unowned and a weapon slot is available:

- VECTOR should be guaranteed to occupy one of the three normal draft slots;
- the remaining two slots are deterministically selected from the other legal candidates;
- all three remain actionable;
- this guarantee is a V2-2A showcase/qualification rule, not the final V2-3 weighted draft architecture.

Reason:

V2-2A must prove the weapon in real play without requiring arbitrary rerolls or a long grind before the new mechanic appears.

After VECTOR is acquired, normal deterministic selection fills the three slots from the remaining legal pool. The existing V2-1 bounded 1–3/zero-choice safety exception remains available only when fewer than three legal candidates actually exist.

### 5.5 Direct-application rejection

Calling the draft application function with `VECTOR_NEEDLE` while VECTOR is already owned must throw a clear deterministic error rather than silently no-op.

---

## 6. Visual/readability contract

VECTOR should be visually legible but subordinate to DELTA.

### 6.1 Target cue

A currently acquired VECTOR target may receive one small restrained reticle/corner-bracket cue.

The cue must:

- clearly identify which enemy the precision weapon intends to hit;
- use the current phase accent plus COMMON neutral structure;
- remain smaller and less spectacular than DELTA BURST;
- disappear immediately if the target becomes invalid;
- disappear on SHIFT before the next acquisition is resolved;
- not resemble an enemy hazard telegraph.

### 6.2 Projectile cue

Rank-I VECTOR projectile:

- thin needle/line silhouette;
- compact length;
- current phase accent with a neutral core or edge;
- no giant beam;
- no screen flash;
- no full-screen trail;
- no Friend-derived mask geometry.

### 6.3 Hit cue

A VECTOR impact may use a brief pin/line spark at the enemy.

It must not reuse DELTA's canonical mask effect and must not obscure nearby enemy phase readability.

### 6.4 Reduced motion

With reduced motion enabled:

- target cue remains readable;
- projectile motion may be simplified;
- long trails/tweens are removed or shortened;
- no correctness depends on tween completion;
- damage and targeting timing remain deterministic.

---

## 7. Runtime integration constraints

### 7.1 Core helper boundary

The following should live in deterministic/core code rather than being buried in Phaser scene code:

- VECTOR Rank-I profile constants;
- target candidate shape/type;
- deterministic acquisition function;
- tie-break logic;
- target legality rules that can be expressed without rendering state.

Phaser remains responsible for:

- rendering;
- projectile visual movement;
- target reticle;
- applying already-determined hits to runtime enemies;
- pooling visual objects;
- exposing browser evidence state.

### 7.2 Enemy stable ID

Runtime enemy state must retain its deterministic spawn ID.

Acceptance requirement:

- spawn ID remains stable for that enemy life;
- recycled pool slots receive the next spawn ID when reused;
- tie-breaking uses stable spawn ID, not pool position.

### 7.3 Projectile pooling / hard cap

VECTOR visuals must use a bounded pool or equivalent hard-capped object count.

Rank I maximum in-flight projectiles:

`2`

No unbounded Phaser object creation is permitted under normal auto-fire.

### 7.4 Existing DELTA authority

V2-2A must not modify canonical DELTA geometry or its Friend-derived source.

Any balance change to DELTA discovered during V2-2A requires a separate review; it may not be bundled into the VECTOR tranche merely to make aggregate DPS convenient.

---

## 8. Required deterministic tests

The existing V2 combat contract suite must remain green and be extended with VECTOR-specific tests.

Minimum required new tests:

### 8.1 Target legality

- TRACE is targetable in Phase A;
- TRACE is targetable in Phase B;
- SPLIT_A is targetable in A and excluded in B;
- SPLIT_B is excluded in A and targetable in B;
- inactive enemies are excluded;
- out-of-range enemies are excluded.

### 8.2 Nearest-target selection

Given multiple valid enemies:

- nearest squared-distance target wins;
- result is independent of input-array ordering when distances differ.

### 8.3 Deterministic tie-break

Given equal-distance valid enemies:

- lower stable spawn ID wins;
- reversing candidate array order does not change the result.

### 8.4 Empty target set

No legal candidate returns `null` / no target without error.

### 8.5 Phase rewrite

For a mixed set containing COMMON, A and B threats:

- Phase A acquisition uses only COMMON/A;
- Phase B acquisition uses only COMMON/B;
- the selected result changes when phase authority changes and geometry makes another target nearest.

### 8.6 Rank-I profile

Qualification defaults are exact and bounded:

- damage 10;
- cooldown 760 ms;
- range 560;
- speed 960;
- penetration 0;
- max in-flight 2.

If tuning changes during qualification, tests and final report must record the accepted replacements.

### 8.7 Draft validity

- VECTOR acquisition valid when unowned and slot available;
- invalid when already owned;
- direct duplicate application throws;
- no Rank-II VECTOR choice exists in V2-2A;
- all rendered choices remain actionable.

### 8.8 Draft cardinality

With at least three legal choices:

- exactly three are returned;
- VECTOR is included while unowned under the V2-2A discovery guarantee;
- choices are deterministic for seed + level + build state;
- no duplicates appear.

### 8.9 Regression

All previous contracts remain green, including:

- canonical A/B authority;
- DELTA exact exclusive geometry;
- DELTA normalized power;
- spawn determinism;
- XP thresholds;
- max-rank DELTA filtering;
- no-op utility filtering;
- full exhaustion safety.

---

## 9. Browser qualification

V2-2A must be qualified at the same minimum viewport classes already used by V2-1:

- desktop `960`;
- narrow/mobile `390`.

At least one browser route must prove the following in the shipped runtime rather than only by pure unit test.

### 9.1 Acquisition

- a real level-up draft opens;
- VECTOR appears as a legal choice while unowned;
- VECTOR is selected through an actual supported interaction path;
- acquisition closes the draft and resumes combat;
- no VECTOR acquisition card appears again afterward.

At least one viewport should use pointer/tap selection so the card remains a real interactive control, not keyboard-only test plumbing.

### 9.2 Auto-fire

After acquisition:

- VECTOR fires without new player attack input;
- at least one projectile is emitted;
- at least one legal corporeal enemy is hit;
- DELTA BURST continues to operate concurrently.

### 9.3 SHIFT re-acquisition

Browser evidence must observe:

1. a valid VECTOR target/acquisition in one phase;
2. player SHIFT;
3. old acquisition invalidated;
4. new acquisition resolved from the new corporeal target set;
5. at least one post-SHIFT VECTOR shot.

### 9.4 Off-phase safety

The route must provide evidence that VECTOR does not normally damage an off-phase SPLIT target.

This may be shown by deterministic state counters/IDs rather than fragile pixel inference.

### 9.5 In-flight SHIFT rule

At least one automated contract must prove that a Rank-I VECTOR projectile in flight when SHIFT occurs is dissipated and does not later damage its old-phase target.

If a browser route can deterministically exercise this without becoming flaky, it should; otherwise the pure runtime/core integration test is sufficient for this exact sub-rule while browser qualification still proves re-acquisition.

### 9.6 Touch/readability

At 390 width:

- MOVE touch control remains usable;
- SHIFT touch control remains usable;
- the VECTOR target cue does not cover core HUD or touch controls;
- draft cards remain selectable;
- no horizontal overflow/regression is introduced.

---

## 10. Browser evidence instrumentation

The scene may extend existing canvas test-state data with bounded VECTOR fields such as:

- `data-vector-owned`;
- `data-vector-target-id`;
- `data-vector-shots`;
- `data-vector-hits`;
- `data-vector-kills`;
- `data-vector-reacquires`;
- `data-vector-phase-dissipations`;
- `data-vector-in-flight`.

These values are qualification evidence only. They must not become visible player-facing debug clutter.

The exact field list may be reduced if the same acceptance criteria can be proven with fewer deterministic observables.

---

## 11. Performance / safety invariants

V2-2A must preserve bounded swarm behavior.

Required constraints:

- maximum active enemies remains bounded by existing pool limits;
- VECTOR max in-flight count is hard-capped;
- targeting scan is bounded by active enemy pool size;
- no recursive callbacks create weapon cascades;
- no projectile creates another projectile at Rank I;
- no chain/penetration logic exists;
- no per-frame random allocation is required for target ranking;
- all projectile/reticle cleanup paths work on kill, SHIFT, draft pause, death and scene destroy.

A simple O(N) scan over the bounded enemy pool per VECTOR shot is acceptable for V2-2A. Premature spatial-index complexity is not required.

---

## 12. Qualification workflow requirements

Before V2-2A may be called qualified, CI must pass all applicable inherited gates plus the new VECTOR contracts:

1. checkout exact implementation commit;
2. Node/runtime setup;
3. FriendSDK archive verification;
4. dependency install;
5. script syntax;
6. inherited deterministic core tests;
7. V2 combat deterministic contracts including VECTOR;
8. V2 ART regression;
9. TypeScript qualification;
10. FriendSDK check/build/smoke;
11. existing V2-1 browser regression at 960/390;
12. dedicated V2-2A VECTOR browser qualification at 960/390;
13. evidence artifact upload.

The existing V2-1 qualification path must remain green. V2-2A may not replace it with only the new weapon test.

---

## 13. Acceptance matrix

| Gate | Requirement | Status before implementation |
| --- | --- | --- |
| V2-1C implementation | qualified | PASS |
| V2-1C exact-three reconciliation | bounded exception locked | PASS |
| V2-1C automated natural Rank V | proven | PASS |
| V2-1C automated postfix DELTA filter | proven | PASS |
| V2-1C owner manual postfix gate | owner pass or explicit waiver | **UNPROVEN / BLOCKER** |
| V2-2 mechanics architecture | phase-responsive gate | PASS / LOCKED |
| VECTOR Rank-I protocol | this document reviewed | PLANNING |
| VECTOR code authorization | explicit owner authorization after blocker resolved | **NO** |
| VECTOR deterministic core | later implementation | NOT STARTED |
| VECTOR draft acquisition | later implementation | NOT STARTED |
| VECTOR Phaser runtime | later implementation | NOT STARTED |
| 960 browser | later qualification | NOT STARTED |
| 390 browser | later qualification | NOT STARTED |
| V2-2A overall | all required evidence | NOT STARTED |

---

## 14. Stop conditions

Implementation must stop and return to review if any of the following is observed:

- VECTOR can damage an off-phase ghost through its normal Rank-I path;
- target selection is nondeterministic for the same world state;
- pool order changes target outcome under equal geometry;
- SHIFT leaves an old Rank-I projectile capable of damaging an old-phase target;
- VECTOR acquisition repeats after ownership;
- draft shows more than three normal choices;
- a rendered draft card is a no-op;
- DELTA geometry changes;
- VECTOR becomes visually more dominant than DELTA;
- a new active attack input is introduced;
- Rank II+ behavior enters the patch;
- another weapon family enters the patch;
- V2-1 browser regression fails;
- FriendSDK/build/typecheck regression appears;
- gameplay changes are made merely to satisfy a flaky qualification harness.

---

## 15. Implementation branch rule

This planning branch is **not** the future gameplay implementation base.

When owner authorization is eventually given:

1. re-verify the canonical feature branch and current HEAD;
2. ensure the owner manual gate has been explicitly passed or waived;
3. create a new bounded implementation branch from the then-current canonical V2 feature baseline;
4. bring this protocol in as governing documentation without discarding newer canonical evidence;
5. implement VECTOR Rank I only;
6. qualify before any V2-2B work begins.

Do not implement gameplay directly on `planning/v2-2a-vector-needle-protocol`.

---

## 16. Decision state

`V2_2A_VECTOR_ROLE = LOCKED`

`V2_2A_PHASE_MATERIALITY = LOCKED`

`V2_2A_CORPOREAL_ONLY_TARGETING = LOCKED`

`V2_2A_DETERMINISTIC_NEAREST_TARGET = LOCKED`

`V2_2A_STABLE_ID_TIEBREAK = LOCKED`

`V2_2A_SHIFT_INVALIDATES_ACQUISITION = LOCKED`

`V2_2A_RANK_I_PROJECTILES_DISSIPATE_ON_SHIFT = LOCKED`

`V2_2A_DISCOVERY_GUARANTEE = PROVISIONAL_FOR_V2_2A`

`V2_2A_NUMERICAL_PROFILE = PROVISIONAL`

`V2_2A_IMPLEMENTATION = NOT_STARTED`

`V2_2A_CODE_AUTHORIZATION = BLOCKED`

`V2_1C_OWNER_MANUAL_POSTFIX_GATE = UNPROVEN`

---

## 17. Next authorization boundary

No code should be written from this protocol until owner authority does one of the following explicitly:

- reports that the V2-1C manual postfix check passed; **or**
- explicitly waives that manual gate;

and then authorizes V2-2A implementation.

At that point the next bounded tranche is exactly:

> **Implement and qualify VECTOR NEEDLE Rank I according to this protocol.**

Nothing beyond that tranche is implied.