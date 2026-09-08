const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://www.koreabaseball.com/Record/Team/RegularSeason/Basic.aspx');
  const tables = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('table')).map(t => t.className);
  });
  console.log('Tables:', tables);
  await browser.close();
})();
