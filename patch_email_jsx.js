const fs = require('fs');

let c = fs.readFileSync('frontend/src/pages/EmailMarketing.jsx', 'utf8');

const R = [
    ['✉️ 이메일 마케팅', "{t('crm.email.title')}"],
    ['템플릿 작성 · 세그먼트 타겟 발송 · CRM 자동 동기화', "{t('crm.email.subTitle')}"],
    ['"📊 캠페인"', "t('crm.email.tabCamp')"],
    ['"🤖 AI 생성"', "t('crm.email.tabAi')"],
    ['"🧪 A/B 테스트"', "t('crm.email.tabAb')"],
    ['"🎨 블록 빌더"', "t('crm.email.tabEditor')"],
    ['"📝 템플릿"', "t('crm.email.tabTpl')"],
    ['"⚙️ 설정"', "t('crm.email.tabSettings')"],
    
    // Campaign tab
    ['✉️ 새 캠페인', "{t('crm.email.cNew')}"],
    ['>캠페인명*<', ">{t('crm.email.fName')}<"],
    ['>템플릿<', ">{t('crm.email.fTpl')}<"],
    ['>대상 세그먼트 (미선택 시 전체)<', ">{t('crm.email.fTarget')}<"],
    ['>-- 선택 --<', ">{t('crm.email.optSel')}<"],
    ['>전체 고객<', ">{t('crm.email.optAll')}<"],
    ['>캠페인 생성<', ">{t('crm.email.btnCreate')}<"],
    ['📊 캠페인 현황', "{t('crm.email.cStat')}"],
    ['"캠페인명", "템플릿", "세그먼트", "발송수", "오픈율", "상태", "액션"', "t('crm.email.colName'), t('crm.email.colTpl'), t('crm.email.colTarget'), t('crm.email.colSent'), t('crm.email.colOpen'), t('crm.email.colStatus'), t('crm.email.colAction')"],
    ['진행중인 캠페인이 없습니다', "{t('crm.email.emptyCamp')}"],
    ['"📤 발송"', "t('crm.email.btnSend')"],
    ['"발송 중..."', "t('crm.email.btnSending')"],
    ['"발송하시겠습니까?"', "t('crm.email.msgSendConfirm')"],
    
    // AI Tab
    ['🤖 AI 이메일 생성 — 데모 모드', "{t('crm.email.aiMode')}"],
    ['🤖 AI 이메일 생성 —  Mode', "{t('crm.email.aiMode')}"],
    ['Claude API Key 없이도 AI 샘플 이메일을 생성할 수 있습니다.', "{t('crm.email.aiDesc')}"],
    ["'상품/서비스명'", "t('crm.email.aiProd')"],
    ["'대상 고객'", "t('crm.email.aiAud')"],
    ["'캠페인 목표'", "t('crm.email.aiGoal')"],
    ["'톤 & 스타일'", "t('crm.email.aiTone')"],
    ["'프로모션 (선택)'", "t('crm.email.aiPromo')"],
    ["'✨ AI 이메일 생성'", "t('crm.email.btnAiCreate')"],
    ["'⏳ AI 생성 중...'", "t('crm.email.btnAiCreating')"],
    ["'✨ AI Email Create'", "t('crm.email.btnAiCreate')"],
    ["'⏳ AI Creating...'", "t('crm.email.btnAiCreating')"],
    
    // Template
    ['>+ 새 템플릿<', ">{t('crm.email.tplNew')}<"],
    ['"새 템플릿 작성"', "t('crm.email.tplCreate')"],
    ['"템플릿 수정"', "t('crm.email.tplEdit')"],
    ['>템플릿명*<', ">{t('crm.email.tfName')}<"],
    ['>카테고리<', ">{t('crm.email.tfCat')}<"],
    ['>제목*<', ">{t('crm.email.tfSubj')}<"],
    ['>HTML 본문* (변수: {{name}} 사용 가능)<', ">{t('crm.email.tfBody')}<"],
    ['"템플릿 저장"', "t('crm.email.btnTplSave')"],
    ['"수정 저장"', "t('crm.email.btnEditSave')"],
    ["'Template Save'", "t('crm.email.btnTplSave')"],
    ["'Edit Save'", "t('crm.email.btnEditSave')"],
    
    // AB
    ['🧪 이메일 A/B 테스트', "{t('crm.email.abTitle')}"],
    ['🧪 Email A/B Test', "{t('crm.email.abTitle')}"],
    ['제목·발신자·본문·CTA까지 완전한 A/B 비교 + 통계적 유의성 분석', "{t('crm.email.abDesc')}"],
    ['Subject·Sender·Body·CTA까지 완전한 A/B Compare + Statistics적 유의성 Analysis', "{t('crm.email.abDesc')}"],
    ['"+ 새 A/B 테스트"', "t('crm.email.abNew')"],
    ['"+ 새 A/B Test"', "t('crm.email.abNew')"],
    ['"취소"', "t('crm.email.abCancel')"],
    ['"Cancel"', "t('crm.email.abCancel')"],
    
    ['SMTP 설정', "{t('crm.email.setSmtp')}"],
    ['"설정 저장"', "t('crm.email.setSaveBtn')"],
    ['"Settings Save"', "t('crm.email.setSaveBtn')"]
];

R.forEach(([r, s]) => {
    c = c.split(r).join(s);
});

fs.writeFileSync('frontend/src/pages/EmailMarketing.jsx', c, 'utf8');
console.log("EmailMarketing.jsx patched without regex issues!");
