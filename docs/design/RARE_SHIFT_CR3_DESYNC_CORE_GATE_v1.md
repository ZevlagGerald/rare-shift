# RARE//SHIFT CR-3A — THE DESYNC CORE GATE v1

**Status:** ACTIVE — OWNER AUTHORIZED CR-3A FOUNDATION  
**Project:** RARE//SHIFT  
**Branch:** `feature/cr3a-desync-core`  
**Baseline:** `main@76a17e283fc607af0ef78695a0b5d0c17e262d64`  
**FriendSDK:** v0.1.3  
**Engine:** Phaser 4.2.1  
**Owner authority:** final

## 1. Purpose

CR-3A establishes the deterministic authority contract for THE DESYNC before any Phaser boss entity, HUD, results screen, or presentation work is allowed.

This gate is intentionally narrower than full CR-3. It proves the boss state machine and damage legality in a pure core so later runtime integration cannot silently rewrite already-qualified B1–B5, CR-1, CR-2, or EV-1–EV-5 behavior.

## 2. Authority and precedence

CR-3A is subordinate to:

1. `docs/governance/RARE_SHIFT_COMPLETE_RUN_COMPLETION_GOVERNANCE_v1.md`
2. `docs/design/RARE_SHIFT_V2_SURVIVAL_GAME_DESIGN_v1.md`
3. the merged EV-5 baseline at `76a17e283fc607af0ef78695a0b5d0c17e262d64`
4. existing qualified phase/weapon/progression contracts

If CR-3A conflicts with an inherited qualified mechanic, the inherited mechanic remains authoritative unless the Owner explicitly approves a superseding change.

## 3. Bounded scope

CR-3A MAY add only:

- pure deterministic THE DESYNC state-machine authority;
- deterministic seeded boss decisions;
- A/B vulnerability law;
- Phase-3 response tell and BREAK-window law;
- boss damage acceptance/rejection law;
- DISCHARGE immunity;
- exactly-once terminal defeat;
- deterministic tests and CI needed to qualify those contracts.

CR-3A MUST NOT add:

- Phaser boss entity/runtime;
- boss HUD or presentation;
- boss projectiles or live hazards;
- live add spawning;
- victory/results UI;
- death/results/retry UI;
- replay/change-Friend UI;
- stage timing changes;
- enemy roster changes;
- weapon/core rebalance;
- Protocol/Evolution rebalance;
- deployment or public cutover.

## 4. Boss structural phases

The phase order is monotonic:

```text
ALIGNMENT
   ↓
CROSS_SPLIT
   ↓
BREAK_WINDOW
   ↓
DEFEATED
```

No transition may move backward.

### ALIGNMENT

- exposes exactly one deterministic A or B vulnerability at a time;
- wrong-phase weapon authority cannot damage THE DESYNC;
- boss pressure planning is COMMON and deterministic;
- vulnerability/attack decisions are seeded.

### CROSS_SPLIT

- preserves explicit A/B vulnerability law;
- may plan bounded aligned adds for later runtime integration;
- wrong-phase weapon authority remains illegal;
- no live adds are created by CR-3A itself.

### BREAK_WINDOW

- presents one deterministic expected A/B response;
- a BREAK window opens only when the correct phase response is supplied before the tell deadline;
- wrong response cannot open BREAK;
- BREAK closes at an exact deterministic boundary;
- boss weapon damage is rejected while BREAK is closed;
- during BREAK, only the declared matching phase can damage the boss;
- expiration starts a new deterministic tell rather than leaving permanent vulnerability.

### DEFEATED

- HP is exactly zero;
- defeat timestamp is recorded once;
- further damage is rejected;
- no phase/tell/BREAK scheduling continues.

## 5. Damage authority

CR-3A recognizes two structural damage sources:

- `WEAPON`
- `DISCHARGE`

Rules:

1. `DISCHARGE` never damages THE DESYNC.
2. ALIGNMENT/CROSS_SPLIT weapon damage requires the currently declared vulnerability phase.
3. BREAK_WINDOW rejects weapon damage while BREAK is closed.
4. Open BREAK still requires the declared phase authority.
5. Wrong-phase damage applies exactly zero HP change.
6. Rejected damage cannot trigger phase transitions.
7. A lethal accepted hit records defeat once and only once.

Weapon-specific boss targeting/adapters remain deferred to CR-3B. CR-3A does not modify qualified weapon cores.

## 6. Determinism contract

For a fixed seed, profile, timestamp sequence, SHIFT-response sequence, and damage sequence:

- boss decisions are identical;
- vulnerability decisions are identical;
- planned attack families are identical;
- phase transitions are identical;
- BREAK boundaries are identical;
- final HP/state is identical.

Stable deterministic authority is required for seeded qualification and later run fingerprinting.

## 7. Provisional tuning boundary

Exact boss HP thresholds and timing constants in `CR3_DESYNC_PROVISIONAL_PROFILE` are **PROVISIONAL**, not gameplay-balance locks.

They exist only so the deterministic state machine can be exercised before live integration.

They may be changed later only through a reviewed CR-3 browser/Owner playtest tranche. Changing them must not weaken:

- wrong-phase rejection;
- DISCHARGE immunity;
- correct-response BREAK law;
- exact BREAK closure;
- monotonic phase order;
- exactly-once defeat;
- deterministic replay.

No numeric value may be tuned merely to satisfy an automated bot.

## 8. CR-3A exit gate

CR-3A is qualified only when all of the following pass on the exact feature HEAD:

- deterministic initialization/replay PASS;
- deterministic decision planning PASS;
- wrong-phase damage rejection PASS;
- legal matching-phase damage PASS;
- monotonic ALIGNMENT → CROSS_SPLIT → BREAK_WINDOW transitions PASS;
- DISCHARGE boss immunity PASS;
- wrong BREAK response rejection PASS;
- correct BREAK response acceptance PASS;
- BREAK exact-boundary closure PASS;
- Phase-3 closed-BREAK damage rejection PASS;
- exactly-once terminal defeat PASS;
- TypeScript core qualification PASS;
- inherited CR-1, CR-2, Evolution deterministic regression PASS.

Browser/Phaser boss qualification is explicitly **not** part of CR-3A.

## 9. Next tranche after qualification

After CR-3A exact-head qualification and Owner review, the recommended next bounded tranche is **CR-3B — THE DESYNC Phaser runtime integration**:

- spawn one dedicated boss runtime from existing `BOSS_PENDING` handoff;
- preserve ordinary `V2EnemyKind` contracts unchanged;
- adapt qualified weapon authorities to boss legality without rewriting weapon cores;
- implement bounded boss attacks/adds;
- expose boss diagnostics needed for controlled browser qualification.

CR-3B does not begin automatically when CR-3A CI turns green.
