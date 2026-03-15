import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  try {
    await page.goto('http://localhost:4173');
    await page.waitForTimeout(3000);
  } catch (e) {
    console.error('PUPPETEER ERROR:', e);
  }

  await browser.close();
})();
