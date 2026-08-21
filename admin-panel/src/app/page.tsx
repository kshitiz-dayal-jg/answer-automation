"use client";

import { useEffect, useState } from "react";

type Stats = {
  quizCount: number;
  questionCount: number;
};

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/stats");
        if (!res.ok) throw new Error("Failed to fetch stats");
        const data = await res.json();
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {!stats && !error ? (
        <p className="text-black/60 dark:text-white/60">Loading...</p>
      ) : stats ? (
        <div className="grid max-w-md grid-cols-2 gap-4">
          <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
            <div className="text-sm text-black/60 dark:text-white/60">Quizzes</div>
            <div className="text-3xl font-semibold">{stats.quizCount}</div>
          </div>
          <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
            <div className="text-sm text-black/60 dark:text-white/60">Questions</div>
            <div className="text-3xl font-semibold">{stats.questionCount}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
