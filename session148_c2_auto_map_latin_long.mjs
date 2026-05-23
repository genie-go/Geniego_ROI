// session148_c2_auto_map_latin_long.mjs
// LATIN_LONG 자동 사전 매핑
// 입력: ./latin_long_workbook.csv (3,798 rows)
// 출력:
//   ./latin_long_auto_mapped.csv (사전 hit, ko 번역 완료)
//   ./latin_long_unmapped.csv (사전 miss, 수동 번역 필요)
//   ./latin_long_unique_unmapped.csv (unique value만, 빈도 정렬)
//   ./latin_long_c2_log.txt (실행 로그)
//
// 사전 정책:
// - 외래어 영문 유지: CSV, Excel, API, ROAS, ROI, KPI, CPA, CPC, CPM, CTR, CVR, LTV, ACOS, SKU, CRM, P&L, ESG, BOM, SLA, GA4, MMM, CDC, JSON, JWT, OAuth, Slack, GDPR, CAPI, S3 등
// - 복합어: "Blended ROAS" → "Blended ROAS" 유지 (영문 표준)
// - 한국어 번역: "Conversion Rate" → "전환율", "Email Marketing" → "이메일 마케팅"
// - 147차 누적 용어 사전 호환

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const INPUT = resolve('./latin_long_workbook.csv');
const OUT_MAPPED = resolve('./latin_long_auto_mapped.csv');
const OUT_UNMAPPED = resolve('./latin_long_unmapped.csv');
const OUT_UNIQUE_UNMAPPED = resolve('./latin_long_unique_unmapped.csv');
const OUT_LOG = resolve('./latin_long_c2_log.txt');

// ---------- CSV parser (RFC 4180) ----------
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [], field = '', inQ = false, i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; }
        else { inQ = false; i++; }
      } else { field += c; i++; }
    } else {
      if (c === '"') { inQ = true; i++; }
      else if (c === ',') { row.push(field); field = ''; i++; }
      else if (c === '\r') {
        row.push(field); rows.push(row); row = []; field = ''; i++;
        if (text[i] === '\n') i++;
      } else if (c === '\n') {
        row.push(field); rows.push(row); row = []; field = ''; i++;
      } else { field += c; i++; }
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function csvEscape(s) {
  if (s == null) return '';
  s = String(s);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
function toCSV(rows) {
  return rows.map(r => r.map(csvEscape).join(',')).join('\n');
}

// ---------- 사전 (147차 누적 + LATIN_LONG 도메인) ----------
// 키: 영문 원문 (대소문자 정확 매칭, fallback으로 lowercase 매칭)
// 값: 한국어 번역 (또는 영문 유지 시 동일 영문)
const DICT = {
  // ===== KPI / 분석 핵심 =====
  "Conversion Rate": "전환율",
  "Conversion rate": "전환율",
  "conversion rate": "전환율",
  "Conversions": "전환",
  "Total Conversions": "총 전환",
  "Total Ad Spend": "총 광고 비용",
  "Ad Spend": "광고 비용",
  "Total Spend": "총 지출",
  "Total Revenue": "총 매출",
  "Total Orders": "총 주문",
  "Total Channels": "전체 채널",
  "Total Customers": "총 고객",
  "Total Sales": "총 매출액",
  "Total Sessions": "총 세션",
  "Total Visitors": "총 방문자",
  "Total Clicks": "총 클릭",
  "Total Impressions": "총 노출",
  "Engagement Rate": "참여율",
  "Click Rate": "클릭률",
  "Click-Through Rate": "클릭률 (CTR)",
  "Bounce Rate": "이탈률",
  "Open Rate": "오픈율",
  "Return Rate": "반품률",
  "Retention Rate": "리텐션",
  "Churn Rate": "이탈률",
  "Growth Rate": "성장률",
  "Win Rate": "성공률",
  "Success Rate": "성공률",
  "Response Rate": "응답률",
  "Fill Rate": "충족률",
  "Coverage Rate": "커버리지",
  "Hit Rate": "적중률",
  "Pass Rate": "통과율",
  "Match Rate": "매칭률",
  "Approval Rate": "승인률",

  // ===== 외래어 영문 유지 =====
  "Blended ROAS": "Blended ROAS",
  "blended ROAS": "Blended ROAS",
  "Net ROAS": "Net ROAS",
  "Gross ROAS": "Gross ROAS",
  "ROAS": "ROAS",
  "ROI": "ROI",
  "KPI": "KPI",
  "Core KPIs": "핵심 KPI",
  "CPA": "CPA",
  "CPC": "CPC",
  "CPM": "CPM",
  "CTR": "CTR",
  "CVR": "CVR",
  "LTV": "LTV",
  "ACOS": "ACOS",
  "Cost Per Acquisition (CPA)": "고객 획득 비용 (CPA)",
  "Cost Per Click (CPC)": "클릭당 비용 (CPC)",
  "Cost Per Mille (CPM)": "노출당 비용 (CPM)",
  "Cost Per Conversion": "전환당 비용",
  "Customer Lifetime Value (LTV)": "고객 생애 가치 (LTV)",
  "Return on Ad Spend": "광고 수익률",
  "Return on Investment": "투자 수익률",
  "Net Payout": "Net Payout",
  "Trust Score": "Trust Score",
  "Graph Score": "Graph Score",

  // ===== 마케팅 채널 =====
  "Email Marketing": "이메일 마케팅",
  "Email Campaign": "이메일 캠페인",
  "SMS Marketing": "SMS 마케팅",
  "Social Media": "소셜 미디어",
  "Social Marketing": "소셜 마케팅",
  "Content Marketing": "콘텐츠 마케팅",
  "Display Marketing": "디스플레이 마케팅",
  "Search Marketing": "검색 마케팅",
  "Paid Search": "유료 검색",
  "Organic Search": "자연 검색",
  "Paid Social": "유료 소셜",
  "Organic Social": "자연 소셜",
  "Direct Traffic": "직접 유입",
  "Referral Traffic": "리퍼럴 유입",
  "Affiliate Marketing": "제휴 마케팅",
  "Influencer Marketing": "인플루언서 마케팅",
  "Brand Awareness": "브랜드 인지도",
  "Brand Marketing": "브랜드 마케팅",
  "Performance Marketing": "퍼포먼스 마케팅",
  "Marketing Performance": "마케팅 성과",
  "Marketing Mix": "마케팅 믹스",
  "Marketing Budget": "마케팅 예산",
  "Marketing Spend": "마케팅 비용",
  "Marketing Channel": "마케팅 채널",
  "Marketing Channels": "마케팅 채널",
  "Multi-Channel": "멀티채널",
  "Cross-Channel": "크로스채널",
  "Omni-Channel": "옴니채널",
  "Omnichannel": "옴니채널",

  // ===== 어트리뷰션 / 분석 =====
  "Attribution": "어트리뷰션",
  "Attribution Model": "어트리뷰션 모델",
  "Last Click": "라스트 클릭",
  "First Click": "퍼스트 클릭",
  "Linear": "선형",
  "Time Decay": "시간 감소",
  "Position Based": "위치 기반",
  "Data Driven": "데이터 기반",
  "Data-Driven": "데이터 기반",
  "Multi-Touch": "멀티터치",
  "Multi-Touch Attribution": "멀티터치 어트리뷰션",
  "Incrementality": "인크리멘털리티",
  "Incremental Uplift": "인크리멘털 업리프트",
  "Marketing Mix Modeling": "마케팅 믹스 모델링",
  "Customer Journey": "고객 여정",
  "Journey Analytics": "여정 분석",
  "Cohort Analysis": "코호트 분석",
  "Funnel Analysis": "퍼널 분석",
  "Sentiment Analysis": "감성 분석",
  "Trend Analysis": "트렌드 분석",
  "Predictive Analytics": "예측 분석",
  "Advanced Analytics": "고급 분석",
  "Real-time Analytics": "실시간 분석",

  // ===== 상태/액션 라벨 =====
  "Achieved ✓": "달성 ✓",
  "Achieved": "달성",
  "Not Achieved": "미달성",
  "In Progress": "진행 중",
  "Completed": "완료",
  "Pending": "대기 중",
  "Cancelled": "취소됨",
  "Failed": "실패",
  "Success": "성공",
  "Active": "활성",
  "Inactive": "비활성",
  "Enabled": "활성화",
  "Disabled": "비활성화",
  "Approved": "승인됨",
  "Rejected": "거부됨",
  "Draft": "초안",
  "Published": "게시됨",
  "Archived": "보관됨",
  "Deleted": "삭제됨",
  "Below Target": "목표 미달",
  "Above Target": "목표 초과",
  "On Target": "목표 달성",
  "AI Analyzing...": "AI 분석 중...",
  "Analyzing...": "분석 중...",
  "Loading...": "로딩 중...",
  "Processing...": "처리 중...",
  "Saving...": "저장 중...",
  "Generating...": "생성 중...",

  // ===== 일반 명사 =====
  "Customer": "고객",
  "Customers": "고객",
  "Customer Segment": "고객 세그먼트",
  "New Customers": "신규 고객",
  "Returning Customers": "재방문 고객",
  "VIP Customers": "VIP 고객",
  "Active Customers": "활성 고객",
  "Order": "주문",
  "Orders": "주문",
  "New Orders": "신규 주문",
  "Recent Orders": "최근 주문",
  "Product": "상품",
  "Products": "상품",
  "Top Products": "인기 상품",
  "New Products": "신상품",
  "Featured Products": "추천 상품",
  "Best Sellers": "베스트셀러",
  "Category": "카테고리",
  "Categories": "카테고리",
  "Channel": "채널",
  "Channels": "채널",
  "Campaign": "캠페인",
  "Campaigns": "캠페인",
  "Active Campaigns": "활성 캠페인",
  "Recent Campaigns": "최근 캠페인",
  "Revenue": "매출",
  "Sales": "매출",
  "Profit": "이익",
  "Margin": "마진",
  "Cost": "비용",
  "Spend": "지출",
  "Budget": "예산",
  "Forecast": "예측",
  "Target": "목표",
  "Goal": "목표",
  "Performance": "성과",
  "Summary": "요약",
  "Overview": "개요",
  "Details": "상세",
  "Settings": "설정",
  "Dashboard": "대시보드",
  "Report": "보고서",
  "Reports": "보고서",
  "Analytics": "분석",
  "Insights": "인사이트",
  "Recommendations": "추천",
  "Notifications": "알림",
  "Alerts": "알림",
  "Messages": "메시지",
  "Tasks": "작업",
  "Activities": "활동",
  "History": "이력",
  "Logs": "로그",

  // ===== 시간/기간 =====
  "Today": "오늘",
  "Yesterday": "어제",
  "Tomorrow": "내일",
  "This Week": "이번 주",
  "Last Week": "지난 주",
  "Next Week": "다음 주",
  "This Month": "이번 달",
  "Last Month": "지난 달",
  "Next Month": "다음 달",
  "This Year": "올해",
  "Last Year": "작년",
  "This Quarter": "이번 분기",
  "Last Quarter": "지난 분기",
  "Last 7 Days": "최근 7일",
  "Last 14 Days": "최근 14일",
  "Last 30 Days": "최근 30일",
  "Last 60 Days": "최근 60일",
  "Last 90 Days": "최근 90일",
  "Last 6 Months": "최근 6개월",
  "Last 12 Months": "최근 12개월",
  "Year to Date": "올해 누계",
  "Month to Date": "이번 달 누계",
  "Quarter to Date": "이번 분기 누계",
  "Date Range": "기간",
  "Custom Range": "사용자 지정 기간",
  "All Time": "전체 기간",

  // ===== 액션 =====
  "View All": "모두 보기",
  "View Details": "상세 보기",
  "View More": "더 보기",
  "Show More": "더 보기",
  "Show Less": "간단히 보기",
  "Learn More": "자세히 보기",
  "Read More": "더 읽기",
  "See All": "모두 보기",
  "Edit": "편집",
  "Delete": "삭제",
  "Remove": "제거",
  "Cancel": "취소",
  "Save": "저장",
  "Submit": "제출",
  "Apply": "적용",
  "Reset": "초기화",
  "Refresh": "새로 고침",
  "Export": "내보내기",
  "Import": "가져오기",
  "Download": "다운로드",
  "Upload": "업로드",
  "Share": "공유",
  "Copy": "복사",
  "Paste": "붙여넣기",
  "Search": "검색",
  "Filter": "필터",
  "Sort": "정렬",
  "Group": "그룹",
  "Add": "추가",
  "Create": "생성",
  "New": "신규",
  "Update": "업데이트",
  "Confirm": "확인",
  "Continue": "계속",
  "Back": "뒤로",
  "Next": "다음",
  "Previous": "이전",
  "Finish": "완료",
  "Done": "완료",
  "Close": "닫기",
  "Open": "열기",
  "Login": "로그인",
  "Logout": "로그아웃",
  "Sign In": "로그인",
  "Sign Out": "로그아웃",
  "Sign Up": "회원가입",

  // ===== 데이터 / 차트 =====
  "Data": "데이터",
  "Data Source": "데이터 소스",
  "Data Sources": "데이터 소스",
  "Data Quality": "데이터 품질",
  "Data Trust": "데이터 신뢰도",
  "Data Lineage": "데이터 리니지",
  "Live Data": "실데이터",
  "Real-time": "실시간",
  "Real-Time": "실시간",
  "Chart": "차트",
  "Line Chart": "선 차트",
  "Bar Chart": "막대 차트",
  "Pie Chart": "원형 차트",
  "Area Chart": "영역 차트",
  "Scatter Plot": "산점도",
  "Heatmap": "히트맵",
  "Funnel": "퍼널",
  "Trend": "트렌드",
  "Trends": "트렌드",
  "Distribution": "분포",
  "Comparison": "비교",
  "Breakdown": "세부 분석",

  // ===== 평가/등급 =====
  "Score": "점수",
  "Rating": "등급",
  "Grade": "등급",
  "Rank": "순위",
  "Ranking": "순위",
  "Tier": "등급",
  "Level": "레벨",
  "Priority": "우선순위",
  "High": "높음",
  "Medium": "중간",
  "Low": "낮음",
  "Critical": "심각",
  "Warning": "경고",
  "Info": "정보",
  "Excellent": "우수",
  "Good": "양호",
  "Fair": "보통",
  "Poor": "미흡",
};

// ---------- lookup helpers ----------
function lookupExact(key) {
  return DICT[key];
}

function lookupNormalized(key) {
  // 1) 정확 매칭
  if (DICT[key]) return DICT[key];
  // 2) trim
  const trimmed = key.trim();
  if (DICT[trimmed]) return DICT[trimmed];
  // 3) lowercase 매칭
  const lower = trimmed.toLowerCase();
  for (const [k, v] of Object.entries(DICT)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

// ---------- 메인 ----------
console.log('[c2] Reading:', INPUT);
const text = readFileSync(INPUT, 'utf8');
const rows = parseCSV(text);
const header = rows[0];
const data = rows.slice(1).filter(r => r.length === header.length);
console.log(`[c2] Header: ${header.join(', ')}`);
console.log(`[c2] Data rows: ${data.length}`);

const idx = {
  ns: header.indexOf('ns'),
  path: header.indexOf('path'),
  pollution_type: header.indexOf('pollution_type'),
  ko_value: header.indexOf('ko_value'),
  ja_value: header.indexOf('ja_value'),
  en_value: header.indexOf('en_value'),
  ko_length: header.indexOf('ko_length'),
  suggested_ko: header.indexOf('suggested_ko'),
};

// 사전 매칭
const mapped = [];
const unmapped = [];
const unmappedFreq = new Map();

for (const r of data) {
  const ko = r[idx.ko_value];
  const hit = lookupNormalized(ko);
  if (hit) {
    const newRow = [...r];
    newRow[idx.suggested_ko] = hit;
    mapped.push(newRow);
  } else {
    unmapped.push(r);
    unmappedFreq.set(ko, (unmappedFreq.get(ko) || 0) + 1);
  }
}

// 출력
writeFileSync(OUT_MAPPED, toCSV([header, ...mapped]), 'utf8');
writeFileSync(OUT_UNMAPPED, toCSV([header, ...unmapped]), 'utf8');

// unique unmapped (빈도 정렬, 검수자가 수동 번역할 핵심 워크북)
const uniqueRows = [['ko_value', 'count', 'sample_path', 'sample_ja_value', 'sample_en_value', 'suggested_ko']];
const samplesByKo = new Map();
for (const r of unmapped) {
  const ko = r[idx.ko_value];
  if (!samplesByKo.has(ko)) {
    samplesByKo.set(ko, { path: r[idx.path], ja: r[idx.ja_value], en: r[idx.en_value] });
  }
}
const sortedUnique = [...unmappedFreq.entries()].sort((a, b) => b[1] - a[1]);
for (const [ko, count] of sortedUnique) {
  const s = samplesByKo.get(ko) || {};
  uniqueRows.push([ko, String(count), s.path || '', s.ja || '', s.en || '', '']);
}
writeFileSync(OUT_UNIQUE_UNMAPPED, toCSV(uniqueRows), 'utf8');

// 로그
const log = `# session148 c2 Auto Map Log

## Input
- File: ${INPUT}
- Total LATIN_LONG rows: ${data.length}

## Dictionary
- Total entries: ${Object.keys(DICT).length}

## Result
- Mapped (auto): ${mapped.length} rows (${((mapped.length / data.length) * 100).toFixed(1)}%)
- Unmapped: ${unmapped.length} rows
- Unique unmapped values: ${unmappedFreq.size}

## Top 20 unmapped (frequency-sorted)
${sortedUnique.slice(0, 20).map(([k, c], i) => `${String(i + 1).padStart(3)}. [${c}x] ${JSON.stringify(k).slice(0, 200)}`).join('\n')}

## Outputs
- ${OUT_MAPPED} (${mapped.length} rows + header)
- ${OUT_UNMAPPED} (${unmapped.length} rows + header)
- ${OUT_UNIQUE_UNMAPPED} (${unmappedFreq.size} unique + header)
`;
writeFileSync(OUT_LOG, log, 'utf8');

console.log('[c2] Mapped:', mapped.length);
console.log('[c2] Unmapped:', unmapped.length);
console.log('[c2] Unique unmapped:', unmappedFreq.size);
console.log('[c2] DONE');
