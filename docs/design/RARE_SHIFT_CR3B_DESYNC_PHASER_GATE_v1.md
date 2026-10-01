# RARE//SHIFT CR-3B — THE DESYNC Phaser Integration Gate v1

Status: ACTIVE — bounded implementation gate

Base authority: qualified CR-3A head `115c3a9647e74529b08e4f7f02e6a3a5da5d02af`.

## Purpose

CR-3B proves that the deterministic CR-3A boss authority can enter ordinary Phaser gameplay through the existing CR-1 `BOSS_PENDING` handoff without rewriting the qualified B1–B5 enemy/weapon cores.

## In scope

- Natural boss materialization when the existing director reaches `BOSS_PENDING`.
- Dedicated THE DESYNC world presentation and boss HP/status HUD.
- The mandatory DELTA weapon remains the universal boss-damage path for this tranche.
- Boss damage must pass through `applyCR3BossDamage(...)`; wrong-phase and closed-BREAK damage stay rejected.
- Existing SHIFT input must pass through `applyCR3ShiftResponse(...)` during BREAK tells.
- CR-3A deterministic state advancement remains the sole boss phase/tell authority.
- Runtime diagnostics sufficient for controlled browser qualification.
- 960px and 390px/reduced-motion browser proof.

## Explicitly held for later CR-3 tranches

- Optional VECTOR / ORBIT / ECHO / SIGNAL direct boss-damage adapters.
- CROSS-SPLIT add spawning and boss hazard damage.
- Victory/results transition, death/results, retry, replay, and Change Friend.
- Final boss HP/timing/balance tuning.
- Complete seeded 6-minute natural win proof.

These holds are deliberate. Every legal build already contains DELTA, so CR-3B can prove a build-agnostic integration seam without reopening four independently-qualified weapon targeting contracts.

## Non-negotiable invariants

1. `phaser-survival.ts` remains unchanged in CR-3B.
2. CR-1 stage timing and the exact 360000ms `BOSS_PENDING` boundary remain unchanged.
3. B1–B5 ordinary enemy contracts remain unchanged.
4. CR-2 / Evolution state and combat continuity remain unchanged.
5. DISCHARGE does not become a boss-damage path.
6. Boss damage never bypasses CR-3A phase/BREAK legality.
7. Reduced motion changes presentation only, not mechanics.
8. No merge to `main`, deployment, results implementation, or CR-4 work in this tranche.

## Qualification gate

CR-3B is PROVEN only when an exact-head CI run demonstrates:

- CR-3A deterministic tests PASS;
- inherited deterministic CR-1/CR-2/Evolution/B1–B5 regression PASS;
- TypeScript PASS;
- FriendSDK check/build PASS;
- controlled browser proof at 960px PASS;
- controlled browser proof at 390px with reduced motion PASS;
- boss is absent immediately before 360000ms and materializes after the real `BOSS_PENDING` transition;
- wrong-phase DELTA does not reduce boss HP;
- matching-phase DELTA through the live `fireDelta` path reduces boss HP;
- ALIGNMENT → CROSS_SPLIT → BREAK_WINDOW is observable in the live adapter;
- BREAK-closed DELTA is rejected;
- a correct live SHIFT opens BREAK;
- live DELTA can defeat the boss only through legal BREAK authority;
- post-defeat extra DELTA cannot create another defeat or negative HP.
