"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useWebcam } from "../hooks/useWebcam";

const LETTERS = "ABCDEFGHIKLMNOPQRSTUVWXY".split(""); // J and Z omitted (motion-based, undetectable)
const LETTER_GROUPS = {
  all: LETTERS,
  af: ["A","B","C","D","E","F"],
  gm: ["G","H","I","K","L","M"],
  nt: ["N","O","P","Q","R","S","T"],
  uz: ["U","V","W","X","Y"],
} as const;

const DEFAULT_WORD_BANK = [
  "CAT","DOG","SUN","BOOK","MILK","TREE","STAR","MOON",
  "FISH","BREAD","CHAIR","HOUSE","DAD","FACE","HILL",
  "NOON","STOP","TORN",
] as const;

type LetterGroup = keyof typeof LETTER_GROUPS;
type Status = "idle" | "loading" | "correct" | "incorrect" | "error" | "nodetection" | "wordcomplete";

interface Prediction {
  letter: string;
  confidence: number;
}

function randomItem(pool: readonly string[], exclude?: string): string {
  const filtered = exclude ? pool.filter((item) => item !== exclude) : pool;
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

function wordFitsGroup(word: string, group: LetterGroup): boolean {
  const groupLetters = new Set(getGroupLetters(group));
  return word.split("").every((letter) => groupLetters.has(letter));
}

function getWordPoolForGroup(group: LetterGroup, bank: readonly string[]): readonly string[] {
  const filtered = bank.filter((word) => wordFitsGroup(word, group));
  return filtered.length > 0 ? filtered : bank;
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

const wordCache = new Map<LetterGroup, readonly string[]>();

function SpellPageContent({ letterGroup }: { letterGroup: LetterGroup }) {
  const [wordBank, setWordBank] = useState<readonly string[]>(() =>
    wordCache.get(letterGroup) ?? getWordPoolForGroup(letterGroup, DEFAULT_WORD_BANK)
  );
  const [spellWord, setSpellWord] = useState(() => {
    const pool = wordCache.get(letterGroup) ?? getWordPoolForGroup(letterGroup, DEFAULT_WORD_BANK);
    return randomItem(pool);
  });
  const [spellIndex, setSpellIndex] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [isGeneratingWords, setIsGeneratingWords] = useState(!wordCache.has(letterGroup));
  const [wordError, setWordError] = useState<string | null>(null);
  const { videoRef, captureFrame } = useWebcam();

  useEffect(() => {
    if (wordCache.has(letterGroup)) return;
    let cancelled = false;

    const loadWords = async () => {
      setIsGeneratingWords(true);
      setWordError(null);
      try {
        const res = await fetch("/api/gemini-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wordCount: 20,
            prompt: `Only include words that are fully spellable using this letter set: ${getGroupLabel(letterGroup)}.`,
          }),
        });
        if (!res.ok) throw new Error("Could not generate words right now");
        const data = (await res.json()) as { words?: string[] };
        const generated = (data.words ?? [])
          .map((word) => word.toUpperCase())
          .filter((word) => /^[A-IK-Y]{4}$/.test(word));
        const nextPool = getWordPoolForGroup(
          letterGroup,
          generated.length > 0 ? generated : DEFAULT_WORD_BANK
        );
        if (cancelled) return;
        wordCache.set(letterGroup, nextPool);
        setWordBank(nextPool);
        setSpellWord(randomItem(nextPool));
        setSpellIndex(0);
        setStatus("idle");
        setPrediction(null);
      } catch {
        const fallbackPool = getWordPoolForGroup(letterGroup, DEFAULT_WORD_BANK);
        if (cancelled) return;
        setWordError("Using fallback words while Gemini is unavailable.");
        setWordBank(fallbackPool);
        setSpellWord(randomItem(fallbackPool));
        setSpellIndex(0);
        setStatus("idle");
        setPrediction(null);
      } finally {
        if (!cancelled) setIsGeneratingWords(false);
      }
    };

    loadWords();
    return () => { cancelled = true; };
  }, [letterGroup]);

  const expectedLetter = spellWord[spellIndex] ?? "A";

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
      if (!res.ok) { setStatus("error"); return; }
      const data: unknown = await res.json();
      const pred = parseRoboflowResponse(data);
      if (pred === null) { setStatus("error"); return; }
      if (pred === "empty") { setStatus("nodetection"); return; }
      setPrediction(pred);
      if (pred.letter !== expectedLetter) { setStatus("incorrect"); return; }
      const isLastLetter = spellIndex >= spellWord.length - 1;
      setStatus(isLastLetter ? "wordcomplete" : "correct");
      if (!isLastLetter) setSpellIndex((prev) => prev + 1);
    } catch {
      setStatus("error");
    }
  }, [captureFrame, expectedLetter, spellIndex, spellWord.length]);

  const handleSkipLetter = useCallback(() => {
    const isLastLetter = spellIndex >= spellWord.length - 1;
    if (isLastLetter) { setStatus("wordcomplete"); setPrediction(null); return; }
    setSpellIndex((prev) => prev + 1);
    setStatus("idle");
    setPrediction(null);
  }, [spellIndex, spellWord.length]);

  const handleSkipWord = useCallback(() => {
    setSpellWord((prev) => randomItem(wordBank, prev));
    setSpellIndex(0);
    setStatus("idle");
    setPrediction(null);
  }, [wordBank]);

  const handleNextWord = useCallback(() => {
    setSpellWord((prev) => randomItem(wordBank, prev));
    setSpellIndex(0);
    setStatus("idle");
    setPrediction(null);
  }, [wordBank]);

  if (isGeneratingWords) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-surface px-4 py-12">
        <div className="card w-full max-w-md text-center">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-widest">
            Set: {getGroupLabel(letterGroup)}
          </p>
          <h1 className="font-display mt-3 text-xl font-bold text-on-surface">
            Generating Words
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            Building a personalized spell list based on your letter stats...
          </p>
          <div className="mt-6 flex flex-col items-center gap-2">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-surface-container-high border-t-primary" />
            <p className="text-xs text-on-surface-variant animate-pulse">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md flex flex-col gap-6">
        {/* Sub-page back link */}
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-on-surface-variant hover:text-on-surface transition-colors">
            ← Back
          </Link>
          <h1 className="font-display text-xl font-bold text-on-surface">Spell Mode</h1>
          <Link href="/spell" className="text-sm text-on-surface-variant hover:text-on-surface transition-colors">
            Reset
          </Link>
        </div>

        {/* Word + letter card */}
        <div className="card flex flex-col items-center gap-2">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-widest">
            Set: {getGroupLabel(letterGroup)}
          </p>
          <p className="text-sm font-medium text-on-surface-variant uppercase tracking-widest">
            Spell this word
          </p>
          <div className="flex items-center gap-2 font-display text-2xl font-bold text-on-surface">
            {spellWord.split("").map((letter, index) => (
              <span
                key={`${letter}-${index}`}
                className={index === spellIndex ? "underline underline-offset-8 text-primary" : "opacity-40"}
              >
                {letter}
              </span>
            ))}
          </div>
          <p className="text-xs text-on-surface-variant">
            Letter {spellIndex + 1} of {spellWord.length}
          </p>
          {wordError && (
            <p className="text-xs text-amber-700">{wordError}</p>
          )}
          <span className="font-display text-[7rem] leading-none font-bold text-on-surface select-none">
            {expectedLetter}
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

        {/* Primary button */}
        <button
          onClick={handleCheck}
          disabled={status === "loading"}
          className="btn-primary w-full h-14 text-base"
        >
          {status === "loading" ? "Checking..." : "Check This Letter"}
        </button>

        {/* Feedback */}
        {(status === "correct" || status === "incorrect" || status === "error" ||
          status === "nodetection" || status === "wordcomplete") && (
          <div
            className={`rounded-[2rem] px-5 py-4 flex flex-col gap-2 ${
              status === "correct" || status === "wordcomplete"
                ? "bg-green-50"
                : status === "incorrect"
                ? "bg-red-50"
                : "bg-amber-50"
            }`}
          >
            {status === "error" ? (
              <p className="text-sm font-medium text-amber-700">Something went wrong — try again.</p>
            ) : status === "nodetection" ? (
              <p className="text-sm font-medium text-amber-700">No sign detected — make sure your hand is visible.</p>
            ) : status === "wordcomplete" ? (
              <p className="text-sm font-semibold text-tertiary">Word complete! Nice spelling.</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-on-surface-variant">
                    Detected: <span className="font-bold text-on-surface">{prediction?.letter}</span>
                  </span>
                  {prediction && prediction.confidence > 0 && (
                    <span className="text-sm text-on-surface-variant">{prediction.confidence}% confidence</span>
                  )}
                </div>
                <p className={`text-base font-semibold ${status === "correct" ? "text-tertiary" : "text-error"}`}>
                  {status === "correct" ? "Correct — moving to next letter" : "Incorrect — try again"}
                </p>
              </>
            )}
          </div>
        )}

        {/* Skip controls */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleSkipLetter}
            disabled={status === "loading" || status === "wordcomplete"}
            className="btn-secondary h-12 text-sm"
          >
            Skip Letter
          </button>
          <button
            onClick={handleSkipWord}
            disabled={status === "loading"}
            className="btn-secondary h-12 text-sm"
          >
            Skip Word
          </button>
        </div>

        {status === "wordcomplete" && (
          <button onClick={handleNextWord} className="btn-secondary w-full h-12 text-sm">
            Next Word →
          </button>
        )}
      </div>
    </div>
  );
}

function SpellPageWithParams() {
  const searchParams = useSearchParams();
  const letterGroup = parseLetterGroup(searchParams.get("group"));
  return <SpellPageContent key={letterGroup} letterGroup={letterGroup} />;
}

export default function SpellPage() {
  return (
    <Suspense fallback={null}>
      <SpellPageWithParams />
    </Suspense>
  );
}
