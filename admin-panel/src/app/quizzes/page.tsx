import Link from "next/link";
import { listQuizzes } from "@/lib/db";
import { formatMatchStartTime } from "@/lib/formatMatchStartTime";
import { DeleteQuizButton } from "./DeleteQuizButton";

export const dynamic = "force-dynamic";

export default function QuizzesPage() {
  const quizzes = listQuizzes();

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

      {quizzes.length === 0 ? (
        <p className="text-black/60 dark:text-white/60">No quizzes yet.</p>
      ) : (
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
              <DeleteQuizButton id={quiz.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
