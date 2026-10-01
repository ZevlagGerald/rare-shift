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

type SceneManagerPrototype = {
  add: (...args: unknown[]) => unknown;
};

type CR3ControlledQualificationWindow = Window & {
  __RARE_SHIFT_V23B5_SIGNAL_RANK__?: unknown;
  __RARE_SHIFT_CR3B_RUNTIME__?: unknown;
  __RARE_SHIFT_CR3D_RUNTIME__?: unknown;
};

type RuntimeScene = Phaser.Scene & Record<string, any>;

export function mountPhaserSurvival(options: SurvivalOptions): PhaserSurvivalController {
  const qualificationWindow = window as CR3ControlledQualificationWindow;
  const controlledB5SignalQualification = Number.isInteger(qualificationWindow.__RARE_SHIFT_V23B5_SIGNAL_RANK__);
  const controlledQualification = controlledB5SignalQualification
    || qualificationWindow.__RARE_SHIFT_CR3B_RUNTIME__ === true
    || qualificationWindow.__RARE_SHIFT_CR3D_RUNTIME__ === true;

  const capturedGames: Phaser.Game[] = [];
  const gamePrototype = Phaser.Game.prototype as unknown as CaptureGamePrototype;
  const previousBoot = gamePrototype.boot;
  const sceneManagerPrototype = Phaser.Scenes.SceneManager.prototype as unknown as SceneManagerPrototype;
  const previousAdd = sceneManagerPrototype.add;

  let cleanupCheckpointRuntime = () => {};
  let checkpointPrepared = false;

  gamePrototype.boot = function (this: Phaser.Game, ...args: unknown[]) {
    capturedGames.push(this);
    return previousBoot.apply(this, args);
  };

  sceneManagerPrototype.add = function (this: Phaser.Scenes.SceneManager, ...args: unknown[]) {
    if (!controlledQualification && !checkpointPrepared) {
      // Phaser SceneManager.add(key, sceneConfig, autoStart, data) receives the
      // already-constructed SurvivalScene instance from the qualified mount.
      // Pre-arm it before the original add() gives Systems a chance to cache
      // the scene's update callback.
      const candidate = args[1] as RuntimeScene | undefined;
      if (candidate instanceof Phaser.Scene && candidate.sys?.settings?.key === "RareShiftV21Survival") {
        cleanupCheckpointRuntime = prepareCR3ECheckpointScene(candidate);
        checkpointPrepared = true;
      }
    }
    return previousAdd.apply(this, args);
  };

  let controller: PhaserSurvivalController;
  try {
    controller = mountQualifiedPhaserSurvival(options);
  } finally {
    sceneManagerPrototype.add = previousAdd;
    gamePrototype.boot = previousBoot;
  }

  const game = capturedGames[0];
  if (!game) {
    cleanupCheckpointRuntime();
    controller.destroy();
    throw new Error("CR-3E.1 could not capture the qualified Phaser survival game.");
  }

  if (controlledQualification) {
    game.canvas.dataset.cr3e1CheckpointRuntime = controlledB5SignalQualification
      ? "SUPPRESSED_FOR_CONTROLLED_B5_SIGNAL_QUALIFICATION"
      : "SUPPRESSED_FOR_CONTROLLED_CR3_QUALIFICATION";
  } else if (!checkpointPrepared) {
    cleanupCheckpointRuntime();
    controller.destroy();
    throw new Error("CR-3E.1 did not observe the qualified SurvivalScene registration.");
  } else {
    game.canvas.dataset.cr3e1CheckpointPrearmed = "true";
  }

  let destroyed = false;
  return {
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      if (controlledQualification) delete game.canvas.dataset.cr3e1CheckpointRuntime;
      cleanupCheckpointRuntime();
      controller.destroy();
    },
    setPaused: paused => controller.setPaused(paused),
    setReducedMotion: reduced => controller.setReducedMotion(reduced),
  };
}
