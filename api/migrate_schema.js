const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'kbo_scouting.db');
const db = new Database(dbPath);

console.log("Migrating database schema...");

db.exec(`
  DROP TABLE IF EXISTS card_stat_history;
  DROP TABLE IF EXISTS scouting_votes;
  DROP TABLE IF EXISTS player_cards;

  CREATE TABLE IF NOT EXISTS player_cards (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id      INTEGER NOT NULL UNIQUE REFERENCES players(id),
    stat1          INTEGER NOT NULL DEFAULT 50,
    stat2          INTEGER NOT NULL DEFAULT 50,
    stat3          INTEGER NOT NULL DEFAULT 50,
    stat4          INTEGER NOT NULL DEFAULT 50,
    stat5          INTEGER NOT NULL DEFAULT 50,
    stat1_pot      INTEGER NOT NULL DEFAULT 50,
    stat2_pot      INTEGER NOT NULL DEFAULT 50,
    stat3_pot      INTEGER NOT NULL DEFAULT 50,
    stat4_pot      INTEGER NOT NULL DEFAULT 50,
    stat5_pot      INTEGER NOT NULL DEFAULT 50,
    overall_score  INTEGER NOT NULL DEFAULT 50,
    total_score    INTEGER NOT NULL DEFAULT 250,
    card_grade     TEXT    NOT NULL DEFAULT 'C',
    vote_count     INTEGER NOT NULL DEFAULT 0,
    score_source   TEXT    NOT NULL DEFAULT 'SEED',
    std_dev        REAL    NOT NULL DEFAULT 0,
    calibrated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS scouting_votes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    player_id  INTEGER NOT NULL REFERENCES players(id),
    stat1      INTEGER NOT NULL CHECK(stat1 BETWEEN 20 AND 80),
    stat2      INTEGER NOT NULL CHECK(stat2 BETWEEN 20 AND 80),
    stat3      INTEGER NOT NULL CHECK(stat3 BETWEEN 20 AND 80),
    stat4      INTEGER NOT NULL CHECK(stat4 BETWEEN 20 AND 80),
    stat5      INTEGER NOT NULL CHECK(stat5 BETWEEN 20 AND 80),
    stat1_pot  INTEGER NOT NULL CHECK(stat1_pot BETWEEN 20 AND 80),
    stat2_pot  INTEGER NOT NULL CHECK(stat2_pot BETWEEN 20 AND 80),
    stat3_pot  INTEGER NOT NULL CHECK(stat3_pot BETWEEN 20 AND 80),
    stat4_pot  INTEGER NOT NULL CHECK(stat4_pot BETWEEN 20 AND 80),
    stat5_pot  INTEGER NOT NULL CHECK(stat5_pot BETWEEN 20 AND 80),
    comment    TEXT,
    voted_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, player_id)
  );

  CREATE INDEX IF NOT EXISTS idx_votes_player ON scouting_votes(player_id);
  CREATE INDEX IF NOT EXISTS idx_votes_user ON scouting_votes(user_id);

  CREATE TABLE IF NOT EXISTS card_stat_history (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id          INTEGER NOT NULL REFERENCES player_cards(id),
    prev_stat1       INTEGER, prev_stat2 INTEGER, prev_stat3 INTEGER,
    prev_stat4       INTEGER, prev_stat5 INTEGER,
    prev_stat1_pot   INTEGER, prev_stat2_pot INTEGER, prev_stat3_pot INTEGER,
    prev_stat4_pot   INTEGER, prev_stat5_pot INTEGER,
    new_stat1        INTEGER, new_stat2  INTEGER, new_stat3  INTEGER,
    new_stat4        INTEGER, new_stat5  INTEGER,
    new_stat1_pot    INTEGER, new_stat2_pot INTEGER, new_stat3_pot INTEGER,
    new_stat4_pot    INTEGER, new_stat5_pot INTEGER,
    vote_count       INTEGER,
    changed_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_history_card ON card_stat_history(card_id, changed_at);
`);

console.log("Migration complete.");
