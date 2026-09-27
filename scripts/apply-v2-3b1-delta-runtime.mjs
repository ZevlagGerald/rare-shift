import { readFile, writeFile } from "node:fs/promises";

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`V2-3B1 patch anchor missing: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`V2-3B1 patch anchor is not unique: ${label}`);
  return source.slice(0, first) + after + source.slice(first + before.length);
}

const phaserPath = "games/rare-shift/src/phaser-survival.ts";
let source = await readFile(phaserPath, "utf8");

source = replaceOnce(source,
`  buildDeltaProfile,\n  deltaHitsTarget,\n  enemyBaseHp,\n  enemyContactDamage,\n  enemyMoveSpeed,\n  isEnemyCorporeal,\n  type V2EnemyKind,\n} from "./phase-combat-core.ts";`,
`  buildDeltaEchoProfile,\n  buildDeltaProfile,\n  canScheduleDeltaPhaseEcho,\n  DELTA_PHASE_ECHO_DELAY_MS,\n  DELTA_PHASE_ECHO_REARM_MS,\n  deltaCooldownForRank,\n  deltaHitsTarget,\n  enemyBaseHp,\n  enemyContactDamage,\n  enemyMoveSpeed,\n  isDeltaEchoTargetLegal,\n  isEnemyCorporeal,\n  migrateCooldownAccumulator,\n  type DeltaProfile,\n  type V2EnemyKind,\n} from "./phase-combat-core.ts";`, "DELTA imports");

source = replaceOnce(source,
`  y: number;\n  view: Phaser.GameObjects.Container;\n}`,
`  y: number;\n  staggerUntilMs: number;\n  view: Phaser.GameObjects.Container;\n}`, "enemy stagger state");

source = replaceOnce(source,
`  private signalFx!: Phaser.GameObjects.Graphics;\n  private burst!: Phaser.GameObjects.Graphics;`,
`  private signalFx!: Phaser.GameObjects.Graphics;\n  private burst!: Phaser.GameObjects.Graphics;\n  private deltaEchoFx!: Phaser.GameObjects.Graphics;`, "DELTA echo graphics field");

source = replaceOnce(source,
`  private deltaRank = 1;\n  private pickupRadius = 76;`,
`  private deltaRank = 1;\n  private deltaPrimaryPulses = 0;\n  private deltaPrimaryHits = 0;\n  private deltaStaggers = 0;\n  private deltaEchoScheduled = 0;\n  private deltaEchoFired = 0;\n  private deltaEchoHits = 0;\n  private deltaEchoRearmReadyAt = 0;\n  private pendingDeltaEcho: { readonly dueAtMs: number; readonly profile: DeltaProfile } | null = null;\n  private pickupRadius = 76;`, "DELTA runtime state");

source = replaceOnce(source,
`    this.burst = this.add.graphics().setDepth(24).setVisible(false);\n    this.vectorReticle = this.add.graphics().setDepth(27).setVisible(false);`,
`    this.burst = this.add.graphics().setDepth(24).setVisible(false);\n    this.deltaEchoFx = this.add.graphics().setDepth(23).setVisible(false);\n    this.vectorReticle = this.add.graphics().setDepth(27).setVisible(false);`, "DELTA echo graphics creation");

source = replaceOnce(source,
`    if (this.attackAccumulator >= profile.cooldownMs) {\n      this.attackAccumulator %= profile.cooldownMs;\n      this.fireDelta(profile);\n    }\n\n    if (this.vectorOwned) {`,
`    if (this.attackAccumulator >= profile.cooldownMs) {\n      this.attackAccumulator %= profile.cooldownMs;\n      this.fireDelta(profile);\n    }\n    this.updateDeltaEcho();\n\n    if (this.vectorOwned) {`, "DELTA echo update loop");

source = replaceOnce(source,
`      this.enemies.push({ id: -1, active: false, kind: "TRACE", hp: 0, x: -500, y: -500, view });`,
`      this.enemies.push({ id: -1, active: false, kind: "TRACE", hp: 0, x: -500, y: -500, staggerUntilMs: 0, view });`, "enemy pool stagger initialization");

source = replaceOnce(source,
`    slot.id = spec.id; slot.active = true; slot.kind = spec.kind; slot.hp = enemyBaseHp(spec.kind); slot.x = spec.position.x; slot.y = spec.position.y;`,
`    slot.id = spec.id; slot.active = true; slot.kind = spec.kind; slot.hp = enemyBaseHp(spec.kind); slot.x = spec.position.x; slot.y = spec.position.y; slot.staggerUntilMs = 0;`, "spawn stagger reset");

source = replaceOnce(source,
`      const speed = enemyMoveSpeed(enemy.kind);\n      enemy.x += dx / distance * speed * dt; enemy.y += dy / distance * speed * dt; enemy.view.setPosition(enemy.x, enemy.y);`,
`      const speed = enemyMoveSpeed(enemy.kind);\n      if (this.elapsedActiveMs >= enemy.staggerUntilMs) {\n        enemy.x += dx / distance * speed * dt; enemy.y += dy / distance * speed * dt; enemy.view.setPosition(enemy.x, enemy.y);\n      }`, "Rank-V stagger movement gate");

const oldFireDelta = `  private fireDelta(profile: ReturnType<typeof buildDeltaProfile>): void {\n    this.tweens.killTweensOf(this.burst);\n    this.burst.clear().setVisible(true).setPosition(this.friend.x, this.friend.y).setScale(this.reduced ? 1 : 0.72).setAlpha(1);\n    const tone = this.phase === "A" ? hex(V2_PALETTE.phaseA) : hex(V2_PALETTE.phaseB);\n    this.burst.fillStyle(hex(V2_PALETTE.common), this.reduced ? 0.16 : 0.22);\n    for (const point of profile.points) this.burst.fillRect(point.x * DELTA_PIXEL_SCALE - 6, point.y * DELTA_PIXEL_SCALE - 6, 12, 12);\n    this.burst.fillStyle(tone, this.reduced ? 0.62 : 0.96);\n    for (const point of profile.points) this.burst.fillRect(point.x * DELTA_PIXEL_SCALE - 4, point.y * DELTA_PIXEL_SCALE - 4, 8, 8);\n    const duration = effectDuration("DELTA_BURST", this.reduced);\n    if (this.reduced) this.time.delayedCall(duration, () => this.burst.setVisible(false));\n    else this.tweens.add({ targets: this.burst, scaleX: 1.08, scaleY: 1.08, alpha: 0, duration, ease: "Quad.Out", onComplete: () => this.burst.setVisible(false).setAlpha(1).setScale(1) });\n    for (const enemy of this.enemies) {\n      if (!enemy.active || !isEnemyCorporeal(enemy.kind, this.phase)) continue;\n      if (!deltaHitsTarget(profile, enemy.x - this.friend.x, enemy.y - this.friend.y, DELTA_PIXEL_SCALE)) continue;\n      enemy.hp -= profile.damage; enemy.view.setAlpha(0.55);\n      this.time.delayedCall(effectDuration("ENEMY_HIT", this.reduced), () => { if (enemy.active) enemy.view.setAlpha(isEnemyCorporeal(enemy.kind, this.phase) ? 1 : 0.22); });\n      if (enemy.hp <= 0) this.killEnemy(enemy);\n    }\n  }`;

const newFireDelta = `  private fireDelta(profile: ReturnType<typeof buildDeltaProfile>): void {\n    this.deltaPrimaryPulses += 1;\n    this.tweens.killTweensOf(this.burst);\n    this.burst.clear().setVisible(true).setPosition(this.friend.x, this.friend.y).setScale(this.reduced ? 1 : 0.72).setAlpha(1);\n    const tone = this.phase === "A" ? hex(V2_PALETTE.phaseA) : hex(V2_PALETTE.phaseB);\n    this.burst.fillStyle(hex(V2_PALETTE.common), this.reduced ? 0.16 : 0.22);\n    for (const point of profile.points) this.burst.fillRect(point.x * profile.worldScale - 6, point.y * profile.worldScale - 6, 12, 12);\n    this.burst.fillStyle(tone, this.reduced ? 0.62 : 0.96);\n    for (const point of profile.points) this.burst.fillRect(point.x * profile.worldScale - 4, point.y * profile.worldScale - 4, 8, 8);\n    const duration = effectDuration("DELTA_BURST", this.reduced);\n    if (this.reduced) this.time.delayedCall(duration, () => this.burst.setVisible(false));\n    else this.tweens.add({ targets: this.burst, scaleX: 1.08, scaleY: 1.08, alpha: 0, duration, ease: "Quad.Out", onComplete: () => this.burst.setVisible(false).setAlpha(1).setScale(1) });\n    for (const enemy of this.enemies) {\n      if (!enemy.active || !isEnemyCorporeal(enemy.kind, this.phase)) continue;\n      if (!deltaHitsTarget(profile, enemy.x - this.friend.x, enemy.y - this.friend.y)) continue;\n      enemy.hp -= profile.damage; this.deltaPrimaryHits += 1; enemy.view.setAlpha(0.55);\n      if (profile.staggerMs > 0) { enemy.staggerUntilMs = Math.max(enemy.staggerUntilMs, this.elapsedActiveMs + profile.staggerMs); this.deltaStaggers += 1; }\n      this.time.delayedCall(effectDuration("ENEMY_HIT", this.reduced), () => { if (enemy.active) enemy.view.setAlpha(isEnemyCorporeal(enemy.kind, this.phase) ? 1 : 0.22); });\n      if (enemy.hp <= 0) this.killEnemy(enemy);\n    }\n  }\n\n  private scheduleDeltaEcho(previousPhase: Phase): void {\n    if (!canScheduleDeltaPhaseEcho(this.deltaRank, this.elapsedActiveMs, this.deltaEchoRearmReadyAt)) return;\n    const profile = buildDeltaEchoProfile(this.pair.a.rows, this.pair.b.rows, previousPhase, this.deltaRank);\n    this.pendingDeltaEcho = Object.freeze({ dueAtMs: this.elapsedActiveMs + DELTA_PHASE_ECHO_DELAY_MS, profile });\n    this.deltaEchoRearmReadyAt = this.elapsedActiveMs + DELTA_PHASE_ECHO_REARM_MS;\n    this.deltaEchoScheduled += 1;\n  }\n\n  private updateDeltaEcho(): void {\n    const pending = this.pendingDeltaEcho;\n    if (!pending || this.elapsedActiveMs < pending.dueAtMs) return;\n    this.pendingDeltaEcho = null;\n    this.deltaEchoFired += 1;\n    const profile = pending.profile;\n    this.deltaEchoFx.clear().setVisible(true).setPosition(this.friend.x, this.friend.y);\n    const tone = hex(profile.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB);\n    this.deltaEchoFx.fillStyle(tone, this.reduced ? 0.24 : 0.36);\n    for (const point of profile.points) this.deltaEchoFx.fillRect(point.x * profile.worldScale - 3, point.y * profile.worldScale - 3, 6, 6);\n    this.time.delayedCall(this.reduced ? 55 : 110, () => this.deltaEchoFx.clear().setVisible(false));\n    for (const enemy of this.enemies) {\n      if (!enemy.active || !isDeltaEchoTargetLegal(enemy.kind, profile.phase, this.phase)) continue;\n      if (!deltaHitsTarget(profile, enemy.x - this.friend.x, enemy.y - this.friend.y)) continue;\n      enemy.hp -= profile.damage; this.deltaEchoHits += 1;\n      if (enemy.hp <= 0) this.killEnemy(enemy);\n    }\n  }`;
source = replaceOnce(source, oldFireDelta, newFireDelta, "DELTA runtime implementation");

source = replaceOnce(source,
`    const wasEchoOwned = this.echoOwned;\n    const next = applyV21Draft(this.buildState(), choice.id as V21DraftId);\n    this.deltaRank = next.deltaRank; this.hp = next.hp; this.pickupRadius = next.pickupRadius;`,
`    const wasEchoOwned = this.echoOwned;\n    const oldDeltaRank = this.deltaRank;\n    const oldDeltaCooldown = deltaCooldownForRank(oldDeltaRank);\n    const next = applyV21Draft(this.buildState(), choice.id as V21DraftId);\n    if (next.deltaRank !== oldDeltaRank) {\n      this.attackAccumulator = migrateCooldownAccumulator(this.attackAccumulator, oldDeltaCooldown, deltaCooldownForRank(next.deltaRank));\n    }\n    this.deltaRank = next.deltaRank; this.hp = next.hp; this.pickupRadius = next.pickupRadius;`, "rank-up cooldown migration");

source = replaceOnce(source,
`    const nextPhase: Phase = this.phase === "A" ? "B" : "A";\n    if (this.signalOwned) {`,
`    const previousPhase = this.phase;\n    const nextPhase: Phase = previousPhase === "A" ? "B" : "A";\n    this.scheduleDeltaEcho(previousPhase);\n    if (this.signalOwned) {`, "SHIFT DELTA echo scheduling");

source = replaceOnce(source,
`    canvas.dataset.seed = String(this.seed); canvas.dataset.controlsDimmed = this.draftOpen ? "true" : "false"; canvas.dataset.deltaFx = "canonical-exclusive";\n    canvas.dataset.weaponSlotsUsed = String(this.weaponSlotsUsed);`,
`    canvas.dataset.seed = String(this.seed); canvas.dataset.controlsDimmed = this.draftOpen ? "true" : "false"; canvas.dataset.deltaFx = "canonical-exclusive";\n    const deltaProfile = buildDeltaProfile(this.pair.a.rows, this.pair.b.rows, this.phase, this.deltaRank);\n    canvas.dataset.deltaCooldownMs = String(deltaProfile.cooldownMs);\n    canvas.dataset.deltaWorldScale = String(deltaProfile.worldScale);\n    canvas.dataset.deltaDamage = String(deltaProfile.damage);\n    canvas.dataset.deltaStaggerMs = String(deltaProfile.staggerMs);\n    canvas.dataset.deltaPrimaryPulses = String(this.deltaPrimaryPulses);\n    canvas.dataset.deltaPrimaryHits = String(this.deltaPrimaryHits);\n    canvas.dataset.deltaStaggers = String(this.deltaStaggers);\n    canvas.dataset.deltaEchoScheduled = String(this.deltaEchoScheduled);\n    canvas.dataset.deltaEchoFired = String(this.deltaEchoFired);\n    canvas.dataset.deltaEchoHits = String(this.deltaEchoHits);\n    canvas.dataset.deltaEchoPending = this.pendingDeltaEcho ? "true" : "false";\n    canvas.dataset.deltaEchoRearmReadyAt = String(this.deltaEchoRearmReadyAt);\n    canvas.dataset.weaponSlotsUsed = String(this.weaponSlotsUsed);`, "DELTA qualification dataset");

await writeFile(phaserPath, source, "utf8");

const combatPath = "games/rare-shift/tests/v2-combat.test.ts";
let combat = await readFile(combatPath, "utf8");
combat = replaceOnce(combat,
`  assert.equal(deltaDamageForRank(5), 28);`,
`  assert.equal(deltaDamageForRank(5), 14);`, "inherited DELTA Rank-V expectation");
await writeFile(combatPath, combat, "utf8");

console.log("V2_3B1_DELTA_RUNTIME_PATCH=PASS");
