import { notFound } from "next/navigation";
import { getQuiz } from "@/lib/db";
import { formatMatchStartTime } from "@/lib/formatMatchStartTime";
import { QuestionList } from "./QuestionList";

export default async function QuizPage({ params }: PageProps<"/quizzes/[id]">) {
  const { id } = await params;
  const quiz = getQuiz(Number(id));
  if (!quiz) notFound();

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
