import { getStats } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function Home() {
  const { quizCount, questionCount } = getStats();

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>
      <div className="grid max-w-md grid-cols-2 gap-4">
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
          <div className="text-sm text-black/60 dark:text-white/60">Quizzes</div>
          <div className="text-3xl font-semibold">{quizCount}</div>
        </div>
        <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
          <div className="text-sm text-black/60 dark:text-white/60">Questions</div>
          <div className="text-3xl font-semibold">{questionCount}</div>
        </div>
      </div>
    </div>
  );
}
