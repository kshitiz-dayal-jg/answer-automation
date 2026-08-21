import { NextResponse } from "next/server";
import { getSuggestedAnswers } from "@/lib/answerSuggestions";

export async function GET(_request: Request, { params }: RouteContext<"/api/quizzes/[id]/answers">) {
  const { id } = await params;
  try {
    const suggestions = await getSuggestedAnswers(Number(id));
    return NextResponse.json(suggestions);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message === "Quiz not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
