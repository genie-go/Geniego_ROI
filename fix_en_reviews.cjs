const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'frontend/src/i18n/locales');

// Fix keys that need distinct English values but were overwritten by Korean during merge
const FIXES = {
  en: {
    bulkEscalate: "Bulk Escalate Negative Reviews",
    bulkGenReply: "Bulk AI Reply Generation",
    kpiTotal: "TOTAL CHANNELS",
    kpiAvgRating: "AVERAGE RATING",
    kpiNegative: "Negative Reviews",
    kpiNegativeSub: "Immediate Action Required",
    kpiAiReply: "AI Reply Complete",
    kpiAiReplySub: "Total",
    unitItems: "cases",
    unitCount: " ",
    inProgress: "In Progress",
    escalationCount: "Escalated",
    channelRatingTitle: "Channel Rating Overview",
    positive: "Positive",
    negative: "Negative",
    totalCount: "Total",
    negKeywordsTitle: "Negative Keywords Top 5",
    autoAlertActive: "Auto Alert Active",
    autoAlertDesc: "Auto-send to Slack #cs-alerts when negative keywords spike (+10/day)",
    feedTitle: "Review Feed",
    feedSub: "AI Reply Drafts · CS Escalation Support",
    allChannel: "All Channels",
    allSentiment: "All Sentiment",
    filterPositive: "Positive",
    filterNeutral: "Neutral",
    filterNegative: "Negative",
    searchPlaceholder: "Search product/SKU...",
    sentiment_positive: "Positive",
    sentiment_neutral: "Neutral",
    sentiment_negative: "Negative",
    csAssigned: "CS Assigned",
    foundHelpful: "found helpful",
    regenReply: "Regenerate AI Reply",
    draftReply: "AI Reply Draft",
    csEscalate: "CS Escalation",
    hideReply: "Hide Reply",
    showReply: "Show Reply",
    aiGenerated: "AI Generated Reply Draft",
    copy: "Copy",
    aiDisclaimer: "This is an AI-generated draft. Please review before sending.",
    draftGenerated: "AI Reply Generated",
    copied: "Copied to clipboard",
    escalated: "CS Escalation Complete",
    escalationTitle: "Critical Review Alert",
    escalationBody: "Review requiring immediate attention.",
    close: "Close",
  }
};

// Fix en.js
const file = path.join(DIR, 'en.js');
let code = fs.readFileSync(file, 'utf8');

for (const [key, value] of Object.entries(FIXES.en)) {
  // Find key:" inside reviews block and replace value
  const pattern = new RegExp(`(reviews:\\{[^}]*?)${key}:"[^"]*"`, 's');
  // Simple approach: find key:" then replace value
  const keyIdx = code.indexOf(`${key}:"`);
  if (keyIdx < 0) continue;
  
  const openQ = code.indexOf('"', keyIdx + key.length + 1);
  let closeQ = -1;
  for (let i = openQ + 1; i < code.length; i++) {
    if (code[i] === '\\') { i++; continue; }
    if (code[i] === '"') { closeQ = i; break; }
  }
  if (closeQ < 0) continue;
  
  const old = code.substring(openQ + 1, closeQ);
  if (old !== value) {
    code = code.substring(0, openQ + 1) + value + code.substring(closeQ);
    console.log(`Fixed ${key}: "${old}" -> "${value}"`);
  }
}

fs.writeFileSync(file, code, 'utf8');

// Verify
try {
  const fn = new Function(code.replace('export default', 'return'));
  const obj = fn();
  console.log('✅ en.js verified:', Object.keys(obj.reviews || {}).length, 'reviews keys');
  console.log('  bulkEscalate:', obj.reviews?.bulkEscalate);
  console.log('  kpiTotal:', obj.reviews?.kpiTotal);
  console.log('  channelRatingTitle:', obj.reviews?.channelRatingTitle);
} catch (e) {
  console.log('❌ ERROR:', e.message.substring(0, 100));
}
