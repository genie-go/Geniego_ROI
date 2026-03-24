/**
 * final_fix.cjs
 * Directly patches AIPrediction.jsx to add const { t } = useI18n()
 * Also checks AIRecommendTab locale key lookup issue
 */
const fs = require('fs');

// === FIX 1: AIPrediction.jsx - add useI18n hook ===
let ai = fs.readFileSync('src/pages/AIPrediction.jsx', 'utf8');
const before = ai;

// Find the exact text pattern with \r\n
if (!ai.includes("const { t } = useI18n()")) {
  // Try different line ending patterns
  const patterns = [
    "    const navigate = useNavigate();\r\n\r\n    const [activeTab",
    "    const navigate = useNavigate();\n\n    const [activeTab",
    "    const navigate = useNavigate();\r\n    const [activeTab",
  ];
  
  for (const p of patterns) {
    if (ai.includes(p)) {
      const replacement = p.replace(
        "    const navigate = useNavigate();",
        "    const navigate = useNavigate();\r\n    const { t } = useI18n();"
      );
      ai = ai.replace(p, replacement);
      console.log('Pattern matched and replaced!');
      break;
    }
  }
  
  if (!ai.includes("const { t } = useI18n()")) {
    // Manual character-level search
    const target = 'const navigate = useNavigate();';
    const funcIdx = ai.indexOf('function AIPredictionInner()');
    const navIdx = ai.indexOf(target, funcIdx);
    if (navIdx > 0) {
      const insertPos = navIdx + target.length;
      ai = ai.slice(0, insertPos) + '\r\n    const { t } = useI18n();' + ai.slice(insertPos);
      console.log('Inserted at position', insertPos);
    }
  }
  
  console.log('t() count after fix:', (ai.match(/const \{ t \} = useI18n\(\)/g)||[]).length);
} else {
  console.log('AIPrediction already has t()');
}

// Also add t() to CustomerDetailPanel since it uses t() in JSX
const cpTarget = "function CustomerDetailPanel({ customer, onClose, onAction }) {";
const cpIdx = ai.indexOf(cpTarget);
if (cpIdx > 0) {
  const afterCp = ai.indexOf("const [tab, setTab]", cpIdx);
  const insertBefore = ai.slice(cpIdx, afterCp);
  if (!insertBefore.includes("const { t } = useI18n()")) {
    ai = ai.slice(0, afterCp) + "const { t } = useI18n();\r\n    " + ai.slice(afterCp);
    console.log('Added t() to CustomerDetailPanel');
  }
}

fs.writeFileSync('src/pages/AIPrediction.jsx', ai, 'utf8');
console.log('AIPrediction.jsx saved');

// === FIX 2: Check why AIRecommendTab shows raw keys ===
// The t() function is there, locale has keys - check if keys are exported correctly
const ja = fs.readFileSync('src/i18n/locales/ja.js', 'utf8');

// Check if aiRec appears BEFORE export default
const exportIdx = ja.lastIndexOf('export default');
const airIdx = ja.indexOf('aiRec:');
console.log('\naiRec position:', airIdx, '| export default position:', exportIdx);
console.log('aiRec is before export?', airIdx > 0 && airIdx < exportIdx);

// If aiRec is AFTER export default, it won't be in the exported object
if (airIdx > exportIdx && exportIdx > 0) {
  console.log('PROBLEM: aiRec keys are AFTER export default! Need to move them inside the object.');
}

// Show the structure around export default
console.log('\nLast 300 chars before export:');
console.log(ja.slice(exportIdx - 300, exportIdx + 50));
