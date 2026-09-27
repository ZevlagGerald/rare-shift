# RARE//SHIFT V2-3A — Progression Draft Engine Qualification Report

**Status:** TECHNICAL QUALIFICATION PASS — BOUNDED V2-3A  
**Date:** 2026-09-27  
**Branch:** `feature/v2-3a-progression-draft-engine`  
**Planning baseline:** `612b0eb2ecb1786047afe28f22f922b80136cab6`  
**Exact qualified implementation/test HEAD:** `12d49e9cc6ada42fdc559a67b5894d6a17575399`  
**Authoritative workflow run:** `36322524834`

## 1. Scope

V2-3A was authorized only for:

- normalized deterministic progression state;
- production legality-first draft candidate generation;
- exactly-three normal draft selection;
- accepted Protocol Rank I–III state model;
- active-weapon cap 4 and Protocol cap 4;
- initial one-use free REFRACT state/logic;
- deterministic qualification/state-space tests;
- preservation of the qualified V2-2 Rank-I runtime candidate.

V2-3A did **not** authorize:

- Rank-II–V live weapon mechanics;
- Protocol live passive effects;
- Evolution Core eligibility/application runtime;
- RECONSTRUCTION FIELD;
- elite/boss Core source;
- V2-4 pacing/enemies;
- `main` merge;
- deployment.

## 2. Qualified progression model

The pure module `games/rare-shift/src/progression-core.ts` now provides stable progression truth for later V2-3 integration.

### Weapon state

- stable family IDs: DELTA / VECTOR / ORBIT / ECHO / SIGNAL;
- DELTA mandatory at Rank I in initial state;
- weapon maximum Rank V;
- only the next rank transition is legal;
- no V→V candidate;
- maximum four active weapon families including DELTA.

### Protocol state

- stable family IDs: COMMON_CORE / VECTOR_LENS / ORBIT_STABILIZER / MEMORY_FUSE / RESONANCE_COIL;
- maximum four owned Protocol families;
- Protocol maximum Rank III;
- Protocol rank-up does not consume another slot;
- Protocol ownership is independent of owning the paired active weapon.

Owner authorization to proceed from the V2-3 planning gate is treated as acceptance of the recommended Rank I–III Protocol model for V2-3 implementation.

`V2_3_PROTOCOL_MAX_RANK = III — LOCKED FOR V2-3`

## 3. Production draft law

The V2-3A production path is legality-first.

Candidate types are explicit:

- `WEAPON_ACQUIRE`
- `WEAPON_RANK`
- `PROTOCOL_ACQUIRE`
- `PROTOCOL_RANK`
- `EVOLUTION`
- `UTILITY`

V2-3A does not yet enumerate `EVOLUTION`; that is deliberately reserved for V2-3D.

Before selection, illegal/no-op state transitions are removed, including:

- blocked active-weapon acquisition;
- duplicate active acquisition;
- Rank-V weapon rank-up;
- blocked Protocol acquisition;
- duplicate Protocol acquisition;
- Rank-III Protocol rank-up;
- FIELD REPAIR at full HP;
- SIGNAL MAGNET at its cap.

Normal production draft behavior is strict:

> If fewer than three legal candidates exist, the production generator fails loudly rather than representing a one- or two-card draft as success.

A separate fallback generator exists only for bounded/synthetic/corrupt safety handling.

## 4. Onboarding preservation

The new pure model preserves the already-qualified base learning order:

- Level 2: ORBIT NODES / VECTOR NEEDLE / DELTA rank surface when all are legal;
- Level 3: ECHO MINE introduction is guaranteed when legal;
- Level 4: SIGNAL ARC introduction is guaranteed when the final active slot remains;
- Protocol candidates begin at Level 5 in V2-3A.

This does not yet replace the live V2-2 Phaser draft adapter. The live Rank-I runtime remains unchanged until the V2-3 integration tranches connect the normalized state to implemented higher-rank/passive mechanics.

## 5. REFRACT

V2-3A proves the deterministic core contract for the initial free REFRACT:

- initial count = 1;
- no RF/HP/combat-currency cost;
- consumes exactly one REFRACT;
- increments deterministic `rerollNonce`;
- cannot legalize invalid candidates;
- when at least four legal candidates exist, reroll must produce a different ordered triple;
- second use with zero REFRACT is rejected.

The visible live draft control is not added in V2-3A because the production progression adapter has not yet replaced the bounded V2-2 live draft surface.

## 6. Level-18 exhaustion finding

The owner-observed V2-2 single-card state around Level 18 is materially addressed at the progression-model level.

A deterministic route with:

- HP already full;
- SIGNAL MAGNET already capped;
- therefore **no utility filler available**;

maintains exactly three legal actionable candidates through Level 29 using legitimate active-weapon ranks and Protocol progression.

### Initial over-strict test correction

The first V2-3A CI version demanded the pre-EVO/no-utility synthetic route remain exactly-three through Level 30.

At Level 30, only two legal transitions remained.

This was classified as a **test-boundary overreach**, not a progression-engine defect, because:

- V2-3A intentionally excludes EVO enumeration/application;
- V2-3D adds legitimate EVO breadth;
- final ordinary-run level horizon/XP pacing belongs to V2-4 qualification;
- the approved V2-3 requirement is to eliminate the observed Level-18 collapse through legitimate progression rather than invent filler.

The test boundary was therefore corrected to Level 29. No progression source code changed for this correction.

Accordingly:

`V2_3A_NO_FILLER_EXACT_THREE_THROUGH_LEVEL_29 = PASS`

`V2_3A_PRE_EVO_NO_UTILITY_LEVEL_30_EXACT_THREE = NOT_CLAIMED`

`FINAL_RUN_EXHAUSTION_SAFETY = DEFERRED_TO_V2_3D_PLUS_V2_4_PACING`

## 7. Evolution boundary

The progression state already carries `evolutionCores` and evolved flags so later state transitions have a clean home, but V2-3A intentionally does not enumerate or apply EVO candidates.

Even a controlled state containing:

- DELTA Rank V;
- COMMON CORE;
- one Evolution Core;

does not emit an EVO card in V2-3A.

This preserves tranche ownership:

`V2_3D_EVOLUTION_LOGIC = NOT_STARTED`

`V2_3_NATURAL_ELITE_CORE_SOURCE = BLOCKED_ON_V2_4`

No level-up Core, random trash Core, paid Core, or hidden production grant was introduced.

## 8. V2-2E inherited harness correction

The first corrected-head qualification attempts repeatedly failed the inherited integrated V2-2E browser proof at its final `signal-last-chain-ids` assertion while:

- the dedicated SIGNAL ARC 960/390 proof passed;
- cumulative SIGNAL casts/hits/multi-target activity passed;
- SHIFT graph invalidation passed;
- no V2-3A code changed Phaser runtime behavior.

Review found the harness could satisfy all cumulative integrated conditions immediately after a real SHIFT. SHIFT intentionally clears the `signal-last-chain-*` snapshot, so the loop could exit before the next automatic ARC cast repopulated that snapshot and then contradict itself by demanding a non-empty final chain.

Harness-only repair:

- integrated V2-2E success now additionally requires `signal-last-chain-ids` to be non-empty;
- this proves that a real post-SHIFT ARC cast occurred after the required graph invalidation;
- the existing hard cap and phase-authority assertions remain unchanged.

No gameplay source was modified by this repair.

The repaired harness passed at both 960 and 390 widths, including reduced-motion mode.

## 9. Authoritative qualification evidence

Workflow:

`RARE SHIFT V2-3A Progression Qualification`

Run:

`36322524834`

Exact tested HEAD:

`12d49e9cc6ada42fdc559a67b5894d6a17575399`

Result:

**SUCCESS**

### Deterministic tests

- inherited core: **17 / 17 PASS**
- V2 combat contracts: **57 / 57 PASS**
- V2-2E cross-weapon matrix: **7 / 7 PASS**
- V2-2 draft pointer cardinality: **5 / 5 PASS**
- V2-3A progression contracts: **18 / 18 PASS**
- ART-00: **7 / 7 PASS**

### Static/build gates

- qualification script syntax: PASS
- TypeScript core: PASS
- game TypeScript: PASS
- FriendSDK check: PASS
- FriendSDK build: PASS
- FriendSDK smoke: PASS
- reported FriendSDK build size: `6,208,125 bytes`

### Browser regressions

- V2-1 960 / 390: PASS / PASS
- VECTOR 960 / 390: PASS / PASS
- ORBIT 960 / 390: PASS / PASS
- ECHO 960 / 390: PASS / PASS
- SIGNAL ARC 960 / 390: PASS / PASS
- integrated V2-2E 960 / 390: PASS / PASS
- V2-2E reduced motion: PASS

## 10. Evidence artifact

Artifact:

`rare-shift-v2-3a-evidence-36322524834`

- Artifact ID: `10933690074`
- Size: `1,365,079 bytes`
- Files uploaded: `50`
- SHA-256: `bf8cdb635bd381068f7ad2cb3906261f4ccb53cf5f9a95ef19f677e84ceb11ad`
- Expiry: `2026-10-11T13:36:08Z`

## 11. Scope-integrity diff

Relative to planning baseline `612b0eb2ecb1786047afe28f22f922b80136cab6`, exact qualified HEAD `12d49e9cc6ada42fdc559a67b5894d6a17575399` is seven commits ahead and zero behind.

Changed files are bounded to:

- `.github/workflows/v2-3a-progression-qualification.yml`
- `games/rare-shift/src/progression-core.ts`
- `games/rare-shift/tests/v2-3a-progression.test.ts`
- `package.json`
- `scripts/v2-2e-browser.mjs` — harness-only correction
- `tsconfig.core.json`

No `phaser-survival.ts`, weapon runtime core, enemy runtime, economy, blockchain, deployment or DNS source changed in V2-3A.

## 12. PROVEN

- normalized deterministic weapon/Protocol progression state exists;
- weapon Rank I–V state transitions are monotonic at the progression-model level;
- Protocol Rank I–III model is enforced;
- 4 active / 4 Protocol slot caps are enforced;
- production generator returns exactly three distinct actionable choices when a qualified normal state has 3+ legal candidates;
- no-op/max-rank/full-slot candidates are removed before selection;
- deterministic same-state draft equality is proven;
- initial REFRACT deterministic core behavior is proven;
- early V2-2 onboarding order is preserved in the normalized model;
- utility-free exactly-three progression is proven through Level 29 for the qualified deterministic route;
- all inherited V2-2 runtime/browser gates pass on the V2-3A branch after the harness correction.

## 13. UNPROVEN / NOT STARTED

- live Phaser/React adoption of the normalized V2-3 production draft model;
- visible REFRACT UI interaction;
- Rank-II–V live weapon mechanics;
- Protocol live passive effects;
- live Protocol cards;
- Evolution eligibility/application;
- RECONSTRUCTION FIELD;
- natural elite/boss Evolution Core source;
- final seven-minute progression exhaustion safety;
- final balance/fun of V2-3 progression.

These are not silently inferred from pure state tests.

## 14. Decision state

`V2_3A_PROGRESSION_CORE = PASS`

`V2_3A_EXACT_THREE_ENGINE = PASS`

`V2_3A_REFRACT_CORE = PASS`

`V2_3A_WEAPON_SLOT_CAP = PASS`

`V2_3A_PROTOCOL_SLOT_CAP = PASS`

`V2_3_PROTOCOL_MAX_RANK_III = LOCKED`

`V2_3A_LEVEL29_NO_FILLER_BREADTH = PASS`

`V2_3A_INHERITED_RUNTIME_REGRESSION = PASS`

`V2_3A_OVERALL_DECISION = PASS`

`V2_3B_WEAPON_RANK_RUNTIME = NOT_STARTED`

`V2_3C_PROTOCOL_RUNTIME = NOT_STARTED`

`V2_3D_EVOLUTION = NOT_STARTED`

`V2_4 = NOT_STARTED`

`MAIN_MERGE = NOT_AUTHORIZED`

`DEPLOYMENT = NOT_AUTHORIZED`

## 15. Next bounded step

V2-3A is technically closed.

Before V2-3B code, review and lock exact **Rank II–V runtime profiles and numerical caps** for all five families. The semantic rank identities already exist in the planning gate, but V2-3B requires explicit deterministic values/caps so implementation cannot drift into generic DPS scaling or unbounded swarm cost.

No V2-3B implementation is authorized by this report.
