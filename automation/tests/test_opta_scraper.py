from pathlib import Path

from automation.opta_scraper import parse_match_page

FIXTURE_DIR = Path(__file__).parent.parent
NO_WIDGETS_FIXTURE = FIXTURE_DIR / "web1.html"
RENDERED_FIXTURE = FIXTURE_DIR / "web3.html"


def test_parse_match_page_without_rendered_widgets():
    result = parse_match_page(NO_WIDGETS_FIXTURE.read_text(encoding="utf-8"))

    assert result["match_id"] == "8g2qr1sd0kqxtjcvybdfgzvh0"
    assert result["competition_id"] == "70excpe1synn9kadnbppahdn7"
    assert result["season_id"] == "873cbl9cd9butm4air0mugxzo"
    assert result["league"] == "FIFA World Cup"
    assert result["season_name"] == "2026 Canada/Mexico/USA"
    assert result["team_a"] == "Jordan"
    assert result["team_b"] == "Argentina"
    assert result["match_date"] == "28 Jun 2026"
    assert "shots_on_target" in result["stat_categories"]
    assert "teams" not in result
    assert result["note"]


def test_parse_match_page_with_rendered_widgets():
    result = parse_match_page(RENDERED_FIXTURE.read_text(encoding="utf-8"))

    assert "note" not in result
    teams = {t["team"]: t for t in result["teams"]}
    assert set(teams) == {"Spain", "Argentina"}
    assert len(teams["Spain"]["players"]) > 0
    assert len(teams["Argentina"]["players"]) > 0

    messi = next(p for p in teams["Argentina"]["players"] if "Messi" in p["name"])
    assert messi["goals"] >= 0
    assert messi["shots_on_target"] >= 0

    assert teams["Spain"]["team_total"] is not None
    assert teams["Argentina"]["team_total"] is not None
    assert "fouls_won" in teams["Spain"]["team_total"]
    assert "fouls_won" in teams["Argentina"]["team_total"]
