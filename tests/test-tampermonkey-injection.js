/**
 * Test Tampermonkey script injection
 * This simulates how Tampermonkey would inject the script into the page
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testTampermonkeyInjection() {
    console.log('=== Testing Tampermonkey Script Injection ===\n');

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Listen for console messages
    const consoleMessages = [];
    page.on('console', msg => {
        const text = msg.text();
        consoleMessages.push(text);
        console.log(`[Browser Console] ${text}`);
    });

    // Read the Tampermonkey script
    const scriptPath = path.join(__dirname, '..', 'amex-offers.user.js');
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');

    // Extract just the script body (remove metadata block)
    const scriptBody = scriptContent.replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\n\n/, '');

    console.log('Setting up script injection (simulating Tampermonkey)...');
    
    // Use addInitScript to inject before page loads (bypasses CSP like Tampermonkey does)
    await page.addInitScript(scriptBody);

    // Navigate to Amex offers page
    console.log('Navigating to Amex offers page...');
    await page.goto('https://global.americanexpress.com/offers', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
    });

    // Wait for script to initialize
    await page.waitForTimeout(2000);

    console.log('\n=== Test Results ===');
    
    // Check for initialization message
    const initMessage = consoleMessages.find(msg => msg.includes('[Amex Automation] Script loaded - v1.0.0'));
    
    if (initMessage) {
        console.log('✓ Script initialization message found');
        console.log(`  Message: "${initMessage}"`);
    } else {
        console.log('✗ Script initialization message NOT found');
        console.log('  Console messages:', consoleMessages);
    }

    console.log('\n=== Summary ===');
    console.log(`Initialization message: ${initMessage ? '✓' : '✗'}`);
    console.log(`Total console messages: ${consoleMessages.length}`);

    // Keep browser open for manual inspection
    console.log('\nBrowser will remain open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);

    await browser.close();

    if (initMessage) {
        console.log('\n✓ All tests passed!');
        process.exit(0);
    } else {
        console.log('\n✗ Tests failed!');
        process.exit(1);
    }
}

testTampermonkeyInjection().catch(error => {
    console.error('Test failed with error:', error);
    process.exit(1);
});
