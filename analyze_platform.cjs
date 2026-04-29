const fs = require('fs');
const p = require('path');
const dir = 'frontend/src/pages';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx') || f.endsWith('.js'));
const results = [];

files.forEach(f => {
  const c = fs.readFileSync(p.join(dir, f), 'utf8');
  const lines = c.split('\n').length;
  const hasI18n = /useI18n|useT|from ['"]\.\.\/i18n/.test(c);
  const hasDemo = /_isDemo|isDemo|isDemoMode/.test(c);
  const hasSecurity = /SecurityGuard|THREAT|XSS|CSRF|sanitize/.test(c);
  const isStub = lines < 50;
  const hasHardKo = /[가-힣]{3,}/.test(c) && !f.includes('I18n');
  const hasExport = /export default/.test(c);
  const hasGlobalData = /useGlobalData/.test(c);
  results.push({ f, lines, hasI18n, hasDemo, hasSecurity, isStub, hasHardKo, hasExport, hasGlobalData });
});

results.sort((a, b) => b.lines - a.lines);

// Summary stats
const total = results.length;
const stubs = results.filter(r => r.isStub).length;
const withI18n = results.filter(r => r.hasI18n).length;
const withDemo = results.filter(r => r.hasDemo).length;
const withSec = results.filter(r => r.hasSecurity).length;
const withKo = results.filter(r => r.hasHardKo && !r.isStub).length;

console.log('=== PLATFORM ANALYSIS SUMMARY ===');
console.log(`Total pages: ${total}`);
console.log(`Stub/placeholder pages (<50 lines): ${stubs}`);
console.log(`Pages with i18n: ${withI18n}`);
console.log(`Pages with demo guard: ${withDemo}`);
console.log(`Pages with security features: ${withSec}`);
console.log(`Non-stub pages with hardcoded Korean: ${withKo}`);
console.log('');

console.log('=== STUB PAGES (need implementation) ===');
results.filter(r => r.isStub).forEach(r => console.log(`  ${r.f} (${r.lines} lines)`));
console.log('');

console.log('=== PAGES WITHOUT I18N (non-stub, non-admin) ===');
const adminPages = ['Admin.jsx','SubscriberTabs.jsx','UserManagement.jsx','TierPricingTab.jsx','PgConfig.jsx','DbAdmin.jsx','MenuAccessManager.jsx','MenuAccessPanel.jsx'];
results.filter(r => !r.isStub && !r.hasI18n && !adminPages.includes(r.f)).forEach(r => console.log(`  ${r.f} (${r.lines} lines)`));
console.log('');

console.log('=== PAGES WITHOUT DEMO GUARD (non-stub) ===');
results.filter(r => !r.isStub && !r.hasDemo && r.hasGlobalData).forEach(r => console.log(`  ${r.f} (${r.lines} lines, has GlobalData)`));
console.log('');

console.log('=== TOP 30 PAGES BY SIZE ===');
results.slice(0, 30).forEach(r => {
  const flags = [];
  if (r.hasI18n) flags.push('i18n');
  if (r.hasDemo) flags.push('demo');
  if (r.hasSecurity) flags.push('sec');
  if (r.isStub) flags.push('STUB');
  if (r.hasHardKo) flags.push('KO');
  console.log(`  ${r.f.padEnd(38)} ${String(r.lines).padStart(5)} lines  [${flags.join(',')}]`);
});
