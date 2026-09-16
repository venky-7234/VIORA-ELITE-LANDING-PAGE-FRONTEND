const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  // Navigate to login
  await page.goto('http://localhost:5173/login');
  
  // Wait for email input
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'eventmanager@vioraelite.com');
  await page.type('input[type="password"]', 'password123');
  
  // Click login button
  await page.click('button[type="submit"]');
  
  // Wait a bit to see if we navigate and if errors occur
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const url = page.url();
  console.log('Current URL after login:', url);
  
  await browser.close();
})();
