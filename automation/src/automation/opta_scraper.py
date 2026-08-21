from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from urllib.parse import quote

from bs4 import BeautifulSoup
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

BASE_URL = "https://optaplayerstats.statsperform.com"
LIVE_SCORES_URL = f"{BASE_URL}/en_GB/soccer"


NO_STATS_NOTE = (
    "This page does not contain match statistics (cards, shots, fouls, etc.). "
    "Those are rendered client-side by the opta-widget JS SDK, which calls an API "
    "protected by PerimeterX bot detection, so they never appear in the saved HTML "
    "unless the page was saved from a browser *after* the widgets finished rendering "
    "(e.g. \"Save Page As > Webpage, Complete\"). This parser only extracts the match "
    "metadata already present in the static page."
)

# Same order as the opta-widget "visible_categories" attribute / the player stats
# table header (G, A, RC, YC, Crn, S, SOnT, BS, P, C, Tk, O, FC, FW, SAV).
STAT_COLUMNS = [
    "goals",
    "assists",
    "cards_red",
    "cards_yellow",
    "corners_won",
    "shots",
    "shots_on_target",
    "shots_blocked",
    "passes",
    "crosses",
    "tackles",
    "offsides",
    "fouls_conceded",
    "fouls_won",
    "saves",
]


def parse_match_page(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")

    page_data_tag = soup.find("script", id="pageData")
    page_data = json.loads(page_data_tag.string) if page_data_tag and page_data_tag.string else {}

    summary_widget = soup.find("opta-widget", attrs={"widget": "match_summary"})
    stats_widget = soup.find("opta-widget", attrs={"widget": "matchstats_pro"})

    canonical_tag = soup.find("link", rel="canonical")
    canonical_href = canonical_tag["href"] if canonical_tag else None
    team_a, team_b = _teams_from_canonical(canonical_href) if canonical_href else (None, None)

    match_date = _date_from_title(soup.title.string if soup.title else "")

    categories = []
    if stats_widget and stats_widget.get("visible_categories"):
        categories = [c.strip() for c in stats_widget["visible_categories"].split(",")]

    result = {
        "match_id": summary_widget.get("match") if summary_widget else None,
        "competition_id": page_data.get("comp") or (summary_widget.get("competition") if summary_widget else None),
        "season_id": page_data.get("tmcl") or (summary_widget.get("season") if summary_widget else None),
        "league": page_data.get("compName"),
        "season_name": page_data.get("tmclName"),
        "team_a": team_a,
        "team_b": team_b,
        "match_date": match_date,
        "canonical_url": _absolute_url(canonical_href),
        "stat_categories": categories,
    }

    player_stats = parse_player_stats(html)
    if player_stats is not None:
        result["teams"] = player_stats
    else:
        result["note"] = NO_STATS_NOTE

    return result


def parse_player_stats(html: str) -> list[dict] | None:
    """Extract per-player stats, if this HTML is a post-render snapshot of the
    matchstats_pro widget (its tabs each hold one team's Opta-Striped table)."""
    soup = BeautifulSoup(html, "html.parser")
    tabbed_content = soup.find("ul", class_="Opta-TabbedContent")
    if not tabbed_content:
        return None

    teams = []
    for tab in tabbed_content.find_all("li", recursive=False):
        heading = tab.find("h3", class_="Opta-Exp")
        team_name = heading.find("span").get_text(strip=True) if heading else None
        table = tab.find("table", class_="Opta-Striped")
        if not team_name or team_name == "All" or not table:
            continue
        teams.append(_parse_team_table(team_name, table))

    return teams or None


def scrape_live_match(date: str, team_a: str, team_b: str, *, headless: bool = True) -> dict:
    """Open Opta live scores for ``date``, open the matching fixture, wait for
    player-stats widgets to render, then parse the page."""
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date):
        raise ValueError(f"date must be YYYY-MM-DD, got {date!r}")

    url = f"{LIVE_SCORES_URL}?date={quote(date)}"
    with sync_playwright() as p:
        # Bundled Chromium is blocked by the CDN; system Chrome passes.
        browser = p.chromium.launch(
            channel="chrome",
            headless=headless,
            ignore_default_args=["--enable-automation"],
            args=["--disable-blink-features=AutomationControlled"],
        )
        try:
            context = browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/131.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1400, "height": 900},
                locale="en-GB",
            )
            page = context.new_page()
            page.add_init_script(
                "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
            )
            page.goto(url, wait_until="domcontentloaded", timeout=60_000)
            page.wait_for_selector("a.livescores-match-container", timeout=60_000)

            match_href = page.evaluate(
                """([teamA, teamB]) => {
                  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
                  const a = normalize(teamA);
                  const b = normalize(teamB);
                  for (const link of document.querySelectorAll("a.livescores-match-container")) {
                    const home = normalize(link.querySelector(".livescore-container-fixtures-competition-row-team-a")?.innerText || "");
                    const away = normalize(link.querySelector(".livescore-container-fixtures-competition-row-team-b")?.innerText || "");
                    if ((home === a && away === b) || (home === b && away === a)) {
                      return link.getAttribute("href");
                    }
                  }
                  return null;
                }""",
                [team_a, team_b],
            )
            if not match_href:
                raise LookupError(f"No match found for {team_a} vs {team_b} on {date}")

            match_url = match_href if match_href.startswith("http") else f"{BASE_URL}{match_href}"
            page.goto(match_url, wait_until="domcontentloaded", timeout=60_000)
            try:
                page.wait_for_selector("ul.Opta-TabbedContent table.Opta-Striped", timeout=90_000)
            except PlaywrightTimeoutError as err:
                raise TimeoutError(
                    "Match page loaded but player stats widgets did not render in time"
                ) from err

            html = page.content()
        finally:
            browser.close()

    return parse_match_page(html)


def _parse_team_table(team_name: str, table) -> dict:
    players = []
    team_total = None
    for row in table.find("tbody").find_all("tr"):
        header_cell = row.find("th")
        values = [int(cell.get_text(strip=True) or 0) for cell in row.find_all("td")]
        stats = dict(zip(STAT_COLUMNS, values))
        if "Opta-Total" in header_cell.get("class", []):
            team_total = stats
        else:
            players.append({"name": header_cell.get_text(strip=True), **stats})
    return {"team": team_name, "players": players, "team_total": team_total}


def _absolute_url(href: str | None) -> str | None:
    if not href:
        return None
    return href if href.startswith("http") else f"{BASE_URL}{href}"


def _teams_from_canonical(href: str) -> tuple[str | None, str | None]:
    match = re.search(r"/match/([a-z0-9-]+)/[a-z0-9]+$", href)
    if not match:
        return None, None
    slug = match.group(1)
    if "-vs-" not in slug:
        return None, None
    a_slug, b_slug = slug.split("-vs-", 1)
    return _titlecase_slug(a_slug), _titlecase_slug(b_slug)


def _titlecase_slug(slug: str) -> str:
    return " ".join(word.capitalize() for word in slug.split("-"))


def _date_from_title(title: str) -> str | None:
    match = re.search(r"-\s*(\d{1,2}\s+\w{3}\s+\d{4})\s*-", title)
    return match.group(1) if match else None


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape or parse an Opta match page.")
    parser.add_argument("html_file", type=Path, nargs="?", help="Path to saved match page HTML")
    parser.add_argument("--date", help="Match date YYYY-MM-DD (live scrape)")
    parser.add_argument("--team-a", help="Home/away team name to match on live scores")
    parser.add_argument("--team-b", help="Other team name to match on live scores")
    parser.add_argument("--headed", action="store_true", help="Show the browser window")
    args = parser.parse_args()

    try:
        if args.date or args.team_a or args.team_b:
            if not (args.date and args.team_a and args.team_b):
                parser.error("--date, --team-a, and --team-b are all required for live scrape")
            result = scrape_live_match(args.date, args.team_a, args.team_b, headless=not args.headed)
        elif args.html_file:
            html = args.html_file.read_text(encoding="utf-8")
            result = parse_match_page(html)
        else:
            parser.error("Provide an HTML file or --date/--team-a/--team-b")
    except Exception as err:
        print(str(err), file=__import__("sys").stderr)
        raise SystemExit(1) from err

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
