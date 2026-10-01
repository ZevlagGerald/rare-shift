import type Phaser from "phaser";
import {
  CR1_CHECKPOINTS,
  buildDirectedSpawnSpec,
  checkpointRewards,
  type CR1CheckpointId,
  type CR1PickupKind,
} from "./cr1-director-core.ts";
import {
  CR3E_CHECKPOINT_REWARD_RESERVE_SIZE,
  advanceCR3ECheckpointGate,
  beginCR3ECheckpointRewards,
  canStartCR3EBoss,
  collectCR3ECheckpointReward,
  createCR3ECheckpointGateState,
  selectCR3ECheckpointRewardSlotIndex,
  selectCR3EOrdinaryPickupSlotIndex,
  stageForCR3ECheckpointGate,
  type CR3ECheckpointGateState,
} from "./cr3e-checkpoint-gate-core.ts";
import { v21QualificationReached } from "./survival-core.ts";
import { isVectorTransferArmed } from "./vector-core.ts";

type RuntimeScene = Phaser.Scene & Record<string, any>;
type RuntimePickup = Record<string, any> & {
  active: boolean;
  kind: CR1PickupKind;
  magnetized: boolean;
  x: number;
  y: number;
  view: Phaser.GameObjects.Container;
  reservedForCheckpoint?: boolean;
  checkpointId?: CR1CheckpointId | null;
};

type QualificationWindow = Window & {
  __RARE_SHIFT_CR3B_RUNTIME__?: unknown;
};

function sceneReady(scene: Phaser.Scene | undefined): scene is RuntimeScene {
  const candidate = scene as RuntimeScene | undefined;
  return Boolean(
    candidate
    && Array.isArray(candidate.enemies)
    && Array.isArray(candidate.pickups)
    && candidate.friend
    && typeof candidate.update === "function"
    && typeof candidate.updateMovement === "function"
    && typeof candidate.spawnCheckpoint === "function"
    && typeof candidate.activateEnemy === "function"
    && typeof candidate.deltaCombatProfile === "function"
    && typeof candidate.fireDelta === "function"
    && typeof candidate.updatePendingDeltaEcho === "function"
    && typeof candidate.updateEnemies === "function"
    && typeof candidate.updatePickups === "function"
    && typeof candidate.updateHud === "function"
    && typeof candidate.syncTestState === "function"
    && typeof candidate.spawnPickup === "function"
    && typeof candidate.killEnemy === "function"
    && typeof candidate.collectPickup === "function"
    && Number.isFinite(candidate.elapsedActiveMs),
  );
}

function checkpointLabel(checkpointId: CR1CheckpointId): string {
  return checkpointId.replaceAll("_", " ");
}

export function installCR3ECheckpointPhaserRuntime(game: Phaser.Game): () => void {
  const qualificationWindow = window as QualificationWindow;
  if (qualificationWindow.__RARE_SHIFT_CR3B_RUNTIME__ === true) {
    game.canvas.dataset.cr3e1CheckpointRuntime = "SUPPRESSED_FOR_CONTROLLED_CR3_QUALIFICATION";
    return () => { delete game.canvas.dataset.cr3e1CheckpointRuntime; };
  }

  let disposed = false;
  let configured = false;
  let animationFrameId: number | null = null;
  let scene: RuntimeScene | undefined;
  let gateState: CR3ECheckpointGateState = createCR3ECheckpointGateState();
  let rewardSpawnContext: CR1CheckpointId | null = null;

  let originalUpdate: RuntimeScene["update"] | null = null;
  let patchedUpdate: RuntimeScene["update"] | null = null;
  let originalUpdateHud: ((...args: any[]) => any) | null = null;
  let patchedUpdateHud: ((...args: any[]) => any) | null = null;
  let originalSyncTestState: ((...args: any[]) => any) | null = null;
  let patchedSyncTestState: ((...args: any[]) => any) | null = null;
  let originalSpawnEnemy: ((...args: any[]) => any) | null = null;
  let patchedSpawnEnemy: ((...args: any[]) => any) | null = null;
  let originalSpawnPickup: ((...args: any[]) => any) | null = null;
  let patchedSpawnPickup: ((...args: any[]) => any) | null = null;
  let originalKillEnemy: ((...args: any[]) => any) | null = null;
  let patchedKillEnemy: ((...args: any[]) => any) | null = null;
  let originalCollectPickup: ((...args: any[]) => any) | null = null;
  let patchedCollectPickup: ((...args: any[]) => any) | null = null;

  const reservedPickups: RuntimePickup[] = [];

  const syncDiagnostics = (): void => {
    if (!scene) return;
    const canvas = game.canvas;
    canvas.dataset.cr3e1CheckpointRuntime = configured ? "ACTIVE" : "WAITING";
    canvas.dataset.directorProgressMs = String(Math.round(gateState.progressMs));
    canvas.dataset.checkpointGatePhase = gateState.phase;
    canvas.dataset.checkpointGateActive = gateState.activeCheckpoint ?? "";
    canvas.dataset.checkpointGatePendingRewards = gateState.pendingRewards.join(",");
    canvas.dataset.checkpointGateResolved = gateState.resolvedCheckpoints.join(",");
    canvas.dataset.checkpointGateResolvedCount = String(gateState.resolvedCheckpoints.length);
    canvas.dataset.checkpointGateBossReady = canStartCR3EBoss(gateState) ? "true" : "false";
    canvas.dataset.checkpointReservedActive = String(reservedPickups.filter(pickup => pickup.active).length);
    canvas.dataset.checkpointOrdinarySpawnIndex = String(scene.spawnIndex ?? 0);
    const elite = scene.enemies.find((enemy: Record<string, any>) => enemy.active && enemy.elite && enemy.checkpointId === gateState.activeCheckpoint) ?? null;
    canvas.dataset.checkpointEliteX = elite ? String(Math.round(elite.x)) : "";
    canvas.dataset.checkpointEliteY = elite ? String(Math.round(elite.y)) : "";
    canvas.dataset.checkpointEliteHp = elite ? String(elite.hp) : "";
    canvas.dataset.checkpointEliteMaxHp = elite ? String(elite.maxHp) : "";
  };

  const currentStage = () => stageForCR3ECheckpointGate(gateState);

  const syncDirectorState = (): void => {
    if (!scene) return;
    const stage = currentStage();
    if (stage.id !== scene.directorStage) {
      scene.directorStage = stage.id;
      if (gateState.phase === "RUNNING") scene.statusText?.setText(stage.label);
    }
    scene.bossPending = stage.id === "BOSS_PENDING" && canStartCR3EBoss(gateState);
  };

  const advanceDirector = (dt: number): void => {
    if (!scene) return;
    const advance = advanceCR3ECheckpointGate(gateState, dt);
    gateState = advance.state;
    if (advance.checkpointActivated) {
      const checkpoint = CR1_CHECKPOINTS.find(candidate => candidate.id === advance.checkpointActivated);
      if (!checkpoint) throw new Error(`CR-3E.1 unknown checkpoint ${advance.checkpointActivated}.`);
      const spawned = scene.spawnCheckpoint(checkpoint.id, checkpoint.kind, checkpoint.hpMultiplier, checkpoint.label);
      if (!spawned) throw new Error(`CR-3E.1 could not allocate checkpoint elite ${checkpoint.id}.`);
      scene.spawnedCheckpoints.add(checkpoint.id);
      scene.spawnAccumulator = 0;
    }
    syncDirectorState();
  };

  const spawnEnemyForDirector = (): void => {
    if (!scene || gateState.phase !== "RUNNING") return;
    const slot = scene.enemies.find((enemy: Record<string, any>) => !enemy.active);
    if (!slot) return;
    const spec = buildDirectedSpawnSpec(
      scene.seed,
      scene.spawnIndex,
      gateState.progressMs,
      { x: scene.friend.x, y: scene.friend.y },
    );
    if (!spec) return;
    scene.spawnIndex += 1;
    scene.activateEnemy(slot, spec.id, spec.kind, spec.position.x, spec.position.y, false, null, 1);
  };

  const paintGateHud = (): void => {
    if (!scene?.stageText) return;
    const stage = currentStage();
    const active = gateState.activeCheckpoint;
    const label = active
      ? `${checkpointLabel(active)} // ${gateState.phase === "ELITE_ACTIVE" ? "DEFEAT ELITE" : "COLLECT REWARDS"}`
      : stage.label;
    scene.stageText.setText(`${label} · CORES ${scene.evolutionCores} · REFRACT ${scene.refracts}`);
  };

  const allocateReservedPickups = (): void => {
    if (!scene) return;
    for (let index = 0; index < CR3E_CHECKPOINT_REWARD_RESERVE_SIZE; index += 1) {
      const view = scene.add.container(-500, -500).setDepth(15).setVisible(false);
      const pickup: RuntimePickup = {
        active: false,
        kind: "SIGNAL_XP",
        magnetized: false,
        x: -500,
        y: -500,
        view,
        reservedForCheckpoint: true,
        checkpointId: null,
      };
      reservedPickups.push(pickup);
      scene.pickups.push(pickup);
    }
  };

  const spawnIntoPickup = (
    pickup: RuntimePickup,
    kind: CR1PickupKind,
    x: number,
    y: number,
    offsetIndex: number,
    checkpointId: CR1CheckpointId | null,
  ): void => {
    if (!scene) return;
    pickup.active = true;
    pickup.kind = kind;
    pickup.magnetized = checkpointId !== null;
    pickup.checkpointId = checkpointId;
    pickup.x = x + offsetIndex * 18;
    pickup.y = y + offsetIndex * 12;
    scene.paintPickup(pickup);
    pickup.view.setPosition(pickup.x, pickup.y).setVisible(true).setAlpha(1);
  };

  const configure = (candidate: RuntimeScene): void => {
    scene = candidate;
    gateState = advanceCR3ECheckpointGate(createCR3ECheckpointGateState(), Math.max(0, scene.elapsedActiveMs)).state;
    allocateReservedPickups();

    originalUpdate = scene.update;
    originalUpdateHud = scene.updateHud;
    originalSyncTestState = scene.syncTestState;
    originalSpawnEnemy = scene.spawnEnemy;
    originalSpawnPickup = scene.spawnPickup;
    originalKillEnemy = scene.killEnemy;
    originalCollectPickup = scene.collectPickup;

    patchedSpawnEnemy = function (this: RuntimeScene): void {
      spawnEnemyForDirector();
    };
    scene.spawnEnemy = patchedSpawnEnemy;

    patchedSpawnPickup = function (this: RuntimeScene, kind: CR1PickupKind, x: number, y: number, offsetIndex = 0): void {
      const pickups = this.pickups as RuntimePickup[];
      if (rewardSpawnContext !== null && kind !== "SIGNAL_XP") {
        const slotIndex = selectCR3ECheckpointRewardSlotIndex(pickups);
        if (slotIndex < 0) throw new Error(`CR-3E.1 reserved checkpoint reward capacity exhausted for ${rewardSpawnContext}.`);
        spawnIntoPickup(pickups[slotIndex], kind, x, y, offsetIndex, rewardSpawnContext);
        return;
      }
      const slotIndex = selectCR3EOrdinaryPickupSlotIndex(pickups);
      if (slotIndex < 0) return;
      spawnIntoPickup(pickups[slotIndex], kind, x, y, offsetIndex, null);
    };
    scene.spawnPickup = patchedSpawnPickup;

    patchedKillEnemy = function (this: RuntimeScene, enemy: Record<string, any>): void {
      if (!enemy?.active) return;
      const checkpointId = enemy.elite && enemy.checkpointId ? enemy.checkpointId as CR1CheckpointId : null;
      if (!checkpointId) {
        originalKillEnemy?.call(this, enemy);
        return;
      }
      if (gateState.phase !== "ELITE_ACTIVE" || gateState.activeCheckpoint !== checkpointId) {
        throw new Error(`CR-3E.1 checkpoint elite ${checkpointId} died outside its active gate.`);
      }
      const coresBefore = Number(this.evolutionCores ?? 0);
      const elitesBefore = Number(this.elitesDefeated ?? 0);
      rewardSpawnContext = checkpointId;
      try {
        originalKillEnemy?.call(this, enemy);
      } finally {
        rewardSpawnContext = null;
      }
      if (Number(this.elitesDefeated ?? 0) !== elitesBefore + 1) {
        throw new Error(`CR-3E.1 checkpoint elite ${checkpointId} did not commit its exactly-once reward ledger.`);
      }
      const rewards = checkpointRewards(checkpointId, coresBefore);
      gateState = beginCR3ECheckpointRewards(gateState, checkpointId, rewards);
      this.spawnAccumulator = 0;
      this.statusText?.setText(`${checkpointLabel(checkpointId)} DEFEATED // collect reward signal to advance.`);
      paintGateHud();
      syncDiagnostics();
    };
    scene.killEnemy = patchedKillEnemy;

    patchedCollectPickup = function (this: RuntimeScene, pickup: RuntimePickup): boolean {
      const checkpointId = pickup.checkpointId ?? null;
      const kind = pickup.kind;
      const result = originalCollectPickup?.call(this, pickup) ?? false;
      if (checkpointId !== null) {
        pickup.checkpointId = null;
        const collected = collectCR3ECheckpointReward(gateState, checkpointId, kind);
        if (!collected.accepted) {
          throw new Error(`CR-3E.1 rejected delivered checkpoint reward ${checkpointId}:${kind}.`);
        }
        gateState = collected.state;
        if (collected.checkpointResolved) {
          this.spawnAccumulator = 0;
          this.statusText?.setText(`${checkpointLabel(checkpointId)} COMPLETE // next stage unlocked.`);
          syncDirectorState();
        }
        paintGateHud();
        syncDiagnostics();
      }
      return result;
    };
    scene.collectPickup = patchedCollectPickup;

    patchedUpdateHud = function (this: RuntimeScene, ...args: any[]): any {
      const result = originalUpdateHud?.apply(this, args);
      paintGateHud();
      return result;
    };
    scene.updateHud = patchedUpdateHud;

    patchedSyncTestState = function (this: RuntimeScene, ...args: any[]): any {
      const result = originalSyncTestState?.apply(this, args);
      syncDiagnostics();
      return result;
    };
    scene.syncTestState = patchedSyncTestState;

    patchedUpdate = function (this: RuntimeScene, _time: number, delta: number): void {
      if (this.dead || this.draftOpen) { this.syncTestState(); return; }
      const dt = Math.min(50, Math.max(0, delta));
      this.elapsedActiveMs += dt;
      this.updateMovement(dt / 1000);
      advanceDirector(dt);
      const stage = currentStage();
      if (gateState.phase === "RUNNING" && stage.spawnIntervalMs !== null) {
        this.spawnAccumulator += dt;
        while (this.spawnAccumulator >= stage.spawnIntervalMs) {
          this.spawnAccumulator -= stage.spawnIntervalMs;
          this.spawnEnemy();
        }
      } else {
        this.spawnAccumulator = 0;
      }

      this.attackAccumulator += dt;
      const profile = this.deltaCombatProfile();
      if (this.attackAccumulator >= profile.cooldownMs) {
        this.attackAccumulator %= profile.cooldownMs;
        this.fireDelta(profile);
      }
      this.updatePendingDeltaEcho();

      if (this.vectorOwned) {
        const vectorProfile = this.vectorCombatProfile();
        if (this.vectorTransferState.armed && !isVectorTransferArmed(this.vectorTransferState, this.elapsedActiveMs)) {
          this.vectorTransferState = this.emptyVectorTransfer ? this.emptyVectorTransfer() : { armed: false, expiresAtMs: null, phase: null };
          this.vectorTransferExpiries += 1;
        }
        this.vectorAccumulator = Math.min(vectorProfile.cooldownMs, this.vectorAccumulator + dt);
        this.refreshVectorTarget();
        if (this.vectorAccumulator >= vectorProfile.cooldownMs && this.activeVectorProjectileCount() < vectorProfile.maxInFlight) {
          const target = this.currentVectorTarget();
          if (target) {
            this.fireVector(target);
            this.vectorAccumulator = 0;
          }
        }
        this.updateVectorProjectiles(dt / 1000);
      }

      if (this.orbitOwned) this.updateOrbit(dt);
      else this.orbitNode.clear().setVisible(false);

      if (this.echoOwned) this.updateEcho(dt);
      else this.hideEchoViews();

      if (this.signalOwned) this.updateSignalArc(dt);
      else this.signalFx.clear().setVisible(false);

      this.updateEnemies(dt / 1000);
      this.updateBeaconProjectiles(dt / 1000);
      this.updatePickups(dt / 1000);
      this.updateHud();

      if (!this.qualified && v21QualificationReached({
        elapsedMs: this.elapsedActiveMs,
        phase: this.phase,
        hp: this.hp,
        level: this.level,
        xp: this.xp,
        kills: this.kills,
        shifts: this.shifts,
        deltaRank: this.deltaRank,
      })) {
        this.qualified = true;
        this.statusText.setText("V2-1 LOOP COMPLETE // keep surviving or review the build.");
      }
      this.syncTestState();
    };
    scene.update = patchedUpdate;

    syncDirectorState();
    paintGateHud();
    configured = true;
    scene.syncTestState();
  };

  const tick = (): void => {
    if (disposed) return;
    if (!configured) {
      const candidate = game.scene.getScene("RareShiftV21Survival");
      if (sceneReady(candidate)) {
        try {
          configure(candidate);
        } catch (cause) {
          game.canvas.dataset.cr3e1CheckpointRuntimeError = cause instanceof Error ? cause.message : String(cause);
          disposed = true;
          return;
        }
      }
    } else {
      syncDiagnostics();
    }
    animationFrameId = window.requestAnimationFrame(tick);
  };

  animationFrameId = window.requestAnimationFrame(tick);

  return () => {
    disposed = true;
    if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
    if (scene) {
      if (originalUpdate && patchedUpdate && scene.update === patchedUpdate) scene.update = originalUpdate;
      if (originalUpdateHud && patchedUpdateHud && scene.updateHud === patchedUpdateHud) scene.updateHud = originalUpdateHud;
      if (originalSyncTestState && patchedSyncTestState && scene.syncTestState === patchedSyncTestState) scene.syncTestState = originalSyncTestState;
      if (originalSpawnEnemy && patchedSpawnEnemy && scene.spawnEnemy === patchedSpawnEnemy) scene.spawnEnemy = originalSpawnEnemy;
      if (originalSpawnPickup && patchedSpawnPickup && scene.spawnPickup === patchedSpawnPickup) scene.spawnPickup = originalSpawnPickup;
      if (originalKillEnemy && patchedKillEnemy && scene.killEnemy === patchedKillEnemy) scene.killEnemy = originalKillEnemy;
      if (originalCollectPickup && patchedCollectPickup && scene.collectPickup === patchedCollectPickup) scene.collectPickup = originalCollectPickup;
      for (const pickup of reservedPickups) {
        pickup.active = false;
        pickup.view.destroy(true);
      }
      scene.pickups = scene.pickups.filter((pickup: RuntimePickup) => !pickup.reservedForCheckpoint);
    }
    delete game.canvas.dataset.cr3e1CheckpointRuntime;
  };
}
