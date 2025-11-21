---
inclusion: always
---

# Development Guidelines

## MCP Playwright for Validation

Always use MCP Playwright to validate functionality:

1. **Test in real browser** - Use MCP Playwright to test on actual Amex website
2. **Validate selectors** - Ensure discovered selectors exist on the page
3. **Test edge cases** - Missing elements, errors, timeouts
4. **Capture evidence** - Use snapshots and console output

### MCP Playwright Examples

```javascript
// Navigate to the page
await page.goto('https://global.americanexpress.com/offers');

// Take snapshot to see page structure
const snapshot = await page.accessibility.snapshot();

// Test script functionality
const result = await page.evaluate(() => {
  return window.AmexAutomation.automation.discoverCards();
});

// Validate results
console.log('Detected cards:', result);
```

## Tampermonkey Script Testing

When testing the Tampermonkey script:

1. **User must install script** - Ask user to install updated script in Tampermonkey
2. **Wait for confirmation** - Don't proceed until user confirms installation
3. **Navigate to page** - Use MCP Playwright to navigate to Amex offers page
4. **Test functionality** - Interact with page and verify script behavior

**Note:** Browser won't pick up file changes automatically. User must manually update the script in Tampermonkey.

## Version Control

Commit changes with clear messages:

```bash
# Stage changes
git add src/lib/amex-core.js dist/amex-offers.user.js

# Commit with descriptive message
git commit -m "Add retry logic for offer addition"

# Push to GitHub
git push origin main
```

## Deployment Workflow

1. **Edit source files** in `src/lib/`
2. **Build production bundle** - `npm run build` (or auto-build on save)
3. **Increment version** in `dist/amex-offers.user.js` (@version line)
4. **Test with MCP Playwright** on actual website
5. **Commit and push** to GitHub
6. **Users get auto-updates** via Tampermonkey

## Code Quality

- **Modular design** - Separate concerns (utils, core, UI, integrations)
- **Error handling** - Try/catch blocks with comprehensive logging
- **Selector fallbacks** - Multiple selectors for robustness
- **Async/await** - For all asynchronous operations
- **Clear logging** - Prefix all logs with `[Component]` for debugging
