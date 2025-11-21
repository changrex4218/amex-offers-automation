const fs = require('fs');
const path = require('path');

const version = process.env.VERSION || JSON.parse(fs.readFileSync('package.json')).version;

console.log(`Building Amex Offers Automation v${version}...`);

// Files to bundle in order
const files = [
    'src/lib/utils.js',
    'src/lib/amex-core.js',
    'src/lib/google-sheets.js',
    'src/lib/ui-components.js'
];

// Tampermonkey metadata
const metadata = `// ==UserScript==
// @name         Amex Offers Automation
// @namespace    http://tampermonkey.net/
// @version      ${version}
// @description  Automatically add all Amex offers to all cards
// @author       changrex4218
// @match        https://global.americanexpress.com/offers*
// @updateURL    https://raw.githubusercontent.com/changrex4218/amex-offers-automation/main/dist/amex-offers.user.js
// @downloadURL  https://raw.githubusercontent.com/changrex4218/amex-offers-automation/main/dist/amex-offers.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_notification
// @connect      sheets.googleapis.com
// ==/UserScript==

`;

let bundled = metadata + '(function() {\n    \'use strict\';\n\n';

// Bundle library files
files.forEach(file => {
    console.log(`  Adding ${file}...`);
    const content = fs.readFileSync(file, 'utf8');
    
    // Remove export statements and window assignments
    const cleaned = content
        .replace(/\/\/ Export[\s\S]*?window\.\w+ = [\s\S]*?;/g, '')
        .replace(/if \(typeof window !== 'undefined'\) \{[\s\S]*?\}/g, '');
    
    bundled += `    // ===== ${path.basename(file)} =====\n`;
    bundled += cleaned.split('\n').map(line => '    ' + line).join('\n') + '\n\n';
});

// Add main execution code
console.log('  Adding main execution code...');
const mainCode = fs.readFileSync('src/main.user.js', 'utf8');

// Extract just the main logic (everything after the metadata block)
const mainLogicMatch = mainCode.match(/\/\/ =\/UserScript==\s*\n([\s\S]*)/);
if (mainLogicMatch) {
    bundled += mainLogicMatch[1];
} else {
    console.error('Error: Could not extract main logic from src/main.user.js');
    console.error('Trying alternative extraction...');
    
    // Alternative: find the (function() block
    const altMatch = mainCode.match(/(\(function\(\) \{[\s\S]*\}\)\(\);)/);
    if (altMatch) {
        bundled += altMatch[1];
    } else {
        console.error('Could not extract main logic');
        process.exit(1);
    }
}

// Write bundled file
const outputPath = 'dist/amex-offers.user.js';
fs.writeFileSync(outputPath, bundled);

console.log(`✓ Built v${version} → ${outputPath}`);
console.log(`  Size: ${(bundled.length / 1024).toFixed(2)} KB`);
