import type { FrameRows, SelectedFramePair } from "./types.ts";
import type { CR3RunResult } from "./cr3-results-core.ts";

function formatRunTime(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function ResultFrame({ rows, label, view }: { rows: FrameRows; label: string; view: string }) {
  return <figure className="cr3d-frame">
    <figcaption>{label}</figcaption>
    <svg data-results-view={view} data-rows={rows.join("")} viewBox="0 0 16 16" role="img" aria-label={`${label} canonical 16 by 16 frame`} shapeRendering="crispEdges">
      <rect width="16" height="16" className="cr3d-frame-bg" />
      {rows.flatMap((row, y) => [...row].map((cell, x) => cell === "#"
        ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" className="cr3d-frame-pixel" />
        : null))}
    </svg>
  </figure>;
}

function buildLabel(result: CR3RunResult): string {
  return result.weapons
    .filter(weapon => weapon.owned)
    .map(weapon => `${weapon.family} ${weapon.rank}${weapon.evolved ? " EVO" : ""}`)
    .join(" · ");
}

export function CR3ResultsStage({
  result,
  pair,
  paused,
  onRunAgain,
}: {
  result: CR3RunResult;
  pair: SelectedFramePair;
  paused: boolean;
  onRunAgain: () => void;
}) {
  const victory = result.outcome === "VICTORY";
  return <div className={`cr3d-results cr3d-results-${result.outcome.toLowerCase()}`}
    data-stage="results"
    data-outcome={result.outcome}
    data-fingerprint={result.fingerprint}
    data-final-hp={result.finalHp}
    data-damage-taken={result.damageTaken}
    data-boss-result={result.bossResult}
    data-terminal-pause-events={result.terminalPauseEvents}
    data-frame-a={result.frameA}
    data-frame-b={result.frameB}>
    <header className="cr3d-results-header">
      <p className="cr3d-kicker">{victory ? "THE DESYNC // COLLAPSED" : "SIGNAL LOST // RUN ENDED"}</p>
      <h1>{victory ? "RECONSTRUCTION COMPLETE" : "RUN TRACE RECOVERED"}</h1>
      <p>{victory
        ? `Friend #${result.friend} survived the fracture. Canonical Phase A/B identity is verified below.`
        : `Friend #${result.friend} was lost before reconstruction. The run trace remains intact for immediate retry.`}</p>
    </header>

    {victory && <section className="cr3d-reconstruction" aria-label="Canonical reconstruction">
      <ResultFrame rows={pair.a.rows} label={`FRAME ${pair.a.index} // PHASE A`} view="reconstruction-a" />
      <div className="cr3d-reconstruction-mark" aria-hidden="true"><span>A</span><b>↔</b><span>B</span></div>
      <ResultFrame rows={pair.b.rows} label={`FRAME ${pair.b.index} // PHASE B`} view="reconstruction-b" />
    </section>}

    <section className="cr3d-stat-grid" aria-label="Run results">
      <div><span>TIME</span><strong>{formatRunTime(result.elapsedMs)}</strong></div>
      <div><span>KILLS</span><strong>{result.kills}</strong></div>
      <div><span>LEVEL</span><strong>{result.level}</strong></div>
      <div><span>FINAL HP</span><strong>{result.finalHp}</strong></div>
      <div><span>SHIFTS</span><strong>{result.shifts}</strong></div>
      <div><span>DAMAGE TAKEN</span><strong>{result.damageTaken}</strong></div>
      <div><span>ELITES</span><strong>{result.elitesDefeated}</strong></div>
      <div><span>THE DESYNC</span><strong>{result.bossResult}</strong></div>
    </section>

    <section className="cr3d-build" aria-label="Final build">
      <div><span>BUILD</span><strong>{buildLabel(result) || "DELTA 1"}</strong></div>
      <div><span>PROTOCOLS</span><strong>{result.protocols || "NONE"}</strong></div>
      <div><span>EVOLUTION CORES</span><strong>{result.evolutionCoresAcquired} ACQUIRED · {result.evolutionCoresSpent} SPENT · {result.evolutionCoresCurrent} HELD</strong></div>
      <div><span>RUN SEED</span><strong>{result.seed}</strong></div>
      <div><span>RUN FINGERPRINT</span><strong>{result.fingerprint}</strong></div>
    </section>

    <footer className="cr3d-actions">
      <button type="button" disabled={paused} onClick={onRunAgain}>RUN AGAIN<span>same verified Friend</span></button>
      <div className="cr3d-change-friend" data-change-friend-authority="trusted-host">
        <strong>CHANGE FRIEND</strong>
        <span>Use the trusted Rare Friends “Choose Friend” control above the game frame.</span>
      </div>
    </footer>
  </div>;
}
