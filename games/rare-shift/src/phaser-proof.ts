import Phaser from "phaser";
import { derivePhaseField, isPassable, otherPhase } from "./phase-core.ts";
import type { FrameRows, Phase, ProofChamber, SelectedFramePair, SolveResult } from "./types.ts";

export interface PhaserProofController {
  destroy(): void;
  setPaused(paused: boolean): void;
  setReducedMotion(reduced: boolean): void;
}

interface ProofOptions {
  parent: HTMLElement;
  chamber: ProofChamber;
  pair: SelectedFramePair;
  solved: SolveResult;
  reducedMotion: boolean;
  friendLabel: string;
  familyName: string;
}

const VIEW_W = 960, VIEW_H = 640;
const CELL = 40, BOARD_X = 42, BOARD_Y = 150;

class ProofScene extends Phaser.Scene {
  private chamber!: ProofChamber;
  private pair!: SelectedFramePair;
  private solved!: SolveResult;
  private phase: Phase = "B";
  private player = { x: 0, y: 0 };
  private friendContainer!: Phaser.GameObjects.Container;
  private gates!: Phaser.GameObjects.Graphics;
  private status!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private reduced = false;
  private finished = false;
  private shiftCount = 0;

  constructor(private readonly opts: Omit<ProofOptions, "parent">) {
    super({ key: "RareShiftChamberOne" });
  }

  create(): void {
    this.chamber = this.opts.chamber;
    this.pair = this.opts.pair;
    this.solved = this.opts.solved;
    this.phase = this.chamber.startPhase;
    this.player = { ...this.chamber.start };
    this.reduced = this.opts.reducedMotion;

    this.cameras.main.setBackgroundColor("#11151b");
    this.add.text(42, 28, "RARE//SHIFT", { fontFamily: "monospace", fontSize: "30px", color: "#f2f6f8", fontStyle: "bold" });
    this.add.text(42, 68, "CHAMBER I // DISCOVER", { fontFamily: "monospace", fontSize: "14px", color: "#8b98a7" });
    this.add.text(42, 100,
      `Friend #${this.opts.friendLabel} · ${this.opts.familyName} · canonical frames ${this.pair.a.index} ↔ ${this.pair.b.index} · proof ${this.chamber.fingerprint}`,
      { fontFamily: "monospace", fontSize: "13px", color: "#b7c2ce" });

    this.drawBoard();
    this.drawPhaseField();
    this.gates = this.add.graphics();
    this.friendContainer = this.add.container(0, 0);
    this.status = this.add.text(42, 548,
      "Reach EXIT. Move with WASD/arrows. When a phase gate blocks the path, press SPACE to SHIFT.",
      { fontFamily: "monospace", fontSize: "14px", color: "#cbd4dc", wordWrap: { width: 650 } });
    this.phaseText = this.add.text(744, 118, "", { fontFamily: "monospace", fontSize: "18px", color: "#f2f6f8", fontStyle: "bold" });

    this.renderDynamic(true);
    this.syncTestState();
    this.installKeyboard();
    this.installTouchControls();
  }

  setReducedMotion(reduced: boolean): void { this.reduced = reduced; }

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
    const ox = 748, oy = 196, cell = 10;
    this.add.text(748, 174, "PHASE FIELD", { fontFamily: "monospace", fontSize: "12px", color: "#9aa7b5" });
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const state = field[y][x];
      const color = state === "COMMON" ? 0xe8edf2 : state === "A_ONLY" ? 0x4cc9f0 : state === "B_ONLY" ? 0xf72585 : 0x232a33;
      g.fillStyle(color, state === "VOID" ? 0.45 : 1).fillRect(ox + x * cell, oy + y * cell, cell - 1, cell - 1);
    }
    this.add.text(748, 366, "cyan  A-only\nmagenta  B-only\nwhite  common", { fontFamily: "monospace", fontSize: "11px", color: "#9aa7b5", lineSpacing: 4 });
    this.add.text(748, 431,
      `A gate source  (${this.chamber.gateASourcePixel.x},${this.chamber.gateASourcePixel.y})\nB gate source  (${this.chamber.gateBSourcePixel.x},${this.chamber.gateBSourcePixel.y})`,
      { fontFamily: "monospace", fontSize: "11px", color: "#9aa7b5", lineSpacing: 4 });
  }

  private syncTestState(): void {
    const canvas = this.game.canvas;
    canvas.dataset.stage = this.finished ? "chamber1-complete" : "chamber1";
    canvas.dataset.friend = this.opts.friendLabel;
    canvas.dataset.family = this.opts.familyName;
    canvas.dataset.phase = this.phase;
    canvas.dataset.x = String(this.player.x);
    canvas.dataset.y = String(this.player.y);
    canvas.dataset.gateA = String(this.chamber.gateA.x);
    canvas.dataset.gateB = String(this.chamber.gateB.x);
    canvas.dataset.exitX = String(this.chamber.exit.x);
    canvas.dataset.shifts = String(this.shiftCount);
    canvas.dataset.complete = this.finished ? "true" : "false";
    canvas.dataset.fingerprint = this.chamber.fingerprint;
    canvas.dataset.minShifts = String(this.solved.minShifts ?? -1);
  }

  private renderDynamic(initial = false): void {
    this.gates.clear();
    const drawGate = (x: number, y: number, phase: Phase, active: boolean) => {
      const px = BOARD_X + x * CELL, py = BOARD_Y + y * CELL;
      const color = phase === "A" ? 0x4cc9f0 : 0xf72585;
      if (active) {
        this.gates.lineStyle(2, color, 0.85).strokeRect(px + 7, py + 7, CELL - 16, CELL - 16);
        this.gates.fillStyle(color, 0.18).fillRect(px + 7, py + 7, CELL - 16, CELL - 16);
      } else {
        this.gates.fillStyle(color, 0.85).fillRect(px + 3, py + 3, CELL - 8, CELL - 8);
        for (let i = 6; i < CELL - 6; i += 7) this.gates.lineStyle(2, 0x11151b, 0.8).lineBetween(px + i, py + 4, px + i, py + CELL - 7);
      }
    };
    drawGate(this.chamber.gateA.x, this.chamber.gateA.y, "A", this.phase === "A");
    drawGate(this.chamber.gateB.x, this.chamber.gateB.y, "B", this.phase === "B");

    this.friendContainer.removeAll(true);
    const rows = this.phase === "A" ? this.pair.a.rows : this.pair.b.rows;
    this.paintFriend(rows);
    this.phaseText.setText(`PHASE ${this.phase}\nFRAME ${this.phase === "A" ? this.pair.a.index : this.pair.b.index}`);
    this.syncTestState();

    if (!initial && !this.reduced) this.cameras.main.flash(90, this.phase === "A" ? 76 : 247, this.phase === "A" ? 201 : 37, this.phase === "A" ? 240 : 133, false);
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
    const x = this.player.x + dx, y = this.player.y + dy;
    if (!isPassable(this.chamber, x, y, this.phase)) {
      this.status.setText(`BLOCKED in Phase ${this.phase}. SHIFT changes which canonical-pixel gate is solid.`);
      return;
    }
    this.player = { x, y };
    this.renderDynamic(true);
    if (x === this.chamber.exit.x && y === this.chamber.exit.y) {
      this.finished = true;
      this.syncTestState();
      this.status.setText(`CHAMBER I COMPLETE · ${this.chamber.fingerprint} · your canonical frame state rewrote collision · ${this.shiftCount} SHIFTs.`);
    }
  }

  private shift(): void {
    if (this.finished) return;
    const next = otherPhase(this.phase);
    if (!isPassable(this.chamber, this.player.x, this.player.y, next)) {
      this.status.setText("SHIFT refused: the destination phase would materialize collision under your Friend.");
      return;
    }
    this.phase = next;
    this.shiftCount++;
    this.status.setText(`SHIFT → Phase ${next}. World collision now follows canonical frame ${next === "A" ? this.pair.a.index : this.pair.b.index}.`);
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
    make(700, 555, "←", () => this.tryMove(-1, 0));
    make(750, 530, "↑", () => this.tryMove(0, -1));
    make(750, 580, "↓", () => this.tryMove(0, 1));
    make(800, 555, "→", () => this.tryMove(1, 0));
    make(875, 555, "SHIFT", () => this.shift(), true);
  }
}

export function mountPhaserProof(options: ProofOptions): PhaserProofController {
  const scene = new ProofScene({
    chamber: options.chamber,
    pair: options.pair,
    solved: options.solved,
    reducedMotion: options.reducedMotion,
    friendLabel: options.friendLabel,
    familyName: options.familyName,
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
  game.canvas.setAttribute("aria-label", "RARE SHIFT Chamber I. WASD or arrows move. Space shifts phase.");
  return {
    destroy: () => game.destroy(true),
    setPaused: paused => paused ? game.scene.pause("RareShiftChamberOne") : game.scene.resume("RareShiftChamberOne"),
    setReducedMotion: reduced => scene.setReducedMotion(reduced),
  };
}
