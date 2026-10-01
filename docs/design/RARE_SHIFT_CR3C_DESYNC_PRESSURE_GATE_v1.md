# RARE//SHIFT CR-3C — THE DESYNC Pressure Gate v1

**Status:** ACTIVE — bounded implementation gate  
**Project:** RARE//SHIFT  
**Branch:** `feature/cr3c-desync-pressure`  
**Base authority:** qualified CR-3B head `7b3697bc723e8f49275292c62e1b0e973e585779`  
**Owner authority:** final

## 1. Purpose

CR-3C makes THE DESYNC fight back without reopening the qualified boss legality, CR-1 director, B1–B5 enemy contracts, CR-2 progression, or Evolution mechanics.

The tranche is limited to deterministic boss pressure: readable COMMON hazards in all boss phases and bounded phase-aligned adds during CROSS-SPLIT.

## 2. In scope

- Deterministic pressure planning derived from the qualified CR-3 boss decision ordinal and attack identity.
- `COMMON_RADIAL` as a telegraphed annular hazard.
- `COMMON_LANE` as a telegraphed lane hazard.
- `BREAK_PRESSURE` as deterministic COMMON radial-or-lane pressure while the Phase-3 SHIFT tell/BREAK law remains authoritative.
- `ALIGNED_ADDS` as exactly two attempted ordinary SPLIT adds per qualifying decision, subject to a hard cap of four active boss-owned adds.
- CROSS-SPLIT adds must use existing `SPLIT_A` / `SPLIT_B` runtime contracts and ordinary corporeal phase authority.
- Hazard damage must enter through the existing live player-damage gate so inherited contact-invulnerability and Protocol behavior remain authoritative.
- Static readable telegraphs at normal and reduced-motion settings.
- Runtime diagnostics sufficient for controlled 960px and 390px browser qualification.

## 3. Explicitly held

- Optional VECTOR / ORBIT / ECHO / SIGNAL direct boss-damage adapters.
- Final boss HP, cadence, hazard damage, or duration tuning.
- Victory/reconstruction/results, death/results, retry, replay, and Change Friend.
- Complete natural seeded 6-minute-to-victory proof.
- Final audio/presentation polish.
- Merge to `main` or deployment.

## 4. Non-negotiable invariants

1. `phaser-survival.ts` remains unchanged.
2. `cr3-desync-core.ts` phase, vulnerability, BREAK and defeat legality remain unchanged.
3. CR-1 stage timing and the exact 360000ms `BOSS_PENDING` handoff remain unchanged.
4. B1–B5 enemy tuning and behavior remain unchanged.
5. Boss pressure cannot bypass the existing player-damage gate.
6. A pressure action resolves at most once per boss decision ordinal.
7. Pressure is telegraphed before damage or add materialization.
8. `ALIGNED_ADDS` uses existing SPLIT contracts and never creates more than four active boss-owned adds.
9. Boss-owned hazards/adds stop creating new pressure after `DEFEATED`.
10. Reduced motion changes presentation only, not pressure timing, geometry, add count, or damage authority.
11. No numeric value is tuned merely to satisfy an automated route.

## 5. Provisional pressure profile

These values are qualification defaults, not final balance locks:

- pressure telegraph: 850 ms;
- COMMON hazard damage: 10 HP before inherited damage gating;
- radial band half-width: 32 px;
- lane half-width: 54 px;
- CROSS-SPLIT add attempt: 2 ordinary aligned SPLIT enemies;
- maximum active boss-owned adds: 4.

The structural contracts above are locked for this tranche; numeric tuning remains deferred to measured browser/Owner playtest.

## 6. Qualification gate

CR-3C is PROVEN only when an exact-head CI run demonstrates:

- CR-3A deterministic boss authority PASS;
- CR-3C deterministic pressure-core tests PASS;
- inherited CR-1/CR-2/Evolution/B1–B5 deterministic regression PASS;
- TypeScript PASS;
- FriendSDK check/build PASS;
- inherited baseline, B5 SHIFT/SIGNAL, Evolution and CR-3B browser regressions PASS;
- 960px CR-3C controlled pressure proof PASS;
- 390px/reduced-motion CR-3C controlled pressure proof PASS;
- a COMMON telegraph exists before hazard resolution;
- radial/lane geometry has exact deterministic hit boundaries;
- qualifying hazard damage reaches the existing player-damage gate exactly once;
- CROSS-SPLIT `ALIGNED_ADDS` materializes only ordinary phase-correct SPLIT adds;
- boss-owned adds remain hard-capped at four active enemies;
- BREAK pressure remains active without bypassing the existing correct-SHIFT BREAK law;
- no new boss pressure resolves after terminal defeat.
