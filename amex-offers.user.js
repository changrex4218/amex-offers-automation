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

    // ============================================================================
    // ORCHESTRATION
    // ============================================================================

    // ============================================================================
    // UI COMPONENTS
    // ============================================================================

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    console.log('[Amex Automation] Script loaded - v1.0.0');

})();
