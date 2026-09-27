import { readFile, writeFile } from "node:fs/promises";

const path = "games/rare-shift/src/phaser-survival.ts";
let source = await readFile(path, "utf8");
if (source.includes('from "./signal-arc-core.ts"')) {
  console.log("V2_2D_RUNTIME_PATCH=ALREADY_APPLIED");
  process.exit(0);
}

function replaceOnce(before, after, label) {
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`V2-2D runtime patch anchor missing: ${label}`);
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`V2-2D runtime patch anchor ambiguous: ${label}`);
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

replaceOnce(
  'import { acquireVectorTarget, VECTOR_RANK_I } from "./vector-core.ts";\n',
  'import { acquireVectorTarget, VECTOR_RANK_I } from "./vector-core.ts";\nimport { advanceSignalArcCooldown, planSignalArc, SIGNAL_ARC_RANK_I, type SignalArcHop } from "./signal-arc-core.ts";\n',
  "signal import",
);

replaceOnce(
  '  private orbitNode!: Phaser.GameObjects.Graphics;\n  private burst!: Phaser.GameObjects.Graphics;\n',
  '  private orbitNode!: Phaser.GameObjects.Graphics;\n  private signalFx!: Phaser.GameObjects.Graphics;\n  private burst!: Phaser.GameObjects.Graphics;\n',
  "signal graphics field",
);

replaceOnce(
  '  private echoExpiries = 0;\n\n  private weaponSlotsUsed = 1;\n',
  '  private echoExpiries = 0;\n\n  private signalOwned = false;\n  private signalAccumulator = 0;\n  private signalCasts = 0;\n  private signalHits = 0;\n  private signalMultiTargetCasts = 0;\n  private signalShiftGraphInvalidations = 0;\n  private signalLastCastPhase: Phase | null = null;\n  private signalLastChainIds: number[] = [];\n  private signalLastChainKinds: V2EnemyKind[] = [];\n  private signalLastChainDamage: number[] = [];\n\n  private weaponSlotsUsed = 1;\n',
  "signal runtime state",
);

replaceOnce(
  '    this.vectorReticle = this.add.graphics().setDepth(27).setVisible(false);\n    this.orbitNode = this.add.graphics().setDepth(28).setVisible(false);\n',
  '    this.vectorReticle = this.add.graphics().setDepth(27).setVisible(false);\n    this.orbitNode = this.add.graphics().setDepth(28).setVisible(false);\n    this.signalFx = this.add.graphics().setDepth(29).setVisible(false);\n',
  "signal graphics create",
);

replaceOnce(
  '    if (this.echoOwned) this.updateEcho(dt);\n    else this.hideEchoViews();\n\n    this.updateEnemies(dt / 1000);\n',
  '    if (this.echoOwned) this.updateEcho(dt);\n    else this.hideEchoViews();\n\n    if (this.signalOwned) this.updateSignalArc(dt);\n    else this.signalFx.clear().setVisible(false);\n\n    this.updateEnemies(dt / 1000);\n',
  "signal update hook",
);

replaceOnce(
  '    this.buildText.setText(`K ${this.kills} · Δ ${romanRank(this.deltaRank)} · V ${this.vectorOwned ? "I" : "--"} · O ${this.orbitOwned ? "I" : "--"} · E ${this.echoOwned ? "I" : "--"}`);\n',
  '    this.buildText.setText(`K ${this.kills} · Δ ${romanRank(this.deltaRank)} · V ${this.vectorOwned ? "I" : "--"} · O ${this.orbitOwned ? "I" : "--"} · E ${this.echoOwned ? "I" : "--"} · S ${this.signalOwned ? "I" : "--"}`);\n',
  "build HUD",
);

replaceOnce(
  '  private killEnemy(enemy: EnemyRuntime): void {\n',
  `  private updateSignalArc(dtMs: number): void {\n    this.signalAccumulator = advanceSignalArcCooldown(this.signalAccumulator, dtMs);\n    if (this.signalAccumulator < SIGNAL_ARC_RANK_I.cooldownMs) return;\n    const path = planSignalArc(this.enemies, this.phase, this.friend.x, this.friend.y);\n    if (path.length === 0) return;\n    this.fireSignalArc(path);\n    this.signalAccumulator = 0;\n  }\n\n  private fireSignalArc(path: readonly SignalArcHop[]): void {\n    const castPhase = this.phase;\n    this.signalCasts += 1;\n    if (path.length >= 2) this.signalMultiTargetCasts += 1;\n    this.signalLastCastPhase = castPhase;\n    this.signalLastChainIds = path.map(hop => hop.id);\n    this.signalLastChainKinds = path.map(hop => hop.kind);\n    this.signalLastChainDamage = path.map(hop => hop.damage);\n    this.paintSignalArc(path, castPhase);\n    for (const hop of path) {\n      const enemy = this.enemies.find(item => item.active && item.id === hop.id);\n      if (!enemy || !isEnemyCorporeal(enemy.kind, castPhase)) continue;\n      enemy.hp -= hop.damage;\n      this.signalHits += 1;\n      if (enemy.hp <= 0) this.killEnemy(enemy);\n    }\n  }\n\n  private paintSignalArc(path: readonly SignalArcHop[], castPhase: Phase): void {\n    this.signalFx.clear().setVisible(true);\n    const tone = hex(castPhase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB);\n    this.signalFx.lineStyle(2, tone, this.reduced ? 0.68 : 0.9);\n    let fromX = this.friend.x;\n    let fromY = this.friend.y;\n    for (const hop of path) {\n      this.signalFx.lineBetween(fromX, fromY, hop.x, hop.y);\n      if (hop.kind === "TRACE") {\n        this.signalFx.fillStyle(hex(V2_PALETTE.common), 0.82).fillRect(hop.x - 3, hop.y - 3, 6, 6);\n      }\n      fromX = hop.x;\n      fromY = hop.y;\n    }\n    this.time.delayedCall(this.reduced ? 55 : 105, () => this.signalFx.clear().setVisible(false));\n  }\n\n  private killEnemy(enemy: EnemyRuntime): void {\n`,
  "signal runtime methods",
);

replaceOnce(
  '      echoEnabled: this.level >= 3,\n      echoOwned: this.echoOwned,\n      weaponSlotsUsed: this.weaponSlotsUsed,\n',
  '      echoEnabled: this.level >= 3,\n      echoOwned: this.echoOwned,\n      signalEnabled: this.level >= 4,\n      signalOwned: this.signalOwned,\n      weaponSlotsUsed: this.weaponSlotsUsed,\n',
  "signal build state",
);

replaceOnce(
  '    const isDelta = choice.id === "DELTA_RANK", isVector = choice.id === "VECTOR_NEEDLE", isOrbit = choice.id === "ORBIT_NODES", isEcho = choice.id === "ECHO_MINE";\n    const isPhaseWeapon = isDelta || isVector || isOrbit || isEcho;\n',
  '    const isDelta = choice.id === "DELTA_RANK", isVector = choice.id === "VECTOR_NEEDLE", isOrbit = choice.id === "ORBIT_NODES", isEcho = choice.id === "ECHO_MINE", isSignal = choice.id === "SIGNAL_ARC";\n    const isPhaseWeapon = isDelta || isVector || isOrbit || isEcho || isSignal;\n',
  "signal draft identity",
);

replaceOnce(
  '    const detailText = isDelta ? `RANK ${romanRank(this.deltaRank)} → ${romanRank(nextRank)}` : (isVector || isOrbit || isEcho) ? "ACQUIRE · RANK I" : "RUN UTILITY";\n',
  '    const detailText = isDelta ? `RANK ${romanRank(this.deltaRank)} → ${romanRank(nextRank)}` : (isVector || isOrbit || isEcho || isSignal) ? "ACQUIRE · RANK I" : "RUN UTILITY";\n',
  "signal draft detail",
);

replaceOnce(
  '    } else if (isEcho) {\n      const glyph = this.add.graphics().lineStyle(2, border, 0.78);\n      glyph.strokeCircle(0, 3, 25); glyph.fillStyle(border, 0.9).fillRect(-6, -3, 12, 12);\n      glyph.lineBetween(-31, 3, -19, 3); glyph.lineBetween(19, 3, 31, 3);\n      container.add(glyph);\n    } else {\n',
  '    } else if (isEcho) {\n      const glyph = this.add.graphics().lineStyle(2, border, 0.78);\n      glyph.strokeCircle(0, 3, 25); glyph.fillStyle(border, 0.9).fillRect(-6, -3, 12, 12);\n      glyph.lineBetween(-31, 3, -19, 3); glyph.lineBetween(19, 3, 31, 3);\n      container.add(glyph);\n    } else if (isSignal) {\n      const glyph = this.add.graphics().lineStyle(2, border, 0.82);\n      glyph.lineBetween(-30, 10, -7, -7); glyph.lineBetween(-7, -7, 13, 7); glyph.lineBetween(13, 7, 30, -10);\n      glyph.fillStyle(border, 0.95).fillCircle(-30, 10, 4).fillCircle(-7, -7, 4).fillCircle(13, 7, 4).fillCircle(30, -10, 4);\n      container.add(glyph);\n    } else {\n',
  "signal draft glyph",
);

replaceOnce(
  '    this.echoOwned = next.echoOwned === true;\n    this.weaponSlotsUsed = next.weaponSlotsUsed ?? this.weaponSlotsUsed;\n',
  '    this.echoOwned = next.echoOwned === true;\n    this.signalOwned = next.signalOwned === true;\n    this.weaponSlotsUsed = next.weaponSlotsUsed ?? this.weaponSlotsUsed;\n',
  "signal ownership selection",
);

replaceOnce(
  '    const nextPhase: Phase = this.phase === "A" ? "B" : "A";\n',
  '    const nextPhase: Phase = this.phase === "A" ? "B" : "A";\n    if (this.signalOwned) {\n      this.signalShiftGraphInvalidations += 1;\n      this.signalLastChainIds = [];\n      this.signalLastChainKinds = [];\n      this.signalLastChainDamage = [];\n      this.signalFx.clear().setVisible(false);\n    }\n',
  "signal shift invalidation",
);

replaceOnce(
  '    canvas.dataset.echoMineStates = activeMines.map(runtime => `${runtime.mine.id}:${runtime.mine.recordedPhase}:${runtime.mine.state}`).join("|");\n',
  '    canvas.dataset.echoMineStates = activeMines.map(runtime => `${runtime.mine.id}:${runtime.mine.recordedPhase}:${runtime.mine.state}`).join("|");\n    canvas.dataset.signalOwned = this.signalOwned ? "true" : "false";\n    canvas.dataset.signalProfile = "rank1-phase-chain";\n    canvas.dataset.signalCasts = String(this.signalCasts);\n    canvas.dataset.signalHits = String(this.signalHits);\n    canvas.dataset.signalMultiTargetCasts = String(this.signalMultiTargetCasts);\n    canvas.dataset.signalLastCastPhase = this.signalLastCastPhase ?? "";\n    canvas.dataset.signalLastChainIds = this.signalLastChainIds.join(",");\n    canvas.dataset.signalLastChainKinds = this.signalLastChainKinds.join(",");\n    canvas.dataset.signalLastChainDamage = this.signalLastChainDamage.join(",");\n    canvas.dataset.signalShiftGraphInvalidations = String(this.signalShiftGraphInvalidations);\n    canvas.dataset.signalCooldownReady = this.signalAccumulator >= SIGNAL_ARC_RANK_I.cooldownMs ? "true" : "false";\n',
  "signal datasets",
);

await writeFile(path, source, "utf8");
console.log("V2_2D_RUNTIME_PATCH=APPLIED");
