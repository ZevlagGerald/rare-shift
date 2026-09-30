# RARE//SHIFT EVOLUTION RUNTIME GATE v1

**Status:** ACTIVE — OWNER AUTHORIZED EVOLUTION RUNTIME TRANCHE  
**Project:** RARE//SHIFT  
**Branch:** `feature/evolution-runtime`  
**Baseline:** `main@eeacd6ff7b511e9b4f7613449135ff0441d8584b`  
**FriendSDK:** v0.1.3  
**Engine:** Phaser 4.2.1  
**Owner authority:** final

## 1. Purpose

This gate converts the already-locked CR-2 Evolution eligibility/progression contracts into a safe combat-runtime implementation sequence for all five weapon Evolutions.

This tranche does **not** reopen qualified Rank I–V weapon behavior, CR-1 stage timing, Protocol progression, REFRACT, enemy balance, or the complete-run governance. It exists to make a selected Evolution produce real bounded gameplay while preserving the combat history and phase laws that were already qualified.

The Evolution Runtime tranche is considered complete only when all five evolved behaviors are deterministic, live in Phaser, browser-qualified at desktop and narrow widths, and inherited B1–B5 plus natural Stage-IV regressions remain green.

## 2. Authority

This gate is subordinate to:

1. `docs/governance/RARE_SHIFT_COMPLETE_RUN_COMPLETION_GOVERNANCE_v1.md`
2. `docs/design/RARE_SHIFT_V2_SURVIVAL_GAME_DESIGN_v1.md`
3. `games/rare-shift/src/cr2-progression-core.ts`
4. the qualified Rank I–V weapon cores and tests
5. exact-head CR-2 qualification evidence merged at `eeacd6ff7b511e9b4f7613449135ff0441d8584b`

If this document conflicts with a qualified inherited mechanic, the inherited qualified mechanic remains authoritative unless the Owner explicitly approves a superseding change.

## 3. Decision status

- CR-2 progression/Protocol/REFRACT: **LOCKED / MERGED / QUALIFIED**
- Evolution eligibility and Core consumption: **LOCKED / QUALIFIED**
- Evolution combat runtime: **OPEN — THIS TRANCHE**
- final Protocol-slot HUD polish: **DEFERRED**
- THE DESYNC / later complete-run work: **HOLD**
- CR-3 or unrelated mechanics: **HOLD**
- merge to `main`: **HOLD until explicit Owner approval after exact-head qualification**

## 4. Global Evolution invariants

Every Evolution MUST preserve all of the following:

1. Weapon must already be owned at Rank V.
2. Matching Protocol Rank I+ must already be owned.
3. Exactly one unspent Evolution Core is consumed.
4. Weapon-slot count does not change.
5. Protocol-slot count does not change.
6. Evolution selection itself grants no immediate attack.
7. Evolution selection does not make a cooldown immediately ready.
8. Existing cooldown progress is preserved proportionally if an evolved profile changes a cooldown.
9. Existing phase, player HP, XP, level, pickup radius and run seed are preserved.
10. Existing weapon-specific history is preserved unless the locked Evolution behavior explicitly adds a new future-facing state field.
11. No prior projectile, mine, relay, hit, SHIFT, stagger, shear, lock stack, memory depth or cast is fabricated retroactively.
12. Phase corporeality remains authoritative.
13. COMMON never legalizes an A/B ghost.
14. Stable-ID deterministic tie-breaking remains authoritative.
15. Every chain/propagation/knockback/refraction effect has a hard cap.
16. Boss/elite resistance must be explicit; no hidden control abuse.
17. Reduced-motion changes presentation only, never authority/timing semantics.
18. No Evolution may require changing enemy HP, spawn cadence, player HP or progression merely to satisfy qualification.

## 5. Existing Rank-V baselines that Evolutions extend

### DELTA Rank V

- primary active-phase canonical geometry remains the attack authority;
- 14 primary damage;
- 720ms base cooldown before Protocol modification;
- 9.5 world scale;
- 90ms normal-target stagger / bounded elite resistance / no boss stagger;
- Rank-IV previous-phase PHASE ECHO remains a separate qualified mechanic.

### VECTOR Rank V

- precision/priority targeting remains authoritative;
- normal line behavior remains bounded;
- PHASE TRANSFER remains one-shot bounded state;
- VECTOR LOCK remains capped at three stacks;
- target legality and stable tie-breaking remain unchanged.

### ORBIT Rank V

- three nodes preserve one anchor and equal spacing;
- shared per-target ledger prevents multi-node DPS multiplication;
- normal contact interval remains bounded;
- PHASE SHEAR keeps its qualified post-SHIFT corporeal authority and rearm.

### ECHO Rank V

- leave/return memory remains mandatory;
- memory depth remains capped at two;
- active-mine capacity remains bounded;
- Rank-V target-local burst ledger remains authoritative: no Evolution may bypass it.

### SIGNAL Rank V

- deterministic forward-degree routing remains authoritative;
- four-target Rank-V graph and current damage contract remain the inherited baseline;
- COMMON relay authority remains bounded;
- cast geometry/authority is snapshotted at cast start.

## 6. Required evolved identities

### 6.1 DELTA → RECONSTRUCTION FIELD

Locked structural behavior:

- the ordinary active-phase Rank-V DELTA pulse remains unchanged and occurs on its inherited cadence;
- each successful primary pulse schedules at most one short COMMON silhouette echo derived only from `A ∩ B` canonical pixels;
- the COMMON silhouette is a new evolved future event, never retroactive damage;
- accepted SHIFT may express a bounded `previous phase → COMMON → current phase` sequence, but both A and B are never simultaneously granted permanent corporeal authority;
- existing Rank-IV previous-phase PHASE ECHO remains distinct and cannot be double-counted as the COMMON silhouette;
- COMMON silhouette damage/ delay/rearm values must be locked in deterministic tests before Phaser wiring.

Forbidden:

- full A+B union damage;
- permanent dual-phase damage;
- free pulse at the moment Evolution is selected;
- reset of DELTA cooldown or PHASE ECHO rearm.

### 6.2 VECTOR → PRISM LANCE

Locked structural behavior:

- inherited Rank-V target acquisition, priority band, VECTOR LOCK and PHASE TRANSFER remain authoritative;
- the projectile may penetrate its bounded legal line targets;
- exactly one refraction opportunity may be created from the qualified cast/projectile event;
- the refraction target must be active, phase-corporeal, not already accepted by that projectile path, within a hard evolved refraction radius, and chosen deterministically;
- refraction cannot create another refraction;
- boss targeting remains predictable and deterministic;
- refraction damage/range/hit cap must be locked in deterministic tests before Phaser wiring.

Forbidden:

- recursive ricochet;
- off-phase target legalization;
- synthetic projectile on Evolution selection;
- clearing or increasing VECTOR LOCK merely because Evolution was selected.

### 6.3 ORBIT → SYNC HALO

Locked structural behavior:

- inherited orbit anchor and current angle survive Evolution;
- rotation continuity is preserved;
- the evolved formation may increase spatial continuity, but the shared per-target contact ledger remains authoritative so additional visual/contact samples cannot multiply DPS uncontrollably;
- accepted SHIFT reverses rotation using the existing phase law;
- at most one bounded evolved SHIFT control/shear response may occur per accepted eligible SHIFT/rearm window;
- NORMAL, COMMON, ELITE and BOSS displacement/control resistance must be explicitly encoded;
- node/halo geometry and control distances must be locked in deterministic tests before Phaser wiring.

Forbidden:

- resetting orbit angle to zero;
- one damage event per node against the same target inside the shared ledger window;
- repeated boss knockback/stunlock.

### 6.4 ECHO → MEMORY COLLAPSE

Locked structural behavior:

- existing mines retain ID, position, recorded phase, creation time, state, return history and Rank-V memory depth when Evolution is selected;
- only genuinely armed/trigger-legal mines may participate in evolved linking;
- a triggering mine may propagate to linked armed mines within a hard link distance;
- propagation order is deterministic and stable-ID safe;
- the propagation graph has an explicit maximum mine count / depth and may never recurse without that cap;
- every propagated damage application still passes the existing Rank-V target-local burst ledger;
- link radius, chain cap and propagated damage semantics must be locked in deterministic tests before Phaser wiring.

Forbidden:

- fabricating armed mines;
- fabricating memory depth;
- resetting mine ages;
- bypassing the two-hit/250ms Rank-V target ledger;
- unbounded recursive cascade.

### 6.5 SIGNAL → CHAIN RESONANCE

Locked structural behavior:

- inherited Rank-V forward-degree route selection and stable tie-breaking remain authoritative;
- evolved casts may add bounded graph value through additional legal jumps and reduced decay;
- total target count remains hard-capped;
- every hop remains phase-corporeal at cast snapshot time;
- an accepted SHIFT may arm at most one bounded next-cast COMMON interaction; that authority is consumed or expires according to a deterministic state contract;
- no historical graph may be reused after SHIFT;
- evolved target cap, damage sequence, post-SHIFT window and COMMON authority must be locked in deterministic tests before Phaser wiring.

Forbidden:

- ghost legalization;
- unlimited jumps;
- replaying a prior graph after SHIFT;
- granting a free cast/readiness on Evolution selection or SHIFT.

## 7. Numeric tuning rule

The qualitative identities above are LOCKED. New numeric constants are **PROVISIONAL until their deterministic tranche is reviewed**.

For every new numeric value:

- begin from the qualified Rank-V profile;
- prefer the smallest value that makes the Evolution mechanically legible;
- preserve the original weapon's role;
- encode hard caps before increasing power;
- test exact boundaries, not approximate outcomes;
- do not modify unrelated combat/player/enemy values to force the route;
- document the reason for the value in the deterministic test name or adjacent contract comment.

No hidden post-SHIFT Protocol value may be revived implicitly. The three reserved CR-2 post-SHIFT Protocol fields remain zero unless a later explicit reviewed change defines them.

## 8. Implementation sequence

### EV-0 — Contract Gate

This document. No combat runtime mutation.

Exit criteria:

- all five identities reconciled with qualified Rank-V mechanics;
- shared invariants and forbidden behaviors explicit;
- Phaser Evolution hard-stop remains intact.

### EV-1 — Deterministic Evolution Core

Add pure deterministic evolution-runtime helpers and unit tests for all five families.

Required test classes:

- exact positive behavior;
- exact boundary/cap behavior;
- phase legality;
- stable-ID / input-order invariance where applicable;
- no recursive/unbounded behavior;
- no history fabrication;
- unchanged inherited Rank-V behavior when `evolved=false`;
- explicit boss/elite resistance where control is involved.

The pure core may not depend on Phaser.

### EV-2 — Live State / Projection Bridge

Extend the existing CR-2 live adapters so evolved state can project safely without changing unrelated fields.

Required:

- preserve cooldown progress/history;
- preserve orbit angle, VECTOR lock/transfer state, ECHO mine history and SIGNAL history;
- still no immediate attack on selection;
- add diagnostics needed for browser qualification;
- do **not** remove the current Phaser hard-stop until all five live adapters exist and deterministic qualification is green.

### EV-3 — Controlled Phaser Qualification

Wire each Evolution into the live scene behind production state plus bounded qualification fixtures.

For each family prove:

- real Evolution selection/state projection;
- real evolved combat event;
- inherited non-evolved behavior remains unchanged;
- no free immediate attack/readiness;
- phase legality;
- hard cap;
- desktop 960;
- narrow 390;
- reduced-motion parity where visual timing is involved.

### EV-4 — Natural Evolution Draft Handoff

Enable the full `buildCR2DraftFromLive` Evolution path only after all five evolved combat behaviors are live-qualified.

Prove:

- Rank V + matching Protocol + Core exposes a real Evolution choice;
- selecting it consumes exactly one Core;
- the evolved weapon remains in the same slot;
- the next combat event uses the evolved runtime;
- multiple eligible Evolutions remain player-selectable/deterministic according to the CR-2 draft contract;
- REFRACT does not create illegal/no-op Evolution choices.

### EV-5 — Closeout Regression

Run exact-head:

- Evolution deterministic suite;
- CR-2 deterministic suite;
- inherited CR-1 and B1–B5 deterministic suite;
- TypeScript + FriendSDK check/build/smoke;
- five controlled Evolution browser proofs;
- Protocol + REFRACT browser proof;
- inherited B1–B5 browser regression;
- natural Stage-IV regression.

Only after EV-5 is green may the tranche be presented as **READY FOR OWNER MERGE APPROVAL**.

## 9. Phaser hard-stop rule

The existing `applyCR2Projection()` guard that throws when an evolved weapon reaches Phaser is intentional safety infrastructure.

It MUST remain until EV-1 and EV-2 are complete for all five families and the live scene has concrete evolved behavior for every possible legal Evolution candidate.

The guard may not be weakened to silently ignore evolved state and may not be replaced with a no-op fallback.

## 10. Qualification philosophy

Natural browser play proves the real progression/evolution handoff. Controlled browser fixtures prove precise high-rank/evolved mechanics that would otherwise depend on long autonomous survival or rare geometry.

A qualification failure must not be repaired by silently changing gameplay balance. First identify whether the failure is:

- production mechanic;
- state bridge;
- diagnostics/observation;
- fixture geometry;
- natural-route survivability.

Only the causal layer may be changed.

## 11. Exit state for this gate

After this file lands:

- `feature/evolution-runtime` is the sole active Evolution implementation branch;
- `main` remains the qualified CR-2 baseline;
- EV-0 is COMPLETE;
- EV-1 is the next bounded implementation tranche;
- no Evolution is yet live in production Phaser;
- CR-3 / THE DESYNC / final GUI work remain HOLD.
