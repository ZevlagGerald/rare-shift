# RARE//SHIFT CR-3E NATURAL CLOSEOUT GATE v1

**Status:** IMPLEMENTATION CANDIDATE — OWNER AUTHORIZED BOUNDED QUALIFICATION  
**Parent:** CR-3D exact qualified head `52b1ad048f642b7e3e00bd3f3d19ced23e597f9e`  
**Scope:** qualification/evidence only; no gameplay tuning, no production-state mutation, no merge/deploy authority.

## Purpose

CR-3E closes the two remaining CR-3 exit-gate items from `RARE_SHIFT_COMPLETE_RUN_COMPLETION_GOVERNANCE_v1.md`:

1. a seeded ordinary beginning-to-end run can win;
2. a seeded ordinary death path reaches deliberate results and immediate retry.

CR-3A through CR-3D remain authoritative. CR-3E must not replace their deterministic or controlled-runtime proofs.

## Natural-run definition

A CR-3E route is natural only when it uses player-available inputs and production systems from ordinary run start.

Allowed:

- ENTER SIGNAL DESCENT;
- ordinary movement keys;
- ordinary SHIFT input;
- ordinary level-up card selection;
- production auto-fire;
- reading existing canvas diagnostics to choose player input;
- RUN AGAIN after a terminal result.

Forbidden:

- writing `elapsedActiveMs` or stage state;
- writing player HP, XP, rank, phase, position or cooldowns;
- writing enemy/boss HP, vulnerability, phase, BREAK state or attack state;
- fabricating pickups, kills, Cores, Protocols, Evolutions, elites or boss damage;
- invoking scene methods directly to deal damage or force terminal state;
- pausing the scene to manufacture a route;
- weakening existing assertions merely to make CI pass;
- changing production balance or mechanics to suit the qualifier.

## Seeded natural death proof

The losing route must:

- start from ordinary calibration;
- enter live survival normally;
- never write HP or terminal state;
- receive real production damage until death;
- arrive at the CR-3D DEFEAT results screen;
- record positive accepted damage;
- expose RUN AGAIN;
- remount a clean 100 HP run after retry.

The qualifier may intentionally make poor player decisions, including remaining stationary, because the proof is that an ordinary losing route terminates correctly rather than that the bot is optimal.

## Seeded natural victory proof

The winning route must:

- start from ordinary calibration;
- traverse STAGE I, II, III and IV under the production clock;
- naturally spawn and defeat ELITE I, CHECKPOINT ELITE and ELITE II;
- naturally acquire at least one Evolution Core;
- naturally observe BEACON, ANCHOR and FLICKER;
- reach `BOSS_PENDING` without elapsed-time injection;
- enter THE DESYNC through the production handoff;
- use ordinary movement/SHIFT/auto-fire only during the boss;
- naturally cross ALIGNMENT, CROSS-SPLIT and BREAK WINDOW;
- produce accepted phase-legal boss damage from production auto-fire;
- defeat THE DESYNC while alive;
- reach CR-3D VICTORY results;
- preserve the original canonical A/B frame identity;
- render reconstruction evidence;
- produce one deterministic result fingerprint;
- expose RUN AGAIN and remount a clean run.

## Bot discipline

The route may read diagnostics such as current HP, draft choices, current phase, boss vulnerability and BREAK response. Those observations may guide the same inputs a player can provide.

Reading diagnostics is not authority to mutate them.

The boss-navigation route may search around THE DESYNC using movement keys until the existing canonical DELTA auto-fire geometry produces legal hits. It may SHIFT to visible vulnerability/response states. It may not directly place the Friend or fire weapon methods.

## CR-3E exit gate

All must be proven on one exact branch head:

- FriendSDK check/build PASS;
- CR-1 / CR-2 / Evolution / CR-3A / CR-3C / CR-3D deterministic regression PASS;
- existing controlled CR-3D browser PASS;
- natural seeded death/results/retry PASS;
- natural seeded complete victory PASS;
- no gameplay production file changed from qualified CR-3D;
- `main` unchanged;
- no merge/deploy performed.

Only then may CR-3 be reported as a qualified closeout candidate. CR-4 remains a separate presentation tranche and `FULL_GAMEPLAY_EXPERIENCE=PASS` remains unavailable until CR-5.
