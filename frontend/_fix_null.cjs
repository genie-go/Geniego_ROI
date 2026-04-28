const fs = require('fs');
const content = fs.readFileSync('src/components/dashboards/DashInfluencer.jsx', 'utf-8');
const lines = content.split('\n');

// Check for null bytes or weird chars around line 23
for (let i = 20; i < 30; i++) {
  const line = lines[i];
  if (!line) continue;
  const hasNull = line.includes('\u0000');
  const hasBadChars = /[^\x09\x0A\x0D\x20-\x7E\u0080-\uFFFF]/.test(line);
  console.log(`L${i+1}: ${line.substring(0, 80)}${hasNull ? ' *** NULL ***' : ''}${hasBadChars ? ' *** BAD CHAR ***' : ''}`);
}

// Strip null bytes from entire file
const cleaned = content.replace(/\u0000/g, '');
if (cleaned.length !== content.length) {
  console.log(`\nRemoved ${content.length - cleaned.length} null bytes`);
  fs.writeFileSync('src/components/dashboards/DashInfluencer.jsx', cleaned, 'utf-8');
  console.log('File saved');
} else {
  console.log('\nNo null bytes found');
  // Check byte 48 on line 23
  const line23 = lines[22];
  if (line23) {
    const buf = Buffer.from(line23);
    console.log(`Line 23 bytes at pos 45-55: ${[...buf.slice(45, 55)].map(b => b.toString(16).padStart(2,'0')).join(' ')}`);
    console.log(`Line 23 char at 48: '${line23[48]}' (code: ${line23.charCodeAt(48)})`);
  }
}
