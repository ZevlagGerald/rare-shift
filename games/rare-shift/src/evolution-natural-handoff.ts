import type Phaser from "phaser";
import {
  applyCR2DraftChoiceToLive,
  buildCR2DraftFromLive,
  useCR2RefractFromLive,
} from "./cr2-live-tranche-core.ts";
import type { CR2LiveProjection, CR2LiveSnapshot } from "./cr2-live-state-core.ts";
import type { V23DraftCandidate, V23WeaponFamily } from "./progression-core.ts";

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

interface EvolutionHandoffScene extends Phaser.Scene {
  seed: number;
  level: number;
  draftOpen: boolean;
  cr2DraftActive: boolean;
  cr2DraftLegalCandidateCount: number;
  draftChoices: readonly DraftViewChoice[];
  draftViews: Phaser.GameObjects.Container[];
  draftBackdrop: Phaser.GameObjects.Rectangle | null;
  refractView: Phaser.GameObjects.Container | null;
  refracts: number;
  evolvedWeapons: Partial<Record<V23WeaponFamily, boolean>>;
  echoPlacements: number;
  echoTriggers: number;
  statusText: Phaser.GameObjects.Text;

  openDraft(): void;
  chooseDraft(index: number): void;
  refractDraft(): void;
  applyCR2Projection(next: CR2LiveProjection): void;
  buildCR2LiveSnapshot(): CR2LiveSnapshot;
  renderDraftChoices(): void;
  setCombatControlsEnabled(enabled: boolean): void;
  updateHud(): void;
  syncTestState(): void;
}

function sceneReady(scene: EvolutionHandoffScene | undefined): scene is EvolutionHandoffScene {
  return Boolean(
    scene
    && typeof scene.openDraft === "function"
    && typeof scene.chooseDraft === "function"
    && typeof scene.refractDraft === "function"
    && typeof scene.applyCR2Projection === "function"
    && typeof scene.buildCR2LiveSnapshot === "function"
    && typeof scene.renderDraftChoices === "function"
    && typeof scene.setCombatControlsEnabled === "function"
    && typeof scene.updateHud === "function"
    && typeof scene.syncTestState === "function",
  );
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

export function naturalEvolutionDraftViewChoice(candidate: V23DraftCandidate): DraftViewChoice {
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

function closeDraft(scene: EvolutionHandoffScene, selectedName: string): void {
  for (const view of scene.draftViews) view.destroy(true);
  scene.draftViews = [];
  scene.draftChoices = [];
  scene.draftBackdrop?.destroy();
  scene.draftBackdrop = null;
  scene.refractView?.destroy();
  scene.refractView = null;
  scene.draftOpen = false;
  scene.cr2DraftActive = false;
  scene.cr2DraftLegalCandidateCount = 0;
  scene.setCombatControlsEnabled(true);
  scene.statusText.setDepth(110).setText(`${selectedName} selected // combat resumed.`);
  scene.updateHud();
  scene.syncTestState();
}

export function installEvolutionNaturalHandoff(game: Phaser.Game): () => void {
  let scene: EvolutionHandoffScene | undefined;
  let disposed = false;
  let configured = false;
  let animationFrameId: number | null = null;

  let originalOpenDraft: EvolutionHandoffScene["openDraft"] | null = null;
  let patchedOpenDraft: EvolutionHandoffScene["openDraft"] | null = null;
  let originalChooseDraft: EvolutionHandoffScene["chooseDraft"] | null = null;
  let patchedChooseDraft: EvolutionHandoffScene["chooseDraft"] | null = null;
  let originalRefractDraft: EvolutionHandoffScene["refractDraft"] | null = null;
  let patchedRefractDraft: EvolutionHandoffScene["refractDraft"] | null = null;
  let originalApplyCR2Projection: EvolutionHandoffScene["applyCR2Projection"] | null = null;
  let patchedApplyCR2Projection: EvolutionHandoffScene["applyCR2Projection"] | null = null;

  let naturalDrafts = 0;
  let evolutionSelections = 0;
  let lastEvolutionFamily: V23WeaponFamily | null = null;

  const syncDiagnostics = (): void => {
    if (!configured || !scene) return;
    game.canvas.dataset.evolutionNaturalHandoff = "ACTIVE";
    game.canvas.dataset.evolutionNaturalDrafts = String(naturalDrafts);
    game.canvas.dataset.evolutionNaturalSelections = String(evolutionSelections);
    game.canvas.dataset.evolutionNaturalLastFamily = lastEvolutionFamily ?? "";
    game.canvas.dataset.evolutionNaturalEligibleIds = scene.draftChoices
      .filter(choice => choice.candidateType === "EVOLUTION")
      .map(choice => choice.candidateId ?? "")
      .filter(Boolean)
      .join(",");
  };

  const configure = (candidate: EvolutionHandoffScene): void => {
    scene = candidate;
    originalOpenDraft = scene.openDraft;
    originalChooseDraft = scene.chooseDraft;
    originalRefractDraft = scene.refractDraft;
    originalApplyCR2Projection = scene.applyCR2Projection;

    patchedApplyCR2Projection = function (this: EvolutionHandoffScene, next: CR2LiveProjection): void {
      if (!originalApplyCR2Projection) throw new Error("Natural Evolution handoff lost projection authority.");
      const containsEvolution = Object.values(next.evolvedWeapons).some(value => value === true);
      if (!containsEvolution) {
        originalApplyCR2Projection.call(this, next);
        return;
      }

      // Preserve every already-qualified migration path inside the live scene while
      // keeping its old fail-closed guard as a fallback if this adapter is absent.
      // The sanitized projection is synchronous; no combat frame can observe the
      // temporary unevolved map before the authoritative evolved map is restored.
      const sanitized: CR2LiveProjection = Object.freeze({
        ...next,
        evolvedWeapons: Object.freeze({}),
      });
      originalApplyCR2Projection.call(this, sanitized);
      this.evolvedWeapons = { ...next.evolvedWeapons };
      this.syncTestState();
    };
    scene.applyCR2Projection = patchedApplyCR2Projection;

    patchedOpenDraft = function (this: EvolutionHandoffScene): void {
      originalOpenDraft?.call(this);
      if (this.level < 5 || !this.draftOpen || !this.cr2DraftActive) return;
      const draft = buildCR2DraftFromLive(this.seed, this.level, this.buildCR2LiveSnapshot());
      this.cr2DraftLegalCandidateCount = draft.legalCandidateCount;
      this.draftChoices = draft.choices.map(naturalEvolutionDraftViewChoice);
      this.renderDraftChoices();
      naturalDrafts += 1;
      syncDiagnostics();
    };
    scene.openDraft = patchedOpenDraft;

    patchedChooseDraft = function (this: EvolutionHandoffScene, index: number): void {
      if (!this.draftOpen) return;
      const choice = this.draftChoices[index];
      if (!choice || choice.disabled) return;
      if (!this.cr2DraftActive) {
        originalChooseDraft?.call(this, index);
        return;
      }
      if (!choice.candidateId) throw new Error("Natural CR-2 draft choice is missing candidate identity.");

      const echoPlacementsBeforeChoice = this.echoPlacements;
      const echoTriggersBeforeChoice = this.echoTriggers;
      const result = applyCR2DraftChoiceToLive(this.seed, this.level, this.buildCR2LiveSnapshot(), choice.candidateId);
      this.applyCR2Projection(result.projection);
      if (choice.id === "ECHO_RANK") {
        this.game.canvas.dataset.echoRankChoicePlacementDelta = String(this.echoPlacements - echoPlacementsBeforeChoice);
        this.game.canvas.dataset.echoRankChoiceTriggerDelta = String(this.echoTriggers - echoTriggersBeforeChoice);
      }
      if (result.selected.candidateType === "EVOLUTION") {
        evolutionSelections += 1;
        lastEvolutionFamily = result.selected.familyId as V23WeaponFamily;
      }
      closeDraft(this, result.selected.name);
      syncDiagnostics();
    };
    scene.chooseDraft = patchedChooseDraft;

    patchedRefractDraft = function (this: EvolutionHandoffScene): void {
      if (!this.draftOpen || !this.cr2DraftActive || this.refracts <= 0 || this.cr2DraftLegalCandidateCount <= 3) return;
      const result = useCR2RefractFromLive(this.seed, this.level, this.buildCR2LiveSnapshot());
      this.applyCR2Projection(result.projection);
      this.cr2DraftLegalCandidateCount = result.draft.legalCandidateCount;
      this.draftChoices = result.draft.choices.map(naturalEvolutionDraftViewChoice);
      this.renderDraftChoices();
      this.statusText.setText(`REFRACT // replacement triple locked · ${this.refracts} remaining`).setDepth(210);
      this.syncTestState();
      syncDiagnostics();
    };
    scene.refractDraft = patchedRefractDraft;

    configured = true;
    syncDiagnostics();
  };

  const tick = (): void => {
    if (disposed) return;
    if (!configured) {
      const candidate = game.scene.getScene("RareShiftV21Survival") as EvolutionHandoffScene | undefined;
      if (sceneReady(candidate)) {
        try {
          configure(candidate);
        } catch (cause) {
          game.canvas.dataset.evolutionNaturalHandoffError = cause instanceof Error ? cause.message : String(cause);
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
    if (!scene) return;
    if (originalOpenDraft && patchedOpenDraft && scene.openDraft === patchedOpenDraft) scene.openDraft = originalOpenDraft;
    if (originalChooseDraft && patchedChooseDraft && scene.chooseDraft === patchedChooseDraft) scene.chooseDraft = originalChooseDraft;
    if (originalRefractDraft && patchedRefractDraft && scene.refractDraft === patchedRefractDraft) scene.refractDraft = originalRefractDraft;
    if (originalApplyCR2Projection && patchedApplyCR2Projection && scene.applyCR2Projection === patchedApplyCR2Projection) scene.applyCR2Projection = originalApplyCR2Projection;
  };
}
