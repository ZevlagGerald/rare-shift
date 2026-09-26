# RARE//SHIFT V2 VISUAL + ASSET GOVERNANCE v1

**Status:** ACTIVE — OWNER APPROVED FOR V2  
**Project:** RARE//SHIFT  
**Applies to:** V2 survival-action implementation only  
**Companion gameplay governance:** `RARE_SHIFT_V2_SURVIVAL_GOVERNANCE_v1.md`

## 1. Visual thesis

RARE//SHIFT V2 is **canonical Rare Friends 1-bit identity inside a fractured computational phase-space**.

The selected Rare Friend remains visually authentic and mechanically authoritative. World art, enemies, UI and VFX must support that identity rather than overpower it.

The visual system must never look like unrelated asset packs pasted together.

## 2. Existing canonical palette authority

V2 inherits the established RARE//SHIFT phase language already present in the qualified build:

- Background / VOID: `#0b0e12` / `#11151b` / `#202832`
- Phase A: `#4cc9f0`
- Phase B: `#f72585`
- COMMON / resolved identity: `#e8edf2`
- Primary foreground: near-white `#f2f6f8`

These values are the starting design tokens, not permission to use color as the only phase cue.

## 3. Phase visual grammar

Every gameplay-critical phase state must communicate through **shape + motion/effect + color**.

### A_ONLY
- angular / broken / directional motifs;
- Phase-A glyph or edge marker;
- A-phase accent color;
- matching A motion treatment.

### B_ONLY
- offset / mirrored / flowing motifs;
- Phase-B glyph or edge marker;
- B-phase accent color;
- matching B motion treatment.

### COMMON
- stable / structural / centered motifs;
- neutral bright treatment;
- lower distortion than A/B.

### VOID / inactive
- dark / quiet / low-contrast;
- must not compete with threats or pickups.

Accessibility must never depend on cyan/magenta distinction alone.

## 4. Canonical Friend protection

The owned Rare Friend is sourced from FriendSDK canonical art.

Do not:

- redraw the Friend into a third-party style;
- replace its silhouette;
- add permanent armor/clothing overlays that conceal identity;
- use generated substitute frames;
- distort canonical geometry for ordinary combat readability.

Allowed non-destructive presentation:

- outline / halo;
- shadow;
- temporary hit flash;
- SHIFT scan displacement;
- phase ring;
- DELTA mask projection;
- temporary reconstruction / proof effects.

## 5. External asset policy

External production art is permitted only when:

1. the license is individually verified from the original or authoritative source;
2. commercial modification/use is clearly permitted;
3. the exact source URL, author/source, license, original filename and transformation are recorded;
4. the asset passes visual normalization;
5. it does not imitate Survivor.io or another game’s protected expression.

### Preferred license class

- CC0 / public-domain-equivalent assets are preferred.

### Rejected by default

- unknown or ambiguous license;
- “free” without explicit reuse terms;
- ripped game assets;
- fan recreations of copyrighted game art;
- marketplace packs with unclear redistribution/modification terms;
- GPL/copyleft art bundles whose asset-level obligations are unclear;
- assets carrying embedded logos/watermarks.

No asset-library repository is trusted as the sole license authority when an original source exists.

## 6. Approved source families

### Primary — Kenney CC0

Approved source families for selection and transformation:

- 1-Bit Pack — structural pixel source / environment motifs / simple icons;
- Input Prompts Pixel 1-Bit — keyboard, mouse, controller and touch prompts;
- UI Pack - Sci-Fi — panel and control geometry only, restyled before production use;
- Particle Pack — VFX texture source;
- Sci-fi Sounds — candidate combat/phase audio;
- Impact Sounds — candidate hit/death audio;
- Interface Sounds — candidate UI/upgrade audio.

Kenney assets may be used commercially under CC0 according to the official asset pages/support documentation. Attribution is optional, but internal provenance remains mandatory.

### Secondary — OpenGameArt CC0 only

OpenGameArt may be used only **per asset**, after the individual page confirms CC0. Collections are discovery aids, not license proof.

Initially approved research candidates:

- 16x16 Dark Tech Base Tileset — material/reference shapes, not direct whole-arena adoption;
- Animated Particle Effects #1/#2 — selective large FX if they normalize cleanly.

Any additional OpenGameArt asset remains UNAPPROVED until its individual license page is recorded.

## 7. Visual normalization pipeline

Every imported visual asset must pass:

`SOURCE → LICENSE VERIFY → CROP/CLEAN → SCALE NORMALIZE → PALETTE NORMALIZE → PHASE GRAMMAR → READABILITY TEST → PRODUCTION`

Rules:

- nearest-neighbor for pixel assets;
- no mixed pixel densities at gameplay scale without explicit rationale;
- strip decorative colors that conflict with phase authority;
- normalize contrast and outline weight;
- create A/B/Common variants procedurally where possible instead of duplicating art;
- preserve source originals outside production output for auditability.

## 8. Asset architecture

Target repository structure:

```text
games/rare-shift/assets/
  vendor/
    kenney/
    opengameart/
  production/
    environment/
    enemies/
    pickups/
    ui/
    fx/
    audio/
  ASSET_MANIFEST.json
  THIRD_PARTY_NOTICES.md
```

`vendor/` contains only explicitly selected source files, not complete external libraries.

`production/` contains normalized files actually used by RARE//SHIFT.

## 9. Provenance manifest requirement

Every imported asset record must include at minimum:

- internal asset ID;
- production path;
- vendor/source path;
- source title;
- original source URL;
- source author/publisher;
- license identifier;
- license evidence URL/path;
- original filename;
- SHA-256 of imported source;
- transformation summary;
- production output SHA-256;
- approval status.

CC0 assets still require provenance records.

## 10. Environment — FRACTURE GRID

FRACTURE GRID must remain an original RARE//SHIFT composition.

External tiles may supply structural primitives only. The arena layout, phase barriers, hazard language, signal caches, floor patterns and composition are original.

V2-1 minimum production environment:

- base floor;
- COMMON structural tile family;
- A-phase marker/barrier family;
- B-phase marker/barrier family;
- arena boundary treatment;
- signal cache;
- sparse noninteractive detail.

No dense decorative tileset should reduce combat readability.

## 11. Enemy visual system

Enemies should read as corrupted signal entities rather than unrelated fantasy/zombie sprites.

For V2-1:

- TRACE — COMMON silhouette;
- SPLIT-A — distinct A-aligned silhouette/internal mark;
- SPLIT-B — distinct B-aligned silhouette/internal mark.

A/B variants may share a base construction only if silhouette/icon/effect differences remain readable without color.

Enemy art may be derived from simple CC0 pixel primitives, but final production enemies must be normalized enough that the source pack is not visually dominant.

## 12. Skill / weapon VFX authority

Signature mechanics should be procedural whenever that strengthens identity.

### DELTA BURST
- no stock attack sprite;
- generated from the selected Friend’s real A_ONLY/B_ONLY mask;
- external textures may support particles only.

### RECONSTRUCTION FIELD
- generated from A_ONLY / COMMON / B_ONLY data;
- no stock spell animation.

### VECTOR NEEDLE / PRISM LANCE
- procedural projectile/line geometry + normalized impact texture.

### ORBIT NODES / SYNC HALO
- small normalized glyph/node + procedural orbit.

### ECHO MINE / MEMORY COLLAPSE
- small normalized mine mark + procedural arming/link/detonation.

### SIGNAL ARC / CHAIN RESONANCE
- procedural segmented line/arc + normalized hit particles.

### SHIFT
SHIFT is a signature effect and must remain original/code-driven:

canonical frame → pixel/scan displacement → phase ring → next canonical frame → settle.

Stock “teleport/magic transform” sprites may not replace SHIFT.

## 13. HUD + upgrade card system

The HUD remains compact and combat-first.

Required information:

- HP;
- Signal XP / level;
- run timer;
- current phase;
- SHIFT readiness/state;
- active weapons;
- protocols;
- boss HP when applicable.

The level-up overlay presents exactly three readable cards and pauses hostile simulation.

Cards must show:

- icon;
- name;
- type (weapon/protocol/EVO);
- current → next rank when relevant;
- concise mechanical effect;
- EVO requirement/progress when relevant.

Third-party UI packs may provide panel geometry but may not dictate the final RARE//SHIFT layout or visual identity.

## 14. Combat feedback

V2 should prefer clean, bounded feedback over screen-filling noise.

Required feedback classes:

- enemy hit;
- matching-phase hit;
- off-phase/ECHO hit;
- enemy death;
- player damage + brief invulnerability feedback;
- XP pickup;
- level-up;
- Evolution Core reward;
- elite/boss warning;
- boss phase/vulnerability telegraph.

Damage numbers are PROVISIONAL. If used, they must be pooled/bounded, readable and reducible/disableable if they harm swarm clarity.

## 15. Audio sourcing

Audio may use CC0 source libraries after exact-file review.

Candidate families:

- Kenney Sci-fi Sounds;
- Kenney Impact Sounds;
- Kenney Interface Sounds.

Audio must be normalized for loudness, duration and tonal consistency. Do not ship an uncurated random collection.

Mute remains mandatory. Reduced-motion settings must not remove essential nonvisual gameplay information.

## 16. V2-ART-00 gate

Before mass asset integration, produce a bounded visual normalization proof containing:

- one FRACTURE GRID environment sample;
- canonical Friend presentation;
- TRACE;
- SPLIT-A;
- SPLIT-B;
- Signal XP;
- HP/XP/phase HUD fragment;
- SHIFT control;
- three-card upgrade overlay;
- DELTA BURST;
- SHIFT transition;
- enemy hit/death/spawn FX;
- provenance entries for every external file used.

The proof must be reviewed at both 960×640 and narrow-phone presentation.

## 17. Decision statuses

**LOCKED**

- canonical Friend art remains untouched;
- existing A/B/Common/VOID palette lineage;
- shape + effect + color phase readability;
- Kenney CC0 as primary external source family;
- OpenGameArt only by individually verified CC0 asset;
- procedural signature VFX;
- asset provenance manifest;
- visual normalization before production use;
- no bulk copying of external libraries;
- V2-ART-00 before mass integration.

**PROVISIONAL**

- exact environment tile selection;
- exact enemy source primitives;
- exact particle texture selection;
- exact SFX files;
- damage-number policy;
- final typography scale and HUD spacing.

**REJECTED**

- unlicensed/ripped assets;
- direct Survivor.io visual imitation;
- mixed unnormalized art packs;
- stock effect replacing SHIFT or DELTA BURST;
- NFT rarity expressed as visual/stat superiority.

## 18. Owner authority

The Owner remains final authority. No external asset becomes production-approved merely because it is CC0; visual fit and provenance still require review.