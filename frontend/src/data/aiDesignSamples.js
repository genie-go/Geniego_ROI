/* 196차 — AI 디자인 럭셔리 샘플 라이브러리 (정적/애니메이션/그래프/일러스트 각 10개 = 40)
 * 추가 키 없이 동작하는 초고급 프리미엄 SVG 템플릿. 선택 → 대화형 수정 → 저장 → 캠페인 연동.
 * 각 샘플: { id, category, name, design{headline,subheadline,body,cta,palette,channel,ratio,mood,image_prompt}, svg, render_type } */

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
  { headline: '3개월 무료', subheadline: '신규회원 한정 이벤트', body: '지금 가입하면 GeniegoROI 프리미엄을 3개월간 무료로', cta: '무료로 시작하기', metric: '0원', metricLabel: '3개월', img: 'luxury premium gift box with golden ribbon, dark elegant background' },
  { headline: '매출 +247%', subheadline: '데이터로 증명된 성장', body: 'GeniegoROI 도입 기업 평균 매출 성장률', cta: '성과 확인하기', metric: '+247%', metricLabel: '매출 성장', img: 'upward growth arrow, financial success, premium business' },
  { headline: '마케팅 ROI 분석', subheadline: '올인원 SaaS 플랫폼', body: '모든 채널의 광고 성과를 한 곳에서', cta: '지금 분석하기', metric: 'ALL', metricLabel: '통합 분석', img: 'modern analytics dashboard, data visualization, premium tech' },
  { headline: '광고비 38%↓', subheadline: 'AI 자동 최적화', body: 'AI가 성과 낮은 채널 예산을 자동 재배분', cta: '절감 시작하기', metric: '-38%', metricLabel: '광고비 절감', img: 'cost saving concept, efficient AI, premium minimal' },
  { headline: '전 채널 통합', subheadline: '한 곳에서 관리', body: 'Meta·구글·틱톡·네이버·카카오 통합 대시보드', cta: '통합 보기', metric: '12+', metricLabel: '연동 채널', img: 'connected network nodes, integration, premium tech glow' },
  { headline: 'AI 자동 캠페인', subheadline: '클릭 한 번으로 실행', body: 'AI가 예산·채널·소재를 자동 설정·실행·최적화', cta: '자동화 켜기', metric: 'AUTO', metricLabel: 'AI 실행', img: 'AI automation, glowing circuit, premium futuristic' },
  { headline: 'ROAS 3.8배', subheadline: '광고 효율 극대화', body: '투입 광고비 대비 3.8배의 매출 효율', cta: '효율 보기', metric: '3.8x', metricLabel: 'ROAS', img: 'rocket launch, performance boost, premium gold accent' },
  { headline: '실시간 대시보드', subheadline: '지금 이 순간의 성과', body: '실시간으로 변하는 KPI를 한눈에', cta: '대시보드 열기', metric: 'LIVE', metricLabel: '실시간', img: 'real-time data screen, glowing charts, premium dark UI' },
  { headline: '데이터 기반 결정', subheadline: '추측은 이제 그만', body: '감이 아닌 데이터로 마케팅을 결정하세요', cta: '인사이트 받기', metric: 'DATA', metricLabel: '인사이트', img: 'data crystal, insight, premium abstract' },
  { headline: '14일 무료 체험', subheadline: '카드 없이 바로 시작', body: '신용카드 등록 없이 모든 기능 14일 체험', cta: '체험 시작하기', metric: '14일', metricLabel: '무료 체험', img: 'free trial badge, premium clean, inviting' },
];

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const FONT = "Pretendard,'Apple SD Gothic Neo','Noto Sans KR',sans-serif";

/* 공통 defs(그라데이션·글로우) */
function defs(p, id) {
  return `<defs>
    <linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.bg}"/><stop offset="0.6" stop-color="${p.primary}"/><stop offset="1" stop-color="${p.bg}"/></linearGradient>
    <radialGradient id="gl${id}" cx="0.8" cy="0.2" r="0.7"><stop offset="0" stop-color="${p.accent}" stop-opacity="0.5"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient>
    <linearGradient id="cta${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${p.accent}"/><stop offset="1" stop-color="${p.primary}"/></linearGradient>
    <filter id="sh${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="14"/><feOffset dy="8" result="o"/><feComponentTransfer><feFuncA type="linear" slope="0.4"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>`;
}

/* 1) 정적 프리미엄 */
function svgStatic(p, c, id, animated) {
  const dur = animated;
  const a = (attr, from, to, d, begin, rep) => animated ? `<animate attributeName="${attr}" from="${from}" to="${to}" dur="${d}s" begin="${begin}s" ${rep ? 'repeatCount="indefinite"' : 'fill="freeze"'}/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">${defs(p, id)}
  <rect width="1080" height="1080" fill="url(#bg${id})"/>
  <rect width="1080" height="1080" fill="url(#gl${id})"/>
  <circle cx="900" cy="180" r="220" fill="${p.accent}" opacity="0.16">${animated ? '<animateTransform attributeName="transform" type="translate" values="0 0;0 24;0 0" dur="6s" repeatCount="indefinite"/>' : ''}</circle>
  <circle cx="150" cy="950" r="160" fill="${p.primary}" opacity="0.28"/>
  <g opacity="${animated ? '0' : '1'}">${a('opacity', '0', '1', 0.8, 0.1)}
    <text x="90" y="300" font-family="${FONT}" font-size="44" font-weight="700" fill="${p.accent}" letter-spacing="2">GeniegoROI</text>
    <rect x="90" y="340" width="${48 + (c.subheadline.length) * 22}" height="48" rx="24" fill="${p.accent}" opacity="0.18"/>
    <text x="114" y="372" font-family="${FONT}" font-size="24" font-weight="700" fill="${p.accent}">${esc(c.subheadline)}</text>
  </g>
  <text x="90" y="540" font-family="${FONT}" font-size="150" font-weight="900" fill="${p.text}">${esc(c.headline)}${a('opacity', '0', '1', 0.8, 0.4)}<animate attributeName="x" from="60" to="90" dur="0.8s" begin="0.4s" fill="freeze"/></text>
  <text x="92" y="640" font-family="${FONT}" font-size="40" font-weight="500" fill="${p.text}" opacity="0.86">${esc(c.body)}</text>
  <g filter="url(#sh${id})">
    <rect x="90" y="880" width="520" height="96" rx="48" fill="url(#cta${id})">${animated ? '<animate attributeName="opacity" values="1;0.82;1" dur="2.4s" repeatCount="indefinite"/>' : ''}</rect>
    <text x="350" y="940" font-family="${FONT}" font-size="38" font-weight="800" fill="${p.bg}" text-anchor="middle">${esc(c.cta)} →</text>
  </g>
  <g transform="translate(720,820)">
    <circle cx="120" cy="120" r="118" fill="none" stroke="${p.accent}" stroke-width="4" opacity="0.55"/>
    <text x="120" y="110" font-family="${FONT}" font-size="56" font-weight="900" fill="${p.accent}" text-anchor="middle">${esc(c.metric)}</text>
    <text x="120" y="158" font-family="${FONT}" font-size="24" fill="${p.text}" opacity="0.8" text-anchor="middle">${esc(c.metricLabel)}</text>
  </g>
  </svg>`;
}

/* 3) 그래프(막대) */
function svgChart(p, c, id) {
  const bars = [38, 52, 64, 80, 100];
  const bx = (i) => 130 + i * 165;
  const barEls = bars.map((h, i) => {
    const bh = h * 4.4; const y = 880 - bh;
    return `<rect x="${bx(i)}" y="${y}" width="110" height="${bh}" rx="14" fill="${i === bars.length - 1 ? `url(#cta${id})` : p.primary}" opacity="${i === bars.length - 1 ? 1 : 0.55}"><animate attributeName="height" from="0" to="${bh}" dur="1s" begin="${0.15 * i}s" fill="freeze"/><animate attributeName="y" from="880" to="${y}" dur="1s" begin="${0.15 * i}s" fill="freeze"/></rect>
    <text x="${bx(i) + 55}" y="910" font-family="${FONT}" font-size="22" fill="${p.text}" opacity="0.7" text-anchor="middle">${2021 + i}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">${defs(p, id)}
  <rect width="1080" height="1080" fill="url(#bg${id})"/><rect width="1080" height="1080" fill="url(#gl${id})"/>
  <text x="90" y="180" font-family="${FONT}" font-size="40" font-weight="700" fill="${p.accent}">GeniegoROI · ${esc(c.subheadline)}</text>
  <text x="90" y="290" font-family="${FONT}" font-size="118" font-weight="900" fill="${p.text}">${esc(c.headline)}</text>
  <text x="92" y="360" font-family="${FONT}" font-size="34" fill="${p.text}" opacity="0.82">${esc(c.body)}</text>
  <line x1="120" y1="880" x2="960" y2="880" stroke="${p.text}" stroke-width="2" opacity="0.25"/>
  ${barEls}
  <g filter="url(#sh${id})"><rect x="90" y="958" width="380" height="84" rx="42" fill="url(#cta${id})"/><text x="280" y="1010" font-family="${FONT}" font-size="34" font-weight="800" fill="${p.bg}" text-anchor="middle">${esc(c.cta)} →</text></g>
  </svg>`;
}

/* 4) 일러스트(건물 스카이라인 + 추상 캐릭터) */
function svgIllust(p, c, id) {
  // 도시 빌딩 실루엣
  const blds = [[120, 520, 90, 360], [220, 440, 80, 440], [310, 580, 70, 300], [390, 380, 100, 500], [500, 520, 80, 360], [590, 460, 90, 420]];
  const buildings = blds.map(([x, y, w, h], i) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${p.primary}" opacity="${0.5 + i * 0.07}"/>`).join('') +
    blds.map(([x, y, w]) => { let win = ''; for (let r = 0; r < 6; r++) for (let cc = 0; cc < 2; cc++) { if ((r + cc) % 2 === 0) win += `<rect x="${x + 14 + cc * (w / 2)}" y="${y + 24 + r * 56}" width="${w / 2 - 22}" height="26" rx="3" fill="${p.accent}" opacity="0.6"/>`; } return win; }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">${defs(p, id)}
  <rect width="1080" height="1080" fill="url(#bg${id})"/><rect width="1080" height="1080" fill="url(#gl${id})"/>
  <circle cx="850" cy="240" r="120" fill="${p.accent}" opacity="0.85"/>
  <circle cx="850" cy="240" r="120" fill="none" stroke="${p.accent}" stroke-width="2" opacity="0.4"><animate attributeName="r" values="120;150;120" dur="4s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.4;0;0.4" dur="4s" repeatCount="indefinite"/></circle>
  <g transform="translate(300,0)">${buildings}</g>
  <rect x="0" y="900" width="1080" height="180" fill="${p.bg}" opacity="0.6"/>
  <text x="90" y="250" font-family="${FONT}" font-size="40" font-weight="700" fill="${p.accent}">GeniegoROI</text>
  <text x="90" y="380" font-family="${FONT}" font-size="120" font-weight="900" fill="${p.text}">${esc(c.headline)}</text>
  <text x="92" y="450" font-family="${FONT}" font-size="34" fill="${p.text}" opacity="0.85">${esc(c.subheadline)}</text>
  <g filter="url(#sh${id})"><rect x="90" y="980" width="420" height="76" rx="38" fill="url(#cta${id})"/><text x="300" y="1028" font-family="${FONT}" font-size="32" font-weight="800" fill="${p.bg}" text-anchor="middle">${esc(c.cta)} →</text></g>
  </svg>`;
}

function buildDesign(p, c, mood, renderType) {
  return {
    channel: 'instagram', ratio: '1:1', mood,
    headline: c.headline, subheadline: c.subheadline, body: c.body, cta: c.cta,
    hashtags: ['#GeniegoROI', '#마케팅ROI', '#광고분석'],
    palette: { bg: p.bg, primary: p.primary, accent: p.accent, text: p.text },
    image_prompt: c.img + ', premium advertising background, cinematic, no text',
    render_type: renderType,
  };
}

const TYPES = [
  { cat: 'static', label: '✨ 정적', mood: '럭셔리', gen: (p, c, i) => svgStatic(p, c, i, false), rt: 'svg' },
  { cat: 'animated', label: '🎬 애니메이션', mood: '역동적', gen: (p, c, i) => svgStatic(p, c, i, true), rt: 'animated' },
  { cat: 'chart', label: '📊 그래프', mood: '신뢰감', gen: (p, c, i) => svgChart(p, c, i), rt: 'chart' },
  { cat: 'illust', label: '🏙️ 일러스트', mood: '모던', gen: (p, c, i) => svgIllust(p, c, i), rt: 'svg' },
];

export const SAMPLE_CATEGORIES = TYPES.map(t => ({ cat: t.cat, label: t.label }));

export const AI_DESIGN_SAMPLES = TYPES.flatMap((t, ti) =>
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
