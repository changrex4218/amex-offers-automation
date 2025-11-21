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
      console.log('\nBrowser will remain open for further analysis...');
      console.log('Press Ctrl+C to close when done.\n');
    })
    .catch(error => {
      console.error('❌ Error during analysis:', error);
      process.exit(1);
    });
}

module.exports = { analyzeAmexOffersPage, analyzeCardElements, analyzeOfferElements, analyzeAddOfferWorkflow };
