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
type RuntimeSystems = Phaser.Scenes.Systems & { sceneUpdate?: (...args: unknown[]) => unknown };

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

  let cleanupCheckpointRuntime = () => {};
  let cachedSceneUpdate: RuntimeSystems["sceneUpdate"] = undefined;
  let patchedSceneUpdate: RuntimeSystems["sceneUpdate"] = undefined;
  let runtimeScene: RuntimeScene | null = null;

  if (controlledQualification) {
    game.canvas.dataset.cr3e1CheckpointRuntime = controlledB5SignalQualification
      ? "SUPPRESSED_FOR_CONTROLLED_B5_SIGNAL_QUALIFICATION"
      : "SUPPRESSED_FOR_CONTROLLED_CR3_QUALIFICATION";
  } else {
    runtimeScene = game.scene.getScene("RareShiftV21Survival") as RuntimeScene | null;
    if (!runtimeScene) {
      controller.destroy();
      throw new Error("CR-3E.1 could not locate the qualified SurvivalScene after mount.");
    }

    const systems = runtimeScene.sys as RuntimeSystems;
    cachedSceneUpdate = systems.sceneUpdate;
    cleanupCheckpointRuntime = prepareCR3ECheckpointScene(runtimeScene);
    patchedSceneUpdate = runtimeScene.update.bind(runtimeScene);

    // Phaser Systems caches Scene.update separately from scene.update. The
    // qualified scene is already mounted at this point, so bind the bounded
    // checkpoint-aware callback into that exact cache instead of rewiring
    // lifecycle events or replacing the surrounding game loop.
    systems.sceneUpdate = patchedSceneUpdate;
    game.canvas.dataset.cr3e1CheckpointBound = "scene.sys.sceneUpdate";
  }

  let destroyed = false;
  return {
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      if (controlledQualification) {
        delete game.canvas.dataset.cr3e1CheckpointRuntime;
      } else if (runtimeScene) {
        const systems = runtimeScene.sys as RuntimeSystems;
        if (patchedSceneUpdate && systems.sceneUpdate === patchedSceneUpdate) systems.sceneUpdate = cachedSceneUpdate;
        delete game.canvas.dataset.cr3e1CheckpointBound;
        cleanupCheckpointRuntime();
      }
      controller.destroy();
    },
    setPaused: paused => controller.setPaused(paused),
    setReducedMotion: reduced => controller.setReducedMotion(reduced),
  };
}
