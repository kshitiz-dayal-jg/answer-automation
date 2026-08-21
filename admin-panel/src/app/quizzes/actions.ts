"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createQuiz, deleteQuiz, type QuestionInput } from "@/lib/db";

export async function createQuizAction(data: {
  league: string;
  teamA: string;
  teamB: string;
  matchStartTime: string;
  questions: QuestionInput[];
}) {
  const league = data.league.trim();
  const teamA = data.teamA.trim();
  const teamB = data.teamB.trim();
  const matchStartTime = data.matchStartTime.trim();
  if (!league) throw new Error("League is required");
  if (!teamA) throw new Error("Team A is required");
  if (!teamB) throw new Error("Team B is required");
  if (!matchStartTime) throw new Error("Match date is required");

  const questions = data.questions.map((q) => ({
    text: q.text.trim(),
    options: q.options.map((o) => o.trim()),
  }));

  if (questions.length === 0) throw new Error("At least one question is required");
  for (const q of questions) {
    if (!q.text) throw new Error("Every question needs text");
    if (q.options.some((o) => !o)) throw new Error("Every option needs text");
  }

  const id = createQuiz({ league, teamA, teamB, matchStartTime }, questions);
  revalidatePath("/quizzes");
  redirect(`/quizzes/${id}`);
}

export async function deleteQuizAction(id: number) {
  deleteQuiz(id);
  revalidatePath("/quizzes");
}
