---
inclusion: always
---

# Task Implementation Rules

## Always Read Spec First

Before implementing ANY task from a spec, you MUST:

1. **Read all three spec documents** in this order:
   - requirements.md - Understand what needs to be built
   - design.md - Understand how it should be built
   - tasks.md - Understand the specific task details

2. **Understand the context** - Don't implement tasks in isolation. Each task builds on previous work and contributes to the overall feature.

3. **Reference requirements** - Every task references specific requirements. Make sure your implementation satisfies those requirements.

## Always Use MCP Playwright for Validation

For the Amex Offers Automation project, you MUST use MCP Playwright to validate your work:

1. **After implementing any functionality**, use MCP Playwright to test it in a real browser environment
2. **Don't rely on assumptions** - Actually run the code using MCP Playwright to verify it works
3. **Test edge cases** - Use MCP Playwright to test error handling, missing elements, and various scenarios
4. **Validate selectors** - Use MCP Playwright to ensure discovered selectors actually exist on the page
5. **Capture evidence** - Use MCP Playwright screenshots and console output to verify behavior

## Auto-Login for Testing

When testing on the Amex offers page, you MUST automatically log in using saved credentials:

1. **Navigate to the login page** if redirected
2. **Use the saved credentials** for user `rex42`
3. **Fill the login form** using MCP Playwright:
   - User ID: `rex42`
   - Password: Use the saved password visible in the password field
4. **Click the Log In button** to authenticate
5. **Wait for navigation** to the offers page
6. **Proceed with testing** once logged in

This ensures seamless testing without manual intervention.

## Tampermonkey Script Testing Workflow

When implementing or updating the Tampermonkey script (`amex-offers.user.js`):

1. **Make changes** to the Tampermonkey script
2. **ALWAYS ask the user to install** the updated script in Tampermonkey before testing:
   - Say: "I've updated the script. Please install it in Tampermonkey: Open Tampermonkey dashboard, edit the 'Amex Offers Automation' script, paste the contents of `amex-offers.user.js`, and save it."
3. **Wait for user confirmation** that the script is installed
4. **Then navigate** to the Amex offers page: `https://global.americanexpress.com/offers`
5. **Use MCP Playwright** to test the script functionality:
   - Take snapshots to verify UI elements
   - Check console output for script messages
   - Test script functions by interacting with the page
   - Verify the script behavior matches requirements

**CRITICAL**: NEVER test the script without first asking the user to update it in Tampermonkey. The browser won't pick up file changes automatically.

## MCP Playwright Usage Examples

```javascript
// Navigate to the page
await page.goto('https://global.americanexpress.com/offers');

// Test selector exists
const element = await page.$(selector);
console.assert(element !== null, 'Selector should exist');

// Check console for Tampermonkey script messages
// (Script is already injected by Tampermonkey)

// Call functions exposed by the script
const result = await page.evaluate(() => {
  return window.AmexAutomation.detectAllCards();
});

// Validate results
console.log('Detected cards:', result);
```

## Task Implementation Workflow

1. Read spec documents (requirements.md, design.md, tasks.md)
2. Understand the specific task and its requirements
3. Implement the functionality
4. Use MCP Playwright to validate the implementation on the actual website
5. Fix any issues discovered during validation
6. **Check in code changes** - Commit your work with a clear message describing what was implemented
7. Mark task as complete only after validation passes and code is committed

**CRITICAL**: Never skip validation. Never assume code works without testing it. Always test on the actual website using MCP Playwright.

**NEVER create test files or validation documents**. Always use the actual website with MCP Playwright tools to test functionality directly. The browser console is not accessible for automated testing, and documentation doesn't prove the code works.

## Always Check In Code Changes

After implementing and validating each task, you MUST commit your changes:

1. **Stage your changes** - Use `git add` to stage the files you modified
2. **Write clear commit messages** - Describe what was implemented and which task it completes
3. **Commit format**: `"Implement task X.X: [brief description]"`
4. **Commit frequently** - Don't wait until multiple tasks are done. Commit after each task.

### Example Commit Workflow

```bash
# Stage the changes
git add tests/analyze-page.js

# Commit with clear message
git commit -m "Implement task 2.5: Add offer workflow analysis function"

# Verify commit
git log -1
```

## Why This Matters

- **Spec-driven development** ensures we build the right thing
- **MCP Playwright validation** ensures what we build actually works
- **Real browser testing** catches issues that unit tests might miss
- **Evidence-based completion** means tasks are truly done, not just written
- **Version control** provides a clear history of what was implemented and when
- **Rollback capability** allows reverting changes if issues are discovered
