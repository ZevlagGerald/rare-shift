import type Phaser from "phaser";
import {
  CR3_DESYNC_PROVISIONAL_PROFILE,
  advanceCR3Desync,
  applyCR3BossDamage,
  applyCR3ShiftResponse,
  createCR3DesyncState,
  isCR3BreakOpen,
  type CR3DamageRejection,
  type CR3DesyncState,
} from "./cr3-desync-core.ts";
import {
  CR3_MAX_ACTIVE_ADDS,
  cr3PressureHitsPoint,
  cr3PressureLaneCenter,
  planCR3Pressure,
  type CR3PressurePlan,
} from "./cr3-pressure-core.ts";
import { deltaHitsTarget, type DeltaProfile, type V2EnemyKind } from "./phase-combat-core.ts";
import { buildSpawnSpec, V21_WORLD_HEIGHT, V21_WORLD_WIDTH } from "./survival-core.ts";
import type { Phase } from "./types.ts";

interface CR3RuntimeEnemy {
  id: number;
  active: boolean;
  kind: V2EnemyKind;
  elite: boolean;
  x: number;
  y: number;
}

interface CR3RuntimeScene extends Phaser.Scene {
  seed: number;
  phase: Phase;
  reduced: boolean;
  friend: Phaser.GameObjects.Container;
  enemies: CR3RuntimeEnemy[];
  spawnIndex: number;
  elapsedActiveMs: number;
  bossPending: boolean;
  dead: boolean;
  draftOpen: boolean;
  shifts: number;
  statusText: Phaser.GameObjects.Text;
  fireDelta(profile: DeltaProfile): void;
  shift(): void;
  syncTestState(): void;
  applyPlayerDamage(amount: number): boolean;
  activateEnemy(
    slot: CR3RuntimeEnemy,
    id: number,
    kind: V2EnemyKind,
    x: number,
    y: number,
    elite: boolean,
    checkpointId: null,
    hpMultiplier?: number,
  ): void;
  retireRegularEnemyForCheckpoint(enemy: CR3RuntimeEnemy): void;
}

interface CR3PressureRuntime {
  readonly plan: CR3PressurePlan;
  readonly startedAtMs: number;
  readonly resolveAtMs: number;
  readonly addPhase: Phase | null;
  readonly addPositions: readonly Readonly<{ x: number; y: number }>[];
  resolved: boolean;
}

const BOSS_X = V21_WORLD_WIDTH / 2;
const BOSS_Y = V21_WORLD_HEIGHT / 2 - 180;
const PRESSURE_LINE_EXTENT = Math.hypot(V21_WORLD_WIDTH, V21_WORLD_HEIGHT);

function sceneReady(scene: CR3RuntimeScene | undefined): scene is CR3RuntimeScene {
  return Boolean(
    scene
    && scene.friend
    && Array.isArray(scene.enemies)
    && typeof scene.fireDelta === "function"
    && typeof scene.shift === "function"
    && typeof scene.syncTestState === "function"
    && typeof scene.applyPlayerDamage === "function"
    && typeof scene.activateEnemy === "function"
    && typeof scene.retireRegularEnemyForCheckpoint === "function"
    && typeof scene.bossPending === "boolean"
    && Number.isFinite(scene.elapsedActiveMs),
  );
}

function setDataset(canvas: HTMLCanvasElement, name: string, value: string | number | boolean): void {
  canvas.dataset[name] = String(value);
}

function bossTone(phase: Phase): number {
  return phase === "A" ? 0x4cc9f0 : 0xf72585;
}

function pressureDecisionStartedAt(state: CR3DesyncState): number {
  if (state.phase === "ALIGNMENT" && state.nextCycleAtMs !== null) {
    return state.nextCycleAtMs - CR3_DESYNC_PROVISIONAL_PROFILE.alignmentCadenceMs;
  }
  if (state.phase === "CROSS_SPLIT" && state.nextCycleAtMs !== null) {
    return state.nextCycleAtMs - CR3_DESYNC_PROVISIONAL_PROFILE.crossSplitCadenceMs;
  }
  if (state.phase === "BREAK_WINDOW" && state.responseDeadlineMs !== null) {
    return state.responseDeadlineMs - CR3_DESYNC_PROVISIONAL_PROFILE.breakTellMs;
  }
  return state.phaseStartedAtMs;
}

export function installCR3DesyncPhaserRuntime(game: Phaser.Game): () => void {
  let scene: CR3RuntimeScene | undefined;
  let disposed = false;
  let configured = false;
  let animationFrameId: number | null = null;

  let bossState: CR3DesyncState | null = null;
  let bossView: Phaser.GameObjects.Container | null = null;
  let bossHealth: Phaser.GameObjects.Graphics | null = null;
  let bossHud: Phaser.GameObjects.Text | null = null;
  let lastPaintSignature = "";

  let pressureRuntime: CR3PressureRuntime | null = null;
  let pressureView: Phaser.GameObjects.Graphics | null = null;
  let pressureTelegraphs = 0;
  let pressureResolveEvents = 0;
  let pressureDamageEvents = 0;
  let pressureDamageBlocks = 0;
  let pressureAddSpawns = 0;
  let pressureLastHit = false;
  let pressureLastAddKind = "";
  const bossAddIds = new Set<number>();

  let originalFireDelta: CR3RuntimeScene["fireDelta"] | null = null;
  let patchedFireDelta: CR3RuntimeScene["fireDelta"] | null = null;
  let originalShift: CR3RuntimeScene["shift"] | null = null;
  let patchedShift: CR3RuntimeScene["shift"] | null = null;

  let acceptedDamageEvents = 0;
  let rejectedDamageEvents = 0;
  let acceptedShiftResponses = 0;
  let rejectedShiftResponses = 0;
  let defeatEvents = 0;
  let lastDamageRejection: CR3DamageRejection | "OUT_OF_GEOMETRY" = "NONE";

  const pruneBossAddIds = (): void => {
    if (!scene) return;
    for (const id of [...bossAddIds]) {
      if (!scene.enemies.some(enemy => enemy.active && enemy.id === id)) bossAddIds.delete(id);
    }
  };

  const retireBossAdds = (): void => {
    if (!scene) return;
    for (const id of [...bossAddIds]) {
      const enemy = scene.enemies.find(candidate => candidate.active && candidate.id === id);
      if (enemy && !enemy.elite) scene.retireRegularEnemyForCheckpoint(enemy);
    }
    bossAddIds.clear();
  };

  const syncDiagnostics = (): void => {
    if (!configured || !scene) return;
    pruneBossAddIds();
    const canvas = game.canvas;
    setDataset(canvas, "cr3RuntimeAdapter", "ACTIVE");
    setDataset(canvas, "cr3BossActive", bossState !== null && bossState.phase !== "DEFEATED");
    setDataset(canvas, "cr3BossX", BOSS_X);
    setDataset(canvas, "cr3BossY", BOSS_Y);
    setDataset(canvas, "cr3BossDamageAccepted", acceptedDamageEvents);
    setDataset(canvas, "cr3BossDamageRejected", rejectedDamageEvents);
    setDataset(canvas, "cr3BossLastDamageRejection", lastDamageRejection);
    setDataset(canvas, "cr3BossShiftAccepted", acceptedShiftResponses);
    setDataset(canvas, "cr3BossShiftRejected", rejectedShiftResponses);
    setDataset(canvas, "cr3BossDefeatEvents", defeatEvents);
    setDataset(canvas, "cr3PressureTelegraphs", pressureTelegraphs);
    setDataset(canvas, "cr3PressureResolveEvents", pressureResolveEvents);
    setDataset(canvas, "cr3PressureDamageEvents", pressureDamageEvents);
    setDataset(canvas, "cr3PressureDamageBlocks", pressureDamageBlocks);
    setDataset(canvas, "cr3PressureAddSpawns", pressureAddSpawns);
    setDataset(canvas, "cr3PressureLastHit", pressureLastHit);
    setDataset(canvas, "cr3PressureLastAddKind", pressureLastAddKind);
    setDataset(canvas, "cr3PressureBossOwnedAdds", bossAddIds.size);
    setDataset(canvas, "cr3PressureActive", pressureRuntime !== null && !pressureRuntime.resolved);
    setDataset(canvas, "cr3PressureTelegraphVisible", pressureRuntime !== null && !pressureRuntime.resolved);
    setDataset(canvas, "cr3PressureGeometry", pressureRuntime?.plan.geometry ?? "");
    setDataset(canvas, "cr3PressureAttack", pressureRuntime?.plan.attack ?? "");
    setDataset(canvas, "cr3PressureOrdinal", pressureRuntime?.plan.ordinal ?? "");
    setDataset(canvas, "cr3PressureResolveAt", pressureRuntime?.resolveAtMs ?? "");
    if (!bossState) {
      setDataset(canvas, "cr3BossPhase", "");
      setDataset(canvas, "cr3BossHp", "");
      setDataset(canvas, "cr3BossMaxHp", CR3_DESYNC_PROVISIONAL_PROFILE.maxHp);
      setDataset(canvas, "cr3BossVulnerability", "");
      setDataset(canvas, "cr3BossAddPhase", "");
      setDataset(canvas, "cr3BossExpectedResponse", "");
      setDataset(canvas, "cr3BossBreakOpen", false);
      setDataset(canvas, "cr3BossCycleOrdinal", "");
      setDataset(canvas, "cr3BossAttack", "");
      return;
    }
    setDataset(canvas, "cr3BossPhase", bossState.phase);
    setDataset(canvas, "cr3BossHp", bossState.hp);
    setDataset(canvas, "cr3BossMaxHp", bossState.maxHp);
    setDataset(canvas, "cr3BossVulnerability", bossState.vulnerability);
    setDataset(canvas, "cr3BossAddPhase", bossState.addPhase ?? "");
    setDataset(canvas, "cr3BossExpectedResponse", bossState.expectedResponse ?? "");
    setDataset(canvas, "cr3BossBreakOpen", isCR3BreakOpen(bossState, scene.elapsedActiveMs));
    setDataset(canvas, "cr3BossCycleOrdinal", bossState.cycleOrdinal);
    setDataset(canvas, "cr3BossAttack", bossState.attack);
  };

  const paintBoss = (force = false): void => {
    if (!scene || !bossState) return;
    const defeated = bossState.phase === "DEFEATED";
    const breakOpen = !defeated && isCR3BreakOpen(bossState, scene.elapsedActiveMs);
    const signature = [
      bossState.phase,
      bossState.hp,
      bossState.vulnerability,
      bossState.expectedResponse ?? "",
      bossState.cycleOrdinal,
      breakOpen ? 1 : 0,
    ].join(":");
    if (!force && signature === lastPaintSignature) return;
    lastPaintSignature = signature;

    if (!bossView) bossView = scene.add.container(BOSS_X, BOSS_Y).setDepth(34);
    if (!bossHealth) bossHealth = scene.add.graphics().setDepth(35);
    if (!bossHud) {
      bossHud = scene.add.text(480, 142, "", {
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#e8edf2",
        backgroundColor: "#0b0e12",
        padding: { x: 9, y: 5 },
        fontStyle: "bold",
        align: "center",
      }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(116);
    }

    bossView.removeAll(true);
    const tone = bossTone(bossState.vulnerability);
    bossView.setPosition(BOSS_X, BOSS_Y).setVisible(!defeated).setAlpha(defeated ? 0 : 1);
    if (!defeated) {
      bossView.add(scene.add.rectangle(0, 0, 92, 92, 0x050607, 0.96).setStrokeStyle(3, tone, 0.92).setRotation(Math.PI / 4));
      bossView.add(scene.add.rectangle(0, 0, 62, 62, 0x000000, 0).setStrokeStyle(2, 0xe8edf2, breakOpen ? 0.95 : 0.35));
      bossView.add(scene.add.circle(0, 0, 18, tone, breakOpen ? 0.72 : 0.28).setStrokeStyle(2, 0xe8edf2, 0.82));
      bossView.add(scene.add.rectangle(-44, 0, 8, 34, tone, 0.82));
      bossView.add(scene.add.rectangle(44, 0, 8, 34, tone, 0.82));
    }

    const ratio = Math.max(0, Math.min(1, bossState.hp / Math.max(1, bossState.maxHp)));
    bossHealth.clear().setScrollFactor(0).setDepth(117);
    bossHealth.fillStyle(0x202832, 0.96).fillRect(280, 170, 400, 8);
    bossHealth.fillStyle(defeated ? 0x657383 : tone, 1).fillRect(280, 170, 400 * ratio, 8);

    const stateLabel = defeated
      ? "DEFEATED"
      : bossState.phase === "BREAK_WINDOW"
        ? breakOpen
          ? `BREAK OPEN · PHASE ${bossState.vulnerability}`
          : `BREAK TELL · SHIFT → ${bossState.expectedResponse ?? "?"}`
        : `${bossState.phase.replace("_", "-")} · VULNERABLE ${bossState.vulnerability}`;
    bossHud.setText(`THE DESYNC // ${stateLabel} // ${bossState.hp}/${bossState.maxHp}`);
  };

  const paintPressure = (): void => {
    if (!scene) return;
    if (!pressureView) pressureView = scene.add.graphics().setDepth(33);
    pressureView.clear();
    if (!pressureRuntime || pressureRuntime.resolved || !bossState || bossState.phase === "DEFEATED") {
      pressureView.setVisible(false);
      return;
    }
    pressureView.setVisible(true);
    const plan = pressureRuntime.plan;
    const alpha = scene.reduced ? 0.54 : 0.76;
    if (plan.geometry === "RADIAL") {
      if (plan.radialRadius === null || plan.radialHalfWidth === null) throw new Error("CR-3 radial pressure plan is incomplete.");
      pressureView.lineStyle(2, 0xe8edf2, alpha).strokeCircle(BOSS_X, BOSS_Y, plan.radialRadius - plan.radialHalfWidth);
      pressureView.lineStyle(2, 0xe8edf2, alpha).strokeCircle(BOSS_X, BOSS_Y, plan.radialRadius + plan.radialHalfWidth);
      return;
    }
    if (plan.geometry === "LANE") {
      if (plan.laneAngleRad === null || plan.laneHalfWidth === null) throw new Error("CR-3 lane pressure plan is incomplete.");
      const center = cr3PressureLaneCenter(plan, BOSS_X, BOSS_Y);
      const dx = Math.cos(plan.laneAngleRad) * PRESSURE_LINE_EXTENT;
      const dy = Math.sin(plan.laneAngleRad) * PRESSURE_LINE_EXTENT;
      pressureView.lineStyle(plan.laneHalfWidth * 2, 0xe8edf2, scene.reduced ? 0.08 : 0.12).lineBetween(center.x - dx, center.y - dy, center.x + dx, center.y + dy);
      pressureView.lineStyle(2, 0xe8edf2, alpha).lineBetween(center.x - dx, center.y - dy, center.x + dx, center.y + dy);
      return;
    }
    const tone = bossState.addPhase ? bossTone(bossState.addPhase) : 0xe8edf2;
    for (const position of pressureRuntime.addPositions) {
      pressureView.lineStyle(3, tone, alpha).strokeCircle(position.x, position.y, 34);
      pressureView.lineStyle(1, 0xe8edf2, alpha * 0.8).strokeCircle(position.x, position.y, 44);
    }
  };

  const buildPressureRuntime = (): CR3PressureRuntime | null => {
    if (!scene || !bossState || bossState.phase === "DEFEATED") return null;
    const plan = planCR3Pressure(bossState.seed, bossState.cycleOrdinal, bossState.attack);
    const startedAtMs = pressureDecisionStartedAt(bossState);
    const addPositions = plan.geometry === "ALIGNED_ADDS"
      ? Object.freeze(Array.from({ length: plan.addCount }, (_, index) => {
        const spec = buildSpawnSpec(
          (bossState!.seed ^ 0x50524553) >>> 0,
          bossState!.cycleOrdinal * 4 + index,
          startedAtMs,
          { x: scene!.friend.x, y: scene!.friend.y },
        );
        return Object.freeze({ x: spec.position.x, y: spec.position.y });
      }))
      : Object.freeze([] as Readonly<{ x: number; y: number }>[]);
    return {
      plan,
      startedAtMs,
      resolveAtMs: startedAtMs + plan.telegraphMs,
      addPhase: bossState.addPhase,
      addPositions,
      resolved: false,
    };
  };

  const ensurePressureForBossDecision = (): void => {
    if (!scene || !bossState || bossState.phase === "DEFEATED") return;
    if (pressureRuntime?.plan.ordinal === bossState.cycleOrdinal && pressureRuntime.plan.attack === bossState.attack) return;
    pressureRuntime = buildPressureRuntime();
    if (pressureRuntime) pressureTelegraphs += 1;
    paintPressure();
  };

  const spawnAlignedAdds = (runtime: CR3PressureRuntime): void => {
    if (!scene || runtime.plan.geometry !== "ALIGNED_ADDS" || !runtime.addPhase) return;
    pruneBossAddIds();
    const room = Math.max(0, CR3_MAX_ACTIVE_ADDS - bossAddIds.size);
    const requested = Math.min(room, runtime.plan.addCount);
    const kind: V2EnemyKind = runtime.addPhase === "A" ? "SPLIT_A" : "SPLIT_B";
    let spawned = 0;
    for (let index = 0; index < requested; index += 1) {
      let slot = scene.enemies.find(enemy => !enemy.active);
      if (!slot) {
        slot = scene.enemies.find(enemy => enemy.active && !enemy.elite && !bossAddIds.has(enemy.id));
        if (slot) scene.retireRegularEnemyForCheckpoint(slot);
      }
      if (!slot) break;
      const position = runtime.addPositions[index];
      if (!position) break;
      const id = scene.spawnIndex++;
      scene.activateEnemy(slot, id, kind, position.x, position.y, false, null, 1);
      bossAddIds.add(id);
      spawned += 1;
    }
    pressureAddSpawns += spawned;
    if (spawned > 0) pressureLastAddKind = kind;
  };

  const resolvePressure = (): void => {
    if (!scene || !pressureRuntime || pressureRuntime.resolved || !bossState || bossState.phase === "DEFEATED") return;
    if (scene.elapsedActiveMs < pressureRuntime.resolveAtMs) return;
    pressureRuntime.resolved = true;
    pressureResolveEvents += 1;
    pressureLastHit = false;
    if (pressureRuntime.plan.geometry === "ALIGNED_ADDS") {
      spawnAlignedAdds(pressureRuntime);
    } else {
      const hit = cr3PressureHitsPoint(pressureRuntime.plan, BOSS_X, BOSS_Y, scene.friend.x, scene.friend.y);
      pressureLastHit = hit;
      if (hit) {
        if (scene.applyPlayerDamage(pressureRuntime.plan.damage)) pressureDamageEvents += 1;
        else pressureDamageBlocks += 1;
      }
    }
    paintPressure();
    syncDiagnostics();
  };

  const updatePressure = (): void => {
    if (!scene || !bossState) return;
    if (bossState.phase === "DEFEATED") {
      pressureRuntime = null;
      pressureView?.clear().setVisible(false);
      retireBossAdds();
      syncDiagnostics();
      return;
    }
    ensurePressureForBossDecision();
    resolvePressure();
    paintPressure();
  };

  const initializeBoss = (): void => {
    if (!scene || bossState) return;
    bossState = createCR3DesyncState((scene.seed ^ 0x43523342) >>> 0, scene.elapsedActiveMs);
    scene.statusText?.setText("THE DESYNC // phase authority detected.");
    ensurePressureForBossDecision();
    paintBoss(true);
    syncDiagnostics();
  };

  const applyDeltaToBoss = (profile: DeltaProfile): void => {
    if (!scene) return;
    if (scene.bossPending && !bossState) initializeBoss();
    if (!bossState || bossState.phase === "DEFEATED" || scene.dead || scene.draftOpen) return;
    if (!deltaHitsTarget(profile, BOSS_X - scene.friend.x, BOSS_Y - scene.friend.y)) {
      lastDamageRejection = "OUT_OF_GEOMETRY";
      rejectedDamageEvents += 1;
      syncDiagnostics();
      return;
    }

    const result = applyCR3BossDamage(bossState, {
      source: "WEAPON",
      attackPhase: profile.phase,
      amount: profile.damage,
      atMs: scene.elapsedActiveMs,
    });
    bossState = result.state;
    lastDamageRejection = result.rejection;
    if (result.accepted) acceptedDamageEvents += 1;
    else rejectedDamageEvents += 1;
    if (result.defeatedNow) {
      defeatEvents += 1;
      scene.statusText?.setText("THE DESYNC COLLAPSED // ending transition pending.");
    }
    updatePressure();
    paintBoss();
    syncDiagnostics();
  };

  const applyShiftToBoss = (shiftsBefore: number): void => {
    if (!scene) return;
    if (scene.bossPending && !bossState) initializeBoss();
    if (!bossState || scene.shifts === shiftsBefore || bossState.phase !== "BREAK_WINDOW") return;
    if (isCR3BreakOpen(bossState, scene.elapsedActiveMs)) return;
    const result = applyCR3ShiftResponse(bossState, scene.phase, scene.elapsedActiveMs);
    bossState = result.state;
    if (result.accepted) {
      acceptedShiftResponses += 1;
      scene.statusText?.setText(`THE DESYNC // BREAK OPEN · Phase ${scene.phase}.`);
    } else {
      rejectedShiftResponses += 1;
    }
    updatePressure();
    paintBoss();
    syncDiagnostics();
  };

  const configure = (candidate: CR3RuntimeScene): void => {
    scene = candidate;
    originalFireDelta = scene.fireDelta;
    originalShift = scene.shift;

    patchedFireDelta = function (this: CR3RuntimeScene, profile: DeltaProfile): void {
      originalFireDelta?.call(this, profile);
      applyDeltaToBoss(profile);
    };
    scene.fireDelta = patchedFireDelta;

    patchedShift = function (this: CR3RuntimeScene): void {
      const shiftsBefore = this.shifts;
      originalShift?.call(this);
      applyShiftToBoss(shiftsBefore);
    };
    scene.shift = patchedShift;

    configured = true;
    syncDiagnostics();
  };

  const tick = (): void => {
    if (disposed) return;
    if (!configured) {
      const candidate = game.scene.getScene("RareShiftV21Survival") as CR3RuntimeScene | undefined;
      if (sceneReady(candidate)) {
        try {
          configure(candidate);
        } catch (cause) {
          game.canvas.dataset.cr3RuntimeError = cause instanceof Error ? cause.message : String(cause);
          disposed = true;
          return;
        }
      }
    } else if (scene) {
      if (scene.bossPending && !bossState) initializeBoss();
      if (bossState && bossState.phase !== "DEFEATED") {
        bossState = advanceCR3Desync(bossState, scene.elapsedActiveMs);
      }
      if (bossState) {
        updatePressure();
        paintBoss();
      }
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
      if (originalShift && patchedShift && scene.shift === patchedShift) scene.shift = originalShift;
      retireBossAdds();
    }
    pressureView?.destroy();
    bossView?.destroy(true);
    bossHealth?.destroy();
    bossHud?.destroy();
    pressureRuntime = null;
    bossState = null;
  };
}
