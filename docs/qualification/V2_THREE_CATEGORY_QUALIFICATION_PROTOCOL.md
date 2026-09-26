# RARE//SHIFT V2 — THREE-CATEGORY QUALIFICATION PROTOCOL

**Status:** ACTIVE — PRE-IMPLEMENTATION QUALIFICATION CONTRACT  
**Applies to:** V2 category integration only  
**Does not replace:** T4 fallback qualification

## 1. Purpose

This protocol defines the evidence required before RARE//SHIFT may claim that Character Spotlight, Token Activity, and Economy Potential are implemented in the V2 competition build.

Design intent is not proof. Documentation is not proof. Each category must have observable, testable implementation evidence.

## 2. Category claim policy

### Character Spotlight

May be claimed only when the selected owned Friend materially determines gameplay through canonical animation data.

### Token Activity

May be claimed only when at least one simulated RF spend/burn path executes end-to-end in the playable preview with visible accounting.

### Economy Potential

May be claimed only when the implemented economy demonstrates a coherent repeat-use loop and the submission accurately distinguishes implemented MVP behavior from future persistent/live architecture.

## 3. Character Spotlight qualification

Required evidence:

1. normal FriendSDK wallet/Friend selection flow;
2. real eligible Friend holder playthrough;
3. canonical art preserved;
4. exact canonical Frame A/B read;
5. exact `A_ONLY`, `B_ONLY`, `COMMON`, `DELTA` derivation;
6. DELTA BURST geometry visibly changes with the selected Friend;
7. SHIFT changes canonical pose and combat phase authority;
8. at least one combat interaction is impossible to describe correctly without Friend-derived phase data;
9. final reconstruction returns exact canonical A/B rows;
10. changing to another qualified Friend changes signature geometry without granting an uncontrolled raw-power advantage.

Required automated evidence:

- deterministic pair/geometry tests;
- at least nine-family regression when Friend-dependent combat geometry is admitted;
- desktop + narrow browser coverage;
- SDK check/build/test;
- no mutation of canonical art.

Decision gate:

`CHARACTER_SPOTLIGHT=PASS`

only when all required evidence passes.

## 4. Token Activity qualification

### 4.1 Minimum implemented activity

At least one repeatable simulated RF action must be present in the public preview.

Primary required action:

**SIGNAL CONTRACT — 1 simulated RF entry**

Expected accounting:

- spend = 1.00 RF;
- simulated burn = 0.50 RF;
- simulated RF reward funding = 0.50 RF.

### 4.2 Required flow

1. player opens Signal Contract;
2. UI shows exact simulated cost and split;
3. player explicitly confirms;
4. ledger validates available simulated balance;
5. exactly one spend is recorded;
6. challenge begins;
7. challenge result returns to receipt/results;
8. session totals reconcile;
9. no live wallet transaction/signature/approval occurs.

### 4.3 Accounting invariants

For every modeled payment:

- `spent >= 0`;
- `burned >= 0`;
- `rewardFunding >= 0`;
- `spent == burned + rewardFunding`;
- no floating-point drift in canonical accounting units;
- one confirmation produces one ledger event;
- cancelled/rejected confirmation produces zero ledger events;
- replay/re-render cannot double-charge;
- zero-balance state cannot enter a paid action.

Use integer base units internally even if the UI displays decimal RF.

### 4.4 Required player-facing disclosure

Every paid simulated action must show:

- `SIMULATED RF`;
- `NO ON-CHAIN TRANSACTION`;
- spend amount;
- burn amount;
- reward-funding amount.

The session ledger must show cumulative:

- RF spent;
- RF burned;
- RF reward funding;
- number/type of paid actions.

### 4.5 Free-path regression

With simulated RF balance = 0, the player must still be able to complete the normal free survival game.

No paid action may modify:

- damage;
- HP;
- XP rate;
- weapon slots;
- protocol slots;
- EVO eligibility;
- boss vulnerability;
- score multiplier.

Decision gate:

`TOKEN_ACTIVITY=PASS`

only when the full flow and invariants pass.

## 5. Identity Atlas / Deep Scan qualification

Deep Scan is an additional Token Activity/Economy Potential feature and is not required to prove the first Signal Contract path.

It may be admitted only when:

1. T5 census reports safe alternate qualifying canonical pairs for the supported corpus;
2. primary pair remains free;
3. paid alternate pair is different from the primary pair;
4. alternate ordering is deterministic;
5. exact pair derivation/reconstruction remains valid;
6. cost/split receipt reconciles;
7. no combat power is granted;
8. duplicate paid unlocks are prevented or explicitly documented.

Decision gate:

`DEEP_SCAN=PASS`

## 6. Signal Forge qualification

Signal Forge is cosmetic-only.

A candidate cosmetic passes only when:

- visual difference is visible;
- collision/hitbox is unchanged;
- damage is unchanged;
- cooldown is unchanged;
- target selection is unchanged;
- score is unchanged;
- phase readability is not degraded;
- reduced-motion behavior remains valid;
- RF receipt reconciles.

Decision gate:

`SIGNAL_FORGE=PASS`

This feature may defer if schedule pressure requires it.

## 7. Economy Potential qualification

The project may claim implemented Economy Potential when all of the following are demonstrated:

1. Character Spotlight loop is operational;
2. Signal Contract RF activity is operational;
3. visible RF ledger is operational;
4. at least one additional coherent sink is implemented **or** a second sink is qualification-ready with bounded documented limitation;
5. economy purchases do not buy raw power;
6. replay loop naturally creates repeated optional economic opportunities;
7. no second tradeable token is introduced;
8. submission documents future Daily Signal / Weekly Desync / community-event architecture as future potential, not current live infrastructure;
9. implemented and future systems are clearly separated in UI/docs;
10. no claim of real token burn/reward distribution is made for simulated preview actions.

Decision gate:

`ECONOMY_POTENTIAL=PASS`

## 8. Cross-category integration test

A full category qualification run must prove this sequence:

```text
REAL OWNED FRIEND
      ↓
CANONICAL SCAN
      ↓
FREE SURVIVAL RUN
      ↓
DELTA BURST + SHIFT
      ↓
THE DESYNC
      ↓
IDENTITY RESTORED
      ↓
SIGNAL CONTRACT CONFIRMATION
      ↓
1 RF SIMULATED SPEND
      ↓
0.5 BURN + 0.5 REWARD FUNDING
      ↓
CONTRACT RUN / RESULT
      ↓
SIGNAL RECEIPT
      ↓
SESSION TOTALS RECONCILE
```

If Deep Scan is included, continue:

```text
IDENTITY ATLAS
      ↓
DEEP SCAN CONFIRMATION
      ↓
1 RF SIMULATED SPEND
      ↓
NEXT DETERMINISTIC CANONICAL PAIR
      ↓
ATLAS PROOF + UPDATED RECEIPT
```

## 9. Browser/device qualification

Required widths:

- FriendSDK reference 960×640;
- narrow-phone host around 390px;
- physical-phone final release check before submission.

Economy dialogs/receipts must:

- stay inside the SDK viewport;
- remain keyboard accessible;
- remain touch accessible;
- not be hidden behind SDK chrome;
- support reduced motion;
- remain readable without relying only on color.

## 10. Error-state qualification

Required economy errors:

- insufficient simulated RF;
- invalid/duplicate confirmation;
- identity change during pending action;
- paused session;
- reload/session reset;
- unavailable Deep Scan alternate;
- invalid ledger state must fail closed in tests;
- no action may fall back to real wallet transaction behavior.

## 11. Submission evidence

Final submission package must include:

- primary category declaration: Character Spotlight;
- secondary relevance: Token Activity, Economy Potential;
- one-sentence Rare Friend/RF relationship;
- public playable preview;
- source/setup/run instructions;
- FriendSDK version;
- wallet/network requirements;
- controls/game rules;
- exact simulated RF costs;
- exact modeled burn/reward split;
- known limitations;
- third-party credits;
- explicit statement that preview RF activity is simulated;
- tests/checks summary.

## 12. Final status matrix

Before release, produce a final report with:

| Area | Required status |
|---|---|
| Character Spotlight | PASS |
| Signal Contract | PASS |
| Token Activity accounting | PASS |
| Free-path regression | PASS |
| Economy Potential architecture | PASS |
| Deep Scan | PASS or explicitly DEFERRED |
| Signal Forge | PASS or explicitly DEFERRED |
| Real-holder V2 run | PASS |
| 960 browser | PASS |
| narrow browser | PASS |
| physical phone | PASS |
| public HTTPS | PASS |
| privacy/submission audit | PASS |

V2 may replace T4 as the competition candidate only after its complete release gate passes.

## 13. Non-authorization

This protocol does not authorize:

- live RF transfers;
- token approvals;
- wallet transaction signatures;
- new smart contracts;
- mainnet deployment of economy contracts;
- merge to `main`;
- public production deployment;
- submission PR.

Those remain separate owner-approved gates.