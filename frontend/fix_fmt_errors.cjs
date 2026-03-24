/**
 * fix_fmt_errors.cjs
 * Pages that call fmt() but are missing useCurrency import or hook declaration
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
    const hasUseCurrencyImport = c.includes("from '../contexts/CurrencyContext.jsx'") ||
                                  c.includes('from "../contexts/CurrencyContext.jsx"');
    const hasFmtDecl = /const\s*\{[^}]*\bfmt\b/.test(c) || /const\s+fmt\s*=/.test(c);

    if (!hasFmtCall) continue;

    // 1. Add import if missing
    if (!hasUseCurrencyImport) {
        const allImports = [...c.matchAll(/^import .+[\r\n]/gm)];
        if (allImports.length > 0) {
            const lastMatch = allImports[allImports.length - 1];
            const pos = lastMatch.index + lastMatch[0].length;
            const importLine = "import { useCurrency } from '../contexts/CurrencyContext.jsx';\n";
            c = c.slice(0, pos) + importLine + c.slice(pos);
        }
    }

    // 2. Add hook + destructure if fmt not declared
    if (!hasFmtDecl) {
        // Check if useCurrency() hook already called but fmt not destructured
        const hookMatch = c.match(/const\s*\{([^}]+)\}\s*=\s*useCurrency\(\)/);
        if (hookMatch) {
            // Add fmt to existing destructure
            const existing = hookMatch[1];
            if (!existing.includes('fmt')) {
                c = c.replace(hookMatch[0], hookMatch[0].replace(existing, existing.trimEnd() + ', fmt'));
            }
        } else {
            // Inject new hook into first exported default function
            const patterns = [
                /export default function \w+[^{]*\{/,
                /export function \w+[^{]*\{/,
            ];
            let injected = false;
            for (const pat of patterns) {
                const m = c.match(pat);
                if (m) {
                    const idx = c.indexOf(m[0]) + m[0].length;
                    c = c.slice(0, idx) + '\n  const { fmt } = useCurrency();' + c.slice(idx);
                    injected = true;
                    break;
                }
            }
        }
    }

    if (c !== orig) {
        fs.writeFileSync(fp, c, 'utf8');
        console.log('fixed:', f);
        fixed++;
    }
}

console.log('\nTotal fixed:', fixed);
