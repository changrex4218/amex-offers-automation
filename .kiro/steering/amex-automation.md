---
inclusion: always
---

# Amex Offers Automation Project

## Purpose
Automate adding American Express offers to all cards in user account using a Tampermonkey userscript.

## Technical Stack
- **Tampermonkey userscript** - Browser automation
- **MCP Playwright** - Testing and validation
- **Google Sheets API** - Logging (optional)
- **Kiro IDE** - Development environment
- **GitHub** - Hosting and auto-updates

## Target URL
```
https://global.americanexpress.com/offers
```

## Key Features
1. ✅ Modular ES6+ architecture
2. ✅ Auto-build system with Kiro hooks
3. ✅ Multi-card support
4. ✅ Real-time progress UI panel
5. ✅ GitHub hosting with auto-updates
6. ✅ Google Sheets logging integration
7. ✅ Error handling and retry logic
8. ✅ Export results to JSON

## Project Structure
```
/src
  /lib
    utils.js              # Utility functions (delay, logging, waitForElement)
    amex-core.js          # Core automation (AmexOfferAutomation class)
    google-sheets.js      # Google Sheets integration (GoogleSheetsLogger class)
    ui-components.js      # UI components (AmexUI class)
  main.user.js            # Development wrapper (uses @require for local testing)
/dist
  amex-offers.user.js     # Production bundle (hosted on GitHub)
/.kiro
  /hooks
    auto-build.kiro.hook  # Auto-build on file save
  /steering
    amex-automation.md    # This file
/tests
  *.js                    # Test files for MCP Playwright
build.js                  # Build script (bundles src/ into dist/)
```

## Development Workflow (Complete Loop)

### The Complete Test-Deploy-Verify Loop

**Critical:** Always follow this complete loop for every change:

1. **Edit Source Files**
   - Edit `src/lib/*.js` or `src/main.user.js`
   - Kiro auto-build hook triggers on save

2. **Build Production Bundle**
   ```bash
   npm run build
   ```

3. **Increment Version**
   - Edit `dist/amex-offers.user.js`
   - Update `@version 1.0.X` (increment patch number)

4. **Commit and Push to GitHub**
   ```bash
   git add src/ dist/
   git commit -m "v1.0.X: Description of changes"
   git push origin main
   ```

5. **Install/Update Script - USER MUST DO THIS MANUALLY**
   
   **CRITICAL:** MCP Playwright CANNOT interact with browser extension popups!
   
   **What Kiro AI does:**
   ```javascript
   // Navigate to GitHub raw URL
   await page.goto('https://raw.githubusercontent.com/changrex4218/amex-offers-automation/main/dist/amex-offers.user.js');
   // This triggers Tampermonkey detection and redirects to installation page
   ```
   
   **What USER must do:**
   - Look for Tampermonkey extension popup/notification
   - Click "Install" or "Update" button in the popup
   - Confirm installation
   
   **DO NOT ask Kiro AI to do this step - it's impossible via MCP Playwright!**

6. **CRITICAL: Refresh Page Before Testing**
   ```javascript
   // Navigate to Amex offers page
   await page.goto('https://global.americanexpress.com/offers');
   
   // ALWAYS reload to ensure latest script version loads
   await page.reload();
   
   // Wait for script to load
   await page.waitForTimeout(3000);
   ```

7. **Test Script Functionality**
   ```javascript
   // Test script functionality
   const result = await page.evaluate(() => {
     return window.AmexAutomation?.automation?.discoverCards();
   });
   
   console.log('Test result:', result);
   
   // Check if UI loaded
   const uiLoaded = await page.evaluate(() => {
     return !!document.getElementById('amex-automation-panel');
   });
   console.log('UI panel loaded:', uiLoaded);
   ```

7. **Verify and Debug**
   - Check console logs for errors
   - Verify UI panel appears
   - Test button functionality
   - Check card detection
   - Test offer detection

8. **If Issues Found → Repeat Loop**
   - Go back to step 1
   - Make fixes
   - Follow complete loop again

### Quick Reference Commands

```bash
# Build
npm run build

# Commit and push
git add . && git commit -m "v1.0.X: Description" && git push origin main
```

### MCP Playwright Testing Pattern

```javascript
// 1. Install/update script
await page.goto('https://raw.githubusercontent.com/changrex4218/amex-offers-automation/main/dist/amex-offers.user.js');
// User clicks Install/Update in Tampermonkey

// 2. Navigate to test page
await page.goto('https://global.americanexpress.com/offers');

// 3. Wait for script to load
await page.waitForTimeout(2000);

// 4. Test functionality
const cards = await page.evaluate(() => window.AmexAutomation?.automation?.discoverCards());
console.log('Cards detected:', cards);

// 5. Check UI
const panelExists = await page.evaluate(() => !!document.getElementById('amex-automation-panel'));
console.log('UI panel exists:', panelExists);
```

### Version Numbering

- **Patch (1.0.X)**: Bug fixes, selector updates, minor changes
- **Minor (1.X.0)**: New features, significant improvements
- **Major (X.0.0)**: Breaking changes, major rewrites

### Auto-Updates for Users

Once users install from GitHub:
- Tampermonkey checks GitHub daily for new versions
- Compares `@version` numbers
- Downloads from `@downloadURL` if newer version available
- User gets "Update available" notification
- One-click update

## GitHub Integration

**Repository:** https://github.com/changrex4218/amex-offers-automation

**Installation URL:**
```
https://raw.githubusercontent.com/changrex4218/amex-offers-automation/main/dist/amex-offers.user.js
```

**Auto-Update Configuration:**
```javascript
// @version      1.0.X
// @updateURL    https://raw.githubusercontent.com/changrex4218/amex-offers-automation/main/dist/amex-offers.user.js
// @downloadURL  https://raw.githubusercontent.com/changrex4218/amex-offers-automation/main/dist/amex-offers.user.js
```

## Code Standards
- **Modular ES6+** - Classes, async/await, arrow functions
- **GM_* API** - For cross-origin requests (Google Sheets)
- **Error handling** - Try/catch blocks, comprehensive logging
- **Selector fallbacks** - Multiple selectors for robustness
- **Progress callbacks** - Real-time UI updates
- **Clean separation** - Utils, core, UI, and integrations separated

## Testing Guidelines
- **Always use MCP Playwright** for validation
- **Test on actual Amex website** - Don't rely on assumptions
- **Validate selectors** - Ensure they exist on the page
- **Test edge cases** - Missing elements, errors, timeouts
- **Capture evidence** - Screenshots, console logs, snapshots

## Current Status
✅ **Production Ready** - Script is fully functional and deployed to GitHub with auto-update support.
