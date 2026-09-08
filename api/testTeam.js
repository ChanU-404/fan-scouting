const axios = require('axios');
const cheerio = require('cheerio');
axios.get('https://www.koreabaseball.com/Record/Team/RegularSeason/Basic.aspx', {
  headers: { 'User-Agent': 'Mozilla/5.0' }
}).then(r => {
  const $ = cheerio.load(r.data);
  const tables = [];
  $('table').each((i, el) => tables.push($(el).attr('class')));
  console.log('Tables:', tables);
});
