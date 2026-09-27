# RARE//SHIFT V2-1C — DRAFT VALIDITY / MAX-RANK FILTER REPORT

**Status:** QUALIFIED FOR BOUNDED V2-1C SCOPE  
**Branch:** `feature/v2-1c-draft-validity`  
**Qualified implementation head:** `75be0585809c13859c121ca31dc7a5900ef458db`  
**Workflow run:** `36296381399`  
**Artifact:** `10923986125`  
**Artifact digest:** `sha256:6823b25fd15293679e46e231371eebbb195777c146f0e2ba3b6a788f2c391775`

## Owner-observed defect

At Level 6, DELTA BURST had already reached Rank V but the level-up draft still rendered `DELTA BURST V / RANK V → V`. The card was intentionally disabled by the old draft core, producing a visible but unusable choice.

## Root cause

`buildV21Draft()` always returned all three V2-1 choices and represented exhausted choices with `disabled: true`. The renderer therefore faithfully displayed a dead card.

## Locked repair invariant

> Every standard card rendered by a V2-1 draft must produce a real state change if selected.

Standard eligibility is now:

- `DELTA_RANK` only while DELTA BURST is below Rank V;
- `FIELD_REPAIR` only while current HP is below maximum HP;
- `SIGNAL_MAGNET` only while pickup radius is below its standard 220px cap.

Exhausted standard choices are removed from the candidate list rather than rendered disabled.

Therefore `Rank V → V` cannot be produced by the normal draft generator.

## Exhaustion fallback

If all three bounded V2-1 standard choices are exhausted simultaneously, the draft returns exactly one `RUN BONUS` utility rather than opening an empty/dead draft.

`RUN BONUS` extends Signal XP pickup radius by 20px for that run. It exists only as an exhaustion fallback and is never inserted while a normal valid choice exists.

This fallback is a V2-1 sandbox safety mechanism; the larger V2-2 weapon/protocol pool will supersede the small three-choice pool as the game expands.

## Deterministic contracts added

The V2 combat suite now proves:

- normal useful state still yields three distinct choices;
- Rank-V DELTA is absent from the generated draft;
- selecting Rank-V DELTA directly is rejected;
- FIELD REPAIR is absent at full HP;
- SIGNAL MAGNET is absent at its standard cap;
- effectless utility application is rejected;
- a fully exhausted standard pool returns exactly one enabled RUN BONUS;
- RUN BONUS produces a real state change.

## Regression evidence

Workflow `36296381399` completed successfully:

- FriendSDK v0.1.2 archive verification — PASS
- dependency install — PASS
- qualification script syntax — PASS
- inherited deterministic core tests — PASS
- V2 combat + draft-validity contracts — PASS
- V2-ART-00 regression — PASS
- TypeScript — PASS
- FriendSDK check/build/smoke — PASS
- 960 browser survival regression — PASS
- 390 browser survival regression — PASS
- pointer-selected upgrade path — PASS
- artifact upload — PASS

No DELTA damage, cooldown, canonical geometry, enemy HP/speed, XP thresholds, phase authority, or spawn cadence was changed by V2-1C.

## Decision state

`V2_1C_MAX_DELTA_FILTER=PASS`

`V2_1C_EFFECTLESS_REPAIR_FILTER=PASS`

`V2_1C_MAX_MAGNET_FILTER=PASS`

`V2_1C_EXHAUSTION_FALLBACK=PASS`

`V2_1C_960_REGRESSION=PASS`

`V2_1C_390_REGRESSION=PASS`

`V2_1C_OVERALL=QUALIFIED`

The specific dead-card defect reported by the owner is closed. V2-2 may use this draft validity contract as its baseline when additional weapons and protocols are introduced.
