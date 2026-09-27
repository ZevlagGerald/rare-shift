# RARE//SHIFT V2-2B — ORBIT NODES RANK I QUALIFICATION REPORT

**Evidence status:** TECHNICAL QUALIFICATION PASS  
**Decision status:** PASS — BOUNDED V2-2B TRANCHE QUALIFIED  
**Date:** 2026-09-27  
**Qualified branch:** `feature/v2-2b-orbit-nodes-rank1`  
**Exact qualified gameplay HEAD:** `db752fc04720a4649397fb5ee64ae5a817488d77`  
**Workflow run:** `36305520687`  
**Main merge:** NOT AUTHORIZED  
**Production deployment:** NOT AUTHORIZED

## 1. Result

V2-2B qualifies ORBIT NODES Rank I as the second additional automatic weapon family after VECTOR NEEDLE.

The exact qualified implementation proves that ORBIT remains a distinct close-defense / phase-reversal weapon while preserving DELTA and VECTOR behavior.

Rank I is limited to one orbiting node and does not include Rank II-V, SYNC HALO, multiple nodes, knockback, SHIFT shear damage, protocols, EVO, new enemies/bosses, RF/economy changes, merge to `main`, or deployment.

## 2. Locked Rank-I profile

Qualified values:

- node count: `1`;
- orbit radius: `72 world px`;
- angular speed: `2.40 rad/s`;
- contact damage: `8`;
- contact radius: `26 world px`;
- per-target contact interval: `700 ms`;
- Phase A direction: `+1`;
- Phase B direction: `-1`.

These values qualify V2-2B only. They do not represent final seven-minute balance or future Rank II-V scaling.

## 3. SHIFT reversal law — PROVEN

The qualified implementation preserves the V2-2B anti-exploit contract:

- SHIFT reverses direction through phase authority;
- current orbit angle is retained at SHIFT;
- the node is not reset to zero;
- the node is not teleported to the opposite side;
- SHIFT itself does not create an ORBIT damage pulse;
- per-target hit cooldown state survives SHIFT;
- Rank I grants no shield, invulnerability, knockback or free reversal damage.

The runtime records the pre-reversal angle as `orbit-last-shift-anchor` for browser evidence.

## 4. Corporeal contact authority — PROVEN

Rank-I contact is legal only for an active enemy that is currently corporeal and within the locked node contact radius.

Deterministic tests prove:

- TRACE is contact-legal in both phases;
- SPLIT_A is contact-legal in A and illegal in B;
- SPLIT_B is contact-legal in B and illegal in A;
- inactive and out-of-radius candidates are rejected;
- the same stable enemy ID cannot be damaged again before `700 ms`;
- changing phase does not reset that per-target cooldown.

Cooldown entries are keyed by stable spawn ID and removed when that enemy dies.

## 5. Deterministic orbit core — PROVEN

The pure ORBIT core qualifies:

- exact Rank-I profile;
- opposite A/B angular direction;
- deterministic angle normalization;
- equal elapsed time in A followed by equal elapsed time in B returns to the starting angle within floating-point tolerance;
- deterministic world position from origin + radius + angle;
- phase-correct contact legality;
- bounded per-target contact timing.

No random jitter, proc, crit or node placement is used.

## 6. Draft integration — PROVEN

V2-2B adds the real acquisition choice:

`ORBIT_NODES`

The qualification state where ORBIT and VECTOR are both available deterministically produces:

`ORBIT_NODES`, `VECTOR_NEEDLE`, `DELTA_RANK`

This proves:

- exactly three distinct actionable choices;
- ORBIT discovery is deterministic;
- VECTOR remains available and was not displaced from the inherited V2-2A route;
- ORBIT acquisition consumes exactly one active weapon slot;
- duplicate ORBIT acquisition is illegal;
- disabled/full-slot ORBIT acquisition is rejected;
- no ORBIT Rank II card exists in this tranche.

The discovery priority is a bounded V2-2B qualification rule, not final V2-3 weighting.

## 7. Deterministic automated evidence

Workflow run:

`36305520687`

Inherited deterministic core:

`17 / 17 PASS`

Expanded V2 combat contracts:

`24 / 24 PASS`

The 24 combat tests include all inherited DELTA/VECTOR/draft contracts plus the ORBIT-specific contracts for profile, reversal continuity, node position, corporeal contact/cooldown and acquisition/slot rules.

## 8. ART / TypeScript / FriendSDK regression — PROVEN

V2 ART-00 deterministic tests:

`7 / 7 PASS`

ART static/motion proof:

`PASS`

ART browser 960:

`PASS`

ART browser 390:

`PASS`

TypeScript core:

`PASS`

Game TypeScript:

`PASS`

FriendSDK v0.1.2 archive verification:

`PASS`

`friendsdk check`:

`PASS`

Reported build size:

`6,190,034 bytes`

`friendsdk build`:

`PASS`

FriendSDK 960 smoke:

`PASS`

## 9. Inherited browser regressions — PROVEN

V2-1 regression:

`RARE_SHIFT_V2_1_BROWSER_960 = PASS`

`RARE_SHIFT_V2_1_BROWSER_390 = PASS`

V2-2A VECTOR regression:

`RARE_SHIFT_V2_2A_VECTOR_960 = PASS`

`RARE_SHIFT_V2_2A_VECTOR_390 = PASS`

Therefore ORBIT integration did not regress the previously qualified movement / SHIFT / DELTA / draft loop or the phase-targeted VECTOR runtime path.

## 10. Dedicated V2-2B browser evidence — PROVEN

The real FriendSDK/Phaser route exercised both required viewport classes.

The route required:

- entering Signal Descent;
- naturally reaching a real level-up draft;
- exactly three distinct actionable choices;
- ORBIT present and VECTOR still present;
- selecting ORBIT through the rendered-card pointer path;
- ORBIT becoming owned and consuming the second active slot;
- visible orbit angle progression;
- at least one legal ORBIT hit during real combat;
- real SHIFT;
- angular direction sign reversing;
- reversal counter incrementing exactly once;
- recorded SHIFT anchor remaining near the pre-SHIFT angle, proving no reset/teleport;
- DELTA remaining `canonical-exclusive`;
- player remaining alive.

Results:

`RARE_SHIFT_V2_2B_ORBIT_960 = PASS`

`RARE_SHIFT_V2_2B_ORBIT_390 = PASS`

## 11. Evidence artifact

Artifact name:

`rare-shift-v2-2b-evidence-36305520687`

Artifact ID:

`10927062884`

Files uploaded:

`32`

Size:

`964,383 bytes`

SHA-256:

`ab4b1fbd9efb3775a1917e2a7e4d7b46092f711b56edab0e04ab06c7dd269670`

Retention expiry:

`2026-10-11T08:17:04Z`

## 12. PROVEN

- V2-2B protocol is implemented at Rank I only.
- One deterministic orbit node exists.
- A/B phases rotate in opposite directions.
- SHIFT reversal preserves angular position rather than resetting/teleporting.
- Rank-I ORBIT only damages corporeal threats.
- Same-target contact is hard-bounded by a `700 ms` interval.
- That cooldown is not reset by SHIFT.
- Stable spawn IDs back the contact timing state.
- ORBIT is a real draft acquisition and consumes one active slot.
- VECTOR remains available and fully regression-qualified.
- DELTA canonical identity remains intact.
- V2-1, V2-2A, ART-00, TypeScript and FriendSDK gates remain green.
- Dedicated ORBIT browser routes pass at 960 and 390.

## 13. UNPROVEN / DEFERRED

V2-2B does not prove or authorize:

- final ORBIT numerical balance across a seven-minute run;
- ORBIT Rank II-V;
- SYNC HALO;
- multiple nodes;
- knockback or PHASE SHEAR;
- final multi-weapon balance;
- ECHO MINE;
- SIGNAL ARC;
- protocols / EVO;
- final SHIFT commitment-window tuning;
- new enemy/boss systems;
- RF/economy layers;
- merge to `main`;
- production deployment.

## 14. Final tranche state

`V2_2A_OVERALL_DECISION = PASS`

`V2_2B_PROTOCOL = LOCKED`

`V2_2B_ORBIT_CORE = PASS`

`V2_2B_DRAFT_ACQUISITION = PASS`

`V2_2B_RUNTIME = PASS`

`V2_2B_DETERMINISTIC_TESTS = PASS`

`V2_2B_V2_1_REGRESSION = PASS`

`V2_2B_VECTOR_REGRESSION = PASS`

`V2_2B_BROWSER_960 = PASS`

`V2_2B_BROWSER_390 = PASS`

`V2_2B_CI_QUALIFICATION = PASS`

`V2_2B_OVERALL_DECISION = PASS`

`V2_2C_ECHO_MINE = NOT_STARTED`

`MAIN_MERGE = NOT_AUTHORIZED`

`PRODUCTION_DEPLOY = NOT_AUTHORIZED`

## 15. Recommended next gate

Do not implement ECHO MINE in this qualification commit.

The next bounded step should be a review of this V2-2B evidence followed by a V2-2C ECHO MINE Rank-I mechanics/qualification protocol. That review should lock phase-memory semantics, active-mine cap, deterministic replacement/expiry, leave-phase arming, return-phase triggering and anti-recursion rules before any ECHO runtime code is introduced.
