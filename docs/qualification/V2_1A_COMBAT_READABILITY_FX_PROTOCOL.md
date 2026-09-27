# RARE//SHIFT V2-1A — COMBAT READABILITY & SIGNATURE-FX REPAIR

**Status:** ACTIVE — BOUNDED VISUAL REPAIR  
**Branch:** `feature/v2-1a-combat-readability-fx`  
**Base:** V2-1 qualification head `10fd9637af3bd76e9cb0deb3076ff3837333575c`  
**Scope:** presentation/readability only; no gameplay balance redesign

## 1. Purpose

V2-1A addresses the manual-review defects visible in the first V2-1 combat screenshots without advancing to V2-2.

The tranche must make the existing green combat loop easier to read and more recognizably RARE//SHIFT while preserving all qualified gameplay authority.

## 2. Frozen gameplay values

V2-1A does not intentionally change:

- player speed;
- enemy HP, contact damage, or movement speed;
- spawn cadence or active-enemy cap;
- Signal XP thresholds;
- draft probabilities/order;
- DELTA BURST damage/cooldown/hit authority;
- canonical frame-pair selection;
- A/B/COMMON threat authority;
- FriendSDK wallet/Friend authority.

Any unintended change to those contracts is a regression.

## 3. Required repairs

1. Remove development/status prose from the primary combat HUD.
2. Keep Reduce Motion usable without colliding with the HUD.
3. Strengthen FRACTURE GRID sector structure without creating collision or false hazards.
4. Make TRACE, SPLIT-A, and SPLIT-B distinguishable by silhouette/structural markers, not color alone.
5. Strengthen selected Friend presentation using scale/halo only; canonical pixels may not be redrawn or recolored.
6. Make DELTA BURST visibly project the exact canonical A_ONLY/B_ONLY geometry.
7. Give SHIFT a brief phase-transition signal without obscuring combat.
8. Improve draft hierarchy and render DELTA rank in Roman numerals.
9. Dim/lock joystick and SHIFT presentation while the draft is open.
10. Keep critical information clear of FriendSDK local-preview chrome at 960 and narrow layouts.

## 4. Signature-FX rules

DELTA BURST remains mechanically identical to the qualified V2-1 profile. Visual enlargement/echo may only be a rendering treatment around the same canonical point coordinates; it may not expand the actual hit calculation.

SHIFT FX may use phase rings/brief flash. It may not become a damaging effect in V2-1A.

Enemy death FX is presentation-only.

## 5. Browser evidence

Existing V2-1 browser qualification must continue to pass at 960 and 390 widths.

Additional assertions:

- `data-delta-fx="canonical-exclusive"`;
- `data-controls-dimmed="false"` during active combat;
- `data-controls-dimmed="true"` while the three-card draft is open;
- controls return to undimmed after selection;
- Reduce Motion remains operable.

## 6. Decision gate

`V2_1A_READABILITY_FX=PASS` requires:

- inherited deterministic tests PASS;
- V2 combat tests PASS;
- ART-00 regression PASS;
- TypeScript PASS;
- FriendSDK check/build/smoke PASS;
- 960 and 390 browser loop PASS;
- screenshot evidence generated;
- owner/manual visual review confirms HUD, enemy taxonomy, DELTA visibility, Friend presentation, draft hierarchy, and safe areas are materially improved.

Automation cannot close the manual fun/readability gate by itself.

## 7. Non-goals

V2-1A does not authorize:

- new weapon families;
- protocol/EVO system;
- new enemy mechanics;
- boss implementation;
- economy/RF behavior;
- multiplayer/backend;
- merge to `main`;
- deployment or Vibeathon submission.
