/**
 * translate_components.cjs
 * src/components, src/layout 폴더의 한국어 치환
 */
const fs = require('fs');
const path = require('path');

const GLOBAL = [
  ['저장', 'Save'], ['취소', 'Cancel'], ['삭제', 'Delete'], ['추가', 'Add'],
  ['수정', 'Edit'], ['검색', 'Search'], ['필터', 'Filter'],
  ['확인', 'Confirm'], ['닫기', 'Close'], ['뒤로', 'Back'],
  ['완료', 'Done'], ['실행', 'Run'], ['적용', 'Apply'],
  ['로딩 중', 'Loading'], ['오류', 'Error'], ['성공', 'Success'],
  ['활성', 'Active'], ['비활성', 'Inactive'], ['대기 중', 'Pending'],
  ['쿠팡', 'Coupang'], ['네이버', 'Naver'], ['카카오', 'Kakao'],
  ['11번가', '11Street'], ['자사몰', 'Own Mall'],
  ['매출', 'Revenue'], ['주문', 'Orders'], ['광고비', 'Ad Spend'],
  ['전환율', 'Conv. Rate'], ['예산', 'Budget'],
  ['설정', 'Settings'], ['도움말', 'Help'], ['로그아웃', 'Logout'],
  ['플랜', 'Plan'], ['업그레이드', 'Upgrade'], ['무료', 'Free'],
  ['알림', 'Notification'], ['분석', 'Analysis'],
  ['대시보드', 'Dashboard'], ['채널', 'Channel'],
  ['데모 모드', 'Demo Mode'], ['테스트', 'Test'],
  ['관리자', 'Admin'], ['사용자', 'User'],
  ['전체', 'All'], ['없음', 'None'],
  ['오늘', 'Today'], ['이번 주', 'This Week'], ['이번 달', 'This Month'],
  ['연결됨', 'Connected'], ['연동', 'Integration'],
  ['화폐 단위 선택', 'Select Currency'],
  ['화폐', 'Currency'], ['통화', 'Currency'],
  ['월간', 'Monthly'], ['연간', 'Annual'],
];

const DIRS = [
  path.join(__dirname, 'src/components'),
  path.join(__dirname, 'src/layout'),
  path.join(__dirname, 'src/context'),
  path.join(__dirname, 'src/contexts'),
  path.join(__dirname, 'src/hooks'),
  path.join(__dirname, 'src/utils'),
];

let totalChanged = 0;

function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.tsx'));
  for (const f of files) {
    const filePath = path.join(dir, f);
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    for (const [from, to] of GLOBAL) {
      content = content.split(from).join(to);
    }
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      const korBefore = (original.match(/[\uAC00-\uD7A3]/g) || []).length;
      const korAfter = (content.match(/[\uAC00-\uD7A3]/g) || []).length;
      if (korBefore !== korAfter) {
        console.log(`✓ ${f.padEnd(40)} ${korBefore} → ${korAfter}`);
        totalChanged++;
      }
    }
  }
}

for (const d of DIRS) processDir(d);
console.log(`\nTotal changed: ${totalChanged}`);
