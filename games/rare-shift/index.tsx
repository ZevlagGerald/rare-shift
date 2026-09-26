"use client";

import { useEffect, useRef, useState } from "react";
import type { GameComponentProps } from "@rarefriends/friendsdk/runtime";
import { createFriendReader, decodeSpriteBitmap } from "@rarefriends/friendsdk/sprites";
import { buildProofChamber, selectFramePair } from "./src/phase-core.ts";
import { solveProofChamber } from "./src/solver.ts";
import { mountPhaserProof, type PhaserProofController } from "./src/phaser-proof.ts";
import type { FrameCandidate } from "./src/types.ts";
import "./style.css";

export default function RareShiftProof({ friendId, client, paused }: GameComponentProps) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<PhaserProofController | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
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
    controller.current?.destroy(); controller.current = null;
    setState("loading"); setError("");

    void Promise.all([createFriendReader().read(friendId), client.read()]).then(([sprites, snapshot]) => {
      if (cancelled) return;
      if (snapshot.friendId !== friendId) throw new Error("Game session does not match the selected Friend.");
      if (!host.current) throw new Error("Phaser mount is unavailable.");

      const frames: FrameCandidate[] = sprites.frames.map((bitmap, index) => ({
        index,
        bitmap,
        rows: decodeSpriteBitmap(bitmap).rows,
      }));
      const pair = selectFramePair(frames);
      const chamber = buildProofChamber(pair);
      const solved = solveProofChamber(chamber);
      if (!solved.solvable || solved.reachableWithoutShiftFromStartPhase || solved.minShifts === null || solved.minShifts < 2) {
        throw new Error("Generated T0 proof failed its solver acceptance gate.");
      }

      controller.current = mountPhaserProof({ parent: host.current, chamber, pair, solved, reducedMotion });
      controller.current.setPaused(paused);
      setState("ready");
    }).catch(cause => {
      if (!cancelled) { setError(cause instanceof Error ? cause.message : "RARE//SHIFT proof failed to initialize."); setState("error"); }
    });

    return () => { cancelled = true; controller.current?.destroy(); controller.current = null; };
  }, [friendId, client, retry]);

  return <section className="rare-shift-proof" aria-label="RARE SHIFT frame phase proof" aria-busy={state === "loading"}>
    <div ref={host} className="rare-shift-canvas" inert={paused || undefined} />
    {state !== "ready" && <div className="rare-shift-overlay" role={state === "error" ? "alert" : "status"}>
      <strong>{state === "loading" ? "Reading your Friend's 64 canonical frames…" : "T0 proof could not start"}</strong>
      {state === "error" && <><p>{error}</p><button type="button" disabled={paused} onClick={() => setRetry(value => value + 1)}>Retry</button></>}
    </div>}
    <div className="rare-shift-accessibility">
      <label><input type="checkbox" checked={reducedMotion} onChange={event => setReducedMotion(event.target.checked)} /> Reduce motion</label>
      <span>T0 engineering proof · no RF spending · no persistent state</span>
    </div>
  </section>;
}
