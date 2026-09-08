const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('teamrank.html');
const $ = cheerio.load(html);
$('table').each((i, t) => console.log('Table class:', $(t).attr('class')));
$('table tbody tr').each((i, tr) => {
  if(i < 3) console.log($(tr).text().trim().replace(/\s+/g, ' '));
});
