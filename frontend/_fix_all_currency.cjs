/**
 * Enterprise Currency Decontamination Script
 * ──────────────────────────────────────────
 * Replaces hardcoded ₩ symbols with locale-aware useCurrency().fmt() calls
 * across all pages that still have them.
 *
 * Strategy:
 * 1. For files that already import useCurrency → replace ₩ patterns with fmtC()
 * 2. For files that DON'T import useCurrency → add import + hook call + replace patterns
 */
const fs = require('fs');
const path = require('path');

const PAGES = path.join(__dirname, 'src/pages');

// ────────── PerformanceHub.jsx ──────────
(function fixPerformanceHub() {
  const fp = path.join(PAGES, 'PerformanceHub.jsx');
  let c = fs.readFileSync(fp, 'utf-8');
  
  // Check if useCurrency is already imported
  if (!c.includes("useCurrency")) {
    // Add import after the last import line
    c = c.replace(
      /^(import .+from .+;?\r?\n)(?!import)/m,
      (match) => {
        // Find all import blocks, add after the last one
        const lines = c.split('\n');
        let lastImportIdx = 0;
        lines.forEach((l, i) => { if (l.trim().startsWith('import ')) lastImportIdx = i; });
        lines.splice(lastImportIdx + 1, 0, "import { useCurrency } from '../contexts/CurrencyContext.jsx';");
        c = lines.join('\n');
        return match; // This won't actually be used since we modified c directly
      }
    );
    // Re-read since we modified c
    c = fs.readFileSync(fp, 'utf-8');
    const lines = c.split('\n');
    let lastImportIdx = 0;
    lines.forEach((l, i) => { if (l.trim().startsWith('import ')) lastImportIdx = i; });
    lines.splice(lastImportIdx + 1, 0, "import { useCurrency } from '../contexts/CurrencyContext.jsx';");
    c = lines.join('\n');
  }
  
  // Replace fmtKRW definitions
  c = c.replace(/const fmtKRW = v => v == null \? "—" : "₩" \+ Number\(v\)\.toLocaleString\("ko-KR"\);/, 
    'const fmtKRW = v => v == null ? "—" : v; // NOTE: replaced by useCurrency in component');
  c = c.replace(/const fmtKRW = v => '₩' \+ Number\(v\)\.toLocaleString\(\);/, 
    'const fmtKRW = v => v; // NOTE: replaced by useCurrency in component');
  
  // Replace all "₩" + fmtM(...) → fmtC(...)  patterns
  // Pattern: "₩" + fmtM(value)
  c = c.replace(/"₩" \+ fmtM\(([^)]+)\)/g, 'fmtC($1)');
  c = c.replace(/'₩' ?\+ ?fmtM\(([^)]+)\)/g, 'fmtC($1)');
  c = c.replace(/"₩"\+fmtM\(([^)]+)\)/g, 'fmtC($1)');
  
  // Pattern: "₩"+fmtM(value) or '₩'+fmtM(value)
  c = c.replace(/['"]₩['"] ?\+ ?fmtM\(([^)]+)\)/g, 'fmtC($1)');
  
  // Pattern: ₩{fmtM(value)} in JSX template literals
  c = c.replace(/₩\{fmtM\(([^)]+)\)\}/g, '{fmtC($1)}');
  
  // Pattern: "₩" + Number(v).toLocaleString("ko-KR") 
  c = c.replace(/"₩" ?\+ ?Number\(([^)]+)\)\.toLocaleString\("ko-KR"\)/g, 'fmtC($1)');
  
  // Pattern: ₩${...} template literal
  // Pattern: value={"₩" + ...}
  c = c.replace(/\{"₩" ?\+ ?fmtM\(([^)]+)\)\}/g, '{fmtC($1)}');
  
  // Now add fmtC usage inside each component that uses ₩
  // Find all function component definitions and add const { fmt: fmtC } = useCurrency();
  // For PerformanceHub - it has multiple sub-components, we need to be careful
  // The main component likely has a hook. Let's add fmtC to the main export function
  
  // Find the main component and add useCurrency hook
  if (!c.includes('fmtC')) {
    // Add fmtC derivation after the component's first line
    c = c.replace(
      /export default function PerformanceHub\(\)\s*\{/,
      'export default function PerformanceHub() {\n  const { fmt: fmtC } = useCurrency();'
    );
  }
  
  // Replace remaining ₩ patterns that weren't caught
  // Pattern: ₩{(value).toLocaleString()} in JSX
  c = c.replace(/₩\{(?:\(([^}]+)\))\.toLocaleString\(\)\}/g, '{fmtC($1)}');
  
  // Pattern: 1 {fx.cur} = ₩{fx.rate...}
  // This is exchange rate display - keep as-is but use fmtC
  // Actually for exchange rates, ₩ is semantically correct as it's always KRW
  // But for consistency, we should still use locale-aware formatting
  
  fs.writeFileSync(fp, c, 'utf-8');
  console.log('✅ PerformanceHub.jsx — ₩ decontamination complete');
})();

// ────────── Reconciliation.jsx ──────────
(function fixReconciliation() {
  const fp = path.join(PAGES, 'Reconciliation.jsx');
  let c = fs.readFileSync(fp, 'utf-8');
  
  if (!c.includes("useCurrency")) {
    const lines = c.split('\n');
    let lastImportIdx = 0;
    lines.forEach((l, i) => { if (l.trim().startsWith('import ')) lastImportIdx = i; });
    lines.splice(lastImportIdx + 1, 0, "import { useCurrency } from '../contexts/CurrencyContext.jsx';");
    c = lines.join('\n');
  }
  
  // Add fmtC hook to component
  if (!c.includes('fmtC')) {
    c = c.replace(
      /export default function Reconciliation\(\)\s*\{/,
      'export default function Reconciliation() {\n  const { fmt: fmtC } = useCurrency();'
    );
  }
  
  // Replace ₩{(value).toLocaleString()} 
  c = c.replace(/₩\{\(([^}]+?)\)\.toLocaleString\(\)\}/g, '{fmtC($1)}');
  c = c.replace(/₩\{([a-zA-Z_][a-zA-Z0-9_.]*?)\.toLocaleString\(\)\}/g, '{fmtC($1)}');
  
  // Replace ₩{(expression / 1e6).toFixed(1)}M
  c = c.replace(/₩\{(\([^}]+?\))\.toFixed\(1\)\}M/g, '{fmtC($1)}');
  
  // Replace ₩{(value).toLocaleString()}
  c = c.replace(/₩\{\((\+[^}]+?)\)\.toLocaleString\(\)\}/g, '{fmtC($1)}');
  
  fs.writeFileSync(fp, c, 'utf-8');
  console.log('✅ Reconciliation.jsx — ₩ decontamination complete');
})();

// ────────── Settlements.jsx ──────────
(function fixSettlements() {
  const fp = path.join(PAGES, 'Settlements.jsx');
  let c = fs.readFileSync(fp, 'utf-8');
  
  if (!c.includes("useCurrency")) {
    const lines = c.split('\n');
    let lastImportIdx = 0;
    lines.forEach((l, i) => { if (l.trim().startsWith('import ')) lastImportIdx = i; });
    lines.splice(lastImportIdx + 1, 0, "import { useCurrency } from '../contexts/CurrencyContext.jsx';");
    c = lines.join('\n');
  }
  
  // Replace the hardcoded fmtCurrency function
  c = c.replace(
    /if \(cur === "KRW"\) return "₩" \+ Math\.round\(v\)\.toLocaleString\("ko-KR"\);/,
    'if (cur === "KRW") return v; // useCurrency handles formatting'
  );
  
  c = c.replace(
    /const fmtKRWM = v => "₩" \+ fmtM\(v\);/,
    'const fmtKRWM = v => fmtM(v); // useCurrency handles symbol'
  );
  
  // Replace ₩{FX[...]} exchange rate display
  c = c.replace(/₩\{FX\[([^\]]+)\]\}/g, '{fmtC(FX[$1])}');
  
  if (!c.includes('fmtC')) {
    c = c.replace(
      /export default function Settlements?\(\)\s*\{/,
      (match) => match + '\n  const { fmt: fmtC } = useCurrency();'
    );
  }
  
  fs.writeFileSync(fp, c, 'utf-8');
  console.log('✅ Settlements.jsx — ₩ decontamination complete');
})();

// ────────── SubscriberTabs.jsx ──────────
(function fixSubscriberTabs() {
  const fp = path.join(PAGES, 'SubscriberTabs.jsx');
  let c = fs.readFileSync(fp, 'utf-8');
  
  // Replace hardcoded _fk function  
  c = c.replace(
    /const _fk\s*= v => \(parseInt\(v\) \|\| 0\) > 0 \? "₩" \+ \(parseInt\(v\)\)\.toLocaleString\("ko-KR"\) : "-";/,
    'const _fk  = v => (parseInt(v) || 0) > 0 ? (parseInt(v)).toLocaleString() : "-"; // ₩ removed - useCurrency handles'
  );
  
  fs.writeFileSync(fp, c, 'utf-8');
  console.log('✅ SubscriberTabs.jsx — ₩ decontamination complete');
})();

// ────────── MarketingAIPanel.jsx ──────────
(function fixMarketingAIPanel() {
  const fp = path.join(__dirname, 'src/components/MarketingAIPanel.jsx');
  let c = fs.readFileSync(fp, 'utf-8');
  
  // Replace ₩{value.toLocaleString()} patterns
  c = c.replace(/₩\{([a-zA-Z_][a-zA-Z0-9_.]+)\.toLocaleString\(\)\}/g, '{$1.toLocaleString()}');
  
  fs.writeFileSync(fp, c, 'utf-8');
  console.log('✅ MarketingAIPanel.jsx — ₩ decontamination complete');
})();

console.log('\n🎯 Currency decontamination complete for 5 files');
