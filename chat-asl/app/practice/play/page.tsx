"use client";

import { Suspense, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CoachHelp } from "../../components/CoachHelp";
import { useWebcam } from "../../hooks/useWebcam";

const LETTERS = "ABCDEFGHIKLMNOPQRSTUVWXY".split(""); // J and Z omitted (motion-based, undetectable)
const LETTER_GROUPS = {
  all: LETTERS,
  af: ["A","B","C","D","E","F"],
  gm: ["G","H","I","K","L","M"],
  nt: ["N","O","P","Q","R","S","T"],
  uz: ["U","V","W","X","Y"],
} as const;

type LetterGroup = keyof typeof LETTER_GROUPS;
type Status = "idle" | "loading" | "correct" | "incorrect" | "error" | "nodetection";

interface Prediction {
  letter: string;
  confidence: number;
}

function randomLetter(pool: readonly string[], exclude?: string): string {
  const filtered = exclude ? pool.filter((l) => l !== exclude) : pool;
  const source = filtered.length > 0 ? filtered : pool;
  if (source.length === 0) return "A";
  return source[Math.floor(Math.random() * source.length)];
}

function parseLetterGroup(raw: string | null): LetterGroup {
  if (!raw) return "all";
  if (raw in LETTER_GROUPS) return raw as LetterGroup;
  return "all";
}

function getGroupLetters(group: LetterGroup): readonly string[] {
  return LETTER_GROUPS[group];
}

function getRandomLetterForGroup(group: LetterGroup, exclude?: string): string {
  return randomLetter(getGroupLetters(group), exclude);
}

function getGroupLabel(group: LetterGroup): string {
  switch (group) {
    case "af": return "A-F";
    case "gm": return "G-M";
    case "nt": return "N-T";
    case "uz": return "U-Z";
    default: return "All";
  }
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

function PracticePlayPageContent({ letterGroup }: { letterGroup: LetterGroup }) {
  const [target, setTarget] = useState(() => getRandomLetterForGroup(letterGroup));
  const [status, setStatus] = useState<Status>("idle");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [coachResetKey, setCoachResetKey] = useState(0);
  const { videoRef, captureFrame } = useWebcam();

  const handleCheck = useCallback(async () => {
    const frame = captureFrame();
    if (!frame) return;
    setCoachResetKey((prev) => prev + 1);
    setStatus("loading");
    setPrediction(null);
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
      setPrediction(pred);
      setStatus(pred.letter === target ? "correct" : "incorrect");
    } catch {
      setStatus("error");
    }
  }, [captureFrame, target]);

  const handleNextLetter = useCallback(() => {
    setTarget((prev) => getRandomLetterForGroup(letterGroup, prev));
    setCoachResetKey((prev) => prev + 1);
    setStatus("idle");
    setPrediction(null);
  }, [letterGroup]);

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-on-surface-variant hover:text-on-surface transition-colors">
            {"← Back"}
          </Link>
          <h1 className="font-display text-xl font-bold text-on-surface">Practice Mode</h1>
          <Link href="/practice" className="text-sm text-on-surface-variant hover:text-on-surface transition-colors">
            Change
          </Link>
        </div>

        {/* Letter card */}
        <div className="card flex flex-col items-center gap-1">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-widest">
            Set: {getGroupLabel(letterGroup)}
          </p>
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
          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center glass rounded-[2rem]">
              <span className="text-on-surface text-sm font-medium">Checking...</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCheck}
            disabled={status === "loading"}
            className="btn-primary w-full h-14 text-base"
          >
            {status === "loading" ? "Checking..." : "Check My Sign"}
          </button>

          <CoachHelp
            targetLetter={target}
            mode="practice"
            prediction={prediction}
            resetKey={coachResetKey}
            classifierStatus={status}
            captureFrame={captureFrame}
          />
        </div>

        {/* Feedback card */}
        {(status === "correct" || status === "incorrect" || status === "error" || status === "nodetection") && (
          <div
            className={`rounded-[2rem] px-5 py-4 flex flex-col gap-2 ${
              status === "correct"
                ? "bg-green-50"
                : status === "incorrect"
                ? "bg-red-50"
                : "bg-amber-50"
            }`}
          >
            {status === "error" ? (
              <p className="text-sm font-medium text-amber-700">Something went wrong - try again.</p>
            ) : status === "nodetection" ? (
              <p className="text-sm font-medium text-amber-700">
                No sign detected - make sure your hand is visible and try again.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-on-surface-variant">
                    Detected:{" "}
                    <span className="font-bold text-on-surface">{prediction?.letter}</span>
                  </span>
                  {prediction && prediction.confidence > 0 && (
                    <span className="text-sm text-on-surface-variant">{prediction.confidence}% confidence</span>
                  )}
                </div>
                <p className={`text-base font-semibold ${status === "correct" ? "text-tertiary" : "text-error"}`}>
                  {status === "correct" ? "Correct!" : "Incorrect — try again"}
                </p>
              </>
            )}
          </div>
        )}

        {(status === "correct" || status === "incorrect" || status === "nodetection") && (
          <button
            onClick={handleNextLetter}
            className="btn-secondary w-full h-12 text-sm"
          >
            {"Next Letter →"}
          </button>
        )}
      </div>
    </div>
  );
}

function PracticePlayPageWithParams() {
  const searchParams = useSearchParams();
  const letterGroup = parseLetterGroup(searchParams.get("group"));
  return <PracticePlayPageContent key={letterGroup} letterGroup={letterGroup} />;
}

export default function PracticePlayPage() {
  return (
    <Suspense fallback={null}>
      <PracticePlayPageWithParams />
    </Suspense>
  );
}
