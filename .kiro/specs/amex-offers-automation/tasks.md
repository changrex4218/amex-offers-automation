# Implementation Plan

- [x] 1. Set up project structure and dependencies
  - Create root directory structure with docs/, tests/, and root level files
  - Initialize package.json with Playwright and required dependencies
  - Create .gitignore file excluding node_modules, docs/page-structure.json, and sensitive data
  - Create placeholder README.md with project overview
  - _Requirements: 13.1, 13.5, 13.9, 13.10_

- [-] 2. Implement Page Analyzer core functionality


  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2.1 Create analyze-page.js entry point and browser setup
  - Write analyzeAmexOffersPage() function that launches Playwright browser in headed mode
  - Implement navigation to https://global.americanexpress.com/offers with networkidle wait
  - Add 30-second wait for manual user authentication
  - Set up page response listener to capture API calls
  - _Requirements: 1.1, 1.2_

- [x] 2.2 Implement card detection analysis
  - Write analyzeCardElements() function with prioritized selector list for card switchers
  - Implement logic to detect select dropdown card switchers
  - Extract all card options with value, text, and selected properties
  - Add fallback detection for tab-based and button-based card switchers
  - Return structured card analysis object with switcher type and switch method
  - _Requirements: 1.3, 1.4_

- [x] 2.3 Integrate card detection into main analyzer flow
  - Call analyzeCardElements() from analyzeAmexOffersPage()
  - Store card analysis results for documentation generation
  - _Requirements: 1.3, 1.4_

- [x] 2.4 Implement offer detection analysis
  - Write analyzeOfferElements() function with prioritized selector list for offer containers
  - Detect individual offer card elements and count them
  - Analyze first offer card to find merchant name selectors (try multiple patterns)
  - Identify add button selectors within offer cards
  - Identify already-added indicator selectors
  - Capture sample HTML from first offer card for documentation
  - Return structured offer analysis object with all discovered selectors
  - _Requirements: 1.5, 1.6, 1.7_

- [x] 2.5 Implement add offer workflow analysis









  - Write analyzeAddOfferWorkflow() function to test actual offer addition
  - Find first available (not disabled) add button
  - Set up response listener before clicking to capture API calls
  - Click add button and wait for response
  - Detect success indicator elements (notifications, button state changes)
  - Calculate recommended delay based on observed response times
  - Return workflow analysis with API calls, success indicators, and timing recommendations
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2.6 Implement documentation generation




  - Write generateAnalysisDocument() function that creates markdown content
  - Include sections for URL structure, card switching, offers structure, workflow, and selector map
  - Format AMEX_SELECTORS JavaScript object ready for copy-paste into Tampermonkey script
  - Include primary selectors and fallback arrays for each element type
  - Add usage notes and recommendations
  - _Requirements: 1.8_

- [x] 2.7 Implement file output and completion


  - Create docs/ directory if it doesn't exist
  - Save markdown documentation to docs/page-structure.md
  - Save JSON structured data to docs/page-structure.json
  - Log completion message with file paths
  - Close browser after analysis completes
  - _Requirements: 1.8, 1.9_

- [ ] 3. Implement Tampermonkey script foundation







  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3.1 Create script metadata and configuration
  - Create amex-offers.user.js file with Tampermonkey metadata block
  - Set @match pattern to https://global.americanexpress.com/offers*
  - Request GM_xmlhttpRequest, GM_setValue, GM_getValue, and GM_notification grants
  - Set @run-at to document-idle for proper page load timing
  - Define AMEX_SELECTORS configuration object with placeholder structure
  - Add version 1.0.0 to metadata
  - _Requirements: 3.1, 3.2, 3.4, 3.5_


- [x] 3.2 Implement utility functions
  - Write waitForElement() function with timeout and polling logic
  - Implement safeExecute() wrapper for error handling with fallback values
  - Create delay() helper function for timing control
  - Write logging utility functions for consistent console output
  - _Requirements: 11.4, 11.5_


- [x] 3.3 Initialize state management
  - Define state object with cards, currentCardIndex, results, isRunning, isPaused, totalOffers
  - Implement addResult() function with MAX_RESULTS limit for memory management
  - Create state getter and setter functions
  - _Requirements: 10.1, 10.2_

- [x] 4. Implement card detection and switching





  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4.1 Implement card detection for select dropdowns
  - Write detectAllCards() function that waits for card switcher element
  - Check if switcher is a select element based on AMEX_SELECTORS.cards.switcherType
  - Extract all option elements and map to card objects with name, value, accountKey
  - Log detected card count and names to console
  - Return array of card objects
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 4.2 Add fallback card detection methods
  - Implement detection for tab-based card switchers
  - Implement detection for button-based card switchers
  - Use fallback logic if primary detection fails
  - _Requirements: 4.5_

- [x] 4.3 Implement card switching mechanism
  - Write switchToCard() function that accepts card object parameter
  - Set card switcher value to target card's value
  - Dispatch change event with bubbles: true
  - Wait for AMEX_SELECTORS.timing.afterCardSwitch delay
  - Wait for offers container to be present in DOM
  - Log successful card switch to console
  - Return boolean success status
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5. Implement offer detection and filtering




  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

- [x] 5.1 Implement offer detection with filtering



  - Write detectOffersForCurrentCard() function that waits for offers container
  - Query all offer card elements using AMEX_SELECTORS.offers.card
  - Filter out offers that have already-added indicator present
  - Extract merchant name using primary selector, then try fallbacks
  - Locate add button using primary selector, then try fallbacks
  - Exclude offers without valid add button
  - Map to offer objects with merchant, addButton, element properties
  - Log count of available offers to console
  - Return array of offer objects
  - Use MCP Playwright to validate offer detection filters correctly
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

- [x] 6. Implement offer addition logic





  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 6.1 Implement single offer addition


  - Write addOfferToCard() function accepting offer and card parameters
  - Wrap logic in try-catch block for error handling
  - Click the offer's add button element
  - Wait for AMEX_SELECTORS.timing.betweenOffers delay
  - Check for success indicator element
  - Create result object with timestamp, cardName, merchant, status, success
  - Log successful addition to console
  - Return result object
  - Use MCP Playwright to validate offer addition triggers API calls
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6, 7.7_

- [x] 6.2 Add error handling for offer addition

  - Catch errors in addOfferToCard() function
  - Log error message to console
  - Create result object with status 'error' and error message
  - Return error result object
  - Ensure automation continues after error
  - Use MCP Playwright to test error handling with invalid selectors
  - _Requirements: 7.5, 11.1, 11.2, 11.3_

- [ ] 7. Implement main automation loop





  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 7.1 Create automation orchestration function


  - Write automateAllOffersAllCards() function accepting cards array parameter
  - Initialize results array and totalOffers counter
  - Implement outer loop to iterate through each card sequentially
  - Update progress UI with current card information
  - Switch to each card using switchToCard()
  - Detect offers for current card using detectOffersForCurrentCard()
  - Increment totalOffers counter
  - Use MCP Playwright to validate orchestration processes multiple cards
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 7.2 Implement offer processing inner loop


  - Create inner loop to iterate through offers for current card
  - Update progress UI with current offer number and percentage
  - Call addOfferToCard() for each offer
  - Add result to results array using addResult()
  - Continue to next offer even if one fails
  - Use MCP Playwright to validate loop continues after failures
  - _Requirements: 8.4, 8.5, 11.6_


- [x] 7.3 Add completion logic

  - Calculate total successful additions from results array
  - Log completion message with success count to console
  - Call showCompletionNotification() with results
  - Return results array
  - Use MCP Playwright to validate completion notification appears
  - _Requirements: 8.6, 8.7_

- [x] 8. Implement progress UI





  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 8.1 Create progress panel HTML structure


  - Write createProgressPanel() function that creates fixed-position div
  - Add panel title "Amex Offers Automation"
  - Create card list container with checkboxes
  - Add status message area
  - Add progress bar with percentage display
  - Add action buttons: "Add All Offers", "Pause", "Stop"
  - Add results section with "View Results" and "Export JSON" buttons
  - Apply CSS styling with fixed positioning, border, shadow, high z-index
  - Append panel to document body
  - Use MCP Playwright to validate panel appears and has correct structure
  - _Requirements: 9.1_

- [x] 8.2 Implement progress update function

  - Write updateProgress() function accepting message and percentage parameters
  - Update status message text in progress panel
  - Update progress bar width based on percentage
  - Update percentage display text
  - Use MCP Playwright to validate progress updates display correctly
  - _Requirements: 9.2, 9.3, 9.4_

- [x] 8.3 Implement card list rendering

  - Write renderCardList() function accepting cards array parameter
  - Create checkbox list items for each card
  - Mark current card as checked
  - Update card list in progress panel
  - Use MCP Playwright to validate card list renders correctly
  - _Requirements: 9.2_

- [x] 8.4 Implement completion notification

  - Write showCompletionNotification() function accepting results parameter
  - Calculate success count from results array
  - Use GM_notification to display browser notification
  - Include total success count in notification message
  - Use MCP Playwright to validate notification appears with correct message
  - _Requirements: 9.5, 9.6_

- [x] 8.5 Add results export functionality

  - Implement exportResults() function that converts results array to JSON
  - Create downloadable JSON file with results data
  - Trigger browser download when "Export JSON" button is clicked
  - Use MCP Playwright to validate export creates valid JSON file
  - _Requirements: 10.3, 10.4_

- [x] 9. Implement UI initialization and event handlers




  - _Requirements: 3.3_


- [x] 9.1 Create UI initialization function

  - Write initializeUI() function as main entry point
  - Call createProgressPanel() to build UI
  - Call detectAllCards() and render card list
  - Attach event handlers to all buttons
  - Set up initial state
  - Use MCP Playwright to validate UI initializes on page load
  - _Requirements: 3.3_


- [ ] 9.2 Attach button event handlers
  - Add click handler to "Add All Offers" button that calls automateAllOffersAllCards()
  - Add click handler to "Pause" button that sets isPaused state
  - Add click handler to "Stop" button that sets isRunning to false
  - Add click handler to "View Results" button that displays results in console
  - Add click handler to "Export JSON" button that calls exportResults()
  - Use MCP Playwright to validate button handlers trigger correct actions
  - _Requirements: 3.3_


- [ ] 9.3 Add automatic initialization on page load
  - Call initializeUI() when script loads and page is ready
  - Verify page URL matches Amex offers page pattern
  - Log initialization message to console
  - Use MCP Playwright to validate script auto-executes on page load
  - _Requirements: 3.3_

- [ ] 10. Create comprehensive end-to-end validation with MCP Playwright
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 12.9, 12.10, 12.11, 12.12_

- [ ] 10.1 Create playwright.config.js configuration
  - Create playwright.config.js with headless: false, video recording, screenshots
  - Set timeout to 120000ms (2 minutes) for long-running tests
  - Configure browser launch options for testing
  - Use MCP Playwright to validate configuration is correct
  - _Requirements: 12.1_

- [ ] 10.2 Create comprehensive validation script
  - Create tests/validate-automation.js that uses MCP Playwright
  - Implement script injection helper to inject Tampermonkey script into page
  - Read amex-offers.user.js and remove metadata block before injection
  - Wait for script initialization by checking for global object
  - Use MCP Playwright to validate script injection works
  - _Requirements: 12.2, 12.3_

- [ ] 10.3 Validate script initialization
  - Navigate to Amex offers page using MCP Playwright
  - Inject Tampermonkey script into page context
  - Assert automation panel element is present in DOM
  - Verify panel has correct title and structure
  - Use MCP Playwright to capture screenshot of initialized UI
  - _Requirements: 12.2, 12.3, 12.4_

- [ ] 10.4 Validate card detection
  - Use MCP Playwright to call detectAllCards() in page context
  - Assert cards array length is greater than 0
  - Verify each card has name, value, and accountKey properties
  - Log detected cards to console
  - Use MCP Playwright to validate card detection results
  - _Requirements: 12.5_

- [ ] 10.5 Validate offer detection
  - Use MCP Playwright to call detectOffersForCurrentCard() in page context
  - Assert offers array length is greater than 0
  - Verify each offer has merchant and addButton properties
  - Use MCP Playwright to validate offer filtering works correctly
  - _Requirements: 12.6_

- [ ] 10.6 Validate card switching
  - Use MCP Playwright to get initial card value
  - Call switchToCard() with different card using MCP Playwright
  - Verify card switcher value changed
  - Wait for offers to reload
  - Assert offers container is present
  - Use MCP Playwright to validate card switching triggers page updates
  - _Requirements: 12.7_

- [ ] 10.7 Validate offer addition workflow
  - Use MCP Playwright to set up network request listener
  - Call addOfferToCard() with test offer using MCP Playwright
  - Assert API call was made with correct URL pattern
  - Verify success indicator appears in DOM
  - Check result object has success: true
  - Use MCP Playwright to validate API calls are captured
  - _Requirements: 12.8_

- [ ] 10.8 Validate full automation workflow
  - Use MCP Playwright to call automateAllOffersAllCards() with detected cards
  - Wait for automation to complete
  - Assert all cards were processed
  - Verify results array is populated
  - Check completion notification was displayed
  - Verify success count matches expected value
  - Use MCP Playwright to validate end-to-end workflow
  - _Requirements: 12.9, 12.10_

- [ ] 10.9 Validate error handling
  - Use MCP Playwright to simulate missing elements by modifying AMEX_SELECTORS
  - Call automation functions
  - Verify errors are caught and logged
  - Assert automation continues after errors
  - Check error results are recorded with status 'error'
  - Use MCP Playwright to validate error recovery
  - _Requirements: 12.11_

- [ ] 10.10 Validate all selectors exist
  - Use MCP Playwright to navigate to Amex page
  - Check each selector in AMEX_SELECTORS exists in DOM
  - Assert all primary selectors are valid
  - Test fallback selectors if primary fails
  - Generate report of selector validity
  - Use MCP Playwright to validate selector discovery
  - _Requirements: 12.11, 12.12_

- [ ] 11. Create comprehensive documentation
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [ ] 11.1 Update README.md with complete setup instructions
  - Update project overview and architecture description
  - Update "Quick Start" section with three phases: Analyze, Install, Validate
  - Document Step 1: Run Page Analyzer with command and expected output
  - Document Step 2: Review analysis results and verify selectors
  - Document Step 3: Install Tampermonkey script with detailed steps
  - Document Step 4: Run MCP Playwright validation
  - Add usage instructions with detailed examples
  - Include troubleshooting section for common issues
  - Add notes about authentication requirements and limitations
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [ ] 11.2 Add inline code documentation
  - Add JSDoc comments to all major functions in Page Analyzer
  - Add JSDoc comments to all major functions in Tampermonkey script
  - Add inline comments explaining complex logic
  - Document AMEX_SELECTORS structure with comments
  - Add usage examples in comments where helpful
  - _Requirements: 13.1_

- [ ] 12. Final integration and validation
  - _Requirements: All requirements_

- [ ] 12.1 Run complete end-to-end workflow with MCP Playwright
  - Execute Page Analyzer on actual Amex page
  - Review generated docs/page-structure.md for accuracy
  - Copy AMEX_SELECTORS into Tampermonkey script
  - Use MCP Playwright to inject and test script
  - Verify all cards are detected correctly using MCP Playwright
  - Test adding offers to one card using MCP Playwright
  - Validate full automation workflow using MCP Playwright
  - _Requirements: 1.8, 3.4, 4.4, 6.9, 8.7_

- [ ] 12.2 Verify error handling and edge cases with MCP Playwright
  - Use MCP Playwright to test with account that has no offers
  - Use MCP Playwright to test with account that has all offers already added
  - Use MCP Playwright to test with single card account
  - Use MCP Playwright to simulate network errors and verify recovery
  - Use MCP Playwright to test pause and stop functionality
  - Use MCP Playwright to verify results export works correctly
  - _Requirements: 11.1, 11.2, 11.3, 11.6_

- [ ] 12.3 Performance and timing validation with MCP Playwright
  - Use MCP Playwright to monitor API call timing during automation
  - Verify delays are appropriate (not too fast or slow)
  - Use MCP Playwright to check memory usage with large results arrays
  - Use MCP Playwright to test with maximum number of cards and offers
  - Verify no rate limiting errors occur
  - _Requirements: 2.5, 2.6, 7.2_

- [ ] 12.4 Final code review and cleanup
  - Remove debug console.log statements (keep important ones)
  - Verify all error messages are clear and helpful
  - Check code formatting and consistency
  - Ensure all functions have proper error handling
  - Verify AMEX_SELECTORS has all required fields
  - Update version number in Tampermonkey metadata
  - Use MCP Playwright to validate final implementation
  - _Requirements: All requirements_
