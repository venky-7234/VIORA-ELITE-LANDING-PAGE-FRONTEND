const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:5173/login');
  
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'eventmanager@vioraelite.com');
  await page.type('input[type="password"]', 'password123');
  
  // Wait for the login button and click it
  await page.evaluate(() => document.querySelector('button[type="button"]').click());
  await page.click('button[type="submit"]');
  
  // Wait a bit to let it login and navigate
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const url = page.url();
  console.log('Current URL after login:', url);
  await page.screenshot({ path: 'test-login-screenshot.png' });
  
  await browser.close();
})();
