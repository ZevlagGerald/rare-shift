# RARE//SHIFT — T2 CHAMBER II / TIMING Protocol

**Status:** ACTIVE DESIGN PROTOCOL — IMPLEMENTATION NOT YET STARTED  
**Branch:** `feature/t2-chamber2-timing`  
**Base:** T1 qualified closeout `dac2c405ad18a3f91a31c4764f79328aaef2e1cb`  
**FriendSDK:** v0.1.2  
**Engine:** Phaser 4.2.1

## 1. Purpose

T2 adds the second production chamber without weakening the RARE//SHIFT thesis:

> **Your Friend is not a skin. Its animation is the rules.**

Chamber I teaches that SHIFT changes canonical-frame-controlled collision. Chamber II must teach the next concept:

> **The right phase is not enough. You must enter it at the right time.**

T2 therefore combines movement, canonical phase selection and a deterministic timing window while preserving the already-qualified frame selector, phase field and FriendSDK boundary.

## 2. Decision status

### LOCKED

- T0/T0.5 frame selection, scoring and qualification thresholds remain unchanged.
- The selected canonical pair A/B remains the phase authority.
- `A_ONLY` and `B_ONLY` pixels remain mechanically meaningful.
- SPACE remains the keyboard SHIFT action; physical Shift remains unbound.
- Touch retains a dedicated SHIFT control.
- Chamber II must require SHIFT for completion.
- Chamber II must be solver-qualified before presentation.
- No HP, combat, death, lives or inventory system is introduced.
- No RF spending, contracts, backend or persistent state is introduced.
- Runtime pause must freeze Chamber II timing rather than letting the player lose a timing window while the SDK is paused.
- Reduced-motion mode must preserve all gameplay information without relying on flashing.

### PROVISIONAL — TO BE VERIFIED DURING IMPLEMENTATION

- Chamber II mechanic name: **PHASE PULSE**.
- Two canonical-source timed shutters: one A-authority shutter and one B-authority shutter.
- Each shutter is passable only when both conditions are true:
  1. the player's current canonical phase matches the shutter; and
  2. the pulse clock is in that phase's open window.
- Closed-window attempts block movement rather than inflicting damage.
- Safe staging bays before each shutter let the player observe the pulse and wait without punishment.
- Pulse cadence is fixed across all Friends for fairness; canonical artwork may determine gate source pixels, layout offsets and deterministic start offset, but must not make one Friend's timing window materially harder than another's.

### OPEN

- Exact pulse cadence in milliseconds.
- Exact telegraph/open-window durations.
- Final Chamber II visual effects and audio cue.

Timing constants may be tuned only within this protocol after automated and real-user evidence. They must remain bounded, readable and identical across Friends.

## 3. Core mechanic — PHASE PULSE

The chamber has a deterministic pulse cycle with four semantic states:

1. `TELEGRAPH_A`
2. `OPEN_A`
3. `TELEGRAPH_B`
4. `OPEN_B`

The visual presentation must communicate the upcoming and current state before the player reaches a shutter.

### A shutter

An A shutter is passable only when:

- Friend phase is `A`; and
- pulse state is `OPEN_A`.

### B shutter

A B shutter is passable only when:

- Friend phase is `B`; and
- pulse state is `OPEN_B`.

Therefore Chamber II cannot be solved by simply choosing a phase once. The player must coordinate movement + SHIFT + pulse timing.

## 4. Why this mechanic is admitted

PHASE PULSE passes the project feature-admission test because it:

- strengthens SHIFT rather than adding an unrelated action;
- remains visibly derived from the same canonical A/B animation states;
- produces a judge-visible escalation after Chamber I;
- is deterministic and solver-testable;
- works with keyboard and touch;
- can remain safe and readable under reduced motion;
- does not require backend, economy, combat or health systems.

## 5. Canonical source authority

Chamber II must use the same selected Friend pair that SCAN exposed.

The deterministic Chamber II generator may use:

- one `A_ONLY` pixel as the A shutter authority source;
- one `B_ONLY` pixel as the B shutter authority source;
- the pair fingerprint plus a T2-specific salt for deterministic source selection/layout variation;
- `COMMON` pixels for non-phase-safe structural decoration or staging-zone derivation if useful.

It must never invent alternate Friend frames or substitute authored pixels for the canonical phase authority.

The same Friend + canonical data + generator version must reproduce the same Chamber II source pixels, layout and initial pulse offset.

## 6. Chamber topology

The first implementation should remain deliberately bounded:

- one authored-safe Chamber II shell;
- one A pulse shutter;
- one B pulse shutter;
- a safe staging bay before each shutter;
- no random maze generation;
- no lethal floor;
- no moving enemies;
- no additional collectible/objective.

Canonical data determines the shutter authority and bounded deterministic placement variation inside the authored-safe shell.

This is intentionally more sophisticated than Chamber I but still explainable within a few seconds.

## 7. Player flow

Target sequence:

`SCAN → CHAMBER I / DISCOVER → CHAMBER II / TIMING`

After Chamber I completion, the player receives an explicit transition into Chamber II rather than being silently teleported.

Chamber II teaching sequence:

1. enter a safe staging bay;
2. see the pulse telegraph;
3. reach the A shutter;
4. SHIFT into Phase A if necessary;
5. cross during `OPEN_A`;
6. reach the second staging bay;
7. read the B telegraph;
8. SHIFT into Phase B;
9. cross during `OPEN_B`;
10. reach EXIT and receive `CHAMBER II COMPLETE`.

A failed crossing attempt simply remains blocked and explains whether the mismatch was **PHASE** or **TIMING**. No health is removed and the player is not killed.

## 8. Timing architecture

Timing rules must be pure deterministic game state, not Phaser-object side effects.

Create a pure timing module, provisionally `timing-core.ts`, responsible for:

- pulse-state enumeration;
- deterministic cycle configuration;
- current pulse segment from elapsed active time;
- deterministic initial offset;
- A/B shutter passability;
- pause/resume semantics;
- solver-facing discrete timing states.

Phaser owns only:

- rendering the pulse state;
- telegraph animation;
- input forwarding;
- camera/effects;
- optional audio later.

### Pause requirement

When FriendSDK pauses the game:

- the pulse clock freezes;
- no window expires;
- no catch-up burst occurs on resume.

### Test-clock requirement

Automated tests must not depend on race-prone wall-clock sleeps.

The timing core must support a deterministic/manual test clock or equivalent injected time source so CI can place the chamber at exact pulse boundaries and prove blocked/open behavior reproducibly.

## 9. Solver extension

The existing T0/T1 solver models `(x, y, phase)`.

T2 requires a separate time-expanded solver state that includes pulse state, conceptually:

`(x, y, phase, pulseSegment)`

The solver must support waiting for a future pulse segment.

The T2 solver must prove:

- spawn is safe;
- exit is reachable;
- SHIFT is required;
- A pulse shutter is crossed only under Phase A + `OPEN_A`;
- B pulse shutter is crossed only under Phase B + `OPEN_B`;
- waiting can never create a permanent trap;
- there is always a recoverable future window from each staging bay;
- no immediate unavoidable failure exists;
- the chamber can complete using the intended two canonical phases;
- shortest accepted solution uses at least two SHIFTs;
- bounded completion exists under the configured pulse cycle.

Chamber II must be rejected before presentation if any of these fail.

## 10. Timing necessity proof

Automated qualification must prove timing is mechanically real rather than decorative.

At minimum, for each timed shutter CI must demonstrate:

- correct canonical phase + closed pulse window => movement is blocked;
- wrong canonical phase + open pulse window => movement is blocked;
- correct canonical phase + matching open pulse window => movement succeeds.

This three-way assertion distinguishes phase authority from timing authority.

## 11. Fairness and difficulty

Timing difficulty must not vary materially by NFT.

Therefore:

- pulse speed/open-window duration are global gameplay constants, not family/generation/seed difficulty modifiers;
- canonical pixels determine identity-specific geometry/source authority, not reaction-time advantage;
- no family gets a shorter timing window;
- no generation gets a faster pulse;
- input latency tolerance must work at 390px touch viewport as well as desktop.

The exact cadence remains OPEN until the first implementation is browser-qualified. Prefer a forgiving timing window over reflex difficulty; Chamber II is an escalation in coordination, not a twitch test.

## 12. Visual communication

Phase/timing state may not rely on hue alone.

Required non-color cues:

- `A` / `B` state label;
- distinct line/pattern direction for A vs B shutters;
- visible telegraph state before each open window;
- pulse progress/segment indicator that remains readable under reduced motion.

Reduced-motion mode:

- removes camera flash/rapid pulse animation;
- keeps static pattern/state changes and labels;
- does not alter timing rules or make the chamber easier/harder.

Avoid strobe-like effects.

## 13. Input

Desktop:

- WASD / arrows: movement;
- SPACE: SHIFT;
- no additional mandatory timing key.

Touch:

- directional controls;
- dedicated SHIFT control;
- no control may be covered by FriendSDK chrome.

Waiting is accomplished by not moving; no separate WAIT button is required in the player UI even if the solver uses a WAIT transition internally.

## 14. Automated acceptance

T2 cannot be accepted unless CI proves all of the following:

- T0/T1 deterministic core regression tests remain green;
- SCAN still precedes gameplay;
- Chamber I still completes under its qualified two-SHIFT invariant;
- explicit Chamber I → Chamber II transition works;
- Chamber II uses the same selected canonical pair;
- deterministic T2 generation repeats identically for the same Friend;
- A and B timed shutters are sourced from valid `A_ONLY` / `B_ONLY` pixels;
- T2 time-expanded solver accepts the chamber;
- no-SHIFT completion is impossible;
- phase mismatch blocks each shutter;
- timing mismatch blocks each shutter;
- matching phase + matching pulse window passes each shutter;
- Chamber II reaches EXIT;
- pause freezes the pulse clock;
- reduced-motion mode remains mechanically identical;
- 960px browser sequence passes;
- 390px browser sequence passes;
- FriendSDK `check`, build and smoke remain green.

## 15. Nine-family corpus gate

Before T2 holder qualification, run the Chamber II generator + solver against the canonical T0.5 representatives:

- Skeleton `#13655`
- Mask `#3112`
- Family `#289218`
- Cellular `#13699`
- Asymmetry `#334511`
- Hoverer `#14193`
- Colossus `#14223`
- Sparkling `#14584`
- Hollow `#14412`

Acceptance target:

- 9/9 deterministic generation;
- 9/9 T2 solver PASS;
- 9/9 SHIFT-required;
- 9/9 timing-required shutter behavior;
- no family-specific cadence exception;
- no Colossus special-case unless evidence forces one.

## 16. Real-holder gate

After automated T2 qualification, Friend `#13699` remains the primary real-holder qualification Friend unless the Owner changes it.

Required evidence:

1. Chamber II entered from the real T1 flow;
2. A-shutter phase/timing behavior observed;
3. B-shutter phase/timing behavior observed;
4. `CHAMBER II COMPLETE` screenshot with deterministic Friend/fingerprint identity intact.

## 17. Competitor collision watch

A Sep. 26 review of the current Vibeathon open-PR field found entries using canonical frames for character rendering, family/seed personalization, costumes and environment shaping, but no material collision found with RARE//SHIFT's central mechanism: **canonical animation-frame differences directly rewriting world passability/phase rules**.

No redesign is justified by the current field.

## 18. Explicitly out of scope

- Chamber III / Memory Cores;
- reconstruction finale;
- HP / health bars;
- combat or enemies;
- lethal hazards;
- lives/checkpoint economy;
- inventory/crafting;
- RF spending or rewards;
- contracts/transactions;
- backend/accounts;
- leaderboards;
- selector/scoring threshold changes;
- cross-clip policy changes;
- generated image assets.

## 19. Review gate

**T2 implementation must not begin silently.**

Before code changes, review this protocol for:

- whether PHASE PULSE sufficiently differentiates Chamber II from Chamber I;
- whether the timing model remains fair and deterministic;
- whether the time-expanded solver scope is proportionate to the Vibeathon deadline;
- whether the mechanic is immediately understandable in a short judge demo.

Only after that review should implementation be authorized.
