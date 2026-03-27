const fs = require('fs');
const glob = require('fs').readdirSync;
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') walk(path.join(dir, file), fileList);
    } else if (file.endsWith('.jsx')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const files = walk(path.join(__dirname, 'src', 'components', 'dashboards'));

let changedFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace array literals assigned to UPPERCASE constants
  // Like `const AGE_DATA = [ { l: '18-24', v: 38 }, ... ];`
  content = content.replace(/const ([A-Z_]+)\s*=\s*\[[\s\S]*?\];/g, (match, p1) => {
    // exclude global constants we need
    if (p1 === 'COLORS' || p1 === 'KPI_META' || p1 === 'TABS') return match;
    return `const ${p1} = [];`;
  });

  // Replace object literals assigned to UPPERCASE constants
  content = content.replace(/const ([A-Z_]+)\s*=\s*\{[\s\S]*?\};/g, (match, p1) => {
    if (p1 === 'FONT' || p1 === 'CH_COLS' || p1 === 'COLORS') return match;
    return `const ${p1} = {};`;
  });

  // Zero out seeds
  content = content.replace(/const seedRevenue\s*=\s*[0-9]+;/g, 'const seedRevenue = 0;');
  content = content.replace(/const seedOrders\s*=\s*[0-9]+;/g, 'const seedOrders = 0;');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log('Cleaned mock data in:', path.basename(file));
  }
}

// Modify ChartUtils seedSeries
const chartUtilsPath = path.join(__dirname, 'src', 'components', 'dashboards', 'ChartUtils.jsx');
if (fs.existsSync(chartUtilsPath)) {
  let cu = fs.readFileSync(chartUtilsPath, 'utf8');
  cu = cu.replace(/export function seedSeries[^{]*?\{[\s\S]*?\n\}/, 'export function seedSeries(base, len = 20, vol = 0.12) {\n    return Array.from({ length: len }, () => 0);\n}');
  fs.writeFileSync(chartUtilsPath, cu, 'utf8');
  console.log('Zeroed seedSeries in ChartUtils.jsx');
}

console.log(`Finished processing ${changedFiles} files.`);
