# RARE//SHIFT V2-3B4 — ECHO MINE RANK II–V CLOSEOUT REPORT

**Status:** PASS — V2-3B4 CLOSED  
**Date:** 2026-09-29  
**Branch:** `feature/v2-3b4-echo-ranks-clean`  
**V2-3B3 documentation baseline:** `77b7585824ba5707879e21cfe625ec031211274a`  
**Exact qualified implementation/test HEAD:** `f19e866795a188d36a472c4cdbc660c7868a5028`  
**Authoritative workflow:** `RARE SHIFT V2-3B4 ECHO Qualification`  
**Authoritative workflow run:** `36517825242` — SUCCESS  
**Main merge:** NOT AUTHORIZED  
**Production deployment:** NOT AUTHORIZED

---

## 1. Scope and decision

V2-3B4 implemented and qualified **ECHO MINE Rank II–V only**, preserving the previously qualified Rank-I phase-memory contract and the locked four-slot weapon architecture.

The tranche is **PASS / CLOSED** with one explicit evidence dependency carried to V2-4:

- the Rank-V `2 damaging ECHO hits / target / rolling 250 ms` burst ledger is fully proven in deterministic tests;
- direct browser observation of a third ECHO hit being suppressed against one still-living target is deferred to `V2_4_HIGH_HP_THREAT` because all currently implemented production enemies die before that sequence can honestly occur.

No test-only HP inflation, fake high-HP enemy, reduced ECHO damage, hidden invulnerability, injected XP, injected mine, or weakened production rule was introduced to manufacture that browser case.

This tranche does not authorize or implement:

- SIGNAL ARC Rank II–V;
- V2-3B6 integrated rank/progression closeout;
- Protocol runtime passives;
- Evolutions / MEMORY COLLAPSE;
- V2-4 enemies, pacing, elites or bosses;
- economy/token/RF changes;
- `main` merge;
- production deployment.

---

## 2. Qualified ECHO rank profile

### Rank I — inherited baseline

- placement interval: `1800 ms`;
- max active: `3`;
- minimum separation: `56 px`;
- lifetime: `9000 ms`;
- return delay: `250 ms`;
- trigger radius: `68 px`;
- blast radius: `84 px`;
- damage: `16`.

Rank-I public profile compatibility and the existing `DORMANT_HOME -> ARMED_AWAY -> RETURN_READY` memory contract remain preserved.

### Rank II — LONG MEMORY

- max active: `4`;
- lifetime: `12000 ms`;
- placement interval/min separation/return delay/trigger/blast/damage remain the locked values.

The live runtime begins with the inherited three-view Rank-I pool and appends a hidden fourth mine view only when Rank II+ capacity becomes legal. Rank-up does not manufacture a mine or reset placement timing.

### Rank III — WIDER COLLAPSE

- max active: `4`;
- lifetime: `12000 ms`;
- trigger radius: `76 px`;
- blast radius: `108 px`;
- damage: `16`;
- placement/min separation remain unchanged.

Mine blast remains a terminal discrete event; it cannot recursively place, arm or trigger another mine.

### Rank IV — FAST RECALL

- return delay: `140 ms`;
- Rank-III geometry remains unchanged;
- implementation retains the locked `100 ms` hard floor for future modifier work.

### Rank V — DEEP MEMORY

Persistent mine state adds:

- `memoryDepth`, bounded `0..2`;
- `lastDepthIncrementAtMs`.

Rules qualified:

- depth increases only on a genuine `ARMED_AWAY -> RETURN_READY` transition while Rank V exists;
- no historical pre-Rank-V leave/return cycle is credited;
- minimum accepted increment separation is exactly `900 ms`;
- `899 ms` does not increment;
- `900 ms` does increment;
- staying in one phase never increments depth;
- faster oscillation may transition normal phase-memory state but adds no depth;
- depth caps at `2`;
- depth persists until trigger, expiry or deterministic replacement.

Depth `0..1` uses the Rank-IV numeric profile.

Depth `2`:

- trigger radius: `84 px`;
- blast radius: `120 px`;
- damage: `20`;
- return delay: `140 ms`;
- max active: `4`.

---

## 3. Live-object rank migration

Existing mines use the currently owned ECHO numeric profile after a rank transition while historical state is preserved.

Qualified migration rules:

- stable mine ID preserved;
- world coordinates preserved;
- original `createdAtMs` preserved;
- recorded phase preserved;
- current DORMANT/ARMED/RETURN_READY state preserved;
- lifetime remains measured from original creation time;
- Rank-II/III/IV numeric changes apply after resume;
- acquiring Rank V initializes each still-active mine to `memoryDepth = 0` and neutral depth timing;
- rank application emits no mine, blast, trigger or historical cycle credit;
- a newly shorter return delay can only result in a later normal trigger after combat resumes.

---

## 4. Rank-V same-target burst ledger

Locked safety profile:

- rolling window: `250 ms`;
- maximum damaging ECHO events on one target inside the window: `2`;
- ledger is target-local across all ECHO mines;
- only successful ECHO damage events are recorded;
- timestamps with age `< 250 ms` count;
- a timestamp exactly `250 ms` old has left the window;
- blocked damage is never queued;
- a capped target does not prevent the same blast from damaging other legal targets;
- mine/candidate input ordering cannot change the deterministic result;
- pre-Rank-V ECHO is not suppressed by the Rank-V ledger.

The deterministic B4 suite directly qualified all of these requirements.

### Browser evidence dependency

Current production normal-enemy HP remains:

- TRACE: `20 HP`;
- SPLIT_A/B: `16 HP`.

Rank-V depth-2 ECHO damage is `20`.

Therefore no current legitimate production target can remain alive for the required direct browser sequence of two damaging ECHO hits followed by a third attempted hit inside the same 250 ms window.

The B4 browser explicitly records:

- `RARE_SHIFT_V2_3B4_ECHO_BURST_CAP_DIRECT_960=DEFERRED_V2_4_HIGH_HP_THREAT`
- `RARE_SHIFT_V2_3B4_ECHO_BURST_CAP_DIRECT_390=DEFERRED_V2_4_HIGH_HP_THREAT`

This is an evidence dependency, not an unimplemented mechanic. Direct runtime/browser suppression evidence must be obtained once V2-4 introduces a legitimate higher-HP threat capable of surviving the sequence.

---

## 5. Natural browser qualification

Both `960` and `390` qualified through the shipped FriendSDK/Phaser production route without rank/HP/XP/enemy injection.

Natural path proved:

1. preserved Level-2 ORBIT/VECTOR/DELTA onboarding;
2. natural ECHO acquisition at Level 3;
3. natural SIGNAL acquisition at Level 4, filling all four active slots;
4. natural Level-5 `ECHO_RANK` card through the rendered production draft;
5. pointer/touch selection of ECHO I -> II;
6. rank card created no blast and no free mine;
7. no SHIFT between ECHO acquisition and the capacity proof, preserving genuine `DORMANT_HOME` state;
8. four naturally placed Rank-II mines coexisted;
9. all four observed proof mines remained genuine dormant-home memory;
10. player remained alive;
11. reduced-motion narrow-host qualification remained active.

Observed natural rank-up checkpoints:

- `960`: Level 5, HP `34` -> ECHO Rank II;
- `390`: Level 5, HP `4` -> ECHO Rank II.

The narrow route passed naturally; the qualification did not alter gameplay HP, damage, XP thresholds, enemies or drop rules.

---

## 6. Controlled high-rank browser qualification

Qualification-only rank ownership fixtures remain isolated from ordinary player flow and do not alter enemy strength or production combat rules.

### Rank IV — FAST RECALL

At both `960` and `390`:

- fixture identity explicitly reported `ECHO_RANK_4`;
- a real mine was placed by normal runtime placement;
- a real SHIFT-away and SHIFT-home cycle occurred;
- a real return event was observed;
- return did not detonate immediately;
- Rank-IV `140 ms` recall authority remained active;
- a real post-return ECHO hit occurred;
- player remained alive;
- reduced-motion tactical meaning was preserved.

Result:

- `RARE_SHIFT_V2_3B4_ECHO_RANK4_FAST_RECALL_960=PASS`
- `RARE_SHIFT_V2_3B4_ECHO_RANK4_FAST_RECALL_390=PASS`

### Rank V — DEEP MEMORY

At both `960` and `390`:

- fixture identity explicitly reported `ECHO_RANK_5`;
- mine placement remained real;
- first genuine leave/return cycle earned depth;
- a too-fast second cycle changed memory state without earning depth;
- a later legal `>=900 ms` cycle earned depth 2;
- depth-2 state was browser-observable;
- a depth-2 mine dealt real damage to a currently corporeal production enemy;
- player remained alive;
- reduced-motion tactical meaning was preserved.

Result:

- `RARE_SHIFT_V2_3B4_ECHO_RANK5_DEEP_MEMORY_960=PASS`
- `RARE_SHIFT_V2_3B4_ECHO_RANK5_DEEP_MEMORY_390=PASS`

---

## 7. Inherited regression qualification

The exact same implementation/test HEAD passed, in order:

- inherited deterministic core;
- V2 combat deterministic contracts;
- V2-2E cross-weapon deterministic matrix;
- draft-pointer regression;
- V2-3A progression;
- V2-3B1 DELTA deterministic contracts;
- V2-3B2 VECTOR deterministic contracts;
- V2-3B3 ORBIT deterministic contracts;
- V2-3B4 ECHO deterministic/adapter contracts;
- ART-00;
- core/game TypeScript;
- FriendSDK check/build/smoke;
- V2-1 browser;
- VECTOR Rank-I browser;
- ORBIT Rank-I browser;
- ECHO Rank-I browser;
- SIGNAL ARC Rank-I browser;
- integrated four-slot V2-2E browser;
- B1 DELTA browser;
- B2 VECTOR browser;
- B3 ORBIT browser;
- B4 ECHO natural/controlled browser.

No prior qualified tranche was silently weakened to make B4 pass.

---

## 8. Qualification repairs before final PASS

Two bounded qualification-system defects were corrected before the authoritative successful run:

1. `v2-3b4-echo-adapter.test.ts` had a TypeScript inference mismatch after deterministic tests already passed. The repair added explicit `V21BuildState` typing only; no production source changed.
2. the first B4 natural browser route died before Level 5 because the proof intentionally prohibited SHIFT after ECHO acquisition so its capacity mines remained genuine `DORMANT_HOME`. The harness was hardened by increasing movement duty during that no-SHIFT interval. No HP, XP, enemy, damage, rank, spawn, draft or proof assertion was changed.

The authoritative successful run is after both repairs and uses exact HEAD `f19e866795a188d36a472c4cdbc660c7868a5028`.

---

## 9. Evidence artifact

Authoritative artifact:

- name: `rare-shift-v2-3b4-evidence-36517825242`;
- artifact ID: `11011369472`;
- evidence files: `90` uploaded files;
- size: `2,217,004 bytes`;
- SHA-256: `ad898ea5c1c40f74f72da52d86a4a21c7dccfe1fa2d33524ee5313e005c22b1c`;
- exact HEAD: `f19e866795a188d36a472c4cdbc660c7868a5028`;
- expires: `2026-10-13T03:51:37Z`.

---

## 10. Scope integrity

Relative to B3 documentation closeout `77b7585824ba5707879e21cfe625ec031211274a`, the qualified B4 implementation/test HEAD is:

- ahead: `9` commits;
- behind: `0` commits;
- changed files: exactly `10` expected B4 surfaces.

Changed surfaces are limited to:

- B4 core/full qualification workflows;
- bounded live draft bridge;
- ECHO deterministic core;
- Phaser ECHO runtime integration/observability;
- B4 deterministic/adapter tests;
- B4 browser qualification;
- package/typecheck wiring.

No SIGNAL-II+ implementation, Protocol runtime, Evolution, new enemy, economy, deployment or main mutation is included.

---

## 11. Final decision state

`V2_3B3 = CLOSED`

`V2_3B4_ECHO_DESIGN = LOCKED`

`V2_3B4_ECHO_DETERMINISTIC_CONTRACTS = PASS`

`V2_3B4_ECHO_LIVE_RANK_ADAPTER = PASS`

`V2_3B4_ECHO_LIVE_OBJECT_MIGRATION = PASS`

`V2_3B4_ECHO_MEMORY_DEPTH = PASS`

`V2_3B4_ECHO_BURST_LEDGER_DETERMINISTIC = PASS`

`V2_3B4_NATURAL_ECHO_I_TO_II_960_390 = PASS`

`V2_3B4_FOUR_MINE_CAPACITY_960_390 = PASS`

`V2_3B4_RANK_IV_FAST_RECALL_960_390 = PASS`

`V2_3B4_RANK_V_DEEP_MEMORY_960_390 = PASS`

`V2_3B4_REDUCED_MOTION = PASS`

`V2_3B4_INHERITED_REGRESSION_THROUGH_B3 = PASS`

`ECHO_V_REAL_BROWSER_THIRD_HIT_SUPPRESSION = DEFERRED_TO_V2_4_HIGH_HP_THREAT`

`V2_3B4_OVERALL_DECISION = PASS`

`V2_3B4 = CLOSED`

`V2_3B5_SIGNAL_RANKS = NOT_STARTED`

`MAIN_MERGE = NOT_AUTHORIZED`

`DEPLOYMENT = NOT_AUTHORIZED`

---

## 12. Next bounded gate

The next recommended action is **V2-3B5 — SIGNAL ARC Rank II–V planning/review only**.

B5 implementation is not authorized by this B4 closeout.
