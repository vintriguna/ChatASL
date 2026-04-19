"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface StatRow {
  letter: string;
  correctCount: number;
  incorrectCount: number;
  attempts: number;
  accuracy: number;
}

interface DashboardResponse {
  summary?: string;
  coachTip?: string;
  focusLetters?: string[];
  stats?: StatRow[];
  error?: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [coachTip, setCoachTip] = useState("");
  const [focusLetters, setFocusLetters] = useState<string[]>([]);
  const [stats, setStats] = useState<StatRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/gemini-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "stats",
            prompt: "Summarize this user's ASL letter performance for a dashboard.",
          }),
        });

        const data = (await res.json()) as DashboardResponse;
        if (!res.ok) {
          throw new Error(data.error ?? "Could not load dashboard");
        }

        if (cancelled) return;

        setSummary(data.summary ?? "No summary available.");
        setCoachTip(data.coachTip ?? "No coaching tip available.");
        setFocusLetters(data.focusLetters ?? []);
        setStats(data.stats ?? []);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load dashboard");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => {
    const correct = stats.reduce((acc, row) => acc + row.correctCount, 0);
    const incorrect = stats.reduce((acc, row) => acc + row.incorrectCount, 0);
    const attempts = correct + incorrect;
    const accuracy = attempts > 0 ? correct / attempts : 0;
    return { correct, incorrect, attempts, accuracy };
  }, [stats]);

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-12">
        <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Loading Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Analyzing your letter stats with Gemini...</p>
          <div className="mt-6 flex items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-800 dark:border-zinc-700 dark:border-t-zinc-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 dark:bg-zinc-950 px-4 py-10">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
            {"<- Back"}
          </Link>
          <h1 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">Dashboard</h1>
          <div className="w-12" />
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-5 py-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {!error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Attempts</p>
                <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">{totals.attempts}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Accuracy</p>
                <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                  {(totals.accuracy * 100).toFixed(0)}%
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Focus Letters</p>
                <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                  {focusLetters.length > 0 ? focusLetters.join(", ").toUpperCase() : "-"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <p className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Gemini Summary</p>
              <p className="mt-3 text-zinc-800 dark:text-zinc-100">{summary}</p>
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">Tip: {coachTip}</p>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <p className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Per-Letter Stats</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-zinc-500 dark:text-zinc-400">
                      <th className="py-2">Letter</th>
                      <th className="py-2">Correct</th>
                      <th className="py-2">Incorrect</th>
                      <th className="py-2">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((row) => (
                      <tr key={row.letter} className="border-t border-zinc-100 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100">
                        <td className="py-2 font-semibold">{row.letter.toUpperCase()}</td>
                        <td className="py-2">{row.correctCount}</td>
                        <td className="py-2">{row.incorrectCount}</td>
                        <td className="py-2">{(row.accuracy * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
