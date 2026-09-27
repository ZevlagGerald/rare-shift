# RARE//SHIFT V2-2D — SIGNAL ARC RANK I QUALIFICATION REPORT

**Evidence status:** TECHNICAL QUALIFICATION PASS  
**Decision status:** PASS — BOUNDED V2-2D TRANCHE QUALIFIED  
**Date:** 2026-09-27  
**Qualified branch:** `feature/v2-2d-signal-arc-rank1`  
**Exact qualified gameplay HEAD:** `e1898a68950d71e1fbbc4980cc018cf48801ee3d`  
**Final qualification workflow:** `36310545021`  
**Post-qualification tooling cleanup HEAD before this report:** `4c01f299c026576c4467606c72df531a4ad7396c`  
**Main merge:** NOT AUTHORIZED  
**Production deployment:** NOT AUTHORIZED

## 1. Result

V2-2D qualifies SIGNAL ARC Rank I as the final V2-2 base weapon family.

SIGNAL ARC is a bounded multi-target wave-clear weapon whose target graph is rebuilt from the currently CORPOREAL enemy set. It is not generic chain lightning with phase-colored presentation.

Its defining tactical question is:

> **How do I exploit corporeal spacing and stable COMMON relays?**

The implementation preserves DELTA as the Friend-specific identity center and keeps VECTOR, ORBIT and ECHO mechanically distinct.

No Rank II-V, CHAIN RESONANCE, protocols, EVO, new enemies, final seven-minute balance, RF/economy work, merge to `main`, or deployment is included.

## 2. Qualified Rank-I profile

V2-2D qualified the following bounded implementation profile:

- cast cooldown: `1250 ms`;
- initial acquisition range: `420 world px`;
- relay range: `180 world px`;
- maximum total targets: `3`;
- maximum relay jumps: `2`;
- damage sequence: `[10, 8, 6]`;
- maximum raw damage for one complete cast: `24`;
- branching: `0`;
- repeated hit on same enemy/cast: `0`;
- recursion: `0`;
- random crit/chance: `0`.

These values qualify the bounded V2-2D sandbox and remain provisional for later full-run balance.

## 3. Corporeal target graph — PROVEN

A cast plan contains only enemies that are:

- active;
- currently CORPOREAL under the cast phase;
- inside the relevant range;
- not already visited by the current cast.

The initial target is the nearest valid enemy within `420 px` from the player.

Each relay is the nearest unvisited valid enemy within `180 px` from the previous target's cast-start position.

Equal-distance ties use the lower stable enemy spawn ID.

The complete path is built first from one cast-start snapshot, then damage resolves in path order. This prevents mutation from an earlier hit/death from changing later target selection.

The path is hard-capped to three unique targets and never branches.

## 4. COMMON relay semantics — PROVEN

COMMON enemies remain legal targets in both phases and can naturally serve as stable relay nodes.

COMMON receives no hidden target priority, no free relay privilege and no damage immunity.

COMMON may bridge **space**, but cannot bridge **phase authority**.

Therefore a chain cannot reach an off-phase aligned ghost through a COMMON target.

## 5. SHIFT graph rewrite — PROVEN

SHIFT changes SIGNAL ARC mechanically rather than cosmetically.

After SHIFT:

- the previous aligned set becomes ghosted;
- the opposite aligned set becomes corporeal;
- COMMON remains corporeal;
- cached chain evidence is invalidated;
- the next cast plans against the new phase graph;
- no delayed pre-SHIFT chain survives into the new phase;
- cooldown progress is preserved rather than reset.

Pure deterministic qualification also proves same-tick SHIFT-before-cast authority: when an accepted SHIFT and ready cast coincide, the cast phase is the post-SHIFT phase.

## 6. Draft and four-slot integration — PROVEN

The active weapon cap remains four including mandatory DELTA BURST.

SIGNAL ARC acquisition ID:

`SIGNAL_ARC`

Qualified bounded onboarding:

- level 2 preserves the existing ORBIT / VECTOR / DELTA discovery surface;
- SIGNAL ARC is absent at level 2;
- level 3 preserves ECHO introduction;
- SIGNAL ARC is absent at level 3;
- SIGNAL ARC becomes eligible from level 4 when unowned and a slot remains;
- acquisition consumes exactly one active slot;
- duplicate acquisition is rejected;
- disabled acquisition is rejected;
- full-slot acquisition is rejected;
- active weapon slots cannot exceed four.

The V2-2D natural browser proof uses DELTA + ORBIT + ECHO + SIGNAL ARC as the 4/4 proof build. VECTOR remains separately qualified and competes for the same finite build capacity as intended.

## 7. Runtime and readability — PROVEN

SIGNAL ARC uses one bounded automatic cooldown and one atomic path plan per successful cast.

Runtime characteristics:

- no manual attack button;
- no projectile pool required;
- no per-frame chain graph search;
- no recursion;
- maximum three hit applications per cast;
- short-lived thin connection FX;
- COMMON nodes receive a bounded visual marker;
- reduced-motion mode preserves readable connection lines with shortened presentation;
- FX timing does not affect damage timing.

Read-only browser evidence exposes ownership, cast count, hit count, multi-target cast count, cast phase, last chain IDs/kinds/damage and SHIFT graph invalidations.

No browser qualification hook can inject enemies, phase, damage, XP, level, weapon ownership or a chain path.

## 8. Deterministic automated evidence

Final authoritative workflow:

`36310545021`

Exact tested gameplay HEAD:

`e1898a68950d71e1fbbc4980cc018cf48801ee3d`

Inherited deterministic core:

`17 / 17 PASS`

Combined V2 combat suite:

`57 / 57 PASS`

SIGNAL ARC-specific deterministic contracts:

`23 / 23 PASS`

The SIGNAL ARC contracts cover:

- exact bounded profile;
- active/inactive target filtering;
- exact `420 px` acquisition boundary;
- off-phase exclusion;
- nearest initial target;
- stable-ID initial tie breaking;
- relay from previous target position;
- stable-ID relay tie breaking;
- three-target hard cap;
- unique-target guarantee;
- exact `[10,8,6]` damage sequence;
- `180 px` relay boundary behavior;
- COMMON eligibility in both phases;
- COMMON cannot bridge to ghosts;
- phase graph rewrite under SHIFT;
- same-tick post-SHIFT authority;
- deterministic cooldown accumulation/cap;
- no-target empty plan;
- candidate-array-order invariance;
- level-2 onboarding preservation;
- level-3 ECHO preservation;
- level-4 SIGNAL ARC discovery;
- acquisition/duplicate/disabled/full-slot rules.

All inherited DELTA, VECTOR, ORBIT, ECHO, draft and phase contracts remained green.

## 9. ART / TypeScript / FriendSDK regression — PROVEN

V2 ART-00 deterministic tests:

`7 / 7 PASS`

ART static/motion proof:

`PASS`

ART browser 960 / 390:

`PASS / PASS`

TypeScript core:

`PASS`

Game TypeScript:

`PASS`

FriendSDK v0.1.2 archive hash verification:

`PASS`

`friendsdk check`:

`PASS`

Reported build size:

`6,207,425 bytes`

`friendsdk build`:

`PASS`

FriendSDK 960 smoke:

`PASS`

## 10. Inherited browser regressions — PROVEN

On the exact qualified gameplay HEAD:

V2-1:

`RARE_SHIFT_V2_1_BROWSER_960 = PASS`

`RARE_SHIFT_V2_1_BROWSER_390 = PASS`

VECTOR:

`RARE_SHIFT_V2_2A_VECTOR_960 = PASS`

`RARE_SHIFT_V2_2A_VECTOR_390 = PASS`

ORBIT:

`RARE_SHIFT_V2_2B_ORBIT_960 = PASS`

`RARE_SHIFT_V2_2B_ORBIT_390 = PASS`

ECHO:

`RARE_SHIFT_V2_2C_ECHO_960 = PASS`

`RARE_SHIFT_V2_2C_ECHO_390 = PASS`

Therefore SIGNAL ARC integration did not regress previously qualified movement, DELTA, SHIFT, drafting, VECTOR, ORBIT or ECHO browser surfaces.

## 11. Dedicated SIGNAL ARC browser evidence — PROVEN

Real FriendSDK/Phaser runtime qualification at both viewport classes proved through ordinary controls:

1. real Signal Descent entry;
2. level-2 SIGNAL ARC absence and prior onboarding preservation;
3. ORBIT acquisition through rendered draft UI;
4. level-3 ECHO introduction with SIGNAL ARC still absent;
5. ECHO acquisition through rendered draft UI;
6. natural progression to level 4;
7. actionable SIGNAL ARC acquisition through rendered UI;
8. active weapon capacity reaches exactly 4/4;
9. combat resumes;
10. real automatic SIGNAL ARC casts occur;
11. real SIGNAL ARC damage occurs;
12. at least one natural multi-target cast occurs;
13. recorded path uses two or three unique enemy IDs;
14. recorded damage matches the `[10,8,6]` prefix;
15. recorded target kinds obey the recorded cast phase;
16. real SHIFT invalidates the previous graph evidence;
17. a subsequent cast uses the post-SHIFT phase graph;
18. no off-phase aligned target appears in the new chain;
19. DELTA remains `canonical-exclusive`;
20. ORBIT and ECHO remain owned/functional;
21. player remains alive through qualification.

Results:

`RARE_SHIFT_V2_2D_SIGNAL_960 = PASS`

`RARE_SHIFT_V2_2D_SIGNAL_390 = PASS`

## 12. Evidence artifact

Artifact name:

`rare-shift-v2-2d-evidence-36310545021`

Artifact ID:

`10929141182`

Files uploaded:

`44`

Size:

`1,238,573 bytes`

SHA-256:

`cad738b0b8fafa711e3b84647143ce99eebd9ef32941da62855803159ed9fcbb`

Retention expiry:

`2026-10-11T09:54:04Z`

The artifact was generated from the exact qualified gameplay HEAD.

## 13. Post-qualification tooling cleanup

The runtime integration was applied once using a temporary branch-only patch helper and write-enabled workflow.

After exact-head technical qualification succeeded, both temporary files were removed:

- `.github/workflows/v2-2d-runtime-apply.yml`;
- `scripts/apply-v2-2d-runtime.mjs`.

Cleanup HEAD before this report:

`4c01f299c026576c4467606c72df531a4ad7396c`

The two cleanup commits remove only those helper files. They do not modify `games/rare-shift/**`, the qualification workflow, the deterministic tests, package behavior or any qualified runtime source.

The exact qualified gameplay HEAD therefore remains `e1898a68950d71e1fbbc4980cc018cf48801ee3d`.

## 14. PROVEN

- SIGNAL ARC Rank I is deterministic and bounded.
- Target graph is phase-authoritative.
- Off-phase ghosts cannot be initial targets, relays or damage recipients.
- COMMON relays preserve phase authority.
- Initial and relay ties use stable enemy IDs.
- Target path is non-branching and max three unique enemies.
- Cast damage is exactly `[10,8,6]` for a complete path.
- No valid target consumes no cast.
- SHIFT rewrites graph authority without resetting cooldown.
- Level-2 and level-3 onboarding remain intact.
- Level-4 SIGNAL ARC acquisition is actionable and respects the four-slot cap.
- Real 960 and 390 runs prove acquisition, chaining, SHIFT rewrite and post-SHIFT legality.
- All inherited browser regressions remain green.
- DELTA canonical identity remains intact.
- ART, TypeScript and FriendSDK gates remain green.
- Temporary write-enabled implementation tooling was removed after qualification.

## 15. UNPROVEN / DEFERRED

V2-2D does not prove or authorize:

- final seven-minute SIGNAL ARC balance;
- Rank II-V;
- CHAIN RESONANCE;
- final five-family build meta;
- protocols or EVO;
- new enemy families or bosses;
- final draft weighting;
- final SHIFT commitment-window tuning;
- full four-weapon readability/performance under competition-length swarm pressure;
- physical-phone feel;
- RF/economy systems;
- production deployment;
- merge to `main`.

## 16. Final tranche state

`V2_2D_MECHANICS_GATE = SATISFIED`

`V2_2D_SIGNAL_ARC_CORE = PASS`

`V2_2D_DRAFT_ACQUISITION = PASS`

`V2_2D_RUNTIME = PASS`

`V2_2D_DETERMINISTIC_TESTS = PASS`

`V2_2D_V2_1_REGRESSION = PASS`

`V2_2D_VECTOR_REGRESSION = PASS`

`V2_2D_ORBIT_REGRESSION = PASS`

`V2_2D_ECHO_REGRESSION = PASS`

`V2_2D_BROWSER_960 = PASS`

`V2_2D_BROWSER_390 = PASS`

`V2_2D_CI_QUALIFICATION = PASS`

`V2_2D_OVERALL_DECISION = PASS`

`V2_2_BASE_WEAPON_FAMILY_IMPLEMENTATION = COMPLETE`

`V2_2_FULL_CLOSEOUT = NOT_YET_COMPLETE`

`V2_3_RANK_PROTOCOL_EVO = NOT_STARTED`

`MAIN_MERGE = NOT_AUTHORIZED`

`PRODUCTION_DEPLOY = NOT_AUTHORIZED`

## 17. Recommended next gate

Do **not** begin V2-3 immediately.

The four new Rank-I families are now individually qualified, but the original V2-2 architecture still requires a cross-weapon closeout before advancement.

The next bounded action should be **V2-2E CROSS-WEAPON / FOUR-SLOT CLOSEOUT**, covering:

- one integrated deterministic build-state matrix across all five families;
- proof that only four active weapons can coexist including DELTA;
- alternative valid build paths rather than one forced sequence;
- cross-weapon simultaneous runtime stability;
- readability when DELTA + three additional weapons are active together;
- bounded object/search/FX behavior under the full four-weapon load;
- 960/390 integrated browser evidence;
- reduced-motion verification under four-weapon load;
- final V2-2 PROVEN / UNPROVEN / UNKNOWN reconciliation;
- owner gameplay-review gate.

Only after V2-2 closeout should V2-3 Rank II-V, protocols and EVO implementation be opened.
