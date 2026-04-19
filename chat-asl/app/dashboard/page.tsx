"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

interface StatRow {
  letter: string;
  correctCount: number;
  incorrectCount: number;
  attempts: number;
  accuracy: number;
}

interface LetterStatsResponse {
  stats?: StatRow[];
  error?: string;
}

interface AiInsights {
  summary: string;
  coachTip: string;
  focusLetters: string[];
}

interface GeminiStatsResponse {
  summary?: string;
  coachTip?: string;
  focusLetters?: string[];
  error?: string;
}

function AiSkeleton() {
  return (
    <div className="animate-pulse flex flex-col gap-3">
      <div className="h-4 rounded bg-zinc-200 dark:bg-zinc-700 w-full" />
      <div className="h-4 rounded bg-zinc-200 dark:bg-zinc-700 w-5/6" />
      <div className="h-4 rounded bg-zinc-200 dark:bg-zinc-700 w-4/6" />
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 animate-pulse">
      <div className="h-3 rounded bg-zinc-200 dark:bg-zinc-700 w-20" />
      <div className="mt-3 h-9 rounded bg-zinc-200 dark:bg-zinc-700 w-24" />
    </div>
  );
}

const ALL_LETTERS = "ABCDEFGHIKLMNOPQRSTUVWXY".split(""); // J and Z omitted

function accuracyColor(pct: number, attempts: number) {
  if (attempts === 0) return "#d4d4d8"; // zinc-300 — not yet practiced
  if (pct >= 80) return "#4ade80"; // green-400
  if (pct >= 50) return "#fbbf24"; // amber-400
  return "#f87171"; // red-400
}

export default function DashboardPage() {
  // Fast path: raw letter stats (DB only)
  const [stats, setStats] = useState<StatRow[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // Slow path: Gemini AI insights
  const [aiData, setAiData] = useState<AiInsights | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/letter-stats");
        const data = (await res.json()) as LetterStatsResponse;
        if (!res.ok) throw new Error(data.error ?? "Could not load stats");
        if (!cancelled) setStats(data.stats ?? []);
      } catch (err) {
        if (!cancelled) setStatsError(err instanceof Error ? err.message : "Could not load stats");
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/gemini-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "stats",
            prompt: "Summarize this user's ASL letter performance for a dashboard.",
          }),
        });
        const data = (await res.json()) as GeminiStatsResponse;
        if (!res.ok) throw new Error(data.error ?? "Could not load AI insights");
        if (!cancelled) {
          setAiData({
            summary: data.summary ?? "No summary available.",
            coachTip: data.coachTip ?? "No coaching tip available.",
            focusLetters: data.focusLetters ?? [],
          });
        }
      } catch (err) {
        if (!cancelled) setAiError(err instanceof Error ? err.message : "Could not load AI insights");
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const totals = useMemo(() => {
    const correct = stats.reduce((acc, row) => acc + row.correctCount, 0);
    const incorrect = stats.reduce((acc, row) => acc + row.incorrectCount, 0);
    const attempts = correct + incorrect;
    const accuracy = attempts > 0 ? correct / attempts : 0;
    return { correct, incorrect, attempts, accuracy };
  }, [stats]);

  // Bar chart: always show all 24 letters, zeros for unpracticed
  const chartData = useMemo(() => {
    const byLetter = new Map(stats.map((row) => [row.letter.toUpperCase(), row]));
    return ALL_LETTERS.map((letter) => {
      const row = byLetter.get(letter);
      return {
        letter,
        accuracy: row ? Math.round(row.accuracy * 100) : 0,
        attempts: row?.attempts ?? 0,
      };
    });
  }, [stats]);

  // Radar chart: only letters with at least one attempt
  const radarData = useMemo(
    () => chartData.filter((d) => d.attempts > 0),
    [chartData]
  );

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

        {/* Stat cards — render as soon as letter-stats resolves */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {statsLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : statsError ? (
            <div className="col-span-3 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-5 py-4 text-sm text-red-700 dark:text-red-300">
              {statsError}
            </div>
          ) : (
            <>
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
              {/* Focus Letters — from AI path, shimmer while pending */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Focus Letters</p>
                {aiLoading ? (
                  <div className="mt-3 h-9 rounded bg-zinc-200 dark:bg-zinc-700 w-28 animate-pulse" />
                ) : aiData && aiData.focusLetters.length > 0 ? (
                  <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                    {aiData.focusLetters.join(", ").toUpperCase()}
                  </p>
                ) : (
                  <>
                    <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">None</p>
                    <p className="mt-2 text-sm text-green-700 dark:text-green-300">
                      Nice work! No focus letters right now.
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Gemini Insights — loads independently, skeleton while pending */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <p className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-3">Gemini Insights</p>
          {aiLoading ? (
            <AiSkeleton />
          ) : aiError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{aiError}</p>
          ) : aiData ? (
            <>
              <p className="text-zinc-800 dark:text-zinc-100">{aiData.summary}</p>
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">Tip: {aiData.coachTip}</p>
            </>
          ) : null}
        </div>

        {!statsLoading && !statsError && chartData.length > 0 && (
          <>
            {/* Radar chart — skill balance overview */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <p className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-1">Skill Balance</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4">How evenly spread is your accuracy across all letters?</p>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid stroke="#d4d4d8" />
                  <PolarAngleAxis
                    dataKey="letter"
                    tick={{ fontSize: 11, fill: "#71717a" }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: "#a1a1aa" }}
                    tickCount={4}
                  />
                  <Radar
                    dataKey="accuracy"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.25}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, "Accuracy"]}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e4e4e7",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Horizontal bar chart — per-letter accuracy */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <p className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-4">Per-Letter Accuracy</p>
              <ResponsiveContainer width="100%" height={Math.max(chartData.length * 26, 200)}>
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 8, right: 48, bottom: 8, left: 4 }}
                  barSize={14}
                >
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#a1a1aa" }}
                    tickFormatter={(v: number) => `${v}%`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="letter"
                    tick={{ fontSize: 12, fontWeight: 600, fill: "#52525b" }}
                    width={22}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    formatter={(value: number, _name: string, props: { payload?: { attempts?: number } }) => [
                      `${value}% (${props.payload?.attempts ?? 0} tries)`,
                      "Accuracy",
                    ]}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e4e4e7",
                    }}
                  />
                  <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={entry.letter} fill={accuracyColor(entry.accuracy, entry.attempts)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 flex items-center gap-4 text-xs text-zinc-400 dark:text-zinc-500">
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-green-400" />≥ 80%</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-amber-400" />50–79%</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-400" />&lt; 50%</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-zinc-300" />Not yet practiced</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
