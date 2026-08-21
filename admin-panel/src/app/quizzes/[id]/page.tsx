"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatMatchStartTime } from "@/lib/formatMatchStartTime";
import { QuestionList } from "./QuestionList";

type Quiz = {
  id: number;
  league: string;
  teamA: string;
  teamB: string;
  matchStartTime: string;
  questions: { id: number; text: string; options: string[] }[];
};

export default function QuizPage() {
  const { id } = useParams<{ id: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/quizzes/${id}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Failed to fetch quiz");
        if (!cancelled) setQuiz(body);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="p-8">
        <p className="text-black/60 dark:text-white/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="mb-1 text-2xl font-semibold">
        {quiz.teamA} vs {quiz.teamB}
      </h1>
      <p className="mb-6 text-sm text-black/60 dark:text-white/60">
        {quiz.league} · {formatMatchStartTime(quiz.matchStartTime)} · {quiz.questions.length} question
        {quiz.questions.length === 1 ? "" : "s"}
      </p>

      <QuestionList quizId={quiz.id} questions={quiz.questions} />
    </div>
  );
}
