const fs = require('fs');
const c = fs.readFileSync('d:/project/GeniegoROI/frontend/dist/assets/Dashboard-BwlWzzEy.js', 'utf-8');

// Find the LOC dictionary structure around "ar" key
const arIdx = c.indexOf('\u0645\u0628\u0627\u0634\u0631 \u00b7 \u0627\u0644\u0645\u0624\u062b\u0631\u0648\u0646');
console.log('Arabic liveInfluencer at position:', arIdx);

// Find the "ko" fallback logic
let koFallbackPositions = [];
let pos = 0;
while (pos < c.length) {
  pos = c.indexOf('||"ko"', pos);
  if (pos === -1) break;
  koFallbackPositions.push(pos);
  pos++;
}
console.log('||"ko" fallback occurrences:', koFallbackPositions.length);
koFallbackPositions.forEach(p => {
  console.log(`  at ${p}: ...${c.substring(Math.max(0,p-60), p+20)}...`);
});

// Check if lang is properly used in LOC lookup near arIdx  
const locLookup = c.indexOf('[n]', arIdx + 500);
if (locLookup > 0) {
  console.log('\nLOC lookup near ar:', c.substring(locLookup - 80, locLookup + 80));
}
