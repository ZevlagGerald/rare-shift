import Phaser from "phaser";
import { prepareCR3ECheckpointScene } from "./cr3e-checkpoint-phaser-runtime.ts";
import {
  mountPhaserSurvival as mountQualifiedPhaserSurvival,
  type PhaserSurvivalController,
} from "./phaser-survival-base.ts";
import type { SelectedFramePair } from "./types.ts";

export type { PhaserSurvivalController } from "./phaser-survival-base.ts";

interface SurvivalOptions {
  parent: HTMLElement;
  pair: SelectedFramePair;
  reducedMotion: boolean;
  friendLabel: string;
  familyName: string;
}

type CaptureGamePrototype = {
  boot: (...args: unknown[]) => unknown;
};

type CR3ControlledQualificationWindow = Window & {
  __RARE_SHIFT_V23B5_SIGNAL_RANK__?: unknown;
  __RARE_SHIFT_CR3B_RUNTIME__?: unknown;
  __RARE_SHIFT_CR3D_RUNTIME__?: unknown;
};

type RuntimeScene = Phaser.Scene & Record<string, any>;
type SceneUpdateCallback = (time: number, delta: number) => void;
type RuntimeSystems = Phaser.Scenes.Systems & { sceneUpdate?: SceneUpdateCallback };

export function mountPhaserSurvival(options: SurvivalOptions): PhaserSurvivalController {
  const qualificationWindow = window as CR3ControlledQualificationWindow;
  const controlledB5SignalQualification = Number.isInteger(qualificationWindow.__RARE_SHIFT_V23B5_SIGNAL_RANK__);
  const controlledQualification = controlledB5SignalQualification
    || qualificationWindow.__RARE_SHIFT_CR3B_RUNTIME__ === true
    || qualificationWindow.__RARE_SHIFT_CR3D_RUNTIME__ === true;

  const capturedGames: Phaser.Game[] = [];
  const gamePrototype = Phaser.Game.prototype as unknown as CaptureGamePrototype;
  const previousBoot = gamePrototype.boot;

  gamePrototype.boot = function (this: Phaser.Game, ...args: unknown[]) {
    capturedGames.push(this);
    return previousBoot.apply(this, args);
  };

  let controller: PhaserSurvivalController;
  try {
    controller = mountQualifiedPhaserSurvival(options);
  } finally {
    gamePrototype.boot = previousBoot;
  }

  const game = capturedGames[0];
  if (!game) {
    controller.destroy();
    throw new Error("CR-3E.1 could not capture the qualified Phaser survival game.");
  }

  let destroyed = false;
  let attachFrame: number | null = null;
  let cleanupCheckpointRuntime = () => {};
  let cachedSceneUpdate: SceneUpdateCallback | undefined;
  let patchedSceneUpdate: SceneUpdateCallback | undefined;
  let runtimeScene: RuntimeScene | null = null;

  const restoreCheckpointRuntime = (): void => {
    if (!runtimeScene) return;
    const systems = runtimeScene.sys as RuntimeSystems;
    if (patchedSceneUpdate && systems.sceneUpdate === patchedSceneUpdate) systems.sceneUpdate = cachedSceneUpdate;
    cleanupCheckpointRuntime();
    cleanupCheckpointRuntime = () => {};
    patchedSceneUpdate = undefined;
    cachedSceneUpdate = undefined;
    runtimeScene = null;
    delete game.canvas.dataset.cr3e1CheckpointBound;
  };

  if (controlledQualification) {
    game.canvas.dataset.cr3e1CheckpointRuntime = controlledB5SignalQualification
      ? "SUPPRESSED_FOR_CONTROLLED_B5_SIGNAL_QUALIFICATION"
      : "SUPPRESSED_FOR_CONTROLLED_CR3_QUALIFICATION";
  } else {
    game.canvas.dataset.cr3e1CheckpointRuntime = "WAITING";

    const attach = (): void => {
      if (destroyed || runtimeScene) return;
      const candidate = game.scene.getScene("RareShiftV21Survival") as RuntimeScene | null;
      if (!candidate) {
        attachFrame = window.requestAnimationFrame(attach);
        return;
      }

      const systems = candidate.sys as RuntimeSystems;
      runtimeScene = candidate;
      cachedSceneUpdate = systems.sceneUpdate;
      cleanupCheckpointRuntime = prepareCR3ECheckpointScene(candidate);
      patchedSceneUpdate = candidate.update.bind(candidate) as SceneUpdateCallback;

      // Phaser Systems caches Scene.update separately from scene.update. Attach
      // only after the qualified scene is actually registered, then replace the
      // exact cached callback while preserving every frame already executed by
      // the qualified base loop. The gate initializes from observed elapsed
      // active time, so this short mount delay cannot fabricate progress.
      systems.sceneUpdate = patchedSceneUpdate;
      game.canvas.dataset.cr3e1CheckpointBound = "scene.sys.sceneUpdate";
      game.canvas.dataset.cr3e1CheckpointRuntime = "ACTIVE";
      attachFrame = null;
    };

    attachFrame = window.requestAnimationFrame(attach);
  }

  return {
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      if (attachFrame !== null) window.cancelAnimationFrame(attachFrame);
      if (controlledQualification) {
        delete game.canvas.dataset.cr3e1CheckpointRuntime;
      } else {
        restoreCheckpointRuntime();
        delete game.canvas.dataset.cr3e1CheckpointRuntime;
      }
      controller.destroy();
    },
    setPaused: paused => controller.setPaused(paused),
    setReducedMotion: reduced => controller.setReducedMotion(reduced),
  };
}
