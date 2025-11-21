/**
 * Test file for Tampermonkey script foundation
 * Tests utility functions and state management without browser context
 */

// Configuration
const AMEX_SELECTORS = {
    timing: {
        betweenOffers: 1500,
        afterCardSwitch: 3000,
        waitForLoad: 3000,
        pollingInterval: 100,
        maxWait: 10000
    }
};

// Utility Functions
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// State Management
const MAX_RESULTS = 1000;

const state = {
    cards: [],
    currentCardIndex: 0,
    results: [],
    isRunning: false,
    isPaused: false,
    totalOffers: 0
};

function addResult(result) {
    state.results.push(result);
    if (state.results.length > MAX_RESULTS) {
        state.results = state.results.slice(-MAX_RESULTS);
        console.warn(`Results array exceeded ${MAX_RESULTS} items. Keeping only recent results.`);
    }
    if (result.success) {
        console.log(`✓ Added: ${result.merchant} to ${result.cardName}`);
    } else {
        console.error(`✗ Failed: ${result.merchant} to ${result.cardName} - ${result.error || 'Unknown error'}`);
    }
}

function getState() {
    return { ...state };
}

function setState(updates) {
    Object.assign(state, updates);
    console.log('State updated:', updates);
}

function resetState() {
    state.cards = [];
    state.currentCardIndex = 0;
    state.results = [];
    state.isRunning = false;
    state.isPaused = false;
    state.totalOffers = 0;
    console.log('State reset');
}

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

// Test Suite
console.log('=== Testing Tampermonkey Script Foundation ===\n');

const tests = [];

// Test 1: State initialization
console.log('Test 1: State initialization');
const test1 = state.cards.length === 0 && 
              state.results.length === 0 && 
              state.isRunning === false &&
              state.isPaused === false &&
              state.currentCardIndex === 0 &&
              state.totalOffers === 0;
tests.push({ name: 'State initialization', passed: test1 });
console.log(test1 ? '✓ PASSED' : '✗ FAILED');
console.log('');

// Test 2: setState function
console.log('Test 2: setState updates state');
setState({ isRunning: true, currentCardIndex: 1 });
const test2 = state.isRunning === true && state.currentCardIndex === 1;
tests.push({ name: 'setState updates state', passed: test2 });
console.log(test2 ? '✓ PASSED' : '✗ FAILED');
console.log('');

// Test 3: addResult function
console.log('Test 3: addResult adds to results array');
addResult({ merchant: 'Amazon', cardName: 'Blue Cash', success: true });
const test3 = state.results.length === 1 && 
              state.results[0].merchant === 'Amazon' &&
              state.results[0].success === true;
tests.push({ name: 'addResult adds to results array', passed: test3 });
console.log(test3 ? '✓ PASSED' : '✗ FAILED');
console.log('');

// Test 4: getResultsSummary function
console.log('Test 4: getResultsSummary calculates correctly');
addResult({ merchant: 'Walmart', cardName: 'Blue Cash', success: false, error: 'Test error' });
const summary = getResultsSummary();
const test4 = summary.total === 2 && 
              summary.success === 1 && 
              summary.errors === 1 &&
              summary.successRate === '50.0';
tests.push({ name: 'getResultsSummary calculates correctly', passed: test4 });
console.log(test4 ? '✓ PASSED' : '✗ FAILED');
console.log(`Summary: ${JSON.stringify(summary)}`);
console.log('');

// Test 5: getState returns copy
console.log('Test 5: getState returns copy of state');
const stateCopy = getState();
stateCopy.isRunning = false;
const test5 = state.isRunning === true; // Original should not change
tests.push({ name: 'getState returns copy', passed: test5 });
console.log(test5 ? '✓ PASSED' : '✗ FAILED');
console.log('');

// Test 6: resetState function
console.log('Test 6: resetState clears all state');
resetState();
const test6 = state.results.length === 0 && 
              state.isRunning === false && 
              state.currentCardIndex === 0 &&
              state.cards.length === 0 &&
              state.totalOffers === 0;
tests.push({ name: 'resetState clears all state', passed: test6 });
console.log(test6 ? '✓ PASSED' : '✗ FAILED');
console.log('');

// Test 7: MAX_RESULTS limit
console.log('Test 7: MAX_RESULTS limit enforced');
console.log('Adding 1005 results...');
for (let i = 0; i < 1005; i++) {
    addResult({ merchant: `Merchant${i}`, cardName: 'Card1', success: true });
}
const test7 = state.results.length === MAX_RESULTS;
tests.push({ name: 'MAX_RESULTS limit enforced', passed: test7 });
console.log(test7 ? '✓ PASSED' : '✗ FAILED');
console.log(`Results array length: ${state.results.length} (expected: ${MAX_RESULTS})`);
console.log('');

// Test 8: delay function
console.log('Test 8: delay function works');
const startTime = Date.now();
delay(100).then(() => {
    const elapsed = Date.now() - startTime;
    const test8 = elapsed >= 100 && elapsed < 150;
    tests.push({ name: 'delay function works', passed: test8 });
    console.log(test8 ? '✓ PASSED' : '✗ FAILED');
    console.log(`Delay time: ${elapsed}ms (expected: ~100ms)`);
    console.log('');

    // Test 9: AMEX_SELECTORS structure
    console.log('Test 9: AMEX_SELECTORS has correct structure');
    const test9 = AMEX_SELECTORS.timing.betweenOffers === 1500 && 
                  AMEX_SELECTORS.timing.afterCardSwitch === 3000 &&
                  AMEX_SELECTORS.timing.waitForLoad === 3000 &&
                  AMEX_SELECTORS.timing.pollingInterval === 100 &&
                  AMEX_SELECTORS.timing.maxWait === 10000;
    tests.push({ name: 'AMEX_SELECTORS structure', passed: test9 });
    console.log(test9 ? '✓ PASSED' : '✗ FAILED');
    console.log('');

    // Summary
    console.log('=== Test Summary ===');
    const totalTests = tests.length;
    const passedTests = tests.filter(t => t.passed).length;
    const failedTests = tests.filter(t => !t.passed).length;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log('');
    
    if (failedTests > 0) {
        console.log('Failed Tests:');
        tests.filter(t => !t.passed).forEach(t => {
            console.log(`  - ${t.name}`);
        });
        process.exit(1);
    } else {
        console.log('✓ All tests passed!');
        process.exit(0);
    }
});
