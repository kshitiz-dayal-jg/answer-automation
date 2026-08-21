import { QuizForm } from "./QuizForm";

export default function NewQuizPage() {
  return (
    <div className="max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">New Quiz</h1>
      <QuizForm />
    </div>
  );
}
