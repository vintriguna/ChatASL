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
        className="btn-secondary w-full h-14 text-sm"
      >
        {isLoading ? "Coaching..." : "✨ Ask AI Coach"}
      </button>

      {(currentFeedback || currentError) && !isDismissed && (
        <div
          className={`fixed inset-x-4 bottom-4 z-20 mx-auto max-w-2xl rounded-[2rem] glass ghost-border ambient-shadow px-5 py-4 pr-12 text-sm text-on-surface transition-opacity duration-[250ms] ${
            isDismissing ? "opacity-0" : "opacity-100"
          }`}
        >
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close AI coach feedback"
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
          >
            ✕
          </button>
          {currentError ? (
            <p className="font-medium text-amber-700">{currentError}</p>
          ) : (
            currentFeedback && (
              <div className="grid gap-1.5">
                <p>
                  <span className="font-semibold text-on-surface">Coach:</span>{" "}
                  {currentFeedback.summary}
                </p>
                <p className="text-on-surface-variant">{currentFeedback.correction}</p>
                <p className="text-primary font-medium">{currentFeedback.nextStep}</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
