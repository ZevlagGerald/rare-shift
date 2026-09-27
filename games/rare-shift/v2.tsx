"use client";

import { useEffect, useRef, useState } from "react";
import type { GameComponentProps } from "@rarefriends/friendsdk/runtime";
import { createFriendReader, decodeSpriteBitmap } from "@rarefriends/friendsdk/sprites";
import { derivePhaseField, selectFramePair } from "./src/phase-core.ts";
import { mountPhaserSurvival, type PhaserSurvivalController } from "./src/phaser-survival.ts";
import type { FrameCandidate, FrameRows, PixelClass, SelectedFramePair } from "./src/types.ts";
import "./style.css";
import "./v2-1a.css";

type Stage = "loading" | "scan" | "survival" | "error";

interface PreparedV2 {
  friendLabel: string;
  familyName: string;
  pair: SelectedFramePair;
}

function CanonicalFrame({ rows, label, view }: { rows: FrameRows; label: string; view: string }) {
  return <figure className="rare-shift-scan-card">
    <figcaption>{label}</figcaption>
    <svg data-scan-view={view} data-rows={rows.join("")} className="rare-shift-pixel-grid" viewBox="0 0 16 16" role="img" aria-label={`${label} canonical 16 by 16 frame`} shapeRendering="crispEdges">
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
    <figcaption>CANONICAL DELTA</figcaption>
    <svg data-scan-view="phase-field" className="rare-shift-pixel-grid" viewBox="0 0 16 16" role="img" aria-label="Canonical phase field" shapeRendering="crispEdges">
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

function ScanStage({ prepared, paused, onEnter }: { prepared: PreparedV2; paused: boolean; onEnter: () => void }) {
  const { pair } = prepared;
  return <div className="rare-shift-scan" data-stage="scan" data-friend={prepared.friendLabel} data-family={prepared.familyName}
    data-frame-a={pair.a.index} data-frame-b={pair.b.index} data-delta={pair.metrics.difference} data-balance={pair.metrics.balance}>
    <header className="rare-shift-scan-header">
      <p className="rare-shift-kicker">V2 // SIGNAL DESCENT CALIBRATION</p>
      <h1>RARE//SHIFT</h1>
      <p className="rare-shift-scan-thesis">Your Friend is not a skin. Its animation is your weapon and the battlefield's phase law.</p>
      <div className="rare-shift-identity-strip">
        <strong>Friend #{prepared.friendLabel}</strong><span>{prepared.familyName}</span>
        <span>frames {pair.a.index} ↔ {pair.b.index}</span><span>DELTA {pair.metrics.difference}</span>
      </div>
    </header>
    <div className="rare-shift-scan-visuals">
      <CanonicalFrame rows={pair.a.rows} label={`FRAME ${pair.a.index} // PHASE A`} view="frame-a" />
      <PhaseField pair={pair} />
      <CanonicalFrame rows={pair.b.rows} label={`FRAME ${pair.b.index} // PHASE B`} view="frame-b" />
    </div>
    <div className="rare-shift-scan-readout">
      <div><span>DELTA</span><strong>{pair.metrics.difference}</strong></div>
      <div><span>A ONLY</span><strong>{pair.metrics.aOnly}</strong></div>
      <div><span>B ONLY</span><strong>{pair.metrics.bOnly}</strong></div>
      <div><span>COMMON</span><strong>{pair.metrics.common}</strong></div>
    </div>
    <p className="rare-shift-scan-explainer">DELTA BURST projects these exact canonical A_ONLY/B_ONLY pixels. SHIFT changes your Friend's pose and which phased enemies become corporeal.</p>
    <button className="rare-shift-enter" type="button" disabled={paused} onClick={onEnter}>ENTER SIGNAL DESCENT<span>MOVE · AUTO-ATTACK · SHIFT</span></button>
  </div>;
}

export default function RareShiftV2({ friendId, client, paused }: GameComponentProps) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<PhaserSurvivalController | null>(null);
  const [stage, setStage] = useState<Stage>("loading");
  const [prepared, setPrepared] = useState<PreparedV2 | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => { controller.current?.setPaused(paused); }, [paused]);
  useEffect(() => { controller.current?.setReducedMotion(reducedMotion); }, [reducedMotion]);

  useEffect(() => {
    let cancelled = false;
    setPrepared(null);
    setStage("loading");
    setError("");
    void Promise.all([createFriendReader().read(friendId), client.read()]).then(([sprites, snapshot]) => {
      if (cancelled) return;
      if (snapshot.friendId !== friendId) throw new Error("Game session does not match the selected Friend.");
      const frames: FrameCandidate[] = sprites.frames.map((bitmap, index) => ({ index, bitmap, rows: decodeSpriteBitmap(bitmap).rows }));
      const pair = selectFramePair(frames);
      setPrepared({ friendLabel: String(friendId), familyName: sprites.familyName, pair });
      setStage("scan");
    }).catch(cause => {
      if (!cancelled) {
        setError(cause instanceof Error ? cause.message : "RARE//SHIFT could not initialize.");
        setStage("error");
      }
    });
    return () => { cancelled = true; };
  }, [friendId, client, retry]);

  useEffect(() => {
    if (stage !== "survival" || !prepared || !host.current) return;
    const mounted = mountPhaserSurvival({
      parent: host.current,
      pair: prepared.pair,
      reducedMotion,
      friendLabel: prepared.friendLabel,
      familyName: prepared.familyName,
    });
    controller.current = mounted;
    mounted.setPaused(paused);
    return () => {
      mounted.destroy();
      if (controller.current === mounted) controller.current = null;
    };
  }, [stage, prepared]);

  const canvasVisible = stage === "survival";
  return <section className="rare-shift-proof" aria-label="RARE SHIFT V2" aria-busy={stage === "loading"} data-app-stage={stage}>
    <div ref={host} className="rare-shift-canvas" inert={paused || !canvasVisible || undefined} aria-hidden={!canvasVisible} />
    {stage === "scan" && prepared && <ScanStage prepared={prepared} paused={paused} onEnter={() => setStage("survival")} />}
    {(stage === "loading" || stage === "error") && <div className="rare-shift-overlay" role={stage === "error" ? "alert" : "status"}>
      <strong>{stage === "loading" ? "Reading your Friend's 64 canonical frames…" : "RARE//SHIFT could not start"}</strong>
      {stage === "error" && <><p>{error}</p><button type="button" disabled={paused} onClick={() => setRetry(value => value + 1)}>Retry</button></>}
    </div>}
    <div className={`rare-shift-accessibility rare-shift-accessibility-${stage}`} data-build-note="V2-1A canonical DELTA combat sandbox">
      <label><input type="checkbox" checked={reducedMotion} onChange={event => setReducedMotion(event.target.checked)} /> Reduce motion</label>
    </div>
  </section>;
}