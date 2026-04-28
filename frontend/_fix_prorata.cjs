const fs = require('fs');
const file = 'd:\\project\\GeniegoROI\\frontend\\src\\pages\\Marketing.jsx';
let c = fs.readFileSync(file, 'utf8');

const old = [
  '        const valid = sharedCampaigns.filter(c => {',
  '            const cStart = new Date(c.startDate ).getTime();',
  '            const cEnd = new Date(c.endDate ).getTime();',
  '            // Overlap condition: adStart <= filterEnd AND adEnd >= filterStart',
  '            return cStart <= eTime && cEnd >= sTime;',
  '        });',
  '        ',
  '        // No mock data allowed per user requirement',
  '        if (valid.length === 0) {',
  '            return [];',
  '        }',
  '        return valid;',
].join('\r\n');

const nw = [
  '        const valid = sharedCampaigns.filter(c => {',
  '            const cStart = new Date(c.startDate ).getTime();',
  '            const cEnd = new Date(c.endDate ).getTime();',
  '            return cStart <= eTime && cEnd >= sTime;',
  '        }).map(c => {',
  '            // Pro-rate metrics based on date overlap ratio',
  '            const cStart = new Date(c.startDate).getTime();',
  '            const cEnd = new Date(c.endDate).getTime();',
  '            const campDays = Math.max(1, (cEnd - cStart) / 86400000);',
  '            const oStart = Math.max(sTime, cStart);',
  '            const oEnd = Math.min(eTime, cEnd);',
  '            const oDays = Math.max(0, (oEnd - oStart) / 86400000);',
  '            const ratio = Math.min(1, oDays / campDays);',
  '            return {',
  '                ...c,',
  '                spent: Math.round((c.spent || 0) * ratio),',
  '                impressions: Math.round((c.impressions || 0) * ratio),',
  '                clicks: Math.round((c.clicks || 0) * ratio),',
  '                reach: Math.round((c.reach || 0) * ratio),',
  '                conv: Math.round((c.conv || 0) * ratio),',
  '            };',
  '        });',
  '        ',
  '        if (valid.length === 0) {',
  '            return [];',
  '        }',
  '        return valid;',
].join('\r\n');

if (c.includes(old)) {
  c = c.replace(old, nw);
  fs.writeFileSync(file, c, 'utf8');
  console.log('✅ Pro-rata date overlap fix applied!');
} else {
  console.log('❌ Target not found');
  // Debug: show nearby content
  const idx = c.indexOf('sharedCampaigns.filter');
  if (idx > 0) console.log('Found filter at:', idx, c.substring(idx, idx+200));
}
