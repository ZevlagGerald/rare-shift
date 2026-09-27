# RARE//SHIFT V2-3B — WEAPON RANK II–V MECHANICS GATE v1

**Status:** ACTIVE PLANNING GATE — IMPLEMENTATION NOT YET AUTHORIZED  
**Date:** 2026-09-27  
**Planning branch:** `planning/v2-3b-weapon-rank-gate`  
**Source V2-3A closeout tree:** `99b671b092f12f54e9cb392da1f3d5c57cc0e323`  
**Current feature-lineage base:** `e8ed4e72310427ccde9163cd9a98ec341dd332bf`  
**V2-3A qualified implementation/test HEAD:** `12d49e9cc6ada42fdc559a67b5894d6a17575399`

> The two commits between `99b671b...` and `e8ed4e7...` are a planning-placeholder creation and immediate cleanup. Their net file diff is empty. No gameplay, qualification, or V2-3A source changed.

## 1. Purpose

V2-3A established the normalized production progression model. V2-3B defines the actual Rank II–V runtime behavior for all five active weapon families before live implementation.

This gate prevents weapon progression from degenerating into ordinary survivor-style `+damage / +cooldown / +projectile count` scaling.

The governing rejection test remains:

> If removing the A/B phase system leaves the weapon progression functionally unchanged, the progression is not acceptable for RARE//SHIFT.

V2-3B therefore locks twenty rank transitions as deterministic phase mechanics with explicit numerical and abuse caps.

## 2. Sources reviewed

Repository authority:

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
- each rank changes deterministic gameplay state, geometry, target selection, timing, or control;
- active weapon cap remains four including mandatory DELTA;
- no random critical-hit dependency;
- no extra active combat buttons;
- no NFT rarity/generation raw-power ladder;
- all ordinary targeting obeys corporeal phase authority;
- all cross-phase damage must be explicitly named, bounded ECHO authority;
- SHIFT never resets an ordinary weapon cooldown;
- SHIFT-triggered weapon riders have their own independent rearm caps and may not derive unlimited DPS from rapid toggling;
- all projectile/node/mine/chain counts are hard-capped;
- per-target multi-hit behavior is explicitly bounded.

### NUMERICAL STATUS

The values below are the **locked initial implementation profile** for V2-3B. They may change only after measured automated/manual qualification demonstrates a concrete balance/readability defect.

A tuning change is not allowed merely because another value feels stronger in isolation.

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

| Family | Tactical question | Main growth axis |
|---|---|---|
| DELTA BURST | Where does my Friend geometry control this phase? | cadence → footprint → phase echo → control |
| VECTOR NEEDLE | Which corporeal threat deserves committed focus? | penetration → priority → post-SHIFT transfer → lock |
| ORBIT NODES | When should I reverse close-defense geometry? | node coverage → orbit coverage → reversal shear → ring continuity |
| ECHO MINE | Where will damage be waiting when I return? | memory capacity → blast space → recall timing → repeated-memory depth |
| SIGNAL ARC | How does the current corporeal graph route damage? | chain length → decay → COMMON relay → deterministic graph control |

Identity boundaries:

- VECTOR never becomes chain lightning;
- ORBIT never becomes a long-range DPS field;
- ECHO never becomes instant generic area damage;
- SIGNAL ARC never branches recursively;
- only DELTA uses selected-Friend canonical mask geometry as its primary damage field.

## 5. Baseline Rank-I anchors

### DELTA BURST I — SIGNAL PULSE

- damage/target/pulse: `12`
- cooldown: `860 ms`
- canonical pixel world scale: `8.0`
- target hit radius around each canonical point: `18 px`
- target takes DELTA damage at most once per pulse regardless of point overlap.

### VECTOR NEEDLE I

- primary damage: `10`
- cooldown: `760 ms`
- acquisition range: `560 px`
- projectile speed: `960 px/s`
- hit radius: `18 px`
- max in flight: `2`
- max targets/projectile: `1`

### ORBIT NODES I

- damage: `8`
- radius: `72 px`
- angular speed: `2.4 rad/s`
- contact radius: `26 px`
- shared per-target contact interval: `700 ms`
- nodes: `1`

### ECHO MINE I

- placement interval: `1800 ms`
- max active: `3`
- minimum separation: `56 px`
- lifetime: `9000 ms`
- return delay: `250 ms`
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

### II — DENSE SAMPLE

- damage: `12`
- cooldown: `720 ms`
- canonical scale: `8.0`
- hit radius: `18 px`

Rules:

- no queued/backlogged pulses;
- pause/draft time never accumulates hidden extra shots.

### III — FIELD SCALE

- damage: `12`
- cooldown: `720 ms`
- canonical pixel world scale: `9.5`
- hit radius: `18 px`

Rules:

- exact canonical 16×16 point membership is preserved;
- only world placement scales;
- per-target damage stays one hit/pulse;
- lit-pixel count never modifies damage.

### IV — PHASE ECHO

Every accepted SHIFT may schedule one previous-phase canonical echo.

Primary profile stays Rank III.

Echo profile:

- delay: `140 ms`
- world scale: `9.5`
- damage: `4`
- hit radius: `18 px`
- max pending echoes: `1`
- independent echo rearm: `650 ms`
- stagger/control: `0`

Authority:

- uses canonical geometry of the phase just left;
- damages only A/B-aligned enemies belonging to that previous phase that are now ghosted;
- COMMON is excluded;
- enemies corporeal in the new phase are excluded;
- each eligible target is hit at most once;
- accepted SHIFT inside the `650 ms` echo-rearm window performs the phase change normally but creates no additional echo;
- a new eligible SHIFT replaces an unresolved pending echo rather than stacking;
- SHIFT never resets DELTA cooldown.

This is explicit low ECHO authority, not generic ghost targeting.

### V — LOCKED IDENTITY

Primary profile:

- damage: `14`
- cooldown: `720 ms`
- canonical scale: `9.5`
- hit radius: `18 px`
- PHASE ECHO remains `4`
- normal-enemy stagger: `90 ms`
- future elite resistance hook: max `45 ms` before V2-4 tuning
- future boss resistance hook: default `0 ms` unless V2-4 explicitly authorizes a bounded response.

Rules:

- stagger only comes from matching-phase primary DELTA;
- echo never staggers;
- one target gets at most one stagger event per primary pulse;
- geometry density never multiplies control.

## 7. VECTOR NEEDLE Rank II–V

VECTOR remains precision/elite-boss pressure.

### II — CLEAN LINE

Profile:

- cooldown: `760 ms`
- acquisition/total travel budget: `560 px`
- speed: `960 px/s`
- max in flight: `2`
- max normal hits/projectile: `2`
- damage: `10 / 7`
- secondary line-corridor radius: `20 px`

Algorithm:

1. acquire Rank-I primary target;
2. form a ray from player origin through primary;
3. consider only active, corporeal, unvisited targets beyond primary;
4. candidate center must be within `20 px` of the ray and inside the original `560 px` total travel budget;
5. choose smallest positive along-ray distance, then lower stable spawn ID.

No retargeting/curved chaining.

### III — PRIORITY TRACE

- priority distance band: `120 px` beyond nearest legal target distance.

Algorithm:

1. find nearest legal target distance `D`;
2. consider legal targets with distance `<= min(560, D + 120)`;
3. highest `priorityTier` wins;
4. then nearest distance;
5. then lower stable spawn ID.

Current default tiers:

- `TRACE = 1`
- `SPLIT_A = 0`
- `SPLIT_B = 0`

V2-4 may assign higher explicit tiers to future high-value roles without changing the algorithm.

### IV — PHASE TRANSFER

Accepted SHIFT arms one stronger first valid post-SHIFT launch.

- normal shot: max `2` targets, `10 / 7`
- transfer shot: max `3` targets, `10 / 7 / 5`
- stored transfer charges: max `1`
- repeated SHIFT does not stack;
- no valid target means charge remains armed;
- valid launch consumes charge even if later target validity changes;
- SHIFT never resets cooldown.

The third target follows the same straight-line corridor. It is not refraction/chain behavior.

### V — VECTOR LOCK

Lock eligibility:

- primary target `priorityTier >= 1`;
- active, corporeal, and inside `560 px`.

Profile:

- stacks: `0..3`
- repeated-primary damage: `10, 12, 14, 16`
- penetration damage remains `7 / 5`
- cooldown: `760 ms`
- max in flight: `2`.

Target rule:

- current lock gets preference only among candidates tied for highest available priority tier inside the Rank-III band;
- a genuinely higher-priority target may take over;
- lock resets on death, inactivity, phase loss, range break, or primary-target change.

No random crit or hidden accuracy roll.

## 8. ORBIT NODES Rank II–V

ORBIT remains close defense/control.

### II — SECOND NODE

- damage: `8`
- radius: `72 px`
- angular speed: `2.4 rad/s`
- contact radius: `26 px`
- nodes: `2`, exactly `180°` apart
- shared per-target contact interval across all nodes: `700 ms`.

Adding a node increases coverage, not unrestricted same-target DPS.

### III — STABLE ORBIT

- damage: `8`
- radius: `80 px`
- angular speed: `2.55 rad/s`
- contact radius: `30 px`
- nodes: `2`
- shared per-target interval: `700 ms`.

SHIFT preserves angular position and reverses direction only.

### IV — PHASE SHEAR

Accepted SHIFT reversal can create one bounded sweep event.

- extra sweep arc/node: `60°` (`π/3`)
- sweep duration: `160 ms`
- shear contact radius: `30 px`
- shear damage: `6`
- max shear hits/target/SHIFT: `1` across all nodes
- independent shear rearm: `650 ms`
- knockback: none at V2-3B Rank IV.

Rules:

- one discrete event, never a per-frame damage source;
- targets must be corporeal post-SHIFT;
- regular ORBIT hit cooldowns are not reset;
- shear has a separate one-hit-per-SHIFT ledger;
- accepted SHIFT inside the `650 ms` shear-rearm window reverses ORBIT normally but emits no new PHASE SHEAR.

### V — SYNCHRONIZED RING

- damage: `8`
- radius: `80 px`
- angular speed: `2.55 rad/s`
- contact radius: `30 px`
- nodes: `3`, exactly `120°` apart
- shared per-target contact interval: `650 ms`
- Rank-IV shear/rearm rules remain unchanged.

No node may independently bypass the shared target interval.

## 9. ECHO MINE Rank II–V

Every useful ECHO mine still requires a genuine leave/return phase cycle.

### II — LONG MEMORY

- placement interval: `1800 ms`
- max active: `4`
- min separation: `56 px`
- lifetime: `12000 ms`
- return delay: `250 ms`
- trigger: `68 px`
- blast: `84 px`
- damage: `16`.

Oldest-ID replacement remains deterministic.

### III — WIDER COLLAPSE

- max active: `4`
- lifetime: `12000 ms`
- return delay: `250 ms`
- trigger: `76 px`
- blast: `108 px`
- damage: `16`
- placement/min separation unchanged.

Blast never arms, triggers, or creates another mine.

### IV — FAST RECALL

- return delay: `140 ms`
- Rank-III spatial values unchanged.

Hard floor:

- no V2-3B or later passive may reduce return readiness below `100 ms` without a reviewed gate.

### V — DEEP MEMORY

Each completed `away -> returned-home` cycle may increment `memoryDepth`.

State rules:

- depth cap: `2`
- minimum time between accepted depth increments on the same mine: `900 ms`
- a faster oscillation may transition mine phase state normally but does not add depth;
- depth persists until trigger, expiry, or replacement;
- staying in one phase never increases depth.

Depth `0..1` uses the Rank-IV profile.

At depth `2`:

- trigger: `84 px`
- blast: `120 px`
- damage: `20`
- return delay: `140 ms`
- max active remains `4`.

Overlapping-ready-mine resolution:

- mines resolve in ascending stable mine ID;
- after each blast, target active/dead state is re-evaluated before the next mine resolves;
- expiry/replacement never detonates.

This preserves deterministic burst behavior and prevents same-tick ambiguity.

## 10. SIGNAL ARC Rank II–V

SIGNAL ARC remains deterministic corporeal graph routing.

### II — EXTRA LINK

- cooldown: `1250 ms`
- acquisition: `420 px`
- relay: `180 px`
- max unique targets: `4`
- damage: `10 / 8 / 6 / 5`.

Each target may be hit once/cast.

### III — LOWER DECAY

- max unique targets: `4`
- damage: `10 / 9 / 8 / 7`
- ranges/cooldown unchanged.

This intentionally strengthens the bounded graph rather than adding another projectile/branch.

### IV — RESONANT RELAY

First COMMON target used as a relay may extend exactly one subsequent edge.

- normal relay: `180 px`
- one-time COMMON bonus: `+60 px`
- boosted relay: `240 px`
- bonus uses/cast: `1`
- max targets: `4`
- damage: `10 / 9 / 8 / 7`.

Rules:

- COMMON extends distance only;
- destination must still be corporeal in current phase;
- COMMON never legalizes a ghost;
- unused bonus does not carry between casts;
- SHIFT does not reset cooldown.

### V — CHAIN CONTROL

Initial target remains nearest legal corporeal target by distance then stable ID.

For each relay hop:

1. enumerate unvisited legal corporeal candidates inside current relay range;
2. compute each candidate's `forwardDegree`: number of other unvisited legal corporeal targets reachable from it using the next applicable normal/COMMON-bonus relay range;
3. highest `forwardDegree` wins;
4. tie: shortest current edge;
5. final tie: lower stable spawn ID.

Hard caps:

- max targets: `4`
- no branching/recursion/repeated target;
- max one COMMON bonus/cast;
- candidate population bounded by existing active-enemy cap `48`;
- bounded small `O(n²)` graph scan/cast.

## 11. Twenty-transition matrix

| Family | II | III | IV | V |
|---|---|---|---|---|
| DELTA | 720ms cadence | 9.5 world mask scale | 140ms previous-phase 4-dmg echo; 650ms rearm | 14 primary + 90ms normal stagger |
| VECTOR | 2-hit line 10/7 | +120px priority band | first post-SHIFT 3-hit line 10/7/5 | priority lock to 16 primary damage |
| ORBIT | 2 nodes / 180° | 80px radius / 30px contact | 60°/160ms shear; 650ms rearm | 3 nodes / 120°, 650ms shared hit interval |
| ECHO | 4 mines / 12s life | 76 trigger / 108 blast | 140ms return delay | depth-2 after guarded cycles: 84/120/20 |
| SIGNAL | 4 hops 10/8/6/5 | 10/9/8/7 | one COMMON +60px relay | degree-aware deterministic relays |

## 12. Performance and abuse caps

### DELTA

- canonical grid max `256` points;
- pending PHASE ECHO max `1`;
- PHASE ECHO rearm `650 ms`;
- max one primary hit/target/pulse plus one explicitly eligible echo hit/target/eligible SHIFT.

### VECTOR

- max in flight `2`;
- normal max hits/projectile `2`;
- transfer max hits/projectile `3`;
- transfer charge max `1`;
- no refraction/recursion in V2-3B.

### ORBIT

- max nodes `3`;
- shared normal target cooldown ledger;
- max one shear hit/target/eligible SHIFT;
- shear rearm `650 ms`.

### ECHO

- max mines `4`;
- depth max `2`;
- depth increment guard `900 ms`/mine;
- no recursive detonation/mine creation;
- ascending-ID overlapping resolution;
- deterministic oldest replacement.

### SIGNAL ARC

- max unique targets `4`;
- max one COMMON relay bonus/cast;
- no recursion/branching;
- active-enemy population cap `48`.

## 13. Required deterministic qualification

### Global

- exact I→II→III→IV→V transitions;
- no Rank-V successor;
- deterministic immutable profiles;
- no generic ghost targeting;
- SHIFT never resets ordinary cooldown;
- SHIFT-rider rearm guards work independently of any global SHIFT commitment interval;
- adversarial candidate ordering cannot bypass caps.

### DELTA

- Rank-II `720 ms` exact;
- Rank-III `9.5` placement exact;
- sparse/dense Friend masks have equal per-target authority;
- Rank-IV previous-phase geometry/authority exact;
- COMMON/new-phase corporeal targets excluded from echo;
- `650 ms` echo rearm and max-one-pending exact;
- Rank-V stagger/resistance hooks exact.

### VECTOR

- Rank-II line result input-order independent;
- secondary beyond primary and inside `20 px` corridor;
- Rank-III cannot choose >`120 px` beyond nearest legal distance;
- stable-ID full tie break;
- Rank-IV charge never stacks and no cooldown reset;
- Rank-V damage sequence exactly `10→12→14→16` and every reset condition proven.

### ORBIT

- exact 1/2/3-node spacing;
- shared target hit ledger;
- SHIFT reversal preserves angle;
- shear emitted only when `650 ms` rearm allows;
- one target cannot receive multi-node shear duplicates in one event.

### ECHO

- Rank-II cap/lifetime exact;
- Rank-III radii exact;
- Rank-IV delay exact and nonzero;
- depth increments only on genuine leave/return and respects `900 ms` guard;
- depth cap `2` and depth-2 profile exact;
- multi-mine resolution ascending ID with target-state re-evaluation;
- expiry/replacement never detonates.

### SIGNAL ARC

- Rank-II 4-hop cap/damage exact;
- Rank-III decay exact;
- Rank-IV COMMON bonus once/cast and never legalizes ghost;
- Rank-V ordering input-array invariant;
- degree/distance ties resolve by stable ID;
- no duplicate target/cast.

## 14. Required browser qualification

Both `960` and `390` widths must prove:

- every family can naturally reach at least one higher rank through the production draft adapter;
- each rank change is visible/observable rather than state-only;
- DELTA geometry readable at III–V;
- VECTOR transfer distinguishable from normal penetration;
- ORBIT 2/3-node spacing and reversal readable on 390;
- ECHO deep-memory state uses a restrained readable marker;
- SIGNAL four-hop graph remains legible;
- reduced motion preserves tactical information;
- no new controls;
- exact-three production draft remains green;
- V2-1 through V2-2E regression remains green.

## 15. Balance-review triggers

Reopen a value only if evidence shows:

- dominant standing-still play;
- SHIFT avoidance is preferable to phase engagement;
- SHIFT spam turns a rider into the dominant DPS source;
- one family becomes universally superior outside its role;
- target receives hits above documented cap;
- 390px readability fails;
- runtime object/work budgets exceed caps;
- current common enemies become trivial before V2-4 escalation;
- canonical Friend pixel density produces materially different raw DELTA authority.

Correct the violating mechanic/value only; do not globally rebalance unrelated families as compensation.

## 16. Implementation sequencing recommendation

1. **V2-3B1 — DELTA II–V**
2. **V2-3B2 — VECTOR II–V**
3. **V2-3B3 — ORBIT II–V**
4. **V2-3B4 — ECHO II–V**
5. **V2-3B5 — SIGNAL II–V**
6. **V2-3B6 — integrated rank/draft/browser qualification**

Each family receives pure deterministic tests before Phaser behavior is accepted.

The progression adapter may expose only mechanics that actually exist. A rank card may never promise an unimplemented runtime behavior.

## 17. Explicit boundaries after this gate

- `V2_3A = TECHNICALLY_QUALIFIED`
- `V2_3B_DESIGN_GATE = READY_FOR_OWNER_REVIEW`
- `V2_3B_CODE = NOT_STARTED`
- `V2_3C_PROTOCOL_RUNTIME = NOT_STARTED`
- `V2_3D_EVOLUTION = NOT_STARTED`
- `V2_4 = NOT_STARTED`

No implementation milestone advances until the owner approves this gate and explicitly authorizes the bounded V2-3B implementation tranche.