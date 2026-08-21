"use server";

import { fetchScrapedData } from "@/lib/scraper";

export async function fetchScrapedDataAction() {
  return fetchScrapedData();
}
