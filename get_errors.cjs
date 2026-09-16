const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
  });

  page.on('requestfailed', request => {
    errors.push(`Request failed: ${request.url()} - ${request.failure().errorText}`);
  });

  await page.goto('http://localhost:5173/admin_dashboard?role=admin', { waitUntil: 'networkidle0' }).catch(e => errors.push(e.message));
  
  fs.writeFileSync('browser-errors.log', errors.join('\n'));
  
  await browser.close();
})();
