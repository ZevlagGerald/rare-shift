# RARE//SHIFT V2-2C — ECHO MINE RANK I QUALIFICATION REPORT

**Evidence status:** TECHNICAL QUALIFICATION PASS  
**Decision status:** PASS — BOUNDED V2-2C TRANCHE QUALIFIED  
**Date:** 2026-09-27  
**Qualified branch:** `feature/v2-2c-echo-mine-rank1`  
**Exact qualified gameplay HEAD:** `b157ebf6e5ed993b1f385cbc405b8be4cc366df7`  
**Final qualification workflow:** `36307194992`  
**Main merge:** NOT AUTHORIZED  
**Production deployment:** NOT AUTHORIZED

## 1. Result

V2-2C qualifies ECHO MINE Rank I as the third additional automatic weapon family after VECTOR NEEDLE and ORBIT NODES.

The qualified implementation proves that ECHO is a distinct delayed route-control / phase-memory weapon rather than a generic always-on proximity mine.

Its defining player question remains:

> **Where will I want damage waiting when I return to this reality?**

The implementation requires an actual phase leave-and-return cycle before a mine can become triggerable.

No ECHO Rank II-V, MEMORY COLLAPSE, mine linking, chain detonation, recursive mine creation, SIGNAL ARC, protocols, EVO, new enemies/bosses, final seven-minute balance, RF/economy work, merge to `main`, or production deployment is included.

## 2. Qualified Rank-I profile

V2-2C qualified the following bounded profile:

- placement interval: `1800 ms`;
- maximum active mines: `3`;
- minimum placement separation: `56 world px`;
- mine lifetime: `9000 ms`;
- return activation delay: `250 ms`;
- trigger radius: `68 world px`;
- blast radius: `84 world px`;
- blast damage: `16`;
- chain depth: `0`;
- recursive mine creation: `0`.

These values qualify the V2-2C sandbox only and are not final full-run balance.

## 3. Phase-memory state machine — PROVEN

The qualified core uses exactly three Rank-I memory states:

### `DORMANT_HOME`

- initial state after placement;
- mine records its creation phase;
- remaining in that phase never arms it;
- enemy proximity cannot trigger it.

### `ARMED_AWAY`

- entered only after the player leaves the mine's recorded phase;
- the mine remains retained and visible as a memory marker;
- it cannot trigger while the player is away;
- COMMON enemies do not bypass this rule.

### `RETURN_READY`

- entered only when an `ARMED_AWAY` mine sees the player return to its recorded phase;
- the return timestamp is recorded;
- the mine remains non-triggerable for `250 ms`;
- leaving again before detonation returns it to `ARMED_AWAY`;
- a later return starts a fresh `250 ms` delay.

Therefore Rank I cannot function at full tactical value without SHIFT.

## 4. SHIFT and trigger law — PROVEN

SHIFT itself deals no ECHO damage.

Qualified transition law:

1. `DORMANT_HOME` + leave recorded phase -> `ARMED_AWAY`;
2. `ARMED_AWAY` + return to recorded phase -> `RETURN_READY`;
3. `RETURN_READY` + leave again -> `ARMED_AWAY`;
4. ordinary same-phase updates do not synthesize transitions.

A mine may trigger only when all are true:

- state is `RETURN_READY`;
- current phase equals recorded phase;
- at least `250 ms` elapsed since the latest return;
- a currently CORPOREAL active enemy is within `68 px`.

The triggering mine is removed before blast damage resolves, preventing repeat detonation by the same mine.

## 5. Blast authority — PROVEN

On a valid trigger:

- each active CORPOREAL enemy within `84 px` receives `16` damage once;
- off-phase ghosts receive zero Rank-I ECHO damage;
- target processing is stable by spawn ID;
- ordinary enemy death/pickup handling is reused;
- the blast cannot trigger another mine;
- the blast cannot create another mine;
- no Rank-I chain behavior exists.

This preserves MEMORY COLLAPSE chain behavior for the future EVO tranche rather than leaking it into Rank I.

## 6. COMMON enemy rule — PROVEN

COMMON (`TRACE`) remains corporeal in both phases, but does not bypass ECHO's memory requirement.

Deterministic qualification proves:

- COMMON cannot trigger `DORMANT_HOME`;
- COMMON cannot trigger `ARMED_AWAY` while the player is away;
- COMMON may trigger only a valid returned mine after the leave/return cycle and delay have completed.

This preserves the phase-memory identity while allowing COMMON to remain stable battlefield pressure.

## 7. Placement / replacement / expiry — PROVEN

Rank I uses a hard cap of three mines.

Placement:

- attempts occur on a bounded interval at the player's path position;
- a candidate must remain at least `56 px` from retained active mines;
- standing still therefore cannot stack mines indefinitely.

At the three-mine cap:

- the deterministic oldest mine is the active mine with the smallest stable mine ID;
- candidate separation is evaluated against the two mines that would remain;
- if legal, the oldest mine is silently replaced;
- if illegal, placement is skipped and all existing mines are retained;
- replacement does not detonate a mine.

Expiry:

- occurs at age `>= 9000 ms`;
- is silent;
- deals no damage;
- creates no pickup;
- triggers no other mine;
- frees one bounded slot;
- is processed before replacement in the runtime update.

## 8. Draft integration — PROVEN

The active weapon cap remains four including mandatory DELTA BURST.

V2-2C introduces the real acquisition card:

`ECHO_MINE`

To preserve already-qualified onboarding behavior, ECHO discovery is staged from level 3.

Qualification proves:

- level 2 remains exactly `ORBIT_NODES`, `VECTOR_NEEDLE`, `DELTA_RANK` when all are available;
- ECHO does not displace the V2-2A/V2-2B level-2 surface;
- level 3 introduces ECHO deterministically;
- the qualified level-3 acquisition surface is `ECHO_MINE`, `ORBIT_NODES`, `VECTOR_NEEDLE` when all three are legal;
- acquisition consumes exactly one active weapon slot;
- duplicate acquisition is rejected;
- disabled ECHO acquisition is rejected;
- full-slot ECHO acquisition is rejected;
- no ECHO Rank II card exists.

The level-3 discovery priority remains a bounded V2-2C qualification/onboarding rule, not final V2-3 draft weighting.

## 9. Bounded runtime — PROVEN

The Phaser scene uses exactly three pre-created ECHO mine views.

No unbounded mine-object creation is used.

Runtime evidence fields include:

- ownership;
- active mine count;
- placements;
- armed transitions;
- returns;
- triggers;
- hits;
- replacements;
- expiries;
- profile identity;
- compact stable mine-state summary.

These are read-only qualification surfaces. No browser test hook can inject mines, enemy state, phase state or damage.

## 10. Deterministic automated evidence

Final workflow:

`36307194992`

Exact tested HEAD:

`b157ebf6e5ed993b1f385cbc405b8be4cc366df7`

Inherited deterministic core:

`17 / 17 PASS`

Combined V2 combat + ECHO deterministic contracts:

`34 / 34 PASS`

The ten ECHO-specific contracts prove:

- exact bounded profile;
- genuine leave/return requirement;
- fresh return delay after leaving again;
- COMMON cannot bypass memory;
- off-phase ghosts excluded from trigger/blast;
- stable spawn-ID target ordering;
- bounded spacing and deterministic oldest replacement;
- exact expiry age contract;
- level-2 discovery preservation and level-3 ECHO introduction;
- slot consumption, duplicate rejection, disabled rejection and full-slot rejection.

All inherited DELTA, VECTOR, ORBIT, draft, phase and survival deterministic contracts remained green.

## 11. ART / TypeScript / FriendSDK regression — PROVEN

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

FriendSDK v0.1.2 archive hash verification:

`PASS`

`friendsdk check`:

`PASS`

Reported build size:

`6,200,525 bytes`

`friendsdk build`:

`PASS`

FriendSDK 960 smoke:

`PASS`

## 12. Inherited browser regressions — PROVEN

On the exact final gameplay HEAD:

V2-1:

`RARE_SHIFT_V2_1_BROWSER_960 = PASS`

`RARE_SHIFT_V2_1_BROWSER_390 = PASS`

V2-2A VECTOR:

`RARE_SHIFT_V2_2A_VECTOR_960 = PASS`

`RARE_SHIFT_V2_2A_VECTOR_390 = PASS`

V2-2B ORBIT:

`RARE_SHIFT_V2_2B_ORBIT_960 = PASS`

`RARE_SHIFT_V2_2B_ORBIT_390 = PASS`

Therefore ECHO integration did not regress the previously qualified movement / DELTA / SHIFT / draft / VECTOR / ORBIT interaction surfaces.

## 13. Dedicated ECHO browser evidence — PROVEN

The shipped FriendSDK/Phaser runtime was exercised at both required viewport classes without state injection.

The route proved:

1. real Signal Descent entry;
2. natural level-2 draft;
3. level-2 surface preserved with ECHO absent;
4. ORBIT acquired through the rendered UI;
5. natural progression to level 3;
6. exactly three actionable choices with `ECHO_MINE` present;
7. ECHO acquired through the rendered UI;
8. combat resumed and weapon-slot state advanced;
9. a real mine was placed while moving;
10. active mine count stayed `<= 3`;
11. the mine began `DORMANT_HOME`;
12. real SHIFT away produced `ARMED_AWAY` and no detonation;
13. waiting while away produced no trigger;
14. real SHIFT back produced `RETURN_READY`;
15. the immediate sub-250ms return window produced no trigger;
16. later real corporeal pressure triggered a returned mine;
17. at least one real ECHO hit occurred;
18. DELTA remained `canonical-exclusive`;
19. the player remained alive.

Results:

`RARE_SHIFT_V2_2C_ECHO_960 = PASS`

`RARE_SHIFT_V2_2C_ECHO_390 = PASS`

## 14. Final cleanup and exact-head rerun

An initial full V2-2C workflow had already passed the bounded implementation.

During review, a redundant keyboard-right movement assignment was noticed in the Phaser integration. It was not an ECHO mechanics failure, but it was unnecessary code-quality debt.

Commit:

`b157ebf6e5ed993b1f385cbc405b8be4cc366df7`

changed only that keyboard handler:

- one line added;
- two lines removed;
- no ECHO mechanic, balance value or test contract changed.

The complete qualification workflow was then rerun from scratch on this corrected exact HEAD.

Only the second exact-head run `36307194992` is authoritative for final V2-2C qualification.

## 15. Evidence artifact

Artifact name:

`rare-shift-v2-2c-evidence-36307194992`

Artifact ID:

`10927317708`

Files uploaded:

`38`

Size:

`1,096,664 bytes`

SHA-256:

`e390deb272e6b6540e7ce5d49630371c1f19e18a203ee6ad3a14911a59894eff`

Retention expiry:

`2026-10-11T08:50:02Z`

The artifact was produced by the exact final qualified gameplay HEAD.

## 16. PROVEN

- ECHO Rank I has a deterministic, bounded phase-memory state machine.
- A genuine leave-and-return cycle is mandatory before triggering.
- COMMON cannot bypass that cycle.
- Off-phase enemies cannot trigger or receive Rank-I blast damage.
- Mines are capped at three.
- Placement separation prevents standing-still stacking.
- Oldest replacement and expiry are deterministic and silent.
- Mine removal occurs before damage resolution, preventing repeat detonation.
- Rank-I blast cannot recursively trigger or create mines.
- Level-2 qualified onboarding remains intact.
- Level-3 ECHO discovery is deterministic and actionable.
- ECHO consumes one active weapon slot and cannot duplicate.
- Real 960 and 390 browser paths prove acquisition, placement, arm, return, delay, trigger and hit.
- V2-1, VECTOR and ORBIT browser regressions remain green.
- DELTA canonical identity remains intact.
- ART-00, TypeScript, FriendSDK check/build/smoke remain green.
- Final qualification was rerun after the keyboard cleanup on the exact final gameplay HEAD.

## 17. UNPROVEN / DEFERRED

V2-2C does not prove or authorize:

- final seven-minute ECHO balance;
- ECHO Rank II-V;
- MEMORY COLLAPSE;
- mine linking or chain detonation;
- SIGNAL ARC;
- multi-weapon final build balance;
- protocols or EVO;
- new enemies or bosses;
- final draft weighting;
- final SHIFT commitment-window tuning;
- RF/economy systems;
- production deployment;
- merge to `main`.

## 18. Final tranche state

`V2_2C_PROTOCOL = LOCKED`

`V2_2C_ECHO_CORE = PASS`

`V2_2C_DRAFT_ACQUISITION = PASS`

`V2_2C_RUNTIME = PASS`

`V2_2C_DETERMINISTIC_TESTS = PASS`

`V2_2C_V2_1_REGRESSION = PASS`

`V2_2C_VECTOR_REGRESSION = PASS`

`V2_2C_ORBIT_REGRESSION = PASS`

`V2_2C_BROWSER_960 = PASS`

`V2_2C_BROWSER_390 = PASS`

`V2_2C_CI_QUALIFICATION = PASS`

`V2_2C_OVERALL_DECISION = PASS`

`V2_2D_SIGNAL_ARC = NOT_STARTED`

`MAIN_MERGE = NOT_AUTHORIZED`

`PRODUCTION_DEPLOY = NOT_AUTHORIZED`

## 19. Recommended next gate

Do not add SIGNAL ARC in this same qualification closeout.

The next bounded action should be a V2-2D SIGNAL ARC Rank-I mechanics and qualification gate that first locks:

- deterministic initial-target selection;
- maximum Rank-I jump count;
- deterministic nearest-jump ordering and tie-breaking;
- maximum relay distance;
- per-cast one-hit-per-enemy rule;
- damage-decay behavior, if any;
- COMMON relay semantics;
- immediate chain-graph rewrite under SHIFT;
- explicit prohibition on cross-phase ghost damage;
- hard recursion/jump caps;
- level/progression discovery staging that preserves V2-2A/B/C onboarding;
- 960/390 real-browser proof and inherited regressions.

Only after that gate is reviewed should SIGNAL ARC Rank I implementation begin.
