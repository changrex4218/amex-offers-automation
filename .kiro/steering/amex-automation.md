# Amex Offers Automation Project

## Purpose
Automate adding American Express offers to all cards in user account

## Technical Stack
- Tampermonkey userscript
- MCP Playwright for page analysis
- Google Sheets API for logging
- Kiro IDE for development

## Target URL
https://global.americanexpress.com/offers?account_key={ACCOUNT_KEY}

## Key Features
1. Single "Add All Offers" button UI
2. Multi-card support
3. Real-time progress display
4. Google Sheets logging (offer details + timestamp + card)
5. Error handling and retry logic

## Code Standards
- Modular ES6+ JavaScript
- GM_* API for cross-origin requests
- Async/await for all operations
- Comprehensive error logging

## Development Workflow
1. Edit modular source files in `src/lib/`
2. Auto-build triggers on save (Kiro hook)
3. Test locally with Tampermonkey `@require file:///` paths
4. Validate with MCP Playwright before deployment
5. Build production bundle to `dist/`
6. Push to GitHub for auto-update distribution

## Project Structure
```
/src
  /lib
    utils.js           # Utility functions
    amex-core.js       # Core automation logic
    google-sheets.js   # Google Sheets integration
    ui-components.js   # UI components
  main.user.js         # Tampermonkey wrapper (dev)
/dist
  amex-offers.user.js  # Production bundle
/tests
  playwright.spec.js   # MCP Playwright tests
```
