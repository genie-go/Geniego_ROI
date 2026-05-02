const fs = require('fs');
const path = require('path');
const LOCALE_DIR = path.join(__dirname, 'frontend', 'src', 'i18n', 'locales');

const NEW_KEYS = {
    ko: {
        colVatTax: 'VAT/세금(%)',
        commissionAutoApplyDesc: '채널별 판매 수수료율과 세금은 CHANNEL_RATES 정책에서 자동 적용됩니다. 직접 수정도 가능합니다.',
    },
    en: {
        colVatTax: 'VAT/Tax (%)',
        commissionAutoApplyDesc: 'Commission rates and taxes are auto-applied from CHANNEL_RATES policy. Manual override is available.',
    },
    ja: {
        colVatTax: 'VAT/税金(%)',
        commissionAutoApplyDesc: 'チャネル別の販売手数料率と税金はCHANNEL_RATESポリシーから自動適用されます。手動での変更も可能です。',
    },
    zh: {
        colVatTax: 'VAT/税(%)',
        commissionAutoApplyDesc: '各渠道的销售佣金率和税费将从CHANNEL_RATES策略自动应用。也可手动修改。',
    },
    'zh-TW': {
        colVatTax: 'VAT/稅(%)',
        commissionAutoApplyDesc: '各通路的銷售佣金率和稅費將從CHANNEL_RATES策略自動套用。也可手動修改。',
    },
    de: {
        colVatTax: 'MwSt/Steuer (%)',
        commissionAutoApplyDesc: 'Provisionssätze und Steuern werden automatisch aus der CHANNEL_RATES-Richtlinie angewendet. Manuelle Anpassung möglich.',
    },
    th: {
        colVatTax: 'VAT/ภาษี(%)',
        commissionAutoApplyDesc: 'อัตราค่าคอมมิชชั่นและภาษีถูกนำมาใช้โดยอัตโนมัติจากนโยบาย CHANNEL_RATES สามารถแก้ไขด้วยตนเองได้',
    },
    vi: {
        colVatTax: 'VAT/Thuế (%)',
        commissionAutoApplyDesc: 'Tỷ lệ hoa hồng và thuế được tự động áp dụng từ chính sách CHANNEL_RATES. Có thể chỉnh sửa thủ công.',
    },
    id: {
        colVatTax: 'PPN/Pajak (%)',
        commissionAutoApplyDesc: 'Tarif komisi dan pajak diterapkan otomatis dari kebijakan CHANNEL_RATES. Penyesuaian manual juga tersedia.',
    },
};

let total = 0;
for (const [lang, keys] of Object.entries(NEW_KEYS)) {
    const file = path.join(LOCALE_DIR, `${lang}.js`);
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf-8');
    let injected = 0;
    for (const [key, value] of Object.entries(keys)) {
        if (content.includes(`${key}:`)) continue;
        const marker = 'schedSaveBtn:';
        const alt = 'csvImportError:';
        const search = content.includes(marker) ? marker : (content.includes(alt) ? alt : 'heroDesc:');
        const idx = content.lastIndexOf(search);
        if (idx === -1) continue;
        const lineEnd = content.indexOf('\n', idx);
        if (lineEnd === -1) continue;
        const escaped = value.replace(/'/g, "\\'");
        content = content.slice(0, lineEnd) + `\n        ${key}: '${escaped}',` + content.slice(lineEnd);
        injected++;
    }
    if (injected > 0) { fs.writeFileSync(file, content, 'utf-8'); total += injected; console.log(`✅ ${lang}.js — ${injected} keys`); }
}
console.log(`📊 Total: ${total} keys`);
