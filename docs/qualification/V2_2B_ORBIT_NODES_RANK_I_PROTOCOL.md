# RARE//SHIFT V2-2B — ORBIT NODES RANK I QUALIFICATION PROTOCOL

**Status:** ACTIVE — OWNER AUTHORIZED BOUNDED IMPLEMENTATION  
**Date:** 2026-09-27  
**Source branch:** `feature/v2-2a-vector-needle-rank1`  
**Source HEAD:** `1b49b2eb758597130bc156d9f357273ee7e32be0`  
**Target branch:** `feature/v2-2b-orbit-nodes-rank1`  
**Implementation scope:** ORBIT NODES Rank I only  
**Main merge:** NOT AUTHORIZED  
**Production deployment:** NOT AUTHORIZED

## 1. Review verdict

V2-2A is technically qualified and may serve as the exact implementation baseline for V2-2B.

The V2-2 mechanics gate assigns ORBIT NODES a distinct role:

- close defense / crowd control;
- one deterministic orbiting node at Rank I;
- only CORPOREAL enemies receive normal contact damage;
- Phase A and Phase B rotate in opposite directions;
- SHIFT visibly reverses the defensive sweep;
- repeated hits must be bounded;
- reversal may not grant invulnerability or unlimited damage.

No conflict was found with the already-qualified DELTA BURST or VECTOR NEEDLE roles.

## 2. Rank-I mechanical lock

V2-2B shall implement exactly one ORBIT node.

Locked Rank-I qualification profile:

- node count: `1`;
- orbit radius: `72 world px`;
- angular speed: `2.40 rad/s`;
- contact damage: `8`;
- node/enemy contact radius: `26 world px`;
- per-target contact interval: `700 ms`;
- Phase A direction: `+1`;
- Phase B direction: `-1`.

These values are qualification values for V2-2B. They do not lock final seven-minute balance or Rank II-V scaling.

## 3. SHIFT reversal law

SHIFT shall reverse ORBIT by changing angular velocity sign only.

Hard requirements:

1. the current angular position is preserved through SHIFT;
2. the node is not reset to angle zero;
3. the node is not teleported to the opposite side of the Friend;
4. SHIFT itself causes no ORBIT damage pulse;
5. existing per-target contact cooldowns survive SHIFT;
6. no invulnerability, shield, knockback or free damage is granted by Rank-I reversal.

This is required to make reversal a readable directional decision rather than an exploit or cosmetic animation.

## 4. Contact authority

An ORBIT contact is legal only when all are true:

- ORBIT is owned;
- enemy is active;
- enemy is CORPOREAL under the current phase;
- enemy is within the locked node contact radius;
- the same enemy has not been damaged by ORBIT during the previous `700 ms`.

Off-phase ghosts remain visible/moving but cannot receive normal Rank-I ORBIT contact damage.

COMMON threats remain valid in both phases because they are CORPOREAL in both.

## 5. Bounded repeated-hit state

Per-target hit timing shall use stable enemy spawn IDs.

The runtime may retain one last-hit timestamp per currently relevant enemy ID, but this state must remain bounded:

- remove the entry when that enemy dies;
- do not key by pooled object index;
- do not clear the map on SHIFT;
- do not create recursive events or unbounded contact history.

The qualification suite must prove that reversal cannot immediately bypass the same target's contact interval.

## 6. Deterministic orbit contract

Pure gameplay helpers shall qualify:

- exact Rank-I profile;
- Phase A/B direction signs are opposite;
- angle normalization is deterministic;
- equal elapsed time in A followed by equal elapsed time in B returns to the starting angle within floating-point tolerance;
- node world position is a pure function of origin + radius + angle;
- contact legality follows phase authority and cooldown state.

No random angular jitter, proc chance, crit chance or random node placement is authorized.

## 7. Draft integration

V2-2B extends the active-weapon draft with one acquisition ID:

`ORBIT_NODES`

Qualification rules:

- ORBIT appears only when enabled, unowned and an active weapon slot is available;
- acquisition starts at Rank I;
- acquisition consumes exactly one active weapon slot;
- duplicate acquisition is illegal;
- no ORBIT Rank II card exists in V2-2B;
- normal discovery draft remains exactly three distinct actionable cards when the qualification state has at least three legal candidates.

For this bounded tranche, when both ORBIT and VECTOR are unowned and legal, ORBIT may receive discovery priority so the browser qualification can reach the new mechanic deterministically. VECTOR must remain present/actionable when legal so the inherited V2-2A browser route remains valid.

This is a bounded discovery rule, not final V2-3 weighting.

## 8. Visual/readability contract

Rank-I ORBIT must remain visually distinct from DELTA and VECTOR.

Required presentation:

- one small node clearly separated from the Friend silhouette;
- visible circular movement around the Friend;
- asymmetric/tangent-facing node shape so direction reversal is readable;
- phase-color treatment may reinforce direction but cannot be the only cue;
- no canonical Friend-mask geometry reuse;
- no large opaque ring that hides enemies;
- reduced-motion mode must retain gameplay-critical node motion while avoiding unnecessary flourish.

## 9. Runtime instrumentation

The browser qualification surface shall expose deterministic evidence for at least:

- `orbit-owned`;
- `orbit-profile`;
- `orbit-angle`;
- `orbit-direction`;
- `orbit-hits`;
- `orbit-reversals`;
- `orbit-last-shift-anchor`;
- active weapon slot count.

Instrumentation is evidence-only and may not alter combat outcomes.

## 10. Required browser proof

Dedicated V2-2B proof must pass at both `960` and `390` viewport classes.

The real runtime route shall prove:

1. enter Signal Descent;
2. naturally reach a level-up draft;
3. exactly three distinct actionable discovery choices;
4. `ORBIT_NODES` is present;
5. select ORBIT through the rendered-card pointer path;
6. combat resumes and ORBIT becomes owned;
7. the orbit angle changes over time;
8. at least one legal ORBIT hit occurs during real combat;
9. SHIFT changes phase;
10. ORBIT direction sign reverses;
11. reversal counter increments;
12. the recorded SHIFT anchor remains near the pre-SHIFT angle, proving no reset/teleport;
13. player remains alive;
14. existing DELTA identity marker remains `canonical-exclusive`.

## 11. Regression gates

V2-2B qualification must retain:

- inherited deterministic core tests;
- V2 combat contracts including VECTOR;
- V2 ART-00 deterministic + browser proof;
- TypeScript core/game checks;
- FriendSDK check/build/smoke;
- V2-1 browser proof at 960 and 390;
- V2-2A VECTOR browser proof at 960 and 390;
- new V2-2B ORBIT browser proof at 960 and 390.

Any regression blocks V2-2B qualification.

## 12. Explicit non-goals

V2-2B does not authorize:

- ORBIT Rank II-V;
- SYNC HALO;
- knockback pulses;
- multiple orbit nodes;
- SHIFT shear damage;
- VECTOR Rank II-V / PRISM LANCE;
- ECHO MINE;
- SIGNAL ARC;
- protocols or EVO;
- new enemies, elites or bosses;
- seven-minute final balance;
- SHIFT commitment-window lock;
- RF/economy changes;
- merge to `main`;
- deployment.

## 13. Qualification decision rule

V2-2B may be recorded as `PASS` only when all automated gates and both dedicated browser viewport routes pass on one exact gameplay commit.

A documentation-only qualification report may follow that exact gameplay commit, but it must identify the exact qualified gameplay HEAD separately.

Current state:

`V2_2A_OVERALL_DECISION = PASS`

`V2_2B_PROTOCOL = LOCKED`

`V2_2B_IMPLEMENTATION = AUTHORIZED_BOUNDED`

`V2_2B_OVERALL_DECISION = OPEN`

`MAIN_MERGE = NOT_AUTHORIZED`

`PRODUCTION_DEPLOY = NOT_AUTHORIZED`
