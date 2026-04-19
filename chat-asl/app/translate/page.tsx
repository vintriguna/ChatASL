"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useWebcam } from "../hooks/useWebcam";

interface Prediction {
  letter: string;
  confidence: number;
}

function parseRoboflowResponse(data: unknown): Prediction | null | "empty" {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const outputsArr = Array.isArray(d.outputs) ? d.outputs : null;
  const first = outputsArr?.[0] as Record<string, unknown> | undefined;
  const predWrapper = first?.predictions as Record<string, unknown> | undefined;
  const preds = Array.isArray(predWrapper?.predictions) ? predWrapper.predictions : null;
  if (preds === null) return null;
  if (preds.length === 0) return "empty";
  const top = preds[0] as Record<string, unknown>;
  const cls = (top.class as string) ?? (top.label as string);
  const conf = typeof top.confidence === "number" ? top.confidence : 0;
  if (!cls) return null;
  const letter = cls.toUpperCase();
  if (letter === "J" || letter === "Z") return "empty";
  return { letter, confidence: Math.round(conf * 100) };
}

type Status = "idle" | "loading" | "previewing" | "nodetection" | "error";

export default function TranslatePage() {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [preview, setPreview] = useState<Prediction | null>(null);
  const { videoRef, captureFrame } = useWebcam();

  const handleCapture = useCallback(async () => {
    const frame = captureFrame();
    if (!frame) return;
    setStatus("loading");
    setPreview(null);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: frame }),
      });
      if (!res.ok) { setStatus("error"); return; }
      const data: unknown = await res.json();
      const pred = parseRoboflowResponse(data);
      if (pred === null) { setStatus("error"); return; }
      if (pred === "empty") { setStatus("nodetection"); return; }
      setPreview(pred);
      setStatus("previewing");
    } catch {
      setStatus("error");
    }
  }, [captureFrame]);

  const handleConfirm = useCallback(() => {
    if (!preview) return;
    setText((prev) => prev + preview.letter);
    setPreview(null);
    setStatus("idle");
  }, [preview]);

  const handleRetry = useCallback(() => {
    setPreview(null);
    setStatus("idle");
  }, []);

  const handleSpace = useCallback(() => {
    setText((prev) => (prev.endsWith(" ") ? prev : prev + " "));
  }, []);

  const handleDelete = useCallback(() => {
    setText((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setText("");
    setPreview(null);
    setStatus("idle");
  }, []);

  const handleSpeak = useCallback(() => {
    if (!text.trim()) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }, [text]);

  const isPreviewing = status === "previewing";

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md flex flex-col gap-6">

        <h1 className="font-display text-2xl font-bold text-on-surface">Translate</h1>

        {/* Text display */}
        <div className="min-h-20 card-sm flex items-center">
          {text ? (
            <span className="font-display text-3xl font-bold tracking-widest text-on-surface break-all">
              {text}
            </span>
          ) : (
            <span className="text-base text-on-surface-variant">
              Sign a letter and press Capture…
            </span>
          )}
        </div>

        {/* Speak */}
        <button
          onClick={handleSpeak}
          disabled={!text.trim()}
          className="btn-secondary w-full h-12 text-sm"
        >
          Speak
        </button>

        {/* Webcam */}
        <div className="relative w-full overflow-hidden rounded-[2rem] bg-zinc-900 ghost-border ambient-shadow aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center glass rounded-[2rem]">
              <span className="text-on-surface text-sm font-medium">Detecting…</span>
            </div>
          )}
          {isPreviewing && preview && (
            <div className="absolute bottom-3 right-3 rounded-[1.5rem] glass px-3 py-1.5 flex items-center gap-2">
              <span className="font-display text-on-surface text-xl font-bold">{preview.letter}</span>
              {preview.confidence > 0 && (
                <span className="text-on-surface-variant text-xs">{preview.confidence}%</span>
              )}
            </div>
          )}
        </div>

        {/* Error / no detection */}
        {(status === "nodetection" || status === "error") && (
          <div className="rounded-[2rem] bg-amber-50 px-5 py-3">
            <p className="text-sm font-medium text-amber-700">
              {status === "nodetection"
                ? "No sign detected — make sure your hand is visible."
                : "Something went wrong — try again."}
            </p>
          </div>
        )}

        {/* Primary action */}
        {!isPreviewing ? (
          <button
            onClick={handleCapture}
            disabled={status === "loading"}
            className="btn-primary w-full h-14 text-base"
          >
            {status === "loading" ? "Detecting…" : "Capture"}
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              className="btn-primary flex-1 h-14 text-base"
            >
              Add {preview?.letter}
            </button>
            <button
              onClick={handleRetry}
              className="btn-secondary flex-1 h-14 text-base"
            >
              Retry
            </button>
          </div>
        )}

        {/* Secondary controls */}
        <div className="grid grid-cols-3 gap-3">
          <button onClick={handleSpace} className="btn-secondary h-12 text-sm">
            Space
          </button>
          <button onClick={handleDelete} disabled={text.length === 0} className="btn-secondary h-12 text-sm">
            Delete
          </button>
          <button onClick={handleClear} disabled={text.length === 0} className="btn-secondary h-12 text-sm">
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
