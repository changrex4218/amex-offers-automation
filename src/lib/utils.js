/**
 * Utility Functions
 * Common helper functions used throughout the automation
 */

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

/**
 * Wait for an element to appear in the DOM
 * @param {string} selector - CSS selector to wait for
 * @param {number} timeout - Maximum time to wait in milliseconds
 * @returns {Promise<HTMLElement|null>} The element if found, null if timeout
 */
async function waitForElement(selector, timeout = 10000) {
    const startTime = Date.now();
    const pollingInterval = 100;

    while (Date.now() - startTime < timeout) {
        const element = document.querySelector(selector);
        if (element) {
            log(`Element found: ${selector}`);
            return element;
        }
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
async function waitForElementWithFallbacks(selectors, timeout = 10000) {
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

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AmexUtils = {
        delay,
        log,
        logError,
        logWarn,
        waitForElement,
        waitForElementWithFallbacks,
        safeExecute
    };
}
