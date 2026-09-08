const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://www.koreabaseball.com/Player/Search.aspx?searchWord=%EA%B9%80%EB%8F%84%EC%98%81');
  await page.waitForSelector('.tData tbody tr');
  
  const players = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.tData tbody tr'));
    return rows.map(tr => {
      const tds = tr.querySelectorAll('td');
      if(tds.length < 5) return null;
      const link = tr.querySelector('a')?.href || '';
      return {
        name: tds[1].innerText.trim(),
        team: tds[2].innerText.trim(),
        birth: tds[4].innerText.trim(),
        link: link
      };
    }).filter(Boolean);
  });
  
  console.log('Found:', players);
  
  if (players.length > 0 && players[0].link) {
    await page.goto(players[0].link);
    await page.waitForSelector('.player_basic');
    const info = await page.evaluate(() => {
      const lis = document.querySelectorAll('.player_basic ul li');
      let height_weight = '';
      let throws_bats = '';
      lis.forEach(li => {
        if(li.innerText.includes('신장/체중')) height_weight = li.innerText;
        if(li.innerText.includes('투타')) throws_bats = li.innerText;
      });
      return { height_weight, throws_bats };
    });
    console.log('Info:', info);
  }
  
  await browser.close();
})();
