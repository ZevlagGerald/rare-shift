# RARE//SHIFT V2 MASTER IMPLEMENTATION BASELINE v1

**Status:** ACTIVE — SINGLE ENTRY POINT FOR V2 IMPLEMENTATION  
**Owner authority:** final  
**Branch:** `planning/v2-survivor-restructure`

## 1. Purpose

This document is the implementation index for RARE//SHIFT V2. It reconciles gameplay, visual, asset, technical and competition constraints before code work begins.

Implementers must read the documents below together. No single companion document may be interpreted in isolation when another document narrows it.

## 2. Authoritative documents

1. `docs/governance/RARE_SHIFT_V2_SURVIVAL_GOVERNANCE_v1.md` — gameplay/product/technical authority.
2. `docs/governance/RARE_SHIFT_V2_VISUAL_ASSET_GOVERNANCE_v1.md` — visual/asset/license authority.
3. `docs/design/RARE_SHIFT_V2_SURVIVAL_GAME_DESIGN_v1.md` — finalized gameplay design specification.
4. `docs/design/RARE_SHIFT_V2_ASSET_SOURCE_MATRIX_v1.md` — approved asset sourcing and V2-ART-00 selection plan.
5. Frozen V1/T4 qualification evidence — fallback authority for already proven V1 behavior.

If a conflict occurs:

- owner instruction overrides project documents;
- this master baseline defines V2 document precedence;
- governance overrides design detail;
- qualification evidence proves only the version/tranche it actually tested;
- provisional design values may be changed only through reviewed qualification work.

## 3. Product definition

RARE//SHIFT V2 is a **phase-shifting survival action roguelite / bullet-heaven**.

Core pitch:

> **Your Friend is not a skin. Its animation is your weapon and the battlefield's phase law.**

The selected owned Rare Friend's canonical animation remains mechanically indispensable.

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
```

Competition-facing run target is approximately seven minutes after short calibration, subject to pacing qualification.

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

## 7. Locked visual identity

- canonical Friend art is preserved;
- phase lineage inherits A `#4cc9f0`, B `#f72585`, COMMON `#e8edf2`, dark VOID/background lineage;
- phase readability uses shape + effect + color;
- environment is FRACTURE GRID, an original composition;
- signature effects DELTA BURST / RECONSTRUCTION FIELD / SHIFT remain canonical/procedural rather than stock animations;
- external packs are normalized before production use;
- no mixed asset-pack appearance.

## 8. Locked asset policy

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

## 9. Architecture

Preserve:

`FriendSDK runtime → GameSession → React adapter → Phaser 4.2.1 → deterministic pure gameplay modules`

Planned pure modules:

- survival-core;
- phase-combat-core;
- weapon-core;
- draft-core;
- evolution-core;
- enemy-core;
- spawn-core;
- score-core.

Phaser owns rendering, camera, pooling, collisions, effects and input adaptation.

## 10. V1 fallback protection

Frozen qualified fallback:

`feature/t4-reconstruction-finale`

V2 work may not rewrite T4 qualification history or require V1 to be abandoned before V2 passes replacement gates.

V2 becomes the competition candidate only after its own vertical-slice admission requirements pass.

## 11. Economy and multiplayer

**DEFERRED:**

- live/simulated RF economy implementation;
- Deep Scan spending UI;
- multiplayer/co-op;
- backend leaderboard;
- clans;
- permanent power economy.

T5 alternate-pair census research may continue to exist as evidence, but it is not on the critical V2 implementation path.

## 12. Implementation sequence

### V2-ART-00 — visual normalization proof

Must establish the production visual language and exact selected asset provenance before mass integration.

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

Complete boss, reconstruction/results and approximately seven-minute end-to-end loop.

### V2-6 — release qualification

Real-holder, public HTTPS, phone, error states, performance, privacy and submission packaging.

No tranche silently advances.

## 13. V2-ART-00 minimum artifact set

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

## 14. Qualification principles

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

Performance/readability/fun claims require evidence appropriate to the claim. Automated tests cannot by themselves prove fun.

## 15. Current state

**PROVEN**

- V1/T4 qualified fallback exists;
- FriendSDK/canonical-frame integration exists;
- canonical A/B phase derivation exists;
- desktop/narrow automated qualification exists for V1;
- V2 gameplay design is documented;
- V2 visual/asset governance is documented;
- primary asset sources have clear CC0 evidence.

**UNPROVEN**

- V2 combat feel;
- V2 performance under swarm load;
- V2 touch joystick feel;
- V2 enemy/weapon balance;
- V2 seven-minute pacing;
- V2 retention/community adoption;
- final selected normalized art kit.

**OPEN**

- V2-ART-00 visual proof;
- V2-1 combat sandbox implementation and qualification.

## 16. Current decision

**READY TO BEGIN V2-ART-00 AND V2-1.**

This is not authorization to implement the complete seven-minute game in one uncontrolled pass. Each tranche remains bounded and review-gated.