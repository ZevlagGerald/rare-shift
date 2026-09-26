# RARE//SHIFT V2 THREE-CATEGORY GOVERNANCE v1

**Status:** ACTIVE — OWNER APPROVED  
**Project:** RARE//SHIFT V2  
**Branch:** `planning/v2-survivor-restructure`  
**Primary submission category:** Character Spotlight  
**Secondary category relevance:** Token Activity, Economy Potential

## 1. Purpose

This governance integrates all three Rare Friends Vibeathon award categories into one coherent RARE//SHIFT product without creating three disconnected features.

The category architecture is:

1. **Character Spotlight** is the mechanical foundation.
2. **Token Activity** is an optional repeat-use layer built on the completed gameplay loop.
3. **Economy Potential** is the durable economy/community architecture that extends the same RF sinks and Friend identity systems.

The survival game must remain enjoyable without spending simulated RF. Economy may deepen replay and community activity, but it may not be used to hide weak gameplay.

## 2. Official contest basis

The current Rare Friends Vibeathon README recognizes:

- **Character Spotlight** — best use of a Generations NFT as the main character;
- **Token Activity** — successful burning or spending of `$RAREFRIENDS`;
- **Economy Potential** — potential for a token economy paired with `$RAREFRIENDS`.

The contest explicitly permits simulated purchases/rewards for an MVP when clearly labeled and does not require live contracts or real-money transactions for submission.

Official event source:

`https://github.com/spokesz/rarefriends-vibeathon/blob/main/README.md`

## 3. Official Rare Friends economy basis

Rare Friends' current official economy documentation states that gameplay payments use a 50/50 split:

- 50% of gameplay RF is burned;
- 50% funds RF rewards;
- RF has no later issuance path;
- gameplay burns reduce supply.

Official protocol references:

- `https://rarefriends.com/docs/economy`
- `https://rarefriends.com/docs/rarefriends`

RARE//SHIFT may model this split in the simulated Vibeathon economy. It must not represent simulated accounting as an actual on-chain burn, actual reward distribution, or production contract execution.

## 4. Category 1 — Character Spotlight

### 4.1 Authority

Character Spotlight remains the primary category and the non-negotiable identity of RARE//SHIFT.

### 4.2 Required implementation

The selected owned Rare Friend must remain mechanically indispensable:

- FriendSDK performs wallet/ownership/Friend selection;
- canonical 64-frame animation is read from the selected Friend;
- the game deterministically selects canonical Frame A and Frame B;
- `COMMON`, `A_ONLY`, `B_ONLY`, and `DELTA` are derived from those exact canonical frames;
- DELTA BURST uses the selected Friend's actual `A_ONLY` / `B_ONLY` geometry;
- SHIFT toggles the Friend's canonical pose and battlefield phase law;
- reconstruction proves the exact selected pair at the end of a completed run.

Replacing the Rare Friend with a generic sprite must materially break the designed identity/gameplay relationship.

### 4.3 Fairness rule

Canonical differences create sidegrades and geometry differences, not a raw rarity/stat ladder.

Generation, rarity, market value, activation level, or collection price may not directly grant competitive damage, HP, XP gain, weapon slots, rerolls, or other raw power in the V2 competition build.

## 5. Category 2 — Token Activity

### 5.1 Token Activity thesis

RARE//SHIFT creates optional, repeatable reasons to spend simulated RF after the core free survival loop is proven.

Every preview RF action must be clearly marked **SIMULATED**.

No preview action may request a real RF transfer, approval, signature, private key, or live burn transaction.

### 5.2 Free gameplay guarantee

The complete standard survival run remains free.

Players may:

- enter FRACTURE GRID;
- acquire all combat weapons/protocols;
- rank and evolve weapons;
- fight THE DESYNC;
- reach RECONSTRUCTION;
- complete the main game;

without spending simulated RF.

This prevents RF from becoming pay-to-win or a mandatory access tax.

### 5.3 SIGNAL CONTRACT — primary RF activity

After the survival loop is qualified, RARE//SHIFT adds **SIGNAL CONTRACTS**.

A Signal Contract is an optional standardized challenge run using a defined seed/ruleset.

Initial Vibeathon preview model:

- entry cost: **1 simulated RF**;
- simulated burn: **0.50 RF**;
- simulated RF reward funding: **0.50 RF**;
- no live transaction;
- no direct combat-stat purchase;
- challenge score is based on normalized gameplay metrics.

Candidate score dimensions:

- successful completion;
- boss clear time;
- damage taken;
- kills;
- SHIFT efficiency;
- deterministic run fingerprint.

Exact leaderboard weighting is PROVISIONAL until score-core qualification.

### 5.4 IDENTITY ATLAS / DEEP SCAN — identity RF activity

After `IDENTITY RESTORED`, a player may optionally use **DEEP SCAN** to inspect another deterministic qualifying canonical animation pair from the same Friend.

Initial Vibeathon preview model:

- cost: **1 simulated RF**;
- simulated burn: **0.50 RF**;
- simulated RF reward funding: **0.50 RF**;
- result: deterministic identity discovery, not random financial reward;
- no combat power is granted.

The T5 alternate-pair census remains supporting research for this feature. Deep Scan may not ship unless the census proves safe qualifying alternates for the supported Friend corpus.

### 5.5 SIGNAL FORGE — cosmetic RF activity

The **SIGNAL FORGE** may provide bounded cosmetic-only RF sinks after the core game is complete.

Allowed examples:

- phase trail variants;
- SHIFT distortion variants;
- result-card frames;
- arena signal themes;
- DELTA presentation skins that do not alter hit geometry;
- weapon presentation imprints that do not alter mechanics.

Initial candidate simulated prices may use small whole-RF values such as 2–5 RF, but exact catalog/prices remain PROVISIONAL until UI and session-budget review.

### 5.6 Explicitly rejected RF purchases

RARE//SHIFT rejects:

- RF for damage;
- RF for max HP;
- RF for faster XP;
- RF for extra weapon/protocol slots;
- RF for paid revive;
- RF for paid combat reroll;
- RF for better random odds;
- RF for NFT rarity power;
- RF for competitive score multipliers.

## 6. RF ACCOUNTING / SIGNAL RECEIPT

Every simulated RF action must produce transparent accounting.

The UI must expose a **SIGNAL RECEIPT** or equivalent session ledger with, at minimum:

- action name;
- simulated RF spent;
- simulated RF burned;
- simulated RF allocated to reward funding;
- session cumulative spend;
- session cumulative burn;
- session cumulative reward funding;
- explicit `SIMULATED — NO ON-CHAIN TRANSACTION` disclosure.

The ledger must be deterministic, testable, and reconcile exactly:

`spent = burned + rewardFunding`

for each modeled gameplay payment unless a later officially documented protocol rule explicitly requires another split.

## 7. Category 3 — Economy Potential

### 7.1 Economy thesis

RARE//SHIFT's economy is designed around repeatable play, Friend identity, cosmetics, challenge participation, and future community events rather than raw power sales.

### 7.2 Economy loops

The long-term economy architecture may include:

- Signal Contract challenge entries;
- Deep Scan identity discovery;
- Signal Forge cosmetics;
- rotating Daily Signal challenges;
- Weekly Desync boss challenges;
- Friend-family events;
- community Signal Stabilization milestones;
- cosmetic/horizontal blueprint unlocks;
- community-funded content/event goals.

### 7.3 Community Signal Stabilization

Future persistent infrastructure may aggregate RF activity into community events.

Conceptual flow:

`RF activity → burn + reward funding → community progress → content/cosmetic/event unlock`

Community progress must not create permanent combat-stat advantages for spenders.

This is **Economy Potential**, not a claim that persistent global accounting exists in the Vibeathon preview.

### 7.4 No additional tradeable token

RARE//SHIFT does not introduce a second tradeable economic token for the initial product architecture.

Terms such as Signal XP and Evolution Core are gameplay resources only:

- **Signal XP** — temporary in-run level progression;
- **Evolution Core** — temporary in-run evolution gate;
- **$RAREFRIENDS / RF** — economic token layer.

This separation must remain explicit in UI and documentation.

## 8. Economy safety and clarity

All Vibeathon economy actions are simulated unless separately authorized in future governance.

The preview must never:

- imply a simulated burn occurred on-chain;
- imply simulated RF has cash value;
- promise investment returns;
- promise future token appreciation;
- claim protocol reward entitlement from preview actions;
- hide cost/reward mechanics;
- use dark patterns to pressure spending.

Live RF integration requires a separate architecture, security, contract, legal/risk, wallet and organizer review. It is not authorized by this document.

## 9. Implementation order

Three-category implementation follows gameplay, not the reverse:

1. `V2-ART-00` — visual normalization proof.
2. `V2-1` — core combat sandbox / fun gate.
3. `V2-2` — weapon breadth.
4. `V2-3` — ranks, protocols and EVO.
5. `V2-4` — enemy escalation / pacing.
6. `V2-5` — THE DESYNC + complete survival run.
7. `V2-ECO-1` — Signal Contract + simulated RF ledger/receipt.
8. `V2-ECO-2` — Deep Scan integration after census gate.
9. `V2-ECO-3` — bounded Signal Forge cosmetic sink if schedule permits.
10. `V2-6` — release/submission qualification.

No economy tranche may bypass the V2 gameplay qualification sequence.

## 10. Competition positioning

Until the organizers explicitly require or permit a multi-category declaration format, submission packaging should use:

**Primary category:** Character Spotlight  
**Secondary relevance:** Token Activity, Economy Potential

The project must demonstrate the secondary systems factually rather than assume they guarantee eligibility for multiple prizes.

## 11. Three-category qualification gates

RARE//SHIFT may claim the three-category architecture is implemented only when:

### Character Spotlight

- real-holder Friend flow passes;
- canonical Friend art is preserved;
- DELTA BURST uses exact canonical delta geometry;
- SHIFT materially changes combat phase;
- reconstruction remains exact.

### Token Activity

- at least one repeatable simulated RF spend works end-to-end;
- 50/50 simulated accounting reconciles exactly;
- spend/burn/reward funding are visible to the player;
- simulated labeling is explicit;
- free core gameplay remains available;
- no live transaction/signature occurs.

### Economy Potential

- at least two coherent RF sinks are demonstrated or one sink plus one qualified future system is documented in-product/submission;
- RF sinks connect to replay, identity or cosmetics rather than raw combat power;
- session ledger explains flow of RF;
- future persistent/community architecture is documented with limitations;
- no unsupported live-economy claim is made.

## 12. Decision status

**LOCKED**

- Character Spotlight as primary category;
- Token Activity and Economy Potential as integrated secondary relevance;
- free complete core survival game;
- Signal Contract as primary repeatable RF spend;
- Deep Scan as identity-linked RF sink subject to census qualification;
- Signal Forge as cosmetic-only RF sink;
- 50% simulated burn / 50% simulated RF reward-funding accounting for modeled gameplay payments;
- visible Signal Receipt ledger;
- no pay-to-win RF purchase;
- no second tradeable game token;
- no live RF transaction in the Vibeathon preview.

**PROVISIONAL**

- exact cosmetic catalog and prices;
- exact Signal Contract score formula;
- exact number of Deep Scan entries exposed in MVP;
- whether V2-ECO-3 ships before the competition deadline.

**DEFERRED**

- live RF transfer/burn contracts;
- real reward settlement;
- persistent global community ledger;
- backend leaderboards;
- multiplayer/co-op;
- production token economy.

## 13. Owner authority

The Owner remains final authority. This document authorizes bounded implementation of the simulated category systems only after their preceding gameplay gates pass. It does not authorize deployment, production token transactions, a merge to `main`, or submission.