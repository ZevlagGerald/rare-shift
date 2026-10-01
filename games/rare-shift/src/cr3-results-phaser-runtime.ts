import type Phaser from "phaser";
import type { DeltaProfile } from "./phase-combat-core.ts";
import type { V23WeaponFamily } from "./progression-core.ts";

interface CR3DResultsScene extends Phaser.Scene {
  hp: number;
  dead: boolean;
  evolvedWeapons: Partial<Record<V23WeaponFamily, boolean>>;
  fireDelta(profile: DeltaProfile): void;
  applyPlayerDamage(amount: number): boolean;
}

type CR3QualificationWindow = Window & {
  __RARE_SHIFT_CR3B_RUNTIME__?: unknown;
  __RARE_SHIFT_CR3D_RUNTIME__?: unknown;
};

function sceneReady(scene: CR3DResultsScene | undefined): scene is CR3DResultsScene {
  return Boolean(
    scene
    && Number.isFinite(scene.hp)
    && typeof scene.dead === "boolean"
    && typeof scene.fireDelta === "function"
    && typeof scene.applyPlayerDamage === "function"
    && typeof scene.evolvedWeapons === "object",
  );
}

function setDataset(canvas: HTMLCanvasElement, key: string, value: string | number | boolean): void {
  canvas.dataset[key] = String(value);
}

export function installCR3ResultsPhaserRuntime(game: Phaser.Game): () => void {
  const qualificationWindow = window as CR3QualificationWindow;
  const legacyBossQualification = qualificationWindow.__RARE_SHIFT_CR3B_RUNTIME__ === true
    && qualificationWindow.__RARE_SHIFT_CR3D_RUNTIME__ !== true;
  if (legacyBossQualification) {
    game.canvas.dataset.cr3dResultsRuntime = "SUPPRESSED_FOR_CR3B_QUALIFICATION";
    return () => { delete game.canvas.dataset.cr3dResultsRuntime; };
  }

  let disposed = false;
  let configured = false;
  let animationFrameId: number | null = null;
  let scene: CR3DResultsScene | undefined;
  let damageTaken = 0;
  let terminalPauseEvents = 0;
  let terminal: "" | "VICTORY" | "DEFEAT" = "";

  let originalFireDelta: CR3DResultsScene["fireDelta"] | null = null;
  let patchedFireDelta: CR3DResultsScene["fireDelta"] | null = null;
  let originalApplyPlayerDamage: CR3DResultsScene["applyPlayerDamage"] | null = null;
  let patchedApplyPlayerDamage: CR3DResultsScene["applyPlayerDamage"] | null = null;

  const evolvedList = (): string => {
    if (!scene) return "";
    return Object.entries(scene.evolvedWeapons)
      .filter((entry): entry is [string, true] => entry[1] === true)
      .map(([family]) => family)
      .sort()
      .join(",");
  };

  const syncDiagnostics = (): void => {
    const canvas = game.canvas;
    setDataset(canvas, "cr3dResultsRuntime", configured ? "ACTIVE" : "WAITING");
    setDataset(canvas, "cr3dDamageTaken", damageTaken);
    setDataset(canvas, "cr3dEvolvedWeapons", evolvedList());
    setDataset(canvas, "cr3dTerminal", terminal);
    setDataset(canvas, "cr3dTerminalPauseEvents", terminalPauseEvents);
  };

  const pauseTerminal = (outcome: "VICTORY" | "DEFEAT"): void => {
    if (!scene || terminal) return;
    terminal = outcome;
    terminalPauseEvents += 1;
    scene.scene.pause();
    syncDiagnostics();
  };

  const inspectTerminal = (): void => {
    if (!scene || terminal) return;
    if (game.canvas.dataset.cr3BossPhase === "DEFEATED" && Number(game.canvas.dataset.cr3BossDefeatEvents ?? "0") >= 1) {
      pauseTerminal("VICTORY");
      return;
    }
    if (scene.dead || game.canvas.dataset.dead === "true") pauseTerminal("DEFEAT");
  };

  const configure = (candidate: CR3DResultsScene): void => {
    scene = candidate;
    originalFireDelta = scene.fireDelta;
    originalApplyPlayerDamage = scene.applyPlayerDamage;

    patchedFireDelta = function (this: CR3DResultsScene, profile: DeltaProfile): void {
      if (terminal) return;
      originalFireDelta?.call(this, profile);
      inspectTerminal();
      syncDiagnostics();
    };
    scene.fireDelta = patchedFireDelta;

    patchedApplyPlayerDamage = function (this: CR3DResultsScene, amount: number): boolean {
      if (terminal) return false;
      const hpBefore = this.hp;
      const accepted = originalApplyPlayerDamage?.call(this, amount) ?? false;
      if (accepted) damageTaken += Math.max(0, hpBefore - this.hp);
      inspectTerminal();
      syncDiagnostics();
      return accepted;
    };
    scene.applyPlayerDamage = patchedApplyPlayerDamage;

    configured = true;
    syncDiagnostics();
  };

  const tick = (): void => {
    if (disposed) return;
    if (!configured) {
      const candidate = game.scene.getScene("RareShiftV21Survival") as CR3DResultsScene | undefined;
      if (sceneReady(candidate)) {
        try {
          configure(candidate);
        } catch (cause) {
          game.canvas.dataset.cr3dResultsRuntimeError = cause instanceof Error ? cause.message : String(cause);
          disposed = true;
          return;
        }
      }
    } else {
      inspectTerminal();
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
      if (originalApplyPlayerDamage && patchedApplyPlayerDamage && scene.applyPlayerDamage === patchedApplyPlayerDamage) scene.applyPlayerDamage = originalApplyPlayerDamage;
    }
  };
}
