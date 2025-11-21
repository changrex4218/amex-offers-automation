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

// Export for @require usage (local development)
if (typeof window !== 'undefined') {
    window.AmexOfferAutomation = AmexOfferAutomation;
}

// Export
if (typeof window !== 'undefined') {
    window.AmexOfferAutomation = AmexOfferAutomation;
}
