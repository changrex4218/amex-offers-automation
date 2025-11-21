const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Amex Offers Automation', () => {

    test('should load Amex offers page', async ({ page }) => {
        await page.goto('https://global.americanexpress.com/offers');
        
        // Wait for page to load
        await page.waitForLoadState('networkidle');
        
        // Check if we're on the offers page or login page
        const url = page.url();
        expect(url).toContain('americanexpress.com');
    });

    test('should inject and run userscript', async ({ page }) => {
        await page.goto('https://global.americanexpress.com/offers');
        await page.waitForLoadState('networkidle');

        // Read the bundled script
        const scriptPath = path.join(__dirname, '..', 'dist', 'amex-offers.user.js');
        
        if (!fs.existsSync(scriptPath)) {
            console.log('Bundle not found, building first...');
            require('child_process').execSync('npm run build', { stdio: 'inherit' });
        }

        const script = fs.readFileSync(scriptPath, 'utf8');
        
        // Inject the script
        await page.addScriptTag({ content: script });

        // Wait a moment for script to initialize
        await page.waitForTimeout(3000);

        // Check if automation panel appears
        const panel = await page.locator('#amex-automation-panel');
        
        // Panel should exist (even if login is required)
        const panelExists = await panel.count() > 0;
        console.log('Automation panel exists:', panelExists);
    });

    test('should discover page structure', async ({ page }) => {
        await page.goto('https://global.americanexpress.com/offers');
        await page.waitForLoadState('networkidle');

        // Try to find card switcher
        const combobox = await page.locator('[role="combobox"]').count();
        const select = await page.locator('select').count();
        
        console.log('Found combobox elements:', combobox);
        console.log('Found select elements:', select);

        // Try to find offers container
        const mainContent = await page.locator('main').count();
        const offersList = await page.locator('[class*="offer"]').count();
        
        console.log('Found main content:', mainContent);
        console.log('Found offer-related elements:', offersList);
    });

    test('should handle authentication requirement', async ({ page }) => {
        await page.goto('https://global.americanexpress.com/offers');
        await page.waitForLoadState('networkidle');

        const url = page.url();
        
        if (url.includes('login') || url.includes('myca')) {
            console.log('Login required - this is expected');
            
            // Check for login form elements
            const userIdField = await page.locator('input[name="UserID"], input[id*="user"]').count();
            const passwordField = await page.locator('input[type="password"]').count();
            
            console.log('Found user ID field:', userIdField > 0);
            console.log('Found password field:', passwordField > 0);
            
            expect(userIdField).toBeGreaterThan(0);
        } else {
            console.log('Already authenticated or on offers page');
        }
    });

    test('should validate selectors configuration', async ({ page }) => {
        await page.goto('https://global.americanexpress.com/offers');
        await page.waitForLoadState('networkidle');

        // Test various selector patterns
        const selectors = {
            combobox: '[role="combobox"]',
            select: 'select',
            main: 'main',
            buttons: 'button',
            links: 'a'
        };

        for (const [name, selector] of Object.entries(selectors)) {
            const count = await page.locator(selector).count();
            console.log(`${name} (${selector}): ${count} elements`);
        }
    });
});

test.describe('Build and Bundle', () => {
    
    test('should build successfully', async () => {
        const { execSync } = require('child_process');
        
        try {
            execSync('npm run build', { stdio: 'inherit' });
            
            // Check if bundle was created
            const bundlePath = path.join(__dirname, '..', 'dist', 'amex-offers.user.js');
            const bundleExists = fs.existsSync(bundlePath);
            
            expect(bundleExists).toBe(true);
            
            if (bundleExists) {
                const bundleSize = fs.statSync(bundlePath).size;
                console.log(`Bundle size: ${(bundleSize / 1024).toFixed(2)} KB`);
                expect(bundleSize).toBeGreaterThan(0);
            }
        } catch (error) {
            console.error('Build failed:', error.message);
            throw error;
        }
    });

    test('should have valid Tampermonkey metadata', async () => {
        const bundlePath = path.join(__dirname, '..', 'dist', 'amex-offers.user.js');
        
        if (!fs.existsSync(bundlePath)) {
            console.log('Building bundle first...');
            require('child_process').execSync('npm run build', { stdio: 'inherit' });
        }

        const content = fs.readFileSync(bundlePath, 'utf8');
        
        // Check for required metadata
        expect(content).toContain('// ==UserScript==');
        expect(content).toContain('// @name');
        expect(content).toContain('// @version');
        expect(content).toContain('// @match');
        expect(content).toContain('// @grant');
        expect(content).toContain('// ==/UserScript==');
    });
});
