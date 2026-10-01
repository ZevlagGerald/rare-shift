# RARE//SHIFT CR-3E COMPLETE RUN QUALIFICATION GATE v1

**Status:** IMPLEMENTATION CANDIDATE — OWNER AUTHORIZED
**Branch:** `feature/cr3e-complete-run`
**Base:** qualified CR-3D `52b1ad048f642b7e3e00bd3f3d19ced23e597f9e`
**Scope:** qualification only; no production gameplay tuning

## 1. Purpose

CR-3E closes the remaining CR-3 governance evidence that cannot be satisfied by controlled boss fixtures alone:

- one seeded ordinary run reaches THE DESYNC through the real finite Survival Director;
- the same ordinary run defeats THE DESYNC using only legal player inputs;
- victory produces the qualified CR-3D reconstruction/results lifecycle;
- a separate ordinary run reaches death without injected damage and proves immediate retry.

CR-3E does not change boss HP, stage timing, enemy tuning, weapon power, draft odds, Core rewards, Evolution rules, or CR-3A/CR-3C structural contracts.

## 2. Natural-run hard boundary

The CR-3E natural browser proof MUST NOT:

- write Phaser scene fields;
- call Phaser combat methods directly;
- set player position directly;
- set or advance `elapsedActiveMs`;
- set HP, XP, level, kills, ranks, Protocols, Cores, pickups, checkpoints, boss HP, boss phase, or BREAK state;
- write canvas diagnostics;
- enable the CR-3B or CR-3D controlled qualification flags;
- fabricate an attack, SHIFT, pickup, checkpoint reward, or result.

Permitted automation is limited to what a player can do:

- keyboard movement;
- normal SHIFT input;
- normal draft-card selection;
- waiting while automatic weapons execute their production cadence;
- reading deterministic diagnostics that mirror already-visible game state so the test driver can make repeatable input decisions.

Using deterministic boss-pressure planning in the driver is equivalent to reading the rendered telegraph; it does not mutate runtime state.

## 3. Seeded natural victory contract

The proof begins at the normal Friend scan/calibration surface and must observe, without time injection:

1. `STAGE_I`;
2. `STAGE_II`;
3. `STAGE_III`;
4. `STAGE_IV`;
5. the real `BOSS_PENDING` handoff at or after 360,000 active milliseconds;
6. `ELITE_I`, `CHECKPOINT_ELITE`, and `ELITE_II` spawn history;
7. repeated legal SHIFT use;
8. THE DESYNC `ALIGNMENT`;
9. THE DESYNC `CROSS_SPLIT`;
10. THE DESYNC `BREAK_WINDOW`;
11. at least one accepted BREAK-response SHIFT;
12. accepted legal boss weapon damage;
13. resolved boss pressure while the player remains alive;
14. THE DESYNC defeat;
15. CR-3D victory results with exactly one terminal pause;
16. canonical A/B reconstruction matching the run-start Friend evidence.

The driver may select legal upgrades strategically. It may not alter draft generation or runtime state to force those choices.

## 4. Seeded natural death/retry contract

A second ordinary run must:

- enter survival normally;
- receive only ordinary combat damage;
- use no direct damage injection;
- reach the CR-3D failure-results screen with final HP zero;
- record non-zero accepted damage;
- stop terminal simulation exactly once;
- use `RUN AGAIN`;
- mount a fresh run with full starting HP, `dead=false`, and a near-zero ordinary run clock.

A deliberately poor player strategy is permitted. The proof must not mutate scene state to cause death.

## 5. Required inherited evidence

Exact-head CI must also prove:

- CR-1 deterministic director contracts;
- CR-2 Protocol/Core/Evolution legality and accounting;
- all five weapon deterministic regressions through B5;
- Evolution continuity contracts;
- CR-3A boss state machine;
- CR-3C pressure contracts;
- CR-3D results contracts;
- TypeScript qualification;
- FriendSDK v0.1.3 check/build;
- inherited CR-3C browser pressure qualification;
- inherited CR-3D controlled terminal/results qualification.

Because CR-3E changes no production runtime file, it must not add a redundant second implementation layer.

## 6. Exit gate

CR-3E may be marked **PROVEN PASS** only when one exact branch HEAD has all of the following:

- `RARE_SHIFT_CR3E_NATURAL_WIN_960=PASS`;
- `RARE_SHIFT_CR3E_NATURAL_DEATH_RETRY_960=PASS`;
- `RARE_SHIFT_CR3E_COMPLETE_RUN_BROWSER=PASS`;
- inherited deterministic regression PASS;
- inherited CR-3C browser PASS;
- inherited CR-3D browser PASS;
- FriendSDK check/build PASS;
- no production gameplay files changed from the qualified CR-3D base.

CR-3E qualification alone does not authorize merge, deployment, CR-4, or a `FULL_GAMEPLAY_EXPERIENCE=PASS` claim.
