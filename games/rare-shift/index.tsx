"use client";

import { useEffect, useRef, useState } from "react";
import type { GameComponentProps } from "@rarefriends/friendsdk/runtime";
import { createFriendReader, decodeSpriteBitmap } from "@rarefriends/friendsdk/sprites";
import { buildProofChamber, derivePhaseField, selectFramePair } from "./src/phase-core.ts";
import { solveProofChamber } from "./src/solver.ts";
import { buildTimingChamber, buildTimingProfile } from "./src/timing-core.ts";
import { solveTimingChamber } from "./src/timing-solver.ts";
import { buildSyncChamber } from "./src/sync-core.ts";
import { solveSyncChamber } from "./src/sync-solver.ts";
import { mountPhaserProof, type PhaserProofController } from "./src/phaser-proof.ts";
import { mountPhaserTiming, type PhaserTimingController } from "./src/phaser-timing.ts";
import { mountPhaserSync, type PhaserSyncController } from "./src/phaser-sync.ts";
import type {
  FrameCandidate,
  FrameRows,
  PixelClass,
  ProofChamber,
  SelectedFramePair,
  SolveResult,
  SyncChamber,
  SyncSolveResult,
  TimingChamber,
  TimingProfile,
  TimingSolveResult,
} from "./src/types.ts";
import "./style.css";

type Stage = "loading" | "scan" | "chamber1" | "between" | "chamber2" | "between2" | "chamber3" | "error";

interface PreparedRun {
  friendLabel: string;
  familyName: string;
  pair: SelectedFramePair;
  chamber: ProofChamber;
  solved: SolveResult;
  timingChamber: TimingChamber;
  timingProfile: TimingProfile;
  timingSolved: TimingSolveResult;
  syncChamber: SyncChamber;
  syncSolved: SyncSolveResult;
}

function CanonicalFrame({ rows, label, view }: { rows: FrameRows; label: string; view: string }) {
  return <figure className="rare-shift-scan-card">
    <figcaption>{label}</figcaption>
    <svg data-scan-view={view} className="rare-shift-pixel-grid" viewBox="0 0 16 16" role="img" aria-label={`${label} canonical 16 by 16 frame`} shapeRendering="crispEdges">
      <rect width="16" height="16" className="scan-grid-bg" />
      {rows.flatMap((row, y) => [...row].map((cell, x) => cell === "#" ?
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" className="scan-frame-pixel" /> : null))}
    </svg>
  </figure>;
}

function PhaseField({ pair }: { pair: SelectedFramePair }) {
  const field = derivePhaseField(pair.a.rows, pair.b.rows);
  const classFor = (state: PixelClass) => `scan-phase scan-phase-${state.toLowerCase().replace("_", "-")}`;
  return <figure className="rare-shift-scan-card rare-shift-phase-card">
    <figcaption>CANONICAL XOR</figcaption>
    <svg data-scan-view="phase-field" className="rare-shift-pixel-grid" viewBox="0 0 16 16" role="img" aria-label="Canonical XOR phase field" shapeRendering="crispEdges">
      {field.flatMap((row, y) => row.map((state, x) =>
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" className={classFor(state)} />))}
    </svg>
    <div className="rare-shift-legend" aria-label="Phase-field legend">
      <span><i className="legend-a" />A only</span>
      <span><i className="legend-b" />B only</span>
      <span><i className="legend-common" />Common</span>
      <span><i className="legend-void" />Void</span>
    </div>
  </figure>;
}

function ScanStage({ prepared, paused, onEnter }: { prepared: PreparedRun; paused: boolean; onEnter: () => void }) {
  const { pair, chamber, solved } = prepared;
  return <div className="rare-shift-scan" data-stage="scan" data-friend={prepared.friendLabel} data-family={prepared.familyName}
    data-frame-a={pair.a.index} data-frame-b={pair.b.index} data-fingerprint={chamber.fingerprint} data-solver-min={solved.minShifts ?? -1}>
    <header className="rare-shift-scan-header">
      <p className="rare-shift-kicker">IDENTITY SCAN // CANONICAL SIGNAL LOCKED</p>
      <h1>RARE//SHIFT</h1>
      <p className="rare-shift-scan-thesis">Your Friend is not a skin. Its animation is the rules.</p>
      <div className="rare-shift-identity-strip">
        <strong>Friend #{prepared.friendLabel}</strong><span>{prepared.familyName}</span>
        <span>frames {pair.a.index} ↔ {pair.b.index}</span><span>proof {chamber.fingerprint}</span>
      </div>
    </header>
    <div className="rare-shift-scan-visuals">
      <CanonicalFrame rows={pair.a.rows} label={`FRAME ${pair.a.index} // PHASE A`} view="frame-a" />
      <PhaseField pair={pair} />
      <CanonicalFrame rows={pair.b.rows} label={`FRAME ${pair.b.index} // PHASE B`} view="frame-b" />
    </div>
    <div className="rare-shift-scan-readout">
      <div><span>DELTA</span><strong>{pair.metrics.difference}</strong></div>
      <div><span>BALANCE</span><strong>{pair.metrics.balance}</strong></div>
      <div><span>CLIP</span><strong>{pair.sourceGroup >= 0 ? pair.sourceGroup : "FALLBACK"}</strong></div>
      <div><span>SOLVER</span><strong>{solved.minShifts} SHIFT</strong></div>
    </div>
    <p className="rare-shift-scan-explainer">Exact canonical pixels become phase authority. Cyan and magenta differences decide which chamber gates are solid when you SHIFT.</p>
    <button className="rare-shift-enter" type="button" disabled={paused} onClick={onEnter}>ENTER CHAMBER I<span>DISCOVER THE SHIFT</span></button>
  </div>;
}

function ChamberTransition({ prepared, paused, onEnter }: { prepared: PreparedRun; paused: boolean; onEnter: () => void }) {
  return <div className="rare-shift-overlay" data-stage="chamber1-transition" role="status">
    <strong>CHAMBER I COMPLETE</strong>
    <p>Collision obeys your canonical frames. Chamber II adds a second requirement: match the correct phase to the correct pulse window.</p>
    <p>Timing proof <strong>{prepared.timingChamber.fingerprint}</strong> · solver minimum {prepared.timingSolved.minShifts} SHIFTs</p>
    <button type="button" disabled={paused} onClick={onEnter}>ENTER CHAMBER II // TIMING</button>
  </div>;
}

function ChamberTwoTransition({ prepared, paused, onEnter }: { prepared: PreparedRun; paused: boolean; onEnter: () => void }) {
  return <div className="rare-shift-overlay" data-stage="chamber2-transition" role="status">
    <strong>CHAMBER II COMPLETE</strong>
    <p>Phase and timing are stable. Chamber III routes the signal through three canonical nodes: B → A → B.</p>
    <p>Sync proof <strong>{prepared.syncChamber.fingerprint}</strong> · solver minimum {prepared.syncSolved.minShifts} SHIFTs</p>
    <button type="button" disabled={paused} onClick={onEnter}>ENTER CHAMBER III // SYNCHRONIZE</button>
  </div>;
}

export default function RareShift({ friendId, client, paused }: GameComponentProps) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<PhaserProofController | PhaserTimingController | PhaserSyncController | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [prepared, setPrepared] = useState<PreparedRun | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update(); preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useEffect(() => { controller.current?.setPaused(paused); }, [paused]);
  useEffect(() => { controller.current?.setReducedMotion(reducedMotion); }, [reducedMotion]);

  useEffect(() => {
    let cancelled = false;
    setPrepared(null); setStage("loading"); setError("");
    void Promise.all([createFriendReader().read(friendId), client.read()]).then(([sprites, snapshot]) => {
      if (cancelled) return;
      if (snapshot.friendId !== friendId) throw new Error("Game session does not match the selected Friend.");
      const frames: FrameCandidate[] = sprites.frames.map((bitmap, index) => ({ index, bitmap, rows: decodeSpriteBitmap(bitmap).rows }));
      const pair = selectFramePair(frames);
      const chamber = buildProofChamber(pair);
      const solved = solveProofChamber(chamber);
      if (!solved.solvable || solved.reachableWithoutShiftFromStartPhase || solved.minShifts !== 2) throw new Error("Generated Chamber I failed its solver acceptance gate.");
      const timingProfile = buildTimingProfile(chamber.fingerprint);
      const timingChamber = buildTimingChamber(pair, chamber.fingerprint);
      const timingSolved = solveTimingChamber(timingChamber, timingProfile);
      if (!timingSolved.solvable || timingSolved.reachableWithoutShiftFromStartPhase || timingSolved.minShifts !== 2) throw new Error("Generated Chamber II failed its timing solver acceptance gate.");
      const syncChamber = buildSyncChamber(pair, timingChamber.fingerprint);
      const syncSolved = solveSyncChamber(syncChamber);
      if (!syncSolved.solvable || syncSolved.reachableWithoutShiftFromStartPhase || syncSolved.minShifts !== 2) throw new Error("Generated Chamber III failed its synchronization solver acceptance gate.");
      setPrepared({ friendLabel: String(friendId), familyName: sprites.familyName, pair, chamber, solved, timingChamber, timingProfile, timingSolved, syncChamber, syncSolved });
      setStage("scan");
    }).catch(cause => {
      if (!cancelled) { setError(cause instanceof Error ? cause.message : "RARE//SHIFT could not initialize."); setStage("error"); }
    });
    return () => { cancelled = true; };
  }, [friendId, client, retry]);

  useEffect(() => {
    if (stage !== "chamber1" || !prepared || !host.current) return;
    const mounted = mountPhaserProof({ parent: host.current, chamber: prepared.chamber, pair: prepared.pair, solved: prepared.solved, reducedMotion, friendLabel: prepared.friendLabel, familyName: prepared.familyName });
    controller.current = mounted; mounted.setPaused(paused);
    return () => { mounted.destroy(); if (controller.current === mounted) controller.current = null; };
  }, [stage, prepared]);
  useEffect(() => {
    if (stage !== "chamber1") return;
    let frame = 0;
    const watch = () => { const canvas = host.current?.querySelector("canvas"); if (canvas?.dataset.complete === "true") { setStage("between"); return; } frame = requestAnimationFrame(watch); };
    frame = requestAnimationFrame(watch); return () => cancelAnimationFrame(frame);
  }, [stage]);

  useEffect(() => {
    if (stage !== "chamber2" || !prepared || !host.current) return;
    const mounted = mountPhaserTiming({ parent: host.current, chamber: prepared.timingChamber, pair: prepared.pair, profile: prepared.timingProfile, solved: prepared.timingSolved, reducedMotion, friendLabel: prepared.friendLabel, familyName: prepared.familyName });
    controller.current = mounted; mounted.setPaused(paused);
    return () => { mounted.destroy(); if (controller.current === mounted) controller.current = null; };
  }, [stage, prepared]);
  useEffect(() => {
    if (stage !== "chamber2") return;
    let frame = 0;
    const watch = () => { const canvas = host.current?.querySelector("canvas"); if (canvas?.dataset.complete === "true") { setStage("between2"); return; } frame = requestAnimationFrame(watch); };
    frame = requestAnimationFrame(watch); return () => cancelAnimationFrame(frame);
  }, [stage]);

  useEffect(() => {
    if (stage !== "chamber3" || !prepared || !host.current) return;
    const mounted = mountPhaserSync({ parent: host.current, chamber: prepared.syncChamber, pair: prepared.pair, solved: prepared.syncSolved, reducedMotion, friendLabel: prepared.friendLabel, familyName: prepared.familyName });
    controller.current = mounted; mounted.setPaused(paused);
    return () => { mounted.destroy(); if (controller.current === mounted) controller.current = null; };
  }, [stage, prepared]);

  const canvasVisible = stage === "chamber1" || stage === "chamber2" || stage === "chamber3";
  return <section className="rare-shift-proof" aria-label="RARE SHIFT" aria-busy={stage === "loading"} data-app-stage={stage}>
    <div ref={host} className="rare-shift-canvas" inert={paused || !canvasVisible || undefined} aria-hidden={!canvasVisible} />
    {stage === "scan" && prepared && <ScanStage prepared={prepared} paused={paused} onEnter={() => setStage("chamber1")} />}
    {stage === "between" && prepared && <ChamberTransition prepared={prepared} paused={paused} onEnter={() => setStage("chamber2")} />}
    {stage === "between2" && prepared && <ChamberTwoTransition prepared={prepared} paused={paused} onEnter={() => setStage("chamber3")} />}
    {(stage === "loading" || stage === "error") && <div className="rare-shift-overlay" role={stage === "error" ? "alert" : "status"}>
      <strong>{stage === "loading" ? "Reading your Friend's 64 canonical frames…" : "RARE//SHIFT could not start"}</strong>
      {stage === "error" && <><p>{error}</p><button type="button" disabled={paused} onClick={() => setRetry(value => value + 1)}>Retry</button></>}
    </div>}
    <div className="rare-shift-accessibility">
      <label><input type="checkbox" checked={reducedMotion} onChange={event => setReducedMotion(event.target.checked)} /> Reduce motion</label>
      <span>T3 SCAN + DISCOVER + TIMING + SYNCHRONIZE · no RF spending · no persistent state</span>
    </div>
  </section>;
}
