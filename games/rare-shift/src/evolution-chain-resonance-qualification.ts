import type Phaser from "phaser";
import {
  CHAIN_RESONANCE_DAMAGES,
  CHAIN_RESONANCE_MAX_TARGETS,
  CHAIN_RESONANCE_POST_SHIFT_WINDOW_MS,
  CHAIN_RESONANCE_RELAY_RANGE,
  armChainResonanceAfterShift,
  buildChainResonanceProfile,
  consumeChainResonanceShift,
  emptyChainResonanceShiftState,
  isChainResonanceShiftArmed,
  type ChainResonanceProfile,
  type ChainResonanceShiftState,
} from "./evolution-runtime-core.ts";
import type { V2EnemyKind } from "./phase-combat-core.ts";
import type {
  SignalArcHop,
  SignalArcRankProfile,
} from "./signal-arc-core.ts";
import type { Phase } from "./types.ts";
import type { V23ProtocolFamily, V23WeaponFamily } from "./progression-core.ts";

const EV3E_TARGET_IDS = Object.freeze([
  9_003_501,
  9_003_502,
  9_003_503,
  9_003_504,
  9_003_505,
] as const);
const BASELINE_OFFSETS = Object.freeze([80, 270, 460, 650, 840] as const);
const POST_SHIFT_OFFSETS = Object.freeze([80, 320, 560, 750, 940] as const);
const SHIFT_LEAD_MS = 700;
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
  telegraphView?: Phaser.GameObjects.Graphics;
  healthView?: Phaser.GameObjects.Graphics;
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

type QualificationSignalProfile = SignalArcRankProfile | ChainResonanceProfile;
type OriginalSignalCombatProfile = (rank?: number) => SignalArcRankProfile;
type QualificationSignalCombatProfile = (rank?: number) => QualificationSignalProfile;

type ChainResonanceQualificationScene = Phaser.Scene & {
  phase: Phase;
  friend: FriendRuntimeLike;
  enemies: EnemyRuntimeLike[];
  elapsedActiveMs: number;
  dead: boolean;
  draftOpen: boolean;
  shifts: number;
  spawnAccumulator: number;
  spawnIndex: number;
  signalOwned: boolean;
  signalRank: number;
  signalAccumulator: number;
  signalCasts: number;
  signalHits: number;
  signalShiftGraphInvalidations: number;
  weaponSlotsUsed: number;
  evolvedWeapons: Partial<Record<V23WeaponFamily, boolean>>;
  protocols: Partial<Record<V23ProtocolFamily, number>>;
  activateEnemy: ActivateEnemyLike;
  signalCombatProfile: QualificationSignalCombatProfile;
  fireSignalArc(path: readonly SignalArcHop[], controlledRouting?: boolean): void;
  shift(): void;
  syncTestState(): void;
};

type CastSnapshot = {
  readonly ids: readonly number[];
  readonly kinds: readonly V2EnemyKind[];
  readonly damages: readonly number[];
  readonly edgeRanges: readonly number[];
  readonly commonBonus: readonly boolean[];
  readonly forwardDegrees: readonly (number | null)[];
  readonly atMs: number;
  readonly phase: Phase;
  readonly armedBefore: boolean;
};

type Stage =
  | "BASELINE_WAIT"
  | "POST_SHIFT_PREP"
  | "POST_SHIFT_ARMED"
  | "CONSUMED_WAIT"
  | "EXPIRY_READY"
  | "EXPIRY_ARMED"
  | "DONE";

function sceneReady(scene: ChainResonanceQualificationScene | undefined): scene is ChainResonanceQualificationScene {
  return Boolean(
    scene
    && scene.friend
    && Array.isArray(scene.enemies)
    && typeof scene.activateEnemy === "function"
    && typeof scene.signalCombatProfile === "function"
    && typeof scene.fireSignalArc === "function"
    && typeof scene.shift === "function"
    && typeof scene.syncTestState === "function",
  );
}

function setDataset(canvas: HTMLCanvasElement, name: string, value: string | number | boolean): void {
  canvas.dataset[name] = String(value);
}

function snapshot(path: readonly SignalArcHop[], scene: ChainResonanceQualificationScene, armedBefore: boolean): CastSnapshot {
  return Object.freeze({
    ids: Object.freeze(path.map(hop => hop.id)),
    kinds: Object.freeze(path.map(hop => hop.kind)),
    damages: Object.freeze(path.map(hop => hop.damage)),
    edgeRanges: Object.freeze(path.map(hop => hop.edgeRange)),
    commonBonus: Object.freeze(path.map(hop => hop.usedCommonBonus)),
    forwardDegrees: Object.freeze(path.map(hop => hop.forwardDegree)),
    atMs: scene.elapsedActiveMs,
    phase: scene.phase,
    armedBefore,
  });
}

function clearEnemy(enemy: EnemyRuntimeLike): void {
  enemy.active = false;
  enemy.view.setVisible(false);
  enemy.telegraphView?.clear().setVisible(false);
  enemy.healthView?.clear().setVisible(false);
}

function freezeEnemy(enemy: EnemyRuntimeLike): void {
  enemy.staggerUntilMs = Number.POSITIVE_INFINITY;
  enemy.beaconNextShotAt = Number.POSITIVE_INFINITY;
  enemy.flickerNextSwitchAt = Number.POSITIVE_INFINITY;
  enemy.eliteNextPulseAt = Number.POSITIVE_INFINITY;
}

function serializeSnapshot(value: CastSnapshot | null, field: keyof CastSnapshot): string {
  if (!value) return "";
  const selected = value[field];
  if (Array.isArray(selected)) {
    return selected.map(item => item === null ? "" : typeof item === "boolean" ? (item ? "1" : "0") : String(item)).join(",");
  }
  return String(selected);
}

export function installChainResonanceQualification(game: Phaser.Game): () => void {
  let scene: ChainResonanceQualificationScene | undefined;
  let originalSignalCombatProfile: OriginalSignalCombatProfile | null = null;
  let patchedSignalCombatProfile: QualificationSignalCombatProfile | null = null;
  let originalFireSignalArc: ChainResonanceQualificationScene["fireSignalArc"] | null = null;
  let patchedFireSignalArc: ChainResonanceQualificationScene["fireSignalArc"] | null = null;
  let originalShift: ChainResonanceQualificationScene["shift"] | null = null;
  let patchedShift: ChainResonanceQualificationScene["shift"] | null = null;

  let stage: Stage = "BASELINE_WAIT";
  let shiftState: ChainResonanceShiftState = emptyChainResonanceShiftState();
  let fixtureEnemies: EnemyRuntimeLike[] = [];
  let inheritedProfile: SignalArcRankProfile | null = null;
  let normalEvolvedProfile: ChainResonanceProfile | null = null;
  let baselineCast: CastSnapshot | null = null;
  let postShiftCast: CastSnapshot | null = null;
  let consumedCast: CastSnapshot | null = null;
  let expiryCast: CastSnapshot | null = null;
  let postShiftAtMs: number | null = null;
  let expiryShiftAtMs: number | null = null;
  let postShiftPhase: Phase | null = null;
  let expiryShiftPhase: Phase | null = null;
  let shiftArmEvents = 0;
  let shiftExpiryEvents = 0;
  let unexpectedPreShiftCasts = 0;
  let installCastsBefore = 0;
  let installCastsAfter = 0;
  let installHitsBefore = 0;
  let installHitsAfter = 0;
  let installAccumulatorBefore = 0;
  let installAccumulatorAfter = 0;
  let installWeaponSlotsBeforeEvolution = 0;
  let installWeaponSlotsAfterEvolution = 0;
  let configured = false;
  let disposed = false;
  let animationFrameId: number | null = null;

  const setGeometry = (offsets: readonly number[]): void => {
    if (!scene || fixtureEnemies.length !== offsets.length) return;
    fixtureEnemies.forEach((enemy, index) => {
      enemy.x = scene!.friend.x + offsets[index];
      enemy.y = scene!.friend.y;
      enemy.hp = enemy.maxHp;
      freezeEnemy(enemy);
      enemy.view.setPosition(enemy.x, enemy.y).setVisible(true).setAlpha(1);
    });
  };

  const syncDiagnostics = (): void => {
    if (!configured || !scene || !inheritedProfile || !normalEvolvedProfile) return;
    const canvas = game.canvas;
    const armedNow = isChainResonanceShiftArmed(shiftState, scene.elapsedActiveMs);
    const shiftReady = stage === "POST_SHIFT_PREP"
      && scene.signalAccumulator >= Math.max(0, inheritedProfile.cooldownMs - SHIFT_LEAD_MS)
      && scene.signalAccumulator < inheritedProfile.cooldownMs;

    setDataset(canvas, "chainQualificationFixture", "CHAIN_RESONANCE");
    setDataset(canvas, "chainStage", stage);
    setDataset(canvas, "chainEvolved", scene.evolvedWeapons.SIGNAL === true);
    setDataset(canvas, "chainMaxTargets", CHAIN_RESONANCE_MAX_TARGETS);
    setDataset(canvas, "chainRelayRange", CHAIN_RESONANCE_RELAY_RANGE);
    setDataset(canvas, "chainDamageProfile", CHAIN_RESONANCE_DAMAGES.join(","));
    setDataset(canvas, "chainPostShiftWindowMs", CHAIN_RESONANCE_POST_SHIFT_WINDOW_MS);
    setDataset(canvas, "chainShiftLeadMs", SHIFT_LEAD_MS);
    setDataset(canvas, "chainShiftReady", shiftReady);
    setDataset(canvas, "chainShiftStateArmed", armedNow);
    setDataset(canvas, "chainShiftStateRawArmed", shiftState.armed);
    setDataset(canvas, "chainShiftStateExpiresAt", shiftState.expiresAtMs ?? "");
    setDataset(canvas, "chainShiftStatePhase", shiftState.phase ?? "");
    setDataset(canvas, "chainShiftArmEvents", shiftArmEvents);
    setDataset(canvas, "chainShiftExpiryEvents", shiftExpiryEvents);
    setDataset(canvas, "chainUnexpectedPreShiftCasts", unexpectedPreShiftCasts);

    setDataset(canvas, "chainInheritedCooldownMs", inheritedProfile.cooldownMs);
    setDataset(canvas, "chainInheritedRelayRange", inheritedProfile.relayRange);
    setDataset(canvas, "chainInheritedMaxTargets", inheritedProfile.maxTargets);
    setDataset(canvas, "chainInheritedDamageProfile", inheritedProfile.damages.join(","));
    setDataset(canvas, "chainInheritedCommonBonusUses", inheritedProfile.commonBonusUses);
    setDataset(canvas, "chainInheritedRouting", inheritedProfile.routing);
    setDataset(canvas, "chainEvolvedCooldownMs", normalEvolvedProfile.cooldownMs);
    setDataset(canvas, "chainEvolvedCommonBonusUses", normalEvolvedProfile.commonBonusUses);
    setDataset(canvas, "chainEvolvedRouting", normalEvolvedProfile.routing);

    setDataset(canvas, "chainInstallCastsBefore", installCastsBefore);
    setDataset(canvas, "chainInstallCastsAfter", installCastsAfter);
    setDataset(canvas, "chainInstallHitsBefore", installHitsBefore);
    setDataset(canvas, "chainInstallHitsAfter", installHitsAfter);
    setDataset(canvas, "chainInstallAccumulatorBefore", installAccumulatorBefore);
    setDataset(canvas, "chainInstallAccumulatorAfter", installAccumulatorAfter);
    setDataset(canvas, "chainInstallWeaponSlotsBeforeEvolution", installWeaponSlotsBeforeEvolution);
    setDataset(canvas, "chainInstallWeaponSlotsAfterEvolution", installWeaponSlotsAfterEvolution);

    for (const [label, value] of [
      ["Baseline", baselineCast],
      ["PostShift", postShiftCast],
      ["Consumed", consumedCast],
      ["Expiry", expiryCast],
    ] as const) {
      setDataset(canvas, `chain${label}Ids`, serializeSnapshot(value, "ids"));
      setDataset(canvas, `chain${label}Kinds`, serializeSnapshot(value, "kinds"));
      setDataset(canvas, `chain${label}Damages`, serializeSnapshot(value, "damages"));
      setDataset(canvas, `chain${label}EdgeRanges`, serializeSnapshot(value, "edgeRanges"));
      setDataset(canvas, `chain${label}CommonBonus`, serializeSnapshot(value, "commonBonus"));
      setDataset(canvas, `chain${label}ForwardDegrees`, serializeSnapshot(value, "forwardDegrees"));
      setDataset(canvas, `chain${label}AtMs`, value?.atMs ?? "");
      setDataset(canvas, `chain${label}Phase`, value?.phase ?? "");
      setDataset(canvas, `chain${label}ArmedBefore`, value?.armedBefore ?? false);
    }

    setDataset(canvas, "chainPostShiftAtMs", postShiftAtMs ?? "");
    setDataset(canvas, "chainPostShiftPhase", postShiftPhase ?? "");
    setDataset(canvas, "chainPostShiftDelayMs", postShiftCast && postShiftAtMs !== null ? postShiftCast.atMs - postShiftAtMs : "");
    setDataset(canvas, "chainExpiryShiftAtMs", expiryShiftAtMs ?? "");
    setDataset(canvas, "chainExpiryShiftPhase", expiryShiftPhase ?? "");
    setDataset(canvas, "chainExpiryDelayMs", expiryCast && expiryShiftAtMs !== null ? expiryCast.atMs - expiryShiftAtMs : "");
  };

  const configure = (candidate: ChainResonanceQualificationScene): void => {
    scene = candidate;
    originalSignalCombatProfile = scene.signalCombatProfile as OriginalSignalCombatProfile;
    originalFireSignalArc = scene.fireSignalArc;
    originalShift = scene.shift;

    installCastsBefore = scene.signalCasts;
    installHitsBefore = scene.signalHits;
    installAccumulatorBefore = scene.signalAccumulator;

    for (const enemy of scene.enemies) clearEnemy(enemy);
    const slots = scene.enemies.slice(0, EV3E_TARGET_IDS.length);
    if (slots.length < EV3E_TARGET_IDS.length) throw new Error("EV-3E CHAIN RESONANCE qualification requires five enemy slots.");

    scene.signalOwned = true;
    scene.signalRank = 5;
    scene.weaponSlotsUsed = Math.max(scene.weaponSlotsUsed, 2);
    scene.protocols = { ...scene.protocols, RESONANCE_COIL: Math.max(1, scene.protocols.RESONANCE_COIL ?? 0) };
    inheritedProfile = originalSignalCombatProfile.call(scene, 5);
    if (inheritedProfile.rank !== 5) throw new Error("EV-3E inherited SIGNAL profile did not resolve Rank V.");

    installWeaponSlotsBeforeEvolution = scene.weaponSlotsUsed;
    scene.evolvedWeapons = { ...scene.evolvedWeapons, SIGNAL: true };
    installWeaponSlotsAfterEvolution = scene.weaponSlotsUsed;
    normalEvolvedProfile = buildChainResonanceProfile(inheritedProfile, true, emptyChainResonanceShiftState(), scene.elapsedActiveMs);

    scene.spawnAccumulator = -1_000_000;
    scene.spawnIndex = Math.max(scene.spawnIndex, 9_003_600);

    fixtureEnemies = slots;
    fixtureEnemies.forEach((enemy, index) => {
      scene!.activateEnemy(enemy, EV3E_TARGET_IDS[index], "TRACE", scene!.friend.x + BASELINE_OFFSETS[index], scene!.friend.y, false, null, FIXTURE_HP_MULTIPLIER);
      freezeEnemy(enemy);
    });
    setGeometry(BASELINE_OFFSETS);

    patchedSignalCombatProfile = function (this: ChainResonanceQualificationScene, rank?: number): QualificationSignalProfile {
      if (!originalSignalCombatProfile) throw new Error("EV-3E lost the inherited SIGNAL profile hook.");
      const base = originalSignalCombatProfile.call(this, rank);
      if (base.rank !== 5 || this.evolvedWeapons.SIGNAL !== true) return base;
      return buildChainResonanceProfile(base, true, shiftState, this.elapsedActiveMs);
    };
    scene.signalCombatProfile = patchedSignalCombatProfile;

    patchedFireSignalArc = function (this: ChainResonanceQualificationScene, path: readonly SignalArcHop[], controlledRouting = false): void {
      if (!originalFireSignalArc) throw new Error("EV-3E lost the inherited SIGNAL cast hook.");
      const armedBefore = isChainResonanceShiftArmed(shiftState, this.elapsedActiveMs);
      originalFireSignalArc.call(this, path, controlledRouting);
      const observed = snapshot(path, this, armedBefore);

      if (stage === "BASELINE_WAIT") {
        baselineCast = observed;
        stage = "POST_SHIFT_PREP";
        setGeometry(POST_SHIFT_OFFSETS);
      } else if (stage === "POST_SHIFT_PREP") {
        unexpectedPreShiftCasts += 1;
        setGeometry(POST_SHIFT_OFFSETS);
      } else if (stage === "POST_SHIFT_ARMED") {
        postShiftCast = observed;
        stage = "CONSUMED_WAIT";
      } else if (stage === "CONSUMED_WAIT") {
        consumedCast = observed;
        stage = "EXPIRY_READY";
      } else if (stage === "EXPIRY_ARMED") {
        expiryCast = observed;
        stage = "DONE";
      }

      if (armedBefore) {
        shiftState = consumeChainResonanceShift(shiftState, this.elapsedActiveMs);
      } else if (shiftState.armed && !isChainResonanceShiftArmed(shiftState, this.elapsedActiveMs)) {
        shiftState = emptyChainResonanceShiftState();
      }
      syncDiagnostics();
    };
    scene.fireSignalArc = patchedFireSignalArc;

    patchedShift = function (this: ChainResonanceQualificationScene): void {
      if (!originalShift) throw new Error("EV-3E lost the inherited SHIFT hook.");
      const shiftsBefore = this.shifts;
      originalShift.call(this);
      if (this.shifts === shiftsBefore) return;

      shiftState = armChainResonanceAfterShift(true, this.elapsedActiveMs, this.phase);
      shiftArmEvents += 1;
      if (stage === "POST_SHIFT_PREP") {
        postShiftAtMs = this.elapsedActiveMs;
        postShiftPhase = this.phase;
        stage = "POST_SHIFT_ARMED";
      } else if (stage === "EXPIRY_READY") {
        expiryShiftAtMs = this.elapsedActiveMs;
        expiryShiftPhase = this.phase;
        stage = "EXPIRY_ARMED";
      }
      syncDiagnostics();
    };
    scene.shift = patchedShift;

    installCastsAfter = scene.signalCasts;
    installHitsAfter = scene.signalHits;
    installAccumulatorAfter = scene.signalAccumulator;
    configured = true;
    scene.syncTestState();
    syncDiagnostics();
  };

  const tick = (): void => {
    if (disposed) return;
    if (!configured) {
      const candidate = game.scene.getScene("RareShiftV21Survival") as ChainResonanceQualificationScene | undefined;
      if (sceneReady(candidate)) {
        try {
          configure(candidate);
        } catch (cause) {
          game.canvas.dataset.chainQualificationError = cause instanceof Error ? cause.message : String(cause);
          disposed = true;
          return;
        }
      }
    } else if (scene && shiftState.armed && !isChainResonanceShiftArmed(shiftState, scene.elapsedActiveMs)) {
      shiftState = emptyChainResonanceShiftState();
      shiftExpiryEvents += 1;
    }
    syncDiagnostics();
    animationFrameId = window.requestAnimationFrame(tick);
  };

  animationFrameId = window.requestAnimationFrame(tick);

  return () => {
    disposed = true;
    if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
    if (scene && originalSignalCombatProfile && patchedSignalCombatProfile && scene.signalCombatProfile === patchedSignalCombatProfile) {
      scene.signalCombatProfile = originalSignalCombatProfile;
    }
    if (scene && originalFireSignalArc && patchedFireSignalArc && scene.fireSignalArc === patchedFireSignalArc) {
      scene.fireSignalArc = originalFireSignalArc;
    }
    if (scene && originalShift && patchedShift && scene.shift === patchedShift) {
      scene.shift = originalShift;
    }
    fixtureEnemies = [];
  };
}
