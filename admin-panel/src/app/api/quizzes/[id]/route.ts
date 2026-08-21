import { NextResponse } from "next/server";
import { getQuiz } from "@/lib/db";

export async function GET(_request: Request, { params }: RouteContext<"/api/quizzes/[id]">) {
  const { id } = await params;
  const quiz = getQuiz(Number(id));
  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }
  return NextResponse.json(quiz);
}
