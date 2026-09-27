# RARE//SHIFT V2-2D — SIGNAL ARC RANK I MECHANICS & QUALIFICATION GATE v1

**Status:** ACTIVE DESIGN GATE — OWNER AUTHORIZED FOR PLANNING  
**Date:** 2026-09-27  
**Planning branch:** `planning/v2-2d-signal-arc-gate`  
**Source closeout:** `dcffa29a4f0a6fba80effab04e0bb526eed007a0`  
**Source qualified gameplay HEAD:** `b157ebf6e5ed993b1f385cbc405b8be4cc366df7`  
**Implementation authorization:** NO — V2-2D gameplay code remains blocked until this gate is reviewed and explicitly authorized.

---

## 1. Purpose

V2-2D is the final Rank-I weapon-family gate for V2-2.

Its purpose is to lock the behavior of **SIGNAL ARC → CHAIN RESONANCE** before code is written.

The weapon must satisfy the locked V2 thesis:

> A non-DELTA weapon must change mechanically when the A/B phase law changes. If removing the phase system leaves the weapon functionally unchanged, the weapon is not acceptable.

SIGNAL ARC therefore cannot be ordinary chain lightning with phase-colored visuals. Its valid target graph must be defined by the current corporeal set, and SHIFT must rewrite that graph immediately.

This gate does not authorize Rank II-V, CHAIN RESONANCE, protocols, EVO, new enemies, THE DESYNC, final seven-minute balance, RF/economy work, merge to `main`, or production deployment.

---

## 2. Baseline inherited from qualified V2-2A/B/C

The current qualified Rank-I combat baseline includes:

- mandatory DELTA BURST;
- VECTOR NEEDLE Rank I;
- ORBIT NODES Rank I;
- ECHO MINE Rank I;
- maximum four active weapon slots including DELTA;
- movement + auto-fire + SHIFT controls;
- A-aligned, B-aligned and COMMON threat authority;
- off-phase aligned threats remain visible but are not normal damage targets;
- deterministic drafts with no dead/no-op cards;
- real 960 and 390 browser qualification routes;
- FriendSDK v0.1.2 integration;
- no rarity-based raw combat-power ladder.

Current qualified reference profiles:

| Family | Rank-I reference |
| --- | --- |
| DELTA BURST | 12 damage, 860 ms at Rank I, Friend-derived mask geometry |
| VECTOR NEEDLE | 10 damage, 760 ms, 560 px acquisition range, single-target precision |
| ORBIT NODES | 8 damage/contact, 72 px orbit, 700 ms per-target contact interval |
| ECHO MINE | 16 blast damage, 1800 ms placement cadence, three-mine hard cap |

SIGNAL ARC must add a distinct wave-clear role without invalidating any of these families.

---

## 3. Weapon identity

**Family:** SIGNAL ARC → CHAIN RESONANCE  
**Primary role:** bounded multi-target wave clear  
**Player question:**

> **How do I exploit corporeal spacing and stable COMMON relays?**

SIGNAL ARC is a **single-path target graph**, not a projectile, orbit, trap, canonical mask, beam lock, tree search or recursive effect.

The Rank-I tactical loop is:

1. wait for a valid cluster of corporeal threats;
2. let the automatic cast acquire the nearest valid starting target;
3. follow deterministic nearest-relay hops through the currently corporeal graph;
4. SHIFT when changing the A/B threat set creates a better or safer chain topology;
5. use COMMON enemies as stable relay opportunities because they remain corporeal in both phases.

The weapon gains value from **enemy spacing + current phase**, not raw rarity, random crits or manual attack timing.

---

## 4. Hard role separation

SIGNAL ARC must not become:

- VECTOR NEEDLE with extra targets;
- an elite/boss priority weapon;
- a penetrating line projectile;
- an ORBIT-style defensive perimeter;
- an ECHO-style persistent placed hazard;
- a DELTA-style Friend-derived damage shape;
- an unlimited chain-lightning proc;
- a random-target effect;
- a cross-phase ghost-damage exploit.

Hard rejection test:

> If SIGNAL ARC can operate with effectively the same target graph after A/B authority is removed, the implementation fails the design gate.

---

## 5. Rank-I qualification profile

The following profile is the bounded implementation target for V2-2D qualification:

- cast cooldown: **1250 ms**;
- initial acquisition range from player: **420 world px**;
- maximum total targets per cast: **3**;
- maximum relay jumps after the first target: **2**;
- maximum relay distance: **180 world px**;
- hit 1 damage: **10**;
- hit 2 damage: **8**;
- hit 3 damage: **6**;
- damage floor: **6**;
- branching factor: **1**;
- repeat hits on the same enemy within one cast: **0**;
- recursion: **0**;
- random crit/chance: **0**.

Equivalent Rank-I damage sequence:

`[10, 8, 6]`

Maximum total raw damage from one fully connected Rank-I cast:

`24`

These values are **PROVISIONAL FOR IMPLEMENTATION QUALIFICATION**, not final seven-minute balance.

### 5.1 Numerical intent

The profile deliberately gives SIGNAL ARC:

- a slower single-target cadence than VECTOR;
- shorter acquisition range than VECTOR;
- substantially more value only when multiple valid enemies are spatially connected;
- no one-hit Rank-I kill against current full-health TRACE or SPLIT enemies;
- no raw single-target reason to replace VECTOR;
- no local identity reason to replace DELTA;
- no persistent area-control reason to replace ECHO;
- no close-defense reason to replace ORBIT.

If implementation testing shows this profile creates dominant all-purpose damage, the numbers may be reduced without changing the locked mechanic.

---

## 6. Corporeal graph definition

At the instant a cast is executed, the eligible graph contains only enemies that are:

1. active;
2. alive;
3. CORPOREAL under the current phase law;
4. not already visited by the current cast.

Therefore:

- Phase A may include `SPLIT_A` + COMMON;
- Phase B may include `SPLIT_B` + COMMON;
- off-phase aligned enemies are excluded;
- COMMON remains eligible in both phases.

Off-phase ghosts may remain visually present in the arena, but SIGNAL ARC treats them as absent from the Rank-I target graph.

No Rank-I rule may damage, select, count or relay through an off-phase ghost.

---

## 7. Deterministic initial-target selection

The first target is selected from valid corporeal enemies within **420 px** of the player.

Selection order:

1. smallest squared distance from player;
2. if distances are exactly equal, lower stable enemy spawn ID wins.

No enemy-type priority exists at Rank I.

Specifically:

- elite/boss preference is prohibited;
- COMMON preference is prohibited;
- A/B-aligned preference is prohibited;
- low-HP execute priority is prohibited;
- random selection is prohibited.

If no valid target is in range, no cast occurs and no cooldown is consumed.

The ready accumulator may remain capped at the cooldown so the weapon can fire promptly when a legal target later enters range.

---

## 8. Deterministic relay selection

After the first target is selected, the next hop originates from the previous target's cast-start position.

A candidate relay target must be:

- active/alive at cast-plan construction time;
- corporeal in the cast phase;
- unvisited in this cast;
- within **180 px** of the previous target.

Selection order for each hop:

1. smallest squared distance from previous target;
2. exact-distance tie -> lower stable spawn ID.

The process repeats until one of these occurs:

- three total targets have been selected;
- no valid unvisited target exists within relay range.

Rank I produces exactly one chain path.

It does not branch.

It does not search for a globally optimal graph.

It does not revisit targets.

It does not recurse.

---

## 9. Plan-first, resolve-second rule

For deterministic behavior, a Rank-I cast is resolved in two bounded phases:

### Phase 1 — build cast plan

The complete target path is selected from one stable cast-start snapshot of enemy positions, active/alive state and current phase authority.

### Phase 2 — resolve damage

Damage is then applied in target-path order:

- first target: 10;
- second target: 8;
- third target: 6.

A target killed by its hit may still have served as the already-selected relay origin for the same atomic cast because the path was fixed before damage mutation.

This prevents earlier damage resolution from nondeterministically changing later target choice.

The cast plan itself is ephemeral and is discarded after resolution.

---

## 10. COMMON relay semantics

COMMON enemies are **stable relay nodes**, but receive no hidden priority or bonus.

Their special strategic value comes only from the existing phase law:

- they remain corporeal in A;
- they remain corporeal in B;
- therefore they may naturally bridge spatial gaps in either phase.

A COMMON enemy must itself be a valid hit target to act as a relay.

Rank I does **not** allow a free no-damage relay through COMMON.

Example:

`SPLIT_A -> TRACE -> SPLIT_A`

may be legal in Phase A when all three satisfy distance rules.

The same cast may not include an off-phase `SPLIT_B` merely because a TRACE sits between them.

Thus COMMON can bridge **space**, not bypass **phase authority**.

---

## 11. SHIFT interaction — locked graph rewrite

SHIFT must be mechanically meaningful to SIGNAL ARC.

### 11.1 Immediate authority rewrite

After SHIFT:

- the previous aligned corporeal set becomes ghosted;
- the opposite aligned set becomes corporeal;
- COMMON remains corporeal;
- any cached preview/acquisition from the previous phase is invalidated;
- the next cast constructs a completely new graph from the new phase authority.

### 11.2 No cross-phase pending chain

Rank I uses atomic cast resolution.

No delayed unresolved hop list may persist across SHIFT.

No pre-SHIFT target may receive delayed SIGNAL ARC damage after it has become an off-phase ghost.

### 11.3 Same-tick ordering

If a SHIFT input and a ready SIGNAL ARC cast are both accepted in the same simulation tick, **SHIFT authority is processed first** and the cast uses the post-SHIFT phase.

This ordering must be deterministic and covered by pure tests.

### 11.4 Cooldown preservation

SHIFT does not reset or grant free SIGNAL ARC cooldown progress.

It rewrites **target legality**, not the weapon clock.

This prevents SHIFT from becoming a free DPS-reset mechanic.

---

## 12. Damage and hit rules

For one Rank-I cast:

- maximum targets = 3;
- each stable enemy ID may appear at most once;
- maximum hits = 3;
- no crits;
- no proc chance;
- no status stack;
- no stun requirement;
- no recursive cast;
- no on-kill extra jump;
- no chain fork;
- no splash around each target;
- no projectile body collision;
- no ghost damage.

Ordinary enemy death and Signal XP pickup handling should be reused.

SIGNAL ARC must not create special currency, drops or progression resources.

---

## 13. FX and readability contract

SIGNAL ARC must read as a target-to-target connection graph rather than a projectile or DELTA shape.

Rank-I visual contract:

- draw a thin connection from player to first target;
- draw at most two additional target-to-target segments;
- use current-phase accent plus bounded COMMON highlight;
- maximum simultaneous logical segments: **3**;
- no full-screen flash;
- no persistent trail after the cast readability window;
- no large circular blast;
- no Friend-mask geometry;
- no effect that visually resembles ORBIT or ECHO.

Reduced-motion mode:

- retains the static connection lines briefly;
- removes or shortens pulse/tween behavior;
- preserves target readability and phase distinction.

FX duration is presentation tuning and must not affect damage timing.

---

## 14. Performance contract

SIGNAL ARC performs target search only when a cast is ready and a legal target may be acquired.

At Rank I:

- maximum target-plan depth = 3;
- maximum relay searches = 2 after initial acquisition;
- maximum resulting hit applications = 3;
- maximum FX segments = 3;
- no recursion;
- no branching graph expansion;
- no per-frame chain search;
- no unbounded target history.

With the existing bounded enemy pool, a simple deterministic scan per acquisition/hop is acceptable.

Do not add a complex spatial index solely for Rank I unless profiling proves it necessary.

---

## 15. Draft and active-slot integration

The active weapon cap remains:

**4 total active weapons including mandatory DELTA BURST.**

The acquisition card ID will be:

`SIGNAL_ARC`

### 15.1 Discovery staging

To preserve all already-qualified onboarding:

- SIGNAL ARC is disabled before **level 4**;
- level 2 retains the qualified ORBIT / VECTOR / DELTA discovery surface when all are legal;
- level 3 retains ECHO introduction and SIGNAL ARC remains absent;
- level 4+ may introduce SIGNAL ARC when it is unowned and an active slot remains.

The intended V2-2D qualification route is:

1. mandatory DELTA already occupies slot 1;
2. acquire ORBIT at level 2;
3. acquire ECHO at level 3;
4. acquire SIGNAL ARC at level 4;
5. active slots become exactly 4/4.

VECTOR remains separately qualified through its inherited route; V2-2D does not require every run to own all five families because the active cap intentionally prevents that.

### 15.2 Eligibility rules

`SIGNAL_ARC` must be absent rather than disabled when:

- feature not enabled for the current progression stage;
- already owned;
- active weapon slots are full.

Acquisition must:

- consume exactly one active slot;
- never duplicate;
- never exceed 4/4;
- resume combat normally after selection.

This staging is a V2-2 qualification rule, not final V2-3 draft weighting.

---

## 16. Pure deterministic test contract

A future implementation must add pure tests for at least the following:

1. exact Rank-I profile values;
2. off-phase enemies are excluded from initial acquisition;
3. nearest valid initial target wins;
4. equal-distance initial tie selects lower spawn ID;
5. relay selection uses previous target position;
6. relay equal-distance tie selects lower spawn ID;
7. maximum three total targets;
8. each target appears at most once per cast;
9. no branching;
10. damage sequence is exactly `[10, 8, 6]`;
11. chain stops when no candidate lies within 180 px;
12. COMMON is eligible in both phases;
13. COMMON cannot relay to an off-phase ghost;
14. SHIFT changes eligible aligned targets while preserving COMMON;
15. same-tick SHIFT-before-cast ordering uses post-SHIFT authority;
16. SHIFT does not reset cooldown progress;
17. no-target state consumes no cast;
18. level-2 surface remains unchanged;
19. level-3 ECHO surface remains unchanged with SIGNAL ARC absent;
20. level-4 SIGNAL ARC acquisition is legal when a slot remains;
21. duplicate acquisition is rejected;
22. full-slot acquisition is rejected;
23. active slot count cannot exceed four.

All inherited DELTA, VECTOR, ORBIT, ECHO, draft and phase tests must stay green.

---

## 17. Runtime qualification observability

Read-only qualification state may expose:

- `signalOwned`;
- `signalProfile = rank1-phase-chain`;
- `signalCasts`;
- `signalHits`;
- `signalMultiTargetCasts`;
- `signalLastCastPhase`;
- `signalLastChainIds`;
- `signalLastChainKinds`;
- `signalLastChainDamage`;
- `signalShiftGraphInvalidations`;
- `signalCooldownReady` or equivalent bounded clock state.

These fields are observability only.

No browser test hook may:

- spawn enemies;
- move enemies;
- set enemy HP;
- force phase;
- inject a chain;
- deal damage;
- grant SIGNAL ARC;
- advance level/XP directly.

Browser proof must use the rendered game and real controls.

---

## 18. 960 / 390 real-browser qualification route

Both desktop-class 960 and narrow 390 routes must prove, through natural play:

1. enter the real Signal Descent runtime;
2. level 2 appears with SIGNAL ARC absent;
3. acquire ORBIT through the rendered draft;
4. level 3 appears with ECHO available and SIGNAL ARC absent;
5. acquire ECHO through the rendered draft;
6. naturally progress to level 4;
7. level 4 offers an actionable SIGNAL ARC acquisition when the fourth slot is free;
8. acquire SIGNAL ARC through rendered UI;
9. weapon slots become 4/4 and combat resumes;
10. at least one real SIGNAL ARC cast occurs;
11. every recorded chain contains at most three unique enemy IDs;
12. every hit target is corporeal for the recorded cast phase;
13. at least one natural cast reaches two or more targets, proving actual chaining rather than single-target fallback;
14. a real SHIFT occurs after SIGNAL ARC ownership;
15. a subsequent cast uses the post-SHIFT corporeal graph;
16. no off-phase aligned enemy appears in that cast's chain;
17. COMMON remains legal after either phase when naturally present;
18. DELTA remains `canonical-exclusive`;
19. ORBIT and ECHO remain functional;
20. player remains alive through the proof.

The browser route may use real movement to herd naturally spawned enemies into relay distance.

It may not inject or reposition them.

---

## 19. Regression gate

A final V2-2D CI workflow must keep green:

- inherited deterministic core tests;
- all V2 combat tests;
- all ECHO tests;
- V2 ART-00 deterministic proof;
- ART browser 960/390;
- TypeScript core;
- game TypeScript;
- FriendSDK archive hash verification;
- FriendSDK check;
- FriendSDK build;
- FriendSDK 960 smoke;
- V2-1 browser 960/390;
- VECTOR browser 960/390;
- ORBIT browser 960/390;
- ECHO browser 960/390;
- new SIGNAL ARC browser 960/390.

Evidence must be generated from one exact gameplay HEAD after the final code cleanup.

If any cleanup changes gameplay/runtime code after a green run, the complete qualification workflow must rerun from scratch on the corrected exact HEAD.

---

## 20. Explicit Rank-I prohibitions

V2-2D Rank I must not add:

- Rank II EXTRA LINK;
- Rank III LOWER DECAY;
- Rank IV RESONANT RELAY;
- Rank V CHAIN CONTROL;
- CHAIN RESONANCE evolution;
- post-SHIFT cross-phase echo;
- chain branching;
- recursive chains;
- chain-on-kill;
- random crits;
- rarity scaling;
- generation-based power scaling;
- elite/boss target priority;
- manual cast button;
- new enemies;
- protocols;
- Evolution Cores;
- RF combat power;
- persistence/backend work;
- merge to `main`;
- deployment.

---

## 21. Rank II-V forward compatibility — V2-3 only

The base mechanic must leave room for the already-governed future direction:

- **Rank II — EXTRA LINK:** one additional bounded jump;
- **Rank III — LOWER DECAY:** reduce per-hop damage loss;
- **Rank IV — RESONANT RELAY:** stronger deterministic COMMON relay behavior without ghost bypass;
- **Rank V — CHAIN CONTROL:** improved deterministic coverage/order while retaining hard caps;
- **CHAIN RESONANCE EVO:** additional bounded jumps, reduced decay, and only then a specifically reviewed controlled post-SHIFT COMMON-mediated phase echo.

None of those behaviors may leak into V2-2D Rank I.

---

## 22. Design review — why this form is preferred

This Rank-I design preserves the five-family role matrix:

| Family | Player problem | Rank-I spatial logic |
| --- | --- | --- |
| DELTA | use my Friend's identity geometry | canonical A/B mask |
| VECTOR | pressure one important corporeal threat | nearest precision target |
| ORBIT | defend close space and reverse sweep | phase-reversing orbit |
| ECHO | prepare damage for a return to a reality | leave/return memory zone |
| SIGNAL ARC | exploit current corporeal clustering | bounded relay graph |

SIGNAL ARC is strategically differentiated because its value depends on the **topology of the current corporeal graph**.

A player may SHIFT not simply to escape danger, but because the new phase can expose a different cluster connected through COMMON relays.

That makes phase selection relevant to offensive route planning while retaining MOVE + SHIFT as the only active tactical controls.

---

## 23. PROVEN / UNPROVEN / UNKNOWN

### PROVEN before this gate

- V2-2 weapon architecture is locked;
- DELTA identity role is qualified;
- VECTOR Rank I is qualified;
- ORBIT Rank I is qualified;
- ECHO Rank I is qualified;
- four-slot active cap exists;
- A/B/COMMON phase authority exists;
- off-phase aligned enemies are already represented as ghosts;
- deterministic spawn IDs exist for stable tie-breaking;
- 960/390 browser qualification infrastructure exists;
- V2-2C closeout is recorded on the source branch.

### UNPROVEN

- whether `[10, 8, 6]` is the best final damage curve;
- whether 1250 ms is the best final cooldown;
- whether 420 px / 180 px are the best final acquisition/relay distances;
- whether natural level-4 browser play can reliably demonstrate a two-plus-target chain without test injection;
- whether SIGNAL ARC remains satisfying under full V2-3 rank/protocol/EVO breadth;
- full five-family balance across an ordinary seven-minute run;
- physical-phone readability under maximum four-weapon load.

### UNKNOWN

- final player preference among the five weapon families;
- final competitive meta after Rank II-V and protocols exist;
- whether COMMON density needs later pacing adjustment specifically because of relay value.

---

## 24. Decision state

`V2_2D_MECHANICS_GATE = ACTIVE`

`V2_2D_SIGNAL_ARC_ROLE = LOCKED`

`V2_2D_TARGET_GRAPH_MODEL = LOCKED`

`V2_2D_INITIAL_TARGET_RULE = LOCKED`

`V2_2D_RELAY_RULE = LOCKED`

`V2_2D_COMMON_RELAY_SEMANTICS = LOCKED`

`V2_2D_SHIFT_GRAPH_REWRITE = LOCKED`

`V2_2D_MAX_TARGETS = LOCKED_3`

`V2_2D_NO_GHOST_DAMAGE = LOCKED`

`V2_2D_NO_BRANCHING_RECURSION = LOCKED`

`V2_2D_DISCOVERY_STAGE = LOCKED_LEVEL_4_FOR_V2_2`

`V2_2D_NUMERICAL_PROFILE = PROVISIONAL_FOR_IMPLEMENTATION_QUALIFICATION`

`V2_2D_IMPLEMENTATION = NOT_STARTED`

`V2_2D_IMPLEMENTATION_AUTHORIZATION = BLOCKED`

`MAIN_MERGE = NOT_AUTHORIZED`

`PRODUCTION_DEPLOY = NOT_AUTHORIZED`

---

## 25. Next gate

Before SIGNAL ARC code begins:

1. review this V2-2D mechanics gate;
2. change any mechanic or qualification requirement that fails owner review;
3. explicitly authorize the bounded Rank-I implementation tranche.

If authorized, implementation should proceed in this order:

1. pure `signal-arc-core` profile + target-path planner;
2. deterministic unit tests;
3. draft acquisition and level-4 staging;
4. bounded Phaser runtime + read-only observability;
5. SIGNAL ARC FX/readability;
6. 960/390 natural browser proof;
7. inherited V2-1/VECTOR/ORBIT/ECHO regressions;
8. exact-head CI qualification;
9. documentation-only closeout report.

Do not implement Rank II+, CHAIN RESONANCE, protocols, new enemies or pacing in the same tranche.