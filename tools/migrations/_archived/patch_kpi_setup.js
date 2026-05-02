const fs = require('fs');

const extraKo = {
    lblCtrFull: "CTR (클릭률)",
    lblConvRate: "전환율 (Conv. Rate)",
    lblCpaFull: "CPA (전환 단가)",
    lblRoasFull: "ROAS (광고 수익률)",
    lblCpcFull: "CPC (클릭 단가)",
    chSearchAds: "검색 광고",
    chSnsAds: "SNS 광고",
    chBlog: "블로그",
    chCommunity: "커뮤니티"
};

const extraEn = {
    lblCtrFull: "CTR (Click-Through Rate)",
    lblConvRate: "Conv. Rate",
    lblCpaFull: "CPA (Cost Per Acquisition)",
    lblRoasFull: "ROAS (Return on Ad Spend)",
    lblCpcFull: "CPC (Cost Per Click)",
    chSearchAds: "Search Ads",
    chSnsAds: "SNS Ads",
    chBlog: "Blog",
    chCommunity: "Community"
};

function patchFile(filepath, extra) {
    let text = fs.readFileSync(filepath, 'utf8');
    const extraStr = Object.entries(extra).map(([k, v]) => `    "${k}": "${v}",`).join('\n');
    text = text.replace('channelKpiPage: {', `channelKpiPage: {\n${extraStr}`);
    fs.writeFileSync(filepath, text, 'utf8');
    console.log(`Patched ${filepath}`);
}

patchFile('frontend/src/i18n/locales/ko.js', extraKo);
patchFile('frontend/src/i18n/locales/en.js', extraEn);
