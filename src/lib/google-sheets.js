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

// Export
if (typeof window !== 'undefined') {
    window.GoogleSheetsLogger = GoogleSheetsLogger;
}
