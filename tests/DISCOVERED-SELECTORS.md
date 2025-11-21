# Amex Offers Page - Discovered Selectors

**Test Date:** November 21, 2025  
**Page URL:** https://global.americanexpress.com/offers  
**Test Account:** rex42

## Page Structure Analysis

### 1. Card Selector (Account Switcher)

**Element Type:** Combobox  
**Current Text:** "Hilton Honors Card ••••01003"  
**Selector:** `combobox` with role="combobox"  
**Reference:** e47

**Structure:**
```yaml
combobox "Open to manage your other accounts" [ref=e47]:
  - generic "Hilton Honors Card ending in 01003." [ref=e48]:
    - img [ref=e50]
    - generic [ref=e51]:
      - generic [ref=e52]: Hilton Honors Card
      - generic [ref=e55]: ••••01003
  - img [ref=e57]
```

**Recommended Selectors:**
- Primary: `[role="combobox"]`
- Fallback: `combobox`
- Type: `combobox` (dropdown that opens a listbox)

### 2. Already Added Offers Section

**Element Type:** Generic container  
**Heading:** "Added to Card (5)"  
**Contains:** Carousel of already-added offers

**Structure:**
```yaml
- generic [ref=e102]:
  - img "card_art" [ref=e103]
  - generic [ref=e104]: Added to Card (5)
- link "View All" [ref=e106]
```

**Offers in "Added" section:**
1. Prenuvo - Spend $2,499 or more, earn $500 - Expires 12/5/25
2. Patagonia.com - Spend $200 or more, earn $30 back - Expires 12/31/25
3. Sur La Table - Spend $100 or more, earn $15 back - Expires 12/31/25
4. Shop in Italy at McArthurGlen - Spend $650 or more, earn $150 back - Expires 12/31/25
5. La Colombe - Earn 15% back, up to $4 - Expires 12/31/25

### 3. Recommended Offers Section

**Element Type:** Main content area  
**Heading:** "Recommended Offers"  
**Contains:** Grid/list of available offers

**Offer Card Structure (Example: Orkin):**
```yaml
generic [ref=e290]:
  - img "Orkin" [ref=e293]
  - generic [ref=e294]:
    - generic [ref=e295]:
      - heading "Orkin" [level=3] [ref=e297]
      - generic [ref=e298]: Spend $30 or more, earn $30 back
      - paragraph [ref=e299]: Expires 12/31/25
      - button "Terms apply" [ref=e301]
    - generic [ref=e302]:
      - button "View Details" [ref=e303]
      - button "add to list card" [ref=e304]:
        - img [ref=e308]
```

**Offer Card Structure (Example: Faire - NEW):**
```yaml
generic [ref=e310]:
  - paragraph [ref=e312]: NEW
  - img "Faire" [ref=e315]
  - generic [ref=e316]:
    - generic [ref=e317]:
      - heading "Faire" [level=3] [ref=e319]
      - generic [ref=e320]: Earn 30% back on a single purchase, up to a total of $120
      - paragraph [ref=e321]: Expires 3/26/26
      - button "Terms apply" [ref=e323]
    - generic [ref=e324]:
      - button "View Details" [ref=e325]
      - button "add to list card" [ref=e326]:
        - img [ref=e330]
```

### 4. Offer Card Elements

#### Merchant Name
- **Element:** `heading [level=3]`
- **Examples:** "Orkin", "Faire", "Little Spoon", "OSEA Malibu"
- **Selector:** `h3` within offer card

#### Offer Details
- **Element:** `generic` (text content)
- **Examples:** 
  - "Spend $30 or more, earn $30 back"
  - "Earn 30% back on a single purchase, up to a total of $120"
  - "Earn 10% back on a single purchase, up to a total of $17"

#### Expiration Date
- **Element:** `paragraph`
- **Format:** "Expires MM/DD/YY"
- **Examples:** "Expires 12/31/25", "Expires 3/26/26"

#### Add Button
- **Element:** `button "add to list card"`
- **Contains:** Image (plus icon)
- **Selector:** `button[aria-label*="add"]` or `button:has-text("add to list card")`

#### View Details Button
- **Element:** `button "View Details"`
- **Selector:** `button:has-text("View Details")`

### 5. Sample Offers Detected

Total offers visible: 100+ (scrollable list)

**Sample offers:**
1. Orkin - Spend $30 or more, earn $30 back - Expires 12/31/25
2. Faire (NEW) - Earn 30% back, up to $120 - Expires 3/26/26
3. Little Spoon - Earn 10% back, up to $17 - Expires 12/15/25
4. OSEA Malibu - Earn 15% back, up to $30 - Expires 12/2/25
5. PAKA Apparel (NEW) - Earn 15% back, up to $45 - Expires 12/31/25
6. Elizabeth Arden (NEW) - Earn 10% back, up to $17 - Expires 12/31/25
7. Jared - Spend $500 or more, earn $100 back - Expires 2/14/26
8. FanDuel Sports Network - Spend $19.99 or more, earn $19.99 back - Expires 1/28/26

## Recommended Selector Configuration

```javascript
const AMEX_SELECTORS = {
  page: {
    url: 'https://global.americanexpress.com/offers',
    urlPattern: /global\.americanexpress\.com\/offers/
  },
  
  cards: {
    // Card switcher/selector
    switcher: '[role="combobox"]',
    switcherType: 'combobox',
    switcherFallbacks: [
      'combobox',
      '[aria-label*="manage your other accounts"]'
    ],
    
    // When dropdown is open
    listbox: '[role="listbox"]',
    listboxFallbacks: [
      '[role="menu"]',
      '.account-selector-menu'
    ],
    
    // Individual card options
    option: '[role="option"]',
    optionFallbacks: [
      'li',
      'a[href*="account_key"]'
    ]
  },
  
  offers: {
    // Main offers container
    container: 'main',
    containerFallbacks: [
      '[role="main"]',
      'main > div'
    ],
    
    // Individual offer cards
    card: 'main > div > div > div > generic',
    cardFallbacks: [
      'main generic:has(h3)',
      'main > div > div > div',
      '[class*="offer"]'
    ],
    
    // Elements within offer card
    merchantName: 'h3',
    merchantNameFallbacks: [
      'heading[level="3"]',
      '[role="heading"][aria-level="3"]'
    ],
    
    offerDetails: 'generic:has(h3) + generic',
    offerDetailsFallbacks: [
      'h3 ~ generic',
      'div:has(h3) > div:nth-child(2)'
    ],
    
    expiration: 'paragraph',
    expirationFallbacks: [
      'p:has-text("Expires")',
      '*:has-text("Expires")'
    ],
    
    // Add button
    addButton: 'button:has-text("add to list card")',
    addButtonFallbacks: [
      'button[aria-label*="add"]',
      'button:has(img):not(:has-text("View Details"))',
      'button:has-text("add")'
    ],
    
    // Already added indicator
    alreadyAdded: 'button[disabled]:has-text("add")',
    alreadyAddedFallbacks: [
      'button[disabled]',
      '[aria-label*="Added"]',
      '*:has-text("Added to Card")'
    ],
    
    // View Details button (not the add button)
    viewDetailsButton: 'button:has-text("View Details")',
    
    // Terms apply button
    termsButton: 'button:has-text("Terms apply")'
  },
  
  feedback: {
    // Success indicators
    success: '[role="alert"]',
    successFallbacks: [
      '.success-message',
      '[class*="success"]',
      '[class*="notification"]'
    ]
  },
  
  timing: {
    betweenOffers: 1500,        // 1.5s between adding offers
    afterCardSwitch: 3000,       // 3s after switching cards
    waitForLoad: 3000,           // 3s for page load
    pollingInterval: 100,        // 100ms for element polling
    maxWait: 10000               // 10s max wait for elements
  }
};
```

## Testing Notes

1. **Card Switching:** The combobox opens a listbox with card options. Each option has an `href` with `account_key` parameter.

2. **Offer Detection:** Offers are in a scrollable container. Need to scroll to load all offers (lazy loading may be present).

3. **Add Button State:** 
   - Available: Blue "+" button with "add to list card" text
   - Already Added: Button becomes disabled or changes appearance

4. **Page Navigation:** Switching cards changes the URL parameter `account_key` and reloads the page.

5. **Offer Count:** Current card shows "Added to Card (5)" meaning 5 offers already added.

## Next Steps

1. ✅ Discovered actual page structure
2. ⏭️ Update `src/main.user.js` with discovered selectors
3. ⏭️ Test card switching functionality
4. ⏭️ Test offer detection and counting
5. ⏭️ Test add button clicking
6. ⏭️ Implement full automation loop
7. ⏭️ Test with Tampermonkey script installed
