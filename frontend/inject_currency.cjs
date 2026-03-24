/**
 * inject_currency.cjs
 * 핵심 금액 표시 페이지들에 useCurrency import + fmt() 적용
 * - "const KRW = v => ..." 패턴 → useCurrency().fmt()로 교체
 * - "₩" + n.toLocaleString() 패턴 → fmt(n) 로 교체
 */
const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src/pages');

// 파일별 처리 규칙
const TARGETS = [
    // BudgetPlanner: const KRW = v => "₩" + ... 패턴
    {
        file: 'BudgetPlanner.jsx',
        addImport: true,
        addHook: true,
        hookName: 'fmt',
        replacements: [
            ['const KRW = v => "₩" + Number(v || 0).toLocaleString();', '// KRW formatter replaced by useCurrency fmt()'],
            // Where KRW() is called, replace with fmt()
            [/\bKRW\(([^)]+)\)/g, 'fmt($1)'],
        ]
    },
    {
        file: 'PnLDashboard.jsx',
        addImport: true,
        addHook: true,
        hookName: 'fmt',
        replacements: [
            [/₩\$\{([^}]+)\.toLocaleString\([^)]*\)\}/g, '${fmt($1)}'],
            [/`₩\$\{([^}]+)\}`/g, '`${fmt($1)}`'],
            [/"₩" \+ ([^;,\n)]+)\.toLocaleString\([^)]*\)/g, 'fmt($1)'],
            [/'₩' \+ ([^;,\n)]+)\.toLocaleString\([^)]*\)/g, 'fmt($1)'],
        ]
    },
];

// Generic: 모든 페이지에서 ₩hardcoded 패턴 범용 치환
const ALL_FILES_REPLACEMENTS = [
    // "₩" + n.toLocaleString() → use fmt if available, else leave
    // We'll just add the import and hook to key files and replace patterns
];

let changed = 0;

for (const target of TARGETS) {
    const filePath = path.join(pagesDir, target.file);
    if (!fs.existsSync(filePath)) { console.log('NOT FOUND:', target.file); continue; }
    
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // Add import if not present
    if (target.addImport && !content.includes('useCurrency')) {
        // Find last import line
        const importLines = content.split('\n').filter(l => l.trim().startsWith('import '));
        if (importLines.length > 0) {
            const lastImport = importLines[importLines.length - 1];
            content = content.replace(
                lastImport,
                lastImport + "\nimport { useCurrency } from '../contexts/CurrencyContext.jsx';"
            );
        }
    }
    
    // Add hook if not present  
    if (target.addHook && !content.includes('useCurrency()')) {
        // Find the first function/component that uses JSX (return)
        // Insert hook after first "function X" or "const X = " component
        const componentMatch = content.match(/^export (default function|function) (\w+)[^{]*\{/m) ||
                               content.match(/^(const|function) (\w+)[^=]*=.*\(.*\)\s*=>\s*\{/m);
        if (componentMatch) {
            const idx = content.indexOf(componentMatch[0]) + componentMatch[0].length;
            content = content.slice(0, idx) + `\n    const { fmt } = useCurrency();` + content.slice(idx);
        }
    }
    
    // Apply replacements
    for (const [from, to] of target.replacements) {
        if (from instanceof RegExp) {
            content = content.replace(from, to);
        } else {
            content = content.split(from).join(to);
        }
    }
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('✓ Updated:', target.file);
        changed++;
    } else {
        console.log('~ No change:', target.file);
    }
}

console.log('\nFiles changed:', changed);

// Also scan for any "KRW(" usages in all pages
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));
const withKrwFn = [];
for (const f of files) {
    const c = fs.readFileSync(path.join(pagesDir, f), 'utf8');
    if (/const KRW\s*=/.test(c)) {
        withKrwFn.push(f);
    }
}
if (withKrwFn.length > 0) {
    console.log('\nFiles still using const KRW helper:', withKrwFn);
}
