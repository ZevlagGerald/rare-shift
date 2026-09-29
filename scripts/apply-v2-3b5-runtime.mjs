import { readFileSync, writeFileSync } from "node:fs";

const path = "games/rare-shift/src/phaser-survival.ts";
let source = readFileSync(path, "utf8");

function replaceExact(before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`B5 patch missing expected fragment: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`B5 patch fragment is not unique: ${label}`);
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

replaceExact(
  'import { advanceSignalArcCooldown, planSignalArc, SIGNAL_ARC_RANK_I, type SignalArcHop } from "./signal-arc-core.ts";',
  'import { advanceSignalArcCooldown, buildSignalArcProfile, planSignalArc, SIGNAL_ARC_RANK_I, type SignalArcHop } from "./signal-arc-core.ts";',
  "SIGNAL import",
);

replaceExact(
  'type EchoQualificationWindow = Window & { __RARE_SHIFT_V23B4_ECHO_RANK__?: unknown };',
  'type EchoQualificationWindow = Window & { __RARE_SHIFT_V23B4_ECHO_RANK__?: unknown };\ntype SignalQualificationWindow = Window & { __RARE_SHIFT_V23B5_SIGNAL_RANK__?: unknown };',
  "SIGNAL qualification window",
);

replaceExact(
`  private signalOwned = false;
  private signalAccumulator = 0;
  private signalCasts = 0;
  private signalHits = 0;
  private signalMultiTargetCasts = 0;
  private signalShiftGraphInvalidations = 0;
  private signalLastCastPhase: Phase | null = null;
  private signalLastChainIds: number[] = [];
  private signalLastChainKinds: V2EnemyKind[] = [];
  private signalLastChainDamage: number[] = [];`,
`  private signalOwned = false;
  private signalRank = 1;
  private signalAccumulator = 0;
  private signalCasts = 0;
  private signalHits = 0;
  private signalMultiTargetCasts = 0;
  private signalShiftGraphInvalidations = 0;
  private signalCommonBonusCasts = 0;
  private signalExtendedCommonRelayCasts = 0;
  private signalControlledRoutingCasts = 0;
  private signalLastCastPhase: Phase | null = null;
  private signalLastChainIds: number[] = [];
  private signalLastChainKinds: V2EnemyKind[] = [];
  private signalLastChainDamage: number[] = [];
  private signalLastChainEdgeRanges: number[] = [];
  private signalLastChainCommonBonus: boolean[] = [];
  private signalLastChainForwardDegrees: Array<number | null> = [];
  private signalQualificationFixture = "";`,
  "SIGNAL runtime state",
);

replaceExact(
`    this.applyVectorQualificationFixture();
    this.applyOrbitQualificationFixture();
    this.applyEchoQualificationFixture();
    this.buildHud();`,
`    this.applyVectorQualificationFixture();
    this.applyOrbitQualificationFixture();
    this.applyEchoQualificationFixture();
    this.applySignalQualificationFixture();
    this.buildHud();`,
  "fixture application",
);

replaceExact(
`  private ensureEchoMineCapacity(): void {
    const required = buildEchoProfile(this.echoRank, 0).maxActive;`,
`  private applySignalQualificationFixture(): void {
    const raw = (window as SignalQualificationWindow).__RARE_SHIFT_V23B5_SIGNAL_RANK__;
    if (!Number.isInteger(raw) || (raw as number) < 1 || (raw as number) > 5) return;
    this.signalOwned = true;
    this.signalRank = raw as number;
    this.weaponSlotsUsed = Math.max(this.weaponSlotsUsed, 2);
    this.signalQualificationFixture = \`SIGNAL_RANK_\${this.signalRank}\`;
  }

  private ensureEchoMineCapacity(): void {
    const required = buildEchoProfile(this.echoRank, 0).maxActive;`,
  "SIGNAL fixture method",
);

replaceExact(
`  private updateSignalArc(dtMs: number): void {
    this.signalAccumulator = advanceSignalArcCooldown(this.signalAccumulator, dtMs);
    if (this.signalAccumulator < SIGNAL_ARC_RANK_I.cooldownMs) return;
    const path = planSignalArc(this.enemies, this.phase, this.friend.x, this.friend.y);
    if (path.length === 0) return;
    this.fireSignalArc(path);
    this.signalAccumulator = 0;
  }

  private fireSignalArc(path: readonly SignalArcHop[]): void {
    const castPhase = this.phase;
    this.signalCasts += 1;
    if (path.length >= 2) this.signalMultiTargetCasts += 1;
    this.signalLastCastPhase = castPhase;
    this.signalLastChainIds = path.map(hop => hop.id);
    this.signalLastChainKinds = path.map(hop => hop.kind);
    this.signalLastChainDamage = path.map(hop => hop.damage);
    this.paintSignalArc(path, castPhase);
    for (const hop of path) {
      const enemy = this.enemies.find(item => item.active && item.id === hop.id);
      if (!enemy || !isEnemyCorporeal(enemy.kind, castPhase)) continue;
      enemy.hp -= hop.damage;
      this.signalHits += 1;
      if (enemy.hp <= 0) this.killEnemy(enemy);
    }
  }

  private paintSignalArc(path: readonly SignalArcHop[], castPhase: Phase): void {
    this.signalFx.clear().setVisible(true);
    const tone = hex(castPhase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB);
    this.signalFx.lineStyle(2, tone, this.reduced ? 0.68 : 0.9);
    let fromX = this.friend.x;
    let fromY = this.friend.y;
    for (const hop of path) {
      this.signalFx.lineBetween(fromX, fromY, hop.x, hop.y);
      if (hop.kind === "TRACE") {
        this.signalFx.fillStyle(hex(V2_PALETTE.common), 0.82).fillRect(hop.x - 3, hop.y - 3, 6, 6);
      }
      fromX = hop.x;
      fromY = hop.y;
    }
    this.time.delayedCall(this.reduced ? 55 : 105, () => this.signalFx.clear().setVisible(false));
  }`,
`  private updateSignalArc(dtMs: number): void {
    const profile = buildSignalArcProfile(this.signalRank);
    this.signalAccumulator = advanceSignalArcCooldown(this.signalAccumulator, dtMs, profile);
    if (this.signalAccumulator < profile.cooldownMs) return;
    const path = planSignalArc(this.enemies, this.phase, this.friend.x, this.friend.y, profile);
    if (path.length === 0) return;
    let controlledRouting = false;
    if (this.signalRank >= 5) {
      const nearestPath = planSignalArc(this.enemies, this.phase, this.friend.x, this.friend.y, buildSignalArcProfile(4));
      controlledRouting = path.map(hop => hop.id).join(",") !== nearestPath.map(hop => hop.id).join(",");
    }
    this.fireSignalArc(path, controlledRouting);
    this.signalAccumulator = 0;
  }

  private fireSignalArc(path: readonly SignalArcHop[], controlledRouting = false): void {
    const castPhase = this.phase;
    this.signalCasts += 1;
    if (path.length >= 2) this.signalMultiTargetCasts += 1;
    if (path.some(hop => hop.usedCommonBonus)) this.signalCommonBonusCasts += 1;
    if (controlledRouting) this.signalControlledRoutingCasts += 1;
    let sourceX = this.friend.x;
    let sourceY = this.friend.y;
    let extendedCommonRelay = false;
    for (const hop of path) {
      if (hop.usedCommonBonus && Math.hypot(hop.x - sourceX, hop.y - sourceY) > 180) extendedCommonRelay = true;
      sourceX = hop.x;
      sourceY = hop.y;
    }
    if (extendedCommonRelay) this.signalExtendedCommonRelayCasts += 1;
    this.signalLastCastPhase = castPhase;
    this.signalLastChainIds = path.map(hop => hop.id);
    this.signalLastChainKinds = path.map(hop => hop.kind);
    this.signalLastChainDamage = path.map(hop => hop.damage);
    this.signalLastChainEdgeRanges = path.map(hop => hop.edgeRange);
    this.signalLastChainCommonBonus = path.map(hop => hop.usedCommonBonus);
    this.signalLastChainForwardDegrees = path.map(hop => hop.forwardDegree);
    this.paintSignalArc(path, castPhase);
    for (const hop of path) {
      const enemy = this.enemies.find(item => item.active && item.id === hop.id);
      if (!enemy || !isEnemyCorporeal(enemy.kind, castPhase)) continue;
      enemy.hp -= hop.damage;
      this.signalHits += 1;
      if (enemy.hp <= 0) this.killEnemy(enemy);
    }
  }

  private paintSignalArc(path: readonly SignalArcHop[], castPhase: Phase): void {
    this.signalFx.clear().setVisible(true);
    const tone = hex(castPhase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB);
    let fromX = this.friend.x;
    let fromY = this.friend.y;
    for (const hop of path) {
      const boosted = hop.usedCommonBonus;
      this.signalFx.lineStyle(boosted ? 3 : 2, boosted ? hex(V2_PALETTE.common) : tone, boosted ? 0.94 : this.reduced ? 0.68 : 0.9);
      this.signalFx.lineBetween(fromX, fromY, hop.x, hop.y);
      if (boosted) {
        const midX = (fromX + hop.x) / 2;
        const midY = (fromY + hop.y) / 2;
        this.signalFx.fillStyle(hex(V2_PALETTE.common), 0.9).fillRect(midX - 3, midY - 3, 6, 6);
      }
      if (hop.kind === "TRACE") {
        this.signalFx.fillStyle(hex(V2_PALETTE.common), 0.82).fillRect(hop.x - 3, hop.y - 3, 6, 6);
      }
      if (this.signalRank >= 5 && hop.forwardDegree !== null) {
        this.signalFx.lineStyle(1, hex(V2_PALETTE.common), 0.64).strokeCircle(hop.x, hop.y, 8);
      }
      fromX = hop.x;
      fromY = hop.y;
    }
    this.time.delayedCall(this.reduced ? 55 : 105, () => this.signalFx.clear().setVisible(false));
  }`,
  "SIGNAL runtime planning and FX",
);

replaceExact(
'    this.buildText.setText(`K ${this.kills} · Δ ${romanRank(this.deltaRank)} · V ${this.vectorOwned ? romanRank(this.vectorRank) : "--"} · O ${this.orbitOwned ? romanRank(this.orbitRank) : "--"} · E ${this.echoOwned ? romanRank(this.echoRank) : "--"} · S ${this.signalOwned ? "I" : "--"}`);',
'    this.buildText.setText(`K ${this.kills} · Δ ${romanRank(this.deltaRank)} · V ${this.vectorOwned ? romanRank(this.vectorRank) : "--"} · O ${this.orbitOwned ? romanRank(this.orbitRank) : "--"} · E ${this.echoOwned ? romanRank(this.echoRank) : "--"} · S ${this.signalOwned ? romanRank(this.signalRank) : "--"}`);',
  "SIGNAL HUD rank",
);

replaceExact(
`      signalEnabled: this.level >= 4,
      signalOwned: this.signalOwned,
      weaponSlotsUsed: this.weaponSlotsUsed,`,
`      signalEnabled: this.level >= 4,
      signalOwned: this.signalOwned,
      signalRankEnabled: true,
      signalRank: this.signalRank,
      weaponSlotsUsed: this.weaponSlotsUsed,`,
  "SIGNAL build state",
);

replaceExact(
`    const isEchoRank = choice.id === "ECHO_RANK";
    const isEcho = isEchoAcquire || isEchoRank;
    const isSignal = choice.id === "SIGNAL_ARC";
    const isPhaseWeapon = isDelta || isVector || isOrbit || isEcho || isSignal;`,
`    const isEchoRank = choice.id === "ECHO_RANK";
    const isEcho = isEchoAcquire || isEchoRank;
    const isSignalAcquire = choice.id === "SIGNAL_ARC";
    const isSignalRank = choice.id === "SIGNAL_RANK";
    const isSignal = isSignalAcquire || isSignalRank;
    const isPhaseWeapon = isDelta || isVector || isOrbit || isEcho || isSignal;`,
  "SIGNAL draft classification",
);

replaceExact(
`    const nextOrbitRank = Math.min(5, this.orbitRank + 1);
    const nextEchoRank = Math.min(5, this.echoRank + 1);
    const titleText = isDelta ? \`${choice.name} \${romanRank(nextDeltaRank)}\` : isVectorRank ? \`${choice.name} \${romanRank(nextVectorRank)}\` : isOrbitRank ? \`${choice.name} \${romanRank(nextOrbitRank)}\` : isEchoRank ? \`${choice.name} \${romanRank(nextEchoRank)}\` : choice.name;`,
`    const nextOrbitRank = Math.min(5, this.orbitRank + 1);
    const nextEchoRank = Math.min(5, this.echoRank + 1);
    const nextSignalRank = Math.min(5, this.signalRank + 1);
    const titleText = isDelta ? \`${choice.name} \${romanRank(nextDeltaRank)}\` : isVectorRank ? \`${choice.name} \${romanRank(nextVectorRank)}\` : isOrbitRank ? \`${choice.name} \${romanRank(nextOrbitRank)}\` : isEchoRank ? \`${choice.name} \${romanRank(nextEchoRank)}\` : isSignalRank ? \`${choice.name} \${romanRank(nextSignalRank)}\` : choice.name;`,
  "SIGNAL draft title",
);

replaceExact(
`          : isEchoRank
            ? \`RANK \${romanRank(this.echoRank)} → \${romanRank(nextEchoRank)}\`
            : (isVectorAcquire || isOrbitAcquire || isEchoAcquire || isSignal) ? "ACQUIRE · RANK I" : "RUN UTILITY";`,
`          : isEchoRank
            ? \`RANK \${romanRank(this.echoRank)} → \${romanRank(nextEchoRank)}\`
            : isSignalRank
              ? \`RANK \${romanRank(this.signalRank)} → \${romanRank(nextSignalRank)}\`
              : (isVectorAcquire || isOrbitAcquire || isEchoAcquire || isSignalAcquire) ? "ACQUIRE · RANK I" : "RUN UTILITY";`,
  "SIGNAL draft detail",
);

replaceExact(
`    const echoDescription = nextEchoRank === 2 ? "LONG MEMORY · four mines persist for 12 seconds." : nextEchoRank === 3 ? "WIDER COLLAPSE · trigger and blast geometry expand." : nextEchoRank === 4 ? "FAST RECALL · returned memory readies after 140ms." : "DEEP MEMORY · genuine return cycles build bounded memory depth.";
    const desc = this.add.text(0, 61, isDelta ? deltaDescription : isVectorRank ? vectorDescription : isOrbitRank ? orbitDescription : isEchoRank ? echoDescription : choice.description, { fontFamily: "monospace", fontSize: "11px", color: "#bac5d0", align: "center", wordWrap: { width: 178 } }).setOrigin(0.5);`,
`    const echoDescription = nextEchoRank === 2 ? "LONG MEMORY · four mines persist for 12 seconds." : nextEchoRank === 3 ? "WIDER COLLAPSE · trigger and blast geometry expand." : nextEchoRank === 4 ? "FAST RECALL · returned memory readies after 140ms." : "DEEP MEMORY · genuine return cycles build bounded memory depth.";
    const signalDescription = nextSignalRank === 2 ? "EXTRA LINK · current corporeal graph reaches a fourth target." : nextSignalRank === 3 ? "LOWER DECAY · four-link damage decays more slowly." : nextSignalRank === 4 ? "RESONANT RELAY · first COMMON relay may extend one edge to 240px." : "CHAIN CONTROL · relay choice favors deterministic forward connectivity.";
    const desc = this.add.text(0, 61, isDelta ? deltaDescription : isVectorRank ? vectorDescription : isOrbitRank ? orbitDescription : isEchoRank ? echoDescription : isSignalRank ? signalDescription : choice.description, { fontFamily: "monospace", fontSize: "11px", color: "#bac5d0", align: "center", wordWrap: { width: 178 } }).setOrigin(0.5);`,
  "SIGNAL draft description",
);

replaceExact(
`    } else if (isSignal) {
      const glyph = this.add.graphics().lineStyle(2, border, 0.82);
      glyph.lineBetween(-30, 10, -7, -7); glyph.lineBetween(-7, -7, 13, 7); glyph.lineBetween(13, 7, 30, -10);
      glyph.fillStyle(border, 0.95).fillCircle(-30, 10, 4).fillCircle(-7, -7, 4).fillCircle(13, 7, 4).fillCircle(30, -10, 4);
      container.add(glyph);`,
`    } else if (isSignal) {
      const previewRank = isSignalRank ? nextSignalRank : 1;
      const glyph = this.add.graphics().lineStyle(previewRank >= 4 ? 3 : 2, border, 0.82);
      glyph.lineBetween(-30, 10, -7, -7); glyph.lineBetween(-7, -7, 13, 7); glyph.lineBetween(13, 7, 30, -10);
      glyph.fillStyle(border, 0.95).fillCircle(-30, 10, 4).fillCircle(-7, -7, 4).fillCircle(13, 7, 4).fillCircle(30, -10, 4);
      if (previewRank >= 2) glyph.fillStyle(hex(V2_PALETTE.common), 0.88).fillCircle(36, 5, 4);
      if (previewRank >= 4) glyph.lineStyle(2, hex(V2_PALETTE.common), 0.72).lineBetween(30, -10, 36, 5);
      if (previewRank >= 5) glyph.lineStyle(1, hex(V2_PALETTE.common), 0.66).strokeCircle(13, 7, 8);
      container.add(glyph);`,
  "SIGNAL draft glyph",
);

replaceExact(
`    const oldOrbitRank = this.orbitRank;
    const oldEchoRank = this.echoRank;
    const next = applyV21Draft`,
`    const oldOrbitRank = this.orbitRank;
    const oldEchoRank = this.echoRank;
    const oldSignalRank = this.signalRank;
    const next = applyV21Draft`,
  "SIGNAL old rank capture",
);

replaceExact(
`    this.signalOwned = next.signalOwned === true;
    this.weaponSlotsUsed = next.weaponSlotsUsed ?? this.weaponSlotsUsed;`,
`    this.signalOwned = next.signalOwned === true;
    this.signalRank = next.signalRank ?? (this.signalOwned ? 1 : this.signalRank);
    if (this.signalRank !== oldSignalRank) {
      // SIGNAL casts are instantaneous. Preserve ordinary cooldown progress and
      // carry no historical COMMON bonus or route state across rank application.
    }
    this.weaponSlotsUsed = next.weaponSlotsUsed ?? this.weaponSlotsUsed;`,
  "SIGNAL rank application",
);

replaceExact(
`      this.signalLastChainIds = [];
      this.signalLastChainKinds = [];
      this.signalLastChainDamage = [];
      this.signalFx.clear().setVisible(false);`,
`      this.signalLastChainIds = [];
      this.signalLastChainKinds = [];
      this.signalLastChainDamage = [];
      this.signalLastChainEdgeRanges = [];
      this.signalLastChainCommonBonus = [];
      this.signalLastChainForwardDegrees = [];
      this.signalFx.clear().setVisible(false);`,
  "SIGNAL SHIFT graph invalidation",
);

replaceExact(
`    canvas.dataset.signalOwned = this.signalOwned ? "true" : "false";
    canvas.dataset.signalProfile = "rank1-phase-chain";
    canvas.dataset.signalCasts = String(this.signalCasts);`,
`    const signalProfile = buildSignalArcProfile(this.signalRank);
    canvas.dataset.signalOwned = this.signalOwned ? "true" : "false";
    canvas.dataset.signalRank = String(this.signalRank);
    canvas.dataset.signalProfile = \`rank\${this.signalRank}-phase-chain\`;
    canvas.dataset.signalMaxTargets = String(signalProfile.maxTargets);
    canvas.dataset.signalDamageProfile = signalProfile.damages.join(",");
    canvas.dataset.signalRelayRange = String(signalProfile.relayRange);
    canvas.dataset.signalCommonBonusRange = String(signalProfile.relayRange + signalProfile.commonRelayBonus);
    canvas.dataset.signalRouting = signalProfile.routing;
    canvas.dataset.signalQualificationFixture = this.signalQualificationFixture;
    canvas.dataset.signalCommonBonusCasts = String(this.signalCommonBonusCasts);
    canvas.dataset.signalExtendedCommonRelayCasts = String(this.signalExtendedCommonRelayCasts);
    canvas.dataset.signalControlledRoutingCasts = String(this.signalControlledRoutingCasts);
    canvas.dataset.signalCasts = String(this.signalCasts);`,
  "SIGNAL test-state profile",
);

replaceExact(
`    canvas.dataset.signalLastChainDamage = this.signalLastChainDamage.join(",");
    canvas.dataset.signalShiftGraphInvalidations = String(this.signalShiftGraphInvalidations);
    canvas.dataset.signalCooldownReady = this.signalAccumulator >= SIGNAL_ARC_RANK_I.cooldownMs ? "true" : "false";`,
`    canvas.dataset.signalLastChainDamage = this.signalLastChainDamage.join(",");
    canvas.dataset.signalLastChainEdgeRanges = this.signalLastChainEdgeRanges.join(",");
    canvas.dataset.signalLastChainCommonBonus = this.signalLastChainCommonBonus.map(value => value ? "1" : "0").join(",");
    canvas.dataset.signalLastChainForwardDegrees = this.signalLastChainForwardDegrees.map(value => value === null ? "" : String(value)).join(",");
    canvas.dataset.signalShiftGraphInvalidations = String(this.signalShiftGraphInvalidations);
    canvas.dataset.signalCooldownReady = this.signalAccumulator >= buildSignalArcProfile(this.signalRank).cooldownMs ? "true" : "false";`,
  "SIGNAL test-state chain metadata",
);

writeFileSync(path, source);
console.log("V2_3B5_SIGNAL_RUNTIME_PATCH=PASS");
