# RARE//SHIFT V2-2A — VECTOR NEEDLE RANK I QUALIFICATION REPORT

**Evidence status:** TECHNICAL QUALIFICATION PASS  
**Decision status:** PASS — BOUNDED V2-2A TRANCHE QUALIFIED  
**Date:** 2026-09-27  
**Qualified branch:** `feature/v2-2a-vector-needle-rank1`  
**Exact qualified HEAD:** `ca4c06a246ed0932d47d540970922a89a7fe9783`  
**Workflow run:** `36304344977`  
**Owner authorization:** V2-1C manual postfix gate waived by owner; V2-2A Rank I only authorized.  
**Main merge:** NOT AUTHORIZED  
**Production deployment:** NOT AUTHORIZED

## 1. Result

V2-2A qualifies VECTOR NEEDLE Rank I as the first additional automatic weapon family after DELTA BURST.

The qualified implementation proves that VECTOR can coexist with the existing DELTA/SHIFT survival loop while remaining mechanically dependent on phase authority:

- VECTOR acquisition is exposed through the real level-up draft;
- Rank I automatically targets only currently corporeal threats;
- target selection is deterministic;
- equal-distance targeting uses stable spawn ID rather than mutable pool order;
- VECTOR uses a hard-capped two-projectile runtime pool;
- SHIFT invalidates VECTOR target state and dissipates in-flight Rank-I shots;
- VECTOR then re-acquires from the rewritten corporeal target set and resumes firing;
- the existing V2-1 movement, DELTA, SHIFT and draft loop remains browser-qualified at both 960 and 390 widths.

No Rank II-V behavior, PRISM LANCE, ORBIT NODES, ECHO MINE, SIGNAL ARC, protocol/EVO system, new enemy/boss work, RF/economy changes, merge to `main`, or deployment is included.

## 2. Governance closeout

The owner explicitly authorized the recommended waiver path before V2-2A implementation.

The manual gate is therefore recorded as:

`V2_1C_OWNER_MANUAL_POSTFIX_GATE = WAIVED_BY_OWNER`

It is not represented as a manual PASS.

Technical V2-1C evidence remains unchanged, and the resulting closeout state is:

`V2_1C_OVERALL_DECISION = PASS_WITH_OWNER_WAIVER`

`V2_1C = CLOSED_WITH_OWNER_WAIVER`

The bounded V2-2A implementation authorization is recorded separately in:

`docs/qualification/V2_1C_OWNER_WAIVER_AND_V2_2A_AUTHORIZATION.md`

## 3. Qualified implementation

Exact qualified HEAD:

`ca4c06a246ed0932d47d540970922a89a7fe9783`

Final qualified commit message:

`test(v2-2a): fix host-frame screenshot locator`

The implementation lineage is rooted on the current-baseline V2-2A planning branch rather than the stale divergent planning lineage.

Material V2-2A files include:

- `games/rare-shift/src/vector-core.ts`;
- `games/rare-shift/src/draft-core.ts`;
- `games/rare-shift/src/phaser-survival.ts`;
- `games/rare-shift/tests/v2-combat.test.ts`;
- `scripts/v2-2a-browser.mjs`;
- `.github/workflows/v2-2a-vector-qualification.yml`;
- `package.json`;
- governance/qualification documentation.

## 4. Rank-I qualified mechanics

The qualified Rank-I profile is:

- damage: `10`;
- cooldown: `760 ms`;
- acquisition range: `560 world px`;
- projectile speed: `960 world px/s`;
- hit/arrival tolerance: `18 px`;
- penetration: `0`;
- chain: `0`;
- maximum in-flight projectiles: `2`.

Target legality requires:

- active enemy;
- corporeal under the existing `isEnemyCorporeal(kind, phase)` authority;
- within Rank-I range.

Deterministic acquisition order is:

1. minimum squared distance;
2. equal-distance tie => lower stable spawn ID.

There is no random targeting and pool-array order is not used as semantic tie-breaking.

## 5. Draft qualification

V2-2A extends the draft state with VECTOR ownership/enablement and weapon-slot state.

While VECTOR is unowned and a slot is available, this bounded tranche guarantees VECTOR appears in the normal three-card discovery draft. The remaining choices are deterministic and actionable.

After acquisition:

- VECTOR is owned at Rank I;
- the acquisition card is no longer legal;
- duplicate direct application throws;
- no VECTOR Rank II card exists in V2-2A.

The legacy V2-1 draft behavior remains unchanged when VECTOR is not enabled, preserving the previously locked bounded 3/2/1/0 V2-1 safety exception.

## 6. Deterministic test evidence

Workflow run:

`36304344977`

Inherited deterministic core:

`17 / 17 PASS`

Expanded V2 combat deterministic contracts:

`18 / 18 PASS`

VECTOR-specific contracts that passed include:

- exact Rank-I profile and hard cap;
- TRACE targetable in A and B;
- SPLIT_A targetable only in A;
- SPLIT_B targetable only in B;
- inactive/out-of-range candidates rejected;
- nearest legal target selection;
- stable lower-spawn-ID tie break independent of input-array order;
- phase rewrite changes valid acquisition;
- discovery draft includes one actionable VECTOR acquisition;
- duplicate acquisition rejected;
- disabled/full-slot acquisition rejected.

Existing V2 contracts also remained green, including canonical DELTA geometry, normalized DELTA power, deterministic spawns, XP thresholds, max-rank DELTA filtering, utility no-op filtering, and exhausted-pool safety.

## 7. Visual / ART regression

V2 ART-00 deterministic tests:

`7 / 7 PASS`

Static/motion proof:

`PASS`

960 ART browser viewport:

`PASS`

390 ART browser viewport:

`PASS`

Reduced-motion ART proof remained green.

VECTOR uses a restrained reticle/needle presentation and does not replace canonical DELTA mask geometry.

## 8. TypeScript / FriendSDK evidence

TypeScript core qualification:

`PASS`

Game TypeScript qualification:

`PASS`

FriendSDK v0.1.2 archive verification:

`PASS`

`friendsdk check`:

`PASS`

Reported build size:

`6,184,184 bytes`

`friendsdk build`:

`PASS`

960 FriendSDK smoke:

`PASS`

## 9. V2-1 regression browser evidence

The exact V2-2A qualified HEAD retained the inherited V2-1 browser proof.

960 final observed state:

- HP `52`;
- level `2`;
- XP `5`;
- kills `9`;
- shifts `6`;
- DELTA Rank `II`;
- phase `B`;
- qualified `true`;
- dead `false`.

Result:

`RARE_SHIFT_V2_1_BROWSER_960 = PASS`

390 final observed state:

- HP `58`;
- level `2`;
- XP `4`;
- kills `8`;
- shifts `6`;
- DELTA Rank `II`;
- phase `B`;
- qualified `true`;
- dead `false`.

Result:

`RARE_SHIFT_V2_1_BROWSER_390 = PASS`

This proves the new weapon tranche did not regress the already-qualified bounded V2-1 browser interaction.

## 10. V2-2A browser evidence

The dedicated browser route exercised real gameplay at both required viewport classes.

It required:

- entering Signal Descent;
- naturally reaching a real level-up draft;
- exactly three distinct actionable choices in the discovery draft;
- `VECTOR_NEEDLE` present;
- selecting VECTOR through the supported rendered-card pointer path;
- combat resuming;
- VECTOR becoming owned;
- automatic VECTOR shot and hit evidence;
- in-flight count remaining `<= 2`;
- real SHIFT;
- VECTOR shift invalidation counter increasing;
- post-SHIFT re-acquisition;
- post-SHIFT firing resuming;
- player remaining alive.

Results:

`RARE_SHIFT_V2_2A_VECTOR_960 = PASS`

`RARE_SHIFT_V2_2A_VECTOR_390 = PASS`

The browser proof is therefore stronger than a pure targeting-unit test: acquisition, firing, impact, phase invalidation and re-acquisition were exercised through the shipped Phaser/FriendSDK runtime.

## 11. Initial failed run and bounded repair

The first V2-2A workflow run (`36304050028`) failed only in the new VECTOR browser harness after all earlier gates had passed.

Root cause:

- the script attempted to screenshot `.rf-game-frame` through the game iframe locator;
- `.rf-game-frame` is a host-level element outside that iframe;
- the locator therefore waited until timeout.

No runtime/gameplay failure was established by that run.

The bounded repair changed the screenshot locator to the same host-page pattern used by the existing proven browser harness. No gameplay source was changed by the repair.

The repaired exact HEAD `ca4c06a246ed0932d47d540970922a89a7fe9783` then passed the entire qualification workflow.

## 12. Evidence artifact

Artifact name:

`rare-shift-v2-2a-evidence-36304344977`

Artifact ID:

`10926722136`

Size:

`816,031 bytes`

SHA-256:

`fee43d8768434ba9900d3132399b2a9e56f363bf1f89f25b2e785f26ce45ec0d`

Retention expiry:

`2026-10-11T07:53:08Z`

The artifact contains 26 evidence files including browser screenshots generated by the regression and V2-2A qualification routes.

## 13. PROVEN

- V2-1C is closed by explicit owner waiver, not by fabricated manual PASS.
- VECTOR Rank I deterministic targeting core works under the specified phase law.
- Stable spawn IDs are retained for target tie-breaking.
- VECTOR acquisition is a real draft choice and cannot be duplicated.
- Rank-I auto-fire works in the real browser runtime.
- Rank-I projectile count is hard-capped at two.
- SHIFT invalidates VECTOR state and Rank-I in-flight shots.
- VECTOR re-acquires and resumes firing after SHIFT.
- Both 960 and 390 dedicated browser paths pass.
- Existing V2-1 browser behavior remains qualified at both widths.
- Existing DELTA canonical geometry tests remain green.
- ART-00, TypeScript, FriendSDK check/build/smoke remain green.
- No Rank II-V / PRISM LANCE / ORBIT / ECHO / SIGNAL ARC / protocol / EVO content is part of this tranche.

## 14. UNPROVEN / DEFERRED

V2-2A does not prove or authorize:

- final seven-minute balance;
- final VECTOR numerical tuning across full progression;
- Rank II-V behavior;
- PRISM LANCE;
- elite/boss priority behavior;
- long-run multi-weapon balance;
- ORBIT NODES;
- ECHO MINE;
- SIGNAL ARC;
- protocols/EVO;
- final SHIFT commitment-window tuning;
- production deployment;
- merge to `main`.

The V2-2A browser proof establishes functional phase-responsive Rank-I behavior, not final endgame balance.

## 15. Final tranche state

`V2_1C_OWNER_MANUAL_POSTFIX_GATE = WAIVED_BY_OWNER`

`V2_1C_OVERALL_DECISION = PASS_WITH_OWNER_WAIVER`

`V2_1C = CLOSED_WITH_OWNER_WAIVER`

`V2_2A_VECTOR_CORE = PASS`

`V2_2A_DRAFT_ACQUISITION = PASS`

`V2_2A_RUNTIME = PASS`

`V2_2A_DETERMINISTIC_TESTS = PASS`

`V2_2A_V2_1_REGRESSION = PASS`

`V2_2A_BROWSER_960 = PASS`

`V2_2A_BROWSER_390 = PASS`

`V2_2A_CI_QUALIFICATION = PASS`

`V2_2A_OVERALL_DECISION = PASS`

`V2_2B_ORBIT_NODES = NOT_STARTED`

`MAIN_MERGE = NOT_AUTHORIZED`

`PRODUCTION_DEPLOY = NOT_AUTHORIZED`

## 16. Recommended next gate

Do not immediately implement ORBIT NODES in the same patch.

The next bounded action should be a review of this V2-2A evidence followed by a V2-2B ORBIT NODES Rank-I qualification protocol, preserving the weapon-role separation contract before any ORBIT code is introduced.
