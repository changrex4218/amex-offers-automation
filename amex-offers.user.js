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

    // ============================================================================
    // ACTION FUNCTIONS
    // ============================================================================

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
