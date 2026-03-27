const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'dashboards');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

const ZERO_ARRAYS = [
  'AGE_DATA', 'TOP_BUYERS', 'AUDIENCE', 'MAP_PINS',
  'INVENTORY', 'RETURNS', 'REGIONS', 'TRENDS'
];

for (const file of files) {
  const fp = path.join(dir, file);
  let c = fs.readFileSync(fp, 'utf8');
  let orig = c;

  ZERO_ARRAYS.forEach(k => {
    const reg = new RegExp(`const ${k}\\s*=\\s*\\[[\\s\\S]*?\\];`);
    c = c.replace(reg, `const ${k} = [];`);
  });

  c = c.replace(/const seedRevenue\s*=\s*[0-9.]+;/g, 'const seedRevenue = 0;');
  c = c.replace(/const seedOrders\s*=\s*[0-9.]+;/g, 'const seedOrders = 0;');
  c = c.replace(/const seedSpend\s*=\s*[0-9.]+;/g, 'const seedSpend = 0;');
  c = c.replace(/const seedCPA\s*=\s*[0-9.]+;/g, 'const seedCPA = 0;');
  c = c.replace(/const seedROAS\s*=\s*[0-9.]+;/g, 'const seedROAS = 0;');

  if (orig !== c) {
    fs.writeFileSync(fp, c, 'utf8');
    console.log(`Scrubbed ${file}`);
  }
}

// ChartUtils
const cu = path.join(dir, 'ChartUtils.jsx');
let chartUtils = fs.readFileSync(cu, 'utf8');
chartUtils = chartUtils.replace(/export function seedSeries[^{]*?\{[\s\S]*?\n\}/, 'export function seedSeries(b, l=20, v=0) {\n    return Array(l).fill(0);\n}');
fs.writeFileSync(cu, chartUtils, 'utf8');
console.log('Zeroed ChartUtils.jsx');

// Connectors mock feed
const conn = path.join(__dirname, 'src', 'pages', 'Connectors.jsx');
if (fs.existsSync(conn)) {
  let co = fs.readFileSync(conn, 'utf8');
  co = co.replace(/const WEBHOOK_FEED_MOCK \s*=\s*\[[\s\S]*?\];/, 'const WEBHOOK_FEED_MOCK = [];');
  fs.writeFileSync(conn, co, 'utf8');
}
