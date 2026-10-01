import type Phaser from "phaser";
import {
  echoBlastTargetIds,
  echoTriggerCandidateIds,
  isEchoTriggerWindowOpen,
  planEchoDamageTargets,
  type EchoBurstLedger,
  type EchoMineCore,
  type EchoRankProfile,
} from "./echo-core.ts";
import {
  armChainResonanceAfterShift,
  buildChainResonanceProfile,
  buildReconstructionCommonProfile,
  canEmitSyncHaloControl,
  canScheduleReconstructionCommon,
  consumeChainResonanceShift,
  emptyChainResonanceShiftState,
  isChainResonanceShiftArmed,
  isReconstructionCommonTargetEligible,
  MEMORY_COLLAPSE_PROPAGATED_DAMAGE_MULTIPLIER,
  planMemoryCollapseChain,
  planSyncHaloControlTargets,
  PRISM_REFRACTION_DAMAGE,
  PRISM_REFRACTION_RADIUS,
  reconstructionCommonHitsTarget,
  selectPrismRefractionTarget,
  syncHaloPositions,
  type ChainResonanceProfile,
  type ChainResonanceShiftState,
  type ReconstructionCommonProfile,
  type SyncHaloControlRole,
} from "./evolution-runtime-core.ts";
import { enemyThreatPhase, isEnemyCorporeal, type V2EnemyKind } from "./phase-combat-core.ts";
import type { SignalArcHop, SignalArcRankProfile } from "./signal-arc-core.ts";
import type { Phase, SelectedFramePair } from "./types.ts";
import type { V23WeaponFamily } from "./progression-core.ts";
import type { CR2LiveProjection } from "./cr2-live-state-core.ts";

interface EnemyRuntimeLike {
  id: number;
  active: boolean;
  kind: V2EnemyKind;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  elite: boolean;
  checkpointId: string | null;
  view: Phaser.GameObjects.Container;
}

interface EchoMineRuntimeLike {
  active: boolean;
  mine: EchoMineCore | null;
  view: Phaser.GameObjects.Graphics;
}

interface VectorProjectileLike {
  active: boolean;
  launchPhase: Phase;
  profile: { readonly rank: number } | null;
  transferShot: boolean;
  hitIds: number[];
  hitDamages: number[];
}

interface EvolutionRuntimeScene extends Phaser.Scene {
  pair: SelectedFramePair;
  phase: Phase;
  friend: Phaser.GameObjects.Container;
  enemies: EnemyRuntimeLike[];
  elapsedActiveMs: number;
  dead: boolean;
  draftOpen: boolean;
  evolvedWeapons: Partial<Record<V23WeaponFamily, boolean>>;
  applyCR2Projection(next: CR2LiveProjection): void;

  deltaRank: number;
  fireDelta(profile: unknown): void;

  vectorRank: number;
  applyVectorProjectileHit(projectile: VectorProjectileLike, hitIndex: number): void;

  orbitRank: number;
  orbitShearLastEmittedAt: number | null;
  tryEmitOrbitShear(anchorAngle: number): void;

  echoRank: number;
  echoTriggers: number;
  echoHits: number;
  echoBurstSuppressedHits: number;
  echoBurstLedger: EchoBurstLedger;
  echoMines: EchoMineRuntimeLike[];
  updateEcho(dtMs: number): void;
  echoCombatProfile(rank?: number, memoryDepth?: number): EchoRankProfile;
  deactivateEchoMine(runtime: EchoMineRuntimeLike): void;
  emitEchoBlastFx(x: number, y: number, recordedPhase: Phase, profile: EchoRankProfile): void;

  signalRank: number;
  signalCombatProfile(rank?: number): SignalArcRankProfile | ChainResonanceProfile;
  fireSignalArc(path: readonly SignalArcHop[], controlledRouting?: boolean): void;
  shift(): void;
  shifts: number;

  killEnemy(enemy: EnemyRuntimeLike): void;
  syncTestState(): void;
}

interface PendingReconstruction {
  readonly profile: ReconstructionCommonProfile;
  readonly scheduledAtMs: number;
  readonly originX: number;
  readonly originY: number;
}

interface MineSnapshot {
  readonly runtime: EchoMineRuntimeLike;
  readonly mine: EchoMineCore;
  readonly profile: EchoRankProfile;
  readonly triggerLegal: boolean;
}

function sceneReady(scene: EvolutionRuntimeScene | undefined): scene is EvolutionRuntimeScene {
  return Boolean(
    scene
    && scene.friend
    && Array.isArray(scene.enemies)
    && Array.isArray(scene.echoMines)
    && typeof scene.applyCR2Projection === "function"
    && typeof scene.fireDelta === "function"
    && typeof scene.applyVectorProjectileHit === "function"
    && typeof scene.tryEmitOrbitShear === "function"
    && typeof scene.updateEcho === "function"
    && typeof scene.echoCombatProfile === "function"
    && typeof scene.deactivateEchoMine === "function"
    && typeof scene.emitEchoBlastFx === "function"
    && typeof scene.signalCombatProfile === "function"
    && typeof scene.fireSignalArc === "function"
    && typeof scene.shift === "function"
    && typeof scene.killEnemy === "function"
    && typeof scene.syncTestState === "function",
  );
}

function setDataset(canvas: HTMLCanvasElement, name: string, value: string | number | boolean): void {
  canvas.dataset[name] = String(value);
}

export function syncHaloRuntimeRole(enemy: {
  readonly kind: V2EnemyKind;
  readonly elite: boolean;
  readonly checkpointId: string | null;
}): SyncHaloControlRole {
  if (enemy.elite && enemy.checkpointId === null) return "BOSS";
  if (enemy.elite) return "ELITE";
  return enemyThreatPhase(enemy.kind) === "COMMON" ? "COMMON" : "NORMAL";
}

export function syncHaloRuntimeRearmAnchor(
  lastControlAtMs: number | null,
  inheritedShearLastEmittedAtMs: number | null,
): number | null {
  return lastControlAtMs ?? inheritedShearLastEmittedAtMs;
}

function activeMineSnapshots(scene: EvolutionRuntimeScene): MineSnapshot[] {
  return scene.echoMines
    .filter((runtime): runtime is EchoMineRuntimeLike & { mine: EchoMineCore } => runtime.active && runtime.mine !== null)
    .map(runtime => {
      const profile = scene.echoCombatProfile(scene.echoRank, runtime.mine.memoryDepth);
      return Object.freeze({
        runtime,
        mine: runtime.mine,
        profile,
        triggerLegal: isEchoTriggerWindowOpen(runtime.mine, scene.phase, scene.elapsedActiveMs, profile),
      });
    })
    .sort((a, b) => a.mine.id - b.mine.id);
}

export function installEvolutionPhaserRuntime(game: Phaser.Game): () => void {
  let scene: EvolutionRuntimeScene | undefined;
  let disposed = false;
  let configured = false;
  let animationFrameId: number | null = null;

  let originalApplyCR2Projection: EvolutionRuntimeScene["applyCR2Projection"] | null = null;
  let patchedApplyCR2Projection: EvolutionRuntimeScene["applyCR2Projection"] | null = null;
  let originalFireDelta: EvolutionRuntimeScene["fireDelta"] | null = null;
  let patchedFireDelta: EvolutionRuntimeScene["fireDelta"] | null = null;
  let originalApplyVectorHit: EvolutionRuntimeScene["applyVectorProjectileHit"] | null = null;
  let patchedApplyVectorHit: EvolutionRuntimeScene["applyVectorProjectileHit"] | null = null;
  let originalTryEmitOrbitShear: EvolutionRuntimeScene["tryEmitOrbitShear"] | null = null;
  let patchedTryEmitOrbitShear: EvolutionRuntimeScene["tryEmitOrbitShear"] | null = null;
  let originalUpdateEcho: EvolutionRuntimeScene["updateEcho"] | null = null;
  let patchedUpdateEcho: EvolutionRuntimeScene["updateEcho"] | null = null;
  let originalSignalCombatProfile: EvolutionRuntimeScene["signalCombatProfile"] | null = null;
  let patchedSignalCombatProfile: EvolutionRuntimeScene["signalCombatProfile"] | null = null;
  let originalFireSignalArc: EvolutionRuntimeScene["fireSignalArc"] | null = null;
  let patchedFireSignalArc: EvolutionRuntimeScene["fireSignalArc"] | null = null;
  let originalShift: EvolutionRuntimeScene["shift"] | null = null;
  let patchedShift: EvolutionRuntimeScene["shift"] | null = null;

  let pendingReconstruction: PendingReconstruction | null = null;
  let reconstructionLastScheduledAtMs: number | null = null;
  let reconstructionSchedules = 0;
  let reconstructionFires = 0;
  let reconstructionHits = 0;

  let prismRefractions = 0;
  let prismHits = 0;
  let prismLastPrimaryId: number | null = null;
  let prismLastTargetId: number | null = null;

  let syncLastControlAtMs: number | null = null;
  let syncControlEvents = 0;
  let syncRearmBlocks = 0;
  let syncLastTargetIds: number[] = [];

  let memoryCollapseEvents = 0;
  let memoryCollapsePropagatedMines = 0;
  let memoryCollapseHits = 0;
  let memoryCollapseSuppressedHits = 0;
  let memoryLastChainIds: number[] = [];

  let chainShiftState: ChainResonanceShiftState = emptyChainResonanceShiftState();
  let chainArmEvents = 0;
  let chainConsumeEvents = 0;
  let chainExpiryEvents = 0;

  const syncDiagnostics = (): void => {
    if (!configured || !scene) return;
    const canvas = game.canvas;
    setDataset(canvas, "evolutionRuntimeAdapter", "ACTIVE");
    setDataset(canvas, "evolutionRuntimeDelta", scene.evolvedWeapons.DELTA === true);
    setDataset(canvas, "evolutionRuntimeVector", scene.evolvedWeapons.VECTOR === true);
    setDataset(canvas, "evolutionRuntimeOrbit", scene.evolvedWeapons.ORBIT === true);
    setDataset(canvas, "evolutionRuntimeEcho", scene.evolvedWeapons.ECHO === true);
    setDataset(canvas, "evolutionRuntimeSignal", scene.evolvedWeapons.SIGNAL === true);

    setDataset(canvas, "evolutionRuntimeReconstructionSchedules", reconstructionSchedules);
    setDataset(canvas, "evolutionRuntimeReconstructionFires", reconstructionFires);
    setDataset(canvas, "evolutionRuntimeReconstructionHits", reconstructionHits);
    setDataset(canvas, "evolutionRuntimeReconstructionPending", pendingReconstruction !== null);

    setDataset(canvas, "evolutionRuntimePrismRefractions", prismRefractions);
    setDataset(canvas, "evolutionRuntimePrismHits", prismHits);
    setDataset(canvas, "evolutionRuntimePrismLastPrimaryId", prismLastPrimaryId ?? "");
    setDataset(canvas, "evolutionRuntimePrismLastTargetId", prismLastTargetId ?? "");
    setDataset(canvas, "evolutionRuntimePrismDamage", PRISM_REFRACTION_DAMAGE);
    setDataset(canvas, "evolutionRuntimePrismRadius", PRISM_REFRACTION_RADIUS);

    setDataset(canvas, "evolutionRuntimeSyncControlEvents", syncControlEvents);
    setDataset(canvas, "evolutionRuntimeSyncRearmBlocks", syncRearmBlocks);
    setDataset(canvas, "evolutionRuntimeSyncLastTargetIds", syncLastTargetIds.join(","));

    setDataset(canvas, "evolutionRuntimeMemoryEvents", memoryCollapseEvents);
    setDataset(canvas, "evolutionRuntimeMemoryPropagatedMines", memoryCollapsePropagatedMines);
    setDataset(canvas, "evolutionRuntimeMemoryHits", memoryCollapseHits);
    setDataset(canvas, "evolutionRuntimeMemorySuppressedHits", memoryCollapseSuppressedHits);
    setDataset(canvas, "evolutionRuntimeMemoryLastChainIds", memoryLastChainIds.join(","));

    const chainArmed = isChainResonanceShiftArmed(chainShiftState, scene.elapsedActiveMs);
    setDataset(canvas, "evolutionRuntimeChainArmed", chainArmed);
    setDataset(canvas, "evolutionRuntimeChainArmEvents", chainArmEvents);
    setDataset(canvas, "evolutionRuntimeChainConsumeEvents", chainConsumeEvents);
    setDataset(canvas, "evolutionRuntimeChainExpiryEvents", chainExpiryEvents);
    setDataset(canvas, "evolutionRuntimeChainExpiresAt", chainShiftState.expiresAtMs ?? "");
  };

  const fireReconstruction = (pending: PendingReconstruction): void => {
    if (!scene || scene.dead) return;
    reconstructionFires += 1;
    const fx = scene.add.graphics().setPosition(pending.originX, pending.originY).setDepth(26);
    fx.fillStyle(0xe8edf2, 0.32);
    for (const point of pending.profile.points) {
      fx.fillRect(point.x * pending.profile.worldScale - 3, point.y * pending.profile.worldScale - 3, 6, 6);
    }
    scene.time.delayedCall(90, () => fx.destroy());

    for (const enemy of scene.enemies) {
      if (!enemy.active || !isReconstructionCommonTargetEligible(enemy.kind)) continue;
      if (!reconstructionCommonHitsTarget(pending.profile, enemy.x - pending.originX, enemy.y - pending.originY)) continue;
      enemy.hp -= pending.profile.damage;
      reconstructionHits += 1;
      if (enemy.hp <= 0) scene.killEnemy(enemy);
    }
    syncDiagnostics();
  };

  const scheduleReconstruction = (): void => {
    if (!scene || scene.deltaRank !== 5 || scene.evolvedWeapons.DELTA !== true || pendingReconstruction !== null) return;
    const profile = buildReconstructionCommonProfile(scene.pair.a.rows, scene.pair.b.rows, true);
    if (!profile || profile.points.length === 0) return;
    if (!canScheduleReconstructionCommon(true, reconstructionLastScheduledAtMs, scene.elapsedActiveMs)) return;
    reconstructionLastScheduledAtMs = scene.elapsedActiveMs;
    reconstructionSchedules += 1;
    pendingReconstruction = Object.freeze({
      profile,
      scheduledAtMs: scene.elapsedActiveMs + profile.delayMs,
      originX: scene.friend.x,
      originY: scene.friend.y,
    });
    syncDiagnostics();
  };

  const applySyncControl = (anchorAngle: number, inheritedShearLastBeforeMs: number | null): void => {
    if (!scene || scene.dead || scene.draftOpen || scene.orbitRank !== 5 || scene.evolvedWeapons.ORBIT !== true) return;
    const rearmAnchor = syncHaloRuntimeRearmAnchor(syncLastControlAtMs, inheritedShearLastBeforeMs);
    if (!canEmitSyncHaloControl(true, rearmAnchor, scene.elapsedActiveMs)) {
      syncRearmBlocks += 1;
      syncDiagnostics();
      return;
    }

    syncLastControlAtMs = scene.elapsedActiveMs;
    syncControlEvents += 1;
    const planned = planSyncHaloControlTargets(
      true,
      scene.enemies.map(enemy => ({
        id: enemy.id,
        kind: enemy.kind,
        active: enemy.active,
        x: enemy.x,
        y: enemy.y,
        role: syncHaloRuntimeRole(enemy),
      })),
      scene.phase,
      scene.friend.x,
      scene.friend.y,
    );
    syncLastTargetIds = planned.map(target => target.id);

    for (const target of planned) {
      const enemy = scene.enemies.find(item => item.active && item.id === target.id) ?? null;
      if (!enemy) continue;
      const dx = enemy.x - scene.friend.x;
      const dy = enemy.y - scene.friend.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      enemy.x += dx / distance * target.displacement;
      enemy.y += dy / distance * target.displacement;
      enemy.view.setPosition(enemy.x, enemy.y);
    }

    const fx = scene.add.graphics().setDepth(28);
    fx.lineStyle(2, 0xe8edf2, 0.72);
    const points = syncHaloPositions(scene.friend.x, scene.friend.y, anchorAngle, true);
    if (points.length > 0) {
      const radius = Math.hypot(points[0].x - scene.friend.x, points[0].y - scene.friend.y);
      fx.strokeCircle(scene.friend.x, scene.friend.y, radius);
      fx.fillStyle(0xe8edf2, 0.82);
      for (const point of points) fx.fillCircle(point.x, point.y, 4);
    }
    scene.time.delayedCall(100, () => fx.destroy());
    syncDiagnostics();
  };

  const propagateMemoryCollapse = (before: readonly MineSnapshot[]): void => {
    if (!scene || scene.echoRank !== 5 || scene.evolvedWeapons.ECHO !== true) return;
    const liveIds = new Set(activeMineSnapshots(scene).map(item => item.mine.id));
    const starts = before
      .filter(item => (
        item.triggerLegal
        && !liveIds.has(item.mine.id)
        && echoTriggerCandidateIds(item.mine, scene!.phase, scene!.elapsedActiveMs, scene!.enemies, item.profile).length > 0
      ))
      .sort((a, b) => a.mine.id - b.mine.id);

    for (const start of starts) {
      const candidates = before.map(item => ({
        id: item.mine.id,
        active: true,
        armed: item.mine.state === "RETURN_READY",
        triggerLegal: item.triggerLegal,
        x: item.mine.x,
        y: item.mine.y,
      }));
      const chain = [...planMemoryCollapseChain(true, candidates, start.mine.id)];
      if (chain.length <= 1) continue;
      memoryCollapseEvents += 1;
      memoryLastChainIds = chain;

      for (const id of chain.slice(1)) {
        const runtime = scene.echoMines.find(item => item.active && item.mine?.id === id) ?? null;
        if (!runtime || !runtime.mine) continue;
        const profile = scene.echoCombatProfile(scene.echoRank, runtime.mine.memoryDepth);
        if (!isEchoTriggerWindowOpen(runtime.mine, scene.phase, scene.elapsedActiveMs, profile)) continue;
        const mine = runtime.mine;
        const targetIds = echoBlastTargetIds(mine, scene.phase, scene.enemies, profile);
        scene.deactivateEchoMine(runtime);
        scene.emitEchoBlastFx(mine.x, mine.y, mine.recordedPhase, profile);
        memoryCollapsePropagatedMines += 1;

        const plan = planEchoDamageTargets(targetIds, scene.echoRank, scene.elapsedActiveMs, scene.echoBurstLedger);
        const suppressed = targetIds.length - plan.targetIds.length;
        scene.echoBurstSuppressedHits += suppressed;
        scene.echoBurstLedger = plan.ledger;
        memoryCollapseSuppressedHits += suppressed;

        for (const targetId of plan.targetIds) {
          const enemy = scene.enemies.find(item => item.active && item.id === targetId) ?? null;
          if (!enemy || !isEnemyCorporeal(enemy.kind, scene.phase)) continue;
          enemy.hp -= profile.damage * MEMORY_COLLAPSE_PROPAGATED_DAMAGE_MULTIPLIER;
          scene.echoHits += 1;
          memoryCollapseHits += 1;
          if (enemy.hp <= 0) scene.killEnemy(enemy);
        }
      }
    }
    syncDiagnostics();
  };

  const configure = (candidate: EvolutionRuntimeScene): void => {
    scene = candidate;
    originalApplyCR2Projection = scene.applyCR2Projection;
    originalFireDelta = scene.fireDelta;
    originalApplyVectorHit = scene.applyVectorProjectileHit;
    originalTryEmitOrbitShear = scene.tryEmitOrbitShear;
    originalUpdateEcho = scene.updateEcho;
    originalSignalCombatProfile = scene.signalCombatProfile;
    originalFireSignalArc = scene.fireSignalArc;
    originalShift = scene.shift;

    patchedApplyCR2Projection = function (this: EvolutionRuntimeScene, next: CR2LiveProjection): void {
      if (!originalApplyCR2Projection) throw new Error("Evolution runtime lost inherited CR-2 projection authority.");
      const containsEvolution = Object.values(next.evolvedWeapons).some(value => value === true);
      if (!containsEvolution) {
        originalApplyCR2Projection.call(this, next);
        return;
      }

      // The base Phaser scene remains fail-closed. EV-3G authorizes evolved
      // projections only while this separately-qualified production runtime is
      // installed. CR-2 Evolution changes evolved flags/Core inventory only;
      // weapon rank/ownership continuity remains delegated to the inherited
      // projection path, then the exact target evolved set is restored.
      const guardedProjection: CR2LiveProjection = Object.freeze({
        ...next,
        evolvedWeapons: Object.freeze({}),
      });
      originalApplyCR2Projection.call(this, guardedProjection);
      this.evolvedWeapons = { ...next.evolvedWeapons };
      this.syncTestState();
      syncDiagnostics();
    };
    scene.applyCR2Projection = patchedApplyCR2Projection;

    patchedFireDelta = function (this: EvolutionRuntimeScene, profile: unknown): void {
      originalFireDelta?.call(this, profile);
      scheduleReconstruction();
    };
    scene.fireDelta = patchedFireDelta;

    patchedApplyVectorHit = function (this: EvolutionRuntimeScene, projectile: VectorProjectileLike, hitIndex: number): void {
      const primaryHitId = projectile.hitIds[hitIndex] ?? null;
      originalApplyVectorHit?.call(this, projectile, hitIndex);
      if (
        hitIndex !== 0
        || projectile.profile?.rank !== 5
        || this.vectorRank !== 5
        || this.evolvedWeapons.VECTOR !== true
        || primaryHitId === null
      ) return;

      const source = this.enemies.find(enemy => enemy.active && enemy.id === primaryHitId) ?? null;
      if (!source) return;
      const selected = selectPrismRefractionTarget(
        true,
        this.enemies,
        projectile.launchPhase,
        source.x,
        source.y,
        new Set(projectile.hitIds),
      );
      if (!selected) return;
      const target = this.enemies.find(enemy => enemy.active && enemy.id === selected.id) ?? null;
      if (!target) return;
      target.hp -= selected.damage;
      prismRefractions += 1;
      prismHits += 1;
      prismLastPrimaryId = source.id;
      prismLastTargetId = target.id;
      const fx = this.add.graphics().setDepth(27);
      fx.lineStyle(2, 0xe8edf2, 0.72).lineBetween(source.x, source.y, target.x, target.y);
      fx.fillStyle(0xe8edf2, 0.82).fillCircle(target.x, target.y, 5);
      this.time.delayedCall(90, () => fx.destroy());
      if (target.hp <= 0) this.killEnemy(target);
      syncDiagnostics();
    };
    scene.applyVectorProjectileHit = patchedApplyVectorHit;

    patchedTryEmitOrbitShear = function (this: EvolutionRuntimeScene, anchorAngle: number): void {
      const inheritedShearLastBeforeMs = this.orbitShearLastEmittedAt;
      originalTryEmitOrbitShear?.call(this, anchorAngle);
      applySyncControl(anchorAngle, inheritedShearLastBeforeMs);
    };
    scene.tryEmitOrbitShear = patchedTryEmitOrbitShear;

    patchedUpdateEcho = function (this: EvolutionRuntimeScene, dtMs: number): void {
      if (this.echoRank !== 5 || this.evolvedWeapons.ECHO !== true) {
        originalUpdateEcho?.call(this, dtMs);
        return;
      }
      const before = activeMineSnapshots(this);
      const triggersBefore = this.echoTriggers;
      originalUpdateEcho?.call(this, dtMs);
      if (this.echoTriggers > triggersBefore) propagateMemoryCollapse(before);
    };
    scene.updateEcho = patchedUpdateEcho;

    patchedSignalCombatProfile = function (this: EvolutionRuntimeScene, rank?: number): SignalArcRankProfile | ChainResonanceProfile {
      if (!originalSignalCombatProfile) throw new Error("Evolution runtime lost inherited SIGNAL profile authority.");
      const base = originalSignalCombatProfile.call(this, rank) as SignalArcRankProfile;
      if (base.rank !== 5 || this.signalRank !== 5 || this.evolvedWeapons.SIGNAL !== true) return base;
      return buildChainResonanceProfile(base, true, chainShiftState, this.elapsedActiveMs);
    };
    scene.signalCombatProfile = patchedSignalCombatProfile;

    patchedFireSignalArc = function (this: EvolutionRuntimeScene, path: readonly SignalArcHop[], controlledRouting = false): void {
      const armedBefore = this.signalRank === 5
        && this.evolvedWeapons.SIGNAL === true
        && isChainResonanceShiftArmed(chainShiftState, this.elapsedActiveMs);
      originalFireSignalArc?.call(this, path, controlledRouting);
      if (armedBefore && path.length > 0) {
        chainShiftState = consumeChainResonanceShift(chainShiftState, this.elapsedActiveMs);
        chainConsumeEvents += 1;
        syncDiagnostics();
      }
    };
    scene.fireSignalArc = patchedFireSignalArc;

    patchedShift = function (this: EvolutionRuntimeScene): void {
      const shiftsBefore = this.shifts;
      originalShift?.call(this);
      if (this.shifts === shiftsBefore) return;
      if (this.signalRank === 5 && this.evolvedWeapons.SIGNAL === true) {
        chainShiftState = armChainResonanceAfterShift(true, this.elapsedActiveMs, this.phase);
        chainArmEvents += 1;
      } else {
        chainShiftState = emptyChainResonanceShiftState();
      }
      syncDiagnostics();
    };
    scene.shift = patchedShift;

    configured = true;
    syncDiagnostics();
  };

  const tick = (): void => {
    if (disposed) return;
    if (!configured) {
      const candidate = game.scene.getScene("RareShiftV21Survival") as EvolutionRuntimeScene | undefined;
      if (sceneReady(candidate)) {
        try {
          configure(candidate);
        } catch (cause) {
          game.canvas.dataset.evolutionRuntimeError = cause instanceof Error ? cause.message : String(cause);
          disposed = true;
          return;
        }
      }
    } else if (scene) {
      if (pendingReconstruction && !scene.dead && !scene.draftOpen && scene.elapsedActiveMs >= pendingReconstruction.scheduledAtMs) {
        const pending = pendingReconstruction;
        pendingReconstruction = null;
        fireReconstruction(pending);
      }
      if (chainShiftState.armed && !isChainResonanceShiftArmed(chainShiftState, scene.elapsedActiveMs)) {
        chainShiftState = emptyChainResonanceShiftState();
        chainExpiryEvents += 1;
      }
      syncDiagnostics();
    }
    animationFrameId = window.requestAnimationFrame(tick);
  };

  animationFrameId = window.requestAnimationFrame(tick);

  return () => {
    disposed = true;
    if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
    if (!scene) return;
    if (originalApplyCR2Projection && patchedApplyCR2Projection && scene.applyCR2Projection === patchedApplyCR2Projection) scene.applyCR2Projection = originalApplyCR2Projection;
    if (originalFireDelta && patchedFireDelta && scene.fireDelta === patchedFireDelta) scene.fireDelta = originalFireDelta;
    if (originalApplyVectorHit && patchedApplyVectorHit && scene.applyVectorProjectileHit === patchedApplyVectorHit) scene.applyVectorProjectileHit = originalApplyVectorHit;
    if (originalTryEmitOrbitShear && patchedTryEmitOrbitShear && scene.tryEmitOrbitShear === patchedTryEmitOrbitShear) scene.tryEmitOrbitShear = originalTryEmitOrbitShear;
    if (originalUpdateEcho && patchedUpdateEcho && scene.updateEcho === patchedUpdateEcho) scene.updateEcho = originalUpdateEcho;
    if (originalSignalCombatProfile && patchedSignalCombatProfile && scene.signalCombatProfile === patchedSignalCombatProfile) scene.signalCombatProfile = originalSignalCombatProfile;
    if (originalFireSignalArc && patchedFireSignalArc && scene.fireSignalArc === patchedFireSignalArc) scene.fireSignalArc = originalFireSignalArc;
    if (originalShift && patchedShift && scene.shift === patchedShift) scene.shift = originalShift;
    pendingReconstruction = null;
    chainShiftState = emptyChainResonanceShiftState();
  };
}
