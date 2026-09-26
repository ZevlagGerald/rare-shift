# RARE//SHIFT V2 SURVIVAL GOVERNANCE v1

**Status:** ACTIVE FOR V2 IMPLEMENTATION PLANNING — OWNER APPROVED PIVOT  
**Project:** RARE//SHIFT  
**Genre:** phase-shifting survival action roguelite / bullet-heaven  
**Engine:** Phaser 4.2.1  
**SDK:** FriendSDK v0.1.2  
**Language:** TypeScript  
**Primary Vibeathon category:** Character Spotlight  
**Secondary category relevance:** Token Activity, Economy Potential

## 1. V2 authority and relationship to V1

The Owner explicitly authorized restructuring RARE//SHIFT around a Survivor.io-style survival-action loop with in-run weapon upgrading and evolution.

The qualified V1/T4 build remains frozen and recoverable as the competition fallback. V2 does not rewrite T4 history.

`RARE_SHIFT_VIBEATHON_DESIGN_GOVERNANCE_v1.md` remains authoritative for the frozen V1 build, but its locks on a 2–4 minute three-chamber structure and rejected large-game scope are **SUPERSEDED for V2 planning only** by this document.

Three-category economy authority is defined by `RARE_SHIFT_V2_THREE_CATEGORY_GOVERNANCE_v1.md`. The older standalone T5 Deep Scan economy direction is superseded as the primary economy plan; its alternate-pair census remains useful evidence for V2-ECO-2 / Identity Atlas.

Simulated category-economy implementation is authorized only after its preceding gameplay gates. Live RF transfers, approvals, signatures, production burn/reward routing and token contracts remain DEFERRED.

## 2. Product thesis

The core thesis remains:

> **Your Friend is not a skin. Its animation is the rules.**

V2 expands that thesis into an action game:

> **Survive a battlefield split between two canonical realities. Move, build a weapon loadout, evolve it, and SHIFT your Friend to change which threats and attacks are fully real.**

The Rare Friend must remain mechanically indispensable. V2 must not become a generic survivor game with an NFT portrait attached.

## 3. Genre inspiration boundary

V2 may adopt broad survival-roguelite genre mechanics such as:

- movement-focused controls;
- automatic weapon firing;
- escalating enemy density;
- XP drops and in-run levels;
- three-choice upgrade drafts;
- limited weapon and passive/protocol slots;
- multi-rank weapons;
- conditional weapon evolution;
- elites, bosses and reward drops;
- short repeatable runs;
- run results and build summaries.

V2 must not copy Survivor.io characters, names, art, exact weapon roster, exact numerical tables, UI layouts, maps, narrative, sound, branding, monetization systems or proprietary content.

All RARE//SHIFT weapons, protocols, enemies, bosses, effects, terminology and progression must be original and must reinforce canonical phase play.

## 4. Core controls

Desktop:

- WASD / arrow keys: movement;
- Space: SHIFT;
- upgrade choices: keyboard and pointer accessible;
- SDK menu/pause retained.

Touch:

- virtual movement stick;
- dedicated SHIFT control;
- large upgrade cards suitable for narrow-phone play.

Weapons fire automatically. Manual aiming is not required for the initial V2 release.

SHIFT is the only mandatory active combat button beyond movement.

## 5. Canonical Friend authority

FriendSDK remains authoritative for wallet, ownership, eligibility, selected Friend and canonical sprite reads.

The game continues to read the selected Friend's canonical 64 16×16 frames and deterministically derives a qualified pair A/B:

- `COMMON = A ∩ B`
- `A_ONLY = A − B`
- `B_ONLY = B − A`
- `DELTA = A XOR B`

Canonical data may determine:

- the Friend's signature weapon geometry;
- Phase A / Phase B combat visualization;
- deterministic phase fingerprinting;
- selected phase-field hazards or arena motifs;
- result/reconstruction evidence.

Canonical metrics must not grant raw rarity-based power. Different Friends should produce sidegrades, not pay-to-win advantages.

## 6. Phase combat contract

The battlefield contains three threat classes:

- **A-aligned:** fully corporeal/dangerous in Phase A;
- **B-aligned:** fully corporeal/dangerous in Phase B;
- **COMMON:** dangerous in both phases.

SHIFT toggles Phase A ↔ Phase B and changes the displayed canonical Friend pose.

Phase alignment must materially affect combat. A/B enemies are visually and mechanically distinct in matching vs nonmatching phase. Off-phase behavior must remain readable and must not create unavoidable damage.

The initial V2 balance target is:

- matching-phase attacks deal full intended effect;
- off-phase interaction is strongly reduced or disabled depending on the weapon/enemy contract;
- COMMON threats prevent SHIFT from becoming a universal escape button;
- every boss requires deliberate SHIFT use.

Exact percentages remain PROVISIONAL until combat simulation and playtesting.

## 7. Signature weapon

Every run begins with the selected Friend's original signature weapon: **DELTA BURST**.

DELTA BURST uses the Friend's actual active phase-difference pixels (`A_ONLY` or `B_ONLY`) as the local damage-field geometry around the Friend.

Damage must be normalized by occupied signature pixels so Friends with more differing pixels receive broader geometry rather than automatically higher total power.

DELTA BURST is the clearest mechanical proof that the NFT changes combat and therefore must remain viable through the full run.

## 8. In-run build system

Target V2 inventory:

- 4 active weapon slots total, including DELTA BURST;
- 4 protocol/passive slots;
- each active weapon has ranks I–V;
- protocols have bounded ranks appropriate to their effect;
- a rank-V weapon plus its required protocol makes an evolution eligible;
- an elite/boss Evolution Core confirms the evolution.

Level-up presents three choices. Choices may:

- add a new weapon while slots remain;
- rank an owned weapon;
- add a protocol while slots remain;
- rank an owned protocol;
- offer an eligible evolution when the proper gate is satisfied.

At least one bounded reroll/refract mechanism is required to reduce dead-build RNG. No paid rerolls in the initial V2.

## 9. Weapon design principles

Weapons must differ primarily by behavior, not only DPS.

Required archetype coverage:

- canonical local burst / identity weapon;
- fast single-target auto-targeting weapon;
- orbit/contact-control weapon;
- delayed area-control weapon;
- chain/multi-target weapon.

Evolution must materially change behavior or tactical role, not merely add a large damage multiplier.

No single weapon/build may be intentionally designed as the universal meta solution.

## 10. Run structure

Competition-facing V2 target: approximately **7 minutes** for a complete successful run.

The run must demonstrate meaningful build progression quickly enough for a judge to understand the system.

Target cadence:

1. SCAN / calibration — selected Friend and canonical A/B pair become visible.
2. Early survival — basic A/B threats teach phase matching.
3. First elite — first major build/reward checkpoint.
4. Escalation — mixed phases, ranged pressure and denser packs.
5. Mid-run boss/elite checkpoint — evolution becomes realistically attainable.
6. Collapse phase — high-density test of the completed build.
7. Final boss — explicit multi-phase mastery check.
8. RECONSTRUCTION / run result — identity proof plus build and performance summary.

Exact minute markers remain PROVISIONAL until pacing tests.

## 11. Tutorial restructuring

The old three-chamber sequence is no longer the mandatory primary gameplay loop in V2.

Its mechanics remain valuable as qualification and training material.

V2 should teach through a short calibration flow:

- show the canonical pair;
- teach movement;
- require one meaningful SHIFT;
- require defeating/avoiding one A and one B threat;
- enter the survival run rapidly.

Existing DISCOVER / TIMING / SYNCHRONIZE chambers may remain accessible as optional ARCHIVE/CALIBRATION content, but players should not be forced through a multi-minute puzzle sequence before every survival run.

## 12. Enemy design

Initial enemy families must include distinct readable roles rather than reskinned stat blocks:

- simple chaser;
- A/B phase chaser;
- ranged pressure enemy;
- slow tank/anchor;
- phase-switching or synchronization enemy;
- elite modifiers;
- final boss.

Enemy phase must be communicated by shape/icon/effect as well as color. Accessibility cannot depend on cyan/magenta alone.

## 13. Boss design

Bosses must test movement, build quality and SHIFT timing.

The first final boss concept is **THE DESYNC**:

- alternates or telegraphs A/B vulnerability windows;
- uses attacks whose safe response differs by phase;
- includes COMMON pressure so staying permanently off-phase is not optimal;
- exposes a clear break/attack window after correct SHIFT handling;
- remains solvable without paid/meta power.

Boss patterns must be deterministic for automated qualification when seeded.

## 14. Progression philosophy

The fun loop must work before meta progression is admitted.

Initial V2 does **not** use:

- energy timers;
- mandatory ads;
- AFK reward pressure;
- gacha power progression;
- paid revives;
- paid combat rerolls;
- rarity-based NFT stat advantages;
- escalating permanent stat grind required to clear ordinary content.

Persistent progression, if later admitted, should favor horizontal unlocks, alternate weapon behaviors, cosmetics and challenge access over raw mandatory power.

## 15. Community direction

Backend multiplayer is not required for the V2 contest vertical slice.

Post-MVP community systems may include:

- deterministic Daily Signal seeds;
- weekly boss challenges;
- speedrun / no-hit / SHIFT-efficiency categories;
- build sharing;
- Friend-family challenges;
- normalized leaderboards;
- community Signal Stabilization events;
- later co-op only after the single-player combat loop is proven.

Competitive community modes must normalize paid/meta advantages.

## 16. Economy

Economy follows fun; it does not create fun.

The complete standard survival run remains free.

After the V2 gameplay loop passes its preceding gates, the simulated Vibeathon economy may implement:

- **SIGNAL CONTRACT** — primary repeatable 1 RF simulated challenge entry;
- **SIGNAL RECEIPT** — visible simulated spend/burn/reward-funding accounting;
- **IDENTITY ATLAS / DEEP SCAN** — deterministic alternate canonical-pair discovery after census qualification;
- **SIGNAL FORGE** — bounded cosmetic-only simulated RF sinks if schedule permits.

Modeled gameplay payments use the officially documented Rare Friends split:

- 50% simulated burn;
- 50% simulated RF reward funding.

Every preview action must clearly state that the RF activity is simulated and causes no on-chain transaction.

Direct RF-for-damage, HP, XP, weapon slots, protocol slots, paid revive, paid combat reroll, score multiplier or rarity power is rejected.

Signal XP and Evolution Cores remain gameplay resources, not tradeable tokens. RARE//SHIFT does not introduce a second tradeable token.

Live RF spending, token approvals, signatures, production burn/reward routing, real reward settlement and production economy contracts remain DEFERRED.

See `RARE_SHIFT_V2_THREE_CATEGORY_GOVERNANCE_v1.md` for complete category/economy authority.

## 17. Technical architecture

Preserve:

FriendSDK runtime → GameSession → thin React adapter → Phaser 4.2.1 → pure deterministic gameplay modules.

New V2 systems should remain separable from Phaser where practical:

- `survival-core` — run clock/state/pacing;
- `phase-combat-core` — phase legality, vulnerability and SHIFT effects;
- `weapon-core` — weapon definitions and firing contracts;
- `draft-core` — level-up choices and slot rules;
- `evolution-core` — rank/protocol/core evolution gates;
- `enemy-core` — enemy archetype state/behavior contracts;
- `spawn-core` — seeded pacing/spawn tables;
- `score-core` — deterministic run metrics;
- `rf-economy-core` — simulated RF balance/payment split after gameplay qualification;
- `signal-contract-core` — standardized optional challenge configuration;
- `identity-atlas-core` — deterministic Deep Scan state;
- `economy-receipt-core` — RF ledger reconciliation;
- Phaser scene/pools — rendering, collisions, effects and input.

## 18. Performance

The web/mobile target remains 60 FPS where practical.

The initial V2 must use object pooling and bounded active counts for enemies, projectiles, damage effects and XP pickups.

Do not chase Survivor.io's advertised 1000+ on-screen enemies as an arbitrary target. V2 should prioritize readable combat and stable narrow-phone performance. Initial stress qualification should establish the safe cap empirically.

## 19. Competition vertical-slice admission

Before V2 may replace the frozen T4 entry, it must prove at minimum:

- real eligible Friend ownership flow unchanged;
- canonical pair selection unchanged or explicitly requalified;
- DELTA BURST visibly depends on real A_ONLY/B_ONLY geometry;
- movement and SHIFT work on desktop/touch;
- enemies and XP loop are functional;
- three-choice drafting works;
- at least one non-signature weapon works;
- weapon ranks I–V work;
- at least one weapon evolution works through a protocol + Evolution Core gate;
- one elite and one final boss work;
- a complete seeded run is winnable and replayable;
- Friend #13699 real-holder run passes;
- 960 and narrow-phone browser qualification passes;
- FriendSDK check/build/test passes;
- no regression in wallet/identity/error handling;
- simulated Signal Contract and category ledger pass if V2 is submitted with Token Activity relevance;
- public preview performance is acceptable.

Until all of those pass, T4 remains the qualified fallback.

## 20. Decision statuses

**LOCKED**

- genre: phase-shifting survival action roguelite;
- automatic weapons + movement + active SHIFT;
- three-choice level drafting;
- limited weapon/protocol slots;
- five-rank weapons with conditional EVO;
- canonical DELTA BURST starting weapon;
- approximately seven-minute competition run target;
- T4 preserved as fallback;
- Character Spotlight primary / Token Activity + Economy Potential integrated secondary relevance;
- simulated Signal Contract/receipt economy after gameplay qualification;
- no pay-to-win NFT rarity advantage;
- no second tradeable RARE//SHIFT token;
- Phaser + FriendSDK architecture retained.

**PROVISIONAL**

- exact weapon roster/numbers;
- exact enemy counts;
- exact SHIFT cooldown;
- exact phase damage modifiers;
- exact wave minute markers;
- persistent post-run progression;
- exact Signal Contract score formula;
- exact cosmetic catalog/prices.

**DEFERRED**

- live RF spending/transfers;
- production burn/reward contracts;
- real reward settlement;
- multiplayer/co-op;
- backend leaderboards;
- long campaign;
- clans;
- equipment gacha;
- permanent power economy.

## 21. Owner authority

The Owner remains final authority. No implementation tranche may silently expand scope beyond this governance. Every gameplay and category system must be reviewed and qualified before the next tranche advances.