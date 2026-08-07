const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  // Check if loaded is true by checking if the INITIALIZING SYSTEM text is gone
  const initializingText = await page.evaluate(() => {
    return document.body.innerText.includes('INITIALIZING SYSTEM...');
  });
  
  console.log(`Still initializing (not loaded): ${initializingText}`);
  
  await browser.close();
  process.exit(0);
})();
