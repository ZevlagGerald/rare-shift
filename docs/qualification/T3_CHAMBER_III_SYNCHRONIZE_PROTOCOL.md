# RARE//SHIFT — T3 CHAMBER III / SYNCHRONIZE Protocol

**Status:** ACTIVE DESIGN PROTOCOL — IMPLEMENTATION NOT YET STARTED  
**Branch:** `feature/t3-chamber3-synchronize`  
**Base:** T2 qualified closeout `f767f392b101e23e6afe0d7f037b0444df94409c`  
**FriendSDK:** v0.1.2  
**Engine:** Phaser 4.2.1

## 1. Purpose

T3 adds the third and final gameplay chamber before reconstruction without weakening the RARE//SHIFT thesis:

> **Your Friend is not a skin. Its animation is the rules.**

The qualified progression is now:

- Chamber I / DISCOVER — canonical phase rewrites collision;
- Chamber II / TIMING — the correct canonical phase must also meet the correct pulse window;
- Chamber III / SYNCHRONIZE — canonical phase must be routed through a three-node signal sequence.

T3 must add planning and state progression without introducing combat, inventory, collection economy, a third phase, or a new mandatory action key.

## 2. Decision status

### LOCKED

- T0/T0.5 frame selection, scoring, thresholds, same-clip-first policy and fallback policy remain unchanged.
- T1 SCAN and Chamber I remain unchanged.
- T2 PHASE PULSE and Chamber II remain unchanged.
- The selected canonical A/B frame pair remains the only phase authority.
- SPACE remains the only keyboard SHIFT action; physical Shift remains unbound.
- Touch retains the existing directional + SHIFT control model.
- Chamber III starts in canonical Phase B.
- Chamber III contains exactly three ordered SYNC NODES.
- Node phase sequence is exactly `B → A → B`.
- Node 1 authority comes from a canonical `B_ONLY` pixel.
- Node 2 authority comes from a canonical `A_ONLY` pixel.
- Node 3 authority comes from a second, distinct canonical `B_ONLY` pixel.
- Every accepted node activation latches for the rest of the Chamber III run.
- Exit remains sealed until all three nodes are synchronized in order.
- Intended minimum accepted SHIFT count is exactly two.
- Failed node attempts are non-lethal and do not erase previously synchronized nodes.
- No RF spending, rewards, contracts, backend, inventory or persistent state is introduced.
- No HP, combat, enemies, lives, lethal hazards or punishment timer is introduced.
- Reduced-motion mode must preserve all mechanical information.
- FriendSDK pause must freeze gameplay input/state rather than progressing synchronization invisibly.

### PROVISIONAL — TO BE VERIFIED DURING IMPLEMENTATION

- Mechanical label: **SYNC NODES**.
- Presentation/lore label: **MEMORY CORES** may be used as a secondary visual name, but mechanics/documentation must remain explicit about node state.
- Authored-safe Chamber III shell with three staging zones and one sealed exit.
- A visible signal conduit links Node 1 → Node 2 → Node 3 → EXIT.
- Each successfully synchronized node permanently lights its completed conduit segment.
- Wrong-phase contact reports `PHASE MISMATCH`.
- Out-of-order contact reports `SIGNAL NOT ROUTED` rather than resetting progress.
- The completed route reports `3/3 SYNCHRONIZED` before the exit unlocks.

### OPEN

- Exact node screen positions inside the authored-safe shell.
- Exact conduit visual treatment.
- Exact transition copy from Chamber II into Chamber III.
- Final T3 visual/audio effect intensity.

Open presentation details may change only if the mechanical contract and qualification assertions remain intact.

## 3. Core mechanic — THREE-NODE SYNCHRONIZATION

Chamber III uses three phase-specific nodes connected as a signal route.

The required sequence is fixed for fairness and continuity:

1. **Node 1 — Phase B**
2. **Node 2 — Phase A**
3. **Node 3 — Phase B**
4. **EXIT unlocks**

The player begins in Phase B.

Therefore the intended minimal phase plan is:

`B node → SHIFT → A node → SHIFT → B node → EXIT`

This creates exactly two required accepted SHIFTs without introducing a third phase or another action button.

## 4. Why B → A → B is locked

The qualified T0 frame-pair acceptance thresholds already require at least two `B_ONLY` pixels and at least two `A_ONLY` pixels.

Using `B → A → B` therefore guarantees that every already-qualified canonical pair has sufficient raw material for three distinct node authorities:

- two distinct `B_ONLY` pixels;
- one `A_ONLY` pixel.

Starting in B also preserves continuity with the qualified Chamber I/T2 completion state and avoids making difficulty vary by NFT.

The phase sequence is not derived from family, generation or seed difficulty. Identity variation comes from the exact canonical pixel coordinates selected for the three nodes and from the resulting deterministic T3 fingerprint.

## 5. Canonical source authority

T3 must reuse the same selected A/B pair that SCAN exposed.

Create a pure deterministic node-source selector, provisionally inside `sync-core.ts`, that chooses:

- `node1Source`: one canonical `B_ONLY` pixel;
- `node2Source`: one canonical `A_ONLY` pixel;
- `node3Source`: a second canonical `B_ONLY` pixel distinct from Node 1.

Selection requirements:

- deterministic for the same Friend/pair/version;
- no random API or wall-clock input;
- source pixels must be validated against the derived phase field;
- Node 1 and Node 3 may never share the same source coordinate;
- no authored substitute pixel may be silently used;
- source coordinates must be included in the T3 fingerprint/evidence surface.

A bounded deterministic selection may use the existing proof/timing fingerprints as salt, but the selected coordinates must remain actual canonical pixel classes.

## 6. Chamber topology

The initial Chamber III implementation must remain intentionally bounded:

- one authored-safe shell;
- three ordered node staging zones;
- one sealed exit;
- no random maze;
- no moving enemy;
- no lethal floor;
- no timer pressure;
- no extra collectible;
- no hidden interaction key.

The authored shell may use bounded deterministic cosmetic/anchor variation, but it must never produce different reaction-time or movement difficulty by family/generation.

The chamber should read visually as a signal-routing room, not as three disconnected switches.

## 7. Node activation state machine

T3 synchronization progress is explicit deterministic state.

Conceptual state:

`nextNode = 0 | 1 | 2 | 3`

Where:

- `0` means Node 1 is next;
- `1` means Node 2 is next;
- `2` means Node 3 is next;
- `3` means all nodes are synchronized and EXIT is unlocked.

When the player enters a node tile:

### Expected node + correct phase

- node latches as synchronized;
- `nextNode` increments;
- completed conduit segment lights;
- progress becomes `1/3`, `2/3`, or `3/3`.

### Expected node + wrong phase

- node does not activate;
- movement remains safe;
- progress does not reset;
- explicit `PHASE MISMATCH` feedback is shown.

### Future node before its predecessor

- node does not activate;
- progress does not reset;
- explicit `SIGNAL NOT ROUTED` feedback is shown.

### Already synchronized node

- remains safe/passable;
- does not increment progress again;
- cannot duplicate-credit synchronization.

## 8. Exit authority

EXIT passability is controlled only by synchronization completion.

Before `nextNode === 3`:

- EXIT is visibly sealed;
- attempts are blocked;
- status explains `SYNC 0/3`, `1/3`, or `2/3`.

After Node 3 locks:

- EXIT opens deterministically;
- status reports `3/3 SYNCHRONIZED`;
- the player may reach the exit;
- completion reports `CHAMBER III COMPLETE` with Friend identity and deterministic T3 fingerprint.

No timer or pulse window is required to leave T3 once synchronization is complete.

## 9. Pure architecture

Synchronization rules must live outside Phaser.

Provisionally add:

### `sync-core.ts`

Responsible for:

- canonical node-source selection;
- node requirements B/A/B;
- deterministic T3 fingerprint;
- authored-safe chamber generation;
- node-contact transition rules;
- exit lock/unlock rule;
- pure progress/state transitions.

### `sync-solver.ts`

Responsible for deterministic reachability over state conceptually:

`(x, y, phase, nextNode)`

The solver must not depend on Phaser objects, DOM state, real time or animation completion.

### `phaser-sync.ts`

Presentation/input only:

- board rendering;
- node/conduit visuals;
- player rendering;
- status/progress HUD;
- movement and SPACE SHIFT forwarding;
- touch controls;
- reduced-motion-safe effects;
- final completion presentation.

## 10. Solver acceptance

The T3 solver must prove all of the following before Chamber III is presented:

- spawn is safe;
- Node 1 is reachable;
- Node 2 is reachable after Node 1;
- Node 3 is reachable after Node 2;
- all three canonical source classes are valid;
- Node 1 requires Phase B;
- Node 2 requires Phase A;
- Node 3 requires Phase B;
- out-of-order node contact cannot silently advance progress;
- wrong-phase node contact cannot silently advance progress;
- duplicate contact cannot increment progress twice;
- EXIT is unreachable while synchronization is incomplete;
- EXIT becomes reachable after `3/3`;
- completion without SHIFT is impossible;
- minimum accepted SHIFT count is exactly `2`;
- no permanent trap is introduced by a valid synchronization action;
- a bounded solution exists.

Any Friend/chamber failing these assertions must be rejected before presentation.

## 11. Synchronization necessity proof

Automated qualification must prove the mechanic is real rather than decorative.

At minimum CI must demonstrate:

1. Node 1 in wrong Phase A => no progress;
2. Node 1 in correct Phase B => progress `1/3`;
3. Node 3 attempted while Node 2 is still pending => no progress;
4. Node 2 in wrong Phase B => no progress;
5. Node 2 in correct Phase A => progress `2/3`;
6. Node 3 in correct Phase B => progress `3/3`;
7. EXIT before `3/3` => blocked;
8. EXIT after `3/3` => pass;
9. full solution uses exactly two accepted SHIFTs.

This proves phase authority, sequence authority and exit authority independently.

## 12. Fairness

T3 difficulty may not vary materially by NFT.

Therefore:

- every Friend uses exactly three nodes;
- every Friend uses the same B/A/B requirement sequence;
- every Friend starts Phase B;
- every Friend's intended minimum is exactly two SHIFTs;
- canonical pixels choose identity-specific source coordinates, not harder timing windows or longer routes;
- no family/generation receives extra nodes or a different sequence;
- no family-specific special case is admitted unless corpus evidence proves it necessary.

## 13. Visual communication

Node state must not rely on hue alone.

Required cues:

- visible `NODE 1/2/3` labels or equivalent numbered glyphs;
- explicit required phase letter `A` or `B`;
- inactive / ready / synchronized states differ by pattern/shape as well as color;
- conduit progression visibly shows which segment is currently routed;
- persistent `SYNC n/3` HUD;
- EXIT visibly sealed before 3/3 and open after 3/3.

Reduced-motion mode:

- removes rapid flash/glitch motion;
- preserves all static node/conduit state changes;
- does not alter puzzle rules.

## 14. Input

Desktop:

- WASD / arrows: movement;
- SPACE: SHIFT;
- no interaction key;
- no WAIT key;
- no node-activation key.

Touch:

- directional controls;
- dedicated SHIFT control;
- no additional mandatory button;
- all controls must remain above FriendSDK chrome at narrow viewport.

Node activation occurs by entering the node tile in the correct state.

## 15. Player flow

Target production sequence after T3:

`SCAN → CHAMBER I / DISCOVER → CHAMBER II / TIMING → CHAMBER III / SYNCHRONIZE`

After Chamber II completion, show an explicit transition rather than silently teleporting.

Provisional transition explanation:

> Timing is stable. Now route the signal through three canonical nodes. Synchronize them in order; each node only accepts its required phase.

Chamber III sequence:

1. enter in Phase B;
2. synchronize B Node 1;
3. SHIFT once to Phase A;
4. synchronize A Node 2;
5. SHIFT once to Phase B;
6. synchronize B Node 3;
7. observe `3/3 SYNCHRONIZED`;
8. reach unlocked EXIT;
9. receive `CHAMBER III COMPLETE`.

## 16. Automated acceptance

T3 cannot be accepted unless CI proves:

- all existing T0/T1/T2 core regression tests remain green;
- existing SCAN remains unchanged;
- Chamber I still qualifies;
- Chamber II still qualifies;
- explicit Chamber II → Chamber III transition works;
- Chamber III uses the same selected canonical frame pair;
- deterministic T3 generation repeats identically;
- B/A/B node source classes are valid canonical pixels;
- Node 1 and Node 3 source coordinates are distinct;
- T3 solver passes;
- wrong phase cannot activate a node;
- wrong sequence cannot activate a future node;
- duplicate node entry cannot double-count;
- EXIT is sealed before 3/3;
- EXIT opens after 3/3;
- no-SHIFT completion is impossible;
- minimum accepted SHIFT count is exactly two;
- Chamber III reaches completion;
- reduced-motion mode remains mechanically identical;
- FriendSDK pause prevents hidden progression/input;
- 960px full flow passes;
- 390px full flow passes;
- FriendSDK `check`, build and smoke remain green.

## 17. Nine-family corpus gate

Because T3 depends directly on canonical `A_ONLY` / `B_ONLY` pixels, the T3 generator + solver must run against the same qualified nine-family corpus before holder qualification:

- Skeleton `#13655`
- Mask `#3112`
- Family `#289218`
- Cellular `#13699`
- Asymmetry `#334511`
- Hoverer `#14193`
- Colossus `#14223`
- Sparkling `#14584`
- Hollow `#14412`

Acceptance target:

- 9/9 deterministic generation;
- 9/9 valid B/A/B source selection;
- 9/9 distinct Node 1 / Node 3 B_ONLY source coordinates;
- 9/9 solver PASS;
- 9/9 sequence authority PASS;
- 9/9 EXIT-lock authority PASS;
- 9/9 no-SHIFT completion impossible;
- 9/9 minimum SHIFT count exactly 2;
- no family-specific topology or rule exception.

## 18. Real-holder gate

After automated + nine-family T3 qualification, one bounded real-holder run with Friend `#13699` is sufficient unless T3 modifies earlier systems.

Do not ask the Owner to manually re-prove every T1/T2 subcondition.

Required T3 holder evidence should be limited to:

- Chamber III entered through the normal real-wallet flow;
- Friend `#13699`, frames `33↔34`, identity preserved;
- one visible node synchronization progress state;
- final `3/3 SYNCHRONIZED` / Chamber III completion;
- exactly two accepted SHIFTs;
- one reload/fingerprint consistency check if the T3 fingerprint is new.

Physical-phone touch remains a separate pre-submission gate, not a per-tranche requirement.

## 19. Competitor collision watch

A Sep. 26 refresh of the official Vibeathon open-PR field found no submission text matching `synchron` and no material collision identified with the planned mechanism: **three ordered nodes whose activation authority comes directly from the selected Friend's canonical A_ONLY/B_ONLY frame-difference pixels**.

The field continues to include pets/care, gacha/economy, sound tools, combat/strategy, spot-the-difference and other game patterns. No redesign is justified by the current evidence.

The collision watch remains secondary to the project's existing central differentiation: canonical animation-frame differences directly rewrite world rules.

## 20. Explicitly out of scope

- reconstruction/finale;
- additional chambers;
- inventory or collectible storage;
- HP/combat/enemies;
- lethal hazards;
- lives/checkpoints economy;
- RF spending/rewards;
- smart contracts/transactions;
- backend/accounts;
- leaderboards;
- persistent save;
- selector/scoring threshold changes;
- timing cadence changes to T2;
- cross-clip policy changes;
- generated image assets;
- final audio/submission polish.

## 21. Review gate

**T3 implementation must not begin silently.**

Before code changes, review this protocol for:

- whether B/A/B synchronization is a meaningful escalation rather than three decorative switches;
- whether exact canonical pixel authority remains obvious to a judge;
- whether the solver state `(x, y, phase, nextNode)` is sufficient and bounded;
- whether two required SHIFTs preserve continuity and fairness;
- whether the mechanic is understandable within seconds without adding another input;
- whether T3 remains small enough to leave time for reconstruction and submission qualification.

Only after that review should implementation be authorized.
