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
      <div className="h-4 rounded-full bg-surface-container-high w-full" />
      <div className="h-4 rounded-full bg-surface-container-high w-5/6" />
      <div className="h-4 rounded-full bg-surface-container-high w-4/6" />
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="card-sm animate-pulse">
      <div className="h-3 rounded-full bg-surface-container-high w-20" />
      <div className="mt-3 h-9 rounded-full bg-surface-container-high w-24" />
    </div>
  );
}

const ALL_LETTERS = "ABCDEFGHIKLMNOPQRSTUVWXY".split(""); // J and Z omitted

function accuracyColor(pct: number, attempts: number) {
  if (attempts === 0) return "#e6deff"; // surface-container-high — not yet practiced
  if (pct >= 80) return "#4ade80"; // green-400
  if (pct >= 50) return "#fbbf24"; // amber-400
  return "#f87171"; // red-400
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatRow[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

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

  const radarData = useMemo(
    () => chartData.filter((d) => d.attempts > 0),
    [chartData]
  );

  return (
    <div className="flex flex-col flex-1 items-center bg-surface px-4 py-10">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        <h1 className="font-display text-2xl font-bold text-on-surface">Dashboard</h1>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statsLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : statsError ? (
            <div className="col-span-3 rounded-[2rem] bg-red-50 px-5 py-4 text-sm text-error">
              {statsError}
            </div>
          ) : (
            <>
              <div className="card-sm">
                <p className="text-xs uppercase tracking-widest text-on-surface-variant font-medium">Attempts</p>
                <p className="mt-2 font-display text-4xl font-bold text-on-surface">{totals.attempts}</p>
              </div>
              <div className="card-sm">
                <p className="text-xs uppercase tracking-widest text-on-surface-variant font-medium">Accuracy</p>
                <p className="mt-2 font-display text-4xl font-bold text-on-surface">
                  {(totals.accuracy * 100).toFixed(0)}%
                </p>
              </div>
              <div className="card-sm">
                <p className="text-xs uppercase tracking-widest text-on-surface-variant font-medium">Focus Letters</p>
                {aiLoading ? (
                  <div className="mt-3 h-9 rounded-full bg-surface-container-high w-28 animate-pulse" />
                ) : aiData && aiData.focusLetters.length > 0 ? (
                  <p className="mt-2 font-display text-4xl font-bold text-on-surface">
                    {aiData.focusLetters.join(", ").toUpperCase()}
                  </p>
                ) : (
                  <>
                    <p className="mt-2 font-display text-4xl font-bold text-on-surface">None</p>
                    <p className="mt-2 text-sm text-tertiary font-medium">
                      Nice work! No focus letters right now.
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Gemini Insights */}
        <div className="card">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant font-medium mb-4">Gemini Insights</p>
          {aiLoading ? (
            <AiSkeleton />
          ) : aiError ? (
            <p className="text-sm text-error">{aiError}</p>
          ) : aiData ? (
            <>
              <p className="text-on-surface leading-relaxed">{aiData.summary}</p>
              <p className="mt-3 text-sm text-on-surface-variant">Tip: {aiData.coachTip}</p>
            </>
          ) : null}
        </div>

        {!statsLoading && !statsError && chartData.length > 0 && (
          <>
            {/* Radar chart */}
            <div className="card">
              <p className="text-xs uppercase tracking-widest text-on-surface-variant font-medium mb-1">Skill Balance</p>
              <p className="text-xs text-on-surface-variant opacity-70 mb-4">How evenly spread is your accuracy across all letters?</p>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid stroke="#e6deff" />
                  <PolarAngleAxis
                    dataKey="letter"
                    tick={{ fontSize: 11, fill: "#5e5680" }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: "#b0a7d6" }}
                    tickCount={4}
                  />
                  <Radar
                    dataKey="accuracy"
                    stroke="#4647d3"
                    fill="#4647d3"
                    fillOpacity={0.2}
                  />
                  <Tooltip
                    formatter={(value) => [`${value ?? 0}%`, "Accuracy"]}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 16,
                      border: "1px solid rgba(176,167,214,0.15)",
                      background: "#ffffff",
                      boxShadow: "0px 20px 40px rgba(48,41,80,0.06)",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Per-letter accuracy bar chart */}
            <div className="card">
              <p className="text-xs uppercase tracking-widest text-on-surface-variant font-medium mb-4">Per-Letter Accuracy</p>
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
                    tick={{ fontSize: 11, fill: "#b0a7d6" }}
                    tickFormatter={(v: number) => `${v}%`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="letter"
                    tick={{ fontSize: 12, fontWeight: 600, fill: "#5e5680" }}
                    width={22}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(70,71,211,0.04)" }}
                    formatter={(value, _name, props) => [
                      `${value ?? 0}% (${(props.payload as { attempts?: number })?.attempts ?? 0} tries)`,
                      "Accuracy",
                    ]}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 16,
                      border: "1px solid rgba(176,167,214,0.15)",
                      background: "#ffffff",
                      boxShadow: "0px 20px 40px rgba(48,41,80,0.06)",
                    }}
                  />
                  <Bar dataKey="accuracy" radius={[0, 6, 6, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={entry.letter} fill={accuracyColor(entry.accuracy, entry.attempts)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 flex items-center gap-4 text-xs text-on-surface-variant">
                <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-400" />≥ 80%</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />50–79%</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400" />&lt; 50%</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-surface-container-high" />Not yet practiced</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
