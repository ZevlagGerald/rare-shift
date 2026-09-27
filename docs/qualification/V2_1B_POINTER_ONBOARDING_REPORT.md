# RARE//SHIFT V2-1B — POINTER / ONBOARDING REPAIR REPORT

**Status:** AUTOMATED PASS — OWNER MANUAL GATE OPEN  
**Branch:** `feature/v2-1a-combat-readability-fx`  
**Qualified implementation head:** `26a902a0a0e1eeddb6c9391366d79c5ddbc18f64`  
**Workflow run:** `36294867184`  
**Artifact:** `10923537440`  
**Artifact digest:** `sha256:949f67ab764864a3ac92ed8b0f06a3aea36cdb2812d152cf241d653e0d6f5b0b`

## Proven repairs

1. **Real pointer/touch draft selection**
   - FriendSDK-host pointer coordinates are normalized back into the 960×640 game space.
   - Card hit regions map to the three visible draft cards.
   - Browser qualification now selects DELTA BURST using a real canvas pointer click rather than keyboard `1–3`.
   - The test proves the draft closes, controls restore, and DELTA Rank II applies at both 960 and 390 widths.

2. **Contextual first-run teaching**
   - `AUTO-FIRE`: explains that the Friend attacks automatically and that solid enemies are damageable while faint enemies are ghosted.
   - `SHIFT PHASE`: explains that mismatched split enemies cannot be damaged and that SPACE / SHIFT rewrites corporeal phase.
   - `COLLECT SIGNAL XP`: explains progression pickup behavior.
   - `LEVEL UP`: explicitly tells the player to click/tap a card or use keys 1–3.
   - `BUILD YOUR RUN`: explains DELTA BURST rank growth while preserving canonical geometry.

3. **Deterministic teaching spawns**
   - Spawn 0 is always `TRACE`, ensuring auto-fire can be observed against an always-corporeal target.
   - Spawn 1 is always `SPLIT_A`; the run begins in Phase B, so the second lesson visibly demonstrates why SHIFT exists.
   - Normal deterministic weighted spawning resumes from spawn 2 onward.

4. **Narrow-host readability**
   - Tutorial banner uses responsive `clamp()` sizing and no longer obscures the three draft cards in the 390-width evidence.
   - The guide remains pointer-transparent so it cannot block card/touch interaction.

## Regression evidence

Workflow `36294867184` completed successfully:

- FriendSDK v0.1.2 archive verification — PASS
- dependency install — PASS
- qualification script syntax — PASS
- inherited deterministic core tests — PASS
- V2 combat deterministic contracts — PASS
- V2-ART-00 regression — PASS
- TypeScript — PASS
- FriendSDK check/build/smoke — PASS
- 960 browser survival qualification — PASS
- 390 browser survival qualification — PASS
- pointer-selected DELTA upgrade — PASS
- artifact upload — PASS

## Decision state

`V2_1B_POINTER_SELECTION=PASS`

`V2_1B_ONBOARDING_STRUCTURE=PASS`

`V2_1B_FIRST_TRACE_LESSON=PASS`

`V2_1B_FIRST_PHASE_LESSON=PASS`

`V2_1B_960=PASS`

`V2_1B_390=PASS`

`V2_1B_OWNER_MANUAL_FUN_GATE=OPEN`

`V2_1B_OVERALL=NOT CLOSED`

V2-2 remains unauthorized until owner manual review confirms that clicking/tapping cards works in the real local preview and that the first combat minute is understandable without external explanation.
