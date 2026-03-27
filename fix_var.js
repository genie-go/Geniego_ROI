const fs = require('fs');
const dir = 'frontend/src/i18n/locales/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

const mapKo = `
    c_2: "총 고객 수",
    c_3: "활성 고객 (30일)",
    c_4: "총 고객 LTV",
    c_5: "전체 세그먼트",
    c_6: "전체 Customer",
    c_7: "AI 추천 세그먼트",
    c_8: "수동 세그먼트",
    c_9: "RFM 분석",
    c_12: "이메일",
    c_13: "이름",
    c_14: "전화번호",
    c_15: "고객 등급",
    c_17: "+ 고객 등록",
    c_18: "저장 중...",
    c_19: "이름, 이메일, 전화번호 검색...",
    create_segment: "세그먼트 생성",
    purchase_amt: "구매 총액",
    purchase_cnt: "구매 횟수",
    recent_purchase: "최근 구매",
    last_purchase: "마지막 구매",
    no_customer: "등록된 고객이 없습니다.",
    ai_seg_cnt: "AI 세그먼트 수",
    target_cust_sum: "대상 고객 합",
    expected_rev: "예상 신규 매출",
    no_ai_seg: "분석된 추천 세그먼트가 없습니다.",
    rfm_loading: "RFM 분석 데이터를 불러오는 중입니다..."
`;

const mapEn = `
    c_2: "Total Customers",
    c_3: "Active (30d)",
    c_4: "Total LTV",
    c_5: "Total Segments",
    c_6: "All Customers",
    c_7: "AI Segments",
    c_8: "Manual Segments",
    c_9: "RFM Analysis",
    c_12: "Email",
    c_13: "Name",
    c_14: "Phone",
    c_15: "Grade",
    c_17: "+ Customer Register",
    c_18: "Saving...",
    c_19: "Search...",
    create_segment: "Create Segment",
    purchase_amt: "Total Amount",
    purchase_cnt: "Purchase Count",
    recent_purchase: "Recent Purchase",
    last_purchase: "Last Purchase",
    no_customer: "No registered customers.",
    ai_seg_cnt: "AI Segments",
    target_cust_sum: "Total Customers",
    expected_rev: "Expected Revenue",
    no_ai_seg: "No AI segments available.",
    rfm_loading: "Loading RFM Analysis..."
`;

files.forEach(file => {
    let c = fs.readFileSync(dir + file, 'utf8');
    const match = c.match(/export default (\w+);/);
    if (match) {
        const vName = match[1];
        c = c.replace(new RegExp(`^${vName}\\.crm\\s*=\\s*\\{[\\s\\S]*?\\};`, 'm'), '');
        const inject = file === 'ko.js' ? mapKo : mapEn;
        const override = `\n${vName}.crm = { ${inject} };\n`;
        c = c.replace(new RegExp(`export default ${vName};`), override + `export default ${vName};`);
        fs.writeFileSync(dir + file, c);
    }
});
console.log('done');
