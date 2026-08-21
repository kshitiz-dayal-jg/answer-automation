import { NextResponse } from "next/server";
import { fetchScrapedData } from "@/lib/scraper";

export async function GET() {
  try {
    const data = await fetchScrapedData();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Something went wrong" },
      { status: 500 },
    );
  }
}
