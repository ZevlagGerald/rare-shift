import type Phaser from "phaser";
import {
  CR3_DESYNC_PROVISIONAL_PROFILE,
  advanceCR3Desync,
  applyCR3BossDamage,
  applyCR3ShiftResponse,
  createCR3DesyncState,
  isCR3BreakOpen,
  type CR3DamageRejection,
  type CR3DesyncState,
} from "./cr3-desync-core.ts";
import { deltaHitsTarget, type DeltaProfile } from "./phase-combat-core.ts";
import { V21_WORLD_HEIGHT, V21_WORLD_WIDTH } from "./survival-core.ts";
import type { Phase } from "./types.ts";

interface CR3RuntimeScene extends Phaser.Scene {
  seed: number;
  phase: Phase;
  reduced: boolean;
  friend: Phaser.GameObjects.Container;
  elapsedActiveMs: number;
  bossPending: boolean;
  dead: boolean;
  draftOpen: boolean;
  shifts: number;
  statusText: Phaser.GameObjects.Text;
  fireDelta(profile: DeltaProfile): void;
  shift(): void;
  syncTestState(): void;
}

const BOSS_X = V21_WORLD_WIDTH / 2;
const BOSS_Y = V21_WORLD_HEIGHT / 2 - 180;

function sceneReady(scene: CR3RuntimeScene | undefined): scene is CR3RuntimeScene {
  return Boolean(
    scene
    && scene.friend
    && typeof scene.fireDelta === "function"
    && typeof scene.shift === "function"
    && typeof scene.syncTestState === "function"
    && typeof scene.bossPending === "boolean"
    && Number.isFinite(scene.elapsedActiveMs),
  );
}

function setDataset(canvas: HTMLCanvasElement, name: string, value: string | number | boolean): void {
  canvas.dataset[name] = String(value);
}

function bossTone(phase: Phase): number {
  return phase === "A" ? 0x4cc9f0 : 0xf72585;
}

export function installCR3DesyncPhaserRuntime(game: Phaser.Game): () => void {
  let scene: CR3RuntimeScene | undefined;
  let disposed = false;
  let configured = false;
  let animationFrameId: number | null = null;

  let bossState: CR3DesyncState | null = null;
  let bossView: Phaser.GameObjects.Container | null = null;
  let bossHealth: Phaser.GameObjects.Graphics | null = null;
  let bossHud: Phaser.GameObjects.Text | null = null;

  let originalFireDelta: CR3RuntimeScene["fireDelta"] | null = null;
  let patchedFireDelta: CR3RuntimeScene["fireDelta"] | null = null;
  let originalShift: CR3RuntimeScene["shift"] | null = null;
  let patchedShift: CR3RuntimeScene["shift"] | null = null;

  let acceptedDamageEvents = 0;
  let rejectedDamageEvents = 0;
  let acceptedShiftResponses = 0;
  let rejectedShiftResponses = 0;
  let defeatEvents = 0;
  let lastDamageRejection: CR3DamageRejection | "OUT_OF_GEOMETRY" = "NONE";

  const syncDiagnostics = (): void => {
    if (!configured || !scene) return;
    const canvas = game.canvas;
    setDataset(canvas, "cr3RuntimeAdapter", "ACTIVE");
    setDataset(canvas, "cr3BossActive", bossState !== null && bossState.phase !== "DEFEATED");
    setDataset(canvas, "cr3BossX", BOSS_X);
    setDataset(canvas, "cr3BossY", BOSS_Y);
    setDataset(canvas, "cr3BossDamageAccepted", acceptedDamageEvents);
    setDataset(canvas, "cr3BossDamageRejected", rejectedDamageEvents);
    setDataset(canvas, "cr3BossLastDamageRejection", lastDamageRejection);
    setDataset(canvas, "cr3BossShiftAccepted", acceptedShiftResponses);
    setDataset(canvas, "cr3BossShiftRejected", rejectedShiftResponses);
    setDataset(canvas, "cr3BossDefeatEvents", defeatEvents);
    if (!bossState) {
      setDataset(canvas, "cr3BossPhase", "");
      setDataset(canvas, "cr3BossHp", "");
      setDataset(canvas, "cr3BossMaxHp", CR3_DESYNC_PROVISIONAL_PROFILE.maxHp);
      setDataset(canvas, "cr3BossVulnerability", "");
      setDataset(canvas, "cr3BossExpectedResponse", "");
      setDataset(canvas, "cr3BossBreakOpen", false);
      setDataset(canvas, "cr3BossCycleOrdinal", "");
      setDataset(canvas, "cr3BossAttack", "");
      return;
    }
    setDataset(canvas, "cr3BossPhase", bossState.phase);
    setDataset(canvas, "cr3BossHp", bossState.hp);
    setDataset(canvas, "cr3BossMaxHp", bossState.maxHp);
    setDataset(canvas, "cr3BossVulnerability", bossState.vulnerability);
    setDataset(canvas, "cr3BossExpectedResponse", bossState.expectedResponse ?? "");
    setDataset(canvas, "cr3BossBreakOpen", isCR3BreakOpen(bossState, scene.elapsedActiveMs));
    setDataset(canvas, "cr3BossCycleOrdinal", bossState.cycleOrdinal);
    setDataset(canvas, "cr3BossAttack", bossState.attack);
  };

  const paintBoss = (): void => {
    if (!scene || !bossState) return;
    if (!bossView) bossView = scene.add.container(BOSS_X, BOSS_Y).setDepth(34);
    if (!bossHealth) bossHealth = scene.add.graphics().setDepth(35);
    if (!bossHud) {
      bossHud = scene.add.text(480, 142, "", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#e8edf2",
        backgroundColor: "#0b0e12",
        padding: { x: 9, y: 5 },
        fontStyle: "bold",
        align: "center",
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(116);
    }

    bossView.removeAll(true);
    const defeated = bossState.phase === "DEFEATED";
    const breakOpen = !defeated && isCR3BreakOpen(bossState, scene.elapsedActiveMs);
    const tone = bossTone(bossState.vulnerability);
    bossView.setPosition(BOSS_X, BOSS_Y).setVisible(!defeated).setAlpha(defeated ? 0 : 1);
    if (!defeated) {
      bossView.add(scene.add.rectangle(0, 0, 92, 92, 0x050607, 0.96).setStrokeStyle(3, tone, 0.92).setRotation(Math.PI / 4));
      bossView.add(scene.add.rectangle(0, 0, 62, 62, 0x000000, 0).setStrokeStyle(2, 0xe8edf2, breakOpen ? 0.95 : 0.35));
      bossView.add(scene.add.circle(0, 0, 18, tone, breakOpen ? 0.72 : 0.28).setStrokeStyle(2, 0xe8edf2, 0.82));
      bossView.add(scene.add.rectangle(-44, 0, 8, 34, tone, 0.82));
      bossView.add(scene.add.rectangle(44, 0, 8, 34, tone, 0.82));
    }

    const ratio = Math.max(0, Math.min(1, bossState.hp / Math.max(1, bossState.maxHp)));
    bossHealth.clear().setScrollFactor(0).setDepth(117);
    bossHealth.fillStyle(0x202832, 0.96).fillRect(280, 170, 400, 8);
    bossHealth.fillStyle(defeated ? 0x657383 : tone, 1).fillRect(280, 170, 400 * ratio, 8);

    const stateLabel = defeated
      ? "DEFEATED"
      : bossState.phase === "BREAK_WINDOW"
        ? breakOpen
          ? `BREAK OPEN · PHASE ${bossState.vulnerability}`
          : `BREAK TELL · SHIFT → ${bossState.expectedResponse ?? "?"}`
        : `${bossState.phase.replace("_", "-")} · VULNERABLE ${bossState.vulnerability}`;
    bossHud.setText(`THE DESYNC // ${stateLabel} // ${bossState.hp}/${bossState.maxHp}`);
  };

  const initializeBoss = (): void => {
    if (!scene || bossState) return;
    bossState = createCR3DesyncState((scene.seed ^ 0x43523342) >>> 0, scene.elapsedActiveMs);
    scene.statusText?.setText("THE DESYNC // phase authority detected.");
    paintBoss();
    syncDiagnostics();
  };

  const applyDeltaToBoss = (profile: DeltaProfile): void => {
    if (!scene || !bossState || bossState.phase === "DEFEATED" || scene.dead || scene.draftOpen) return;
    if (!deltaHitsTarget(profile, BOSS_X - scene.friend.x, BOSS_Y - scene.friend.y)) {
      lastDamageRejection = "OUT_OF_GEOMETRY";
      rejectedDamageEvents += 1;
      syncDiagnostics();
      return;
    }

    const result = applyCR3BossDamage(bossState, {
      source: "WEAPON",
      attackPhase: profile.phase,
      amount: profile.damage,
      atMs: scene.elapsedActiveMs,
    });
    bossState = result.state;
    lastDamageRejection = result.rejection;
    if (result.accepted) acceptedDamageEvents += 1;
    else rejectedDamageEvents += 1;
    if (result.defeatedNow) {
      defeatEvents += 1;
      scene.statusText?.setText("THE DESYNC COLLAPSED // ending transition pending.");
    }
    paintBoss();
    syncDiagnostics();
  };

  const applyShiftToBoss = (shiftsBefore: number): void => {
    if (!scene || !bossState || scene.shifts === shiftsBefore || bossState.phase !== "BREAK_WINDOW" || bossState.phase === "DEFEATED") return;
    if (isCR3BreakOpen(bossState, scene.elapsedActiveMs)) return;
    const result = applyCR3ShiftResponse(bossState, scene.phase, scene.elapsedActiveMs);
    bossState = result.state;
    if (result.accepted) {
      acceptedShiftResponses += 1;
      scene.statusText?.setText(`THE DESYNC // BREAK OPEN · Phase ${scene.phase}.`);
    } else {
      rejectedShiftResponses += 1;
    }
    paintBoss();
    syncDiagnostics();
  };

  const configure = (candidate: CR3RuntimeScene): void => {
    scene = candidate;
    originalFireDelta = scene.fireDelta;
    originalShift = scene.shift;

    patchedFireDelta = function (this: CR3RuntimeScene, profile: DeltaProfile): void {
      originalFireDelta?.call(this, profile);
      applyDeltaToBoss(profile);
    };
    scene.fireDelta = patchedFireDelta;

    patchedShift = function (this: CR3RuntimeScene): void {
      const shiftsBefore = this.shifts;
      originalShift?.call(this);
      applyShiftToBoss(shiftsBefore);
    };
    scene.shift = patchedShift;

    configured = true;
    syncDiagnostics();
  };

  const tick = (): void => {
    if (disposed) return;
    if (!configured) {
      const candidate = game.scene.getScene("RareShiftV21Survival") as CR3RuntimeScene | undefined;
      if (sceneReady(candidate)) {
        try {
          configure(candidate);
        } catch (cause) {
          game.canvas.dataset.cr3RuntimeError = cause instanceof Error ? cause.message : String(cause);
          disposed = true;
          return;
        }
      }
    } else if (scene) {
      if (scene.bossPending && !bossState) initializeBoss();
      if (bossState && bossState.phase !== "DEFEATED") {
        const advanced = advanceCR3Desync(bossState, scene.elapsedActiveMs);
        if (advanced !== bossState) bossState = advanced;
      }
      if (bossState) paintBoss();
      syncDiagnostics();
    }
    animationFrameId = window.requestAnimationFrame(tick);
  };

  animationFrameId = window.requestAnimationFrame(tick);

  return () => {
    disposed = true;
    if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
    if (scene) {
      if (originalFireDelta && patchedFireDelta && scene.fireDelta === patchedFireDelta) scene.fireDelta = originalFireDelta;
      if (originalShift && patchedShift && scene.shift === patchedShift) scene.shift = originalShift;
    }
    bossView?.destroy(true);
    bossHealth?.destroy();
    bossHud?.destroy();
    bossState = null;
  };
}
