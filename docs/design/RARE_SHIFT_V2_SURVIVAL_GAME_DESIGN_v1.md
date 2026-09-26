# RARE//SHIFT V2 — SURVIVAL GAME DESIGN v1

**Status:** FINALIZED FOR IMPLEMENTATION REVIEW  
**Governance:** `docs/governance/RARE_SHIFT_V2_SURVIVAL_GOVERNANCE_v1.md`

## 1. Game statement

**RARE//SHIFT is a phase-shifting survival action roguelite where the selected Rare Friend's canonical animation determines the player's signature attack and the two realities of the battlefield. Move through escalating swarms, collect Signal XP, draft and evolve an auto-firing weapon build, and SHIFT between Phase A and Phase B to decide which threats and attacks become fully real.**

Short pitch:

> **Your Friend is not a skin. Its animation is your weapon and the battlefield's phase law.**

## 2. Research basis

The redesign adopts broad, proven bullet-heaven/survival-roguelite structures rather than copying any specific game's protected expression.

Research observations:

- Survivor.io publicly emphasizes one-hand controls, very large enemy hordes, roguelite skill combinations and increasing stage difficulty.
- Common Survivor.io run structure uses XP drops, level-up choices, active weapons, passive support skills, multi-rank upgrades and evolved weapon forms.
- Survivor.io's familiar EVO pattern rewards planning because a maxed weapon requires an appropriate support skill before evolution.
- Survivor.io and adjacent genre titles demonstrate that automatic attacks let movement/positioning remain the primary continuous input.
- Community criticism repeatedly points to excessive grind, ads, dominant meta builds, progression creep and RNG frustration as long-term weaknesses.

RARE//SHIFT therefore adopts the readable action/build loop while deliberately rejecting ad pressure, energy chores, mandatory permanent-stat grind and a single intentionally dominant build.

Reference research:

- Google Play Survivor.io listing: https://play.google.com/store/apps/details?id=com.dxx.firenow
- Apple App Store editorial tips for Survivor.io: https://apps.apple.com/id/story/id1641743438
- PocketGamer.biz Survivor.io loop analysis: https://www.pocketgamer.biz/how-innovation-and-iteration-has-transformed-survivorio/
- SurvivorIO community skill documentation: https://survivorio.fandom.com/wiki/Skills

## 3. Player fantasy

The player's owned Rare Friend enters an unstable Signal Field. Its canonical animation has split local reality into two overlapping states.

The Friend survives by moving continuously while its equipped systems attack automatically. The player actively controls **when reality changes** through SHIFT.

Every run should create the feeling:

1. I can immediately move and survive.
2. My Friend's animation visibly matters.
3. Every level gives me a meaningful build decision.
4. My weapons become dramatically more capable.
5. SHIFT timing separates good play from passive movement.
6. My final build feels authored by my decisions, not predetermined.
7. I want another run with a different build or Friend.

## 4. Main flow

```text
CONNECT WALLET
    ↓
SELECT OWNED FRIEND
    ↓
SCAN
canonical A/B pair + signature geometry
    ↓
CALIBRATION
move + collect + SHIFT + phase kill
    ↓
SIGNAL DESCENT
7-minute survival run
    ↓
LEVEL → PICK 1 OF 3 → BUILD → EVO
    ↓
ELITES / BOSS
    ↓
THE DESYNC
    ↓
RECONSTRUCTION
    ↓
RUN RESULTS
    ↓
RUN AGAIN / ANOTHER FRIEND
```

SCAN should be fast and visual. The player should enter active survival gameplay within roughly 30–45 seconds after Friend selection on first play and faster on repeats.

## 5. Controls

### Desktop

- WASD / arrows: movement.
- Space: SHIFT.
- Mouse/touch/number keys: choose upgrade card.
- SDK menu: pause/settings.

### Touch

- left virtual stick: movement.
- dedicated right-side SHIFT button.
- full-width/selectable upgrade cards during level pause.

### Combat input rule

Weapons attack automatically. The player does not repeatedly tap attack.

The action burden is:

- movement;
- positioning;
- phase reading;
- SHIFT timing;
- build choices.

## 6. Phase combat

### Threat classes

**A-ALIGNED**
- corporeal in Phase A;
- full contact/attack threat in Phase A;
- ghosted in Phase B.

**B-ALIGNED**
- corporeal in Phase B;
- full contact/attack threat in Phase B;
- ghosted in Phase A.

**COMMON**
- corporeal and dangerous in both phases.

### Off-phase behavior

Initial balance target:

- off-phase A/B enemies remain visible as outlined/scanlined ghosts;
- off-phase enemies deal no contact damage;
- generic attacks deal only low `ECHO` damage to them;
- matching-phase attacks deal full damage;
- XP drops remain phase-independent after a kill.

A newly corporeal enemy may never materialize directly inside the player's contact radius. SHIFT applies deterministic emergence separation before contact damage becomes active.

### Why SHIFT matters

SHIFT is used to:

- make the current target set corporeal;
- deactivate a dangerous aligned swarm while activating the opposite swarm;
- trigger DELTA BURST behavior;
- cross sparse phase hazards/barriers;
- respond to boss vulnerability windows;
- optimize build effects that trigger on phase change.

COMMON enemies and attacks stop SHIFT from being an unconditional escape.

## 7. Canonical signature weapon — DELTA BURST

Every Friend begins with **DELTA BURST**.

The game scales the selected canonical `A_ONLY` or `B_ONLY` 16×16 mask into a local damage field centered on the Friend.

- Phase A uses `A_ONLY` geometry.
- Phase B uses `B_ONLY` geometry.
- the exact lit-pixel shape comes from the real selected Friend;
- per-pixel damage is normalized against occupied mask size to keep total baseline power within a fixed budget;
- broader masks gain spatial coverage, not free total damage;
- sparse masks gain stronger per-cell concentration, not weaker total budget.

This weapon is the primary Character Spotlight proof.

### DELTA BURST ranks

**I — SIGNAL PULSE**  
Canonical active-phase mask pulses around the Friend.

**II — DENSE SAMPLE**  
Shorter pulse interval.

**III — FIELD SCALE**  
Moderately larger world-space mask footprint.

**IV — PHASE ECHO**  
After SHIFT, the previous phase mask lingers briefly at reduced power.

**V — LOCKED IDENTITY**  
Higher pulse authority plus improved matching-phase stagger.

### Evolution

Requirement:

- DELTA BURST rank V;
- at least one **COMMON CORE** protocol rank;
- available Evolution Core from an elite/boss reward.

Evolution: **RECONSTRUCTION FIELD**

Behavioral change:

- every active-phase pulse is followed by a short COMMON silhouette echo derived from the intersection of the two canonical frames;
- SHIFT creates a brief A→COMMON→B or B→COMMON→A visual/mechanical sequence;
- the evolution does not make both phases permanently active.

## 8. Initial weapon pool

The competition V2 target exposes five total active weapon families. The player may hold four active weapons including DELTA BURST.

### 8.1 DELTA BURST → RECONSTRUCTION FIELD

Role: canonical identity / local area control.  
Protocol: COMMON CORE.

### 8.2 VECTOR NEEDLE → PRISM LANCE

Role: fast single-target / elite and boss pressure.  
Base behavior: repeatedly fires toward the nearest matching-phase target.

Rank progression emphasizes fire rate, projectile speed, penetration and target priority.

Protocol: **VECTOR LENS**.

Evolution — PRISM LANCE:
- projectile pierces multiple matching-phase targets;
- after the first hit it refracts once toward another valid target;
- boss targeting remains predictable.

### 8.3 ORBIT NODES → SYNC HALO

Role: close-range protection / crowd control.  
Base behavior: one or more nodes orbit the Friend and damage corporeal enemies on contact.

Protocol: **ORBIT STABILIZER**.

Evolution — SYNC HALO:
- nodes form a more continuous rotating defense;
- each SHIFT reverses rotation and emits one bounded knockback pulse;
- COMMON enemies remain resistant to repeated knockback abuse.

### 8.4 ECHO MINE → MEMORY COLLAPSE

Role: delayed area denial / route control.  
Base behavior: periodically leaves a mine near the player's recent path; mine arms, then detonates when a corporeal enemy enters its radius.

Protocol: **MEMORY FUSE**.

Evolution — MEMORY COLLAPSE:
- armed mines link to the nearest other mine within a bounded distance;
- one detonation can propagate a limited chain;
- the chain cannot recurse without a hard cap.

### 8.5 SIGNAL ARC → CHAIN RESONANCE

Role: multi-target wave clear.  
Base behavior: arcs to a matching-phase enemy and then a small number of nearby corporeal targets.

Protocol: **RESONANCE COIL**.

Evolution — CHAIN RESONANCE:
- additional jumps;
- reduced decay per jump;
- after SHIFT, the next cast may include one controlled COMMON jump.

## 9. Protocol/passive pool

Five protocols compete for four passive slots.

### COMMON CORE
- improves area stability / signature-field effectiveness;
- evolves DELTA BURST.

### VECTOR LENS
- improves projectile speed and target acquisition;
- evolves VECTOR NEEDLE.

### ORBIT STABILIZER
- improves orbit duration/control and modest contact resistance behavior;
- evolves ORBIT NODES.

### MEMORY FUSE
- improves area-effect radius / arming efficiency;
- evolves ECHO MINE.

### RESONANCE COIL
- improves bounded cooldown efficiency;
- evolves SIGNAL ARC.

Protocols are useful outside their specific evolution so choosing one is not a dead pick.

The four-slot cap means a player cannot evolve all five weapon families in one run and must commit to a build.

## 10. Upgrade drafting

Killing enemies drops **Signal XP**.

XP is collected by proximity. A level pauses hostile simulation and presents exactly three cards.

The draft may offer:

- rank up an owned weapon;
- acquire a new weapon if an active slot is open;
- rank up an owned protocol;
- acquire a new protocol if a protocol slot is open;
- perform an eligible evolution if an Evolution Core is available.

### Anti-frustration rules

- one **REFRACT** reroll is available at run start;
- defeating the mid-run boss restores one REFRACT up to a small cap;
- the draft generator must guarantee at least one legal choice;
- the generator weights owned unfinished items enough to make coherent builds attainable;
- evolution eligibility must be clearly shown before the player commits to a supporting protocol;
- no paid rerolls.

Draft determinism is seed-driven for tests and Daily Signal modes.

## 11. Evolution Core

Weapon evolution requires more than raw level RNG.

An **Evolution Core** is dropped by designated elites/bosses.

When the player owns:

- rank-V weapon;
- required protocol;
- at least one Evolution Core;

the evolution becomes a high-priority draft/reward choice.

The player chooses which eligible weapon receives the Core if more than one is available.

This gives bosses direct build value and avoids purely random EVO timing.

## 12. Arena — FRACTURE GRID

Competition V2 uses one original arena: **FRACTURE GRID**.

Properties:

- larger than the visible 960×640 frame;
- camera follows player;
- mostly open movement space;
- sparse phase-dependent barriers/hazard strips;
- destructible signal caches;
- no maze density that undermines survivor movement;
- canonical phase-field motifs appear in floor/FX language without literally turning the whole 16×16 bitmap into a cramped map.

Pickups:

- **REPAIR** — modest health recovery;
- **VACUUM** — pulls existing Signal XP toward the player;
- **DISCHARGE** — clears or heavily damages ordinary enemies, not bosses/elites;
- **EVOLUTION CORE** — designated elite/boss reward, not random trash drop.

## 13. Enemy roster

### TRACE
COMMON simple chaser. Establishes baseline movement pressure.

### SPLIT-A / SPLIT-B
Phase-aligned chasers. Main SHIFT teaching enemy.

### BEACON
COMMON or telegraphed aligned ranged unit. Stops infinite circle-kiting.

### ANCHOR
Slow high-health unit that occupies space and creates local movement pressure.

### FLICKER
Telegraphed enemy that changes A/B alignment on a fixed cadence. Trains phase reading.

### ELITE
Enhanced archetype with an explicit modifier and visible reward marker. Drops an Evolution Core at designated checkpoints.

Enemy types must have silhouette/icon differences in addition to phase color/effects.

## 14. Final boss — THE DESYNC

The Desync is the first complete SHIFT mastery test.

### Phase 1
- clear A/B vulnerability telegraph;
- simple radial/common attacks;
- player learns boss shield behavior.

### Phase 2
- boss alternates aligned vulnerability more quickly;
- aligned adds enter;
- player must choose whether to attack or phase away from pressure.

### Phase 3
- COMMON hazards remain active;
- boss exposes short high-value break windows after correct phase responses;
- completed weapon evolution materially helps but is not required.

The boss never requires a particular random weapon roll.

## 15. Competition run pacing

Target successful run: approximately 7 minutes after calibration.

**0:00–0:45 — Establish**  
TRACE + one phase family. Fast early XP.

**0:45–1:30 — Split**  
A and B threats coexist. First meaningful SHIFT decisions.

**~1:30 — Elite I**  
Drops first Evolution Core.

**1:30–3:00 — Build pressure**  
Ranged BEACON and denser phase packs.

**~3:00–3:30 — Mid-run boss/checkpoint**  
Major XP/reward opportunity. REFRACT restored. EVO should become attainable for a coherent build around this window.

**3:30–5:15 — Escalation**  
ANCHOR + FLICKER + denser mixed waves.

**~5:15 — Elite II**  
Second Evolution Core.

**5:15–7:00 — Collapse**  
High-density build payoff while preserving readable lanes.

**~7:00 — THE DESYNC**  
Final boss.

Minute marks are pacing targets, not immutable constants until playtests confirm fun and judge readability.

## 16. Death and success

### Death

- no paid revive;
- show time survived, kills, level, build, evolutions, SHIFT count and damage taken;
- immediate RUN AGAIN;
- no loss of an external paid stake.

### Success

Final result combines V1 identity proof with V2 run proof:

- Friend ID / family;
- canonical frame pair;
- reconstructed exact Frame A/B evidence;
- run seed;
- survival time;
- kills;
- level;
- equipped weapons and ranks/EVOs;
- protocols;
- SHIFT count;
- damage taken;
- boss result;
- deterministic run fingerprint for seeded/test modes.

`RUN PROOF` remains an internal game fingerprint, never represented as a blockchain signature.

## 17. First-play calibration

The previous multi-chamber sequence is reduced for the mandatory V2 path.

First-play calibration teaches:

1. MOVE to collect three Signal XP nodes.
2. Observe one A and one B enemy.
3. SHIFT once to change corporeal threat.
4. DELTA BURST kills a matching-phase target.
5. Enter FRACTURE GRID.

Target: 20–40 seconds.

Existing DISCOVER / TIMING / SYNCHRONIZE content is preserved as optional **ARCHIVE // CALIBRATION** material and qualification evidence, not deleted.

## 18. Replayability

A repeat run changes through:

- upgrade draft order;
- weapon combination;
- protocol combination;
- EVO choices;
- seeded spawn pattern;
- player movement/SHIFT decisions;
- different selected Rare Friend signature geometry.

The same Friend should support multiple viable builds.

Changing Friend must visibly change DELTA BURST geometry without granting a simple stronger/weaker rarity ladder.

## 19. Long-term community layer

After the core loop proves fun:

### DAILY SIGNAL
- globally shared daily seed;
- standardized rules;
- score/time comparisons;
- no paid/meta stat advantage.

### WEEKLY DESYNC
- rotating boss modifiers;
- Friend-family challenge tags.

### RUN SHARING
- seed;
- Friend family;
- final build;
- result card.

### LATER
- backend leaderboards;
- co-op survival;
- community events.

Real-time multiplayer is not part of the competition V2 implementation.

## 20. Persistent progression

Initial competition V2 keeps progression shallow.

The preferred post-MVP model is horizontal:

- unlock additional weapon blueprints by achievements;
- unlock alternate EVO sidegrades;
- cosmetic signal trails/palettes;
- challenge modifiers;
- Archive completion.

Avoid making permanent account attack/HP the primary reason later chapters are possible.

## 21. RF economy position

**DEFERRED until survival gameplay is fun.**

The existing T5 Deep Scan census may later support identity/blueprint systems.

Potential future RF-compatible uses:

- cosmetic phase effects;
- horizontal weapon blueprints also earnable through play;
- optional challenge tickets without exclusive combat power;
- community event contributions;
- Identity Atlas discovery.

Rejected baseline economy:

- RF for direct damage multipliers;
- RF-only best weapon;
- RF revive in competitive modes;
- RF reroll advantage in normalized Daily Signal;
- rarity-priced NFT combat power.

## 22. V2 competition vertical slice

The minimum V2 that may replace frozen T4 contains:

- real FriendSDK wallet/select/ownership flow;
- fast SCAN + calibration;
- one FRACTURE GRID arena;
- DELTA BURST with canonical A/B geometry;
- at least four total usable weapons in the build pool;
- at least four protocols;
- three-card level draft;
- rank I–V weapon progression;
- at least two fully implemented EVOs, including DELTA BURST → RECONSTRUCTION FIELD;
- TRACE, SPLIT-A/B, BEACON, ANCHOR or equivalent minimum enemy coverage;
- at least one elite;
- THE DESYNC boss;
- approximately seven-minute complete run;
- results/reconstruction screen;
- desktop + touch;
- reduced motion / pause / error handling;
- automated deterministic seeded qualification;
- real-holder Friend #13699 full run.

The full five-weapon/five-protocol roster is the desired competition target, but the minimum replacement gate above prevents feature count from overriding stability.

## 23. Implementation tranches

### V2-0 — DESIGN LOCK
This document and governance only. No gameplay code.

### V2-1 — COMBAT SANDBOX
Movement, camera, one pooled enemy, health/contact, XP, level pause, DELTA BURST placeholder geometry. No progression polish.

### V2-2 — CANONICAL PHASE COMBAT
Real A/B pair, canonical DELTA BURST masks, SHIFT corporeality, emergence safety, Friend #13699 deterministic proof.

### V2-3 — BUILD DRAFT
Three-card draft, active/protocol slots, ranks, REFRACT, deterministic seeded choices.

### V2-4 — WEAPON + EVO
Non-signature weapons, protocol gates, Evolution Core, at least two EVOs.

### V2-5 — SURVIVAL DIRECTOR
Spawn pacing, enemy archetypes, elite, pickups, seven-minute run structure.

### V2-6 — THE DESYNC
Final boss and result/reconstruction integration.

### V2-7 — COMPETITION QUALIFICATION
960/narrow browser, performance/stress, real-holder run, physical phone, error/network/privacy/public HTTPS/submission.

No tranche silently advances without review.

## 24. Success criteria

A successful V2 should make these statements true in play, not merely documentation:

- moving through a swarm is fun before progression is considered;
- SHIFT changes tactical decisions every few seconds;
- the Rare Friend visibly determines combat geometry;
- a level-up choice regularly changes the run plan;
- an evolved weapon feels behaviorally different;
- multiple weapon combinations are viable;
- the first evolution arrives early enough to demonstrate payoff;
- the boss cannot be solved by ignoring SHIFT;
- a failed run invites another attempt rather than a grind prompt;
- selecting another Friend is interesting because its canonical signal behaves differently, not because it has higher rarity power.
