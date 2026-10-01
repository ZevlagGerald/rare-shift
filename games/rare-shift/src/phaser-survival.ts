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
  __RARE_SHIFT_V23B5_SIGNAL_RANK__?: unknown;
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
  const controlledB5SignalQualification = Number.isInteger(qualificationWindow.__RARE_SHIFT_V23B5_SIGNAL_RANK__);
  const controlledQualification = controlledB5SignalQualification
    || qualificationWindow.__RARE_SHIFT_CR3B_RUNTIME__ === true
    || qualificationWindow.__RARE_SHIFT_CR3D_RUNTIME__ === true;

  let survivalScene: RuntimeScene | null = null;
  let qualifiedUpdate: RuntimeScene["update"] | null = null;
  let checkpointUpdate: RuntimeScene["update"] | null = null;
  let updateRewired = false;
  let rewireFrame: number | null = null;

  const captureAndRewireCheckpointUpdate = (): void => {
    if (controlledQualification || updateRewired) return;

    if (!survivalScene) {
      const candidate = game.scene.getScene("RareShiftV21Survival") as RuntimeScene | undefined;
      if (candidate && typeof candidate.update === "function") {
        survivalScene = candidate;
        qualifiedUpdate = candidate.update;
      }
    }

    if (game.canvas.dataset.cr3e1CheckpointRuntimeError) return;
    if (!survivalScene || !qualifiedUpdate || game.canvas.dataset.cr3e1CheckpointRuntime !== "ACTIVE") {
      rewireFrame = window.requestAnimationFrame(captureAndRewireCheckpointUpdate);
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

  // Schedule this before the checkpoint adapter schedules its own RAF. That
  // guarantees the first frame that exposes the survival scene captures the
  // qualified callback before the adapter replaces scene.update.
  if (!controlledQualification) {
    rewireFrame = window.requestAnimationFrame(captureAndRewireCheckpointUpdate);
  }

  const cleanupCheckpointRuntime = controlledQualification
    ? (() => {
        game.canvas.dataset.cr3e1CheckpointRuntime = controlledB5SignalQualification
          ? "SUPPRESSED_FOR_CONTROLLED_B5_SIGNAL_QUALIFICATION"
          : "SUPPRESSED_FOR_CONTROLLED_CR3_QUALIFICATION";
        return () => { delete game.canvas.dataset.cr3e1CheckpointRuntime; };
      })()
    : installCR3ECheckpointPhaserRuntime(game);

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
