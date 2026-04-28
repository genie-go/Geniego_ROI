const fs = require('fs');
const p = __dirname + '/src/i18n/locales/ko.js';
let s = fs.readFileSync(p, 'utf8');

// File ends with }} (double brace = inner object + outer export default)
// Insert before the very last }
const lastBrace = s.lastIndexOf('}');
const secondLastBrace = s.lastIndexOf('}', lastBrace - 1);

// The broken part: regex damage left orphan text after removing "email" key
// Let's find it: look for unquoted Korean text between closing braces
// Pattern: }}, followed by unquoted text
const orphanRegex = /\}\}\s+[가-힣]/g;
let match;
const orphans = [];
while ((match = orphanRegex.exec(s)) !== null) {
    orphans.push(match.index);
}
console.log('Orphan positions:', orphans);

// Fix each orphan by removing from the orphan start to the next valid position
// Actually, let's check if file parses first - the previous script might have already fixed it
// but added it in wrong place

// Better approach: directly replace the broken area
// The file was damaged by regex replacing part of "demoBannerPaid":"유료 플랜에서 전체 기능 사용 가능" 
// The "email" string inside the value matched our regex

// Let's find and fix
for (const pos of orphans) {
    const ctx = s.substring(Math.max(0, pos - 80), pos + 80);
    console.log(`\nOrphan at ${pos}:`, ctx.substring(0, 160));
}

// Try the most reliable fix: find the exact broken position and reconstruct
// The original correct text should be: "demoBannerPaid":"유료 플랜에서 전체 기능 사용 가능"
// But our regex broke it by matching something with "email" inside a value

// Actually let me just try loading the file and see what error we get
