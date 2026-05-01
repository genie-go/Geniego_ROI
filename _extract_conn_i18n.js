const fs = require('fs');

// Read ko.js
const content = fs.readFileSync('frontend/src/i18n/locales/ko.js', 'utf8');

// Find "conn": { section
const connMatch = content.match(/"conn":\s*\{[^}]*\}/s);
if (connMatch) {
    console.log('Found conn section:');
    console.log(connMatch[0]);
} else {
    console.log('conn section not found');
}

// Also search for larger nested structure
const connMatch2 = content.match(/"conn":\s*\{[\s\S]{0,5000}?\n\s{2}\}/);
if (connMatch2) {
    console.log('\n\nFound larger conn section:');
    console.log(connMatch2[0]);
}
