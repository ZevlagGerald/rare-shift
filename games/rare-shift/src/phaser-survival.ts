import Phaser from "phaser";
import { applyV21Draft, buildV21Draft, type V21BuildState, type V21DraftChoice, type V21DraftId } from "./draft-core.ts";
import {
  buildEchoProfile,
  canPlaceEchoMine,
  createEchoMine,
  echoBlastTargetIds,
  echoTriggerCandidateIds,
  ECHO_RANK_I,
  initializeEchoMineForRankV,
  isEchoMineExpired,
  planEchoDamageTargets,
  selectEchoReplacementId,
  transitionEchoMineForPhase,
  type EchoBurstLedger,
  type EchoMineCore,
  type EchoRankProfile,
} from "./echo-core.ts";
import {
  buildDeltaEchoProfile,
  buildDeltaProfile,
  canScheduleDeltaEcho,
  deltaEchoHitsTarget,
  deltaHitsTarget,
  enemyBaseHp,
  enemyContactDamage,
  enemyMoveSpeed,
  enemyThreatPhase,
  isDeltaEchoTargetEligible,
  isEnemyCorporeal,
  migrateDeltaCooldownAccumulator,
  type DeltaEchoProfile,
  type V2EnemyKind,
} from "./phase-combat-core.ts";
import {
  advanceOrbitAngle,
  buildOrbitProfile,
  canEmitOrbitShear,
  isOrbitContactLegal,
  orbitDirectionForPhase,
  orbitNodeAngles,
  orbitNodePositions,
  planOrbitShearTargetIds,
  ORBIT_RANK_I,
  type OrbitRankProfile,
} from "./orbit-core.ts";
import {
  addSignalXp,
  clampPlayerPosition,
  V21_CONTACT_INVULN_MS,
  V21_MAX_ACTIVE_ENEMIES,
  V21_PLAYER_MAX_HP,
  V21_WORLD_HEIGHT,
  V21_WORLD_WIDTH,
  v21QualificationReached,
  xpThreshold,
} from "./survival-core.ts";
import {
  CR1_BEACON_COOLDOWN_MS,
  CR1_BEACON_PROJECTILE_DAMAGE,
  CR1_BEACON_PROJECTILE_LIFETIME_MS,
  CR1_BEACON_PROJECTILE_SPEED,
  CR1_BEACON_TELEGRAPH_MS,
  CR1_ELITE_PULSE_COOLDOWN_MS,
  CR1_ELITE_PULSE_DAMAGE,
  CR1_ELITE_PULSE_RADIUS,
  CR1_ELITE_PULSE_TELEGRAPH_MS,
  CR1_FLICKER_SWITCH_MS,
  CR1_FLICKER_WARNING_MS,
  CR1_MAX_BEACON_PROJECTILES,
  buildCheckpointSpawnPosition,
  buildDirectedSpawnSpec,
  claimCheckpointRewards,
  selectCheckpointSpawnSlotIndex,
  dueCheckpoints,
  emptyCR1RewardLedger,
  isFlickerKind,
  nextFlickerKind,
  stageForElapsedMs,
  type CR1CheckpointId,
  type CR1PickupKind,
  type CR1RewardLedger,
  type CR1StageId,
} from "./cr1-director-core.ts";
import type { FrameRows, Phase, SelectedFramePair } from "./types.ts";
import { buildFractureGrid, V2_ART_SPRITES, V2_PALETTE } from "./v2-art-core.ts";
import { effectDuration } from "./v2-fx-core.ts";
import {
  acquirePriorityVectorTarget,
  acquireVectorTarget,
  armVectorTransfer,
  buildVectorProfile,
  consumeVectorTransfer,
  initialVectorLockState,
  isVectorTransferArmed,
  planVectorLineHits,
  recordVectorPrimaryHit,
  resetVectorLock,
  vectorPrimaryDamageForStacks,
  vectorPriorityTier,
  VECTOR_RANK_I,
  type VectorLockState,
  type VectorRankProfile,
  type VectorTransferState,
} from "./vector-core.ts";
import { advanceSignalArcCooldown, buildSignalArcProfile, planSignalArc, SIGNAL_ARC_RANK_I, type SignalArcHop } from "./signal-arc-core.ts";
import {
  applyCR2CheckpointProgressionReward,
  applyCR2ProtocolDraftChoiceToLive,
  buildCR2ProtocolDraftFromLive,
  collectCR2EvolutionCoreLive,
  resolveCR2DeltaProtocolRuntime,
  resolveCR2EchoProtocolRuntime,
  resolveCR2OrbitProtocolRuntime,
  resolveCR2PlayerProtocolRuntime,
  resolveCR2SignalProtocolRuntime,
  resolveCR2VectorProtocolRuntime,
  useCR2ProtocolRefractFromLive,
} from "./cr2-live-tranche-core.ts";
import type { CR2LiveProjection, CR2LiveSnapshot } from "./cr2-live-state-core.ts";
import type { V23DraftCandidate, V23ProtocolFamily, V23WeaponFamily } from "./progression-core.ts";

export interface PhaserSurvivalController {
  destroy(): void;
  setPaused(paused: boolean): void;
  setReducedMotion(reduced: boolean): void;
}

interface SurvivalOptions {
  parent: HTMLElement;
  pair: SelectedFramePair;
  reducedMotion: boolean;
  friendLabel: string;
  familyName: string;
}

interface EnemyRuntime {
  id: number;
  active: boolean;
  kind: V2EnemyKind;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  staggerUntilMs: number;
  elite: boolean;
  checkpointId: CR1CheckpointId | null;
  beaconNextShotAt: number;
  beaconLaunchAt: number | null;
  beaconDirectionX: number;
  beaconDirectionY: number;
  flickerNextSwitchAt: number;
  eliteNextPulseAt: number;
  elitePulseAt: number | null;
  view: Phaser.GameObjects.Container;
  telegraphView: Phaser.GameObjects.Graphics;
  healthView: Phaser.GameObjects.Graphics;
}

interface PickupRuntime {
  active: boolean;
  kind: CR1PickupKind;
  magnetized: boolean;
  x: number;
  y: number;
  view: Phaser.GameObjects.Container;
}

interface BeaconProjectileRuntime {
  active: boolean;
  x: number;
  y: number;
  directionX: number;
  directionY: number;
  bornAtMs: number;
  view: Phaser.GameObjects.Rectangle;
}

interface VectorProjectileRuntime {
  active: boolean;
  targetId: number;
  x: number;
  y: number;
  originX: number;
  originY: number;
  directionX: number;
  directionY: number;
  traveled: number;
  launchPhase: Phase;
  profile: VectorRankProfile | null;
  transferShot: boolean;
  hitIds: number[];
  hitDistances: number[];
  hitDamages: number[];
  nextHitIndex: number;
  view: Phaser.GameObjects.Rectangle;
}

interface EchoMineRuntime {
  active: boolean;
  mine: EchoMineCore | null;
  view: Phaser.GameObjects.Graphics;
}

interface PendingDeltaEchoRuntime {
  readonly phase: Phase;
  readonly scheduledAtMs: number;
  readonly profile: DeltaEchoProfile;
}

interface DraftViewChoice {
  readonly id: string;
  readonly name: string;
  readonly category: "WEAPON" | "UTILITY" | "PROTOCOL";
  readonly description: string;
  readonly disabled: boolean;
  readonly candidateId: string | null;
  readonly candidateType: V23DraftCandidate["candidateType"] | null;
  readonly familyId: V23DraftCandidate["familyId"] | null;
  readonly fromRank: number | null;
  readonly toRank: number | null;
}

type VectorQualificationWindow = Window & { __RARE_SHIFT_V23B2_VECTOR_RANK__?: unknown };
type OrbitQualificationWindow = Window & { __RARE_SHIFT_V23B3_ORBIT_RANK__?: unknown };
type EchoQualificationWindow = Window & { __RARE_SHIFT_V23B4_ECHO_RANK__?: unknown };
type SignalQualificationWindow = Window & { __RARE_SHIFT_V23B5_SIGNAL_RANK__?: unknown };

const VIEW_W = 960;
const VIEW_H = 640;
const PLAYER_SPEED = 220;
const PICKUP_POOL_SIZE = 64;

function hex(value: string): number { return Number.parseInt(value.slice(1), 16); }
function romanRank(rank: number): string { return ["I", "II", "III", "IV", "V"][Math.max(1, Math.min(5, rank)) - 1]; }
function draftCardXs(count: number): readonly number[] {
  if (count === 1) return [480];
  if (count === 2) return [350, 610];
  return [220, 480, 740];
}
function emptyVectorTransfer(): VectorTransferState { return Object.freeze({ armed: false, expiresAtMs: null, phase: null }); }
function migrateCooldownProgress(accumulator: number, oldCooldownMs: number, newCooldownMs: number): number {
  if (!(oldCooldownMs > 0) || !(newCooldownMs > 0)) return Math.max(0, accumulator);
  const progress = Math.max(0, Math.min(1, accumulator / oldCooldownMs));
  return Math.min(newCooldownMs, progress * newCooldownMs);
}
function legacyDraftIdForCandidate(candidate: V23DraftCandidate): string {
  if (candidate.candidateType === "WEAPON_ACQUIRE") {
    return ({ VECTOR: "VECTOR_NEEDLE", ORBIT: "ORBIT_NODES", ECHO: "ECHO_MINE", SIGNAL: "SIGNAL_ARC" } as const)[candidate.familyId as "VECTOR" | "ORBIT" | "ECHO" | "SIGNAL"];
  }
  if (candidate.candidateType === "WEAPON_RANK") return `${candidate.familyId}_RANK`;
  if (candidate.candidateType === "UTILITY") return String(candidate.familyId);
  if (candidate.candidateType === "PROTOCOL_ACQUIRE" || candidate.candidateType === "PROTOCOL_RANK") return `PROTOCOL_${candidate.familyId}`;
  return candidate.candidateId;
}
function normalizedDraftViewChoice(candidate: V23DraftCandidate): DraftViewChoice {
  const category: DraftViewChoice["category"] = candidate.candidateType.startsWith("PROTOCOL")
    ? "PROTOCOL"
    : candidate.candidateType === "UTILITY" ? "UTILITY" : "WEAPON";
  return Object.freeze({
    id: legacyDraftIdForCandidate(candidate),
    name: candidate.name,
    category,
    description: candidate.description,
    disabled: false,
    candidateId: candidate.candidateId,
    candidateType: candidate.candidateType,
    familyId: candidate.familyId,
    fromRank: candidate.fromRank,
    toRank: candidate.toRank,
  });
}
function legacyDraftViewChoice(choice: V21DraftChoice): DraftViewChoice {
  return Object.freeze({
    ...choice,
    candidateId: null,
    candidateType: null,
    familyId: null,
    fromRank: null,
    toRank: null,
  });
}

class SurvivalScene extends Phaser.Scene {
  private readonly pair: SelectedFramePair;
  private readonly friendLabel: string;
  private readonly familyName: string;
  private readonly seed: number;

  private phase: Phase = "B";
  private reduced = false;
  private friend!: Phaser.GameObjects.Container;
  private enemies: EnemyRuntime[] = [];
  private pickups: PickupRuntime[] = [];
  private beaconProjectiles: BeaconProjectileRuntime[] = [];
  private vectorProjectiles: VectorProjectileRuntime[] = [];
  private echoMines: EchoMineRuntime[] = [];
  private vectorReticle!: Phaser.GameObjects.Graphics;
  private orbitNode!: Phaser.GameObjects.Graphics;
  private signalFx!: Phaser.GameObjects.Graphics;
  private burst!: Phaser.GameObjects.Graphics;
  private background!: Phaser.GameObjects.Graphics;

  private hp = V21_PLAYER_MAX_HP;
  private level = 1;
  private xp = 0;
  private kills = 0;
  private shifts = 0;
  private deltaRank = 1;
  private deltaPrimaryPulses = 0;
  private deltaEchoPending: PendingDeltaEchoRuntime | null = null;
  private deltaEchoLastScheduledAt: number | null = null;
  private deltaEchoSchedules = 0;
  private deltaEchoFires = 0;
  private deltaEchoHits = 0;
  private deltaStaggers = 0;
  private pickupRadius = 76;

  private vectorOwned = false;
  private vectorRank = 1;
  private vectorAccumulator = 0;
  private vectorTargetId: number | null = null;
  private vectorTargetKind: V2EnemyKind | null = null;
  private vectorShots = 0;
  private vectorHits = 0;
  private vectorAcquisitions = 0;
  private vectorShiftInvalidations = 0;
  private vectorPenetrationHits = 0;
  private vectorTransferState: VectorTransferState = emptyVectorTransfer();
  private vectorTransferShots = 0;
  private vectorTransferExpiries = 0;
  private vectorLockState: VectorLockState = initialVectorLockState();
  private vectorLockPeakStacks = 0;
  private vectorLockResets = 0;
  private vectorQualificationFixture = "";

  private orbitOwned = false;
  private orbitRank = 1;
  private orbitAngle = 0;
  private orbitHits = 0;
  private orbitReversals = 0;
  private orbitLastShiftAnchor: number | null = null;
  private readonly orbitLastHitAt = new Map<number, number>();
  private orbitShearLastEmittedAt: number | null = null;
  private orbitShearEvents = 0;
  private orbitShearHits = 0;
  private orbitShearRearmBlocks = 0;
  private orbitQualificationFixture = "";

  private echoOwned = false;
  private echoRank = 1;
  private echoPlacementAccumulator = 0;
  private echoNextId = 0;
  private echoPlacements = 0;
  private echoArmedTransitions = 0;
  private echoReturns = 0;
  private echoTriggers = 0;
  private echoHits = 0;
  private echoReplacements = 0;
  private echoExpiries = 0;
  private echoDepthIncrements = 0;
  private echoDepth2Triggers = 0;
  private echoDepth2Hits = 0;
  private echoBurstSuppressedHits = 0;
  private echoBurstLedger: EchoBurstLedger = new Map();
  private echoQualificationFixture = "";

  private signalOwned = false;
  private signalRank = 1;
  private signalAccumulator = 0;
  private signalCasts = 0;
  private signalHits = 0;
  private signalMultiTargetCasts = 0;
  private signalShiftGraphInvalidations = 0;
  private signalCommonBonusCasts = 0;
  private signalExtendedCommonRelayCasts = 0;
  private signalControlledRoutingCasts = 0;
  private signalLastCastPhase: Phase | null = null;
  private signalLastChainIds: number[] = [];
  private signalLastChainKinds: V2EnemyKind[] = [];
  private signalLastChainDamage: number[] = [];
  private signalLastChainEdgeRanges: number[] = [];
  private signalLastChainCommonBonus: boolean[] = [];
  private signalLastChainForwardDegrees: Array<number | null> = [];
  private signalQualificationFixture = "";

  private weaponSlotsUsed = 1;
  private elapsedActiveMs = 0;
  private spawnAccumulator = 0;
  private spawnIndex = 0;
  private directorStage: CR1StageId = "STAGE_I";
  private readonly spawnedCheckpoints = new Set<CR1CheckpointId>();
  private rewardLedger: CR1RewardLedger = emptyCR1RewardLedger();
  private evolutionCores = 0;
  private evolvedWeapons: Partial<Record<V23WeaponFamily, boolean>> = {};
  private protocols: Partial<Record<V23ProtocolFamily, number>> = {};
  private refracts = 1;
  private rerollNonce = 0;
  private elitesDefeated = 0;
  private bossPending = false;
  private attackAccumulator = 0;
  private lastContactAt = -99_999;
  private dead = false;
  private draftOpen = false;
  private cr2DraftActive = false;
  private cr2DraftLegalCandidateCount = 0;
  private draftChoices: readonly DraftViewChoice[] = [];
  private draftViews: Phaser.GameObjects.Container[] = [];
  private draftBackdrop: Phaser.GameObjects.Rectangle | null = null;
  private refractView: Phaser.GameObjects.Text | null = null;
  private qualified = false;

  private moveUp = false;
  private moveDown = false;
  private moveLeft = false;
  private moveRight = false;
  private joystickPointer: number | null = null;
  private joystickOrigin = { x: 120, y: 530 };
  private joystickVector = { x: 0, y: 0 };
  private joystickBase!: Phaser.GameObjects.Arc;
  private joystickKnob!: Phaser.GameObjects.Arc;
  private touchZone!: Phaser.GameObjects.Rectangle;
  private shiftButton!: Phaser.GameObjects.Rectangle;
  private shiftLabel!: Phaser.GameObjects.Text;
  private hpBar!: Phaser.GameObjects.Graphics;
  private xpBar!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;
  private buildText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private stageText!: Phaser.GameObjects.Text;

  constructor(private readonly opts: Omit<SurvivalOptions, "parent">) {
    super({ key: "RareShiftV21Survival" });
    this.pair = opts.pair;
    this.friendLabel = opts.friendLabel;
    this.familyName = opts.familyName;
    const numericFriend = Number.parseInt(opts.friendLabel, 10);
    this.seed = ((Number.isFinite(numericFriend) ? numericFriend : 0x52415245) ^ (opts.pair.a.index << 8) ^ opts.pair.b.index) >>> 0;
  }

  create(): void {
    this.reduced = this.opts.reducedMotion;
    this.cameras.main.setBackgroundColor(V2_PALETTE.backgroundPrimary);
    this.cameras.main.setBounds(0, 0, V21_WORLD_WIDTH, V21_WORLD_HEIGHT);
    this.drawWorld();
    this.friend = this.add.container(V21_WORLD_WIDTH / 2, V21_WORLD_HEIGHT / 2).setDepth(30);
    this.paintFriend();
    this.cameras.main.startFollow(this.friend, true, 0.12, 0.12);
    this.burst = this.add.graphics().setDepth(24).setVisible(false);
    this.vectorReticle = this.add.graphics().setDepth(27).setVisible(false);
    this.orbitNode = this.add.graphics().setDepth(28).setVisible(false);
    this.signalFx = this.add.graphics().setDepth(29).setVisible(false);
    this.buildPools();
    this.applyVectorQualificationFixture();
    this.applyOrbitQualificationFixture();
    this.applyEchoQualificationFixture();
    this.applySignalQualificationFixture();
    this.buildHud();
    this.installKeyboard();
    this.installTouch();
    this.syncTestState();
  }

  setReducedMotion(reduced: boolean): void { this.reduced = reduced; }

  private buildCR2LiveSnapshot(): CR2LiveSnapshot {
    return Object.freeze({
      deltaRank: this.deltaRank,
      vectorOwned: this.vectorOwned,
      vectorRank: this.vectorRank,
      orbitOwned: this.orbitOwned,
      orbitRank: this.orbitRank,
      echoOwned: this.echoOwned,
      echoRank: this.echoRank,
      signalOwned: this.signalOwned,
      signalRank: this.signalRank,
      evolvedWeapons: Object.freeze({ ...this.evolvedWeapons }),
      protocols: Object.freeze({ ...this.protocols }),
      evolutionCores: this.evolutionCores,
      refracts: this.refracts,
      rerollNonce: this.rerollNonce,
      hp: this.hp,
      maxHp: V21_PLAYER_MAX_HP,
      pickupRadius: this.pickupRadius,
      weaponSlotsUsed: this.weaponSlotsUsed,
    });
  }

  private deltaCombatProfile(phase: Phase = this.phase, rank = this.deltaRank): ReturnType<typeof buildDeltaProfile> {
    return resolveCR2DeltaProtocolRuntime(buildDeltaProfile(this.pair.a.rows, this.pair.b.rows, phase, rank), this.buildCR2LiveSnapshot()).profile;
  }

  private vectorCombatProfile(rank = this.vectorRank, transferShot = false): VectorRankProfile {
    return resolveCR2VectorProtocolRuntime(buildVectorProfile(rank, transferShot), this.buildCR2LiveSnapshot()).profile;
  }

  private orbitCombatProfile(rank = this.orbitRank): OrbitRankProfile {
    return resolveCR2OrbitProtocolRuntime(buildOrbitProfile(rank), this.buildCR2LiveSnapshot());
  }

  private echoCombatProfile(rank = this.echoRank, memoryDepth = 0): EchoRankProfile {
    return resolveCR2EchoProtocolRuntime(buildEchoProfile(rank, memoryDepth), this.buildCR2LiveSnapshot());
  }

  private signalCombatProfile(rank = this.signalRank): ReturnType<typeof buildSignalArcProfile> {
    return resolveCR2SignalProtocolRuntime(buildSignalArcProfile(rank), this.buildCR2LiveSnapshot()).profile;
  }

  private applyCR2Projection(next: CR2LiveProjection): void {
    if (Object.values(next.evolvedWeapons).some(value => value === true)) {
      throw new Error("Evolution projection reached Phaser before evolved combat runtime qualification.");
    }
    const oldDeltaCooldown = this.deltaCombatProfile().cooldownMs;
    const oldVectorCooldown = this.vectorCombatProfile().cooldownMs;
    const oldSignalCooldown = this.signalCombatProfile().cooldownMs;
    const oldVectorRank = this.vectorRank;
    const oldEchoRank = this.echoRank;
    const wasEchoOwned = this.echoOwned;

    this.deltaRank = next.deltaRank;
    this.vectorOwned = next.vectorOwned;
    this.vectorRank = next.vectorRank;
    this.orbitOwned = next.orbitOwned;
    this.orbitRank = next.orbitRank;
    this.echoOwned = next.echoOwned;
    this.echoRank = next.echoRank;
    this.signalOwned = next.signalOwned;
    this.signalRank = next.signalRank;
    this.evolvedWeapons = { ...next.evolvedWeapons };
    this.protocols = { ...next.protocols };
    this.evolutionCores = next.evolutionCores;
    this.refracts = next.refracts;
    this.rerollNonce = next.rerollNonce;
    this.hp = next.hp;
    this.pickupRadius = next.pickupRadius;
    this.weaponSlotsUsed = next.weaponSlotsUsed;

    this.attackAccumulator = migrateCooldownProgress(this.attackAccumulator, oldDeltaCooldown, this.deltaCombatProfile().cooldownMs);
    this.vectorAccumulator = migrateCooldownProgress(this.vectorAccumulator, oldVectorCooldown, this.vectorCombatProfile().cooldownMs);
    this.signalAccumulator = migrateCooldownProgress(this.signalAccumulator, oldSignalCooldown, this.signalCombatProfile().cooldownMs);

    if (this.vectorRank !== oldVectorRank) {
      if (oldVectorRank < 4 && this.vectorRank >= 4) this.vectorTransferState = emptyVectorTransfer();
      if (this.vectorRank >= 5) this.vectorLockState = initialVectorLockState();
    }
    if (this.echoRank !== oldEchoRank) {
      this.ensureEchoMineCapacity();
      if (oldEchoRank < 5 && this.echoRank >= 5) {
        for (const runtime of this.echoMines) if (runtime.active && runtime.mine) runtime.mine = initializeEchoMineForRankV(runtime.mine);
        this.echoBurstLedger = new Map();
      }
    }
    if (!wasEchoOwned && this.echoOwned) this.echoPlacementAccumulator = 0;
    if (this.orbitOwned) this.syncOrbitNodeView();
  }

  private applyVectorQualificationFixture(): void {
    const raw = (window as VectorQualificationWindow).__RARE_SHIFT_V23B2_VECTOR_RANK__;
    if (!Number.isInteger(raw) || (raw as number) < 1 || (raw as number) > 5) return;
    this.vectorOwned = true;
    this.vectorRank = raw as number;
    this.weaponSlotsUsed = 2;
    this.vectorTransferState = emptyVectorTransfer();
    this.vectorLockState = initialVectorLockState();
    this.vectorQualificationFixture = `VECTOR_RANK_${this.vectorRank}`;
  }

  private applyOrbitQualificationFixture(): void {
    const raw = (window as OrbitQualificationWindow).__RARE_SHIFT_V23B3_ORBIT_RANK__;
    if (!Number.isInteger(raw) || (raw as number) < 1 || (raw as number) > 5) return;
    this.orbitOwned = true;
    this.orbitRank = raw as number;
    this.weaponSlotsUsed = Math.max(this.weaponSlotsUsed, 2);
    this.orbitShearLastEmittedAt = null;
    this.orbitQualificationFixture = `ORBIT_RANK_${this.orbitRank}`;
    this.syncOrbitNodeView();
  }

  private applyEchoQualificationFixture(): void {
    const raw = (window as EchoQualificationWindow).__RARE_SHIFT_V23B4_ECHO_RANK__;
    if (!Number.isInteger(raw) || (raw as number) < 1 || (raw as number) > 5) return;
    this.echoOwned = true;
    this.echoRank = raw as number;
    this.weaponSlotsUsed = Math.max(this.weaponSlotsUsed, 2);
    this.echoBurstLedger = new Map();
    this.echoQualificationFixture = `ECHO_RANK_${this.echoRank}`;
    this.ensureEchoMineCapacity();
  }

  private applySignalQualificationFixture(): void {
    const raw = (window as SignalQualificationWindow).__RARE_SHIFT_V23B5_SIGNAL_RANK__;
    if (!Number.isInteger(raw) || (raw as number) < 1 || (raw as number) > 5) return;
    this.signalOwned = true;
    this.signalRank = raw as number;
    this.weaponSlotsUsed = Math.max(this.weaponSlotsUsed, 2);
    this.signalQualificationFixture = `SIGNAL_RANK_${this.signalRank}`;
  }

  private ensureEchoMineCapacity(): void {
    const required = this.echoCombatProfile(this.echoRank, 0).maxActive;
    while (this.echoMines.length < required) {
      const view = this.add.graphics().setDepth(23).setVisible(false);
      this.echoMines.push({ active: false, mine: null, view });
    }
  }

  update(_time: number, delta: number): void {
    if (this.dead || this.draftOpen) { this.syncTestState(); return; }
    const dt = Math.min(50, Math.max(0, delta));
    this.elapsedActiveMs += dt;
    this.updateMovement(dt / 1000);
    this.updateDirector();
    const stage = stageForElapsedMs(this.elapsedActiveMs);
    if (stage.spawnIntervalMs !== null) {
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
        this.vectorTransferState = emptyVectorTransfer();
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
      elapsedMs: this.elapsedActiveMs, phase: this.phase, hp: this.hp, level: this.level,
      xp: this.xp, kills: this.kills, shifts: this.shifts, deltaRank: this.deltaRank,
    })) {
      this.qualified = true;
      this.statusText.setText("V2-1 LOOP COMPLETE // keep surviving or review the build.");
    }
    this.syncTestState();
  }

  private drawWorld(): void {
    this.background = this.add.graphics().setDepth(-10);
    this.background.fillStyle(hex(V2_PALETTE.backgroundPrimary), 1).fillRect(0, 0, V21_WORLD_WIDTH, V21_WORLD_HEIGHT);
    const sectorW = V21_WORLD_WIDTH / 5, sectorH = V21_WORLD_HEIGHT / 4;
    for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 5; sx++) {
      const left = sx * sectorW, top = sy * sectorH;
      if ((sx + sy) % 2 === 0) this.background.fillStyle(hex(V2_PALETTE.backgroundSecondary), 0.22).fillRect(left + 8, top + 8, sectorW - 16, sectorH - 16);
      this.background.lineStyle(1, hex(V2_PALETTE.gridLine), 0.2).strokeRect(left + 8, top + 8, sectorW - 16, sectorH - 16);
      const railTone = (sx + sy) % 2 === 0 ? hex(V2_PALETTE.phaseA) : hex(V2_PALETTE.phaseB);
      this.background.lineStyle(2, railTone, 0.09);
      this.background.lineBetween(left + 26, top + 28, left + 102, top + 28);
      this.background.lineBetween(left + 26, top + 28, left + 26, top + 78);
    }
    const grid = buildFractureGrid(30, 20, this.seed), cellW = V21_WORLD_WIDTH / 30, cellH = V21_WORLD_HEIGHT / 20;
    for (let y = 0; y < grid.length; y++) for (let x = 0; x < grid[y].length; x++) {
      const px = x * cellW, py = y * cellH, cell = grid[y][x];
      if (cell === "GRID") this.background.lineStyle(1, hex(V2_PALETTE.gridLine), 0.32).strokeRect(px + 1, py + 1, cellW - 2, cellH - 2);
      else if (cell === "FRACTURE") this.background.lineStyle(1, hex(V2_PALETTE.gridLine), 0.7).lineBetween(px + 8, py + cellH - 10, px + cellW - 8, py + 10);
      else if (cell === "COMMON_MARK") this.background.fillStyle(hex(V2_PALETTE.common), 0.12).fillRect(px + cellW / 2 - 4, py + cellH / 2 - 4, 8, 8);
    }
    this.background.lineStyle(3, hex(V2_PALETTE.common), 0.2).strokeRect(2, 2, V21_WORLD_WIDTH - 4, V21_WORLD_HEIGHT - 4);
  }

  private buildPools(): void {
    for (let i = 0; i < V21_MAX_ACTIVE_ENEMIES; i++) {
      const view = this.add.container(-500, -500).setDepth(20).setVisible(false);
      const telegraphView = this.add.graphics().setDepth(19).setVisible(false);
      const healthView = this.add.graphics().setDepth(31).setVisible(false);
      this.enemies.push({
        id: -1, active: false, kind: "TRACE", hp: 0, maxHp: 0, x: -500, y: -500, staggerUntilMs: 0,
        elite: false, checkpointId: null, beaconNextShotAt: 0, beaconLaunchAt: null, beaconDirectionX: 0, beaconDirectionY: 0,
        flickerNextSwitchAt: 0, eliteNextPulseAt: 0, elitePulseAt: null, view, telegraphView, healthView,
      });
    }
    for (let i = 0; i < PICKUP_POOL_SIZE; i++) {
      const view = this.add.container(-500, -500).setDepth(15).setVisible(false);
      this.paintRows(view, V2_ART_SPRITES.SIGNAL_XP.rows, hex(V2_PALETTE.common), 2);
      view.addAt(this.add.circle(0, 0, 20, hex(V2_PALETTE.common), 0.025).setStrokeStyle(1, hex(V2_PALETTE.common), 0.28), 0);
      this.pickups.push({ active: false, kind: "SIGNAL_XP", magnetized: false, x: -500, y: -500, view });
    }
    for (let i = 0; i < VECTOR_RANK_I.maxInFlight; i++) {
      const view = this.add.rectangle(-500, -500, 18, 4, hex(V2_PALETTE.common), 0.95).setDepth(28).setVisible(false);
      this.vectorProjectiles.push({
        active: false,
        targetId: -1,
        x: -500,
        y: -500,
        originX: -500,
        originY: -500,
        directionX: 0,
        directionY: 0,
        traveled: 0,
        launchPhase: "A",
        profile: null,
        transferShot: false,
        hitIds: [],
        hitDistances: [],
        hitDamages: [],
        nextHitIndex: 0,
        view,
      });
    }
    for (let i = 0; i < ECHO_RANK_I.maxActive; i++) {
      const view = this.add.graphics().setDepth(23).setVisible(false);
      this.echoMines.push({ active: false, mine: null, view });
    }
  }

  private paintRows(container: Phaser.GameObjects.Container, rows: FrameRows, color: number, scale: number): void {
    container.removeAll(true);
    const left = -(16 * scale) / 2, top = -(16 * scale) / 2;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (rows[y][x] === "#") {
      container.add(this.add.rectangle(left + x * scale + scale / 2, top + y * scale + scale / 2, scale, scale, color));
    }
  }

  private paintEnemy(container: Phaser.GameObjects.Container, kind: V2EnemyKind, elite = false): void {
    const threat = enemyThreatPhase(kind);
    const tone = threat === "A" ? hex(V2_PALETTE.phaseA) : threat === "B" ? hex(V2_PALETTE.phaseB) : hex(V2_PALETTE.common);
    const spriteKey = kind === "SPLIT_A" || kind === "FLICKER_A" ? "SPLIT_A" : kind === "SPLIT_B" || kind === "FLICKER_B" ? "SPLIT_B" : "TRACE";
    const scale = kind === "ANCHOR" ? 2.7 : kind === "BEACON" ? 2.2 : 2;
    this.paintRows(container, V2_ART_SPRITES[spriteKey].rows, tone, scale);
    if (kind === "BEACON") {
      container.add(this.add.rectangle(0, 0, 46, 46, 0x000000, 0).setStrokeStyle(2, tone, 0.72));
      container.add(this.add.rectangle(0, -28, 4, 16, tone, 0.9));
      container.add(this.add.circle(0, -37, 5, tone, 0.9));
      container.add(this.add.rectangle(0, 0, 60, 2, tone, 0.52));
    } else if (kind === "ANCHOR") {
      container.add(this.add.rectangle(0, 0, 58, 58, 0x000000, 0).setStrokeStyle(3, tone, 0.82));
      container.add(this.add.rectangle(0, 0, 40, 40, 0x000000, 0).setStrokeStyle(1, tone, 0.55));
      container.add(this.add.rectangle(-30, 0, 8, 22, tone, 0.82));
      container.add(this.add.rectangle(30, 0, 8, 22, tone, 0.82));
    } else if (isFlickerKind(kind)) {
      const side = kind === "FLICKER_A" ? -24 : 24;
      container.add(this.add.rectangle(0, 0, 46, 46, 0x000000, 0).setStrokeStyle(2, tone, 0.72).setRotation(Math.PI / 4));
      container.add(this.add.rectangle(side, 0, 4, 32, tone, 0.88));
    } else if (kind === "TRACE") {
      container.add(this.add.rectangle(0, 0, 40, 40, 0x000000, 0).setStrokeStyle(1, tone, 0.48));
      container.add(this.add.rectangle(0, -22, 10, 2, tone, 0.7));
      container.add(this.add.rectangle(0, 22, 10, 2, tone, 0.7));
    } else {
      const side = kind === "SPLIT_A" ? -22 : 22, inward = kind === "SPLIT_A" ? 4 : -4;
      container.add(this.add.rectangle(side, 0, 3, 30, tone, 0.72));
      container.add(this.add.rectangle(side + inward, -13, 10, 3, tone, 0.72));
      container.add(this.add.rectangle(side + inward, 13, 10, 3, tone, 0.72));
    }
    if (elite) {
      container.add(this.add.circle(0, 0, 38, 0x000000, 0).setStrokeStyle(3, 0xf6c85f, 0.95));
      container.add(this.add.rectangle(0, -46, 14, 6, 0xf6c85f, 0.95).setRotation(Math.PI / 4));
    }
  }

  private paintFriend(): void {
    this.friend.removeAll(true);
    const rows = this.phase === "A" ? this.pair.a.rows : this.pair.b.rows;
    const tone = hex(this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB), scale = 4;
    const left = -(16 * scale) / 2, top = -(16 * scale) / 2;
    this.friend.add(this.add.circle(0, 5, 42, tone, 0.035).setStrokeStyle(1, tone, 0.52));
    this.friend.add(this.add.circle(0, 5, 34, hex(V2_PALETTE.common), 0.018).setStrokeStyle(1, hex(V2_PALETTE.common), 0.16));
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (rows[y][x] === "#") this.friend.add(this.add.rectangle(left + x * scale + scale / 2, top + y * scale + scale / 2, scale + 2, scale + 2, hex(V2_PALETTE.common)));
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (rows[y][x] === "#") this.friend.add(this.add.rectangle(left + x * scale + scale / 2, top + y * scale + scale / 2, scale, scale, 0x050607));
  }

  private buildHud(): void {
    this.add.rectangle(480, 42, 900, 64, 0x0b0e12, 0.9).setStrokeStyle(1, 0x344050).setScrollFactor(0).setDepth(100).setAlpha(0.94);
    this.hpBar = this.add.graphics().setScrollFactor(0).setDepth(101);
    this.xpBar = this.add.graphics().setScrollFactor(0).setDepth(101);
    this.hudText = this.add.text(40, 18, "", { fontFamily: "monospace", fontSize: "14px", color: V2_PALETTE.common, fontStyle: "bold" }).setScrollFactor(0).setDepth(102);
    this.buildText = this.add.text(574, 20, "", { fontFamily: "monospace", fontSize: "9px", color: "#9eabb8", fontStyle: "bold" }).setScrollFactor(0).setDepth(102);
    this.phaseText = this.add.text(790, 16, "", { fontFamily: "monospace", fontSize: "14px", color: V2_PALETTE.phaseB, fontStyle: "bold", align: "right" }).setScrollFactor(0).setDepth(102);
    this.statusText = this.add.text(480, 82, "MOVE · AUTO-FIRE · SPACE / SHIFT", { fontFamily: "monospace", fontSize: "10px", color: "#aeb9c5", backgroundColor: "#0b0e12", padding: { x: 8, y: 4 } }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(110);
    this.stageText = this.add.text(480, 112, "", { fontFamily: "monospace", fontSize: "12px", color: "#d7e0e8", backgroundColor: "#0b0e12", padding: { x: 9, y: 4 }, fontStyle: "bold" }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(109);
    this.updateHud();
  }

  private updateHud(): void {
    this.hpBar.clear().fillStyle(0x202832, 1).fillRect(40, 48, 240, 8);
    this.hpBar.fillStyle(this.hp > 25 ? 0xe8edf2 : 0xf6c85f, 1).fillRect(40, 48, 240 * Math.max(0, this.hp) / V21_PLAYER_MAX_HP, 8);
    this.xpBar.clear().fillStyle(0x202832, 1).fillRect(310, 48, 240, 8);
    this.xpBar.fillStyle(0x7ee787, 1).fillRect(310, 48, 240 * this.xp / xpThreshold(this.level), 8);
    this.hudText.setText(`HP ${Math.max(0, this.hp)}/${V21_PLAYER_MAX_HP}   LV ${this.level}   XP ${this.xp}/${xpThreshold(this.level)}`);
    this.buildText.setText(`K ${this.kills} · Δ ${romanRank(this.deltaRank)} · V ${this.vectorOwned ? romanRank(this.vectorRank) : "--"} · O ${this.orbitOwned ? romanRank(this.orbitRank) : "--"} · E ${this.echoOwned ? romanRank(this.echoRank) : "--"} · S ${this.signalOwned ? romanRank(this.signalRank) : "--"}`);
    this.phaseText.setColor(this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB).setText(`PHASE ${this.phase}\nFRAME ${this.phase === "A" ? this.pair.a.index : this.pair.b.index}`);
    if (this.stageText) this.stageText.setText(`${stageForElapsedMs(this.elapsedActiveMs).label} · CORES ${this.evolutionCores} · REFRACT ${this.refracts}`);
    if (this.shiftButton) this.shiftButton.setStrokeStyle(2, hex(this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB));
  }

  private updateDirector(): void {
    const stage = stageForElapsedMs(this.elapsedActiveMs);
    if (stage.id !== this.directorStage) {
      this.directorStage = stage.id;
      this.statusText.setText(stage.label);
    }
    this.bossPending = stage.id === "BOSS_PENDING";
    for (const checkpoint of dueCheckpoints(this.elapsedActiveMs, this.spawnedCheckpoints)) {
      if (this.spawnCheckpoint(checkpoint.id, checkpoint.kind, checkpoint.hpMultiplier, checkpoint.label)) this.spawnedCheckpoints.add(checkpoint.id);
    }
  }

  private activateEnemy(slot: EnemyRuntime, id: number, kind: V2EnemyKind, x: number, y: number, elite: boolean, checkpointId: CR1CheckpointId | null, hpMultiplier = 1): void {
    const maxHp = Math.max(1, Math.round(enemyBaseHp(kind) * hpMultiplier));
    slot.id = id; slot.active = true; slot.kind = kind; slot.hp = maxHp; slot.maxHp = maxHp; slot.x = x; slot.y = y; slot.staggerUntilMs = 0;
    slot.elite = elite; slot.checkpointId = checkpointId; slot.beaconNextShotAt = this.elapsedActiveMs + 1200; slot.beaconLaunchAt = null; slot.beaconDirectionX = 0; slot.beaconDirectionY = 0;
    slot.flickerNextSwitchAt = isFlickerKind(kind) ? this.elapsedActiveMs + CR1_FLICKER_SWITCH_MS : 0;
    slot.eliteNextPulseAt = elite ? this.elapsedActiveMs + 1800 : 0; slot.elitePulseAt = null;
    slot.telegraphView.clear().setVisible(false); slot.healthView.clear().setVisible(false);
    slot.view.setPosition(x, y).setVisible(true).setScale(1);
    this.paintEnemy(slot.view, kind, elite);
    slot.view.setAlpha(isEnemyCorporeal(kind, this.phase) ? 1 : 0.24);
  }

  private spawnCheckpoint(checkpointId: CR1CheckpointId, kind: V2EnemyKind, hpMultiplier: number, label: string): boolean {
    const slotIndex = selectCheckpointSpawnSlotIndex(this.enemies);
    if (slotIndex < 0) return false;
    const slot = this.enemies[slotIndex];
    if (slot.active) this.retireRegularEnemyForCheckpoint(slot);
    const position = buildCheckpointSpawnPosition(this.seed, checkpointId, { x: this.friend.x, y: this.friend.y });
    this.activateEnemy(slot, this.spawnIndex++, kind, position.x, position.y, true, checkpointId, hpMultiplier);
    this.statusText.setText(label);
    return true;
  }

  private retireRegularEnemyForCheckpoint(enemy: EnemyRuntime): void {
    if (!enemy.active || enemy.elite) throw new Error("checkpoint replacement requires an active regular enemy.");
    const retiredId = enemy.id;
    this.orbitLastHitAt.delete(retiredId);
    if (this.vectorTargetId === retiredId) {
      this.vectorTargetId = null;
      this.vectorTargetKind = null;
      this.vectorReticle.setVisible(false);
    }
    if (this.vectorRank >= 5 && this.vectorLockState.targetId === retiredId) this.resetVectorLockState();
    enemy.active = false;
    enemy.view.setVisible(false);
    enemy.telegraphView.clear().setVisible(false);
    enemy.healthView.clear().setVisible(false);
  }

  private spawnEnemy(): void {
    const slot = this.enemies.find(enemy => !enemy.active);
    if (!slot) return;
    const spec = buildDirectedSpawnSpec(this.seed, this.spawnIndex, this.elapsedActiveMs, { x: this.friend.x, y: this.friend.y });
    if (!spec) return;
    this.spawnIndex += 1;
    this.activateEnemy(slot, spec.id, spec.kind, spec.position.x, spec.position.y, false, null, 1);
  }

  private applyPlayerDamage(amount: number): boolean {
    const playerProtocol = resolveCR2PlayerProtocolRuntime(this.buildCR2LiveSnapshot());
    const contactInvulnMs = V21_CONTACT_INVULN_MS + playerProtocol.contactInvulnBonusMs;
    if (this.elapsedActiveMs - this.lastContactAt < contactInvulnMs) return false;
    this.lastContactAt = this.elapsedActiveMs;
    this.hp = Math.max(0, this.hp - amount);
    if (!this.reduced) this.cameras.main.flash(80, 246, 200, 95, false);
    if (this.hp <= 0) { this.dead = true; this.statusText.setText("SIGNAL LOST // run ended."); }
    return true;
  }

  private updateFlicker(enemy: EnemyRuntime): void {
    if (!isFlickerKind(enemy.kind)) return;
    const warningAt = enemy.flickerNextSwitchAt - CR1_FLICKER_WARNING_MS;
    if (this.elapsedActiveMs >= warningAt && this.elapsedActiveMs < enemy.flickerNextSwitchAt) {
      const nextKind = nextFlickerKind(enemy.kind);
      const tone = hex(nextKind === "FLICKER_A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB);
      enemy.telegraphView.clear().setVisible(true).setPosition(enemy.x, enemy.y).lineStyle(2, tone, 0.8).strokeCircle(0, 0, 34);
    }
    if (this.elapsedActiveMs < enemy.flickerNextSwitchAt) return;
    enemy.kind = nextFlickerKind(enemy.kind);
    enemy.flickerNextSwitchAt += CR1_FLICKER_SWITCH_MS;
    enemy.telegraphView.clear().setVisible(false);
    this.paintEnemy(enemy.view, enemy.kind, enemy.elite);
  }

  private updateBeacon(enemy: EnemyRuntime): void {
    if (enemy.kind !== "BEACON") return;
    if (enemy.beaconLaunchAt === null && this.elapsedActiveMs >= enemy.beaconNextShotAt) {
      const dx = this.friend.x - enemy.x, dy = this.friend.y - enemy.y, length = Math.max(0.001, Math.hypot(dx, dy));
      enemy.beaconDirectionX = dx / length; enemy.beaconDirectionY = dy / length;
      enemy.beaconLaunchAt = this.elapsedActiveMs + CR1_BEACON_TELEGRAPH_MS;
      enemy.telegraphView.clear().setVisible(true).setPosition(enemy.x, enemy.y).lineStyle(2, hex(V2_PALETTE.common), 0.72).lineBetween(0, 0, enemy.beaconDirectionX * 210, enemy.beaconDirectionY * 210);
    }
    if (enemy.beaconLaunchAt === null || this.elapsedActiveMs < enemy.beaconLaunchAt) return;
    this.spawnBeaconProjectile(enemy);
    enemy.beaconLaunchAt = null; enemy.beaconNextShotAt = this.elapsedActiveMs + CR1_BEACON_COOLDOWN_MS; enemy.telegraphView.clear().setVisible(false);
  }

  private updateElitePulse(enemy: EnemyRuntime): void {
    if (!enemy.elite || enemy.kind === "BEACON" || isFlickerKind(enemy.kind)) return;
    if (enemy.elitePulseAt === null && this.elapsedActiveMs >= enemy.eliteNextPulseAt) {
      enemy.elitePulseAt = this.elapsedActiveMs + CR1_ELITE_PULSE_TELEGRAPH_MS;
      enemy.telegraphView.clear().setVisible(true).setPosition(enemy.x, enemy.y).lineStyle(3, 0xf6c85f, 0.78).strokeCircle(0, 0, CR1_ELITE_PULSE_RADIUS);
    }
    if (enemy.elitePulseAt === null || this.elapsedActiveMs < enemy.elitePulseAt) return;
    const distance = Math.hypot(this.friend.x - enemy.x, this.friend.y - enemy.y);
    if (isEnemyCorporeal(enemy.kind, this.phase) && distance <= CR1_ELITE_PULSE_RADIUS) this.applyPlayerDamage(CR1_ELITE_PULSE_DAMAGE);
    enemy.elitePulseAt = null; enemy.eliteNextPulseAt = this.elapsedActiveMs + CR1_ELITE_PULSE_COOLDOWN_MS; enemy.telegraphView.clear().setVisible(false);
  }

  private spawnBeaconProjectile(enemy: EnemyRuntime): void {
    if (this.beaconProjectiles.length >= CR1_MAX_BEACON_PROJECTILES) return;
    const view = this.add.rectangle(enemy.x, enemy.y, 14, 6, hex(V2_PALETTE.common), 0.94).setDepth(26).setRotation(Math.atan2(enemy.beaconDirectionY, enemy.beaconDirectionX));
    this.beaconProjectiles.push({ active: true, x: enemy.x, y: enemy.y, directionX: enemy.beaconDirectionX, directionY: enemy.beaconDirectionY, bornAtMs: this.elapsedActiveMs, view });
  }

  private updateBeaconProjectiles(dt: number): void {
    const survivors: BeaconProjectileRuntime[] = [];
    for (const projectile of this.beaconProjectiles) {
      if (!projectile.active) { projectile.view.destroy(); continue; }
      if (this.elapsedActiveMs - projectile.bornAtMs >= CR1_BEACON_PROJECTILE_LIFETIME_MS) { projectile.view.destroy(); continue; }
      projectile.x += projectile.directionX * CR1_BEACON_PROJECTILE_SPEED * dt;
      projectile.y += projectile.directionY * CR1_BEACON_PROJECTILE_SPEED * dt;
      projectile.view.setPosition(projectile.x, projectile.y);
      if (Math.hypot(this.friend.x - projectile.x, this.friend.y - projectile.y) < 25) {
        this.applyPlayerDamage(CR1_BEACON_PROJECTILE_DAMAGE); projectile.view.destroy(); continue;
      }
      survivors.push(projectile);
    }
    this.beaconProjectiles = survivors;
  }

  private updateEliteHealth(enemy: EnemyRuntime): void {
    if (!enemy.elite) { enemy.healthView.clear().setVisible(false); return; }
    const ratio = Math.max(0, Math.min(1, enemy.hp / Math.max(1, enemy.maxHp)));
    enemy.healthView.clear().setVisible(true).setPosition(enemy.x, enemy.y - 52).fillStyle(0x252b33, 0.95).fillRect(-34, -3, 68, 6).fillStyle(0xf6c85f, 1).fillRect(-34, -3, 68 * ratio, 6);
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      this.updateFlicker(enemy);
      this.updateBeacon(enemy);
      this.updateElitePulse(enemy);
      const dx = this.friend.x - enemy.x, dy = this.friend.y - enemy.y, distance = Math.max(0.001, Math.hypot(dx, dy));
      if (this.elapsedActiveMs >= enemy.staggerUntilMs) {
        const speed = enemyMoveSpeed(enemy.kind) * (enemy.elite ? 0.92 : 1);
        let direction = 1;
        if (enemy.kind === "BEACON") direction = distance < 230 ? -0.7 : distance <= 330 ? 0 : 1;
        enemy.x += dx / distance * speed * dt * direction; enemy.y += dy / distance * speed * dt * direction;
      }
      enemy.view.setPosition(enemy.x, enemy.y); enemy.telegraphView.setPosition(enemy.x, enemy.y);
      this.updateEliteHealth(enemy);
      const corporeal = isEnemyCorporeal(enemy.kind, this.phase);
      enemy.view.setAlpha(corporeal ? 1 : 0.22);
      if (corporeal && distance < (enemy.kind === "ANCHOR" ? 38 : 32)) {
        this.applyPlayerDamage(enemyContactDamage(enemy.kind) + (enemy.elite ? 2 : 0));
        if (this.dead) break;
      }
    }
  }

  private fireDelta(profile: ReturnType<typeof buildDeltaProfile>): void {
    this.deltaPrimaryPulses += 1;
    this.tweens.killTweensOf(this.burst);
    this.burst.clear().setVisible(true).setPosition(this.friend.x, this.friend.y).setScale(this.reduced ? 1 : 0.72).setAlpha(1);
    const tone = this.phase === "A" ? hex(V2_PALETTE.phaseA) : hex(V2_PALETTE.phaseB);
    this.burst.fillStyle(hex(V2_PALETTE.common), this.reduced ? 0.16 : 0.22);
    for (const point of profile.points) this.burst.fillRect(point.x * profile.worldScale - 6, point.y * profile.worldScale - 6, 12, 12);
    this.burst.fillStyle(tone, this.reduced ? 0.62 : 0.96);
    for (const point of profile.points) this.burst.fillRect(point.x * profile.worldScale - 4, point.y * profile.worldScale - 4, 8, 8);
    const duration = effectDuration("DELTA_BURST", this.reduced);
    if (this.reduced) this.time.delayedCall(duration, () => this.burst.setVisible(false));
    else this.tweens.add({ targets: this.burst, scaleX: 1.08, scaleY: 1.08, alpha: 0, duration, ease: "Quad.Out", onComplete: () => this.burst.setVisible(false).setAlpha(1).setScale(1) });
    for (const enemy of this.enemies) {
      if (!enemy.active || !isEnemyCorporeal(enemy.kind, this.phase)) continue;
      if (!deltaHitsTarget(profile, enemy.x - this.friend.x, enemy.y - this.friend.y)) continue;
      enemy.hp -= profile.damage; enemy.view.setAlpha(0.55);
      if (profile.staggerMs > 0) {
        enemy.staggerUntilMs = Math.max(enemy.staggerUntilMs, this.elapsedActiveMs + profile.staggerMs);
        this.deltaStaggers += 1;
      }
      this.time.delayedCall(effectDuration("ENEMY_HIT", this.reduced), () => { if (enemy.active) enemy.view.setAlpha(isEnemyCorporeal(enemy.kind, this.phase) ? 1 : 0.22); });
      if (enemy.hp <= 0) this.killEnemy(enemy);
    }
  }

  private scheduleDeltaEcho(previousPhase: Phase): void {
    if (!canScheduleDeltaEcho(this.deltaRank, this.deltaEchoLastScheduledAt, this.elapsedActiveMs)) return;
    const profile = buildDeltaEchoProfile(this.pair.a.rows, this.pair.b.rows, previousPhase);
    this.deltaEchoPending = { phase: previousPhase, scheduledAtMs: this.elapsedActiveMs + profile.delayMs, profile };
    this.deltaEchoLastScheduledAt = this.elapsedActiveMs;
    this.deltaEchoSchedules += 1;
  }

  private updatePendingDeltaEcho(): void {
    const pending = this.deltaEchoPending;
    if (!pending || this.elapsedActiveMs < pending.scheduledAtMs) return;
    this.deltaEchoPending = null;
    this.fireDeltaEcho(pending);
  }

  private fireDeltaEcho(pending: PendingDeltaEchoRuntime): void {
    this.deltaEchoFires += 1;
    const originX = this.friend.x, originY = this.friend.y;
    const tone = hex(pending.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB);
    const fx = this.add.graphics().setPosition(originX, originY).setDepth(25);
    fx.fillStyle(tone, this.reduced ? 0.18 : 0.34);
    for (const point of pending.profile.points) fx.fillRect(point.x * pending.profile.worldScale - 3, point.y * pending.profile.worldScale - 3, 6, 6);
    this.time.delayedCall(this.reduced ? 55 : 110, () => fx.destroy());

    for (const enemy of this.enemies) {
      if (!enemy.active || !isDeltaEchoTargetEligible(enemy.kind, pending.phase, this.phase)) continue;
      if (!deltaEchoHitsTarget(pending.profile, enemy.x - originX, enemy.y - originY)) continue;
      enemy.hp -= pending.profile.damage;
      this.deltaEchoHits += 1;
      enemy.view.setAlpha(0.42);
      this.time.delayedCall(effectDuration("ENEMY_HIT", this.reduced), () => { if (enemy.active) enemy.view.setAlpha(isEnemyCorporeal(enemy.kind, this.phase) ? 1 : 0.22); });
      if (enemy.hp <= 0) this.killEnemy(enemy);
    }
  }

  private resetVectorLockState(): void {
    if (this.vectorLockState.targetId !== null || this.vectorLockState.stacks !== 0) this.vectorLockResets += 1;
    this.vectorLockState = resetVectorLock();
  }

  private refreshVectorTarget(): void {
    const profile = this.vectorCombatProfile();
    if (this.vectorRank >= 5 && this.vectorLockState.targetId !== null) {
      const locked = this.enemies.find(enemy => enemy.active && enemy.id === this.vectorLockState.targetId) ?? null;
      if (!locked || !isEnemyCorporeal(locked.kind, this.phase) || vectorPriorityTier(locked.kind) < 1) {
        this.resetVectorLockState();
      } else {
        const dx = locked.x - this.friend.x, dy = locked.y - this.friend.y;
        if (dx * dx + dy * dy > profile.range * profile.range) this.resetVectorLockState();
      }
    }

    const result = this.vectorRank >= 3
      ? acquirePriorityVectorTarget(this.enemies, this.phase, this.friend.x, this.friend.y, this.vectorRank >= 5 ? this.vectorLockState.targetId : null, profile.range)
      : acquireVectorTarget(this.enemies, this.phase, this.friend.x, this.friend.y, profile.range);
    const nextId = result?.id ?? null;
    if (this.vectorRank >= 5 && this.vectorLockState.targetId !== null && nextId !== this.vectorLockState.targetId) this.resetVectorLockState();
    if (nextId !== this.vectorTargetId) {
      if (nextId !== null) this.vectorAcquisitions += 1;
      this.vectorTargetId = nextId;
      this.vectorTargetKind = result?.kind ?? null;
    }
    this.vectorReticle.clear();
    const target = this.currentVectorTarget();
    if (!target) { this.vectorReticle.setVisible(false); return; }
    const tone = hex(this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB);
    const priority = this.vectorRank >= 3 && vectorPriorityTier(target.kind) > 0;
    this.vectorReticle.setVisible(true).setPosition(target.x, target.y).lineStyle(priority ? 2 : 1, tone, priority ? 0.9 : 0.72).strokeRect(-19, -19, 38, 38);
    if (this.vectorRank >= 5 && this.vectorLockState.targetId === target.id) {
      const inset = 23 + this.vectorLockState.stacks * 2;
      this.vectorReticle.lineStyle(1, hex(V2_PALETTE.common), 0.72).strokeRect(-inset, -inset, inset * 2, inset * 2);
    }
    if (this.vectorRank >= 4 && isVectorTransferArmed(this.vectorTransferState, this.elapsedActiveMs)) {
      this.vectorReticle.lineStyle(1, tone, 0.62).lineBetween(-26, 24, 26, -24);
    }
  }

  private currentVectorTarget(): EnemyRuntime | null {
    if (this.vectorTargetId === null) return null;
    const enemy = this.enemies.find(item => item.active && item.id === this.vectorTargetId) ?? null;
    if (!enemy || !isEnemyCorporeal(enemy.kind, this.phase)) return null;
    const profile = this.vectorCombatProfile();
    const dx = enemy.x - this.friend.x, dy = enemy.y - this.friend.y;
    return dx * dx + dy * dy <= profile.range * profile.range ? enemy : null;
  }

  private activeVectorProjectileCount(): number { return this.vectorProjectiles.filter(projectile => projectile.active).length; }

  private fireVector(target: EnemyRuntime): void {
    const projectile = this.vectorProjectiles.find(item => !item.active);
    if (!projectile) return;
    const originX = this.friend.x, originY = this.friend.y;
    const transferReady = this.vectorRank >= 4
      && this.vectorTransferState.phase === this.phase
      && isVectorTransferArmed(this.vectorTransferState, this.elapsedActiveMs);
    const profile = this.vectorCombatProfile(this.vectorRank, transferReady);
    const dx = target.x - originX, dy = target.y - originY, distance = Math.hypot(dx, dy);
    if (!(distance > 0)) return;

    let hitIds = [target.id];
    let hitDistances = [distance];
    let hitDamages = [profile.damageSequence[0]];
    if (this.vectorRank >= 2) {
      const planned = planVectorLineHits(this.enemies, this.phase, originX, originY, target, profile.maxHits as 2 | 3, profile.range, profile.corridorRadius);
      if (planned.length === 0) return;
      hitIds = planned.map(hit => hit.id);
      hitDistances = planned.map(hit => hit.alongRay);
      hitDamages = planned.map((_, index) => profile.damageSequence[index] ?? profile.damageSequence[profile.damageSequence.length - 1]);
    }
    if (this.vectorRank >= 5 && vectorPriorityTier(target.kind) >= 1) hitDamages[0] = vectorPrimaryDamageForStacks(this.vectorLockState.stacks);

    if (transferReady) {
      this.vectorTransferState = consumeVectorTransfer(this.vectorTransferState, this.elapsedActiveMs);
      this.vectorTransferShots += 1;
    }

    projectile.active = true;
    projectile.targetId = target.id;
    projectile.x = originX;
    projectile.y = originY;
    projectile.originX = originX;
    projectile.originY = originY;
    projectile.directionX = dx / distance;
    projectile.directionY = dy / distance;
    projectile.traveled = 0;
    projectile.launchPhase = this.phase;
    projectile.profile = profile;
    projectile.transferShot = transferReady;
    projectile.hitIds = hitIds;
    projectile.hitDistances = hitDistances;
    projectile.hitDamages = hitDamages;
    projectile.nextHitIndex = 0;
    const tone = hex(this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB);
    const width = transferReady ? 28 : this.vectorRank >= 2 ? 22 : 18;
    const height = transferReady ? 6 : 4;
    projectile.view.setPosition(originX, originY).setRotation(Math.atan2(dy, dx)).setDisplaySize(width, height).setFillStyle(tone, transferReady ? 1 : 0.95).setStrokeStyle(transferReady ? 1 : 0, hex(V2_PALETTE.common), 0.9).setVisible(true);
    this.vectorShots += 1;
  }

  private applyVectorProjectileHit(projectile: VectorProjectileRuntime, hitIndex: number): void {
    const profile = projectile.profile;
    if (!profile) return;
    const id = projectile.hitIds[hitIndex];
    const enemy = this.enemies.find(item => item.active && item.id === id) ?? null;
    if (!enemy || !isEnemyCorporeal(enemy.kind, projectile.launchPhase)) return;
    const damage = projectile.hitDamages[hitIndex] ?? profile.damageSequence[Math.min(hitIndex, profile.damageSequence.length - 1)];
    enemy.hp -= damage;
    this.vectorHits += 1;
    if (hitIndex > 0) this.vectorPenetrationHits += 1;
    this.emitVectorHitFx(enemy.x, enemy.y, projectile.transferShot, hitIndex > 0);
    if (profile.rank >= 5 && hitIndex === 0) {
      if (vectorPriorityTier(enemy.kind) >= 1) {
        this.vectorLockState = recordVectorPrimaryHit(this.vectorLockState, enemy.id);
        this.vectorLockPeakStacks = Math.max(this.vectorLockPeakStacks, this.vectorLockState.stacks);
      } else {
        this.resetVectorLockState();
      }
    }
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  private updateVectorProjectiles(dt: number): void {
    for (const projectile of this.vectorProjectiles) {
      if (!projectile.active || !projectile.profile) continue;
      const profile = projectile.profile;
      if (profile.rank === 1) {
        const target = this.enemies.find(enemy => enemy.active && enemy.id === projectile.targetId);
        if (!target || !isEnemyCorporeal(target.kind, this.phase)) { this.deactivateVectorProjectile(projectile); continue; }
        const dx = target.x - projectile.x, dy = target.y - projectile.y, distance = Math.max(0.001, Math.hypot(dx, dy));
        const step = profile.speed * dt;
        if (distance <= profile.hitRadius + step) {
          this.applyVectorProjectileHit(projectile, 0);
          this.deactivateVectorProjectile(projectile);
          continue;
        }
        projectile.x += dx / distance * step; projectile.y += dy / distance * step;
        projectile.view.setPosition(projectile.x, projectile.y).setRotation(Math.atan2(dy, dx));
        continue;
      }

      if (projectile.launchPhase !== this.phase) { this.deactivateVectorProjectile(projectile); continue; }
      const nextTravel = Math.min(profile.range, projectile.traveled + profile.speed * dt);
      while (projectile.nextHitIndex < projectile.hitIds.length && projectile.hitDistances[projectile.nextHitIndex] <= nextTravel) {
        this.applyVectorProjectileHit(projectile, projectile.nextHitIndex);
        projectile.nextHitIndex += 1;
      }
      projectile.traveled = nextTravel;
      projectile.x = projectile.originX + projectile.directionX * nextTravel;
      projectile.y = projectile.originY + projectile.directionY * nextTravel;
      projectile.view.setPosition(projectile.x, projectile.y).setRotation(Math.atan2(projectile.directionY, projectile.directionX));
      const finalHitDistance = projectile.hitDistances[projectile.hitDistances.length - 1] ?? profile.range;
      if ((projectile.nextHitIndex >= projectile.hitIds.length && nextTravel >= finalHitDistance + profile.hitRadius) || nextTravel >= profile.range) {
        this.deactivateVectorProjectile(projectile);
      }
    }
  }

  private deactivateVectorProjectile(projectile: VectorProjectileRuntime): void {
    projectile.active = false;
    projectile.targetId = -1;
    projectile.profile = null;
    projectile.transferShot = false;
    projectile.hitIds = [];
    projectile.hitDistances = [];
    projectile.hitDamages = [];
    projectile.nextHitIndex = 0;
    projectile.traveled = 0;
    projectile.view.setVisible(false).setPosition(-500, -500).setDisplaySize(18, 4).setStrokeStyle(0, 0, 0);
  }

  private invalidateVectorForShift(nextPhase: Phase): void {
    if (!this.vectorOwned) return;
    this.vectorTargetId = null; this.vectorTargetKind = null; this.vectorReticle.clear().setVisible(false);
    for (const projectile of this.vectorProjectiles) if (projectile.active) this.deactivateVectorProjectile(projectile);
    if (this.vectorRank >= 5) this.resetVectorLockState();
    this.vectorTransferState = this.vectorRank >= 4 ? armVectorTransfer(this.elapsedActiveMs, nextPhase) : emptyVectorTransfer();
    this.vectorShiftInvalidations += 1;
  }

  private emitVectorHitFx(x: number, y: number, transferShot = false, secondary = false): void {
    const tone = hex(this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB);
    const fx = this.add.graphics().setPosition(x, y).setDepth(29).lineStyle(transferShot ? 3 : 2, tone, transferShot ? 0.98 : 0.85);
    fx.lineBetween(-8, 0, 8, 0); fx.lineBetween(0, -8, 0, 8);
    if (secondary) fx.lineBetween(-11, 4, 11, 4);
    if (transferShot) fx.strokeCircle(0, 0, 11);
    this.time.delayedCall(this.reduced ? 45 : transferShot ? 120 : 90, () => fx.destroy());
  }

  private updateOrbit(dtMs: number): void {
    const profile = this.orbitCombatProfile();
    this.orbitAngle = advanceOrbitAngle(this.orbitAngle, this.phase, dtMs, profile.angularSpeed);
    const points = this.syncOrbitNodeView(profile);
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      const lastHitAt = this.orbitLastHitAt.get(enemy.id) ?? null;
      const legal = points.some(point => isOrbitContactLegal(enemy, this.phase, point.x, point.y, lastHitAt, this.elapsedActiveMs, profile));
      if (!legal) continue;
      this.orbitLastHitAt.set(enemy.id, this.elapsedActiveMs);
      enemy.hp -= profile.damage;
      this.orbitHits += 1;
      this.emitOrbitHitFx(enemy.x, enemy.y);
      if (enemy.hp <= 0) this.killEnemy(enemy);
    }
  }

  private syncOrbitNodeView(profile: OrbitRankProfile = this.orbitCombatProfile()): readonly { x: number; y: number }[] {
    const points = orbitNodePositions(this.friend.x, this.friend.y, this.orbitAngle, profile);
    if (!this.orbitOwned) { this.orbitNode.clear().setVisible(false); return points; }
    const direction = orbitDirectionForPhase(this.phase);
    const tone = hex(this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB);
    const angles = orbitNodeAngles(this.orbitAngle, profile.nodeCount);
    this.orbitNode.clear().setVisible(true).setPosition(this.friend.x, this.friend.y).setRotation(0);
    this.orbitNode.lineStyle(1, tone, 0.22).strokeCircle(0, 0, profile.radius);
    for (let index = 0; index < points.length; index += 1) {
      const localX = points[index].x - this.friend.x;
      const localY = points[index].y - this.friend.y;
      const tangent = angles[index] + direction * Math.PI / 2;
      this.orbitNode.lineStyle(1, tone, 0.68).strokeCircle(localX, localY, 11);
      this.orbitNode.fillStyle(tone, 0.95).fillRect(localX - 5, localY - 5, 10, 10);
      this.orbitNode.lineStyle(2, hex(V2_PALETTE.common), 0.72).lineBetween(localX, localY, localX + Math.cos(tangent) * 12, localY + Math.sin(tangent) * 12);
    }
    return points;
  }

  private tryEmitOrbitShear(anchorAngle: number): void {
    const profile = this.orbitCombatProfile();
    if (profile.rank < 4) return;
    if (!canEmitOrbitShear(profile.rank, this.orbitShearLastEmittedAt, this.elapsedActiveMs)) {
      this.orbitShearRearmBlocks += 1;
      return;
    }

    this.orbitShearLastEmittedAt = this.elapsedActiveMs;
    this.orbitShearEvents += 1;
    const ids = planOrbitShearTargetIds(this.enemies, this.phase, this.friend.x, this.friend.y, anchorAngle, profile);
    this.emitOrbitShearFx(anchorAngle, profile);
    for (const id of ids) {
      const enemy = this.enemies.find(item => item.active && item.id === id) ?? null;
      if (!enemy || !isEnemyCorporeal(enemy.kind, this.phase)) continue;
      enemy.hp -= profile.shearDamage;
      this.orbitShearHits += 1;
      this.emitOrbitHitFx(enemy.x, enemy.y, true);
      if (enemy.hp <= 0) this.killEnemy(enemy);
    }
  }

  private emitOrbitShearFx(anchorAngle: number, profile: OrbitRankProfile): void {
    const tone = hex(this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB);
    const direction = orbitDirectionForPhase(this.phase);
    const fx = this.add.graphics().setPosition(this.friend.x, this.friend.y).setDepth(29);
    fx.lineStyle(this.reduced ? 1 : 2, tone, this.reduced ? 0.68 : 0.9);
    for (const startAngle of orbitNodeAngles(anchorAngle, profile.nodeCount)) {
      let previousX = Math.cos(startAngle) * profile.radius;
      let previousY = Math.sin(startAngle) * profile.radius;
      for (let step = 1; step <= 8; step += 1) {
        const angle = startAngle + direction * profile.shearArcRad * step / 8;
        const x = Math.cos(angle) * profile.radius;
        const y = Math.sin(angle) * profile.radius;
        fx.lineBetween(previousX, previousY, x, y);
        previousX = x;
        previousY = y;
      }
    }
    this.time.delayedCall(this.reduced ? 65 : profile.shearDurationMs, () => fx.destroy());
  }

  private emitOrbitHitFx(x: number, y: number, shear = false): void {
    const tone = hex(this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB);
    const fx = this.add.graphics().setPosition(x, y).setDepth(29).lineStyle(shear ? 3 : 2, tone, shear ? 0.94 : 0.78);
    fx.strokeCircle(0, 0, shear ? 12 : 9);
    if (shear) fx.lineBetween(-10, 0, 10, 0);
    this.time.delayedCall(this.reduced ? 45 : shear ? 100 : 85, () => fx.destroy());
  }

  private updateEcho(dtMs: number): void {
    const placementProfile = this.echoCombatProfile(this.echoRank, 0);
    for (const runtime of this.echoMines) {
      if (!runtime.active || !runtime.mine) continue;
      const mineProfile = this.echoCombatProfile(this.echoRank, runtime.mine.memoryDepth);
      if (!isEchoMineExpired(runtime.mine, this.elapsedActiveMs, mineProfile)) continue;
      this.deactivateEchoMine(runtime);
      this.echoExpiries += 1;
    }

    this.echoPlacementAccumulator += dtMs;
    while (this.echoPlacementAccumulator >= placementProfile.placementIntervalMs) {
      this.echoPlacementAccumulator -= placementProfile.placementIntervalMs;
      this.tryPlaceEchoMine();
    }

    const ordered = this.echoMines
      .filter((runtime): runtime is EchoMineRuntime & { mine: EchoMineCore } => runtime.active && runtime.mine !== null)
      .sort((a, b) => a.mine.id - b.mine.id);

    for (const runtime of ordered) {
      if (!runtime.active || !runtime.mine) continue;
      this.paintEchoMine(runtime);
      const mine = runtime.mine;
      const profile = this.echoCombatProfile(this.echoRank, mine.memoryDepth);
      if (echoTriggerCandidateIds(mine, this.phase, this.elapsedActiveMs, this.enemies, profile).length === 0) continue;
      const targetIds = echoBlastTargetIds(mine, this.phase, this.enemies, profile);
      this.deactivateEchoMine(runtime);
      this.echoTriggers += 1;
      if (mine.memoryDepth >= 2) this.echoDepth2Triggers += 1;
      this.emitEchoBlastFx(mine.x, mine.y, mine.recordedPhase, profile);
      const plan = planEchoDamageTargets(targetIds, this.echoRank, this.elapsedActiveMs, this.echoBurstLedger);
      this.echoBurstSuppressedHits += targetIds.length - plan.targetIds.length;
      this.echoBurstLedger = plan.ledger;
      for (const id of plan.targetIds) {
        const enemy = this.enemies.find(item => item.active && item.id === id);
        if (!enemy || !isEnemyCorporeal(enemy.kind, this.phase)) continue;
        enemy.hp -= profile.damage;
        this.echoHits += 1;
        if (mine.memoryDepth >= 2) this.echoDepth2Hits += 1;
        if (enemy.hp <= 0) this.killEnemy(enemy);
      }
    }
  }

  private tryPlaceEchoMine(): void {
    const profile = this.echoCombatProfile(this.echoRank, 0);
    this.ensureEchoMineCapacity();
    const active = this.echoMines
      .filter((runtime): runtime is EchoMineRuntime & { mine: EchoMineCore } => runtime.active && runtime.mine !== null)
      .map(runtime => runtime.mine);
    const replacementId = selectEchoReplacementId(active, profile);
    if (!canPlaceEchoMine(this.friend.x, this.friend.y, active, replacementId, profile)) return;

    let slot = this.echoMines.find(runtime => !runtime.active) ?? null;
    if (replacementId !== null) {
      const replacement = this.echoMines.find(runtime => runtime.active && runtime.mine?.id === replacementId) ?? null;
      if (!replacement) return;
      this.deactivateEchoMine(replacement);
      this.echoReplacements += 1;
      slot = replacement;
    }
    if (!slot) return;

    slot.active = true;
    slot.mine = createEchoMine(this.echoNextId++, this.friend.x, this.friend.y, this.phase, this.elapsedActiveMs);
    this.echoPlacements += 1;
    this.paintEchoMine(slot);
  }

  private transitionEchoMinesForShift(nextPhase: Phase): void {
    for (const runtime of this.echoMines) {
      if (!runtime.active || !runtime.mine) continue;
      const previous = runtime.mine;
      const next = transitionEchoMineForPhase(previous, nextPhase, this.elapsedActiveMs, this.echoRank);
      if (next.memoryDepth > previous.memoryDepth) this.echoDepthIncrements += next.memoryDepth - previous.memoryDepth;
      if (previous.state !== next.state) {
        if (next.state === "ARMED_AWAY") this.echoArmedTransitions += 1;
        if (next.state === "RETURN_READY") this.echoReturns += 1;
      }
      runtime.mine = next;
      this.paintEchoMine(runtime);
    }
  }

  private paintEchoMine(runtime: EchoMineRuntime): void {
    if (!runtime.active || !runtime.mine) { runtime.view.clear().setVisible(false); return; }
    const mine = runtime.mine;
    const tone = hex(mine.recordedPhase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB);
    const alpha = mine.state === "DORMANT_HOME" ? 0.48 : mine.state === "ARMED_AWAY" ? 0.24 : 0.92;
    runtime.view.clear().setVisible(true).setPosition(mine.x, mine.y);
    runtime.view.lineStyle(mine.state === "RETURN_READY" ? 2 : 1, tone, alpha).strokeCircle(0, 0, mine.state === "RETURN_READY" ? 15 : 11);
    runtime.view.fillStyle(tone, alpha).fillRect(-5, -5, 10, 10);
    runtime.view.fillStyle(hex(V2_PALETTE.common), Math.min(0.8, alpha + 0.12)).fillRect(-2, -2, 4, 4);
    if (this.echoRank >= 5 && mine.memoryDepth >= 1) {
      runtime.view.lineStyle(1, tone, 0.62).strokeCircle(0, 0, 18);
      runtime.view.fillStyle(hex(V2_PALETTE.common), 0.78).fillRect(-10, -1, 4, 2);
      if (mine.memoryDepth >= 2) {
        runtime.view.lineStyle(2, tone, 0.76).strokeCircle(0, 0, 21);
        runtime.view.fillStyle(hex(V2_PALETTE.common), 0.82).fillRect(6, -1, 4, 2);
      }
    }
  }

  private deactivateEchoMine(runtime: EchoMineRuntime): void {
    runtime.active = false;
    runtime.mine = null;
    runtime.view.clear().setVisible(false).setPosition(-500, -500);
  }

  private hideEchoViews(): void {
    for (const runtime of this.echoMines) if (!runtime.active) runtime.view.setVisible(false);
  }

  private emitEchoBlastFx(x: number, y: number, recordedPhase: Phase, profile: EchoRankProfile): void {
    const tone = hex(recordedPhase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB);
    const fx = this.add.graphics().setPosition(x, y).setDepth(29).lineStyle(profile.damage >= 20 ? 3 : 2, tone, 0.82);
    fx.strokeCircle(0, 0, profile.blastRadius * 0.35);
    fx.lineBetween(-12, 0, 12, 0); fx.lineBetween(0, -12, 0, 12);
    this.time.delayedCall(this.reduced ? 55 : 110, () => fx.destroy());
  }

  private updateSignalArc(dtMs: number): void {
    const profile = this.signalCombatProfile();
    this.signalAccumulator = advanceSignalArcCooldown(this.signalAccumulator, dtMs, profile);
    if (this.signalAccumulator < profile.cooldownMs) return;
    const path = planSignalArc(this.enemies, this.phase, this.friend.x, this.friend.y, profile);
    if (path.length === 0) return;
    let controlledRouting = false;
    if (this.signalRank >= 5) {
      const nearestPath = planSignalArc(this.enemies, this.phase, this.friend.x, this.friend.y, this.signalCombatProfile(4));
      controlledRouting = path.map(hop => hop.id).join(",") !== nearestPath.map(hop => hop.id).join(",");
    }
    this.fireSignalArc(path, controlledRouting);
    this.signalAccumulator = 0;
  }

  private fireSignalArc(path: readonly SignalArcHop[], controlledRouting = false): void {
    const castPhase = this.phase;
    this.signalCasts += 1;
    if (path.length >= 2) this.signalMultiTargetCasts += 1;
    if (path.some(hop => hop.usedCommonBonus)) this.signalCommonBonusCasts += 1;
    if (controlledRouting) this.signalControlledRoutingCasts += 1;
    let sourceX = this.friend.x;
    let sourceY = this.friend.y;
    let extendedCommonRelay = false;
    for (const hop of path) {
      if (hop.usedCommonBonus && Math.hypot(hop.x - sourceX, hop.y - sourceY) > 180) extendedCommonRelay = true;
      sourceX = hop.x;
      sourceY = hop.y;
    }
    if (extendedCommonRelay) this.signalExtendedCommonRelayCasts += 1;
    this.signalLastCastPhase = castPhase;
    this.signalLastChainIds = path.map(hop => hop.id);
    this.signalLastChainKinds = path.map(hop => hop.kind);
    this.signalLastChainDamage = path.map(hop => hop.damage);
    this.signalLastChainEdgeRanges = path.map(hop => hop.edgeRange);
    this.signalLastChainCommonBonus = path.map(hop => hop.usedCommonBonus);
    this.signalLastChainForwardDegrees = path.map(hop => hop.forwardDegree);
    this.paintSignalArc(path, castPhase);
    for (const hop of path) {
      const enemy = this.enemies.find(item => item.active && item.id === hop.id);
      if (!enemy || !isEnemyCorporeal(enemy.kind, castPhase)) continue;
      enemy.hp -= hop.damage;
      this.signalHits += 1;
      if (enemy.hp <= 0) this.killEnemy(enemy);
    }
  }

  private paintSignalArc(path: readonly SignalArcHop[], castPhase: Phase): void {
    this.signalFx.clear().setVisible(true);
    const tone = hex(castPhase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB);
    let fromX = this.friend.x;
    let fromY = this.friend.y;
    for (const hop of path) {
      const boosted = hop.usedCommonBonus;
      this.signalFx.lineStyle(boosted ? 3 : 2, boosted ? hex(V2_PALETTE.common) : tone, boosted ? 0.94 : this.reduced ? 0.68 : 0.9);
      this.signalFx.lineBetween(fromX, fromY, hop.x, hop.y);
      if (boosted) {
        const midX = (fromX + hop.x) / 2;
        const midY = (fromY + hop.y) / 2;
        this.signalFx.fillStyle(hex(V2_PALETTE.common), 0.9).fillRect(midX - 3, midY - 3, 6, 6);
      }
      if (hop.kind === "TRACE") {
        this.signalFx.fillStyle(hex(V2_PALETTE.common), 0.82).fillRect(hop.x - 3, hop.y - 3, 6, 6);
      }
      if (this.signalRank >= 5 && hop.forwardDegree !== null) {
        this.signalFx.lineStyle(1, hex(V2_PALETTE.common), 0.64).strokeCircle(hop.x, hop.y, 8);
      }
      fromX = hop.x;
      fromY = hop.y;
    }
    this.time.delayedCall(this.reduced ? 55 : 105, () => this.signalFx.clear().setVisible(false));
  }

  private paintPickup(pickup: PickupRuntime): void {
    const view = pickup.view; view.removeAll(true);
    if (pickup.kind === "SIGNAL_XP") {
      this.paintRows(view, V2_ART_SPRITES.SIGNAL_XP.rows, hex(V2_PALETTE.common), 2);
      view.addAt(this.add.circle(0, 0, 20, hex(V2_PALETTE.common), 0.025).setStrokeStyle(1, hex(V2_PALETTE.common), 0.28), 0);
    } else if (pickup.kind === "REPAIR") {
      view.add(this.add.rectangle(0, 0, 26, 8, 0x7ee787, 0.95)); view.add(this.add.rectangle(0, 0, 8, 26, 0x7ee787, 0.95));
    } else if (pickup.kind === "VACUUM") {
      view.add(this.add.circle(0, 0, 16, 0x000000, 0).setStrokeStyle(3, 0x4cc9f0, 0.95)); view.add(this.add.circle(0, 0, 5, 0x4cc9f0, 0.95));
    } else if (pickup.kind === "DISCHARGE") {
      const g = this.add.graphics().lineStyle(3, 0xf72585, 0.95); g.lineBetween(-13, -13, 13, 13); g.lineBetween(13, -13, -13, 13); view.add(g);
    } else {
      view.add(this.add.rectangle(0, 0, 20, 20, 0xf6c85f, 0.96).setRotation(Math.PI / 4)); view.add(this.add.circle(0, 0, 4, 0xe8edf2, 0.95));
    }
  }

  private spawnPickup(kind: CR1PickupKind, x: number, y: number, offsetIndex = 0): void {
    const pickup = this.pickups.find(item => !item.active);
    if (!pickup) return;
    pickup.active = true; pickup.kind = kind; pickup.magnetized = false; pickup.x = x + offsetIndex * 18; pickup.y = y + offsetIndex * 12;
    this.paintPickup(pickup); pickup.view.setPosition(pickup.x, pickup.y).setVisible(true).setAlpha(1);
  }

  private killEnemy(enemy: EnemyRuntime): void {
    if (!enemy.active) return;
    const deathX = enemy.x, deathY = enemy.y;
    const threat = enemyThreatPhase(enemy.kind);
    const deathTone = threat === "A" ? hex(V2_PALETTE.phaseA) : threat === "B" ? hex(V2_PALETTE.phaseB) : hex(V2_PALETTE.common);
    this.orbitLastHitAt.delete(enemy.id);
    const elite = enemy.elite, checkpointId = enemy.checkpointId;
    enemy.active = false; enemy.view.setVisible(false); enemy.telegraphView.clear().setVisible(false); enemy.healthView.clear().setVisible(false); this.kills += 1; this.emitDeathFx(deathX, deathY, deathTone);
    if (this.vectorTargetId === enemy.id) { this.vectorTargetId = null; this.vectorTargetKind = null; this.vectorReticle.setVisible(false); }
    if (this.vectorRank >= 5 && this.vectorLockState.targetId === enemy.id) this.resetVectorLockState();
    this.spawnPickup("SIGNAL_XP", deathX, deathY);
    if (elite && checkpointId) {
      const claim = claimCheckpointRewards(this.rewardLedger, checkpointId, this.evolutionCores);
      this.rewardLedger = claim.ledger;
      if (claim.newlyClaimed) {
        this.applyCR2Projection(applyCR2CheckpointProgressionReward(this.buildCR2LiveSnapshot(), checkpointId, true));
        this.elitesDefeated += 1;
        claim.rewards.forEach((reward, index) => this.spawnPickup(reward, deathX, deathY, index + 1));
        this.statusText.setText(`${checkpointId.replaceAll("_", " ")} DEFEATED // reward signal released.`);
      }
    }
  }

  private emitDeathFx(x: number, y: number, tone: number): void {
    const fx = this.add.graphics().setPosition(x, y).setDepth(25);
    fx.fillStyle(tone, 0.78).fillRect(-12, -2, 24, 4).fillRect(-2, -12, 4, 24);
    const duration = effectDuration("ENEMY_DEATH", this.reduced);
    if (this.reduced) this.time.delayedCall(duration, () => fx.destroy());
    else this.tweens.add({ targets: fx, scaleX: 1.6, scaleY: 1.6, alpha: 0, duration, ease: "Quad.Out", onComplete: () => fx.destroy() });
  }

  private updatePickups(dt: number): void {
    const playerProtocol = resolveCR2PlayerProtocolRuntime(this.buildCR2LiveSnapshot());
    const effectivePickupRadius = this.pickupRadius + playerProtocol.pickupRadiusBonus;
    for (const pickup of this.pickups) {
      if (!pickup.active) continue;
      const dx = this.friend.x - pickup.x, dy = this.friend.y - pickup.y, distance = Math.max(0.001, Math.hypot(dx, dy));
      if (pickup.magnetized || distance <= effectivePickupRadius) {
        const baseSpeed = pickup.magnetized ? 720 : Math.max(180, 460 - distance);
        const speed = baseSpeed * playerProtocol.pickupAttractionSpeedMultiplier;
        pickup.x += dx / distance * speed * dt; pickup.y += dy / distance * speed * dt; pickup.view.setPosition(pickup.x, pickup.y);
      }
      if (distance < 24 && this.collectPickup(pickup)) break;
    }
  }

  private collectPickup(pickup: PickupRuntime): boolean {
    const kind = pickup.kind; pickup.active = false; pickup.magnetized = false; pickup.view.setVisible(false);
    if (kind === "REPAIR") {
      const repairBonusHp = resolveCR2PlayerProtocolRuntime(this.buildCR2LiveSnapshot()).repairBonusHp;
      this.hp = Math.min(V21_PLAYER_MAX_HP, this.hp + 28 + repairBonusHp);
      this.statusText.setText("REPAIR // integrity restored.");
      return false;
    }
    if (kind === "VACUUM") { for (const item of this.pickups) if (item.active && item.kind === "SIGNAL_XP") item.magnetized = true; this.statusText.setText("VACUUM // Signal XP recalled."); return false; }
    if (kind === "DISCHARGE") {
      const targets = this.enemies.filter(enemy => enemy.active && !enemy.elite);
      for (const enemy of targets) this.killEnemy(enemy);
      this.statusText.setText("DISCHARGE // ordinary threat field cleared."); return false;
    }
    if (kind === "EVOLUTION_CORE") {
      this.applyCR2Projection(collectCR2EvolutionCoreLive(this.buildCR2LiveSnapshot()));
      this.statusText.setText(`EVOLUTION CORE ACQUIRED // ${this.evolutionCores}`);
      return false;
    }
    const progress = addSignalXp(this.level, this.xp, 1); this.level = progress.level; this.xp = progress.xp;
    if (progress.levelsGained <= 0) return false;
    this.openDraft();
    return this.draftOpen;
  }

  private buildState(): V21BuildState {
    return {
      deltaRank: this.deltaRank,
      hp: this.hp,
      maxHp: V21_PLAYER_MAX_HP,
      pickupRadius: this.pickupRadius,
      vectorEnabled: true,
      vectorOwned: this.vectorOwned,
      vectorRankEnabled: true,
      vectorRank: this.vectorRank,
      orbitEnabled: true,
      orbitOwned: this.orbitOwned,
      orbitRankEnabled: true,
      orbitRank: this.orbitRank,
      echoEnabled: this.level >= 3,
      echoOwned: this.echoOwned,
      echoRankEnabled: true,
      echoRank: this.echoRank,
      signalEnabled: this.level >= 4,
      signalOwned: this.signalOwned,
      signalRankEnabled: true,
      signalRank: this.signalRank,
      weaponSlotsUsed: this.weaponSlotsUsed,
      weaponSlotCap: 4,
    };
  }

  private renderDraftChoices(): void {
    for (const view of this.draftViews) view.destroy(true);
    this.draftViews = [];
    this.refractView?.destroy();
    this.refractView = null;
    this.draftBackdrop?.destroy();
    this.draftBackdrop = this.add.rectangle(480, 320, 960, 640, 0x05070a, 0.58).setScrollFactor(0).setDepth(180);
    const xs = draftCardXs(this.draftChoices.length);
    this.draftViews = this.draftChoices.map((choice, index) => this.makeDraftCard(xs[index], choice, index));
    if (this.cr2DraftActive && this.refracts > 0 && this.cr2DraftLegalCandidateCount > 3) {
      this.refractView = this.add.text(480, 466, `REFRACT [R] · ${this.refracts}`, {
        fontFamily: "monospace", fontSize: "12px", color: "#f6c85f", backgroundColor: "#11151b", padding: { x: 12, y: 7 }, fontStyle: "bold",
      }).setOrigin(0.5).setScrollFactor(0).setDepth(211).setInteractive({ useHandCursor: true });
      this.refractView.on("pointerdown", () => this.refractDraft());
    }
  }

  private openDraft(): void {
    if (this.level >= 5) {
      const draft = buildCR2ProtocolDraftFromLive(this.seed, this.level, this.buildCR2LiveSnapshot());
      this.cr2DraftActive = true;
      this.cr2DraftLegalCandidateCount = draft.legalCandidateCount;
      this.draftChoices = draft.choices.map(normalizedDraftViewChoice);
    } else {
      this.cr2DraftActive = false;
      this.cr2DraftLegalCandidateCount = 0;
      this.draftChoices = buildV21Draft(this.seed, this.level, this.buildState()).map(legacyDraftViewChoice);
    }
    if (this.draftChoices.length === 0) {
      this.draftOpen = false; this.setCombatControlsEnabled(true);
      this.statusText.setDepth(110).setText("LEVEL UP // upgrade pool exhausted · combat resumed."); this.syncTestState(); return;
    }
    this.draftOpen = true;
    this.setCombatControlsEnabled(false);
    this.renderDraftChoices();
    const keyLabel = this.draftChoices.length === 1 ? "key 1" : `keys 1–${this.draftChoices.length}`;
    const refractLabel = this.cr2DraftActive && this.refracts > 0 && this.cr2DraftLegalCandidateCount > 3 ? " · R to REFRACT" : "";
    this.statusText.setText(`LEVEL UP // choose 1 of ${this.draftChoices.length} · ${keyLabel} or tap${refractLabel}`).setDepth(210);
    this.syncTestState();
  }

  private refractDraft(): void {
    if (!this.draftOpen || !this.cr2DraftActive || this.refracts <= 0 || this.cr2DraftLegalCandidateCount <= 3) return;
    const result = useCR2ProtocolRefractFromLive(this.seed, this.level, this.buildCR2LiveSnapshot());
    this.applyCR2Projection(result.projection);
    this.cr2DraftLegalCandidateCount = result.draft.legalCandidateCount;
    this.draftChoices = result.draft.choices.map(normalizedDraftViewChoice);
    this.renderDraftChoices();
    this.statusText.setText(`REFRACT // replacement triple locked · ${this.refracts} remaining`).setDepth(210);
    this.syncTestState();
  }

  private makeDraftCard(x: number, choice: DraftViewChoice, index: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, 320).setScrollFactor(0).setDepth(200);
    const isDelta = choice.id === "DELTA_RANK";
    const isVectorAcquire = choice.id === "VECTOR_NEEDLE";
    const isVectorRank = choice.id === "VECTOR_RANK";
    const isVector = isVectorAcquire || isVectorRank;
    const isOrbitAcquire = choice.id === "ORBIT_NODES";
    const isOrbitRank = choice.id === "ORBIT_RANK";
    const isOrbit = isOrbitAcquire || isOrbitRank;
    const isEchoAcquire = choice.id === "ECHO_MINE";
    const isEchoRank = choice.id === "ECHO_RANK";
    const isEcho = isEchoAcquire || isEchoRank;
    const isSignalAcquire = choice.id === "SIGNAL_ARC";
    const isSignalRank = choice.id === "SIGNAL_RANK";
    const isSignal = isSignalAcquire || isSignalRank;
    const isProtocol = choice.category === "PROTOCOL";
    const isPhaseWeapon = isDelta || isVector || isOrbit || isEcho || isSignal;
    const border = isPhaseWeapon ? hex(this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB) : isProtocol ? 0xf6c85f : 0x657383;
    const bg = this.add.rectangle(0, 0, 220, 230, 0x11151b, 0.99).setStrokeStyle(isPhaseWeapon || isProtocol ? 3 : 2, border).setInteractive({ useHandCursor: true });
    const tag = this.add.text(0, -91, `${index + 1} // ${choice.category}`, { fontFamily: "monospace", fontSize: "11px", color: "#8b98a7" }).setOrigin(0.5);
    const nextDeltaRank = Math.min(5, this.deltaRank + 1);
    const nextVectorRank = Math.min(5, this.vectorRank + 1);
    const nextOrbitRank = Math.min(5, this.orbitRank + 1);
    const nextEchoRank = Math.min(5, this.echoRank + 1);
    const nextSignalRank = Math.min(5, this.signalRank + 1);
    const titleText = isDelta ? `${choice.name} ${romanRank(nextDeltaRank)}` : isVectorRank ? `${choice.name} ${romanRank(nextVectorRank)}` : isOrbitRank ? `${choice.name} ${romanRank(nextOrbitRank)}` : isEchoRank ? `${choice.name} ${romanRank(nextEchoRank)}` : isSignalRank ? `${choice.name} ${romanRank(nextSignalRank)}` : choice.name;
    const title = this.add.text(0, -54, titleText, { fontFamily: "monospace", fontSize: "17px", color: V2_PALETTE.common, fontStyle: "bold", align: "center", wordWrap: { width: 190 } }).setOrigin(0.5);
    const detailText = isDelta
      ? `RANK ${romanRank(this.deltaRank)} → ${romanRank(nextDeltaRank)}`
      : isVectorRank
        ? `RANK ${romanRank(this.vectorRank)} → ${romanRank(nextVectorRank)}`
        : isOrbitRank
          ? `RANK ${romanRank(this.orbitRank)} → ${romanRank(nextOrbitRank)}`
          : isEchoRank
            ? `RANK ${romanRank(this.echoRank)} → ${romanRank(nextEchoRank)}`
            : isSignalRank
              ? `RANK ${romanRank(this.signalRank)} → ${romanRank(nextSignalRank)}`
              : isProtocol
                ? choice.fromRank === 0 ? "ACQUIRE · RANK I" : `RANK ${romanRank(choice.fromRank ?? 1)} → ${romanRank(choice.toRank ?? 1)}`
                : (isVectorAcquire || isOrbitAcquire || isEchoAcquire || isSignalAcquire) ? "ACQUIRE · RANK I" : "RUN UTILITY";
    const detail = this.add.text(0, -27, detailText, { fontFamily: "monospace", fontSize: "9px", color: isPhaseWeapon ? (this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB) : "#748392", letterSpacing: 1 }).setOrigin(0.5);
    const deltaDescription = nextDeltaRank === 2 ? "DENSE SAMPLE · cadence tightens to 720ms." : nextDeltaRank === 3 ? "FIELD SCALE · canonical mask expands in world-space." : nextDeltaRank === 4 ? "PHASE ECHO · SHIFT leaves one bounded previous-phase echo." : "LOCKED IDENTITY · matching-phase pulse gains bounded stagger.";
    const vectorDescription = nextVectorRank === 2 ? "CLEAN LINE · fixed ray penetrates one aligned target." : nextVectorRank === 3 ? "PRIORITY TRACE · focus high-value corporeal threats in-band." : nextVectorRank === 4 ? "PHASE TRANSFER · first valid post-SHIFT launch gains a third line hit." : "VECTOR LOCK · repeated priority hits build bounded primary damage.";
    const orbitDescription = nextOrbitRank === 2 ? "SECOND NODE · two nodes share one target-hit ledger." : nextOrbitRank === 3 ? "STABLE ORBIT · wider, faster close-defense geometry." : nextOrbitRank === 4 ? "PHASE SHEAR · SHIFT reversal emits one bounded post-phase sweep." : "SYNCHRONIZED RING · three equally spaced nodes share one ledger.";
    const echoDescription = nextEchoRank === 2 ? "LONG MEMORY · four mines persist for 12 seconds." : nextEchoRank === 3 ? "WIDER COLLAPSE · trigger and blast geometry expand." : nextEchoRank === 4 ? "FAST RECALL · returned memory readies after 140ms." : "DEEP MEMORY · genuine return cycles build bounded memory depth.";
    const signalDescription = nextSignalRank === 2 ? "EXTRA LINK · current corporeal graph reaches a fourth target." : nextSignalRank === 3 ? "LOWER DECAY · four-link damage decays more slowly." : nextSignalRank === 4 ? "RESONANT RELAY · first COMMON relay may extend one edge to 240px." : "CHAIN CONTROL · relay choice favors deterministic forward connectivity.";
    const desc = this.add.text(0, 61, isDelta ? deltaDescription : isVectorRank ? vectorDescription : isOrbitRank ? orbitDescription : isEchoRank ? echoDescription : isSignalRank ? signalDescription : choice.description, { fontFamily: "monospace", fontSize: "11px", color: "#bac5d0", align: "center", wordWrap: { width: 178 } }).setOrigin(0.5);
    container.add([bg, tag, title, detail]);
    if (isDelta) {
      const preview = this.add.graphics(), previewProfile = buildDeltaProfile(this.pair.a.rows, this.pair.b.rows, this.phase, nextDeltaRank);
      const previewScale = 1.35 * previewProfile.worldScale / 8;
      preview.fillStyle(border, 0.82); for (const point of previewProfile.points) preview.fillRect(point.x * previewScale - 1.5, point.y * previewScale - 1.5, 3, 3);
      preview.setPosition(0, 9); container.add(preview);
    } else if (isVector) {
      const glyph = this.add.graphics().lineStyle(isVectorRank ? 4 : 3, border, 0.82); glyph.lineBetween(-28, 8, 28, -8); glyph.strokeCircle(25, -7, 5);
      if (isVectorRank && nextVectorRank >= 2) glyph.lineStyle(1, hex(V2_PALETTE.common), 0.7).lineBetween(-24, 13, 29, -2);
      glyph.setPosition(0, 2); container.add(glyph);
    } else if (isOrbit) {
      const previewRank = isOrbitRank ? nextOrbitRank : 1;
      const previewProfile = buildOrbitProfile(previewRank);
      const glyph = this.add.graphics().lineStyle(2, border, 0.78);
      glyph.strokeCircle(0, 2, 27);
      for (const angle of orbitNodeAngles(0, previewProfile.nodeCount)) {
        const nodeX = Math.cos(angle) * 27;
        const nodeY = 2 + Math.sin(angle) * 27;
        glyph.fillStyle(border, 0.95).fillRect(nodeX - 5, nodeY - 5, 10, 10);
      }
      container.add(glyph);
    } else if (isEcho) {
      const glyph = this.add.graphics().lineStyle(isEchoRank ? 3 : 2, border, 0.78);
      glyph.strokeCircle(0, 3, 25); glyph.fillStyle(border, 0.9).fillRect(-6, -3, 12, 12);
      glyph.lineBetween(-31, 3, -19, 3); glyph.lineBetween(19, 3, 31, 3);
      if (isEchoRank && nextEchoRank >= 3) glyph.lineStyle(1, hex(V2_PALETTE.common), 0.7).strokeCircle(0, 3, 31);
      if (isEchoRank && nextEchoRank >= 5) glyph.lineStyle(1, border, 0.75).strokeCircle(0, 3, 36);
      container.add(glyph);
    } else if (isSignal) {
      const previewRank = isSignalRank ? nextSignalRank : 1;
      const glyph = this.add.graphics().lineStyle(previewRank >= 4 ? 3 : 2, border, 0.82);
      glyph.lineBetween(-30, 10, -7, -7); glyph.lineBetween(-7, -7, 13, 7); glyph.lineBetween(13, 7, 30, -10);
      glyph.fillStyle(border, 0.95).fillCircle(-30, 10, 4).fillCircle(-7, -7, 4).fillCircle(13, 7, 4).fillCircle(30, -10, 4);
      if (previewRank >= 2) glyph.fillStyle(hex(V2_PALETTE.common), 0.88).fillCircle(36, 5, 4);
      if (previewRank >= 4) glyph.lineStyle(2, hex(V2_PALETTE.common), 0.72).lineBetween(30, -10, 36, 5);
      if (previewRank >= 5) glyph.lineStyle(1, hex(V2_PALETTE.common), 0.66).strokeCircle(13, 7, 8);
      container.add(glyph);
    } else {
      const glyph = this.add.graphics().lineStyle(2, border, 0.62); glyph.strokeRect(-12, -3, 24, 24); glyph.lineBetween(-6, 9, 6, 9); glyph.setPosition(0, -2); container.add(glyph);
    }
    container.add(desc); bg.on("pointerdown", () => this.chooseDraft(index)); return container;
  }

  private chooseDraft(index: number): void {
    if (!this.draftOpen) return;
    const choice = this.draftChoices[index]; if (!choice || choice.disabled) return;
    if (this.cr2DraftActive) {
      if (!choice.candidateId) throw new Error("Normalized CR-2 draft choice is missing candidate identity.");
      const echoPlacementsBeforeChoice = this.echoPlacements;
      const echoTriggersBeforeChoice = this.echoTriggers;
      const result = applyCR2ProtocolDraftChoiceToLive(this.seed, this.level, this.buildCR2LiveSnapshot(), choice.candidateId);
      this.applyCR2Projection(result.projection);
      if (choice.id === "ECHO_RANK") {
        this.game.canvas.dataset.echoRankChoicePlacementDelta = String(this.echoPlacements - echoPlacementsBeforeChoice);
        this.game.canvas.dataset.echoRankChoiceTriggerDelta = String(this.echoTriggers - echoTriggersBeforeChoice);
      }
      for (const view of this.draftViews) view.destroy(true);
      this.draftViews = []; this.draftChoices = []; this.draftBackdrop?.destroy(); this.draftBackdrop = null; this.refractView?.destroy(); this.refractView = null; this.draftOpen = false;
      this.cr2DraftActive = false; this.cr2DraftLegalCandidateCount = 0;
      this.setCombatControlsEnabled(true); this.statusText.setDepth(110).setText(`${result.selected.name} selected // combat resumed.`); this.updateHud(); this.syncTestState();
      return;
    }
    const wasEchoOwned = this.echoOwned;
    const oldDeltaRank = this.deltaRank;
    const oldVectorRank = this.vectorRank;
    const oldOrbitRank = this.orbitRank;
    const oldEchoRank = this.echoRank;
    const oldSignalRank = this.signalRank;
    const next = applyV21Draft(this.buildState(), choice.id as V21DraftId);
    this.deltaRank = next.deltaRank;
    if (this.deltaRank !== oldDeltaRank) this.attackAccumulator = migrateDeltaCooldownAccumulator(this.attackAccumulator, oldDeltaRank, this.deltaRank);
    this.hp = next.hp; this.pickupRadius = next.pickupRadius;
    this.vectorOwned = next.vectorOwned === true;
    this.vectorRank = next.vectorRank ?? (this.vectorOwned ? 1 : this.vectorRank);
    if (this.vectorRank !== oldVectorRank) {
      if (oldVectorRank < 4 && this.vectorRank >= 4) this.vectorTransferState = emptyVectorTransfer();
      if (this.vectorRank >= 5) this.vectorLockState = initialVectorLockState();
    }
    this.orbitOwned = next.orbitOwned === true;
    this.orbitRank = next.orbitRank ?? (this.orbitOwned ? 1 : this.orbitRank);
    if (this.orbitRank !== oldOrbitRank) {
      // Rank migration is geometry-only while paused: preserve anchor angle,
      // normal hit ledger and existing shear rearm. No rank-up emits shear.
      this.orbitAngle = this.orbitAngle;
    }
    this.echoOwned = next.echoOwned === true;
    this.echoRank = next.echoRank ?? (this.echoOwned ? 1 : this.echoRank);
    if (this.echoRank !== oldEchoRank) {
      this.ensureEchoMineCapacity();
      if (oldEchoRank < 5 && this.echoRank >= 5) {
        for (const runtime of this.echoMines) if (runtime.active && runtime.mine) runtime.mine = initializeEchoMineForRankV(runtime.mine);
        this.echoBurstLedger = new Map();
      }
    }
    this.signalOwned = next.signalOwned === true;
    this.signalRank = next.signalRank ?? (this.signalOwned ? 1 : this.signalRank);
    if (this.signalRank !== oldSignalRank) {
      // SIGNAL casts are instantaneous. Preserve ordinary cooldown progress and
      // carry no historical COMMON bonus or route state across rank application.
    }
    this.weaponSlotsUsed = next.weaponSlotsUsed ?? this.weaponSlotsUsed;
    if (this.orbitOwned) this.syncOrbitNodeView();
    if (!wasEchoOwned && this.echoOwned) this.echoPlacementAccumulator = 0;
    for (const view of this.draftViews) view.destroy(true);
    this.draftViews = []; this.draftChoices = []; this.draftBackdrop?.destroy(); this.draftBackdrop = null; this.refractView?.destroy(); this.refractView = null; this.draftOpen = false;
    this.cr2DraftActive = false; this.cr2DraftLegalCandidateCount = 0;
    this.setCombatControlsEnabled(true); this.statusText.setDepth(110).setText(`${choice.name} selected // combat resumed.`); this.updateHud(); this.syncTestState();
  }

  private updateMovement(dt: number): void {
    let x = (this.moveRight ? 1 : 0) - (this.moveLeft ? 1 : 0) + this.joystickVector.x;
    let y = (this.moveDown ? 1 : 0) - (this.moveUp ? 1 : 0) + this.joystickVector.y;
    const magnitude = Math.hypot(x, y); if (magnitude > 1) { x /= magnitude; y /= magnitude; }
    const moveSpeed = PLAYER_SPEED * resolveCR2PlayerProtocolRuntime(this.buildCR2LiveSnapshot()).moveSpeedMultiplier;
    const next = clampPlayerPosition({ x: this.friend.x + x * moveSpeed * dt, y: this.friend.y + y * moveSpeed * dt }); this.friend.setPosition(next.x, next.y);
  }

  private shift(): void {
    if (this.dead || this.draftOpen) return;
    const nextPhase: Phase = this.phase === "A" ? "B" : "A";
    this.invalidateVectorForShift(nextPhase);
    let orbitShiftAnchor: number | null = null;
    if (this.orbitOwned) {
      orbitShiftAnchor = this.orbitAngle;
      this.orbitLastShiftAnchor = orbitShiftAnchor;
      this.orbitReversals += 1;
    }
    if (this.signalOwned) {
      this.signalShiftGraphInvalidations += 1;
      this.signalLastChainIds = [];
      this.signalLastChainKinds = [];
      this.signalLastChainDamage = [];
      this.signalLastChainEdgeRanges = [];
      this.signalLastChainCommonBonus = [];
      this.signalLastChainForwardDegrees = [];
      this.signalFx.clear().setVisible(false);
    }
    if (this.echoOwned) this.transitionEchoMinesForShift(nextPhase);
    this.scheduleDeltaEcho(this.phase);
    this.phase = nextPhase; this.shifts += 1; this.paintFriend();
    if (this.orbitOwned) {
      this.syncOrbitNodeView();
      if (orbitShiftAnchor !== null) this.tryEmitOrbitShear(orbitShiftAnchor);
    }
    for (const enemy of this.enemies) if (enemy.active) enemy.view.setAlpha(isEnemyCorporeal(enemy.kind, this.phase) ? 1 : 0.22);
    this.updateHud(); this.statusText.setText(`SHIFT → Phase ${this.phase} // threat authority rewritten.`); this.emitShiftFx(); this.syncTestState();
  }

  private emitShiftFx(): void {
    const tone = hex(this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB);
    const fx = this.add.graphics().setPosition(this.friend.x, this.friend.y).setDepth(29);
    fx.lineStyle(2, tone, 0.82).strokeCircle(0, 0, 36); fx.lineStyle(1, hex(V2_PALETTE.common), 0.35).strokeCircle(0, 0, 46);
    const duration = effectDuration("SHIFT_TRANSITION", this.reduced);
    if (this.reduced) this.time.delayedCall(duration, () => fx.destroy());
    else { this.tweens.add({ targets: fx, scaleX: 1.8, scaleY: 1.8, alpha: 0, duration, ease: "Quad.Out", onComplete: () => fx.destroy() }); this.cameras.main.flash(70, this.phase === "A" ? 76 : 247, this.phase === "A" ? 201 : 37, this.phase === "A" ? 240 : 133, false); }
  }

  private installKeyboard(): void {
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "1", "2", "3", "r"].includes(key)) event.preventDefault();
      if (event.repeat && (key === " " || key === "r")) return;
      if (key === "w" || key === "arrowup") this.moveUp = true; else if (key === "s" || key === "arrowdown") this.moveDown = true;
      else if (key === "a" || key === "arrowleft") this.moveLeft = true; else if (key === "d" || key === "arrowright") this.moveRight = true;
      else if (key === " ") this.shift(); else if (key === "r" && this.draftOpen) this.refractDraft(); else if (this.draftOpen && /^[1-3]$/u.test(key)) this.chooseDraft(Number(key) - 1);
    });
    this.input.keyboard?.on("keyup", (event: KeyboardEvent) => {
      const key = event.key.toLowerCase(); if (key === "w" || key === "arrowup") this.moveUp = false; else if (key === "s" || key === "arrowdown") this.moveDown = false; else if (key === "a" || key === "arrowleft") this.moveLeft = false; else if (key === "d" || key === "arrowright") this.moveRight = false;
    });
  }

  private installTouch(): void {
    this.joystickBase = this.add.circle(this.joystickOrigin.x, this.joystickOrigin.y, 62, 0x202832, 0.72).setStrokeStyle(2, 0x657383).setScrollFactor(0).setDepth(120);
    this.joystickKnob = this.add.circle(this.joystickOrigin.x, this.joystickOrigin.y, 24, 0xe8edf2, 0.65).setScrollFactor(0).setDepth(121);
    this.touchZone = this.add.rectangle(this.joystickOrigin.x, this.joystickOrigin.y, 220, 180, 0x000000, 0.001).setScrollFactor(0).setDepth(122).setInteractive();
    this.touchZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => { if (this.draftOpen) return; this.joystickPointer = pointer.id; this.updateJoystick(pointer.x, pointer.y); });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => { if (pointer.id === this.joystickPointer) this.updateJoystick(pointer.x, pointer.y); });
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => { if (pointer.id !== this.joystickPointer) return; this.joystickPointer = null; this.joystickVector = { x: 0, y: 0 }; this.joystickKnob.setPosition(this.joystickOrigin.x, this.joystickOrigin.y); });
    this.shiftButton = this.add.rectangle(842, 530, 150, 72, 0x202832, 0.95).setStrokeStyle(2, hex(V2_PALETTE.phaseB)).setScrollFactor(0).setDepth(122).setInteractive({ useHandCursor: true });
    this.shiftLabel = this.add.text(842, 530, "SHIFT\nSPACE", { fontFamily: "monospace", fontSize: "16px", color: V2_PALETTE.common, fontStyle: "bold", align: "center" }).setOrigin(0.5).setScrollFactor(0).setDepth(123);
    this.shiftButton.on("pointerdown", () => this.shift()); this.shiftLabel.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.shift());
  }

  private setCombatControlsEnabled(enabled: boolean): void {
    const alpha = enabled ? 1 : 0.2; this.joystickBase.setAlpha(alpha); this.joystickKnob.setAlpha(alpha); this.shiftButton.setAlpha(alpha); this.shiftLabel.setAlpha(enabled ? 1 : 0.28);
    if (!enabled) { this.joystickPointer = null; this.joystickVector = { x: 0, y: 0 }; this.joystickKnob.setPosition(this.joystickOrigin.x, this.joystickOrigin.y); }
  }

  private updateJoystick(x: number, y: number): void {
    const dx = x - this.joystickOrigin.x, dy = y - this.joystickOrigin.y, distance = Math.hypot(dx, dy), limit = 46, scale = distance > limit ? limit / distance : 1;
    const kx = dx * scale, ky = dy * scale; this.joystickKnob.setPosition(this.joystickOrigin.x + kx, this.joystickOrigin.y + ky); this.joystickVector = distance < 8 ? { x: 0, y: 0 } : { x: kx / limit, y: ky / limit };
  }

  private syncTestState(): void {
    const canvas = this.game.canvas;
    canvas.dataset.stage = "v2-survival"; canvas.dataset.friend = this.friendLabel; canvas.dataset.family = this.familyName;
    canvas.dataset.frameA = String(this.pair.a.index); canvas.dataset.frameB = String(this.pair.b.index); canvas.dataset.phase = this.phase;
    canvas.dataset.x = String(Math.round(this.friend?.x ?? 0)); canvas.dataset.y = String(Math.round(this.friend?.y ?? 0)); canvas.dataset.hp = String(this.hp);
    canvas.dataset.level = String(this.level); canvas.dataset.xp = String(this.xp); canvas.dataset.kills = String(this.kills); canvas.dataset.shifts = String(this.shifts);
    canvas.dataset.deltaRank = String(this.deltaRank); canvas.dataset.pickupRadius = String(this.pickupRadius); canvas.dataset.draftOpen = this.draftOpen ? "true" : "false";
    canvas.dataset.draftCount = String(this.draftChoices.length); canvas.dataset.draftIds = this.draftChoices.map(choice => choice.id).join(",");
    canvas.dataset.draftCandidateIds = this.draftChoices.map(choice => choice.candidateId ?? "").join(",");
    canvas.dataset.cr2DraftActive = this.cr2DraftActive ? "true" : "false";
    canvas.dataset.refracts = String(this.refracts); canvas.dataset.rerollNonce = String(this.rerollNonce);
    canvas.dataset.protocols = Object.entries(this.protocols).sort(([a], [b]) => a.localeCompare(b)).map(([family, rank]) => `${family}:${rank}`).join(",");
    canvas.dataset.protocolSlotsUsed = String(Object.keys(this.protocols).length);
    const playerProtocol = resolveCR2PlayerProtocolRuntime(this.buildCR2LiveSnapshot());
    canvas.dataset.protocolMoveSpeedMultiplier = String(playerProtocol.moveSpeedMultiplier);
    canvas.dataset.protocolContactInvulnMs = String(V21_CONTACT_INVULN_MS + playerProtocol.contactInvulnBonusMs);
    canvas.dataset.protocolRepairBonusHp = String(playerProtocol.repairBonusHp);
    canvas.dataset.protocolPickupRadiusBonus = String(playerProtocol.pickupRadiusBonus);
    canvas.dataset.protocolPickupAttractionMultiplier = String(playerProtocol.pickupAttractionSpeedMultiplier);
    canvas.dataset.activeEnemies = String(this.enemies.filter(enemy => enemy.active).length); canvas.dataset.qualified = this.qualified ? "true" : "false"; canvas.dataset.dead = this.dead ? "true" : "false";
    canvas.dataset.directorStage = this.directorStage; canvas.dataset.directorElapsedMs = String(Math.round(this.elapsedActiveMs)); canvas.dataset.bossPending = this.bossPending ? "true" : "false";
    canvas.dataset.spawnedCheckpoints = [...this.spawnedCheckpoints].join(","); canvas.dataset.elitesDefeated = String(this.elitesDefeated); canvas.dataset.evolutionCores = String(this.evolutionCores);
    canvas.dataset.activeElites = String(this.enemies.filter(enemy => enemy.active && enemy.elite).length); canvas.dataset.beaconProjectiles = String(this.beaconProjectiles.length);
    canvas.dataset.enemyKinds = this.enemies.filter(enemy => enemy.active).map(enemy => enemy.kind).sort().join(",");
    canvas.dataset.seed = String(this.seed); canvas.dataset.controlsDimmed = this.draftOpen ? "true" : "false"; canvas.dataset.deltaFx = "canonical-exclusive";
    const deltaProfile = this.deltaCombatProfile();
    canvas.dataset.deltaDamage = String(deltaProfile.damage);
    canvas.dataset.deltaCooldownMs = String(deltaProfile.cooldownMs);
    canvas.dataset.deltaWorldScale = String(deltaProfile.worldScale);
    canvas.dataset.deltaPrimaryPulses = String(this.deltaPrimaryPulses);
    canvas.dataset.deltaEchoPending = this.deltaEchoPending ? "true" : "false";
    canvas.dataset.deltaEchoSchedules = String(this.deltaEchoSchedules);
    canvas.dataset.deltaEchoFires = String(this.deltaEchoFires);
    canvas.dataset.deltaEchoHits = String(this.deltaEchoHits);
    canvas.dataset.deltaStaggers = String(this.deltaStaggers);
    canvas.dataset.deltaStaggeredEnemies = String(this.enemies.filter(enemy => enemy.active && enemy.staggerUntilMs > this.elapsedActiveMs).length);
    canvas.dataset.weaponSlotsUsed = String(this.weaponSlotsUsed);
    const vectorProfile = this.vectorCombatProfile();
    canvas.dataset.vectorProtocolRange = String(vectorProfile.range);
    canvas.dataset.vectorProtocolSpeed = String(vectorProfile.speed);
    canvas.dataset.vectorOwned = this.vectorOwned ? "true" : "false";
    canvas.dataset.vectorRank = String(this.vectorRank);
    canvas.dataset.vectorTargetId = this.vectorTargetId === null ? "" : String(this.vectorTargetId);
    canvas.dataset.vectorTargetKind = this.vectorTargetKind ?? "";
    canvas.dataset.vectorShots = String(this.vectorShots);
    canvas.dataset.vectorHits = String(this.vectorHits);
    canvas.dataset.vectorAcquisitions = String(this.vectorAcquisitions);
    canvas.dataset.vectorShiftInvalidations = String(this.vectorShiftInvalidations);
    canvas.dataset.vectorInFlight = String(this.activeVectorProjectileCount());
    canvas.dataset.vectorProfile = `rank${this.vectorRank}-phase-targeted`;
    canvas.dataset.vectorPenetrationHits = String(this.vectorPenetrationHits);
    canvas.dataset.vectorTransferArmed = isVectorTransferArmed(this.vectorTransferState, this.elapsedActiveMs) ? "true" : "false";
    canvas.dataset.vectorTransferPhase = this.vectorTransferState.phase ?? "";
    canvas.dataset.vectorTransferExpiresAt = this.vectorTransferState.expiresAtMs === null ? "" : String(this.vectorTransferState.expiresAtMs);
    canvas.dataset.vectorTransferShots = String(this.vectorTransferShots);
    canvas.dataset.vectorTransferExpiries = String(this.vectorTransferExpiries);
    canvas.dataset.vectorLockTargetId = this.vectorLockState.targetId === null ? "" : String(this.vectorLockState.targetId);
    canvas.dataset.vectorLockStacks = String(this.vectorLockState.stacks);
    canvas.dataset.vectorLockPeakStacks = String(this.vectorLockPeakStacks);
    canvas.dataset.vectorLockResets = String(this.vectorLockResets);
    canvas.dataset.vectorQualificationFixture = this.vectorQualificationFixture;
    canvas.dataset.vectorInFlightRanks = this.vectorProjectiles.filter(projectile => projectile.active && projectile.profile).map(projectile => String(projectile.profile?.rank ?? 0)).join(",");
    canvas.dataset.vectorInFlightTransfer = this.vectorProjectiles.some(projectile => projectile.active && projectile.transferShot) ? "true" : "false";
    const orbitProfile = this.orbitCombatProfile();
    canvas.dataset.orbitOwned = this.orbitOwned ? "true" : "false";
    canvas.dataset.orbitRank = String(this.orbitRank);
    canvas.dataset.orbitProfile = `rank${this.orbitRank}-phase-reversal`;
    canvas.dataset.orbitAngle = this.orbitAngle.toFixed(6);
    canvas.dataset.orbitDirection = String(orbitDirectionForPhase(this.phase));
    canvas.dataset.orbitHits = String(this.orbitHits);
    canvas.dataset.orbitReversals = String(this.orbitReversals);
    canvas.dataset.orbitLastShiftAnchor = this.orbitLastShiftAnchor === null ? "" : this.orbitLastShiftAnchor.toFixed(6);
    canvas.dataset.orbitCooldownEntries = String(this.orbitLastHitAt.size);
    canvas.dataset.orbitProtocolRadius = String(orbitProfile.radius);
    canvas.dataset.orbitProtocolContactIntervalMs = String(orbitProfile.contactIntervalMs);
    canvas.dataset.orbitNodeCount = String(orbitProfile.nodeCount);
    canvas.dataset.orbitNodeAngles = orbitNodeAngles(this.orbitAngle, orbitProfile.nodeCount).map(angle => angle.toFixed(6)).join(",");
    canvas.dataset.orbitShearReady = canEmitOrbitShear(this.orbitRank, this.orbitShearLastEmittedAt, this.elapsedActiveMs) ? "true" : "false";
    canvas.dataset.orbitShearEvents = String(this.orbitShearEvents);
    canvas.dataset.orbitShearHits = String(this.orbitShearHits);
    canvas.dataset.orbitShearLastEmittedAt = this.orbitShearLastEmittedAt === null ? "" : String(this.orbitShearLastEmittedAt);
    canvas.dataset.orbitShearRearmBlocks = String(this.orbitShearRearmBlocks);
    canvas.dataset.orbitQualificationFixture = this.orbitQualificationFixture;
    const activeMines = this.echoMines
      .filter((runtime): runtime is EchoMineRuntime & { mine: EchoMineCore } => runtime.active && runtime.mine !== null)
      .sort((a, b) => a.mine.id - b.mine.id);
    const echoProfile = this.echoCombatProfile(this.echoRank, 0);
    canvas.dataset.echoOwned = this.echoOwned ? "true" : "false";
    canvas.dataset.echoRank = String(this.echoRank);
    canvas.dataset.echoProfile = `rank${this.echoRank}-phase-memory`;
    canvas.dataset.echoMaxActive = String(echoProfile.maxActive);
    canvas.dataset.echoReturnDelayMs = String(echoProfile.returnDelayMs);
    canvas.dataset.echoProtocolLifetimeMs = String(echoProfile.lifetimeMs);
    canvas.dataset.echoProtocolTriggerRadius = String(echoProfile.triggerRadius);
    canvas.dataset.echoActiveMines = String(activeMines.length);
    canvas.dataset.echoPlacements = String(this.echoPlacements);
    canvas.dataset.echoArmedTransitions = String(this.echoArmedTransitions);
    canvas.dataset.echoReturns = String(this.echoReturns);
    canvas.dataset.echoTriggers = String(this.echoTriggers);
    canvas.dataset.echoHits = String(this.echoHits);
    canvas.dataset.echoReplacements = String(this.echoReplacements);
    canvas.dataset.echoExpiries = String(this.echoExpiries);
    canvas.dataset.echoDepthIncrements = String(this.echoDepthIncrements);
    canvas.dataset.echoDepth2Triggers = String(this.echoDepth2Triggers);
    canvas.dataset.echoDepth2Hits = String(this.echoDepth2Hits);
    canvas.dataset.echoBurstSuppressedHits = String(this.echoBurstSuppressedHits);
    canvas.dataset.echoBurstLedgerTargets = String(this.echoBurstLedger.size);
    canvas.dataset.echoQualificationFixture = this.echoQualificationFixture;
    canvas.dataset.echoMemoryDepths = activeMines.map(runtime => `${runtime.mine.id}:${runtime.mine.memoryDepth}`).join(",");
    canvas.dataset.echoMineStates = activeMines.map(runtime => `${runtime.mine.id}:${runtime.mine.recordedPhase}:${runtime.mine.state}:D${runtime.mine.memoryDepth}`).join("|");
    const signalProfile = this.signalCombatProfile();
    canvas.dataset.signalOwned = this.signalOwned ? "true" : "false";
    canvas.dataset.signalRank = String(this.signalRank);
    canvas.dataset.signalProfile = `rank${this.signalRank}-phase-chain`;
    canvas.dataset.signalMaxTargets = String(signalProfile.maxTargets);
    canvas.dataset.signalDamageProfile = signalProfile.damages.join(",");
    canvas.dataset.signalRelayRange = String(signalProfile.relayRange);
    canvas.dataset.signalCommonBonusRange = String(signalProfile.relayRange + signalProfile.commonRelayBonus);
    canvas.dataset.signalRouting = signalProfile.routing;
    canvas.dataset.signalQualificationFixture = this.signalQualificationFixture;
    canvas.dataset.signalCommonBonusCasts = String(this.signalCommonBonusCasts);
    canvas.dataset.signalExtendedCommonRelayCasts = String(this.signalExtendedCommonRelayCasts);
    canvas.dataset.signalControlledRoutingCasts = String(this.signalControlledRoutingCasts);
    canvas.dataset.signalCasts = String(this.signalCasts);
    canvas.dataset.signalHits = String(this.signalHits);
    canvas.dataset.signalMultiTargetCasts = String(this.signalMultiTargetCasts);
    canvas.dataset.signalLastCastPhase = this.signalLastCastPhase ?? "";
    canvas.dataset.signalLastChainIds = this.signalLastChainIds.join(",");
    canvas.dataset.signalLastChainKinds = this.signalLastChainKinds.join(",");
    canvas.dataset.signalLastChainDamage = this.signalLastChainDamage.join(",");
    canvas.dataset.signalLastChainEdgeRanges = this.signalLastChainEdgeRanges.join(",");
    canvas.dataset.signalLastChainCommonBonus = this.signalLastChainCommonBonus.map(value => value ? "1" : "0").join(",");
    canvas.dataset.signalLastChainForwardDegrees = this.signalLastChainForwardDegrees.map(value => value === null ? "" : String(value)).join(",");
    canvas.dataset.signalShiftGraphInvalidations = String(this.signalShiftGraphInvalidations);
    canvas.dataset.signalProtocolCooldownMs = String(signalProfile.cooldownMs);
    canvas.dataset.signalCooldownReady = this.signalAccumulator >= signalProfile.cooldownMs ? "true" : "false";
  }
}

export function mountPhaserSurvival(options: SurvivalOptions): PhaserSurvivalController {
  const scene = new SurvivalScene({ pair: options.pair, reducedMotion: options.reducedMotion, friendLabel: options.friendLabel, familyName: options.familyName });
  const game = new Phaser.Game({
    type: Phaser.AUTO, width: VIEW_W, height: VIEW_H, parent: options.parent, backgroundColor: V2_PALETTE.backgroundPrimary,
    pixelArt: true, antialias: false, scene: [scene], scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: false, roundPixels: true }, input: { keyboard: true, mouse: true, touch: true },
  });
  game.canvas.tabIndex = 0;
  game.canvas.setAttribute("aria-label", "RARE SHIFT V2 survival sandbox. WASD or arrows move. Space shifts phase. Weapons fire automatically.");
  return {
    destroy: () => game.destroy(true),
    setPaused: paused => paused ? game.scene.pause("RareShiftV21Survival") : game.scene.resume("RareShiftV21Survival"),
    setReducedMotion: reduced => scene.setReducedMotion(reduced),
  };
}
