const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { Pool } = require('pg');

const Database = require('better-sqlite3');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const sqliteDb = new Database(path.join(__dirname, 'kbo_scouting.db'));

async function init() {
  const client = await pool.connect();
  try {
    console.log("Creating tables...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         SERIAL PRIMARY KEY,
        nickname   TEXT    NOT NULL UNIQUE,
        email      TEXT    NOT NULL UNIQUE,
        password_hash TEXT,
        auth_provider TEXT NOT NULL DEFAULT 'LOCAL',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS scouter_profiles (
        user_id        INTEGER PRIMARY KEY REFERENCES users(id),
        total_xp       INTEGER NOT NULL DEFAULT 0,
        level          INTEGER NOT NULL DEFAULT 1,
        title          TEXT    NOT NULL DEFAULT '🔰 루키 스카우터',
        total_votes    INTEGER NOT NULL DEFAULT 0,
        accurate_votes INTEGER NOT NULL DEFAULT 0,
        teams_scouted  INTEGER NOT NULL DEFAULT 0,
        updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS players (
        id           SERIAL PRIMARY KEY,
        naver_id     TEXT    UNIQUE,
        name         TEXT    NOT NULL,
        team         TEXT    NOT NULL,
        back_number  TEXT,
        position     TEXT,
        player_type  TEXT    NOT NULL CHECK(player_type IN ('BATTER','PITCHER')),
        league_level TEXT    NOT NULL DEFAULT 'FIRST' CHECK(league_level IN ('FIRST','FUTURES')),
        photo_url    TEXT,
        is_active    INTEGER NOT NULL DEFAULT 1,
        season       INTEGER NOT NULL DEFAULT 2026,
        birth        TEXT,
        height       INTEGER,
        weight       INTEGER,
        throws_bats  TEXT,
        record_avg   REAL,
        record_hr    INTEGER,
        record_ops   REAL,
        record_era   REAL,
        record_win   INTEGER,
        record_so    INTEGER,
        created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_players_team ON players(team, league_level);
      CREATE INDEX IF NOT EXISTS idx_players_type ON players(player_type, position);

      CREATE TABLE IF NOT EXISTS player_cards (
        id             SERIAL PRIMARY KEY,
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
        calibrated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS scouting_votes (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id),
        player_id  INTEGER NOT NULL REFERENCES players(id),
        stat1      INTEGER NOT NULL CHECK(stat1 BETWEEN 20 AND 80),
        stat2      INTEGER NOT NULL CHECK(stat2 BETWEEN 20 AND 80),
        stat3      INTEGER NOT NULL CHECK(stat3 BETWEEN 20 AND 80),
        stat4      INTEGER NOT NULL CHECK(stat4 BETWEEN 20 AND 80),
        stat5      INTEGER NOT NULL CHECK(stat5 BETWEEN 20 AND 80),
        stat1_pot  INTEGER NOT NULL DEFAULT 50 CHECK(stat1_pot BETWEEN 20 AND 80),
        stat2_pot  INTEGER NOT NULL DEFAULT 50 CHECK(stat2_pot BETWEEN 20 AND 80),
        stat3_pot  INTEGER NOT NULL DEFAULT 50 CHECK(stat3_pot BETWEEN 20 AND 80),
        stat4_pot  INTEGER NOT NULL DEFAULT 50 CHECK(stat4_pot BETWEEN 20 AND 80),
        stat5_pot  INTEGER NOT NULL DEFAULT 50 CHECK(stat5_pot BETWEEN 20 AND 80),
        comment    TEXT,
        voted_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, player_id)
      );

      CREATE INDEX IF NOT EXISTS idx_votes_player ON scouting_votes(player_id);

      CREATE TABLE IF NOT EXISTS user_collections (
        user_id          INTEGER NOT NULL REFERENCES users(id),
        player_id        INTEGER NOT NULL REFERENCES players(id),
        first_scouted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_pre_callup    INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, player_id)
      );
    `);
    
    // Copy players
    console.log("Copying players...");
    const players = sqliteDb.prepare("SELECT * FROM players").all();
    for (let p of players) {
      await client.query(
        `INSERT INTO players (id, naver_id, name, team, back_number, position, player_type, league_level, photo_url, is_active, season, birth, height, weight, throws_bats, record_avg, record_hr, record_ops, record_era, record_win, record_so)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.naver_id, p.name, p.team, p.back_number, p.position, p.player_type, p.league_level, p.photo_url, p.is_active, p.season, p.birth, p.height, p.weight, p.throws_bats, p.record_avg, p.record_hr, p.record_ops, p.record_era, p.record_win, p.record_so]
      );
    }
    await client.query(`SELECT setval('players_id_seq', (SELECT MAX(id) FROM players));`);

    // Copy player cards
    console.log("Copying player cards...");
    const cards = sqliteDb.prepare("SELECT * FROM player_cards").all();
    for (let c of cards) {
      await client.query(
        `INSERT INTO player_cards (player_id, stat1, stat2, stat3, stat4, stat5, stat1_pot, stat2_pot, stat3_pot, stat4_pot, stat5_pot, overall_score, total_score, card_grade, vote_count, score_source, std_dev)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         ON CONFLICT (player_id) DO NOTHING`,
        [c.player_id, c.stat1, c.stat2, c.stat3, c.stat4, c.stat5, c.stat1_pot, c.stat2_pot, c.stat3_pot, c.stat4_pot, c.stat5_pot, c.overall_score, c.total_score, c.card_grade, c.vote_count, c.score_source, c.std_dev]
      );
    }

    console.log("Done!");
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}

init();
