/**
 * DEFINITIVE Arctic White Fix:
 * 1. Add CSS class 'am-active-tab' to active gradient buttons in AutoMarketing.jsx
 * 2. Add CSS class 'cs-active-tab' to active gradient buttons in CreativeStudioTab.jsx
 * 3. Add CSS rules to protect these buttons from gradient-killing overrides
 * 4. Force hero title/subtitle to be dark text on light background
 */
const fs = require('fs');

// ── Fix 1: CSS — Add protection rules ──
const cssPath = 'd:\\project\\GeniegoROI\\frontend\\src\\styles.css';
let css = fs.readFileSync(cssPath, 'utf8');

const cssProtection = `
/* ══ DEFINITIVE: Protect active gradient buttons from light-theme overrides ══ */
[data-theme="arctic_white"] button.am-active-tab,
[data-theme="pearl_office"] button.am-active-tab,
[data-theme="arctic_white"] button.cs-active-tab,
[data-theme="pearl_office"] button.cs-active-tab {
  color: #ffffff !important;
}
[data-theme="arctic_white"] button.am-inactive-tab,
[data-theme="pearl_office"] button.am-inactive-tab,
[data-theme="arctic_white"] button.cs-inactive-tab,
[data-theme="pearl_office"] button.cs-inactive-tab {
  color: #1e293b !important;
}

/* ══ Hero title/subtitle dark text in light themes ══ */
[data-theme="arctic_white"] .am-hero-title,
[data-theme="pearl_office"] .am-hero-title {
  color: #1e293b !important;
}
[data-theme="arctic_white"] .am-hero-desc,
[data-theme="pearl_office"] .am-hero-desc {
  color: #475569 !important;
}

/* ══ Sub-tab nav area: ensure background and text are both visible ══ */
[data-theme="arctic_white"] .sub-tab-nav,
[data-theme="pearl_office"] .sub-tab-nav {
  background: rgba(245, 247, 250, 0.97) !important;
}
[data-theme="arctic_white"] .sub-tab-nav button,
[data-theme="pearl_office"] .sub-tab-nav button {
  color: #1e293b !important;
}
/* Active sub-tab should be white on colored bg */
[data-theme="arctic_white"] .sub-tab-nav button.am-active-tab,
[data-theme="pearl_office"] .sub-tab-nav button.am-active-tab {
  color: #ffffff !important;
}
`;

// Append at end of CSS
css += cssProtection;
fs.writeFileSync(cssPath, css, 'utf8');
console.log('✅ CSS protection rules appended');

// ── Fix 2: AutoMarketing.jsx — Add className to hero-title, hero-desc, and sub-tab buttons ──
const amPath = 'd:\\project\\GeniegoROI\\frontend\\src\\pages\\AutoMarketing.jsx';
let am = fs.readFileSync(amPath, 'utf8');

// Add className to hero-title
am = am.replace(
  'className="hero-title" style={{ fontSize: 19, fontWeight: 900, color: \'#7c3aed\'',
  'className="hero-title am-hero-title" style={{ fontSize: 19, fontWeight: 900, color: \'#1e293b\''
);

// Add className to hero-desc
am = am.replace(
  'className="hero-desc" style={{ fontSize: 11, color: \'#64748b\'',
  'className="hero-desc am-hero-desc" style={{ fontSize: 11, color: \'#475569\''
);

// Add className to sub-tab buttons (active/inactive)
// Current: <button key={tb.id} onClick={() => setTab(tb.id)} style={{
// Need to add className dynamically
am = am.replace(
  /(<button key=\{tb\.id\} onClick=\{[^}]+\} style=\{\{)/,
  '$1\n                                    className: isActive ? "am-active-tab" : "am-inactive-tab",'
);

// Wait — the button doesn't have className right now. We need to add it differently.
// Actually the replace above doesn't work because JSX spread. Let's fix it properly:

// Re-read to avoid double replacement
am = fs.readFileSync(amPath, 'utf8');

// Fix hero title
am = am.replace(
  'className="hero-title" style={{ fontSize: 19, fontWeight: 900, color: \'#7c3aed\'',
  'className="hero-title am-hero-title" style={{ fontSize: 19, fontWeight: 900, color: \'#1e293b\''
);

// Fix hero desc
am = am.replace(
  'className="hero-desc" style={{ fontSize: 11, color: \'#64748b\'',
  'className="hero-desc am-hero-desc" style={{ fontSize: 11, color: \'#475569\''
);

// Fix sub-tab buttons: add className
// Original: <button key={tb.id} onClick={() => setTab(tb.id)} style={{
// Target: <button key={tb.id} className={isActive ? 'am-active-tab' : 'am-inactive-tab'} onClick={() => setTab(tb.id)} style={{
am = am.replace(
  '<button key={tb.id} onClick={() => setTab(tb.id)} style={{',
  "<button key={tb.id} className={isActive ? 'am-active-tab' : 'am-inactive-tab'} onClick={() => setTab(tb.id)} style={{"
);

fs.writeFileSync(amPath, am, 'utf8');
console.log('✅ AutoMarketing.jsx updated with className');

// ── Fix 3: CreativeStudioTab.jsx — Add className to tab buttons ──
const csPath = 'd:\\project\\GeniegoROI\\frontend\\src\\pages\\CreativeStudioTab.jsx';
let cs = fs.readFileSync(csPath, 'utf8');

// Current: <button key={i} onClick={() => setActiveTab(i)} style={{ 
// Target: <button key={i} className={activeTab === i ? 'cs-active-tab' : 'cs-inactive-tab'} onClick={() => setActiveTab(i)} style={{
cs = cs.replace(
  '<button key={i} onClick={() => setActiveTab(i)} style={{',
  "<button key={i} className={activeTab === i ? 'cs-active-tab' : 'cs-inactive-tab'} onClick={() => setActiveTab(i)} style={{"
);

fs.writeFileSync(csPath, cs, 'utf8');
console.log('✅ CreativeStudioTab.jsx updated with className');

console.log('\n📊 All fixes applied!');
