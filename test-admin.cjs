const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  // Navigate directly to admin dashboard with auto-login param
  await page.goto('http://localhost:5173/admin-dashboard?role=admin');
  
  // Wait a bit to see if we navigate and if errors occur
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const url = page.url();
  console.log('Current URL after navigation:', url);
  
  await browser.close();
})();
