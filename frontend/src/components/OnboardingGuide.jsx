import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useI18n } from '../i18n';

/* [현 차수] ★모바일 환경 감지 — 하단 내비(MobileBottomNav)와 동일 기준(≤768px·standalone). 모바일에선 온보딩을
   상단 배너가 아니라 하단 내비 옆 아이콘 + 바텀시트로 표시해 콘텐츠 영역을 전혀 잠식하지 않는다. */
function useIsMobile() {
  const [m, setM] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return window.innerWidth <= 768 || window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch { return window.innerWidth <= 768; }
  });
  useEffect(() => {
    let id = null;
    const check = () => { clearTimeout(id); id = setTimeout(() => {
      try { setM(window.innerWidth <= 768 || window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true); } catch { setM(window.innerWidth <= 768); }
    }, 150); };
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => { clearTimeout(id); window.removeEventListener('resize', check); window.removeEventListener('orientationchange', check); };
  }, []);
  return m;
}

/* [현 차수] ★구독회원 단계별 진행 안내(이용가이드 불필요).
 *  - 첫 방문: 환영 인사 + 선행 작업 순서를 처음부터 안내.
 *  - 재방문: 어디까지 완료했는지 + 다음 할 일 + [바로가기]. 원하는 다른 단계로도 자유 이동.
 *  - 완료 여부는 실데이터(GlobalData)에서 파생 → 이미 끝낸 선행작업은 ✓로 표시(다시 시키지 않음).
 *  - 해당 메뉴에서 저장하면 데이터가 바뀌어 자동으로 다음 단계로 진행. 전부 완료 시 사라짐. */

/* [현 차수] ★비즈니스 모델 분기:
   - commerce(실물 커머스, 사방넷형): GeniegoROI는 WMS·카탈로그 보유 → 내부 기반(상품→창고→입고)을
     먼저 갖춘 뒤 채널 연동·주문 동기화로 진행하는 정방향. 완료신호는 GlobalData(inventory.stock 등)에서 파생.
   - service(서비스·구독·디지털): 플랫폼/서비스 자체가 상품인 무형 비즈니스. 물류(창고·입고·주문동기화)가
     없으므로 해당 단계를 제거하고 '서비스·플랜 등록 → 채널 → 결제 → 마케팅 자동화'로 진행. */
const _stockSum = (i) => Object.values((i && i.stock) || {}).reduce((s, v) => s + (Number(v) || 0), 0);

const COMMERCE_STEPS = [
  { id: 'product', route: '/catalog-sync', icon: '📦', title: '상품 등록',
    action: '판매할 상품을 카탈로그에 등록하세요(직접 등록 또는 이후 채널에서 수집). 모든 운영의 기준 데이터입니다.',
    done: (g) => (g.inventory || []).length > 0 },
  { id: 'warehouse', route: '/wms-manager', icon: '🏭', title: '창고 등록',
    action: '재고를 보관·출고할 물류 창고를 등록하세요(본사·지역센터 등). 입고·피킹·정산의 기준이 됩니다.',
    done: (g) => (g.inventory || []).some(i => i && i.stock && Object.keys(i.stock).length > 0) },
  { id: 'inbound', route: '/wms-manager', icon: '📥', title: '입고 (재고 입고)',
    action: '등록한 창고로 상품 재고를 입고 처리하세요. 입고 수량이 재고·P&L·주문 가능 수량에 자동 반영됩니다.',
    done: (g) => (g.inventory || []).some(i => _stockSum(i) > 0) || (g.inOutHistory || []).some(io => io && io.type === '입고') },
  { id: 'channels', route: '/integration-hub', icon: '🔌', title: '채널 연동',
    action: '판매·광고 채널의 API 키/자격증명을 등록하고 [연결]을 누르세요. 등록 즉시 자동 동기화됩니다.',
    done: (g) => Object.keys(g.channelBudgets || {}).length > 0 || (g.connectedChannels || []).length > 0 },
  { id: 'sync', route: '/omni-channel', icon: '🔄', title: '상품·주문 동기화',
    action: '연동한 채널의 상품·주문이 수집되는지 확인하세요. 데이터가 모든 메뉴에 자동 반영됩니다.',
    done: (g) => (g.orders || []).length > 0 },
  { id: 'payment', route: '/payment-methods', icon: '💳', title: '광고비 결제수단 등록',
    action: '광고 자동집행용 결제 카드를 등록하세요. 광고비는 설정한 월 예산 한도 내에서만 청구됩니다.',
    done: (g) => (g.paymentCards || []).length > 0 },
  { id: 'marketing', route: '/auto-marketing', icon: '🚀', title: '마케팅 자동화 설정',
    action: '월 예산과 목표(ROAS 등)를 설정하면 AI가 캠페인을 자동 집행·최적화합니다.',
    done: (g) => (g.sharedCampaigns || []).length > 0 },
];

/* 서비스·구독·디지털(무형 상품): 창고·입고·주문동기화 단계 제거. '상품 등록'은 '서비스·플랜(오퍼) 등록'으로 재구성. */
const SERVICE_STEPS = [
  { id: 'service', route: '/catalog-sync', icon: '🧩', title: '서비스·플랜 등록',
    action: '광고·마케팅으로 알릴 서비스/구독 플랜(오퍼)을 등록하세요. 가격·플랜·랜딩이 모든 캠페인의 기준이 됩니다.',
    done: (g) => (g.inventory || []).length > 0 },
  { id: 'channels', route: '/integration-hub', icon: '🔌', title: '광고·마케팅 채널 연동',
    action: '광고 매체(Meta·Google 등)와 마케팅 채널의 API 키/자격증명을 등록하고 [연결]을 누르세요.',
    done: (g) => Object.keys(g.channelBudgets || {}).length > 0 || (g.connectedChannels || []).length > 0 },
  { id: 'payment', route: '/payment-methods', icon: '💳', title: '광고비 결제수단 등록',
    action: '광고 자동집행용 결제 카드를 등록하세요. 광고비는 설정한 월 예산 한도 내에서만 청구됩니다.',
    done: (g) => (g.paymentCards || []).length > 0 },
  { id: 'marketing', route: '/auto-marketing', icon: '🚀', title: '마케팅 자동화 · 전환 목표 설정',
    action: '월 예산과 전환 목표(리드/가입/구독)를 설정하면 AI가 캠페인을 자동 집행·최적화합니다.',
    done: (g) => (g.sharedCampaigns || []).length > 0 },
];

/* [현 차수] 둘 다(실물+서비스): 두 단계셋 병합(공통 단계 채널/결제/마케팅 id 중복 제거).
   사용자가 실물 상품과 서비스·구독을 함께 운영하는 경우 — 하나 선택 시 다른 하나가 사라지던 문제 해소. */
const BOTH_STEPS = (() => {
  const seen = new Set(); const out = [];
  [COMMERCE_STEPS[0], SERVICE_STEPS[0], ...COMMERCE_STEPS.slice(1)].forEach((s) => { if (!seen.has(s.id)) { seen.add(s.id); out.push(s); } });
  return out;
})();
const STEP_SETS = { commerce: COMMERCE_STEPS, service: SERVICE_STEPS, both: BOTH_STEPS };

const isDone = (s, g) => { try { return !!s.done(g); } catch { return false; } };

function tenantKey() {
  try { return localStorage.getItem('tenantId') || localStorage.getItem('demo_genie_user') || 'me'; } catch { return 'me'; }
}

export default function OnboardingGuide() {
  const gd = useGlobalData();
  const loc = useLocation();
  const nav = useNavigate();
  const { t } = useI18n();

  const welcomedKey = 'genie_onb_welcomed_' + tenantKey();
  const expandKey = 'genie_onb_expanded_' + tenantKey();
  const bizModelKey = 'genie_onb_bizmodel_' + tenantKey();
  const [welcomed, setWelcomed] = useState(() => { try { return localStorage.getItem(welcomedKey) === '1'; } catch { return true; } });
  // [현 차수] ★비즈니스 모델: 'commerce'(실물 커머스) | 'service'(서비스·구독·디지털). 미선택 시 null → 선택 유도.
  const [bizModel, setBizModel] = useState(() => { try { const v = localStorage.getItem(bizModelKey); return (v === 'commerce' || v === 'service' || v === 'both') ? v : null; } catch { return null; } });
  const chooseModel = (m) => { try { localStorage.setItem(bizModelKey, m); } catch {} setBizModel(m); };
  // [현 차수] ★항상 기본 접힘(단일 1줄) — 안내 배너가 페이지 콘텐츠 높이를 잠식하지 않도록.
  //   펼침은 사용자가 명시적으로 [펼치기]를 눌렀을 때만(absolute 오버레이로 표시 → 페이지 안 밀림).
  //   (218차 '첫 방문 자동 펼침'이 전 페이지 컨테이너 높이를 압축하는 회귀를 유발해 제거.)
  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem(expandKey) === '1'; } catch { return false; }
  });
  // [현 차수] ★모바일 최적화: 안내 배너를 통째로 숨기기/보이기. 숨기면 작은 플로팅 버튼만 남아 전체 화면을
  //   콘텐츠에 양보하고, 버튼을 누르면 다시 나타난다(상단 chrome 잠식 해소). 상태는 테넌트별 영속.
  const hideKey = 'genie_onb_hidden_' + tenantKey();
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(hideKey) === '1'; } catch { return false; } });
  const hide = () => { try { localStorage.setItem(hideKey, '1'); } catch {} setHidden(true); setExpanded(false); };
  const unhide = () => { try { localStorage.setItem(hideKey, '0'); } catch {} setHidden(false); };

  // [현 차수] ★모바일: 하단 내비 옆 아이콘 + 바텀시트(콘텐츠 비잠식). 데스크톱: 기존 상단 배너.
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  // 모델 미선택 시 commerce 기준으로 완료 여부 판단(기존 사용자 회귀 방지) → 단, 선택 유도 배너 노출.
  const STEPS = STEP_SETS[bizModel] || COMMERCE_STEPS;
  const doneFlags = STEPS.map((s) => isDone(s, gd));
  const doneCount = doneFlags.filter(Boolean).length;
  const allDone = doneCount === STEPS.length;
  const firstIdx = doneFlags.findIndex((d) => !d);            // 첫 미완료 = 현재 단계
  const step = firstIdx >= 0 ? STEPS[firstIdx] : null;
  const onStepPage = step && loc.pathname === step.route;
  const firstVisit = !welcomed;

  // 전부 완료 + 이미 환영을 봤으면 숨김.
  if (allDone && welcomed) return null;

  // [현 차수] ★★모바일: 상단 배너를 전혀 렌더하지 않고(콘텐츠 비잠식), 하단 내비 옆 나침반 아이콘만 노출.
  //   탭하면 바텀시트로 가이드(모델 선택 또는 단계 체크리스트)를 띄운다 — 하단 대메뉴와 시각/위치 일관.
  if (isMobile) {
    const pending = !allDone;
    const close = () => setMobileOpen(false);
    const goStep = (route) => { close(); nav(route); };
    const dismiss = () => { try { localStorage.setItem(welcomedKey, '1'); } catch {} setWelcomed(true); close(); };
    const bizBtn = (m, icon, title, desc) => (
      <button key={m} onClick={() => chooseModel(m)} style={{ display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer', padding: '12px 14px', borderRadius: 12, marginBottom: 8, border: '1px solid rgba(124,58,237,0.4)', background: 'rgba(255,255,255,0.08)', color: '#fff' }}>
        <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 3 }}>{icon} {title}</div>
        <div style={{ fontSize: 11.5, color: '#c7d2fe', lineHeight: 1.5 }}>{desc}</div>
      </button>
    );
    const sheetBody = (!bizModel && !allDone) ? (
      <div>
        <div style={{ fontSize: 12, color: '#c7d2fe', marginBottom: 10 }}>{t('onboard.bizModel.sub', '실물 상품을 파는지, 서비스·구독·플랫폼 자체를 알리는지에 따라 안내가 달라집니다.')}</div>
        {bizBtn('commerce', '📦', t('onboard.bizModel.commerce', '실물 커머스'), t('onboard.bizModel.commerceDesc', '실물 상품 판매 · 재고/창고/주문 관리(상품→창고→입고→채널→주문 동기화).'))}
        {bizBtn('service', '🧩', t('onboard.bizModel.service', '서비스·구독·디지털'), t('onboard.bizModel.serviceDesc', '서비스/구독/플랫폼 자체가 상품 · 물류 없음(서비스 등록→채널→결제→마케팅 자동화).'))}
        {bizBtn('both', '📦🧩', t('onboard.bizModel.both', '실물 + 서비스 둘 다'), t('onboard.bizModel.bothDesc', '실물 상품과 서비스·구독을 함께 운영 · 두 등록 단계를 모두 진행합니다.'))}
      </div>
    ) : (
      <div>
        <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.12)', overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ height: '100%', width: `${Math.round(doneCount / STEPS.length * 100)}%`, background: 'linear-gradient(90deg,#4f46e5,#7c3aed)' }} />
        </div>
        {STEPS.map((s, i) => {
          const d = doneFlags[i]; const cur = i === firstIdx; const here = loc.pathname === s.route;
          return (
            <div key={s.id} onClick={() => goStep(s.route)} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '11px 12px', borderRadius: 11, cursor: 'pointer', marginBottom: 5, background: cur && !d ? 'rgba(124,58,237,0.18)' : here ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${cur && !d ? 'rgba(124,58,237,0.5)' : 'transparent'}` }}>
              <span style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 900, background: d ? '#22c55e' : cur ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'rgba(148,163,184,0.3)', color: d || cur ? '#fff' : '#cbd5e1' }}>{d ? '✓' : i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: cur && !d ? 900 : 800, color: d ? '#86efac' : '#fff' }}>
                  {s.icon} {t(`onboard.step.${s.id}.title`, s.title)}
                  {cur && !d && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 900, padding: '2px 9px', borderRadius: 99, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: '#fff' }}>👉 {t('onboard.doNow', '지금 할 일')}</span>}
                </div>
                {(cur || here) && !d && <div style={{ fontSize: 11.5, color: '#c7d2fe', lineHeight: 1.5, marginTop: 3 }}>{t(`onboard.step.${s.id}.action`, s.action)}</div>}
              </div>
            </div>
          );
        })}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={dismiss} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, fontWeight: 800 }}>{allDone ? t('onboard.dismissDone', '확인 · 닫기') : t('onboard.hide', '숨기기')}</button>
        </div>
      </div>
    );
    return createPortal((
      <>
        <style>{`@keyframes onbFabPulse{0%,100%{box-shadow:0 6px 22px rgba(0,0,0,0.5),0 0 0 0 rgba(124,58,237,0.5)}50%{box-shadow:0 6px 22px rgba(0,0,0,0.5),0 0 0 8px rgba(124,58,237,0)}}`}</style>
        {/* 하단 내비 옆 나침반 아이콘 — body 포털 + 최상위 z(데모 하단 배너 쿠키/PWA/MFA 위에서도 항상 클릭 가능) */}
        <button onClick={() => setMobileOpen(o => !o)} aria-label={t('onboard.navLabel', '가이드')} style={{
          position: 'fixed', right: 12, bottom: 'calc(66px + env(safe-area-inset-bottom, 0px))', zIndex: 2147483000,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
          width: 56, minHeight: 52, padding: '6px', borderRadius: 16, cursor: 'pointer',
          background: 'rgba(6,12,22,0.97)', WebkitBackdropFilter: 'blur(20px)', backdropFilter: 'blur(20px)',
          color: '#fff', border: '1px solid rgba(79,130,255,0.3)',
          animation: pending && !mobileOpen ? 'onbFabPulse 1.8s ease-in-out infinite' : 'none',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={mobileOpen ? '#4f8ef7' : '#9fb4e0'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>
          <span style={{ fontSize: 10, fontWeight: 800, color: mobileOpen ? '#4f8ef7' : '#9fb4e0', lineHeight: 1 }}>{t('onboard.navLabel', '가이드')}</span>
          {pending && <span style={{ position: 'absolute', top: -6, right: -6, fontSize: 10, fontWeight: 900, padding: '1px 6px', borderRadius: 999, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: '#fff', boxShadow: '0 2px 8px rgba(239,68,68,0.5)' }}>{doneCount}/{STEPS.length}</span>}
        </button>
        {/* 바텀시트 오버레이 */}
        {mobileOpen && (
          <>
            <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2147483001 }} />
            <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 2147483002, maxHeight: '80vh', overflowY: 'auto', borderRadius: '18px 18px 0 0', background: 'linear-gradient(135deg,#0b1224,#1e1b4b)', color: '#fff', borderTop: '1px solid rgba(124,58,237,0.5)', padding: '14px 14px calc(18px + env(safe-area-inset-bottom, 0px))', boxShadow: '0 -18px 50px rgba(0,0,0,0.6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 17 }}>🧭</span>
                <div style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 900 }}>{(!bizModel && !allDone) ? t('onboard.bizModel.prompt', '먼저 비즈니스 모델을 선택하세요') : (allDone ? t('onboard.allDoneTitle', '모든 시작 단계를 완료했습니다!') : t('onboard.guideTitle', 'GeniegoROI 시작 가이드'))}</div>
                <button onClick={close} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 12, fontWeight: 800 }}>{t('onboard.close', '닫기')} ×</button>
              </div>
              {sheetBody}
            </div>
          </>
        )}
      </>
    ), document.body);
  }

  // [현 차수] ★숨김 상태: 안내 배너를 접어 전체 화면을 콘텐츠에 양보하고, 우하단 작은 플로팅 버튼만 노출.
  //   fixed 라 페이지 레이아웃을 밀지 않음(콘텐츠 top 상승). 모바일 바텀내비/세이프에어리어 위에 배치.
  if (hidden) {
    return (
      <button onClick={unhide} className="onb-relaunch" title={t('onboard.showGuide', '시작 가이드 보기')} style={{
        // [237차] '다시 펼치기' 미노출 버그: PWA 설치 배너(#pwa-install-banner, fixed z-index:10000, 하단)에
        //   가려 보이지 않았다. z-index 를 배너 위(10001)로 올리고, 배너(≈하단 142px 점유)를 비우도록 위로
        //   배치해 겹침을 제거 → 숨김 후 항상 보이고 클릭 가능.
        position: 'fixed', right: 14, bottom: 'calc(150px + env(safe-area-inset-bottom, 0px))', zIndex: 10001,
        display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 999, cursor: 'pointer',
        border: 'none', color: '#fff', fontSize: 12.5, fontWeight: 900, whiteSpace: 'nowrap',
        background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 6px 20px rgba(79,70,229,0.45)',
      }}>
        <span style={{ fontSize: 15 }}>🧭</span>
        <span>{t('onboard.showGuide', '시작 가이드')}</span>
        {!allDone && <span style={{ fontSize: 11, fontWeight: 900, padding: '2px 7px', borderRadius: 999, background: 'rgba(255,255,255,0.22)' }}>{doneCount}/{STEPS.length}</span>}
      </button>
    );
  }

  // [현 차수] ★비즈니스 모델 미선택 + 아직 온보딩 진행 중이면 모델 선택을 먼저 유도.
  //   (이미 모든 단계를 끝낸 기존 사용자는 위에서 return 되어 여기 도달하지 않음 → 불필요한 재질문 없음.)
  if (!bizModel && !allDone) {
    const card = (m, icon, title, desc) => (
      <button className="onb-biz-card" onClick={() => chooseModel(m)} style={{
        flex: '1 1 220px', textAlign: 'left', cursor: 'pointer', padding: '14px 16px', borderRadius: 12,
        border: '1px solid rgba(124,58,237,0.4)', background: 'rgba(255,255,255,0.08)', color: '#fff',
      }}>
        <div className="onb-biz-title" style={{ fontSize: 15, fontWeight: 900, marginBottom: 4 }}>{icon} {title}</div>
        <div className="onb-biz-desc" style={{ fontSize: 12, color: '#c7d2fe', lineHeight: 1.5 }}>{desc}</div>
      </button>
    );
    return (
      <div className="onb-guide-root" style={{ position: 'relative', margin: '8px 16px 0', zIndex: 40, minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}>
        <div style={{ borderRadius: 12, padding: '12px 14px', background: 'linear-gradient(135deg,#0b1224,#1e1b4b)', color: '#fff', border: '1px solid rgba(124,58,237,0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 2 }}>
            <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 900 }}>🧭 {t('onboard.bizModel.prompt', '먼저 비즈니스 모델을 선택하세요 — 시작 단계가 여기에 맞춰집니다.')}</div>
            <button onClick={hide} title={t('onboard.hide', '숨기기')} style={{ flexShrink: 0, padding: '3px 9px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 11, fontWeight: 800 }}>{t('onboard.hide', '숨기기')} ×</button>
          </div>
          <div style={{ fontSize: 11.5, color: '#c7d2fe', marginBottom: 10 }}>{t('onboard.bizModel.sub', '실물 상품을 파는지, 서비스·구독·플랫폼 자체를 알리는지에 따라 안내가 달라집니다.')}</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {card('commerce', '📦', t('onboard.bizModel.commerce', '실물 커머스'), t('onboard.bizModel.commerceDesc', '실물 상품 판매 · 재고/창고/주문 관리(상품→창고→입고→채널→주문 동기화).'))}
            {card('service', '🧩', t('onboard.bizModel.service', '서비스·구독·디지털'), t('onboard.bizModel.serviceDesc', '서비스/구독/플랫폼 자체가 상품 · 물류 없음(서비스 등록→채널→결제→마케팅 자동화).'))}
            {card('both', '📦🧩', t('onboard.bizModel.both', '실물 + 서비스 둘 다'), t('onboard.bizModel.bothDesc', '실물 상품과 서비스·구독을 함께 운영 · 두 등록 단계를 모두 진행합니다.'))}
          </div>
        </div>
      </div>
    );
  }

  const toggle = () => { const v = !expanded; setExpanded(v); try { localStorage.setItem(expandKey, v ? '1' : '0'); } catch {} };
  const markWelcomed = () => { try { localStorage.setItem(welcomedKey, '1'); } catch {} setWelcomed(true); };
  const pct = Math.round(doneCount / STEPS.length * 100);
  const hBtn = { padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 11, fontWeight: 800, flexShrink: 0 };

  return (
    <div className="onb-guide-root" style={{ position: 'relative', margin: '8px 16px 0', zIndex: 40, minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* [현 차수] ★단일 1줄 컴팩트 바 + 펼침 오버레이 — 페이지 콘텐츠 높이 잠식 방지(초엔터프라이즈 균형). */}
      <style>{`
        @keyframes onbPulse{0%,100%{transform:scale(1);box-shadow:0 4px 14px rgba(124,58,237,0.45)}50%{transform:scale(1.07);box-shadow:0 10px 28px rgba(124,58,237,0.75)}}
        @keyframes onbGlow{0%{box-shadow:0 0 0 0 rgba(124,58,237,0.55)}100%{box-shadow:0 0 0 10px rgba(124,58,237,0)}}
        @keyframes onbArrow{0%,100%{transform:translateX(0)}50%{transform:translateX(5px)}}
        @keyframes onbBlink{0%,100%{opacity:1}50%{opacity:0.5}}
        /* [현 차수] "지금 먼저!" 강조 대폭 강화 — 접속 즉시 시선 집중 */
        @keyframes onbNow{0%,100%{transform:scale(1) rotate(-1deg)}50%{transform:scale(1.13) rotate(1deg)}}
        @keyframes onbRing{0%{box-shadow:0 0 0 0 rgba(239,68,68,0.65),0 0 0 0 rgba(245,158,11,0.5)}100%{box-shadow:0 0 0 14px rgba(239,68,68,0),0 0 0 22px rgba(245,158,11,0)}}
        @keyframes onbBarGlow{0%,100%{box-shadow:0 0 0 1px rgba(245,158,11,0.5),0 6px 20px rgba(239,68,68,0.18)}50%{box-shadow:0 0 0 2px rgba(245,158,11,0.9),0 10px 30px rgba(239,68,68,0.42)}}
        @keyframes onbHand{0%,100%{transform:translateY(0) rotate(0)}25%{transform:translateY(-3px) rotate(-12deg)}75%{transform:translateY(-3px) rotate(12deg)}}
        .onb-cta{animation:onbPulse 1.4s ease-in-out infinite}
        .onb-num{animation:onbGlow 1.6s ease-out infinite}
        .onb-arrow{display:inline-block;animation:onbArrow 1s ease-in-out infinite}
        .onb-now{animation:onbBlink 1.2s ease-in-out infinite}
        /* 큰 "지금 먼저!" 배지 — 스케일+회전 펄스 + 확산 링 */
        .onb-now-big{animation:onbNow 1s ease-in-out infinite,onbRing 1.5s ease-out infinite}
        .onb-hand{display:inline-block;animation:onbHand 0.8s ease-in-out infinite;transform-origin:70% 70%}
        /* 현재단계 CTA 바 전체 글로우 테두리 */
        .onb-curbar{animation:onbBarGlow 1.6s ease-in-out infinite}
        .onb-row-cur{position:relative}
        .onb-row-cur::before{content:'';position:absolute;left:0;top:8px;bottom:8px;width:4px;border-radius:4px;background:linear-gradient(180deg,#4f46e5,#7c3aed);animation:onbBlink 1.2s ease-in-out infinite}
      `}</style>
      {/* ── 단일 1줄 컴팩트 바(항상 보임) — 현재 단계 강조 + 바로가기. 높이 ~46px 고정. ── */}
      <div className={step && !onStepPage ? 'onb-curbar' : ''} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 12,
        background: 'linear-gradient(135deg,#0b1224,#1e1b4b)', color: '#fff',
        border: '1px solid rgba(124,58,237,0.4)', overflow: 'hidden', whiteSpace: 'nowrap',
      }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>{allDone ? '🎉' : '🧭'}</span>
        {step ? (<>
          <span className="onb-now-big" style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 900, padding: '5px 11px', borderRadius: 99, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: '#fff' }}><span className="onb-hand">👉</span> {t('onboard.doFirst', '지금 먼저!')}</span>
          <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 900, color: '#fcd34d' }}>STEP {firstIdx + 1}/{STEPS.length}</span>
          <span style={{ flex: 1, minWidth: 40, fontSize: 13.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis' }}>{step.icon} {t(`onboard.step.${step.id}.title`, step.title)}</span>
          {!onStepPage
            ? <button className="onb-cta" onClick={() => nav(step.route)} style={{ flexShrink: 0, padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontWeight: 900, fontSize: 12.5 }}>{t('onboard.shortcut', '바로가기')} <span className="onb-arrow">→</span></button>
            : <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, color: '#86efac' }}>✓ {t('onboard.onThisPage', '진행 중')}</span>}
        </>) : (
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis' }}>{allDone ? t('onboard.allDoneTitle', '모든 시작 단계를 완료했습니다!') : t('onboard.guideTitle', 'GeniegoROI 시작 가이드')}</span>
        )}
        <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 900, color: '#c7d2fe' }}>{doneCount}/{STEPS.length}</span>
        {/* [현 차수] 하나(실물/서비스)를 고른 뒤에도 메인 바에서 '추가 선택' → 둘 다 등록 가능(both 병합). */}
        {(bizModel === 'commerce' || bizModel === 'service') && (
          <button onClick={() => chooseModel('both')}
            title={t('onboard.bizModel.addBothHint', '다른 유형도 함께 등록합니다')}
            style={{ ...hBtn, flexShrink: 0, background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', color: '#fff' }}>
            + {bizModel === 'commerce' ? t('onboard.bizModel.addService', '서비스 추가') : t('onboard.bizModel.addCommerce', '실물상품 추가')}
          </button>
        )}
        <button onClick={toggle} style={hBtn}>{expanded ? t('onboard.collapse', '접기') + ' ▴' : t('onboard.expand', '펼치기') + ' ▾'}</button>
        <button onClick={hide} title={t('onboard.hide', '숨기기')} style={{ ...hBtn, padding: '4px 8px' }}>×</button>
      </div>

      {/* ── 펼침: 전체 체크리스트 — ★absolute 오버레이(페이지 콘텐츠를 밀지 않음, 위에 떠서 표시) ── */}
      {expanded && (
      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, zIndex: 60, borderRadius: 14, boxShadow: '0 18px 44px rgba(15,23,42,0.34)', border: '1px solid rgba(124,58,237,0.35)', maxHeight: '72vh', overflowY: 'auto', padding: '10px 12px', background: 'linear-gradient(135deg,#eef2ff,#f5f3ff)' }}>
        {firstVisit && <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, margin: '2px 6px 8px' }}>{t('onboard.welcomeDesc', '이용가이드를 보지 않아도 됩니다. 아래 순서대로만 진행하면 자동 설정이 완료됩니다.')}</div>}
        {STEPS.map((s, i) => {
          const d = doneFlags[i];
          const cur = i === firstIdx;
          const here = loc.pathname === s.route;
          return (
            <div key={s.id} className={cur && !d ? 'onb-row-cur' : ''} onClick={() => nav(s.route)} style={{
              display: 'flex', alignItems: 'flex-start', gap: 11, padding: '10px 12px', borderRadius: 11, cursor: 'pointer',
              background: cur && !d ? 'rgba(124,58,237,0.12)' : here ? 'rgba(34,197,94,0.08)' : 'transparent',
              border: `1px solid ${cur && !d ? 'rgba(124,58,237,0.4)' : 'transparent'}`, marginBottom: 4, transition: 'background .2s',
            }}>
              <span className={cur && !d ? 'onb-num' : ''} style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 900, background: d ? '#22c55e' : cur ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'rgba(148,163,184,0.25)',
                color: d || cur ? '#fff' : '#64748b',
              }}>{d ? '✓' : i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: cur && !d ? 15 : 13, fontWeight: cur && !d ? 900 : 800, color: d ? '#16a34a' : cur && !d ? '#4f46e5' : '#0f172a' }}>
                  {s.icon} {t(`onboard.step.${s.id}.title`, s.title)}
                  {d && <span style={{ fontSize: 10.5, color: '#16a34a', fontWeight: 700 }}> · {t('onboard.completed', '완료')}</span>}
                  {cur && !d && <span className="onb-now-big" style={{ marginLeft: 9, display: 'inline-block', fontSize: 12, fontWeight: 900, padding: '4px 12px', borderRadius: 99, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: '#fff', verticalAlign: 'middle' }}><span className="onb-hand">👉</span> {t('onboard.doNow', '지금 할 일')}</span>}
                </div>
                {(cur || here) && !d && (
                  <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, marginTop: 3 }}>
                    {t(`onboard.step.${s.id}.action`, s.action)}
                    {here && <span style={{ color: '#16a34a', fontWeight: 700 }}> {t('onboard.saveAdvances', '— 저장하면 자동으로 다음 단계로 안내합니다.')}</span>}
                  </div>
                )}
              </div>
              {cur && !here && (
                <span className="onb-cta" style={{ flexShrink: 0, alignSelf: 'center', padding: '10px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontWeight: 900, fontSize: 13.5, whiteSpace: 'nowrap' }}>{t('onboard.shortcut', '바로가기')} <span className="onb-arrow">→</span></span>
              )}
            </div>
          );
        })}
        {/* 액션 푸터 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 6, padding: '4px 6px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            {t('onboard.freeMove', '원하는 단계를 눌러 자유롭게 이동할 수 있습니다.')}
            {/* [현 차수] 모델 순환 전환(실물→서비스→둘 다→…) — 하나만 선택 후에도 '둘 다' 로 이동 가능. */}
            {(() => {
              const next = bizModel === 'commerce' ? 'both' : bizModel === 'both' ? 'service' : 'commerce';
              const label = next === 'both' ? t('onboard.bizModel.toBoth', '실물+서비스 둘 다로 전환')
                : next === 'service' ? t('onboard.bizModel.toService', '서비스·구독으로 전환')
                : t('onboard.bizModel.toCommerce', '실물 커머스로 전환');
              return (
                <button onClick={(e) => { e.stopPropagation(); chooseModel(next); }} style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 7, border: '1px solid #cbd5e1', cursor: 'pointer', background: '#fff', color: '#4f46e5', fontSize: 10.5, fontWeight: 800 }}>
                  {label}
                </button>
              );
            })()}
          </div>
          {firstVisit
            ? <button onClick={() => { markWelcomed(); if (step) nav(step.route); }} style={{ padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontWeight: 800, fontSize: 12.5 }}>{allDone ? t('onboard.start', '시작하기') : t('onboard.startFirst', '첫 단계부터 시작')} →</button>
            : (allDone ? <button onClick={markWelcomed} style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid #cbd5e1', cursor: 'pointer', background: '#fff', color: '#334155', fontWeight: 800, fontSize: 12 }}>{t('onboard.dismissDone', '확인 · 닫기')}</button> : null)}
        </div>
      </div>
      )}
    </div>
  );
}
