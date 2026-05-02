const fs = require('fs');
const c = fs.readFileSync('frontend/src/layout/Sidebar.jsx', 'utf8');

// Extract menu structure from sidebar
const menuMatches = c.match(/label:\s*t\([^)]+\)/g) || [];
console.log('Sidebar menu items with i18n:', menuMatches.length);

// Check for PlanGate usage
const pages = fs.readdirSync('frontend/src/pages').filter(f => f.endsWith('.jsx'));
const planGatePages = [];
const noPlanGatePages = [];
pages.forEach(f => {
  const fc = fs.readFileSync('frontend/src/pages/' + f, 'utf8');
  if (/PlanGate/.test(fc)) planGatePages.push(f);
  else if (fc.split('\n').length > 100) noPlanGatePages.push(f);
});
console.log('\nPages with PlanGate subscription guard:', planGatePages.length);
planGatePages.forEach(p => console.log('  ' + p));

// Check BroadcastChannel sync
console.log('\n=== CROSS-TAB SYNC (BroadcastChannel) ===');
pages.forEach(f => {
  const fc = fs.readFileSync('frontend/src/pages/' + f, 'utf8');
  if (/BroadcastChannel/.test(fc)) console.log('  ' + f);
});

// Token handling check
console.log('\n=== TOKEN/AUTH USAGE ===');
let tokenPages = 0;
pages.forEach(f => {
  const fc = fs.readFileSync('frontend/src/pages/' + f, 'utf8');
  if (/genie_token|g_token|Bearer/.test(fc)) tokenPages++;
});
console.log('Pages using auth tokens:', tokenPages);

// Check for memory leaks (setInterval without cleanup)
console.log('\n=== POTENTIAL MEMORY LEAKS (setInterval without clearInterval) ===');
pages.forEach(f => {
  const fc = fs.readFileSync('frontend/src/pages/' + f, 'utf8');
  const setCount = (fc.match(/setInterval/g) || []).length;
  const clearCount = (fc.match(/clearInterval/g) || []).length;
  if (setCount > 0 && clearCount < setCount) {
    console.log(`  ${f}: ${setCount} setInterval, ${clearCount} clearInterval`);
  }
});
