# RARE//SHIFT V2-3B — WEAPON RANK II–V MECHANICS GATE v1

**Status:** ACTIVE PLANNING GATE — IMPLEMENTATION NOT YET AUTHORIZED  
**Date:** 2026-09-27  
**Planning branch:** `planning/v2-3b-weapon-rank-gate`  
**Source V2-3A closeout tree:** `99b671b092f12f54e9cb392da1f3d5c57cc0e323`  
**Current feature-lineage base:** `e8ed4e72310427ccde9163cd9a98ec341dd332bf`  
**V2-3A qualified implementation/test HEAD:** `12d49e9cc6ada42fdc559a67b5894d6a17575399`

> The two commits between `99b671b...` and `e8ed4e7...` are a planning-placeholder creation and immediate cleanup. Their net file diff is empty. No gameplay, qualification, or V2-3A source changed.

## 1. Purpose

V2-3A established the normalized production progression model. V2-3B defines the actual Rank II–V runtime behavior for all five active weapon families before any live implementation occurs.

This gate exists to prevent weapon progression from degenerating into ordinary survivor-style `+damage / +cooldown / +projectile count` scaling.

The governing rejection test remains:

> If removing the A/B phase system leaves the weapon progression functionally unchanged, the progression is not acceptable for RARE//SHIFT.

V2-3B therefore locks twenty rank transitions as deterministic phase mechanics with explicit numerical caps.

## 2. Sources reviewed

Repository authority reviewed before this gate:

- `RARE_SHIFT_V2_2_WEAPON_MECHANICS_GATE_v1.md`
- `RARE_SHIFT_V2_3_PROGRESSION_GATE_v1.md`
- `V2_3A_PROGRESSION_DRAFT_ENGINE_REPORT.md`
- current Rank-I source profiles:
  - `phase-combat-core.ts`
  - `vector-core.ts`
  - `orbit-core.ts`
  - `echo-core.ts`
  - `signal-arc-core.ts`
  - `survival-core.ts`

External design references reviewed:

- Game Developer — *How to Power up Players with Upgrades*: meaningful upgrade choices should avoid obvious false choices.
- Game Developer — *Designing each of the 50 weapons in Dead Cells to feel distinctive*: weapons should create different play styles rather than differ only by damage.
- Game Developer — *Game Design Deep Dive: The weapon-crafting system of Mercenary Kings*: use a common balancing model/table to keep many related values internally consistent.
- Game Developer — *Power-ups in Lovers in a Dangerous Spacetime*: upgrades should create visible gameplay differences rather than only alter statistics.

These references reinforce existing RARE//SHIFT governance; they do not replace repository authority.

## 3. Decision status

### LOCKED FOR V2-3B IMPLEMENTATION BASELINE

- five weapon families only;
- Rank I remains the qualified V2-2 foundation;
- Rank II–V mechanics defined below;
- each rank changes deterministic gameplay state or geometry;
- active weapon cap remains four including mandatory DELTA;
- no random critical-hit dependency;
- no extra active combat buttons;
- no NFT rarity/generation raw-power ladder;
- all normal targeting continues to obey corporeal phase authority;
- all cross-phase damage must be explicitly named, bounded ECHO authority;
- SHIFT never resets a normal weapon cooldown;
- all projectile/node/mine/chain counts are hard-capped;
- per-target multi-hit behavior is explicitly bounded.

### NUMERICAL STATUS

The values below are the **locked initial implementation profile** for V2-3B. They may change only after measured automated/manual qualification demonstrates a concrete balance/readability defect.

A tuning change is not allowed merely because another value “feels stronger” in isolation.

### NOT AUTHORIZED BY THIS DOCUMENT

- V2-3B gameplay code;
- Protocol runtime effects;
- Evolution Core acquisition/source;
- evolved weapon forms;
- V2-4 enemies/pacing;
- THE DESYNC;
- economy/RF actions;
- `main` merge;
- deployment.

## 4. Cross-family balance law

Every family must retain a different primary tactical question:

| Family | Tactical question | Main growth axis |
|---|---|---|
| DELTA BURST | Where does my Friend geometry control this phase? | cadence → footprint → phase echo → control |
| VECTOR NEEDLE | Which corporeal threat deserves committed focus? | penetration → priority → post-SHIFT transfer → lock |
| ORBIT NODES | When should I reverse close-defense geometry? | node coverage → orbit coverage → reversal shear → ring continuity |
| ECHO MINE | Where will damage be waiting when I return? | memory capacity → blast space → recall timing → repeated-memory depth |
| SIGNAL ARC | How does the current corporeal graph route damage? | chain length → decay → COMMON relay → deterministic graph control |

No rank may steal another family's identity:

- VECTOR never becomes chain lightning;
- ORBIT never becomes a long-range DPS field;
- ECHO never becomes instant generic area damage;
- SIGNAL ARC never branches recursively;
- only DELTA uses selected-Friend canonical mask geometry as its primary damage field.

## 5. Baseline Rank-I anchors

These are inherited and remain authoritative unless V2-3B qualification proves an integration defect.

### DELTA BURST I — SIGNAL PULSE

- damage per target per pulse: `12`
- cooldown: `860 ms`
- canonical pixel world scale: `8.0`
- target hit radius around each canonical point: `18 px`
- each target may take DELTA damage at most once per pulse regardless of how many canonical points overlap it.

### VECTOR NEEDLE I

- primary damage: `10`
- cooldown: `760 ms`
- acquisition range: `560 px`
- projectile speed: `960 px/s`
- hit radius: `18 px`
- max in flight: `2`
- max targets per projectile: `1`

### ORBIT NODES I

- damage: `8`
- orbit radius: `72 px`
- angular speed: `2.4 rad/s`
- contact radius: `26 px`
- shared per-target contact interval: `700 ms`
- node count: `1`

### ECHO MINE I

- placement interval: `1800 ms`
- max active: `3`
- minimum separation: `56 px`
- lifetime: `9000 ms`
- post-return readiness delay: `250 ms`
- trigger radius: `68 px`
- blast radius: `84 px`
- damage: `16`

### SIGNAL ARC I

- cooldown: `1250 ms`
- acquisition range: `420 px`
- relay range: `180 px`
- max targets: `3`
- hop damage: `10 / 8 / 6`

## 6. DELTA BURST Rank II–V

DELTA remains the Character Spotlight identity center.

### Rank II — DENSE SAMPLE

Mechanical change:

- pulse cadence increases while geometry and per-hit authority stay unchanged.

Profile:

- damage: `12`
- cooldown: `720 ms`
- canonical scale: `8.0`
- hit radius: `18 px`

Hard rules:

- no queued/backlogged pulses;
- at most one DELTA pulse may resolve for each completed cooldown interval;
- pause/draft time may not accumulate hidden extra shots.

Rationale:

This is the one DELTA rank intentionally dominated by cadence. It creates a clear early power increase while preserving Friend-shape normalization.

### Rank III — FIELD SCALE

Mechanical change:

- active-phase Friend geometry occupies more world space.

Profile:

- damage: `12`
- cooldown: `720 ms`
- canonical pixel world scale: `9.5`
- hit radius: `18 px`

Hard rules:

- source 16×16 canonical rows are never resampled into a different mask;
- world placement scales the exact points only;
- per-target damage remains one hit per pulse;
- lit-pixel count never modifies damage.

### Rank IV — PHASE ECHO

Mechanical change:

- every accepted SHIFT schedules exactly one previous-phase canonical echo.

Primary profile remains Rank III.

Echo profile:

- delay after accepted SHIFT: `140 ms`
- canonical world scale: `9.5`
- echo damage: `4`
- hit radius: `18 px`
- max pending echoes: `1`
- stagger/control: `0`

Authority:

- the echo uses the canonical mask of the phase just left;
- it may damage only A/B-aligned enemies belonging to that previous phase that are now ghosted;
- COMMON enemies are excluded from PHASE ECHO damage;
- enemies corporeal in the new phase are excluded from the previous-phase echo;
- each eligible target may be damaged once by that echo;
- a new accepted SHIFT replaces an unresolved pending echo instead of stacking echoes;
- SHIFT does not reset the normal DELTA cooldown.

This is explicitly low ECHO authority, not ordinary ghost targeting.

### Rank V — LOCKED IDENTITY

Mechanical change:

- matching-phase primary DELTA gains bounded identity control.

Profile:

- primary damage: `14`
- cooldown: `720 ms`
- canonical world scale: `9.5`
- primary hit radius: `18 px`
- PHASE ECHO remains `4` damage;
- normal-enemy stagger: `90 ms`
- future elite resistance hook: `45 ms` maximum before V2-4 tuning;
- future boss resistance hook: `0 ms` default unless V2-4 explicitly authorizes a bounded boss response.

Hard rules:

- stagger comes only from the matching-phase primary pulse, never PHASE ECHO;
- one target receives at most one stagger event per primary pulse;
- geometry density does not multiply stagger strength/duration.

## 7. VECTOR NEEDLE Rank II–V

VECTOR remains precision/elite-boss pressure.

### Rank II — CLEAN LINE

Mechanical change:

- a projectile may continue through its acquired target to exactly one additional legal corporeal target when line geometry permits.

Profile:

- cooldown: `760 ms`
- acquisition range / total travel budget: `560 px`
- speed: `960 px/s`
- max in flight: `2`
- max targets per normal projectile: `2`
- hit damage: `10 / 7`
- line-corridor radius for secondary eligibility: `20 px`

Secondary-target algorithm:

1. acquire the Rank-I primary target normally;
2. form a ray from player origin through the primary target;
3. consider only active, corporeal, unvisited targets beyond the primary target;
4. target center must be within `20 px` of the ray and within the original `560 px` total travel budget;
5. choose smallest positive along-ray distance, then lower stable spawn ID.

No retargeting or curved chain behavior is permitted.

### Rank III — PRIORITY TRACE

Mechanical change:

- acquisition can prefer a meaningful higher-priority corporeal threat without ignoring nearby danger.

Profile:

- priority distance band: `120 px` beyond the nearest legal target distance;
- all Rank-II projectile limits remain unchanged.

Deterministic acquisition:

1. find nearest legal target distance `D`;
2. candidate priority set is all legal targets with distance `<= min(560, D + 120)`;
3. choose highest `priorityTier`;
4. tie-break by nearest distance;
5. final tie-break by lower stable spawn ID.

Current V2-3B default priority tiers:

- `TRACE = 1`
- `SPLIT_A = 0`
- `SPLIT_B = 0`

V2-4 may assign higher explicit tiers to BEACON/ANCHOR/ELITE/BOSS without changing this acquisition algorithm.

### Rank IV — PHASE TRANSFER

Mechanical change:

- an accepted SHIFT arms one stronger line-through opportunity for the first subsequent valid VECTOR launch.

Transfer profile:

- normal projectile remains max `2` targets at `10 / 7`;
- first valid post-SHIFT launch: max `3` targets at `10 / 7 / 5`;
- arm count: max `1`;
- repeated SHIFT does not stack charges;
- if no valid target exists, the transfer remains armed until one valid launch occurs;
- firing consumes the transfer even if later projectile travel is invalidated by target death/phase change;
- SHIFT never resets VECTOR cooldown.

The third target uses the same line-corridor authority; it is not a chain/refraction.

### Rank V — VECTOR LOCK

Mechanical change:

- sustained valid focus on one high-value corporeal primary target builds deterministic lock strength.

Lock eligibility:

- primary target `priorityTier >= 1`;
- target remains corporeal;
- target remains active;
- target remains inside `560 px` acquisition range.

Profile:

- lock stacks: `0..3`
- primary damage sequence on repeated valid hits: `10, 12, 14, 16`
- secondary/tertiary penetration damage remains `7 / 5`;
- cooldown remains `760 ms`;
- max in flight remains `2`.

Target rule:

- an existing lock target receives preference only among candidates tied for the highest available priority tier inside the Rank-III priority band;
- a genuinely higher-priority candidate may take over;
- lock resets immediately on target death, inactivity, phase loss, range break, or change of primary target.

No random crit chance or hidden accuracy roll is permitted.

## 8. ORBIT NODES Rank II–V

ORBIT remains close defense/control, not long-range DPS.

### Rank II — SECOND NODE

Mechanical change:

- node count becomes `2` with exact `180°` angular spacing.

Profile:

- damage: `8`
- radius: `72 px`
- angular speed: `2.4 rad/s`
- contact radius: `26 px`
- node count: `2`
- shared per-target contact interval across all nodes: `700 ms`

The shared per-target interval is critical: adding a node increases coverage, not unrestricted same-target DPS.

### Rank III — STABLE ORBIT

Mechanical change:

- larger, slightly faster defensive coverage without adding another node.

Profile:

- damage: `8`
- radius: `80 px`
- angular speed: `2.55 rad/s`
- contact radius: `30 px`
- node count: `2`
- shared per-target interval: `700 ms`

SHIFT preserves angular continuity and simply reverses direction.

### Rank IV — PHASE SHEAR

Mechanical change:

- accepted SHIFT reversal performs one short bounded sweep in the new rotation direction.

Shear profile:

- extra sweep arc per node: `60°` (`π/3`)
- sweep duration: `160 ms`
- shear contact radius: `30 px`
- shear damage: `6`
- max shear hits per target per accepted SHIFT: `1` across all nodes
- no knockback at V2-3B Rank IV

Hard rules:

- PHASE SHEAR is a single event generated by accepted SHIFT, never a per-frame effect;
- shear targets must be corporeal in the post-SHIFT phase;
- regular per-target ORBIT cooldowns are not reset;
- shear uses a separate one-hit-per-shift ledger and cannot recursively create contacts.

### Rank V — SYNCHRONIZED RING

Mechanical change:

- node count becomes `3` with exact `120°` spacing, improving defensive continuity.

Profile:

- damage: `8`
- radius: `80 px`
- angular speed: `2.55 rad/s`
- contact radius: `30 px`
- node count: `3`
- shared per-target contact interval: `650 ms`
- Rank-IV PHASE SHEAR remains bounded exactly as above.

No node may independently bypass the shared per-target interval.

## 9. ECHO MINE Rank II–V

ECHO remains delayed route-planning damage. Every useful mine still requires a genuine leave-and-return phase cycle.

### Rank II — LONG MEMORY

Mechanical change:

- more remembered terrain may coexist and persist.

Profile:

- placement interval: `1800 ms`
- max active: `4`
- minimum separation: `56 px`
- lifetime: `12000 ms`
- return delay: `250 ms`
- trigger radius: `68 px`
- blast radius: `84 px`
- damage: `16`

Oldest-ID deterministic replacement remains mandatory.

### Rank III — WIDER COLLAPSE

Mechanical change:

- mines control a larger local route on return.

Profile:

- max active: `4`
- lifetime: `12000 ms`
- return delay: `250 ms`
- trigger radius: `76 px`
- blast radius: `108 px`
- damage: `16`
- placement interval/minimum separation unchanged.

Blast remains one event; it may not arm, trigger, or create another mine.

### Rank IV — FAST RECALL

Mechanical change:

- returned mines become dangerous sooner, but never immediately.

Profile:

- return delay: `140 ms`
- all Rank-III spatial values remain unchanged.

Hard floor:

- no V2-3B or later passive may reduce ECHO return readiness below `100 ms` without a new reviewed gate.

### Rank V — DEEP MEMORY

Mechanical change:

- a mine that survives repeated phase cycling gains a deterministic deeper-memory state.

State extension:

- each completed `away -> returned-home` cycle increments `memoryDepth`;
- `memoryDepth` is capped at `2`;
- depth is retained until trigger, expiry, or replacement;
- merely staying in one phase never increases depth.

Normal depth `0..1` profile remains Rank IV.

At `memoryDepth = 2`:

- trigger radius: `84 px`
- blast radius: `120 px`
- damage: `20`
- return delay remains `140 ms`
- max active remains `4`

This makes deliberate revisiting stronger while preserving the leave/return requirement and all hard caps.

## 10. SIGNAL ARC Rank II–V

SIGNAL ARC remains deterministic corporeal graph routing.

### Rank II — EXTRA LINK

Mechanical change:

- chain cap grows from `3` to `4` unique targets.

Profile:

- cooldown: `1250 ms`
- acquisition range: `420 px`
- relay range: `180 px`
- max targets: `4`
- damage by hop: `10 / 8 / 6 / 5`

Each target may still be hit at most once per cast.

### Rank III — LOWER DECAY

Mechanical change:

- later hops retain more authority.

Profile:

- max targets: `4`
- damage by hop: `10 / 9 / 8 / 7`
- ranges/cooldown unchanged.

This is a numerical rank, but it acts on the already-expanded graph and is bounded by the four-target cap.

### Rank IV — RESONANT RELAY

Mechanical change:

- the first COMMON target used as a relay may extend exactly one subsequent relay edge.

Profile:

- normal relay range: `180 px`
- one-time COMMON relay bonus: `+60 px`
- boosted relay range: `240 px`
- bonus uses per cast: max `1`
- max targets: `4`
- damage: `10 / 9 / 8 / 7`

Authority:

- COMMON may extend distance only;
- the destination still must be corporeal in the current phase;
- COMMON never makes an off-phase ghost a legal target;
- unused bonus does not carry between casts;
- SHIFT does not reset cooldown.

### Rank V — CHAIN CONTROL

Mechanical change:

- relay ordering becomes deterministic coverage-aware instead of purely nearest-neighbor.

The initial target remains the nearest legal corporeal target using distance then stable ID.

For each relay hop:

1. enumerate unvisited legal corporeal candidates within the current relay range;
2. for each candidate compute `forwardDegree`: count of other unvisited legal corporeal targets reachable from that candidate using the next normal/COMMON-bonus relay range;
3. choose highest `forwardDegree`;
4. tie-break by shortest current edge distance;
5. final tie-break by lower stable spawn ID.

Hard caps remain:

- max targets: `4`
- no branching;
- no recursion;
- no repeated target;
- at most one COMMON range bonus per cast;
- candidate population is bounded by the existing active-enemy cap (`48`).

Worst-case selection work remains bounded to a small `O(n²)` graph scan per cast under the 48-enemy safety cap.

## 11. Twenty-transition matrix

| Family | II | III | IV | V |
|---|---|---|---|---|
| DELTA | 720ms cadence | 9.5× world mask scale | 140ms previous-phase echo, 4 dmg | 14 primary dmg + 90ms normal stagger |
| VECTOR | 2-hit line, 10/7 | +120px priority band | first post-SHIFT 3-hit line 10/7/5 | priority lock stacks to 16 primary dmg |
| ORBIT | 2 nodes / 180° | 80px radius / 30px contact | 60°/160ms one-hit shear | 3 nodes / 120°, 650ms shared hit interval |
| ECHO | 4 mines / 12s life | 76 trigger / 108 blast | 140ms return delay | depth-2: 84 trigger / 120 blast / 20 dmg |
| SIGNAL | 4 hops, 10/8/6/5 | 10/9/8/7 | one COMMON +60px relay | degree-aware deterministic relay ordering |

## 12. Performance and abuse caps

These caps are part of the mechanic contract, not optional optimization:

### DELTA

- canonical source grid max: `16×16 = 256` points;
- max pending PHASE ECHO: `1`;
- max damage applications per target: one primary per pulse + one explicitly eligible echo per accepted SHIFT.

### VECTOR

- max in-flight projectiles: `2`;
- normal max hits/projectile: `2`;
- post-SHIFT transfer max hits/projectile: `3`;
- no recursive/refraction behavior in V2-3B.

### ORBIT

- max nodes: `3`;
- one shared normal contact cooldown ledger per target;
- PHASE SHEAR max one hit per target per accepted SHIFT.

### ECHO

- max mines: `4`;
- memory depth max: `2`;
- no recursive detonation;
- no mine-created mine;
- deterministic oldest replacement.

### SIGNAL ARC

- max unique targets: `4`;
- max one COMMON relay bonus/cast;
- no recursion/branching;
- active enemy population assumed bounded by existing `48` cap.

## 13. Required deterministic qualification contracts

V2-3B implementation may not be called technically qualified without deterministic tests proving all of the following.

### Global

- ranks advance exactly one step I→II→III→IV→V;
- Rank V has no further rank transition;
- all profiles are deterministic and immutable;
- no rank changes target legality from corporeal to generic ghost targeting;
- SHIFT never resets ordinary cooldown state;
- all counts/caps remain within this document under adversarial candidate ordering.

### DELTA

- Rank II exact `720 ms` cadence;
- Rank III exact point placement under `9.5` world scale;
- sparse and dense Friend masks retain equal per-target damage authority;
- Rank IV echo uses previous-phase geometry and only previous-phase ghost alignment;
- COMMON/new-phase corporeal targets are excluded from PHASE ECHO;
- max one pending echo;
- Rank V stagger durations and resistance hooks exact.

### VECTOR

- Rank-II line penetration is candidate-order independent;
- secondary target must be beyond primary and inside 20px corridor;
- Rank-III priority band never selects a target more than 120px beyond nearest legal distance;
- stable ID resolves full ties;
- Rank-IV transfer never stacks and never resets cooldown;
- Rank-V lock sequence is exactly 10→12→14→16 and resets on every specified invalidation.

### ORBIT

- exact deterministic angular spacing for 1/2/3 nodes;
- all nodes share one per-target normal hit ledger;
- SHIFT reverses without angle reset;
- shear is emitted once per accepted SHIFT;
- one target cannot receive multiple shear hits from multiple nodes in the same SHIFT event.

### ECHO

- Rank-II max active/lifetime exact;
- Rank-III radii exact;
- Rank-IV return delay exact and nonzero;
- memoryDepth only increments on genuine completed leave/return cycles;
- depth max 2;
- depth-2 profile exact;
- expiry/replacement never detonates a mine.

### SIGNAL ARC

- Rank-II four-hop cap and damage sequence exact;
- Rank-III decay sequence exact;
- Rank-IV COMMON bonus applies at most once and never legalizes a ghost;
- Rank-V ordering is invariant to input array order;
- graph ordering remains deterministic under equal degree/distance via stable ID;
- no target appears twice in one cast.

## 14. Required browser qualification

After deterministic tests pass, the live integration tranche must prove both `960` and `390` widths.

At minimum:

- every family can naturally reach at least one higher rank through the production draft adapter;
- each implemented rank change is visible/observable rather than state-only;
- DELTA Friend geometry remains readable at Rank III–V;
- VECTOR post-SHIFT transfer is visibly distinguishable from ordinary penetration;
- ORBIT 2/3-node spacing and reversal remain readable on 390px;
- ECHO deep-memory state has a readable but restrained marker;
- SIGNAL four-hop graph remains legible without covering the screen;
- reduced-motion mode preserves all tactical information;
- no new controls are introduced;
- exact-three production draft continues passing;
- V2-1 through V2-2E regression remains green.

## 15. Balance-review triggers

A numerical profile may be reopened only if qualification demonstrates one of these concrete conditions:

- a rank creates dominant standing-still play;
- a rank makes SHIFT avoidance preferable to phase engagement;
- a rank makes one family universally superior across its non-role situations;
- a single target receives unintended repeated hits beyond the documented cap;
- mobile readability materially fails;
- active-object counts exceed bounded runtime budgets;
- common current enemies become trivial before V2-4 escalation;
- a Friend's canonical pixel density produces materially higher raw DELTA authority than another qualified Friend.

The correction should target the violating value/mechanic only. Do not globally rebalance unrelated families to compensate for one defect.

## 16. Implementation sequencing recommendation

V2-3B should be implemented in bounded subtranches against this single gate:

1. **V2-3B1 — DELTA II–V**
2. **V2-3B2 — VECTOR II–V**
3. **V2-3B3 — ORBIT II–V**
4. **V2-3B4 — ECHO II–V**
5. **V2-3B5 — SIGNAL II–V**
6. **V2-3B6 — integrated rank/draft/browser qualification**

Each family must receive pure deterministic tests before Phaser behavior is accepted.

The progression adapter should be integrated only far enough to expose mechanics that actually exist. A rank card must never promise a mechanic that has not been implemented in runtime.

## 17. Explicit boundaries after this gate

After this planning gate:

- `V2_3A = TECHNICALLY_QUALIFIED`
- `V2_3B_DESIGN_GATE = READY_FOR_OWNER_REVIEW`
- `V2_3B_CODE = NOT_STARTED`
- `V2_3C_PROTOCOL_RUNTIME = NOT_STARTED`
- `V2_3D_EVOLUTION = NOT_STARTED`
- `V2_4 = NOT_STARTED`

No implementation milestone advances until the owner approves this gate and explicitly authorizes the bounded V2-3B implementation tranche.