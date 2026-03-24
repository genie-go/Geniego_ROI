const fs = require('fs');
const path = require('path');
const dir = 'D:\\project\\GeniegoROI\\frontend\\src\\i18n\\locales';

const platMap = {
    ko: '플랫폼/소프트웨어',
    ja: 'プラットフォーム/ソフトウェア',
    zh: '平台/软件',
    de: 'Plattform/Software',
    th: 'แพลตฟอร์ม/ซอฟต์แวร์',
    vi: 'Nền tảng / Phần mềm',
    id: 'Platform/Perangkat Lunak',
    'zh-TW': '平台/軟體',
};
const tagMap = {
    ko: 'B2B 솔루션',
    ja: 'B2Bソリューション',
    zh: 'B2B解决方案',
    de: 'B2B-Loesung',
    th: 'B2B',
    vi: 'Giai phap B2B',
    id: 'Solusi B2B',
    'zh-TW': 'B2B解決方案',
};

const langs = ['ko', 'ja', 'zh', 'de', 'th', 'vi', 'id', 'zh-TW'];
langs.forEach(lang => {
    const file = path.join(dir, lang + '.js');
    let c = fs.readFileSync(file, 'utf8');
    if (c.includes('cat_platform')) {
        console.log('SKIP ' + lang);
        return;
    }
    // Replace first occurrence of cat_sports line to append platform after it
    c = c.replace(/(cat_sports:\s*"[^"]+",)/, function(m) {
        return m + '\n    cat_platform: "' + platMap[lang] + '",\n    tag_b2b: "' + tagMap[lang] + '", tag_api: "API", tag_enterprise: "Enterprise",';
    });
    fs.writeFileSync(file, c, 'utf8');
    console.log('DONE ' + lang);
});
console.log('All done');
