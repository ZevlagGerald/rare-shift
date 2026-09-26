import Phaser from "phaser";
import { derivePhaseField, otherPhase } from "./phase-core.ts";
import { applySyncContact, isSyncPassable, requiredPhaseForNode } from "./sync-core.ts";
import type { FrameRows, Phase, SelectedFramePair, SyncChamber, SyncProgress, SyncSolveResult } from "./types.ts";

export interface PhaserSyncController {
  destroy(): void;
  setPaused(paused: boolean): void;
  setReducedMotion(reduced: boolean): void;
}

interface SyncOptions {
  parent: HTMLElement;
  chamber: SyncChamber;
  pair: SelectedFramePair;
  solved: SyncSolveResult;
  reducedMotion: boolean;
  friendLabel: string;
  familyName: string;
  onComplete?: () => void;
}

const VIEW_W = 960, VIEW_H = 640;
const CELL = 40, BOARD_X = 42, BOARD_Y = 150;

class SyncScene extends Phaser.Scene {
  private chamber!: SyncChamber;
  private pair!: SelectedFramePair;
  private solved!: SyncSolveResult;
  private phase: Phase = "B";
  private player = { x: 0, y: 0 };
  private nextNode: SyncProgress = 0;
  private friendContainer!: Phaser.GameObjects.Container;
  private dynamicGraphics!: Phaser.GameObjects.Graphics;
  private status!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private syncText!: Phaser.GameObjects.Text;
  private reduced = false;
  private finished = false;
  private shiftCount = 0;

  constructor(private readonly opts: Omit<SyncOptions, "parent">) {
    super({ key: "RareShiftChamberThree" });
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
    this.add.text(42, 68, "CHAMBER III // SYNCHRONIZE", { fontFamily: "monospace", fontSize: "14px", color: "#8b98a7" });
    this.add.text(42, 100,
      `Friend #${this.opts.friendLabel} · ${this.opts.familyName} · frames ${this.pair.a.index} ↔ ${this.pair.b.index} · sync proof ${this.chamber.fingerprint}`,
      { fontFamily: "monospace", fontSize: "13px", color: "#b7c2ce" });
    this.status = this.add.text(42, 127,
      "Route the canonical signal in order: B Node 1 → A Node 2 → B Node 3 → EXIT.",
      { fontFamily: "monospace", fontSize: "11px", color: "#cbd4dc", wordWrap: { width: 650 } });

    this.drawBoard();
    this.drawPhaseField();
    this.dynamicGraphics = this.add.graphics();
    this.friendContainer = this.add.container(0, 0);
    this.phaseText = this.add.text(744, 118, "", { fontFamily: "monospace", fontSize: "18px", color: "#f2f6f8", fontStyle: "bold" });
    this.syncText = this.add.text(744, 166, "", { fontFamily: "monospace", fontSize: "13px", color: "#c7d1da", fontStyle: "bold" });

    this.renderDynamic(true);
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
    for (let index = 0; index < this.chamber.nodes.length; index++) {
      const node = this.chamber.nodes[index];
      const px = BOARD_X + node.x * CELL, py = BOARD_Y + node.y * CELL;
      this.add.text(px + 12, py + 11, String(index + 1), {
        fontFamily: "monospace", fontSize: "14px", color: "#f2f6f8", fontStyle: "bold",
      }).setDepth(5);
    }
    const exitX = BOARD_X + this.chamber.exit.x * CELL, exitY = BOARD_Y + this.chamber.exit.y * CELL;
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
    const [s1, s2, s3] = this.chamber.nodeSourcePixels;
    this.add.text(748, 394,
      `N1 B source  (${s1.x},${s1.y})\nN2 A source  (${s2.x},${s2.y})\nN3 B source  (${s3.x},${s3.y})`,
      { fontFamily: "monospace", fontSize: "11px", color: "#9aa7b5", lineSpacing: 2 });
  }

  private nodeCenter(index: number): { x: number; y: number } {
    const node = this.chamber.nodes[index];
    return { x: BOARD_X + node.x * CELL + CELL / 2 - 1, y: BOARD_Y + node.y * CELL + CELL / 2 - 1 };
  }

  private renderDynamic(initial = false): void {
    this.dynamicGraphics.clear();

    const centers = this.chamber.nodes.map((_, index) => this.nodeCenter(index));
    const exitCenter = {
      x: BOARD_X + this.chamber.exit.x * CELL + CELL / 2 - 1,
      y: BOARD_Y + this.chamber.exit.y * CELL + CELL / 2 - 1,
    };
    const route = [...centers, exitCenter];
    for (let index = 0; index < route.length - 1; index++) {
      const lit = this.nextNode > index;
      this.dynamicGraphics.lineStyle(lit ? 4 : 2, lit ? 0xe8edf2 : 0x4b5663, lit ? 0.9 : 0.45)
        .lineBetween(route[index].x, route[index].y, route[index + 1].x, route[index + 1].y);
    }

    for (let index = 0; index < this.chamber.nodes.length; index++) {
      const node = this.chamber.nodes[index];
      const px = BOARD_X + node.x * CELL, py = BOARD_Y + node.y * CELL;
      const phase = requiredPhaseForNode(index as 0 | 1 | 2);
      const color = phase === "A" ? 0x4cc9f0 : 0xf72585;
      const synced = index < this.nextNode;
      const ready = index === this.nextNode;
      this.dynamicGraphics.lineStyle(synced ? 4 : 2, synced ? 0xe8edf2 : color, ready ? 1 : 0.72)
        .strokeRect(px + 4, py + 4, CELL - 10, CELL - 10);
      if (synced) this.dynamicGraphics.fillStyle(0xe8edf2, 0.25).fillRect(px + 6, py + 6, CELL - 14, CELL - 14);
      else if (phase === "A") {
        for (let stripe = 8; stripe < CELL - 7; stripe += 7) this.dynamicGraphics.lineStyle(2, color, 0.8).lineBetween(px + stripe, py + 6, px + stripe, py + CELL - 8);
      } else {
        for (let stripe = 8; stripe < CELL - 7; stripe += 7) this.dynamicGraphics.lineStyle(2, color, 0.8).lineBetween(px + 6, py + stripe, px + CELL - 8, py + stripe);
      }
    }

    const exitX = BOARD_X + this.chamber.exit.x * CELL, exitY = BOARD_Y + this.chamber.exit.y * CELL;
    const exitOpen = this.nextNode === 3;
    this.dynamicGraphics.lineStyle(3, exitOpen ? 0xe9eef4 : 0x657383, exitOpen ? 0.95 : 0.55)
      .strokeRect(exitX + 5, exitY + 5, CELL - 12, CELL - 12);
    if (!exitOpen) {
      this.dynamicGraphics.lineStyle(2, 0x657383, 0.7)
        .lineBetween(exitX + 8, exitY + 8, exitX + CELL - 10, exitY + CELL - 10)
        .lineBetween(exitX + CELL - 10, exitY + 8, exitX + 8, exitY + CELL - 10);
    }

    this.friendContainer.removeAll(true);
    const rows = this.phase === "A" ? this.pair.a.rows : this.pair.b.rows;
    this.paintFriend(rows);
    this.phaseText.setText(`PHASE ${this.phase}\nFRAME ${this.phase === "A" ? this.pair.a.index : this.pair.b.index}`);
    this.syncText.setText(`SYNC ${this.nextNode}/3${this.nextNode === 3 ? " · EXIT OPEN" : ` · NEXT ${this.nextNode + 1}`}`);
    this.syncTestState();

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

  private syncTestState(): void {
    const canvas = this.game.canvas;
    canvas.dataset.stage = this.finished ? "chamber3-complete" : "chamber3";
    canvas.dataset.friend = this.opts.friendLabel;
    canvas.dataset.family = this.opts.familyName;
    canvas.dataset.phase = this.phase;
    canvas.dataset.x = String(this.player.x);
    canvas.dataset.y = String(this.player.y);
    canvas.dataset.nextNode = String(this.nextNode);
    canvas.dataset.syncCount = String(this.nextNode);
    canvas.dataset.node1X = String(this.chamber.nodes[0].x);
    canvas.dataset.node1Y = String(this.chamber.nodes[0].y);
    canvas.dataset.node2X = String(this.chamber.nodes[1].x);
    canvas.dataset.node2Y = String(this.chamber.nodes[1].y);
    canvas.dataset.node3X = String(this.chamber.nodes[2].x);
    canvas.dataset.node3Y = String(this.chamber.nodes[2].y);
    canvas.dataset.exitX = String(this.chamber.exit.x);
    canvas.dataset.exitY = String(this.chamber.exit.y);
    canvas.dataset.shifts = String(this.shiftCount);
    canvas.dataset.complete = this.finished ? "true" : "false";
    canvas.dataset.fingerprint = this.chamber.fingerprint;
    canvas.dataset.baseFingerprint = this.chamber.baseFingerprint;
    canvas.dataset.minShifts = String(this.solved.minShifts ?? -1);
  }

  private tryMove(dx: number, dy: number): void {
    if (this.finished) return;
    const x = this.player.x + dx, y = this.player.y + dy;
    if (!isSyncPassable(this.chamber, x, y, this.nextNode)) {
      const isExit = x === this.chamber.exit.x && y === this.chamber.exit.y;
      this.status.setText(isExit ? `EXIT SEALED · SYNC ${this.nextNode}/3 required.` : "BLOCKED: chamber wall.");
      this.syncTestState();
      return;
    }

    this.player = { x, y };
    const contact = applySyncContact(this.chamber, x, y, this.phase, this.nextNode);
    this.nextNode = contact.nextNode;
    if (contact.event === "SYNCED") {
      this.status.setText(`NODE ${(contact.nodeIndex ?? 0) + 1} SYNCHRONIZED · SYNC ${this.nextNode}/3.`);
    } else if (contact.event === "PHASE_MISMATCH") {
      const index = contact.nodeIndex ?? 0;
      this.status.setText(`PHASE MISMATCH · Node ${index + 1} requires Phase ${requiredPhaseForNode(index)}.`);
    } else if (contact.event === "SIGNAL_NOT_ROUTED") {
      this.status.setText(`SIGNAL NOT ROUTED · synchronize Node ${this.nextNode + 1} first.`);
    } else if (contact.event === "ALREADY_SYNCED") {
      this.status.setText(`Node ${(contact.nodeIndex ?? 0) + 1} already synchronized · SYNC ${this.nextNode}/3.`);
    }
    this.renderDynamic(true);

    if (x === this.chamber.exit.x && y === this.chamber.exit.y && this.nextNode === 3) {
      this.finished = true;
      this.renderDynamic(true);
      this.status.setText(`CHAMBER III COMPLETE · ${this.chamber.fingerprint} · 3/3 SYNCHRONIZED · ${this.shiftCount} SHIFTs.`);
      this.opts.onComplete?.();
    }
  }

  private shift(): void {
    if (this.finished) return;
    this.phase = otherPhase(this.phase);
    this.shiftCount++;
    this.status.setText(`SHIFT → Phase ${this.phase} · route the next canonical node.`);
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

export function mountPhaserSync(options: SyncOptions): PhaserSyncController {
  const scene = new SyncScene({
    chamber: options.chamber,
    pair: options.pair,
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
  game.canvas.setAttribute("aria-label", "RARE SHIFT Chamber III. Synchronize B, A, B nodes in order. WASD or arrows move. Space shifts phase.");
  return {
    destroy: () => game.destroy(true),
    setPaused: paused => {
      if (paused) game.scene.pause("RareShiftChamberThree");
      else game.scene.resume("RareShiftChamberThree");
    },
    setReducedMotion: reduced => scene.setReducedMotion(reduced),
  };
}
