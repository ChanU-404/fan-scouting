const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  const url = "http://www.korea-baseball.com/record/record/league_record?kind_cd=31&season=2026&lig_idx=1367";
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  
  const leftItems = $('.record_left li').toArray();
  const listItems = $('.record_list li').toArray();
  
  console.log(`Found ${leftItems.length} left items and ${listItems.length} list items`);
  
  leftItems.forEach((el, i) => {
    const $left = $(el);
    const name = $left.find('.team').text().trim();
    console.log(`Row ${i}: Name=[${name}]`);
  });
}

test();
