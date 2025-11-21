# Amex Offers Automation - Development Guide

## Project Status: ✅ Production Ready

This guide documents the complete development workflow for the Amex Offers Automation Tampermonkey userscript.

## Quick Start

### Installation
```bash
# Clone repository
git clone https://github.com/changrex4218/amex-offers-automation.git
cd amex-offers-automation

# Install dependencies
npm install

# Build production bundle
npm run build
```

### Install Script in Tampermonkey
**Direct Installation URL:**
```
https://raw.githubusercontent.com/changrex4218/amex-offers-automation/main/dist/amex-offers.user.js
```

Click the URL above → Tampermonkey detects `.user.js` → Click "Install"

## Project Architecture

### Directory Structure
```
amex-offers-automation/
├── src/
│   ├── lib/
│   │   ├── utils.js              # Utility functions (delay, logging, waitForElement)
│   │   ├── amex-core.js          # Core automation (AmexOfferAutomation class)
│   │   ├── google-sheets.js      # Google Sheets integration (GoogleSheetsLogger)
│   │   └── ui-components.js      # UI components (AmexUI class)
│   └── main.user.js              # Development wrapper (uses @require for local testing)
├── dist/
│   └── amex-offers.user.js       # Production bundle (hosted on GitHub)
├── .kiro/
│   ├── hooks/
│   │   └── auto-build.kiro.hook  # Auto-build on file save
│   └── steering/
│       ├── amex-automation.md    # Project context
│       ├── task-implementation-rules.md
│       └── never-ask-user-for-actions.md
├── tests/
│   └── *.js                      # MCP Playwright test files
├── build.js                      # Build script (bundles src/ into dist/)
├── package.json
└── README.md
```

### Module Overview

#### 1. **utils.js** - Utility Functions
- `delay(ms)` - Promise-based sleep
- `log()`, `logError()`, `logWarn()` - Prefixed console logging
- `waitForElement(selector, timeout)` - Wait for DOM element
- `waitForElementWithFallbacks(selectors, timeout)` - Try multiple selectors
- `safeExecute(fn, context, fallback)` - Error-wrapped execution

#### 2. **amex-core.js** - Core Automation
**Class:** `AmexOfferAutomation`

Key methods:
- `discoverCards()` - Detect all cards in account
- `getAvailableOffers()` - Scan current page for offers
- `addOffer(offer, cardInfo)` - Add single offer with retry logic
- `switchCard(card)` - Switch to different card
- `addAllOffers(progressCallback)` - Main automation loop

Features:
- Selector fallback system (primary + fallback selectors)
- Retry logic (up to 2 retries per offer)
- Progress callbacks for real-time UI updates
- State management

#### 3. **google-sheets.js** - Google Sheets Integration
**Class:** `GoogleSheetsLogger`

Methods:
- `logOffers(offers)` - Log successful offers to Google Sheets
- `appendRows(rows)` - Append data via Sheets API
- `ensureHeaders()` - Setup spreadsheet headers

Uses `GM_xmlhttpRequest` for cross-origin API calls.

#### 4. **ui-components.js** - UI Components
**Class:** `AmexUI`

Methods:
- `createProgressPanel()` - Create main UI panel
- `updateProgress(message, percentage)` - Update progress display
- `renderCardList(cards)` - Display detected cards
- `updateLastAdded(merchant, cardName)` - Show last added offer
- `showCompletionNotification(results)` - Show completion alert
- `exportResults(results)` - Export to JSON file
- `viewResults(results)` - Display results in console

Features:
- Fixed position panel (bottom-right)
- Real-time progress bar
- Card list display
- Start/Pause/Stop controls
- Export and view results buttons

## Development Workflow

### 1. Local Development

#### Edit Source Files
```bash
# Open in Kiro IDE
kiro .

# Edit files in src/lib/
# - Auto-build hook triggers on save
# - dist/amex-offers.user.js automatically updated
```

#### Manual Build
```bash
npm run build
```

### 2. Testing with MCP Playwright

#### Discover Page Selectors
```javascript
// Use MCP Playwright to analyze page structure
await page.goto('https://global.americanexpress.com/offers');
const snapshot = await page.accessibility.snapshot();
console.log(snapshot);
```

#### Test Script Functionality
```javascript
// Navigate to page
await page.goto('https://global.americanexpress.com/offers');

// Test card discovery
const cards = await page.evaluate(() => {
  return window.AmexAutomation.automation.discoverCards();
});
console.log('Detected cards:', cards);

// Test offer detection
const offers = await page.evaluate(() => {
  return window.AmexAutomation.automation.getAvailableOffers();
});
console.log('Available offers:', offers);
```

### 3. Local Testing with Tampermonkey

#### Development Version Setup
1. Install Tampermonkey extension
2. Enable "Allow access to file URLs" in extension settings
3. Create new script with `@require file:///` paths:

```javascript
// @require file:///C:/Users/yourname/Projects/amex-offers-automation/src/lib/utils.js
// @require file:///C:/Users/yourname/Projects/amex-offers-automation/src/lib/amex-core.js
// @require file:///C:/Users/yourname/Projects/amex-offers-automation/src/lib/google-sheets.js
// @require file:///C:/Users/yourname/Projects/amex-offers-automation/src/lib/ui-components.js
```

4. Navigate to Amex offers page
5. Test functionality

### 4. Deployment to GitHub

#### Version Bump
```bash
# Edit @version in dist/amex-offers.user.js
# Example: 1.0.1 → 1.0.2
```

#### Commit and Push
```bash
git add dist/amex-offers.user.js
git commit -m "v1.0.2: Description of changes"
git push origin main
```

#### Users Get Auto-Updates
- Tampermonkey checks GitHub daily
- Compares `@version` numbers
- Downloads new version if available
- Shows "Update available" notification

## Selector System

### Selector Configuration
The script uses a robust selector system with fallbacks:

```javascript
const AMEX_SELECTORS = {
  cards: {
    switcher: '[role="combobox"]',
    switcherType: 'combobox',
    switcherFallbacks: [
      'select[data-testid="card-selector"]',
      'select.card-switcher',
      '[role="tablist"]',
      '.card-selector'
    ]
  },
  offers: {
    container: '[data-testid="offers-container"]',
    containerFallbacks: [
      '.offers-list',
      '#offers-container',
      '[role="list"]',
      'main',
      '.main-content'
    ],
    // ... more selectors
  }
};
```

### Updating Selectors
If Amex updates their page structure:

1. **Use MCP Playwright to discover new selectors**
2. **Update selectors in `src/main.user.js`**
3. **Test locally**
4. **Build and deploy**

## Google Sheets Integration

### Setup
1. Create Google Cloud Project
2. Enable Google Sheets API
3. Create API key (restrict to Sheets API)
4. Create Google Spreadsheet
5. Add headers: `Merchant | Card | Date Added | Status`

### Configure in Browser Console
```javascript
// On Amex offers page, open console:
GM_setValue('google_sheets_api_key', 'YOUR_API_KEY');
GM_setValue('google_sheet_id', 'YOUR_SPREADSHEET_ID');
```

### Data Format
```
Merchant       | Card              | Date Added | Status
---------------|-------------------|------------|--------
Starbucks      | Platinum 81001    | 11/21/2025 | success
Amazon         | Gold 82002        | 11/21/2025 | success
```

## Troubleshooting

### Selectors Not Working
**Problem:** Script can't find elements on page

**Solution:**
1. Use MCP Playwright to inspect current page structure
2. Update selectors in `src/main.user.js`
3. Rebuild and test

### Script Not Loading
**Problem:** Script doesn't run on Amex page

**Solution:**
1. Check Tampermonkey dashboard - script should be enabled
2. Verify `@match` pattern includes current URL
3. Check browser console for errors

### Google Sheets Logging Fails
**Problem:** Offers not logging to Google Sheets

**Solution:**
1. Verify API key is configured: `GM_getValue('google_sheets_api_key')`
2. Check spreadsheet ID: `GM_getValue('google_sheet_id')`
3. Verify Sheets API is enabled in Google Cloud Console
4. Check browser console for HTTP error codes

### Auto-Update Not Working
**Problem:** Users not getting updates

**Solution:**
1. Verify `@version` was incremented in `dist/amex-offers.user.js`
2. Confirm changes were pushed to GitHub
3. Check raw URL is accessible
4. Wait 24 hours or manually check for updates in Tampermonkey

## Build System

### build.js
Bundles all source files into production script:

```javascript
// Reads files in order:
1. src/lib/utils.js
2. src/lib/amex-core.js
3. src/lib/google-sheets.js
4. src/lib/ui-components.js
5. src/main.user.js (main execution code)

// Wraps in IIFE
// Adds Tampermonkey metadata
// Outputs to dist/amex-offers.user.js
```

### Auto-Build Hook
`.kiro/hooks/auto-build.kiro.hook` triggers build on file save:

```json
{
  "name": "Auto-build Amex bundle",
  "when": {
    "type": "fileEdit",
    "patterns": ["src/**/*.js", "build.js"]
  },
  "then": {
    "type": "askAgent",
    "prompt": "Execute 'node build.js' to bundle the script"
  }
}
```

## Testing Checklist

### Before Deployment
- [ ] Build succeeds without errors
- [ ] Script loads on Amex offers page
- [ ] UI panel appears correctly
- [ ] Card detection works
- [ ] Offer detection works
- [ ] Add offer functionality works
- [ ] Progress updates in real-time
- [ ] Google Sheets logging works (if configured)
- [ ] Export results works
- [ ] No console errors

### After Deployment
- [ ] Raw GitHub URL is accessible
- [ ] Tampermonkey detects `.user.js` file
- [ ] Installation works from URL
- [ ] Script runs on Amex page
- [ ] Version number is correct

## Success Metrics

### Development
✅ Modular architecture with 4 separate concerns  
✅ Auto-build system with Kiro hooks  
✅ Comprehensive error handling  
✅ Selector fallback system  
✅ MCP Playwright testing integration

### Functionality
✅ Multi-card support  
✅ Real-time progress UI  
✅ Retry logic for failed offers  
✅ Google Sheets logging  
✅ Export to JSON  
✅ Pause/Stop controls

### Deployment
✅ GitHub hosting  
✅ Auto-update mechanism  
✅ Version control  
✅ One-click installation  
✅ Public distribution

## Resources

- **Repository:** https://github.com/changrex4218/amex-offers-automation
- **Installation:** https://raw.githubusercontent.com/changrex4218/amex-offers-automation/main/dist/amex-offers.user.js
- **Tampermonkey:** https://www.tampermonkey.net/
- **MCP Playwright:** https://playwright.dev/

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Make changes in `src/lib/`
4. Test locally with MCP Playwright
5. Build: `npm run build`
6. Commit: `git commit -m "Add feature"`
7. Push: `git push origin feature/my-feature`
8. Create Pull Request

## License

MIT License - See LICENSE file for details
