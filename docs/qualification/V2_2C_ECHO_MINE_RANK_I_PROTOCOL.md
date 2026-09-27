# RARE//SHIFT V2-2C — ECHO MINE RANK I QUALIFICATION PROTOCOL

**Status:** ACTIVE — OWNER AUTHORIZED BOUNDED V2-2C TRANCHE  
**Date:** 2026-09-27  
**Source baseline:** `f021afb478e6ae4db3e9a481e1bc0180e8da85a7`  
**Source qualification:** V2-2B ORBIT NODES Rank I = PASS  
**Branch:** `feature/v2-2c-echo-mine-rank1`  
**Main merge:** NOT AUTHORIZED  
**Production deployment:** NOT AUTHORIZED

## 1. Purpose

V2-2C adds only the Rank-I base behavior for ECHO MINE.

The weapon must answer a different player question from DELTA, VECTOR, and ORBIT:

> **Where will I want damage waiting when I return to this reality?**

The weapon is unacceptable if it behaves like an ordinary proximity mine that is equally effective without SHIFT.

## 2. Locked identity

ECHO MINE is a **delayed route-control / phase-memory** weapon.

Rank I must prove all of the following:

- mines are left along the player's movement path;
- every mine records its creation phase;
- a new mine is initially dormant in its home phase;
- leaving that phase arms the memory;
- merely staying in the home phase cannot trigger the mine;
- while away from its recorded phase the mine cannot trigger;
- returning to the recorded phase opens the trigger window only after a short readable delay;
- only a currently CORPOREAL enemy may trigger it;
- the explosion damages only currently CORPOREAL enemies;
- mines are finite, capped and deterministically replaced/expired;
- mine explosions cannot create mines or recursively trigger other mines.

## 3. Rank-I provisional profile

The following values are qualification values for V2-2C only:

- placement interval: `1800 ms`;
- maximum active mines: `3`;
- minimum placement separation: `56 world px`;
- lifetime: `9000 ms` from placement;
- return activation delay: `250 ms`;
- trigger radius: `68 world px`;
- blast radius: `84 world px`;
- blast damage: `16`;
- node count / chained detonations: `0`;
- recursive creation: `0`.

These values are not final seven-minute balance.

## 4. Deterministic mine state machine

Every active mine stores:

- stable mine ID;
- world position;
- creation timestamp;
- recorded phase (`A` or `B`);
- memory state;
- most recent return timestamp when applicable.

Allowed Rank-I states:

### `DORMANT_HOME`

Initial state after placement.

- current phase equals the recorded phase;
- the mine is visible but cannot trigger;
- remaining indefinitely in the same phase must never arm it.

### `ARMED_AWAY`

Entered only after the player SHIFTs away from the recorded phase.

- the mine remains active and retains its recorded phase;
- it cannot trigger while the player is away;
- enemy proximity while away does not detonate it;
- a COMMON enemy does not bypass this rule.

### `RETURN_READY`

Entered when an `ARMED_AWAY` mine sees the player return to its recorded phase.

- `returnedAtMs` is recorded;
- the mine remains non-triggerable for `250 ms`;
- after the delay, a valid corporeal enemy in trigger radius may trigger it;
- if the player leaves again before detonation, the mine returns to `ARMED_AWAY`;
- a later return records a new return timestamp and requires the delay again.

No other Rank-I state is allowed.

## 5. SHIFT transition law

SHIFT does not itself deal ECHO damage.

For every active mine:

1. `DORMANT_HOME` + shift away from recorded phase -> `ARMED_AWAY`;
2. `ARMED_AWAY` + shift back to recorded phase -> `RETURN_READY` and record `returnedAtMs`;
3. `RETURN_READY` + shift away before detonation -> `ARMED_AWAY`;
4. any state + unrelated same-phase update -> no synthetic state transition.

This transition is deterministic and independent of frame rate.

## 6. Trigger authority

A Rank-I mine may trigger only when all are true:

- state is `RETURN_READY`;
- current phase equals the mine's recorded phase;
- at least `250 ms` have elapsed since the latest return;
- at least one active enemy is currently CORPOREAL;
- that enemy is within `68 px` of the mine.

Trigger order must not depend on mutable pool order.

The trigger is a single event. The mine is removed immediately before damage resolution so the same mine cannot detonate twice.

## 7. Blast authority

On trigger:

- deal `16` damage once to each active CORPOREAL enemy within `84 px`;
- off-phase ghosts take zero Rank-I ECHO damage;
- each enemy can be hit at most once by that detonation;
- target processing is stable by enemy spawn ID for deterministic evidence;
- killed enemies use the ordinary death/pickup path;
- the blast may not trigger another mine;
- the blast may not place another mine;
- no chain depth exists at Rank I.

`MEMORY COLLAPSE` chain behavior remains V2-3/EVO work and is explicitly out of scope.

## 8. COMMON enemy rule

COMMON (`TRACE`) remains corporeal in both phases, but it does not bypass the memory cycle.

Therefore:

- COMMON cannot trigger a `DORMANT_HOME` mine;
- COMMON cannot trigger an `ARMED_AWAY` mine while the player is away;
- COMMON may trigger a `RETURN_READY` mine only after the player genuinely left and returned and the return delay elapsed.

This preserves phase memory while still allowing COMMON to serve as stable pressure.

## 9. Placement and anti-stacking law

ECHO drops a mine periodically at the player's current path point.

A placement attempt is legal only when the candidate point is at least `56 px` from every retained active mine.

If fewer than three mines are active:

- place the new mine if separation is legal.

If three mines are active:

1. identify the deterministic oldest mine by smallest stable mine ID;
2. evaluate separation against the two mines that would remain after replacement;
3. if legal, remove the oldest mine silently and place the new mine;
4. if illegal, skip placement and keep the existing three.

Replacement never explodes a mine.

This prevents standing-still mine stacking and makes movement/pathing materially valuable.

## 10. Expiry law

A mine expires when its age reaches `9000 ms`.

Expiry:

- is deterministic;
- removes the mine silently;
- does not deal damage;
- does not trigger nearby mines;
- does not create a pickup;
- frees one active-mine slot.

When replacement and expiry are possible in the same update, expiry is resolved first.

## 11. Draft integration

The active weapon cap remains four including mandatory DELTA BURST.

V2-2C adds:

`ECHO_MINE`

Acquisition is legal only when:

- ECHO is enabled for the current progression step;
- ECHO is not already owned;
- an active weapon slot remains.

Duplicate acquisition is rejected.

No ECHO Rank II card exists in V2-2C.

### Bounded discovery staging

To avoid invalidating already-qualified level-2 discovery behavior:

- V2-2A/V2-2B first level-up behavior remains unchanged;
- ECHO becomes enabled for discovery from **level 3** onward;
- at the first legal level-3+ draft while ECHO is unowned, ECHO is deterministically included among the three actionable choices;
- the other two choices remain deterministic and legal.

This level-3 staging is a **V2-2C qualification/onboarding rule**, not final V2-3 draft weighting.

## 12. Runtime requirements

The Phaser runtime must use a bounded pool of exactly three mine views.

Runtime must expose enough state for browser qualification without test-only mutation hooks:

- `echo-owned`;
- `echo-active-mines`;
- `echo-placements`;
- `echo-armed-transitions`;
- `echo-returns`;
- `echo-triggers`;
- `echo-hits`;
- `echo-replacements`;
- `echo-expiries`;
- `echo-profile`;
- a compact deterministic mine-state summary.

The browser may observe these values only. It may not inject mines, enemies, damage or phase state.

## 13. Visual/readability contract

Rank-I mine presentation must be visibly distinct from:

- DELTA canonical mask geometry;
- VECTOR needle/reticle;
- ORBIT moving node.

Minimum readable states:

- `DORMANT_HOME`: phase-colored marker, subdued;
- `ARMED_AWAY`: ghosted memory marker;
- `RETURN_READY`: brighter marker/ring after return;
- detonation: brief bounded phase-colored pulse.

Reduced-motion mode must remain usable and must not depend on scaling/tween animation to communicate state.

No large screen flash is required for mine detonation.

## 14. Deterministic tests required

Pure/core tests must prove:

1. exact Rank-I profile;
2. dormant mine cannot trigger without leaving phase;
3. leaving recorded phase arms the mine;
4. staying away cannot trigger it;
5. returning enters `RETURN_READY`;
6. return delay is enforced;
7. leaving again resets it to `ARMED_AWAY` without disarming memory;
8. COMMON cannot bypass leave/return;
9. matching SPLIT may trigger only when corporeal;
10. off-phase SPLIT is excluded from trigger/blast;
11. blast target set is stable by spawn ID;
12. max active count is three;
13. oldest replacement is deterministic;
14. illegal close placement does not replace retained mines;
15. expiry is deterministic and silent;
16. ECHO acquisition consumes one slot;
17. duplicate/full-slot/disabled acquisition is rejected;
18. level-2 discovery remains compatible with V2-2A/V2-2B;
19. level-3 discovery includes ECHO.

## 15. Browser qualification required

Both 960 and 390 routes must prove through the shipped FriendSDK/Phaser runtime:

1. enter Signal Descent;
2. preserve the real level-2 three-card discovery behavior;
3. naturally reach level 3;
4. observe exactly three actionable choices with `ECHO_MINE` present;
5. acquire ECHO through the rendered draft UI;
6. combat resumes;
7. at least one mine is placed while moving;
8. no more than three mines are active;
9. SHIFT away arms at least one mine;
10. the mine remains active while away;
11. SHIFT back records a return;
12. no synthetic SHIFT detonation occurs;
13. after the return window, at least one real mine trigger occurs against a corporeal enemy;
14. at least one ECHO hit occurs;
15. DELTA remains `canonical-exclusive`;
16. player remains alive;
17. inherited V2-1, VECTOR and ORBIT browser regressions remain green.

## 16. CI gate

V2-2C qualification must include:

- qualification-script syntax;
- inherited deterministic core tests;
- expanded V2 combat contracts;
- ART-00 regression;
- core/game TypeScript;
- FriendSDK v0.1.2 archive verification;
- FriendSDK check/build/smoke;
- V2-1 browser regression 960/390;
- V2-2A VECTOR browser regression 960/390;
- V2-2B ORBIT browser regression 960/390;
- dedicated V2-2C ECHO browser proof 960/390;
- evidence artifact upload.

## 17. Explicit non-goals

V2-2C does not authorize:

- ECHO Rank II-V;
- MEMORY COLLAPSE;
- mine linking;
- chain detonation;
- recursive mine creation;
- SIGNAL ARC;
- protocols;
- EVO;
- new enemies or bosses;
- seven-minute final balance;
- final draft weighting;
- final SHIFT commitment timing;
- RF/economy work;
- merge to `main`;
- production deployment.

## 18. Gate state

`V2_2B_OVERALL_DECISION = PASS`

`V2_2C_PROTOCOL = LOCKED`

`V2_2C_IMPLEMENTATION = AUTHORIZED_BOUNDED_RANK_I_ONLY`

`V2_2C_ECHO_CORE = NOT_YET_PROVEN`

`V2_2C_RUNTIME = NOT_YET_PROVEN`

`V2_2C_BROWSER_960 = NOT_YET_PROVEN`

`V2_2C_BROWSER_390 = NOT_YET_PROVEN`

`V2_2C_OVERALL_DECISION = OPEN`

`MAIN_MERGE = NOT_AUTHORIZED`

`PRODUCTION_DEPLOY = NOT_AUTHORIZED`
