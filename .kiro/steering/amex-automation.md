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

## Development Workflow

### 1. Edit Source Files
Edit modular source files in `src/lib/`:
- `utils.js` - Helper functions
- `amex-core.js` - Core automation logic
- `google-sheets.js` - Sheets integration
- `ui-components.js` - UI components

### 2. Auto-Build
Kiro hook automatically builds on save:
```bash
npm run build  # Manual build if needed
```

### 3. Test with MCP Playwright
Use MCP Playwright to test functionality:
```javascript
// Navigate to Amex offers page
await page.goto('https://global.americanexpress.com/offers');

// Test script functionality
const result = await page.evaluate(() => {
  return window.AmexAutomation.automation.discoverCards();
});
```

### 4. Deploy to GitHub
```bash
# Increment version in dist/amex-offers.user.js
# @version 1.0.X

# Commit and push
git add dist/amex-offers.user.js
git commit -m "v1.0.X: Description"
git push origin main
```

### 5. Auto-Updates
Users get automatic updates via Tampermonkey:
- Checks GitHub daily for new versions
- Compares `@version` numbers
- Downloads from `@downloadURL` if newer version available

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
