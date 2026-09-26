# RARE//SHIFT V2 — THREE-CATEGORY IMPLEMENTATION DESIGN v1

**Status:** FINALIZED FOR IMPLEMENTATION REVIEW  
**Governance:** `docs/governance/RARE_SHIFT_V2_THREE_CATEGORY_GOVERNANCE_v1.md`  
**Primary category:** Character Spotlight  
**Secondary relevance:** Token Activity, Economy Potential

## 1. Unified product statement

RARE//SHIFT V2 is one game, not three contest modules.

> **Your Friend is not a skin. Its animation is your weapon and the battlefield's phase law.**

The selected Rare Friend creates the playable identity. The survival loop creates replayability. Optional simulated RF systems create repeat activity and a credible path toward a broader Rare Friends economy.

The intended relationship is:

```text
RARE FRIEND IDENTITY
        ↓
CHARACTER SPOTLIGHT
        ↓
SURVIVAL GAMEPLAY
        ↓
REPEATABLE CHALLENGES / IDENTITY DISCOVERY / COSMETICS
        ↓
TOKEN ACTIVITY
        ↓
COMMUNITY + PERSISTENT ECONOMY ROADMAP
        ↓
ECONOMY POTENTIAL
```

## 2. Main player journey

```text
CONNECT WALLET
      ↓
SELECT OWNED FRIEND
      ↓
SCAN
canonical A/B pair + signature geometry
      ↓
CALIBRATION
movement + SHIFT + phase combat
      ↓
FREE SIGNAL DESCENT
~7-minute survival run
      ↓
XP → 3-card drafts → weapons → protocols → EVO
      ↓
THE DESYNC
      ↓
RECONSTRUCTION / IDENTITY RESTORED
      ↓
RUN RESULTS
      ↓
┌─────────────────────────────┐
│ FREE: RUN AGAIN             │
│ OPTIONAL: SIGNAL CONTRACT   │
│ OPTIONAL: IDENTITY ATLAS    │
│ OPTIONAL: SIGNAL FORGE      │
└─────────────────────────────┘
```

The economy layer appears after the player understands and can enjoy the game. It never blocks normal completion.

## 3. Character Spotlight implementation

### 3.1 Canonical scan

The selected Friend is read through FriendSDK. The game retrieves the canonical animation and derives:

- Frame A;
- Frame B;
- `COMMON = A ∩ B`;
- `A_ONLY = A − B`;
- `B_ONLY = B − A`;
- `DELTA = A XOR B`.

The same trusted pair flows through combat and final reconstruction.

### 3.2 DELTA BURST

Every Friend begins with DELTA BURST.

- Phase A uses real `A_ONLY` geometry.
- Phase B uses real `B_ONLY` geometry.
- attack budget is normalized so pixel count changes shape/coverage rather than raw total baseline power;
- the Friend's visible canonical pose changes with SHIFT.

### 3.3 Battlefield phase law

Threats are A-aligned, B-aligned, or COMMON.

SHIFT changes:

- which aligned enemies are corporeal;
- which aligned hazards are active;
- DELTA BURST geometry;
- selected weapon effects;
- boss vulnerability rules.

The Friend therefore defines both the avatar and part of the ruleset.

### 3.4 Reconstruction

A successful run ends with exact identity reconstruction:

`COMMON ∪ A_ONLY = FRAME A`

`COMMON ∪ B_ONLY = FRAME B`

The game shows the selected Friend, pair, run build and deterministic proof data.

## 4. Free survival loop

The standard game is free and complete.

A player can:

- play the full survival run;
- use all base weapon families;
- rank weapons I–V;
- acquire protocols;
- evolve weapons;
- fight elites and THE DESYNC;
- reconstruct identity;
- run again;

without simulated RF spending.

This remains the default first-play path.

## 5. Token Activity system — SIGNAL CONTRACTS

### 5.1 Purpose

SIGNAL CONTRACTS create a repeatable, visible RF activity loop around skill-based survival gameplay rather than selling raw power.

### 5.2 Entry

Initial Vibeathon preview:

```text
SIGNAL CONTRACT
Entry: 1.00 simulated RF

0.50 RF → SIMULATED BURN
0.50 RF → SIMULATED REWARD FUNDING
```

The confirmation UI must state:

- this is simulated;
- no on-chain transaction occurs;
- no RF approval/signature is requested;
- the action affects only the preview session.

### 5.3 Challenge structure

A Signal Contract uses a deterministic challenge configuration:

- known seed;
- fixed run rules;
- fixed boss family/modifier;
- no paid stat advantage;
- deterministic score inputs.

Initial score candidates:

- clear/fail result;
- completion time;
- damage taken;
- kills;
- SHIFT count/efficiency;
- boss time;
- run fingerprint.

The exact score formula remains provisional until `score-core` qualification.

### 5.4 Contract result

The result panel shows:

- Friend ID/family;
- challenge seed;
- build;
- score inputs;
- contract result;
- simulated spend/burn/reward-funding receipt;
- session totals.

## 6. SIGNAL RECEIPT / session RF ledger

The RF ledger is a first-class UI component, not hidden accounting.

Required fields:

```text
SIGNAL RECEIPT

Action                 SIGNAL CONTRACT
RF spent               1.00 RF
RF burned              0.50 RF
RF reward funding      0.50 RF

SESSION TOTALS
Spent                   4.00 RF
Burned                  2.00 RF
Reward funding          2.00 RF

SIMULATED — NO ON-CHAIN TRANSACTION
```

For every modeled gameplay payment:

`spent === burned + rewardFunding`

The ledger resets with the preview session unless future persistence is separately admitted.

## 7. Token Activity system — IDENTITY ATLAS / DEEP SCAN

### 7.1 Purpose

Deep Scan creates RF activity directly from Rare Friend identity discovery rather than a generic shop.

### 7.2 Flow

```text
IDENTITY RESTORED
       ↓
IDENTITY ATLAS
       ↓
PRIMARY PAIR — FREE
       ↓
DEEP SCAN — 1 simulated RF
       ↓
NEXT DETERMINISTIC QUALIFYING PAIR
       ↓
COMMON / A_ONLY / B_ONLY
       ↓
ATLAS PROOF
```

### 7.3 Accounting

Initial model:

- spend 1.00 simulated RF;
- 0.50 simulated RF burned;
- 0.50 simulated RF reward funding.

### 7.4 Constraints

- no random financial reward;
- no combat stat increase;
- alternate pairs must come from deterministic canonical data;
- pair order must be deterministic;
- no duplicate paid unlock in the same session unless intentionally documented;
- feature remains gated by the T5 alternate-pair census.

## 8. Token Activity system — SIGNAL FORGE

SIGNAL FORGE is the optional cosmetic sink.

Candidate products:

- **Phase Trail** — visual movement trail;
- **Shift Signature** — alternate SHIFT transition treatment;
- **Result Frame** — result-card decoration;
- **Fracture Theme** — arena presentation variant;
- **Weapon Imprint** — alternate VFX presentation without hitbox/damage changes.

Requirements:

- cosmetic-only;
- no extra hit area;
- no altered telegraph readability;
- no stat change;
- no competitive score bonus;
- every item clearly labels simulated RF cost and 50/50 preview accounting.

Exact catalog and price values remain provisional. The first competition build should prefer a very small catalog rather than a large store.

## 9. Economy Potential architecture

### 9.1 Immediate MVP economy

The Vibeathon build demonstrates:

- repeatable Signal Contract spending;
- Deep Scan identity spending if census-qualified;
- optional cosmetic spending if V2-ECO-3 ships;
- transparent cumulative RF ledger;
- protocol-aligned simulated burn/reward funding.

### 9.2 Long-term economy

Future persistent architecture may add:

#### DAILY SIGNAL
A shared deterministic seed with standardized rules.

#### WEEKLY DESYNC
A rotating boss challenge with normalized competitive rules.

#### FAMILY SIGNALS
Challenges or cosmetic events keyed to the nine canonical Friend families without raw rarity advantages.

#### COMMUNITY SIGNAL STABILIZATION
A global community goal funded by RF activity.

Conceptual model:

```text
RF gameplay activity
      ↓
50% burn / 50% RF reward funding
      ↓
community progress counter
      ↓
collective milestone
      ↓
new event / cosmetic / challenge / lore unlock
```

This persistent global layer is future architecture only until a trusted backend/on-chain design exists.

### 9.3 Horizontal economy rule

Paid activity should unlock or support:

- challenge access;
- identity discovery;
- cosmetics;
- social/community events;
- horizontal content.

It should not buy mandatory permanent combat power.

## 10. Game-resource separation

The project uses three clearly separated resource concepts:

### Signal XP
- earned during a run;
- resets after a run;
- levels the in-run build;
- not a token.

### Evolution Core
- earned from designated elites/bosses;
- consumed to confirm an EVO;
- run-only gameplay resource;
- not a token.

### RF / $RAREFRIENDS
- economic layer;
- simulated for Vibeathon MVP;
- used only in explicitly labeled economy interactions.

No additional tradeable RARE//SHIFT token is introduced.

## 11. UI architecture

### 11.1 Survival HUD

Must prioritize gameplay:

- HP;
- Signal XP;
- phase;
- SHIFT state;
- timer;
- weapon/protocol slots;
- boss HP when applicable.

RF balance/ledger must not clutter active combat.

### 11.2 Economy entry points

Economy actions appear in safe non-combat contexts:

- post-run hub/results;
- Identity Atlas;
- Signal Forge;
- Signal Contract entry screen.

### 11.3 Required economy labels

Use explicit phrases such as:

- `SIMULATED RF`;
- `NO ON-CHAIN TRANSACTION`;
- `PREVIEW SESSION ONLY`.

Do not use language implying that preview spending is real protocol activity.

## 12. Technical architecture

Add pure modules after the gameplay core is qualified:

- `rf-economy-core` — simulated balance, payment split and ledger reconciliation;
- `signal-contract-core` — challenge entry/config/receipt contracts;
- `identity-atlas-core` — alternate-pair unlock/order state;
- `cosmetic-core` — cosmetic catalog/ownership within preview session;
- `economy-receipt-core` — cumulative deterministic accounting.

FriendSDK remains wallet/identity authority. Phaser must not own economy truth.

No live chain transaction module is authorized for the Vibeathon MVP.

## 13. Test architecture

At minimum, economy tests must prove:

- exact `spent = burn + rewardFunding` reconciliation;
- 1 RF contract entry creates exactly 0.5 burn + 0.5 reward funding in simulation;
- insufficient simulated balance is rejected safely;
- failed/cancelled confirmation does not spend;
- duplicate event dispatch cannot double-spend;
- identity change resets or rebinds session economy safely;
- reload behavior matches documented session persistence policy;
- free run remains accessible at zero simulated RF;
- RF purchases never modify combat stats;
- Deep Scan order is deterministic;
- cosmetic ownership never affects score or combat simulation;
- visible receipt totals match internal ledger totals.

Browser qualification must cover economy at desktop and narrow-phone widths.

## 14. Submission story

Recommended submission positioning:

**Primary category:** Character Spotlight

**Secondary relevance:** Token Activity, Economy Potential

One-sentence concept:

> RARE//SHIFT turns your Generations Friend's canonical animation into a phase-shifting survival weapon and battlefield law, then uses simulated RF for optional standardized challenges, deeper identity scans and cosmetic/community economy loops.

The submission must distinguish:

- implemented preview behavior;
- simulated RF accounting;
- future live integration;
- future persistent community economy.

## 15. Implementation sequence

```text
V2-ART-00
visual normalization
      ↓
V2-1
combat sandbox
      ↓
V2-2
weapon breadth
      ↓
V2-3
ranks / protocols / EVO
      ↓
V2-4
enemy escalation / pacing
      ↓
V2-5
complete survival run + THE DESYNC
      ↓
V2-ECO-1
Signal Contract + RF ledger
      ↓
V2-ECO-2
Identity Atlas / Deep Scan
      ↓
V2-ECO-3
small Signal Forge cosmetic set
      ↓
V2-6
release/submission qualification
```

If schedule pressure occurs, V2-ECO-3 is the first economy scope allowed to defer. Signal Contract + ledger are higher priority for Token Activity evidence. Deep Scan remains subject to the census gate.

## 16. Final category mapping

| Category | Concrete RARE//SHIFT implementation |
|---|---|
| Character Spotlight | canonical Friend frames drive DELTA BURST, SHIFT, phase rules and reconstruction |
| Token Activity | repeatable simulated Signal Contract spend + visible 50/50 receipt; Deep Scan and cosmetics add additional sinks |
| Economy Potential | repeat challenges, identity discovery, cosmetics, Daily/Weekly/community-event architecture using RF without pay-to-win |

## 17. Decision status

**LOCKED**

- unified three-category architecture;
- Character Spotlight as primary;
- Signal Contract as primary Token Activity mechanic;
- visible Signal Receipt;
- official 50/50 gameplay payment split modeled in simulation;
- Deep Scan identity sink subject to census;
- Signal Forge cosmetic-only sink;
- no extra tradeable token;
- free complete survival path;
- live RF integration deferred.

**PROVISIONAL**

- score formula;
- cosmetic catalog/prices;
- exact number of paid Deep Scans;
- persistent economy implementation details;
- whether Signal Forge ships in the Vibeathon vertical slice.

**OPEN FOR IMPLEMENTATION AFTER PRIOR GATES**

- V2-ECO-1;
- V2-ECO-2;
- V2-ECO-3.