# RARE//SHIFT V2 MASTER IMPLEMENTATION BASELINE v1

**Status:** ACTIVE — SINGLE ENTRY POINT FOR V2 IMPLEMENTATION  
**Owner authority:** final  
**Branch:** `planning/v2-survivor-restructure`

## 1. Purpose

This document is the implementation index for RARE//SHIFT V2. It reconciles gameplay, visual, asset, technical, three-category economy and competition constraints before code work begins.

Implementers must read the documents below together. No single companion document may be interpreted in isolation when another document narrows it.

## 2. Authoritative documents

1. `docs/governance/RARE_SHIFT_V2_SURVIVAL_GOVERNANCE_v1.md` — gameplay/product/technical authority.
2. `docs/governance/RARE_SHIFT_V2_THREE_CATEGORY_GOVERNANCE_v1.md` — Character Spotlight / Token Activity / Economy Potential authority.
3. `docs/governance/RARE_SHIFT_V2_VISUAL_ASSET_GOVERNANCE_v1.md` — visual/asset/license authority.
4. `docs/design/RARE_SHIFT_V2_SURVIVAL_GAME_DESIGN_v1.md` — finalized gameplay design specification.
5. `docs/design/RARE_SHIFT_V2_THREE_CATEGORY_IMPLEMENTATION_v1.md` — finalized category/economy integration design.
6. `docs/design/RARE_SHIFT_V2_ASSET_SOURCE_MATRIX_v1.md` — approved asset sourcing and V2-ART-00 selection plan.
7. `docs/qualification/V2_THREE_CATEGORY_QUALIFICATION_PROTOCOL.md` — evidence required before category claims.
8. Frozen V1/T4 qualification evidence — fallback authority for already proven V1 behavior.

If a conflict occurs:

- owner instruction overrides project documents;
- this master baseline defines V2 document precedence;
- specific governance overrides general design detail;
- `RARE_SHIFT_V2_THREE_CATEGORY_GOVERNANCE_v1.md` supersedes the older survival-governance statement that all simulated RF economy implementation is deferred;
- live RF transactions remain deferred;
- qualification evidence proves only the version/tranche it actually tested;
- provisional design values may be changed only through reviewed qualification work.

## 3. Product definition

RARE//SHIFT V2 is a **phase-shifting survival action roguelite / bullet-heaven** with an optional simulated RF activity/economy layer.

Core pitch:

> **Your Friend is not a skin. Its animation is your weapon and the battlefield's phase law.**

The selected owned Rare Friend's canonical animation remains mechanically indispensable.

The project is intentionally structured to demonstrate all three Vibeathon category themes through one product:

- **Character Spotlight** — canonical Friend identity drives gameplay;
- **Token Activity** — optional repeatable simulated RF spending/burn accounting;
- **Economy Potential** — RF challenge, identity, cosmetic and future community loops.

Recommended submission positioning remains:

**Primary category:** Character Spotlight  
**Secondary relevance:** Token Activity, Economy Potential

unless organizers explicitly specify a different multi-category submission format.

## 4. Main loop

```text
CONNECT / SELECT FRIEND
        ↓
SCAN + SHORT CALIBRATION
        ↓
FRACTURE GRID
        ↓
MOVE + AUTO-ATTACK + SHIFT
        ↓
KILL → SIGNAL XP → LEVEL
        ↓
PICK 1 OF 3
        ↓
WEAPON / PROTOCOL / RANK
        ↓
ELITE / EVOLUTION CORE
        ↓
EVO
        ↓
ESCALATION
        ↓
THE DESYNC
        ↓
RECONSTRUCTION + RUN RESULTS
        ↓
RUN AGAIN / ANOTHER FRIEND
        ↓
OPTIONAL POST-RUN RF LAYER
SIGNAL CONTRACT / IDENTITY ATLAS / SIGNAL FORGE
```

Competition-facing free run target is approximately seven minutes after short calibration, subject to pacing qualification.

## 5. Locked gameplay systems

- movement-first controls;
- automatic weapon firing;
- SPACE/touch SHIFT as the primary active combat action;
- A-aligned, B-aligned and COMMON threats;
- Signal XP and level-up pause;
- exactly three upgrade choices;
- 4 active weapon slots including DELTA BURST;
- 4 protocol/passive slots;
- ranks I–V;
- protocol + rank-V + Evolution Core evolution gate;
- DELTA BURST as canonical signature starter;
- deterministic seeded qualification paths;
- no NFT rarity raw-power ladder;
- no paid revive/reroll/energy/gacha requirement.

## 6. Locked initial content architecture

Initial designed weapon families:

- DELTA BURST → RECONSTRUCTION FIELD;
- VECTOR NEEDLE → PRISM LANCE;
- ORBIT NODES → SYNC HALO;
- ECHO MINE → MEMORY COLLAPSE;
- SIGNAL ARC → CHAIN RESONANCE.

Initial enemy roles:

- TRACE;
- SPLIT-A / SPLIT-B;
- BEACON;
- ANCHOR;
- FLICKER;
- ELITE;
- THE DESYNC final boss.

Exact tuning remains provisional until measured playtests.

## 7. Locked three-category architecture

### Character Spotlight

- FriendSDK wallet/ownership/Friend selection remains authoritative;
- canonical frames remain preserved;
- exact A/B pair derives COMMON/A_ONLY/B_ONLY/DELTA;
- DELTA BURST uses real Friend-derived geometry;
- SHIFT changes canonical pose and phase authority;
- reconstruction proves exact canonical identity at run completion.

### Token Activity

After the free survival loop passes its gameplay gates:

- SIGNAL CONTRACT becomes the primary repeatable simulated RF spend;
- initial Signal Contract entry is 1 simulated RF;
- modeled gameplay payment split is 50% simulated burn / 50% simulated RF reward funding;
- SIGNAL RECEIPT exposes per-action and cumulative spend/burn/reward funding;
- Deep Scan adds identity-linked simulated RF activity after its census gate;
- Signal Forge may add cosmetic-only simulated RF sinks.

All preview RF actions are explicitly simulated. No real transaction, approval or signature is authorized.

### Economy Potential

The long-term architecture connects RF to:

- standardized challenge participation;
- deterministic identity discovery;
- cosmetic/horizontal customization;
- Daily Signal / Weekly Desync modes;
- Friend-family events;
- future community Signal Stabilization milestones.

No second tradeable RARE//SHIFT token is introduced.

## 8. Locked visual identity

- canonical Friend art is preserved;
- phase lineage inherits A `#4cc9f0`, B `#f72585`, COMMON `#e8edf2`, dark VOID/background lineage;
- phase readability uses shape + effect + color;
- environment is FRACTURE GRID, an original composition;
- signature effects DELTA BURST / RECONSTRUCTION FIELD / SHIFT remain canonical/procedural rather than stock animations;
- external packs are normalized before production use;
- no mixed asset-pack appearance.

## 9. Locked asset policy

Primary external source family: **Kenney CC0**.

Approved source families for candidate selection:

- 1-Bit Pack;
- Input Prompts Pixel 1-Bit;
- UI Pack - Sci-Fi;
- Particle Pack;
- Sci-fi Sounds;
- Impact Sounds;
- Interface Sounds.

OpenGameArt is secondary and must be individually confirmed CC0 per source asset.

No wholesale asset-library import. Every imported file receives provenance and SHA evidence.

## 10. Architecture

Preserve:

`FriendSDK runtime → GameSession → React adapter → Phaser 4.2.1 → deterministic pure gameplay modules`

Planned gameplay modules:

- survival-core;
- phase-combat-core;
- weapon-core;
- draft-core;
- evolution-core;
- enemy-core;
- spawn-core;
- score-core.

Planned category/economy modules after gameplay qualification:

- `rf-economy-core` — simulated balances, payment split and ledger reconciliation;
- `signal-contract-core` — challenge entry/config/receipt contracts;
- `identity-atlas-core` — deterministic alternate-pair unlock state;
- `cosmetic-core` — preview cosmetic catalog/ownership;
- `economy-receipt-core` — cumulative deterministic RF accounting.

Phaser owns rendering, camera, pooling, collisions, effects and input adaptation. Phaser does not own RF accounting truth.

## 11. V1 fallback protection

Frozen qualified fallback:

`feature/t4-reconstruction-finale`

V2 work may not rewrite T4 qualification history or require V1 to be abandoned before V2 passes replacement gates.

V2 becomes the competition candidate only after its own release/vertical-slice admission requirements pass.

## 12. Economy authority

### ACTIVE DESIGN / AUTHORIZED AFTER PRECEDING GATES

- simulated Signal Contract;
- simulated RF ledger/Signal Receipt;
- simulated 50/50 gameplay-payment accounting;
- Deep Scan after alternate-pair census qualification;
- bounded cosmetic Signal Forge if schedule permits.

### LOCKED ECONOMY SAFETY

- complete standard survival game remains free;
- RF may not buy damage, HP, XP rate, weapon slots, protocol slots, paid revive, paid combat reroll, score multiplier or rarity power;
- every preview RF action must say it is simulated;
- no simulated action may be represented as a real on-chain burn/reward distribution.

### DEFERRED

- live RF transfers;
- token approvals;
- transaction signatures;
- production burn/reward contracts;
- real reward settlement;
- persistent global RF ledger;
- multiplayer/co-op;
- backend leaderboard;
- clans;
- permanent power economy.

## 13. Implementation sequence

### V2-ART-00 — visual normalization proof

Establish production visual language and exact selected asset provenance before mass integration.

### V2-1 — combat sandbox

Bounded proof:

- real selected Friend data;
- movement + camera;
- HP/contact damage;
- TRACE + SPLIT-A + SPLIT-B;
- SHIFT combat authority;
- canonical DELTA BURST;
- Signal XP;
- level threshold + exactly three draft cards;
- one DELTA BURST rank upgrade;
- deterministic seed;
- desktop/touch presentation.

Primary question: **is 30–60 seconds of core combat readable, responsive and fun enough to continue?**

### V2-2 — weapon breadth

Add remaining base weapon behaviors only after V2-1 passes.

### V2-3 — rank/protocol/EVO

Prove coherent build planning and at least one full evolution path.

### V2-4 — pacing/enemy escalation

Add BEACON/ANCHOR/FLICKER, elites and run pacing.

### V2-5 — THE DESYNC + complete run

Complete boss, reconstruction/results and approximately seven-minute end-to-end free loop.

### V2-ECO-1 — Signal Contract + RF ledger

Implement and qualify:

- 1 simulated RF contract entry;
- 0.5 burn / 0.5 reward-funding accounting;
- explicit confirmation;
- deterministic session ledger;
- visible Signal Receipt;
- free-path regression;
- zero live transaction/signature behavior.

### V2-ECO-2 — Identity Atlas / Deep Scan

Implement only after T5 census gate passes:

- free primary pair;
- paid deterministic alternate pair;
- simulated RF receipt;
- no combat power.

### V2-ECO-3 — bounded Signal Forge

Small cosmetic-only catalog if schedule permits. This is the first economy tranche allowed to defer under deadline pressure.

### V2-6 — release qualification

Real-holder, public HTTPS, physical phone, error states, performance, privacy, category qualification and submission packaging.

No tranche silently advances.

## 14. V2-ART-00 minimum artifact set

- FRACTURE GRID environment sample;
- Friend presentation;
- TRACE / SPLIT-A / SPLIT-B;
- Signal XP;
- HP/XP/phase HUD;
- SHIFT button/prompt;
- three-card draft UI;
- DELTA BURST;
- SHIFT transition;
- spawn/hit/death FX;
- candidate SFX;
- `ASSET_MANIFEST.json` evidence.

Economy UI is not required in V2-ART-00; it enters after the complete gameplay loop is proven.

## 15. Category qualification contract

Before final submission, `docs/qualification/V2_THREE_CATEGORY_QUALIFICATION_PROTOCOL.md` must be executed and a closeout report produced.

Minimum category gates:

### Character Spotlight

- real-holder Friend path PASS;
- canonical identity and geometry PASS;
- DELTA BURST/SHIFT materiality PASS;
- exact reconstruction PASS.

### Token Activity

- repeatable simulated RF spend PASS;
- visible 50/50 receipt PASS;
- cumulative ledger reconciliation PASS;
- free-path regression PASS;
- no live transaction/signature PASS.

### Economy Potential

- coherent repeat-use RF loop PASS;
- at least one additional identity/cosmetic sink implemented or bounded/qualified for the final package;
- no pay-to-win regression PASS;
- future persistent/community architecture accurately documented;
- implemented-vs-future distinction PASS.

## 16. Qualification principles

Every implementation tranche must separate:

- PROVEN;
- UNPROVEN;
- UNKNOWN.

And decision state:

- LOCKED;
- PROVISIONAL;
- OPEN;
- DEFERRED;
- REJECTED;
- SUPERSEDED.

Performance/readability/fun/economy claims require evidence appropriate to the claim. Automated tests cannot by themselves prove fun or player retention.

## 17. Current state

**PROVEN**

- V1/T4 qualified fallback exists;
- FriendSDK/canonical-frame integration exists;
- canonical A/B phase derivation exists;
- desktop/narrow automated qualification exists for V1;
- V2 gameplay design is documented;
- V2 visual/asset governance is documented;
- V2 three-category governance/design is documented;
- official Rare Friends docs support the modeled 50% gameplay burn / 50% RF reward-funding split;
- primary asset sources have clear CC0 evidence.

**UNPROVEN**

- V2 combat feel;
- V2 performance under swarm load;
- V2 touch joystick feel;
- V2 enemy/weapon balance;
- V2 seven-minute pacing;
- V2 category economy implementation;
- V2 simulated RF ledger in-browser;
- Deep Scan integration with V2;
- final selected normalized art kit;
- V2 retention/community adoption.

**OPEN**

- V2-ART-00 visual proof;
- V2-1 combat sandbox implementation and qualification.

**AUTHORIZED LATER AFTER PRECEDING GATES**

- V2-ECO-1;
- V2-ECO-2;
- V2-ECO-3.

## 18. Current decision

**READY TO BEGIN V2-ART-00 AND V2-1.**

The three-category product structure is now finalized and part of the implementation baseline. Category economy implementation must follow the locked sequence and does not authorize live token activity.

This is not authorization to implement the complete game/economy in one uncontrolled pass. Each tranche remains bounded and review-gated.