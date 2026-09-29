import { readFileSync, writeFileSync } from "node:fs";

const file = "games/rare-shift/src/phaser-survival.ts";
let source = readFileSync(file, "utf8");

function fail(message) {
  throw new Error(`CR2B_PATCH_ABORT: ${message}`);
}

function replaceOnce(oldText, newText, label) {
  const first = source.indexOf(oldText);
  if (first < 0) fail(`${label}: source anchor missing`);
  if (source.indexOf(oldText, first + oldText.length) >= 0) fail(`${label}: source anchor is not unique`);
  source = source.slice(0, first) + newText + source.slice(first + oldText.length);
}

function replaceAllRequired(oldText, newText, label) {
  if (!source.includes(oldText)) fail(`${label}: source anchor missing`);
  source = source.split(oldText).join(newText);
}

function replaceRange(startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start < 0) fail(`${label}: start marker missing`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) fail(`${label}: end marker missing`);
  if (source.indexOf(startMarker, start + startMarker.length) >= 0) fail(`${label}: start marker is not unique`);
  source = source.slice(0, start) + replacement + source.slice(end);
}

const importAnchor = 'import { advanceSignalArcCooldown, buildSignalArcProfile, planSignalArc, SIGNAL_ARC_RANK_I, type SignalArcHop } from "./signal-arc-core.ts";\n';
replaceOnce(importAnchor, importAnchor + `import {\n  applyCR2CandidateToLive,\n  buildCR2StateFromLive,\n  grantCR2CoreToLive,\n  projectCR2StateToLive,\n  restoreCR2RefractToLive,\n  type CR2LiveProjection,\n  type CR2LiveSnapshot,\n} from "./cr2-live-state-core.ts";\nimport { cr2DraftCategory, cr2LegacyCompatibleDraftId } from "./cr2-live-draft-compat.ts";\nimport {\n  applyCommonCoreToDelta,\n  applyMemoryFuseToEcho,\n  applyOrbitStabilizerToOrbit,\n  applyResonanceCoilToSignal,\n  applyVectorLensToVector,\n  cr2EffectivePickupRadius,\n} from "./cr2-protocol-runtime.ts";\nimport type { CR2ProtocolRank } from "./cr2-progression-core.ts";\nimport {\n  buildV23ADraft,\n  useV23ARefract,\n  V23_PROTOCOL_FAMILIES,\n  type V23DraftCandidate,\n  type V23ProtocolFamily,\n  type V23WeaponFamily,\n} from "./progression-core.ts";\n`, "CR-2 imports");

replaceOnce(
  "const PICKUP_POOL_SIZE = 64;\n",
  `const PICKUP_POOL_SIZE = 64;\nconst PROTOCOL_SHORT: Readonly<Record<V23ProtocolFamily, string>> = Object.freeze({\n  COMMON_CORE: "CC",\n  VECTOR_LENS: "VL",\n  ORBIT_STABILIZER: "OS",\n  MEMORY_FUSE: "MF",\n  RESONANCE_COIL: "RC",\n});\n`,
  "Protocol HUD abbreviations",
);

replaceOnce(
  "  private evolutionCores = 0;\n",
  `  private evolutionCores = 0;\n  private protocols: Partial<Record<V23ProtocolFamily, number>> = {};\n  private evolvedWeapons: Partial<Record<V23WeaponFamily, boolean>> = {};\n  private refracts = 1;\n  private rerollNonce = 0;\n`,
  "CR-2 live progression fields",
);
replaceOnce(
  "  private draftChoices: readonly V21DraftChoice[] = [];\n",
  "  private draftChoices: readonly V23DraftCandidate[] = [];\n",
  "Normalized draft choice field",
);
replaceOnce(
  "  private draftBackdrop: Phaser.GameObjects.Rectangle | null = null;\n",
  "  private draftBackdrop: Phaser.GameObjects.Rectangle | null = null;\n  private refractView: Phaser.GameObjects.Container | null = null;\n",
  "REFRACT view field",
);

const newDraftBlock = `  private protocolRank(family: V23ProtocolFamily): CR2ProtocolRank | null {\n    const rank = this.protocols[family];\n    return rank === 1 || rank === 2 || rank === 3 ? rank : null;\n  }\n\n  private deltaProfile(rank = this.deltaRank, phase: Phase = this.phase): ReturnType<typeof buildDeltaProfile> {\n    const base = buildDeltaProfile(this.pair.a.rows, this.pair.b.rows, phase, rank);\n    const protocol = this.protocolRank("COMMON_CORE");\n    return protocol === null ? base : applyCommonCoreToDelta(base, protocol).profile;\n  }\n\n  private vectorProfile(transferShot = false, rank = this.vectorRank): VectorRankProfile {\n    const base = buildVectorProfile(rank, transferShot);\n    const protocol = this.protocolRank("VECTOR_LENS");\n    return protocol === null ? base : applyVectorLensToVector(base, protocol).profile;\n  }\n\n  private orbitProfile(rank = this.orbitRank): OrbitRankProfile {\n    const base = buildOrbitProfile(rank);\n    const protocol = this.protocolRank("ORBIT_STABILIZER");\n    return protocol === null ? base : applyOrbitStabilizerToOrbit(base, protocol);\n  }\n\n  private echoProfile(memoryDepth = 0, rank = this.echoRank): EchoRankProfile {\n    const base = buildEchoProfile(rank, memoryDepth);\n    const protocol = this.protocolRank("MEMORY_FUSE");\n    return protocol === null ? base : applyMemoryFuseToEcho(base, protocol);\n  }\n\n  private signalProfile(rank = this.signalRank): ReturnType<typeof buildSignalArcProfile> {\n    const base = buildSignalArcProfile(rank);\n    const protocol = this.protocolRank("RESONANCE_COIL");\n    return protocol === null ? base : applyResonanceCoilToSignal(base, protocol).profile;\n  }\n\n  private effectivePickupRadius(): number {\n    return cr2EffectivePickupRadius(this.pickupRadius, this.protocols);\n  }\n\n  private liveSnapshot(): CR2LiveSnapshot {\n    return {\n      deltaRank: this.deltaRank,\n      vectorOwned: this.vectorOwned,\n      vectorRank: this.vectorRank,\n      orbitOwned: this.orbitOwned,\n      orbitRank: this.orbitRank,\n      echoOwned: this.echoOwned,\n      echoRank: this.echoRank,\n      signalOwned: this.signalOwned,\n      signalRank: this.signalRank,\n      evolvedWeapons: this.evolvedWeapons,\n      protocols: this.protocols,\n      evolutionCores: this.evolutionCores,\n      refracts: this.refracts,\n      rerollNonce: this.rerollNonce,\n      hp: this.hp,\n      maxHp: V21_PLAYER_MAX_HP,\n      pickupRadius: this.pickupRadius,\n      weaponSlotsUsed: this.weaponSlotsUsed,\n    };\n  }\n\n  private migrateCooldownProgress(currentMs: number, oldCooldownMs: number, newCooldownMs: number): number {\n    const progress = Math.max(0, Math.min(1, currentMs / Math.max(1, oldCooldownMs)));\n    return progress * Math.max(1, newCooldownMs);\n  }\n\n  private applyCR2Projection(next: CR2LiveProjection): void {\n    const wasEchoOwned = this.echoOwned;\n    const oldDeltaRank = this.deltaRank;\n    const oldVectorRank = this.vectorRank;\n    const oldOrbitRank = this.orbitRank;\n    const oldEchoRank = this.echoRank;\n    const oldSignalRank = this.signalRank;\n    const oldSignalOwned = this.signalOwned;\n    const oldDeltaCooldown = this.deltaProfile().cooldownMs;\n    const oldSignalCooldown = oldSignalOwned ? this.signalProfile().cooldownMs : null;\n\n    this.deltaRank = next.deltaRank;\n    this.vectorOwned = next.vectorOwned;\n    this.vectorRank = next.vectorRank;\n    this.orbitOwned = next.orbitOwned;\n    this.orbitRank = next.orbitRank;\n    this.echoOwned = next.echoOwned;\n    this.echoRank = next.echoRank;\n    this.signalOwned = next.signalOwned;\n    this.signalRank = next.signalRank;\n    this.evolvedWeapons = { ...next.evolvedWeapons };\n    this.protocols = { ...next.protocols };\n    this.evolutionCores = next.evolutionCores;\n    this.refracts = next.refracts;\n    this.rerollNonce = next.rerollNonce;\n    this.hp = next.hp;\n    this.pickupRadius = next.pickupRadius;\n    this.weaponSlotsUsed = next.weaponSlotsUsed;\n\n    const newDeltaCooldown = this.deltaProfile().cooldownMs;\n    if (oldDeltaCooldown !== newDeltaCooldown || oldDeltaRank !== this.deltaRank) {\n      this.attackAccumulator = this.migrateCooldownProgress(this.attackAccumulator, oldDeltaCooldown, newDeltaCooldown);\n    }\n\n    if (this.vectorRank !== oldVectorRank) {\n      if (oldVectorRank < 4 && this.vectorRank >= 4) this.vectorTransferState = emptyVectorTransfer();\n      if (this.vectorRank >= 5) this.vectorLockState = initialVectorLockState();\n    }\n    if (this.orbitRank !== oldOrbitRank) {\n      // Preserve anchor, contact ledger and shear rearm. Rank-up or Protocol application emits nothing.\n    }\n    if (this.echoRank !== oldEchoRank) {\n      this.ensureEchoMineCapacity();\n      if (oldEchoRank < 5 && this.echoRank >= 5) {\n        for (const runtime of this.echoMines) if (runtime.active && runtime.mine) runtime.mine = initializeEchoMineForRankV(runtime.mine);\n        this.echoBurstLedger = new Map();\n      }\n    }\n    if (oldSignalOwned && this.signalOwned && oldSignalCooldown !== null) {\n      const newSignalCooldown = this.signalProfile().cooldownMs;\n      if (oldSignalCooldown !== newSignalCooldown || oldSignalRank !== this.signalRank) {\n        this.signalAccumulator = this.migrateCooldownProgress(this.signalAccumulator, oldSignalCooldown, newSignalCooldown);\n      }\n    }\n    if (this.orbitOwned) this.syncOrbitNodeView();\n    if (!wasEchoOwned && this.echoOwned) this.echoPlacementAccumulator = 0;\n  }\n\n  private openDraft(): void {\n    try {\n      this.draftChoices = buildV23ADraft(this.seed, this.level, buildCR2StateFromLive(this.liveSnapshot())).choices;\n    } catch (error) {\n      this.draftChoices = [];\n      this.draftOpen = false;\n      this.setCombatControlsEnabled(true);\n      this.statusText.setDepth(110).setText("LEVEL UP // legal upgrade pool exhausted · combat resumed.");\n      this.syncTestState();\n      return;\n    }\n    this.draftOpen = true;\n    this.setCombatControlsEnabled(false);\n    this.draftBackdrop?.destroy();\n    this.draftBackdrop = this.add.rectangle(480, 320, 960, 640, 0x05070a, 0.58).setScrollFactor(0).setDepth(180);\n    this.renderDraftChoices();\n  }\n\n  private renderDraftChoices(): void {\n    for (const view of this.draftViews) view.destroy(true);\n    this.draftViews = [];\n    this.refractView?.destroy(true);\n    this.refractView = null;\n    const xs = draftCardXs(this.draftChoices.length);\n    this.draftViews = this.draftChoices.map((choice, index) => this.makeDraftCard(xs[index], choice, index));\n    if (this.refracts > 0) {\n      const container = this.add.container(480, 490).setScrollFactor(0).setDepth(205);\n      const bg = this.add.rectangle(0, 0, 220, 42, 0x11151b, 0.98).setStrokeStyle(2, 0x7ee787, 0.82).setInteractive({ useHandCursor: true });\n      const label = this.add.text(0, 0, `R // REFRACT · ${this.refracts}`, { fontFamily: "monospace", fontSize: "12px", color: "#d7fbe2", fontStyle: "bold" }).setOrigin(0.5);\n      container.add([bg, label]);\n      bg.on("pointerdown", () => this.refractDraft());\n      this.refractView = container;\n    }\n    const refractHint = this.refracts > 0 ? " · R REFRACT" : "";\n    this.statusText.setText(`LEVEL UP // choose 1 of ${this.draftChoices.length} · keys 1–${this.draftChoices.length}${refractHint}`).setDepth(210);\n    this.syncTestState();\n  }\n\n  private refractDraft(): void {\n    if (!this.draftOpen || this.refracts <= 0) return;\n    const result = useV23ARefract(this.seed, this.level, buildCR2StateFromLive(this.liveSnapshot()));\n    this.applyCR2Projection(projectCR2StateToLive(result.state));\n    this.draftChoices = result.draft.choices;\n    this.renderDraftChoices();\n    this.statusText.setText(`REFRACT // deterministic reroll applied · ${this.refracts} remaining`).setDepth(210);\n  }\n\n  private makeDraftCard(x: number, choice: V23DraftCandidate, index: number): Phaser.GameObjects.Container {\n    const legacyId = cr2LegacyCompatibleDraftId(choice);\n    const category = cr2DraftCategory(choice);\n    const container = this.add.container(x, 320).setScrollFactor(0).setDepth(200);\n    const isDelta = legacyId === "DELTA_RANK";\n    const isVector = legacyId === "VECTOR_NEEDLE" || legacyId === "VECTOR_RANK";\n    const isOrbit = legacyId === "ORBIT_NODES" || legacyId === "ORBIT_RANK";\n    const isEcho = legacyId === "ECHO_MINE" || legacyId === "ECHO_RANK";\n    const isSignal = legacyId === "SIGNAL_ARC" || legacyId === "SIGNAL_RANK";\n    const isPhaseWeapon = isDelta || isVector || isOrbit || isEcho || isSignal;\n    const border = category === "PROTOCOL" ? 0x7ee787 : isPhaseWeapon ? hex(this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB) : 0x657383;\n    const bg = this.add.rectangle(0, 0, 220, 230, 0x11151b, 0.99).setStrokeStyle(category === "PROTOCOL" || isPhaseWeapon ? 3 : 2, border).setInteractive({ useHandCursor: true });\n    const tag = this.add.text(0, -91, `${index + 1} // ${category}`, { fontFamily: "monospace", fontSize: "11px", color: "#8b98a7" }).setOrigin(0.5);\n    const rankSuffix = choice.toRank !== null && choice.candidateType !== "UTILITY" ? ` ${romanRank(choice.toRank)}` : "";\n    const title = this.add.text(0, -54, `${choice.name}${rankSuffix}`, { fontFamily: "monospace", fontSize: "16px", color: V2_PALETTE.common, fontStyle: "bold", align: "center", wordWrap: { width: 190 } }).setOrigin(0.5);\n    let detailText = "RUN UTILITY";\n    if (choice.candidateType === "WEAPON_ACQUIRE") detailText = "ACQUIRE · RANK I";\n    else if (choice.candidateType === "WEAPON_RANK") detailText = `RANK ${romanRank(choice.fromRank ?? 1)} → ${romanRank(choice.toRank ?? 1)}`;\n    else if (choice.candidateType === "PROTOCOL_ACQUIRE") detailText = `PROTOCOL SLOT · RANK I`;\n    else if (choice.candidateType === "PROTOCOL_RANK") detailText = `PROTOCOL ${romanRank(choice.fromRank ?? 1)} → ${romanRank(choice.toRank ?? 1)}`;\n    const detail = this.add.text(0, -27, detailText, { fontFamily: "monospace", fontSize: "9px", color: category === "PROTOCOL" ? "#7ee787" : isPhaseWeapon ? (this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB) : "#748392", letterSpacing: 1 }).setOrigin(0.5);\n    const protocolSuffix = category === "PROTOCOL" ? " Also strengthens pickup-field reach by +4px per Protocol rank." : "";\n    const desc = this.add.text(0, 61, `${choice.description}${protocolSuffix}`, { fontFamily: "monospace", fontSize: "10px", color: "#bac5d0", align: "center", wordWrap: { width: 184 } }).setOrigin(0.5);\n    container.add([bg, tag, title, detail]);\n\n    if (isDelta) {\n      const preview = this.add.graphics();\n      const previewProfile = this.deltaProfile(choice.toRank ?? this.deltaRank);\n      const previewScale = 1.35 * previewProfile.worldScale / 8;\n      preview.fillStyle(border, 0.82);\n      for (const point of previewProfile.points) preview.fillRect(point.x * previewScale - 1.5, point.y * previewScale - 1.5, 3, 3);\n      preview.setPosition(0, 9);\n      container.add(preview);\n    } else if (isVector) {\n      const glyph = this.add.graphics().lineStyle(3, border, 0.82); glyph.lineBetween(-28, 8, 28, -8); glyph.strokeCircle(25, -7, 5); glyph.setPosition(0, 2); container.add(glyph);\n    } else if (isOrbit) {\n      const previewProfile = this.orbitProfile(choice.toRank ?? 1);\n      const glyph = this.add.graphics().lineStyle(2, border, 0.78); glyph.strokeCircle(0, 2, 27);\n      for (const angle of orbitNodeAngles(0, previewProfile.nodeCount)) { const nodeX = Math.cos(angle) * 27; const nodeY = 2 + Math.sin(angle) * 27; glyph.fillStyle(border, 0.95).fillRect(nodeX - 5, nodeY - 5, 10, 10); }\n      container.add(glyph);\n    } else if (isEcho) {\n      const glyph = this.add.graphics().lineStyle(2, border, 0.78); glyph.strokeCircle(0, 3, 25); glyph.fillStyle(border, 0.9).fillRect(-6, -3, 12, 12); glyph.lineBetween(-31, 3, -19, 3); glyph.lineBetween(19, 3, 31, 3); container.add(glyph);\n    } else if (isSignal) {\n      const glyph = this.add.graphics().lineStyle(2, border, 0.82); glyph.lineBetween(-30, 10, -7, -7); glyph.lineBetween(-7, -7, 13, 7); glyph.lineBetween(13, 7, 30, -10); glyph.fillStyle(border, 0.95).fillCircle(-30, 10, 4).fillCircle(-7, -7, 4).fillCircle(13, 7, 4).fillCircle(30, -10, 4); container.add(glyph);\n    } else if (category === "PROTOCOL") {\n      const glyph = this.add.graphics().lineStyle(2, border, 0.82); glyph.strokeCircle(0, 2, 24); glyph.lineBetween(-28, 2, 28, 2); glyph.lineBetween(0, -26, 0, 30); glyph.fillStyle(border, 0.9).fillRect(-5, -3, 10, 10); container.add(glyph);\n    } else {\n      const glyph = this.add.graphics().lineStyle(2, border, 0.62); glyph.strokeRect(-12, -3, 24, 24); glyph.lineBetween(-6, 9, 6, 9); glyph.setPosition(0, -2); container.add(glyph);\n    }\n    container.add(desc);\n    bg.on("pointerdown", () => this.chooseDraft(index));\n    return container;\n  }\n\n  private closeDraft(message: string): void {\n    for (const view of this.draftViews) view.destroy(true);\n    this.draftViews = [];\n    this.draftChoices = [];\n    this.refractView?.destroy(true);\n    this.refractView = null;\n    this.draftBackdrop?.destroy();\n    this.draftBackdrop = null;\n    this.draftOpen = false;\n    this.setCombatControlsEnabled(true);\n    this.statusText.setDepth(110).setText(message);\n    this.updateHud();\n    this.syncTestState();\n  }\n\n  private chooseDraft(index: number): void {\n    if (!this.draftOpen) return;\n    const choice = this.draftChoices[index];\n    if (!choice) return;\n    const projection = applyCR2CandidateToLive(this.liveSnapshot(), choice);\n    this.applyCR2Projection(projection);\n    this.closeDraft(`${choice.name} selected // combat resumed.`);\n  }\n\n`;
replaceRange(
  "  private buildState(): V21BuildState {\n",
  "  private updateMovement(dt: number): void {\n",
  newDraftBlock,
  "Normalized CR-2B draft/live bridge",
);

replaceAllRequired(
  "buildDeltaProfile(this.pair.a.rows, this.pair.b.rows, this.phase, this.deltaRank)",
  "this.deltaProfile()",
  "Live DELTA Protocol profile",
);
replaceAllRequired("buildVectorProfile(this.vectorRank, transferReady)", "this.vectorProfile(transferReady)", "Live VECTOR transfer profile");
replaceAllRequired("buildVectorProfile(this.vectorRank)", "this.vectorProfile()", "Live VECTOR Protocol profile");
replaceAllRequired("buildOrbitProfile(this.orbitRank)", "this.orbitProfile()", "Live ORBIT Protocol profile");
replaceAllRequired("buildEchoProfile(this.echoRank, 0)", "this.echoProfile(0)", "Live ECHO base Protocol profile");
replaceAllRequired("buildEchoProfile(this.echoRank, runtime.mine.memoryDepth)", "this.echoProfile(runtime.mine.memoryDepth)", "Live ECHO runtime Protocol profile");
replaceAllRequired("buildEchoProfile(this.echoRank, mine.memoryDepth)", "this.echoProfile(mine.memoryDepth)", "Live ECHO trigger Protocol profile");
replaceAllRequired("buildSignalArcProfile(this.signalRank)", "this.signalProfile()", "Live SIGNAL Protocol profile");
replaceAllRequired("buildSignalArcProfile(4)", "this.signalProfile(4)", "Live SIGNAL comparison Protocol profile");

const vectorTargetOld = `  private refreshVectorTarget(): void {\n    if (this.vectorRank >= 5 && this.vectorLockState.targetId !== null) {\n      const locked = this.enemies.find(enemy => enemy.active && enemy.id === this.vectorLockState.targetId) ?? null;\n      if (!locked || !isEnemyCorporeal(locked.kind, this.phase) || vectorPriorityTier(locked.kind) < 1) {\n        this.resetVectorLockState();\n      } else {\n        const dx = locked.x - this.friend.x, dy = locked.y - this.friend.y;\n        if (dx * dx + dy * dy > VECTOR_RANK_I.range * VECTOR_RANK_I.range) this.resetVectorLockState();\n      }\n    }\n\n    const result = this.vectorRank >= 3\n      ? acquirePriorityVectorTarget(this.enemies, this.phase, this.friend.x, this.friend.y, this.vectorRank >= 5 ? this.vectorLockState.targetId : null)\n      : acquireVectorTarget(this.enemies, this.phase, this.friend.x, this.friend.y);\n`;
const vectorTargetNew = `  private refreshVectorTarget(): void {\n    const targetProfile = this.vectorProfile();\n    if (this.vectorRank >= 5 && this.vectorLockState.targetId !== null) {\n      const locked = this.enemies.find(enemy => enemy.active && enemy.id === this.vectorLockState.targetId) ?? null;\n      if (!locked || !isEnemyCorporeal(locked.kind, this.phase) || vectorPriorityTier(locked.kind) < 1) {\n        this.resetVectorLockState();\n      } else {\n        const dx = locked.x - this.friend.x, dy = locked.y - this.friend.y;\n        if (dx * dx + dy * dy > targetProfile.range * targetProfile.range) this.resetVectorLockState();\n      }\n    }\n\n    const result = this.vectorRank >= 3\n      ? acquirePriorityVectorTarget(this.enemies, this.phase, this.friend.x, this.friend.y, this.vectorRank >= 5 ? this.vectorLockState.targetId : null, targetProfile.range, targetProfile.priorityBand)\n      : acquireVectorTarget(this.enemies, this.phase, this.friend.x, this.friend.y, targetProfile.range);\n`;
replaceOnce(vectorTargetOld, vectorTargetNew, "VECTOR acquisition range Protocol wiring");

replaceOnce(
  "      if (pickup.magnetized || distance <= this.pickupRadius) {\n",
  "      if (pickup.magnetized || distance <= this.effectivePickupRadius()) {\n",
  "Universal Protocol field utility",
);

replaceOnce(
  "    if (kind === \"EVOLUTION_CORE\") { this.evolutionCores += 1; this.statusText.setText(`EVOLUTION CORE ACQUIRED // ${this.evolutionCores}`); return false; }\n",
  "    if (kind === \"EVOLUTION_CORE\") { this.applyCR2Projection(grantCR2CoreToLive(this.liveSnapshot(), 1)); this.statusText.setText(`EVOLUTION CORE ACQUIRED // ${this.evolutionCores}`); return false; }\n",
  "Evolution Core normalized synchronization",
);

replaceOnce(
  "        this.elitesDefeated += 1;\n        claim.rewards.forEach((reward, index) => this.spawnPickup(reward, deathX, deathY, index + 1));\n",
  "        this.elitesDefeated += 1;\n        if (checkpointId === \"CHECKPOINT_ELITE\") this.applyCR2Projection(restoreCR2RefractToLive(this.liveSnapshot(), 1));\n        claim.rewards.forEach((reward, index) => this.spawnPickup(reward, deathX, deathY, index + 1));\n",
  "Checkpoint REFRACT restoration",
);

replaceOnce(
  "    this.buildText.setText(`K ${this.kills} · Δ ${romanRank(this.deltaRank)} · V ${this.vectorOwned ? romanRank(this.vectorRank) : \"--\"} · O ${this.orbitOwned ? romanRank(this.orbitRank) : \"--\"} · E ${this.echoOwned ? romanRank(this.echoRank) : \"--\"} · S ${this.signalOwned ? romanRank(this.signalRank) : \"--\"}`);\n",
  "    const protocolSummary = V23_PROTOCOL_FAMILIES.filter(family => this.protocols[family] !== undefined).map(family => `${PROTOCOL_SHORT[family]}${romanRank(this.protocols[family] ?? 1)}`).join(\" \") || \"--\";\n    this.buildText.setText(`K ${this.kills} · Δ ${romanRank(this.deltaRank)} · V ${this.vectorOwned ? romanRank(this.vectorRank) : \"--\"} · O ${this.orbitOwned ? romanRank(this.orbitRank) : \"--\"} · E ${this.echoOwned ? romanRank(this.echoRank) : \"--\"} · S ${this.signalOwned ? romanRank(this.signalRank) : \"--\"}\\nP ${protocolSummary} · R ${this.refracts}`);\n",
  "Protocol HUD summary",
);
replaceOnce(
  "    if (this.stageText) this.stageText.setText(`${stageForElapsedMs(this.elapsedActiveMs).label} · CORES ${this.evolutionCores}`);\n",
  "    if (this.stageText) this.stageText.setText(`${stageForElapsedMs(this.elapsedActiveMs).label} · CORES ${this.evolutionCores} · REFRACT ${this.refracts}`);\n",
  "Core and REFRACT HUD state",
);

replaceOnce(
  "      if ([\"arrowup\", \"arrowdown\", \"arrowleft\", \"arrowright\", \"w\", \"a\", \"s\", \"d\", \" \", \"1\", \"2\", \"3\"].includes(key)) event.preventDefault();\n      if (event.repeat && key === \" \") return;\n",
  "      if ([\"arrowup\", \"arrowdown\", \"arrowleft\", \"arrowright\", \"w\", \"a\", \"s\", \"d\", \" \", \"r\", \"1\", \"2\", \"3\"].includes(key)) event.preventDefault();\n      if (event.repeat && (key === \" \" || key === \"r\")) return;\n",
  "REFRACT keyboard input",
);
replaceOnce(
  "      else if (key === \" \") this.shift(); else if (this.draftOpen && /^[1-3]$/u.test(key)) this.chooseDraft(Number(key) - 1);\n",
  "      else if (key === \" \") this.shift(); else if (this.draftOpen && key === \"r\") this.refractDraft(); else if (this.draftOpen && /^[1-3]$/u.test(key)) this.chooseDraft(Number(key) - 1);\n",
  "REFRACT key action",
);

replaceOnce(
  "    canvas.dataset.deltaRank = String(this.deltaRank); canvas.dataset.pickupRadius = String(this.pickupRadius); canvas.dataset.draftOpen = this.draftOpen ? \"true\" : \"false\";\n    canvas.dataset.draftCount = String(this.draftChoices.length); canvas.dataset.draftIds = this.draftChoices.map(choice => choice.id).join(\",\");\n",
  "    canvas.dataset.deltaRank = String(this.deltaRank); canvas.dataset.pickupRadius = String(this.pickupRadius); canvas.dataset.effectivePickupRadius = String(this.effectivePickupRadius()); canvas.dataset.draftOpen = this.draftOpen ? \"true\" : \"false\";\n    canvas.dataset.draftCount = String(this.draftChoices.length); canvas.dataset.draftIds = this.draftChoices.map(cr2LegacyCompatibleDraftId).join(\",\"); canvas.dataset.draftCandidateIds = this.draftChoices.map(choice => choice.candidateId).join(\",\");\n",
  "Legacy-compatible draft diagnostics",
);
replaceOnce(
  "    canvas.dataset.spawnedCheckpoints = [...this.spawnedCheckpoints].join(\",\"); canvas.dataset.elitesDefeated = String(this.elitesDefeated); canvas.dataset.evolutionCores = String(this.evolutionCores);\n",
  "    canvas.dataset.spawnedCheckpoints = [...this.spawnedCheckpoints].join(\",\"); canvas.dataset.elitesDefeated = String(this.elitesDefeated); canvas.dataset.evolutionCores = String(this.evolutionCores); canvas.dataset.refracts = String(this.refracts); canvas.dataset.rerollNonce = String(this.rerollNonce);\n    canvas.dataset.protocolSlotsUsed = String(Object.values(this.protocols).filter(rank => rank !== undefined).length); canvas.dataset.protocols = V23_PROTOCOL_FAMILIES.filter(family => this.protocols[family] !== undefined).map(family => `${family}:${this.protocols[family]}`).join(\",\");\n    canvas.dataset.protocolCommonCore = String(this.protocols.COMMON_CORE ?? 0); canvas.dataset.protocolVectorLens = String(this.protocols.VECTOR_LENS ?? 0); canvas.dataset.protocolOrbitStabilizer = String(this.protocols.ORBIT_STABILIZER ?? 0); canvas.dataset.protocolMemoryFuse = String(this.protocols.MEMORY_FUSE ?? 0); canvas.dataset.protocolResonanceCoil = String(this.protocols.RESONANCE_COIL ?? 0);\n",
  "CR-2 Protocol diagnostics",
);

writeFileSync(file, source, "utf8");
console.log("CR2B_PATCH=PASS");
