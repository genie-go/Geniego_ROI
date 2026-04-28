/**
 * Fix hardcoded ₩ symbols in dashboard components.
 * Replace ChartUtils.fmt(val, {prefix:'₩'}) → fmtC(val)
 * where fmtC = useCurrency().fmt
 *
 * Strategy:
 * 1. Add `import { useCurrency } from '../../contexts/CurrencyContext.jsx';` if missing
 * 2. Add `const { fmt: fmtC } = useCurrency();` in main component function
 * 3. Replace `fmt(X, {prefix:'₩'})` → `fmtC(X)`
 * 4. Replace `fmt(X, { prefix:'₩' })` → `fmtC(X)` (with spaces)
 * 5. Replace `₩${X}` patterns → `fmtC(X)` equivalent
 */
const fs = require('fs');
const path = require('path');

const FILES = [
  'DashSalesGlobal.jsx',
  'DashCommerce.jsx',
  'DashChannelKPI.jsx',
];

const DIR = path.join(__dirname, 'src/components/dashboards');

for (const file of FILES) {
  const fp = path.join(DIR, file);
  let code = fs.readFileSync(fp, 'utf-8');
  let changes = 0;

  // 1. Add useCurrency import if missing
  if (!code.includes('useCurrency')) {
    // Find a good insertion point (after existing imports)
    const lastImport = code.lastIndexOf("import ");
    const lineEnd = code.indexOf('\n', lastImport);
    const insertPoint = lineEnd + 1;
    const importLine = "import { useCurrency } from '../../contexts/CurrencyContext.jsx';\n";
    code = code.slice(0, insertPoint) + importLine + code.slice(insertPoint);
    changes++;
    console.log(`  + Added useCurrency import`);
  }

  // 2. Add `const { fmt: fmtC } = useCurrency();` in main component
  //    Find the main export default function
  const mainFuncMatch = code.match(/export\s+default\s+function\s+\w+\([^)]*\)\s*\{/);
  if (mainFuncMatch) {
    const funcStart = code.indexOf(mainFuncMatch[0]);
    const funcBodyStart = funcStart + mainFuncMatch[0].length;
    
    // Check if fmtC already exists
    if (!code.includes('fmtC') || !code.includes('useCurrency()')) {
      // Find where to insert (after the first few lines inside the function)
      const nextLine = code.indexOf('\n', funcBodyStart);
      const insertLine = nextLine + 1;
      const hookLine = "  const { fmt: fmtC } = useCurrency();\n";
      code = code.slice(0, insertLine) + hookLine + code.slice(insertLine);
      changes++;
      console.log(`  + Added fmtC hook in main component`);
    }
  }

  // 3. For DetailPanel and sub-components that also use fmt with ₩,
  //    add useCurrency hook call
  // Find DetailPanel/PlatDetail/CountryDetail that use fmt with prefix:'₩'
  const subFuncs = ['DetailPanel', 'PlatDetail', 'CountryDetail', 'CountryRankList', 'GlobalSummaryPanel'];
  for (const fn of subFuncs) {
    const pattern = new RegExp(`function\\s+${fn}\\s*\\([^)]*\\)\\s*\\{`);
    const match = code.match(pattern);
    if (match && code.indexOf(match[0]) !== -1) {
      const fStart = code.indexOf(match[0]);
      const fBodyStart = fStart + match[0].length;
      // Check if this sub-function's body uses fmt with prefix:'₩'
      const nextBrace = findMatchingBrace(code, fBodyStart - 1);
      const funcBody = code.slice(fBodyStart, nextBrace);
      if ((funcBody.includes("prefix:'₩'") || funcBody.includes('prefix:"₩"') || funcBody.includes('`₩${')) 
          && !funcBody.includes('fmtC')) {
        const nextLine = code.indexOf('\n', fBodyStart);
        const hookLine = `\n  const { fmt: fmtC } = useCurrency();`;
        code = code.slice(0, nextLine) + hookLine + code.slice(nextLine);
        changes++;
        console.log(`  + Added fmtC hook in ${fn}`);
      }
    }
  }

  // 4. Replace all fmt(X, {prefix:'₩'}) and fmt(X, { prefix:'₩' }) → fmtC(X)
  // Handle both spacing variants
  const fmtPatterns = [
    /fmt\(([^,]+),\s*\{\s*prefix\s*:\s*'₩'\s*\}\)/g,
    /fmt\(([^,]+),\s*\{\s*prefix\s*:\s*"₩"\s*\}\)/g,
  ];
  for (const pat of fmtPatterns) {
    const before = code;
    code = code.replace(pat, 'fmtC($1)');
    if (code !== before) {
      const count = (before.match(pat) || []).length;
      changes += count;
      console.log(`  + Replaced ${count} fmt(x, {prefix:'₩'}) → fmtC(x)`);
    }
  }

  // 5. Replace hardcoded `₩${c.cpc}` → fmtC(c.cpc * 1380) or similar
  //    In DashChannelKPI line 45: `₩${c.cpc}` 
  code = code.replace(/`₩\$\{([^}]+)\}`/g, (match, expr) => {
    changes++;
    console.log(`  + Replaced \`₩\${${expr}}\` → fmtC(${expr})`);
    return `fmtC(${expr})`;
  });

  // 6. Replace `₩${p.avgOrd}K` in DashCommerce
  code = code.replace(/`₩\$\{([^}]+)\}K`/g, (match, expr) => {
    changes++;
    console.log(`  + Replaced \`₩\${${expr}}K\` → fmtC(${expr} * 1000)`);
    return `fmtC(${expr} * 1000)`;
  });

  // 7. Replace AOV ₩{c.aov?.toLocaleString() || '0'} in DashSalesGlobal
  code = code.replace(/AOV ₩\{([^}]+)\}/g, (match, expr) => {
    changes++;
    console.log(`  + Replaced AOV ₩{...} pattern`);
    return `AOV {fmtC(${expr.replace(/\?\.toLocaleString\(\)\s*\|\|\s*'0'/, ' || 0')})}`;
  });

  if (changes > 0) {
    fs.writeFileSync(fp, code, 'utf-8');
    console.log(`✅ ${file}: ${changes} changes applied\n`);
  } else {
    console.log(`⏭️ ${file}: no changes needed\n`);
  }
}

function findMatchingBrace(code, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < code.length; i++) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return code.length;
}

console.log('Done!');
