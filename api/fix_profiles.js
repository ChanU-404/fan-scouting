const axios = require('axios');
const cheerio = require('cheerio');
const { db } = require('./db');

async function fixKboProfiles() {
  const players = db.prepare("SELECT id, name, team FROM players WHERE throws_bats IS NULL OR throws_bats = ''").all();
  console.log('Fixing', players.length, 'players');
  for (const p of players) {
    try {
      const searchRes = await axios.post('https://www.koreabaseball.com/Player/Search.aspx', 'searchWord='+encodeURIComponent(p.name), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      const $ = cheerio.load(searchRes.data);
      let kboId = null;
      let detailUrl = '';
      $('.tEx tbody tr').each((i, el) => {
        const rowTeam = $(el).find('td:nth-child(3)').text().trim();
        if (rowTeam.includes(p.team) || p.team.includes(rowTeam) || rowTeam === p.team) {
          const href = $(el).find('td:nth-child(2) a').attr('href');
          if (href) detailUrl = 'https://www.koreabaseball.com' + href;
        }
      });
      if (!detailUrl) {
         console.log('Not found in search table:', p.name);
         continue;
      }
      const detailRes = await axios.get(detailUrl);
      const $d = cheerio.load(detailRes.data);
      let birth = '', throws_bats = '', height=null, weight=null;
      $d('.player_basic ul li').each((i, el) => {
        const text = $d(el).text();
        if (text.includes('생년월일')) {
            birth = text.split(':')[1]?.trim() || '';
            if(birth.includes('년')) birth = birth.replace('년 ','.').replace('월 ','.').replace('일','');
        }
        if (text.includes('투타')) throws_bats = text.split(':')[1]?.trim() || '';
        if (text.includes('신장/체중')) {
           const match = text.match(/(\d+)cm\/(\d+)kg/);
           if(match){ height = parseInt(match[1]); weight = parseInt(match[2]); }
        }
      });
      db.prepare('UPDATE players SET birth=?, throws_bats=?, height=COALESCE(height,?), weight=COALESCE(weight,?) WHERE id=?').run(birth, throws_bats, height, weight, p.id);
      console.log('Fixed', p.name, throws_bats);
    } catch(e) {
      console.log('Error', p.name, e.message);
    }
  }
}
fixKboProfiles();
