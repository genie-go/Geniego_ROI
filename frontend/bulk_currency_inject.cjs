/**
 * bulk_currency_inject.cjs
 * 모든 파일에서 "const KRW = v => '₩' + ..." 패턴을 useCurrency로 교체
 * 
 * 전략:
 * 1. const KRW = ... (또는 const krwFmt = ...) 로컬 헬퍼 함수를 제거
 * 2. useCurrency import 추가
 * 3. 컴포넌트 내부 최상단에 const { fmt } = useCurrency(); 추가
 * 4. KRW(x), krwFmt(x) 호출을 fmt(x) 로 교체
 */
const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src/pages');

const KRW_TARGETS = [
    'Marketing.jsx', 'KrChannel.jsx', 'PriceOpt.jsx', 'OrderHub.jsx',
    'InfluencerUGC.jsx', 'AIInsights.jsx', 'Pricing.jsx',
    'CampaignManager.jsx', 'MarketingIntelligence.jsx', 'OmniChannel.jsx',
    'WmsManager.jsx', 'AutoMarketing.jsx', 'PaymentSuccess.jsx',
    'TierPricingTab.jsx', 'SmsMarketing.jsx', 'AIMarketingHub.jsx',
    'DemandForecast.jsx', 'AsiaLogistics.jsx', 'ReturnsPortal.jsx',
    'SupplyChain.jsx', 'PnLDashboard.jsx',
];

let changed = 0;

for (const fname of KRW_TARGETS) {
    const filePath = path.join(pagesDir, fname);
    if (!fs.existsSync(filePath)) continue;
    
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // Skip if already uses useCurrency properly (has both import and hook)
    const alreadyImported = content.includes("from '../contexts/CurrencyContext.jsx'") ||
                             content.includes('from "../contexts/CurrencyContext.jsx"');
    const alreadyHooked = content.includes('useCurrency()');
    
    // Step 1: Find the KRW helper function name(s) in this file
    const krwHelperMatches = content.match(/const\s+(KRW|krwFmt|krwFormat|fmtKrw|formatKrw|won)\s*=\s*(?:v\s*=>|function)[^;]+;/g) || [];
    if (krwHelperMatches.length === 0 && alreadyHooked) continue; // already fixed
    
    const helperNames = new Set();
    for (const m of krwHelperMatches) {
        const nm = m.match(/const\s+(\w+)/)?.[1];
        if (nm) helperNames.add(nm);
    }
    if (helperNames.size === 0) continue;
    
    // Step 2: Add import if missing
    if (!alreadyImported) {
        // Find last import line and insert after
        const importRegex = /^import .+ from .+;?$/m;
        const allImports = [...content.matchAll(/^import .+ from .+;?$/gm)];
        if (allImports.length > 0) {
            const lastImport = allImports[allImports.length - 1];
            const insertPos = lastImport.index + lastImport[0].length;
            content = content.slice(0, insertPos) + 
                      "\nimport { useCurrency } from '../contexts/CurrencyContext.jsx';" +
                      content.slice(insertPos);
        }
    }
    
    // Step 3: Remove hardcoded KRW helper(s)
    for (const m of krwHelperMatches) {
        content = content.replace(m, '// currency formatting via useCurrency fmt()');
    }
    
    // Step 4: For each exported/major component function, inject the hook
    if (!alreadyHooked) {
        // Find first "export default function" or "export function" or React component
        const compPatterns = [
            /export default function \w+[^{]*\{/,
            /export function \w+[^{]*\{/,
            /export const \w+ = \([^)]*\) => \{/,
            /export const \w+ = \(\) => \{/,
        ];
        
        let injected = false;
        for (const pat of compPatterns) {
            const m = content.match(pat);
            if (m) {
                const idx = content.indexOf(m[0]) + m[0].length;
                content = content.slice(0, idx) + 
                          '\n    const { fmt } = useCurrency();' +
                          content.slice(idx);
                injected = true;
                break;
            }
        }
        
        // Fallback: find "function X(" or "const X = " at top level
        if (!injected) {
            const topFunc = content.match(/^(?:function|const) (\w+)[^=\n]*(=.*?)?\{/m);
            if (topFunc) {
                const idx = content.indexOf(topFunc[0]) + topFunc[0].length;
                content = content.slice(0, idx) + 
                          '\n    const { fmt } = useCurrency();' +
                          content.slice(idx);
            }
        }
    }
    
    // Step 5: Replace KRW(x), KRW(val) callsites with fmt(x)
    for (const nm of helperNames) {
        // Replace function call patterns
        const callRe = new RegExp(`\\b${nm}\\s*\\(`, 'g');
        content = content.replace(callRe, 'fmt(');
    }
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ ${fname} — replaced: [${[...helperNames].join(', ')}]`);
        changed++;
    }
}

console.log(`\nTotal changed: ${changed}`);
