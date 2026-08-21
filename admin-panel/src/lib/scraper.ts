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

export async function fetchScrapedData(): Promise<ScrapedMatchData> {
  const { stdout } = await execFileAsync("uv", ["run", "scrape-opta-match", HTML_FILE], {
    cwd: AUTOMATION_DIR,
  });
  return JSON.parse(stdout);
}
