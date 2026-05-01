// Extract all jb.* keys from JourneyBuilder.jsx
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/JourneyBuilder.jsx');
const content = fs.readFileSync(filePath, 'utf8');

// Extract all jb.* keys
const keyPattern = /jb\.[a-zA-Z0-9]+/g;
const matches = content.match(keyPattern);

if (matches) {
    const uniqueKeys = [...new Set(matches)].sort();
    console.log('=== Total unique jb.* keys found: ' + uniqueKeys.length + ' ===\n');
    uniqueKeys.forEach(key => console.log(key));
} else {
    console.log('No jb.* keys found');
}
