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
          className={`fixed inset-0 z-50 flex items-center justify-center p-6 transition-opacity duration-[250ms] ${
            isDismissing ? "opacity-0" : "opacity-100"
          }`}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[rgba(48,41,80,0.4)] backdrop-blur-sm"
            onClick={handleDismiss}
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="relative z-10 card w-full max-w-md flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="font-display text-xl font-bold text-on-surface">AI Coach</p>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Close AI coach feedback"
                className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
              >
                ✕
              </button>
            </div>

            {currentError ? (
              <p className="text-base font-medium text-amber-700">{currentError}</p>
            ) : (
              currentFeedback && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Summary</p>
                    <p className="text-base text-on-surface leading-relaxed">{currentFeedback.summary}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Correction</p>
                    <p className="text-base text-on-surface leading-relaxed">{currentFeedback.correction}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Next Step</p>
                    <p className="text-base font-medium text-primary leading-relaxed">{currentFeedback.nextStep}</p>
                  </div>
                </div>
              )
            )}

            <button
              type="button"
              onClick={handleDismiss}
              className="btn-primary h-12 text-sm"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
