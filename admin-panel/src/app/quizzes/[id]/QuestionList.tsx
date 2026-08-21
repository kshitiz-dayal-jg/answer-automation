"use client";

import { useState } from "react";
import type { Suggestion } from "@/lib/answerSuggestions";

type Question = {
  id: number;
  text: string;
  options: string[];
};

export function QuestionList({ quizId, questions }: { quizId: number; questions: Question[] }) {
  const [suggestions, setSuggestions] = useState<Record<number, Suggestion | null> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleFetchAnswer() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/quizzes/${quizId}/answers`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong");
      setSuggestions(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <button
          type="button"
          onClick={handleFetchAnswer}
          disabled={pending}
          className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Fetching..." : "Fetch Answer"}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <ol className="flex flex-col gap-4">
        {questions.map((question, index) => {
          const suggestion = suggestions?.[question.id];
          return (
            <li key={question.id} className="rounded-md border border-black/10 p-4 dark:border-white/10">
              <div className="mb-2 font-medium">
                {index + 1}. {question.text}
              </div>
              <ul className="flex flex-col gap-1">
                {question.options.map((option, optionIndex) => (
                  <li
                    key={optionIndex}
                    className={`rounded px-2 py-1 text-sm ${
                      suggestion?.suggestedOptionIndex === optionIndex
                        ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                        : ""
                    }`}
                  >
                    {option}
                    {suggestion?.suggestedOptionIndex === optionIndex ? " ✓ suggested" : ""}
                  </li>
                ))}
              </ul>
              {suggestions !== null && (
                <div className="mt-2 text-sm">
                  {suggestion ? (
                    <>
                      <p className="font-medium text-green-700 dark:text-green-400">
                        Suggested answer: {suggestion.answer}
                        {suggestion.suggestedOptionIndex === null && (
                          <span className="ml-1 font-normal text-amber-600 dark:text-amber-400">
                            (not one of the given options)
                          </span>
                        )}
                      </p>
                      <p className="text-black/60 dark:text-white/60">{suggestion.summary}</p>
                    </>
                  ) : (
                    <p className="text-black/60 dark:text-white/60">No suggestion available for this question.</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
