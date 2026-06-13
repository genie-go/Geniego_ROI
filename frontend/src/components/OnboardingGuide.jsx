import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useI18n } from '../i18n';

/* [현 차수] ★구독회원 단계별 진행 안내(이용가이드 불필요).
 *  - 첫 방문: 환영 인사 + 선행 작업 순서를 처음부터 안내.
 *  - 재방문: 어디까지 완료했는지 + 다음 할 일 + [바로가기]. 원하는 다른 단계로도 자유 이동.
 *  - 완료 여부는 실데이터(GlobalData)에서 파생 → 이미 끝낸 선행작업은 ✓로 표시(다시 시키지 않음).
 *  - 해당 메뉴에서 저장하면 데이터가 바뀌어 자동으로 다음 단계로 진행. 전부 완료 시 사라짐. */

/* [현 차수] ★순서 정정: GeniegoROI는 WMS·카탈로그 보유 → 내부 기반(상품→창고→입고)을 먼저 갖춘 뒤
   채널 연동·주문 동기화로 진행하는 정방향(사방넷형). 완료신호는 GlobalData(inventory.stock 등)에서 파생. */
const _stockSum = (i) => Object.values((i && i.stock) || {}).reduce((s, v) => s + (Number(v) || 0), 0);
const STEPS = [
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
  const [welcomed, setWelcomed] = useState(() => { try { return localStorage.getItem(welcomedKey) === '1'; } catch { return true; } });
  // [현 차수] ★항상 기본 접힘(단일 1줄) — 안내 배너가 페이지 콘텐츠 높이를 잠식하지 않도록.
  //   펼침은 사용자가 명시적으로 [펼치기]를 눌렀을 때만(absolute 오버레이로 표시 → 페이지 안 밀림).
  //   (218차 '첫 방문 자동 펼침'이 전 페이지 컨테이너 높이를 압축하는 회귀를 유발해 제거.)
  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem(expandKey) === '1'; } catch { return false; }
  });

  const doneFlags = STEPS.map((s) => isDone(s, gd));
  const doneCount = doneFlags.filter(Boolean).length;
  const allDone = doneCount === STEPS.length;
  const firstIdx = doneFlags.findIndex((d) => !d);            // 첫 미완료 = 현재 단계
  const step = firstIdx >= 0 ? STEPS[firstIdx] : null;
  const onStepPage = step && loc.pathname === step.route;
  const firstVisit = !welcomed;

  // 전부 완료 + 이미 환영을 봤으면 숨김.
  if (allDone && welcomed) return null;

  const toggle = () => { const v = !expanded; setExpanded(v); try { localStorage.setItem(expandKey, v ? '1' : '0'); } catch {} };
  const markWelcomed = () => { try { localStorage.setItem(welcomedKey, '1'); } catch {} setWelcomed(true); };
  const pct = Math.round(doneCount / STEPS.length * 100);
  const hBtn = { padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 11, fontWeight: 800, flexShrink: 0 };

  return (
    <div style={{ position: 'relative', margin: '8px 16px 0', zIndex: 40 }}>
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
        <button onClick={toggle} style={hBtn}>{expanded ? t('onboard.collapse', '접기') + ' ▴' : t('onboard.expand', '펼치기') + ' ▾'}</button>
        <button onClick={markWelcomed} title={t('onboard.dismiss', '닫기')} style={{ ...hBtn, padding: '4px 8px' }}>×</button>
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
          <div style={{ fontSize: 11, color: '#64748b' }}>{t('onboard.freeMove', '원하는 단계를 눌러 자유롭게 이동할 수 있습니다.')}</div>
          {firstVisit
            ? <button onClick={() => { markWelcomed(); if (step) nav(step.route); }} style={{ padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontWeight: 800, fontSize: 12.5 }}>{allDone ? t('onboard.start', '시작하기') : t('onboard.startFirst', '첫 단계부터 시작')} →</button>
            : (allDone ? <button onClick={markWelcomed} style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid #cbd5e1', cursor: 'pointer', background: '#fff', color: '#334155', fontWeight: 800, fontSize: 12 }}>{t('onboard.dismissDone', '확인 · 닫기')}</button> : null)}
        </div>
      </div>
      )}
    </div>
  );
}
