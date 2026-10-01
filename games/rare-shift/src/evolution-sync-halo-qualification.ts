import type Phaser from "phaser";
import {
  SYNC_HALO_CONTROL_RADIUS,
  SYNC_HALO_CONTROL_REARM_MS,
  SYNC_HALO_CONTROL_TARGET_CAP,
  SYNC_HALO_RADIUS,
  SYNC_HALO_SAMPLE_COUNT,
  canEmitSyncHaloControl,
  planSyncHaloControlTargets,
  syncHaloPositions,
  type SyncHaloControlRole,
} from "./evolution-runtime-core.ts";
import type { V2EnemyKind } from "./phase-combat-core.ts";
import type { Phase } from "./types.ts";
import type { V23ProtocolFamily, V23WeaponFamily } from "./progression-core.ts";

const EV3C_NORMAL_ID = 9_003_301;
const EV3C_BOSS_ID = 9_003_302;
const EV3C_COMMON_ID = 9_003_303;
const EV3C_ELITE_ID = 9_003_304;
const EV3C_NORMAL_2_ID = 9_003_305;
const EV3C_NORMAL_3_ID = 9_003_306;
const EV3C_NORMAL_4_ID = 9_003_307;
const EV3C_CAPPED_ID = 9_003_308;
const EV3C_GHOST_ID = 9_003_309;

type EnemyRuntimeLike = {
  id: number;
  active: boolean;
  kind: V2EnemyKind;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  staggerUntilMs: number;
  elite: boolean;
  view: Phaser.GameObjects.Container;
};

type FriendRuntimeLike = {
  x: number;
  y: number;
};

type ActivateEnemyLike = (
  slot: EnemyRuntimeLike,
  id: number,
  kind: V2EnemyKind,
  x: number,
  y: number,
  elite: boolean,
  checkpointId: null,
  hpMultiplier?: number,
) => void;

type SyncHaloQualificationScene = Phaser.Scene & {
  phase: Phase;
  friend: FriendRuntimeLike;
  enemies: EnemyRuntimeLike[];
  elapsedActiveMs: number;
  dead: boolean;
  draftOpen: boolean;
  orbitOwned: boolean;
  orbitRank: number;
  orbitAngle: number;
  orbitLastShiftAnchor: number | null;
  weaponSlotsUsed: number;
  evolvedWeapons: Partial<Record<V23WeaponFamily, boolean>>;
  protocols: Partial<Record<V23ProtocolFamily, number>>;
  activateEnemy: ActivateEnemyLike;
  tryEmitOrbitShear(anchorAngle: number): void;
};

type FixtureTarget = {
  readonly enemy: EnemyRuntimeLike;
  readonly role: SyncHaloControlRole;
  readonly initialX: number;
  readonly initialY: number;
};

function sceneReady(scene: SyncHaloQualificationScene | undefined): scene is SyncHaloQualificationScene {
  return Boolean(
    scene
    && scene.friend
    && Array.isArray(scene.enemies)
    && typeof scene.activateEnemy === "function"
    && typeof scene.tryEmitOrbitShear === "function",
  );
}

function setDataset(canvas: HTMLCanvasElement, name: string, value: string | number | boolean): void {
  canvas.dataset[name] = String(value);
}

function serializePositions(points: readonly { readonly x: number; readonly y: number }[]): string {
  return points.map(point => `${point.x.toFixed(3)}:${point.y.toFixed(3)}`).join("|");
}

export function installSyncHaloQualification(game: Phaser.Game): () => void {
  let scene: SyncHaloQualificationScene | undefined;
  let originalTryEmitOrbitShear: SyncHaloQualificationScene["tryEmitOrbitShear"] | null = null;
  let patchedTryEmitOrbitShear: SyncHaloQualificationScene["tryEmitOrbitShear"] | null = null;
  let fixtures = new Map<number, FixtureTarget>();
  let lastControlAtMs: number | null = null;
  let controlEvents = 0;
  let rearmBlocks = 0;
  let firstTargetIds: number[] = [];
  let firstDisplacements: number[] = [];
  let lastTargetIds: number[] = [];
  let haloAnchor: number | null = null;
  let haloPositions: readonly { readonly x: number; readonly y: number }[] = [];
  let configured = false;
  let disposed = false;
  let animationFrameId: number | null = null;

  const fixture = (id: number): FixtureTarget | null => fixtures.get(id) ?? null;

  const syncDiagnostics = (): void => {
    if (!configured || !scene) return;
    const canvas = game.canvas;
    const normal = fixture(EV3C_NORMAL_ID);
    const common = fixture(EV3C_COMMON_ID);
    const elite = fixture(EV3C_ELITE_ID);
    const boss = fixture(EV3C_BOSS_ID);
    const capped = fixture(EV3C_CAPPED_ID);
    const ghost = fixture(EV3C_GHOST_ID);

    setDataset(canvas, "syncQualificationFixture", "SYNC_HALO");
    setDataset(canvas, "syncEvolved", scene.evolvedWeapons.ORBIT === true);
    setDataset(canvas, "syncHaloSampleCount", SYNC_HALO_SAMPLE_COUNT);
    setDataset(canvas, "syncHaloRadius", SYNC_HALO_RADIUS);
    setDataset(canvas, "syncControlRadius", SYNC_HALO_CONTROL_RADIUS);
    setDataset(canvas, "syncControlRearmMs", SYNC_HALO_CONTROL_REARM_MS);
    setDataset(canvas, "syncControlTargetCap", SYNC_HALO_CONTROL_TARGET_CAP);
    setDataset(canvas, "syncControlEvents", controlEvents);
    setDataset(canvas, "syncControlRearmBlocks", rearmBlocks);
    setDataset(canvas, "syncLastControlAtMs", lastControlAtMs ?? "");
    setDataset(canvas, "syncFirstTargetIds", firstTargetIds.join(","));
    setDataset(canvas, "syncFirstDisplacements", firstDisplacements.join(","));
    setDataset(canvas, "syncLastTargetIds", lastTargetIds.join(","));
    setDataset(canvas, "syncHaloAnchor", haloAnchor ?? "");
    setDataset(canvas, "syncSceneAnchor", scene.orbitLastShiftAnchor ?? "");
    setDataset(canvas, "syncHaloPositions", serializePositions(haloPositions));

    for (const [label, target] of [
      ["Normal", normal],
      ["Common", common],
      ["Elite", elite],
      ["Boss", boss],
      ["Capped", capped],
      ["Ghost", ghost],
    ] as const) {
      if (!target) continue;
      setDataset(canvas, `sync${label}Id`, target.enemy.id);
      setDataset(canvas, `sync${label}InitialX`, target.initialX);
      setDataset(canvas, `sync${label}InitialY`, target.initialY);
      setDataset(canvas, `sync${label}X`, target.enemy.x);
      setDataset(canvas, `sync${label}Y`, target.enemy.y);
    }
  };

  const drawHalo = (anchorAngle: number): void => {
    if (!scene) return;
    const points = syncHaloPositions(scene.friend.x, scene.friend.y, anchorAngle, true);
    haloPositions = points;
    const fx = scene.add.graphics().setDepth(28);
    fx.lineStyle(2, 0xe8edf2, 0.72);
    fx.strokeCircle(scene.friend.x, scene.friend.y, SYNC_HALO_RADIUS);
    fx.fillStyle(0xe8edf2, 0.82);
    for (const point of points) fx.fillCircle(point.x, point.y, 4);
    scene.time.delayedCall(100, () => fx.destroy());
  };

  const applyControl = (anchorAngle: number): void => {
    if (!scene || scene.dead || scene.draftOpen || scene.evolvedWeapons.ORBIT !== true || scene.orbitRank !== 5) return;
    if (!canEmitSyncHaloControl(true, lastControlAtMs, scene.elapsedActiveMs)) {
      rearmBlocks += 1;
      syncDiagnostics();
      return;
    }

    lastControlAtMs = scene.elapsedActiveMs;
    controlEvents += 1;
    haloAnchor = anchorAngle;
    drawHalo(anchorAngle);

    const candidates = [...fixtures.values()].map(target => ({
      id: target.enemy.id,
      kind: target.enemy.kind,
      active: target.enemy.active,
      x: target.enemy.x,
      y: target.enemy.y,
      role: target.role,
    }));
    const planned = planSyncHaloControlTargets(true, candidates, scene.phase, scene.friend.x, scene.friend.y);
    lastTargetIds = planned.map(target => target.id);
    if (controlEvents === 1) {
      firstTargetIds = planned.map(target => target.id);
      firstDisplacements = planned.map(target => target.displacement);
    }

    for (const target of planned) {
      const fixtureTarget = fixtures.get(target.id);
      if (!fixtureTarget || !fixtureTarget.enemy.active) continue;
      const enemy = fixtureTarget.enemy;
      const dx = enemy.x - scene.friend.x;
      const dy = enemy.y - scene.friend.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      enemy.x += dx / distance * target.displacement;
      enemy.y += dy / distance * target.displacement;
      enemy.view.setPosition(enemy.x, enemy.y);
    }
    syncDiagnostics();
  };

  const configure = (candidate: SyncHaloQualificationScene): void => {
    scene = candidate;
    const slots = scene.enemies.filter(enemy => !enemy.active).slice(0, 9);
    if (slots.length < 9) throw new Error("EV-3C SYNC HALO qualification requires nine inactive enemy slots.");

    const postShiftPhase: Phase = scene.phase === "A" ? "B" : "A";
    const legalKind: V2EnemyKind = postShiftPhase === "A" ? "SPLIT_A" : "SPLIT_B";
    const ghostKind: V2EnemyKind = postShiftPhase === "A" ? "SPLIT_B" : "SPLIT_A";
    const specs: readonly {
      readonly id: number;
      readonly distance: number;
      readonly kind: V2EnemyKind;
      readonly role: SyncHaloControlRole;
      readonly elite: boolean;
    }[] = Object.freeze([
      { id: EV3C_GHOST_ID, distance: 45, kind: ghostKind, role: "NORMAL", elite: false },
      { id: EV3C_NORMAL_ID, distance: 50, kind: legalKind, role: "NORMAL", elite: false },
      { id: EV3C_BOSS_ID, distance: 55, kind: "ANCHOR", role: "BOSS", elite: true },
      { id: EV3C_COMMON_ID, distance: 60, kind: "TRACE", role: "COMMON", elite: false },
      { id: EV3C_ELITE_ID, distance: 70, kind: "ANCHOR", role: "ELITE", elite: true },
      { id: EV3C_NORMAL_2_ID, distance: 80, kind: legalKind, role: "NORMAL", elite: false },
      { id: EV3C_NORMAL_3_ID, distance: 90, kind: legalKind, role: "NORMAL", elite: false },
      { id: EV3C_NORMAL_4_ID, distance: 100, kind: legalKind, role: "NORMAL", elite: false },
      { id: EV3C_CAPPED_ID, distance: 105, kind: legalKind, role: "NORMAL", elite: false },
    ]);

    scene.orbitOwned = true;
    scene.orbitRank = 5;
    scene.weaponSlotsUsed = Math.max(2, scene.weaponSlotsUsed);
    scene.evolvedWeapons = { ...scene.evolvedWeapons, ORBIT: true };
    scene.protocols = { ...scene.protocols, ORBIT_STABILIZER: Math.max(1, scene.protocols.ORBIT_STABILIZER ?? 0) };

    const nextFixtures = new Map<number, FixtureTarget>();
    specs.forEach((spec, index) => {
      const slot = slots[index];
      const x = scene!.friend.x + spec.distance;
      const y = scene!.friend.y;
      scene!.activateEnemy(slot, spec.id, spec.kind, x, y, spec.elite, null, 1000);
      slot.staggerUntilMs = Number.POSITIVE_INFINITY;
      nextFixtures.set(spec.id, Object.freeze({ enemy: slot, role: spec.role, initialX: x, initialY: y }));
    });
    fixtures = nextFixtures;

    const canvas = game.canvas;
    setDataset(canvas, "syncPostShiftPhase", postShiftPhase);
    setDataset(canvas, "syncLegalPhaseKind", legalKind);
    setDataset(canvas, "syncGhostPhaseKind", ghostKind);
    setDataset(canvas, "syncInstallOrbitAngle", scene.orbitAngle);
    setDataset(canvas, "syncInstallControlEvents", controlEvents);

    originalTryEmitOrbitShear = scene.tryEmitOrbitShear;
    patchedTryEmitOrbitShear = function (this: SyncHaloQualificationScene, anchorAngle: number): void {
      originalTryEmitOrbitShear?.call(this, anchorAngle);
      applyControl(anchorAngle);
    };
    scene.tryEmitOrbitShear = patchedTryEmitOrbitShear;
    configured = true;
    syncDiagnostics();
  };

  const tick = (): void => {
    if (disposed) return;
    if (!configured) {
      const candidate = game.scene.getScene("RareShiftV21Survival") as SyncHaloQualificationScene | undefined;
      if (sceneReady(candidate)) {
        try {
          configure(candidate);
        } catch (cause) {
          game.canvas.dataset.syncQualificationError = cause instanceof Error ? cause.message : String(cause);
          disposed = true;
          return;
        }
      }
    }
    syncDiagnostics();
    animationFrameId = window.requestAnimationFrame(tick);
  };

  animationFrameId = window.requestAnimationFrame(tick);

  return () => {
    disposed = true;
    if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
    if (scene && originalTryEmitOrbitShear && patchedTryEmitOrbitShear && scene.tryEmitOrbitShear === patchedTryEmitOrbitShear) {
      scene.tryEmitOrbitShear = originalTryEmitOrbitShear;
    }
    fixtures = new Map();
  };
}
