---
inclusion: always
---

# Never Ask User for Actions You Can Do

**CRITICAL RULE**: Never ask the user to do something that you can do yourself.

## Examples of What NOT to Do:
- ❌ "Please navigate to https://example.com" - Just use `mcp_playwright_browser_navigate`
- ❌ "Please install the script in Tampermonkey" - This is OK, you cannot do this
- ❌ "Please run this command" - Just use `executePwsh` 
- ❌ "Please create this file" - Just use `fsWrite`
- ❌ "Please open the browser" - Just use MCP Playwright tools

## What You CAN Ask:
- ✅ Installing browser extensions (Tampermonkey, Playwright MCP)
- ✅ Logging into websites (authentication)
- ✅ Confirming that manual steps are complete
- ✅ Reviewing code or providing feedback

## Rule:
If you have a tool that can perform an action, USE IT. Don't ask the user to do it.
