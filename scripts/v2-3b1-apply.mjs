import { readFile, writeFile } from "node:fs/promises";

function replaceOne(text, from, to, label) {
  const first = text.indexOf(from);
  if (first < 0) throw new Error(`Missing patch anchor: ${label}`);
  if (text.indexOf(from, first + from.length) >= 0) throw new Error(`Non-unique patch anchor: ${label}`);
  return text.slice(0, first) + to + text.slice(first + from.length);
}

const phaserPath = "games/rare-shift/src/phaser-survival.ts";
let phaser = await readFile(phaserPath, "utf8");

phaser = replaceOne(phaser, `import {
  buildDeltaProfile,
  deltaHitsTarget,
  enemyBaseHp,
  enemyContactDamage,
  enemyMoveSpeed,
  isEnemyCorporeal,
  type V2EnemyKind,
} from "./phase-combat-core.ts";`, `import {
  buildDeltaEchoProfile,
  buildDeltaProfile,
  canScheduleDeltaEcho,
  deltaEchoHitsTarget,
  deltaHitsTarget,
  enemyBaseHp,
  enemyContactDamage,
  enemyMoveSpeed,
  isDeltaEchoTargetEligible,
  isEnemyCorporeal,
  migrateDeltaCooldownAccumulator,
  type DeltaEchoProfile,
  type V2EnemyKind,
} from "./phase-combat-core.ts";`, "DELTA imports");

phaser = replaceOne(phaser, `interface EnemyRuntime {
  id: number;
  active: boolean;
  kind: V2EnemyKind;
  hp: number;
  x: number;
  y: number;
  view: Phaser.GameObjects.Container;
}`, `interface EnemyRuntime {
  id: number;
  active: boolean;
  kind: V2EnemyKind;
  hp: number;
  x: number;
  y: number;
  staggerUntilMs: number;
  view: Phaser.GameObjects.Container;
}`, "enemy stagger state");

phaser = replaceOne(phaser, `interface EchoMineRuntime {
  active: boolean;
  mine: EchoMineCore | null;
  view: Phaser.GameObjects.Graphics;
}

const VIEW_W = 960;`, `interface EchoMineRuntime {
  active: boolean;
  mine: EchoMineCore | null;
  view: Phaser.GameObjects.Graphics;
}

interface PendingDeltaEchoRuntime {
  readonly phase: Phase;
  readonly scheduledAtMs: number;
  readonly profile: DeltaEchoProfile;
}

const VIEW_W = 960;`, "pending DELTA echo type");

phaser = replaceOne(phaser, `const PLAYER_SPEED = 220;
const DELTA_PIXEL_SCALE = 8;
const PICKUP_POOL_SIZE = 64;`, `const PLAYER_SPEED = 220;
const PICKUP_POOL_SIZE = 64;`, "remove fixed DELTA scale");

phaser = replaceOne(phaser, `  private deltaRank = 1;
  private pickupRadius = 76;`, `  private deltaRank = 1;
  private deltaPrimaryPulses = 0;
  private deltaEchoPending: PendingDeltaEchoRuntime | null = null;
  private deltaEchoLastScheduledAt: number | null = null;
  private deltaEchoSchedules = 0;
  private deltaEchoFires = 0;
  private deltaEchoHits = 0;
  private deltaStaggers = 0;
  private pickupRadius = 76;`, "DELTA runtime counters");

phaser = replaceOne(phaser, `      this.enemies.push({ id: -1, active: false, kind: "TRACE", hp: 0, x: -500, y: -500, view });`, `      this.enemies.push({ id: -1, active: false, kind: "TRACE", hp: 0, x: -500, y: -500, staggerUntilMs: 0, view });`, "enemy pool stagger init");

phaser = replaceOne(phaser, `    if (this.attackAccumulator >= profile.cooldownMs) {
      this.attackAccumulator %= profile.cooldownMs;
      this.fireDelta(profile);
    }

    if (this.vectorOwned) {`, `    if (this.attackAccumulator >= profile.cooldownMs) {
      this.attackAccumulator %= profile.cooldownMs;
      this.fireDelta(profile);
    }
    this.updatePendingDeltaEcho();

    if (this.vectorOwned) {`, "DELTA pending echo update");

phaser = replaceOne(phaser, `    slot.id = spec.id; slot.active = true; slot.kind = spec.kind; slot.hp = enemyBaseHp(spec.kind); slot.x = spec.position.x; slot.y = spec.position.y;`, `    slot.id = spec.id; slot.active = true; slot.kind = spec.kind; slot.hp = enemyBaseHp(spec.kind); slot.x = spec.position.x; slot.y = spec.position.y; slot.staggerUntilMs = 0;`, "spawn stagger reset");

phaser = replaceOne(phaser, `      const dx = this.friend.x - enemy.x, dy = this.friend.y - enemy.y, distance = Math.max(0.001, Math.hypot(dx, dy));
      const speed = enemyMoveSpeed(enemy.kind);
      enemy.x += dx / distance * speed * dt; enemy.y += dy / distance * speed * dt; enemy.view.setPosition(enemy.x, enemy.y);`, `      const dx = this.friend.x - enemy.x, dy = this.friend.y - enemy.y, distance = Math.max(0.001, Math.hypot(dx, dy));
      if (this.elapsedActiveMs >= enemy.staggerUntilMs) {
        const speed = enemyMoveSpeed(enemy.kind);
        enemy.x += dx / distance * speed * dt; enemy.y += dy / distance * speed * dt;
      }
      enemy.view.setPosition(enemy.x, enemy.y);`, "stagger movement gate");

const oldFireDelta = `  private fireDelta(profile: ReturnType<typeof buildDeltaProfile>): void {
    this.tweens.killTweensOf(this.burst);
    this.burst.clear().setVisible(true).setPosition(this.friend.x, this.friend.y).setScale(this.reduced ? 1 : 0.72).setAlpha(1);
    const tone = this.phase === "A" ? hex(V2_PALETTE.phaseA) : hex(V2_PALETTE.phaseB);
    this.burst.fillStyle(hex(V2_PALETTE.common), this.reduced ? 0.16 : 0.22);
    for (const point of profile.points) this.burst.fillRect(point.x * DELTA_PIXEL_SCALE - 6, point.y * DELTA_PIXEL_SCALE - 6, 12, 12);
    this.burst.fillStyle(tone, this.reduced ? 0.62 : 0.96);
    for (const point of profile.points) this.burst.fillRect(point.x * DELTA_PIXEL_SCALE - 4, point.y * DELTA_PIXEL_SCALE - 4, 8, 8);
    const duration = effectDuration("DELTA_BURST", this.reduced);
    if (this.reduced) this.time.delayedCall(duration, () => this.burst.setVisible(false));
    else this.tweens.add({ targets: this.burst, scaleX: 1.08, scaleY: 1.08, alpha: 0, duration, ease: "Quad.Out", onComplete: () => this.burst.setVisible(false).setAlpha(1).setScale(1) });
    for (const enemy of this.enemies) {
      if (!enemy.active || !isEnemyCorporeal(enemy.kind, this.phase)) continue;
      if (!deltaHitsTarget(profile, enemy.x - this.friend.x, enemy.y - this.friend.y, DELTA_PIXEL_SCALE)) continue;
      enemy.hp -= profile.damage; enemy.view.setAlpha(0.55);
      this.time.delayedCall(effectDuration("ENEMY_HIT", this.reduced), () => { if (enemy.active) enemy.view.setAlpha(isEnemyCorporeal(enemy.kind, this.phase) ? 1 : 0.22); });
      if (enemy.hp <= 0) this.killEnemy(enemy);
    }
  }
`;

const newFireDelta = `  private fireDelta(profile: ReturnType<typeof buildDeltaProfile>): void {
    this.deltaPrimaryPulses += 1;
    this.tweens.killTweensOf(this.burst);
    this.burst.clear().setVisible(true).setPosition(this.friend.x, this.friend.y).setScale(this.reduced ? 1 : 0.72).setAlpha(1);
    const tone = this.phase === "A" ? hex(V2_PALETTE.phaseA) : hex(V2_PALETTE.phaseB);
    this.burst.fillStyle(hex(V2_PALETTE.common), this.reduced ? 0.16 : 0.22);
    for (const point of profile.points) this.burst.fillRect(point.x * profile.worldScale - 6, point.y * profile.worldScale - 6, 12, 12);
    this.burst.fillStyle(tone, this.reduced ? 0.62 : 0.96);
    for (const point of profile.points) this.burst.fillRect(point.x * profile.worldScale - 4, point.y * profile.worldScale - 4, 8, 8);
    const duration = effectDuration("DELTA_BURST", this.reduced);
    if (this.reduced) this.time.delayedCall(duration, () => this.burst.setVisible(false));
    else this.tweens.add({ targets: this.burst, scaleX: 1.08, scaleY: 1.08, alpha: 0, duration, ease: "Quad.Out", onComplete: () => this.burst.setVisible(false).setAlpha(1).setScale(1) });
    for (const enemy of this.enemies) {
      if (!enemy.active || !isEnemyCorporeal(enemy.kind, this.phase)) continue;
      if (!deltaHitsTarget(profile, enemy.x - this.friend.x, enemy.y - this.friend.y)) continue;
      enemy.hp -= profile.damage; enemy.view.setAlpha(0.55);
      if (profile.staggerMs > 0) {
        enemy.staggerUntilMs = Math.max(enemy.staggerUntilMs, this.elapsedActiveMs + profile.staggerMs);
        this.deltaStaggers += 1;
      }
      this.time.delayedCall(effectDuration("ENEMY_HIT", this.reduced), () => { if (enemy.active) enemy.view.setAlpha(isEnemyCorporeal(enemy.kind, this.phase) ? 1 : 0.22); });
      if (enemy.hp <= 0) this.killEnemy(enemy);
    }
  }

  private scheduleDeltaEcho(previousPhase: Phase): void {
    if (!canScheduleDeltaEcho(this.deltaRank, this.deltaEchoLastScheduledAt, this.elapsedActiveMs)) return;
    const profile = buildDeltaEchoProfile(this.pair.a.rows, this.pair.b.rows, previousPhase);
    this.deltaEchoPending = { phase: previousPhase, scheduledAtMs: this.elapsedActiveMs + profile.delayMs, profile };
    this.deltaEchoLastScheduledAt = this.elapsedActiveMs;
    this.deltaEchoSchedules += 1;
  }

  private updatePendingDeltaEcho(): void {
    const pending = this.deltaEchoPending;
    if (!pending || this.elapsedActiveMs < pending.scheduledAtMs) return;
    this.deltaEchoPending = null;
    this.fireDeltaEcho(pending);
  }

  private fireDeltaEcho(pending: PendingDeltaEchoRuntime): void {
    this.deltaEchoFires += 1;
    const originX = this.friend.x, originY = this.friend.y;
    const tone = hex(pending.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB);
    const fx = this.add.graphics().setPosition(originX, originY).setDepth(25);
    fx.fillStyle(tone, this.reduced ? 0.18 : 0.34);
    for (const point of pending.profile.points) fx.fillRect(point.x * pending.profile.worldScale - 3, point.y * pending.profile.worldScale - 3, 6, 6);
    this.time.delayedCall(this.reduced ? 55 : 110, () => fx.destroy());

    for (const enemy of this.enemies) {
      if (!enemy.active || !isDeltaEchoTargetEligible(enemy.kind, pending.phase, this.phase)) continue;
      if (!deltaEchoHitsTarget(pending.profile, enemy.x - originX, enemy.y - originY)) continue;
      enemy.hp -= pending.profile.damage;
      this.deltaEchoHits += 1;
      enemy.view.setAlpha(0.42);
      this.time.delayedCall(effectDuration("ENEMY_HIT", this.reduced), () => { if (enemy.active) enemy.view.setAlpha(isEnemyCorporeal(enemy.kind, this.phase) ? 1 : 0.22); });
      if (enemy.hp <= 0) this.killEnemy(enemy);
    }
  }
`;
phaser = replaceOne(phaser, oldFireDelta, newFireDelta, "DELTA runtime method");

phaser = replaceOne(phaser, `    const detailText = isDelta ? \`RANK \${romanRank(this.deltaRank)} → \${romanRank(nextRank)}\` : (isVector || isOrbit || isEcho || isSignal) ? "ACQUIRE · RANK I" : "RUN UTILITY";
    const detail = this.add.text(0, -27, detailText, { fontFamily: "monospace", fontSize: "9px", color: isPhaseWeapon ? (this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB) : "#748392", letterSpacing: 1 }).setOrigin(0.5);
    const desc = this.add.text(0, 61, choice.description, { fontFamily: "monospace", fontSize: "11px", color: "#bac5d0", align: "center", wordWrap: { width: 178 } }).setOrigin(0.5);`, `    const detailText = isDelta ? \`RANK \${romanRank(this.deltaRank)} → \${romanRank(nextRank)}\` : (isVector || isOrbit || isEcho || isSignal) ? "ACQUIRE · RANK I" : "RUN UTILITY";
    const detail = this.add.text(0, -27, detailText, { fontFamily: "monospace", fontSize: "9px", color: isPhaseWeapon ? (this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB) : "#748392", letterSpacing: 1 }).setOrigin(0.5);
    const deltaDescription = nextRank === 2 ? "DENSE SAMPLE · cadence tightens to 720ms." : nextRank === 3 ? "FIELD SCALE · canonical mask expands in world-space." : nextRank === 4 ? "PHASE ECHO · SHIFT leaves one bounded previous-phase echo." : "LOCKED IDENTITY · matching-phase pulse gains bounded stagger.";
    const desc = this.add.text(0, 61, isDelta ? deltaDescription : choice.description, { fontFamily: "monospace", fontSize: "11px", color: "#bac5d0", align: "center", wordWrap: { width: 178 } }).setOrigin(0.5);`, "DELTA rank card description");

phaser = replaceOne(phaser, `      const preview = this.add.graphics(), profile = buildDeltaProfile(this.pair.a.rows, this.pair.b.rows, this.phase, nextRank);
      preview.fillStyle(border, 0.82); for (const point of profile.points) preview.fillRect(point.x * 1.35 - 1.5, point.y * 1.35 - 1.5, 3, 3);`, `      const preview = this.add.graphics(), profile = buildDeltaProfile(this.pair.a.rows, this.pair.b.rows, this.phase, nextRank);
      const previewScale = 1.35 * profile.worldScale / 8;
      preview.fillStyle(border, 0.82); for (const point of profile.points) preview.fillRect(point.x * previewScale - 1.5, point.y * previewScale - 1.5, 3, 3);`, "DELTA preview scale");

phaser = replaceOne(phaser, `    const wasEchoOwned = this.echoOwned;
    const next = applyV21Draft(this.buildState(), choice.id as V21DraftId);
    this.deltaRank = next.deltaRank; this.hp = next.hp; this.pickupRadius = next.pickupRadius;`, `    const wasEchoOwned = this.echoOwned;
    const oldDeltaRank = this.deltaRank;
    const next = applyV21Draft(this.buildState(), choice.id as V21DraftId);
    this.deltaRank = next.deltaRank;
    if (this.deltaRank !== oldDeltaRank) this.attackAccumulator = migrateDeltaCooldownAccumulator(this.attackAccumulator, oldDeltaRank, this.deltaRank);
    this.hp = next.hp; this.pickupRadius = next.pickupRadius;`, "DELTA rank migration");

phaser = replaceOne(phaser, `    if (this.echoOwned) this.transitionEchoMinesForShift(nextPhase);
    this.phase = nextPhase; this.shifts += 1; this.paintFriend();`, `    if (this.echoOwned) this.transitionEchoMinesForShift(nextPhase);
    this.scheduleDeltaEcho(this.phase);
    this.phase = nextPhase; this.shifts += 1; this.paintFriend();`, "DELTA echo on SHIFT");

phaser = replaceOne(phaser, `    canvas.dataset.seed = String(this.seed); canvas.dataset.controlsDimmed = this.draftOpen ? "true" : "false"; canvas.dataset.deltaFx = "canonical-exclusive";
    canvas.dataset.weaponSlotsUsed = String(this.weaponSlotsUsed);`, `    canvas.dataset.seed = String(this.seed); canvas.dataset.controlsDimmed = this.draftOpen ? "true" : "false"; canvas.dataset.deltaFx = "canonical-exclusive";
    const deltaProfile = buildDeltaProfile(this.pair.a.rows, this.pair.b.rows, this.phase, this.deltaRank);
    canvas.dataset.deltaDamage = String(deltaProfile.damage);
    canvas.dataset.deltaCooldownMs = String(deltaProfile.cooldownMs);
    canvas.dataset.deltaWorldScale = String(deltaProfile.worldScale);
    canvas.dataset.deltaPrimaryPulses = String(this.deltaPrimaryPulses);
    canvas.dataset.deltaEchoPending = this.deltaEchoPending ? "true" : "false";
    canvas.dataset.deltaEchoSchedules = String(this.deltaEchoSchedules);
    canvas.dataset.deltaEchoFires = String(this.deltaEchoFires);
    canvas.dataset.deltaEchoHits = String(this.deltaEchoHits);
    canvas.dataset.deltaStaggers = String(this.deltaStaggers);
    canvas.dataset.deltaStaggeredEnemies = String(this.enemies.filter(enemy => enemy.active && enemy.staggerUntilMs > this.elapsedActiveMs).length);
    canvas.dataset.weaponSlotsUsed = String(this.weaponSlotsUsed);`, "DELTA qualification dataset");

await writeFile(phaserPath, phaser);

const draftPath = "games/rare-shift/src/draft-core.ts";
let draft = await readFile(draftPath, "utf8");
draft = replaceOne(draft,
  `description: "Rank up the canonical phase burst: more damage and faster cadence."`,
  `description: "Advance the canonical DELTA phase mechanic to its next behavior rank."`,
  "DELTA draft description");
await writeFile(draftPath, draft);

const combatTestPath = "games/rare-shift/tests/v2-combat.test.ts";
let combatTest = await readFile(combatTestPath, "utf8");
combatTest = replaceOne(combatTest,
  `  assert.equal(deltaDamageForRank(5), 28);`,
  `  assert.equal(deltaDamageForRank(5), 14);`,
  "legacy DELTA Rank-V expectation");
await writeFile(combatTestPath, combatTest);

const packagePath = "package.json";
let pkg = await readFile(packagePath, "utf8");
pkg = replaceOne(pkg,
  `    "test:v2-3a": "node --experimental-strip-types --test games/rare-shift/tests/v2-3a-progression.test.ts",`,
  `    "test:v2-3a": "node --experimental-strip-types --test games/rare-shift/tests/v2-3a-progression.test.ts",\n    "test:v2-3b1-delta": "node --experimental-strip-types --test games/rare-shift/tests/v2-3b1-delta-ranks.test.ts",`,
  "V2-3B1 pure test script");
pkg = replaceOne(pkg,
  `    "test:v2-2e-browser": "node --experimental-strip-types scripts/v2-2e-browser.mjs",`,
  `    "test:v2-2e-browser": "node --experimental-strip-types scripts/v2-2e-browser.mjs",\n    "test:v2-3b1-delta-browser": "node --experimental-strip-types scripts/v2-3b1-delta-browser.mjs",`,
  "V2-3B1 browser test script");
await writeFile(packagePath, pkg);

console.log("V2_3B1_APPLY=PASS");
