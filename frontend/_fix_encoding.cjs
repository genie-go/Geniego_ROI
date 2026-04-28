// Fix encoding issue - re-read file as binary and clean up currPrefix keys
const fs = require('fs');
const path = require('path');

const fp = path.join(__dirname, 'src/components/dashboards/DashInfluencer.jsx');

// Read as buffer first to check encoding
const buf = fs.readFileSync(fp);

// Check for BOM
const hasBOM = buf[0] === 0xFF && buf[1] === 0xFE; // UTF-16 LE BOM
const hasUTF16 = buf[0] === 0xFF || (buf.length > 2 && buf[2] === 0x00);

console.log(`File size: ${buf.length} bytes`);
console.log(`Has UTF-16 BOM: ${hasBOM}`);
console.log(`First 10 bytes: ${[...buf.slice(0,10)].map(b => b.toString(16)).join(' ')}`);

let content;
if (hasBOM || hasUTF16) {
  // PowerShell wrote it as UTF-16 LE
  content = buf.toString('utf16le');
  // Remove BOM if present
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
  console.log('Decoded as UTF-16 LE');
} else {
  content = buf.toString('utf-8');
  // Remove BOM if present
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
  console.log('Decoded as UTF-8');
}

// Remove currPrefix entries that were already handled
content = content.replace(/ currPrefix:'[^']*',/g, '');
content = content.replace(/ currPrefix:"[^"]*",/g, '');

// Write back as UTF-8 (no BOM)
fs.writeFileSync(fp, content, 'utf-8');
console.log(`Saved as UTF-8. New size: ${fs.statSync(fp).size} bytes`);
console.log('Done!');
