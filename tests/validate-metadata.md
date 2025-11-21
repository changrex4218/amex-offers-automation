# Tampermonkey Script Metadata Validation

## Metadata Block Checklist

### ✓ Required Fields
- [x] `@name` - "Amex Offers Automation"
- [x] `@namespace` - "http://tampermonkey.net/"
- [x] `@version` - "1.0.0"
- [x] `@description` - Clear description of functionality
- [x] `@match` - "https://global.americanexpress.com/offers*" (correct URL pattern)

### ✓ Grants (Requirement 3.2)
- [x] `@grant GM_xmlhttpRequest` - For making cross-origin requests
- [x] `@grant GM_setValue` - For persistent storage
- [x] `@grant GM_getValue` - For reading persistent storage
- [x] `@grant GM_notification` - For user notifications

### ✓ Execution Timing (Requirement 3.4)
- [x] `@run-at document-idle` - Ensures page is fully loaded before script runs

## CSP Compatibility

Tampermonkey scripts run in an **isolated execution environment** that bypasses Content Security Policy (CSP) restrictions. This means:

1. The script will NOT be blocked by the Amex page's CSP
2. The script can use `eval()` and inline scripts (though we don't need to)
3. The script has access to the page's DOM and can interact with it
4. The script runs in a separate scope from the page's JavaScript

## Validation Results

✓ All metadata fields are present and correct
✓ URL pattern matches the Amex offers page
✓ All required grants are specified
✓ Execution timing is set to document-idle
✓ Script will bypass CSP restrictions when run via Tampermonkey

## How to Install and Test

1. Open Tampermonkey extension in your browser
2. Click "Create a new script"
3. Copy the contents of `amex-offers.user.js`
4. Save the script
5. Navigate to https://global.americanexpress.com/offers
6. The script should automatically load and log "[Amex Automation] Script loaded - v1.0.0" to the console

## Expected Console Output

When the script loads successfully, you should see:
```
[Amex Automation] Script loaded - v1.0.0
```

This confirms the script foundation is working correctly.
