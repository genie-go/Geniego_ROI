// Safe AST-based injection: parse the file, find the export default object, inject email key
const fs = require('fs');
const p = __dirname + '/src/i18n/locales/ko.js';
let s = fs.readFileSync(p, 'utf8');

// Strategy: find the LAST }; in the file (which closes the export default {})
// Then find the } right before the ;
// Insert ,email:{...} before that closing }

// But first, we need to fix the currently broken file
// The issue: regex replaced part of an existing key's value that contained "email"
// Let's find and fix the broken pattern: }} 사용 가능
const badPattern = '}} 사용';
let idx = s.indexOf(badPattern);
while (idx > 0) {
    // Find previous quote
    let prevQuote = idx - 1;
    while (prevQuote > 0 && s[prevQuote] !== '"') prevQuote--;
    // Find the key name before that quote
    let keyStart = prevQuote - 1;
    while (keyStart > 0 && s[keyStart] !== '"') keyStart--;
    
    // This is a broken value - reconstruct it
    // The original value was something like "...유료 플랜에서 전체 기능 사용 가능"
    // But our regex cut it at "email" pattern
    console.log('Broken area near:', s.substring(Math.max(0, idx-100), idx+30));
    
    // Actually, let's take a different approach:
    // Remove any "email":{...} that exists, then find orphaned text and remove it
    break;
}

// Most reliable approach: rebuild the file by evaluating what loads and what doesn't
// Since the file is broken, let's find the intact prefix and suffix

// Find the last valid position by trying to parse progressively
// Actually, let's just find the damaged area and surgically remove it

// The damage is: the regex matched something inside another key's value
// Pattern: ,"email":{...} was inserted, breaking the surrounding syntax

// Let's find ALL occurrences of the broken text
const allBroken = [];
let searchFrom = 0;
while (true) {
    const found = s.indexOf('사용 가능', searchFrom);
    if (found < 0) break;
    allBroken.push(found);
    searchFrom = found + 5;
}
console.log('Found "사용 가능" at positions:', allBroken);

// The safest approach: find the area with unmatched braces
// Count { and } up to each position
let braceCount = 0;
let firstUnbalanced = -1;
for (let i = 0; i < s.length; i++) {
    if (s[i] === '{') braceCount++;
    else if (s[i] === '}') {
        braceCount--;
        if (braceCount < 0) {
            firstUnbalanced = i;
            console.log('First unbalanced } at position:', i, 'context:', s.substring(Math.max(0,i-30), i+30));
            break;
        }
    }
}
