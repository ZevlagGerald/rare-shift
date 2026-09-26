# RARE//SHIFT V2 — PRE-IMPLEMENTATION ALIGNMENT REVIEW

**Status:** COMPLETE  
**Scope:** gameplay + visual + asset + architecture + competition fallback alignment  
**Branch:** `planning/v2-survivor-restructure`

## 1. Review objective

Determine whether RARE//SHIFT V2 is internally coherent enough to begin bounded implementation without silently mixing V1, T5 economy, copied Survivor.io expression, inconsistent art packs or unverified asset licensing.

## 2. Alignment result

### Product

PASS.

The game thesis remains mechanically tied to the selected Rare Friend:

- canonical A/B frames remain authoritative;
- SHIFT remains mechanically central;
- DELTA BURST uses real A_ONLY/B_ONLY geometry;
- Friend differences are sidegrades rather than rarity power.

The V2 survivor loop strengthens replayability without removing Character Spotlight.

### Gameplay

PASS FOR IMPLEMENTATION ENTRY.

Core loop, controls, phase threat classes, XP/draft loop, slot limits, rank system and EVO contract are sufficiently defined to implement V2-1.

Exact numbers remain appropriately provisional.

### V1 compatibility

PASS.

V1/T4 remains a frozen qualified fallback. V2 does not rewrite qualification history.

### Economy

PASS WITH DEFERRED STATUS.

T5 Deep Scan economy implementation is not part of the V2 critical path. Economy follows fun-loop qualification.

### Multiplayer

PASS WITH DEFERRED STATUS.

No backend or real-time multiplayer dependency is introduced before single-player combat proves itself.

### Visual identity

PASS AFTER GOVERNANCE ADDITION.

The missing visual/asset authority has been added. V2 now has explicit rules for canonical Friend protection, phase grammar, palette lineage, environment, enemy readability, signature VFX and HUD consistency.

### External assets

PASS FOR CANDIDATE SELECTION.

Primary candidate sources are Kenney CC0 families. OpenGameArt is secondary and requires individual CC0 verification. No bulk library import is authorized.

Every selected source file requires provenance and SHA evidence before production approval.

### Copyright / inspiration boundary

PASS.

V2 adopts broad survival-roguelite mechanics but rejects copying Survivor.io character art, names, weapon roster, numerical tables, UI layouts, maps, story, sound, branding and monetization expression.

### Technical architecture

PASS.

FriendSDK ownership/session boundary is preserved. Phaser remains rendering/input/pooling authority while pure deterministic modules own game rules where practical.

### Performance

OPEN.

Object pooling and bounded counts are required, but actual safe enemy/projectile/FX counts are not yet proven. V2-1 stress measurement must determine them.

### Fun / retention

OPEN.

The design is credible, but no document or automated test can prove fun, replayability or community retention. V2-1 exists specifically to test the first 30–60 seconds of combat before further scope expansion.

## 3. Contradictions reviewed

### V1 three-chamber target vs V2 survivor loop

RESOLVED.

V1 governance remains authoritative only for frozen V1. V2 governance explicitly supersedes the three-chamber/2–4-minute lock for V2 planning and implementation.

### V1 rejected skill trees vs V2 weapon upgrading

RESOLVED.

V2 uses in-run weapon ranks/protocols/EVO, not an uncontrolled persistent skill-tree expansion.

### T5 economy vs gameplay V2

RESOLVED.

T5 implementation is deferred. Census data may remain research evidence.

### Existing cyan/magenta phase color vs accessibility

RESOLVED BY RULE.

A/B retain visual lineage, but gameplay state must also use silhouette/glyph/effect/motion differences.

### Third-party asset speed vs coherent art direction

RESOLVED BY NORMALIZATION PIPELINE.

External assets are source primitives, not final style authority.

### Canonical NFT art vs external player art

RESOLVED.

FriendSDK canonical art remains the player identity. No external substitute/redraw is allowed.

## 4. PROVEN / UNPROVEN / UNKNOWN

### PROVEN

- V1/T4 qualified fallback is preserved;
- real Friend/canonical frame integration already exists;
- existing A/B/Common visual lineage exists in production code;
- V2 gameplay governance exists;
- V2 game design exists;
- V2 visual/asset governance now exists;
- Kenney primary candidate families carry official CC0 licensing;
- selected OpenGameArt candidate pages reviewed for this plan report CC0.

### UNPROVEN

- final normalized V2 art quality;
- V2 combat feel;
- DELTA BURST balance across all Friend families;
- V2 touch joystick quality;
- swarm performance;
- draft pacing;
- weapon balance;
- boss design in implementation;
- seven-minute pacing;
- player retention.

### UNKNOWN UNTIL TESTED

- empirical maximum active enemy/projectile/particle counts at acceptable mobile performance;
- which exact CC0 source files survive visual normalization;
- whether damage numbers improve or harm readability;
- exact SFX selections;
- final tuning values.

## 5. Decision status

**LOCKED**

- V2 product/genre;
- canonical Friend authority;
- SHIFT combat;
- DELTA BURST identity weapon;
- XP + three-card draft;
- weapon/protocol/EVO architecture;
- FRACTURE GRID direction;
- Kenney-first CC0 sourcing;
- per-file provenance;
- procedural signature effects;
- T4 fallback protection;
- economy/multiplayer deferral.

**PROVISIONAL**

- exact assets selected from approved source pools;
- exact numerical balance;
- exact wave timing;
- exact FX intensity;
- exact SFX;
- damage numbers;
- final HUD spacing.

**OPEN**

- V2-ART-00;
- V2-1 combat sandbox.

## 6. Implementation entry decision

**GO — BOUNDED.**

Authorized next work:

1. V2-ART-00 visual normalization proof and provenance manifest.
2. V2-1 combat sandbox using the approved master baseline.

Not authorized by this review:

- bulk asset import;
- complete seven-minute content build in one tranche;
- live RF economy;
- multiplayer/backend;
- merge to main;
- production deployment;
- replacement of frozen T4 before V2 qualification.
