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


