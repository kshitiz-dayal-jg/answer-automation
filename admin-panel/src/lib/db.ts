import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(path.join(dataDir, "app.db"));

// Next.js loads this module from several worker processes at once, which
// race to create the file and switch it to WAL mode for the first time.
// busy_timeout doesn't cover that initial race, so retry on SQLITE_BUSY.
function execWithRetry(sql: string, attempts = 20) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      db.exec(sql);
      return;
    } catch (err) {
      const busy = err instanceof Error && (err as NodeJS.ErrnoException & { errcode?: number }).errcode === 5;
      if (!busy || attempt === attempts) throw err;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
}

execWithRetry("PRAGMA busy_timeout = 5000;");

execWithRetry(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    league TEXT NOT NULL,
    team_a TEXT NOT NULL,
    team_b TEXT NOT NULL,
    match_start_time TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    options TEXT NOT NULL,
    correct_index INTEGER,
    position INTEGER NOT NULL
  );
`);

export type QuestionInput = {
  text: string;
  options: string[];
};

export type Question = QuestionInput & { id: number; correctIndex: number | null; position: number };

export type QuizSummary = {
  id: number;
  league: string;
  teamA: string;
  teamB: string;
  matchStartTime: string;
  createdAt: string;
  questionCount: number;
};

export function listQuizzes(): QuizSummary[] {
  const rows = db
    .prepare(
      `SELECT q.id, q.league, q.team_a AS teamA, q.team_b AS teamB,
              q.match_start_time AS matchStartTime, q.created_at AS createdAt,
              COUNT(qs.id) AS questionCount
       FROM quizzes q
       LEFT JOIN questions qs ON qs.quiz_id = q.id
       GROUP BY q.id
       ORDER BY q.created_at DESC`,
    )
    .all();
  return rows as unknown as QuizSummary[];
}

export function getQuiz(id: number): {
  id: number;
  league: string;
  teamA: string;
  teamB: string;
  matchStartTime: string;
  createdAt: string;
  questions: Question[];
} | null {
  const quiz = db
    .prepare(
      `SELECT id, league, team_a AS teamA, team_b AS teamB,
              match_start_time AS matchStartTime, created_at AS createdAt
       FROM quizzes WHERE id = ?`,
    )
    .get(id) as
    | { id: number; league: string; teamA: string; teamB: string; matchStartTime: string; createdAt: string }
    | undefined;
  if (!quiz) return null;

  const rows = db
    .prepare(
      `SELECT id, text, options, correct_index AS correctIndex, position
       FROM questions WHERE quiz_id = ? ORDER BY position`,
    )
    .all(id) as { id: number; text: string; options: string; correctIndex: number | null; position: number }[];

  return {
    ...quiz,
    questions: rows.map((r) => ({ ...r, options: JSON.parse(r.options) as string[] })),
  };
}

export function createQuiz(
  match: { league: string; teamA: string; teamB: string; matchStartTime: string },
  questions: QuestionInput[],
): number {
  db.exec("BEGIN");
  try {
    const { lastInsertRowid } = db
      .prepare(`INSERT INTO quizzes (league, team_a, team_b, match_start_time) VALUES (?, ?, ?, ?)`)
      .run(match.league, match.teamA, match.teamB, match.matchStartTime);
    const quizId = Number(lastInsertRowid);

    const insertQuestion = db.prepare(
      `INSERT INTO questions (quiz_id, text, options, correct_index, position) VALUES (?, ?, ?, NULL, ?)`,
    );
    questions.forEach((q, position) => {
      insertQuestion.run(quizId, q.text, JSON.stringify(q.options), position);
    });

    db.exec("COMMIT");
    return quizId;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function deleteQuiz(id: number) {
  db.prepare(`DELETE FROM quizzes WHERE id = ?`).run(id);
}

export function getStats() {
  const { count: quizCount } = db.prepare(`SELECT COUNT(*) AS count FROM quizzes`).get() as {
    count: number;
  };
  const { count: questionCount } = db.prepare(`SELECT COUNT(*) AS count FROM questions`).get() as {
    count: number;
  };
  return { quizCount, questionCount };
}
