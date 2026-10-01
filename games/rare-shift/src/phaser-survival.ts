import Phaser from "phaser";
import { installCR3ECheckpointPhaserRuntime } from "./cr3e-checkpoint-phaser-runtime.ts";
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
  __RARE_SHIFT_CR3B_RUNTIME__?: unknown;
  __RARE_SHIFT_CR3D_RUNTIME__?: unknown;
};

export function mountPhaserSurvival(options: SurvivalOptions): PhaserSurvivalController {
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

  const qualificationWindow = window as CR3ControlledQualificationWindow;
  const controlledCR3Qualification = qualificationWindow.__RARE_SHIFT_CR3B_RUNTIME__ === true
    || qualificationWindow.__RARE_SHIFT_CR3D_RUNTIME__ === true;
  const cleanupCheckpointRuntime = controlledCR3Qualification
    ? (() => {
        game.canvas.dataset.cr3e1CheckpointRuntime = "SUPPRESSED_FOR_CONTROLLED_CR3_QUALIFICATION";
        return () => { delete game.canvas.dataset.cr3e1CheckpointRuntime; };
      })()
    : installCR3ECheckpointPhaserRuntime(game);

  let destroyed = false;
  return {
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      cleanupCheckpointRuntime();
      controller.destroy();
    },
    setPaused: paused => controller.setPaused(paused),
    setReducedMotion: reduced => controller.setReducedMotion(reduced),
  };
}
