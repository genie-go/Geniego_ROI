const fs = require('fs');
const dir = 'frontend/src/i18n/locales/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

const mapKo = `
    "crm": {
        "c_2": "총 고객 수",
        "c_3": "활성 고객 (30일)",
        "c_4": "총 고객 LTV",
        "c_5": "전체 세그먼트",
        "c_6": "전체 Customer",
        "c_7": "AI 추천 세그먼트",
        "c_8": "수동 세그먼트",
        "c_9": "RFM 분석",
        "c_12": "이메일",
        "c_13": "이름",
        "c_14": "전화번호",
        "c_15": "고객 등급",
        "c_17": "+ 고객 등록",
        "c_18": "저장 중...",
        "c_19": "이름, 이메일, 전화번호 검색...",
        "create_segment": "세그먼트 생성",
        "purchase_amt": "구매 총액",
        "purchase_cnt": "구매 횟수",
        "recent_purchase": "최근 구매",
        "last_purchase": "마지막 구매",
        "no_customer": "등록된 고객이 없습니다."
    }
`;

const mapEn = `
    "crm": {
        "c_2": "Total Customers",
        "c_3": "Active (30d)",
        "c_4": "Total LTV",
        "c_5": "Total Segments",
        "c_6": "All Customers",
        "c_7": "AI Segments",
        "c_8": "Manual Segments",
        "c_9": "RFM Analysis",
        "c_12": "Email",
        "c_13": "Name",
        "c_14": "Phone",
        "c_15": "Grade",
        "c_17": "+ Customer Register",
        "c_18": "Saving...",
        "c_19": "Search...",
        "create_segment": "Create Segment",
        "purchase_amt": "Total Amount",
        "purchase_cnt": "Purchase Count",
        "recent_purchase": "Recent Purchase",
        "last_purchase": "Last Purchase",
        "no_customer": "No registered customers."
    }
`;

files.forEach(file => {
    let c = fs.readFileSync(dir + file, 'utf8');
    
    // Remove ALL existing crm dict blocks to prevent duplicate overriding
    // This looks for "crm": { ... } and crm: { ... } recursively
    c = c.replace(/["']?crm["']?\s*:\s*\{[^{}]*\}(,)?/g, '');
    c = c.replace(/["']?crm["']?\s*:\s*\{[^{}]*\}(,)?/g, ''); // Run again just in case of nested leftovers

    // Make sure we remove trailing commas before the final `});`
    c = c.replace(/,\s*\}\);/g, '\n});');

    // Append our ultimate crm dict right before the closing of the main object
    if (!c.includes(mapEn.substring(0, 10)) && !c.includes(mapKo.substring(0, 10))) {
        const inject = file === 'ko.js' ? mapKo : mapEn;
        c = c.replace(/\}\);\s*export default/g, `, ${inject} \n});\nexport default`);
        fs.writeFileSync(dir + file, c);
    }
});
console.log('done');
