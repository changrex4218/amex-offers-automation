# Amex Offers Automation

An automated system for adding American Express card offers to multiple credit cards. This project consists of three main components:

1. **Page Analyzer** - Discovers and documents the structure of the Amex offers page
2. **Tampermonkey Script** - Automates offer additions in your browser
3. **Playwright Tests** - Validates the automation functionality

## Overview

The Amex Offers Automation system follows a discover-then-automate workflow:

- First, analyze the Amex offers page to discover the correct selectors
- Then, use those selectors in a Tampermonkey script to automate offer additions
- Finally, validate everything works with Playwright tests

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- A browser with Tampermonkey extension installed
- An American Express account with multiple cards

### Installation

1. Clone this repository and install dependencies:

```bash
npm install
```

2. Install Playwright browsers:

```bash
npx playwright install
```

## Usage

### Development Workflow

#### 1. Edit Source Files

Edit the modular source files in `src/lib/`:
- `utils.js` - Utility functions
- `amex-core.js` - Core automation logic
- `google-sheets.js` - Google Sheets integration
- `ui-components.js` - UI components

Kiro's auto-build hook will automatically rebuild the bundle when you save changes.

#### 2. Build the Bundle

Build the production bundle:

```bash
npm run build
```

This creates `dist/amex-offers.user.js` with all modules bundled together.

#### 3. Local Development Testing

For local development, use `src/main.user.js` which uses `@require file:///` paths:

1. Open Tampermonkey dashboard
2. Create new script
3. Copy contents of `src/main.user.js`
4. Save and enable
5. Navigate to https://global.americanexpress.com/offers
6. Changes to `src/lib/*.js` files are loaded immediately on page refresh

#### 4. Production Deployment

For production, use the bundled version:

1. Build the bundle: `npm run build`
2. Install `dist/amex-offers.user.js` in Tampermonkey
3. Or push to GitHub and users get auto-updates

### Running the Automation

1. Log into your Amex account
2. Navigate to https://global.americanexpress.com/offers
3. The automation panel appears automatically
4. Click "Add All Offers" to start
5. Monitor progress in real-time
6. Export results when complete

### Testing with Playwright

Run the test suite to validate functionality:

```bash
npm test
```

### Analyzing the Page Structure

If selectors need updating, run the page analyzer:

```bash
npm run analyze
```

This discovers the current page structure and updates documentation.

## Project Structure

```
amex-offers-automation/
├── .kiro/                     # Kiro IDE configuration
│   ├── hooks/                 # Automation hooks
│   │   ├── auto-build.kiro.hook
│   │   └── test-before-deploy.kiro.hook
│   └── steering/              # Project context for AI
│       ├── amex-automation.md
│       ├── never-ask-user-for-actions.md
│       └── task-implementation-rules.md
├── src/                       # Source files (modular)
│   ├── lib/                   # Core libraries
│   │   ├── utils.js           # Utility functions
│   │   ├── amex-core.js       # Core automation logic
│   │   ├── google-sheets.js   # Google Sheets integration
│   │   └── ui-components.js   # UI components
│   └── main.user.js           # Tampermonkey wrapper (dev)
├── dist/                      # Production bundle
│   └── amex-offers.user.js    # Built Tampermonkey script
├── docs/                      # Generated documentation
│   ├── page-structure.md      # Human-readable analysis
│   └── page-structure.json    # Machine-readable data
├── tests/                     # Test files
│   ├── analyze-page.js        # Page analyzer script
│   └── playwright.spec.js     # Validation tests
├── build.js                   # Build script
├── package.json               # Project dependencies
├── playwright.config.js       # Playwright configuration
├── .gitignore                 # Git ignore rules
└── README.md                  # This file
```

## Features

- **Modular architecture**: Clean separation of concerns with ES6 modules
- **Auto-build on save**: Kiro hook automatically rebuilds bundle when source changes
- **Multi-card support**: Automatically detects and processes all your cards
- **Smart filtering**: Skips offers that are already added
- **Progress tracking**: Real-time updates with progress bar
- **Error handling**: Continues automation even if individual offers fail
- **Results export**: Download detailed JSON report of all additions
- **Browser notifications**: Get notified when automation completes
- **Google Sheets logging**: Optional integration to log all offer additions
- **Test automation**: Playwright tests validate functionality before deployment

## Troubleshooting

### Page Analyzer Issues

- **Authentication timeout**: If 30 seconds isn't enough, increase the wait time in `analyze-page.js`
- **Selectors not found**: The page structure may have changed. Review the console output for details
- **Browser doesn't open**: Ensure Playwright browsers are installed with `npx playwright install`

### Tampermonkey Script Issues

- **Panel doesn't appear**: Check browser console for errors. Verify selectors are correct
- **Cards not detected**: The card switcher selector may be incorrect. Re-run the analyzer
- **Offers not adding**: Check timing delays in `AMEX_SELECTORS.timing`. May need to increase delays

### Test Failures

- **Tests timeout**: Increase timeout in `playwright.config.js`
- **Elements not found**: Page structure may have changed. Re-run the analyzer
- **Authentication required**: Some tests require manual login during execution

## Limitations

- Requires manual login (cannot automate authentication)
- Depends on page structure (may break if Amex redesigns the page)
- Sequential processing only (processes one card at a time)
- Desktop browser only (no mobile support)

## Security & Privacy

- All automation runs locally in your browser
- No data is transmitted to external servers
- Results are stored in memory only
- You must explicitly export results to save them
- Open source code that you can review

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Disclaimer

This tool is for educational purposes. Use at your own risk. The author is not responsible for any issues that may arise from using this automation tool. Always review automated actions and ensure compliance with American Express terms of service.
