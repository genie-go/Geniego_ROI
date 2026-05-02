const fs = require('fs');
const path = require('path');
const LOCALE_DIR = path.join(__dirname, 'frontend', 'src', 'i18n', 'locales');
const NEW_KEYS = {
    ko: { colCommission: '수수료(%)' },
    en: { colCommission: 'Commission (%)' },
    ja: { colCommission: '手数料(%)' },
    zh: { colCommission: '佣金(%)' },
    'zh-TW': { colCommission: '佣金(%)' },
    de: { colCommission: 'Provision (%)' },
    th: { colCommission: 'ค่าคอมมิชชั่น(%)' },
    vi: { colCommission: 'Hoa hồng (%)' },
    id: { colCommission: 'Komisi (%)' },
};
let total = 0;
for (const [lang, keys] of Object.entries(NEW_KEYS)) {
    const file = path.join(LOCALE_DIR, `${lang}.js`);
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf-8');
    let injected = 0;
    for (const [key, value] of Object.entries(keys)) {
        if (content.includes(`${key}:`)) continue;
        const marker = 'colVatTax:';
        const idx = content.lastIndexOf(marker);
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
