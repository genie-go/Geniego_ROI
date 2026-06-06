/* 196차 — AI 디자인 럭셔리 샘플 라이브러리 (정적/애니메이션/그래프/일러스트 각 10개 = 40)
 * 매거진/에디토리얼급 프리미엄 SVG 템플릿(외부 리소스 0, 순수 벡터). 선택 → 대화형 수정 → 저장 → 캠페인 연동.
 * 각 샘플: { id, category, name, design{...}, svg, render_type }
 * 고도화: 레이어드 그라데이션·라디얼 글로우·비네팅·필름 그레인·골드 포일·글래스 패널·에디토리얼 그리드/룰선·
 *        가변 타이포 피팅·고스트 넘버럴·스파크라인·메시 블롭·플로우 리본 — "전문가가 만든 광고" 톤. */

const PALETTES = [
  { bg: '#0a1a3f', primary: '#1e3a8a', accent: '#f4d03f', text: '#ffffff', name: '네이비×골드' },
  { bg: '#1a1030', primary: '#6d28d9', accent: '#f472b6', text: '#ffffff', name: '딥퍼플×핑크' },
  { bg: '#0b1411', primary: '#065f46', accent: '#34d399', text: '#ffffff', name: '블랙×에메랄드' },
  { bg: '#0f172a', primary: '#0e7490', accent: '#22d3ee', text: '#ffffff', name: '차콜×시안' },
  { bg: '#2d0a1a', primary: '#9f1239', accent: '#fb7185', text: '#ffffff', name: '와인×로즈골드' },
  { bg: '#0a1428', primary: '#1d4ed8', accent: '#60a5fa', text: '#ffffff', name: '미드나잇×블루' },
  { bg: '#0a1f14', primary: '#15803d', accent: '#a3e635', text: '#ffffff', name: '포레스트×라임' },
  { bg: '#1c1410', primary: '#b45309', accent: '#fbbf24', text: '#ffffff', name: '에스프레소×브론즈' },
  { bg: '#1e1b2e', primary: '#6d28d9', accent: '#c4b5fd', text: '#ffffff', name: '슬레이트×바이올렛' },
  { bg: '#0a2424', primary: '#0f766e', accent: '#fb923c', text: '#ffffff', name: '틸×코랄' },
];

const CONTENT = [
  { headline: '3개월 무료', subheadline: '신규회원 한정 이벤트', body: '지금 가입하면 GeniegoROI 프리미엄을 3개월간 무료로', cta: '무료로 시작하기', metric: '0원', metricLabel: '3개월 구독', img: 'luxury premium gift box with golden ribbon, dark elegant background' },
  { headline: '매출 +247%', subheadline: '데이터로 증명된 성장', body: 'GeniegoROI 도입 기업 평균 매출 성장률', cta: '성과 확인하기', metric: '+247%', metricLabel: '매출 성장', img: 'upward growth arrow, financial success, premium business' },
  { headline: 'ROI 분석', subheadline: '올인원 마케팅 SaaS', body: '모든 채널의 광고 성과를 한 곳에서 정밀 분석', cta: '지금 분석하기', metric: 'ALL', metricLabel: '통합 분석', img: 'modern analytics dashboard, data visualization, premium tech' },
  { headline: '광고비 38%↓', subheadline: 'AI 자동 최적화', body: 'AI가 성과 낮은 채널 예산을 자동으로 재배분', cta: '절감 시작하기', metric: '-38%', metricLabel: '광고비 절감', img: 'cost saving concept, efficient AI, premium minimal' },
  { headline: '전 채널 통합', subheadline: '한 곳에서 관리', body: 'Meta·구글·틱톡·네이버·카카오 통합 대시보드', cta: '통합 보기', metric: '12+', metricLabel: '연동 채널', img: 'connected network nodes, integration, premium tech glow' },
  { headline: 'AI 자동 캠페인', subheadline: '클릭 한 번으로 실행', body: 'AI가 예산·채널·소재를 자동 설정·실행·최적화', cta: '자동화 켜기', metric: 'AUTO', metricLabel: 'AI 실행', img: 'AI automation, glowing circuit, premium futuristic' },
  { headline: 'ROAS 3.8배', subheadline: '광고 효율 극대화', body: '투입 광고비 대비 3.8배의 매출 효율 달성', cta: '효율 보기', metric: '3.8x', metricLabel: 'ROAS', img: 'rocket launch, performance boost, premium gold accent' },
  { headline: '실시간 성과', subheadline: '지금 이 순간의 KPI', body: '실시간으로 변하는 마케팅 성과를 한눈에', cta: '대시보드 열기', metric: 'LIVE', metricLabel: '실시간 추적', img: 'real-time data screen, glowing charts, premium dark UI' },
  { headline: '데이터 결정', subheadline: '추측은 이제 그만', body: '감이 아닌 데이터로 마케팅을 결정하세요', cta: '인사이트 받기', metric: 'DATA', metricLabel: '의사결정', img: 'data crystal, insight, premium abstract' },
  { headline: '14일 무료체험', subheadline: '카드 없이 바로 시작', body: '신용카드 등록 없이 모든 기능을 14일간 체험', cta: '체험 시작하기', metric: '14일', metricLabel: '무료 체험', img: 'free trial badge, premium clean, inviting' },
];

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const FONT = "Pretendard,'Apple SD Gothic Neo','Noto Sans KR',sans-serif";

/* ── 색 유틸 (골드 포일·깊이 표현용 하이라이트/섀도 톤) ── */
const _hex = (h) => { const s = String(h).replace('#', ''); const n = s.length === 3 ? s.split('').map(x => x + x).join('') : s; return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]; };
const _to = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const lighten = (h, a) => { const [r, g, b] = _hex(h); return _to(r + (255 - r) * a, g + (255 - g) * a, b + (255 - b) * a); };
const darken = (h, a) => { const [r, g, b] = _hex(h); return _to(r * (1 - a), g * (1 - a), b * (1 - a)); };

/* ── 타이포 피팅 (한글=1em, 라틴/숫자≈0.56em advance 가정) ── */
const advance = (s) => [...String(s)].reduce((w, ch) => w + (/[\x00-\xff]/.test(ch) ? 0.56 : 1.0), 0);
const fit = (s, maxW, maxSize) => Math.max(28, Math.min(maxSize, Math.floor(maxW / Math.max(advance(s), 0.6))));

/* ── 스파크라인 ── */
const spark = (vals, w, h, color, sw = 3) => {
  const mx = Math.max(...vals), mn = Math.min(...vals);
  const pts = vals.map((v, i) => `${(i / (vals.length - 1) * w).toFixed(1)},${(h - (v - mn) / ((mx - mn) || 1) * h).toFixed(1)}`).join(' ');
  return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
};

/* ── 공통 defs: 배경/글로우/비네트/골드/스킨/그레인/영역/블롭 ── */
function defs(p, id) {
  const goldHi = lighten(p.accent, 0.55), goldLo = darken(p.accent, 0.2);
  return `<defs>
  <linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lighten(p.bg, 0.05)}"/><stop offset="0.55" stop-color="${p.bg}"/><stop offset="1" stop-color="${darken(p.bg, 0.45)}"/></linearGradient>
  <radialGradient id="glow${id}" cx="0.82" cy="0.14" r="0.95"><stop offset="0" stop-color="${p.primary}" stop-opacity="0.6"/><stop offset="0.45" stop-color="${p.primary}" stop-opacity="0.12"/><stop offset="1" stop-color="${p.primary}" stop-opacity="0"/></radialGradient>
  <radialGradient id="vig${id}" cx="0.5" cy="0.46" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.5"/></radialGradient>
  <linearGradient id="gold${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${goldHi}"/><stop offset="0.45" stop-color="${p.accent}"/><stop offset="1" stop-color="${goldLo}"/></linearGradient>
  <linearGradient id="cta${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${p.accent}"/><stop offset="1" stop-color="${goldHi}"/></linearGradient>
  <linearGradient id="sheen${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.32"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="area${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.accent}" stop-opacity="0.42"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></linearGradient>
  <linearGradient id="scrim${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.bg}" stop-opacity="0"/><stop offset="0.7" stop-color="${p.bg}" stop-opacity="0.82"/><stop offset="1" stop-color="${darken(p.bg, 0.3)}" stop-opacity="0.95"/></linearGradient>
  <radialGradient id="blobA${id}"><stop offset="0" stop-color="${lighten(p.accent, 0.1)}" stop-opacity="0.85"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient>
  <radialGradient id="blobP${id}"><stop offset="0" stop-color="${lighten(p.primary, 0.25)}" stop-opacity="0.8"/><stop offset="1" stop-color="${p.primary}" stop-opacity="0"/></radialGradient>
  <filter id="soft${id}" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="10" stdDeviation="20" flood-color="#000" flood-opacity="0.5"/></filter>
  <filter id="grain${id}"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.045"/></feComponentTransfer></filter>
  </defs>`;
}

/* 배경 레이어(그라데이션+글로우+그리드) */
const bgLayers = (p, id) => {
  let grid = `<g stroke="${p.text}" stroke-opacity="0.045" stroke-width="1">`;
  for (let x = 180; x < 1080; x += 180) grid += `<line x1="${x}" y1="0" x2="${x}" y2="1080"/>`;
  grid += `</g>`;
  return `<rect width="1080" height="1080" fill="url(#bg${id})"/><rect width="1080" height="1080" fill="url(#glow${id})"/>${grid}`;
};
/* 마감 레이어(그레인+비네트) */
const finishLayers = (id) => `<rect width="1080" height="1080" filter="url(#grain${id})" opacity="0.55"/><rect width="1080" height="1080" fill="url(#vig${id})"/>`;

/* 에디토리얼 헤더(워드마크+인덱스+룰선) */
const header = (p, id, idx, kicker) => `<g font-family="${FONT}">
  <text x="90" y="140" font-size="30" font-weight="800" letter-spacing="7" fill="${p.text}" fill-opacity="0.95">GENIEGO<tspan fill="${p.accent}">ROI</tspan></text>
  <text x="990" y="140" font-size="20" font-weight="600" letter-spacing="3" fill="${p.text}" fill-opacity="0.55" text-anchor="end">№${idx} · ${kicker}</text>
  <line x1="90" y1="172" x2="990" y2="172" stroke="${p.text}" stroke-opacity="0.16" stroke-width="1.5"/></g>`;

/* 골드 CTA 필 (글로스 스킨 + 화살표 노브) */
const ctaPill = (p, c, id, x, y, anim) => {
  const w = Math.round(advance(c.cta) * 36 + 168);
  return `<g filter="url(#soft${id})" transform="translate(${x},${y})" font-family="${FONT}">
  <rect width="${w}" height="100" rx="50" fill="url(#cta${id})">${anim ? '<animate attributeName="opacity" values="1;0.86;1" dur="2.6s" repeatCount="indefinite"/>' : ''}</rect>
  <rect x="3" y="3" width="${w - 6}" height="46" rx="47" fill="url(#sheen${id})"/>
  <text x="50" y="62" font-size="36" font-weight="800" letter-spacing="0.5" fill="${darken(p.bg, 0)}">${esc(c.cta)}</text>
  <circle cx="${w - 54}" cy="50" r="27" fill="${p.bg}" fill-opacity="0.16"/>
  <text x="${w - 54}" y="63" font-size="30" font-weight="800" fill="${p.bg}" text-anchor="middle">→${anim ? '<animate attributeName="dx" values="0;7;0" dur="1.6s" repeatCount="indefinite"/>' : ''}</text></g>`;
};

/* 글래스 메트릭 모듈(대형 수치 + 라벨 + 스파크라인) */
const metricCard = (p, c, id, x, y) => {
  const ms = fit(c.metric, 230, 88);
  return `<g transform="translate(${x},${y})" font-family="${FONT}">
  <rect width="300" height="200" rx="26" fill="${p.text}" fill-opacity="0.06" stroke="${p.accent}" stroke-opacity="0.28" stroke-width="1.5"/>
  <rect x="0" y="0" width="300" height="60" rx="26" fill="${p.accent}" fill-opacity="0.05"/>
  <text x="30" y="${34 + ms * 0.72}" font-size="${ms}" font-weight="900" fill="url(#gold${id})">${esc(c.metric)}</text>
  <text x="30" y="150" font-size="22" font-weight="600" letter-spacing="0.5" fill="${p.text}" opacity="0.66">${esc(c.metricLabel)}</text>
  <g transform="translate(30,162)">${spark([28, 44, 39, 66, 58, 84, 100], 240, 30, p.accent, 3)}</g></g>`;
};

/* ── 1) 정적/애니메이션 — 에디토리얼 럭셔리 ── */
function svgEditorial(p, c, id, anim) {
  const hs = fit(c.headline, 880, 158);
  const chipW = Math.round(advance(c.subheadline) * 25 + 96);
  const A = (s) => (anim ? s : '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" font-family="${FONT}">${defs(p, id)}
  ${bgLayers(p, id)}
  <text x="1052" y="498" font-size="340" font-weight="900" fill="${p.accent}" fill-opacity="0.055" text-anchor="end" font-family="${FONT}">${esc(c.metric)}</text>
  <g transform="translate(892,150)" fill="none" stroke="url(#gold${id})">
    <circle r="150" stroke-width="1.5" stroke-opacity="0.45">${A('<animate attributeName="r" values="150;163;150" dur="7s" repeatCount="indefinite"/>')}</circle>
    <circle r="212" stroke-width="1" stroke-opacity="0.24"/>
    <circle r="280" stroke-width="0.75" stroke-opacity="0.13"/></g>
  ${header(p, id, '01', 'CAMPAIGN')}
  <g${A(' opacity="0"')}>${A('<animate attributeName="opacity" from="0" to="1" dur="0.6s" begin="0.15s" fill="freeze"/>')}
    <rect x="90" y="300" width="${chipW}" height="56" rx="28" fill="${p.accent}" fill-opacity="0.1" stroke="${p.accent}" stroke-opacity="0.5" stroke-width="1.5"/>
    <circle cx="124" cy="328" r="5" fill="${p.accent}"/>
    <text x="148" y="337" font-size="25" font-weight="700" letter-spacing="0.5" fill="${p.accent}">${esc(c.subheadline)}</text></g>
  <text x="86" y="540" font-size="${hs}" font-weight="900" letter-spacing="-3" fill="${p.text}" filter="url(#soft${id})">${esc(c.headline)}${A('<animate attributeName="x" from="54" to="86" dur="0.6s" begin="0.3s" fill="freeze"/><animate attributeName="opacity" from="0" to="1" dur="0.6s" begin="0.3s" fill="freeze"/>')}</text>
  <rect x="90" y="580" width="120" height="6" rx="3" fill="url(#gold${id})"/>
  <text x="90" y="662" font-size="${fit(c.body, 880, 34)}" font-weight="500" fill="${p.text}" opacity="0.82">${esc(c.body)}</text>
  ${ctaPill(p, c, id, 90, 902, anim)}
  ${metricCard(p, c, id, 690, 878)}
  ${finishLayers(id)}
  </svg>`;
}

/* ── 2) 그래프 — 데이터 에디토리얼(영역+라인 차트) ── */
function svgChart(p, c, id) {
  const data = [40, 53, 60, 73, 86, 100], years = [2020, 2021, 2022, 2023, 2024, 2025];
  const X0 = 120, X1 = 980, Y0 = 870, Y1 = 500, n = data.length;
  const px = (i) => (X0 + (X1 - X0) * i / (n - 1)), py = (v) => (Y0 - (Y0 - Y1) * v / 100);
  const linePts = data.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
  const areaPts = `${X0},${Y0} ${linePts} ${X1},${Y0}`;
  const grid = [0, 25, 50, 75, 100].map(v => `<line x1="${X0}" y1="${py(v).toFixed(1)}" x2="${X1}" y2="${py(v).toFixed(1)}" stroke="${p.text}" stroke-opacity="0.08" stroke-width="1"/><text x="${X0 - 16}" y="${(py(v) + 7).toFixed(1)}" font-size="18" fill="${p.text}" opacity="0.4" text-anchor="end">${v}</text>`).join('');
  const dots = data.map((v, i) => { const last = i === n - 1; return `<circle cx="${px(i).toFixed(1)}" cy="${py(v).toFixed(1)}" r="${last ? 13 : 6}" fill="${last ? `url(#gold${id})` : p.bg}" stroke="${p.accent}" stroke-width="3"><animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="${(0.7 + i * 0.12).toFixed(2)}s" fill="freeze"/>${last ? `<animate attributeName="r" values="13;18;13" dur="2.2s" begin="1.6s" repeatCount="indefinite"/>` : ''}</circle>`; }).join('');
  const yearLbl = years.map((yr, i) => `<text x="${px(i).toFixed(1)}" y="912" font-size="22" fill="${p.text}" opacity="0.55" text-anchor="middle">${yr}</text>`).join('');
  const calloutX = Math.min(px(n - 1) - 90, 790);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" font-family="${FONT}">${defs(p, id)}
  ${bgLayers(p, id)}
  ${header(p, id, '02', 'GROWTH REPORT')}
  <text x="148" y="280" font-size="24" font-weight="700" letter-spacing="0.5" fill="${p.accent}">${esc(c.subheadline)}</text>
  <circle cx="120" cy="272" r="5" fill="${p.accent}"/>
  <text x="90" y="385" font-size="${fit(c.headline, 880, 116)}" font-weight="900" letter-spacing="-2" fill="${p.text}">${esc(c.headline)}</text>
  <text x="92" y="445" font-size="${fit(c.body, 880, 30)}" fill="${p.text}" opacity="0.78">${esc(c.body)}</text>
  ${grid}
  <line x1="${X0}" y1="${Y0}" x2="${X1}" y2="${Y0}" stroke="${p.text}" stroke-opacity="0.3" stroke-width="2"/>
  <polygon points="${areaPts}" fill="url(#area${id})" opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.8s" begin="0.5s" fill="freeze"/></polygon>
  <polyline points="${linePts}" fill="none" stroke="url(#gold${id})" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" filter="url(#soft${id})" stroke-dasharray="2600" stroke-dashoffset="2600"><animate attributeName="stroke-dashoffset" from="2600" to="0" dur="1.4s" begin="0.2s" fill="freeze"/></polyline>
  ${dots}${yearLbl}
  <g transform="translate(${calloutX.toFixed(0)},${(py(100) - 118).toFixed(0)})">
    <rect width="200" height="86" rx="16" fill="${p.bg}" fill-opacity="0.72" stroke="${p.accent}" stroke-opacity="0.4" stroke-width="1.5"/>
    <text x="22" y="44" font-size="${fit(c.metric, 150, 42)}" font-weight="900" fill="url(#gold${id})">${esc(c.metric)}</text>
    <text x="22" y="70" font-size="18" fill="${p.text}" opacity="0.7">▲ ${esc(c.metricLabel)}</text></g>
  ${ctaPill(p, c, id, 90, 968, false)}
  ${finishLayers(id)}
  </svg>`;
}

/* ── 3) 일러스트 — 추상 프리미엄 커버(메시 블롭+플로우 리본+파티클) ── */
function svgIllust(p, c, id) {
  const hs = fit(c.headline, 880, 150);
  const chipW = Math.round(advance(c.subheadline) * 25 + 96);
  // 결정적 파티클(난수 미사용)
  let dots = '';
  for (let i = 0; i < 46; i++) { const x = (i * 137 + 40) % 1060 + 10; const y = (i * 211 + 70) % 540 + 30; const r = (i % 3) + 1; dots += `<circle cx="${x}" cy="${y}" r="${r}" fill="${p.accent}" opacity="${(0.14 + (i % 4) * 0.09).toFixed(2)}"><animate attributeName="opacity" values="${(0.14 + (i % 4) * 0.09).toFixed(2)};${(0.32 + (i % 4) * 0.09).toFixed(2)};${(0.14 + (i % 4) * 0.09).toFixed(2)}" dur="${3 + (i % 5)}s" repeatCount="indefinite"/></circle>`; }
  const ribbon = (d, w, op, dur, dy) => `<path d="${d}" fill="none" stroke="url(#gold${id})" stroke-width="${w}" stroke-opacity="${op}" stroke-linecap="round"><animateTransform attributeName="transform" type="translate" values="0 0;0 ${dy};0 0" dur="${dur}s" repeatCount="indefinite"/></path>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" font-family="${FONT}">${defs(p, id)}
  ${bgLayers(p, id)}
  <g>
    <ellipse cx="780" cy="300" rx="430" ry="430" fill="url(#blobP${id})"><animate attributeName="rx" values="430;470;430" dur="9s" repeatCount="indefinite"/></ellipse>
    <ellipse cx="270" cy="200" rx="320" ry="320" fill="url(#blobA${id})" opacity="0.7"><animate attributeName="ry" values="320;360;320" dur="11s" repeatCount="indefinite"/></ellipse>
    <ellipse cx="940" cy="640" rx="280" ry="280" fill="url(#blobA${id})" opacity="0.5"/></g>
  <g transform="translate(760,300)" fill="none" stroke="${p.accent}" stroke-opacity="0.22">
    <circle r="120" stroke-width="1.5"/><circle r="200" stroke-width="1"/><circle r="300" stroke-width="0.75" stroke-opacity="0.12"/></g>
  ${ribbon('M-60,560 C 240,400 480,720 760,520 S 1180,440 1200,460', 3, 0.55, 12, 18)}
  ${ribbon('M-60,650 C 260,520 520,820 820,600 S 1180,560 1200,580', 2, 0.32, 16, -14)}
  ${ribbon('M-60,470 C 200,360 460,560 720,420 S 1140,360 1200,380', 1.5, 0.2, 20, 12)}
  ${dots}
  <rect x="0" y="540" width="1080" height="540" fill="url(#scrim${id})"/>
  ${header(p, id, '03', 'BRAND STUDIO')}
  <g transform="translate(0,80)">
    <rect x="90" y="600" width="${chipW}" height="56" rx="28" fill="${p.accent}" fill-opacity="0.1" stroke="${p.accent}" stroke-opacity="0.5" stroke-width="1.5"/>
    <circle cx="124" cy="628" r="5" fill="${p.accent}"/>
    <text x="148" y="637" font-size="25" font-weight="700" letter-spacing="0.5" fill="${p.accent}">${esc(c.subheadline)}</text>
    <text x="86" y="800" font-size="${hs}" font-weight="900" letter-spacing="-3" fill="${p.text}" filter="url(#soft${id})">${esc(c.headline)}</text>
    <rect x="90" y="838" width="120" height="6" rx="3" fill="url(#gold${id})"/>
    <text x="90" y="906" font-size="${fit(c.body, 880, 32)}" font-weight="500" fill="${p.text}" opacity="0.82">${esc(c.body)}</text></g>
  ${ctaPill(p, c, id, 90, 980, false)}
  ${finishLayers(id)}
  </svg>`;
}

function buildDesign(p, c, mood, renderType) {
  return {
    channel: 'instagram', ratio: '1:1', mood,
    headline: c.headline, subheadline: c.subheadline, body: c.body, cta: c.cta,
    hashtags: ['#GeniegoROI', '#마케팅ROI', '#광고분석'],
    palette: { bg: p.bg, primary: p.primary, accent: p.accent, text: p.text },
    image_prompt: c.img + ', premium editorial advertising background, cinematic lighting, magazine quality, no text',
    render_type: renderType,
  };
}

const TYPES = [
  { cat: 'static', label: '✨ 정적', mood: '럭셔리', gen: (p, c, i) => svgEditorial(p, c, i, false), rt: 'svg' },
  { cat: 'animated', label: '🎬 애니메이션', mood: '역동적', gen: (p, c, i) => svgEditorial(p, c, i, true), rt: 'animated' },
  { cat: 'chart', label: '📊 그래프', mood: '신뢰감', gen: (p, c, i) => svgChart(p, c, i), rt: 'chart' },
  { cat: 'illust', label: '🎨 일러스트', mood: '모던', gen: (p, c, i) => svgIllust(p, c, i), rt: 'svg' },
];

export const SAMPLE_CATEGORIES = TYPES.map(t => ({ cat: t.cat, label: t.label }));

export const AI_DESIGN_SAMPLES = TYPES.flatMap((t) =>
  PALETTES.map((p, i) => {
    const c = CONTENT[i];
    const id = `${t.cat[0]}${i}`;
    return {
      id: `${t.cat}-${i + 1}`,
      category: t.cat,
      categoryLabel: t.label,
      name: `${c.headline} · ${p.name}`,
      design: buildDesign(p, c, t.mood, t.rt),
      svg: t.gen(p, c, id),
      render_type: t.rt,
    };
  })
);
