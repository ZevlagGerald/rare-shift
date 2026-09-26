import Phaser from "phaser";
import { derivePhaseField, otherPhase } from "./phase-core.ts";
import {
  ActivePulseClock,
  isTimingPassable,
  timingBlockReason,
  pulseSegmentAt,
} from "./timing-core.ts";
import type {
  FrameRows,
  Phase,
  PulseSegment,
  SelectedFramePair,
  TimingChamber,
  TimingProfile,
  TimingSolveResult,
} from "./types.ts";

export interface PhaserTimingController {
  destroy(): void;
  setPaused(paused: boolean): void;
  setReducedMotion(reduced: boolean): void;
}

interface TimingOptions {
  parent: HTMLElement;
  chamber: TimingChamber;
  pair: SelectedFramePair;
  profile: TimingProfile;
  solved: TimingSolveResult;
  reducedMotion: boolean;
  friendLabel: string;
  familyName: string;
  onComplete?: () => void;
}

const VIEW_W = 960, VIEW_H = 640;
const CELL = 40, BOARD_X = 42, BOARD_Y = 150;
const LOCAL_TEST_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isPulseSegment(value: string | undefined): value is PulseSegment {
  return value === "TELEGRAPH_A" || value === "OPEN_A" || value === "TELEGRAPH_B" || value === "OPEN_B";
}

class TimingScene extends Phaser.Scene {
  private chamber!: TimingChamber;
  private pair!: SelectedFramePair;
  private profile!: TimingProfile;
  private solved!: TimingSolveResult;
  private phase: Phase = "B";
  private player = { x: 0, y: 0 };
  private friendContainer!: Phaser.GameObjects.Container;
  private shutterGraphics!: Phaser.GameObjects.Graphics;
  private pulseGraphics!: Phaser.GameObjects.Graphics;
  private status!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private pulseText!: Phaser.GameObjects.Text;
  private clock = new ActivePulseClock();
  private reduced = false;
  private finished = false;
  private shiftCount = 0;
  private lastPulse: PulseSegment | null = null;
  private skipNextDelta = false;

  constructor(private readonly opts: Omit<TimingOptions, "parent">) {
    super({ key: "RareShiftChamberTwo" });
  }

  create(): void {
    this.chamber = this.opts.chamber;
    this.pair = this.opts.pair;
    this.profile = this.opts.profile;
    this.solved = this.opts.solved;
    this.phase = this.chamber.startPhase;
    this.player = { ...this.chamber.start };
    this.reduced = this.opts.reducedMotion;

    this.cameras.main.setBackgroundColor("#11151b");
    this.add.text(42, 28, "RARE//SHIFT", { fontFamily: "monospace", fontSize: "30px", color: "#f2f6f8", fontStyle: "bold" });
    this.add.text(42, 68, "CHAMBER II // TIMING", { fontFamily: "monospace", fontSize: "14px", color: "#8b98a7" });
    this.add.text(42, 100,
      `Friend #${this.opts.friendLabel} · ${this.opts.familyName} · frames ${this.pair.a.index} ↔ ${this.pair.b.index} · timing proof ${this.chamber.fingerprint}`,
      { fontFamily: "monospace", fontSize: "13px", color: "#b7c2ce" });
    this.status = this.add.text(42, 127,
      "Match PHASE + PULSE. Wait in the safe bay, then cross only during the matching OPEN window.",
      { fontFamily: "monospace", fontSize: "11px", color: "#cbd4dc", wordWrap: { width: 650 } });

    this.drawBoard();
    this.drawPhaseField();
    this.shutterGraphics = this.add.graphics();
    this.pulseGraphics = this.add.graphics();
    this.friendContainer = this.add.container(0, 0);
    this.phaseText = this.add.text(744, 118, "", { fontFamily: "monospace", fontSize: "18px", color: "#f2f6f8", fontStyle: "bold" });
    this.pulseText = this.add.text(744, 164, "", { fontFamily: "monospace", fontSize: "13px", color: "#c7d1da", fontStyle: "bold" });

    this.renderDynamic(true);
    this.installKeyboard();
    this.installTouchControls();
  }

  update(_time: number, delta: number): void {
    if (this.finished) return;
    if (this.skipNextDelta) {
      this.skipNextDelta = false;
    } else {
      this.clock.advance(Math.max(0, delta));
    }
    const pulse = this.currentPulse();
    if (pulse !== this.lastPulse) this.renderDynamic(true);
  }

  setReducedMotion(reduced: boolean): void { this.reduced = reduced; }

  setRuntimePaused(paused: boolean): void {
    this.clock.setPaused(paused);
    if (!paused) this.skipNextDelta = true;
  }

  private currentPulse(): PulseSegment {
    const canvas = this.game.canvas;
    const override = LOCAL_TEST_HOSTS.has(window.location.hostname) ? canvas.dataset.testPulse : undefined;
    if (isPulseSegment(override)) return override;
    return pulseSegmentAt(this.clock.elapsed(), this.profile);
  }

  private drawBoard(): void {
    const g = this.add.graphics();
    for (let y = 0; y < this.chamber.height; y++) for (let x = 0; x < this.chamber.width; x++) {
      const px = BOARD_X + x * CELL, py = BOARD_Y + y * CELL;
      const tile = this.chamber.tiles[y][x];
      if (tile === "WALL") g.fillStyle(0x2a313b, 1).fillRect(px, py, CELL - 2, CELL - 2);
      else g.fillStyle(0x171d24, 1).fillRect(px, py, CELL - 2, CELL - 2);
      g.lineStyle(1, 0x303944, 0.55).strokeRect(px, py, CELL - 2, CELL - 2);
    }
    const exitX = BOARD_X + this.chamber.exit.x * CELL, exitY = BOARD_Y + this.chamber.exit.y * CELL;
    g.lineStyle(3, 0xe9eef4, 0.9).strokeRect(exitX + 5, exitY + 5, CELL - 12, CELL - 12);
    this.add.text(exitX + 3, exitY - 24, "EXIT", { fontFamily: "monospace", fontSize: "11px", color: "#e9eef4" });
  }

  private drawPhaseField(): void {
    const field = derivePhaseField(this.pair.a.rows, this.pair.b.rows);
    const g = this.add.graphics();
    const ox = 748, oy = 230, cell = 10;
    this.add.text(748, 208, "CANONICAL PHASE FIELD", { fontFamily: "monospace", fontSize: "11px", color: "#9aa7b5" });
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const state = field[y][x];
      const color = state === "COMMON" ? 0xe8edf2 : state === "A_ONLY" ? 0x4cc9f0 : state === "B_ONLY" ? 0xf72585 : 0x232a33;
      g.fillStyle(color, state === "VOID" ? 0.45 : 1).fillRect(ox + x * cell, oy + y * cell, cell - 1, cell - 1);
    }
    this.add.text(748, 394,
      `A shutter source  (${this.chamber.shutterASourcePixel.x},${this.chamber.shutterASourcePixel.y})\nB shutter source  (${this.chamber.shutterBSourcePixel.x},${this.chamber.shutterBSourcePixel.y})`,
      { fontFamily: "monospace", fontSize: "11px", color: "#9aa7b5", lineSpacing: 2 });
  }

  private syncTestState(pulse: PulseSegment): void {
    const canvas = this.game.canvas;
    canvas.dataset.stage = this.finished ? "chamber2-complete" : "chamber2";
    canvas.dataset.friend = this.opts.friendLabel;
    canvas.dataset.family = this.opts.familyName;
    canvas.dataset.phase = this.phase;
    canvas.dataset.pulse = pulse;
    canvas.dataset.x = String(this.player.x);
    canvas.dataset.y = String(this.player.y);
    canvas.dataset.shutterA = String(this.chamber.shutterA.x);
    canvas.dataset.shutterB = String(this.chamber.shutterB.x);
    canvas.dataset.exitX = String(this.chamber.exit.x);
    canvas.dataset.shifts = String(this.shiftCount);
    canvas.dataset.complete = this.finished ? "true" : "false";
    canvas.dataset.fingerprint = this.chamber.fingerprint;
    canvas.dataset.baseFingerprint = this.chamber.baseFingerprint;
    canvas.dataset.minShifts = String(this.solved.minShifts ?? -1);
  }

  private drawShutter(x: number, y: number, phase: Phase, pulse: PulseSegment): void {
    const px = BOARD_X + x * CELL, py = BOARD_Y + y * CELL;
    const color = phase === "A" ? 0x4cc9f0 : 0xf72585;
    const open = (phase === "A" && pulse === "OPEN_A") || (phase === "B" && pulse === "OPEN_B");
    this.shutterGraphics.lineStyle(2, color, open ? 0.95 : 0.72).strokeRect(px + 4, py + 4, CELL - 10, CELL - 10);
    if (open) {
      this.shutterGraphics.fillStyle(color, 0.10).fillRect(px + 5, py + 5, CELL - 12, CELL - 12);
    } else if (phase === "A") {
      for (let i = 7; i < CELL - 7; i += 7) this.shutterGraphics.lineStyle(2, color, 0.85).lineBetween(px + i, py + 5, px + i, py + CELL - 7);
    } else {
      for (let i = 7; i < CELL - 7; i += 7) this.shutterGraphics.lineStyle(2, color, 0.85).lineBetween(px + 5, py + i, px + CELL - 7, py + i);
    }
  }

  private renderPulseIndicator(pulse: PulseSegment): void {
    this.pulseGraphics.clear();
    const segments: PulseSegment[] = ["TELEGRAPH_A", "OPEN_A", "TELEGRAPH_B", "OPEN_B"];
    const y = 188;
    for (let i = 0; i < segments.length; i++) {
      const active = segments[i] === pulse;
      const phaseA = segments[i].endsWith("A");
      const color = phaseA ? 0x4cc9f0 : 0xf72585;
      this.pulseGraphics.lineStyle(1, color, 0.85).strokeRect(744 + i * 43, y, 36, 10);
      if (active) this.pulseGraphics.fillStyle(color, 0.8).fillRect(746 + i * 43, y + 2, 32, 6);
    }
    this.pulseText.setText(`PULSE ${pulse.replace("_", " ")}`);
  }

  private renderDynamic(initial = false): void {
    const pulse = this.currentPulse();
    this.lastPulse = pulse;
    this.shutterGraphics.clear();
    this.drawShutter(this.chamber.shutterA.x, this.chamber.shutterA.y, "A", pulse);
    this.drawShutter(this.chamber.shutterB.x, this.chamber.shutterB.y, "B", pulse);
    this.renderPulseIndicator(pulse);

    this.friendContainer.removeAll(true);
    const rows = this.phase === "A" ? this.pair.a.rows : this.pair.b.rows;
    this.paintFriend(rows);
    this.phaseText.setText(`PHASE ${this.phase}\nFRAME ${this.phase === "A" ? this.pair.a.index : this.pair.b.index}`);
    this.syncTestState(pulse);

    if (!initial && !this.reduced) {
      this.cameras.main.flash(70, this.phase === "A" ? 76 : 247, this.phase === "A" ? 201 : 37, this.phase === "A" ? 240 : 133, false);
    }
  }

  private paintFriend(rows: FrameRows): void {
    const scale = 3;
    const cx = BOARD_X + this.player.x * CELL + CELL / 2;
    const cy = BOARD_Y + this.player.y * CELL + CELL / 2;
    const left = cx - (16 * scale) / 2, top = cy - (16 * scale) / 2;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (rows[y][x] === "#") {
      this.friendContainer.add(this.add.rectangle(left + x * scale + scale / 2, top + y * scale + scale / 2, scale + 2, scale + 2, 0xf4f6f8));
    }
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (rows[y][x] === "#") {
      this.friendContainer.add(this.add.rectangle(left + x * scale + scale / 2, top + y * scale + scale / 2, scale, scale, 0x050607));
    }
  }

  private tryMove(dx: number, dy: number): void {
    if (this.finished) return;
    const pulse = this.currentPulse();
    const x = this.player.x + dx, y = this.player.y + dy;
    if (!isTimingPassable(this.chamber, x, y, this.phase, pulse)) {
      const tile = x >= 0 && y >= 0 && x < this.chamber.width && y < this.chamber.height ? this.chamber.tiles[y][x] : "WALL";
      const reason = timingBlockReason(tile, this.phase, pulse);
      if (reason === "PHASE") this.status.setText(`BLOCKED: PHASE mismatch · SHIFT to the shutter's canonical phase.`);
      else if (reason === "TIMING") this.status.setText(`BLOCKED: TIMING window closed · wait for matching OPEN ${this.phase}.`);
      else this.status.setText("BLOCKED: chamber wall.");
      this.syncTestState(pulse);
      return;
    }
    this.player = { x, y };
    this.renderDynamic(true);
    if (x === this.chamber.exit.x && y === this.chamber.exit.y) {
      this.finished = true;
      this.renderDynamic(true);
      this.status.setText(`CHAMBER II COMPLETE · ${this.chamber.fingerprint} · ${this.shiftCount} SHIFTs · phase + timing synchronized.`);
      this.opts.onComplete?.();
    }
  }

  private shift(): void {
    if (this.finished) return;
    const pulse = this.currentPulse();
    const next = otherPhase(this.phase);
    if (!isTimingPassable(this.chamber, this.player.x, this.player.y, next, pulse)) {
      this.status.setText("SHIFT refused · destination phase would materialize a closed shutter under your Friend.");
      this.syncTestState(pulse);
      return;
    }
    this.phase = next;
    this.shiftCount++;
    this.status.setText(`SHIFT → Phase ${next} · now synchronize with OPEN ${next}.`);
    this.renderDynamic(false);
  }

  private installKeyboard(): void {
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (event.repeat) return;
      const key = event.key.toLowerCase();
      if (["arrowup","arrowdown","arrowleft","arrowright","w","a","s","d"," "].includes(key)) event.preventDefault();
      if (key === "w" || key === "arrowup") this.tryMove(0, -1);
      else if (key === "s" || key === "arrowdown") this.tryMove(0, 1);
      else if (key === "a" || key === "arrowleft") this.tryMove(-1, 0);
      else if (key === "d" || key === "arrowright") this.tryMove(1, 0);
      else if (key === " ") this.shift();
    });
  }

  private installTouchControls(): void {
    const make = (x: number, y: number, label: string, action: () => void, wide = false) => {
      const bg = this.add.rectangle(x, y, wide ? 112 : 46, 42, 0x2a313b, 0.95).setStrokeStyle(1, 0x657383).setInteractive({ useHandCursor: true });
      const text = this.add.text(x, y, label, { fontFamily: "monospace", fontSize: wide ? "13px" : "18px", color: "#f2f6f8", fontStyle: "bold" }).setOrigin(0.5);
      bg.on("pointerdown", action); text.setInteractive({ useHandCursor: true }).on("pointerdown", action);
    };
    make(700, 490, "←", () => this.tryMove(-1, 0));
    make(750, 465, "↑", () => this.tryMove(0, -1));
    make(750, 515, "↓", () => this.tryMove(0, 1));
    make(800, 490, "→", () => this.tryMove(1, 0));
    make(875, 490, "SHIFT", () => this.shift(), true);
  }
}

export function mountPhaserTiming(options: TimingOptions): PhaserTimingController {
  const scene = new TimingScene({
    chamber: options.chamber,
    pair: options.pair,
    profile: options.profile,
    solved: options.solved,
    reducedMotion: options.reducedMotion,
    friendLabel: options.friendLabel,
    familyName: options.familyName,
    onComplete: options.onComplete,
  });
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: VIEW_W,
    height: VIEW_H,
    parent: options.parent,
    backgroundColor: "#11151b",
    pixelArt: true,
    antialias: false,
    scene: [scene],
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: false, roundPixels: true },
    input: { keyboard: true, mouse: true, touch: true },
  });
  game.canvas.tabIndex = 0;
  game.canvas.setAttribute("aria-label", "RARE SHIFT Chamber II. Match phase and pulse timing. WASD or arrows move. Space shifts phase.");
  return {
    destroy: () => game.destroy(true),
    setPaused: paused => {
      scene.setRuntimePaused(paused);
      if (paused) game.scene.pause("RareShiftChamberTwo");
      else game.scene.resume("RareShiftChamberTwo");
    },
    setReducedMotion: reduced => scene.setReducedMotion(reduced),
  };
}
