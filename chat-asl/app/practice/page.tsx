"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useWebcam } from "../hooks/useWebcam";

const LETTERS = "ABCDEFGHIKLMNOPQRSTUVWXY".split("");

function randomLetter(exclude?: string): string {
  const pool = exclude ? LETTERS.filter((l) => l !== exclude) : LETTERS;
  return pool[Math.floor(Math.random() * pool.length)];
}

type Status = "idle" | "loading" | "correct" | "incorrect" | "error" | "nodetection";

interface Prediction {
  letter: string;
  confidence: number;
}

// Response shape: { outputs: [{ predictions: { predictions: [...] } }] }
function parseRoboflowResponse(data: unknown): Prediction | null | "empty" {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  const outputsArr = Array.isArray(d.outputs) ? d.outputs : null;
  const first = outputsArr?.[0] as Record<string, unknown> | undefined;
  const predWrapper = first?.predictions as Record<string, unknown> | undefined;
  const preds = Array.isArray(predWrapper?.predictions) ? predWrapper.predictions : null;

  if (preds === null) return null;   // unexpected shape
  if (preds.length === 0) return "empty"; // model ran but found nothing

  const top = preds[0] as Record<string, unknown>;
  const cls = (top.class as string) ?? (top.label as string);
  const conf = typeof top.confidence === "number" ? top.confidence : 0;

  if (!cls) return null;
  return { letter: cls.toUpperCase(), confidence: Math.round(conf * 100) };
}

export default function PracticePage() {
  const [target, setTarget] = useState(() => randomLetter());
  const [status, setStatus] = useState<Status>("idle");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const { videoRef, captureFrame } = useWebcam();

  const handleCheck = useCallback(async () => {
    const frame = captureFrame();
    if (!frame) return;

    setStatus("loading");
    setPrediction(null);

    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: frame }),
      });

      if (!res.ok) {
        setStatus("error");
        return;
      }

      const data: unknown = await res.json();
      const pred = parseRoboflowResponse(data);

      if (pred === null) {
        setStatus("error");
        return;
      }
      if (pred === "empty") {
        setStatus("nodetection");
        return;
      }

      const isCorrect = pred.letter === target;
      setPrediction(pred);
      setStatus(isCorrect ? "correct" : "incorrect");
      fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetLetter: target,
          detectedLetter: pred.letter,
          confidence: pred.confidence,
          isCorrect,
        }),
      });
    } catch {
      setStatus("error");
    }
  }, [captureFrame, target]);

  const handleNext = useCallback(() => {
    setTarget((prev) => randomLetter(prev));
    setStatus("idle");
    setPrediction(null);
  }, []);

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
            Practice Mode
          </h1>
          <div className="w-12" />
        </div>

        {/* Target letter */}
        <div className="flex flex-col items-center gap-1 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-6">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
            Sign this letter
          </p>
          <span className="text-[8rem] leading-none font-bold text-zinc-900 dark:text-zinc-50 select-none">
            {target}
          </span>
        </div>

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
              <span className="text-white text-sm font-medium">Checking…</span>
            </div>
          )}
        </div>

        {/* Check button */}
        <button
          onClick={handleCheck}
          disabled={status === "loading"}
          className="w-full h-14 rounded-2xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-base font-semibold transition-opacity disabled:opacity-50 hover:opacity-90"
        >
          {status === "loading" ? "Checking…" : "Check My Sign"}
        </button>

        {/* Feedback */}
        {(status === "correct" || status === "incorrect" || status === "error" || status === "nodetection") && (
          <div
            className={`rounded-2xl border px-5 py-4 flex flex-col gap-2 ${
              status === "correct"
                ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                : status === "incorrect"
                ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                : "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800"
            }`}
          >
            {status === "error" ? (
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Something went wrong — try again.
              </p>
            ) : status === "nodetection" ? (
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                No sign detected — make sure your hand is visible and try again.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-600 dark:text-zinc-300">
                    Detected:{" "}
                    <span className="font-bold text-zinc-900 dark:text-zinc-50">
                      {prediction?.letter}
                    </span>
                  </span>
                  {prediction && prediction.confidence > 0 && (
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {prediction.confidence}% confidence
                    </span>
                  )}
                </div>
                <p
                  className={`text-base font-semibold ${
                    status === "correct"
                      ? "text-green-700 dark:text-green-300"
                      : "text-red-700 dark:text-red-300"
                  }`}
                >
                  {status === "correct" ? "✓ Correct!" : "✗ Incorrect — try again"}
                </p>
              </>
            )}
          </div>
        )}

        {/* Next letter */}
        {(status === "correct" || status === "incorrect" || status === "nodetection") && (
          <button
            onClick={handleNext}
            className="w-full h-12 rounded-2xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Next Letter →
          </button>
        )}
      </div>
    </div>
  );
}
