const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeKBO() {
  try {
    const res = await axios.get('https://www.koreabaseball.com/Record/Team/RegularSeason/Basic.aspx', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const $ = cheerio.load(res.data);
    const teams = [];
    $('.tData tbody tr').each((i, el) => {
      const rank = $(el).find('td:nth-child(1)').text().trim();
      const name = $(el).find('td:nth-child(2)').text().trim();
      const games = $(el).find('td:nth-child(3)').text().trim();
      const wins = $(el).find('td:nth-child(4)').text().trim();
      const losses = $(el).find('td:nth-child(5)').text().trim();
      const draws = $(el).find('td:nth-child(6)').text().trim();
      const winRate = $(el).find('td:nth-child(7)').text().trim();
      const gamesBehind = $(el).find('td:nth-child(8)').text().trim();
      if(name) {
        teams.push({ rank, name, games, wins, losses, draws, winRate, gamesBehind });
      }
    });
    console.log(teams);
  } catch (e) {
    console.error("Error:", e.message);
  }
}
scrapeKBO();
