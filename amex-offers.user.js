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
            switcher: 'select[data-testid="card-selector"]', // Placeholder - update from analyzer
            switcherType: 'select', // 'select' | 'tabs' | 'buttons'
            // Fallback selectors for card switcher
            switcherFallbacks: [
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

    /**
     * Update progress UI with current status and percentage
     * @param {string} message - Status message to display
     * @param {number} percentage - Progress percentage (0-100)
     */
    function updateProgress(message, percentage) {
        // This is a placeholder function that will be implemented in the UI section
        // For now, just log the progress
        log(`Progress: ${percentage.toFixed(1)}% - ${message}`);
        
        // TODO: Update actual UI elements when UI is implemented
        // - Update status message text in progress panel
        // - Update progress bar width based on percentage
        // - Update percentage display text
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
            } else {
                // Fallback: use alert
                alert(message);
            }
        }
    }

    // ============================================================================
    // UI COMPONENTS
    // ============================================================================

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

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
        updateProgress,
        showCompletionNotification,
        getState,
        setState,
        resetState,
        getResultsSummary
    };

    console.log('[Amex Automation] Script loaded - v1.0.0');
    console.log('[Amex Automation] Functions exposed to window.AmexAutomation');

})();
