import type { V23DraftCandidate, V23ProtocolFamily, V23WeaponFamily } from "./progression-core.ts";

export type CR2LegacyCompatibleDraftId =
  | "DELTA_RANK"
  | "VECTOR_NEEDLE"
  | "VECTOR_RANK"
  | "ORBIT_NODES"
  | "ORBIT_RANK"
  | "ECHO_MINE"
  | "ECHO_RANK"
  | "SIGNAL_ARC"
  | "SIGNAL_RANK"
  | "FIELD_REPAIR"
  | "SIGNAL_MAGNET"
  | string;

const ACQUIRE_ID: Readonly<Record<Exclude<V23WeaponFamily, "DELTA">, CR2LegacyCompatibleDraftId>> = Object.freeze({
  VECTOR: "VECTOR_NEEDLE",
  ORBIT: "ORBIT_NODES",
  ECHO: "ECHO_MINE",
  SIGNAL: "SIGNAL_ARC",
});

const RANK_ID: Readonly<Record<V23WeaponFamily, CR2LegacyCompatibleDraftId>> = Object.freeze({
  DELTA: "DELTA_RANK",
  VECTOR: "VECTOR_RANK",
  ORBIT: "ORBIT_RANK",
  ECHO: "ECHO_RANK",
  SIGNAL: "SIGNAL_RANK",
});

export function cr2LegacyCompatibleDraftId(candidate: V23DraftCandidate): CR2LegacyCompatibleDraftId {
  if (candidate.candidateType === "WEAPON_ACQUIRE") {
    const family = candidate.familyId as V23WeaponFamily;
    if (family === "DELTA") throw new Error("DELTA cannot appear as a weapon acquisition candidate.");
    return ACQUIRE_ID[family];
  }
  if (candidate.candidateType === "WEAPON_RANK") return RANK_ID[candidate.familyId as V23WeaponFamily];
  if (candidate.candidateType === "UTILITY") return candidate.familyId as "FIELD_REPAIR" | "SIGNAL_MAGNET";
  return candidate.candidateId;
}

export function cr2DraftCategory(candidate: V23DraftCandidate): "WEAPON" | "UTILITY" | "PROTOCOL" | "EVOLUTION" {
  if (candidate.candidateType === "WEAPON_ACQUIRE" || candidate.candidateType === "WEAPON_RANK") return "WEAPON";
  if (candidate.candidateType === "UTILITY") return "UTILITY";
  if (candidate.candidateType === "EVOLUTION") return "EVOLUTION";
  return "PROTOCOL";
}

export function cr2ProtocolFamily(candidate: V23DraftCandidate): V23ProtocolFamily | null {
  if (candidate.candidateType !== "PROTOCOL_ACQUIRE" && candidate.candidateType !== "PROTOCOL_RANK") return null;
  return candidate.familyId as V23ProtocolFamily;
}
