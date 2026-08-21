from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from bs4 import BeautifulSoup

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
    return href if href.startswith("http") else f"https://optaplayerstats.statsperform.com{href}"


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
    parser = argparse.ArgumentParser(description="Parse an Opta match page saved as HTML.")
    parser.add_argument("html_file", type=Path, help="Path to the saved match page HTML")
    args = parser.parse_args()

    html = args.html_file.read_text(encoding="utf-8")
    print(json.dumps(parse_match_page(html), indent=2))


if __name__ == "__main__":
    main()
