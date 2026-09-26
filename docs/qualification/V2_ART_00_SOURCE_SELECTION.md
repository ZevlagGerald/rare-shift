# RARE//SHIFT V2-ART-00 — SOURCE SELECTION RECORD

**Status:** ACTIVE — CANDIDATE SELECTION  
**Branch:** `feature/v2-art00-visual-normalization`

## Decision

V2-ART-00 is **procedural-first**. RARE//SHIFT does not bulk-import a third-party sprite library.

Environment texture, TRACE/SPLIT enemy silhouettes, Signal XP, DELTA BURST geometry and SHIFT identity effects are generated from project code/canonical Friend data so one visual grammar remains authoritative.

External assets are admitted only when they save production time without making the game look asset-flipped.

## Verified source pools

### Kenney 1-Bit Pack

- Publisher: Kenney
- Intended use: optional 16×16 structural/icon primitives only
- License: CC0 1.0
- Mirror license path: `kenney/2D assets/1-Bit Pack/License.txt`
- Mirror license blob SHA: `b0d059e9c64331d2855252bf4db376a25ceccc7f`
- Status: **VERIFIED SOURCE POOL — NO PRODUCTION FILE SELECTED YET**

### Kenney UI Pack: Sci-fi

- Publisher: Kenney
- Intended use: optional panel/button geometry references or normalized primitives
- License: CC0 1.0
- Mirror license path: `kenney/UI assets/UI Pack - Sci-fi/License.txt`
- Mirror license blob SHA: `ba344288bdfc1d7cb0a4e6775c01e635cc4c6774`
- Status: **VERIFIED SOURCE POOL — NO PRODUCTION FILE SELECTED YET**

### Kenney Sci-Fi Sounds

- Publisher: Kenney
- Intended use: bounded candidate combat/phase SFX
- License: CC0 1.0
- Mirror license path: `kenney/Audio/Sci-Fi Sounds/License.txt`
- Mirror license blob SHA: `7afc21fd71c486d1b93308c03f5994b8cf463a44`
- Status: **VERIFIED SOURCE POOL — CANDIDATES ONLY**

Candidate files:

| Intended event | Candidate | Git blob SHA | State |
|---|---|---|---|
| SHIFT | `forceField_000.ogg` | `4e0ec193ced9174ffef7ab812de592e315175ac0` | CANDIDATE |
| DELTA BURST | `laserSmall_000.ogg` | `da58a9a11df6687f9b7aab36c98ca6c085a2af15` | CANDIDATE |
| enemy hit | `impactMetal_000.ogg` | `29ef4c9bf64e8beae6a3658965c0d2dd93af6506` | CANDIDATE |
| enemy death | `explosionCrunch_000.ogg` | `d424c04eecf8a8d26dd8701a218a62567c3c7c02` | CANDIDATE |
| future heavy weapon | `laserLarge_000.ogg` | `02c4a60c27e9896e072002127950f99a16b3856f` | CANDIDATE |
| future retro/signal accent | `laserRetro_000.ogg` | `0dd1057e8285d2fd91c2138a9af1b2d6bcd76d8b` | CANDIDATE |

No sound is production-approved until it is auditioned in context, copied as an exact bounded file, SHA-256 hashed, and recorded in `ASSET_MANIFEST.json`.

### Kenney Interface Sounds

- Publisher: Kenney
- Intended use: upgrade-card/UI interaction candidates
- License: CC0 1.0
- Mirror license path: `kenney/Audio/Interface Sounds/License.txt`
- Mirror license blob SHA: `1fc5acf8243a8ac899403e7297f8c5efdc4258f2`
- Status: **VERIFIED SOURCE POOL — CANDIDATES ONLY**

Candidates:

| Intended event | Candidate | Git blob SHA | State |
|---|---|---|---|
| card select | `click_001.ogg` | `667db57313b5dd7ce3e8871992a54c00d7acbf1c` | CANDIDATE |
| panel/back | `back_001.ogg` | `75e3ebd8a33f7cb41e54f0792e79838e43043165` | CANDIDATE |

## Procedural production authority

The following V2-ART-00 elements are intentionally project-native:

- FRACTURE GRID visual texture;
- TRACE silhouette;
- SPLIT-A silhouette;
- SPLIT-B silhouette;
- Signal XP silhouette;
- A/B/Common phase grammar;
- DELTA BURST exact A_ONLY/B_ONLY geometry;
- SHIFT transition composition;
- spawn/hit/death composition rules;
- core HUD and draft-card composition.

Canonical Friend art remains supplied by FriendSDK/on-chain canonical sprite data and is never replaced by this asset system.

## Admission rule

A source pool being CC0 does **not** make every file automatically part of RARE//SHIFT. The production manifest remains authoritative. Candidate status is not production approval.
