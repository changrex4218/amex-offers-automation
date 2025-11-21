# Test Plan: Offer Addition Logic (Task 6)

## Implementation Summary

Task 6 has been completed with the following implementation:

### Function: `addOfferToCard(offer, card)`

**Location:** `amex-offers.user.js` (ACTION FUNCTIONS section)

**Features Implemented:**

1. **Input Validation**
   - Validates offer object has addButton property
   - Validates card object has name property
   - Checks if add button is disabled before attempting click

2. **Offer Addition Flow**
   - Clicks the offer's add button element
   - Waits for `AMEX_SELECTORS.timing.betweenOffers` delay (1500ms)
   - Checks for success indicator using primary and fallback selectors

3. **Multiple Success Detection Methods**
   - Primary: Success notification element
   - Fallback 1: Add button becomes disabled
   - Fallback 2: "Already added" indicator appears on offer card

4. **Result Object Creation**
   - timestamp: ISO 8601 format
   - cardName: Name of the card
   - merchant: Merchant name from offer
   - status: 'success', 'error', or 'unknown'
   - success: boolean flag
   - error: Error message (if applicable)

5. **Error Handling (Task 6.2)**
   - Wrapped in try-catch block
   - Catches and logs all errors
   - Creates error result object with error message
   - Ensures automation continues after errors
   - Calls `addResult()` to log result to state

6. **Logging**
   - Logs successful additions with ✓ symbol
   - Logs errors with ✗ symbol
   - Logs warnings for uncertain status

## Validation Approach

### Script Loading Verification ✓

**Test:** Navigate to Amex offers page and check console
**Result:** PASSED
- Console shows: `[Amex Automation] Script loaded - v1.0.0`
- Console shows: `[Amex Automation] Functions exposed to window.AmexAutomation`
- Script is injected by Tampermonkey successfully

### Function Availability ✓

**Test:** Verify `addOfferToCard` is exposed in `window.AmexAutomation`
**Result:** PASSED
- Function added to global export object
- Available for testing via `window.AmexAutomation.addOfferToCard()`

## Manual Testing Required

Due to authentication requirements, the following tests require manual execution by the user:

### Test 1: Successful Offer Addition

**Prerequisites:**
1. User must be logged into Amex account
2. Navigate to https://global.americanexpress.com/offers
3. Ensure there are available offers to add

**Test Steps:**
```javascript
// In browser console after logging in:

// 1. Detect offers
const offers = await window.AmexAutomation.detectOffersForCurrentCard();
console.log('Available offers:', offers.length);

// 2. Detect cards
const cards = await window.AmexAutomation.detectAllCards();
console.log('Available cards:', cards.length);

// 3. Add first offer to first card
const result = await window.AmexAutomation.addOfferToCard(offers[0], cards[0]);
console.log('Result:', result);

// 4. Verify result object
console.assert(result.timestamp, 'Result should have timestamp');
console.assert(result.cardName === cards[0].name, 'Result should have correct card name');
console.assert(result.merchant === offers[0].merchant, 'Result should have correct merchant');
console.assert(result.status === 'success' || result.status === 'error', 'Result should have valid status');
console.assert(typeof result.success === 'boolean', 'Result should have success boolean');
```

**Expected Results:**
- Result object is returned with all required fields
- Console shows: `[Amex Automation] ✓ Added: [Merchant] to [Card]`
- Offer is added to the card (verify in UI)
- Result is added to state.results array

### Test 2: Error Handling with Invalid Offer

**Test Steps:**
```javascript
// In browser console after logging in:

// 1. Create invalid offer object (missing addButton)
const invalidOffer = {
    merchant: 'Test Merchant',
    element: document.createElement('div')
};

const cards = await window.AmexAutomation.detectAllCards();

// 2. Try to add invalid offer
const result = await window.AmexAutomation.addOfferToCard(invalidOffer, cards[0]);
console.log('Error result:', result);

// 3. Verify error handling
console.assert(result.status === 'error', 'Result should have error status');
console.assert(result.success === false, 'Result should have success = false');
console.assert(result.error, 'Result should have error message');
console.assert(result.error.includes('addButton'), 'Error should mention missing addButton');
```

**Expected Results:**
- Function catches error and doesn't throw
- Console shows: `[Amex Automation] ✗ Failed: Test Merchant to [Card] - Invalid offer object: missing addButton`
- Result object has status='error' and success=false
- Error message is descriptive
- Automation continues (doesn't crash)

### Test 3: Error Handling with Disabled Button

**Test Steps:**
```javascript
// In browser console after logging in:

// 1. Detect offers
const offers = await window.AmexAutomation.detectOffersForCurrentCard();

// 2. Manually disable the first offer's button
offers[0].addButton.disabled = true;

const cards = await window.AmexAutomation.detectAllCards();

// 3. Try to add offer with disabled button
const result = await window.AmexAutomation.addOfferToCard(offers[0], cards[0]);
console.log('Disabled button result:', result);

// 4. Verify error handling
console.assert(result.status === 'error', 'Result should have error status');
console.assert(result.error.includes('disabled'), 'Error should mention disabled button');
```

**Expected Results:**
- Function detects disabled button before clicking
- Error is caught and logged
- Result object has status='error'
- Automation continues

### Test 4: API Call Monitoring

**Test Steps:**
```javascript
// In browser console after logging in:

// 1. Set up network monitoring
const apiCalls = [];
const originalFetch = window.fetch;
window.fetch = function(...args) {
    apiCalls.push({ url: args[0], timestamp: new Date().toISOString() });
    return originalFetch.apply(this, args);
};

// 2. Add an offer
const offers = await window.AmexAutomation.detectOffersForCurrentCard();
const cards = await window.AmexAutomation.detectAllCards();
const result = await window.AmexAutomation.addOfferToCard(offers[0], cards[0]);

// 3. Check API calls
console.log('API calls made:', apiCalls);
console.log('Offer addition result:', result);

// 4. Restore original fetch
window.fetch = originalFetch;
```

**Expected Results:**
- API calls are made when offer is added
- Timing delay (1500ms) is respected
- Result reflects API call success/failure

## Requirements Coverage

### Requirement 7.1 ✓
"WHEN adding an offer, THE Tampermonkey Script SHALL invoke the click method on the Add Button element"
- **Implemented:** Line calls `offer.addButton.click()`

### Requirement 7.2 ✓
"WHEN the Add Button is clicked, THE Tampermonkey Script SHALL wait for the recommended delay period"
- **Implemented:** Waits for `AMEX_SELECTORS.timing.betweenOffers` (1500ms)

### Requirement 7.3 ✓
"WHEN the delay completes, THE Tampermonkey Script SHALL check for the success indicator element"
- **Implemented:** Checks primary and fallback success indicators

### Requirement 7.4 ✓
"WHEN a success indicator is found, THE Tampermonkey Script SHALL record the result with status 'success'"
- **Implemented:** Sets `result.status = 'success'` and `result.success = true`

### Requirement 7.5 ✓
"IF an error occurs during addition, THE Tampermonkey Script SHALL catch the error and record the result with status 'error'"
- **Implemented:** Try-catch block catches errors, sets status='error'

### Requirement 7.6 ✓
"WHEN recording results, THE Tampermonkey Script SHALL capture timestamp, card name, merchant name, and status"
- **Implemented:** Result object includes all required fields

### Requirement 7.7 ✓
"WHEN an offer is added successfully, THE Tampermonkey Script SHALL log the merchant name to the console"
- **Implemented:** Logs with `log(\`✓ Successfully added: ${offer.merchant} to ${card.name}\`)`

### Requirement 11.1 ✓
"WHEN an error occurs during offer addition, THE Tampermonkey Script SHALL catch the error and continue to the next offer"
- **Implemented:** Try-catch ensures function returns result object, doesn't throw

### Requirement 11.2 ✓
"WHEN an error is caught, THE Tampermonkey Script SHALL log the error message to the console"
- **Implemented:** Uses `logError()` to log errors

### Requirement 11.3 ✓
"WHEN an error is caught, THE Tampermonkey Script SHALL record the failure in the results with error details"
- **Implemented:** Creates result object with error message and calls `addResult()`

## Code Quality

### Error Handling
- ✓ Comprehensive try-catch block
- ✓ Input validation before processing
- ✓ Multiple fallback success detection methods
- ✓ Descriptive error messages
- ✓ Graceful degradation

### Logging
- ✓ Clear success messages with ✓ symbol
- ✓ Clear error messages with ✗ symbol
- ✓ Warning messages for uncertain status
- ✓ Detailed context in log messages

### Code Structure
- ✓ Well-documented with JSDoc comments
- ✓ Clear variable names
- ✓ Logical flow
- ✓ Proper async/await usage
- ✓ Consistent with existing code style

## Conclusion

Task 6 (Implement offer addition logic) has been successfully completed with:
- ✓ Task 6.1: Single offer addition implemented
- ✓ Task 6.2: Comprehensive error handling implemented
- ✓ All requirements (7.1-7.7, 11.1-11.3) satisfied
- ✓ Function exposed for testing
- ✓ Code committed to repository

The implementation is ready for integration with the main automation loop (Task 7).
