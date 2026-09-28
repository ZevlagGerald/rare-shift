# RARE//SHIFT V2-3B3 — ORBIT NODES RANK II–V CLOSEOUT REPORT

**Status:** PASS — V2-3B3 CLOSED  
**Date:** 2026-09-29  
**Branch:** `feature/v2-3b3-orbit-ranks-clean`  
**V2-3B2 documentation baseline:** `57bb00b7550319e0252b70059d6345738243daa4`  
**Exact qualified implementation/test HEAD:** `1459771c2f37bad1cf5666e9413a36774340c867`  
**Authoritative workflow:** `RARE SHIFT V2-3B3 ORBIT Qualification`  
**Authoritative workflow run:** `36470880435` — SUCCESS  
**Core-only qualification run:** `36469794873` — SUCCESS  
**Main merge:** NOT AUTHORIZED  
**Production deployment:** NOT AUTHORIZED

---

## 1. Scope and decision

V2-3B3 implemented and qualified **ORBIT NODES Rank II–V only**, preserving the previously qualified Rank-I reversal contract and the locked four-slot weapon architecture.

This tranche does not authorize or implement:

- ECHO MINE Rank II–V;
- SIGNAL ARC Rank II–V;
- V2-3B6 integrated rank/progression closeout;
- Protocol live passives;
- Evolutions / SYNC HALO;
- V2-4 enemies, pacing, elites or bosses;
- economy/token/RF changes;
- `main` merge;
- production deployment.

ORBIT remains close-defense/control. Its rank progression increases deterministic geometric coverage and phase-reversal interaction while using a shared target-hit ledger so node count cannot become unrestricted same-target DPS multiplication.

---

## 2. Locked PHASE SHEAR interpretation

The parent V2-3B gate specifies a `60°` shear arc per node but did not state whether that arc is centered on the preserved SHIFT anchor or begins there.

V2-3B3 locks the reviewed implementation interpretation:

> Each node begins PHASE SHEAR at its exact preserved SHIFT anchor and sweeps `60°` in the **new post-SHIFT rotation direction**.

Collision is evaluated against the directed circular arc at ORBIT radius with the locked shear contact radius. Candidate targets are filtered by post-SHIFT corporeal authority and de-duplicated by stable target ID across all nodes before damage is applied.

This makes shear a direct consequence of phase reversal rather than a generic radial burst.

---

## 3. Qualified rank profiles

### Rank I — inherited baseline

Preserved from V2-2B:

- damage: `8`
- radius: `72 px`
- angular speed: `2.4 rad/s`
- contact radius: `26 px`
- node count: `1`
- shared per-target contact interval: `700 ms`
- Phase A/B rotation directions are opposite;
- SHIFT preserves anchor angle and reverses direction;
- contact requires current corporeal authority.

### Rank II — SECOND NODE

Qualified profile:

- damage: `8`
- radius: `72 px`
- angular speed: `2.4 rad/s`
- contact radius: `26 px`
- node count: `2`
- exact spacing: `180°`
- shared per-target contact interval: `700 ms`.

The two nodes share one target ledger. A target hit by one node cannot immediately be damaged again merely because the other node also contacts it.

### Rank III — STABLE ORBIT

Qualified profile:

- damage: `8`
- radius: `80 px`
- angular speed: `2.55 rad/s`
- contact radius: `30 px`
- node count: `2`
- exact spacing: `180°`
- shared per-target contact interval: `700 ms`.

Anchor angle remains authoritative and is not reset by rank-up or SHIFT.

### Rank IV — PHASE SHEAR

Normal Rank-III orbit remains intact.

Shear profile:

- directed arc/node: `60°` (`π/3`)
- duration cue: `160 ms`
- shear contact radius: `30 px`
- shear damage: `6`
- maximum shear hits on one target per eligible SHIFT: `1` across all nodes
- independent shear rearm: `650 ms`
- knockback: none.

Authority and anti-spam rules:

- only an accepted SHIFT can emit shear;
- target must be corporeal in the **post-SHIFT phase**;
- the preserved pre-reversal anchor is the sweep origin;
- sweep follows the new post-SHIFT rotation direction;
- normal ORBIT target cooldowns are not reset;
- shear is a discrete event, never a per-frame damage source;
- a SHIFT during the independent `650 ms` rearm still reverses ORBIT but emits no new shear;
- rank-up to IV does not credit a historical SHIFT and emits no shear by itself.

### Rank V — SYNCHRONIZED RING

Qualified profile:

- damage: `8`
- radius: `80 px`
- angular speed: `2.55 rad/s`
- contact radius: `30 px`
- node count: `3`
- exact spacing: `120°`
- shared per-target normal contact interval: `650 ms`
- Rank-IV shear profile and `650 ms` shear rearm remain unchanged.

Rank IV → V does not reset shear rearm or the normal target ledger.

---

## 4. Deterministic core implementation

`games/rare-shift/src/orbit-core.ts` now owns deterministic Rank II–V behavior rather than leaving higher-rank geometry in Phaser.

Qualified core surfaces include:

- `buildOrbitProfile(rank)`;
- exact equal node-angle generation;
- exact multi-node world positions from one anchor;
- shared normal contact legality;
- exact shear rearm check;
- directed-angle math for post-SHIFT sweep geometry;
- directed circular-arc distance qualification;
- stable, de-duplicated post-SHIFT shear target planning.

`ORBIT_RANK_I` remains structurally unchanged for inherited compatibility.

---

## 5. Live progression bridge

The normalized V2-3A progression engine already supports ORBIT Rank I→V generically. V2-3B3 therefore did not alter that normalized model.

The bounded live adapter adds:

- `ORBIT_RANK`;
- `orbitRankEnabled`;
- `orbitRank`;
- Rank I→V monotonic application;
- no extra weapon-slot consumption on rank-up;
- no Rank-V successor;
- adapter parity with normalized `WEAPON_RANK:ORBIT:n->n+1` semantics.

The bridge remains opt-in at the draft-core level so inherited V2-2 behavior does not gain rank choices unless the active V2-3B runtime enables them.

---

## 6. Rank-up migration law

The implementation follows the V2-3B v1.1 hardening contract:

- anchor angle is preserved exactly;
- node count/spacing is reconciled immediately around that anchor while combat is paused;
- the shared normal target ledger is preserved;
- the rank card itself deals no collision damage;
- Rank III → IV emits no PHASE SHEAR;
- no historical SHIFT is credited;
- Rank IV → V preserves the existing shear rearm timestamp;
- paused draft time does not manufacture combat events.

The qualified implementation does not create a separate ORBIT combat subsystem. The existing runtime ORBIT path was upgraded to consume the rank-aware deterministic profile.

---

## 7. Phaser runtime behavior

The live runtime now maintains explicit deterministic ORBIT state:

- `orbitRank`;
- one authoritative `orbitAngle` anchor;
- one shared `orbitLastHitAt` target ledger;
- `orbitShearLastEmittedAt`;
- shear event/hit/rearm-block evidence counters;
- qualification fixture label.

Rendering uses the existing ORBIT Graphics surface to draw the complete equal-spaced ring. Node geometry is derived from the deterministic core; sprite/object insertion order is not combat authority.

On SHIFT:

1. current ORBIT anchor is captured;
2. normal phase transition occurs;
3. rotation direction changes with the new phase;
4. ORBIT geometry is redrawn around the same anchor;
5. Rank IV+ attempts one bounded PHASE SHEAR using the captured anchor and new-phase direction/authority;
6. the independent shear rearm decides whether the event is emitted.

---

## 8. Deterministic qualification

The dedicated V2-3B3 deterministic suite proves:

- exact Rank I–V numerical profiles;
- invalid Rank 0 / Rank VI rejection;
- exact node-count progression `1 / 2 / 2 / 2 / 3`;
- exact Rank-II `180°` spacing;
- exact Rank-V `120°` spacing;
- Rank III/V `80 px` geometry;
- Rank III/V `2.55 rad/s` cadence;
- one preserved anchor drives all node positions;
- shared normal ledger prevents multi-node same-target multiplication;
- exact normal-hit boundaries at `700 ms` and Rank-V `650 ms`;
- directed PHASE SHEAR uses the post-SHIFT direction;
- off-phase aligned enemies are excluded;
- COMMON remains legal in either phase;
- one target is de-duplicated across all shear arcs;
- candidate input order cannot alter the shear result;
- exact shear rearm boundary: `649 ms` blocked / `650 ms` ready;
- ORBIT live adapter is opt-in and monotonic;
- Rank V has no successor;
- live ORBIT rank application matches normalized V2-3 progression semantics.

Core-only workflow run `36469794873` completed successfully before Phaser acceptance.

---

## 9. Browser qualification

The full authoritative workflow ran both `960` and `390` browser widths and completed the entire B3 browser step successfully.

### Natural production proof

The browser proof uses ordinary production progression only:

- real Level-2 exact-three discovery draft;
- real pointer/touch selection of ORBIT NODES;
- natural progression through legal acquisition choices;
- four weapon slots filled through legal production cards;
- a later rendered legal `ORBIT_RANK` card selected by the normal draft UI;
- ORBIT naturally advances I → II;
- selecting Rank II manufactures no PHASE SHEAR event;
- two-node visual geometry is present;
- node spacing is verified at approximately `π` radians;
- real normal ORBIT contact damage is observed after rank-up;
- no qualification fixture is present in the natural route.

The natural proof does not inject HP, XP, damage, pickups, rank, invulnerability, enemy weakening or alternate production rules.

### Controlled Rank-IV proof

A qualification-only fixture creates a legal Rank-IV ORBIT state without changing production mechanics.

The browser proof requires:

- no historical shear at mount;
- exactly two ORBIT nodes;
- shear initially ready;
- real accepted SHIFT;
- phase and direction reversal;
- preserved anchor;
- exactly one shear event on an eligible SHIFT;
- charge/rearm becomes unavailable immediately afterward;
- a second SHIFT inside the `650 ms` window reverses ORBIT normally but emits no second shear;
- a real post-SHIFT shear hit occurs against a corporeal target;
- player remains alive.

### Controlled Rank-V proof

The Rank-V fixture proves:

- exactly three visible nodes;
- exact approximately `120°` spacing;
- no historical shear is fabricated by fixture/rank entry;
- a real SHIFT reverses ORBIT and retains the Rank-IV PHASE SHEAR mechanic;
- reduced-motion mode retains the same tactical evidence at 390 width.

### Reduced motion

The B3 browser script runs the 390-wide qualification with reduced motion enabled and completes successfully. Tactical node count, spacing, reversal and shear semantics do not depend on long trails/flashes.

---

## 10. Full inherited regression

The exact B3 implementation/test HEAD passed the full required stack on workflow run `36470880435`:

- qualification script syntax;
- inherited deterministic core;
- inherited V2 combat contracts;
- V2-2E cross-weapon deterministic matrix;
- draft pointer regression;
- V2-3A progression;
- V2-3B1 DELTA deterministic contracts;
- V2-3B2 VECTOR deterministic contracts;
- V2-3B3 ORBIT deterministic contracts;
- V2 ART regression/browser proof;
- core + game TypeScript;
- FriendSDK check/build/smoke;
- V2-1 browser proof;
- VECTOR Rank-I browser proof;
- ORBIT Rank-I browser proof;
- ECHO Rank-I browser proof;
- SIGNAL ARC Rank-I browser proof;
- V2-2E integrated four-slot browser proof;
- V2-3B1 DELTA browser regression;
- V2-3B2 VECTOR browser regression;
- V2-3B3 natural + controlled ORBIT browser proof;
- evidence upload.

All steps completed with conclusion `success` on the same exact implementation/test HEAD.

---

## 11. Evidence artifact

Authoritative workflow evidence:

- run: `36470880435`
- artifact: `rare-shift-v2-3b3-evidence-36470880435`
- artifact ID: `10991642959`
- size: `1,968,922 bytes`
- digest: `sha256:a35d02614eb6dd58a352fb3dd5e6941d07f7f83fc440c26458843381d3531d62`
- created: `2026-09-28T19:28:02Z`
- expires: `2026-10-12T19:28:01Z`
- expired at closeout: `false`
- artifact workflow head: `1459771c2f37bad1cf5666e9413a36774340c867`.

---

## 12. Bounded diff audit

Compared with the V2-3B2 documentation baseline `57bb00b7550319e0252b70059d6345738243daa4`, the exact qualified B3 implementation/test HEAD is:

- `ahead_by = 3`
- `behind_by = 0`.

The implementation diff contains exactly the expected B3 surfaces:

1. `.github/workflows/v2-3b3-orbit-core-qualification.yml`
2. `.github/workflows/v2-3b3-orbit-qualification.yml`
3. `games/rare-shift/src/draft-core.ts`
4. `games/rare-shift/src/orbit-core.ts`
5. `games/rare-shift/src/phaser-survival.ts`
6. `games/rare-shift/tests/v2-3b3-orbit-ranks.test.ts`
7. `package.json`
8. `scripts/v2-3b3-orbit-browser.mjs`
9. `tsconfig.core.json`

No inherited browser harness was changed in V2-3B3. No ECHO/SIGNAL higher-rank implementation, Protocol, economy, deployment or infrastructure files are in the diff.

---

## 13. Deferred / outside B3

The following remain outside this qualified tranche:

- ECHO MINE Rank II–V implementation — V2-3B4;
- SIGNAL ARC Rank II–V implementation — V2-3B5;
- integrated all-family rank/draft/browser closeout — V2-3B6;
- Protocol runtime — V2-3C;
- Evolution — V2-3D;
- final natural pacing/balance, elites and bosses — V2-4;
- economy/RF/token work;
- `main` integration;
- production deployment.

B3 qualification does not claim final V2-4 combat balance. It establishes bounded mechanical correctness, phase-materiality, deterministic caps, migration safety and browser readability for ORBIT II–V.

---

## 14. Final decision

`V2_3B3_ORBIT_DESIGN = LOCKED`

`V2_3B3_SHEAR_DIRECTION = LOCKED_POST_SHIFT_DIRECTION`

`V2_3B3_DETERMINISTIC_CONTRACTS = PASS`

`V2_3B3_LIVE_RANK_ADAPTER = PASS`

`V2_3B3_SHARED_NORMAL_HIT_LEDGER = PASS`

`V2_3B3_NATURAL_ORBIT_I_TO_II_960_390 = PASS`

`V2_3B3_RANK_II_SPACING_960_390 = PASS`

`V2_3B3_RANK_IV_CONTROLLED_SHEAR_960_390 = PASS`

`V2_3B3_RANK_IV_REARM_960_390 = PASS`

`V2_3B3_RANK_V_RING_960_390 = PASS`

`V2_3B3_REDUCED_MOTION = PASS`

`V2_3B3_INHERITED_REGRESSION = PASS`

`V2_3B3_OVERALL_DECISION = PASS`

`V2_3B3 = CLOSED`

`V2_3B4_ECHO_RANKS = NOT_STARTED`

`MAIN_MERGE = NOT_AUTHORIZED`

`DEPLOYMENT = NOT_AUTHORIZED`

---

## 15. Next bounded milestone

The next milestone is **V2-3B4 — ECHO MINE Rank II–V**.

The next authorized action after this closeout is **planning/review only** unless the Owner explicitly authorizes B4 implementation.

B4 planning must begin from the locked v1 + v1.1 ECHO contract, review the current Rank-I mine state machine and existing live mine objects, and resolve Rank-II/III/IV/V migration, Rank-V `memoryDepth`, `900 ms` increment guard, stable-ID overlap resolution and the global Rank-V two-hit-per-target/`250 ms` burst ledger before implementation begins.
