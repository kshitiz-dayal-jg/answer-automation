export const QUESTION_TEMPLATES = [
  "Who will win the match?",
  "Which team will have most cards?",
  "Which player will have the most fouls committed?",
  "Which player will have the most fouls won?",
  "Which player will have the most shots?",
  "Which team will have most shots on target?",
  "Which player will have the most shots on target?",
  "Will {playerName} have 2 or more shots on target?",
  "Will {playerName} have 4 or more shots?",
] as const;

export function hasPlayerNamePlaceholder(template: string) {
  return template.includes("{playerName}");
}
