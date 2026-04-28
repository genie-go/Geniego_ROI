const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXTS = ['.js', '.jsx', '.ts', '.tsx'];

// Mapping of  strings to production replacements (empty or env vars)
const REPLACEMENTS = [
  { pattern: /process.env.TENANT_ID || ''/g, replacement: "process.env.TENANT_ID || ''" },
  { pattern: /process.env.API_KEY || ''/g, replacement: "process.env.API_KEY || ''" },
  { pattern: /process.env.TOKEN || ''/g, replacement: "process.env.TOKEN || ''" },
  { pattern: //gi, replacement: "" }
];

function replaceInFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  REPLACEMENTS.forEach(({ pattern, replacement }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      changed = true;
    }
  });
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`✅ Updated ${file}`);
  }
}

function walk(dir) {
  fs.readdirSync(dir).forEach(entry => {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', '.git', 'public'].includes(entry)) {
        walk(full);
      }
    } else if (EXTS.includes(path.extname(entry))) {
      replaceInFile(full);
    }
  });
}

walk(ROOT);
console.log('✅  data purge completed.');
