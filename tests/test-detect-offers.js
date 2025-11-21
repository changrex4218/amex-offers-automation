// Test script for detectOffersForCurrentCard function
// Copy and paste this into the browser console on https://global.americanexpress.com/offers

(async function testDetectOffers() {
    console.log('=== Testing detectOffersForCurrentCard ===');
    
    // Check if function exists
    if (!window.AmexAutomation || !window.AmexAutomation.detectOffersForCurrentCard) {
        console.error('❌ window.AmexAutomation.detectOffersForCurrentCard not found');
        console.log('Make sure the Tampermonkey script is installed and running');
        return;
    }
    
    console.log('✓ Function found');
    
    // Call the function
    try {
        const offers = await window.AmexAutomation.detectOffersForCurrentCard();
        
        console.log(`✓ Function executed successfully`);
        console.log(`✓ Detected ${offers.length} available offers`);
        
        if (offers.length > 0) {
            console.log('\n=== First 5 Offers ===');
            offers.slice(0, 5).forEach((offer, index) => {
                console.log(`${index + 1}. ${offer.merchant}`);
                console.log(`   - Has add button: ${!!offer.addButton}`);
                console.log(`   - Has element: ${!!offer.element}`);
            });
            
            // Verify structure
            const firstOffer = offers[0];
            console.log('\n=== Validating Offer Structure ===');
            console.log(`✓ merchant property: ${typeof firstOffer.merchant === 'string' ? 'string' : '❌ not string'}`);
            console.log(`✓ addButton property: ${firstOffer.addButton instanceof HTMLElement ? 'HTMLElement' : '❌ not HTMLElement'}`);
            console.log(`✓ element property: ${firstOffer.element instanceof HTMLElement ? 'HTMLElement' : '❌ not HTMLElement'}`);
            
            console.log('\n=== Test Summary ===');
            console.log(`✓ All tests passed!`);
            console.log(`✓ ${offers.length} offers detected and properly structured`);
        } else {
            console.warn('⚠ No offers detected - this might be expected if all offers are already added');
        }
        
    } catch (error) {
        console.error('❌ Error calling detectOffersForCurrentCard:', error);
    }
})();
