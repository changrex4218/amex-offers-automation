// ==UserScript==
// @name         Amex Offers Automation (Dev)
// @namespace    http://tampermonkey.net/
// @version      1.0.0-dev
// @description  Automatically add all Amex offers to all cards (Development Version)
// @author       changrex4218
// @match        https://global.americanexpress.com/offers*
// @require      file:///C:/Users/weiwe/Projects/tempmonkey script to add and store all amex offers/src/lib/utils.js
// @require      file:///C:/Users/weiwe/Projects/tempmonkey script to add and store all amex offers/src/lib/amex-core.js
// @require      file:///C:/Users/weiwe/Projects/tempmonkey script to add and store all amex offers/src/lib/google-sheets.js
// @require      file:///C:/Users/weiwe/Projects/tempmonkey script to add and store all amex offers/src/lib/ui-components.js
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
