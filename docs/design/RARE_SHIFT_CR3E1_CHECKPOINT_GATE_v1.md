# RARE//SHIFT CR-3E.1 CHECKPOINT PROGRESSION GATE v1

**Status:** IMPLEMENTATION CANDIDATE — OWNER AUTHORIZED BOUNDED REPAIR  
**Parent:** CR-3D exact qualified head `52b1ad048f642b7e3e00bd3f3d19ced23e597f9e`  
**Scope:** structural checkpoint progression repair only; no balance tuning, merge, or deployment authority.

## Purpose

CR-3E natural closeout proved that the current runtime can spawn ELITE I, CHECKPOINT ELITE and ELITE II, then reach THE DESYNC without defeating those encounters or acquiring their declared Evolution Core rewards. That violates the locked complete-run order:

`STAGE I → ELITE I / CORE → STAGE II → CHECKPOINT ELITE → STAGE III → ELITE II / CORE → STAGE IV → THE DESYNC`.

CR-3E.1 repairs only that orchestration defect. It does not change weapon balance, enemy balance, checkpoint HP multipliers, stage target durations, boss tuning, Protocol values, Evolution rules, or inherited B1–B5 mechanics.

## Clock contract

Two time authorities are distinct:

1. **Combat/run clock — `elapsedActiveMs`**
   - continues while the player is actively fighting a checkpoint elite;
   - remains authoritative for weapons, cooldowns, enemy attacks, invulnerability and CR-3D total run time;
   - continues to publish `data-director-elapsed-ms` for compatibility with qualified CR-3D results/fingerprints.

2. **Director progression clock — `directorProgressMs`**
   - controls stage progression, ordinary director spawning and checkpoint boundaries;
   - freezes exactly at a checkpoint boundary while that checkpoint is unresolved;
   - resumes only after the checkpoint elite has been defeated and the full declared checkpoint reward package has been collected.

The qualified pure CR-1 stage timeline remains unchanged:

- ELITE I boundary: `80_000 ms`;
- CHECKPOINT ELITE boundary: `180_000 ms`;
- ELITE II boundary: `285_000 ms`;
- THE DESYNC handoff: `360_000 ms`.

These values are not tuned in CR-3E.1.

## Checkpoint gate state machine

The deterministic gate authority has exactly three phases:

- `RUNNING`
- `ELITE_ACTIVE`
- `REWARD_PENDING`

At a checkpoint boundary:

1. director progression clamps exactly to the boundary;
2. the corresponding production elite is created exactly once;
3. the displayed stage remains the preceding combat stage while the checkpoint is unresolved;
4. ordinary director spawn accumulation is cleared and ordinary director spawning is suspended;
5. all existing combat simulation continues on the real combat/run clock.

When the elite dies:

1. the existing CR-1/CR-2 exactly-once reward ledger remains authoritative;
2. the existing checkpoint progression reward remains authoritative;
3. the gate enters `REWARD_PENDING` with exactly the checkpoint's declared reward package;
4. the director remains frozen until every declared reward in that package has been collected.

Only then does the gate return to `RUNNING` and unlock the next stage.

## Guaranteed checkpoint reward delivery

The existing ordinary pickup pool remains 64 slots.

CR-3E.1 adds exactly **two reserved checkpoint reward delivery slots**, because the largest declared checkpoint reward package contains two pickups. Ordinary enemy drops cannot consume those reserved slots.

Checkpoint rewards are delivered only through the reserved slots. Failure to allocate a reserved checkpoint reward is fail-closed and must surface as a runtime error rather than silently losing a guaranteed Evolution Core.

Checkpoint reward pickups retain their existing effects. They are magnetized for delivery, but no reward is granted until the existing pickup collection path executes.

A checkpoint cannot resolve merely because its elite died; the full declared reward package must be collected.

## Boss fail-closed contract

`bossPending` may become true only when all of the following are true:

- director progression reached `360_000 ms`;
- checkpoint gate phase is `RUNNING`;
- no checkpoint is active;
- ELITE I is resolved;
- CHECKPOINT ELITE is resolved;
- ELITE II is resolved.

THE DESYNC therefore cannot start while any mandatory checkpoint encounter or reward package is outstanding.

## Compatibility contract

The qualified CR-3B/C pressure fixtures use the explicit `__RARE_SHIFT_CR3B_RUNTIME__` controlled qualification flag. The qualified CR-3D terminal-results fixture uses `__RARE_SHIFT_CR3D_RUNTIME__`. These fixtures intentionally inject boss-boundary state to prove their already-qualified isolated contracts. CR-3E.1 is suppressed only when either explicit controlled qualification flag is set.

Ordinary production runtime and the dedicated CR-3E.1 qualification do not set either suppression flag, so checkpoint progression remains authoritative there.

The previous natural CR-1 Stage-IV browser proof remains useful historical evidence for natural stage pressure but its checkpoint-spawn-only runtime expectation is superseded by CR-3E.1. The CR-1 deterministic schedule tests remain authoritative and must continue passing unchanged.

## CR-3E.1 exit gate

All items must pass on one exact feature head:

- CR-3E.1 deterministic checkpoint gate tests PASS;
- exact boundary clamp/freeze/resume PASS;
- complete reward-package collection requirement PASS;
- reserved reward capacity PASS under ordinary-pool saturation model;
- boss handoff fail-closed until all three checkpoint gates resolve PASS;
- inherited CR-1 deterministic schedule PASS unchanged;
- inherited CR-2 / Evolution / B1–B5 deterministic regression PASS;
- TypeScript core/game PASS;
- FriendSDK check/build PASS;
- inherited baseline/B5/Evolution/CR-3B/CR-3C/CR-3D browser regressions PASS;
- live CR-3E.1 desktop checkpoint gate proof PASS;
- live CR-3E.1 390/reduced-motion checkpoint gate proof PASS;
- `main` unchanged;
- no merge or deployment performed.

Passing CR-3E.1 does **not** by itself close CR-3. The independent CR-3E seeded natural complete-run victory proof must be rerun afterward against the qualified repair.
