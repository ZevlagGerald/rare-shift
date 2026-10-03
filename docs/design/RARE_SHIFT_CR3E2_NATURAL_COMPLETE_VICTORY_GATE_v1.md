# RARE//SHIFT CR-3E.2 NATURAL COMPLETE VICTORY GATE v1

**Status:** FOCUSED PRE-CERTIFICATION ACTIVE — FINAL NATURAL CERTIFICATION HOLD  
**Parent:** exact qualified CR-3E.1 head `644f7900966412570d5bdd7b43b278b30b4e49de`  
**Scope:** qualification assets only; no production gameplay mutation, balance tuning, merge, or deployment authority.

## Purpose

CR-3E.1 proved the checkpoint progression repair. CR-3E.2 still requires one genuine ordinary-player complete victory, but the complete natural browser run is no longer used as the primary debugger.

The qualification method is now layered so failures are isolated before the expensive end-to-end certification:

- **Layer A — deterministic authority:** checkpoint, progression, boss, pressure, Results, Evolution and inherited deterministic contracts.
- **Layer B — focused Stage-IV scenario:** production checkpoint core is composed directly with production THE DESYNC and Results cores to prove `285000 → 360000 → boss phases → DEFEATED → VICTORY result` without changing production state or balance.
- **Layer C — focused browser integration:** existing bounded CR-3B, CR-3C, CR-3D and CR-3E.1 browser qualifiers prove live boss legality/pressure, Results/reconstruction/retry/reduced-motion, and checkpoint runtime integration.
- **Layer D — final natural certification:** exactly one complete ordinary-player browser run from the beginning after Layers A/B/C are green.

A Layer A/B/C PASS is **not** a CR-3E.2 PASS. It only authorizes the final natural certification attempt on an exact reviewed head.

## Prior natural evidence retained

Run #17 (`37016309804`, head `051c95e86c56e12852fd21debf31d1f2be7288de`) naturally demonstrated all three checkpoint activations and defeats, three resolved gates, three Cores, and entry into Stage IV. That evidence is retained as route evidence, not as complete-victory qualification.

The pre-Stage-IV route is therefore treated as frozen evidence. Focused work must not retune Stage I–III gameplay merely to satisfy automation.

## Canonical run order

The final Layer D certification must observe, without injected authority:

`STAGE I → ELITE I / rewards → STAGE II → CHECKPOINT ELITE / rewards → STAGE III → ELITE II / rewards → STAGE IV → THE DESYNC → VICTORY RESULTS`.

Boundaries remain unchanged:

- `ELITE_I`: `80000 ms` director progress;
- `CHECKPOINT_ELITE`: `180000 ms`;
- `ELITE_II`: `285000 ms`;
- THE DESYNC handoff: `360000 ms`.

## Layer B focused scenario contract

`scripts/cr3e2-stage4-boss-scenario.mjs` may call exported production core functions directly because it is a deterministic scenario qualifier, not the natural browser proof. It must prove:

1. all three checkpoints resolve in canonical order using declared checkpoint reward packages;
2. Stage IV at `359999 ms` remains boss-fail-closed;
3. exactly `360000 ms` enters `BOSS_PENDING` with all gates resolved;
4. THE DESYNC starts in `ALIGNMENT`;
5. legal phase-matching weapon damage reaches `CROSS_SPLIT`;
6. legal phase-matching weapon damage reaches `BREAK_WINDOW`;
7. a correct SHIFT response opens BREAK;
8. legal BREAK damage records one defeat;
9. post-defeat damage is rejected as `BOSS_DEFEATED` and cannot fabricate a second defeat;
10. the production Results core recognizes `VICTORY`, positive HP, boss `DEFEATED`, one terminal pause event, three elite defeats and a valid `CR3D-*` fingerprint.

This scenario must not modify any file under `games/rare-shift`.

## Layer C focused browser contract

The exact focused head must pass the inherited bounded browser qualifiers:

- `test:cr-3b-browser` — boss legality and real runtime phase interaction;
- `test:cr-3c-browser` — boss pressure integration;
- `test:cr-3d-browser` — Victory Results, fingerprint, reconstruction A/B, Run Again, failure Results and 390px Reduce motion;
- `test:cr-3e1-browser` — checkpoint runtime integration.

Controlled fixture operations already owned by those inherited qualifiers remain limited to Layer C and **do not count as natural-run evidence**.

## Layer D natural driver authority

The final natural driver may only behave like a player and observer. It may:

- move with normal movement inputs;
- SHIFT with normal player input;
- choose a currently rendered legal draft card;
- read published canvas diagnostics;
- take screenshots and assert observable results.

It must not:

- write HP, XP, level, damage, cooldowns, enemy HP, boss HP, checkpoint state, timers, rewards, weapon ranks, Protocols, Evolution state, or director progress;
- invoke internal scene methods to fabricate progression, kills, rewards, boss phases, or victory;
- set controlled CR-3B/CR-3D fixture flags during Layer D;
- tune gameplay constants to help the driver pass.

## Final natural evidence required

For desktop `960 px` and narrow `390 px`/Reduce motion:

1. CR-3E.1 runtime reports `ACTIVE`.
2. All three checkpoint gates activate in exact order at their exact boundaries.
3. THE DESYNC remains fail-closed before all three gates resolve and before `360000 ms`.
4. Final resolved gates are exactly `ELITE_I,CHECKPOINT_ELITE,ELITE_II`.
5. At least three natural checkpoint elite defeats and at least one natural Evolution Core are recorded.
6. Stage IV is naturally reached.
7. Boss handoff occurs only after all gates and `360000 ms`.
8. THE DESYNC naturally exposes ALIGNMENT, CROSS_SPLIT and BREAK_WINDOW.
9. Production auto-fire records accepted legal boss damage.
10. Exactly one boss defeat event is recorded.
11. Genuine `VICTORY` Results appear with positive final HP, one terminal pause event and valid CR-3D fingerprint.
12. Reconstruction A/B render.
13. RUN AGAIN restores a live run with HP 100 and `dead=false`.
14. 390px keeps Reduce motion enabled throughout.

## Regression and exit rule

The final Layer D head must additionally pass all inherited deterministic, TypeScript, FriendSDK and browser regression gates, including the separately qualified B5 browser-driver ordering repair.

Passing Layers A/B/C does **not** authorize CR-3 closeout. Only a final Layer D natural complete-victory PASS may mark CR-3E.2 qualified. After that, perform the CR-3 closeout audit and stop for Owner review. No merge, deployment, or CR-4 transition is authorized by this document.
