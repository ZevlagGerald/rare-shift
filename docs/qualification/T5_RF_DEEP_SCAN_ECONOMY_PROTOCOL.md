# RARE//SHIFT — T5 RF DEEP SCAN / IDENTITY ATLAS Protocol

**Status:** DESIGN LOCKED — IMPLEMENTATION GATED BY ALTERNATE-PAIR CORPUS  
**Base:** T4 qualified closeout `98b56fc4cf3de5a3e02391ae6e63d7407217bf5a`  
**FriendSDK:** v0.1.2  
**Purpose:** strengthen the entry's $RAREFRIENDS economy story without changing or paywalling the qualified free game.

## 1. Decision

RARE//SHIFT's qualified core remains:

`SCAN → DISCOVER → TIMING → SYNCHRONIZE → IDENTITY RESTORED`

That entire route stays free and mechanically unchanged.

T5 is an **optional post-finale economy layer**, not Chamber IV and not a replacement for the Character Spotlight thesis.

The proposed feature is **DEEP SCAN / IDENTITY ATLAS**:

- after `IDENTITY RESTORED`, the holder may spend simulated RF to inspect additional deterministic canonical animation-pair evidence from the same selected Friend;
- each paid scan reveals a new unused qualifying canonical frame pair and its exact `COMMON / A_ONLY / B_ONLY / XOR` decomposition;
- paid scans do not make Chambers I–III easier, do not alter the free RUN PROOF, and do not improve win probability;
- `RUN AGAIN` remains free;
- no live contract, approval, signature or real RF transfer is part of the Vibeathon preview.

This is intentionally identity-first: RF buys **more discovery of the Friend's real canonical animation**, not generic loot, power or an unrelated shop item.

## 2. Why a generic shop is rejected

Current Vibeathon submissions already include extensive simulated RF sinks, continuous-burn systems, prediction-market economies, upgrade ladders, farms, voyages and other high-volume token loops.

Adding a generic cosmetic purchase or arbitrary one-off RF button would add risk without creating a distinctive economy story.

T5 is acceptable only if the economy remains inseparable from RARE//SHIFT's existing thesis:

> Your Friend is not a skin. Its animation is the rules.

The economic extension therefore explores **additional canonical animation states of that same Friend**.

## 3. FriendSDK economy boundary

FriendSDK v0.1.2 already supplies a session-scoped simulated ledger through the existing `GameClient`:

- `read()`;
- `canBuy(quantity)`;
- `buy(quantity)`;
- `play(quantity)`;
- `settle(playId)`;
- `redeem(outcomeId, quantity)`.

T5 must use those supported actions rather than invent a second client-side RF balance.

The public Vibeathon build remains preview/simulated economy. No `LiveGameDeployment` is introduced in this tranche.

All RF UI must explicitly say **SIMULATED RF** or equivalent. It must never imply a Robinhood mainnet debit occurred.

## 4. Proposed RF instrument

Reuse the existing FriendSDK game definition terminology:

- consumable: `Reference Signal`;
- gross price: **1 RF** per Deep Scan;
- outcome: `Reference Echo`;
- outcome probability: **100%**;
- echo reward: **0.1 RF**;
- gross simulated spend: **1 RF**;
- deterministic simulated rebate: **0.1 RF**;
- net simulated spend after redemption: **0.9 RF**.

There is no random jackpot and no gambling loop in T5. The single 100% outcome exists to satisfy the SDK's current chance-game definition while keeping the economic interaction deterministic and transparent.

The 90% net-spend model is an MVP demonstration parameter, not a claim about final production tokenomics. Any future live burn/reward allocation requires a separate integration and security review.

## 5. Deep Scan selection authority

T5 must not change the free pair chosen by the already-qualified `selectFramePair()`.

A new pure ranking function may expose **unused qualifying same-clip pairs** while preserving the current selector's scoring, thresholds and deterministic tie-breaking.

For a selected Friend:

1. the qualified free pair remains index 0 / primary and is never charged for;
2. Deep Scan selects the highest-ranked unused qualifying pair;
3. prefer an unused animation source group when available;
4. if source-group diversity is exhausted, the next unused same-clip qualifying pair may be used;
5. no cross-clip fallback is silently introduced for paid scans;
6. the same paid pair cannot be purchased twice in one session;
7. when no unused qualifying paid pair remains, Deep Scan becomes unavailable.

Each atlas entry records only deterministic public game evidence:

- Friend ID;
- family;
- frame A/B indexes;
- source group;
- pair metrics;
- exact frame A/B rows;
- `COMMON / A_ONLY / B_ONLY` decomposition;
- deterministic `ATLAS PROOF` derived from those inputs.

No owner address is written into the atlas entry.

## 6. Identity Atlas presentation

The post-finale layout may add a bounded panel beneath or beside the qualified `IDENTITY RESTORED` result:

`IDENTITY ATLAS`

- `FREE ENTRY` — the already-qualified gameplay pair;
- `DEEP SCAN — 1 SIMULATED RF` — next unused canonical pair;
- discovered paid entries rendered as compact canonical-pair cards;
- gross/net simulated RF activity shown plainly;
- session reset limitation shown plainly.

The screen must preserve:

- T1/T2/T3 proofs;
- free RUN PROOF;
- accepted SHIFT statistics;
- reconstructed canonical Frame A/B;
- fully accessible `RUN AGAIN`.

T5 may not push the core result below inaccessible SDK chrome at 960 or narrow-host widths.

## 7. Free-path immutability

The following are hard regression locks:

- Friend `#13699` free pair remains `33 ↔ 34`;
- T1 proof remains `fdef6617`;
- T2 proof remains `78145332`;
- T3 proof remains `2032f2f5`;
- free RUN PROOF remains `14e271f4` for the same trusted deterministic inputs;
- Chambers I–III code and solver acceptance remain unchanged;
- minimum free route remains `2 + 2 + 2 = 6 SHIFTs`;
- a player with zero simulated RF can still finish the entire game and use `RUN AGAIN`.

Any violation is an automatic T5 NO-GO.

## 8. Alternate-pair corpus gate — required before implementation

Before adding economy UI/actions, run a read-only corpus against the existing canonical nine-family sample set.

For each Friend, record:

- the existing free selected pair;
- count of additional qualifying same-clip pairs;
- count of distinct source groups represented by those alternates;
- top ranked alternate pairs and metrics;
- deterministic repeat equality;
- confirmation that the existing free pair remains unchanged.

### Hard acceptance

- `9/9` families retain exactly their previously qualified free pair;
- `9/9` have at least **one** unused qualifying same-clip alternate pair;
- alternate ranking is deterministic;
- no threshold or score change is required;
- no cross-clip paid fallback is required.

### Preferred target

At least **three** unused qualifying alternates per family is preferred for a credible repeatable atlas, but is not a hard requirement until corpus evidence is reviewed.

If any family has zero safe alternates, implementation stops for redesign. Do not special-case a family silently.

## 9. Economy action state machine

If the corpus gate passes, one Deep Scan transaction sequence is:

1. `client.read()` refreshes the simulated snapshot;
2. verify `client.mode === "preview"` for the competition build;
3. `canBuy(1n)` must pass;
4. user explicitly confirms `DEEP SCAN — 1 SIMULATED RF`;
5. `buy(1n)` purchases one Reference Signal;
6. `play(1n)` consumes it for the deterministic scan action;
7. `settle(playId)` resolves the 100% Reference Echo outcome;
8. `redeem(...)` returns the 0.1 RF echo;
9. only after the supported SDK action sequence succeeds is the next atlas entry revealed;
10. refresh snapshot and display gross spend, echo and net session spend.

Failures must be explicit and non-destructive. No atlas entry is granted from a failed or incomplete economy sequence.

Paused sessions disable the action. Double-click/concurrent purchase attempts must be guarded.

## 10. Economy semantics

The MVP may claim only:

- **simulated RF spend**;
- exact gross spend per Deep Scan;
- exact deterministic echo rebate;
- exact net simulated spend after redemption;
- session-scoped Identity Atlas discovery.

The MVP must not claim:

- real RF burned;
- real RF transferred;
- mainnet settlement;
- persistent ownership of atlas entries;
- investment value;
- yield or ROI;
- a production-ready token economy.

The official contest currently states that purchases/rewards may remain simulated and that details for judging simulated Token Activity are still pending. Submission copy must preserve that distinction.

## 11. Economy Potential path

A future production design may persist the Identity Atlas per Friend and make each previously undiscovered canonical scan a bounded RF sink.

The desired economic properties are:

- no second token;
- no pay-to-win advantage;
- bounded scans based on real canonical content rather than infinite artificial purchases;
- transparent fixed RF pricing;
- deterministic reveal rather than chance;
- economic demand tied directly to discovering more of an owned Rare Friend;
- optional cosmetic/collector completion around a Friend's atlas, subject to later product review.

Persistence, any burn/reward split and any on-chain archive contract are **DEFERRED** and require separate review.

## 12. Required testing if implementation is authorized

### Pure/core

- ranked alternate-pair determinism;
- primary/free pair unchanged;
- no duplicate atlas entries;
- `ATLAS PROOF` determinism;
- exact decomposition reconstruction for every revealed pair;
- nine-family alternate corpus.

### Economy

- initial `read()`;
- sufficient balance purchase;
- insufficient balance refusal;
- deterministic 1 RF gross / 0.1 RF echo / 0.9 RF net accounting;
- no reveal on failed buy/play/settle/redeem;
- paused/busy protection;
- same entry cannot be bought twice;
- no real transaction/signature in preview.

### Regression

- all existing 17 core tests remain PASS;
- free `#13699` proof chain remains byte-for-byte stable;
- complete free route still works with no economy interaction;
- `RUN AGAIN` remains free;
- 960 and narrow-host browser checks;
- reduced-motion behavior;
- final real-holder free run plus one optional simulated Deep Scan.

## 13. Submission positioning

T5 does not replace RARE//SHIFT's Character Spotlight identity.

If implemented and qualified, submission language may truthfully state that RARE//SHIFT also demonstrates an optional simulated RF economy in which holders spend RF to explore additional canonical animation evidence from their own Friend.

Whether the final submission names one category or references multiple category strengths remains a separate submission-format decision because the official README requests a `category` field but does not presently publish a detailed multi-category judging rule.

## 14. Scope explicitly rejected

T5 does not authorize:

- live RF spending;
- token approvals;
- new smart contracts;
- wallet signatures beyond existing FriendSDK identity behavior;
- loot boxes or randomized paid rewards;
- power upgrades;
- paid access to the core game;
- paid reduction of SHIFT difficulty;
- leaderboards;
- a second currency;
- NFTs minted from atlas entries;
- persistent backend state;
- changes to T0–T4 mechanics.

## 15. Gate state

`T5_DESIGN = LOCKED`

`T5_ALTERNATE_PAIR_CORPUS = NEXT`

`T5_ECONOMY_IMPLEMENTATION = BLOCKED UNTIL CORPUS REVIEW`

`T4_QUALIFIED_FREE_GAME = FROZEN`

`MAIN = UNCHANGED`
