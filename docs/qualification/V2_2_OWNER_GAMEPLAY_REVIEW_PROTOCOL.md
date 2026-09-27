# RARE//SHIFT V2-2 — OWNER GAMEPLAY / READABILITY REVIEW PROTOCOL

**Status:** ACTIVE OWNER GATE — MANUAL REVIEW REQUIRED  
**Date:** 2026-09-27  
**Review branch:** `qualification/v2-2e-cross-weapon-closeout`  
**Current review branch baseline before this protocol:** `5ae1e1df096629138e11d881547fc1c93b573df9`  
**Exact automated V2-2E qualified candidate:** `ddf05656758666031ff8277f8048e3adc4711a70`  
**Automated V2-2 technical closeout:** PASS  
**Owner gameplay review:** UNPROVEN  
**V2-3 authorization:** BLOCKED until owner PASS or explicit owner waiver

## 1. Purpose

V2-2A through V2-2E have already proven the Rank-I weapon architecture mechanically and technically.

This protocol does **not** repeat automated qualification. It exists to answer the remaining human questions that automation cannot prove:

- does the combat read clearly while actually playing;
- does DELTA remain the selected Friend's signature identity;
- do the phase-responsive weapons feel meaningfully different rather than like layered DPS;
- does SHIFT remain understandable when several systems react at once;
- does the four-slot build feel deliberate rather than noisy;
- do desktop and narrow/touch controls feel usable;
- does reduced-motion mode preserve clarity.

No gameplay implementation may be changed merely to satisfy a subjective concern until the owner identifies the actual observed problem.

## 2. Qualified build to review

Use:

`qualification/v2-2e-cross-weapon-closeout`

The qualification branch contains only V2-2E evidence additions after the already-qualified V2-2 runtime. V2-2E itself introduced no `games/rare-shift/src/**` mutation.

Automated evidence already proves:

- 24/24 ordered three-family acquisition paths respect the four-slot cap;
- all four legal DELTA + three optional-family combinations are reachable;
- V2-1, VECTOR, ORBIT, ECHO and SIGNAL ARC regressions pass at 960 and 390;
- integrated DELTA + ORBIT + ECHO + SIGNAL ARC passes at 960 and 390;
- reduced-motion integrated qualification passes;
- no fifth active weapon can leak through after 4/4.

The owner review must therefore focus on **feel, readability, comprehension and obvious balance outliers**, not re-prove those deterministic contracts.

## 3. Minimum desktop review

Run the game through the normal FriendSDK development surface and use ordinary controls only.

Minimum route:

1. Select a real Rare Friend.
2. Enter SIGNAL DESCENT.
3. Move normally and let DELTA auto-fire.
4. Use SHIFT several times before the first level-up.
5. At level 2, acquire one optional Rank-I weapon.
6. At level 3, acquire another available weapon.
7. At level 4, consume the fourth active slot when offered.
8. Continue playing with the 4/4 build long enough to see simultaneous weapon activity and several SHIFTs.

Do not use test hooks, injected XP, artificial ownership or browser dataset manipulation for this owner review.

## 4. Owner observations — required

### A. DELTA identity

PASS only if:

- DELTA remains visually recognizable as the selected Friend's canonical signature attack;
- the other weapons support rather than visually replace the Friend-derived identity;
- the player can still associate the game's strongest visual identity with their selected Friend.

Record a concern if generic weapon FX dominate the screen strongly enough that DELTA feels secondary.

### B. SHIFT readability

PASS only if normal play communicates that SHIFT changes combat reality.

Observe whether the following are understandable without inspecting test counters:

- aligned enemies becoming corporeal/ghosted;
- VECTOR changing valid focus after SHIFT when present;
- ORBIT reversing direction when present;
- ECHO benefiting from leave-and-return phase memory when present;
- SIGNAL ARC changing which enemy graph is legal when present.

The owner does not need to identify internal algorithms. The question is whether SHIFT visibly matters to combat rather than appearing cosmetic.

### C. Weapon-role separation

The Rank-I families must feel like different tactical tools:

- DELTA — Friend identity / local spatial control;
- VECTOR — single-target precision;
- ORBIT — close defensive sweep;
- ECHO — route planning and return-to-phase damage;
- SIGNAL ARC — clustered wave clear.

FAIL this item if two or more weapons feel functionally interchangeable in ordinary play despite their different visuals.

### D. Four-slot readability

With DELTA + three optional weapons active simultaneously:

- enemy threats must remain readable;
- phase state must remain readable;
- important hits/weapon behaviors must not become indistinguishable visual noise;
- movement path and danger space must remain visible;
- SHIFT feedback must remain legible.

Short moments of spectacle are acceptable. Sustained inability to read threats is not.

### E. Acquisition comprehension

During level-up drafts, check whether:

- the three cards are readable;
- the player understands that a weapon is being acquired rather than merely stat-boosted;
- the level-2 / level-3 / level-4 progression does not feel confusing;
- the 4/4 weapon-slot outcome makes sense in play.

This is a comprehension review, not final draft-weighting approval. Final weighting belongs to later progression work.

### F. Desktop controls

Check:

- WASD/arrows feel responsive;
- SPACE SHIFT feels immediate enough to use tactically;
- automatic attacks do not create a need for an extra manual-fire button;
- draft selection by pointer and/or 1-3 keys is reliable;
- returning from a draft to live combat is clear.

### G. Narrow / touch review

If a physical touch device is available, review it there.

Check:

- virtual movement control is reachable and responsive;
- SHIFT control is easy to locate and activate;
- controls do not hide critical combat information;
- drafts remain tappable and readable;
- active four-weapon combat does not become unusably crowded.

If no physical device is available, record:

`PHYSICAL_PHONE_FEEL = UNTESTED`

Do **not** convert automated 390 qualification into a claim of physical-device feel.

### H. Reduced motion

Enable Reduce Motion and verify:

- phase state remains understandable;
- weapon identity remains understandable;
- SIGNAL ARC and other short FX remain readable without relying on prolonged animation;
- reduced motion does not remove essential gameplay information.

### I. Obvious Rank-I balance outliers

This is not final numerical balancing.

Only flag obvious human-play outliers such as:

- one family is so dominant that other choices feel pointless;
- one family feels functionally useless;
- one family obscures enemy threats disproportionately;
- an interaction strongly encourages ignoring SHIFT despite the phase-responsive design.

Minor damage/cooldown preferences should be deferred to measured later balance work.

## 5. Recommended review duration

A single normal review session is sufficient for this gate if it reaches a genuine 4/4 build and includes repeated SHIFT usage.

A second run is useful if the first run exposes a specific readability or weapon-role concern, but repeated grinding is not required merely to manufacture confidence.

## 6. Owner response format

The owner may close this gate with a concise response using one of these forms.

### PASS

`V2-2 owner gameplay review PASS. DELTA identity, SHIFT readability, weapon separation, 4/4 readability, controls and acquisition flow are acceptable.`

Optional notes may follow.

### PASS WITH NOTES

Use when V2-2 is acceptable to close but there are observations to carry into V2-3/V2-4 rather than repair immediately.

Example structure:

`V2-2 owner gameplay review PASS WITH NOTES:`

- `<observation>`
- `<observation>`

The notes must be classified before implementation. A note does not automatically authorize a gameplay mutation.

### FAIL / HOLD

Use when a concrete issue blocks advancement.

Record:

- what was happening;
- which weapon(s) were active;
- current phase if relevant;
- viewport/device;
- what the player expected;
- what actually happened.

Screenshots/video may be attached when useful but are not mandatory if the issue is clear from the description.

## 7. Explicit waiver path

The owner may explicitly waive the manual gate.

A waiver must be recorded as:

`V2_2_OWNER_GAMEPLAY_REVIEW = WAIVED_BY_OWNER`

It must **not** be recorded as `PASS`.

If waived, automated V2-2 technical qualification remains the evidence basis and device-dependent/subjective observations remain UNKNOWN or DEFERRED.

## 8. Closeout transition

After owner PASS:

`V2_2_OWNER_GAMEPLAY_REVIEW = PASS`

`V2_2_FULL_OWNER_CLOSEOUT = PASS`

`V2_2 = CLOSED`

After an explicit waiver:

`V2_2_OWNER_GAMEPLAY_REVIEW = WAIVED_BY_OWNER`

`V2_2_FULL_OWNER_CLOSEOUT = PASS_WITH_OWNER_WAIVER`

`V2_2 = CLOSED_WITH_OWNER_WAIVER`

Only after one of those outcomes may V2-3 planning be opened.

## 9. V2-3 remains blocked

This protocol does not authorize:

- DELTA Rank II-V implementation;
- VECTOR Rank II-V / PRISM LANCE;
- ORBIT Rank II-V / SYNC HALO;
- ECHO Rank II-V / MEMORY COLLAPSE;
- SIGNAL ARC Rank II-V / CHAIN RESONANCE;
- protocols;
- Evolution Core;
- EVO transformations;
- V2-4 enemies or pacing;
- THE DESYNC;
- economy/RF work;
- merge to `main`;
- production deployment.

## 10. Current gate state

`V2_2_AUTOMATED_TECHNICAL_CLOSEOUT = PASS`

`V2_2_OWNER_GAMEPLAY_REVIEW_PROTOCOL = ACTIVE`

`V2_2_OWNER_GAMEPLAY_REVIEW = UNPROVEN`

`V2_2_FULL_OWNER_CLOSEOUT = PROVISIONAL`

`V2_3_RANK_PROTOCOL_EVO = NOT_STARTED`

`MAIN_MERGE = NOT_AUTHORIZED`

`PRODUCTION_DEPLOY = NOT_AUTHORIZED`
