"use client";

import { useState, useTransition } from "react";
import { createQuizAction } from "../actions";
import { QUESTION_TEMPLATES, hasPlayerNamePlaceholder } from "@/lib/questionTemplates";

type QuestionDraft = {
  template: string;
  playerName: string;
  options: string[];
};

const MIN_OPTIONS = 2;

function emptyQuestion(): QuestionDraft {
  return { template: "", playerName: "", options: ["", ""] };
}

export function QuizForm() {
  const [league, setLeague] = useState("");
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [matchStartTime, setMatchStartTime] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQuestion()]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateTemplate(index: number, template: string) {
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, template, playerName: "" } : q)));
  }

  function updatePlayerName(index: number, playerName: string) {
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, playerName } : q)));
  }

  function updateOption(questionIndex: number, optionIndex: number, value: string) {
    setQuestions((qs) =>
      qs.map((q, i) =>
        i === questionIndex
          ? { ...q, options: q.options.map((o, j) => (j === optionIndex ? value : o)) }
          : q,
      ),
    );
  }

  function addOption(questionIndex: number) {
    setQuestions((qs) =>
      qs.map((q, i) => (i === questionIndex ? { ...q, options: [...q.options, ""] } : q)),
    );
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    setQuestions((qs) =>
      qs.map((q, i) =>
        i === questionIndex ? { ...q, options: q.options.filter((_, j) => j !== optionIndex) } : q,
      ),
    );
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, emptyQuestion()]);
  }

  function removeQuestion(index: number) {
    setQuestions((qs) => qs.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!league.trim() || !teamA.trim() || !teamB.trim() || !matchStartTime) {
      setError("League, Team A, Team B, and match date are required");
      return;
    }
    if (questions.some((q) => !q.template || q.options.some((o) => !o.trim()))) {
      setError("Every question needs a type and all options filled in");
      return;
    }
    if (questions.some((q) => hasPlayerNamePlaceholder(q.template) && !q.playerName.trim())) {
      setError("Every question of this type needs a player name");
      return;
    }

    const finalQuestions = questions.map((q) => ({
      text: hasPlayerNamePlaceholder(q.template)
        ? q.template.replace("{playerName}", q.playerName.trim())
        : q.template,
      options: q.options,
    }));

    startTransition(async () => {
      try {
        await createQuizAction({ league, teamA, teamB, matchStartTime, questions: finalQuestions });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <label className="mb-1 block text-sm font-medium">League</label>
        <input
          value={league}
          onChange={(e) => setLeague(e.target.value)}
          className="w-full rounded-md border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-transparent"
          placeholder="e.g. Premier League"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium">Team A</label>
          <input
            value={teamA}
            onChange={(e) => setTeamA(e.target.value)}
            className="w-full rounded-md border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-transparent"
            placeholder="e.g. Arsenal"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium">Team B</label>
          <input
            value={teamB}
            onChange={(e) => setTeamB(e.target.value)}
            className="w-full rounded-md border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-transparent"
            placeholder="e.g. Chelsea"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Match date</label>
        <input
          type="date"
          value={matchStartTime}
          onChange={(e) => setMatchStartTime(e.target.value)}
          required
          className="w-full rounded-md border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-transparent [&::-webkit-calendar-picker-indicator]:invert"
        />
      </div>

      <div className="flex flex-col gap-4">
        {questions.map((question, questionIndex) => (
          <div
            key={questionIndex}
            className="flex flex-col gap-3 rounded-md border border-black/10 p-4 dark:border-white/10"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Question {questionIndex + 1}</span>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(questionIndex)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>

            <select
              value={question.template}
              onChange={(e) => updateTemplate(questionIndex, e.target.value)}
              className="w-full rounded-md border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-transparent"
            >
              <option value="">Select a question type</option>
              {QUESTION_TEMPLATES.map((template) => (
                <option key={template} value={template}>
                  {template}
                </option>
              ))}
            </select>

            {hasPlayerNamePlaceholder(question.template) && (
              <input
                value={question.playerName}
                onChange={(e) => updatePlayerName(questionIndex, e.target.value)}
                className="w-full rounded-md border border-black/20 px-3 py-2 dark:border-white/20 dark:bg-transparent"
                placeholder="Player name"
              />
            )}

            <div className="flex flex-col gap-2">
              {question.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center gap-2">
                  <input
                    value={option}
                    onChange={(e) => updateOption(questionIndex, optionIndex, e.target.value)}
                    className="flex-1 rounded-md border border-black/20 px-3 py-1.5 dark:border-white/20 dark:bg-transparent"
                    placeholder={`Option ${optionIndex + 1}`}
                  />
                  {question.options.length > MIN_OPTIONS && (
                    <button
                      type="button"
                      onClick={() => removeOption(questionIndex, optionIndex)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addOption(questionIndex)}
                className="self-start text-sm text-black/60 hover:underline dark:text-white/60"
              >
                Add option
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={addQuestion}
          className="rounded-md border border-black/20 px-4 py-2 text-sm dark:border-white/20"
        >
          Add question
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Saving..." : "Save quiz"}
        </button>
      </div>
    </form>
  );
}
