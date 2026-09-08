const puppeteer = require('puppeteer-core');
const executablePath = require('child_process').execSync('which google-chrome-stable || which chromium').toString().trim();

(async () => {
  const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('response', response => {
    const url = response.url();
    if (url.includes('api') || url.includes('json') || url.includes('record') || url.includes('team')) {
      console.log('Intercepted:', url);
    }
  });
  await page.goto('https://sports.news.naver.com/kbaseball/record/index');
  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
})();
