const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://sports.news.naver.com/kbaseball/record/index.nhn?category=kbo');
  await page.waitForSelector('#regularTeamRecordList_table');
  const teams = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('#regularTeamRecordList_table tr')).map(tr => {
      const tds = tr.querySelectorAll('th, td');
      return Array.from(tds).map(td => td.innerText.trim());
    });
  });
  console.log(teams);
  await browser.close();
})();
