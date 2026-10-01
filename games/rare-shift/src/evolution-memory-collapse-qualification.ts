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
  MEMORY_COLLAPSE_CHAIN_CAP,
  MEMORY_COLLAPSE_LINK_RADIUS,
  MEMORY_COLLAPSE_PROPAGATED_DAMAGE_MULTIPLIER,
  planMemoryCollapseChain,
} from "./evolution-runtime-core.ts";
import { isEnemyCorporeal, type V2EnemyKind } from "./phase-combat-core.ts";
import type { Phase } from "./types.ts";
import type { V23ProtocolFamily, V23WeaponFamily } from "./progression-core.ts";

const EV3D_TRIGGER_ID = 9_003_401;
const EV3D_LEDGER_ID = 9_003_402;
const CAP_OFFSETS = Object.freeze([0, 60, 120, 180] as const);
const EXCLUSION_OFFSETS = Object.freeze([600, 660, 720] as const);
const FIXTURE_HP_MULTIPLIER = 1000;

type EnemyRuntimeLike = {
  id: number;
  active: boolean;
  kind: V2EnemyKind;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  staggerUntilMs: number;
  beaconNextShotAt: number;
  flickerNextSwitchAt: number;
  eliteNextPulseAt: number;
  view: Phaser.GameObjects.Container;
};

type EchoMineRuntimeLike = {
  active: boolean;
  mine: EchoMineCore | null;
  view: Phaser.GameObjects.Graphics;
};

type FriendRuntimeLike = Phaser.GameObjects.Container & {
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

type MemoryCollapseQualificationScene = Phaser.Scene & {
  phase: Phase;
  friend: FriendRuntimeLike;
  enemies: EnemyRuntimeLike[];
  elapsedActiveMs: number;
  dead: boolean;
  draftOpen: boolean;
  echoOwned: boolean;
  echoRank: number;
  echoPlacementAccumulator: number;
  echoPlacements: number;
  echoTriggers: number;
  echoHits: number;
  echoBurstSuppressedHits: number;
  echoBurstLedger: EchoBurstLedger;
  echoMines: EchoMineRuntimeLike[];
  weaponSlotsUsed: number;
  evolvedWeapons: Partial<Record<V23WeaponFamily, boolean>>;
  protocols: Partial<Record<V23ProtocolFamily, number>>;
  activateEnemy: ActivateEnemyLike;
  updateEcho(dtMs: number): void;
  tryPlaceEchoMine(): void;
  echoCombatProfile(rank?: number, memoryDepth?: number): EchoRankProfile;
  deactivateEchoMine(runtime: EchoMineRuntimeLike): void;
  emitEchoBlastFx(x: number, y: number, recordedPhase: Phase, profile: EchoRankProfile): void;
};

type MineSnapshot = {
  readonly runtime: EchoMineRuntimeLike;
  readonly mine: EchoMineCore;
  readonly profile: EchoRankProfile;
  readonly triggerLegal: boolean;
};

type Stage =
  | "CAP_PLACEMENT"
  | "CAP_READY_TO_ARM"
  | "CAP_AWAY"
  | "CAP_TRIGGER_ARMED"
  | "CAP_PROVEN"
  | "EXCLUSION_PLACEMENT"
  | "EXCLUSION_READY_TO_ARM"
  | "EXCLUSION_HALF"
  | "EXCLUSION_TRIGGER_ARMED"
  | "DONE";

function sceneReady(scene: MemoryCollapseQualificationScene | undefined): scene is MemoryCollapseQualificationScene {
  return Boolean(
    scene
    && scene.friend
    && Array.isArray(scene.enemies)
    && Array.isArray(scene.echoMines)
    && typeof scene.activateEnemy === "function"
    && typeof scene.updateEcho === "function"
    && typeof scene.tryPlaceEchoMine === "function"
    && typeof scene.echoCombatProfile === "function"
    && typeof scene.deactivateEchoMine === "function"
    && typeof scene.emitEchoBlastFx === "function",
  );
}

function setDataset(canvas: HTMLCanvasElement, name: string, value: string | number | boolean): void {
  canvas.dataset[name] = String(value);
}

function activeMineSnapshots(scene: MemoryCollapseQualificationScene): MineSnapshot[] {
  return scene.echoMines
    .filter((runtime): runtime is EchoMineRuntimeLike & { mine: EchoMineCore } => runtime.active && runtime.mine !== null)
    .map(runtime => {
      const mine = runtime.mine;
      const profile = scene.echoCombatProfile(scene.echoRank, mine.memoryDepth);
      return Object.freeze({
        runtime,
        mine,
        profile,
        triggerLegal: isEchoTriggerWindowOpen(mine, scene.phase, scene.elapsedActiveMs, profile),
      });
    })
    .sort((a, b) => a.mine.id - b.mine.id);
}

function quarantineEnemy(enemy: EnemyRuntimeLike): void {
  enemy.x = 120;
  enemy.y = 120;
  enemy.staggerUntilMs = Number.POSITIVE_INFINITY;
  enemy.beaconNextShotAt = Number.POSITIVE_INFINITY;
  enemy.flickerNextSwitchAt = Number.POSITIVE_INFINITY;
  enemy.eliteNextPulseAt = Number.POSITIVE_INFINITY;
  enemy.view.setPosition(enemy.x, enemy.y);
}

export function installMemoryCollapseQualification(game: Phaser.Game): () => void {
  let scene: MemoryCollapseQualificationScene | undefined;
  let originalUpdateEcho: MemoryCollapseQualificationScene["updateEcho"] | null = null;
  let patchedUpdateEcho: MemoryCollapseQualificationScene["updateEcho"] | null = null;
  let originalTryPlaceEchoMine: MemoryCollapseQualificationScene["tryPlaceEchoMine"] | null = null;
  let patchedTryPlaceEchoMine: MemoryCollapseQualificationScene["tryPlaceEchoMine"] | null = null;
  let originalActivateEnemy: MemoryCollapseQualificationScene["activateEnemy"] | null = null;
  let patchedActivateEnemy: MemoryCollapseQualificationScene["activateEnemy"] | null = null;

  let stage: Stage = "CAP_PLACEMENT";
  let basePhase: Phase = "A";
  let awayPhase: Phase = "B";
  let baseX = 0;
  let baseY = 0;
  let capPlaced = 0;
  let exclusionPlaced = 0;
  let capMineIds: number[] = [];
  let exclusionMineIds: number[] = [];
  let survivorId: number | null = null;
  let triggerEnemy: EnemyRuntimeLike | null = null;
  let ledgerEnemy: EnemyRuntimeLike | null = null;
  let triggerInitialHp = 0;
  let ledgerInitialHp = 0;
  let capChainIds: number[] = [];
  let capLegalIds: number[] = [];
  let capExcludedId: number | null = null;
  let capStartId: number | null = null;
  let capStartDamage = 0;
  let capPropagatedDamages: number[] = [];
  let capPropagatedHits = 0;
  let capSuppressedHits = 0;
  let exclusionChainIds: number[] = [];
  let exclusionInvalidId: number | null = null;
  let exclusionInvalidState = "";
  let exclusionInvalidDistance = 0;
  let exclusionInvalidTriggerLegal = false;
  let naturalTriggerEvents = 0;
  let disposed = false;
  let configured = false;
  let animationFrameId: number | null = null;

  const fixtureIds = new Set([EV3D_TRIGGER_ID, EV3D_LEDGER_ID]);

  const syncDiagnostics = (): void => {
    if (!configured || !scene) return;
    const canvas = game.canvas;
    const mines = activeMineSnapshots(scene);
    setDataset(canvas, "memoryQualificationFixture", "MEMORY_COLLAPSE");
    setDataset(canvas, "memoryStage", stage);
    setDataset(canvas, "memoryEvolved", scene.evolvedWeapons.ECHO === true);
    setDataset(canvas, "memoryLinkRadius", MEMORY_COLLAPSE_LINK_RADIUS);
    setDataset(canvas, "memoryChainCap", MEMORY_COLLAPSE_CHAIN_CAP);
    setDataset(canvas, "memoryDamageMultiplier", MEMORY_COLLAPSE_PROPAGATED_DAMAGE_MULTIPLIER);
    setDataset(canvas, "memoryActiveMineIds", mines.map(item => item.mine.id).join(","));
    setDataset(canvas, "memoryActiveMineStates", mines.map(item => `${item.mine.id}:${item.mine.state}`).join(","));
    setDataset(canvas, "memoryActiveMineDepths", mines.map(item => `${item.mine.id}:${item.mine.memoryDepth}`).join(","));
    setDataset(canvas, "memoryCapMineIds", capMineIds.join(","));
    setDataset(canvas, "memoryExclusionMineIds", exclusionMineIds.join(","));
    setDataset(canvas, "memoryCapChainIds", capChainIds.join(","));
    setDataset(canvas, "memoryCapLegalIds", capLegalIds.join(","));
    setDataset(canvas, "memoryCapExcludedId", capExcludedId ?? "");
    setDataset(canvas, "memoryCapStartId", capStartId ?? "");
    setDataset(canvas, "memoryCapStartDamage", capStartDamage);
    setDataset(canvas, "memoryCapPropagatedDamages", capPropagatedDamages.join(","));
    setDataset(canvas, "memoryCapPropagatedHits", capPropagatedHits);
    setDataset(canvas, "memoryCapSuppressedHits", capSuppressedHits);
    setDataset(canvas, "memoryExclusionChainIds", exclusionChainIds.join(","));
    setDataset(canvas, "memoryExclusionInvalidId", exclusionInvalidId ?? "");
    setDataset(canvas, "memoryExclusionInvalidState", exclusionInvalidState);
    setDataset(canvas, "memoryExclusionInvalidDistance", exclusionInvalidDistance);
    setDataset(canvas, "memoryExclusionInvalidTriggerLegal", exclusionInvalidTriggerLegal);
    setDataset(canvas, "memoryNaturalTriggerEvents", naturalTriggerEvents);
    setDataset(canvas, "memoryTriggerId", triggerEnemy?.id ?? "");
    setDataset(canvas, "memoryTriggerInitialHp", triggerInitialHp);
    setDataset(canvas, "memoryTriggerHp", triggerEnemy?.hp ?? "");
    setDataset(canvas, "memoryLedgerId", ledgerEnemy?.id ?? "");
    setDataset(canvas, "memoryLedgerInitialHp", ledgerInitialHp);
    setDataset(canvas, "memoryLedgerHp", ledgerEnemy?.hp ?? "");
  };

  const moveFixtureEnemiesAway = (): void => {
    if (triggerEnemy) quarantineEnemy(triggerEnemy);
    if (ledgerEnemy) quarantineEnemy(ledgerEnemy);
  };

  const ensureFixtureEnemies = (): void => {
    if (!scene) return;
    if (!triggerEnemy || !triggerEnemy.active || !ledgerEnemy || !ledgerEnemy.active) {
      const slots = scene.enemies.filter(enemy => !enemy.active).slice(0, 2);
      if (slots.length < 2) throw new Error("EV-3D MEMORY COLLAPSE qualification requires two inactive enemy slots.");
      scene.activateEnemy(slots[0], EV3D_TRIGGER_ID, "TRACE", 120, 120, false, null, FIXTURE_HP_MULTIPLIER);
      scene.activateEnemy(slots[1], EV3D_LEDGER_ID, "TRACE", 120, 120, false, null, FIXTURE_HP_MULTIPLIER);
      triggerEnemy = slots[0];
      ledgerEnemy = slots[1];
    }
    quarantineEnemy(triggerEnemy);
    quarantineEnemy(ledgerEnemy);
  };

  const armCapTargets = (): void => {
    if (!scene || !triggerEnemy || !ledgerEnemy) return;
    const startX = baseX + CAP_OFFSETS[0];
    triggerEnemy.x = startX - 60;
    triggerEnemy.y = baseY;
    triggerEnemy.view.setPosition(triggerEnemy.x, triggerEnemy.y);
    ledgerEnemy.x = startX + 60;
    ledgerEnemy.y = baseY + 80;
    ledgerEnemy.view.setPosition(ledgerEnemy.x, ledgerEnemy.y);
    triggerInitialHp = triggerEnemy.hp;
    ledgerInitialHp = ledgerEnemy.hp;
    stage = "CAP_TRIGGER_ARMED";
  };

  const armExclusionTarget = (): void => {
    if (!scene || !triggerEnemy || !ledgerEnemy) return;
    const startX = baseX + EXCLUSION_OFFSETS[0];
    triggerEnemy.x = startX - 60;
    triggerEnemy.y = baseY;
    triggerEnemy.view.setPosition(triggerEnemy.x, triggerEnemy.y);
    quarantineEnemy(ledgerEnemy);
    triggerInitialHp = triggerEnemy.hp;
    stage = "EXCLUSION_TRIGGER_ARMED";
  };

  const propagateChain = (
    start: MineSnapshot,
    before: readonly MineSnapshot[],
    label: "CAP" | "EXCLUSION",
  ): void => {
    if (!scene) return;
    const candidates = before.map(item => ({
      id: item.mine.id,
      active: true,
      armed: item.mine.state === "RETURN_READY",
      triggerLegal: item.triggerLegal,
      x: item.mine.x,
      y: item.mine.y,
    }));
    const chain = [...planMemoryCollapseChain(true, candidates, start.mine.id)];
    if (label === "CAP") {
      capChainIds = chain;
      capLegalIds = candidates.filter(item => item.active && item.armed && item.triggerLegal).map(item => item.id);
      capStartId = start.mine.id;
      capStartDamage = start.profile.damage;
      capExcludedId = capLegalIds.find(id => !chain.includes(id)) ?? null;
      capPropagatedDamages = [];
      capPropagatedHits = 0;
      capSuppressedHits = 0;
    } else {
      exclusionChainIds = chain;
      const invalid = before.find(item => item.mine.id === survivorId) ?? null;
      if (invalid) {
        exclusionInvalidId = invalid.mine.id;
        exclusionInvalidState = invalid.mine.state;
        exclusionInvalidTriggerLegal = invalid.triggerLegal;
        exclusionInvalidDistance = Math.hypot(invalid.mine.x - start.mine.x, invalid.mine.y - start.mine.y);
      }
    }

    for (const id of chain.slice(1)) {
      const snapshot = before.find(item => item.mine.id === id);
      if (!snapshot) throw new Error(`EV-3D chain referenced unknown mine ${id}.`);
      const runtime = scene.echoMines.find(item => item.active && item.mine?.id === id) ?? null;
      if (!runtime || !runtime.mine) throw new Error(`EV-3D propagated mine ${id} was not live after the genuine ECHO trigger.`);
      const profile = scene.echoCombatProfile(scene.echoRank, runtime.mine.memoryDepth);
      if (!isEchoTriggerWindowOpen(runtime.mine, scene.phase, scene.elapsedActiveMs, profile)) {
        throw new Error(`EV-3D propagated mine ${id} lost trigger legality before propagation.`);
      }
      const targetIds = echoBlastTargetIds(runtime.mine, scene.phase, scene.enemies, profile);
      scene.deactivateEchoMine(runtime);
      scene.emitEchoBlastFx(snapshot.mine.x, snapshot.mine.y, snapshot.mine.recordedPhase, profile);
      const plan = planEchoDamageTargets(targetIds, scene.echoRank, scene.elapsedActiveMs, scene.echoBurstLedger);
      const suppressed = targetIds.length - plan.targetIds.length;
      scene.echoBurstSuppressedHits += suppressed;
      scene.echoBurstLedger = plan.ledger;
      if (label === "CAP") {
        capPropagatedDamages.push(profile.damage * MEMORY_COLLAPSE_PROPAGATED_DAMAGE_MULTIPLIER);
        capSuppressedHits += suppressed;
      }
      for (const targetId of plan.targetIds) {
        const enemy = scene.enemies.find(item => item.active && item.id === targetId);
        if (!enemy || !isEnemyCorporeal(enemy.kind, scene.phase)) continue;
        enemy.hp -= profile.damage * MEMORY_COLLAPSE_PROPAGATED_DAMAGE_MULTIPLIER;
        scene.echoHits += 1;
        if (label === "CAP") capPropagatedHits += 1;
      }
    }
  };

  const handleGenuineTrigger = (before: readonly MineSnapshot[], triggerDelta: number): void => {
    if (!scene || triggerDelta <= 0) return;
    naturalTriggerEvents += triggerDelta;
    if (triggerDelta !== 1) throw new Error(`EV-3D expected one genuine ECHO trigger, observed ${triggerDelta}.`);
    const liveIds = new Set(activeMineSnapshots(scene).map(item => item.mine.id));
    const possibleStarts = before.filter(item => (
      item.triggerLegal
      && !liveIds.has(item.mine.id)
      && echoTriggerCandidateIds(item.mine, scene!.phase, scene!.elapsedActiveMs, scene!.enemies, item.profile).length > 0
    ));
    if (possibleStarts.length !== 1) {
      throw new Error(`EV-3D could not identify one genuine triggering mine; candidates=${possibleStarts.length}.`);
    }
    const start = possibleStarts[0];
    if (stage === "CAP_TRIGGER_ARMED") {
      propagateChain(start, before, "CAP");
      survivorId = capExcludedId;
      moveFixtureEnemiesAway();
      stage = "CAP_PROVEN";
    } else if (stage === "EXCLUSION_TRIGGER_ARMED") {
      propagateChain(start, before, "EXCLUSION");
      moveFixtureEnemiesAway();
      stage = "DONE";
    }
  };

  const configure = (candidate: MemoryCollapseQualificationScene): void => {
    scene = candidate;
    basePhase = scene.phase;
    awayPhase = basePhase === "A" ? "B" : "A";
    baseX = scene.friend.x;
    baseY = scene.friend.y;

    const installMineCount = activeMineSnapshots(scene).length;
    const installPlacements = scene.echoPlacements;
    const installTriggers = scene.echoTriggers;

    scene.echoOwned = true;
    scene.echoRank = 5;
    scene.weaponSlotsUsed = Math.max(2, scene.weaponSlotsUsed);
    scene.evolvedWeapons = { ...scene.evolvedWeapons, ECHO: true };
    scene.protocols = { ...scene.protocols, MEMORY_FUSE: Math.max(1, scene.protocols.MEMORY_FUSE ?? 0) };
    scene.echoPlacementAccumulator = 0;

    const canvas = game.canvas;
    setDataset(canvas, "memoryInstallMineCount", installMineCount);
    setDataset(canvas, "memoryInstallPlacements", installPlacements);
    setDataset(canvas, "memoryInstallTriggers", installTriggers);
    setDataset(canvas, "memoryBasePhase", basePhase);
    setDataset(canvas, "memoryAwayPhase", awayPhase);

    ensureFixtureEnemies();

    originalActivateEnemy = scene.activateEnemy;
    patchedActivateEnemy = function (
      this: MemoryCollapseQualificationScene,
      slot: EnemyRuntimeLike,
      id: number,
      kind: V2EnemyKind,
      x: number,
      y: number,
      elite: boolean,
      checkpointId: null,
      hpMultiplier?: number,
    ): void {
      originalActivateEnemy?.call(this, slot, id, kind, x, y, elite, checkpointId, hpMultiplier);
      if (!fixtureIds.has(id)) quarantineEnemy(slot);
    };
    scene.activateEnemy = patchedActivateEnemy;

    originalTryPlaceEchoMine = scene.tryPlaceEchoMine;
    patchedTryPlaceEchoMine = function (this: MemoryCollapseQualificationScene): void {
      const placementsBefore = this.echoPlacements;
      if (stage === "CAP_PLACEMENT" && capPlaced < CAP_OFFSETS.length) {
        this.friend.setPosition(baseX + CAP_OFFSETS[capPlaced], baseY);
      } else if (stage === "EXCLUSION_PLACEMENT" && exclusionPlaced < EXCLUSION_OFFSETS.length) {
        this.friend.setPosition(baseX + EXCLUSION_OFFSETS[exclusionPlaced], baseY);
      }
      originalTryPlaceEchoMine?.call(this);
      if (this.echoPlacements === placementsBefore) return;
      const active = activeMineSnapshots(this);
      if (stage === "CAP_PLACEMENT") {
        capPlaced += 1;
        capMineIds = active.map(item => item.mine.id);
        if (capPlaced === CAP_OFFSETS.length) stage = "CAP_READY_TO_ARM";
      } else if (stage === "EXCLUSION_PLACEMENT") {
        exclusionPlaced += 1;
        exclusionMineIds = active.filter(item => item.mine.id !== survivorId).map(item => item.mine.id);
        if (exclusionPlaced === EXCLUSION_OFFSETS.length) stage = "EXCLUSION_READY_TO_ARM";
      }
      syncDiagnostics();
    };
    scene.tryPlaceEchoMine = patchedTryPlaceEchoMine;

    originalUpdateEcho = scene.updateEcho;
    patchedUpdateEcho = function (this: MemoryCollapseQualificationScene, dtMs: number): void {
      const before = activeMineSnapshots(this);
      const triggersBefore = this.echoTriggers;
      originalUpdateEcho?.call(this, dtMs);
      handleGenuineTrigger(before, this.echoTriggers - triggersBefore);
      syncDiagnostics();
    };
    scene.updateEcho = patchedUpdateEcho;

    configured = true;
    syncDiagnostics();
  };

  const tick = (): void => {
    if (disposed) return;
    if (!configured) {
      const candidate = game.scene.getScene("RareShiftV21Survival") as MemoryCollapseQualificationScene | undefined;
      if (sceneReady(candidate)) {
        try {
          configure(candidate);
        } catch (cause) {
          game.canvas.dataset.memoryQualificationError = cause instanceof Error ? cause.message : String(cause);
          disposed = true;
          return;
        }
      }
    } else if (scene) {
      try {
        for (const enemy of scene.enemies) {
          if (enemy.active && !fixtureIds.has(enemy.id)) quarantineEnemy(enemy);
        }

        const mines = activeMineSnapshots(scene);
        if (stage === "CAP_READY_TO_ARM" && scene.phase === awayPhase && mines.length === 4 && mines.every(item => item.mine.state === "ARMED_AWAY")) {
          stage = "CAP_AWAY";
        } else if (stage === "CAP_AWAY" && scene.phase === basePhase && mines.length === 4 && mines.every(item => item.triggerLegal)) {
          armCapTargets();
        } else if (stage === "CAP_PROVEN" && scene.phase === awayPhase && survivorId !== null) {
          const survivor = mines.find(item => item.mine.id === survivorId);
          if (survivor?.mine.state === "ARMED_AWAY") {
            stage = "EXCLUSION_PLACEMENT";
          }
        } else if (stage === "EXCLUSION_READY_TO_ARM" && scene.phase === basePhase) {
          const survivor = survivorId === null ? null : mines.find(item => item.mine.id === survivorId);
          const newMines = mines.filter(item => item.mine.id !== survivorId);
          if (survivor?.mine.state === "RETURN_READY" && newMines.length === 3 && newMines.every(item => item.mine.state === "ARMED_AWAY")) {
            stage = "EXCLUSION_HALF";
          }
        } else if (stage === "EXCLUSION_HALF" && scene.phase === awayPhase) {
          const survivor = survivorId === null ? null : mines.find(item => item.mine.id === survivorId);
          const newMines = mines.filter(item => item.mine.id !== survivorId);
          if (
            survivor?.mine.state === "ARMED_AWAY"
            && newMines.length === 3
            && newMines.every(item => item.triggerLegal)
          ) {
            armExclusionTarget();
          }
        }
      } catch (cause) {
        game.canvas.dataset.memoryQualificationError = cause instanceof Error ? cause.message : String(cause);
        disposed = true;
        return;
      }
      syncDiagnostics();
    }
    animationFrameId = window.requestAnimationFrame(tick);
  };

  animationFrameId = window.requestAnimationFrame(tick);

  return () => {
    disposed = true;
    if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
    if (scene && originalUpdateEcho && patchedUpdateEcho && scene.updateEcho === patchedUpdateEcho) scene.updateEcho = originalUpdateEcho;
    if (scene && originalTryPlaceEchoMine && patchedTryPlaceEchoMine && scene.tryPlaceEchoMine === patchedTryPlaceEchoMine) scene.tryPlaceEchoMine = originalTryPlaceEchoMine;
    if (scene && originalActivateEnemy && patchedActivateEnemy && scene.activateEnemy === patchedActivateEnemy) scene.activateEnemy = originalActivateEnemy;
  };
}
