const fs = require('fs');

let c = fs.readFileSync('src/pages/Pricing.jsx', 'utf8');

// Find and fix the badge rendering logic
// Current: {detail.badge || plan.badge}
// Fix: use detail.badge from getPlanDetail(t) which is already i18n'd
// The issue is that plan.badge from the server takes precedence via a rendering order
// Solution: use ONLY detail.badge (since it's now i18n'd), completely ignore plan.badge for display
// Also fix the condition to show badge

const OLD_BADGE_COND = '{(plan.badge || detail.badge) && (';
const NEW_BADGE_COND = '{detail.badge && (';

if (c.includes(OLD_BADGE_COND)) {
  c = c.replace(OLD_BADGE_COND, NEW_BADGE_COND);
  console.log('✅ Fixed badge condition to use only detail.badge (i18n)');
} else {
  // The condition might have been changed already
  console.log('Looking for badge condition...');
  const lines = c.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('badge') && l.includes('&&')) {
      console.log(i+1, ':', l.slice(0, 150));
    }
  });
}

// Also keep the display as detail.badge (already changed to detail.badge || plan.badge)
// Just confirm no plan.badge in display
const displayLine = c.includes('{detail.badge || plan.badge}') 
  ? 'detail.badge || plan.badge found' 
  : (c.includes('{detail.badge}') ? 'detail.badge only ✅' : 'badge display not found');
console.log('badge display:', displayLine);

fs.writeFileSync('src/pages/Pricing.jsx', c, 'utf8');
console.log('✅ Saved');
