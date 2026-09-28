from pathlib import Path
import json


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected exactly one replacement, found {count}")
    p.write_text(text.replace(old, new, 1))


replace_once(
    "games/rare-shift/src/draft-core.ts",
    'export type V21DraftId = "DELTA_RANK" | "VECTOR_NEEDLE" | "ORBIT_NODES" | "ECHO_MINE" | "SIGNAL_ARC" | "FIELD_REPAIR" | "SIGNAL_MAGNET";',
    'export type V21DraftId = "DELTA_RANK" | "VECTOR_NEEDLE" | "VECTOR_RANK" | "ORBIT_NODES" | "ECHO_MINE" | "SIGNAL_ARC" | "FIELD_REPAIR" | "SIGNAL_MAGNET";',
)
replace_once(
    "games/rare-shift/src/draft-core.ts",
    '  readonly vectorOwned?: boolean;\n  readonly orbitEnabled?: boolean;',
    '  readonly vectorOwned?: boolean;\n  readonly vectorRank?: number;\n  readonly orbitEnabled?: boolean;',
)
replace_once(
    "games/rare-shift/src/draft-core.ts",
    '  VECTOR_NEEDLE: Object.freeze({ id: "VECTOR_NEEDLE", name: "VECTOR NEEDLE", category: "WEAPON", description: "Acquire Rank I precision auto-fire. SHIFT rewrites which corporeal threat it can target." }),',
    '  VECTOR_NEEDLE: Object.freeze({ id: "VECTOR_NEEDLE", name: "VECTOR NEEDLE", category: "WEAPON", description: "Acquire Rank I precision auto-fire. SHIFT rewrites which corporeal threat it can target." }),\n  VECTOR_RANK: Object.freeze({ id: "VECTOR_RANK", name: "VECTOR NEEDLE", category: "WEAPON", description: "Advance VECTOR NEEDLE to its next deterministic phase rank." }),',
)
replace_once(
    "games/rare-shift/src/draft-core.ts",
    '  if (id === "VECTOR_NEEDLE") return state.vectorEnabled === true && state.vectorOwned !== true && weaponSlotAvailable(state);\n  if (id === "ORBIT_NODES")',
    '  if (id === "VECTOR_NEEDLE") return state.vectorEnabled === true && state.vectorOwned !== true && weaponSlotAvailable(state);\n  if (id === "VECTOR_RANK") return state.vectorEnabled === true && state.vectorOwned === true && (state.vectorRank ?? 1) < V21_DELTA_MAX_RANK;\n  if (id === "ORBIT_NODES")',
)
replace_once(
    "games/rare-shift/src/draft-core.ts",
    '  const baseIds: V21DraftId[] = ["DELTA_RANK", "FIELD_REPAIR", "SIGNAL_MAGNET"];',
    '  const baseIds: V21DraftId[] = ["DELTA_RANK", "VECTOR_RANK", "FIELD_REPAIR", "SIGNAL_MAGNET"];',
)
replace_once(
    "games/rare-shift/src/draft-core.ts",
    '    selected = [...acquisitions];\n    if (selected.length < 3 && isV21DraftChoiceValid(state, "DELTA_RANK")) selected.push("DELTA_RANK");',
    '    selected = [...acquisitions];\n    if (selected.length < 3 && isV21DraftChoiceValid(state, "VECTOR_RANK")) selected.push("VECTOR_RANK");\n    if (selected.length < 3 && isV21DraftChoiceValid(state, "DELTA_RANK")) selected.push("DELTA_RANK");',
)
replace_once(
    "games/rare-shift/src/draft-core.ts",
    '    if (id === "ORBIT_NODES") {',
    '    if (id === "VECTOR_RANK") {\n      if (state.vectorEnabled !== true) throw new Error("VECTOR NEEDLE is not enabled in this tranche.");\n      if (state.vectorOwned !== true) throw new Error("Cannot rank VECTOR NEEDLE before acquisition.");\n      throw new Error("VECTOR NEEDLE is already Rank V.");\n    }\n    if (id === "ORBIT_NODES") {',
)
replace_once(
    "games/rare-shift/src/draft-core.ts",
    '  if (id === "VECTOR_NEEDLE") {\n    return Object.freeze({ ...state, vectorOwned: true, weaponSlotsUsed: (state.weaponSlotsUsed ?? 1) + 1 });\n  }\n  if (id === "ORBIT_NODES")',
    '  if (id === "VECTOR_NEEDLE") {\n    return Object.freeze({ ...state, vectorOwned: true, vectorRank: 1, weaponSlotsUsed: (state.weaponSlotsUsed ?? 1) + 1 });\n  }\n  if (id === "VECTOR_RANK") {\n    return Object.freeze({ ...state, vectorRank: (state.vectorRank ?? 1) + 1 });\n  }\n  if (id === "ORBIT_NODES")',
)

replace_once(
    "games/rare-shift/src/phaser-survival.ts",
    'import { acquireVectorTarget, VECTOR_RANK_I } from "./vector-core.ts";',
    '''import {
  acquireVectorTargetForRank,
  advanceVectorLockAfterPrimaryHit,
  armVectorPhaseTransfer,
  buildVectorRankProfile,
  createVectorLockState,
  isVectorLockEligible,
  isVectorPhaseTransferArmed,
  planVectorShot,
  VECTOR_RANK_I,
  type VectorLockState,
  type VectorShotPlan,
  type VectorTransferCharge,
} from "./vector-core.ts";''',
)
replace_once(
    "games/rare-shift/src/phaser-survival.ts",
    '''interface VectorProjectileRuntime {
  active: boolean;
  targetId: number;
  x: number;
  y: number;
  view: Phaser.GameObjects.Rectangle;
}''',
    '''interface VectorProjectileRuntime {
  active: boolean;
  targetId: number;
  x: number;
  y: number;
  travelDistance: number;
  nextTargetIndex: number;
  plan: VectorShotPlan | null;
  view: Phaser.GameObjects.Rectangle;
}''',
)
replace_once(
    "games/rare-shift/src/phaser-survival.ts",
    '''interface PendingDeltaEchoRuntime {
  readonly phase: Phase;
  readonly scheduledAtMs: number;
  readonly profile: DeltaEchoProfile;
}''',
    '''interface PendingDeltaEchoRuntime {
  readonly phase: Phase;
  readonly scheduledAtMs: number;
  readonly profile: DeltaEchoProfile;
}

interface VectorQualificationWindow extends Window {
  __rareShiftVectorQualifier?: (rank: number, scenario?: string) => void;
}''',
)
replace_once(
    "games/rare-shift/src/phaser-survival.ts",
    '''  private vectorOwned = false;
  private vectorAccumulator = 0;
  private vectorTargetId: number | null = null;
  private vectorTargetKind: V2EnemyKind | null = null;
  private vectorShots = 0;
  private vectorHits = 0;
  private vectorAcquisitions = 0;
  private vectorShiftInvalidations = 0;''',
    '''  private vectorOwned = false;
  private vectorRank = 0;
  private vectorAccumulator = 0;
  private vectorTargetId: number | null = null;
  private vectorTargetKind: V2EnemyKind | null = null;
  private vectorTransfer: VectorTransferCharge | null = null;
  private vectorLock: VectorLockState = createVectorLockState();
  private vectorShots = 0;
  private vectorHits = 0;
  private vectorPenetrationHits = 0;
  private vectorTransferShots = 0;
  private vectorAcquisitions = 0;
  private vectorShiftInvalidations = 0;
  private vectorLastShotTargetIds: number[] = [];
  private vectorLastShotDamage: number[] = [];
  private vectorLastShotTransfer = false;
  private vectorQualificationFixture = "";
  private vectorQualificationSyntheticHp = false;''',
)
replace_once(
    "games/rare-shift/src/phaser-survival.ts",
    '    this.installTouch();\n    this.syncTestState();',
    '    this.installTouch();\n    this.installVectorQualificationFixture();\n    this.syncTestState();',
)
replace_once(
    "games/rare-shift/src/phaser-survival.ts",
    '''    if (this.vectorOwned) {
      this.vectorAccumulator = Math.min(VECTOR_RANK_I.cooldownMs, this.vectorAccumulator + dt);
      this.refreshVectorTarget();
      if (this.vectorAccumulator >= VECTOR_RANK_I.cooldownMs && this.activeVectorProjectileCount() < VECTOR_RANK_I.maxInFlight) {
        const target = this.currentVectorTarget();
        if (target) {
          this.fireVector(target);
          this.vectorAccumulator = 0;
        }
      }
      this.updateVectorProjectiles(dt / 1000);
    }''',
    '''    if (this.vectorOwned) {
      const vectorProfile = buildVectorRankProfile(this.vectorRank);
      if (this.vectorTransfer && !isVectorPhaseTransferArmed(this.vectorTransfer, this.phase, this.elapsedActiveMs)) this.vectorTransfer = null;
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
    }''',
)
replace_once(
    "games/rare-shift/src/phaser-survival.ts",
    '      this.vectorProjectiles.push({ active: false, targetId: -1, x: -500, y: -500, view });',
    '      this.vectorProjectiles.push({ active: false, targetId: -1, x: -500, y: -500, travelDistance: 0, nextTargetIndex: 0, plan: null, view });',
)
replace_once(
    "games/rare-shift/src/phaser-survival.ts",
    '    this.buildText.setText(`K ${this.kills} · Δ ${romanRank(this.deltaRank)} · V ${this.vectorOwned ? "I" : "--"} · O ${this.orbitOwned ? "I" : "--"} · E ${this.echoOwned ? "I" : "--"} · S ${this.signalOwned ? "I" : "--"}`);',
    '    this.buildText.setText(`K ${this.kills} · Δ ${romanRank(this.deltaRank)} · V ${this.vectorOwned ? romanRank(this.vectorRank) : "--"} · O ${this.orbitOwned ? "I" : "--"} · E ${this.echoOwned ? "I" : "--"} · S ${this.signalOwned ? "I" : "--"}`);',
)

old_vector_block = r'''  private refreshVectorTarget(): void {
    const result = acquireVectorTarget(this.enemies, this.phase, this.friend.x, this.friend.y);
    const nextId = result?.id ?? null;
    if (nextId !== this.vectorTargetId) {
      if (nextId !== null) this.vectorAcquisitions += 1;
      this.vectorTargetId = nextId;
      this.vectorTargetKind = result?.kind ?? null;
    }
    this.vectorReticle.clear();
    const target = this.currentVectorTarget();
    if (!target) { this.vectorReticle.setVisible(false); return; }
    const tone = hex(this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB);
    this.vectorReticle.setVisible(true).setPosition(target.x, target.y).lineStyle(1, tone, 0.72).strokeRect(-19, -19, 38, 38);
  }

  private currentVectorTarget(): EnemyRuntime | null {
    if (this.vectorTargetId === null) return null;
    const enemy = this.enemies.find(item => item.active && item.id === this.vectorTargetId) ?? null;
    if (!enemy || !isEnemyCorporeal(enemy.kind, this.phase)) return null;
    const dx = enemy.x - this.friend.x, dy = enemy.y - this.friend.y;
    return dx * dx + dy * dy <= VECTOR_RANK_I.range * VECTOR_RANK_I.range ? enemy : null;
  }

  private activeVectorProjectileCount(): number { return this.vectorProjectiles.filter(projectile => projectile.active).length; }

  private fireVector(target: EnemyRuntime): void {
    const projectile = this.vectorProjectiles.find(item => !item.active);
    if (!projectile) return;
    projectile.active = true; projectile.targetId = target.id; projectile.x = this.friend.x; projectile.y = this.friend.y;
    projectile.view.setPosition(projectile.x, projectile.y).setRotation(Math.atan2(target.y - projectile.y, target.x - projectile.x)).setFillStyle(hex(this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB), 0.95).setVisible(true);
    this.vectorShots += 1;
  }

  private updateVectorProjectiles(dt: number): void {
    for (const projectile of this.vectorProjectiles) {
      if (!projectile.active) continue;
      const target = this.enemies.find(enemy => enemy.active && enemy.id === projectile.targetId);
      if (!target || !isEnemyCorporeal(target.kind, this.phase)) { this.deactivateVectorProjectile(projectile); continue; }
      const dx = target.x - projectile.x, dy = target.y - projectile.y, distance = Math.max(0.001, Math.hypot(dx, dy));
      const step = VECTOR_RANK_I.speed * dt;
      if (distance <= VECTOR_RANK_I.hitRadius + step) {
        target.hp -= VECTOR_RANK_I.damage; this.vectorHits += 1; this.emitVectorHitFx(target.x, target.y);
        this.deactivateVectorProjectile(projectile);
        if (target.hp <= 0) this.killEnemy(target);
        continue;
      }
      projectile.x += dx / distance * step; projectile.y += dy / distance * step;
      projectile.view.setPosition(projectile.x, projectile.y).setRotation(Math.atan2(dy, dx));
    }
  }

  private deactivateVectorProjectile(projectile: VectorProjectileRuntime): void {
    projectile.active = false; projectile.targetId = -1; projectile.view.setVisible(false).setPosition(-500, -500);
  }

  private invalidateVectorForShift(): void {
    if (!this.vectorOwned) return;
    this.vectorTargetId = null; this.vectorTargetKind = null; this.vectorReticle.clear().setVisible(false);
    for (const projectile of this.vectorProjectiles) if (projectile.active) this.deactivateVectorProjectile(projectile);
    this.vectorShiftInvalidations += 1;
  }
'''

new_vector_block = r'''  private refreshVectorTarget(): void {
    if (this.vectorRank >= 5 && this.vectorLock.targetId !== null) {
      const locked = this.enemies.find(enemy => enemy.active && enemy.id === this.vectorLock.targetId) ?? null;
      if (!locked || !isVectorLockEligible(locked, this.phase, this.friend.x, this.friend.y)) this.vectorLock = createVectorLockState();
    }
    const result = acquireVectorTargetForRank(this.enemies, this.phase, this.friend.x, this.friend.y, this.vectorRank, this.vectorLock.targetId);
    const nextId = result?.id ?? null;
    if (this.vectorRank >= 5 && this.vectorLock.targetId !== null && nextId !== this.vectorLock.targetId) this.vectorLock = createVectorLockState();
    if (nextId !== this.vectorTargetId) {
      if (nextId !== null) this.vectorAcquisitions += 1;
      this.vectorTargetId = nextId;
      this.vectorTargetKind = result?.kind ?? null;
    }
    this.vectorReticle.clear();
    const target = this.currentVectorTarget();
    if (!target) { this.vectorReticle.setVisible(false); return; }
    const tone = hex(this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB);
    this.vectorReticle.setVisible(true).setPosition(target.x, target.y).lineStyle(1, tone, 0.72).strokeRect(-19, -19, 38, 38);
    if (this.vectorRank >= 3) this.vectorReticle.lineStyle(1, hex(V2_PALETTE.common), 0.58).lineBetween(-12, -24, 12, -24);
    if (this.vectorRank >= 5 && this.vectorLock.targetId === target.id) this.vectorReticle.lineStyle(1, tone, 0.9).strokeRect(-14, -14, 28, 28);
  }

  private currentVectorTarget(): EnemyRuntime | null {
    if (this.vectorTargetId === null) return null;
    const enemy = this.enemies.find(item => item.active && item.id === this.vectorTargetId) ?? null;
    if (!enemy || !isEnemyCorporeal(enemy.kind, this.phase)) return null;
    const range = buildVectorRankProfile(this.vectorRank).range;
    const dx = enemy.x - this.friend.x, dy = enemy.y - this.friend.y;
    return dx * dx + dy * dy <= range * range ? enemy : null;
  }

  private activeVectorProjectileCount(): number { return this.vectorProjectiles.filter(projectile => projectile.active).length; }

  private fireVector(target: EnemyRuntime): void {
    const projectile = this.vectorProjectiles.find(item => !item.active);
    if (!projectile) return;
    const transfer = this.vectorRank >= 4 && isVectorPhaseTransferArmed(this.vectorTransfer, this.phase, this.elapsedActiveMs);
    const lockStacks = this.vectorRank >= 5 && this.vectorLock.targetId === target.id ? this.vectorLock.stacks : 0;
    const plan = planVectorShot(this.enemies, this.phase, this.friend.x, this.friend.y, this.vectorRank, target.id, { transfer, lockStacks });
    if (transfer) { this.vectorTransfer = null; this.vectorTransferShots += 1; }
    projectile.active = true;
    projectile.targetId = target.id;
    projectile.x = plan.originX;
    projectile.y = plan.originY;
    projectile.travelDistance = 0;
    projectile.nextTargetIndex = 0;
    projectile.plan = plan;
    projectile.view
      .setPosition(projectile.x, projectile.y)
      .setRotation(Math.atan2(plan.dirY, plan.dirX))
      .setDisplaySize(plan.transfer ? 30 : plan.fixedRay ? 24 : 18, plan.transfer ? 6 : 4)
      .setFillStyle(hex(this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB), plan.transfer ? 1 : 0.95)
      .setVisible(true);
    this.vectorLastShotTargetIds = plan.targets.map(item => item.id);
    this.vectorLastShotDamage = plan.targets.map(item => item.damage);
    this.vectorLastShotTransfer = plan.transfer;
    this.vectorShots += 1;
  }

  private applyVectorProjectileHit(projectile: VectorProjectileRuntime, enemy: EnemyRuntime, damage: number, primary: boolean): void {
    const plan = projectile.plan;
    if (!plan) return;
    enemy.hp -= damage;
    this.vectorHits += 1;
    if (!primary) this.vectorPenetrationHits += 1;
    this.emitVectorHitFx(enemy.x, enemy.y);
    if (plan.rank >= 5 && primary) this.vectorLock = advanceVectorLockAfterPrimaryHit(this.vectorLock, enemy, plan.phase, plan.originX, plan.originY);
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  private updateVectorProjectiles(dt: number): void {
    for (const projectile of this.vectorProjectiles) {
      if (!projectile.active || !projectile.plan) continue;
      const plan = projectile.plan;
      if (!plan.fixedRay) {
        const target = this.enemies.find(enemy => enemy.active && enemy.id === projectile.targetId);
        if (!target || !isEnemyCorporeal(target.kind, this.phase)) { this.deactivateVectorProjectile(projectile); continue; }
        const dx = target.x - projectile.x, dy = target.y - projectile.y, distance = Math.max(0.001, Math.hypot(dx, dy));
        const step = plan.speed * dt;
        if (distance <= plan.hitRadius + step) {
          this.applyVectorProjectileHit(projectile, target, plan.targets[0].damage, true);
          this.deactivateVectorProjectile(projectile);
          continue;
        }
        projectile.x += dx / distance * step; projectile.y += dy / distance * step;
        projectile.view.setPosition(projectile.x, projectile.y).setRotation(Math.atan2(dy, dx));
        continue;
      }

      if (this.phase !== plan.phase) { this.deactivateVectorProjectile(projectile); continue; }
      const step = plan.speed * dt;
      projectile.travelDistance = Math.min(plan.travelBudget, projectile.travelDistance + step);
      projectile.x = plan.originX + plan.dirX * projectile.travelDistance;
      projectile.y = plan.originY + plan.dirY * projectile.travelDistance;
      projectile.view.setPosition(projectile.x, projectile.y).setRotation(Math.atan2(plan.dirY, plan.dirX));
      while (projectile.nextTargetIndex < plan.targets.length) {
        const planned = plan.targets[projectile.nextTargetIndex];
        if (projectile.travelDistance + plan.hitRadius < planned.alongDistance) break;
        const enemy = this.enemies.find(item => item.active && item.id === planned.id) ?? null;
        if (enemy && isEnemyCorporeal(enemy.kind, plan.phase)) {
          const distance = Math.hypot(enemy.x - projectile.x, enemy.y - projectile.y);
          if (distance <= plan.hitRadius + step) this.applyVectorProjectileHit(projectile, enemy, planned.damage, projectile.nextTargetIndex === 0);
        }
        projectile.nextTargetIndex += 1;
      }
      if (projectile.nextTargetIndex >= plan.targets.length || projectile.travelDistance >= plan.travelBudget) this.deactivateVectorProjectile(projectile);
    }
  }

  private deactivateVectorProjectile(projectile: VectorProjectileRuntime): void {
    projectile.active = false; projectile.targetId = -1; projectile.plan = null; projectile.travelDistance = 0; projectile.nextTargetIndex = 0;
    projectile.view.setVisible(false).setPosition(-500, -500).setDisplaySize(18, 4);
  }

  private invalidateVectorForShift(nextPhase: Phase): void {
    if (!this.vectorOwned) return;
    this.vectorTargetId = null; this.vectorTargetKind = null; this.vectorReticle.clear().setVisible(false);
    for (const projectile of this.vectorProjectiles) if (projectile.active) this.deactivateVectorProjectile(projectile);
    if (this.vectorRank >= 5 && this.vectorLock.targetId !== null) {
      const locked = this.enemies.find(enemy => enemy.active && enemy.id === this.vectorLock.targetId) ?? null;
      if (!locked || !isVectorLockEligible(locked, nextPhase, this.friend.x, this.friend.y)) this.vectorLock = createVectorLockState();
    }
    this.vectorTransfer = armVectorPhaseTransfer(this.vectorRank, nextPhase, this.elapsedActiveMs);
    this.vectorShiftInvalidations += 1;
  }

  private installVectorQualificationFixture(): void {
    if (!navigator.webdriver) return;
    (window as VectorQualificationWindow).__rareShiftVectorQualifier = (rank: number, scenario = "default") => this.applyVectorQualificationFixture(rank, scenario);
  }

  private applyVectorQualificationFixture(rank: number, scenario: string): void {
    if (!navigator.webdriver) throw new Error("VECTOR qualification fixture is browser-automation only.");
    if (!Number.isInteger(rank) || rank < 2 || rank > 5) throw new Error("VECTOR qualification rank must be II-V.");
    const profile = buildVectorRankProfile(rank);
    this.friend.setPosition(V21_WORLD_WIDTH / 2, V21_WORLD_HEIGHT / 2);
    this.vectorOwned = true;
    this.vectorRank = rank;
    this.weaponSlotsUsed = Math.max(2, this.weaponSlotsUsed);
    this.vectorAccumulator = scenario === "expiry" ? 0 : profile.cooldownMs;
    this.vectorTargetId = null;
    this.vectorTargetKind = null;
    this.vectorTransfer = null;
    this.vectorLock = createVectorLockState();
    this.vectorPenetrationHits = 0;
    this.vectorTransferShots = 0;
    this.vectorLastShotTargetIds = [];
    this.vectorLastShotDamage = [];
    this.vectorLastShotTransfer = false;
    this.vectorQualificationFixture = `rank${rank}:${scenario}`;
    this.vectorQualificationSyntheticHp = rank === 5;
    for (const projectile of this.vectorProjectiles) if (projectile.active) this.deactivateVectorProjectile(projectile);
    for (const enemy of this.enemies) { enemy.active = false; enemy.view.setVisible(false); }

    const place = (slotIndex: number, id: number, kind: V2EnemyKind, dx: number, dy: number, hp = enemyBaseHp(kind)) => {
      const slot = this.enemies[slotIndex];
      slot.id = id; slot.active = true; slot.kind = kind; slot.hp = hp; slot.x = this.friend.x + dx; slot.y = this.friend.y + dy; slot.staggerUntilMs = 0;
      slot.view.setPosition(slot.x, slot.y).setVisible(true); this.paintEnemy(slot.view, kind); slot.view.setAlpha(1);
    };

    if (scenario !== "expiry") {
      if (rank === 2) {
        place(0, 9001, "TRACE", 150, 0); place(1, 9002, "TRACE", 250, 0);
      } else if (rank === 3) {
        place(0, 9001, this.phase === "A" ? "SPLIT_A" : "SPLIT_B", 140, 0);
        place(1, 9002, "TRACE", 220, 0);
      } else if (rank === 4) {
        place(0, 9001, "TRACE", 140, 0); place(1, 9002, "TRACE", 230, 0); place(2, 9003, "TRACE", 320, 0);
      } else {
        place(0, 9001, "TRACE", 180, 0, 100);
      }
    }
    this.refreshVectorTarget();
    this.updateHud();
    this.syncTestState();
  }
'''
replace_once("games/rare-shift/src/phaser-survival.ts", old_vector_block, new_vector_block)

replace_once(
    "games/rare-shift/src/phaser-survival.ts",
    '      vectorOwned: this.vectorOwned,\n      orbitEnabled: true,',
    '      vectorOwned: this.vectorOwned,\n      vectorRank: this.vectorRank,\n      orbitEnabled: true,',
)
replace_once(
    "games/rare-shift/src/phaser-survival.ts",
    '    const isDelta = choice.id === "DELTA_RANK", isVector = choice.id === "VECTOR_NEEDLE", isOrbit = choice.id === "ORBIT_NODES", isEcho = choice.id === "ECHO_MINE", isSignal = choice.id === "SIGNAL_ARC";',
    '    const isDelta = choice.id === "DELTA_RANK", isVectorAcquire = choice.id === "VECTOR_NEEDLE", isVectorRank = choice.id === "VECTOR_RANK", isVector = isVectorAcquire || isVectorRank, isOrbit = choice.id === "ORBIT_NODES", isEcho = choice.id === "ECHO_MINE", isSignal = choice.id === "SIGNAL_ARC";',
)
replace_once(
    "games/rare-shift/src/phaser-survival.ts",
    '''    const nextRank = Math.min(5, this.deltaRank + 1);
    const titleText = isDelta ? `${choice.name} ${romanRank(nextRank)}` : choice.name;
    const title = this.add.text(0, -54, titleText, { fontFamily: "monospace", fontSize: "17px", color: V2_PALETTE.common, fontStyle: "bold", align: "center", wordWrap: { width: 190 } }).setOrigin(0.5);
    const detailText = isDelta ? `RANK ${romanRank(this.deltaRank)} → ${romanRank(nextRank)}` : (isVector || isOrbit || isEcho || isSignal) ? "ACQUIRE · RANK I" : "RUN UTILITY";
    const detail = this.add.text(0, -27, detailText, { fontFamily: "monospace", fontSize: "9px", color: isPhaseWeapon ? (this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB) : "#748392", letterSpacing: 1 }).setOrigin(0.5);
    const deltaDescription = nextRank === 2 ? "DENSE SAMPLE · cadence tightens to 720ms." : nextRank === 3 ? "FIELD SCALE · canonical mask expands in world-space." : nextRank === 4 ? "PHASE ECHO · SHIFT leaves one bounded previous-phase echo." : "LOCKED IDENTITY · matching-phase pulse gains bounded stagger.";
    const desc = this.add.text(0, 61, isDelta ? deltaDescription : choice.description, { fontFamily: "monospace", fontSize: "11px", color: "#bac5d0", align: "center", wordWrap: { width: 178 } }).setOrigin(0.5);''',
    '''    const nextRank = Math.min(5, this.deltaRank + 1);
    const nextVectorRank = Math.min(5, Math.max(1, this.vectorRank) + 1);
    const titleText = isDelta ? `${choice.name} ${romanRank(nextRank)}` : isVectorRank ? `${choice.name} ${romanRank(nextVectorRank)}` : choice.name;
    const title = this.add.text(0, -54, titleText, { fontFamily: "monospace", fontSize: "17px", color: V2_PALETTE.common, fontStyle: "bold", align: "center", wordWrap: { width: 190 } }).setOrigin(0.5);
    const detailText = isDelta ? `RANK ${romanRank(this.deltaRank)} → ${romanRank(nextRank)}` : isVectorRank ? `RANK ${romanRank(this.vectorRank)} → ${romanRank(nextVectorRank)}` : (isVectorAcquire || isOrbit || isEcho || isSignal) ? "ACQUIRE · RANK I" : "RUN UTILITY";
    const detail = this.add.text(0, -27, detailText, { fontFamily: "monospace", fontSize: "9px", color: isPhaseWeapon ? (this.phase === "A" ? V2_PALETTE.phaseA : V2_PALETTE.phaseB) : "#748392", letterSpacing: 1 }).setOrigin(0.5);
    const deltaDescription = nextRank === 2 ? "DENSE SAMPLE · cadence tightens to 720ms." : nextRank === 3 ? "FIELD SCALE · canonical mask expands in world-space." : nextRank === 4 ? "PHASE ECHO · SHIFT leaves one bounded previous-phase echo." : "LOCKED IDENTITY · matching-phase pulse gains bounded stagger.";
    const vectorDescription = nextVectorRank === 2 ? "CLEAN LINE · fixed ray penetrates one bounded secondary." : nextVectorRank === 3 ? "PRIORITY TRACE · high-value corporeal targets win inside the priority band." : nextVectorRank === 4 ? "PHASE TRANSFER · SHIFT arms one expiring three-hit line." : "VECTOR LOCK · repeated eligible primary hits build deterministic pressure.";
    const desc = this.add.text(0, 61, isDelta ? deltaDescription : isVectorRank ? vectorDescription : choice.description, { fontFamily: "monospace", fontSize: "11px", color: "#bac5d0", align: "center", wordWrap: { width: 178 } }).setOrigin(0.5);''',
)
replace_once(
    "games/rare-shift/src/phaser-survival.ts",
    '''    const wasEchoOwned = this.echoOwned;
    const oldDeltaRank = this.deltaRank;
    const next = applyV21Draft(this.buildState(), choice.id as V21DraftId);
    this.deltaRank = next.deltaRank;
    if (this.deltaRank !== oldDeltaRank) this.attackAccumulator = migrateDeltaCooldownAccumulator(this.attackAccumulator, oldDeltaRank, this.deltaRank);
    this.hp = next.hp; this.pickupRadius = next.pickupRadius;
    this.vectorOwned = next.vectorOwned === true;
    this.orbitOwned = next.orbitOwned === true;''',
    '''    const wasEchoOwned = this.echoOwned;
    const oldDeltaRank = this.deltaRank;
    const oldVectorRank = this.vectorRank;
    const next = applyV21Draft(this.buildState(), choice.id as V21DraftId);
    this.deltaRank = next.deltaRank;
    if (this.deltaRank !== oldDeltaRank) this.attackAccumulator = migrateDeltaCooldownAccumulator(this.attackAccumulator, oldDeltaRank, this.deltaRank);
    this.hp = next.hp; this.pickupRadius = next.pickupRadius;
    this.vectorOwned = next.vectorOwned === true;
    this.vectorRank = this.vectorOwned ? (next.vectorRank ?? Math.max(1, oldVectorRank)) : 0;
    if (this.vectorRank !== oldVectorRank) {
      if (this.vectorRank < 4) this.vectorTransfer = null;
      if (this.vectorRank === 5) this.vectorLock = createVectorLockState();
    }
    this.orbitOwned = next.orbitOwned === true;''',
)
replace_once(
    "games/rare-shift/src/phaser-survival.ts",
    '    if (this.vectorTargetId === enemy.id) { this.vectorTargetId = null; this.vectorTargetKind = null; this.vectorReticle.setVisible(false); }',
    '    if (this.vectorTargetId === enemy.id) { this.vectorTargetId = null; this.vectorTargetKind = null; this.vectorReticle.setVisible(false); }\n    if (this.vectorLock.targetId === enemy.id) this.vectorLock = createVectorLockState();',
)
replace_once(
    "games/rare-shift/src/phaser-survival.ts",
    '''  private shift(): void {
    if (this.dead || this.draftOpen) return;
    this.invalidateVectorForShift();
    if (this.orbitOwned) {
      this.orbitLastShiftAnchor = this.orbitAngle;
      this.orbitReversals += 1;
    }
    const nextPhase: Phase = this.phase === "A" ? "B" : "A";''',
    '''  private shift(): void {
    if (this.dead || this.draftOpen) return;
    const nextPhase: Phase = this.phase === "A" ? "B" : "A";
    this.invalidateVectorForShift(nextPhase);
    if (this.orbitOwned) {
      this.orbitLastShiftAnchor = this.orbitAngle;
      this.orbitReversals += 1;
    }''',
)
replace_once(
    "games/rare-shift/src/phaser-survival.ts",
    '''    canvas.dataset.vectorOwned = this.vectorOwned ? "true" : "false"; canvas.dataset.vectorTargetId = this.vectorTargetId === null ? "" : String(this.vectorTargetId);
    canvas.dataset.vectorTargetKind = this.vectorTargetKind ?? ""; canvas.dataset.vectorShots = String(this.vectorShots); canvas.dataset.vectorHits = String(this.vectorHits);
    canvas.dataset.vectorAcquisitions = String(this.vectorAcquisitions); canvas.dataset.vectorShiftInvalidations = String(this.vectorShiftInvalidations);
    canvas.dataset.vectorInFlight = String(this.activeVectorProjectileCount()); canvas.dataset.vectorProfile = "rank1-phase-targeted";''',
    '''    canvas.dataset.vectorOwned = this.vectorOwned ? "true" : "false"; canvas.dataset.vectorRank = String(this.vectorRank); canvas.dataset.vectorTargetId = this.vectorTargetId === null ? "" : String(this.vectorTargetId);
    canvas.dataset.vectorTargetKind = this.vectorTargetKind ?? ""; canvas.dataset.vectorShots = String(this.vectorShots); canvas.dataset.vectorHits = String(this.vectorHits);
    canvas.dataset.vectorPenetrationHits = String(this.vectorPenetrationHits); canvas.dataset.vectorTransferShots = String(this.vectorTransferShots);
    canvas.dataset.vectorAcquisitions = String(this.vectorAcquisitions); canvas.dataset.vectorShiftInvalidations = String(this.vectorShiftInvalidations);
    canvas.dataset.vectorInFlight = String(this.activeVectorProjectileCount()); canvas.dataset.vectorProfile = this.vectorOwned ? `rank${this.vectorRank}-phase-precision` : "unowned";
    canvas.dataset.vectorTransferArmed = this.vectorTransfer && isVectorPhaseTransferArmed(this.vectorTransfer, this.phase, this.elapsedActiveMs) ? "true" : "false";
    canvas.dataset.vectorTransferExpiresInMs = this.vectorTransfer ? String(Math.max(0, Math.ceil(this.vectorTransfer.expiresAtMs - this.elapsedActiveMs))) : "0";
    canvas.dataset.vectorLockTargetId = this.vectorLock.targetId === null ? "" : String(this.vectorLock.targetId); canvas.dataset.vectorLockStacks = String(this.vectorLock.stacks);
    canvas.dataset.vectorLastShotTargetIds = this.vectorLastShotTargetIds.join(","); canvas.dataset.vectorLastShotDamage = this.vectorLastShotDamage.join(","); canvas.dataset.vectorLastShotTransfer = this.vectorLastShotTransfer ? "true" : "false";
    canvas.dataset.vectorQualificationFixture = this.vectorQualificationFixture; canvas.dataset.vectorQualificationSyntheticHp = this.vectorQualificationSyntheticHp ? "true" : "false";''',
)

package_path = Path("package.json")
package = json.loads(package_path.read_text())
scripts = package.setdefault("scripts", {})
scripts["test:v2-3b2-vector"] = "node --experimental-strip-types --test games/rare-shift/tests/v2-3b2-vector-ranks.test.ts"
scripts["test:v2-3b2-vector-browser"] = "node --experimental-strip-types scripts/v2-3b2-vector-browser.mjs"
package_path.write_text(json.dumps(package, indent=2) + "\n")

Path(".github/workflows/v2-3b2-apply.yml").unlink()
Path("scripts/v2-3b2-apply.py").unlink()
