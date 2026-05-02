const fs = require('fs');
const path = require('path');
const LOCALE_DIR = path.join(__dirname, 'frontend', 'src', 'i18n', 'locales');

const KEYS = {
    ko: { colCommission: '수수료(%)', colVatTax: 'VAT/세금(%)' },
    en: { colCommission: 'Commission (%)', colVatTax: 'VAT/Tax (%)' },
    ja: { colCommission: '手数料(%)', colVatTax: 'VAT/税金(%)' },
    zh: { colCommission: '佣金(%)', colVatTax: 'VAT/税(%)' },
    'zh-TW': { colCommission: '佣金(%)', colVatTax: 'VAT/稅(%)' },
    de: { colCommission: 'Provision (%)', colVatTax: 'MwSt/Steuer (%)' },
    th: { colCommission: 'ค่าคอมมิชชั่น(%)', colVatTax: 'VAT/ภาษี(%)' },
    vi: { colCommission: 'Hoa hồng (%)', colVatTax: 'VAT/Thuế (%)' },
    id: { colCommission: 'Komisi (%)', colVatTax: 'PPN/Pajak (%)' },
};

let total = 0;
for (const [lang, keys] of Object.entries(KEYS)) {
    const file = path.join(LOCALE_DIR, `${lang}.js`);
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf-8');
    let injected = 0;

    // Find omniChannel section boundaries precisely
    const omniStart = content.indexOf('"omniChannel"');
    if (omniStart === -1) { console.log(`⚠️ ${lang}.js: no omniChannel`); continue; }

    const omniObjStart = content.indexOf('{', omniStart);
    let depth = 0, omniObjEnd = -1;
    for (let i = omniObjStart; i < content.length; i++) {
        if (content[i] === '{') depth++;
        if (content[i] === '}') { depth--; if (depth === 0) { omniObjEnd = i; break; } }
    }
    if (omniObjEnd === -1) { console.log(`⚠️ ${lang}.js: can't find omniChannel end`); continue; }

    let omniBlock = content.substring(omniObjStart, omniObjEnd + 1);

    for (const [key, value] of Object.entries(keys)) {
        if (omniBlock.includes(`"${key}"`)) continue; // already in omniChannel

        // Insert right before the closing }
        const escaped = value.replace(/"/g, '\\"');
        const insertion = `,"${key}":"${escaped}"`;
        // Find the position of the closing brace
        const closePos = omniObjEnd;
        content = content.slice(0, closePos) + insertion + content.slice(closePos);
        // Update omniObjEnd for next key
        omniBlock = content.substring(omniObjStart, closePos + insertion.length + 1);
        injected++;
    }

    if (injected > 0) {
        fs.writeFileSync(file, content, 'utf-8');
        total += injected;
        console.log(`✅ ${lang}.js — ${injected} keys`);
    } else {
        console.log(`⏭️ ${lang}.js — already has both keys`);
    }
}
console.log(`\n📊 Total: ${total} keys`);
