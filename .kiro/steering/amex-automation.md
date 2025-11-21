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

### Option 1: Local Development (Fastest - No Build/Deploy Needed)

**Use this for rapid development and testing:**

1. **Setup Local Version in Tampermonkey**
   - Open Tampermonkey dashboard
   - Create new script or edit existing
   - Copy contents of `src/main.user.js`
   - **IMPORTANT:** Update the `@require` paths to match your local machine:
   ```javascript
   // @require file:///C:/Users/YOUR_USERNAME/Projects/YOUR_PROJECT_PATH/src/lib/utils.js
   // @require file:///C:/Users/YOUR_USERNAME/Projects/YOUR_PROJECT_PATH/src/lib/amex-core.js
   // @require file:///C:/Users/YOUR_USERNAME/Projects/YOUR_PROJECT_PATH/src/lib/google-sheets.js
   // @require file:///C:/Users/YOUR_USERNAME/Projects/YOUR_PROJECT_PATH/src/lib/ui-components.js
   ```
   - Enable "Allow access to file URLs" in Tampermonkey extension settings
   - Save the script

2. **Edit and Test Immediately**
   - Edit any file in `src/lib/*.js`
   - Save the file
   - Refresh the Amex offers page
   - Changes load immediately - no build or deploy needed!

3. **Benefits of Local Development**
   - ✅ Instant feedback - just save and refresh
   - ✅ No build step required
   - ✅ No GitHub push needed
   - ✅ Perfect for rapid iteration and debugging

**Note:** Local version uses `@version 1.0.0-dev` to avoid conflicts with production version.

### Option 2: Production Deployment (For Publishing Updates)

**Use this when ready to deploy to users:**

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

5. **Install/Update Script - MANUAL STEP (Cannot be automated)**
   
   **IMPORTANT:** This step requires Tampermonkey extension to be installed in your browser. Playwright/automated browsers cannot install browser extensions, so this must be done manually.
   
   **Manual Installation Steps:**
   1. Open your regular browser (Chrome/Firefox/Edge) with Tampermonkey installed
   2. Navigate to: `https://raw.githubusercontent.com/changrex4218/amex-offers-automation/main/dist/amex-offers.user.js`
   3. Tampermonkey will detect the .user.js file and show an installation page
   4. Click "Install" or "Update" button
   5. Confirm the script is installed in Tampermonkey dashboard
   
   **For Testing with Playwright:**
   ```javascript
   // Navigate to GitHub raw URL - shows Tampermonkey installation page
   await page.goto('https://raw.githubusercontent.com/changrex4218/amex-offers-automation/main/dist/amex-offers.user.js');
   
   // NOTE: Playwright cannot click Install/Update because Tampermonkey extension
   // is not available in automated browsers. This step must be done manually.
   ```

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

Once users install from GitHub, Tampermonkey automatically handles updates:

**Default Auto-Update Behavior:**
- Tampermonkey checks GitHub **every 24 hours** for new versions
- Compares `@version` numbers (current: 1.0.5)
- Downloads from `@downloadURL` if newer version available
- User gets "Update available" notification in Tampermonkey dashboard
- One-click update to install new version

**Manual Update Check:**
Users can force an immediate update check:
1. Open Tampermonkey dashboard
2. Click on the script name
3. Click "Check for updates" button
4. If update available, click "Update" to install

**Changing Update Frequency:**
Users can customize the update check interval:
1. Open Tampermonkey dashboard
2. Go to Settings tab
3. Find "Script Update" section
4. Change "Check Interval" (options: Never, 1 hour, 6 hours, 12 hours, 24 hours, 7 days, 30 days)
5. Default is 24 hours

**How It Works:**
- Script has `@updateURL` pointing to GitHub raw file
- Tampermonkey fetches the file and checks `@version` number
- If GitHub version > installed version, update is triggered
- Example: Installed 1.0.5 → GitHub has 1.0.6 → Auto-update triggers

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
