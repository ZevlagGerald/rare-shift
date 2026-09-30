from pathlib import Path

path = Path("games/rare-shift/src/phaser-survival.ts")
source = path.read_text(encoding="utf-8")


def replace_once(label: str, before: str, after: str) -> None:
    global source
    count = source.count(before)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one anchor, found {count}")
    source = source.replace(before, after, 1)
    print(f"PATCHED={label}")


replace_once(
    "cr2-imports",
    '''import { advanceSignalArcCooldown, buildSignalArcProfile, planSignalArc, SIGNAL_ARC_RANK_I, type SignalArcHop } from "./signal-arc-core.ts";''',
    '''import { advanceSignalArcCooldown, buildSignalArcProfile, planSignalArc, SIGNAL_ARC_RANK_I, type SignalArcHop } from "./signal-arc-core.ts";
import {
  applyCR2CheckpointProgressionReward,
  applyCR2ProtocolDraftChoiceToLive,
  buildCR2ProtocolDraftFromLive,
  collectCR2EvolutionCoreLive,
  resolveCR2DeltaProtocolRuntime,
  resolveCR2EchoProtocolRuntime,
  resolveCR2OrbitProtocolRuntime,
  resolveCR2SignalProtocolRuntime,
  resolveCR2VectorProtocolRuntime,
  useCR2ProtocolRefractFromLive,
} from "./cr2-live-tranche-core.ts";
import type { CR2LiveProjection, CR2LiveSnapshot } from "./cr2-live-state-core.ts";
import type { V23DraftCandidate, V23ProtocolFamily, V23WeaponFamily } from "./progression-core.ts";''',
)

replace_once(
    "draft-view-interface",
    '''interface PendingDeltaEchoRuntime {
  readonly phase: Phase;
  readonly scheduledAtMs: number;
  readonly profile: DeltaEchoProfile;
}
''',
    '''interface PendingDeltaEchoRuntime {
  readonly phase: Phase;
  readonly scheduledAtMs: number;
  readonly profile: DeltaEchoProfile;
}

interface DraftViewChoice {
  readonly id: string;
  readonly name: string;
  readonly category: "WEAPON" | "UTILITY" | "PROTOCOL";
  readonly description: string;
  readonly disabled: boolean;
  readonly candidateId: string | null;
  readonly candidateType: V23DraftCandidate["candidateType"] | null;
  readonly familyId: V23DraftCandidate["familyId"] | null;
  readonly fromRank: number | null;
  readonly toRank: number | null;
}
''',
)

replace_once(
    "draft-view-helpers",
    '''function emptyVectorTransfer(): VectorTransferState { return Object.freeze({ armed: false, expiresAtMs: null, phase: null }); }
''',
    '''function emptyVectorTransfer(): VectorTransferState { return Object.freeze({ armed: false, expiresAtMs: null, phase: null }); }
function migrateCooldownProgress(accumulator: number, oldCooldownMs: number, newCooldownMs: number): number {
  if (!(oldCooldownMs > 0) || !(newCooldownMs > 0)) return Math.max(0, accumulator);
  const progress = Math.max(0, Math.min(1, accumulator / oldCooldownMs));
  return Math.min(newCooldownMs, progress * newCooldownMs);
}
function legacyDraftIdForCandidate(candidate: V23DraftCandidate): string {
  if (candidate.candidateType === "WEAPON_ACQUIRE") {
    return ({ VECTOR: "VECTOR_NEEDLE", ORBIT: "ORBIT_NODES", ECHO: "ECHO_MINE", SIGNAL: "SIGNAL_ARC" } as const)[candidate.familyId as "VECTOR" | "ORBIT" | "ECHO" | "SIGNAL"];
  }
  if (candidate.candidateType === "WEAPON_RANK") return `${candidate.familyId}_RANK`;
  if (candidate.candidateType === "UTILITY") return String(candidate.familyId);
  if (candidate.candidateType === "PROTOCOL_ACQUIRE" || candidate.candidateType === "PROTOCOL_RANK") return `PROTOCOL_${candidate.familyId}`;
  return candidate.candidateId;
}
function normalizedDraftViewChoice(candidate: V23DraftCandidate): DraftViewChoice {
  const category: DraftViewChoice["category"] = candidate.candidateType.startsWith("PROTOCOL")
    ? "PROTOCOL"
    : candidate.candidateType === "UTILITY" ? "UTILITY" : "WEAPON";
  return Object.freeze({
    id: legacyDraftIdForCandidate(candidate),
    name: candidate.name,
    category,
    description: candidate.description,
    disabled: false,
    candidateId: candidate.candidateId,
    candidateType: candidate.candidateType,
    familyId: candidate.familyId,
    fromRank: candidate.fromRank,
    toRank: candidate.toRank,
  });
}
function legacyDraftViewChoice(choice: V21DraftChoice): DraftViewChoice {
  return Object.freeze({
    ...choice,
    candidateId: null,
    candidateType: null,
    familyId: null,
    fromRank: null,
    toRank: null,
  });
}
''',
)

replace_once(
    "cr2-state-fields",
    '''  private rewardLedger: CR1RewardLedger = emptyCR1RewardLedger();
  private evolutionCores = 0;
  private elitesDefeated = 0;
''',
    '''  private rewardLedger: CR1RewardLedger = emptyCR1RewardLedger();
  private evolutionCores = 0;
  private evolvedWeapons: Partial<Record<V23WeaponFamily, boolean>> = {};
  private protocols: Partial<Record<V23ProtocolFamily, number>> = {};
  private refracts = 1;
  private rerollNonce = 0;
  private elitesDefeated = 0;
''',
)

replace_once(
    "cr2-draft-fields",
    '''  private dead = false;
  private draftOpen = false;
  private draftChoices: readonly V21DraftChoice[] = [];
  private draftViews: Phaser.GameObjects.Container[] = [];
  private draftBackdrop: Phaser.GameObjects.Rectangle | null = null;
  private qualified = false;
''',
    '''  private dead = false;
  private draftOpen = false;
  private cr2DraftActive = false;
  private cr2DraftLegalCandidateCount = 0;
  private draftChoices: readonly DraftViewChoice[] = [];
  private draftViews: Phaser.GameObjects.Container[] = [];
  private draftBackdrop: Phaser.GameObjects.Rectangle | null = null;
  private refractView: Phaser.GameObjects.Text | null = null;
  private qualified = false;
''',
)

replace_once(
    "cr2-live-methods",
    '''  setReducedMotion(reduced: boolean): void { this.reduced = reduced; }

  private applyVectorQualificationFixture(): void {''',
    '''  setReducedMotion(reduced: boolean): void { this.reduced = reduced; }

  private buildCR2LiveSnapshot(): CR2LiveSnapshot {
    return Object.freeze({
      deltaRank: this.deltaRank,
      vectorOwned: this.vectorOwned,
      vectorRank: this.vectorRank,
      orbitOwned: this.orbitOwned,
      orbitRank: this.orbitRank,
      echoOwned: this.echoOwned,
      echoRank: this.echoRank,
      signalOwned: this.signalOwned,
      signalRank: this.signalRank,
      evolvedWeapons: Object.freeze({ ...this.evolvedWeapons }),
      protocols: Object.freeze({ ...this.protocols }),
      evolutionCores: this.evolutionCores,
      refracts: this.refracts,
      rerollNonce: this.rerollNonce,
      hp: this.hp,
      maxHp: V21_PLAYER_MAX_HP,
      pickupRadius: this.pickupRadius,
      weaponSlotsUsed: this.weaponSlotsUsed,
    });
  }

  private deltaCombatProfile(phase: Phase = this.phase, rank = this.deltaRank): ReturnType<typeof buildDeltaProfile> {
    return resolveCR2DeltaProtocolRuntime(buildDeltaProfile(this.pair.a.rows, this.pair.b.rows, phase, rank), this.buildCR2LiveSnapshot()).profile;
  }

  private vectorCombatProfile(rank = this.vectorRank, transferShot = false): VectorRankProfile {
    return resolveCR2VectorProtocolRuntime(buildVectorProfile(rank, transferShot), this.buildCR2LiveSnapshot()).profile;
  }

  private orbitCombatProfile(rank = this.orbitRank): OrbitRankProfile {
    return resolveCR2OrbitProtocolRuntime(buildOrbitProfile(rank), this.buildCR2LiveSnapshot());
  }

  private echoCombatProfile(rank = this.echoRank, memoryDepth = 0): EchoRankProfile {
    return resolveCR2EchoProtocolRuntime(buildEchoProfile(rank, memoryDepth), this.buildCR2LiveSnapshot());
  }

  private signalCombatProfile(rank = this.signalRank): ReturnType<typeof buildSignalArcProfile> {
    return resolveCR2SignalProtocolRuntime(buildSignalArcProfile(rank), this.buildCR2LiveSnapshot()).profile;
  }

  private applyCR2Projection(next: CR2LiveProjection): void {
    if (Object.values(next.evolvedWeapons).some(value => value === true)) {
      throw new Error("Evolution projection reached Phaser before evolved combat runtime qualification.");
    }
    const oldDeltaCooldown = this.deltaCombatProfile().cooldownMs;
    const oldVectorCooldown = this.vectorCombatProfile().cooldownMs;
    const oldSignalCooldown = this.signalCombatProfile().cooldownMs;
    const oldVectorRank = this.vectorRank;
    const oldEchoRank = this.echoRank;
    const wasEchoOwned = this.echoOwned;

    this.deltaRank = next.deltaRank;
    this.vectorOwned = next.vectorOwned;
    this.vectorRank = next.vectorRank;
    this.orbitOwned = next.orbitOwned;
    this.orbitRank = next.orbitRank;
    this.echoOwned = next.echoOwned;
    this.echoRank = next.echoRank;
    this.signalOwned = next.signalOwned;
    this.signalRank = next.signalRank;
    this.evolvedWeapons = { ...next.evolvedWeapons };
    this.protocols = { ...next.protocols };
    this.evolutionCores = next.evolutionCores;
    this.refracts = next.refracts;
    this.rerollNonce = next.rerollNonce;
    this.hp = next.hp;
    this.pickupRadius = next.pickupRadius;
    this.weaponSlotsUsed = next.weaponSlotsUsed;

    this.attackAccumulator = migrateCooldownProgress(this.attackAccumulator, oldDeltaCooldown, this.deltaCombatProfile().cooldownMs);
    this.vectorAccumulator = migrateCooldownProgress(this.vectorAccumulator, oldVectorCooldown, this.vectorCombatProfile().cooldownMs);
    this.signalAccumulator = migrateCooldownProgress(this.signalAccumulator, oldSignalCooldown, this.signalCombatProfile().cooldownMs);

    if (this.vectorRank !== oldVectorRank) {
      if (oldVectorRank < 4 && this.vectorRank >= 4) this.vectorTransferState = emptyVectorTransfer();
      if (this.vectorRank >= 5) this.vectorLockState = initialVectorLockState();
    }
    if (this.echoRank !== oldEchoRank) {
      this.ensureEchoMineCapacity();
      if (oldEchoRank < 5 && this.echoRank >= 5) {
        for (const runtime of this.echoMines) if (runtime.active && runtime.mine) runtime.mine = initializeEchoMineForRankV(runtime.mine);
        this.echoBurstLedger = new Map();
      }
    }
    if (!wasEchoOwned && this.echoOwned) this.echoPlacementAccumulator = 0;
    if (this.orbitOwned) this.syncOrbitNodeView();
  }

  private applyVectorQualificationFixture(): void {''',
)

replace_once(
    "echo-capacity-profile",
    '''  private ensureEchoMineCapacity(): void {
    const required = buildEchoProfile(this.echoRank, 0).maxActive;''',
    '''  private ensureEchoMineCapacity(): void {
    const required = this.echoCombatProfile(this.echoRank, 0).maxActive;''',
)

replace_once(
    "update-combat-profiles",
    '''    this.attackAccumulator += dt;
    const profile = buildDeltaProfile(this.pair.a.rows, this.pair.b.rows, this.phase, this.deltaRank);
    if (this.attackAccumulator >= profile.cooldownMs) {''',
    '''    this.attackAccumulator += dt;
    const profile = this.deltaCombatProfile();
    if (this.attackAccumulator >= profile.cooldownMs) {''',
)

replace_once(
    "update-vector-profile",
    '''    if (this.vectorOwned) {
      const vectorProfile = buildVectorProfile(this.vectorRank);''',
    '''    if (this.vectorOwned) {
      const vectorProfile = this.vectorCombatProfile();''',
)

replace_once(
    "refresh-vector-target",
    '''  private refreshVectorTarget(): void {
    if (this.vectorRank >= 5 && this.vectorLockState.targetId !== null) {
      const locked = this.enemies.find(enemy => enemy.active && enemy.id === this.vectorLockState.targetId) ?? null;
      if (!locked || !isEnemyCorporeal(locked.kind, this.phase) || vectorPriorityTier(locked.kind) < 1) {
        this.resetVectorLockState();
      } else {
        const dx = locked.x - this.friend.x, dy = locked.y - this.friend.y;
        if (dx * dx + dy * dy > VECTOR_RANK_I.range * VECTOR_RANK_I.range) this.resetVectorLockState();
      }
    }

    const result = this.vectorRank >= 3
      ? acquirePriorityVectorTarget(this.enemies, this.phase, this.friend.x, this.friend.y, this.vectorRank >= 5 ? this.vectorLockState.targetId : null)
      : acquireVectorTarget(this.enemies, this.phase, this.friend.x, this.friend.y);''',
    '''  private refreshVectorTarget(): void {
    const profile = this.vectorCombatProfile();
    if (this.vectorRank >= 5 && this.vectorLockState.targetId !== null) {
      const locked = this.enemies.find(enemy => enemy.active && enemy.id === this.vectorLockState.targetId) ?? null;
      if (!locked || !isEnemyCorporeal(locked.kind, this.phase) || vectorPriorityTier(locked.kind) < 1) {
        this.resetVectorLockState();
      } else {
        const dx = locked.x - this.friend.x, dy = locked.y - this.friend.y;
        if (dx * dx + dy * dy > profile.range * profile.range) this.resetVectorLockState();
      }
    }

    const result = this.vectorRank >= 3
      ? acquirePriorityVectorTarget(this.enemies, this.phase, this.friend.x, this.friend.y, this.vectorRank >= 5 ? this.vectorLockState.targetId : null, profile.range, profile.priorityBand)
      : acquireVectorTarget(this.enemies, this.phase, this.friend.x, this.friend.y, profile.range);''',
)

replace_once(
    "current-vector-profile",
    '''    const profile = buildVectorProfile(this.vectorRank);
    const dx = enemy.x - this.friend.x, dy = enemy.y - this.friend.y;''',
    '''    const profile = this.vectorCombatProfile();
    const dx = enemy.x - this.friend.x, dy = enemy.y - this.friend.y;''',
)

replace_once(
    "fire-vector-profile",
    '''    const profile = buildVectorProfile(this.vectorRank, transferReady);''',
    '''    const profile = this.vectorCombatProfile(this.vectorRank, transferReady);''',
)

replace_once(
    "orbit-update-profile",
    '''  private updateOrbit(dtMs: number): void {
    const profile = buildOrbitProfile(this.orbitRank);''',
    '''  private updateOrbit(dtMs: number): void {
    const profile = this.orbitCombatProfile();''',
)

replace_once(
    "orbit-view-profile",
    '''  private syncOrbitNodeView(profile: OrbitRankProfile = buildOrbitProfile(this.orbitRank)): readonly { x: number; y: number }[] {''',
    '''  private syncOrbitNodeView(profile: OrbitRankProfile = this.orbitCombatProfile()): readonly { x: number; y: number }[] {''',
)

replace_once(
    "orbit-shear-profile",
    '''  private tryEmitOrbitShear(anchorAngle: number): void {
    const profile = buildOrbitProfile(this.orbitRank);''',
    '''  private tryEmitOrbitShear(anchorAngle: number): void {
    const profile = this.orbitCombatProfile();''',
)

replace_once(
    "echo-update-profiles",
    '''  private updateEcho(dtMs: number): void {
    const placementProfile = buildEchoProfile(this.echoRank, 0);
    for (const runtime of this.echoMines) {
      if (!runtime.active || !runtime.mine) continue;
      const mineProfile = buildEchoProfile(this.echoRank, runtime.mine.memoryDepth);''',
    '''  private updateEcho(dtMs: number): void {
    const placementProfile = this.echoCombatProfile(this.echoRank, 0);
    for (const runtime of this.echoMines) {
      if (!runtime.active || !runtime.mine) continue;
      const mineProfile = this.echoCombatProfile(this.echoRank, runtime.mine.memoryDepth);''',
)

replace_once(
    "echo-trigger-profile",
    '''      const profile = buildEchoProfile(this.echoRank, mine.memoryDepth);''',
    '''      const profile = this.echoCombatProfile(this.echoRank, mine.memoryDepth);''',
)

replace_once(
    "echo-placement-profile",
    '''  private tryPlaceEchoMine(): void {
    const profile = buildEchoProfile(this.echoRank, 0);''',
    '''  private tryPlaceEchoMine(): void {
    const profile = this.echoCombatProfile(this.echoRank, 0);''',
)

replace_once(
    "signal-update-profile",
    '''  private updateSignalArc(dtMs: number): void {
    const profile = buildSignalArcProfile(this.signalRank);
    this.signalAccumulator = advanceSignalArcCooldown(this.signalAccumulator, dtMs, profile);
    if (this.signalAccumulator < profile.cooldownMs) return;
    const path = planSignalArc(this.enemies, this.phase, this.friend.x, this.friend.y, profile);
    if (path.length === 0) return;
    let controlledRouting = false;
    if (this.signalRank >= 5) {
      const nearestPath = planSignalArc(this.enemies, this.phase, this.friend.x, this.friend.y, buildSignalArcProfile(4));''',
    '''  private updateSignalArc(dtMs: number): void {
    const profile = this.signalCombatProfile();
    this.signalAccumulator = advanceSignalArcCooldown(this.signalAccumulator, dtMs, profile);
    if (this.signalAccumulator < profile.cooldownMs) return;
    const path = planSignalArc(this.enemies, this.phase, this.friend.x, this.friend.y, profile);
    if (path.length === 0) return;
    let controlledRouting = false;
    if (this.signalRank >= 5) {
      const nearestPath = planSignalArc(this.enemies, this.phase, this.friend.x, this.friend.y, this.signalCombatProfile(4));''',
)

replace_once(
    "checkpoint-refract",
    '''      this.rewardLedger = claim.ledger;
      if (claim.newlyClaimed) {
        this.elitesDefeated += 1;''',
    '''      this.rewardLedger = claim.ledger;
      if (claim.newlyClaimed) {
        this.applyCR2Projection(applyCR2CheckpointProgressionReward(this.buildCR2LiveSnapshot(), checkpointId, true));
        this.elitesDefeated += 1;''',
)

replace_once(
    "core-normalized-state",
    '''    if (kind === "EVOLUTION_CORE") { this.evolutionCores += 1; this.statusText.setText(`EVOLUTION CORE ACQUIRED // ${this.evolutionCores}`); return false; }''',
    '''    if (kind === "EVOLUTION_CORE") {
      this.applyCR2Projection(collectCR2EvolutionCoreLive(this.buildCR2LiveSnapshot()));
      this.statusText.setText(`EVOLUTION CORE ACQUIRED // ${this.evolutionCores}`);
      return false;
    }''',
)

replace_once(
    "open-draft-protocols",
    '''  private openDraft(): void {
    this.draftChoices = buildV21Draft(this.seed, this.level, this.buildState());
    if (this.draftChoices.length === 0) {
      this.draftOpen = false; this.setCombatControlsEnabled(true);
      this.statusText.setDepth(110).setText("LEVEL UP // upgrade pool exhausted · combat resumed."); this.syncTestState(); return;
    }
    this.draftOpen = true; this.setCombatControlsEnabled(false);
    this.draftBackdrop?.destroy();
    this.draftBackdrop = this.add.rectangle(480, 320, 960, 640, 0x05070a, 0.58).setScrollFactor(0).setDepth(180);
    const xs = draftCardXs(this.draftChoices.length);
    this.draftViews = this.draftChoices.map((choice, index) => this.makeDraftCard(xs[index], choice, index));
    const keyLabel = this.draftChoices.length === 1 ? "key 1" : `keys 1–${this.draftChoices.length}`;
    this.statusText.setText(`LEVEL UP // choose 1 of ${this.draftChoices.length} · ${keyLabel} or tap`).setDepth(210); this.syncTestState();
  }

  private makeDraftCard(x: number, choice: V21DraftChoice, index: number): Phaser.GameObjects.Container {''',
    '''  private renderDraftChoices(): void {
    for (const view of this.draftViews) view.destroy(true);
    this.draftViews = [];
    this.refractView?.destroy();
    this.refractView = null;
    this.draftBackdrop?.destroy();
    this.draftBackdrop = this.add.rectangle(480, 320, 960, 640, 0x05070a, 0.58).setScrollFactor(0).setDepth(180);
    const xs = draftCardXs(this.draftChoices.length);
    this.draftViews = this.draftChoices.map((choice, index) => this.makeDraftCard(xs[index], choice, index));
    if (this.cr2DraftActive && this.refracts > 0 && this.cr2DraftLegalCandidateCount > 3) {
      this.refractView = this.add.text(480, 466, `REFRACT [R] · ${this.refracts}`, {
        fontFamily: "monospace", fontSize: "12px", color: "#f6c85f", backgroundColor: "#11151b", padding: { x: 12, y: 7 }, fontStyle: "bold",
      }).setOrigin(0.5).setScrollFactor(0).setDepth(211).setInteractive({ useHandCursor: true });
      this.refractView.on("pointerdown", () => this.refractDraft());
    }
  }

  private openDraft(): void {
    if (this.level >= 5) {
      const draft = buildCR2ProtocolDraftFromLive(this.seed, this.level, this.buildCR2LiveSnapshot());
      this.cr2DraftActive = true;
      this.cr2DraftLegalCandidateCount = draft.legalCandidateCount;
      this.draftChoices = draft.choices.map(normalizedDraftViewChoice);
    } else {
      this.cr2DraftActive = false;
      this.cr2DraftLegalCandidateCount = 0;
      this.draftChoices = buildV21Draft(this.seed, this.level, this.buildState()).map(legacyDraftViewChoice);
    }
    if (this.draftChoices.length === 0) {
      this.draftOpen = false; this.setCombatControlsEnabled(true);
      this.statusText.setDepth(110).setText("LEVEL UP // upgrade pool exhausted · combat resumed."); this.syncTestState(); return;
    }
    this.draftOpen = true;
    this.setCombatControlsEnabled(false);
    this.renderDraftChoices();
    const keyLabel = this.draftChoices.length === 1 ? "key 1" : `keys 1–${this.draftChoices.length}`;
    const refractLabel = this.cr2DraftActive && this.refracts > 0 && this.cr2DraftLegalCandidateCount > 3 ? " · R to REFRACT" : "";
    this.statusText.setText(`LEVEL UP // choose 1 of ${this.draftChoices.length} · ${keyLabel} or tap${refractLabel}`).setDepth(210);
    this.syncTestState();
  }

  private refractDraft(): void {
    if (!this.draftOpen || !this.cr2DraftActive || this.refracts <= 0 || this.cr2DraftLegalCandidateCount <= 3) return;
    const result = useCR2ProtocolRefractFromLive(this.seed, this.level, this.buildCR2LiveSnapshot());
    this.applyCR2Projection(result.projection);
    this.cr2DraftLegalCandidateCount = result.draft.legalCandidateCount;
    this.draftChoices = result.draft.choices.map(normalizedDraftViewChoice);
    this.renderDraftChoices();
    this.statusText.setText(`REFRACT // replacement triple locked · ${this.refracts} remaining`).setDepth(210);
    this.syncTestState();
  }

  private makeDraftCard(x: number, choice: DraftViewChoice, index: number): Phaser.GameObjects.Container {''',
)

replace_once(
    "protocol-card-style",
    '''    const isSignal = isSignalAcquire || isSignalRank;
    const isPhaseWeapon = isDelta || isVector || isOrbit || isEcho || isSignal;
    const border = isPhaseWeapon ? hex(this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB) : 0x657383;
    const bg = this.add.rectangle(0, 0, 220, 230, 0x11151b, 0.99).setStrokeStyle(isPhaseWeapon ? 3 : 2, border).setInteractive({ useHandCursor: true });''',
    '''    const isSignal = isSignalAcquire || isSignalRank;
    const isProtocol = choice.category === "PROTOCOL";
    const isPhaseWeapon = isDelta || isVector || isOrbit || isEcho || isSignal;
    const border = isPhaseWeapon ? hex(this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB) : isProtocol ? 0xf6c85f : 0x657383;
    const bg = this.add.rectangle(0, 0, 220, 230, 0x11151b, 0.99).setStrokeStyle(isPhaseWeapon || isProtocol ? 3 : 2, border).setInteractive({ useHandCursor: true });''',
)

replace_once(
    "protocol-card-detail",
    '''            : isSignalRank
              ? `RANK ${romanRank(this.signalRank)} → ${romanRank(nextSignalRank)}`
              : (isVectorAcquire || isOrbitAcquire || isEchoAcquire || isSignalAcquire) ? "ACQUIRE · RANK I" : "RUN UTILITY";''',
    '''            : isSignalRank
              ? `RANK ${romanRank(this.signalRank)} → ${romanRank(nextSignalRank)}`
              : isProtocol
                ? choice.fromRank === 0 ? "ACQUIRE · RANK I" : `RANK ${romanRank(choice.fromRank ?? 1)} → ${romanRank(choice.toRank ?? 1)}`
                : (isVectorAcquire || isOrbitAcquire || isEchoAcquire || isSignalAcquire) ? "ACQUIRE · RANK I" : "RUN UTILITY";''',
)

replace_once(
    "choose-cr2-draft",
    '''  private chooseDraft(index: number): void {
    if (!this.draftOpen) return;
    const choice = this.draftChoices[index]; if (!choice || choice.disabled) return;
    const wasEchoOwned = this.echoOwned;''',
    '''  private chooseDraft(index: number): void {
    if (!this.draftOpen) return;
    const choice = this.draftChoices[index]; if (!choice || choice.disabled) return;
    if (this.cr2DraftActive) {
      if (!choice.candidateId) throw new Error("Normalized CR-2 draft choice is missing candidate identity.");
      const result = applyCR2ProtocolDraftChoiceToLive(this.seed, this.level, this.buildCR2LiveSnapshot(), choice.candidateId);
      this.applyCR2Projection(result.projection);
      for (const view of this.draftViews) view.destroy(true);
      this.draftViews = []; this.draftChoices = []; this.draftBackdrop?.destroy(); this.draftBackdrop = null; this.refractView?.destroy(); this.refractView = null; this.draftOpen = false;
      this.cr2DraftActive = false; this.cr2DraftLegalCandidateCount = 0;
      this.setCombatControlsEnabled(true); this.statusText.setDepth(110).setText(`${result.selected.name} selected // combat resumed.`); this.updateHud(); this.syncTestState();
      return;
    }
    const wasEchoOwned = this.echoOwned;''',
)

replace_once(
    "legacy-draft-cleanup",
    '''    this.draftViews = []; this.draftChoices = []; this.draftBackdrop?.destroy(); this.draftBackdrop = null; this.draftOpen = false;
    this.setCombatControlsEnabled(true); this.statusText.setDepth(110).setText(`${choice.name} selected // combat resumed.`); this.updateHud(); this.syncTestState();''',
    '''    this.draftViews = []; this.draftChoices = []; this.draftBackdrop?.destroy(); this.draftBackdrop = null; this.refractView?.destroy(); this.refractView = null; this.draftOpen = false;
    this.cr2DraftActive = false; this.cr2DraftLegalCandidateCount = 0;
    this.setCombatControlsEnabled(true); this.statusText.setDepth(110).setText(`${choice.name} selected // combat resumed.`); this.updateHud(); this.syncTestState();''',
)

replace_once(
    "keyboard-refract",
    '''      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "1", "2", "3"].includes(key)) event.preventDefault();
      if (event.repeat && key === " ") return;''',
    '''      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "1", "2", "3", "r"].includes(key)) event.preventDefault();
      if (event.repeat && (key === " " || key === "r")) return;''',
)

replace_once(
    "keyboard-refract-action",
    '''      else if (key === "a" || key === "arrowleft") this.moveLeft = true; else if (key === "d" || key === "arrowright") this.moveRight = true;
      else if (key === " ") this.shift(); else if (this.draftOpen && /^[1-3]$/u.test(key)) this.chooseDraft(Number(key) - 1);''',
    '''      else if (key === "a" || key === "arrowleft") this.moveLeft = true; else if (key === "d" || key === "arrowright") this.moveRight = true;
      else if (key === " ") this.shift(); else if (key === "r" && this.draftOpen) this.refractDraft(); else if (this.draftOpen && /^[1-3]$/u.test(key)) this.chooseDraft(Number(key) - 1);''',
)

replace_once(
    "hud-core-refract",
    '''    if (this.stageText) this.stageText.setText(`${stageForElapsedMs(this.elapsedActiveMs).label} · CORES ${this.evolutionCores}`);''',
    '''    if (this.stageText) this.stageText.setText(`${stageForElapsedMs(this.elapsedActiveMs).label} · CORES ${this.evolutionCores} · REFRACT ${this.refracts}`);''',
)

replace_once(
    "sync-draft-cr2",
    '''    canvas.dataset.draftCount = String(this.draftChoices.length); canvas.dataset.draftIds = this.draftChoices.map(choice => choice.id).join(",");
    canvas.dataset.activeEnemies = String(this.enemies.filter(enemy => enemy.active).length);''',
    '''    canvas.dataset.draftCount = String(this.draftChoices.length); canvas.dataset.draftIds = this.draftChoices.map(choice => choice.id).join(",");
    canvas.dataset.draftCandidateIds = this.draftChoices.map(choice => choice.candidateId ?? "").join(",");
    canvas.dataset.cr2DraftActive = this.cr2DraftActive ? "true" : "false";
    canvas.dataset.refracts = String(this.refracts); canvas.dataset.rerollNonce = String(this.rerollNonce);
    canvas.dataset.protocols = Object.entries(this.protocols).sort(([a], [b]) => a.localeCompare(b)).map(([family, rank]) => `${family}:${rank}`).join(",");
    canvas.dataset.protocolSlotsUsed = String(Object.keys(this.protocols).length);
    canvas.dataset.activeEnemies = String(this.enemies.filter(enemy => enemy.active).length);''',
)

replace_once(
    "sync-delta-profile",
    '''    const deltaProfile = buildDeltaProfile(this.pair.a.rows, this.pair.b.rows, this.phase, this.deltaRank);''',
    '''    const deltaProfile = this.deltaCombatProfile();''',
)

replace_once(
    "sync-vector-protocol-data",
    '''    canvas.dataset.weaponSlotsUsed = String(this.weaponSlotsUsed);
    canvas.dataset.vectorOwned = this.vectorOwned ? "true" : "false";''',
    '''    canvas.dataset.weaponSlotsUsed = String(this.weaponSlotsUsed);
    const vectorProfile = this.vectorCombatProfile();
    canvas.dataset.vectorProtocolRange = String(vectorProfile.range);
    canvas.dataset.vectorProtocolSpeed = String(vectorProfile.speed);
    canvas.dataset.vectorOwned = this.vectorOwned ? "true" : "false";''',
)

replace_once(
    "sync-orbit-profile",
    '''    const orbitProfile = buildOrbitProfile(this.orbitRank);''',
    '''    const orbitProfile = this.orbitCombatProfile();''',
)

replace_once(
    "sync-orbit-protocol-data",
    '''    canvas.dataset.orbitNodeCount = String(orbitProfile.nodeCount);''',
    '''    canvas.dataset.orbitProtocolRadius = String(orbitProfile.radius);
    canvas.dataset.orbitProtocolContactIntervalMs = String(orbitProfile.contactIntervalMs);
    canvas.dataset.orbitNodeCount = String(orbitProfile.nodeCount);''',
)

replace_once(
    "sync-echo-profile",
    '''    const echoProfile = buildEchoProfile(this.echoRank, 0);''',
    '''    const echoProfile = this.echoCombatProfile(this.echoRank, 0);''',
)

replace_once(
    "sync-echo-protocol-data",
    '''    canvas.dataset.echoReturnDelayMs = String(echoProfile.returnDelayMs);''',
    '''    canvas.dataset.echoReturnDelayMs = String(echoProfile.returnDelayMs);
    canvas.dataset.echoProtocolLifetimeMs = String(echoProfile.lifetimeMs);
    canvas.dataset.echoProtocolTriggerRadius = String(echoProfile.triggerRadius);''',
)

replace_once(
    "sync-signal-profile",
    '''    const signalProfile = buildSignalArcProfile(this.signalRank);''',
    '''    const signalProfile = this.signalCombatProfile();''',
)

replace_once(
    "sync-signal-cooldown",
    '''    canvas.dataset.signalShiftGraphInvalidations = String(this.signalShiftGraphInvalidations);
    canvas.dataset.signalCooldownReady = this.signalAccumulator >= buildSignalArcProfile(this.signalRank).cooldownMs ? "true" : "false";''',
    '''    canvas.dataset.signalShiftGraphInvalidations = String(this.signalShiftGraphInvalidations);
    canvas.dataset.signalProtocolCooldownMs = String(signalProfile.cooldownMs);
    canvas.dataset.signalCooldownReady = this.signalAccumulator >= signalProfile.cooldownMs ? "true" : "false";''',
)

path.write_text(source, encoding="utf-8")
print(f"PATCH_RESULT={path}")
