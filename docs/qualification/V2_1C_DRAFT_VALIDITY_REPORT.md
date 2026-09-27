# RARE//SHIFT V2-1C — DRAFT VALIDITY / MAX-RANK FILTER REPORT

**Evidence status:** TECHNICAL QUALIFICATION PASS  
**Decision status:** PROVISIONAL — GOVERNANCE RECONCILIATION OPEN  
**Scope:** V2-1C only  
**Implementation commit:** `687f5f99d967387a929ae641d900bf9aed2e3ce6`  
**Qualified branch:** `feature/v2-1a-combat-readability-fx`

## 1. Result

The V2-1C implementation fixes the proven dead-draft defect by filtering every upgrade whose application would currently be a no-op. Rank-V DELTA BURST is absent rather than disabled, FIELD REPAIR is absent at full HP, and SIGNAL MAGNET is absent at its V2-1 pickup-radius cap.

The implementation does not add V2-2 weapons, protocols, evolution, enemies, RF/economy behavior, or unrelated combat-balance changes.

## 2. Exact implementation evidence

GitHub commit:

`687f5f99d967387a929ae641d900bf9aed2e3ce6`

Commit message:

`fix(v2-1c): filter invalid draft choices`

The commit is exactly one commit ahead of reviewed parent:

`cfe768b6d5957e26b40bf7a116e16f84731ce516`

Changed files are bounded to:

- `docs/qualification/V2_1C_DRAFT_VALIDITY_PROTOCOL.md`
- `games/rare-shift/src/draft-core.ts`
- `games/rare-shift/src/phaser-survival.ts`
- `games/rare-shift/tests/v2-combat.test.ts`
- `package.json`
- `scripts/v2-1-browser.mjs`

## 3. Workflow qualification

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

## 6. Browser evidence

Pre-browser V2-1C assertions:

`RARE_SHIFT_V2_1C_MAXED_DELTA_ABSENT=PASS`

`RARE_SHIFT_V2_1C_EXHAUSTED_POOL=PASS`

960 browser:

`RARE_SHIFT_V2_1_BROWSER_960=PASS`

Final 960 state:

- HP 57;
- level 2;
- kills 4;
- shifts 5;
- DELTA Rank II;
- qualified `true`;
- dead `false`.

390 browser:

`RARE_SHIFT_V2_1_BROWSER_390=PASS`

Final 390 state:

- HP 61;
- level 2;
- kills 7;
- shifts 6;
- DELTA Rank II;
- qualified `true`;
- dead `false`.

The browser route retains the mandatory real pointer-selection path and uses the actually rendered draft IDs rather than assuming three fixed choices.

## 7. Evidence artifact

Artifact ID:

`10924127429`

Artifact name:

`rare-shift-v2-1a-evidence-36298019639`

Size:

`676,588 bytes`

SHA-256:

`9449ed1504dcfde554850326a9ec9680e1a9a088275419d6eccb300fd70f8f21`

Artifact retention expiry reported by GitHub:

`2026-10-11T05:45:10Z`

## 8. PROVEN

- The original dead DELTA V candidate-path defect is removed from the deterministic candidate builder.
- `RANK V → V` cannot be produced by a rendered DELTA card because DELTA is filtered at Rank V before rendering.
- The same validity rule covers FIELD REPAIR and SIGNAL MAGNET no-op states.
- Partial exhaustion is deterministic and exposes only actionable alternatives.
- Full exhaustion produces an empty candidate pool; the runtime auto-resolves and resumes combat instead of rendering fake/dead choices.
- Existing deterministic core, canonical geometry, ART-00, TypeScript, FriendSDK check/build/smoke and 960/390 browser qualification remain green.
- The real pointer path remains exercised by browser qualification.
- No V2-2 weapon implementation is present in this tranche.

## 9. UNPROVEN / UNKNOWN

- Owner manual playtest of a naturally reached Rank-V draft after this exact commit has not been newly recorded in this report.
- Long-run behavior after the bounded V2-1 upgrade pool becomes repeatedly exhausted has not been balanced as production progression; V2-1C only proves deterministic non-deadlocking behavior.
- Final full-game draft breadth belongs to later authorized content tranches and is not proven here.

## 10. Governance reconciliation

The master implementation baseline describes the normal level-up loop as exactly three upgrade choices. With the current bounded V2-1 pool containing only DELTA RANK, FIELD REPAIR and SIGNAL MAGNET, strict no-op filtering can leave fewer than three valid choices.

V2-1C intentionally does not invent filler power, bonuses or premature V2-2/V2-3 systems merely to preserve the count. It renders 1–3 valid choices and auto-resolves when zero remain.

Therefore:

- technical qualification of the V2-1C repair is **PASS**;
- the temporary deviation from the baseline's exactly-three presentation remains **PROVISIONAL / GOVERNANCE RECONCILIATION OPEN** until owner authority explicitly locks this bounded exception or replaces it with a reviewed valid fallback design;
- V2-2 remains **BLOCKED / NOT STARTED**.

## 11. Final tranche state

`V2_1C_IMPLEMENTATION = PASS`

`V2_1C_CI_QUALIFICATION = PASS`

`V2_1C_OWNER_MANUAL_POSTFIX_GATE = UNPROVEN`

`V2_1C_EXACT_THREE_RECONCILIATION = OPEN`

`V2_1C_OVERALL_DECISION = PROVISIONAL`

`V2_2 = NOT_STARTED`
