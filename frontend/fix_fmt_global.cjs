/**
 * fix_fmt_global.cjs
 * 파일에서 useCurrency import가 있지만 hook 선언(const { fmt } = useCurrency())이 
 * 없어서 fmt가 scope에 없는 경우 → globalFmt import로 교체
 */
const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src/pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx') || f.endsWith('.js'));

let fixed = 0;

for (const f of files) {
    const fp = path.join(pagesDir, f);
    let c = fs.readFileSync(fp, 'utf8');
    const orig = c;

    const hasFmtCall = c.includes('fmt(');
    if (!hasFmtCall) continue;

    // Check if fmt is properly declared (inside a component via hook)
    const hasHookDecl = /const\s*\{[^}]*\bfmt\b/.test(c);
    // Check for local fmt helper function (not from useCurrency)
    const hasLocalFmt = /const\s+fmt\s*=\s*(?!useCurrency)/.test(c) && !c.includes('useCurrency()');
    
    if (hasHookDecl || hasLocalFmt) continue; // already fine

    // File has fmt() call but no declaration — add globalFmt import
    const hasGlobalFmtImport = c.includes('globalFmt');
    const hasCurrencyImport = c.includes("from '../contexts/CurrencyContext.jsx'");

    if (!hasGlobalFmtImport) {
        if (hasCurrencyImport) {
            // Already imports from CurrencyContext, just add globalFmt
            c = c.replace(
                /import\s*\{([^}]+)\}\s*from\s*['"]\.\.\/contexts\/CurrencyContext\.jsx['"]/,
                (m, p1) => {
                    if (!p1.includes('globalFmt')) {
                        return m.replace(p1, p1.trimEnd() + ', globalFmt as fmt');
                    }
                    return m;
                }
            );
            // If the above failed (no match), try adding separately
            if (!c.includes('globalFmt')) {
                const allImports = [...c.matchAll(/^import .+[\r\n]/gm)];
                if (allImports.length > 0) {
                    const last = allImports[allImports.length - 1];
                    const pos = last.index + last[0].length;
                    c = c.slice(0, pos) + "import { globalFmt as fmt } from '../contexts/CurrencyContext.jsx';\n" + c.slice(pos);
                }
            }
        } else {
            // No CurrencyContext import at all — add it
            const allImports = [...c.matchAll(/^import .+[\r\n]/gm)];
            if (allImports.length > 0) {
                const last = allImports[allImports.length - 1];
                const pos = last.index + last[0].length;
                c = c.slice(0, pos) + "import { globalFmt as fmt } from '../contexts/CurrencyContext.jsx';\n" + c.slice(pos);
            }
        }
    }

    if (c !== orig) {
        fs.writeFileSync(fp, c, 'utf8');
        console.log('fixed:', f);
        fixed++;
    }
}

console.log('\nTotal:', fixed);
