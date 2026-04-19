"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useWebcam } from "../hooks/useWebcam";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const SESSION_LENGTH = 5;

function pickSessionLetters(): string[] {
  const shuffled = [...LETTERS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, SESSION_LENGTH);
}

type CheckStatus = "idle" | "loading" | "correct" | "incorrect" | "nodetection" | "error";

interface Attempt {
  targetLetter: string;
  detectedLetter: string | null;
  confidence: number | null;
  isCorrect: boolean;
}

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

type Phase = "quiz" | "summary";

export default function QuizPage() {
  const [sessionLetters] = useState(() => pickSessionLetters());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [checkStatus, setCheckStatus] = useState<CheckStatus>("idle");
  const [currentPrediction, setCurrentPrediction] = useState<Prediction | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [phase, setPhase] = useState<Phase>("quiz");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { videoRef, captureFrame } = useWebcam();

  const target = sessionLetters[currentIndex];
  const isLastLetter = currentIndex === SESSION_LENGTH - 1;

  const handleCheck = useCallback(async () => {
    const frame = captureFrame();
    if (!frame) return;

    setCheckStatus("loading");
    setCurrentPrediction(null);

    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: frame }),
      });

      if (!res.ok) { setCheckStatus("error"); return; }

      const data: unknown = await res.json();
      const pred = parseRoboflowResponse(data);

      if (pred === null) { setCheckStatus("error"); return; }
      if (pred === "empty") { setCheckStatus("nodetection"); return; }

      setCurrentPrediction(pred);
      setCheckStatus(pred.letter === target ? "correct" : "incorrect");
    } catch {
      setCheckStatus("error");
    }
  }, [captureFrame, target]);

  const handleNext = useCallback(async () => {
    const attempt: Attempt = {
      targetLetter: target,
      detectedLetter: currentPrediction?.letter ?? null,
      confidence: currentPrediction?.confidence ?? null,
      isCorrect: checkStatus === "correct",
    };
    const updatedAttempts = [...attempts, attempt];
    setAttempts(updatedAttempts);

    if (isLastLetter) {
      setPhase("summary");
      setSaving(true);
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attempts: updatedAttempts }),
        });
        if (!res.ok) setSaveError("Could not save session.");
      } catch {
        setSaveError("Could not save session.");
      }
      setSaving(false);
    } else {
      setCurrentIndex((i) => i + 1);
      setCheckStatus("idle");
      setCurrentPrediction(null);
    }
  }, [target, currentPrediction, checkStatus, attempts, isLastLetter]);

  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  if (phase === "summary") {
    const correctCount = attempts.filter((a) => a.isCorrect).length;
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-12">
        <div className="w-full max-w-md flex flex-col gap-6">
          <div className="text-center flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Session Complete</h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              {saving ? "Saving…" : saveError ?? "Results saved."}
            </p>
          </div>

          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-6 py-5 flex flex-col items-center gap-1">
            <span className="text-5xl font-bold text-zinc-900 dark:text-zinc-50">
              {correctCount}/{SESSION_LENGTH}
            </span>
            <span className="text-zinc-500 dark:text-zinc-400 text-sm">correct</span>
          </div>

          <div className="flex flex-col gap-2">
            {attempts.map((a, i) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
                  a.isCorrect
                    ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                    : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                }`}
              >
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">{a.targetLetter}</span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {a.detectedLetter ? `Detected: ${a.detectedLetter}` : "Not detected"}
                  {a.confidence ? ` (${a.confidence}%)` : ""}
                </span>
                <span>{a.isCorrect ? "✓" : "✗"}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleRetry}
              className="w-full h-12 rounded-2xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="flex h-12 items-center justify-center rounded-2xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-md flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
            ← Back
          </Link>
          <h1 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">Quiz Mode</h1>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {currentIndex + 1}/{SESSION_LENGTH}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-50 transition-all"
            style={{ width: `${((currentIndex) / SESSION_LENGTH) * 100}%` }}
          />
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
          {checkStatus === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="text-white text-sm font-medium">Checking…</span>
            </div>
          )}
        </div>

        {/* Check button */}
        <button
          onClick={handleCheck}
          disabled={checkStatus === "loading"}
          className="w-full h-14 rounded-2xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-base font-semibold transition-opacity disabled:opacity-50 hover:opacity-90"
        >
          {checkStatus === "loading" ? "Checking…" : "Check My Sign"}
        </button>

        {/* Feedback */}
        {(checkStatus === "correct" || checkStatus === "incorrect" || checkStatus === "nodetection" || checkStatus === "error") && (
          <div
            className={`rounded-2xl border px-5 py-4 flex flex-col gap-2 ${
              checkStatus === "correct"
                ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                : checkStatus === "incorrect"
                ? "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                : "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800"
            }`}
          >
            {checkStatus === "error" ? (
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Something went wrong — try again.</p>
            ) : checkStatus === "nodetection" ? (
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">No sign detected — make sure your hand is visible.</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-600 dark:text-zinc-300">
                    Detected: <span className="font-bold text-zinc-900 dark:text-zinc-50">{currentPrediction?.letter}</span>
                  </span>
                  {currentPrediction && currentPrediction.confidence > 0 && (
                    <span className="text-sm text-zinc-500">{currentPrediction.confidence}%</span>
                  )}
                </div>
                <p className={`text-base font-semibold ${checkStatus === "correct" ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
                  {checkStatus === "correct" ? "✓ Correct!" : "✗ Incorrect"}
                </p>
              </>
            )}
          </div>
        )}

        {/* Next / skip */}
        {(checkStatus === "correct" || checkStatus === "incorrect" || checkStatus === "nodetection") && (
          <button
            onClick={handleNext}
            className="w-full h-12 rounded-2xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {isLastLetter ? "See Results →" : "Next Letter →"}
          </button>
        )}
      </div>
    </div>
  );
}
