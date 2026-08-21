import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const AUTOMATION_DIR = path.join(process.cwd(), "..", "automation");
const HTML_FILE = path.join(AUTOMATION_DIR, "web3.html");

export type ScrapedPlayer = Record<string, string | number>;

export type ScrapedTeam = {
  team: string;
  players: ScrapedPlayer[];
  team_total: Record<string, number> | null;
};

export type ScrapedMatchData = {
  match_id: string | null;
  competition_id: string | null;
  season_id: string | null;
  league: string | null;
  season_name: string | null;
  team_a: string | null;
  team_b: string | null;
  match_date: string | null;
  canonical_url: string | null;
  stat_categories: string[];
  teams?: ScrapedTeam[];
  note?: string;
};

export type LiveScrapeParams = {
  date: string;
  teamA: string;
  teamB: string;
};

export async function fetchScrapedData(params?: LiveScrapeParams): Promise<ScrapedMatchData> {
  const args = params
    ? ["run", "scrape-opta-match", "--date", params.date, "--team-a", params.teamA, "--team-b", params.teamB]
    : ["run", "scrape-opta-match", HTML_FILE];

  try {
    const { stdout } = await execFileAsync("uv", args, {
      cwd: AUTOMATION_DIR,
      maxBuffer: 20 * 1024 * 1024,
      timeout: 180_000,
      env: {
        ...process.env,
        PATH: `${process.env.HOME ? `${process.env.HOME}/.local/bin:` : ""}${process.env.PATH ?? ""}`,
      },
    });
    if (!stdout.trim()) {
      throw new Error("Scraper returned no output");
    }
    return JSON.parse(stdout);
  } catch (err) {
    const e = err as { stderr?: string; message?: string };
    const detail = e.stderr?.trim() || e.message || "Scraper failed";
    throw new Error(detail);
  }
}
