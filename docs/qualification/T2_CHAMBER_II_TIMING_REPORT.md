# RARE//SHIFT — T2 CHAMBER II / TIMING Qualification Report

**Status:** AUTOMATED QUALIFICATION PASS — NINE-FAMILY T2 CORPUS OPEN  
**Qualified implementation commit:** `0aaec2604c03f22388c0c188ba820a32e08c3017`  
**Base:** T1 qualified closeout `dac2c405ad18a3f91a31c4764f79328aaef2e1cb`  
**FriendSDK:** v0.1.2  
**Engine:** Phaser 4.2.1

## Decision

The bounded T2 implementation is automated-qualified for the intended **SCAN → CHAMBER I / DISCOVER → explicit transition → CHAMBER II / TIMING** sequence.

T2 introduces one new mechanic only: **PHASE PULSE**. A timed shutter is passable only when the selected Friend is in the matching canonical phase and the pulse clock is in that phase's matching OPEN segment.

This report does **not** yet mark T2 fully qualified. The protocol requires the Chamber II generator and time-expanded solver to pass the canonical nine-family real-Friend corpus before the real-holder T2 gate.

This report does not authorize Chamber III, reconstruction, economy, contracts, backend systems, selector-threshold changes, or other scope expansion.

## Mechanics implemented

The deterministic pulse cycle is:

1. `TELEGRAPH_A`
2. `OPEN_A`
3. `TELEGRAPH_B`
4. `OPEN_B`
5. repeat

Global pulse segment duration is currently `1200 ms`, identical for every Friend.

### A shutter

Passable only under:

- canonical phase `A`; and
- pulse state `OPEN_A`.

### B shutter

Passable only under:

- canonical phase `B`; and
- pulse state `OPEN_B`.

A failed crossing is non-lethal. The player remains in the safe staging area and receives an explicit `PHASE` or `TIMING` block explanation.

## Deterministic architecture

T2 added pure deterministic modules rather than placing timing authority in Phaser side effects:

- `timing-core.ts`
  - deterministic pulse profile;
  - deterministic active-time pulse segment;
  - canonical A_ONLY/B_ONLY shutter-source selection;
  - deterministic Chamber II timing fingerprint;
  - phase + timing passability;
  - active-time clock with pause semantics.
- `timing-solver.ts`
  - time-expanded state `(x, y, phase, pulseSegment)`;
  - movement, SHIFT, and WAIT transitions;
  - bounded reachability;
  - minimum SHIFT proof;
  - no-SHIFT reachability check.
- `phaser-timing.ts`
  - visual presentation/input only;
  - explicit Phase/Pulse HUD;
  - distinct A/B shutter patterns as non-color cues;
  - reduced-motion compatibility;
  - SDK pause freezes the timing clock.

The T0/T0.5 frame selector, scoring formula, qualification thresholds, same-clip-first policy, cross-clip fallback policy, and Chamber I solver/topology were not changed.

## Core qualification

Final CI proves eight deterministic core tests PASS:

1. exact canonical phase-field classification;
2. deterministic same-clip frame-pair selection;
3. Chamber I deterministic two-SHIFT invariant;
4. Chamber I invariant across 128 synthetic frame pairs;
5. deterministic PHASE PULSE sequence and pause freeze;
6. deterministic Chamber II generation with canonical source-class correctness;
7. independent PHASE vs TIMING shutter authority;
8. time-expanded Chamber II bounded completion with exactly two required SHIFTs and WAIT support.

Both core TypeScript and game TypeScript checks pass.

## Browser authority proof

The browser qualifier runs the full sequence at both 960px and 390px.

For each timed shutter it proves all three required cases:

- **wrong canonical phase + matching OPEN window => BLOCK**;
- **correct canonical phase + closed/telegraph window => BLOCK**;
- **correct canonical phase + matching OPEN window => PASS**.

The automated fixture then completes Chamber II with exactly two accepted SHIFTs.

The test-only pulse override is restricted to local test hosts (`localhost`, `127.0.0.1`, `::1`) so automated qualification can place the chamber at exact pulse boundaries without race-prone sleeps. Production behavior continues to use the deterministic active-time clock.

## Final automated evidence

GitHub Actions run: `36245753574`  
Head: `0aaec2604c03f22388c0c188ba820a32e08c3017`  
Evidence artifact: `rare-shift-browser-evidence-36245753574`  
Artifact ID: `10907496882`  
Artifact ZIP digest: `sha256:1ca76c86a55144d366801d54bb1763bc1f123907451efa01c52455590e804bea`

All workflow stages PASS:

- FriendSDK archive SHA verification;
- T0.5/T2 corpus-reader syntax;
- deterministic core tests `8/8`;
- core TypeScript;
- game TypeScript;
- `friendsdk check`;
- `friendsdk build`;
- canonical FriendSDK smoke;
- full T2 browser flow at 960px;
- full T2 browser flow at 390px;
- screenshot evidence verification.

Final screenshot SHA-256 values:

- FriendSDK smoke / SCAN 960: `9ddae53c907f66eabc1e7ee54a0eb119705a7dc27e2d1737d2bf6764310747e0`;
- T2 SCAN 960: `9ddae53c907f66eabc1e7ee54a0eb119705a7dc27e2d1737d2bf6764310747e0`;
- T2 SCAN 390: `a75682c3fe05d4a12259fbbfb17865695282caa2f4c587d6479992d55de014c7`;
- Chamber I → II transition 960: `8146dc84896584bd922477fb9c64132921c351b6a0ca1d90e7c5c06c37192d41`;
- Chamber I → II transition 390: `cc661dbb141627f90d39d934ad4fd69b56c2db0c04e176e0f2d14dda0791d093`;
- Chamber II complete 960: `27c3070267ba44710748f3810c72b81c321e9c8140178023397e4b8e7163039c`;
- Chamber II complete 390: `366afff0a4337698709a87df2e1c0d29837c74a360179a340835a442e1cd1190`.

## Visual review

The evidence screenshots were manually reviewed rather than accepting only CI exit codes.

### SCAN

PASS. The qualified T1 SCAN remains unchanged and readable at 960px and inside the narrow FriendSDK host.

### Chamber I → Chamber II transition

PASS after repair. The initial narrow transition placed the CTA under FriendSDK's bottom toolbar, causing the real host toolbar to intercept pointer events. The final narrow layout reserves bottom clearance and keeps `ENTER CHAMBER II // TIMING` fully visible and clickable above SDK chrome.

### Chamber II 960

PASS after repair. The first green mechanical build placed the `PULSE` label too close to the second `PHASE / FRAME` line. The final layout separates phase, frame, pulse label, pulse indicator, canonical phase field, source diagnostics, and touch controls without overlap.

### Chamber II 390

PASS. The complete touch cluster remains above FriendSDK chrome. The phase/pulse state and canonical field remain visible, and the chamber completion state fits inside the host.

## Failure history retained

Two intermediate CI failures are intentionally recorded because they exposed real qualification issues:

1. Run `36245068096`: the browser test continued pressing movement after Chamber I had completed and React had destroyed its canvas during the explicit transition. This was a test-harness boundary race; the repair sends exactly the remaining moves to EXIT and waits for the transition.
2. Run `36245232093`: 960px passed, but the 390px FriendSDK toolbar intercepted the transition CTA. This was a real narrow-layout defect and was fixed in production CSS before acceptance.

No gameplay rule was weakened to make either test pass.

## PROVEN

- SCAN and qualified Chamber I remain intact.
- Chamber I transitions explicitly into Chamber II.
- Chamber II uses the same selected canonical pair.
- A/B shutter source pixels are canonical A_ONLY/B_ONLY authority.
- Chamber II generation is deterministic for the same canonical input.
- PHASE authority is mechanically independent from TIMING authority.
- Time-expanded solver finds bounded completion and requires exactly two SHIFTs in the qualified fixture.
- Pause behavior is deterministic in the timing core and the Phaser adapter freezes the active pulse clock when the SDK pauses the scene.
- Reduced motion does not alter timing rules.
- 960px and 390px browser flows pass.
- FriendSDK check/build/smoke remain green.
- No RF spending, backend, contract, HP/death, inventory, or persistent state was introduced.

## OPEN / UNPROVEN

- T2 canonical nine-family real-Friend corpus;
- real-holder Chamber II run with Friend `#13699`;
- physical-phone touch run;
- real-world cross-clip fallback occurrence/rate;
- Chamber III / SYNCHRONIZE;
- reconstruction finale;
- final audio/submission polish.

## Next gate

**NEXT: T2 CANONICAL NINE-FAMILY CORPUS.**

Run the read-only `npm run corpus:t2` qualifier against the already-established canonical representatives. T2 must remain blocked unless all nine families independently prove:

- deterministic Chamber II generation;
- canonical A/B shutter source authority;
- PHASE + TIMING three-way behavior;
- T2 solver PASS;
- no-SHIFT completion impossible;
- exactly two required SHIFTs;
- no family-specific cadence exception.

Only after that corpus is reviewed may the real-holder T2 playthrough be requested. Chamber III remains blocked.
