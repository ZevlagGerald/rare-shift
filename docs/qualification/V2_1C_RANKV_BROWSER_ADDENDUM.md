# RARE//SHIFT V2-1C — NATURAL RANK-V BROWSER QUALIFICATION ADDENDUM

**Status:** PARTIAL AUTOMATED EVIDENCE — OWNER MANUAL GATE REMAINS OPEN  
**Date:** 2026-09-27  
**Canonical V2-1 feature baseline:** `f8917ee5935ff1df4daf08c1cc4eb8f50ee1c426`  
**Qualification branch:** `qualification/v2-1c-rankv-browser`  
**Gameplay source mutation:** NONE  
**V2-2 implementation authorization:** NONE

## 1. Purpose

The original V2-1C qualification proved deterministic draft validity and the normal 30–60 second browser combat slice, but it did not naturally reach DELTA BURST Rank V in browser play before concluding.

This bounded qualification branch was created to obtain stronger browser evidence without mutating gameplay:

1. naturally earn Signal XP through the shipped combat runtime;
2. select DELTA BURST by pointer four times, Rank I → II → III → IV → V;
3. continue until a subsequent genuine level-up draft appears;
4. verify the rendered post-Rank-V draft does not contain `DELTA_RANK`;
5. verify remaining choices remain legal/actionable.

The branch changes only qualification workflow/script material plus this report. It does not modify `games/rare-shift/**` gameplay source.

## 2. Existing canonical evidence remains authoritative

The previously qualified implementation remains:

`687f5f99d967387a929ae641d900bf9aed2e3ce6`

Original successful workflow:

`36298019639`

That workflow remains the authoritative V2-1C implementation qualification:

- inherited deterministic core: `17 / 17 PASS`;
- V2 combat contracts: `12 / 12 PASS`;
- V2 ART-00: `7 / 7 PASS`;
- TypeScript: PASS;
- FriendSDK check/build/smoke: PASS;
- 960 browser V2-1 slice: PASS;
- 390 browser V2-1 slice: PASS.

Nothing in this addendum supersedes that successful bounded qualification.

## 3. Exploratory natural-Rank-V browser runs

The qualification harness was iterated only on the separate qualification branch. No iteration changed gameplay.

### Run `36301223682` — first natural Rank-V route

Head:

`656a49a821920481eca9a5efcc1beba208a5d36f`

Result:

- all inherited tests and original V2-1 browser checks passed;
- DELTA was selected by pointer four times;
- natural Rank V was reached;
- `RARE_SHIFT_V2_1C_NATURAL_RANK_V=PASS` was emitted;
- the long route later died before the next level-up draft.

Observed terminal state before failure:

- level `5`;
- XP `7`;
- kills `41`;
- shifts `19`;
- DELTA Rank `V`;
- HP `0`.

Interpretation:

Natural Rank V was browser-proven. The failure was the extended endurance route, not the rank filter or bounded V2-1 regression suite.

### Run `36301468179` — over-evasive route

Head:

`4875e55a5b3cf9ed70e2a7d3b0482ecf45a3b41c`

Result:

- inherited tests and original browser slice remained green;
- the revised route survived but stayed too far from threats;
- it earned insufficient kills/XP and therefore did not exercise the intended draft path.

Interpretation:

This run demonstrated a harness-design failure: making the route maximally evasive invalidated the qualification objective.

### Run `36301849773` — strongest postfix render evidence

Head:

`55d38d2b70b8c613c769a733924c787838115631`

Result:

- inherited tests and original browser slice remained green;
- four pointer selections naturally advanced DELTA from Rank I to Rank V;
- natural Rank V was reached;
- the runtime subsequently reached a genuine level-up draft while still alive;
- all post-Rank-V pre-selection assertions passed, including the assertion that `DELTA_RANK` was absent from the rendered draft.

Exact observed post-Rank-V draft state:

- HP `13`;
- level `6`;
- XP `0`;
- kills `50`;
- shifts `26`;
- DELTA Rank `5`;
- pickup radius `76`;
- active enemies `9`;
- phase `B`;
- draft open `true`;
- qualified `true`;
- dead `false`.

The run failed only when the harness attempted to select a reduced-card draft using a scaled-canvas pointer coordinate. The draft remained open after that click.

Interpretation:

This run is direct browser evidence that a naturally maxed DELTA does not render a dead `RANK V → V` card in the next real level-up draft.

It does not prove that the final postfix selection completed through that particular pointer coordinate.

### Run `36302099496` — keyboard-path revision

Head:

`3b33e980c4097229e2b04cff891013b932a8abcc`

Result:

- inherited tests and original browser slice remained green;
- natural Rank V was again reached;
- this particular endurance route died at level 5 before the next draft.

Interpretation:

The browser outcome after Rank V remains sensitive to a long-run movement route that the V2-1 learning slice was never balanced to qualify.

### Run `36302367255` — perimeter endurance experiment

Head:

`799a9175dfca2d9e265b4187578aa5e9cb67293c`

Result:

All canonical bounded checks remained green before the exploratory long-run step:

- inherited deterministic core: PASS;
- V2 combat contracts: PASS;
- V2 ART-00 regression: PASS;
- TypeScript: PASS;
- FriendSDK check/build/smoke: PASS;
- normal 960 V2-1 browser slice: PASS;
- normal 390 V2-1 browser slice: PASS.

The natural Rank-V route again selected DELTA four times and emitted:

`RARE_SHIFT_V2_1C_NATURAL_RANK_V=PASS`

Observed Rank-V progression included:

- Rank II selected;
- Rank III selected;
- Rank IV selected;
- Rank V selected;
- Rank V reached naturally while alive.

The perimeter extension then died before level 6.

Observed late state:

- HP `3`;
- level `5`;
- XP `1`;
- kills `35`;
- shifts `26`;
- DELTA Rank `5`;
- dead `false` at that snapshot;

followed shortly by death before the postfix draft.

Interpretation:

The long-run qualifier remains coupled to endurance behavior outside the original bounded V2-1 qualification target. Changing combat balance merely to make this synthetic extension survive would exceed V2-1C scope.

## 4. PROVEN

### Canonical implementation / bounded slice

- V2-1C deterministic draft validity remains qualified by the original successful workflow.
- Rank-V DELTA is filtered by the deterministic candidate builder.
- Full-HP FIELD REPAIR is filtered.
- Capped SIGNAL MAGNET is filtered.
- Every rendered deterministic choice changes state.
- The original 960 and 390 browser combat slices remain green throughout these exploratory qualification runs.
- No gameplay regression was introduced by this qualification branch because no gameplay source was changed.

### Stronger browser evidence added by this branch

- DELTA can be advanced naturally from Rank I to Rank V in the real browser runtime.
- Four distinct pointer draft selections were observed to advance DELTA exactly one rank each.
- Natural Rank V was reproduced across multiple exploratory runs.
- Run `36301849773` reached a subsequent real level-6 draft while alive after DELTA had naturally reached Rank V.
- In that post-Rank-V rendered draft, `DELTA_RANK` was absent; therefore the original dead `RANK V → V` browser presentation was not reproduced.

Accordingly:

`V2_1C_AUTOMATED_NATURAL_RANK_V = PASS`

`V2_1C_AUTOMATED_POSTFIX_RENDER_FILTER = PASS`

## 5. UNPROVEN / NOT CLOSED

The following are intentionally not promoted to PASS:

- a fully green synthetic multi-minute natural Rank-V endurance workflow;
- a completed action selection from the exact post-Rank-V draft in the same successful natural long-run execution;
- owner manual play of the exact postfix behavior;
- long-run V2-1 survival balance beyond the intended bounded learning slice.

Accordingly:

`V2_1C_NATURAL_LONG_RUN_ACTION_GATE = UNPROVEN`

`V2_1C_OWNER_MANUAL_POSTFIX_GATE = UNPROVEN`

## 6. Why the exploratory workflow is not a gameplay blocker

The V2-1 runtime is explicitly a bounded learning/combat proof, not the finished seven-minute survival balance.

Its current spawn pacing and qualification target were established to answer whether the first 30–60 seconds are readable and functional. V2-4 is the tranche reserved for complete pacing/enemy escalation work.

Forcing the V2-1 sandbox to survive a synthetic multi-minute route solely so an automated script can naturally grind from Rank I through Rank V and beyond would create an invalid incentive to change combat balance for a test harness rather than for the product.

Therefore no gameplay mutation is authorized from these exploratory failures.

The correct interpretation is:

- deterministic validity: PASS;
- bounded browser slice: PASS;
- natural browser Rank V: PASS;
- browser post-Rank-V render filtering: PASS;
- extended endurance harness: NOT QUALIFIED / not a V2-1 acceptance requirement;
- owner manual postfix observation: still required unless explicitly waived by owner authority.

## 7. Scope integrity

This qualification branch may contain only:

- the dedicated Rank-V browser qualifier;
- workflow wiring required to execute it;
- qualification documentation.

It may not contain:

- gameplay balance changes;
- V2-2 weapons;
- protocols/EVO;
- enemy expansion;
- RF/economy work;
- production/deployment changes.

No merge to `main` or the canonical feature branch is authorized by this report.

## 8. Current decision state

`V2_1C_IMPLEMENTATION = PASS`

`V2_1C_CI_QUALIFICATION = PASS`  
(authoritative original bounded workflow `36298019639`)

`V2_1C_EXACT_THREE_RECONCILIATION = LOCKED_BOUNDED_EXCEPTION`  
(as recorded by the separate V2-2 mechanics design gate)

`V2_1C_AUTOMATED_NATURAL_RANK_V = PASS`

`V2_1C_AUTOMATED_POSTFIX_RENDER_FILTER = PASS`

`V2_1C_NATURAL_LONG_RUN_ACTION_GATE = UNPROVEN`

`V2_1C_OWNER_MANUAL_POSTFIX_GATE = UNPROVEN`

`V2_1C_OVERALL_DECISION = PROVISIONAL`

`V2_2_IMPLEMENTATION = NOT_STARTED`

## 9. Next required closeout evidence

The remaining owner-facing closeout check is intentionally simple:

1. play the current V2-1 build;
2. naturally reach DELTA BURST Rank V;
3. reach the next level-up draft;
4. confirm no `RANK V → V` DELTA card appears;
5. select any displayed remaining card and confirm it produces its stated effect;
6. confirm combat resumes normally.

Only explicit owner evidence or an explicit owner waiver may close `V2_1C_OWNER_MANUAL_POSTFIX_GATE`.
