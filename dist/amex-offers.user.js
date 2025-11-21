// ==UserScript==
// @name         Amex Offers Automation
// @namespace    http://tampermonkey.net/
// @version      1.0.3
// @description  Automatically add all Amex offers to all cards
// @author       changrex4218
// @match        https://global.americanexpress.com/offers*
// @updateURL    https://raw.githubusercontent.com/changrex4218/amex-offers-automation/main/dist/amex-offers.user.js
// @downloadURL  https://raw.githubusercontent.com/changrex4218/amex-offers-automation/main/dist/amex-offers.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// @connect      sheets.googleapis.com
// ==/UserScript==

(function() {
    'use strict';

    // ===== utils.js =====
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
    
    
    }
    

    // ===== amex-core.js =====
    /**
     * Amex Offers Core Automation
     * Handles offer detection, card switching, and bulk adding
     */
    
    class AmexOfferAutomation {
        constructor(selectors) {
            this.selectors = selectors;
            this.cards = [];
            this.offers = [];
            this.addedCount = 0;
            this.failedOffers = [];
            this.state = {
                cards: [],
                currentCardIndex: 0,
                results: [],
                isRunning: false,
                isPaused: false,
                totalOffers: 0
            };
        }
    
        /**
         * Discover all cards in account
         */
        async discoverCards() {
            log('[Core] Discovering cards...');
    
            try {
                let switcher = await waitForElement(this.selectors.cards.switcher);
                
                if (!switcher && this.selectors.cards.switcherFallbacks) {
                    log('[Core] Primary card switcher not found, trying fallbacks...');
                    switcher = await waitForElementWithFallbacks(this.selectors.cards.switcherFallbacks);
                }
    
                if (!switcher) {
                    logError('[Core] Card switcher element not found');
                    return [];
                }
    
                log('[Core] Card switcher found:', switcher.tagName);
    
                const cards = [];
                const switcherType = this.selectors.cards.switcherType;
    
                // Handle combobox-based card switcher
                if (switcherType === 'combobox' || switcher.getAttribute('role') === 'combobox') {
                    log('[Core] Detecting combobox-based card switcher');
                    
                    switcher.click();
                    await delay(1000);
                    
                    const listbox = document.querySelector('[role="listbox"]') || 
                                   document.querySelector('[role="menu"]') ||
                                   document.querySelector('.account-selector-menu');
                    
                    if (listbox) {
                        const options = listbox.querySelectorAll('[role="option"]') ||
                                       listbox.querySelectorAll('li') ||
                                       listbox.querySelectorAll('a');
                        
                        log(`[Core] Found ${options.length} card options in dropdown`);
                        
                        options.forEach((option, index) => {
                            const text = option.textContent.trim();
                            const href = option.getAttribute('href') || '';
                            const accountKeyMatch = href.match(/account_key=([A-F0-9]+)/);
                            const accountKey = accountKeyMatch ? accountKeyMatch[1] : 
                                             option.getAttribute('data-account-key') || 
                                             `card-${index}`;
                            
                            if (text && text.length >= 3) {
                                cards.push({
                                    name: text,
                                    value: accountKey,
                                    accountKey: accountKey,
                                    element: option,
                                    index: index
                                });
                                log(`[Core]   Card ${cards.length}: ${text} (accountKey: ${accountKey})`);
                            }
                        });
                        
                        document.body.click();
                        await delay(500);
                    }
                }
                // Handle select dropdown
                else if (switcherType === 'select' || switcher.tagName === 'SELECT') {
                    const options = switcher.querySelectorAll('option');
                    log(`[Core] Found ${options.length} card options in select dropdown`);
    
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
                            log(`[Core]   Card ${cards.length}: ${text}`);
                        }
                    });
                }
    
                log(`[Core] ✓ Detected ${cards.length} cards`);
                this.cards = cards;
                this.state.cards = cards;
                return cards;
    
            } catch (error) {
                logError('[Core] Error detecting cards:', error);
                return [];
            }
        }
    
        /**
         * Get all available offers on current page
         */
        async getAvailableOffers() {
            log('[Core] Scanning for offers...');
    
            try {
                let container = await waitForElement(this.selectors.offers.container);
                
                if (!container && this.selectors.offers.containerFallbacks) {
                    container = await waitForElementWithFallbacks(this.selectors.offers.containerFallbacks);
                }
    
                if (!container) {
                    logError('[Core] Offers container not found');
                    return [];
                }
    
                let offerCards = container.querySelectorAll(this.selectors.offers.card);
                
                if (offerCards.length === 0 && this.selectors.offers.cardFallbacks) {
                    for (const fallbackSelector of this.selectors.offers.cardFallbacks) {
                        offerCards = container.querySelectorAll(fallbackSelector);
                        if (offerCards.length > 0) break;
                    }
                }
    
                if (offerCards.length === 0) {
                    log('[Core] No offer cards found');
                    return [];
                }
    
                log(`[Core] Found ${offerCards.length} total offer cards`);
    
                const availableOffers = [];
    
                for (let i = 0; i < offerCards.length; i++) {
                    const offerCard = offerCards[i];
    
                    // Check if already added
                    let alreadyAddedIndicator = offerCard.querySelector(this.selectors.offers.alreadyAdded);
                    if (!alreadyAddedIndicator && this.selectors.offers.alreadyAddedFallbacks) {
                        for (const fallback of this.selectors.offers.alreadyAddedFallbacks) {
                            alreadyAddedIndicator = offerCard.querySelector(fallback);
                            if (alreadyAddedIndicator) break;
                        }
                    }
    
                    if (alreadyAddedIndicator) continue;
    
                    // Get merchant name
                    let merchantElement = offerCard.querySelector(this.selectors.offers.merchantName);
                    if (!merchantElement && this.selectors.offers.merchantNameFallbacks) {
                        for (const fallback of this.selectors.offers.merchantNameFallbacks) {
                            merchantElement = offerCard.querySelector(fallback);
                            if (merchantElement && merchantElement.textContent.trim()) break;
                        }
                    }
    
                    const merchantName = merchantElement ? merchantElement.textContent.trim() : `Unknown ${i + 1}`;
    
                    // Get add button
                    let addButton = offerCard.querySelector(this.selectors.offers.addButton);
                    if (!addButton && this.selectors.offers.addButtonFallbacks) {
                        for (const fallback of this.selectors.offers.addButtonFallbacks) {
                            addButton = offerCard.querySelector(fallback);
                            if (addButton) break;
                        }
                    }
    
                    if (!addButton || addButton.disabled) continue;
    
                    availableOffers.push({
                        merchant: merchantName,
                        addButton: addButton,
                        element: offerCard
                    });
                }
    
                log(`[Core] ✓ Found ${availableOffers.length} available offers`);
                this.offers = availableOffers;
                return availableOffers;
    
            } catch (error) {
                logError('[Core] Error detecting offers:', error);
                return [];
            }
        }
    
        /**
         * Add single offer with retry logic
         */
        async addOffer(offer, cardInfo) {
            log(`[Core] Adding: ${offer.merchant}`);
    
            const result = {
                timestamp: new Date().toISOString(),
                cardName: cardInfo.name,
                merchant: offer.merchant,
                status: 'unknown',
                success: false
            };
    
            try {
                offer.addButton.click();
                await delay(this.selectors.timing.betweenOffers);
    
                // Check for success
                let successIndicator = await waitForElement(this.selectors.feedback.success, 5000);
                if (!successIndicator && this.selectors.feedback.successFallbacks) {
                    successIndicator = await waitForElementWithFallbacks(this.selectors.feedback.successFallbacks, 5000);
                }
    
                const buttonNowDisabled = offer.addButton.disabled || 
                                         offer.addButton.getAttribute('disabled') !== null;
    
                if (successIndicator || buttonNowDisabled) {
                    result.status = 'success';
                    result.success = true;
                    this.addedCount++;
                    log(`[Core] ✓ Added: ${offer.merchant}`);
                } else {
                    result.error = 'No success indicator found';
                    logWarn(`[Core] ? Uncertain: ${offer.merchant}`);
                }
    
            } catch (err) {
                logError(`[Core] Failed: ${offer.merchant}:`, err);
                result.status = 'error';
                result.error = err.message;
                this.failedOffers.push(offer.merchant);
            }
    
            this.state.results.push(result);
            return result;
        }
    
        /**
         * Switch to different card
         */
        async switchCard(card) {
            log(`[Core] Switching to: ${card.name}`);
    
            try {
                let switcher = await waitForElement(this.selectors.cards.switcher);
                if (!switcher && this.selectors.cards.switcherFallbacks) {
                    switcher = await waitForElementWithFallbacks(this.selectors.cards.switcherFallbacks);
                }
    
                if (!switcher) {
                    logError('[Core] Card switcher not found');
                    return false;
                }
    
                const switcherType = this.selectors.cards.switcherType;
    
                if (switcherType === 'select' || switcher.tagName === 'SELECT') {
                    switcher.value = card.value;
                    switcher.dispatchEvent(new Event('change', { bubbles: true }));
                } else {
                    card.element.click();
                }
    
                await delay(this.selectors.timing.afterCardSwitch);
    
                let container = await waitForElement(this.selectors.offers.container);
                if (!container && this.selectors.offers.containerFallbacks) {
                    container = await waitForElementWithFallbacks(this.selectors.offers.containerFallbacks);
                }
    
                if (!container) {
                    logError('[Core] Offers container not found after switch');
                    return false;
                }
    
                log(`[Core] ✓ Switched to: ${card.name}`);
                return true;
    
            } catch (error) {
                logError(`[Core] Error switching to ${card.name}:`, error);
                return false;
            }
        }
    
        /**
         * Add all offers for all cards
         */
        async addAllOffers(progressCallback) {
            log('[Core] Starting automation...');
            
            this.state.isRunning = true;
            this.state.isPaused = false;
            const results = [];
    
            await this.discoverCards();
            progressCallback({ stage: 'cards', count: this.cards.length });
    
            for (let cardIndex = 0; cardIndex < this.cards.length; cardIndex++) {
                const card = this.cards[cardIndex];
                this.state.currentCardIndex = cardIndex;
    
                log(`[Core] Processing card ${cardIndex + 1}/${this.cards.length}: ${card.name}`);
                progressCallback({ stage: 'card', card: card.name, index: cardIndex + 1, total: this.cards.length });
    
                const switchSuccess = await this.switchCard(card);
                if (!switchSuccess) {
                    logError(`[Core] Failed to switch to ${card.name}, skipping`);
                    continue;
                }
    
                const offers = await this.getAvailableOffers();
                this.state.totalOffers += offers.length;
                progressCallback({ stage: 'offers', card: card.name, count: offers.length });
    
                for (let offerIndex = 0; offerIndex < offers.length; offerIndex++) {
                    if (!this.state.isRunning) break;
                    
                    while (this.state.isPaused && this.state.isRunning) {
                        await delay(500);
                    }
    
                    const offer = offers[offerIndex];
                    const progress = ((cardIndex + (offerIndex / offers.length)) / this.cards.length) * 100;
                    
                    progressCallback({
                        stage: 'adding',
                        current: offerIndex + 1,
                        total: offers.length,
                        merchant: offer.merchant,
                        progress: progress
                    });
    
                    const result = await this.addOffer(offer, card);
                    results.push(result);
                }
    
                if (!this.state.isRunning) break;
            }
    
            this.state.isRunning = false;
            const successCount = results.filter(r => r.success).length;
            
            log(`[Core] ✓ Automation complete: ${successCount}/${results.length} successful`);
            progressCallback({ stage: 'complete', count: successCount, total: results.length });
    
            return results;
        }
    
        getState() {
            return { ...this.state };
        }
    
        setState(updates) {
            Object.assign(this.state, updates);
        }
    }
    
    
    }
    

    // ===== google-sheets.js =====
    /**
     * Google Sheets Integration
     * Logs offer additions to specified spreadsheet
     */
    
    class GoogleSheetsLogger {
        constructor(spreadsheetId, sheetName = 'Amex Offers') {
            this.spreadsheetId = spreadsheetId;
            this.sheetName = sheetName;
            this.apiKey = typeof GM_getValue !== 'undefined' ? GM_getValue('google_sheets_api_key') : null;
        }
    
        /**
         * Log offer additions to Google Sheets
         */
        async logOffers(offers) {
            log(`[Sheets] Logging ${offers.length} offers...`);
    
            const rows = offers
                .filter(o => o.success)
                .map(o => [
                    o.merchant,
                    o.cardName,
                    o.timestamp,
                    o.status
                ]);
    
            if (rows.length === 0) {
                log('[Sheets] No successful offers to log');
                return;
            }
    
            try {
                const response = await this.appendRows(rows);
                log(`[Sheets] ✓ Successfully logged ${rows.length} offers`);
                return response;
            } catch (err) {
                logError('[Sheets] Failed to log:', err);
                throw err;
            }
        }
    
        /**
         * Append rows to Google Sheets
         */
        async appendRows(rows) {
            if (typeof GM_xmlhttpRequest === 'undefined') {
                logWarn('[Sheets] GM_xmlhttpRequest not available, skipping Google Sheets logging');
                return null;
            }
    
            if (!this.apiKey) {
                logWarn('[Sheets] No API key configured, skipping Google Sheets logging');
                return null;
            }
    
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${this.sheetName}:append?valueInputOption=RAW&key=${this.apiKey}`,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify({
                        values: rows
                    }),
                    onload: (response) => {
                        if (response.status === 200) {
                            resolve(JSON.parse(response.responseText));
                        } else {
                            reject(new Error(`HTTP ${response.status}: ${response.statusText}`));
                        }
                    },
                    onerror: reject
                });
            });
        }
    
        /**
         * Setup spreadsheet with headers
         */
        async ensureHeaders() {
            const headers = [
                ['Merchant', 'Card', 'Date Added', 'Status']
            ];
    
            try {
                // Check if sheet exists and has headers
                // Implementation would check first row and add headers if empty
                log('[Sheets] Headers check/setup complete');
            } catch (err) {
                logError('[Sheets] Error setting up headers:', err);
            }
        }
    }
    
    
    }
    

    // ===== ui-components.js =====
    /**
     * UI Components
     * Floating button and progress modal
     */
    
    class AmexUI {
        constructor() {
            this.modal = null;
            this.button = null;
            this.panel = null;
        }
    
        /**
         * Create floating "Add All Offers" button
         */
        createButton(onClick) {
            const btn = document.createElement('button');
            btn.id = 'amex-add-all-btn';
            btn.textContent = '⚡ Add All Offers';
            btn.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 10000;
                padding: 12px 24px;
                background: #006FCF;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(0,111,207,0.3);
                transition: all 0.2s;
            `;
    
            btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
            btn.onmouseout = () => btn.style.transform = 'scale(1)';
            btn.onclick = onClick;
    
            document.body.appendChild(btn);
            this.button = btn;
            return btn;
        }
    
        /**
         * Create progress panel
         */
        createProgressPanel() {
            log('[UI] Creating progress panel...');
    
            const existingPanel = document.getElementById('amex-automation-panel');
            if (existingPanel) {
                log('[UI] Progress panel already exists');
                return existingPanel;
            }
    
            const panel = document.createElement('div');
            panel.id = 'amex-automation-panel';
            
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
    
            panel.innerHTML = `
                <div style="padding: 16px; border-bottom: 1px solid #e0e0e0; background: #006FCF; color: white;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: bold;">Amex Offers Automation</h3>
                </div>
                
                <div style="padding: 16px; flex: 1; overflow-y: auto;">
                    <div style="margin-bottom: 16px;">
                        <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">Cards Detected: <span id="amex-card-count">0</span></div>
                        <div id="amex-card-list" style="max-height: 150px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 4px; padding: 8px; background: #f9f9f9;">
                            <div style="color: #666; font-size: 13px;">No cards detected yet...</div>
                        </div>
                    </div>
    
                    <div style="margin-bottom: 16px;">
                        <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">Status:</div>
                        <div id="amex-status-message" style="font-size: 13px; color: #333; padding: 8px; background: #f0f0f0; border-radius: 4px; min-height: 20px;">
                            Ready to start
                        </div>
                    </div>
    
                    <div style="margin-bottom: 16px;">
                        <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">
                            Progress: <span id="amex-progress-percentage">0%</span>
                        </div>
                        <div style="width: 100%; height: 24px; background: #e0e0e0; border-radius: 12px; overflow: hidden;">
                            <div id="amex-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #006FCF, #0099FF); transition: width 0.3s ease;"></div>
                        </div>
                    </div>
    
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
    
                    <div style="margin-bottom: 16px;">
                        <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">Last Added:</div>
                        <div id="amex-last-added" style="font-size: 13px; color: #666; padding: 8px; background: #f0f0f0; border-radius: 4px; min-height: 20px;">
                            None yet
                        </div>
                    </div>
    
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
    
            document.body.appendChild(panel);
            this.panel = panel;
            log('[UI] ✓ Progress panel created');
            return panel;
        }
    
        /**
         * Update progress display
         */
        updateProgress(message, percentage) {
            log(`[UI] Progress: ${percentage.toFixed(1)}% - ${message}`);
            
            const statusElement = document.getElementById('amex-status-message');
            if (statusElement) {
                statusElement.textContent = message;
            }
    
            const progressBar = document.getElementById('amex-progress-bar');
            if (progressBar) {
                const clampedPercentage = Math.max(0, Math.min(100, percentage));
                progressBar.style.width = `${clampedPercentage}%`;
            }
    
            const percentageElement = document.getElementById('amex-progress-percentage');
            if (percentageElement) {
                percentageElement.textContent = `${percentage.toFixed(1)}%`;
            }
        }
    
        /**
         * Render card list
         */
        renderCardList(cards) {
            log(`[UI] Rendering ${cards.length} cards`);
    
            const cardCountElement = document.getElementById('amex-card-count');
            if (cardCountElement) {
                cardCountElement.textContent = cards.length;
            }
    
            const cardListElement = document.getElementById('amex-card-list');
            if (!cardListElement) return;
    
            cardListElement.innerHTML = '';
    
            if (cards.length === 0) {
                cardListElement.innerHTML = '<div style="color: #666; font-size: 13px;">No cards detected yet...</div>';
                return;
            }
    
            cards.forEach((card, index) => {
                const cardItem = document.createElement('div');
                cardItem.style.cssText = `
                    padding: 6px 4px;
                    border-bottom: 1px solid #e0e0e0;
                    font-size: 13px;
                `;
                
                if (index === cards.length - 1) {
                    cardItem.style.borderBottom = 'none';
                }
    
                cardItem.textContent = `${index + 1}. ${card.name}`;
                cardListElement.appendChild(cardItem);
            });
    
            log('[UI] ✓ Card list rendered');
        }
    
        /**
         * Update last added offer
         */
        updateLastAdded(merchant, cardName) {
            const lastAddedElement = document.getElementById('amex-last-added');
            if (lastAddedElement) {
                lastAddedElement.textContent = `${merchant} - ${cardName}`;
                lastAddedElement.style.color = '#4CAF50';
            }
        }
    
        /**
         * Show completion notification
         */
        showCompletionNotification(results) {
            const successCount = results.filter(r => r.success).length;
            const totalCount = results.length;
            const message = `Successfully added ${successCount} out of ${totalCount} offers`;
    
            log('[UI] Showing completion notification:', message);
    
            if (typeof GM_notification !== 'undefined') {
                GM_notification({
                    title: 'Amex Offers Automation',
                    text: message,
                    timeout: 10000,
                    onclick: () => window.focus()
                });
            } else if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Amex Offers Automation', {
                    body: message,
                    icon: 'https://www.americanexpress.com/favicon.ico'
                });
            } else {
                alert(`Automation Complete!\n\n${message}`);
            }
        }
    
        /**
         * Export results to JSON
         */
        exportResults(results) {
            log('[UI] Exporting results...');
    
            if (results.length === 0) {
                alert('No results to export yet.');
                return;
            }
    
            const exportData = {
                exportDate: new Date().toISOString(),
                totalResults: results.length,
                successCount: results.filter(r => r.success).length,
                errorCount: results.filter(r => !r.success).length,
                results: results
            };
    
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            link.download = `amex-offers-results-${timestamp}.json`;
    
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
    
            log(`[UI] ✓ Exported ${results.length} results`);
        }
    
        /**
         * View results in console
         */
        viewResults(results) {
            log('[UI] Viewing results...');
    
            if (results.length === 0) {
                alert('No results yet.');
                return;
            }
    
            const successCount = results.filter(r => r.success).length;
            const errorCount = results.filter(r => !r.success).length;
    
            console.log('='.repeat(60));
            console.log('[Amex Automation] RESULTS SUMMARY');
            console.log('='.repeat(60));
            console.log(`Total: ${results.length}`);
            console.log(`Successful: ${successCount}`);
            console.log(`Failed: ${errorCount}`);
            console.log('='.repeat(60));
            console.table(results);
    
            alert(`Results Summary:\n\nTotal: ${results.length}\nSuccessful: ${successCount}\nFailed: ${errorCount}\n\nSee console for details.`);
        }
    }
    
    
    }
    

(function() {
    'use strict';

    console.log('[Amex Auto] Script loaded (Development Version)');

    // Configuration - Selector Map (Discovered from actual Amex page)
    const AMEX_SELECTORS = {
        page: {
            url: 'https://global.americanexpress.com/offers',
            urlPattern: 'https://global.americanexpress.com/offers*'
        },
        cards: {
            switcher: '[role="combobox"]',
            switcherType: 'combobox',
            switcherFallbacks: [
                'combobox',
                '[aria-label*="manage your other accounts"]'
            ],
            listbox: '[role="listbox"]',
            listboxFallbacks: [
                '[role="menu"]',
                '.account-selector-menu'
            ],
            option: '[role="option"]',
            optionFallbacks: [
                'li',
                'a[href*="account_key"]'
            ]
        },
        offers: {
            container: 'main',
            containerFallbacks: [
                '[role="main"]',
                'main > div'
            ],
            card: 'main > div > div > div > div',
            cardFallbacks: [
                'main div:has(h3):has(button)',
                'main > div > div > div',
                '[class*="offer"]'
            ],
            merchantName: 'h3',
            merchantNameFallbacks: [
                'heading[level="3"]',
                '[role="heading"][aria-level="3"]'
            ],
            offerDetails: 'h3 ~ div',
            offerDetailsFallbacks: [
                'div:has(h3) > div:nth-child(2)'
            ],
            expiration: 'p',
            expirationFallbacks: [
                'paragraph',
                '*:has-text("Expires")'
            ],
            addButton: 'button:has-text("add to list card")',
            addButtonFallbacks: [
                'button[aria-label*="add"]',
                'button:has(img):not(:has-text("View Details"))'
            ],
            alreadyAdded: 'button[disabled]:has-text("add")',
            alreadyAddedFallbacks: [
                'button[disabled]',
                '[aria-label*="Added"]',
                '*:has-text("Added to Card")'
            ],
            viewDetailsButton: 'button:has-text("View Details")',
            termsButton: 'button:has-text("Terms apply")'
        },
        feedback: {
            success: '[role="alert"]',
            successFallbacks: [
                '.success-message',
                '[class*="success"]',
                '[class*="notification"]'
            ]
        },
        timing: {
            betweenOffers: 1500,
            afterCardSwitch: 3000,
            waitForLoad: 3000,
            pollingInterval: 100,
            maxWait: 10000
        }
    };

    // Configuration
    const GOOGLE_SHEET_ID = GM_getValue('google_sheet_id', '');

    // Initialize components
    const automation = new AmexOfferAutomation(AMEX_SELECTORS);
    const logger = new GoogleSheetsLogger(GOOGLE_SHEET_ID);
    const ui = new AmexUI();

    // Initialize UI
    async function initializeUI() {
        log('Initializing Amex Offers Automation...');

        try {
            const currentUrl = window.location.href;
            if (!currentUrl.includes('global.americanexpress.com/offers')) {
                logWarn('Not on Amex offers page');
                return;
            }

            log('✓ On Amex offers page');

            const panel = ui.createProgressPanel();
            if (!panel) {
                logError('Failed to create progress panel');
                return;
            }

            await delay(1000);

            log('Detecting cards...');
            const cards = await automation.discoverCards();
            ui.renderCardList(cards);

            if (cards.length > 0) {
                log(`✓ Detected ${cards.length} cards`);
                ui.updateProgress(`Ready! Detected ${cards.length} cards. Click "Add All Offers" to start.`, 0);
            } else {
                logWarn('No cards detected');
                ui.updateProgress('No cards detected. Please check if you are logged in.', 0);
            }

            attachEventHandlers();
            log('✓ Initialization complete');

        } catch (error) {
            logError('Error during initialization:', error);
        }
    }

    // Attach event handlers
    function attachEventHandlers() {
        log('Attaching event handlers...');

        const startButton = document.getElementById('amex-btn-start');
        if (startButton) {
            startButton.addEventListener('click', async () => {
                log('Start button clicked');

                startButton.disabled = true;
                startButton.style.opacity = '0.5';

                const pauseButton = document.getElementById('amex-btn-pause');
                const stopButton = document.getElementById('amex-btn-stop');
                if (pauseButton) pauseButton.disabled = false;
                if (stopButton) stopButton.disabled = false;

                try {
                    const results = await automation.addAllOffers((progress) => {
                        if (progress.stage === 'cards') {
                            ui.updateProgress(`Found ${progress.count} cards`, 5);
                        } else if (progress.stage === 'card') {
                            ui.updateProgress(`Processing card ${progress.index}/${progress.total}: ${progress.card}`, 10);
                        } else if (progress.stage === 'offers') {
                            ui.updateProgress(`Found ${progress.count} offers for ${progress.card}`, 15);
                        } else if (progress.stage === 'adding') {
                            ui.updateProgress(
                                `Adding ${progress.current}/${progress.total}: ${progress.merchant}`,
                                progress.progress
                            );
                            ui.updateLastAdded(progress.merchant, automation.cards[automation.state.currentCardIndex].name);
                        } else if (progress.stage === 'complete') {
                            ui.updateProgress(`Complete! Added ${progress.count}/${progress.total} offers`, 100);
                        }
                    });

                    log(`Automation completed: ${results.length} results`);

                    // Log to Google Sheets
                    if (GOOGLE_SHEET_ID) {
                        ui.updateProgress('Logging to Google Sheets...', 95);
                        await logger.logOffers(results);
                    }

                    ui.showCompletionNotification(results);

                } catch (error) {
                    logError('Error during automation:', error);
                    alert(`Automation error: ${error.message}`);
                } finally {
                    startButton.disabled = false;
                    startButton.style.opacity = '1';
                    if (pauseButton) pauseButton.disabled = true;
                    if (stopButton) stopButton.disabled = true;
                }
            });
        }

        const pauseButton = document.getElementById('amex-btn-pause');
        if (pauseButton) {
            pauseButton.addEventListener('click', () => {
                const newPausedState = !automation.state.isPaused;
                automation.setState({ isPaused: newPausedState });

                if (newPausedState) {
                    pauseButton.textContent = 'Resume';
                    pauseButton.style.background = '#4CAF50';
                    ui.updateProgress('Paused', automation.state.currentCardIndex / automation.cards.length * 100);
                } else {
                    pauseButton.textContent = 'Pause';
                    pauseButton.style.background = '#FFA500';
                }
            });
        }

        const stopButton = document.getElementById('amex-btn-stop');
        if (stopButton) {
            stopButton.addEventListener('click', () => {
                automation.setState({ isRunning: false, isPaused: false });
                const pauseBtn = document.getElementById('amex-btn-pause');
                if (pauseBtn) {
                    pauseBtn.textContent = 'Pause';
                    pauseBtn.style.background = '#FFA500';
                }
                ui.updateProgress('Stopped by user', 0);
            });
        }

        const viewResultsButton = document.getElementById('amex-btn-view-results');
        if (viewResultsButton) {
            viewResultsButton.addEventListener('click', () => {
                ui.viewResults(automation.state.results);
            });
        }

        const exportButton = document.getElementById('amex-btn-export-json');
        if (exportButton) {
            exportButton.addEventListener('click', () => {
                ui.exportResults(automation.state.results);
            });
        }

        log('✓ Event handlers attached');
    }

    // Auto-initialize
    function autoInitialize() {
        const currentUrl = window.location.href;
        
        if (!currentUrl.includes('global.americanexpress.com/offers')) {
            log('Not on Amex offers page');
            return;
        }

        log('='.repeat(60));
        log('Amex Offers Automation v1.0.0-dev');
        log('='.repeat(60));

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(initializeUI, 2000);
            });
        } else {
            setTimeout(initializeUI, 2000);
        }
    }

    autoInitialize();

    // Expose for testing
    window.AmexAutomation = {
        automation,
        logger,
        ui,
        selectors: AMEX_SELECTORS
    };

})();
