# RARE//SHIFT CR-3E.2 NATURAL COMPLETE VICTORY GATE v1

**Status:** QUALIFICATION CANDIDATE — OWNER AUTHORIZED  
**Parent:** exact qualified CR-3E.1 head `644f7900966412570d5bdd7b43b278b30b4e49de`  
**Scope:** qualification assets only; no production gameplay mutation, balance tuning, merge, or deployment authority.

## Purpose

CR-3E.1 proved the checkpoint progression repair in live production runtime through the first mandatory gate. CR-3E remains open because one independent end-to-end question is still unproven after that repair:

> Can an ordinary seeded production run naturally resolve every mandatory checkpoint, unlock THE DESYNC only after those gates are complete, defeat THE DESYNC through its real phase rules, reach the genuine victory Results stage, and restart cleanly?

This tranche answers only that question.

## Canonical run order

The qualification must observe the locked order without injecting state:

`STAGE I → ELITE I / rewards → STAGE II → CHECKPOINT ELITE / rewards → STAGE III → ELITE II / rewards → STAGE IV → THE DESYNC → VICTORY RESULTS`.

Checkpoint boundaries remain inherited and unchanged:

- `ELITE_I`: director progress `80_000 ms`;
- `CHECKPOINT_ELITE`: director progress `180_000 ms`;
- `ELITE_II`: director progress `285_000 ms`;
- THE DESYNC handoff: director progress `360_000 ms`.

## Driver authority

The browser driver may only behave like a player and observer. It may:

- move with normal movement inputs;
- SHIFT with normal player input;
- choose a currently rendered legal draft card;
- read published canvas diagnostics;
- take screenshots and assert observable results.

It must not:

- write HP, XP, level, damage, cooldowns, enemy HP, boss HP, checkpoint state, timers, rewards, weapon ranks, Protocols, Evolution state, or director progress;
- invoke internal scene methods to fabricate progression, kills, rewards, boss phases, or victory;
- set controlled CR-3B/CR-3D qualification flags that suppress CR-3E.1;
- tune gameplay constants to help the driver pass.

Checkpoint combat movement must reuse the qualified CR-3E.1 standoff principle: approach when outside the useful combat band, retreat when too close, and orbit while inside the band. This is driver behavior only.

## Required live evidence

For both desktop `960 px` and narrow `390 px`:

1. CR-3E.1 runtime reports `ACTIVE`.
2. All three checkpoint gates activate in exact order.
3. Each gate activates at its exact director boundary while retaining the preceding stage identity.
4. THE DESYNC remains fail-closed before all three gates resolve.
5. Each gate reaches resolved state only after its reward package is collected.
6. The final resolved set is exactly `ELITE_I,CHECKPOINT_ELITE,ELITE_II`.
7. At least three natural checkpoint elite defeats are recorded.
8. At least one Evolution Core is naturally acquired during the run.
9. Stage IV is naturally reached.
10. Boss handoff occurs only after the three resolved gates and `360_000 ms` director progress.
11. THE DESYNC naturally exposes ALIGNMENT, CROSS_SPLIT and BREAK_WINDOW during the winning route.
12. Production auto-fire records accepted legal boss damage.
13. The boss records exactly one defeat event.
14. Genuine `VICTORY` Results appear with `boss-result=DEFEATED`, positive final HP, one terminal pause event and a valid CR-3D fingerprint.
15. Reconstruction A/B result views render.
16. RUN AGAIN restores a live run with HP 100 and `dead=false`.
17. The 390 px run keeps Reduce motion enabled throughout.

## Regression gate

One exact head must also pass:

- CR-3E.1 deterministic checkpoint authority;
- inherited CR-1, CR-2, Evolution, B1–B5 and CR-3 deterministic suites;
- TypeScript core/game qualification;
- FriendSDK v0.1.3 integrity, check and build;
- inherited baseline browser;
- inherited B5 SHIFT/SIGNAL browser;
- inherited natural Evolution browser;
- inherited CR-3B boss legality browser;
- inherited CR-3C pressure browser;
- inherited CR-3D terminal results browser;
- inherited CR-3E.1 live checkpoint browser;
- CR-3E.2 natural complete-victory browser at 960 and 390/reduced-motion.

## Exit rule

Passing this gate qualifies the natural complete-victory evidence only. It does not authorize merge or deployment. After PASS, perform a CR-3 closeout audit against the exact qualified head and stop for Owner review.