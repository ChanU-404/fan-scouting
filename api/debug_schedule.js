const axios = require('axios');
const cheerio = require('cheerio');

const AXIOS_CONFIG = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'http://www.korea-baseball.com/'
  }
};

async function testSchedule(targetDateStr) {
  const url = "http://www.korea-baseball.com/game/game_list?kind_cd=31&season=2026";
  const { data } = await axios.get(url, AXIOS_CONFIG);
  const $ = cheerio.load(data);
  const matches = [];

  console.log(`Searching for date: ${targetDateStr}`);
  
  $('.game_list > li').each((i, el) => {
    const dateText = $(el).find('h4').text().trim();
    console.log(`Found date header: [${dateText}]`);
    if (dateText.includes(targetDateStr)) {
      $(el).find('.list li').each((j, gEl) => {
        const $g = $(gEl);
        const home = $g.find('.team2 .team').text().trim();
        const away = $g.find('.team1 .team').text().trim();
        console.log(`Match: ${away} vs ${home}`);
      });
    }
  });
}

testSchedule("05.02"); // Testing with a date that definitely has games based on browser state
