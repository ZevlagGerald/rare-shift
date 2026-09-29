# RARE//SHIFT V2-3B5 — SIGNAL ARC RANK II–V CLOSEOUT REPORT

**Status:** PASS — V2-3B5 CLOSED  
**Date:** 2026-09-29  
**Branch:** `feature/v2-3b5-signal-ranks-clean`  
**V2-3B4 documentation baseline:** `709cfb246547c3de0a96715902739b1e55c0d33b`  
**Exact qualified implementation/test HEAD:** `66e2b17cfaa94ba197cd4f77875008bfc87a3b81`  
**Authoritative workflow:** `RARE SHIFT V2-3B5 SIGNAL Qualification`  
**Authoritative workflow run:** `36530277127` — SUCCESS  
**Authoritative job:** `109282172152` — SUCCESS  
**Main merge:** NOT AUTHORIZED  
**Production deployment:** NOT AUTHORIZED

---

## 1. Scope and decision

V2-3B5 implemented and qualified **SIGNAL ARC Rank II–V only**, preserving the previously qualified Rank-I chain contract, phase authority, four-slot weapon architecture, and all closed B1–B4 behavior.

The tranche is **PASS / CLOSED**.

B5 qualifies the approved SIGNAL progression:

- Rank II — EXTRA LINK;
- Rank III — LOWER DECAY;
- Rank IV — RESONANT RELAY;
- Rank V — CHAIN CONTROL.

Three Owner-approved hardening rules are part of the locked B5 contract:

1. the first successful COMMON relay consumes the single Rank-IV bonus-edge authority even when that edge is within the ordinary `180 px` relay range;
2. Rank-V forward-degree lookahead evaluates candidate continuation using the correctly remaining COMMON-bonus authority after the current edge;
3. every SIGNAL cast snapshots target geometry and phase/corporeal authority at cast start before damage resolves.

This tranche does not authorize or implement:

- V2-3B6 integrated rank/progression closeout;
- Protocol runtime passives;
- Evolutions / CHAIN RESONANCE;
- V2-4 enemies, pacing, elites or bosses;
- economy/token/RF changes;
- `main` merge;
- production deployment.

---

## 2. Qualified SIGNAL rank profile

### Rank I — inherited baseline

- initial acquisition range: `420 px`;
- relay range: `180 px`;
- maximum targets: `3`;
- damage sequence: `10, 8, 6`;
- ordinary cooldown: `1250 ms`;
- nearest legal initial/relay target with lower stable ID as the deterministic tie-break;
- COMMON is legal in both phases;
- off-phase ghosts are never legal chain targets.

The public Rank-I constant remains compatible with the previously qualified V2-2D surface.

### Rank II — EXTRA LINK

- maximum targets: `4`;
- damage sequence: `10, 8, 6, 5`;
- initial range remains `420 px`;
- ordinary relay range remains `180 px`;
- ordinary cooldown remains `1250 ms`.

The fourth link is a real additional unique target, not a repeated hit on an existing chain member.

### Rank III — LOWER DECAY

- maximum targets remains `4`;
- damage sequence becomes `10, 9, 8, 7`;
- acquisition and ordinary relay geometry remain unchanged;
- ordinary cooldown remains `1250 ms`.

### Rank IV — RESONANT RELAY

Rank-IV adds exactly one bounded COMMON relay authority per cast:

- ordinary relay range: `180 px`;
- one successful relay originating from the first COMMON relay node may use up to `240 px`;
- the first successful COMMON relay consumes that one bonus even when the selected edge is already `<=180 px`;
- the bonus never stacks and cannot be carried to a later COMMON relay;
- the extended edge still requires an active, corporeal, unvisited target;
- the extension cannot legalize an off-phase ghost;
- routing remains nearest-legal-target routing before Rank V;
- ordinary cooldown remains `1250 ms`.

### Rank V — CHAIN CONTROL

Rank V preserves the Rank-III damage profile `10, 9, 8, 7`, Rank-IV COMMON authority, four-target cap, and `1250 ms` cooldown while changing relay selection.

At each relay decision:

1. enumerate legal unvisited candidates for the current edge using the current remaining COMMON-bonus state;
2. for each legal candidate, compute its legal forward degree for the next edge using the bonus state that would remain after accepting the current edge;
3. prefer the candidate with greater forward degree;
4. tie-break by shorter current edge distance;
5. final tie-break by lower stable spawn ID.

Candidate array insertion order is not authoritative.

---

## 3. Cast-start snapshot and phase authority

SIGNAL planning is immutable for one cast.

At cast start, the runtime snapshots the candidate state required to determine:

- active status;
- enemy kind / phase authority;
- stable ID;
- world position;
- initial and relay legality;
- COMMON bonus consumption;
- Rank-V forward-degree routing.

Later mutation of source candidate objects cannot retroactively rewrite the already-created cast plan.

An accepted SHIFT invalidates prior graph evidence and future casts use the new post-SHIFT corporeal authority. No historical cast is upgraded into a new-phase graph.

---

## 4. Live rank bridge and transition safety

The bounded live SIGNAL rank bridge is opt-in, monotonic, slot-neutral and parity-checked against normalized V2-3 progression semantics.

Qualified transition rules:

- SIGNAL acquisition initializes Rank I and consumes exactly one active weapon slot;
- later SIGNAL rank cards do not consume additional active slots;
- ranks advance one step at a time through Rank V;
- Rank-V overflow is rejected;
- disabled/unowned rank transitions are rejected;
- legacy draft behavior remains unchanged when the SIGNAL rank bridge is disabled;
- rank-up does not reset ordinary `1250 ms` cooldown readiness;
- rank-up does not create a free cast, historical chain, free target, SHIFT event, or bonus relay.

---

## 5. Natural browser qualification

Natural production qualification is intentionally separated from controlled topology proof.

At both `960` and `390`, the browser used the production draft path with no rank fixture and proved:

1. Level-2 ORBIT/VECTOR/DELTA onboarding remained intact;
2. ORBIT was acquired through the rendered production draft;
3. ECHO was acquired naturally at Level 3;
4. SIGNAL was acquired naturally at Level 4;
5. all four active weapon slots were then occupied;
6. later production drafts remained real, distinct and actionable;
7. SIGNAL Rank II was eventually exposed by the real draft system;
8. the rendered `SIGNAL_RANK` card was selected through pointer/touch interaction;
9. SIGNAL advanced naturally from Rank I to Rank II;
10. Rank-II profile immediately reported four-target capacity and `10,8,6,5` damage;
11. the qualification fixture marker remained empty;
12. the player remained alive at the natural I→II proof boundary.

Authoritative checkpoints:

- `960`: SIGNAL I→II at Level `7`, HP `41`;
- `390`: SIGNAL I→II at Level `7`, HP `11`.

Result:

- `RARE_SHIFT_V2_3B5_NATURAL_SIGNAL_RANK2_960=PASS`
- `RARE_SHIFT_V2_3B5_NATURAL_SIGNAL_RANK2_390=PASS`

No HP, XP, enemy, spawn, damage, reward, pickup, invulnerability or production-draft mutation was introduced to obtain this result.

---

## 6. Controlled browser qualification

Qualification-only rank ownership fixtures are isolated from ordinary player flow. They set only the starting SIGNAL ownership/rank before survival mount and do not modify HP, XP, enemy strength, spawn rules, damage, rewards, pickup rules or invulnerability.

This follows the already accepted B2–B4 qualification pattern: natural progression proves real I→II acquisition, while bounded starting-rank fixtures provide direct high-rank mechanic observability.

### Rank II — EXTRA LINK

At both `960` and `390`:

- fixture identity explicitly reported `SIGNAL_RANK_2`;
- Rank-II profile exposed four-target capacity and `10,8,6,5` damage;
- a real runtime SIGNAL cast naturally found four unique legal targets;
- the browser observed the exact four-link damage sequence `10,8,6,5`;
- player remained alive;
- narrow-host reduced-motion state remained valid.

Result:

- `RARE_SHIFT_V2_3B5_SIGNAL_RANK2_FOUR_LINK_960=PASS`
- `RARE_SHIFT_V2_3B5_SIGNAL_RANK2_FOUR_LINK_390=PASS`

### Rank IV — RESONANT RELAY

At both `960` and `390`:

- fixture identity explicitly reported `SIGNAL_RANK_4`;
- COMMON bonus range reported `240 px`;
- routing remained `NEAREST`;
- a real SHIFT invalidated prior graph evidence;
- a real runtime cast produced an extended COMMON relay edge `>180 px` and `<=240 px`;
- COMMON bonus use was browser-observable;
- player remained alive.

Result:

- `RARE_SHIFT_V2_3B5_SIGNAL_RANK4_RESONANT_RELAY_960=PASS`
- `RARE_SHIFT_V2_3B5_SIGNAL_RANK4_RESONANT_RELAY_390=PASS`

### Rank V — CHAIN CONTROL

At both `960` and `390`:

- fixture identity explicitly reported `SIGNAL_RANK_5`;
- routing reported `FORWARD_DEGREE`;
- damage profile reported `10,9,8,7`;
- a real runtime cast produced topology that differed from nearest-only routing;
- forward-degree evidence was browser-observable and contained a positive continuation degree;
- player remained alive.

Result:

- `RARE_SHIFT_V2_3B5_SIGNAL_RANK5_CHAIN_CONTROL_960=PASS`
- `RARE_SHIFT_V2_3B5_SIGNAL_RANK5_CHAIN_CONTROL_390=PASS`

Reduced-motion / combined browser result:

- `RARE_SHIFT_V2_3B5_REDUCED_MOTION=PASS`
- `RARE_SHIFT_V2_3B5_BROWSER=PASS`

---

## 7. Deterministic B5 contracts

The authoritative B5 deterministic suite passed `18/18` and directly proves:

- bounded Rank I–V profiles and invalid-rank rejection;
- Rank-II four unique targets with exact `10,8,6,5` damage;
- Rank-III exact `10,9,8,7` damage;
- Rank-IV one-edge `240 px` COMMON extension;
- first successful COMMON relay consumes bonus even when the edge is within `180 px`;
- Rank-IV extension cannot legalize a ghost;
- Rank-V greater-forward-degree preference over a nearer relay;
- correct remaining COMMON authority during Rank-V lookahead;
- current COMMON edge consumes the bonus before later lookahead when applicable;
- Rank-V tie order: forward degree, then distance, then stable ID;
- candidate input-order invariance;
- immutable cast-start candidate geometry/authority snapshot;
- unchanged `1250 ms` ordinary cooldown at every rank;
- live SIGNAL adapter opt-in/monotonic/slot-neutral behavior;
- normalized V2-3 next-rank parity.

---

## 8. Inherited regression qualification

The same exact implementation/test HEAD passed, in order:

- inherited deterministic core;
- V2 combat deterministic contracts;
- V2-2E cross-weapon deterministic matrix;
- draft-pointer regression;
- V2-3A progression contracts;
- B1 DELTA deterministic contracts;
- B2 VECTOR deterministic contracts;
- B3 ORBIT deterministic contracts;
- B4 ECHO deterministic/adapter contracts;
- B5 SIGNAL deterministic/adapter contracts;
- ART-00 deterministic/static/motion proof;
- core/game TypeScript qualification;
- FriendSDK check/build/smoke;
- V2-1 browser;
- VECTOR Rank-I browser;
- ORBIT Rank-I browser;
- ECHO Rank-I browser;
- SIGNAL Rank-I browser;
- integrated four-slot V2-2E browser;
- B1 DELTA higher-rank browser;
- B2 VECTOR higher-rank browser;
- B3 ORBIT higher-rank browser;
- B4 ECHO higher-rank browser;
- B5 SIGNAL natural/controlled browser.

No inherited assertion or previously qualified production mechanic was weakened to make B5 pass.

---

## 9. Qualification repairs before final PASS

Three bounded B5 qualification-harness corrections were made before the authoritative successful run.

### Repair 1 — legal defensive fallback

The first natural B5 route reached a Level-5 draft without `SIGNAL_RANK` and selected DELTA, then died before the next draft. The fallback order was changed to prefer the already-legal and previously qualified `ORBIT_RANK` when SIGNAL Rank II was absent.

No production draft contents, HP, XP, enemy, spawn or damage values changed.

### Repair 2 — reuse qualified natural movement cadence

A later route reached Level 2 at critically low HP under the B5-specific movement cadence. The B5 natural driver was aligned to the already-qualified B3 survival cadence:

- `520 ms` movement;
- `160 ms` settle;
- SHIFT every `5` movement segments;
- `95 ms` post-SHIFT settle.

This changed only qualification movement duty. Production gameplay remained unchanged.

### Repair 3 — separate progression evidence from topology evidence

The repaired natural route legitimately reached SIGNAL Rank II at Level 7 but could enter that draft with low remaining HP and die while waiting for a naturally occurring four-target topology.

The evidence responsibilities were therefore separated without weakening either assertion:

- natural route must prove genuine production SIGNAL I→II with no fixture;
- a separate bounded Rank-II starting-rank fixture must prove a real runtime four-target `10,8,6,5` cast;
- existing Rank-IV and Rank-V controlled fixtures remain responsible for direct high-rank topology proof.

No HP/XP/invulnerability/fake pickup/enemy weakening/damage reduction/production progression mutation was added.

The authoritative successful run occurs after all three harness corrections and uses exact implementation/test HEAD `66e2b17cfaa94ba197cd4f77875008bfc87a3b81`.

---

## 10. Evidence artifact

Authoritative artifact:

- name: `rare-shift-v2-3b5-evidence-36530277127`;
- artifact ID: `11017610072`;
- evidence files: `106` uploaded files;
- size: `2,543,819 bytes`;
- SHA-256: `4234a6c8acbfc0ee1b4f9f31e0bf10fc324f47b5bf769d1aaf6d4609fea4631f`;
- exact HEAD: `66e2b17cfaa94ba197cd4f77875008bfc87a3b81`;
- created: `2026-09-29T06:37:25Z`;
- expires: `2026-10-13T06:37:24Z`.

---

## 11. Scope integrity

Relative to the B4 documentation closeout `709cfb246547c3de0a96715902739b1e55c0d33b`, the qualified B5 implementation/test HEAD is:

- ahead: `12` commits;
- behind: `0` commits;
- merge base: exactly the B4 closeout commit;
- changed files: exactly `10` expected B5 surfaces.

Changed surfaces are limited to:

- B5 core/full qualification workflows;
- bounded live SIGNAL draft bridge;
- SIGNAL deterministic core;
- Phaser SIGNAL Rank II–V integration/observability;
- B5 deterministic/adapter tests;
- B5 browser qualification;
- package/typecheck wiring.

No B1–B4 source/browser file was modified in the B5 tranche. No Protocol runtime, Evolution, new enemy, economy, deployment or main mutation is included.

---

## 12. Final decision state

`V2_3B4 = CLOSED`

`V2_3B5_SIGNAL_DESIGN = LOCKED`

`V2_3B5_THREE_HARDENINGS = LOCKED`

`V2_3B5_SIGNAL_DETERMINISTIC_CONTRACTS = PASS`

`V2_3B5_SIGNAL_LIVE_RANK_ADAPTER = PASS`

`V2_3B5_CAST_START_SNAPSHOT = PASS`

`V2_3B5_RANK_IV_COMMON_BONUS_CONSUMPTION = PASS`

`V2_3B5_RANK_V_REMAINING_AUTHORITY_LOOKAHEAD = PASS`

`V2_3B5_NATURAL_SIGNAL_I_TO_II_960_390 = PASS`

`V2_3B5_RANK_II_FOUR_LINK_960_390 = PASS`

`V2_3B5_RANK_IV_RESONANT_RELAY_960_390 = PASS`

`V2_3B5_RANK_V_CHAIN_CONTROL_960_390 = PASS`

`V2_3B5_REDUCED_MOTION = PASS`

`V2_3B5_INHERITED_REGRESSION_THROUGH_B4 = PASS`

`V2_3B5_OVERALL_DECISION = PASS`

`V2_3B5 = CLOSED`

`V2_3B6 = NOT_STARTED`

`MAIN_MERGE = NOT_AUTHORIZED`

`DEPLOYMENT = NOT_AUTHORIZED`

---

## 13. Next bounded gate

The next recommended action is **V2-3B6 — integrated Rank I–V weapon/progression/readability planning and review only**.

B6 implementation is not authorized by this B5 closeout. No `main` merge or deployment is authorized.
