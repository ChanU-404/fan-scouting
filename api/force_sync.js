const axios = require('axios');
const { db, stmts } = require('./db');

async function syncPlayersFromNaver() {
  const year = new Date().getFullYear();
  try {
    const [hRes, pRes] = await Promise.all([
      axios.get(`https://api-gw.sports.naver.com/statistics/categories/kbo/seasons/${year}/players?playerType=HITTER&gameType=REGULAR_SEASON&pageSize=300&sort=OPS`),
      axios.get(`https://api-gw.sports.naver.com/statistics/categories/kbo/seasons/${year}/players?playerType=PITCHER&gameType=REGULAR_SEASON&pageSize=300&sort=ERA`)
    ]);

    const hitters = hRes.data?.result?.seasonPlayerStats || [];
    const pitchers = pRes.data?.result?.seasonPlayerStats || [];

    const syncAll = db.transaction((players, type, league) => {
      for (const p of players) {
        const naverId = String(p.playerId || p.person_no || '');
        if (!naverId) continue;

        stmts.upsertPlayer.run({
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
        });
      }
    });

    syncAll(hitters, 'BATTER', 'FIRST');
    syncAll(pitchers, 'PITCHER', 'FIRST');
    console.log(`[DB Sync] 완료 — H:${hitters.length} P:${pitchers.length}`);
  } catch(e) {
    console.error('[DB Sync Error]', e.message);
  }
}

syncPlayersFromNaver();
