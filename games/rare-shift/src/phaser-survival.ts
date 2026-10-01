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

type RuntimeScene = Phaser.Scene & {
  update: (time: number, delta: number) => void;
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

  let survivalScene: RuntimeScene | null = null;
  let qualifiedUpdate: RuntimeScene["update"] | null = null;
  let checkpointUpdate: RuntimeScene["update"] | null = null;
  let updateRewired = false;
  let rewireFrame: number | null = null;

  if (!controlledCR3Qualification) {
    const candidate = game.scene.getScene("RareShiftV21Survival") as RuntimeScene | undefined;
    if (!candidate || typeof candidate.update !== "function") {
      controller.destroy();
      throw new Error("CR-3E.1 could not resolve the qualified survival scene before runtime installation.");
    }
    survivalScene = candidate;
    qualifiedUpdate = candidate.update;
  }

  const cleanupCheckpointRuntime = controlledCR3Qualification
    ? (() => {
        game.canvas.dataset.cr3e1CheckpointRuntime = "SUPPRESSED_FOR_CONTROLLED_CR3_QUALIFICATION";
        return () => { delete game.canvas.dataset.cr3e1CheckpointRuntime; };
      })()
    : installCR3ECheckpointPhaserRuntime(game);

  const rewireCheckpointUpdate = (): void => {
    if (!survivalScene || !qualifiedUpdate || updateRewired) return;
    if (game.canvas.dataset.cr3e1CheckpointRuntimeError) return;
    if (game.canvas.dataset.cr3e1CheckpointRuntime !== "ACTIVE") {
      rewireFrame = window.requestAnimationFrame(rewireCheckpointUpdate);
      return;
    }

    checkpointUpdate = survivalScene.update;
    if (checkpointUpdate === qualifiedUpdate) {
      game.canvas.dataset.cr3e1CheckpointRuntimeError = "CR-3E.1 adapter reached ACTIVE without replacing the scene update callback.";
      return;
    }

    const events = survivalScene.sys.events;
    const registered = events.listeners("update");
    if (!registered.includes(qualifiedUpdate)) {
      game.canvas.dataset.cr3e1CheckpointRuntimeError = "CR-3E.1 could not find the qualified Phaser update listener to replace.";
      return;
    }

    events.off("update", qualifiedUpdate, survivalScene);
    events.off("update", qualifiedUpdate);
    events.on("update", checkpointUpdate, survivalScene);
    updateRewired = true;
    game.canvas.dataset.cr3e1CheckpointUpdateRewired = "true";
  };

  if (!controlledCR3Qualification) rewireFrame = window.requestAnimationFrame(rewireCheckpointUpdate);

  let destroyed = false;
  return {
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      if (rewireFrame !== null) window.cancelAnimationFrame(rewireFrame);
      if (updateRewired && survivalScene && qualifiedUpdate && checkpointUpdate) {
        const events = survivalScene.sys.events;
        events.off("update", checkpointUpdate, survivalScene);
        events.off("update", checkpointUpdate);
        events.on("update", qualifiedUpdate, survivalScene);
      }
      delete game.canvas.dataset.cr3e1CheckpointUpdateRewired;
      cleanupCheckpointRuntime();
      controller.destroy();
    },
    setPaused: paused => controller.setPaused(paused),
    setReducedMotion: reduced => controller.setReducedMotion(reduced),
  };
}
