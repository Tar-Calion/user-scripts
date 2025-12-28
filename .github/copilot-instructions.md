# User-Scripts Development Guide

## Project Overview

This repository contains browser user-scripts (Tampermonkey/Greasemonkey) that enhance specific websites with additional functionality. Each script is a self-contained `.js` file with metadata headers for different sites and purposes.

## Script Structure

All scripts follow the Greasemonkey metadata format:

```javascript
// ==UserScript==
// @name         Script Name
// @namespace    https://example.com
// @version      X.Y
// @description  Brief description
// @match        https://target-site.com/*
// @grant        none
// ==/UserScript==
```

**Critical conventions:**
- Scripts use IIFEs: `(function() { 'use strict'; ... })();`
- No external dependencies - pure vanilla JavaScript only
- `@grant none` indicates no special GM_ API privileges needed
- `@match` defines which URLs trigger the script

## Common Code Patterns

### DOM Manipulation

Wait for page load before DOM access:
```javascript
window.addEventListener('load', function() {
    // initialization code
});
```

For SPAs or dynamically loaded content, use MutationObserver:
```javascript
const observer = new MutationObserver((mutations) => {
    // check for relevant DOM changes
});
observer.observe(document.body, { childList: true, subtree: true });
```

### Data Persistence

Use localStorage for user preferences:
```javascript
localStorage.setItem(key, value);
localStorage.getItem(key) ?? defaultValue;
```

### Site API Integration

Common patterns when interacting with site APIs:
- Extract CSRF tokens from cookies
- Access site-specific global objects (e.g., `window.SITE_GLOBALS`)
- Use `fetch()` or `XMLHttpRequest` for AJAX calls
- Parse HTML responses with `DOMParser` when needed
- Use `application/x-www-form-urlencoded` or `application/json` as appropriate

### UI Injection

Create persistent UI elements with fixed positioning:
```javascript
const element = document.createElement('div');
element.style.position = 'fixed';
element.style.top = '12px';
element.style.right = '12px';
document.body.appendChild(element);
```

Inject styles programmatically to avoid external CSS dependencies:
```javascript
const style = document.createElement('style');
style.textContent = '/* CSS rules */';
document.head.appendChild(style);
```

## Development Workflow

**Testing:**
1. Install Tampermonkey/Greasemonkey browser extension
2. Copy script content into new userscript
3. Navigate to target site and test functionality
4. Check browser console for debug logs

**Debugging:**
- Prefix console messages with script identifiers: `[Script Name]`
- Use browser DevTools to inspect injected elements
- Test both initial page load and dynamic content changes
- Test on different page types and navigation scenarios

## Adding New Scripts

1. Create new `.js` file with descriptive name: `SiteName_-_Feature.js`
2. Add userscript metadata block at top with appropriate `@match` patterns
3. Wrap code in IIFE with `'use strict'`
4. Wait for DOM ready before manipulating elements
5. Add debug logging with script-specific prefix
6. Update [README.md](../README.md) with description and screenshots
