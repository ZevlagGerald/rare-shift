# RARE//SHIFT V2-1 — COMBAT SANDBOX QUALIFICATION REPORT

**Status:** AUTOMATED PASS — MANUAL FUN / READABILITY GATE OPEN  
**Branch:** `feature/v2-1-combat-sandbox`  
**Reviewed head:** `369ed898c3d87a2a908c48d76eb8581b55df00ed`  
**Qualified visual base:** `2307bf5bf5d89ccd751ef83274411d6c35cb3c06`  
**FriendSDK:** v0.1.2  
**Engine:** Phaser 4.2.1

## 1. Decision

V2-1 is **mechanically and automatically qualified**, but it is **not yet tranche-closed** because the protocol explicitly requires manual visual/readability review and states that fun is a human evaluation.

Do not advance to V2-2 until the Owner reviews the current combat slice and explicitly approves the V2-1 fun/readability gate.

## 2. Implemented bounded loop

The current V2-1 path implements:

`SCAN → SIGNAL DESCENT → MOVE → AUTO DELTA BURST → A/B/COMMON ENEMIES → SHIFT → KILL → SIGNAL XP → LEVEL 2 → EXACTLY THREE CHOICES → SELECT DELTA BURST II → CONTINUE COMBAT`

The implementation includes:

- FriendSDK-selected Friend session validation;
- canonical 64-frame read and deterministic A/B pair selection;
- current canonical pose presentation;
- exact canonical `A_ONLY` / `B_ONLY` DELTA BURST geometry;
- normalized DELTA rank damage independent of pixel count;
- TRACE / SPLIT_A / SPLIT_B phase authority;
- movement in a world larger than the SDK viewport;
- camera-follow survival scene;
- bounded HP/contact damage and invulnerability;
- off-phase split-enemy safety;
- bounded enemy pool;
- deterministic spawning;
- Signal XP and deterministic level threshold;
- exactly-three draft choices;
- DELTA BURST Rank II selection;
- keyboard and touch-oriented controls;
- reduced-motion handling.

## 3. Current balance adjustments

Two bounded balance repairs immediately precede this report:

1. `2cbb0d63ff740b024b37270bbd7e293a47c13199` — DELTA target-hit radius now accounts for the approximately 32 px runtime enemy body without changing canonical DELTA point placement.
2. `369ed898c3d87a2a908c48d76eb8581b55df00ed` — initial spawn interval increased from 700 ms to 1100 ms so the V2-1 learning slice does not saturate its safety pool before the first draft.

These are V2-1 tuning changes, not changes to canonical Friend authority.

## 4. Deterministic core evidence

Workflow run `36291660334` passed.

Inherited deterministic core tests:

- 17 passed;
- 0 failed.

V2 combat deterministic tests:

- 7 passed;
- 0 failed.

The V2 combat tests cover:

- COMMON/A/B threat authority;
- exact exclusive canonical DELTA geometry;
- DELTA rank normalization independent of canonical pixel count;
- deterministic spawning with phased threats;
- Signal XP threshold progression;
- exactly three distinct draft choices including DELTA upgrade;
- complete V2-1 qualification predicate.

## 5. Build / SDK evidence

The same run passed:

- core TypeScript;
- game TypeScript;
- FriendSDK `check`;
- FriendSDK `build`;
- FriendSDK 960 px smoke test;
- inherited V2-ART-00 visual proof;
- V2-1 desktop + narrow browser qualification;
- screenshot-evidence verification.

FriendSDK archive SHA-256 verification passed for v0.1.2.

## 6. Browser qualification evidence

### 960 host

Final automated state:

```json
{"hp":54,"level":2,"xp":5,"kills":9,"shifts":6,"deltaRank":2,"activeEnemies":10,"phase":"B","draftOpen":false,"qualified":true,"dead":false}
```

Result: `RARE_SHIFT_V2_1_BROWSER_960=PASS`

### 390 narrow host

Final automated state:

```json
{"hp":63,"level":2,"xp":5,"kills":9,"shifts":6,"deltaRank":2,"activeEnemies":9,"phase":"B","draftOpen":false,"qualified":true,"dead":false}
```

Result: `RARE_SHIFT_V2_1_BROWSER_390=PASS`

Both widths therefore satisfy the bounded admission predicate:

- elapsed active combat >= 20 s;
- HP > 0;
- kills >= 3;
- accepted SHIFTs >= 1;
- level >= 2;
- DELTA BURST rank >= 2.

## 7. Evidence artifact

Workflow run: `36291660334`  
Evidence artifact: `rare-shift-browser-evidence-36291660334`  
Artifact ID: `10923050526`  
Artifact ZIP SHA-256: `0738fcb617631aa9db7a08502907daf3d43b122e620fa736268fc66c68c55c91`

Screenshot evidence exists for 960 and 390 at:

- host;
- scan;
- initial combat;
- level-up draft;
- qualified post-draft combat.

## 8. PROVEN

- current branch builds and passes FriendSDK validation;
- real Friend session/canonical reader path is retained by implementation;
- exact Friend-derived DELTA geometry is used by the combat core;
- canonical pixel count does not directly multiply weapon damage;
- A/B/COMMON threat authority is deterministic;
- bounded survival spawning is deterministic;
- XP and draft loop works automatically at desktop and narrow widths;
- exactly three choices appear;
- DELTA BURST II selection resumes combat;
- current balance head completes the automated admission predicate alive;
- no RF economy, multiplayer, boss, EVO or V2-2 scope leaked into V2-1.

## 9. UNPROVEN / OPEN

- human judgement that combat is fun enough to continue;
- human judgement that TRACE / SPLIT-A / SPLIT-B are readable during actual motion;
- human judgement that DELTA BURST has sufficient impact and clarity;
- human judgement that SHIFT feels responsive and strategically meaningful;
- human judgement that the 1100 ms opening spawn cadence is too slow, correct, or still too dense;
- physical-phone joystick feel;
- real-holder V2-1 manual playthrough;
- long-run swarm performance beyond the bounded V2-1 slice.

## 10. Decision status

**PROVEN:** automated V2-1 mechanical/build/browser gate.  
**PROVISIONAL:** current damage, hit radius, spawn cadence and enemy pressure.  
**OPEN:** Owner manual fun/readability gate.  
**DEFERRED:** V2-2 weapon breadth and all later systems.

## 11. Next authorized action

Manual V2-1 review only.

The Owner should play/review the current V2-1 slice and decide whether movement, DELTA BURST, SHIFT, enemy readability, XP pickup and the first draft feel sufficiently strong.

If approved, close V2-1 and branch V2-2 from the reviewed head. If not approved, repair V2-1 in bounded balance/visual/readability changes and rerun qualification.

This report does not authorize merge to `main`, deployment, V2-2, RF economy, or submission.
