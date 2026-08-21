import { NextResponse } from "next/server";
import { listQuizzes } from "@/lib/db";

export async function GET() {
  return NextResponse.json(listQuizzes());
}
