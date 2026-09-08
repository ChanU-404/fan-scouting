const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { blendScore } = require('./calibrate');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function upsertPlayer(p) {
  await pool.query(`
    INSERT INTO players (naver_id, name, team, back_number, position, player_type, league_level, photo_url, season, birth, height, weight, throws_bats, record_avg, record_hr, record_ops, record_era, record_win, record_so)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    ON CONFLICT(naver_id) DO UPDATE SET
      name=EXCLUDED.name, team=EXCLUDED.team, back_number=EXCLUDED.back_number,
      position=EXCLUDED.position, league_level=EXCLUDED.league_level,
      photo_url=EXCLUDED.photo_url,
      birth=COALESCE(EXCLUDED.birth, players.birth),
      height=COALESCE(EXCLUDED.height, players.height),
      weight=COALESCE(EXCLUDED.weight, players.weight),
      throws_bats=COALESCE(EXCLUDED.throws_bats, players.throws_bats),
      record_avg=COALESCE(EXCLUDED.record_avg, players.record_avg),
      record_hr=COALESCE(EXCLUDED.record_hr, players.record_hr),
      record_ops=COALESCE(EXCLUDED.record_ops, players.record_ops),
      record_era=COALESCE(EXCLUDED.record_era, players.record_era),
      record_win=COALESCE(EXCLUDED.record_win, players.record_win),
      record_so=COALESCE(EXCLUDED.record_so, players.record_so),
      updated_at=CURRENT_TIMESTAMP
  `, [p.naver_id, p.name, p.team, p.back_number, p.position, p.player_type, p.league_level, p.photo_url, p.season, p.birth, p.height, p.weight, p.throws_bats, p.record_avg, p.record_hr, p.record_ops, p.record_era, p.record_win, p.record_so]);
}

async function upsertCard(c) {
  await pool.query(`
    INSERT INTO player_cards (player_id, stat1, stat2, stat3, stat4, stat5, stat1_pot, stat2_pot, stat3_pot, stat4_pot, stat5_pot, overall_score, total_score, card_grade, vote_count, score_source, std_dev)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    ON CONFLICT(player_id) DO UPDATE SET
      stat1=EXCLUDED.stat1, stat2=EXCLUDED.stat2, stat3=EXCLUDED.stat3,
      stat4=EXCLUDED.stat4, stat5=EXCLUDED.stat5,
      stat1_pot=EXCLUDED.stat1_pot, stat2_pot=EXCLUDED.stat2_pot, stat3_pot=EXCLUDED.stat3_pot,
      stat4_pot=EXCLUDED.stat4_pot, stat5_pot=EXCLUDED.stat5_pot,
      overall_score=EXCLUDED.overall_score,
      total_score=EXCLUDED.total_score, card_grade=EXCLUDED.card_grade,
      vote_count=EXCLUDED.vote_count, score_source=EXCLUDED.score_source,
      std_dev=EXCLUDED.std_dev, calibrated_at=CURRENT_TIMESTAMP
  `, [c.player_id, c.stat1, c.stat2, c.stat3, c.stat4, c.stat5, c.stat1_pot, c.stat2_pot, c.stat3_pot, c.stat4_pot, c.stat5_pot, c.overall_score, c.total_score, c.card_grade, c.vote_count, c.score_source, c.std_dev]);
}

async function upsertVote(v) {
  await pool.query(`
    INSERT INTO scouting_votes (user_id, player_id, stat1, stat2, stat3, stat4, stat5, stat1_pot, stat2_pot, stat3_pot, stat4_pot, stat5_pot, comment, voted_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, player_id) DO UPDATE SET
      stat1=EXCLUDED.stat1, stat2=EXCLUDED.stat2, stat3=EXCLUDED.stat3,
      stat4=EXCLUDED.stat4, stat5=EXCLUDED.stat5,
      stat1_pot=EXCLUDED.stat1_pot, stat2_pot=EXCLUDED.stat2_pot, stat3_pot=EXCLUDED.stat3_pot,
      stat4_pot=EXCLUDED.stat4_pot, stat5_pot=EXCLUDED.stat5_pot, comment=EXCLUDED.comment,
      updated_at=CURRENT_TIMESTAMP
  `, [v.user_id, v.player_id, v.stat1, v.stat2, v.stat3, v.stat4, v.stat5, v.stat1_pot, v.stat2_pot, v.stat3_pot, v.stat4_pot, v.stat5_pot, v.comment]);
}

async function aggregateVotes(player_id) {
  const res = await pool.query(`SELECT * FROM scouting_votes WHERE player_id = $1`, [player_id]);
  const votes = res.rows;
  const cnt = votes.length;
  
  if (cnt === 0) {
    return { avg1: 0, avg2: 0, avg3: 0, avg4: 0, avg5: 0, avg1_pot: 0, avg2_pot: 0, avg3_pot: 0, avg4_pot: 0, avg5_pot: 0, cnt: 0, std_approx: 0 };
  }

  const getTrimmedMean = (key) => {
    let vals = votes.map(v => v[key]).filter(v => v !== null && v !== undefined).sort((a, b) => a - b);
    if (vals.length >= 10) {
      const trimCount = Math.floor(vals.length * 0.1);
      vals = vals.slice(trimCount, vals.length - trimCount);
    }
    if (vals.length === 0) return 0;
    return vals.reduce((sum, v) => sum + v, 0) / vals.length;
  };

  const avg1 = getTrimmedMean('stat1');
  const avg2 = getTrimmedMean('stat2');
  const avg3 = getTrimmedMean('stat3');
  const avg4 = getTrimmedMean('stat4');
  const avg5 = getTrimmedMean('stat5');
  const avg1_pot = getTrimmedMean('stat1_pot');
  const avg2_pot = getTrimmedMean('stat2_pot');
  const avg3_pot = getTrimmedMean('stat3_pot');
  const avg4_pot = getTrimmedMean('stat4_pot');
  const avg5_pot = getTrimmedMean('stat5_pot');

  let maxd = 0;
  for (const v of votes) {
    const d1 = Math.abs((v.stat1||0) - avg1);
    const d2 = Math.abs((v.stat2||0) - avg2);
    const d3 = Math.abs((v.stat3||0) - avg3);
    const d4 = Math.abs((v.stat4||0) - avg4);
    const d5 = Math.abs((v.stat5||0) - avg5);
    maxd = Math.max(maxd, d1, d2, d3, d4, d5);
  }

  return { avg1, avg2, avg3, avg4, avg5, avg1_pot, avg2_pot, avg3_pot, avg4_pot, avg5_pot, cnt, std_approx: maxd };
}

async function recalibrateCard(player_id, seedStats, seedStatsPot) {
  const agg = await aggregateVotes(player_id);
  let overallSum = 0;
  const count = parseInt(agg.cnt || 0);

  const stats = [];
  const pots = [];
  for(let i=1; i<=5; i++) {
    const s = blendScore(agg[`avg${i}`] || 0, seedStats[i-1], count);
    const p = blendScore(agg[`avg${i}_pot`] || 0, seedStatsPot[i-1], count);
    stats.push(s.score);
    pots.push(p.score);
    overallSum += s.score;
  }
  const source = count > 0 ? (count >= 20 ? 'FAN' : 'BLENDED') : 'SEED';
  
  const overall = Math.max(20, Math.min(80, Math.round(overallSum / 5 / 5) * 5));
  const grade = overallSum >= 350 ? 'S' : overallSum >= 300 ? 'A' : overallSum >= 250 ? 'B' : overallSum >= 200 ? 'C' : 'D';
  
  await pool.query(`
    UPDATE player_cards
    SET stat1=$1, stat2=$2, stat3=$3, stat4=$4, stat5=$5,
        stat1_pot=$6, stat2_pot=$7, stat3_pot=$8, stat4_pot=$9, stat5_pot=$10,
        overall_score=$11, total_score=$12, card_grade=$13, vote_count=$14, score_source=$15, std_dev=$16, calibrated_at=CURRENT_TIMESTAMP
    WHERE player_id=$17
  `, [stats[0], stats[1], stats[2], stats[3], stats[4], pots[0], pots[1], pots[2], pots[3], pots[4], overall, overallSum, grade, count, source, agg.std_approx || 0, player_id]);
  
  return {
    stat1: stats[0], stat2: stats[1], stat3: stats[2], stat4: stats[3], stat5: stats[4],
    stat1_pot: pots[0], stat2_pot: pots[1], stat3_pot: pots[2], stat4_pot: pots[3], stat5_pot: pots[4],
    overall_score: overall, total_score: overallSum, card_grade: grade, vote_count: count, score_source: source, std_dev: agg.std_approx || 0
  };
}


async function getMyVote(user_id, player_id) {
  const res = await pool.query(`SELECT * FROM scouting_votes WHERE user_id = $1 AND player_id = $2`, [user_id, player_id]);
  return res.rows[0];
}

async function getPlayerCard(id) {
  const res = await pool.query(`
    SELECT p.*, c.stat1, c.stat2, c.stat3, c.stat4, c.stat5,
           c.stat1_pot, c.stat2_pot, c.stat3_pot, c.stat4_pot, c.stat5_pot,
           c.overall_score, c.total_score, c.card_grade, c.vote_count, c.score_source, c.std_dev,
           c.calibrated_at
    FROM players p
    LEFT JOIN player_cards c ON c.player_id = p.id
    WHERE p.id = $1
  `, [id]);
  return res.rows[0];
}

async function getAllCards() {
  const res = await pool.query(`
    SELECT p.id, p.name, p.team, p.position, p.player_type, p.league_level, p.photo_url, p.naver_id,
           c.stat1, c.stat2, c.stat3, c.stat4, c.stat5,
           c.stat1_pot, c.stat2_pot, c.stat3_pot, c.stat4_pot, c.stat5_pot,
           c.overall_score, c.total_score, c.card_grade, c.vote_count, c.score_source, c.std_dev
    FROM players p
    LEFT JOIN player_cards c ON c.player_id = p.id
    WHERE p.is_active = 1
    ORDER BY c.overall_score DESC NULLS LAST, p.name ASC
  `);
  return res.rows;
}

async function getProfile(user_id) {
  const res = await pool.query(`SELECT * FROM scouter_profiles WHERE user_id = $1`, [user_id]);
  return res.rows[0];
}

async function initProfile(user_id) {
  await pool.query(`INSERT INTO scouter_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [user_id]);
}

async function addXP(user_id, xp, vote_delta) {
  await pool.query(`
    UPDATE scouter_profiles
    SET total_xp = total_xp + $1,
        total_votes = total_votes + $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $3
  `, [xp, vote_delta, user_id]);
}

async function addCollection(user_id, player_id, is_pre_callup) {
  await pool.query(`
    INSERT INTO user_collections (user_id, player_id, is_pre_callup)
    VALUES ($1, $2, $3)
    ON CONFLICT DO NOTHING
  `, [user_id, player_id, is_pre_callup]);
}

async function getCollection(user_id) {
  const res = await pool.query(`
    SELECT p.id, p.name, p.team, p.position, p.player_type, p.league_level,
           p.photo_url, c.card_grade, c.overall_score, uc.first_scouted_at, uc.is_pre_callup
    FROM user_collections uc
    JOIN players p ON p.id = uc.player_id
    LEFT JOIN player_cards c ON c.player_id = p.id
    WHERE uc.user_id = $1
    ORDER BY uc.first_scouted_at DESC
  `, [user_id]);
  return res.rows;
}

async function getScoutingComments(player_id) {
  const res = await pool.query(`
    SELECT v.comment, v.updated_at, u.nickname
    FROM scouting_votes v
    JOIN users u ON u.id = v.user_id
    WHERE v.player_id = $1 AND v.comment IS NOT NULL AND v.comment != ''
    ORDER BY v.updated_at DESC
  `, [player_id]);
  return res.rows;
}

async function getTopScouters() {
  const res = await pool.query(`
    SELECT u.nickname, p.total_xp, p.level, p.title, p.total_votes, p.accurate_votes
    FROM scouter_profiles p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.total_xp DESC
    LIMIT 10
  `);
  return res.rows;
}

async function getVoteDistribution(player_id) {
  const res = await pool.query(`
    SELECT 
      CASE 
        WHEN (stat1+stat2+stat3+stat4+stat5)/5 <= 30 THEN '20-30'
        WHEN (stat1+stat2+stat3+stat4+stat5)/5 <= 40 THEN '31-40'
        WHEN (stat1+stat2+stat3+stat4+stat5)/5 <= 50 THEN '41-50'
        WHEN (stat1+stat2+stat3+stat4+stat5)/5 <= 60 THEN '51-60'
        WHEN (stat1+stat2+stat3+stat4+stat5)/5 <= 70 THEN '61-70'
        ELSE '71-80'
      END as range,
      COUNT(*) as count
    FROM scouting_votes
    WHERE player_id = $1
    GROUP BY range
  `, [player_id]);
  
  const allRanges = ['20-30', '31-40', '41-50', '51-60', '61-70', '71-80'];
  const distMap = {};
  allRanges.forEach(r => distMap[r] = 0);
  res.rows.forEach(r => distMap[r.range] = parseInt(r.count));
  
  return allRanges.map(r => ({ range: r, count: distMap[r] }));
}

const LEVELS = [
  { level: 1, xp: 0, title: '🔰 루키 스카우터' },
  { level: 2, xp: 50, title: '👀 동네 야잘잘' },
  { level: 3, xp: 150, title: '📝 아마추어 분석가' },
  { level: 4, xp: 300, title: '🔍 프로 스카우터' },
  { level: 5, xp: 600, title: '👑 스카우팅 디렉터' },
  { level: 6, xp: 1000, title: '단장님' }
];

async function awardXP(user_id, isNewVote, player_id, isFutures) {
  let xp = 0;
  if (isNewVote) {
    xp += 10;
    if (isFutures) xp += 5;
  } else {
    xp += 2;
  }
  
  await addXP(user_id, xp, isNewVote ? 1 : 0);
  const profile = await getProfile(user_id);
  
  let newLevel = 1;
  let newTitle = LEVELS[0].title;
  for (let l of LEVELS) {
    if (profile.total_xp >= l.xp) {
      newLevel = l.level;
      newTitle = l.title;
    }
  }
  
  if (newLevel > profile.level) {
    await pool.query(`UPDATE scouter_profiles SET level = $1, title = $2 WHERE user_id = $3`, [newLevel, newTitle, user_id]);
    return { xpGained: xp, levelUp: true, level: newLevel, title: newTitle };
  }
  return { xpGained: xp, levelUp: false, level: profile.level, title: profile.title };
}

module.exports = {
  pool,
  upsertPlayer,
  upsertCard,
  upsertVote,
  aggregateVotes,
  recalibrateCard,
  getMyVote,
  getPlayerCard,
  getAllCards,
  getProfile,
  initProfile,
  addXP,
  addCollection,
  getCollection,
  getScoutingComments,
  getTopScouters,
  getVoteDistribution,
  LEVELS,
  awardXP
};
