"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { QuizSummary } from "@/lib/db";
import { formatMatchStartTime } from "@/lib/formatMatchStartTime";
import { DeleteQuizButton } from "./DeleteQuizButton";

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<QuizSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadQuizzes() {
    setError(null);
    try {
      const res = await fetch("/api/quizzes");
      if (!res.ok) throw new Error("Failed to fetch quizzes");
      setQuizzes(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  useEffect(() => {
    void loadQuizzes();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quizzes</h1>
        <Link
          href="/quizzes/new"
          className="rounded-md bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
        >
          New Quiz
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {quizzes === null && !error ? (
        <p className="text-black/60 dark:text-white/60">Loading...</p>
      ) : quizzes !== null && quizzes.length === 0 ? (
        <p className="text-black/60 dark:text-white/60">No quizzes yet.</p>
      ) : quizzes ? (
        <ul className="flex flex-col gap-2">
          {quizzes.map((quiz) => (
            <li
              key={quiz.id}
              className="flex items-center justify-between rounded-md border border-black/10 px-4 py-3 dark:border-white/10"
            >
              <Link href={`/quizzes/${quiz.id}`} className="flex-1">
                <div className="font-medium">
                  {quiz.teamA} vs {quiz.teamB}
                </div>
                <div className="text-sm text-black/60 dark:text-white/60">
                  {quiz.league} · {formatMatchStartTime(quiz.matchStartTime)} · {quiz.questionCount} question
                  {quiz.questionCount === 1 ? "" : "s"}
                </div>
              </Link>
              <DeleteQuizButton id={quiz.id} onDeleted={loadQuizzes} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
