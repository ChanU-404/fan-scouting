const express = require('express');
const router = express.Router();
const axios = require('axios');
const { signToken, hashPassword, comparePassword, requireAuth, optionalAuth } = require('./auth');
const dbModule = require('./db');
const { pool, upsertPlayer, upsertCard, upsertVote, getMyVote, getPlayerCard, getAllCards, getProfile, initProfile, addCollection, getCollection, getScoutingComments, getTopScouters, getVoteDistribution, recalibrateCard, awardXP, LEVELS } = dbModule;
const { generateSeedScores } = require('./calibrate');

// ─── 선수 DB 동기화 헬퍼 ─────────────────────────────────────────────────────

async function syncPlayersFromNaver() {
  const year = new Date().getFullYear();
  try {
    const [hRes, pRes] = await Promise.all([
      axios.get(`https://api-gw.sports.naver.com/statistics/categories/kbo/seasons/${year}/players?playerType=HITTER&gameType=REGULAR_SEASON&pageSize=300&sort=OPS`),
      axios.get(`https://api-gw.sports.naver.com/statistics/categories/kbo/seasons/${year}/players?playerType=PITCHER&gameType=REGULAR_SEASON&pageSize=300&sort=ERA`)
    ]);

    const hitters = hRes.data?.result?.seasonPlayerStats || [];
    const pitchers = pRes.data?.result?.seasonPlayerStats || [];

    const syncAll = async (players, type, league) => {
      for (const p of players) {
        const naverId = String(p.playerId || p.person_no || '');
        if (!naverId) continue;

        const playerObj = {
          naver_id: naverId,
          name: p.playerName || p.name || '',
          team: p.teamName || p.team || '',
          back_number: p.backNumber || '',
          position: p.positionGroupCode || p.position || '',
          player_type: type,
          league_level: league,
          photo_url: p.playerImageUrl || p.imageUrl || '',
          season: year,
          birth: null,
          height: p.height || null,
          weight: p.weight || null,
          throws_bats: null,
          record_avg: parseFloat(p.hitterHra || 0) || null,
          record_hr: parseInt(p.hitterHr || 0) || null,
          record_ops: parseFloat(p.hitterOps || 0) || null,
          record_era: parseFloat(p.pitcherEra || 0) || null,
          record_win: parseInt(p.pitcherWin || 0) || null,
          record_so: parseInt(p.pitcherKk || 0) || null
        };
        await upsertPlayer(playerObj);

        const playerRes = await pool.query('SELECT id FROM players WHERE naver_id = $1', [naverId]);
        if (playerRes.rows.length === 0) continue;
        const playerId = playerRes.rows[0].id;

        const cardRes = await pool.query('SELECT id FROM player_cards WHERE player_id = $1', [playerId]);
        if (cardRes.rows.length === 0) {
          const statObj = {
            avg: parseFloat(p.hitterHra || 0),
            hr: parseInt(p.hitterHr || 0),
            bb: parseInt(p.hitterBb || p.bb || 0),
            sb: parseInt(p.hitterSb || 0),
            ops: parseFloat(p.hitterOps || 0),
            era: parseFloat(p.pitcherEra || 4.0),
            so: parseInt(p.pitcherKk || 0),
            ip: p.pitcherInning || '0',
            win: parseInt(p.pitcherWin || 0),
            g: parseInt(p.pitcherGameCount || p.hitterGameCount || 1),
          };
          const seeds = generateSeedScores(statObj, type);
          const total = seeds.reduce((a,b)=>a+b,0);
          const overall = Math.max(20, Math.min(80, Math.round(total / 5 / 5) * 5));
          const grade = total >= 350 ? 'S' : total >= 300 ? 'A' : total >= 250 ? 'B' : total >= 200 ? 'C' : 'D';
          
          await upsertCard({
            player_id: playerId,
            stat1: seeds[0], stat2: seeds[1], stat3: seeds[2],
            stat4: seeds[3], stat5: seeds[4],
            stat1_pot: Math.min(80, seeds[0] + 10), stat2_pot: Math.min(80, seeds[1] + 10), stat3_pot: Math.min(80, seeds[2] + 10),
            stat4_pot: Math.min(80, seeds[3] + 10), stat5_pot: Math.min(80, seeds[4] + 10),
            overall_score: overall, total_score: total,
            card_grade: grade, vote_count: 0, score_source: 'SEED', std_dev: 0
          });
        }
      }
    };

    await syncAll(hitters, 'BATTER', 'FIRST');
    await syncAll(pitchers, 'PITCHER', 'FIRST');
    console.log(`[DB Sync] 완료 — H:${hitters.length} P:${pitchers.length}`);
  } catch(e) {
    console.error('[DB Sync Error]', e.message);
  }
}

// 서버 시작 시 동기화 (Vercel 환경에서는 호출 안함 - 나중에 cron으로 대체 가능)
// syncPlayersFromNaver();

// ─── 인증 ────────────────────────────────────────────────────────────────────

router.post('/auth/w2m', async (req, res) => {
  const { nickname, password } = req.body || {};
  if (!nickname) return res.status(400).json({ error: '닉네임을 입력해주세요.' });

  try {
    const userRes = await pool.query('SELECT * FROM users WHERE nickname = $1', [nickname]);
    let user = userRes.rows[0];
    
    if (!user) {
      const hash = password ? await hashPassword(password) : '';
      const email = `${nickname}_${Date.now()}@local.com`;
      const insertRes = await pool.query(`INSERT INTO users (nickname, email, password_hash, auth_provider) VALUES ($1, $2, $3, 'W2M') RETURNING *`, [nickname, email, hash]);
      user = insertRes.rows[0];
      await initProfile(user.id);
    } else {
      if (user.password_hash) {
        if (!password) return res.status(401).json({ error: '비밀번호를 입력해주세요.' });
        const ok = await comparePassword(password, user.password_hash);
        if (!ok) return res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
      }
      await pool.query(`UPDATE users SET last_login_at=CURRENT_TIMESTAMP WHERE id=$1`, [user.id]);
    }

    const token = signToken({ id: user.id, nickname: user.nickname, email: user.email });
    res.json({ token, user: { id: user.id, nickname: user.nickname, email: user.email } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '로그인 실패' });
  }
});


router.post('/auth/register', async (req, res) => {
  const { nickname, email, password } = req.body || {};
  if (!nickname || !email || !password)
    return res.status(400).json({ error: '닉네임, 이메일, 비밀번호를 모두 입력해주세요.' });
  if (password.length < 6)
    return res.status(400).json({ error: '비밀번호는 최소 6자 이상이어야 합니다.' });
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: '이미 사용 중인 이메일입니다.' });

    const hash = await hashPassword(password);
    const insertRes = await pool.query(`INSERT INTO users (nickname, email, password_hash, auth_provider) VALUES ($1, $2, $3, 'LOCAL') RETURNING id`, [nickname, email, hash]);
    const userId = insertRes.rows[0].id;
    await initProfile(userId);

    const token = signToken({ id: userId, nickname, email });
    res.status(201).json({ token, user: { id: userId, nickname, email } });
  } catch (e) {
    if (e.code === '23505') // unique violation
      return res.status(409).json({ error: '이미 사용 중인 닉네임 또는 이메일입니다.' });
    res.status(500).json({ error: '회원가입 실패' });
  }
});

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });
  try {
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userRes.rows[0];
    if (!user) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });

    const ok = await comparePassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });

    await pool.query(`UPDATE users SET last_login_at=CURRENT_TIMESTAMP WHERE id=$1`, [user.id]);
    const token = signToken({ id: user.id, nickname: user.nickname, email: user.email });
    res.json({ token, user: { id: user.id, nickname: user.nickname, email: user.email } });
  } catch (e) {
    res.status(500).json({ error: '로그인 실패' });
  }
});

router.get('/auth/me', requireAuth, async (req, res) => {
  try {
    const userRes = await pool.query('SELECT id, nickname, email FROM users WHERE id = $1', [req.user.id]);
    const user = userRes.rows[0];
    await initProfile(req.user.id);
    const profile = await getProfile(req.user.id);
    res.json({ user, profile });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── 카드 API ────────────────────────────────────────────────────────────────

router.get('/cards', optionalAuth, async (req, res) => {
  const { team, type, league, grade, sort = 'overall', search } = req.query;

  let query = `
    SELECT p.id, p.name, p.team, p.position, p.player_type, p.league_level, p.photo_url, p.naver_id,
           c.stat1, c.stat2, c.stat3, c.stat4, c.stat5,
           c.overall_score, c.total_score, c.card_grade, c.vote_count, c.score_source, c.std_dev
           ${req.user ? `, (SELECT true FROM scouting_votes v WHERE v.player_id = p.id AND v.user_id = ${req.user.id} LIMIT 1) as "myVote"` : ''}
    FROM players p
    LEFT JOIN player_cards c ON c.player_id = p.id
    WHERE p.is_active = 1
  `;
  const params = [];
  let paramIdx = 1;
  if (team)   { query += ` AND p.team = $${paramIdx++}`;         params.push(team); }
  if (type)   { query += ` AND p.player_type = $${paramIdx++}`;  params.push(type.toUpperCase()); }
  if (league) { query += ` AND p.league_level = $${paramIdx++}`; params.push(league.toUpperCase()); }
  if (grade)  { query += ` AND c.card_grade = $${paramIdx++}`;   params.push(grade.toUpperCase()); }
  if (search) { query += ` AND p.name LIKE $${paramIdx++}`;      params.push(`%${search}%`); }

  const sortMap = {
    overall: 'c.overall_score DESC NULLS LAST',
    total: 'c.total_score DESC NULLS LAST',
    votes: 'c.vote_count DESC NULLS LAST',
    name: 'p.name ASC',
    grade: "CASE c.card_grade WHEN 'S' THEN 1 WHEN 'A' THEN 2 WHEN 'B' THEN 3 WHEN 'C' THEN 4 ELSE 5 END ASC"
  };
  query += ` ORDER BY ${sortMap[sort] || 'c.overall_score DESC NULLS LAST'}`;

  try {
    const cards = await pool.query(query, params);
    res.json(cards.rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/cards/:playerId', optionalAuth, async (req, res) => {
  try {
    const card = await getPlayerCard(parseInt(req.params.playerId));
    if (!card) return res.status(404).json({ error: '선수를 찾을 수 없습니다.' });

    let myVote = null;
    if (req.user) {
      myVote = await getMyVote(req.user.id, card.id);
    }
    
    const distribution = await getVoteDistribution(card.id);

    res.json({ ...card, myVote, distribution, history: [] }); // history is deprecated for now due to complexity, but we can restore it later
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── 투표 API ────────────────────────────────────────────────────────────────

router.post('/votes', requireAuth, async (req, res) => {
  const { player_id, stat1, stat2, stat3, stat4, stat5, stat1_pot, stat2_pot, stat3_pot, stat4_pot, stat5_pot, comment } = req.body || {};

  if (!player_id) return res.status(400).json({ error: 'player_id가 필요합니다.' });
  
  const statsArr = [stat1, stat2, stat3, stat4, stat5, stat1_pot, stat2_pot, stat3_pot, stat4_pot, stat5_pot];
  if (statsArr.some(s => typeof s !== 'number' || s < 20 || s > 80 || !Number.isInteger(s)))
    return res.status(400).json({ error: '각 능력치는 20~80 사이의 정수여야 합니다.' });

  try {
    const playerRes = await pool.query('SELECT * FROM players WHERE id = $1', [player_id]);
    const player = playerRes.rows[0];
    if (!player) return res.status(404).json({ error: '선수를 찾을 수 없습니다.' });

    const existingVote = await getMyVote(req.user.id, player_id);
    const isNewVote = !existingVote;

    await upsertVote({
      user_id: req.user.id, player_id,
      stat1, stat2, stat3, stat4, stat5,
      stat1_pot, stat2_pot, stat3_pot, stat4_pot, stat5_pot,
      comment: comment || null
    });

    await addCollection(req.user.id, player_id, player.league_level === 'FUTURES' ? 1 : 0);

    const currentCardRes = await pool.query('SELECT * FROM player_cards WHERE player_id = $1', [player_id]);
    const currentCard = currentCardRes.rows[0];
    const seedStats = currentCard
      ? [currentCard.stat1, currentCard.stat2, currentCard.stat3, currentCard.stat4, currentCard.stat5]
      : generateSeedScores({}, player.player_type);
    const seedStatsPot = currentCard
      ? [currentCard.stat1_pot, currentCard.stat2_pot, currentCard.stat3_pot, currentCard.stat4_pot, currentCard.stat5_pot]
      : seedStats.map(s => Math.min(80, s + 10));

    const calibrated = await recalibrateCard(player_id, seedStats, seedStatsPot);
    const xpResult = await awardXP(req.user.id, isNewVote, player_id, player.league_level === 'FUTURES');

    res.json({
      message: isNewVote ? '스카우팅 리포트가 제출되었습니다! ⚾' : '평가가 수정되었습니다.',
      card: calibrated,
      xp: xpResult,
      isNewVote
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/votes/my', requireAuth, async (req, res) => {
  const { player_id } = req.query;
  try {
    if (player_id) {
      const vote = await getMyVote(req.user.id, parseInt(player_id));
      return res.json(vote || null);
    }
    const votes = await pool.query(`
      SELECT v.*, p.name, p.team, p.player_type, p.league_level
      FROM scouting_votes v JOIN players p ON p.id = v.player_id
      WHERE v.user_id = $1
      ORDER BY v.updated_at DESC
    `, [req.user.id]);
    res.json(votes.rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/votes/comments', async (req, res) => {
  const { player_id } = req.query;
  if (!player_id) return res.status(400).json({ error: 'player_id is required' });

  try {
    const comments = await getScoutingComments(player_id);
    res.json(comments);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── 프로필 ─────────────────────────────────────────────────────────────────

router.get('/profile', requireAuth, async (req, res) => {
  try {
    await initProfile(req.user.id);
    const profile = await getProfile(req.user.id);
    const xpForNext = LEVELS.find(l => l.xp > (profile?.total_xp || 0));
    const collectionCountRes = await pool.query('SELECT COUNT(*) as cnt FROM user_collections WHERE user_id = $1', [req.user.id]);
    res.json({ ...profile, xpForNext: xpForNext?.xp || null, levelInfo: LEVELS, collectionCount: parseInt(collectionCountRes.rows[0].cnt) });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── 리더보드 ────────────────────────────────────────────────────────────────

router.get('/leaderboard', async (req, res) => {
  try {
    const board = await getTopScouters();
    res.json(board);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── 컬렉션 ──────────────────────────────────────────────────────────────────

router.get('/collection', requireAuth, async (req, res) => {
  try {
    const collection = await getCollection(req.user.id);
    const totalRes = await pool.query('SELECT COUNT(*) as cnt FROM players WHERE is_active = 1');
    res.json({ collection, total: parseInt(totalRes.rows[0].cnt), owned: collection.length });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── DB 선수 목록 ────────────────────────────────────────────────────────────

router.get('/players/db', optionalAuth, async (req, res) => {
  const { team, type, league, search } = req.query;
  let query = `
    SELECT p.*, c.stat1, c.stat2, c.stat3, c.stat4, c.stat5,
           c.overall_score, c.card_grade, c.vote_count, c.score_source
    FROM players p
    LEFT JOIN player_cards c ON c.player_id = p.id
    WHERE p.is_active = 1
  `;
  const params = [];
  let paramIdx = 1;
  if (team)   { query += ` AND p.team = $${paramIdx++}`;         params.push(team); }
  if (type)   { query += ` AND p.player_type = $${paramIdx++}`;  params.push(type.toUpperCase()); }
  if (league) { query += ` AND p.league_level = $${paramIdx++}`; params.push(league.toUpperCase()); }
  if (search) { query += ` AND p.name LIKE $${paramIdx++}`;      params.push(`%${search}%`); }
  query += ` ORDER BY c.overall_score DESC NULLS LAST, p.name ASC`;

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/kbo-teams', async (req, res) => {
  try {
    const teams = await pool.query(`SELECT DISTINCT team FROM players WHERE is_active = 1 ORDER BY team`);
    res.json(teams.rows.map(t => t.team));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
