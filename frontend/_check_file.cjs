// Re-apply the currPrefix removal and useCurrency migration using Node.js (safe UTF-8)
const fs = require('fs');
const path = require('path');

const fp = path.join(__dirname, 'src/components/dashboards/DashInfluencer.jsx');

// The file was corrupted by PowerShell's Set-Content which destroyed the encoding
// We need to check if the file is readable first
let content;
try {
  content = fs.readFileSync(fp, 'utf-8');
  // Check if the content looks corrupted
  const line22 = content.split('\n')[21];
  if (line22 && line22.includes('실시간')) {
    console.log('File appears to be valid UTF-8');
  } else {
    console.log('File is corrupted, checking for backup...');
    // Check if there's a cached build that had the working version
    throw new Error('File corrupted');
  }
} catch(e) {
  console.log('ERROR: File is corrupted and needs manual restoration');
  console.log(e.message);
  process.exit(1);
}
