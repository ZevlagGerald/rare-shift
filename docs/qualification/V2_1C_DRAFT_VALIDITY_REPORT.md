# RARE//SHIFT V2-1C — DRAFT VALIDITY / MAX-RANK FILTER REPORT

**Evidence status:** TECHNICAL QUALIFICATION PASS  
**Decision status:** PROVISIONAL — OWNER MANUAL POSTFIX GATE OPEN  
**Scope:** V2-1C only  
**Implementation commit:** `687f5f99d967387a929ae641d900bf9aed2e3ce6`  
**Canonical feature branch:** `feature/v2-1a-combat-readability-fx`

## 1. Result

The V2-1C implementation fixes the proven dead-draft defect by filtering every upgrade whose application would currently be a no-op. Rank-V DELTA BURST is absent rather than disabled, FIELD REPAIR is absent at full HP, and SIGNAL MAGNET is absent at its V2-1 pickup-radius cap.

The implementation does not add V2-2 weapons, protocols, evolution, enemies, RF/economy behavior, or unrelated combat-balance changes.

The later V2-2 mechanics design gate has also resolved the earlier exactly-three governance ambiguity: V2-1 may use a bounded sandbox exception that renders only the legal choices available (3/2/1) and auto-resumes at zero, while normal production-facing progression still requires exactly three actionable choices.

V2-1C is not promoted to final PASS because the owner-manual post-Rank-V observation remains unrecorded.

## 2. Exact implementation evidence

GitHub implementation commit:

`687f5f99d967387a929ae641d900bf9aed2e3ce6`

Commit message:

`fix(v2-1c): filter invalid draft choices`

Reviewed parent:

`cfe768b6d5957e26b40bf7a116e16f84731ce516`

Changed files were bounded to:

- `docs/qualification/V2_1C_DRAFT_VALIDITY_PROTOCOL.md`
- `games/rare-shift/src/draft-core.ts`
- `games/rare-shift/src/phaser-survival.ts`
- `games/rare-shift/tests/v2-combat.test.ts`
- `package.json`
- `scripts/v2-1-browser.mjs`

## 3. Authoritative implementation workflow qualification

Workflow run:

`36298019639`

Workflow:

`RARE SHIFT V2-1A Readability Qualification`

Exact qualified head:

`687f5f99d967387a929ae641d900bf9aed2e3ce6`

Final status:

`completed / success`

All workflow stages passed:

- checkout / Node / verified FriendSDK v0.1.2;
- qualification script syntax;
- inherited deterministic core tests;
- V2 combat deterministic contracts;
- V2 ART-00 regression;
- TypeScript qualification;
- FriendSDK check / build / smoke;
- 960 and 390 browser survival proof;
- evidence artifact upload.

This remains the authoritative CI qualification of the gameplay implementation.

## 4. Deterministic test evidence

Inherited deterministic core:

`17 / 17 PASS`

V2 combat deterministic contracts:

`12 / 12 PASS`

The V2-1C-specific contracts explicitly passed:

- three distinct actionable choices when all current effects are valid;
- DELTA Rank I–IV eligible;
- DELTA Rank V absent rather than disabled;
- FIELD REPAIR filtered when full HP makes it a no-op;
- SIGNAL MAGNET filtered when the pickup radius is capped;
- every rendered choice produces a real state change;
- partially exhausted pools remain deterministic and expose only valid alternatives;
- fully exhausted pool returns no dead or fake cards.

V2 ART-00 deterministic tests:

`7 / 7 PASS`

TypeScript qualification:

`PASS`

## 5. FriendSDK / build / smoke evidence

FriendSDK archive hash verification:

`PASS`

`friendsdk check`:

`PASS`

Reported build size:

`6,175,949 bytes`

`friendsdk build`:

`PASS`

960 automated FriendSDK smoke:

`PASS`

## 6. Original bounded browser evidence

Pre-browser V2-1C assertions:

`RARE_SHIFT_V2_1C_MAXED_DELTA_ABSENT=PASS`

`RARE_SHIFT_V2_1C_EXHAUSTED_POOL=PASS`

960 browser:

`RARE_SHIFT_V2_1_BROWSER_960=PASS`

390 browser:

`RARE_SHIFT_V2_1_BROWSER_390=PASS`

The bounded browser route retains the mandatory real pointer-selection path and uses the actually rendered draft IDs rather than assuming three fixed choices.

## 7. Natural Rank-V browser addendum

A separate non-gameplay qualification branch was used to strengthen browser evidence:

`qualification/v2-1c-rankv-browser`

Qualification addendum head:

`59e729e91fc4fd8751a8d402e4b46d92597ce12e`

No `games/rare-shift/**` gameplay source was changed on that qualification branch.

The exploratory browser runs proved:

- DELTA naturally advances from Rank I to Rank V in the shipped browser runtime;
- four real pointer draft selections each advanced DELTA exactly one rank;
- natural Rank V was reproduced across multiple runs;
- run `36301849773`, at head `55d38d2b70b8c613c769a733924c787838115631`, reached a genuine subsequent level-6 draft while alive after DELTA had naturally reached Rank V;
- at that rendered post-Rank-V draft, `DELTA_RANK` was absent.

Exact observed state at the strongest postfix render evidence:

- HP `13`;
- level `6`;
- XP `0`;
- kills `50`;
- shifts `26`;
- DELTA Rank `5`;
- pickup radius `76`;
- active enemies `9`;
- phase `B`;
- draft open `true`;
- qualified `true`;
- dead `false`.

That exploratory workflow did not finish green because the harness's reduced-card scaled-canvas click failed to close the draft. Later endurance variants also sometimes died before reaching the next draft. Those failures are not promoted to gameplay PASS and are not used to alter V2-1 balance.

Accordingly:

`V2_1C_AUTOMATED_NATURAL_RANK_V = PASS`

`V2_1C_AUTOMATED_POSTFIX_RENDER_FILTER = PASS`

`V2_1C_NATURAL_LONG_RUN_ACTION_GATE = UNPROVEN`

## 8. Evidence artifact

Authoritative implementation artifact ID:

`10924127429`

Artifact name:

`rare-shift-v2-1a-evidence-36298019639`

Size:

`676,588 bytes`

SHA-256:

`9449ed1504dcfde554850326a9ec9680e1a9a088275419d6eccb300fd70f8f21`

Artifact retention expiry reported by GitHub:

`2026-10-11T05:45:10Z`

## 9. PROVEN

- The original dead DELTA V candidate-path defect is removed from the deterministic candidate builder.
- `RANK V → V` cannot be produced by a rendered DELTA card because DELTA is filtered at Rank V before rendering.
- Natural browser Rank V has been reproduced through four real pointer-selected DELTA upgrades.
- A genuine post-Rank-V browser draft was observed while alive with `DELTA_RANK` absent.
- The same validity rule covers FIELD REPAIR and SIGNAL MAGNET no-op states.
- Partial exhaustion is deterministic and exposes only actionable alternatives.
- Full exhaustion produces an empty candidate pool; the V2-1 runtime auto-resolves and resumes combat instead of rendering fake/dead choices.
- Existing deterministic core, canonical geometry, ART-00, TypeScript, FriendSDK check/build/smoke and bounded 960/390 browser qualification remain green.
- No V2-2 weapon implementation is present in V2-1C.

## 10. UNPROVEN / UNKNOWN

- Owner manual playtest of the exact post-Rank-V behavior has not been recorded.
- A fully green synthetic multi-minute natural Rank-V endurance/action workflow has not been obtained and is not treated as a V2-1 acceptance requirement.
- Long-run behavior after the bounded V2-1 upgrade pool becomes repeatedly exhausted has not been balanced as production progression.
- Final full-game draft breadth belongs to later authorized content tranches.

## 11. Governance reconciliation — LOCKED bounded exception

The master implementation baseline defines the normal level-up loop as exactly three actionable upgrade choices.

The V2-2 mechanics design gate at planning commit:

`032bbeed60f521b9da4b65ff996fcb7d25067d7d`

records the owner-authorized V2-1 bounded sandbox exception:

- render 3 legal cards when 3 exist;
- render 2 when only 2 exist;
- render 1 when only 1 exists;
- render no fake/dead card when none exist;
- if the tiny V2-1 pool is fully exhausted, auto-resolve and resume combat.

This exception is V2-1-specific. It does not replace the normal competition-facing rule.

For V2-2/V2-3 and the production-facing run:

> A normal level-up draft presents exactly three actionable choices.

Real weapon/protocol/rank/EVO breadth must make that possible without filler or disabled decorative cards.

Therefore:

`V2_1C_EXACT_THREE_RECONCILIATION = LOCKED_BOUNDED_EXCEPTION`

## 12. V2-2 boundary

The V2-2 mechanics planning gate exists on:

`planning/v2-2-phase-weapon-gate`

at:

`032bbeed60f521b9da4b65ff996fcb7d25067d7d`

It is planning-only and explicitly states that V2-2 code remains blocked until V2-1C closeout is satisfied and a bounded implementation tranche is authorized.

No V2-2 implementation is authorized by this report.

## 13. Remaining owner closeout gate

The remaining owner-facing check is:

1. naturally reach DELTA BURST Rank V;
2. reach the next level-up draft;
3. confirm no `RANK V → V` DELTA card appears;
4. select any displayed remaining card and confirm it produces its stated effect;
5. confirm combat resumes normally.

Only explicit owner evidence or an explicit owner waiver may close this gate.

## 14. Final tranche state

`V2_1C_IMPLEMENTATION = PASS`

`V2_1C_CI_QUALIFICATION = PASS`

`V2_1C_EXACT_THREE_RECONCILIATION = LOCKED_BOUNDED_EXCEPTION`

`V2_1C_AUTOMATED_NATURAL_RANK_V = PASS`

`V2_1C_AUTOMATED_POSTFIX_RENDER_FILTER = PASS`

`V2_1C_NATURAL_LONG_RUN_ACTION_GATE = UNPROVEN`

`V2_1C_OWNER_MANUAL_POSTFIX_GATE = UNPROVEN`

`V2_1C_OVERALL_DECISION = PROVISIONAL`

`V2_2_PLANNING_GATE = ACTIVE`

`V2_2_IMPLEMENTATION = NOT_STARTED / BLOCKED`
