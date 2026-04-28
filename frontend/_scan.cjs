/**
 * Batch file scanner — identifies ALL files with excess </div> at tail
 * These are files where the universal fixer removed lines it shouldn't have
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PAGES = path.join(__dirname, 'src/pages');
const files = fs.readdirSync(PAGES).filter(f => f.endsWith('.jsx'));

console.log('═══ Scanning ALL JSX files for structural damage ═══\n');

const damaged = [];

for (const file of files) {
  const fp = path.join(PAGES, file);
  const c = fs.readFileSync(fp, 'utf8');
  const lines = c.split('\n');
  
  // Check tail structure - look for excess </div> chains
  const tail = lines.slice(-20).map(l => l.trim()).filter(l => l);
  const tailDivs = tail.filter(l => l === '</div>').length;
  const totalDivOpens = (c.match(/<div[\s>]/g) || []).length - (c.match(/<div[^>]*\/>/g) || []).length;
  const totalDivCloses = (c.match(/<\/div>/g) || []).length;
  const diff = totalDivCloses - totalDivOpens;
  
  if (diff !== 0 || tailDivs > 5) {
    console.log(`⚠️  ${file}: opens=${totalDivOpens} closes=${totalDivCloses} diff=${diff} tail-divs=${tailDivs}`);
    damaged.push(file);
  }
}

if (damaged.length === 0) {
  console.log('✅ No structurally damaged files detected');
} else {
  console.log(`\n${damaged.length} files may need fixing: ${damaged.join(', ')}`);
}

// Also run a quick build to see the current error
console.log('\n═══ Current build error ═══');
try {
  execSync('node node_modules/vite/bin/vite.js build', { cwd: path.join(__dirname), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  console.log('✅ Build succeeded!');
} catch (err) {
  const msg = (err.stdout || '') + (err.stderr || '');
  const m = msg.match(/([^\s:]+\.jsx):(\d+):\d+: ERROR: (.+)/);
  if (m) console.log(`${m[1]}:${m[2]} — ${m[3]}`);
  else console.log(msg.substring(0, 300));
}
