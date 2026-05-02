const fs = require('fs');
const path = require('path');
const LOCALE_DIR = path.join(__dirname, 'frontend', 'src', 'i18n', 'locales');
const NEW_KEYS = {
    ko: { 'omniChannel.colCommission': '수수료(%)', 'omniChannel.colVatTax': 'VAT/세금(%)' },
    en: { 'omniChannel.colCommission': 'Commission (%)', 'omniChannel.colVatTax': 'VAT/Tax (%)' },
    ja: { 'omniChannel.colCommission': '手数料(%)', 'omniChannel.colVatTax': 'VAT/税金(%)' },
    zh: { 'omniChannel.colCommission': '佣金(%)', 'omniChannel.colVatTax': 'VAT/税(%)' },
    'zh-TW': { 'omniChannel.colCommission': '佣金(%)', 'omniChannel.colVatTax': 'VAT/稅(%)' },
    de: { 'omniChannel.colCommission': 'Provision (%)', 'omniChannel.colVatTax': 'MwSt/Steuer (%)' },
    th: { 'omniChannel.colCommission': 'ค่าคอมมิชชั่น(%)', 'omniChannel.colVatTax': 'VAT/ภาษี(%)' },
    vi: { 'omniChannel.colCommission': 'Hoa hồng (%)', 'omniChannel.colVatTax': 'VAT/Thuế (%)' },
    id: { 'omniChannel.colCommission': 'Komisi (%)', 'omniChannel.colVatTax': 'PPN/Pajak (%)' },
};
let total = 0;
for (const [lang, keys] of Object.entries(NEW_KEYS)) {
    const file = path.join(LOCALE_DIR, `${lang}.js`);
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf-8');
    let injected = 0;
    for (const [dotKey, value] of Object.entries(keys)) {
        const key = dotKey.split('.')[1]; // colCommission, colVatTax
        // Check in omniChannel section
        const searchKey = `colCommission:`;
        if (dotKey.includes('colCommission') && content.includes('omniChannel') && content.match(new RegExp(`omniChannel[\\s\\S]*?${key}:`))) continue;
        if (dotKey.includes('colVatTax') && content.includes('omniChannel') && content.match(new RegExp(`omniChannel[\\s\\S]*?colVatTax:`))) continue;
        // Find omniChannel section - look for a known key like colRevenueShare
        const marker = 'colRevenueShare:';
        const idx = content.indexOf(marker);
        if (idx === -1) continue;
        const lineEnd = content.indexOf('\n', idx);
        if (lineEnd === -1) continue;
        const escaped = value.replace(/'/g, "\\'");
        content = content.slice(0, lineEnd) + `\n        ${key}: '${escaped}',` + content.slice(lineEnd);
        injected++;
    }
    if (injected > 0) { fs.writeFileSync(file, content, 'utf-8'); total += injected; console.log(`✅ ${lang}.js — ${injected}`); }
}
console.log(`📊 Total: ${total}`);
