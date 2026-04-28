
const { execSync } = require('child_process');
const fs = require('fs');

// Use plink or ssh with password via stdin
// Try using node ssh2 if available, otherwise use expect-like approach
try {
  // Write password to a temp file for sshpass
  const result = execSync(
    'echo y | plink -ssh -pw "vot@Wlroi6!" root@1.201.177.46 "cat /home/wwwroot/roi.geniego.com/frontend/src/layout/Sidebar.jsx"',
    { maxBuffer: 50 * 1024 * 1024, encoding: 'utf8', timeout: 30000 }
  );
  fs.writeFileSync('src/layout/Sidebar.jsx', result, 'utf8');
  console.log('Successfully restored Sidebar.jsx via plink!');
} catch (e) {
  console.log('plink failed:', e.message.substring(0, 200));
  console.log('\nTrying powershell alternative...');
  
  try {
    // Try curl approach - download from demo server
    const result2 = execSync(
      'echo y | plink -ssh -pw "vot@Wlroi6!" root@1.201.177.46 "base64 /home/wwwroot/roi.geniego.com/frontend/src/layout/Sidebar.jsx"',
      { maxBuffer: 50 * 1024 * 1024, encoding: 'utf8', timeout: 30000 }
    );
    const buf = Buffer.from(result2.trim(), 'base64');
    fs.writeFileSync('src/layout/Sidebar.jsx', buf);
    console.log('Successfully restored Sidebar.jsx via base64!');
  } catch (e2) {
    console.log('base64 also failed:', e2.message.substring(0, 200));
  }
}
