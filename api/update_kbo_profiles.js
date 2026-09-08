const axios = require('axios');
const cheerio = require('cheerio');
const { db } = require('./db');

async function updateKboProfiles() {
  const players = db.prepare('SELECT id, name, team, player_type FROM players WHERE is_active = 1 AND birth IS NULL').all();
  console.log(`총 ${players.length}명의 KBO 프로필 업데이트를 시작합니다...`);

  for (const p of players) {
    try {
      // 1. 선수 검색
      const searchRes = await axios.post('https://www.koreabaseball.com/Player/Search.aspx', `searchWord=${encodeURIComponent(p.name)}`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      const $ = cheerio.load(searchRes.data);
      let kboId = null;
      let detailUrl = '';

      // 동명이인 처리 로직 (팀 이름으로 매칭)
      $('.tData tbody tr').each((i, el) => {
        const rowTeam = $(el).find('td:nth-child(3)').text().trim();
        if (rowTeam.includes(p.team) || p.team.includes(rowTeam) || rowTeam === p.team) {
          const aTag = $(el).find('td:nth-child(2) a');
          const href = aTag.attr('href');
          if (href) {
            kboId = href.split('playerId=')[1];
            detailUrl = 'https://www.koreabaseball.com' + href;
          }
        }
      });

      if (!kboId) {
        console.log(`[${p.name}] - KBO 검색 실패 (팀 매칭 실패)`);
        continue;
      }

      // 2. 상세 페이지 파싱
      const detailRes = await axios.get(detailUrl);
      const $d = cheerio.load(detailRes.data);
      
      let birth = '';
      let throws_bats = '';
      let height = null;
      let weight = null;

      $d('.player_basic ul li').each((i, el) => {
        const text = $d(el).text();
        if (text.includes('생년월일')) {
          birth = text.split(':')[1]?.trim() || '';
          if(birth.includes('년')) {
             // 2003년 10월 02일 -> 2003.10.02
             birth = birth.replace('년 ', '.').replace('월 ', '.').replace('일', '');
          }
        }
        if (text.includes('신장/체중')) {
          const hw = text.split(':')[1]?.trim() || '';
          const match = hw.match(/(\d+)cm\/(\d+)kg/);
          if (match) {
            height = parseInt(match[1]);
            weight = parseInt(match[2]);
          }
        }
        if (text.includes('투타')) {
          throws_bats = text.split(':')[1]?.trim() || '';
        }
      });

      // 3. DB 업데이트
      const updateStmt = db.prepare(`
        UPDATE players 
        SET birth = ?, height = COALESCE(?, height), weight = COALESCE(?, weight), throws_bats = ?
        WHERE id = ?
      `);
      updateStmt.run(birth, height, weight, throws_bats, p.id);
      console.log(`[${p.name}] - 업데이트 완료: ${birth} | ${throws_bats}`);
      
      // 서버 과부하 방지
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.log(`[${p.name}] - 에러: ${e.message}`);
    }
  }
  
  console.log('KBO 프로필 업데이트 작업이 완료되었습니다.');
}

updateKboProfiles();
