/**
 * Amex Offers Page Analyzer
 * 
 * This script uses Playwright to analyze the structure of the Amex offers page
 * and discover selectors for automation.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Main entry point - Analyzes the Amex offers page structure
 * Launches browser in headed mode, navigates to the page, waits for user authentication,
 * and captures API calls during the analysis process.
 */
async function analyzeAmexOffersPage() {
  console.log('Starting Amex Offers Page Analysis...\n');
  
  // Launch browser in headed mode so user can authenticate
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100 // Slow down actions for visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Set up response listener to capture API calls
  const apiCalls = [];
  page.on('response', async (response) => {
    const url = response.url();
    // Capture API calls related to offers
    if (url.includes('offer') || url.includes('api')) {
      try {
        apiCalls.push({
          url: url,
          status: response.status(),
          method: response.request().method(),
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        // Ignore errors from reading response details
      }
    }
  });
  
  console.log('Navigating to Amex offers page...');
  await page.goto('https://global.americanexpress.com/offers', {
    waitUntil: 'networkidle',
    timeout: 60000
  });
  
  console.log('\n⏳ PLEASE LOG IN TO YOUR AMEX ACCOUNT');
  console.log('You have 30 seconds to complete authentication...\n');
  
  // Wait 30 seconds for manual user authentication
  await page.waitForTimeout(30000);
  
  console.log('Authentication period complete. Starting analysis...\n');
  
  // Analyze card elements
  const cardAnalysis = await analyzeCardElements(page);
  
  // Analyze offer elements
  const offerAnalysis = await analyzeOfferElements(page);
  
  // Analyze add offer workflow
  const workflowAnalysis = await analyzeAddOfferWorkflow(page, offerAnalysis);
  
  // Store page and apiCalls for use in other functions
  return { page, browser, apiCalls, cardAnalysis, offerAnalysis, workflowAnalysis };
}

/**
 * Analyzes card switcher elements and extracts all available cards
 * Uses a prioritized list of selectors to detect different card switcher types
 * 
 * @param {Page} page - Playwright page object
 * @returns {Object} Card analysis with switcher type, cards array, and switch method
 */
async function analyzeCardElements(page) {
  console.log('🔍 Analyzing card switcher elements...');
  
  // Prioritized list of candidate selectors for card switchers
  const cardSwitcherSelectors = [
    // Select dropdown selectors (most common)
    'select[name*="account"]',
    'select[id*="account"]',
    'select[class*="card"]',
    'select[class*="account"]',
    '#accountSelector',
    '.account-selector',
    'select',
    // Tab-based selectors
    '[role="tablist"]',
    '.tabs',
    '.card-tabs',
    // Button-based selectors
    '.card-switcher button',
    '[data-card-selector]'
  ];
  
  let switcherElement = null;
  let switcherSelector = null;
  let switcherType = null;
  
  // Try each selector until we find the card switcher
  for (const selector of cardSwitcherSelectors) {
    try {
      switcherElement = await page.$(selector);
      if (switcherElement) {
        switcherSelector = selector;
        console.log(`✅ Found card switcher with selector: ${selector}`);
        break;
      }
    } catch (error) {
      // Continue to next selector
    }
  }
  
  if (!switcherElement) {
    console.log('⚠️  No card switcher found');
    return {
      switcherSelector: null,
      switcherType: 'none',
      cards: [],
      switchMethod: null
    };
  }
  
  // Determine switcher type and extract cards
  let cards = [];
  let switchMethod = null;
  
  // Check if it's a select dropdown
  const tagName = await switcherElement.evaluate(el => el.tagName.toLowerCase());
  
  if (tagName === 'select') {
    switcherType = 'select';
    switchMethod = 'value';
    
    // Extract all option elements
    cards = await switcherElement.evaluate(select => {
      const options = Array.from(select.options);
      return options.map(option => ({
        value: option.value,
        text: option.text.trim(),
        selected: option.selected
      }));
    });
    
    console.log(`✅ Detected ${cards.length} cards in select dropdown`);
  } 
  // Check for tab-based switcher
  else if (await switcherElement.evaluate(el => el.getAttribute('role') === 'tablist')) {
    switcherType = 'tabs';
    switchMethod = 'click';
    
    // Extract tab elements
    const tabs = await page.$$('[role="tab"]');
    cards = await Promise.all(tabs.map(async (tab, index) => ({
      value: await tab.getAttribute('data-value') || `tab-${index}`,
      text: await tab.textContent(),
      selected: await tab.getAttribute('aria-selected') === 'true'
    })));
    
    console.log(`✅ Detected ${cards.length} cards in tab switcher`);
  }
  // Button-based switcher
  else {
    switcherType = 'buttons';
    switchMethod = 'click';
    
    // Try to find button elements within the switcher
    const buttons = await page.$$(`${switcherSelector} button, ${switcherSelector}`);
    cards = await Promise.all(buttons.map(async (button, index) => ({
      value: await button.getAttribute('data-value') || await button.getAttribute('value') || `button-${index}`,
      text: await button.textContent(),
      selected: await button.getAttribute('aria-selected') === 'true' || 
                await button.getAttribute('class').then(c => c.includes('active')).catch(() => false)
    })));
    
    console.log(`✅ Detected ${cards.length} cards in button switcher`);
  }
  
  // Log card details
  cards.forEach((card, index) => {
    console.log(`   ${index + 1}. ${card.text} ${card.selected ? '(selected)' : ''}`);
  });
  
  return {
    switcherSelector,
    switcherType,
    cards,
    switchMethod
  };
}

/**
 * Analyzes offer elements on the page and discovers selectors
 * Uses a prioritized list of selectors to detect offer containers and elements
 * 
 * @param {Page} page - Playwright page object
 * @returns {Object} Offer analysis with discovered selectors and sample HTML
 */
async function analyzeOfferElements(page) {
  console.log('🔍 Analyzing offer elements...');
  
  // Prioritized list of candidate selectors for offer containers
  const offerContainerSelectors = [
    '[data-testid*="offer"]',
    '[class*="offer-card"]',
    '[class*="offerCard"]',
    '[class*="offer-container"]',
    'article',
    '[role="article"]',
    '.card',
    '[data-offer-id]'
  ];
  
  let offerContainerSelector = null;
  let offerElements = [];
  
  // Try each selector until we find offer containers
  for (const selector of offerContainerSelectors) {
    try {
      offerElements = await page.$$(selector);
      if (offerElements && offerElements.length > 5) { // Expect multiple offers
        offerContainerSelector = selector;
        console.log(`✅ Found ${offerElements.length} offers with selector: ${selector}`);
        break;
      }
    } catch (error) {
      // Continue to next selector
    }
  }
  
  if (!offerElements || offerElements.length === 0) {
    console.log('⚠️  No offer elements found');
    return {
      offerContainerSelector: null,
      offerCount: 0,
      merchantNameSelector: null,
      addButtonSelector: null,
      alreadyAddedSelector: null,
      sampleHTML: null
    };
  }
  
  // Analyze first offer card to find element selectors
  const firstOffer = offerElements[0];
  
  // Try to find merchant name with multiple patterns
  const merchantNameSelectors = [
    'h3',
    'h2',
    '[class*="merchant"]',
    '[class*="title"]',
    '[data-testid*="merchant"]',
    '[data-testid*="title"]'
  ];
  
  let merchantNameSelector = null;
  for (const selector of merchantNameSelectors) {
    try {
      const element = await firstOffer.$(selector);
      if (element) {
        const text = await element.textContent();
        if (text && text.trim().length > 0 && text.trim().length < 100) {
          merchantNameSelector = selector;
          console.log(`✅ Found merchant name selector: ${selector}`);
          break;
        }
      }
    } catch (error) {
      // Continue
    }
  }
  
  // Try to find add button
  const addButtonSelectors = [
    'button[aria-label*="add"]',
    'button:has-text("Add")',
    'button[data-testid*="add"]',
    'button[class*="add"]',
    'button'
  ];
  
  let addButtonSelector = null;
  for (const selector of addButtonSelectors) {
    try {
      const element = await firstOffer.$(selector);
      if (element) {
        addButtonSelector = selector;
        console.log(`✅ Found add button selector: ${selector}`);
        break;
      }
    } catch (error) {
      // Continue
    }
  }
  
  // Try to find already-added indicator
  const alreadyAddedSelectors = [
    '[aria-label*="added"]',
    '[class*="added"]',
    '[data-testid*="added"]',
    'button[disabled]',
    '[class*="enrolled"]'
  ];
  
  let alreadyAddedSelector = null;
  for (const selector of alreadyAddedSelectors) {
    try {
      const element = await firstOffer.$(selector);
      if (element) {
        alreadyAddedSelector = selector;
        console.log(`✅ Found already-added indicator selector: ${selector}`);
        break;
      }
    } catch (error) {
      // Continue
    }
  }
  
  // Capture sample HTML from first offer
  let sampleHTML = null;
  try {
    sampleHTML = await firstOffer.evaluate(el => el.outerHTML.substring(0, 500));
    console.log(`✅ Captured sample HTML (${sampleHTML.length} chars)`);
  } catch (error) {
    console.log('⚠️  Could not capture sample HTML');
  }
  
  return {
    offerContainerSelector,
    offerCount: offerElements.length,
    merchantNameSelector,
    addButtonSelector,
    alreadyAddedSelector,
    sampleHTML
  };
}

/**
 * Analyzes the add offer workflow by testing actual offer addition
 * Captures API calls, detects success indicators, and calculates timing recommendations
 * 
 * @param {Page} page - Playwright page object
 * @param {Object} offerAnalysis - Results from analyzeOfferElements
 * @returns {Object} Workflow analysis with API calls, success indicators, and timing
 */
async function analyzeAddOfferWorkflow(page, offerAnalysis) {
  console.log('🔍 Analyzing add offer workflow...');
  
  if (!offerAnalysis.offerContainerSelector || !offerAnalysis.addButtonSelector) {
    console.log('⚠️  Cannot analyze workflow - missing offer or button selectors');
    return {
      apiCalls: [],
      successIndicator: null,
      recommendedDelay: 1500,
      requiresConfirmation: false,
      error: 'Missing required selectors'
    };
  }
  
  // Find all offer cards
  const offerCards = await page.$$(offerAnalysis.offerContainerSelector);
  
  if (offerCards.length === 0) {
    console.log('⚠️  No offer cards found');
    return {
      apiCalls: [],
      successIndicator: null,
      recommendedDelay: 1500,
      requiresConfirmation: false,
      error: 'No offer cards found'
    };
  }
  
  // Find first available (not disabled) add button
  let availableButton = null;
  let offerCard = null;
  
  for (const card of offerCards) {
    try {
      const button = await card.$(offerAnalysis.addButtonSelector);
      if (button) {
        const isDisabled = await button.evaluate(btn => 
          btn.disabled || 
          btn.getAttribute('disabled') !== null ||
          btn.getAttribute('aria-disabled') === 'true' ||
          btn.classList.contains('disabled')
        );
        
        if (!isDisabled) {
          availableButton = button;
          offerCard = card;
          console.log('✅ Found available add button');
          break;
        }
      }
    } catch (error) {
      // Continue to next card
    }
  }
  
  if (!availableButton) {
    console.log('⚠️  No available add buttons found (all may be disabled or already added)');
    return {
      apiCalls: [],
      successIndicator: null,
      recommendedDelay: 1500,
      requiresConfirmation: false,
      error: 'No available add buttons found'
    };
  }
  
  // Set up response listener to capture API calls
  const workflowApiCalls = [];
  const startTime = Date.now();
  
  const responseHandler = async (response) => {
    const url = response.url();
    // Capture API calls related to offers or add actions
    if (url.includes('offer') || url.includes('add') || url.includes('enroll')) {
      try {
        const timeSinceClick = Date.now() - startTime;
        workflowApiCalls.push({
          url: url,
          status: response.status(),
          method: response.request().method(),
          timestamp: new Date().toISOString(),
          timeSinceClick: timeSinceClick
        });
        console.log(`📡 Captured API call: ${response.request().method()} ${url} (${response.status()}) at +${timeSinceClick}ms`);
      } catch (error) {
        // Ignore errors from reading response details
      }
    }
  };
  
  page.on('response', responseHandler);
  
  // Get merchant name for logging
  let merchantName = 'Unknown';
  if (offerAnalysis.merchantNameSelector) {
    try {
      const merchantElement = await offerCard.$(offerAnalysis.merchantNameSelector);
      if (merchantElement) {
        merchantName = await merchantElement.textContent();
        merchantName = merchantName.trim();
      }
    } catch (error) {
      // Use default
    }
  }
  
  console.log(`🖱️  Clicking add button for offer: ${merchantName}`);
  
  // Click the add button
  try {
    await availableButton.click();
    console.log('✅ Add button clicked');
  } catch (error) {
    console.log(`❌ Error clicking button: ${error.message}`);
    page.off('response', responseHandler);
    return {
      apiCalls: workflowApiCalls,
      successIndicator: null,
      recommendedDelay: 1500,
      requiresConfirmation: false,
      error: `Click failed: ${error.message}`
    };
  }
  
  // Wait for API responses (give it time to complete)
  console.log('⏳ Waiting for API responses...');
  await page.waitForTimeout(3000);
  
  // Remove response listener
  page.off('response', responseHandler);
  
  // Detect success indicator elements
  const successIndicatorSelectors = [
    '[role="alert"]',
    '[class*="success"]',
    '[class*="notification"]',
    '[class*="toast"]',
    '[class*="message"]',
    '[aria-live="polite"]',
    '[aria-live="assertive"]',
    '.alert-success',
    '[data-testid*="success"]',
    '[data-testid*="notification"]'
  ];
  
  let successIndicator = null;
  
  for (const selector of successIndicatorSelectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        const isVisible = await element.isVisible();
        if (isVisible) {
          const text = await element.textContent();
          if (text && (text.toLowerCase().includes('success') || 
                      text.toLowerCase().includes('added') || 
                      text.toLowerCase().includes('enrolled'))) {
            successIndicator = selector;
            console.log(`✅ Found success indicator: ${selector}`);
            console.log(`   Message: "${text.trim().substring(0, 100)}"`);
            break;
          }
        }
      }
    } catch (error) {
      // Continue
    }
  }
  
  // Check if button state changed (alternative success indicator)
  if (!successIndicator) {
    try {
      const buttonText = await availableButton.textContent();
      const isDisabled = await availableButton.evaluate(btn => 
        btn.disabled || 
        btn.getAttribute('disabled') !== null ||
        btn.getAttribute('aria-disabled') === 'true'
      );
      
      if (isDisabled || buttonText.toLowerCase().includes('added')) {
        successIndicator = `${offerAnalysis.addButtonSelector}[disabled]`;
        console.log('✅ Success detected via button state change');
      }
    } catch (error) {
      // Ignore
    }
  }
  
  if (!successIndicator) {
    console.log('⚠️  No success indicator found');
  }
  
  // Calculate recommended delay based on observed response times
  let recommendedDelay = 1500; // Default
  
  if (workflowApiCalls.length > 0) {
    // Find the slowest API call
    const maxResponseTime = Math.max(...workflowApiCalls.map(call => call.timeSinceClick));
    // Add 500ms buffer
    recommendedDelay = Math.max(1500, maxResponseTime + 500);
    console.log(`📊 Recommended delay: ${recommendedDelay}ms (based on ${maxResponseTime}ms max response time)`);
  } else {
    console.log(`📊 Recommended delay: ${recommendedDelay}ms (default, no API calls captured)`);
  }
  
  // Check if confirmation dialog appeared
  let requiresConfirmation = false;
  try {
    const dialog = await page.$('[role="dialog"], [role="alertdialog"], .modal');
    if (dialog) {
      const isVisible = await dialog.isVisible();
      if (isVisible) {
        requiresConfirmation = true;
        console.log('⚠️  Confirmation dialog detected');
      }
    }
  } catch (error) {
    // No dialog
  }
  
  console.log(`✅ Workflow analysis complete`);
  console.log(`   API calls captured: ${workflowApiCalls.length}`);
  console.log(`   Success indicator: ${successIndicator || 'none'}`);
  console.log(`   Requires confirmation: ${requiresConfirmation}`);
  
  return {
    apiCalls: workflowApiCalls,
    successIndicator,
    recommendedDelay,
    requiresConfirmation,
    merchantName
  };
}

/**
 * Generates comprehensive markdown documentation from analysis results
 * Creates a ready-to-use selector map and detailed documentation
 * 
 * @param {Object} analysis - Complete analysis results
 * @param {Object} analysis.cardAnalysis - Card detection results
 * @param {Object} analysis.offerAnalysis - Offer detection results
 * @param {Object} analysis.workflowAnalysis - Workflow analysis results
 * @param {Array} analysis.apiCalls - API calls captured during page load
 * @returns {string} Markdown formatted documentation
 */
function generateAnalysisDocument(analysis) {
  const { cardAnalysis, offerAnalysis, workflowAnalysis, apiCalls } = analysis;
  const timestamp = new Date().toISOString();
  
  // Build fallback arrays for selectors
  const merchantNameFallbacks = [
    'h3', 'h2', '[class*="merchant"]', '[class*="title"]',
    '[data-testid*="merchant"]', '[data-testid*="title"]'
  ];
  
  const addButtonFallbacks = [
    'button[aria-label*="add"]', 'button:has-text("Add")',
    'button[data-testid*="add"]', 'button[class*="add"]', 'button'
  ];
  
  const alreadyAddedFallbacks = [
    '[aria-label*="added"]', '[class*="added"]',
    '[data-testid*="added"]', 'button[disabled]', '[class*="enrolled"]'
  ];
  
  const successIndicatorFallbacks = [
    '[role="alert"]', '[class*="success"]', '[class*="notification"]',
    '[class*="toast"]', '[class*="message"]', '[aria-live="polite"]'
  ];
  
  // Generate AMEX_SELECTORS JavaScript object
  const selectorsObject = `const AMEX_SELECTORS = {
  page: {
    url: 'https://global.americanexpress.com/offers',
    urlPattern: 'https://global.americanexpress.com/offers*'
  },
  cards: {
    switcher: '${cardAnalysis.switcherSelector || 'select'}',
    switcherType: '${cardAnalysis.switcherType || 'select'}',
    switchMethod: '${cardAnalysis.switchMethod || 'value'}'
  },
  offers: {
    container: '${offerAnalysis.offerContainerSelector || '[data-testid*="offer"]'}',
    card: '${offerAnalysis.offerContainerSelector || '[data-testid*="offer"]'}',
    merchantName: '${offerAnalysis.merchantNameSelector || 'h3'}',
    merchantNameFallbacks: ${JSON.stringify(merchantNameFallbacks, null, 6)},
    addButton: '${offerAnalysis.addButtonSelector || 'button'}',
    addButtonFallbacks: ${JSON.stringify(addButtonFallbacks, null, 6)},
    alreadyAdded: '${offerAnalysis.alreadyAddedSelector || '[class*="added"]'}',
    alreadyAddedFallbacks: ${JSON.stringify(alreadyAddedFallbacks, null, 6)}
  },
  feedback: {
    success: '${workflowAnalysis.successIndicator || '[role="alert"]'}',
    successFallbacks: ${JSON.stringify(successIndicatorFallbacks, null, 6)}
  },
  timing: {
    betweenOffers: ${workflowAnalysis.recommendedDelay || 1500},
    afterCardSwitch: ${(workflowAnalysis.recommendedDelay || 1500) * 2},
    waitForLoad: 3000,
    elementTimeout: 10000
  }
};`;
  
  // Generate markdown documentation
  const markdown = `# Amex Offers Page Structure Analysis

**Generated:** ${timestamp}  
**Page URL:** https://global.americanexpress.com/offers

---

## Summary

This document contains the discovered page structure and selectors for automating the Amex Offers system. The analysis was performed using Playwright to identify all interactive elements and their optimal selectors.

### Key Findings

- **Cards Detected:** ${cardAnalysis.cards.length}
- **Card Switcher Type:** ${cardAnalysis.switcherType}
- **Offers Found:** ${offerAnalysis.offerCount}
- **API Calls Captured:** ${apiCalls.length + workflowAnalysis.apiCalls.length}
- **Recommended Delay:** ${workflowAnalysis.recommendedDelay}ms between offer additions

---

## URL Structure

**Base URL:** https://global.americanexpress.com/offers

The page uses query parameters to identify specific credit cards:
- Account selection is handled via the card switcher UI element
- Each card has a unique identifier in the switcher value

---

## Card Switching

### Switcher Element

**Type:** ${cardAnalysis.switcherType}  
**Selector:** \`${cardAnalysis.switcherSelector}\`  
**Switch Method:** ${cardAnalysis.switchMethod}

### Detected Cards

${cardAnalysis.cards.length > 0 ? cardAnalysis.cards.map((card, index) => 
  `${index + 1}. **${card.text}**${card.selected ? ' _(currently selected)_' : ''}
   - Value: \`${card.value}\``
).join('\n') : '_No cards detected_'}

### How to Switch Cards

${cardAnalysis.switcherType === 'select' ? 
`\`\`\`javascript
// For select dropdown
const switcher = document.querySelector('${cardAnalysis.switcherSelector}');
switcher.value = '${cardAnalysis.cards[0]?.value || 'CARD_VALUE'}';
switcher.dispatchEvent(new Event('change', { bubbles: true }));
\`\`\`` :
`\`\`\`javascript
// For ${cardAnalysis.switcherType} switcher
const switcher = document.querySelector('${cardAnalysis.switcherSelector}');
switcher.click();
\`\`\``}

---

## Offers Structure

### Container Element

**Selector:** \`${offerAnalysis.offerContainerSelector}\`  
**Offers Found:** ${offerAnalysis.offerCount}

### Offer Card Elements

Each offer card contains the following elements:

#### Merchant Name
- **Primary Selector:** \`${offerAnalysis.merchantNameSelector}\`
- **Fallback Selectors:** ${merchantNameFallbacks.map(s => `\`${s}\``).join(', ')}

#### Add Button
- **Primary Selector:** \`${offerAnalysis.addButtonSelector}\`
- **Fallback Selectors:** ${addButtonFallbacks.map(s => `\`${s}\``).join(', ')}

#### Already Added Indicator
- **Primary Selector:** \`${offerAnalysis.alreadyAddedSelector}\`
- **Fallback Selectors:** ${alreadyAddedFallbacks.map(s => `\`${s}\``).join(', ')}

${offerAnalysis.sampleHTML ? `### Sample Offer HTML

\`\`\`html
${offerAnalysis.sampleHTML}...
\`\`\`
` : ''}

---

## Add Offer Workflow

### API Calls

${workflowAnalysis.apiCalls.length > 0 ? 
`The following API calls were captured during offer addition:

${workflowAnalysis.apiCalls.map((call, index) => 
  `${index + 1}. **${call.method}** \`${call.url}\`
   - Status: ${call.status}
   - Time: +${call.timeSinceClick}ms after click`
).join('\n')}` :
'_No API calls captured during workflow analysis_'}

### Success Indicators

**Primary Selector:** \`${workflowAnalysis.successIndicator || 'Not detected'}\`  
**Fallback Selectors:** ${successIndicatorFallbacks.map(s => `\`${s}\``).join(', ')}

${workflowAnalysis.merchantName ? `**Test Offer:** ${workflowAnalysis.merchantName}` : ''}

### Timing Recommendations

- **Between Offers:** ${workflowAnalysis.recommendedDelay}ms
- **After Card Switch:** ${(workflowAnalysis.recommendedDelay || 1500) * 2}ms (2x offer delay)
- **Page Load Wait:** 3000ms
- **Element Timeout:** 10000ms

${workflowAnalysis.requiresConfirmation ? 
`⚠️ **Confirmation Required:** The workflow detected a confirmation dialog. The automation script will need to handle this.` : 
`✅ **No Confirmation:** Offers can be added without additional confirmation dialogs.`}

---

## Selector Map for Tampermonkey Script

Copy the following JavaScript object into your Tampermonkey script:

\`\`\`javascript
${selectorsObject}
\`\`\`

---

## Usage Notes

### Selector Priority

The automation script should:
1. Try the primary selector first
2. If not found, iterate through fallback selectors in order
3. Log a warning if no selector succeeds

### Error Handling

- Wait up to 10 seconds for elements to appear
- Continue to next offer if one fails
- Log all errors for debugging

### Rate Limiting

- Use the recommended delays to avoid rate limiting
- Monitor for 429 status codes in API responses
- Increase delays if rate limiting is detected

### Authentication

- User must be logged in before automation starts
- Session must remain valid throughout automation
- Script should detect logout and pause

---

## Recommendations

1. **Test First:** Run automation on one card before processing all cards
2. **Monitor Console:** Watch for errors and API failures
3. **Verify Selectors:** If page structure changes, re-run this analyzer
4. **Backup Results:** Export results JSON after each run
5. **Rate Limiting:** If you encounter errors, increase the timing delays

---

## Page Load API Calls

${apiCalls.length > 0 ?
`The following API calls were captured during initial page load:

${apiCalls.slice(0, 10).map((call, index) => 
  `${index + 1}. **${call.method}** \`${call.url}\`
   - Status: ${call.status}`
).join('\n')}

${apiCalls.length > 10 ? `\n_...and ${apiCalls.length - 10} more calls_` : ''}` :
'_No API calls captured during page load_'}

---

## Next Steps

1. **Review this document** to ensure all selectors were discovered correctly
2. **Copy the AMEX_SELECTORS object** into your Tampermonkey script
3. **Install the script** in your browser using Tampermonkey
4. **Test the automation** on the Amex offers page
5. **Run validation tests** using Playwright to verify functionality

---

*This analysis was generated automatically by the Amex Offers Page Analyzer.*
`;
  
  return markdown;
}

// Run the analyzer if this file is executed directly
if (require.main === module) {
  analyzeAmexOffersPage()
    .then(({ page, browser, apiCalls, cardAnalysis, offerAnalysis, workflowAnalysis }) => {
      console.log('\n✅ Analysis complete');
      console.log(`📊 Captured ${apiCalls.length} API calls during page load`);
      console.log(`💳 Detected ${cardAnalysis.cards.length} cards`);
      console.log(`🎁 Detected ${offerAnalysis.offerCount} offers`);
      console.log(`🔄 Workflow API calls: ${workflowAnalysis.apiCalls.length}`);
      console.log(`⏱️  Recommended delay: ${workflowAnalysis.recommendedDelay}ms`);
      
      // Generate documentation
      console.log('\n📝 Generating documentation...');
      const analysisData = {
        cardAnalysis,
        offerAnalysis,
        workflowAnalysis,
        apiCalls
      };
      
      const markdown = generateAnalysisDocument(analysisData);
      
      // Create docs directory if it doesn't exist
      const docsDir = path.join(__dirname, '..', 'docs');
      if (!fs.existsSync(docsDir)) {
        fs.mkdirSync(docsDir, { recursive: true });
        console.log('✅ Created docs/ directory');
      }
      
      // Save markdown documentation
      const markdownPath = path.join(docsDir, 'page-structure.md');
      fs.writeFileSync(markdownPath, markdown, 'utf8');
      console.log(`✅ Saved documentation to ${markdownPath}`);
      
      // Save JSON structured data
      const jsonData = {
        timestamp: new Date().toISOString(),
        url: 'https://global.americanexpress.com/offers',
        cardAnalysis,
        offerAnalysis,
        workflowAnalysis,
        apiCalls: {
          pageLoad: apiCalls,
          workflow: workflowAnalysis.apiCalls
        }
      };
      
      const jsonPath = path.join(docsDir, 'page-structure.json');
      fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf8');
      console.log(`✅ Saved structured data to ${jsonPath}`);
      
      console.log('\n🎉 Analysis complete! Files saved:');
      console.log(`   📄 ${markdownPath}`);
      console.log(`   📄 ${jsonPath}`);
      console.log('\nNext steps:');
      console.log('   1. Review the generated documentation');
      console.log('   2. Copy AMEX_SELECTORS into your Tampermonkey script');
      console.log('   3. Test the automation');
      
      console.log('\nBrowser will remain open for further analysis...');
      console.log('Press Ctrl+C to close when done.\n');
    })
    .catch(error => {
      console.error('❌ Error during analysis:', error);
      process.exit(1);
    });
}

module.exports = { 
  analyzeAmexOffersPage, 
  analyzeCardElements, 
  analyzeOfferElements, 
  analyzeAddOfferWorkflow,
  generateAnalysisDocument 
};
