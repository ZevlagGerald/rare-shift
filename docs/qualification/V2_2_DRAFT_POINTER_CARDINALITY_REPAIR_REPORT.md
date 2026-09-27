# RARE//SHIFT V2-2 — DRAFT POINTER CARDINALITY REPAIR REPORT

**Status:** TECHNICAL QUALIFICATION PASS — OWNER LOCAL RETEST PENDING  
**Date:** 2026-09-27  
**Branch:** `fix/v2-2-draft-pointer-cardinality`  
**Source owner-review HEAD:** `f96fd66afcd01f9ef6749f787438ba5de57f742b`  
**Exact qualified repair HEAD:** `c46a3c5a8597e2ddd5aabf870f8748ffda10694a`  
**Workflow run:** `36317899823`  
**Main merge:** NOT AUTHORIZED  
**Production deployment:** NOT AUTHORIZED

## 1. Owner-observed defect

During a real localhost V2-2 owner review at approximately level 18, the bounded Rank-I progression pool exhausted to one legal choice: `FIELD_REPAIR`.

The single card rendered centered at logical canvas x=480, but pointer/tap activation did not select it.

Keyboard key `1` remained the correct direct selection path.

## 2. Root cause — PROVEN

Phaser draft layout is cardinality-aware:

- 1 card: `[480]`;
- 2 cards: `[350, 610]`;
- 3 cards: `[220, 480, 740]`.

The outer React pointer adapter was not cardinality-aware. It always interpreted the layout as `[220, 480, 740]`.

Therefore a click on the one-card center x=480 mapped to index 1 / keyboard key `2` rather than index 0 / keyboard key `1`.

With only one legal draft choice, `chooseDraft(1)` had no choice and returned without action.

## 3. Repair

Added pure mapping module:

`games/rare-shift/src/draft-pointer-core.ts`

The module defines the same 1/2/3-card center geometry used by the Phaser draft layout and maps a logical pointer coordinate plus rendered draft count to the correct zero-based draft index.

Updated:

`games/rare-shift/v2.tsx`

The React pointer adapter now reads `canvas.dataset.draftCount`, transforms the pointer into the 960x640 logical coordinate system, and delegates to the cardinality-aware mapper.

No weapon mechanics, damage, cooldown, spawn pacing, XP thresholds, slot limits, enemy rules, SHIFT authority or draft validity rules were modified.

## 4. New deterministic regression — PROVEN

Added:

`games/rare-shift/tests/draft-pointer-core.test.ts`

Five contracts pass:

1. one-card center x=480 maps to index 0;
2. two-card centers x=350/610 map to indices 0/1;
3. three-card centers x=220/480/740 map to indices 0/1/2;
4. vertical out-of-card clicks are rejected;
5. invalid cardinalities/non-finite coordinates are rejected.

`DRAFT_POINTER_CARDINALITY_REGRESSION = 5 / 5 PASS`

## 5. Full regression evidence

Dedicated workflow:

`RARE SHIFT V2-2 Draft Pointer Repair`

Run:

`36317899823`

Exact tested repair HEAD:

`c46a3c5a8597e2ddd5aabf870f8748ffda10694a`

Final rerun result:

`SUCCESS`

The exact repair HEAD passed:

- inherited deterministic core;
- V2 combat deterministic contracts;
- V2-2E cross-weapon matrix;
- new draft pointer cardinality regression;
- V2 ART-00 regression;
- TypeScript core/game;
- FriendSDK check/build/smoke;
- V2-1 browser regression;
- VECTOR browser regression;
- ORBIT browser regression;
- ECHO browser regression;
- SIGNAL ARC browser regression;
- integrated V2-2E four-slot browser regression;
- evidence upload.

## 6. First-attempt failure classification

The first attempt of workflow `36317899823` failed in the existing SIGNAL ARC 390 browser route because the natural-play avatar died before the post-SHIFT SIGNAL ARC cast.

The new pointer regression had already passed, as had TypeScript/build and inherited browser gates through ECHO.

No gameplay repair was made in response.

The exact same commit was rerun. SIGNAL ARC and V2-2E integrated qualification then passed without code changes.

Classification:

`FIRST_ATTEMPT_SIGNAL_ARC_FAILURE = LONG_RUN_HARNESS_ENDURANCE_VARIANCE`

`POINTER_REPAIR_CAUSAL_REGRESSION = NOT_INDICATED`

## 7. Evidence artifact

Artifact:

`rare-shift-v2-2-draft-pointer-repair-36317899823`

Artifact ID:

`10932030615`

Size:

`1,397,724 bytes`

SHA-256:

`ce8fe2b32c211a2231487931930407071889853b0d21f4c96919f8bd364a6f12`

Expiry:

`2026-10-11T12:21:57Z`

## 8. Decision state

`V2_2_ONE_CARD_POINTER_ROOT_CAUSE = PROVEN`

`V2_2_POINTER_CARDINALITY_REPAIR = PASS`

`V2_2_POINTER_1_CARD_MAPPING = PASS`

`V2_2_POINTER_2_CARD_MAPPING = PASS`

`V2_2_POINTER_3_CARD_MAPPING = PASS`

`V2_2_INHERITED_AUTOMATED_REGRESSION = PASS`

`V2_2_OWNER_LOCAL_ONE_CARD_RETEST = PENDING`

`V2_3 = NOT_STARTED`

`MAIN_MERGE = NOT_AUTHORIZED`

`PRODUCTION_DEPLOY = NOT_AUTHORIZED`

## 9. Owner retest

The owner should checkout `fix/v2-2-draft-pointer-cardinality`, run the game locally, and confirm that a one-card draft can be selected by clicking/tapping the centered card.

If the exact late-run one-card state is inconvenient to reproduce, keyboard key `1` remains a workaround on the older branch, but final owner confirmation should use the repaired branch.

Do not interpret the one-card state itself as final progression design. The long-run pool exhaustion remains a V2-3 progression concern; this repair addresses only pointer/tap correctness for every rendered draft cardinality.
