const puppeteer = require('puppeteer');
const { SourceMapConsumer } = require('source-map');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('pageerror', async err => {
    console.log('\n--- REACT CRASH ---');
    console.log(err.stack);
    
    // Parse the first frame URL and line/col
    const match = err.stack.match(/at .+ \((http:\/\/[^:]+:\d+\/([^:]+)):(\d+):(\d+)\)/);
    if (match) {
      const scriptUrl = match[1];
      const filePath = match[2];
      const line = parseInt(match[3]);
      const col = parseInt(match[4]);
      
      console.log(`\nFetching source map for ${scriptUrl}...`);
      try {
        const response = await fetch(`${scriptUrl}.map`);
        const mapData = await response.json();
        const consumer = await new SourceMapConsumer(mapData);
        
        const pos = consumer.originalPositionFor({ line, column: col });
        console.log(`\nOriginal position:`);
        console.log(`Source: ${pos.source}`);
        console.log(`Line: ${pos.line}, Column: ${pos.column}`);
        console.log(`Name: ${pos.name}`);
        
        consumer.destroy();
      } catch (e) {
        console.log('Could not load source map:', e.message);
      }
    }
  });

  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
  process.exit(0);
})();
