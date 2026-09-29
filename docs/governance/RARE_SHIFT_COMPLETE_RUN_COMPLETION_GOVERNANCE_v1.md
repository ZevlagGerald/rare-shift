# RARE//SHIFT COMPLETE RUN COMPLETION GOVERNANCE v1

**Status:** REVIEW CANDIDATE — OWNER AUTHORIZED COMPLETION PLANNING  
**Project:** RARE//SHIFT  
**Baseline branch:** `main`  
**Baseline commit:** `1e7a42428a7295df9b14049f930e8c1bf2e93d3e`  
**FriendSDK:** v0.1.3  
**Engine:** Phaser 4.2.1  
**Owner authority:** final

## 1. Purpose

This document converts the already-approved RARE//SHIFT V2 survival design into the remaining implementation plan required for a complete beginning-to-end player run.

It does **not** replace the core V2 thesis, weapon identities, phase law, rank contracts or qualified B1–B5 behavior. It reconciles the original V2 design with the current qualified implementation state and defines the shortest controlled path from the current survival MVP to a complete run with stages, elites, Protocols, Evolutions, final boss, victory/results and replay.

The completion target is a polished competition game run, not a commercial live-service product.

## 2. Authority and precedence

Read this document together with:

1. `docs/governance/RARE_SHIFT_V2_MASTER_IMPLEMENTATION_BASELINE_v1.md`
2. `docs/governance/RARE_SHIFT_V2_SURVIVAL_GOVERNANCE_v1.md`
3. `docs/design/RARE_SHIFT_V2_SURVIVAL_GAME_DESIGN_v1.md`
4. qualified B1–B5 closeout evidence and exact-head CI

Precedence:

- explicit Owner instruction overrides project documents;
- this document narrows the remaining completion sequence only;
- existing qualified B1–B5 mechanics remain authoritative unless a later reviewed tranche explicitly supersedes them;
- old minute marks were PROVISIONAL and may be tuned by measured playtests;
- no tranche silently advances.

## 3. Current qualified baseline

### PROVEN

- FriendSDK v0.1.3 live ownership/Friend selection works in public preview;
- movement and active SHIFT work;
- A/B/COMMON phase authority works;
- Signal XP and deterministic level-up drafting work;
- exactly four active weapon slots are enforced;
- DELTA BURST is mandatory and canonical-Friend-derived;
- DELTA, VECTOR, ORBIT, ECHO and SIGNAL have qualified Rank I–V behavior;
- desktop 960 and narrow 390 browser paths are qualified;
- reduced-motion support exists;
- public GitHub Pages preview is playable;
- inherited deterministic/browser qualification through B5 is green on the qualified line.

### NOT YET COMPLETE

- Survival Director / finite stage progression;
- BEACON, ANCHOR and FLICKER production enemies;
- elite encounter/reward loop;
- Protocol runtime and Protocol ranks I–III;
- Evolution Core runtime;
- five weapon Evolutions;
- complete run pacing;
- THE DESYNC final boss;
- victory/reconstruction/results loop;
- final game-over/retry presentation;
- final competition-facing HUD/draft/boss/result GUI;
- final audio/presentation polish;
- Owner full live end-to-end acceptance run.

## 4. Definition of COMPLETE RUN

RARE//SHIFT is not considered complete for this competition until a real eligible holder can:

```text
CONNECT / SELECT FRIEND
        ↓
FAST CALIBRATION
        ↓
STAGE I — ESTABLISH
        ↓
ELITE I / EVOLUTION CORE
        ↓
STAGE II — SPLIT PRESSURE
        ↓
CHECKPOINT ELITE / BUILD PAYOFF
        ↓
STAGE III — ESCALATION
        ↓
ELITE II / EVOLUTION CORE
        ↓
STAGE IV — COLLAPSE
        ↓
THE DESYNC
        ↓
RECONSTRUCTION + VICTORY RESULTS
        ↓
RUN AGAIN / CHANGE FRIEND
```

A death at any combat point must produce a deliberate run-results/failure screen with immediate retry.

## 5. Scope lock

### REQUIRED FOR COMPLETE RUN

- finite seeded Survival Director;
- four readable combat stages plus calibration;
- TRACE, SPLIT-A/B plus BEACON, ANCHOR and FLICKER;
- at least two explicit elite checkpoints, plus one mid-run checkpoint elite;
- Evolution Core rewards;
- five Protocol families, ranks I–III;
- all five existing weapon Evolution paths;
- THE DESYNC final boss with three deterministic phases;
- boss health/readability UI;
- victory/results/replay loop;
- game-over/results/retry loop;
- competition-facing HUD and draft polish;
- desktop/touch/reduced-motion parity;
- deterministic and browser qualification;
- real-holder Owner completion test.

### EXPLICITLY NOT REQUIRED BEFORE SUBMISSION

- live RF spending/transfers;
- real reward settlement;
- backend account system;
- backend leaderboard;
- PvP/matchmaking;
- co-op;
- clans;
- long campaign/world map;
- multiple arenas;
- permanent-stat grind;
- NFT rarity stat advantages;
- paid rerolls or paid revives;
- second tradeable token.

These omissions do not make the single-player run incomplete.

## 6. Completion pacing target

The original approximately seven-minute target remains the design goal, but final boss time must be included in the perceived complete run rather than appended as an unbounded extra encounter.

Initial implementation targets:

### Calibration — 0:20–0:40

- MOVE;
- collect Signal XP;
- observe A/B threat difference;
- perform one meaningful SHIFT;
- DELTA defeats one matching-phase target;
- enter FRACTURE GRID.

### Stage I — ESTABLISH — 0:00–1:20

Threats:

- TRACE;
- one aligned family, then both A/B families;
- fast early XP.

Checkpoint:

- **Elite I** near 1:20;
- guaranteed Evolution Core;
- clear reward pickup feedback.

### Stage II — SPLIT PRESSURE — 1:20–3:00

Threats:

- mixed A/B packs;
- BEACON ranged pressure;
- COMMON pressure prevents permanent phase escape.

Checkpoint:

- **Checkpoint Elite** near 3:00;
- guaranteed major XP reward;
- guaranteed Evolution Core if the run has fewer than two acquired Cores;
- restores one REFRACT up to its allowed cap.

This checkpoint fulfills the original mid-run boss/elite design role without requiring an unrelated second full boss system before THE DESYNC.

### Stage III — ESCALATION — 3:00–4:45

Threats:

- ANCHOR lane/space pressure;
- FLICKER alignment-reading pressure;
- denser mixed waves;
- coherent builds should begin evolving during this stage.

Checkpoint:

- **Elite II** near 4:45;
- guaranteed Evolution Core.

### Stage IV — COLLAPSE — 4:45–6:00

Threats:

- bounded high-density mixture of all qualified enemy roles;
- readable lanes remain mandatory;
- no arbitrary swarm count target;
- evolved build payoff should be visible.

### THE DESYNC — approximately 6:00–7:30

Target boss duration: approximately 60–90 seconds for a coherent successful build.

These times are **PROVISIONAL TUNING TARGETS**. Stage order, reward semantics and required encounter roles are LOCKED; exact seconds and spawn counts remain playtest-tunable.

## 7. Enemy completion contracts

### TRACE — existing baseline

COMMON simple chaser. Maintains movement pressure.

### SPLIT-A / SPLIT-B — existing baseline

Aligned chasers that teach and reinforce corporeal phase authority.

### BEACON — required

Role: ranged anti-circle-kiting pressure.

Contract:

- visually distinct silhouette/icon;
- telegraphed shot before damage authority;
- deterministic target direction sampled at telegraph/launch according to the implementation contract;
- projectile authority obeys the BEACON's declared phase class;
- off-phase behavior remains readable and non-damaging when the alignment contract says ghosted;
- bounded projectile count and lifetime.

### ANCHOR — required

Role: slow space-denial/tank pressure.

Contract:

- visibly larger/heavier silhouette than TRACE/SPLIT;
- high health relative to ordinary chasers;
- low movement speed;
- pressure comes from occupying valuable movement space, not invisible damage inflation;
- cannot spawn directly in unavoidable contact range;
- phase authority remains explicit.

### FLICKER — required

Role: phase-reading enemy.

Contract:

- switches A ↔ B on a deterministic cadence;
- gives a visible pre-switch warning;
- cannot damage as the opposite phase before the visual/authority transition is complete;
- switching does not teleport into the player;
- stable seeded cadence for qualification.

### ELITE — required

An Elite is a clearly marked enhanced encounter, not merely a hidden HP multiplier.

Minimum contract:

- explicit elite marker/health presentation;
- higher HP and bounded pressure than the base role;
- at least one readable modifier/attack cadence;
- never uses unavoidable spawn/contact damage;
- drops its declared reward exactly once;
- designated elites drop Evolution Cores;
- elite death/reward is deterministic under seeded qualification.

## 8. Protocol runtime

Exactly four Protocol slots remain locked. Five families compete for those slots. Protocol ranks are I–III.

A Protocol must provide a useful bounded passive benefit even if its matching weapon is not currently owned; owning the matching Protocol additionally satisfies that weapon's Evolution gate.

### COMMON CORE

Role: signature/local-field stability.  
Supports: DELTA BURST → RECONSTRUCTION FIELD.

Rank direction:

- I: improves bounded DELTA/field stability;
- II: strengthens the same identity-field role without adding a free cast;
- III: highest bounded field support.

### VECTOR LENS

Role: projectile acquisition/flight quality.  
Supports: VECTOR NEEDLE → PRISM LANCE.

Rank direction:

- deterministic projectile-speed/acquisition improvement;
- must not fabricate projectiles or reset cooldowns.

### ORBIT STABILIZER

Role: orbit control/defensive reliability.  
Supports: ORBIT NODES → SYNC HALO.

Rank direction:

- bounded orbit/contact-control improvement;
- must preserve anchor/rotation state during rank-up.

### MEMORY FUSE

Role: mine arming/area-control quality.  
Supports: ECHO MINE → MEMORY COLLAPSE.

Rank direction:

- bounded arming/area/lifetime support;
- must not fabricate mine history, depth or detonations.

### RESONANCE COIL

Role: bounded chain/cooldown efficiency.  
Supports: SIGNAL ARC → CHAIN RESONANCE.

Rank direction:

- bounded cooldown/relay support;
- must not fabricate a cast or rewrite already-snapshotted graphs.

Exact numeric values require deterministic review and may not be chosen merely to force a particular test route.

## 9. Evolution Core and evolution gate

Evolution Core is a gameplay reward, not a tradeable token.

A weapon evolution requires:

1. weapon owned at Rank V;
2. matching Protocol owned at Rank I or higher;
3. at least one unspent Evolution Core.

Rules:

- one successful evolution consumes exactly one Core;
- Core acquisition is deterministic from designated elite/checkpoint rewards;
- Cores never randomly drop from ordinary trash enemies;
- if multiple Evolutions are eligible, the player chooses;
- evolution is offered through a deliberate reward/draft state and cannot occur invisibly;
- evolution cannot fabricate weapon shots, cooldown readiness, SHIFT credit, mine history, relay history or prior combat events.

## 10. Required five Evolutions

### DELTA BURST → RECONSTRUCTION FIELD

- active-phase canonical pulse remains authoritative;
- pulse is followed by a short COMMON silhouette echo derived from A ∩ B;
- SHIFT produces a bounded A→COMMON→B or B→COMMON→A sequence;
- both phases are never permanently active.

### VECTOR NEEDLE → PRISM LANCE

- preserves VECTOR precision identity;
- gains bounded multi-target penetration/refraction behavior;
- target selection remains deterministic and phase-legal;
- evolution does not create an immediate free projectile.

### ORBIT NODES → SYNC HALO

- preserves orbit anchor and rotation continuity;
- creates a more continuous close-defense ring/formation;
- accepted SHIFT reverses rotation and may emit one bounded knockback/shear response;
- COMMON/boss resistance prevents repeated control abuse.

### ECHO MINE → MEMORY COLLAPSE

- preserves leave/return memory identity;
- armed mines may link within a bounded range;
- one detonation can propagate through a hard-capped chain;
- no recursive/unbounded cascade;
- Rank-V burst ledger remains authoritative.

### SIGNAL ARC → CHAIN RESONANCE

- preserves deterministic relay-graph identity;
- increases bounded chain reach/value;
- decay is reduced within the locked damage budget;
- post-SHIFT authority may include one controlled COMMON interaction;
- no ghost legalization and no historical graph reuse.

All five Evolutions are required for the complete run target even though a single run can equip only four active weapons.

## 11. THE DESYNC final boss

THE DESYNC is the final mastery test. It must be solvable with any coherent legal build and impossible to solve optimally by ignoring SHIFT.

### Boss global contract

- deterministic state machine under seeded qualification;
- explicit boss HP bar/name;
- no contact spawn on player;
- clearly telegraphed attacks;
- A/B vulnerability state visible by shape/effect as well as color;
- COMMON pressure exists in every phase so phase-switching is tactical, not invulnerability;
- boss cannot require one specific random weapon;
- DISCHARGE cannot delete or trivially bypass the boss;
- reduced-motion mode preserves timing/readability without removing mechanics.

### Phase 1 — ALIGNMENT

Purpose: teach boss vulnerability law.

- boss exposes A or B vulnerability on a deterministic telegraphed cadence;
- wrong-phase weapon authority cannot deal normal boss damage;
- bounded COMMON radial/line pressure keeps movement active;
- successful SHIFT should visibly convert defense into an attack opportunity.

### Phase 2 — CROSS-SPLIT

Purpose: combine vulnerability with battlefield pressure.

- alignment changes more quickly than Phase 1;
- A/B adds enter in bounded counts;
- telegraphed lane/radial attacks create movement decisions;
- player chooses between immediate safety and attacking the current vulnerability window;
- adds obey ordinary phase contracts and do not bypass spawn safety.

### Phase 3 — BREAK WINDOW

Purpose: explicit SHIFT mastery climax.

- COMMON hazards remain active;
- boss presents a deterministic A/B response tell;
- correct phase response opens a short BREAK window;
- meaningful boss damage is concentrated in BREAK windows;
- failed response does not instantly kill the player but costs time/position/pressure;
- evolved weapons materially improve payoff but are not mandatory to make progress.

Exact HP, cadence and attack damage are PROVISIONAL until browser and Owner playtest qualification.

## 12. Victory, death and replay

### Victory

After THE DESYNC reaches zero HP:

1. hostile simulation stops;
2. victory transition plays;
3. RECONSTRUCTION verifies/displays the selected Friend's canonical A/B identity evidence;
4. run-results screen appears;
5. RUN AGAIN and CHANGE FRIEND actions are available.

Results include at minimum:

- Friend identity;
- run seed;
- total time;
- kills;
- level;
- final HP;
- SHIFT count;
- damage taken;
- weapons + final ranks/Evolutions;
- Protocols + ranks;
- Evolution Cores acquired/spent;
- elite results;
- THE DESYNC result.

### Death

- hostile simulation stops;
- no paid revive;
- failure results show time, kills, level, build, Evolutions and SHIFT count;
- immediate RUN AGAIN;
- CHANGE FRIEND available;
- no external paid stake is lost.

## 13. GUI completion requirements

The final complete-run UI must be player-facing rather than diagnostic.

Required:

- clean HP + level presentation;
- XP progress bar;
- strong Phase A/B state indicator;
- Friend identity visible during the run;
- four active weapon slots with name/icon/rank/evolution state;
- four Protocol slots with rank;
- Evolution Core count/state;
- stage/checkpoint announcement;
- elite presentation;
- THE DESYNC boss name + HP bar + phase/break readability;
- level-up cards with clear name, current→next state and concise effect;
- REFRACT state;
- deliberate game-over screen;
- deliberate victory/results screen;
- touch controls that do not obscure critical gameplay;
- reduced-motion equivalent states.

Normal player UI must not expose engineering-only counters such as raw frame/debug labels unless a diagnostics mode is explicitly enabled.

## 14. Audio/presentation minimum

Audio is required only to the level needed for a complete readable run.

Minimum cues:

- draft/open/select;
- accepted SHIFT;
- player hurt;
- elite spawn/defeat;
- Evolution Core pickup;
- evolution;
- boss phase transition;
- BREAK window;
- victory/death.

No audio cue may be the sole source of critical information.

## 15. Remaining implementation tranches

### CR-0 — COMPLETE-RUN GOVERNANCE

This document only. No gameplay code.

Exit gate:

- Owner reviews/approves completion scope;
- baseline remains unchanged.

### CR-1 — SURVIVAL DIRECTOR + ENEMY COMPLETION

Implement:

- finite run clock/stage director;
- BEACON;
- ANCHOR;
- FLICKER;
- Elite I / Checkpoint Elite / Elite II;
- deterministic reward drops;
- REPAIR/VACUUM/DISCHARGE behavior if not already production-complete;
- stage/checkpoint UI hooks.

Exit gate:

- deterministic stage timeline PASS;
- enemy contracts PASS;
- elite reward exactly-once PASS;
- 960/390 browser progression through Stage IV PASS;
- inherited B1–B5 regression PASS.

### CR-2 — PROTOCOLS + EVOLUTION CORE + FIVE EVOLUTIONS

Implement:

- four Protocol slots;
- five Protocol families I–III;
- Core inventory/reward flow;
- rank-V + matching Protocol + Core gate;
- all five Evolutions;
- evolution UI/reward choice.

Exit gate:

- Protocol legality/rank tests PASS;
- Core accounting PASS;
- each evolution deterministic contract PASS;
- no free-cast/history fabrication PASS;
- at least two natural browser Evolutions observed in a legitimate run;
- all five controlled evolution fixtures PASS;
- inherited CR-1 + B1–B5 regression PASS.

### CR-3 — THE DESYNC + COMPLETE ENDING

Implement:

- three-phase THE DESYNC state machine;
- boss attacks/adds/break windows;
- boss HUD;
- victory transition;
- reconstruction/results;
- death/results/retry;
- replay/change-Friend path.

Exit gate:

- deterministic boss state-machine tests PASS;
- boss cannot take illegal wrong-phase damage PASS;
- BREAK response boundaries PASS;
- seeded complete run can win PASS;
- seeded death path PASS;
- 960/390 boss browser PASS;
- reduced-motion boss PASS;
- inherited CR-2 regression PASS.

### CR-4 — COMPETITION GUI + PRESENTATION POLISH

Implement only presentation/UX changes required for a coherent final experience.

Exit gate:

- no critical diagnostic UI in player mode;
- desktop/touch hierarchy reviewed;
- stage/elite/boss/draft/results readability reviewed;
- required SFX cues present or explicitly waived by Owner;
- accessibility/reduced-motion regression PASS.

### CR-5 — FINAL END-TO-END QUALIFICATION

Required evidence:

- exact-head deterministic suite PASS;
- FriendSDK check/build/smoke PASS;
- full browser 960 PASS;
- full browser 390 PASS;
- reduced-motion PASS;
- public HTTPS preview PASS;
- real-holder wallet/Friend selection PASS;
- Owner manually plays from Friend selection through either THE DESYNC victory or an intentionally tested death/retry path;
- Owner separately completes at least one full successful live run before final acceptance;
- no submission claim exceeds proven behavior.

Only after CR-5 may `FULL_GAMEPLAY_EXPERIENCE=PASS` be declared.

## 16. Hard invariants during completion

The following remain non-negotiable:

- do not tune production behavior merely for a test bot;
- do not fabricate HP, XP, rank, Cores, pickups, invulnerability or boss progress in natural-browser qualification;
- controlled fixtures may prove isolated high-rank/evolution/boss contracts but must be clearly separated from natural run evidence;
- no assertion weakening merely to make CI green;
- no cooldown reset/free cast on rank, Protocol or evolution transition;
- no historical SHIFT/hit/mine/relay credit;
- no draft backlog during pause;
- deterministic stable-ID tie-breaking where relevant;
- no ghost target legalization;
- no unbounded projectile/enemy/chain recursion;
- no NFT rarity raw-power ladder;
- no live RF mutation;
- no merge to `main` without explicit Owner approval for the reviewed tranche;
- no public deployment beyond an Owner-authorized bounded tranche;
- exact-head CI is required for PASS.

## 17. Decision status

### LOCKED

- core phase/SHIFT thesis;
- B1–B5 weapon identities and qualified ranks;
- 4 weapon slots;
- 4 Protocol slots;
- Protocol ranks I–III;
- Evolution gate: Rank V + matching Protocol + Core;
- five existing Evolutions;
- finite complete run;
- BEACON / ANCHOR / FLICKER / elites;
- THE DESYNC final boss;
- reconstruction/results ending;
- free standard run;
- no P2W/NFT rarity raw-power ladder.

### PROVISIONAL

- exact stage seconds;
- spawn density;
- enemy HP/damage/speeds;
- Protocol numeric values;
- boss HP/damage/cadence;
- exact SFX implementation.

### DEFERRED

- live RF spending;
- backend leaderboard;
- multiplayer/co-op;
- multiple arenas/campaigns;
- persistent vertical-stat grind;
- tournament-scale online infrastructure.

## 18. Current decision

`CR_0=REVIEW_CANDIDATE`

`CR_1=NOT_STARTED`

`CR_2=NOT_STARTED`

`CR_3=NOT_STARTED`

`CR_4=NOT_STARTED`

`CR_5=NOT_STARTED`

`FULL_GAMEPLAY_EXPERIENCE=NOT_YET_PROVEN`

No gameplay implementation is authorized by this document alone. The next action after Owner approval is **CR-1 — Survival Director + Enemy Completion**.