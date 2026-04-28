
const puppeteer = require('puppeteer');

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: 'new' });
    } catch(e) {
        console.log("Puppeteer not found, trying playwright...");
        const { chromium } = require('playwright');
        browser = await chromium.launch();
    }
    
    const page = await browser.newPage();
    
    page.on('pageerror', err => {
        console.error('=== PAGE ERROR ===');
        console.error(err.message);
    });

    page.on('console', msg => {
        if(msg.type() === 'error') {
            console.error('=== CONSOLE ERROR ===');
            console.error(msg.text());
        }
    });

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 10000 }).catch(e => console.log(e));
    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
})();
