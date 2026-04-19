"use client";

import { useCallback, useState } from "react";

interface Prediction {
  letter: string;
  confidence: number;
}

interface CoachFeedback {
  summary: string;
  correction: string;
  nextStep: string;
}

interface CoachHelpProps {
  targetLetter: string;
  mode: "learn" | "practice";
  prediction: Prediction | null;
  resetKey: number;
  classifierStatus:
    | "idle"
    | "loading"
    | "correct"
    | "incorrect"
    | "error"
    | "nodetection";
  captureFrame: () => string | null;
}

export function CoachHelp({
  targetLetter,
  mode,
  prediction,
  resetKey,
  classifierStatus,
  captureFrame,
}: CoachHelpProps) {
  const activeKey = `${mode}:${targetLetter}:${resetKey}`;
  const [feedback, setFeedback] = useState<{
    key: string;
    value: CoachFeedback;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ key: string; value: string } | null>(null);
  const [isDismissing, setIsDismissing] = useState(false);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  const currentFeedback = feedback?.key === activeKey ? feedback.value : null;
  const currentError = error?.key === activeKey ? error.value : null;
  const isDismissed = dismissedKey === activeKey;
  const isDisabled = isLoading || classifierStatus === "idle" || classifierStatus === "loading";

  const handleAskCoach = useCallback(async () => {
    if (currentFeedback || currentError) {
      setIsDismissing(false);
      setDismissedKey(null);
      return;
    }

    const frame = captureFrame();
    if (!frame) {
      setError({ key: activeKey, value: "Camera is not ready yet." });
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsDismissing(false);
    setDismissedKey(null);

    try {
      const res = await fetch("/api/gemini-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: frame,
          targetLetter,
          mode,
          classifierStatus,
          predictedLetter: prediction?.letter ?? null,
          confidence: prediction?.confidence ?? null,
        }),
      });

      const data: unknown = await res.json();
      if (!res.ok) {
        const message =
          data && typeof data === "object" && "error" in data
            ? String((data as { error: unknown }).error)
            : "Coach request failed.";
        throw new Error(message);
      }

      setFeedback({ key: activeKey, value: data as CoachFeedback });
    } catch (err) {
      setError({
        key: activeKey,
        value: err instanceof Error ? err.message : "Coach request failed.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    activeKey,
    captureFrame,
    classifierStatus,
    currentError,
    currentFeedback,
    mode,
    prediction,
    targetLetter,
  ]);

  const handleDismiss = useCallback(() => {
    setIsDismissing(true);
    window.setTimeout(() => {
      setDismissedKey(activeKey);
      setIsDismissing(false);
    }, 250);
  }, [activeKey]);

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleAskCoach}
        disabled={isDisabled}
        className="w-full h-10 rounded-2xl border border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200 text-sm font-semibold transition-colors disabled:opacity-50 hover:bg-violet-100 dark:hover:bg-violet-900"
      >
        {isLoading ? "Coaching..." : "✨ Ask AI Coach"}
      </button>

      {(currentFeedback || currentError) && !isDismissed && (
        <div
          className={`fixed inset-x-4 bottom-4 z-20 mx-auto max-w-2xl rounded-2xl border border-violet-200 bg-white px-4 py-3 pr-11 text-sm text-zinc-700 shadow-lg transition-opacity duration-[250ms] dark:border-violet-800 dark:bg-zinc-900 dark:text-zinc-200 ${
            isDismissing ? "opacity-0" : "opacity-100"
          }`}
        >
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close AI coach feedback"
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            X
          </button>
          {currentError ? (
            <p className="font-medium text-amber-700 dark:text-amber-300">{currentError}</p>
          ) : (
            currentFeedback && (
              <div className="grid gap-1">
                <p>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                    Coach:
                  </span>{" "}
                  {currentFeedback.summary}
                </p>
                <p>{currentFeedback.correction}</p>
                <p className="text-violet-700 dark:text-violet-300">
                  {currentFeedback.nextStep}
                </p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
