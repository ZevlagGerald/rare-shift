# RARE//SHIFT V2-2 — PHASE-RESPONSIVE WEAPON MECHANICS GATE v1

**Status:** ACTIVE DESIGN GATE — OWNER AUTHORIZED FOR PLANNING  
**Date:** 2026-09-27  
**Source baseline:** `f8917ee5935ff1df4daf08c1cc4eb8f50ee1c426`  
**Planning branch:** `planning/v2-2-phase-weapon-gate`  
**Implementation authorization:** **NO — V2-2 CODE REMAINS BLOCKED** until the V2-1C closeout gate is explicitly satisfied and a bounded V2-2 implementation tranche is authorized.

## 1. Purpose

This document converts the post-V2-1 competitive/mechanical review into a bounded implementation standard for V2-2.

It does **not** add weapons to the game. It defines what those weapons must be before implementation is allowed.

The goal is to prevent RARE//SHIFT from becoming a conventional survivor-like with ordinary projectile/area weapons layered on top of a cosmetic phase button.

The governing product thesis remains:

> **Your Friend is not a skin. Its animation is your weapon and the battlefield's phase law.**

Every major combat system added after V2-1 must preserve that thesis.

## 2. Research and competition review basis

The Vibeathon's Character Spotlight category rewards use of a Generations NFT as the main character. The official event guidance permits a focused working interaction; feature volume alone is not required.

Current public competition includes at least one direct survivor-like entry, **Stay Rare**, which already uses auto-fire, three-choice leveling, weapon evolution, bosses, family-specific weapons/traits, deterministic simulation and balance testing. Other Character Spotlight entries compete through broad content volume and progression.

RARE//SHIFT therefore must not compete primarily by copying genre breadth. Its strongest differentiated mechanic is already proven structurally:

- the selected Friend supplies canonical animation frames;
- deterministic A/B selection derives `A_ONLY`, `B_ONLY`, `COMMON` and `DELTA` geometry;
- SHIFT changes phase authority;
- DELTA BURST uses the selected Friend's real geometry;
- the canonical nine-family corpus qualified all nine families under the existing selector/phase invariant.

Design references reviewed before this gate also reinforce two principles:

1. a two-state switch is deepest when each state creates a **tradeoff**, not a free escape;
2. weapons are more replayable when they differ behaviorally and synergistically rather than existing mainly as stat variants.

References:

- Rare Friends Vibeathon rules: `https://github.com/spokesz/rarefriends-vibeathon`
- Stay Rare submission: `https://github.com/spokesz/rarefriends-vibeathon/pull/72`
- Existing RARE//SHIFT master baseline and survival design in this repository.

## 3. Design verdict

### LOCKED

- MOVE + AUTO-FIRE + SHIFT remains the core input model.
- DELTA BURST remains mandatory slot 1 and the strongest Character Spotlight proof.
- Five weapon families remain the intended architecture:
  - DELTA BURST;
  - VECTOR NEEDLE;
  - ORBIT NODES;
  - ECHO MINE;
  - SIGNAL ARC.
- Four active slots total, including DELTA BURST.
- NFT identity changes geometry/behavior, not a simple raw-power rarity ladder.
- The standard run remains free and no RF purchase may buy combat power.

### REJECTED

- adding four generic weapons whose only meaningful differences are DPS, cooldown, projectile count, area or rarity;
- rarity-tier power chips such as Common/Rare/Legendary as the primary level-up structure;
- adding extra active combat buttons to make the weapon system feel deeper;
- using NFT rarity/generation as a direct stronger/weaker combat ladder;
- using SHIFT primarily as an immunity/escape toggle.

### PROVISIONAL — MUST BE QUALIFIED

- a short anti-spam SHIFT commitment interval;
- exact tuning for off-phase ECHO damage;
- weapon numerical values;
- final rank-II–V timings/amounts;
- phase-responsive THE DESYNC geometry reserved for V2-5.

## 4. Phase Law v2

V2-2 weapon design is governed by the following combat law.

### 4.1 Corporeal authority

For an A- or B-aligned enemy:

- matching current phase: **CORPOREAL**;
- opposite phase: **GHOSTED**.

CORPOREAL enemies:

- may deal their normal contact/attack threat;
- may be targeted normally by phase-valid weapons;
- receive full matching-phase weapon effects.

GHOSTED enemies:

- remain visible and continue deterministic movement/repositioning;
- do not deal normal contact damage;
- are not deleted, frozen or reset merely because the player SHIFTs away;
- receive only explicitly authorized low ECHO interaction, never full generic damage.

This makes SHIFT defer and reshape a threat rather than erase it.

### 4.2 COMMON pressure

COMMON enemies remain corporeal in both phases.

They exist specifically to prevent the optimal strategy from becoming "switch to whichever phase has fewer enemies and stay there forever."

COMMON density must remain bounded so it creates phase-independent pressure without invalidating the A/B mechanic.

### 4.3 Emergence safety

The existing rule remains:

> An enemy becoming corporeal may not materialize unfairly inside the player's immediate contact-danger radius.

Deterministic emergence separation remains required.

### 4.4 SHIFT commitment

A short post-SHIFT interval is recommended so A/B cannot be spammed as an instantaneous invulnerability oscillator.

Initial qualification candidates:

- 350 ms;
- 450 ms;
- 550 ms.

**Recommended initial test value:** 450 ms.

This value is **PROVISIONAL**. It is not a mana system, charge meter or long cooldown. It exists only to make each reality choice readable and committed.

A value may be locked only after manual and automated play evidence confirms:

- normal defensive reaction remains responsive;
- touch input remains usable;
- repeated rapid toggling is not optimal;
- the interval does not make unavoidable damage common.

## 5. Weapon design contract

Every non-DELTA weapon must pass all of these questions:

1. **Distinct role:** What combat problem does this weapon solve that no other weapon solves?
2. **Phase materiality:** Does SHIFT materially change this weapon's behavior, target set, timing, geometry or tactical value?
3. **Readable decision:** Can a player understand why a SHIFT helped or hurt this weapon without reading hidden numbers?
4. **No identity theft:** Does the weapon support DELTA rather than replace DELTA as the main Friend-specific spectacle?
5. **Bounded complexity:** Does the mechanic remain deterministic, testable and hard-capped under swarm load?

Hard rejection test:

> If removing the A/B phase system would leave the weapon functionally unchanged, the weapon is not acceptable for V2-2.

## 6. Weapon family specifications

V2-2 implements **Rank I base behavior only** for the four new weapons. Rank II–V behavior below is a design contract for V2-3 so V2-2 cannot create a dead-end base mechanic.

### 6.1 DELTA BURST → RECONSTRUCTION FIELD

**Role:** canonical identity / local spatial control.  
**Status:** LOCKED signature family.

DELTA is the only weapon whose primary damaging shape is directly derived from the selected Friend's canonical A/B geometry.

Rank path remains:

- **I — SIGNAL PULSE:** active-phase canonical mask pulse;
- **II — DENSE SAMPLE:** shorter pulse interval;
- **III — FIELD SCALE:** larger world-space mask footprint with normalized power budget;
- **IV — PHASE ECHO:** previous-phase mask lingers briefly after SHIFT at reduced authority;
- **V — LOCKED IDENTITY:** stronger matching-phase authority/stagger without changing the fairness-normalized total-power model.

Evolution remains **RECONSTRUCTION FIELD**.

No other weapon may reproduce canonical mask-shaped damage fields.

### 6.2 VECTOR NEEDLE → PRISM LANCE

**Primary role:** precision / elite and boss pressure.  
**Player question:** **Which threat do I commit focus to after the phase changes?**

#### Rank I — V2-2 base contract

- periodically acquires the nearest valid CORPOREAL target within bounded range;
- fires one fast, readable projectile;
- does not target an off-phase ghost as a normal target;
- on SHIFT, current acquisition is invalidated and the next shot re-acquires from the newly corporeal threat set;
- target priority must be deterministic under equal-distance ties.

This creates immediate phase materiality because target availability rewrites on every SHIFT.

#### Rank II–V direction — V2-3 only

- **II — CLEAN LINE:** bounded projectile penetration through one additional corporeal target when geometry permits;
- **III — PRIORITY TRACE:** deterministic elite/boss preference inside a limited priority band without ignoring nearby danger entirely;
- **IV — PHASE TRANSFER:** first shot after SHIFT gains one bounded line-through opportunity against the newly corporeal set;
- **V — VECTOR LOCK:** repeated valid hits on the same corporeal high-value target improve focus behavior without introducing random crit dependence.

Evolution **PRISM LANCE** preserves the existing design identity:

- stronger penetration;
- one controlled refraction to another valid target;
- predictable boss targeting.

#### Prohibited overlap

VECTOR may not become a chain-lightning weapon, orbit defense or persistent area trap.

### 6.3 ORBIT NODES → SYNC HALO

**Primary role:** close defense / crowd control.  
**Player question:** **When do I reverse my defensive sweep?**

#### Rank I — V2-2 base contract

- one node orbits the Friend at a deterministic angular velocity;
- only CORPOREAL enemies receive its normal contact hit;
- Phase A and Phase B use opposite rotation direction;
- SHIFT therefore visibly reverses the node's travel direction;
- reversal itself does **not** grant free invulnerability or unlimited multi-hit damage;
- each target has a bounded contact-hit interval.

The phase change must be visually obvious even without reading HUD text.

#### Rank II–V direction — V2-3 only

- **II — SECOND NODE:** adds another bounded node with deterministic spacing;
- **III — STABLE ORBIT:** improves coverage/control rather than simply multiplying raw damage;
- **IV — PHASE SHEAR:** SHIFT reversal produces one short bounded sweep/contact event;
- **V — SYNCHRONIZED RING:** tighter defensive continuity with strict repeated-hit limits.

Evolution **SYNC HALO**:

- more continuous rotating defense;
- every SHIFT reverses rotation;
- one bounded knockback pulse;
- COMMON enemies resist repeated knockback abuse.

#### Prohibited overlap

ORBIT may not become the main long-range DPS option and may not make standing still optimal.

### 6.4 ECHO MINE → MEMORY COLLAPSE

**Primary role:** delayed area denial / route planning.  
**Player question:** **Where will I want damage waiting when I return to this reality?**

#### Rank I — V2-2 base contract

- periodically leaves a mine near the player's recent path;
- every mine records the phase in which it was created;
- while the player remains in that same phase, the mine is visible but dormant/preparing;
- leaving its recorded phase arms the mine's memory state;
- when the player later returns to that phase, the mine may trigger against a valid CORPOREAL enemy entering its radius;
- mines have a hard active-count cap;
- oldest-mine replacement/expiry is deterministic;
- no mine may recurse or create another mine.

A player who never SHIFTs receives much less tactical value from ECHO MINE. That is intentional.

#### Rank II–V direction — V2-3 only

- **II — LONG MEMORY:** increases bounded active capacity or lifetime;
- **III — WIDER COLLAPSE:** modest radius improvement;
- **IV — FAST RECALL:** reduces post-return trigger latency without immediate unavoidable detonation;
- **V — DEEP MEMORY:** improves route-control authority while preserving a hard cap and deterministic replacement.

Evolution **MEMORY COLLAPSE**:

- armed mines may link to the nearest other mine within bounded distance;
- one detonation may propagate a limited chain;
- chain depth is hard-capped;
- no recursive unbounded propagation.

#### Prohibited overlap

ECHO MINE may not function as a generic mine that is equally effective without SHIFT.

### 6.5 SIGNAL ARC → CHAIN RESONANCE

**Primary role:** multi-target wave clear.  
**Player question:** **How do I exploit corporeal spacing and stable COMMON relays?**

#### Rank I — V2-2 base contract

- acquires one valid CORPOREAL target;
- jumps to a small hard-capped number of nearby CORPOREAL targets;
- each target may be hit at most once per cast;
- off-phase ghosts are not ordinary chain targets;
- COMMON enemies may participate as stable relay nodes because they remain corporeal in both phases;
- target selection and tie-breaking are deterministic.

SHIFT changes the available chain graph immediately by replacing one aligned corporeal set with the other while retaining COMMON relays.

#### Rank II–V direction — V2-3 only

- **II — EXTRA LINK:** one additional bounded jump;
- **III — LOWER DECAY:** reduced effectiveness loss per jump;
- **IV — RESONANT RELAY:** stronger deterministic use of COMMON as a bridge without cross-phase free damage;
- **V — CHAIN CONTROL:** improved target ordering/coverage while preserving hard jump caps.

Evolution **CHAIN RESONANCE**:

- additional bounded jumps;
- reduced decay;
- after SHIFT, the next cast may include one controlled COMMON-mediated phase echo as already specified by the survival design.

#### Prohibited overlap

SIGNAL ARC may not become VECTOR's elite-focus tool or ECHO MINE's persistent area-denial system.

## 7. Weapon-role separation matrix

| Family | Primary job | Spatial model | Main SHIFT consequence | Must not become |
| --- | --- | --- | --- | --- |
| DELTA BURST | identity / local control | Friend-derived mask | active canonical geometry changes | generic circle AoE |
| VECTOR NEEDLE | elite/boss pressure | line projectile | target set/re-acquisition changes | chain clear |
| ORBIT NODES | close defense | moving ring/orbit | rotation reverses | long-range DPS |
| ECHO MINE | route denial | persistent placed zones | leave/return arms memory | generic always-on mine |
| SIGNAL ARC | wave clear | bounded target graph | chain graph rewrites | elite-lock projectile |

If two families begin answering the same player question in the same way, the design must be reviewed before implementation continues.

## 8. Draft-system reconciliation

This gate records the following owner-authorized design reconciliation.

### 8.1 Bounded V2-1 safety behavior

The current V2-1C behavior is accepted as a **BOUNDED SANDBOX EXCEPTION**:

- render 3 legal cards when 3 exist;
- render 2 when only 2 exist;
- render 1 when only 1 exists;
- render no fake/dead card when none exist;
- if the tiny V2-1 pool is fully exhausted, auto-resolve and resume combat.

This exception exists because the V2-1 proof pool contains only three temporary candidates.

It is not the intended normal competition-facing progression loop.

### 8.2 Production-facing normal rule

The master baseline remains authoritative for normal V2 progression:

> **A normal level-up draft presents exactly three actionable choices.**

V2-2/V2-3 must make this feasible through genuine weapon/protocol/rank/EVO breadth rather than filler bonuses.

The production draft generator must never render:

- a max-rank `V → V` card;
- a no-op heal at full HP;
- a capped pickup-radius upgrade;
- an acquisition when the relevant slot is full;
- an evolution whose prerequisites are not satisfied;
- a disabled decorative card presented as one of the three choices.

### 8.3 Exhaustion safety

The seven-minute competition pacing should make complete build exhaustion unreachable in the ordinary qualified run.

Synthetic full-exhaustion tests may retain a zero-choice auto-resume safety valve so corrupted/development states cannot deadlock the game, but a normal qualified competition run that repeatedly reaches fewer than three legal choices is a **BALANCE/DRAFT GATE FAILURE**, not acceptable final behavior.

This resolves:

`V2_1C_EXACT_THREE_RECONCILIATION = LOCKED_BOUNDED_EXCEPTION`

It does **not** resolve:

`V2_1C_OWNER_MANUAL_POSTFIX_GATE = UNPROVEN`

Therefore V2-1C overall is not silently promoted to final PASS by this document.

## 9. THE DESYNC forward design constraint — V2-5, not V2-2

The final boss should become the strongest Character Spotlight proof by using the selected Friend's own canonical geometry as part of boss-space telegraphs/hazards.

Recommended direction:

1. boss exposes/telegraphs A vulnerability;
2. arena attack projects a normalized large-scale form derived from the selected Friend's `A_ONLY` geometry;
3. SHIFT rewrites the encounter into B;
4. a later pattern uses normalized `B_ONLY` geometry;
5. late encounter introduces `COMMON` geometry;
6. victory visually reconstructs the canonical A/B identity.

Hard requirements before this can be locked:

- hazard power/coverage normalization across Friends;
- minimum safe-space guarantee;
- deterministic solver/safety qualification;
- no Friend receives a simple stronger/weaker boss outcome due to geometry size;
- readable phone-scale telegraphs.

**Decision state:** PROVISIONAL — STRONGLY RECOMMENDED / V2-5 ONLY.

No boss implementation is authorized by this V2-2 gate.

## 10. V2-2 implementation acceptance contract

A future bounded V2-2 implementation tranche may be considered only if all acceptance items below are testable.

### 10.1 Functional

- VECTOR Rank I exists and changes valid target acquisition when phase changes.
- ORBIT Rank I reverses visible orbit direction on SHIFT.
- ECHO MINE Rank I records placement phase and gains its intended value through leave/return phase play.
- SIGNAL ARC Rank I rebuilds its valid chain graph from current CORPOREAL + COMMON targets.
- DELTA behavior remains intact.
- exactly four active slots remain enforced, including mandatory DELTA.

### 10.2 Determinism

For fixed seed + Friend geometry + input sequence:

- acquisition ties are stable;
- mine placement/replacement is stable;
- orbit position progression is stable within accepted fixed-step tolerance;
- chain selection is stable;
- resulting combat state fingerprint is stable.

### 10.3 Bounded performance

- projectile counts are capped/poolable;
- node count is capped;
- mine count is capped;
- chain jumps are capped;
- no recursive weapon action is unbounded;
- no weapon performs an uncontrolled all-enemy scan multiple times per frame when a cheaper bounded/indexed path is available.

### 10.4 Readability

At both desktop and narrow/mobile qualification sizes:

- player can distinguish DELTA, VECTOR, ORBIT, MINE and ARC effects;
- phase-valid targets are readable;
- off-phase ghosts remain readable but subordinate;
- weapon FX do not obscure the Friend sprite or SHIFT state;
- health/XP/phase HUD remains legible;
- reduced-motion behavior remains usable.

### 10.5 Mechanical identity

Automated/state tests plus manual review must demonstrate:

- each weapon solves its intended distinct role;
- each non-DELTA weapon has at least one mechanically meaningful SHIFT dependency;
- no weapon makes SHIFT irrelevant;
- no weapon makes never-SHIFT play the dominant intended strategy;
- no new weapon replaces DELTA as the primary Friend-specific identity proof.

### 10.6 Regression

The future V2-2 tranche must keep green:

- canonical Friend integration;
- V2-ART-00 evidence;
- V2-1 movement/contact/SHIFT/DELTA/XP behavior;
- V2-1C no-dead-card filtering;
- FriendSDK check/build/browser smoke;
- desktop and narrow qualification.

## 11. Explicit non-goals for V2-2

V2-2 must **not** silently add:

- protocols;
- rank II–V implementation;
- EVO implementation;
- BEACON / ANCHOR / FLICKER;
- elites;
- Evolution Cores;
- THE DESYNC;
- seven-minute pacing;
- RF economy;
- Daily Signal;
- leaderboard/backend;
- persistent progression;
- additional active combat buttons.

Those belong to later reviewed tranches.

## 12. Recommended bounded implementation order after authorization

When V2-2 code is later authorized, implement one family at a time with tests between each step:

1. shared phase-valid targeting helpers / bounded weapon contracts;
2. VECTOR NEEDLE Rank I;
3. ORBIT NODES Rank I;
4. ECHO MINE Rank I;
5. SIGNAL ARC Rank I;
6. four-slot acquisition/draft integration;
7. cross-weapon deterministic tests;
8. browser/readability/performance qualification;
9. owner gameplay review;
10. V2-2 closeout report.

Do not implement all four weapons in one uncontrolled patch.

## 13. PROVEN / UNPROVEN / UNKNOWN

### PROVEN before this gate

- canonical A/B derivation exists;
- DELTA BURST is materially tied to selected Friend geometry;
- nine-family bounded corpus qualified the selector/two-phase invariant;
- V2-1 combat/SHIFT/XP/draft sandbox has automated qualification evidence;
- V2-1C filtering prevents known dead/no-op draft cards;
- current feature/main repository state was reverified before this planning branch was created.

### UNPROVEN

- whether the proposed four Rank-I weapon behaviors are fun in real play;
- whether 450 ms is the correct SHIFT commitment interval;
- final per-weapon numerical tuning;
- build balance among the five families;
- normal-run exactly-three draft availability after V2-2/V2-3 integration;
- THE DESYNC Friend-geometry arena concept;
- seven-minute pacing with full weapon breadth.

### UNKNOWN

- human preference distribution across weapon families;
- whether any family-specific canonical geometry creates unexpected readability interactions with heavy weapon FX;
- physical-phone feel under full swarm + four-weapon load;
- long-session performance outside the competition target.

## 14. Current decision state

`V2_2_MECHANICS_DESIGN_GATE = ACTIVE`

`V2_2_WEAPON_ARCHITECTURE = LOCKED`

`V2_2_PHASE_RESPONSIVE_STANDARD = LOCKED`

`V2_2_NUMERICAL_TUNING = PROVISIONAL`

`V2_2_SHIFT_COMMITMENT = PROVISIONAL`

`V2_1C_EXACT_THREE_RECONCILIATION = LOCKED_BOUNDED_EXCEPTION`

`V2_1C_OWNER_MANUAL_POSTFIX_GATE = UNPROVEN`

`V2_2_IMPLEMENTATION = NOT_STARTED`

`V2_2_IMPLEMENTATION_AUTHORIZATION = BLOCKED`

## 15. Next gate

Before V2-2 implementation begins:

1. complete/record the remaining V2-1C owner manual postfix validation or explicitly waive it with owner authority;
2. review this mechanics gate for any required changes;
3. explicitly authorize a bounded V2-2 implementation tranche.

Only then may code work start.