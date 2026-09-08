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
         continue;
      }
      
      const detailRes = await axios.get(detailUrl);
      const $d = cheerio.load(detailRes.data);
      let throws_bats = '';
      
      $d('.player_basic ul li').each((i, el) => {
        const text = $d(el).text();
        if (text.includes('포지션')) {
            const posFull = text.split(':')[1]?.trim() || '';
            const match = posFull.match(/\((.*?)\)/);
            if (match) throws_bats = match[1];
        }
      });
      
      if (throws_bats) {
        db.prepare('UPDATE players SET throws_bats=? WHERE id=?').run(throws_bats, p.id);
        console.log('Fixed', p.name, throws_bats);
      }
    } catch(e) {
      console.log('Error', p.name, e.message);
    }
    
    // throttle
    await new Promise(r => setTimeout(r, 200));
  }
}
fixKboProfiles();
