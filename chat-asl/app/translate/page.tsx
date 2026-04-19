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
  return { letter: cls.toUpperCase(), confidence: Math.round(conf * 100) };
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
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-md flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            ← Back
          </Link>
          <h1 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
            Translate Mode
          </h1>
          <div className="w-12" />
        </div>

        {/* Text display */}
        <div className="min-h-20 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-5 py-4 flex items-center">
          {text ? (
            <span className="text-3xl font-bold tracking-widest text-zinc-900 dark:text-zinc-50 break-all">
              {text}
            </span>
          ) : (
            <span className="text-base text-zinc-400 dark:text-zinc-500">
              Sign a letter and press Capture…
            </span>
          )}
        </div>

        {/* Speak */}
        <button
          onClick={handleSpeak}
          disabled={!text.trim()}
          className="w-full h-12 rounded-2xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
        >
          Speak
        </button>

        {/* Webcam */}
        <div className="relative w-full overflow-hidden rounded-2xl bg-zinc-900 aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="text-white text-sm font-medium">Detecting…</span>
            </div>
          )}
          {isPreviewing && preview && (
            <div className="absolute bottom-3 right-3 rounded-xl bg-black/60 px-3 py-1.5 flex items-center gap-2">
              <span className="text-white text-xl font-bold">{preview.letter}</span>
              {preview.confidence > 0 && (
                <span className="text-zinc-300 text-xs">{preview.confidence}%</span>
              )}
            </div>
          )}
        </div>

        {/* Error / no detection banner */}
        {(status === "nodetection" || status === "error") && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 px-5 py-3">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
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
            className="w-full h-14 rounded-2xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-base font-semibold transition-opacity disabled:opacity-50 hover:opacity-90"
          >
            {status === "loading" ? "Detecting…" : "Capture"}
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              className="flex-1 h-14 rounded-2xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-base font-semibold hover:opacity-90 transition-opacity"
            >
              Add {preview?.letter}
            </button>
            <button
              onClick={handleRetry}
              className="flex-1 h-14 rounded-2xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-base font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Secondary controls */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={handleSpace}
            className="h-12 rounded-2xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Space
          </button>
          <button
            onClick={handleDelete}
            disabled={text.length === 0}
            className="h-12 rounded-2xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
          >
            Delete
          </button>
          <button
            onClick={handleClear}
            disabled={text.length === 0}
            className="h-12 rounded-2xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
