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
    case "af":
      return "A-F";
    case "gm":
      return "G-M";
    case "nt":
      return "N-T";
    case "uz":
      return "U-Z";
    default:
      return "All";
  }
}

// Response shape: { outputs: [{ predictions: { predictions: [...] } }] }
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
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            {"<- Back"}
          </Link>
          <h1 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
            Practice Mode
          </h1>
          <Link
            href="/practice"
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            Change
          </Link>
        </div>

        <div className="flex flex-col items-center gap-1 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-6">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
            Set: {getGroupLabel(letterGroup)}
          </p>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
            Sign this letter
          </p>
          <span className="text-[8rem] leading-none font-bold text-zinc-900 dark:text-zinc-50 select-none">
            {target}
          </span>
        </div>

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
              <span className="text-white text-sm font-medium">Checking...</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCheck}
            disabled={status === "loading"}
            className="w-full h-14 rounded-2xl bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-base font-semibold transition-opacity disabled:opacity-50 hover:opacity-90"
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
                Something went wrong - try again.
              </p>
            ) : status === "nodetection" ? (
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                No sign detected - make sure your hand is visible and try again.
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
                  {status === "correct" ? "Correct!" : "Incorrect - try again"}
                </p>
              </>
            )}
          </div>
        )}

        {(status === "correct" || status === "incorrect" || status === "nodetection") && (
          <button
            onClick={handleNextLetter}
            className="w-full h-12 rounded-2xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            {"Next Letter ->"}
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
