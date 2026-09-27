# RARE//SHIFT V2-1C — DRAFT VALIDITY / MAX-RANK FILTER PROTOCOL

**Status:** ACTIVE — OWNER-AUTHORIZED BOUNDED QUALIFICATION  
**Scope:** V2-1C only  
**Branch:** `feature/v2-1a-combat-readability-fx`

## Purpose

Remove every level-up draft choice that cannot currently produce a real state change, while preserving the qualified V2-1/V2-1A/V2-1B combat, onboarding, pointer, FriendSDK and canonical phase behavior.

## Proven defect entering this tranche

Owner manual evidence showed a Rank-V `DELTA BURST` card rendering as `RANK V → V`. The existing draft core always emitted all three IDs and merely marked maxed DELTA as disabled, while the canvas still rendered it. The same implementation also allowed `FIELD REPAIR` at full HP and `SIGNAL MAGNET` at its pickup-radius cap to become no-op choices.

## Bounded implementation rule

A draft choice is eligible only when applying it changes current run state:

- `DELTA_RANK`: eligible only when `deltaRank < 5`;
- `FIELD_REPAIR`: eligible only when `hp < maxHp`;
- `SIGNAL_MAGNET`: eligible only when `pickupRadius < 220`.

Invalid choices are filtered before rendering. They are not rendered disabled.

No new weapon, protocol, evolution, enemy, RF/economy or combat-balance system is authorized in V2-1C.

## Exhaustion policy

V2-1C does not invent filler upgrades solely to maintain three visible cards.

- When 1–3 valid choices remain, render only those actionable choices and center them deterministically.
- When zero valid choices remain, automatically resolve the level-up pause and resume combat without rendering a fake/dead card.

This creates a bounded temporary tension with the master-baseline statement that normal drafts contain exactly three choices. That baseline is not rewritten here. V2-2/V2-3 content breadth is expected to restore a sufficiently broad valid pool. Final reconciliation remains an owner/governance decision after V2-1C qualification.

## Acceptance criteria

1. DELTA Rank I–IV may appear.
2. DELTA Rank V never appears.
3. `RANK V → V` cannot be rendered.
4. Every rendered card is actionable and changes state.
5. A maxed DELTA still leaves valid alternatives when other effects are valid.
6. Multiple exhausted candidates produce only the remaining valid alternatives.
7. A fully exhausted pool auto-resolves without deadlock or fake cards.
8. Pointer/touch card selection remains functional.
9. Keyboard 1–3 remains functional for rendered indices.
10. 960 browser qualification passes.
11. 390 browser qualification passes.
12. FriendSDK, deterministic core, ART-00, TypeScript, build/smoke, onboarding, pointer bridge and phase combat remain green.
13. No unrelated combat-balance change.
14. No V2-2 weapon code.

## Evidence required

- deterministic `test:v2-combat` assertions for validity, max-rank filtering, utility no-op filtering, partial exhaustion and full exhaustion;
- browser qualification preflight proving maxed DELTA is absent from the candidate pool;
- browser runtime evidence using the actual rendered draft IDs and pointer selection;
- successful TypeScript, FriendSDK check/build/smoke and desktop/narrow browser workflow;
- post-run GitHub workflow evidence recorded before V2-1C is declared qualified.

## Decision rule

V2-1C remains **OPEN** until the implementation commit is reviewed and the complete qualification workflow succeeds. V2-2 remains blocked until V2-1C is explicitly closed.
