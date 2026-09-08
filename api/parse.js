const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('hitter.html');
const $ = cheerio.load(html);
$('table').each((i, table) => {
  console.log('Table class:', $(table).attr('class'));
  console.log('Sample row:', $(table).find('tr:nth-child(2)').text().trim().replace(/\s+/g, ' '));
});
