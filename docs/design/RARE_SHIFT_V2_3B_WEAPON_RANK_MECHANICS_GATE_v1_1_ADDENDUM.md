# RARE//SHIFT V2-3B — WEAPON RANK II–V MECHANICS GATE v1.1 ADDENDUM

**Status:** ACTIVE HARDENING ADDENDUM — REQUIRED WITH v1 BEFORE IMPLEMENTATION  
**Date:** 2026-09-27  
**Planning branch:** `planning/v2-3b-weapon-rank-gate`  
**Parent gate:** `docs/design/RARE_SHIFT_V2_3B_WEAPON_RANK_MECHANICS_GATE_v1.md`  
**Reviewed parent HEAD:** `02ca50f4e23320add1ac167936e72dbd00581449`  
**Implementation authorization:** **NO**

## 1. Purpose

A second engineering pass over the V2-3B gate found three ambiguity/abuse surfaces that should be resolved before runtime code exists:

1. VECTOR Rank-IV PHASE TRANSFER could be banked indefinitely after a SHIFT;
2. rank-up behavior for already-live projectiles, mines, nodes, cooldown accumulators and pending riders was unspecified;
3. Rank-V ECHO could allow several overlapping deep-memory mines to stack all damage onto one target in the same short burst window.

This addendum closes those gaps and strengthens browser qualification. It does not change the five-family architecture or the twenty rank identities already defined in v1.

If this addendum conflicts with v1 on the specific subjects below, **this v1.1 addendum is authoritative**. All other v1 clauses remain unchanged.

---

## 2. Global rank-application law — LOCKED

A level-up draft pauses combat. Applying a rank card is an atomic build-state transition while combat is paused.

A rank-up may change future weapon behavior, but it may **not** manufacture a free combat event merely because the rank changed.

Therefore all families obey:

- no rank-up resets an ordinary cooldown;
- no rank-up emits a projectile, pulse, ARC cast, mine blast, ORBIT shear or SHIFT rider by itself;
- no rank-up credits a historical SHIFT, hit, mine cycle or target lock that happened before the rank existed;
- no rank-up creates backlog shots for elapsed draft/pause time;
- resume begins from a deterministic post-upgrade runtime state;
- all new counters/charges introduced by the acquired rank initialize to their neutral state unless explicitly stated below.

### 2.1 Cooldown migration

If a rank changes a weapon cooldown, readiness progress is preserved proportionally instead of being reset or converted into a free full charge.

For an elapsed/readiness accumulator:

```text
progress = clamp(oldAccumulator / oldCooldown, 0, 1)
newAccumulator = progress * newCooldown
```

Rules:

- at most one normal firing opportunity can become ready after migration;
- no backlog is created;
- paused draft time contributes zero combat elapsed time;
- the same formula is deterministic across frame rates.

This primarily applies to DELTA I → II in V2-3B.

---

## 3. Family-specific live-object migration — LOCKED

### 3.1 DELTA BURST

- canonical primary pulses always use the rank active when that pulse is emitted;
- acquiring Rank IV does **not** create an echo for the SHIFT that occurred before Rank IV existed;
- an already scheduled Rank-IV PHASE ECHO snapshots its scheduled geometry, damage and authority at scheduling time;
- upgrading to Rank V while an echo is pending does not increase that pending echo's damage and never adds stagger to it;
- Rank-V stagger begins with the first matching-phase primary pulse emitted after resume.

### 3.2 VECTOR NEEDLE

Every projectile snapshots its launch profile.

An in-flight projectile keeps:

- launch-time damage sequence;
- launch-time penetration/hit cap;
- launch-time target/line authority;
- launch-time PHASE TRANSFER status.

A rank-up does not upgrade an already-fired projectile in flight.

Rank-V lock state initializes at zero on acquisition. Historical pre-Rank-V hits do not seed lock stacks.

### 3.3 ORBIT NODES

ORBIT rank-up reconciles geometry immediately while combat is paused:

- preserve the existing anchor angle exactly;
- add/remove no node except as required by the new rank's node count;
- place nodes at the new rank's exact deterministic equal spacing around that anchor;
- preserve the shared per-target normal contact ledger;
- do not emit collision damage while the draft is paused;
- acquiring Rank IV does not emit PHASE SHEAR;
- acquiring Rank V does not reset PHASE SHEAR rearm.

### 3.4 ECHO MINE

Existing active mines adopt the newly owned rank's **numeric profile** after the rank-up so the weapon upgrade is immediately coherent, but historical state is never fabricated.

Therefore:

- lifetime is always measured from original `createdAtMs`;
- recorded phase never changes;
- current DORMANT/ARMED/RETURN_READY state is preserved;
- Rank-II/III/IV numeric cap/radius/delay changes apply after resume;
- acquiring Rank V initializes `memoryDepth = 0` for every still-active mine;
- no historical leave/return cycle is credited toward Rank-V depth;
- replacement order remains stable mine ID order.

If reducing a return delay means an already RETURN_READY mine is now old enough to be eligible, it may trigger only after combat resumes and only through the normal trigger check. The rank card itself never detonates it.

### 3.5 SIGNAL ARC

SIGNAL ARC casts are instantaneous plans. The next cast after rank-up uses the new profile.

- no partial historical cast is upgraded;
- no rank-up resets ARC cooldown;
- acquiring Rank IV grants no carried COMMON-relay bonus from an earlier cast;
- acquiring Rank V affects only casts planned after resume.

---

## 4. VECTOR IV — PHASE TRANSFER expiry hardening — LOCKED

The v1 rule that PHASE TRANSFER stores at most one post-SHIFT charge remains, but that charge may not be banked indefinitely.

Add:

- transfer window: **`1200 ms`** after the most recent accepted SHIFT;
- stored charges: max `1`;
- a later accepted SHIFT while one charge is already armed does not stack a second charge;
- that later SHIFT refreshes the single charge to the new phase authority and restarts the `1200 ms` window;
- if no valid launch occurs before expiry, the charge is lost silently;
- a valid launch consumes the charge immediately at launch;
- target death/invalidity after launch does not refund it;
- SHIFT still never resets VECTOR's ordinary `760 ms` cooldown.

Rationale:

PHASE TRANSFER is intended to reward immediate post-SHIFT commitment. An indefinitely stored enhanced shot would become a generic permanent projectile bonus rather than a phase-timing mechanic.

Required tests:

- exact `1199 ms` still armed / `1200 ms` expired boundary;
- refresh without stacking;
- phase authority binds to the latest accepted SHIFT;
- no-target expiry creates no projectile and no backlog;
- cooldown remains unchanged.

---

## 5. ECHO V — same-target burst hardening — LOCKED

Rank-V DEEP MEMORY increases mine authority, but four overlapping mines must not become an uncontrolled same-target nuke.

At ECHO Rank V add a per-target rolling burst ledger:

- window: **`250 ms`**;
- max damaging ECHO mine hits on one target inside the window: **`2`**;
- the cap applies across all active ECHO mines owned by the player;
- mine resolution remains ascending stable mine ID;
- a mine that validly triggers still resolves/detonates for other legal targets even if one target has already reached the two-hit cap;
- skipped damage against a capped target is not queued for later;
- expiration/replacement remains silent;
- this cap is ECHO-specific and does not suppress other weapon families.

At the Rank-V depth-2 profile this bounds direct same-target burst authority to `40` damage per `250 ms` from ECHO mines before future resistance/elite/boss rules.

This does not alter Rank-I qualified mine state transitions. It is a Rank-V safety rule introduced with DEEP MEMORY.

Required tests:

- one target in four overlapping depth-2 blasts receives at most two ECHO damage events in the rolling window;
- other targets in those blasts can still be hit according to their own ledgers;
- hit eligibility returns after the window;
- candidate/mine input ordering cannot alter the result;
- stable mine-ID resolution remains authoritative.

---

## 6. SHIFT rider anti-spam law — CLARIFIED

The parent gate's independent `650 ms` rearm for DELTA PHASE ECHO and ORBIT PHASE SHEAR remains authoritative.

Clarify:

- the rider rearm is separate from any global SHIFT commitment interval;
- reducing the future global SHIFT commitment may never implicitly reduce either rider rearm;
- an accepted SHIFT during rider rearm still performs normal phase change and all non-rider weapon consequences;
- it simply emits no new copy of that rider;
- a future Protocol may not bypass these rearm limits without reopening this gate.

This prevents a later input-tuning change from silently multiplying V2-3B weapon DPS.

---

## 7. Deterministic state requirements added for implementation

The V2-3B implementation must keep explicit deterministic state for mechanics that survive more than one update/cast.

Minimum logical state includes:

```text
DELTA
  pendingEcho? -> recorded phase / scheduledAt / profile snapshot
  echoRearmReadyAt

VECTOR
  inFlight[] -> launch profile snapshot
  phaseTransferExpiresAt
  phaseTransferPhase
  vectorLockTargetId
  vectorLockStacks

ORBIT
  anchorAngle
  lastHitByTarget
  shearRearmReadyAt
  shearHitLedger for current event

ECHO
  mine state
  memoryDepth
  lastDepthIncrementAt
  Rank-V per-target burst ledger

SIGNAL
  ordinary cooldown state
  cast-local COMMON bonus-used flag
```

No sprite/object pointer or array insertion order may be authoritative gameplay truth.

---

## 8. Qualification strengthening

The parent gate's tests remain required. Add the following.

### 8.1 Pure deterministic qualification

All twenty rank transitions must be exercised directly in deterministic tests.

For every family, prove:

- rank application is atomic;
- cooldown/readiness migration is deterministic;
- live-object migration follows Section 3;
- no historical event is retroactively credited;
- repeated application of the same rank transition is rejected by progression state;
- adversarial input order cannot alter target/hit choice where stable-ID law applies.

### 8.2 Browser qualification

Do **not** require a long artificial survival grind merely to reach every Rank V in one run.

Use two complementary browser proof classes:

1. **Natural progression proof**
   - production exactly-three draft adapter;
   - real pointer/touch/keyboard selection;
   - each family can be acquired and naturally advance beyond Rank I on a legal route;
   - DELTA must have at least one natural route to Rank V because it is mandatory and the Character Spotlight identity path.

2. **Controlled high-rank mechanics proof**
   - deterministic bounded fixture/state entry for Rank III–V mechanics where necessary;
   - fixture may set legal build/runtime state but may not change production rules or secretly weaken enemies;
   - every Rank IV/V mechanic must produce real browser-observable evidence at `960` and `390`;
   - fixture state must be explicitly labeled qualification-only and excluded from ordinary player flow.

This avoids repeating the V2-1C mistake of turning a bounded mechanics proof into an artificial multi-minute endurance test.

### 8.3 Required visual observability

A rank cannot be qualified only because an internal counter changed.

At minimum:

- DELTA III footprint growth is visually distinguishable from II;
- DELTA IV previous-phase echo is distinguishable from primary geometry;
- VECTOR II penetration and IV transfer have different restrained feedback;
- ORBIT II/V node spacing is visible without reading debug text;
- ORBIT IV shear is a short one-event cue, not a persistent hazard-looking field;
- ECHO V depth state is readable but subordinate to arena hazards;
- SIGNAL IV COMMON relay and V controlled routing remain readable on the 390-wide host;
- reduced-motion preserves all tactical meaning without relying on long trails/flashes.

---

## 9. Review of parent numerical profile

After rechecking the qualified Rank-I constants and the parent v1 rank table, no immediate numerical contradiction requires reopening the initial values.

The initial profiles remain suitable for implementation qualification because:

- DELTA grows from approximately `12 / 0.86s` to `14 / 0.72s` primary per-target authority while most growth is spatial/phase/control rather than raw damage;
- VECTOR keeps its `760 ms` base cadence and gains bounded line/focus behavior instead of fire-rate inflation;
- ORBIT uses a shared target ledger, so extra nodes primarily increase coverage rather than multiplying same-target hit rate;
- ECHO keeps placement interval `1800 ms` and hard mine count `4`, so larger memory authority does not create an unbounded object rate;
- SIGNAL remains capped at four unique targets before evolution, reserving additional chain breadth for CHAIN RESONANCE.

These are **initial implementation values**, not final V2-4 balance claims.

---

## 10. Decision state after hardening

`V2_3A = TECHNICALLY_QUALIFIED`

`V2_3B_PARENT_GATE_v1 = REVIEWED`

`V2_3B_HARDENING_ADDENDUM_v1_1 = READY_FOR_OWNER_REVIEW`

`V2_3B_DESIGN_GATE = READY_FOR_OWNER_REVIEW`

`V2_3B_CODE = NOT_STARTED`

`V2_3C_PROTOCOL_RUNTIME = NOT_STARTED`

`V2_3D_EVOLUTION = NOT_STARTED`

`V2_4 = NOT_STARTED`

No V2-3B runtime implementation is authorized merely by creating this addendum. Implementation should begin only after owner approval of the combined v1 + v1.1 gate and explicit authorization of the first bounded implementation tranche, recommended as **V2-3B1 — DELTA BURST Rank II–V**.
