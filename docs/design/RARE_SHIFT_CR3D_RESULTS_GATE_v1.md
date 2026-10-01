# RARE//SHIFT CR-3D — Terminal Results Gate v1

**Status:** ACTIVE — bounded implementation gate  
**Project:** RARE//SHIFT  
**Branch:** `feature/cr3d-results`  
**Base authority:** qualified CR-3C head `30227e12d55182ccf4bd839d2b90c9bf4fa30c02`  
**FriendSDK:** v0.1.3  
**Owner authority:** final

## 1. Purpose

CR-3D completes the terminal run lifecycle after the already-qualified THE DESYNC encounter without changing boss legality, pressure tuning, CR-1 stage timing, B1–B5 combat, CR-2 progression, or Evolution mechanics.

The tranche covers victory/reconstruction/results and failure/results/retry only. It does not perform final competition presentation polish or deployment.

## 2. In scope

- Immediate hostile-simulation stop on the same verified THE DESYNC defeat event.
- Existing `dead` state remains the failure authority; CR-3D additionally pauses the scene once death is observed by the terminal adapter.
- Deterministic terminal snapshot captured before Phaser teardown.
- Victory reconstruction displays the selected Friend's exact canonical Phase A and Phase B frames already verified for the run.
- Results expose at minimum:
  - Friend identity/family;
  - canonical frame pair;
  - run seed and elapsed time;
  - kills and level;
  - final HP;
  - SHIFT count;
  - accepted damage taken;
  - final weapon ownership/ranks/Evolutions;
  - Protocols;
  - Evolution Cores acquired/spent/held;
  - elite defeat count;
  - THE DESYNC result;
  - deterministic run fingerprint.
- `RUN AGAIN` remounts a clean survival run for the same verified Friend.
- `CHANGE FRIEND` remains a real trusted-host action through FriendSDK's persistent `Choose Friend` control.
- Desktop and narrow/reduced-motion result qualification.

## 3. FriendSDK v0.1.3 boundary

FriendSDK v0.1.3 intentionally gives the sandboxed game only `friendId`, `client`, and `paused`. It does **not** give game code authority to open or mutate the trusted host Friend picker.

The trusted `GameFrame` retains `Choose Friend` in its toolbar and `Change Friend` in the Friend wallet menu while the child game is mounted. CR-3D must not invent an unsupported `postMessage`, parent-DOM escape, or fake change-Friend button.

Accordingly:

- the result screen labels CHANGE FRIEND as a trusted-host action;
- qualification proves the real host `Choose Friend` control remains available from results state;
- selecting another Friend remains owned and freshly reverified by FriendSDK.

## 4. Explicitly held

- Final boss HP/cadence/hazard tuning.
- Optional VECTOR / ORBIT / ECHO / SIGNAL direct boss-damage adapters.
- Final audio/SFX and competition presentation polish (CR-4).
- Production/public deployment.
- Merge to `main`.

## 5. Non-negotiable invariants

1. CR-3A phase/vulnerability/BREAK/defeat legality remains unchanged.
2. CR-3C pressure planning and numeric profile remain unchanged.
3. CR-1 stage timing and the exact 360000 ms boss handoff remain unchanged.
4. B1–B5 weapon/enemy behavior remains unchanged.
5. Victory pauses hostile simulation exactly once.
6. Failure result requires the existing authoritative `dead` state.
7. Damage-taken accounting observes accepted HP loss only and cannot change damage authority.
8. Result capture is read-only with respect to gameplay state.
9. RUN AGAIN creates a fresh scene instead of mutating the terminal scene back to life.
10. CHANGE FRIEND uses only the trusted FriendSDK host picker.
11. Reduced motion changes presentation only, not result evidence.
12. No merge or deployment in CR-3D.

## 6. Qualification gate

CR-3D is PROVEN only when an exact-head CI run demonstrates:

- CR-3A deterministic boss tests PASS;
- CR-3C deterministic pressure tests PASS;
- CR-3D deterministic result tests PASS;
- inherited CR-1/CR-2/Evolution/B1–B5 deterministic regression PASS;
- TypeScript PASS;
- FriendSDK check/build PASS;
- inherited baseline, B5, Evolution, CR-3B and CR-3C browser regressions PASS;
- 960 px CR-3D victory/results browser proof PASS;
- 390 px reduced-motion CR-3D victory/results browser proof PASS;
- boss terminal event pauses the scene exactly once;
- victory results reconstruct the same canonical frame indices used at run start;
- results expose deterministic fingerprint and required metrics;
- RUN AGAIN produces a fresh non-terminal run for the same Friend;
- controlled player death produces deliberate failure results;
- accepted damage is accounted without changing damage gating;
- trusted host `Choose Friend` remains available from results state;
- no merge or deployment occurred.
