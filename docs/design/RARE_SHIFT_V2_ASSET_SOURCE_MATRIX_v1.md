# RARE//SHIFT V2 — ASSET SOURCE MATRIX v1

**Status:** FINALIZED FOR V2-ART-00 SELECTION  
**Governance:** `docs/governance/RARE_SHIFT_V2_VISUAL_ASSET_GOVERNANCE_v1.md`

## 1. Objective

Use existing commercial-safe source assets only where they materially reduce production time, while keeping RARE//SHIFT visually coherent and original.

No full external library is imported wholesale. Source packs are discovery pools; production uses only individually selected files with provenance records.

## 2. Primary approved source families

| Need | Primary source | License evidence | Production policy |
|---|---|---|---|
| 16×16 structural pixels / icons | Kenney 1-Bit Pack | Official Kenney page: CC0 | Select primitives; palette/shape normalize |
| Keyboard/mouse/controller/touch prompts | Kenney Input Prompts Pixel 1-Bit | Official Kenney page: CC0 | Direct glyph source; normalize presentation |
| HUD panel/button geometry | Kenney UI Pack - Sci-Fi | Official Kenney page: CC0 | Structural base only; final layout/style original |
| General VFX textures | Kenney Particle Pack | Official Kenney page: CC0 | Tint/scale/procedural composition in Phaser |
| Combat/phase SFX candidates | Kenney Sci-fi Sounds | Official Kenney page: CC0 | Select per sound; process/normalize |
| Hit/death SFX candidates | Kenney Impact Sounds | Official Kenney page: CC0 | Select per sound; process/normalize |
| UI/upgrade SFX candidates | Kenney Interface Sounds | Official Kenney page: CC0 | Select per sound; process/normalize |

Kenney's official support states its game assets are CC0/public-domain licensed and may be used commercially; attribution is not required.

## 3. Secondary approved research candidates

| Candidate | Use | License status | Decision |
|---|---|---|---|
| OpenGameArt — 16x16 Dark Tech Base Tileset | material motifs / selected environment primitives | individual page reports CC0 | APPROVED FOR V2-ART-00 CANDIDATE TEST ONLY |
| OpenGameArt — Animated Particle Effects #1 | large FX candidate | individual page reports CC0 | APPROVED FOR CANDIDATE TEST ONLY |
| OpenGameArt — Animated Particle Effects #2 | teleport/energy/impact candidate | individual page reports CC0 | APPROVED FOR CANDIDATE TEST ONLY |

OpenGameArt collection pages are not sufficient license evidence. Any additional OGA asset requires its individual page to confirm CC0 before import.

## 4. Source repositories as discovery/index mirrors

These repositories may accelerate browsing but are not final license authority:

- `Tiddybub/2d-assets` — large categorized mirror with `SOURCE.md` provenance records;
- `series-ai/jam-ready-assets` — organized jam-ready packs and license-evidence paths.

Use original Kenney/OpenGameArt pages as the preferred external evidence when available.

## 5. V2-ART-00 exact sourcing plan

### FRACTURE GRID

Primary source pool:
- Kenney 1-Bit Pack.

Secondary experiment:
- selected Dark Tech Base geometry if it survives normalization.

Production requirement:
- final arena composition and phase language are original;
- source tiles are primitives only.

### TRACE / SPLIT-A / SPLIT-B

Primary approach:
- construct from simple 1-bit primitives and original RARE//SHIFT marks;
- use procedural A/B/Common overlays.

Do not import recognizable third-party enemies unchanged.

### Signal XP

Primary approach:
- select or derive a small 1-bit geometric source;
- transform into a unique Signal XP glyph;
- animate/glow procedurally.

### HUD + upgrade cards

Primary source pool:
- Kenney UI Pack - Sci-Fi for border/panel primitives;
- Kenney Input Prompts Pixel 1-Bit for input glyphs.

Final HUD layout remains RARE//SHIFT-specific.

### DELTA BURST / RECONSTRUCTION FIELD

Source:
- canonical Friend A_ONLY/B_ONLY/COMMON data.

External art:
- none for core shape.

Supporting particles:
- Kenney Particle Pack candidates only.

### SHIFT

Source:
- canonical Friend frames + procedural Phaser effect.

Supporting texture:
- optional Kenney Particle Pack ring/spark texture.

No stock transformation animation.

### Enemy spawn / hit / death

Primary:
- Kenney Particle Pack procedural compositions.

Secondary candidate:
- OpenGameArt Animated Particle Effects #1/#2 if performance/style proof is superior after normalization.

### Audio

Source pools:
- Kenney Sci-fi Sounds;
- Kenney Impact Sounds;
- Kenney Interface Sounds.

Select exact files only after in-game audition.

## 6. Do-not-source list

Do not search/import third-party substitutes for:

- canonical Friend sprite/animation;
- DELTA BURST geometry;
- RECONSTRUCTION FIELD geometry;
- SHIFT identity transition;
- run reconstruction/proof visualization;
- RARE//SHIFT phase glyph system.

These are identity-critical and should remain native/procedural.

## 7. Transformation classes

Every production asset is assigned one class:

- **NATIVE** — generated from canonical Friend/game data;
- **PROCEDURAL** — created at runtime from geometry/particles;
- **DERIVED_CC0** — transformed from a recorded CC0 source;
- **DIRECT_CC0** — direct-use utility glyph/audio where stylistically neutral;
- **ORIGINAL** — authored specifically for RARE//SHIFT.

Identity-critical assets should be NATIVE, PROCEDURAL or ORIGINAL.

## 8. V2-ART-00 target bundle

The first normalized proof requires only:

1. FRACTURE GRID floor + boundary sample;
2. COMMON/A/B phase markers;
3. TRACE;
4. SPLIT-A;
5. SPLIT-B;
6. Signal XP;
7. HP/XP/phase HUD fragment;
8. desktop + touch SHIFT prompt/control;
9. three-card upgrade overlay;
10. DELTA BURST pulse;
11. SHIFT transition;
12. enemy spawn/hit/death FX;
13. candidate SFX set;
14. complete provenance manifest entries.

No boss, complete weapon roster, or full arena asset production is required for V2-ART-00.

## 9. Licensing verification notes

Verified during planning review:

- Kenney 1-Bit Pack: CC0;
- Kenney Input Prompts Pixel 1-Bit: CC0;
- Kenney UI Pack - Sci-Fi: CC0;
- Kenney Particle Pack: CC0;
- Kenney Sci-fi Sounds: CC0;
- Kenney Impact Sounds: CC0;
- Kenney Interface Sounds: CC0;
- OpenGameArt 16x16 Dark Tech Base Tileset: CC0;
- OpenGameArt Animated Particle Effects #1: CC0;
- OpenGameArt Animated Particle Effects #2: CC0.

License must still be recorded alongside the exact selected source files at import time.

## 10. Final sourcing decision

**LOCKED:** Kenney CC0 is the default external production source family.  
**LOCKED:** OpenGameArt is secondary and individual-asset CC0 verification is mandatory.  
**LOCKED:** signature RARE//SHIFT effects remain native/procedural.  
**LOCKED:** no bulk asset-library imports.  
**LOCKED:** every external source receives provenance + SHA evidence before production approval.