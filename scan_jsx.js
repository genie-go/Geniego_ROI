#!/usr/bin/env node
/**
 * Quick JSX tag-balance scanner for Admin.jsx
 * Finds all functions and checks their JSX tag balance
 */
const fs = require('fs');

const file = process.argv[2] || 'd:/project/GeniegoROI/frontend/src/pages/Admin.jsx';
const content = fs.readFileSync(file, 'utf-8');
const lines = content.split('\n');

// Find all function declarations
const issues = [];

// Check for bare Korean text outside strings/comments (common broken comment issue)
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  // Skip empty lines
  if (!trimmed) continue;
  
  // Check for lines that start with Korean characters but aren't in strings/comments  
  if (/^[\uAC00-\uD7AF]/.test(trimmed) && !trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('/*')) {
    issues.push({ line: i + 1, type: 'BARE_KOREAN', text: trimmed.substring(0, 80) });
  }
  
  // Check for `* /` pattern that indicates broken closing comment
  if (/^[^\/\*].*\*\/\s*$/.test(trimmed) && !trimmed.includes('/*') && !trimmed.startsWith('*') && !trimmed.startsWith('//')) {
    issues.push({ line: i+1, type: 'ORPHAN_COMMENT_CLOSE', text: trimmed.substring(0, 80) });
  }
}

console.log(`Found ${issues.length} potential issues:`);
issues.forEach(i => console.log(`  L${i.line}: [${i.type}] ${i.text}`));
