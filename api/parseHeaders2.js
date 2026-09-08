const cheerio = require('cheerio');
const fs = require('fs');

const parseHeaders = (filename) => {
  const html = fs.readFileSync(filename);
  const $ = cheerio.load(html);
  const headers = [];
  $('table.tData01 thead th').each((i, el) => {
    headers.push($(el).text().trim());
  });
  return headers;
};

console.log('Pitcher2 Headers:', parseHeaders('pitcher2.html'));
