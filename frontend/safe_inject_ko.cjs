// SAFE injection: find export default { ... }; structure and add email key
// Strategy: use Node's vm module to find and fix syntax errors
const fs = require('fs');

function safeInject(filePath, key, value) {
    let s = fs.readFileSync(filePath, 'utf8');
    
    // Remove any existing broken injection of this key
    // Find "key":{ with balanced braces and remove it
    const keyPattern = `"${key}":{`;
    let pos = s.indexOf(keyPattern);
    while (pos >= 0) {
        let depth = 0;
        let i = s.indexOf('{', pos);
        for (; i < s.length; i++) {
            if (s[i] === '{') depth++;
            else if (s[i] === '}') { depth--; if (depth === 0) break; }
        }
        // Remove from the comma before to the end of the block
        let start = pos;
        while (start > 0 && s[start - 1] !== ',' && s[start - 1] !== '{') start--;
        if (s[start - 1] === ',') start--;
        else if (s[start] === ',') {}
        
        // Check for comma after
        let end = i + 1;
        if (s[end] === ',') end++;
        
        s = s.substring(0, start) + s.substring(end);
        pos = s.indexOf(keyPattern);
    }
    
    // Also fix any orphaned text that might have been created by broken regex
    // Look for patterns like: }} 사용 or similar broken JS
    // Find any text between } and the next " that shouldn't be there
    
    // Now find the right place to insert: before the last };
    // The file structure is: export default { ... };
    const lastSemicolon = s.lastIndexOf('};');
    if (lastSemicolon < 0) {
        console.log('ERROR: Cannot find }; in', filePath);
        return false;
    }
    
    const valueStr = JSON.stringify(value);
    const insertion = `,"${key}":${valueStr}`;
    s = s.substring(0, lastSemicolon) + insertion + s.substring(lastSemicolon);
    
    fs.writeFileSync(filePath, s, 'utf8');
    
    // Verify
    try {
        delete require.cache[require.resolve(filePath)];
        const mod = require(filePath);
        const obj = mod.default || mod;
        if (obj[key]) {
            console.log(`✅ ${filePath.split('/').pop()}: ${Object.keys(obj[key]).length} keys`);
            return true;
        }
    } catch(e) {
        console.log(`❌ ${filePath.split('/').pop()}: ${e.message.substring(0, 100)}`);
        return false;
    }
}

const emailKo = {"title":"📧 이메일 마케팅","subTitle":"캠페인 생성 · 템플릿 관리 · 분석 — 통합 이메일 마케팅 시스템","tabCamp":"🚀 캠페인","tabTpl":"📝 템플릿","tabAnalytics":"📊 분석","tabCreative":"🎨 크리에이티브","tabSettings":"⚙️ 설정","tabGuide":"📖 이용 가이드","noChannels":"연결된 이메일 채널이 없습니다. 연동허브에서 API 키를 등록하세요.","goHub":"연동허브로 이동","connectedChannels":"연결된 채널","secLockTitle":"보안 경고","secLockDesc":"비정상적인 접근이 감지되어 차단되었습니다.","dismiss":"확인","liveSyncStatus":"실시간 크로스탭 동기화 활성","syncNow":"지금 동기화","setTitle":"이메일 발송 설정","lblProvider":"발송 서비스","lblSmtpHost":"SMTP 호스트","lblSmtpPort":"SMTP 포트","lblSmtpUser":"SMTP 사용자","lblPassword":"비밀번호","fromEmail":"발신 이메일","fromName":"발신자 이름","awsRegion":"AWS 리전","aiSetSaved":"설정이 저장되었습니다","saving":"저장 중...","setSaveBtn":"💾 설정 저장","tplNew":"새 템플릿","tplCreate":"템플릿 만들기","tplEdit":"템플릿 편집","lblTplName":"템플릿 이름","lblCategory":"카테고리","lblSubject":"제목","subjPh":"제목을 입력하세요...","tfBody":"HTML 본문","catGeneral":"일반","catWelcome":"환영","catPromo":"프로모션","catRetention":"리텐션","catTxn":"트랜잭션","noTemplates":"아직 템플릿이 없습니다.","btnTplSave":"💾 템플릿 저장","btnEditSave":"💾 변경 저장","saved":"저장됨","msgDelConfirm":"삭제하시겠습니까?","cNew":"새 캠페인","fName":"캠페인명*","fTpl":"템플릿","fTarget":"타깃 세그먼트","optSel":"-- 선택 --","optAll":"전체","kpiTotal":"총 캠페인","kpiSent":"발송됨","kpiEmails":"총 발송 수","kpiOpen":"평균 오픈율","kpiClick":"평균 클릭율","msgCampDone":"캠페인이 생성되었습니다!","msgSendConfirm":"이 캠페인을 전체 대상에게 발송하시겠습니까?","msgSendDone":"발송 완료!","btnCreate":"🚀 캠페인 생성","btnSending":"발송 중...","btnSend":"발송","cStat":"캠페인 현황","colName":"캠페인명","colTpl":"템플릿","colTarget":"세그먼트","colSent":"발송","colOpen":"오픈율","colClick":"클릭율","colStatus":"상태","colAction":"액션","emptyCamp":"아직 캠페인이 없습니다.","anTotalSent":"총 발송","anOpenRate":"오픈율","anClickRate":"클릭율","anDelivery":"도달율","anSegPerf":"세그먼트별 성과","anNoData":"분석 데이터 없음","anCamps":"캠페인 수","guideTitle":"이메일 마케팅 이용 가이드","guideSub":"이메일 캠페인 생성부터 분석, 템플릿 관리, 발송 설정까지 단계별로 안내합니다.","guideStepsTitle":"활용 단계","guideStep1Title":"발송 설정 구성","guideStep1Desc":"SMTP 또는 AWS SES를 선택하고 인증 정보를 입력합니다.","guideStep2Title":"발신자 정보 설정","guideStep2Desc":"발신 이메일 주소와 발신자 이름을 설정합니다.","guideStep3Title":"템플릿 만들기","guideStep3Desc":"카테고리, 제목, HTML 본문으로 이메일 템플릿을 생성합니다.","guideStep4Title":"템플릿 테스트","guideStep4Desc":"미리보기로 렌더링을 확인합니다.","guideStep5Title":"대상 세그먼트 확인","guideStep5Desc":"CRM에서 타깃 세그먼트를 선정합니다.","guideStep6Title":"캠페인 생성","guideStep6Desc":"캠페인명, 템플릿, 타깃을 선택하고 생성합니다.","guideStep7Title":"캠페인 발송","guideStep7Desc":"발송 버튼으로 전체 대상에게 이메일을 보냅니다.","guideStep8Title":"발송 결과 확인","guideStep8Desc":"발송 수, 오픈율, 클릭율을 실시간 모니터링합니다.","guideStep9Title":"분석 탭 활용","guideStep9Desc":"오픈율, 클릭율, 도달율을 종합 확인합니다.","guideStep10Title":"세그먼트별 성과","guideStep10Desc":"반응이 좋은 고객 그룹을 파악합니다.","guideStep11Title":"크리에이티브 관리","guideStep11Desc":"디자인 에셋을 관리하고 효과를 분석합니다.","guideStep12Title":"A/B 테스트","guideStep12Desc":"다른 제목/본문으로 비교 캠페인을 생성합니다.","guideStep13Title":"캠페인 최적화","guideStep13Desc":"분석 기반으로 발송 시간, 제목, 본문을 개선합니다.","guideStep14Title":"CSV 데이터 활용","guideStep14Desc":"결과를 CSV로 내보내 심층 분석합니다.","guideStep15Title":"지속적 개선","guideStep15Desc":"정기 캠페인 운영과 분석으로 ROI를 향상시킵니다.","guideTabsTitle":"탭별 안내","guideCampName":"캠페인 관리","guideCampDesc":"캠페인 생성, 발송, 성과 관리.","guideTplName":"템플릿 관리","guideTplDesc":"템플릿 생성, 편집, 분류.","guideAnalyticsName":"분석","guideAnalyticsDesc":"오픈율, 클릭율, 도달율 분석.","guideCreativeName":"크리에이티브","guideCreativeDesc":"디자인 에셋 관리 및 효과 분석.","guideSetName":"설정","guideSetDesc":"SMTP/AWS SES 구성.","guideTipsTitle":"전문가 팁","guideTip1":"제목 30자 이내로 오픈율 향상","guideTip2":"발송 전 테스트 이메일 필수","guideTip3":"세그먼트 맞춤 메시지로 클릭율 2~3배 증가","guideTip4":"골든타임(오전10시~오후2시) 발송","guideTip5":"CRM 연동 자동 이메일 설정","guideTip6":"구독 취소 링크 필수 포함","guideTip7":"A/B 테스트로 최적 제목/본문 발굴"};

const dir = __dirname + '/src/i18n/locales/';
safeInject(dir + 'ko.js', 'email', emailKo);
