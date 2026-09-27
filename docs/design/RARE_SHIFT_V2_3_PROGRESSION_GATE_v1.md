# RARE//SHIFT V2-3 — RANK / PROTOCOL / EVO PROGRESSION GATE v1

**Status:** ACTIVE PLANNING GATE — IMPLEMENTATION NOT YET AUTHORIZED  
**Date:** 2026-09-27  
**Source baseline:** `5caa944134102ca56c675944c47dfb537f74d33a`  
**Planning branch:** `planning/v2-3-progression-gate`  
**Preceding stage:** `V2_2_STAGE = CLOSED — OWNER APPROVED WITH NOTES`

## 1. Purpose

V2-3 converts the now-qualified Rank-I combat system into a coherent run-build system.

The stage exists to solve the progression problem observed during owner localhost play: after enough bounded Rank-I progression, the legal draft pool could collapse to a single `FIELD_REPAIR` card. That behavior was accepted only as a V2-2 boundary and is not acceptable production progression.

V2-3 must add genuine build breadth rather than filler.

The stage covers:

- weapon ranks II–V;
- Protocol/passive slots and progression;
- deterministic production draft generation;
- REFRACT reroll behavior;
- Evolution Core inventory/eligibility logic;
- at least the DELTA BURST → RECONSTRUCTION FIELD evolution path;
- explicit cross-tranche handling of the natural elite/boss Evolution Core source.

It does **not** authorize gameplay implementation by itself.

## 2. Source authority and inherited locks

The following are inherited from the active master baseline, survival design, V2-2 mechanics gate, and V2-2 owner closeout.

### LOCKED

- MOVE + AUTO-FIRE + SHIFT remains the combat input model.
- DELTA BURST remains mandatory active slot 1.
- Active weapon cap remains exactly 4 including DELTA.
- Five total weapon families remain designed:
  - DELTA BURST;
  - VECTOR NEEDLE;
  - ORBIT NODES;
  - ECHO MINE;
  - SIGNAL ARC.
- Weapon ranks remain I–V.
- Protocol/passive cap remains exactly 4.
- Five Protocol families remain designed:
  - COMMON CORE;
  - VECTOR LENS;
  - ORBIT STABILIZER;
  - MEMORY FUSE;
  - RESONANCE COIL.
- A normal production level-up must present exactly 3 actionable choices.
- Evolution requires:
  - owned weapon at Rank V;
  - its required Protocol owned;
  - at least one available Evolution Core.
- No NFT rarity/generation raw-power ladder.
- No paid combat reroll, revive, energy or gacha requirement.
- The standard run remains free.
- V2-2 Rank-I phase mechanics remain authoritative and may not be rewritten merely to simplify progression.

### V2-2 owner note carried forward

`V2_2_LONG_RUN_DRAFT_EXHAUSTION = OBSERVED_AND_ACCEPTED_AS_V2_3_INPUT`

`PRODUCTION_EXACT_THREE_DRAFT = REQUIRED_IN_V2_3`

The production solution may not be generic filler cards whose only purpose is to pad the draft to three.

## 3. V2-3 design goals

A successful V2-3 build must create these player decisions:

1. **Which four active families define this run?**
2. **Which weapon receives scarce rank investment first?**
3. **Which four Protocols define passive synergies?**
4. **Do I pursue one evolution quickly or spread ranks across the build?**
5. **When a Core becomes available, which eligible family receives it?**
6. **Can I reroll a bad but legal draft without buying power?**

Progression should make a build feel authored, but not allow one deterministic best route to dominate every seed.

## 4. Progression state model

V2-3 should replace the temporary boolean-heavy V2-2 draft state with a normalized deterministic build state.

Recommended pure state model:

```text
BuildState
  activeWeapons[family] ->
      owned
      rank 1..5
      evolved
  protocolSlots -> max 4
  protocols[family] ->
      owned
      rank
  weaponSlotsUsed -> 1..4
  evolutionCores -> integer >= 0
  refracts -> integer >= 0
  rerollNonce -> integer >= 0
  hp / maxHp
  pickupRadius
```

Stable family IDs should be used rather than UI labels.

No Phaser object reference, random object identity, sprite pointer or wall-clock value may be gameplay truth for draft eligibility.

## 5. Weapon rank contract

### 5.1 Global rank rules

- every owned weapon begins at Rank I;
- Rank V is the maximum base rank;
- only the **next** rank may be offered;
- no `V → V` card may exist;
- acquisition and rank-up are different candidate types;
- evolving a weapon does not consume an additional active weapon slot;
- evolution replaces/augments that family rather than creating a fifth active family;
- each rank must make a real deterministic state/mechanical change;
- pure percentage damage-only ranks are insufficient as the entire identity of a rank path;
- numerical tuning remains provisional until measured qualification.

### 5.2 DELTA BURST

Inherited path:

- **I — SIGNAL PULSE** — qualified Rank-I canonical active-phase mask pulse.
- **II — DENSE SAMPLE** — shorter pulse interval.
- **III — FIELD SCALE** — larger world-space canonical footprint while preserving the normalized identity-power budget.
- **IV — PHASE ECHO** — one previous-phase mask echo after accepted SHIFT at explicitly reduced ECHO authority.
- **V — LOCKED IDENTITY** — stronger matching-phase authority/stagger without invalidating normalization.

V2-3 implementation requirements:

- Rank II cadence remains hard-capped and may not create frame-rate-dependent firing.
- Rank III scale may not grant raw power merely because one Friend has more lit canonical pixels.
- Rank IV creates at most one bounded echo per accepted SHIFT and may not turn ghosted threats into full-damage targets.
- Rank V stagger/control must have explicit boss/elite resistance hooks even before V2-4 populates those roles.

### 5.3 VECTOR NEEDLE

Inherited path:

- **I** — qualified corporeal nearest-target precision projectile.
- **II — CLEAN LINE** — bounded penetration through one additional legal corporeal target.
- **III — PRIORITY TRACE** — deterministic high-value-target preference inside a bounded priority band.
- **IV — PHASE TRANSFER** — first valid post-SHIFT shot receives one additional bounded line-through opportunity.
- **V — VECTOR LOCK** — repeated valid focus on one corporeal high-value target improves sustained focus without random crit dependence.

V2-3 requirements:

- stable spawn ID remains final tie-break authority;
- off-phase ghosts never become normal penetration targets;
- Rank IV cannot reset VECTOR cooldown on SHIFT;
- Rank V focus resets on target invalidation, target death, target phase loss or deterministic range break;
- penetration/hit count remains hard-capped.

### 5.4 ORBIT NODES

Inherited path:

- **I** — qualified single node, opposite A/B rotation, per-target contact interval.
- **II — SECOND NODE** — second deterministic node with stable spacing.
- **III — STABLE ORBIT** — improved coverage/control rather than unrestricted raw DPS multiplication.
- **IV — PHASE SHEAR** — accepted SHIFT reversal creates one bounded sweep/contact opportunity.
- **V — SYNCHRONIZED RING** — tighter defensive continuity with strict repeat-hit limits.

V2-3 requirements:

- node count is hard-capped;
- node placement derives from deterministic angular spacing;
- SHIFT never resets per-target hit cooldowns;
- PHASE SHEAR is one event per accepted SHIFT, not one event per frame;
- ORBIT may not become invulnerability or standing-still optimization.

### 5.5 ECHO MINE

Inherited path:

- **I** — qualified leave/return memory mine.
- **II — LONG MEMORY** — increases bounded persistence/capacity.
- **III — WIDER COLLAPSE** — modest blast/trigger coverage improvement.
- **IV — FAST RECALL** — shorter post-return readiness delay, never zero-time unavoidable detonation.
- **V — DEEP MEMORY** — improved route-control authority while preserving deterministic replacement and hard caps.

V2-3 requirements:

- all mines retain recorded-phase memory;
- no rank may make never-SHIFT play equally optimal;
- active mine count remains finite at every rank;
- replacement and expiry remain silent unless a real trigger occurs;
- no recursive mine creation.

### 5.6 SIGNAL ARC

Inherited path:

- **I** — qualified max-three-target corporeal graph.
- **II — EXTRA LINK** — one additional bounded jump.
- **III — LOWER DECAY** — reduced damage/effectiveness decay across the bounded chain.
- **IV — RESONANT RELAY** — stronger deterministic COMMON relay utility without using COMMON to bypass phase authority.
- **V — CHAIN CONTROL** — improved deterministic target ordering/coverage while preserving a hard jump cap.

V2-3 requirements:

- one target may be hit at most once per cast;
- no branching recursion;
- COMMON may bridge space, never phase authority;
- SHIFT rewrites the next graph but does not reset cooldown;
- any smarter Rank-V ordering must remain input-order-independent and deterministic.

## 6. Protocol architecture

### 6.1 Slot law

- exactly 4 Protocol/passive slots maximum;
- 5 Protocol families compete for those slots;
- acquiring a new Protocol consumes one Protocol slot;
- ranking an owned Protocol consumes no additional slot;
- duplicate acquisition is illegal;
- a full Protocol inventory blocks new Protocol acquisitions but does not block legal ranks or EVOs;
- Protocol ownership is independent of active-weapon ownership so the passive layer remains a real build decision rather than mirroring the active slots exactly.

### 6.2 Protocol rank count — PROVISIONAL V2-3 recommendation

The source design requires Protocol rank-up choices but does not define a maximum Protocol rank.

V2-3 recommends **Protocol ranks I–III**.

Rationale:

- Rank I creates the passive and satisfies the matching evolution prerequisite.
- Rank II strengthens the passive.
- Rank III adds a bounded phase-aware rider or stronger specialization.
- three ranks provide meaningful draft breadth without duplicating the five-rank weapon progression.
- four Protocol slots × three ranks provide enough legitimate progression breadth to prevent the V2-2 Level-18 collapse without filler.

This is a **new V2-3 design decision**, not an inherited source fact.

It remains `PROVISIONAL` until the V2-3 implementation protocol is reviewed.

### 6.3 COMMON CORE

Role:

- field stability / canonical signature support;
- required key for DELTA BURST evolution.

Contract:

- must always be useful because DELTA is always owned;
- may improve canonical/local-area stability or bounded phase-field effectiveness;
- may not remove the A/B decision by making both canonical phases fully active;
- Rank III should create a phase-aware benefit rather than only a larger number.

### 6.4 VECTOR LENS

Role:

- acquisition/trajectory quality;
- required key for VECTOR NEEDLE evolution.

Contract:

- may improve bounded acquisition or projectile/targeting behavior;
- may create secondary synergy with other explicit targeted weapons;
- may not grant global auto-aim that erases positioning;
- no random crit dependency.

### 6.5 ORBIT STABILIZER

Role:

- controlled close-defense stability;
- required key for ORBIT NODES evolution.

Contract:

- supports deterministic orbit/control behavior;
- may improve bounded contact handling/coverage;
- may not grant unconditional contact immunity;
- top-rank behavior should remain visible/readable during SHIFT reversal.

### 6.6 MEMORY FUSE

Role:

- persistent-effect memory/area efficiency;
- required key for ECHO MINE evolution.

Contract:

- supports bounded persistence, trigger area or readiness efficiency;
- may interact with other explicitly persistent phase effects;
- may not create unbounded mine lifetime/count;
- may not bypass the leave/return memory cycle.

### 6.7 RESONANCE COIL

Role:

- bounded cadence/resonance efficiency;
- required key for SIGNAL ARC evolution.

Contract:

- may improve bounded automatic-weapon cadence or ARC-specific resonance;
- cooldown floors are mandatory;
- SHIFT may create a bounded rider but never a free cooldown reset;
- must not become the universally mandatory best passive.

## 7. Evolution architecture

### 7.1 Evolution law

A family is evolution-eligible only when all are true:

1. the weapon is owned;
2. weapon rank is exactly V;
3. required Protocol rank is at least I;
4. weapon is not already evolved;
5. at least one Evolution Core exists.

Applying an evolution:

- consumes exactly one Evolution Core;
- preserves the same active weapon slot;
- marks that family evolved exactly once;
- changes behavior rather than only adding a rarity label;
- cannot be applied twice;
- cannot be applied to an unowned or sub-Rank-V weapon.

### 7.2 DELTA BURST → RECONSTRUCTION FIELD

This is the **required first full V2-3 evolution path** because it is the strongest Character Spotlight proof.

Inherited behavior:

- active-phase pulse remains canonical;
- a short COMMON silhouette echo is derived from the intersection of the canonical A/B frames;
- accepted SHIFT creates an A→COMMON→B or B→COMMON→A sequence;
- both phases are never permanently active at full authority.

Hard rules:

- canonical geometry remains selected-Friend derived;
- COMMON geometry comes from exact canonical intersection, not hand-authored replacement art;
- all damage/control remains hard-capped;
- reduced-motion mode preserves the information even if visual persistence is shortened.

### 7.3 VECTOR NEEDLE → PRISM LANCE

Design remains:

- stronger bounded penetration;
- one controlled refraction to another legal target;
- predictable boss targeting;
- no recursive chain behavior.

### 7.4 ORBIT NODES → SYNC HALO

Design remains:

- more continuous bounded rotating defense;
- SHIFT reverses rotation;
- one bounded knockback pulse;
- COMMON/elite/boss resistance hooks prevent repeated-control abuse.

### 7.5 ECHO MINE → MEMORY COLLAPSE

Design remains:

- armed mines may link to nearest legal mine in bounded distance;
- one detonation may propagate a limited chain;
- chain depth is hard-capped;
- no recursive unbounded propagation.

### 7.6 SIGNAL ARC → CHAIN RESONANCE

Design remains:

- additional bounded jumps;
- reduced decay;
- controlled post-SHIFT COMMON-mediated resonance behavior;
- no unlimited chain and no ordinary full-damage ghost targeting.

### 7.7 V2-3 implementation scope recommendation

The master baseline requires V2-3 to prove **at least one full evolution path**.

Recommended implementation order:

1. implement all weapon Rank II–V state/mechanics;
2. implement all five Protocol families and Protocol ranks;
3. implement Evolution Core inventory/eligibility/consumption logic;
4. implement and qualify **RECONSTRUCTION FIELD** first;
5. review before deciding whether the remaining four evolved forms are implemented in the same competition tranche.

Therefore:

- `RECONSTRUCTION_FIELD = REQUIRED_V2_3_IMPLEMENTATION`
- other evolved forms = `DESIGN_LOCKED / IMPLEMENTATION_NOT_YET_AUTHORIZED`

This prevents schedule pressure from causing five simultaneous unqualified evolution implementations.

## 8. Evolution Core source dependency

### 8.1 Source conflict identified during V2-3 review

The survival design says an Evolution Core is a designated elite/boss reward and not a random trash drop.

The master implementation sequence places elite/enemy escalation in V2-4.

Therefore V2-3 may not silently invent:

- a random normal-enemy Core drop;
- a level-up Core grant;
- a hidden test-only production pickup;
- an RF purchase for a Core.

### 8.2 Locked safe handling

V2-3 may implement and deterministically qualify:

- Core inventory state;
- exact eligibility;
- Core consumption;
- multiple-eligible-family choice logic;
- evolved-family state transition;
- pure/runtime behavior when a Core is present in controlled qualification state.

But the **natural gameplay source** remains dependent on V2-4's designated elite/boss implementation unless the owner explicitly revises tranche order.

Accordingly:

`V2_3_EVOLUTION_CORE_LOGIC = IN_SCOPE`

`V2_3_NATURAL_ELITE_CORE_SOURCE = BLOCKED_ON_V2_4`

`V2_3_NATURAL_ELITE_TO_EVO_BROWSER_PROOF = BLOCKED_ON_V2_4`

This dependency must remain visible in every V2-3 closeout report.

## 9. Production draft architecture

### 9.1 Candidate types

The production draft generator should operate on explicit candidate types:

- `WEAPON_ACQUIRE`
- `WEAPON_RANK`
- `PROTOCOL_ACQUIRE`
- `PROTOCOL_RANK`
- `EVOLUTION`
- bounded `UTILITY`

A candidate has stable identity:

```text
candidateId
familyId
candidateType
fromRank
toRank
priorityClass
```

No UI label is gameplay identity.

### 9.2 Legality-first generation

Before weighting, remove every illegal/no-op candidate.

Illegal examples:

- weapon acquisition with full active slots;
- duplicate owned weapon acquisition;
- weapon Rank-V upgrade;
- protocol acquisition with full Protocol slots;
- duplicate owned Protocol acquisition;
- protocol max-rank upgrade;
- evolution lacking Rank V;
- evolution lacking required Protocol;
- evolution lacking Core;
- already evolved family;
- FIELD REPAIR at full HP;
- capped SIGNAL MAGNET;
- disabled tranche-only candidate.

### 9.3 Exactly-three normal rule

For a normal production level-up:

> **Render exactly three distinct legal actionable cards.**

If the production run reaches a normal state with fewer than three legal candidates, that is a progression/draft qualification failure.

The V2-1/V2-2 ability to render 1 or 2 cards remains only a safety/fallback behavior for synthetic, corrupted or explicitly bounded states. It is not success criteria for ordinary V2-3 play.

### 9.4 Deterministic selection

Candidate weighting and ordering must be deterministic from:

- run seed;
- level;
- progression state;
- reroll nonce.

Array insertion order, object allocation order, sprite order and wall-clock time may not affect the result.

### 9.5 Coherent-build weighting

The source design requires owned unfinished items to be weighted enough to make coherent builds attainable.

V2-3 therefore requires explicit bucket weighting rather than a flat random draw.

Recommended priority classes:

1. eligible EVO when Core exists;
2. owned unfinished weapon ranks;
3. useful Protocol acquisition/ranks;
4. legal active-weapon acquisition when a slot remains;
5. bounded utility.

Priority is a weighting/guarantee mechanism, not an instruction to always fill all three cards from the first category.

### 9.6 Early onboarding preservation

The already-qualified V2-2 onboarding should not be silently destroyed by V2-3.

Recommended preservation:

- Level 2 retains its current weapon-learning surface.
- Level 3 retains ECHO introduction.
- Level 4 retains SIGNAL ARC discovery when the fourth slot remains available.
- Protocol introduction begins only after the player has already experienced the base weapon acquisition flow.

Exact Protocol introduction level remains `PROVISIONAL`; recommended first candidate is Level 5.

### 9.7 Evolution priority

When at least one legal evolution exists and at least one Core exists:

- at least one legal evolution card must appear in the next normal draft;
- if multiple families are eligible, selection/order among them is deterministic;
- choosing one consumes one Core and does not evolve the other eligible families;
- an eligible evolution may not be hidden indefinitely by low-priority utility cards.

### 9.8 No duplicate/no-op cards

A three-card draft may not contain:

- two cards that resolve to the same exact state transition;
- a disabled card;
- a future rank that skips the next rank;
- cosmetic rarity labels pretending to be progression;
- a utility whose effect is already capped.

## 10. REFRACT reroll

Inherited design:

- one REFRACT is available at run start;
- no paid rerolls;
- mid-run boss may later restore one REFRACT up to a small cap.

V2-3 scope:

- implement the initial one-use REFRACT;
- reroll uses the same legal candidate pool and a deterministic incremented `rerollNonce`;
- reroll cannot spend HP, RF or combat currency;
- if at least four legal candidates exist, the new ordered triple must differ from the prior ordered triple;
- REFRACT cannot turn illegal/no-op candidates legal;
- reroll count is visible in draft UI;
- mid-boss restore remains V2-4 because the mid-boss/pacing source is not yet implemented.

## 11. Protocol/evolution UI requirements

Cards must communicate build consequences without a wiki lookup.

Weapon rank card:

- family name;
- current → next rank;
- rank name;
- one concise mechanical sentence.

Protocol card:

- Protocol name;
- rank;
- passive role;
- explicit evolution pairing text, e.g. `Evolves: DELTA BURST at Rank V + Core`.

Evolution card:

- base weapon → evolved name;
- Core cost `1`;
- prerequisite status visibly satisfied;
- concise behavior change;
- no rarity-colored fake power tier.

At 390-width, all three normal cards remain selectable without horizontal scrolling.

## 12. Progression-breadth target

The V2-2 owner found a one-choice state around Level 18.

V2-3 must materially exceed that progression horizon.

With four active weapon slots and the recommended Protocol I–III model, the system contains substantial legitimate progression depth:

- three non-DELTA active acquisitions in a 4/4 build;
- up to sixteen weapon rank-up decisions across four active families;
- up to four Protocol acquisitions;
- up to eight Protocol rank-up decisions for four Rank-III Protocols;
- one or more evolutions when Cores exist;
- bounded utilities only when genuinely actionable.

This is intended to remove the need for fake filler.

Exact seven-minute exhaustion safety remains a V2-4 pacing qualification because final XP/level rate is not yet locked.

## 13. V2-3 implementation tranche plan

### V2-3A — Progression state + production draft engine

Scope:

- normalized weapon family/rank state;
- normalized Protocol state and slot cap;
- candidate legality engine;
- exactly-three normal draft selection;
- deterministic weighting;
- initial REFRACT;
- preserve V2-2 Rank-I runtime behavior;
- deterministic state-space tests;
- no new rank runtime mechanics yet beyond state scaffolding.

Gate question:

> Can the build model generate three real choices from legitimate progression state without filler and without breaking the V2-2 combat candidate?

### V2-3B — Weapon ranks II–V

Scope:

- implement all five weapon rank paths II–V;
- each rank produces real mechanical state change;
- preserve family-role separation;
- hard-cap every added projectile/node/mine/jump/echo surface;
- desktop/narrow regression.

Gate question:

> Do ranks deepen each weapon's existing phase decision rather than turn progression into generic DPS scaling?

### V2-3C — Protocol I–III

Scope:

- five Protocol families;
- four-slot cap;
- recommended I–III rank progression;
- deterministic passive application;
- explicit EVO pairing UI;
- no single mandatory passive;
- no paid power.

Gate question:

> Do Protocols create a separate build-planning layer without making active weapon choice irrelevant?

### V2-3D — Evolution Core logic + RECONSTRUCTION FIELD

Scope:

- Core inventory and consumption;
- eligibility engine;
- multiple-eligible-family choice behavior;
- DELTA Rank V + COMMON CORE + Core path;
- RECONSTRUCTION FIELD canonical COMMON intersection behavior;
- reduced-motion/readability;
- deterministic qualification with a controlled Core-bearing state.

Natural elite/boss Core acquisition remains blocked on V2-4 unless tranche order is explicitly changed.

Gate question:

> Does the first EVO feel like a real transformation and strengthen Character Spotlight without erasing phase choice?

### V2-3E — Integrated progression closeout

Scope:

- long deterministic draft sequences;
- multiple seeds/build routes;
- 4 active / 4 Protocol enforcement;
- Rank-V no-op exclusion;
- EVO eligibility/consumption;
- REFRACT;
- 960/390;
- reduced motion;
- owner gameplay review;
- explicit remaining V2-4 Core-source dependency.

No V2-4 pacing/enemy implementation may be silently bundled into this closeout.

## 14. Deterministic qualification minimums

### Draft engine

At minimum prove:

1. exactly 3 distinct choices when 3+ legal candidates exist;
2. all three change state;
3. Rank-V weapon is absent from rank candidates;
4. max-rank Protocol is absent;
5. full active slots block acquisitions;
6. full Protocol slots block Protocol acquisitions;
7. FIELD REPAIR absent at full HP;
8. SIGNAL MAGNET absent at cap;
9. same seed/state/rerollNonce returns same ordered triple;
10. different reroll nonce changes the triple when sufficient alternatives exist;
11. early onboarding remains legal;
12. late progression does not collapse around the previously observed Level-18 horizon under qualified V2-3 routes.

### Weapon ranks

For every family prove:

- I→II→III→IV→V monotonic state;
- no skipped ranks;
- V cannot advance;
- rank-specific cap invariants;
- SHIFT semantics remain correct;
- off-phase authority remains correct;
- role separation remains intact.

### Protocols

Prove:

- maximum four owned Protocols;
- duplicate acquisition rejected;
- legal rank progression;
- maximum rank rejected;
- passive is deterministic;
- Protocol remains useful before EVO;
- Protocol cannot bypass phase authority.

### Evolution

Prove:

- Rank V alone insufficient;
- Protocol alone insufficient;
- Core alone insufficient;
- all three prerequisites required;
- exactly one Core consumed;
- same weapon cannot evolve twice;
- active slot count unchanged;
- evolved behavior is deterministic;
- RECONSTRUCTION FIELD uses exact canonical intersection geometry.

## 15. Browser qualification minimums

At 960 and 390 widths, V2-3 closeout must naturally prove as much as the available pre-V2-4 gameplay source permits:

- three-card level-up surface;
- pointer/touch/keyboard card selection;
- initial REFRACT use;
- weapon acquisition and multiple weapon rank upgrades;
- Protocol acquisition/rank;
- 4 active slot cap;
- 4 Protocol slot cap;
- Rank-V card disappears after max;
- no one-card dead-end at the previous V2-2 progression horizon;
- phase behavior still functions while higher-rank weapons are active;
- reduced-motion information remains complete.

The natural elite→Core→EVO path is not claimable until V2-4 provides the authoritative Core source.

## 16. Rejected V2-3 shortcuts

- random Common/Rare/Epic upgrade tiers as the main system;
- duplicate cards with cosmetic rarity labels;
- generic +damage/+speed filler solely to maintain three choices;
- unlimited Protocol slots;
- more than four active weapons;
- paid REFRACT;
- paid Evolution Core;
- NFT rarity power multiplier;
- evolution without Rank V;
- evolution without required Protocol;
- evolution without Core;
- silently moving elite implementation into V2-3;
- test-only production buttons that grant levels, ranks, Cores or EVOs;
- changing V2-2 Rank-I mechanics merely to simplify V2-3 state management.

## 17. Out of scope

V2-3 does not authorize:

- BEACON / ANCHOR / FLICKER production implementation;
- general ELITE implementation;
- final spawn director/pacing;
- seven-minute final balance;
- THE DESYNC;
- final reconstruction/results loop;
- RF economy;
- persistent progression;
- backend leaderboard;
- live blockchain transactions;
- merge to `main`;
- production deployment.

## 18. Current decision state

### PROVEN FROM PRECEDING WORK

- V2-2 owner closeout: PASS_WITH_NOTES.
- All five Rank-I weapon families are technically qualified.
- Active weapon slot cap 4 is qualified.
- Cross-weapon 4/4 operation is technically qualified.
- One/two/three-card pointer cardinality mapping is repaired and owner retested.
- Late V2-2 draft exhaustion around Level 18 was observed.

### LOCKED FOR V2-3 PLANNING

- production exactly-three rule;
- weapon ranks I–V;
- four active slots;
- five Protocol families / four Protocol slots;
- Rank-V weapon + matching Protocol + Core evolution gate;
- DELTA → RECONSTRUCTION FIELD as first required EVO proof;
- initial free REFRACT;
- no filler / rarity / paid-power progression;
- natural Evolution Core source remains elite/boss governed.

### PROVISIONAL

- Protocol maximum rank = III;
- first Protocol introduction around Level 5;
- exact rank numerical values;
- exact Protocol numerical values;
- detailed candidate weighting coefficients;
- whether the remaining four evolved forms are implemented before V2-4 after RECONSTRUCTION FIELD qualifies.

### OPEN DEPENDENCY

- natural elite/boss Evolution Core source is owned by V2-4 under the current master sequence.

### NOT STARTED / BLOCKED

`V2_3A_IMPLEMENTATION = NOT_STARTED`

`V2_3_IMPLEMENTATION_AUTHORIZATION = BLOCKED`

`V2_4 = NOT_STARTED`

`MAIN_MERGE = NOT_AUTHORIZED`

`DEPLOYMENT = NOT_AUTHORIZED`

## 19. Next bounded decision

Before code, review this V2-3 gate and decide whether to accept the recommended Protocol I–III model and the explicit V2-4 natural-Core-source dependency.

If accepted, the first implementation tranche is **V2-3A — normalized progression state + deterministic production exactly-three draft engine + initial REFRACT only**.

V2-3A must not implement weapon Rank II effects, Protocol runtime effects, EVO behavior, elites, pacing or economy.