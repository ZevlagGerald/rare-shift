# RARE//SHIFT VIBEATHON DESIGN GOVERNANCE v1

**Status:** ACTIVE — OWNER CONTROLLED  
**Competition:** Rare Friends Vibeathon 2026  
**Primary category:** Character Spotlight  
**Engine:** Phaser 4.2.1  
**SDK:** FriendSDK v0.1.2  
**Language:** TypeScript

## 1. Single source of truth

**Your Friend is not a skin. Its animation is the rules.**

The ownership-verified Generations NFT must materially determine gameplay. Canonical on-chain animation frames are the authority for phase states. When the selected Friend changes canonical pose, the phase-controlled world changes with it.

Features that do not strengthen this thesis are secondary and may be rejected.

## 2. Competitive objective

Optimize for Character Spotlight through:

- NFT-mechanical integration;
- immediate visual comprehension;
- originality;
- gameplay polish;
- deterministic engineering;
- technical evidence;
- real-holder validation;
- professional submission quality.

Do not optimize for feature count.

Primary pitch:

> **Your Rare Friend's actual on-chain animation is the level's state machine. Shift your Friend. Shift the world.**

## 3. Trusted boundary

FriendSDK is authoritative for wallet connection, Robinhood mainnet identity, owned-Friend discovery, eligibility, Friend selection, canonical art reads, runtime pause, and the sandbox boundary.

RARE//SHIFT must not implement a parallel wallet flow. Phaser remains entirely behind the SDK `GameSession` boundary.

## 4. Canonical frame authority

The game reads the selected Friend's 64 canonical 16×16 frames. For candidate frames `A` and `B`:

- `COMMON = A ∩ B`
- `A_ONLY = A − B`
- `B_ONLY = B − A`
- `DELTA = A XOR B`

These sets are the phase authority. Test fixtures may substitute synthetic frames only inside automated tests.

## 5. Pair selection

Prefer two qualifying frames from the same canonical eight-frame animation clip. Reject pairs that are blank, near-identical, one-directional, or have insufficient common silhouette.

Selection is deterministic. Tie breaking is deterministic. Cross-clip fallback is bounded and allowed only when no same-clip pair qualifies.

## 6. Phase-field model

Canonical frame pixels drive a deterministic 16×16 Phase Field with states:

- COMMON
- A_ONLY
- B_ONLY
- VOID

Production chambers may map these states to barriers, floor, gates, hazards, shield zones, bridges and signal conduits, but generation must remain deterministic and solver-qualified.

## 7. SHIFT

SHIFT is the central action.

- Desktop default: Space
- Touch: dedicated SHIFT control

SHIFT changes the displayed canonical pose and phase-controlled collision/world rules. It must never be merely cosmetic.

A shift is rejected when the destination phase would materialize impassable collision under the player's current position.

## 8. Required dependency

Every qualifying chamber after the tutorial must require SHIFT for progression. Automated validation must prove this condition.

## 9. Target experience

Final target: approximately 2–4 minutes.

1. SCAN — load and visibly analyze the selected Friend.
2. CHAMBER I / DISCOVER — teach SHIFT safely.
3. CHAMBER II / TIMING — combine movement and phase timing.
4. CHAMBER III / SYNCHRONIZE — three Memory Cores and phase routing.
5. RECONSTRUCTION — rebuild the exact selected Friend and show results.

## 10. Deterministic generation

Candidate frames are scored using occupied pixels, common pixels, A-only/B-only pixels, delta size, balance and spatial suitability.

Generation must be reproducible for the same token, canonical artwork version and generator version.

## 11. Solver gate

Before a generated chamber is accepted, the solver must prove:

- valid spawn;
- valid exit;
- required objectives reachable;
- completion reachable;
- SHIFT required;
- no unavoidable immediate death;
- no permanent phase trap without recovery;
- bounded generation/fallback.

Invalid chambers are rejected before presentation.

## 12. Fallback

Never invent fake NFT frames. If a pair fails generation, advance deterministically to another pair from the same Friend. If no pair can produce a qualifying chamber, use an authored safety topology whose phase ordering still comes from canonical frames. Record fallback usage during corpus qualification.

## 13. Economy

The Vibeathon v1 gameplay loop is free. No live contracts, no real RF transactions, and no Token Activity claim unless later functionality actually justifies it. Gameplay qualification takes priority over economy development.

## 14. Architecture

FriendSDK runtime → GameSession → thin React adapter → Phaser 4.2.1 → deterministic engine.

Core rules must remain independent of Phaser objects. Pure modules own frame metrics, selection, generation, solver, movement legality and objectives. Phaser owns rendering, camera, effects, audio and input adaptation.

## 15. Art direction

Canonical Rare Friends 1-bit identity × computational phase-space.

Avoid generic cyberpunk, template Phaser UI, dashboard styling, stock buttons and decorative systems unrelated to the core mechanic. Phase A/B must differ through more than hue alone.

## 16. Accessibility/input

Required before submission:

- WASD/arrows;
- Space SHIFT;
- touch movement and SHIFT;
- pause/runtime interruption safety;
- mute;
- reduced motion;
- readable loading/retry/error states;
- SDK overlays not covering critical controls.

## 17. Performance

Target 60 FPS on ordinary modern desktop hardware. No unbounded particle/object/event allocation.

## 18. Qualification

Before release:

- Friend identity/session match checked;
- all 64 frames load;
- deterministic selection/generation;
- solver acceptance;
- all nine families exercised;
- Colossus fallback behavior covered;
- desktop and narrow-phone browser tests;
- `friendsdk check` PASS;
- `friendsdk test` PASS;
- production build PASS;
- public HTTPS gate retained;
- at least one real owned eligible Generations Friend completes the public build.

## 19. Competitor collision watch

Continue monitoring Vibeathon submissions until final submission. Redesign only for a material collision with the central mechanic: canonical animation-frame transitions directly rewriting level rules.

## 20. Rejected Vibeathon v1 scope

- multiplayer/PvP;
- backend accounts;
- marketplace;
- smart-contract deployment;
- live wagering;
- crafting/skill trees;
- NFT upgrades;
- open world;
- global leaderboard;
- additional token;
- large campaign.

## 21. Feature admission test

A feature should be admitted only when it strengthens Character Spotlight or SHIFT, is visible in a short judge demo, improves proof/reliability, and can be fully qualified before the deadline.

## 22. Owner authority

The Owner remains final authority. No major design pivot, category change, live-contract deployment, economy activation or scope expansion occurs without Owner approval.

## Current locks

- Project: **RARE//SHIFT**
- Primary category: **Character Spotlight**
- Engine: **Phaser 4.2.1**
- SDK: **FriendSDK v0.1.2**
- Core mechanic: **canonical frame-controlled phase switching**
- Final target: **3 core chambers, 2–4 minute run**
- Backend: **none**
- Live blockchain transactions: **none**
- Internal submission target: **September 29, 2026**
