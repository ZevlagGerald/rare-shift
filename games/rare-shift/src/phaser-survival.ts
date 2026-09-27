import Phaser from "phaser";
import { applyV21Draft, buildV21Draft, type V21BuildState, type V21DraftChoice, type V21DraftId } from "./draft-core.ts";
import {
  buildDeltaProfile,
  deltaHitsTarget,
  enemyBaseHp,
  enemyContactDamage,
  enemyMoveSpeed,
  isEnemyCorporeal,
  type V2EnemyKind,
} from "./phase-combat-core.ts";
import {
  addSignalXp,
  buildSpawnSpec,
  clampPlayerPosition,
  V21_CONTACT_INVULN_MS,
  V21_MAX_ACTIVE_ENEMIES,
  V21_PLAYER_MAX_HP,
  V21_SPAWN_INTERVAL_MS,
  V21_WORLD_HEIGHT,
  V21_WORLD_WIDTH,
  v21QualificationReached,
  xpThreshold,
} from "./survival-core.ts";
import type { FrameRows, Phase, SelectedFramePair } from "./types.ts";
import { buildFractureGrid, V2_ART_SPRITES, V2_PALETTE } from "./v2-art-core.ts";
import { effectDuration } from "./v2-fx-core.ts";

export interface PhaserSurvivalController {
  destroy(): void;
  setPaused(paused: boolean): void;
  setReducedMotion(reduced: boolean): void;
}

interface SurvivalOptions {
  parent: HTMLElement;
  pair: SelectedFramePair;
  reducedMotion: boolean;
  friendLabel: string;
  familyName: string;
}

interface EnemyRuntime {
  active: boolean;
  kind: V2EnemyKind;
  hp: number;
  x: number;
  y: number;
  view: Phaser.GameObjects.Container;
}

interface PickupRuntime {
  active: boolean;
  x: number;
  y: number;
  view: Phaser.GameObjects.Container;
}

const VIEW_W = 960;
const VIEW_H = 640;
const PLAYER_SPEED = 220;
const DELTA_PIXEL_SCALE = 8;
const PICKUP_POOL_SIZE = 64;

function hex(value: string): number {
  return Number.parseInt(value.slice(1), 16);
}

function romanRank(rank: number): string {
  return ["I", "II", "III", "IV", "V"][Math.max(1, Math.min(5, rank)) - 1];
}

class SurvivalScene extends Phaser.Scene {
  private readonly pair: SelectedFramePair;
  private readonly friendLabel: string;
  private readonly familyName: string;
  private readonly seed: number;

  private phase: Phase = "B";
  private reduced = false;
  private friend!: Phaser.GameObjects.Container;
  private enemies: EnemyRuntime[] = [];
  private pickups: PickupRuntime[] = [];
  private burst!: Phaser.GameObjects.Graphics;
  private background!: Phaser.GameObjects.Graphics;

  private hp = V21_PLAYER_MAX_HP;
  private level = 1;
  private xp = 0;
  private kills = 0;
  private shifts = 0;
  private deltaRank = 1;
  private pickupRadius = 76;
  private elapsedActiveMs = 0;
  private spawnAccumulator = 0;
  private spawnIndex = 0;
  private attackAccumulator = 0;
  private lastContactAt = -99_999;
  private dead = false;
  private draftOpen = false;
  private draftChoices: readonly V21DraftChoice[] = [];
  private draftViews: Phaser.GameObjects.Container[] = [];
  private draftBackdrop: Phaser.GameObjects.Rectangle | null = null;
  private qualified = false;

  private moveUp = false;
  private moveDown = false;
  private moveLeft = false;
  private moveRight = false;
  private joystickPointer: number | null = null;
  private joystickOrigin = { x: 120, y: 530 };
  private joystickVector = { x: 0, y: 0 };
  private joystickBase!: Phaser.GameObjects.Arc;
  private joystickKnob!: Phaser.GameObjects.Arc;
  private touchZone!: Phaser.GameObjects.Rectangle;
  private shiftButton!: Phaser.GameObjects.Rectangle;
  private shiftLabel!: Phaser.GameObjects.Text;

  private hpBar!: Phaser.GameObjects.Graphics;
  private xpBar!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;
  private buildText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  constructor(private readonly opts: Omit<SurvivalOptions, "parent">) {
    super({ key: "RareShiftV21Survival" });
    this.pair = opts.pair;
    this.friendLabel = opts.friendLabel;
    this.familyName = opts.familyName;
    const numericFriend = Number.parseInt(opts.friendLabel, 10);
    this.seed = ((Number.isFinite(numericFriend) ? numericFriend : 0x52415245) ^ (opts.pair.a.index << 8) ^ opts.pair.b.index) >>> 0;
  }

  create(): void {
    this.reduced = this.opts.reducedMotion;
    this.cameras.main.setBackgroundColor(V2_PALETTE.backgroundPrimary);
    this.cameras.main.setBounds(0, 0, V21_WORLD_WIDTH, V21_WORLD_HEIGHT);

    this.drawWorld();
    this.friend = this.add.container(V21_WORLD_WIDTH / 2, V21_WORLD_HEIGHT / 2).setDepth(30);
    this.paintFriend();
    this.cameras.main.startFollow(this.friend, true, 0.12, 0.12);

    this.burst = this.add.graphics().setDepth(24).setVisible(false);
    this.buildPools();
    this.buildHud();
    this.installKeyboard();
    this.installTouch();
    this.syncTestState();
  }

  setReducedMotion(reduced: boolean): void {
    this.reduced = reduced;
  }

  update(_time: number, delta: number): void {
    if (this.dead || this.draftOpen) {
      this.syncTestState();
      return;
    }

    const dt = Math.min(50, Math.max(0, delta));
    this.elapsedActiveMs += dt;
    this.updateMovement(dt / 1000);
    this.spawnAccumulator += dt;
    while (this.spawnAccumulator >= V21_SPAWN_INTERVAL_MS) {
      this.spawnAccumulator -= V21_SPAWN_INTERVAL_MS;
      this.spawnEnemy();
    }
    this.attackAccumulator += dt;
    const profile = buildDeltaProfile(this.pair.a.rows, this.pair.b.rows, this.phase, this.deltaRank);
    if (this.attackAccumulator >= profile.cooldownMs) {
      this.attackAccumulator %= profile.cooldownMs;
      this.fireDelta(profile);
    }
    this.updateEnemies(dt / 1000);
    this.updatePickups(dt / 1000);
    this.updateHud();

    if (!this.qualified && v21QualificationReached({
      elapsedMs: this.elapsedActiveMs,
      phase: this.phase,
      hp: this.hp,
      level: this.level,
      xp: this.xp,
      kills: this.kills,
      shifts: this.shifts,
      deltaRank: this.deltaRank,
    })) {
      this.qualified = true;
      this.statusText.setText("V2-1 LOOP COMPLETE // keep surviving or review the build.");
    }
    this.syncTestState();
  }

  private drawWorld(): void {
    this.background = this.add.graphics().setDepth(-10);
    this.background.fillStyle(hex(V2_PALETTE.backgroundPrimary), 1).fillRect(0, 0, V21_WORLD_WIDTH, V21_WORLD_HEIGHT);

    const sectorW = V21_WORLD_WIDTH / 5;
    const sectorH = V21_WORLD_HEIGHT / 4;
    for (let sy = 0; sy < 4; sy++) {
      for (let sx = 0; sx < 5; sx++) {
        const left = sx * sectorW;
        const top = sy * sectorH;
        if ((sx + sy) % 2 === 0) {
          this.background.fillStyle(hex(V2_PALETTE.backgroundSecondary), 0.22)
            .fillRect(left + 8, top + 8, sectorW - 16, sectorH - 16);
        }
        this.background.lineStyle(1, hex(V2_PALETTE.gridLine), 0.2)
          .strokeRect(left + 8, top + 8, sectorW - 16, sectorH - 16);
        const railTone = (sx + sy) % 2 === 0 ? hex(V2_PALETTE.phaseA) : hex(V2_PALETTE.phaseB);
        this.background.lineStyle(2, railTone, 0.09);
        this.background.lineBetween(left + 26, top + 28, left + 102, top + 28);
        this.background.lineBetween(left + 26, top + 28, left + 26, top + 78);
      }
    }

    const grid = buildFractureGrid(30, 20, this.seed);
    const cellW = V21_WORLD_WIDTH / 30;
    const cellH = V21_WORLD_HEIGHT / 20;
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const px = x * cellW, py = y * cellH;
        const cell = grid[y][x];
        if (cell === "GRID") {
          this.background.lineStyle(1, hex(V2_PALETTE.gridLine), 0.32).strokeRect(px + 1, py + 1, cellW - 2, cellH - 2);
        } else if (cell === "FRACTURE") {
          this.background.lineStyle(1, hex(V2_PALETTE.gridLine), 0.7).lineBetween(px + 8, py + cellH - 10, px + cellW - 8, py + 10);
        } else if (cell === "COMMON_MARK") {
          this.background.fillStyle(hex(V2_PALETTE.common), 0.12).fillRect(px + cellW / 2 - 4, py + cellH / 2 - 4, 8, 8);
        }
      }
    }
    this.background.lineStyle(3, hex(V2_PALETTE.common), 0.2).strokeRect(2, 2, V21_WORLD_WIDTH - 4, V21_WORLD_HEIGHT - 4);
  }

  private buildPools(): void {
    for (let i = 0; i < V21_MAX_ACTIVE_ENEMIES; i++) {
      const view = this.add.container(-500, -500).setDepth(20).setVisible(false);
      this.enemies.push({ active: false, kind: "TRACE", hp: 0, x: -500, y: -500, view });
    }
    for (let i = 0; i < PICKUP_POOL_SIZE; i++) {
      const view = this.add.container(-500, -500).setDepth(15).setVisible(false);
      this.paintRows(view, V2_ART_SPRITES.SIGNAL_XP.rows, hex(V2_PALETTE.common), 2);
      const ring = this.add.circle(0, 0, 20, hex(V2_PALETTE.common), 0.025).setStrokeStyle(1, hex(V2_PALETTE.common), 0.28);
      view.addAt(ring, 0);
      this.pickups.push({ active: false, x: -500, y: -500, view });
    }
  }

  private paintRows(container: Phaser.GameObjects.Container, rows: FrameRows, color: number, scale: number): void {
    container.removeAll(true);
    const left = -(16 * scale) / 2;
    const top = -(16 * scale) / 2;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (rows[y][x] === "#") container.add(this.add.rectangle(left + x * scale + scale / 2, top + y * scale + scale / 2, scale, scale, color));
    }
  }

  private paintEnemy(container: Phaser.GameObjects.Container, kind: V2EnemyKind): void {
    const tone = kind === "TRACE" ? hex(V2_PALETTE.common) : kind === "SPLIT_A" ? hex(V2_PALETTE.phaseA) : hex(V2_PALETTE.phaseB);
    this.paintRows(container, V2_ART_SPRITES[kind].rows, tone, 2);
    if (kind === "TRACE") {
      container.add(this.add.rectangle(0, 0, 40, 40, 0x000000, 0).setStrokeStyle(1, tone, 0.48));
      container.add(this.add.rectangle(0, -22, 10, 2, tone, 0.7));
      container.add(this.add.rectangle(0, 22, 10, 2, tone, 0.7));
    } else {
      const side = kind === "SPLIT_A" ? -22 : 22;
      const inward = kind === "SPLIT_A" ? 4 : -4;
      container.add(this.add.rectangle(side, 0, 3, 30, tone, 0.72));
      container.add(this.add.rectangle(side + inward, -13, 10, 3, tone, 0.72));
      container.add(this.add.rectangle(side + inward, 13, 10, 3, tone, 0.72));
    }
  }

  private paintFriend(): void {
    this.friend.removeAll(true);
    const rows = this.phase === "A" ? this.pair.a.rows : this.pair.b.rows;
    const tone = hex(this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB);
    const scale = 4;
    const left = -(16 * scale) / 2;
    const top = -(16 * scale) / 2;
    this.friend.add(this.add.circle(0, 5, 42, tone, 0.035).setStrokeStyle(1, tone, 0.52));
    this.friend.add(this.add.circle(0, 5, 34, hex(V2_PALETTE.common), 0.018).setStrokeStyle(1, hex(V2_PALETTE.common), 0.16));
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (rows[y][x] === "#") {
      this.friend.add(this.add.rectangle(left + x * scale + scale / 2, top + y * scale + scale / 2, scale + 2, scale + 2, hex(V2_PALETTE.common)));
    }
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (rows[y][x] === "#") {
      this.friend.add(this.add.rectangle(left + x * scale + scale / 2, top + y * scale + scale / 2, scale, scale, 0x050607));
    }
  }

  private buildHud(): void {
    const panel = this.add.rectangle(480, 42, 900, 64, 0x0b0e12, 0.9).setStrokeStyle(1, 0x344050).setScrollFactor(0).setDepth(100);
    panel.setAlpha(0.94);
    this.hpBar = this.add.graphics().setScrollFactor(0).setDepth(101);
    this.xpBar = this.add.graphics().setScrollFactor(0).setDepth(101);
    this.hudText = this.add.text(40, 18, "", { fontFamily: "monospace", fontSize: "14px", color: V2_PALETTE.common, fontStyle: "bold" }).setScrollFactor(0).setDepth(102);
    this.buildText = this.add.text(574, 20, "", { fontFamily: "monospace", fontSize: "11px", color: "#9eabb8", fontStyle: "bold" }).setScrollFactor(0).setDepth(102);
    this.phaseText = this.add.text(790, 16, "", { fontFamily: "monospace", fontSize: "14px", color: V2_PALETTE.phaseB, fontStyle: "bold", align: "right" }).setScrollFactor(0).setDepth(102);
    this.statusText = this.add.text(480, 82, "MOVE · AUTO-FIRE · SPACE / SHIFT", { fontFamily: "monospace", fontSize: "10px", color: "#aeb9c5", backgroundColor: "#0b0e12", padding: { x: 8, y: 4 } }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(110);
    this.updateHud();
  }

  private updateHud(): void {
    this.hpBar.clear();
    this.hpBar.fillStyle(0x202832, 1).fillRect(40, 48, 240, 8);
    this.hpBar.fillStyle(this.hp > 25 ? 0xe8edf2 : 0xf6c85f, 1).fillRect(40, 48, 240 * Math.max(0, this.hp) / V21_PLAYER_MAX_HP, 8);
    this.xpBar.clear();
    this.xpBar.fillStyle(0x202832, 1).fillRect(310, 48, 240, 8);
    this.xpBar.fillStyle(0x7ee787, 1).fillRect(310, 48, 240 * this.xp / xpThreshold(this.level), 8);
    this.hudText.setText(`HP ${Math.max(0, this.hp)}/${V21_PLAYER_MAX_HP}   LV ${this.level}   XP ${this.xp}/${xpThreshold(this.level)}`);
    this.buildText.setText(`K ${this.kills} · Δ ${romanRank(this.deltaRank)}`);
    this.phaseText.setColor(this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB);
    this.phaseText.setText(`PHASE ${this.phase}\nFRAME ${this.phase === "A" ? this.pair.a.index : this.pair.b.index}`);
    if (this.shiftButton) this.shiftButton.setStrokeStyle(2, hex(this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB));
  }

  private spawnEnemy(): void {
    const slot = this.enemies.find(enemy => !enemy.active);
    if (!slot) return;
    const spec = buildSpawnSpec(this.seed, this.spawnIndex++, this.elapsedActiveMs, { x: this.friend.x, y: this.friend.y });
    slot.active = true;
    slot.kind = spec.kind;
    slot.hp = enemyBaseHp(spec.kind);
    slot.x = spec.position.x;
    slot.y = spec.position.y;
    slot.view.setPosition(slot.x, slot.y).setVisible(true);
    this.paintEnemy(slot.view, spec.kind);
    slot.view.setAlpha(isEnemyCorporeal(spec.kind, this.phase) ? 1 : 0.24);
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      const dx = this.friend.x - enemy.x;
      const dy = this.friend.y - enemy.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const speed = enemyMoveSpeed(enemy.kind);
      enemy.x += dx / distance * speed * dt;
      enemy.y += dy / distance * speed * dt;
      enemy.view.setPosition(enemy.x, enemy.y);
      const corporeal = isEnemyCorporeal(enemy.kind, this.phase);
      enemy.view.setAlpha(corporeal ? 1 : 0.22);
      if (corporeal && distance < 32 && this.elapsedActiveMs - this.lastContactAt >= V21_CONTACT_INVULN_MS) {
        this.lastContactAt = this.elapsedActiveMs;
        this.hp = Math.max(0, this.hp - enemyContactDamage(enemy.kind));
        if (!this.reduced) this.cameras.main.flash(80, 246, 200, 95, false);
        if (this.hp <= 0) {
          this.dead = true;
          this.statusText.setText("SIGNAL LOST // V2-1 sandbox stopped at 0 HP.");
          break;
        }
      }
    }
  }

  private fireDelta(profile: ReturnType<typeof buildDeltaProfile>): void {
    this.tweens.killTweensOf(this.burst);
    this.burst.clear().setVisible(true).setPosition(this.friend.x, this.friend.y).setScale(this.reduced ? 1 : 0.72).setAlpha(1);
    const tone = this.phase === "A" ? hex(V2_PALETTE.phaseA) : hex(V2_PALETTE.phaseB);
    this.burst.fillStyle(hex(V2_PALETTE.common), this.reduced ? 0.16 : 0.22);
    for (const point of profile.points) this.burst.fillRect(point.x * DELTA_PIXEL_SCALE - 6, point.y * DELTA_PIXEL_SCALE - 6, 12, 12);
    this.burst.fillStyle(tone, this.reduced ? 0.62 : 0.96);
    for (const point of profile.points) this.burst.fillRect(point.x * DELTA_PIXEL_SCALE - 4, point.y * DELTA_PIXEL_SCALE - 4, 8, 8);

    const duration = effectDuration("DELTA_BURST", this.reduced);
    if (this.reduced) {
      this.time.delayedCall(duration, () => this.burst.setVisible(false));
    } else {
      this.tweens.add({
        targets: this.burst,
        scaleX: 1.08,
        scaleY: 1.08,
        alpha: 0,
        duration,
        ease: "Quad.Out",
        onComplete: () => this.burst.setVisible(false).setAlpha(1).setScale(1),
      });
    }

    for (const enemy of this.enemies) {
      if (!enemy.active || !isEnemyCorporeal(enemy.kind, this.phase)) continue;
      if (!deltaHitsTarget(profile, enemy.x - this.friend.x, enemy.y - this.friend.y, DELTA_PIXEL_SCALE)) continue;
      enemy.hp -= profile.damage;
      enemy.view.setAlpha(0.55);
      this.time.delayedCall(effectDuration("ENEMY_HIT", this.reduced), () => {
        if (enemy.active) enemy.view.setAlpha(isEnemyCorporeal(enemy.kind, this.phase) ? 1 : 0.22);
      });
      if (enemy.hp <= 0) this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: EnemyRuntime): void {
    const deathX = enemy.x;
    const deathY = enemy.y;
    const deathTone = enemy.kind === "TRACE" ? hex(V2_PALETTE.common) : enemy.kind === "SPLIT_A" ? hex(V2_PALETTE.phaseA) : hex(V2_PALETTE.phaseB);
    enemy.active = false;
    enemy.view.setVisible(false);
    this.kills += 1;
    this.emitDeathFx(deathX, deathY, deathTone);
    const pickup = this.pickups.find(item => !item.active);
    if (pickup) {
      pickup.active = true;
      pickup.x = deathX;
      pickup.y = deathY;
      pickup.view.setPosition(pickup.x, pickup.y).setVisible(true).setAlpha(1);
    }
  }

  private emitDeathFx(x: number, y: number, tone: number): void {
    const fx = this.add.graphics().setPosition(x, y).setDepth(25);
    fx.fillStyle(tone, 0.78);
    fx.fillRect(-12, -2, 24, 4);
    fx.fillRect(-2, -12, 4, 24);
    const duration = effectDuration("ENEMY_DEATH", this.reduced);
    if (this.reduced) {
      this.time.delayedCall(duration, () => fx.destroy());
    } else {
      this.tweens.add({ targets: fx, scaleX: 1.6, scaleY: 1.6, alpha: 0, duration, ease: "Quad.Out", onComplete: () => fx.destroy() });
    }
  }

  private updatePickups(dt: number): void {
    for (const pickup of this.pickups) {
      if (!pickup.active) continue;
      const dx = this.friend.x - pickup.x;
      const dy = this.friend.y - pickup.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      if (distance <= this.pickupRadius) {
        const speed = Math.max(180, 460 - distance);
        pickup.x += dx / distance * speed * dt;
        pickup.y += dy / distance * speed * dt;
        pickup.view.setPosition(pickup.x, pickup.y);
      }
      if (distance < 24) this.collectPickup(pickup);
    }
  }

  private collectPickup(pickup: PickupRuntime): void {
    pickup.active = false;
    pickup.view.setVisible(false);
    const progress = addSignalXp(this.level, this.xp, 1);
    this.level = progress.level;
    this.xp = progress.xp;
    if (progress.levelsGained > 0) this.openDraft();
  }

  private openDraft(): void {
    this.draftOpen = true;
    this.setCombatControlsEnabled(false);
    this.draftBackdrop?.destroy();
    this.draftBackdrop = this.add.rectangle(480, 320, 960, 640, 0x05070a, 0.58).setScrollFactor(0).setDepth(180);
    const state: V21BuildState = { deltaRank: this.deltaRank, hp: this.hp, maxHp: V21_PLAYER_MAX_HP, pickupRadius: this.pickupRadius };
    this.draftChoices = buildV21Draft(this.seed, this.level, state);
    const xs = [220, 480, 740];
    this.draftViews = this.draftChoices.map((choice, index) => this.makeDraftCard(xs[index], choice, index));
    this.statusText.setText("LEVEL UP // choose 1 of 3 · keys 1–3 or tap").setDepth(210);
    this.syncTestState();
  }

  private makeDraftCard(x: number, choice: V21DraftChoice, index: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, 320).setScrollFactor(0).setDepth(200);
    const border = choice.id === "DELTA_RANK" ? hex(this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB) : 0x657383;
    const bg = this.add.rectangle(0, 0, 220, 230, 0x11151b, 0.99).setStrokeStyle(choice.id === "DELTA_RANK" ? 3 : 2, border).setInteractive({ useHandCursor: true });
    const tag = this.add.text(0, -91, `${index + 1} // ${choice.category}`, { fontFamily: "monospace", fontSize: "11px", color: "#8b98a7" }).setOrigin(0.5);
    const nextRank = Math.min(5, this.deltaRank + 1);
    const titleText = choice.id === "DELTA_RANK" ? `${choice.name} ${romanRank(nextRank)}` : choice.name;
    const title = this.add.text(0, -54, titleText, { fontFamily: "monospace", fontSize: "17px", color: V2_PALETTE.common, fontStyle: "bold", align: "center", wordWrap: { width: 190 } }).setOrigin(0.5);
    const detail = this.add.text(0, -27, choice.id === "DELTA_RANK" ? `RANK ${romanRank(this.deltaRank)} → ${romanRank(nextRank)}` : "RUN UTILITY", { fontFamily: "monospace", fontSize: "9px", color: choice.id === "DELTA_RANK" ? (this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB) : "#748392", letterSpacing: 1 }).setOrigin(0.5);
    const desc = this.add.text(0, 61, choice.description, { fontFamily: "monospace", fontSize: "11px", color: "#bac5d0", align: "center", wordWrap: { width: 178 } }).setOrigin(0.5);
    container.add([bg, tag, title, detail]);

    if (choice.id === "DELTA_RANK") {
      const preview = this.add.graphics();
      const profile = buildDeltaProfile(this.pair.a.rows, this.pair.b.rows, this.phase, nextRank);
      preview.fillStyle(border, 0.82);
      for (const point of profile.points) preview.fillRect(point.x * 1.35 - 1.5, point.y * 1.35 - 1.5, 3, 3);
      preview.setPosition(0, 9);
      container.add(preview);
    } else {
      const glyph = this.add.graphics();
      glyph.lineStyle(2, border, 0.62);
      glyph.strokeRect(-12, -3, 24, 24);
      glyph.lineBetween(-6, 9, 6, 9);
      glyph.setPosition(0, -2);
      container.add(glyph);
    }

    container.add(desc);
    bg.on("pointerdown", () => this.chooseDraft(index));
    return container;
  }

  private chooseDraft(index: number): void {
    if (!this.draftOpen) return;
    const choice = this.draftChoices[index];
    if (!choice || choice.disabled) return;
    const next = applyV21Draft({ deltaRank: this.deltaRank, hp: this.hp, maxHp: V21_PLAYER_MAX_HP, pickupRadius: this.pickupRadius }, choice.id as V21DraftId);
    this.deltaRank = next.deltaRank;
    this.hp = next.hp;
    this.pickupRadius = next.pickupRadius;
    for (const view of this.draftViews) view.destroy(true);
    this.draftViews = [];
    this.draftChoices = [];
    this.draftBackdrop?.destroy();
    this.draftBackdrop = null;
    this.draftOpen = false;
    this.setCombatControlsEnabled(true);
    this.statusText.setDepth(110).setText(`${choice.name} selected // combat resumed.`);
    this.updateHud();
    this.syncTestState();
  }

  private updateMovement(dt: number): void {
    let x = (this.moveRight ? 1 : 0) - (this.moveLeft ? 1 : 0) + this.joystickVector.x;
    let y = (this.moveDown ? 1 : 0) - (this.moveUp ? 1 : 0) + this.joystickVector.y;
    const magnitude = Math.hypot(x, y);
    if (magnitude > 1) { x /= magnitude; y /= magnitude; }
    const next = clampPlayerPosition({ x: this.friend.x + x * PLAYER_SPEED * dt, y: this.friend.y + y * PLAYER_SPEED * dt });
    this.friend.setPosition(next.x, next.y);
  }

  private shift(): void {
    if (this.dead || this.draftOpen) return;
    this.phase = this.phase === "A" ? "B" : "A";
    this.shifts += 1;
    this.paintFriend();
    for (const enemy of this.enemies) if (enemy.active) enemy.view.setAlpha(isEnemyCorporeal(enemy.kind, this.phase) ? 1 : 0.22);
    this.updateHud();
    this.statusText.setText(`SHIFT → Phase ${this.phase} // threat authority rewritten.`);
    this.emitShiftFx();
    this.syncTestState();
  }

  private emitShiftFx(): void {
    const tone = hex(this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB);
    const fx = this.add.graphics().setPosition(this.friend.x, this.friend.y).setDepth(29);
    fx.lineStyle(2, tone, 0.82).strokeCircle(0, 0, 36);
    fx.lineStyle(1, hex(V2_PALETTE.common), 0.35).strokeCircle(0, 0, 46);
    const duration = effectDuration("SHIFT_TRANSITION", this.reduced);
    if (this.reduced) {
      this.time.delayedCall(duration, () => fx.destroy());
    } else {
      this.tweens.add({ targets: fx, scaleX: 1.8, scaleY: 1.8, alpha: 0, duration, ease: "Quad.Out", onComplete: () => fx.destroy() });
      this.cameras.main.flash(70, this.phase === "A" ? 76 : 247, this.phase === "A" ? 201 : 37, this.phase === "A" ? 240 : 133, false);
    }
  }

  private installKeyboard(): void {
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "1", "2", "3"].includes(key)) event.preventDefault();
      if (event.repeat && key === " ") return;
      if (key === "w" || key === "arrowup") this.moveUp = true;
      else if (key === "s" || key === "arrowdown") this.moveDown = true;
      else if (key === "a" || key === "arrowleft") this.moveLeft = true;
      else if (key === "d" || key === "arrowright") this.moveRight = true;
      else if (key === " ") this.shift();
      else if (this.draftOpen && /^[1-3]$/u.test(key)) this.chooseDraft(Number(key) - 1);
    });
    this.input.keyboard?.on("keyup", (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "w" || key === "arrowup") this.moveUp = false;
      else if (key === "s" || key === "arrowdown") this.moveDown = false;
      else if (key === "a" || key === "arrowleft") this.moveLeft = false;
      else if (key === "d" || key === "arrowright") this.moveRight = false;
    });
  }

  private installTouch(): void {
    this.joystickBase = this.add.circle(this.joystickOrigin.x, this.joystickOrigin.y, 62, 0x202832, 0.72).setStrokeStyle(2, 0x657383).setScrollFactor(0).setDepth(120);
    this.joystickKnob = this.add.circle(this.joystickOrigin.x, this.joystickOrigin.y, 24, 0xe8edf2, 0.65).setScrollFactor(0).setDepth(121);
    this.touchZone = this.add.rectangle(this.joystickOrigin.x, this.joystickOrigin.y, 220, 180, 0x000000, 0.001).setScrollFactor(0).setDepth(122).setInteractive();
    this.touchZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.draftOpen) return;
      this.joystickPointer = pointer.id;
      this.updateJoystick(pointer.x, pointer.y);
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointer) this.updateJoystick(pointer.x, pointer.y);
    });
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.joystickPointer) return;
      this.joystickPointer = null;
      this.joystickVector = { x: 0, y: 0 };
      this.joystickKnob.setPosition(this.joystickOrigin.x, this.joystickOrigin.y);
    });

    this.shiftButton = this.add.rectangle(842, 530, 150, 72, 0x202832, 0.95).setStrokeStyle(2, hex(V2_PALETTE.phaseB)).setScrollFactor(0).setDepth(122).setInteractive({ useHandCursor: true });
    this.shiftLabel = this.add.text(842, 530, "SHIFT\nSPACE", { fontFamily: "monospace", fontSize: "16px", color: V2_PALETTE.common, fontStyle: "bold", align: "center" }).setOrigin(0.5).setScrollFactor(0).setDepth(123);
    this.shiftButton.on("pointerdown", () => this.shift());
    this.shiftLabel.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.shift());
  }

  private setCombatControlsEnabled(enabled: boolean): void {
    const alpha = enabled ? 1 : 0.2;
    this.joystickBase.setAlpha(alpha);
    this.joystickKnob.setAlpha(alpha);
    this.shiftButton.setAlpha(alpha);
    this.shiftLabel.setAlpha(enabled ? 1 : 0.28);
    if (!enabled) {
      this.joystickPointer = null;
      this.joystickVector = { x: 0, y: 0 };
      this.joystickKnob.setPosition(this.joystickOrigin.x, this.joystickOrigin.y);
    }
  }

  private updateJoystick(x: number, y: number): void {
    const dx = x - this.joystickOrigin.x;
    const dy = y - this.joystickOrigin.y;
    const distance = Math.hypot(dx, dy);
    const limit = 46;
    const scale = distance > limit ? limit / distance : 1;
    const kx = dx * scale;
    const ky = dy * scale;
    this.joystickKnob.setPosition(this.joystickOrigin.x + kx, this.joystickOrigin.y + ky);
    this.joystickVector = distance < 8 ? { x: 0, y: 0 } : { x: kx / limit, y: ky / limit };
  }

  private syncTestState(): void {
    const canvas = this.game.canvas;
    canvas.dataset.stage = "v2-survival";
    canvas.dataset.friend = this.friendLabel;
    canvas.dataset.family = this.familyName;
    canvas.dataset.frameA = String(this.pair.a.index);
    canvas.dataset.frameB = String(this.pair.b.index);
    canvas.dataset.phase = this.phase;
    canvas.dataset.x = String(Math.round(this.friend?.x ?? 0));
    canvas.dataset.y = String(Math.round(this.friend?.y ?? 0));
    canvas.dataset.hp = String(this.hp);
    canvas.dataset.level = String(this.level);
    canvas.dataset.xp = String(this.xp);
    canvas.dataset.kills = String(this.kills);
    canvas.dataset.shifts = String(this.shifts);
    canvas.dataset.deltaRank = String(this.deltaRank);
    canvas.dataset.draftOpen = this.draftOpen ? "true" : "false";
    canvas.dataset.draftCount = String(this.draftChoices.length);
    canvas.dataset.activeEnemies = String(this.enemies.filter(enemy => enemy.active).length);
    canvas.dataset.qualified = this.qualified ? "true" : "false";
    canvas.dataset.dead = this.dead ? "true" : "false";
    canvas.dataset.seed = String(this.seed);
    canvas.dataset.controlsDimmed = this.draftOpen ? "true" : "false";
    canvas.dataset.deltaFx = "canonical-exclusive";
  }
}

export function mountPhaserSurvival(options: SurvivalOptions): PhaserSurvivalController {
  const scene = new SurvivalScene({
    pair: options.pair,
    reducedMotion: options.reducedMotion,
    friendLabel: options.friendLabel,
    familyName: options.familyName,
  });
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: VIEW_W,
    height: VIEW_H,
    parent: options.parent,
    backgroundColor: V2_PALETTE.backgroundPrimary,
    pixelArt: true,
    antialias: false,
    scene: [scene],
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: false, roundPixels: true },
    input: { keyboard: true, mouse: true, touch: true },
  });
  game.canvas.tabIndex = 0;
  game.canvas.setAttribute("aria-label", "RARE SHIFT V2 survival sandbox. WASD or arrows move. Space shifts phase. Weapons fire automatically.");
  return {
    destroy: () => game.destroy(true),
    setPaused: paused => paused ? game.scene.pause("RareShiftV21Survival") : game.scene.resume("RareShiftV21Survival"),
    setReducedMotion: reduced => scene.setReducedMotion(reduced),
  };
}