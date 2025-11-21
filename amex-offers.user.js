// ==UserScript==
// @name         Amex Offers Automation
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Automate adding American Express card offers to multiple credit cards
// @author       Your Name
// @match        https://global.americanexpress.com/offers*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // ============================================================================
    // CONFIGURATION - Selector Map
    // ============================================================================
    // This configuration object contains all CSS selectors for interacting with
    // the Amex Offers page. These selectors are discovered by the Page Analyzer
    // and should be updated if the page structure changes.
    
    const AMEX_SELECTORS = {
        page: {
            url: 'https://global.americanexpress.com/offers',
            urlPattern: 'https://global.americanexpress.com/offers*'
        },
        cards: {
            // Card switcher element (dropdown, tabs, or buttons)
            switcher: '[role="combobox"]', // Combobox for managing accounts
            switcherType: 'combobox', // 'select' | 'tabs' | 'buttons' | 'combobox'
            // Fallback selectors for card switcher
            switcherFallbacks: [
                'select[data-testid="card-selector"]',
                'select.card-switcher',
                '[role="tablist"]',
                '.card-selector'
            ]
        },
        offers: {
            // Container holding all offer cards
            container: '[data-testid="offers-container"]', // Placeholder - update from analyzer
            containerFallbacks: [
                '.offers-list',
                '#offers-container',
                '[role="list"]'
            ],
            // Individual offer card element
            card: '[data-testid="offer-card"]', // Placeholder - update from analyzer
            cardFallbacks: [
                '.offer-card',
                '.offer-item',
                '[role="listitem"]'
            ],
            // Merchant name within offer card
            merchantName: '[data-testid="merchant-name"]', // Placeholder - update from analyzer
            merchantNameFallbacks: [
                '.merchant-name',
                '.offer-merchant',
                'h3',
                'h4'
            ],
            // Add button within offer card
            addButton: 'button[data-testid="add-offer"]', // Placeholder - update from analyzer
            addButtonFallbacks: [
                'button.add-offer',
                'button[aria-label*="Add"]',
                'button:contains("Add")'
            ],
            // Indicator that offer is already added
            alreadyAdded: '[data-testid="offer-added"]', // Placeholder - update from analyzer
            alreadyAddedFallbacks: [
                '.offer-added',
                'button[disabled]',
                '[aria-label*="Added"]'
            ]
        },
        feedback: {
            // Success indicator after adding offer
            success: '[data-testid="success-notification"]', // Placeholder - update from analyzer
            successFallbacks: [
                '.success-message',
                '[role="alert"]',
                '.notification'
            ]
        },
        timing: {
            // Delay between adding offers (milliseconds)
            betweenOffers: 1500,
            // Delay after switching cards (milliseconds)
            afterCardSwitch: 3000,
            // Wait for page load (milliseconds)
            waitForLoad: 3000,
            // Element polling interval (milliseconds)
            pollingInterval: 100,
            // Maximum wait for element (milliseconds)
            maxWait: 10000
        }
    };

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    /**
     * Wait for an element to appear in the DOM
     * @param {string} selector - CSS selector to wait for
     * @param {number} timeout - Maximum time to wait in milliseconds
     * @returns {Promise<HTMLElement|null>} The element if found, null if timeout
     */
    async function waitForElement(selector, timeout = AMEX_SELECTORS.timing.maxWait) {
        const startTime = Date.now();
        const pollingInterval = AMEX_SELECTORS.timing.pollingInterval;

        while (Date.now() - startTime < timeout) {
            const element = document.querySelector(selector);
            if (element) {
                log(`Element found: ${selector}`);
                return element;
            }

            // Wait before next poll
            await delay(pollingInterval);
        }

        logError(`Timeout waiting for element: ${selector}`);
        return null;
    }

    /**
     * Try multiple selectors until one is found
     * @param {string[]} selectors - Array of CSS selectors to try
     * @param {number} timeout - Maximum time to wait for each selector
     * @returns {Promise<HTMLElement|null>} The first element found, or null
     */
    async function waitForElementWithFallbacks(selectors, timeout = AMEX_SELECTORS.timing.maxWait) {
        for (const selector of selectors) {
            const element = await waitForElement(selector, timeout / selectors.length);
            if (element) {
                return element;
            }
        }
        return null;
    }

    /**
     * Safely execute a function with error handling
     * @param {Function} fn - Function to execute
     * @param {string} context - Description of what's being executed (for logging)
     * @param {*} fallback - Value to return if function fails
     * @returns {Promise<*>} Result of function or fallback value
     */
    async function safeExecute(fn, context, fallback) {
        try {
            return await fn();
        } catch (error) {
            logError(`Error in ${context}:`, error);
            return fallback;
        }
    }

    /**
     * Delay execution for specified milliseconds
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise<void>}
     */
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Log message to console with prefix
     * @param {...any} args - Arguments to log
     */
    function log(...args) {
        console.log('[Amex Automation]', ...args);
    }

    /**
     * Log error message to console with prefix
     * @param {...any} args - Arguments to log
     */
    function logError(...args) {
        console.error('[Amex Automation]', ...args);
    }

    /**
     * Log warning message to console with prefix
     * @param {...any} args - Arguments to log
     */
    function logWarn(...args) {
        console.warn('[Amex Automation]', ...args);
    }

    // ============================================================================
    // STATE MANAGEMENT
    // ============================================================================

    // Maximum number of results to keep in memory to prevent memory issues
    const MAX_RESULTS = 1000;

    /**
     * Application state object
     * Tracks the current state of the automation process
     */
    const state = {
        cards: [],              // Array of detected card objects
        currentCardIndex: 0,    // Index of card currently being processed
        results: [],            // Array of result objects from offer additions
        isRunning: false,       // Whether automation is currently running
        isPaused: false,        // Whether automation is paused
        totalOffers: 0          // Total count of offers across all cards
    };

    /**
     * Add a result to the results array with memory management
     * @param {Object} result - Result object to add
     */
    function addResult(result) {
        state.results.push(result);

        // Limit results array size to prevent memory issues
        if (state.results.length > MAX_RESULTS) {
            // Keep only the most recent results
            state.results = state.results.slice(-MAX_RESULTS);
            logWarn(`Results array exceeded ${MAX_RESULTS} items. Keeping only recent results.`);
        }

        // Log result to console
        if (result.success) {
            log(`✓ Added: ${result.merchant} to ${result.cardName}`);
        } else {
            logError(`✗ Failed: ${result.merchant} to ${result.cardName} - ${result.error || 'Unknown error'}`);
        }
    }

    /**
     * Get current state
     * @returns {Object} Current state object
     */
    function getState() {
        return { ...state };
    }

    /**
     * Update state properties
     * @param {Object} updates - Object with properties to update
     */
    function setState(updates) {
        Object.assign(state, updates);
        log('State updated:', updates);
    }

    /**
     * Reset state to initial values
     */
    function resetState() {
        state.cards = [];
        state.currentCardIndex = 0;
        state.results = [];
        state.isRunning = false;
        state.isPaused = false;
        state.totalOffers = 0;
        log('State reset');
    }

    /**
     * Get results summary
     * @returns {Object} Summary of results
     */
    function getResultsSummary() {
        const successCount = state.results.filter(r => r.success).length;
        const errorCount = state.results.filter(r => !r.success).length;
        const totalCount = state.results.length;

        return {
            total: totalCount,
            success: successCount,
            errors: errorCount,
            successRate: totalCount > 0 ? (successCount / totalCount * 100).toFixed(1) : 0
        };
    }

    // ============================================================================
    // DETECTION FUNCTIONS
    // ============================================================================

    /**
     * Detect all available credit cards from the card switcher
     * @returns {Promise<Array<Object>>} Array of card objects with name, value, accountKey
     */
    async function detectAllCards() {
        log('Detecting all cards...');

        try {
            // Wait for card switcher element
            let switcher = await waitForElement(AMEX_SELECTORS.cards.switcher);
            
            // If primary selector fails, try fallbacks
            if (!switcher && AMEX_SELECTORS.cards.switcherFallbacks) {
                log('Primary card switcher not found, trying fallbacks...');
                switcher = await waitForElementWithFallbacks(AMEX_SELECTORS.cards.switcherFallbacks);
            }

            if (!switcher) {
                logError('Card switcher element not found');
                return [];
            }

            log('Card switcher found:', switcher.tagName);

            const cards = [];

            // Check if switcher is a select element
            if (AMEX_SELECTORS.cards.switcherType === 'select' || switcher.tagName === 'SELECT') {
                // Extract all option elements
                const options = switcher.querySelectorAll('option');
                
                log(`Found ${options.length} card options in select dropdown`);

                options.forEach((option, index) => {
                    const value = option.value;
                    const text = option.textContent.trim();
                    const selected = option.selected;

                    // Skip empty or placeholder options
                    if (!value || value === '' || text === '' || text.toLowerCase().includes('select')) {
                        return;
                    }

                    // Extract account key from value (often the value itself or part of it)
                    // Account key might be in the value attribute or need to be extracted from URL
                    const accountKey = value;

                    const card = {
                        name: text,
                        value: value,
                        accountKey: accountKey,
                        element: option,
                        index: index
                    };

                    cards.push(card);
                    log(`  Card ${cards.length}: ${text} (value: ${value})`);
                });
            }
            // Tab-based card switcher
            else if (AMEX_SELECTORS.cards.switcherType === 'tabs' || switcher.getAttribute('role') === 'tablist') {
                log('Detecting tab-based card switcher');
                
                const tabs = switcher.querySelectorAll('[role="tab"]');
                log(`Found ${tabs.length} card tabs`);

                tabs.forEach((tab, index) => {
                    const text = tab.textContent.trim();
                    const value = tab.getAttribute('data-value') || tab.getAttribute('aria-controls') || tab.id || `tab-${index}`;
                    const accountKey = tab.getAttribute('data-account-key') || value;

                    if (!text || text === '') {
                        return;
                    }

                    const card = {
                        name: text,
                        value: value,
                        accountKey: accountKey,
                        element: tab,
                        index: index
                    };

                    cards.push(card);
                    log(`  Card ${cards.length}: ${text} (value: ${value})`);
                });
            }
            // Button-based card switcher
            else if (AMEX_SELECTORS.cards.switcherType === 'buttons') {
                log('Detecting button-based card switcher');
                
                const buttons = switcher.querySelectorAll('button');
                log(`Found ${buttons.length} card buttons`);

                buttons.forEach((button, index) => {
                    const text = button.textContent.trim();
                    const value = button.getAttribute('data-value') || button.getAttribute('value') || `button-${index}`;
                    const accountKey = button.getAttribute('data-account-key') || value;

                    // Skip buttons that don't look like card selectors
                    if (!text || text === '' || text.length < 3) {
                        return;
                    }

                    const card = {
                        name: text,
                        value: value,
                        accountKey: accountKey,
                        element: button,
                        index: index
                    };

                    cards.push(card);
                    log(`  Card ${cards.length}: ${text} (value: ${value})`);
                });
            }
            // Combobox-based card switcher (need to expand to see all cards)
            else if (AMEX_SELECTORS.cards.switcherType === 'combobox' || switcher.getAttribute('role') === 'combobox') {
                log('Detecting combobox-based card switcher');
                
                // Click the combobox to expand the dropdown
                log('Clicking combobox to expand card list...');
                switcher.click();
                
                // Wait for the dropdown to appear
                await delay(1000);
                
                // Look for the expanded listbox or menu
                const listbox = document.querySelector('[role="listbox"]') || 
                               document.querySelector('[role="menu"]') ||
                               document.querySelector('.account-selector-menu') ||
                               document.querySelector('[class*="dropdown"]');
                
                if (listbox) {
                    log('Found expanded card list');
                    
                    // Find all card options in the listbox
                    const options = listbox.querySelectorAll('[role="option"]') ||
                                   listbox.querySelectorAll('li') ||
                                   listbox.querySelectorAll('a');
                    
                    log(`Found ${options.length} card options in dropdown`);
                    
                    options.forEach((option, index) => {
                        const text = option.textContent.trim();
                        
                        // Extract account key from href or data attributes
                        const href = option.getAttribute('href') || '';
                        const accountKeyMatch = href.match(/account_key=([A-F0-9]+)/);
                        const accountKey = accountKeyMatch ? accountKeyMatch[1] : 
                                         option.getAttribute('data-account-key') || 
                                         option.getAttribute('data-value') ||
                                         `card-${index}`;
                        
                        // Skip empty or invalid options
                        if (!text || text.length < 3) {
                            return;
                        }
                        
                        const card = {
                            name: text,
                            value: accountKey,
                            accountKey: accountKey,
                            element: option,
                            index: index
                        };
                        
                        cards.push(card);
                        log(`  Card ${cards.length}: ${text} (accountKey: ${accountKey})`);
                    });
                    
                    // Close the dropdown by clicking elsewhere or pressing Escape
                    document.body.click();
                    await delay(500);
                } else {
                    logWarn('Could not find expanded card list, falling back to current card only');
                    
                    // Fallback: just use the currently displayed card
                    const text = switcher.textContent.trim();
                    const currentUrl = window.location.href;
                    const accountKeyMatch = currentUrl.match(/account_key=([A-F0-9]+)/);
                    const accountKey = accountKeyMatch ? accountKeyMatch[1] : 'default';
                    
                    if (text && text.length > 0) {
                        cards.push({
                            name: text,
                            value: accountKey,
                            accountKey: accountKey,
                            element: switcher,
                            index: 0
                        });
                        log(`  Card 1: ${text} (accountKey: ${accountKey})`);
                    }
                }
            }
            // Fallback: try to detect automatically
            else {
                logWarn('Unknown card switcher type, attempting automatic detection');
                
                // Try select first
                const selectElement = switcher.querySelector('select');
                if (selectElement) {
                    log('Found nested select element');
                    const options = selectElement.querySelectorAll('option');
                    options.forEach((option, index) => {
                        const value = option.value;
                        const text = option.textContent.trim();
                        if (value && text && !text.toLowerCase().includes('select')) {
                            cards.push({
                                name: text,
                                value: value,
                                accountKey: value,
                                element: option,
                                index: index
                            });
                        }
                    });
                }
                // Try tabs
                else if (switcher.querySelector('[role="tab"]')) {
                    log('Found tab elements');
                    const tabs = switcher.querySelectorAll('[role="tab"]');
                    tabs.forEach((tab, index) => {
                        const text = tab.textContent.trim();
                        const value = tab.getAttribute('data-value') || tab.id || `tab-${index}`;
                        if (text) {
                            cards.push({
                                name: text,
                                value: value,
                                accountKey: value,
                                element: tab,
                                index: index
                            });
                        }
                    });
                }
                // Try buttons
                else {
                    log('Trying button elements');
                    const buttons = switcher.querySelectorAll('button');
                    buttons.forEach((button, index) => {
                        const text = button.textContent.trim();
                        const value = button.getAttribute('data-value') || `button-${index}`;
                        if (text && text.length >= 3) {
                            cards.push({
                                name: text,
                                value: value,
                                accountKey: value,
                                element: button,
                                index: index
                            });
                        }
                    });
                }
            }

            log(`✓ Detected ${cards.length} cards`);
            
            // Log card names for easy reference
            if (cards.length > 0) {
                log('Card names:', cards.map(c => c.name).join(', '));
            }

            return cards;

        } catch (error) {
            logError('Error detecting cards:', error);
            return [];
        }
    }

    /**
     * Detect all available offers for the current card
     * Filters out offers that are already added and offers without valid add buttons
     * @returns {Promise<Array<Object>>} Array of offer objects with merchant, addButton, element
     */
    async function detectOffersForCurrentCard() {
        log('Detecting offers for current card...');

        try {
            // Wait for offers container element
            let container = await waitForElement(AMEX_SELECTORS.offers.container);
            
            // If primary selector fails, try fallbacks
            if (!container && AMEX_SELECTORS.offers.containerFallbacks) {
                log('Primary offers container not found, trying fallbacks...');
                container = await waitForElementWithFallbacks(AMEX_SELECTORS.offers.containerFallbacks);
            }

            if (!container) {
                logError('Offers container element not found');
                return [];
            }

            log('Offers container found');

            // Query all offer card elements using the discovered selector
            let offerCards = container.querySelectorAll(AMEX_SELECTORS.offers.card);
            
            // If primary selector fails, try fallbacks
            if (offerCards.length === 0 && AMEX_SELECTORS.offers.cardFallbacks) {
                log('No offer cards found with primary selector, trying fallbacks...');
                for (const fallbackSelector of AMEX_SELECTORS.offers.cardFallbacks) {
                    offerCards = container.querySelectorAll(fallbackSelector);
                    if (offerCards.length > 0) {
                        log(`Found ${offerCards.length} offer cards with fallback selector: ${fallbackSelector}`);
                        break;
                    }
                }
            }

            if (offerCards.length === 0) {
                log('No offer cards found on page');
                return [];
            }

            log(`Found ${offerCards.length} total offer cards`);

            const availableOffers = [];

            // Process each offer card
            for (let i = 0; i < offerCards.length; i++) {
                const offerCard = offerCards[i];

                // Check for already-added indicator
                let alreadyAddedIndicator = offerCard.querySelector(AMEX_SELECTORS.offers.alreadyAdded);
                
                // Try fallback selectors if primary fails
                if (!alreadyAddedIndicator && AMEX_SELECTORS.offers.alreadyAddedFallbacks) {
                    for (const fallbackSelector of AMEX_SELECTORS.offers.alreadyAddedFallbacks) {
                        alreadyAddedIndicator = offerCard.querySelector(fallbackSelector);
                        if (alreadyAddedIndicator) {
                            break;
                        }
                    }
                }

                // If already-added indicator is present, skip this offer
                if (alreadyAddedIndicator) {
                    log(`  Offer ${i + 1}: Already added, skipping`);
                    continue;
                }

                // Extract merchant name using primary selector
                let merchantElement = offerCard.querySelector(AMEX_SELECTORS.offers.merchantName);
                
                // Try fallback selectors if primary fails
                if (!merchantElement && AMEX_SELECTORS.offers.merchantNameFallbacks) {
                    for (const fallbackSelector of AMEX_SELECTORS.offers.merchantNameFallbacks) {
                        merchantElement = offerCard.querySelector(fallbackSelector);
                        if (merchantElement && merchantElement.textContent.trim()) {
                            break;
                        }
                    }
                }

                // Get merchant name text
                const merchantName = merchantElement ? merchantElement.textContent.trim() : `Unknown Merchant ${i + 1}`;

                // Locate add button using primary selector
                let addButton = offerCard.querySelector(AMEX_SELECTORS.offers.addButton);
                
                // Try fallback selectors if primary fails
                if (!addButton && AMEX_SELECTORS.offers.addButtonFallbacks) {
                    for (const fallbackSelector of AMEX_SELECTORS.offers.addButtonFallbacks) {
                        addButton = offerCard.querySelector(fallbackSelector);
                        if (addButton) {
                            break;
                        }
                    }
                }

                // If no add button is found, exclude this offer
                if (!addButton) {
                    logWarn(`  Offer ${i + 1} (${merchantName}): No add button found, skipping`);
                    continue;
                }

                // Check if add button is disabled
                if (addButton.disabled || addButton.getAttribute('disabled') !== null) {
                    log(`  Offer ${i + 1} (${merchantName}): Add button is disabled, skipping`);
                    continue;
                }

                // Create offer object
                const offer = {
                    merchant: merchantName,
                    addButton: addButton,
                    element: offerCard
                };

                availableOffers.push(offer);
                log(`  Offer ${availableOffers.length}: ${merchantName} - Available`);
            }

            log(`✓ Detected ${availableOffers.length} available offers (${offerCards.length - availableOffers.length} already added or unavailable)`);

            return availableOffers;

        } catch (error) {
            logError('Error detecting offers:', error);
            return [];
        }
    }

    // ============================================================================
    // ACTION FUNCTIONS
    // ============================================================================

    /**
     * Switch to a specific credit card
     * @param {Object} card - Card object from detectAllCards()
     * @returns {Promise<boolean>} True if switch was successful, false otherwise
     */
    async function switchToCard(card) {
        log(`Switching to card: ${card.name}`);

        try {
            // Get the card switcher element
            let switcher = await waitForElement(AMEX_SELECTORS.cards.switcher);
            
            if (!switcher && AMEX_SELECTORS.cards.switcherFallbacks) {
                switcher = await waitForElementWithFallbacks(AMEX_SELECTORS.cards.switcherFallbacks);
            }

            if (!switcher) {
                logError('Card switcher element not found');
                return false;
            }

            // Handle select dropdown
            if (AMEX_SELECTORS.cards.switcherType === 'select' || switcher.tagName === 'SELECT') {
                // Set the value to the target card's value
                switcher.value = card.value;

                // Dispatch change event with bubbles: true
                const changeEvent = new Event('change', { bubbles: true });
                switcher.dispatchEvent(changeEvent);

                // Also dispatch input event for frameworks that listen to it
                const inputEvent = new Event('input', { bubbles: true });
                switcher.dispatchEvent(inputEvent);

                log(`Set select value to: ${card.value}`);
            }
            // Handle tab-based switcher
            else if (AMEX_SELECTORS.cards.switcherType === 'tabs' || switcher.getAttribute('role') === 'tablist') {
                // Click the tab element
                card.element.click();
                log(`Clicked tab: ${card.name}`);
            }
            // Handle button-based switcher
            else if (AMEX_SELECTORS.cards.switcherType === 'buttons') {
                // Click the button element
                card.element.click();
                log(`Clicked button: ${card.name}`);
            }
            // Fallback: try clicking the element
            else {
                card.element.click();
                log(`Clicked element: ${card.name}`);
            }

            // Wait for the recommended delay after card switch
            log(`Waiting ${AMEX_SELECTORS.timing.afterCardSwitch}ms for card switch to complete...`);
            await delay(AMEX_SELECTORS.timing.afterCardSwitch);

            // Wait for offers container to be present in DOM
            const offersContainer = await waitForElement(AMEX_SELECTORS.offers.container);
            
            if (!offersContainer && AMEX_SELECTORS.offers.containerFallbacks) {
                const fallbackContainer = await waitForElementWithFallbacks(AMEX_SELECTORS.offers.containerFallbacks);
                if (!fallbackContainer) {
                    logError('Offers container not found after card switch');
                    return false;
                }
            }

            log(`✓ Successfully switched to card: ${card.name}`);
            return true;

        } catch (error) {
            logError(`Error switching to card ${card.name}:`, error);
            return false;
        }
    }

    /**
     * Add a single offer to the current card
     * @param {Object} offer - Offer object from detectOffersForCurrentCard()
     * @param {Object} card - Card object from detectAllCards()
     * @returns {Promise<Object>} Result object with timestamp, cardName, merchant, status, success
     */
    async function addOfferToCard(offer, card) {
        log(`Adding offer: ${offer.merchant} to ${card.name}`);

        // Create result object with initial values
        const result = {
            timestamp: new Date().toISOString(),
            cardName: card.name,
            merchant: offer.merchant,
            status: 'unknown',
            success: false
        };

        try {
            // Validate inputs
            if (!offer || !offer.addButton) {
                throw new Error('Invalid offer object: missing addButton');
            }

            if (!card || !card.name) {
                throw new Error('Invalid card object: missing name');
            }

            // Check if add button is still available and not disabled
            if (offer.addButton.disabled || offer.addButton.getAttribute('disabled') !== null) {
                throw new Error('Add button is disabled');
            }

            // Click the offer's add button element
            log(`Clicking add button for: ${offer.merchant}`);
            offer.addButton.click();

            // Wait for the recommended delay between offers
            log(`Waiting ${AMEX_SELECTORS.timing.betweenOffers}ms for offer addition to complete...`);
            await delay(AMEX_SELECTORS.timing.betweenOffers);

            // Check for success indicator element
            let successIndicator = await waitForElement(AMEX_SELECTORS.feedback.success, 5000);
            
            // Try fallback selectors if primary fails
            if (!successIndicator && AMEX_SELECTORS.feedback.successFallbacks) {
                log('Primary success indicator not found, trying fallbacks...');
                successIndicator = await waitForElementWithFallbacks(
                    AMEX_SELECTORS.feedback.successFallbacks,
                    5000
                );
            }

            // Alternative success check: verify the add button is now disabled or has changed state
            const buttonNowDisabled = offer.addButton.disabled || 
                                     offer.addButton.getAttribute('disabled') !== null ||
                                     offer.addButton.getAttribute('aria-disabled') === 'true';

            // Alternative success check: look for "added" indicator on the offer card
            let addedIndicator = null;
            if (offer.element) {
                addedIndicator = offer.element.querySelector(AMEX_SELECTORS.offers.alreadyAdded);
                
                if (!addedIndicator && AMEX_SELECTORS.offers.alreadyAddedFallbacks) {
                    for (const fallbackSelector of AMEX_SELECTORS.offers.alreadyAddedFallbacks) {
                        addedIndicator = offer.element.querySelector(fallbackSelector);
                        if (addedIndicator) {
                            break;
                        }
                    }
                }
            }

            // Determine success based on multiple indicators
            const isSuccess = successIndicator || buttonNowDisabled || addedIndicator;

            if (isSuccess) {
                result.status = 'success';
                result.success = true;
                log(`✓ Successfully added: ${offer.merchant} to ${card.name}`);
                
                // Update "Last Added" UI element
                const lastAddedElement = document.getElementById('amex-last-added');
                if (lastAddedElement) {
                    lastAddedElement.textContent = `${offer.merchant} - ${card.name}`;
                    lastAddedElement.style.color = '#4CAF50';
                }
            } else {
                result.status = 'unknown';
                result.success = false;
                result.error = 'No success indicator found, but no error occurred';
                logWarn(`? Uncertain status for: ${offer.merchant} to ${card.name}`);
            }

            // Add result to state
            addResult(result);

            return result;

        } catch (error) {
            // Error handling: catch errors and record them
            logError(`Error adding offer ${offer.merchant} to ${card.name}:`, error);

            // Update result object with error information
            result.status = 'error';
            result.success = false;
            result.error = error.message || 'Unknown error occurred';

            // Add error result to state
            addResult(result);

            // Return error result object
            return result;
        }
    }

    // ============================================================================
    // ORCHESTRATION
    // ============================================================================

    /**
     * Main automation function that processes all cards and all offers
     * Orchestrates the entire workflow: iterate through cards, detect offers, add offers
     * @param {Array<Object>} cards - Array of card objects from detectAllCards()
     * @returns {Promise<Array<Object>>} Array of result objects
     */
    async function automateAllOffersAllCards(cards) {
        log('='.repeat(60));
        log('Starting automation for all cards and offers');
        log('='.repeat(60));

        // Validate input
        if (!cards || cards.length === 0) {
            logError('No cards provided to automation function');
            return [];
        }

        // Initialize results array and totalOffers counter
        const results = [];
        let totalOffers = 0;

        // Set automation state
        setState({
            isRunning: true,
            isPaused: false,
            results: [],
            totalOffers: 0
        });

        try {
            // Outer loop: iterate through each card sequentially
            for (let cardIndex = 0; cardIndex < cards.length; cardIndex++) {
                const card = cards[cardIndex];

                // Update current card index in state
                setState({ currentCardIndex: cardIndex });

                log('-'.repeat(60));
                log(`Processing Card ${cardIndex + 1}/${cards.length}: ${card.name}`);
                log('-'.repeat(60));

                // Update progress UI with current card information
                updateProgress(
                    `Processing card ${cardIndex + 1}/${cards.length}: ${card.name}`,
                    (cardIndex / cards.length) * 100
                );

                // Switch to the current card using switchToCard()
                const switchSuccess = await switchToCard(card);

                if (!switchSuccess) {
                    logError(`Failed to switch to card: ${card.name}. Skipping this card.`);
                    continue; // Skip to next card
                }

                // Detect offers for current card using detectOffersForCurrentCard()
                const offers = await detectOffersForCurrentCard();

                // Increment totalOffers counter
                totalOffers += offers.length;
                setState({ totalOffers: totalOffers });

                log(`Found ${offers.length} available offers for ${card.name}`);

                if (offers.length === 0) {
                    log(`No offers to add for ${card.name}, moving to next card`);
                    continue; // Skip to next card
                }

                // Inner loop: iterate through offers for current card
                for (let offerIndex = 0; offerIndex < offers.length; offerIndex++) {
                    const offer = offers[offerIndex];

                    // Check if automation should pause or stop
                    if (state.isPaused) {
                        log('Automation paused by user');
                        while (state.isPaused && state.isRunning) {
                            await delay(500); // Wait while paused
                        }
                        log('Automation resumed');
                    }

                    if (!state.isRunning) {
                        log('Automation stopped by user');
                        break; // Exit inner loop
                    }

                    // Calculate progress percentage
                    const cardProgress = (offerIndex / offers.length) * 100;
                    const overallProgress = ((cardIndex + (offerIndex / offers.length)) / cards.length) * 100;

                    // Update progress UI with current offer number and percentage
                    updateProgress(
                        `Card ${cardIndex + 1}/${cards.length}: Adding offer ${offerIndex + 1}/${offers.length} - ${offer.merchant}`,
                        overallProgress
                    );

                    log(`  [${offerIndex + 1}/${offers.length}] Adding: ${offer.merchant}`);

                    // Call addOfferToCard() for each offer
                    const result = await addOfferToCard(offer, card);

                    // Add result to results array using addResult()
                    // Note: addResult() is already called inside addOfferToCard(),
                    // but we also collect results here for the return value
                    results.push(result);

                    // Continue to next offer even if one fails
                    // (error handling is done inside addOfferToCard)
                }

                // Check if automation was stopped during inner loop
                if (!state.isRunning) {
                    log('Automation stopped by user');
                    break; // Exit outer loop
                }

                log(`Completed processing ${card.name}: ${offers.length} offers processed`);
            }

            // Calculate total successful additions from results array
            const successCount = results.filter(r => r.success).length;
            const errorCount = results.filter(r => !r.success).length;

            log('='.repeat(60));
            log('Automation Complete!');
            log(`Total cards processed: ${cards.length}`);
            log(`Total offers found: ${totalOffers}`);
            log(`Total offers processed: ${results.length}`);
            log(`Successful additions: ${successCount}`);
            log(`Failed additions: ${errorCount}`);
            log('='.repeat(60));

            // Update progress UI with completion message
            updateProgress(
                `Automation complete! Successfully added ${successCount} offers`,
                100
            );

            // Call showCompletionNotification() with results
            showCompletionNotification(results);

            // Return results array
            return results;

        } catch (error) {
            logError('Error during automation:', error);
            
            // Update progress UI with error message
            updateProgress(`Automation error: ${error.message}`, 0);

            return results;

        } finally {
            // Reset automation state
            setState({
                isRunning: false,
                isPaused: false
            });

            log('Automation state reset');
        }
    }



    // ============================================================================
    // UI COMPONENTS
    // ============================================================================

    /**
     * Create and inject the progress panel into the page
     * @returns {HTMLElement} The created progress panel element
     */
    function createProgressPanel() {
        log('Creating progress panel...');

        // Check if panel already exists
        const existingPanel = document.getElementById('amex-automation-panel');
        if (existingPanel) {
            log('Progress panel already exists');
            return existingPanel;
        }

        // Create main panel container
        const panel = document.createElement('div');
        panel.id = 'amex-automation-panel';
        
        // Apply CSS styling
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 400px;
            max-height: 600px;
            background: white;
            border: 2px solid #006FCF;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 999999;
            font-family: Arial, sans-serif;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;

        // Create panel HTML structure
        panel.innerHTML = `
            <div style="padding: 16px; border-bottom: 1px solid #e0e0e0; background: #006FCF; color: white;">
                <h3 style="margin: 0; font-size: 18px; font-weight: bold;">Amex Offers Automation</h3>
            </div>
            
            <div style="padding: 16px; flex: 1; overflow-y: auto;">
                <!-- Card List Section -->
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">Cards Detected: <span id="amex-card-count">0</span></div>
                    <div id="amex-card-list" style="max-height: 150px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 4px; padding: 8px; background: #f9f9f9;">
                        <div style="color: #666; font-size: 13px;">No cards detected yet...</div>
                    </div>
                </div>

                <!-- Status Section -->
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">Status:</div>
                    <div id="amex-status-message" style="font-size: 13px; color: #333; padding: 8px; background: #f0f0f0; border-radius: 4px; min-height: 20px;">
                        Ready to start
                    </div>
                </div>

                <!-- Progress Bar Section -->
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">
                        Progress: <span id="amex-progress-percentage">0%</span>
                    </div>
                    <div style="width: 100%; height: 24px; background: #e0e0e0; border-radius: 12px; overflow: hidden; position: relative;">
                        <div id="amex-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #006FCF, #0099FF); transition: width 0.3s ease; display: flex; align-items: center; justify-content: center;">
                        </div>
                    </div>
                </div>

                <!-- Action Buttons Section -->
                <div style="margin-bottom: 16px; display: flex; gap: 8px;">
                    <button id="amex-btn-start" style="flex: 1; padding: 10px; background: #006FCF; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;">
                        Add All Offers
                    </button>
                    <button id="amex-btn-pause" style="flex: 0 0 80px; padding: 10px; background: #FFA500; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;" disabled>
                        Pause
                    </button>
                    <button id="amex-btn-stop" style="flex: 0 0 80px; padding: 10px; background: #DC143C; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold;" disabled>
                        Stop
                    </button>
                </div>

                <!-- Last Added Section -->
                <div style="margin-bottom: 16px;">
                    <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">Last Added:</div>
                    <div id="amex-last-added" style="font-size: 13px; color: #666; padding: 8px; background: #f0f0f0; border-radius: 4px; min-height: 20px;">
                        None yet
                    </div>
                </div>

                <!-- Results Section -->
                <div style="border-top: 1px solid #e0e0e0; padding-top: 16px;">
                    <div style="display: flex; gap: 8px;">
                        <button id="amex-btn-view-results" style="flex: 1; padding: 8px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">
                            View Results
                        </button>
                        <button id="amex-btn-export-json" style="flex: 1; padding: 8px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px;">
                            Export JSON
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Append panel to document body
        document.body.appendChild(panel);

        log('✓ Progress panel created and added to page');

        return panel;
    }

    /**
     * Update progress UI with current status and percentage
     * @param {string} message - Status message to display
     * @param {number} percentage - Progress percentage (0-100)
     */
    function updateProgress(message, percentage) {
        log(`Progress: ${percentage.toFixed(1)}% - ${message}`);
        
        // Update status message text in progress panel
        const statusElement = document.getElementById('amex-status-message');
        if (statusElement) {
            statusElement.textContent = message;
        }

        // Update progress bar width based on percentage
        const progressBar = document.getElementById('amex-progress-bar');
        if (progressBar) {
            // Clamp percentage between 0 and 100
            const clampedPercentage = Math.max(0, Math.min(100, percentage));
            progressBar.style.width = `${clampedPercentage}%`;
        }

        // Update percentage display text
        const percentageElement = document.getElementById('amex-progress-percentage');
        if (percentageElement) {
            percentageElement.textContent = `${percentage.toFixed(1)}%`;
        }
    }

    /**
     * Render the list of detected cards in the progress panel
     * @param {Array<Object>} cards - Array of card objects from detectAllCards()
     */
    function renderCardList(cards) {
        log(`Rendering card list with ${cards.length} cards`);

        // Update card count
        const cardCountElement = document.getElementById('amex-card-count');
        if (cardCountElement) {
            cardCountElement.textContent = cards.length;
        }

        // Get card list container
        const cardListElement = document.getElementById('amex-card-list');
        if (!cardListElement) {
            logError('Card list element not found');
            return;
        }

        // Clear existing content
        cardListElement.innerHTML = '';

        // If no cards, show message
        if (cards.length === 0) {
            cardListElement.innerHTML = '<div style="color: #666; font-size: 13px;">No cards detected yet...</div>';
            return;
        }

        // Create checkbox list items for each card
        cards.forEach((card, index) => {
            const cardItem = document.createElement('div');
            cardItem.style.cssText = `
                display: flex;
                align-items: center;
                padding: 6px 4px;
                border-bottom: 1px solid #e0e0e0;
                font-size: 13px;
            `;
            
            // Remove border from last item
            if (index === cards.length - 1) {
                cardItem.style.borderBottom = 'none';
            }

            // Create checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `amex-card-checkbox-${index}`;
            checkbox.style.marginRight = '8px';
            
            // Mark current card as checked
            if (index === state.currentCardIndex) {
                checkbox.checked = true;
            }

            // Create label
            const label = document.createElement('label');
            label.htmlFor = `amex-card-checkbox-${index}`;
            label.textContent = `Card ${index + 1}: ${card.name}`;
            label.style.cursor = 'pointer';
            label.style.flex = '1';

            // Append checkbox and label to card item
            cardItem.appendChild(checkbox);
            cardItem.appendChild(label);

            // Append card item to list
            cardListElement.appendChild(cardItem);
        });

        log('✓ Card list rendered');
    }

    /**
     * Show completion notification to user
     * @param {Array<Object>} results - Array of result objects
     */
    function showCompletionNotification(results) {
        // Calculate success count from results array
        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;

        const message = `Amex Offers Automation Complete!\n\nSuccessfully added ${successCount} out of ${totalCount} offers.`;

        log('Showing completion notification:', message);

        // Use GM_notification to display browser notification
        if (typeof GM_notification !== 'undefined') {
            GM_notification({
                title: 'Amex Offers Automation',
                text: `Successfully added ${successCount} out of ${totalCount} offers`,
                timeout: 10000, // Show for 10 seconds
                onclick: function() {
                    // Focus the window when notification is clicked
                    window.focus();
                }
            });
        } else {
            // Fallback: use browser's native notification API
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Amex Offers Automation', {
                    body: `Successfully added ${successCount} out of ${totalCount} offers`,
                    icon: 'https://www.americanexpress.com/favicon.ico'
                });
            } else if ('Notification' in window && Notification.permission !== 'denied') {
                // Request permission first
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification('Amex Offers Automation', {
                            body: `Successfully added ${successCount} out of ${totalCount} offers`,
                            icon: 'https://www.americanexpress.com/favicon.ico'
                        });
                    }
                });
            } else {
                // Fallback: use alert
                alert(message);
            }
        }
    }

    /**
     * Export results to JSON file
     * Creates a downloadable JSON file with all results data
     */
    function exportResults() {
        log('Exporting results to JSON...');

        // Get results from state
        const results = state.results;

        if (results.length === 0) {
            alert('No results to export yet. Run the automation first.');
            return;
        }

        // Create results object with metadata
        const exportData = {
            exportDate: new Date().toISOString(),
            totalResults: results.length,
            successCount: results.filter(r => r.success).length,
            errorCount: results.filter(r => !r.success).length,
            results: results
        };

        // Convert to JSON string with pretty formatting
        const jsonString = JSON.stringify(exportData, null, 2);

        // Create blob from JSON string
        const blob = new Blob([jsonString], { type: 'application/json' });

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        link.download = `amex-offers-results-${timestamp}.json`;

        // Trigger download
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        log(`✓ Results exported: ${results.length} records`);
    }

    /**
     * View results in console
     * Displays a formatted summary of all results
     */
    function viewResults() {
        log('Viewing results...');

        const results = state.results;

        if (results.length === 0) {
            console.log('[Amex Automation] No results yet. Run the automation first.');
            alert('No results yet. Run the automation first.');
            return;
        }

        // Get summary
        const summary = getResultsSummary();

        // Log summary
        console.log('='.repeat(60));
        console.log('[Amex Automation] RESULTS SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Results: ${summary.total}`);
        console.log(`Successful: ${summary.success} (${summary.successRate}%)`);
        console.log(`Failed: ${summary.errors}`);
        console.log('='.repeat(60));

        // Log detailed results
        console.log('[Amex Automation] DETAILED RESULTS:');
        console.table(results.map(r => ({
            Time: new Date(r.timestamp).toLocaleTimeString(),
            Card: r.cardName,
            Merchant: r.merchant,
            Status: r.status,
            Success: r.success ? '✓' : '✗',
            Error: r.error || '-'
        })));

        console.log('='.repeat(60));

        // Show alert with summary
        alert(`Results Summary:\n\nTotal: ${summary.total}\nSuccessful: ${summary.success} (${summary.successRate}%)\nFailed: ${summary.errors}\n\nSee console for detailed results.`);
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    /**
     * Initialize the UI and set up event handlers
     * Main entry point for the automation script
     */
    async function initializeUI() {
        log('Initializing Amex Offers Automation...');

        try {
            // Verify page URL matches Amex offers page pattern
            const currentUrl = window.location.href;
            if (!currentUrl.includes('global.americanexpress.com/offers')) {
                logWarn('Not on Amex offers page, skipping initialization');
                return;
            }

            log('✓ On Amex offers page, proceeding with initialization');

            // Call createProgressPanel() to build UI
            const panel = createProgressPanel();
            if (!panel) {
                logError('Failed to create progress panel');
                return;
            }

            // Wait a moment for page to be fully ready
            await delay(1000);

            // Call detectAllCards() and render card list
            log('Detecting cards...');
            const cards = await detectAllCards();
            
            // Store cards in state
            setState({ cards: cards });

            // Render card list in UI
            renderCardList(cards);

            if (cards.length > 0) {
                log(`✓ Detected ${cards.length} cards`);
                updateProgress(`Ready! Detected ${cards.length} cards. Click "Add All Offers" to start.`, 0);
            } else {
                logWarn('No cards detected. Please check if you are logged in.');
                updateProgress('No cards detected. Please check if you are logged in.', 0);
            }

            // Attach event handlers to all buttons
            attachEventHandlers();

            // Set up initial state
            setState({
                isRunning: false,
                isPaused: false,
                currentCardIndex: 0,
                results: [],
                totalOffers: 0
            });

            log('✓ Initialization complete');

        } catch (error) {
            logError('Error during initialization:', error);
        }
    }

    /**
     * Attach event handlers to UI buttons
     */
    function attachEventHandlers() {
        log('Attaching event handlers...');

        // Add click handler to "Add All Offers" button
        const startButton = document.getElementById('amex-btn-start');
        if (startButton) {
            startButton.addEventListener('click', async () => {
                log('Start button clicked');

                // Disable start button during automation
                startButton.disabled = true;
                startButton.style.opacity = '0.5';
                startButton.style.cursor = 'not-allowed';

                // Enable pause and stop buttons
                const pauseButton = document.getElementById('amex-btn-pause');
                const stopButton = document.getElementById('amex-btn-stop');
                if (pauseButton) {
                    pauseButton.disabled = false;
                    pauseButton.style.opacity = '1';
                    pauseButton.style.cursor = 'pointer';
                }
                if (stopButton) {
                    stopButton.disabled = false;
                    stopButton.style.opacity = '1';
                    stopButton.style.cursor = 'pointer';
                }

                try {
                    // Get cards from state
                    const cards = state.cards;

                    if (!cards || cards.length === 0) {
                        alert('No cards detected. Please refresh the page and try again.');
                        return;
                    }

                    // Call automateAllOffersAllCards()
                    log('Starting automation...');
                    const results = await automateAllOffersAllCards(cards);
                    log(`Automation completed with ${results.length} results`);

                } catch (error) {
                    logError('Error during automation:', error);
                    alert(`Automation error: ${error.message}`);
                } finally {
                    // Re-enable start button
                    startButton.disabled = false;
                    startButton.style.opacity = '1';
                    startButton.style.cursor = 'pointer';

                    // Disable pause and stop buttons
                    if (pauseButton) {
                        pauseButton.disabled = true;
                        pauseButton.style.opacity = '0.5';
                        pauseButton.style.cursor = 'not-allowed';
                    }
                    if (stopButton) {
                        stopButton.disabled = true;
                        stopButton.style.opacity = '0.5';
                        stopButton.style.cursor = 'not-allowed';
                    }
                }
            });
            log('✓ Start button handler attached');
        }

        // Add click handler to "Pause" button
        const pauseButton = document.getElementById('amex-btn-pause');
        if (pauseButton) {
            pauseButton.addEventListener('click', () => {
                log('Pause button clicked');

                // Toggle isPaused state
                const newPausedState = !state.isPaused;
                setState({ isPaused: newPausedState });

                // Update button text and style
                if (newPausedState) {
                    pauseButton.textContent = 'Resume';
                    pauseButton.style.background = '#4CAF50';
                    log('Automation paused');
                    updateProgress('Automation paused. Click Resume to continue.', state.currentCardIndex / state.cards.length * 100);
                } else {
                    pauseButton.textContent = 'Pause';
                    pauseButton.style.background = '#FFA500';
                    log('Automation resumed');
                }
            });
            log('✓ Pause button handler attached');
        }

        // Add click handler to "Stop" button
        const stopButton = document.getElementById('amex-btn-stop');
        if (stopButton) {
            stopButton.addEventListener('click', () => {
                log('Stop button clicked');

                // Set isRunning to false
                setState({ isRunning: false, isPaused: false });

                // Update pause button text back to "Pause"
                const pauseBtn = document.getElementById('amex-btn-pause');
                if (pauseBtn) {
                    pauseBtn.textContent = 'Pause';
                    pauseBtn.style.background = '#FFA500';
                }

                log('Automation stopped by user');
                updateProgress('Automation stopped by user', 0);
            });
            log('✓ Stop button handler attached');
        }

        // Add click handler to "View Results" button
        const viewResultsButton = document.getElementById('amex-btn-view-results');
        if (viewResultsButton) {
            viewResultsButton.addEventListener('click', () => {
                log('View Results button clicked');
                viewResults();
            });
            log('✓ View Results button handler attached');
        }

        // Add click handler to "Export JSON" button
        const exportButton = document.getElementById('amex-btn-export-json');
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                log('Export JSON button clicked');
                exportResults();
            });
            log('✓ Export JSON button handler attached');
        }

        log('✓ All event handlers attached');
    }

    /**
     * Automatic initialization on page load
     * Called when script loads and page is ready
     */
    function autoInitialize() {
        // Verify page URL matches Amex offers page pattern
        const currentUrl = window.location.href;
        
        if (!currentUrl.includes('global.americanexpress.com/offers')) {
            log('Not on Amex offers page, script will not initialize');
            return;
        }

        // Log initialization message to console
        log('='.repeat(60));
        log('Amex Offers Automation v1.0.0');
        log('Script loaded and ready to initialize');
        log('='.repeat(60));

        // Wait for page to be fully ready
        if (document.readyState === 'loading') {
            log('Document still loading, waiting for DOMContentLoaded...');
            document.addEventListener('DOMContentLoaded', () => {
                log('DOMContentLoaded event fired');
                // Wait a bit more for dynamic content
                setTimeout(() => {
                    initializeUI();
                }, 2000);
            });
        } else {
            log('Document already loaded');
            // Wait a bit for dynamic content
            setTimeout(() => {
                initializeUI();
            }, 2000);
        }
    }

    // Call autoInitialize when script loads
    autoInitialize();

    // ============================================================================
    // EXPOSE FUNCTIONS FOR TESTING
    // ============================================================================
    
    // Expose functions globally for testing purposes
    window.AmexAutomation = {
        detectAllCards,
        detectOffersForCurrentCard,
        switchToCard,
        addOfferToCard,
        automateAllOffersAllCards,
        createProgressPanel,
        updateProgress,
        renderCardList,
        showCompletionNotification,
        exportResults,
        viewResults,
        getState,
        setState,
        resetState,
        getResultsSummary,
        initializeUI,
        attachEventHandlers
    };

    log('Script loaded and functions exposed to window.AmexAutomation');

})();
