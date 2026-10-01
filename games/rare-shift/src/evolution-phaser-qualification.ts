import type Phaser from "phaser";
import {
  buildReconstructionCommonProfile,
  canScheduleReconstructionCommon,
  isReconstructionCommonTargetEligible,
  reconstructionCommonHitsTarget,
  type ReconstructionCommonProfile,
} from "./evolution-runtime-core.ts";
import type { V2EnemyKind } from "./phase-combat-core.ts";
import type { SelectedFramePair } from "./types.ts";
import type { V23ProtocolFamily, V23WeaponFamily } from "./progression-core.ts";

const EV3A_TARGET_ID = 9_003_001;

type EnemyRuntimeLike = {
  id: number;
  active: boolean;
  kind: V2EnemyKind;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  staggerUntilMs: number;
  view: Phaser.GameObjects.Container;
};

type FriendRuntimeLike = {
  x: number;
  y: number;
};

type ReconstructionQualificationScene = Phaser.Scene & {
  pair: SelectedFramePair;
  friend: FriendRuntimeLike;
  enemies: EnemyRuntimeLike[];
  elapsedActiveMs: number;
  dead: boolean;
  draftOpen: boolean;
  deltaRank: number;
  deltaPrimaryPulses: number;
  attackAccumulator: number;
  evolvedWeapons: Partial<Record<V23WeaponFamily, boolean>>;
  protocols: Partial<Record<V23ProtocolFamily, number>>;
  fireDelta(profile: unknown): void;
  activateEnemy(
    slot: EnemyRuntimeLike,
    id: number,
    kind: V2EnemyKind,
    x: number,
    y: number,
    elite: boolean,
    checkpointId: null,
    hpMultiplier?: number,
  ): void;
  killEnemy(enemy: EnemyRuntimeLike): void;
};

type PendingReconstruction = {
  readonly profile: ReconstructionCommonProfile;
  readonly scheduledAtMs: number;
  readonly originX: number;
  readonly originY: number;
};

function sceneReady(scene: ReconstructionQualificationScene | undefined): scene is ReconstructionQualificationScene {
  return Boolean(
    scene
    && scene.friend
    && Array.isArray(scene.enemies)
    && typeof scene.fireDelta === "function"
    && typeof scene.activateEnemy === "function"
    && typeof scene.killEnemy === "function",
  );
}

function setDataset(canvas: HTMLCanvasElement, name: string, value: string | number | boolean): void {
  canvas.dataset[name] = String(value);
}

export function installReconstructionFieldQualification(game: Phaser.Game): () => void {
  let scene: ReconstructionQualificationScene | undefined;
  let originalFireDelta: ReconstructionQualificationScene["fireDelta"] | null = null;
  let patchedFireDelta: ReconstructionQualificationScene["fireDelta"] | null = null;
  let target: EnemyRuntimeLike | null = null;
  let pending: PendingReconstruction | null = null;
  let lastScheduledAtMs: number | null = null;
  let schedules = 0;
  let fires = 0;
  let hits = 0;
  let lastScheduleAtMs: number | null = null;
  let lastFireAtMs: number | null = null;
  let configured = false;
  let disposed = false;

  const syncDiagnostics = (): void => {
    if (!configured || !scene || !target) return;
    const canvas = game.canvas;
    setDataset(canvas, "reconstructionQualificationFixture", "RECONSTRUCTION_FIELD");
    setDataset(canvas, "reconstructionEvolved", scene.evolvedWeapons.DELTA === true);
    setDataset(canvas, "reconstructionSchedules", schedules);
    setDataset(canvas, "reconstructionFires", fires);
    setDataset(canvas, "reconstructionHits", hits);
    setDataset(canvas, "reconstructionPending", pending !== null);
    setDataset(canvas, "reconstructionLastScheduleAtMs", lastScheduleAtMs ?? "");
    setDataset(canvas, "reconstructionLastFireAtMs", lastFireAtMs ?? "");
    setDataset(canvas, "reconstructionTargetId", target.id);
    setDataset(canvas, "reconstructionTargetHp", target.hp);
  };

  const fireReconstruction = (event: PendingReconstruction): void => {
    if (!scene || scene.dead) return;
    fires += 1;
    lastFireAtMs = scene.elapsedActiveMs;
    const fx = scene.add.graphics().setPosition(event.originX, event.originY).setDepth(26);
    fx.fillStyle(0xe8edf2, scene.game.canvas.dataset.reducedMotion === "true" ? 0.18 : 0.32);
    for (const point of event.profile.points) {
      fx.fillRect(point.x * event.profile.worldScale - 3, point.y * event.profile.worldScale - 3, 6, 6);
    }
    scene.time.delayedCall(90, () => fx.destroy());

    for (const enemy of scene.enemies) {
      if (!enemy.active || !isReconstructionCommonTargetEligible(enemy.kind)) continue;
      if (!reconstructionCommonHitsTarget(event.profile, enemy.x - event.originX, enemy.y - event.originY)) continue;
      enemy.hp -= event.profile.damage;
      hits += 1;
      if (enemy.hp <= 0) scene.killEnemy(enemy);
    }
    syncDiagnostics();
  };

  const scheduleReconstruction = (): void => {
    if (!scene || pending) return;
    const profile = buildReconstructionCommonProfile(scene.pair.a.rows, scene.pair.b.rows, scene.evolvedWeapons.DELTA === true);
    if (!profile || profile.points.length === 0) return;
    if (!canScheduleReconstructionCommon(true, lastScheduledAtMs, scene.elapsedActiveMs)) return;
    lastScheduledAtMs = scene.elapsedActiveMs;
    lastScheduleAtMs = scene.elapsedActiveMs;
    schedules += 1;
    pending = Object.freeze({
      profile,
      scheduledAtMs: scene.elapsedActiveMs + profile.delayMs,
      originX: scene.friend.x,
      originY: scene.friend.y,
    });
    syncDiagnostics();
  };

  const configure = (candidate: ReconstructionQualificationScene): void => {
    scene = candidate;
    const profile = buildReconstructionCommonProfile(scene.pair.a.rows, scene.pair.b.rows, true);
    if (!profile || profile.points.length === 0) {
      throw new Error("EV-3A RECONSTRUCTION qualification requires at least one canonical A-intersection-B point.");
    }
    const slot = scene.enemies.find(enemy => !enemy.active);
    if (!slot) throw new Error("EV-3A RECONSTRUCTION qualification could not reserve an enemy slot.");
    const targetPoint = [...profile.points].sort((a, b) => Math.hypot(b.x, b.y) - Math.hypot(a.x, a.y))[0];

    scene.deltaRank = 5;
    scene.evolvedWeapons = { ...scene.evolvedWeapons, DELTA: true };
    scene.protocols = { ...scene.protocols, COMMON_CORE: Math.max(1, scene.protocols.COMMON_CORE ?? 0) };
    scene.attackAccumulator = 0;
    scene.activateEnemy(
      slot,
      EV3A_TARGET_ID,
      "TRACE",
      scene.friend.x + targetPoint.x * profile.worldScale,
      scene.friend.y + targetPoint.y * profile.worldScale,
      false,
      null,
      1000,
    );
    slot.staggerUntilMs = Number.POSITIVE_INFINITY;
    target = slot;

    const canvas = game.canvas;
    setDataset(canvas, "reconstructionDamage", profile.damage);
    setDataset(canvas, "reconstructionDelayMs", profile.delayMs);
    setDataset(canvas, "reconstructionRearmMs", profile.rearmMs);
    setDataset(canvas, "reconstructionPointCount", profile.points.length);
    setDataset(canvas, "reconstructionInstallPrimaryPulses", scene.deltaPrimaryPulses);
    setDataset(canvas, "reconstructionTargetInitialHp", target.hp);

    originalFireDelta = scene.fireDelta;
    patchedFireDelta = function (this: ReconstructionQualificationScene, deltaProfile: unknown): void {
      originalFireDelta?.call(this, deltaProfile);
      scheduleReconstruction();
    };
    scene.fireDelta = patchedFireDelta;
    configured = true;
    syncDiagnostics();
  };

  const onPostStep = (): void => {
    if (disposed) return;
    if (!configured) {
      const candidate = game.scene.getScene("RareShiftV21Survival") as ReconstructionQualificationScene | undefined;
      if (sceneReady(candidate)) configure(candidate);
      return;
    }
    if (!scene || !pending || scene.dead || scene.draftOpen) {
      syncDiagnostics();
      return;
    }
    if (scene.elapsedActiveMs < pending.scheduledAtMs) {
      syncDiagnostics();
      return;
    }
    const event = pending;
    pending = null;
    fireReconstruction(event);
  };

  game.events.on("poststep", onPostStep);
  onPostStep();

  return () => {
    disposed = true;
    game.events.off("poststep", onPostStep);
    if (scene && originalFireDelta && patchedFireDelta && scene.fireDelta === patchedFireDelta) {
      scene.fireDelta = originalFireDelta;
    }
    pending = null;
  };
}
