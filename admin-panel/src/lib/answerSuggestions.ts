import { QUESTION_TEMPLATES, hasPlayerNamePlaceholder } from "./questionTemplates";
import { getQuiz } from "./db";
import { fetchScrapedData, type ScrapedTeam } from "./scraper";

type TemplateLogic =
  | { kind: "team-compare"; stats: string[] }
  | { kind: "player-max"; stats: string[] }
  | { kind: "player-threshold"; stats: string[]; threshold: number };

const TEMPLATE_LOGIC: Record<string, TemplateLogic> = {
  "Which team will have most cards?": { kind: "team-compare", stats: ["cards_yellow", "cards_red"] },
  "Which player will have the most fouls committed?": { kind: "player-max", stats: ["fouls_conceded"] },
  "Which player will have the most fouls won?": { kind: "player-max", stats: ["fouls_won"] },
  "Which player will have the most shots?": { kind: "player-max", stats: ["shots"] },
  "Which team will have most shots on target?": { kind: "team-compare", stats: ["shots_on_target"] },
  "Which player will have the most shots on target?": { kind: "player-max", stats: ["shots_on_target"] },
  "Will {playerName} have 2 or more shots on target?": {
    kind: "player-threshold",
    stats: ["shots_on_target"],
    threshold: 2,
  },
  "Will {playerName} have 4 or more shots?": { kind: "player-threshold", stats: ["shots"], threshold: 4 },
};

export type Suggestion = {
  answer: string;
  summary: string;
  suggestedOptionIndex: number | null;
};

function matchTemplate(text: string): { template: string; playerName: string | null } | null {
  for (const template of QUESTION_TEMPLATES) {
    if (!hasPlayerNamePlaceholder(template)) {
      if (text === template) return { template, playerName: null };
      continue;
    }
    const [prefix, suffix] = template.split("{playerName}");
    if (text.startsWith(prefix) && text.endsWith(suffix) && text.length >= prefix.length + suffix.length) {
      return { template, playerName: text.slice(prefix.length, text.length - suffix.length) };
    }
  }
  return null;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function sumStats(totals: Record<string, string | number> | null | undefined, stats: string[]): number {
  if (!totals) return 0;
  return stats.reduce((sum, stat) => sum + Number(totals[stat] ?? 0), 0);
}

function findOptionIndex(options: string[], candidate: string): number | null {
  const normCandidate = normalize(candidate);
  if (!normCandidate) return null;
  const exact = options.findIndex((option) => normalize(option) === normCandidate);
  if (exact !== -1) return exact;
  const partial = options.findIndex((option) => {
    const normOption = normalize(option);
    return normOption.length > 2 && (normOption.includes(normCandidate) || normCandidate.includes(normOption));
  });
  return partial !== -1 ? partial : null;
}

function findPlayer(teams: ScrapedTeam[], name: string) {
  const normTarget = normalize(name);
  for (const team of teams) {
    for (const player of team.players) {
      const normName = normalize(String(player.name));
      if (normName === normTarget || normName.endsWith(normTarget) || normTarget.endsWith(normName)) {
        return player;
      }
    }
  }
  return null;
}

export function suggestAnswer(
  questionText: string,
  options: string[],
  teams: ScrapedTeam[],
  teamAName: string,
  teamBName: string,
): Suggestion | null {
  const matched = matchTemplate(questionText);
  if (!matched) return null;
  const logic = TEMPLATE_LOGIC[matched.template];

  if (logic.kind === "team-compare") {
    const teamA = teams.find((t) => normalize(t.team) === normalize(teamAName));
    const teamB = teams.find((t) => normalize(t.team) === normalize(teamBName));
    if (!teamA && !teamB) return null;
    const valueA = sumStats(teamA?.team_total, logic.stats);
    const valueB = sumStats(teamB?.team_total, logic.stats);
    if (valueA === valueB) {
      return {
        answer: "Tie",
        summary: `Tied: ${teamAName} ${valueA} - ${teamBName} ${valueB}`,
        suggestedOptionIndex: null,
      };
    }
    const winner = valueA > valueB ? teamAName : teamBName;
    return {
      answer: winner,
      summary: `${winner} leads ${Math.max(valueA, valueB)} - ${Math.min(valueA, valueB)}`,
      suggestedOptionIndex: findOptionIndex(options, winner),
    };
  }

  if (logic.kind === "player-max") {
    // If the options are themselves recognizable players, this is a choice
    // between those specific candidates - compare only them, not the whole match.
    const resolvedOptions = options
      .map((option, index) => {
        const player = findPlayer(teams, option);
        return player ? { index, option, value: sumStats(player, logic.stats) } : null;
      })
      .filter((o): o is { index: number; option: string; value: number } => o !== null);

    if (resolvedOptions.length >= 2) {
      const summary = resolvedOptions.map((o) => `${o.option}: ${o.value}`).join(", ");
      const best = resolvedOptions.reduce((a, b) => (b.value > a.value ? b : a));
      const tied = resolvedOptions.filter((o) => o.value === best.value);
      if (tied.length > 1) {
        return { answer: "Tie", summary, suggestedOptionIndex: null };
      }
      return { answer: best.option, summary, suggestedOptionIndex: best.index };
    }

    // Options aren't recognizable player names (e.g. team names typed by mistake) -
    // fall back to the match-wide leader as a best-effort suggestion.
    let best: { name: string; value: number } | null = null;
    for (const team of teams) {
      for (const player of team.players) {
        const value = sumStats(player, logic.stats);
        if (!best || value > best.value) best = { name: String(player.name), value };
      }
    }
    if (!best) return null;
    return {
      answer: best.name,
      summary: `${best.name}: ${best.value}`,
      suggestedOptionIndex: findOptionIndex(options, best.name),
    };
  }

  // player-threshold
  if (!matched.playerName) return null;
  const player = findPlayer(teams, matched.playerName);
  if (!player) return null;
  const value = sumStats(player, logic.stats);
  const meetsThreshold = value >= logic.threshold;
  const answer = meetsThreshold ? "Yes" : "No";
  const summary = `${player.name}: ${value} (threshold ${logic.threshold})`;
  const affirmativeIndex = options.findIndex((o) => /^(yes|true)$/i.test(o.trim()));
  const negativeIndex = options.findIndex((o) => /^(no|false)$/i.test(o.trim()));
  const suggestedOptionIndex = meetsThreshold
    ? affirmativeIndex !== -1
      ? affirmativeIndex
      : null
    : negativeIndex !== -1
      ? negativeIndex
      : null;
  return { answer, summary, suggestedOptionIndex };
}

export async function getSuggestedAnswers(quizId: number): Promise<Record<number, Suggestion | null>> {
  const quiz = getQuiz(quizId);
  if (!quiz) throw new Error("Quiz not found");

  const scraped = await fetchScrapedData();
  const teams = scraped.teams ?? [];

  const suggestions: Record<number, Suggestion | null> = {};
  for (const question of quiz.questions) {
    suggestions[question.id] = suggestAnswer(question.text, question.options, teams, quiz.teamA, quiz.teamB);
  }
  return suggestions;
}
