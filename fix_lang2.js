const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/CRM.jsx', 'utf8');

c = c.replace(/t\('crm\.c_2'\)/g, "t('crm.c_2', '총 고객 수')");
c = c.replace(/t\('crm\.c_3'\)/g, "t('crm.c_3', '활성 고객 (30일)')");
c = c.replace(/t\('crm\.c_4'\)/g, "t('crm.c_4', '총 고객 LTV')");
c = c.replace(/t\('crm\.c_5'\)/g, "t('crm.c_5', '전체 세그먼트')");
c = c.replace(/t\('crm\.c_12'\)/g, "t('crm.c_12', '이메일')");
c = c.replace(/t\('crm\.c_13'\)/g, "t('crm.c_13', '이름')");
c = c.replace(/t\('crm\.c_14'\)/g, "t('crm.c_14', '전화번호')");
c = c.replace(/t\('crm\.c_15'\)/g, "t('crm.c_15', '고객 등급')");
c = c.replace(/t\('crm\.c_17'\)/g, "t('crm.c_17', '+ 고객 등록')");
c = c.replace(/t\('crm\.c_18'\)/g, "t('crm.c_18', '저장 중...')");
c = c.replace(/t\('crm\.c_19'\)/g, "t('crm.c_19', '이름, 이메일 또는 전화번호 검색...')");

// Also replace mixed text strings
c = c.replace(/"Segment Create"/g, "t('crm.create_segment', '세그먼트 생성')");
c = c.replace(/"구매Amount"/g, "t('crm.purchase_amt', '구매 총액')");
c = c.replace(/"구매횟Count"/g, "t('crm.purchase_cnt', '구매 횟수')");
c = c.replace(/"최근구매"/g, "t('crm.recent_purchase', '최근 구매')");
c = c.replace(/"구매Count"/g, "t('crm.purchase_cnt', '구매 횟수')");
c = c.replace(/"마지막구매"/g, "t('crm.last_purchase', '마지막 구매')");
c = c.replace(/"Register된 Customer이 없습니다\."/g, "t('crm.no_customer', '등록된 고객이 없습니다.')");
c = c.replace(/>\+ Customer Register</g, ">+ 고객 등록<");

fs.writeFileSync('frontend/src/pages/CRM.jsx', c);
console.log('done');
