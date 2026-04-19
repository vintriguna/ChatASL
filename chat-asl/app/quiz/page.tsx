"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useWebcam } from "../hooks/useWebcam";

const LETTERS = "ABCDEFGHIKLMNOPQRSTUVWXY".split(""); // J and Z omitted (motion-based, undetectable)
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
      <div className="flex flex-col flex-1 items-center justify-center bg-surface px-4 py-12">
        <div className="w-full max-w-md flex flex-col gap-6">
          <div className="text-center flex flex-col gap-1">
            <h2 className="font-display text-3xl font-bold text-on-surface">Session Complete</h2>
            <p className="text-on-surface-variant text-sm">
              {saving ? "Saving…" : saveError ?? "Results saved."}
            </p>
          </div>

          <div className="card flex flex-col items-center gap-1">
            <span className="font-display text-6xl font-bold text-on-surface">
              {correctCount}/{SESSION_LENGTH}
            </span>
            <span className="text-on-surface-variant text-sm">correct</span>
          </div>

          <div className="flex flex-col gap-2">
            {attempts.map((a, i) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded-[1.5rem] px-4 py-3 ${
                  a.isCorrect ? "bg-green-50" : "bg-red-50"
                }`}
              >
                <span className="font-display font-semibold text-on-surface">{a.targetLetter}</span>
                <span className="text-sm text-on-surface-variant">
                  {a.detectedLetter ? `Detected: ${a.detectedLetter}` : "Not detected"}
                  {a.confidence ? ` (${a.confidence}%)` : ""}
                </span>
                <span className={a.isCorrect ? "text-tertiary font-bold" : "text-error font-bold"}>
                  {a.isCorrect ? "✓" : "✗"}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={handleRetry} className="btn-primary w-full h-12 text-sm">
              Try Again
            </button>
            <Link
              href="/"
              className="flex h-12 items-center justify-center btn-secondary text-sm"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md flex flex-col gap-6">

        {/* Progress bar + counter */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-surface-container-high">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${((currentIndex) / SESSION_LENGTH) * 100}%` }}
            />
          </div>
          <span className="text-sm text-on-surface-variant shrink-0">
            {currentIndex + 1}/{SESSION_LENGTH}
          </span>
        </div>

        {/* Target letter */}
        <div className="card flex flex-col items-center gap-1">
          <p className="text-sm font-medium text-on-surface-variant uppercase tracking-widest">
            Sign this letter
          </p>
          <span className="font-display text-[8rem] leading-none font-bold text-on-surface select-none">
            {target}
          </span>
        </div>

        {/* Webcam */}
        <div className="relative w-full overflow-hidden rounded-[2rem] bg-zinc-900 ghost-border ambient-shadow aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
          {checkStatus === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center glass rounded-[2rem]">
              <span className="text-on-surface text-sm font-medium">Checking…</span>
            </div>
          )}
        </div>

        {/* Check button */}
        <button
          onClick={handleCheck}
          disabled={checkStatus === "loading"}
          className="btn-primary w-full h-14 text-base"
        >
          {checkStatus === "loading" ? "Checking…" : "Check My Sign"}
        </button>

        {/* Feedback */}
        {(checkStatus === "correct" || checkStatus === "incorrect" || checkStatus === "nodetection" || checkStatus === "error") && (
          <div
            className={`rounded-[2rem] px-5 py-4 flex flex-col gap-2 ${
              checkStatus === "correct"
                ? "bg-green-50"
                : checkStatus === "incorrect"
                ? "bg-red-50"
                : "bg-amber-50"
            }`}
          >
            {checkStatus === "error" ? (
              <p className="text-sm font-medium text-amber-700">Something went wrong — try again.</p>
            ) : checkStatus === "nodetection" ? (
              <p className="text-sm font-medium text-amber-700">No sign detected — make sure your hand is visible.</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-on-surface-variant">
                    Detected: <span className="font-bold text-on-surface">{currentPrediction?.letter}</span>
                  </span>
                  {currentPrediction && currentPrediction.confidence > 0 && (
                    <span className="text-sm text-on-surface-variant">{currentPrediction.confidence}%</span>
                  )}
                </div>
                <p className={`text-base font-semibold ${checkStatus === "correct" ? "text-tertiary" : "text-error"}`}>
                  {checkStatus === "correct" ? "✓ Correct!" : "✗ Incorrect"}
                </p>
              </>
            )}
          </div>
        )}

        {/* Next / skip */}
        {(checkStatus === "correct" || checkStatus === "incorrect" || checkStatus === "nodetection") && (
          <button onClick={handleNext} className="btn-secondary w-full h-12 text-sm">
            {isLastLetter ? "See Results →" : "Next Letter →"}
          </button>
        )}
      </div>
    </div>
  );
}
