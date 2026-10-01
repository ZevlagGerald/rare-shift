export type CR3RunOutcome = "VICTORY" | "DEFEAT";

export interface CR3RunWeaponResult {
  readonly family: "DELTA" | "VECTOR" | "ORBIT" | "ECHO" | "SIGNAL";
  readonly owned: boolean;
  readonly rank: number;
  readonly evolved: boolean;
}

export interface CR3RunResult {
  readonly outcome: CR3RunOutcome;
  readonly friend: string;
  readonly family: string;
  readonly frameA: number;
  readonly frameB: number;
  readonly seed: number;
  readonly elapsedMs: number;
  readonly kills: number;
  readonly level: number;
  readonly finalHp: number;
  readonly phase: string;
  readonly shifts: number;
  readonly damageTaken: number;
  readonly weapons: readonly CR3RunWeaponResult[];
  readonly protocols: string;
  readonly evolutionCoresCurrent: number;
  readonly evolutionCoresSpent: number;
  readonly evolutionCoresAcquired: number;
  readonly elitesDefeated: number;
  readonly bossResult: string;
  readonly bossDefeatEvents: number;
  readonly terminalPauseEvents: number;
  readonly fingerprint: string;
}

export type CR3ResultSource = Readonly<Record<string, string | undefined>>;

function finiteInteger(source: CR3ResultSource, key: string, fallback = 0): number {
  const raw = source[key];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`CR-3D result field ${key} must be finite.`);
  return Math.trunc(value);
}

function booleanField(source: CR3ResultSource, key: string): boolean {
  return source[key] === "true";
}

function normalizedList(raw: string | undefined): readonly string[] {
  if (!raw) return Object.freeze([]);
  return Object.freeze(raw.split(",").map(value => value.trim()).filter(Boolean).sort());
}

function fnv1a32(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function detectCR3TerminalOutcome(source: CR3ResultSource): CR3RunOutcome | null {
  // Terminal capture is owned by the CR-3D runtime adapter. Earlier CR-3B/C
  // controlled qualifiers deliberately suppress that adapter so they can
  // continue inspecting the already-qualified post-defeat boss/pressure state.
  if (source.cr3dResultsRuntime !== "ACTIVE") return null;
  if (source.cr3BossPhase === "DEFEATED" && finiteInteger(source, "cr3BossDefeatEvents") >= 1) return "VICTORY";
  if (source.dead === "true") return "DEFEAT";
  return null;
}

export function buildCR3RunResult(source: CR3ResultSource, outcome: CR3RunOutcome): CR3RunResult {
  const evolved = new Set(normalizedList(source.cr3dEvolvedWeapons));
  const weapons: readonly CR3RunWeaponResult[] = Object.freeze([
    Object.freeze({ family: "DELTA" as const, owned: true, rank: finiteInteger(source, "deltaRank", 1), evolved: evolved.has("DELTA") }),
    Object.freeze({ family: "VECTOR" as const, owned: booleanField(source, "vectorOwned"), rank: finiteInteger(source, "vectorRank", 1), evolved: evolved.has("VECTOR") }),
    Object.freeze({ family: "ORBIT" as const, owned: booleanField(source, "orbitOwned"), rank: finiteInteger(source, "orbitRank", 1), evolved: evolved.has("ORBIT") }),
    Object.freeze({ family: "ECHO" as const, owned: booleanField(source, "echoOwned"), rank: finiteInteger(source, "echoRank", 1), evolved: evolved.has("ECHO") }),
    Object.freeze({ family: "SIGNAL" as const, owned: booleanField(source, "signalOwned"), rank: finiteInteger(source, "signalRank", 1), evolved: evolved.has("SIGNAL") }),
  ]);
  const evolutionCoresCurrent = Math.max(0, finiteInteger(source, "evolutionCores"));
  const evolutionCoresSpent = weapons.filter(weapon => weapon.evolved).length;
  const evolutionCoresAcquired = evolutionCoresCurrent + evolutionCoresSpent;
  const base = {
    outcome,
    friend: source.friend ?? "",
    family: source.family ?? "",
    frameA: finiteInteger(source, "frameA"),
    frameB: finiteInteger(source, "frameB"),
    seed: finiteInteger(source, "seed") >>> 0,
    elapsedMs: Math.max(0, finiteInteger(source, "directorElapsedMs")),
    kills: Math.max(0, finiteInteger(source, "kills")),
    level: Math.max(1, finiteInteger(source, "level", 1)),
    finalHp: Math.max(0, finiteInteger(source, "hp")),
    phase: source.phase ?? "",
    shifts: Math.max(0, finiteInteger(source, "shifts")),
    damageTaken: Math.max(0, finiteInteger(source, "cr3dDamageTaken")),
    weapons,
    protocols: source.protocols ?? "",
    evolutionCoresCurrent,
    evolutionCoresSpent,
    evolutionCoresAcquired,
    elitesDefeated: Math.max(0, finiteInteger(source, "elitesDefeated")),
    bossResult: outcome === "VICTORY" ? "DEFEATED" : (source.cr3BossPhase || "NOT_REACHED"),
    bossDefeatEvents: Math.max(0, finiteInteger(source, "cr3BossDefeatEvents")),
    terminalPauseEvents: Math.max(0, finiteInteger(source, "cr3dTerminalPauseEvents")),
  } as const;
  const canonical = JSON.stringify({
    ...base,
    weapons: base.weapons.map(weapon => [weapon.family, weapon.owned, weapon.rank, weapon.evolved]),
  });
  return Object.freeze({ ...base, fingerprint: `CR3D-${fnv1a32(canonical)}` });
}
