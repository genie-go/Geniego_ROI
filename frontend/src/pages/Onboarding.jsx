import React, { useState } from "react";
import { IS_DEMO } from '../utils/demoEnv';
import { useI18n } from '../i18n';

/* ── Enterprise Demo Isolation Guard ─── */
const _isDemo = IS_DEMO; // 180차: demoEnv 정본 격리

/* 199차: 영문 하드코딩 스텁 → i18n(onboarding 네임스페이스, 15개국) + 탭별 콘텐츠 전환 실구현.
   기존 tour 5스텝/역할별 경로 키 재사용. 운영=진행0(빈 시작), 데모=일부 완료 표시. */
export default function Onboarding() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(0);
  const o = (k, fb) => t('onboarding.' + k, fb);

  const TABS = [o('tabSteps', '📋 진행 단계'), o('tabRoles', '🧭 역할별 경로'), o('tabHelp', '❓ 도움말')];

  // 온보딩 5단계 (기존 tour 키 재사용). 데모는 앞 3단계 완료로 표시.
  const stepKeys = ['welcome', 'dashboard', 'marketing', 'integration', 'complete'];
  const doneCount = IS_DEMO ? 3 : 0;
  const steps = stepKeys.map((k, i) => ({
    title: t('onboarding.tour.' + k + '.title', k),
    desc: t('onboarding.tour.' + k + '.desc', ''),
    done: i < doneCount,
    current: i === doneCount,
  }));
  const pct = Math.round((doneCount / stepKeys.length) * 100);

  const roles = [
    { emoji: '📈', name: o('roleMarketer', '마케터'), desc: o('guideSecMarketer', '광고 채널 연동, 어트리뷰션, AI 마케팅, CRM, A/B 테스트를 학습합니다.') },
    { emoji: '🛒', name: o('roleCommerce', '커머스'), desc: o('guideSecCommerce', '멀티채널, 주문 허브, WMS, 정산, 재고 경고를 학습합니다.') },
    { emoji: '💰', name: o('roleFinance', '재무'), desc: o('guideSecFinance', 'P&L, 채널별 수익성, 정산 대사, ESG, 자동 보고서를 학습합니다.') },
    { emoji: '🚚', name: o('roleOps', '운영'), desc: o('guideSecOps', '3PL, 공급망, 반품 포탈, 아시아 물류, 운영 알림을 학습합니다.') },
    { emoji: '🛠️', name: o('roleDev', '개발'), desc: o('guideSecDev', 'API 키, 커넥터, 데이터 스키마, 모니터링, AI 정책을 학습합니다.') },
  ];

  const kpis = [
    { emoji: '✅', label: o('kpiStepsDone', '완료 단계'), val: `${doneCount}/${stepKeys.length}` },
    { emoji: '📊', label: o('kpiProgress', '진행률'), val: `${pct}%` },
    { emoji: '⏱️', label: o('kpiEstTime', '예상 소요'), val: o('estimatedTime', '역할당 30분 이내').replace('예상 소요: ', '') },
  ];

  const CARD = { borderRadius: 16, padding: "24px 28px", minHeight: 320, background: "var(--surface, #ffffff)", border: "1px solid var(--border, #e5e7eb)" };

  return (
    <div style={{ padding: 24, minHeight: "100%", color: "var(--text-1, #0f172a)" }}>
      <div style={{ borderRadius: 18, padding: "28px 32px", marginBottom: 22, background: "linear-gradient(135deg, rgba(79,142,247,0.08), rgba(99,102,241,0.06))", border: "1px solid rgba(79,142,247,0.12)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 32 }}>🚀</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1, #0f172a)" }}>{o('pageTitle', '🚀 온보딩 가이드')}</div>
            <div style={{ fontSize: 13, color: "var(--text-3, #64748b)", marginTop: 2 }}>{o('pageSub', '단계별 플랫폼 설정과 역할별 시작 경로 안내')}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ borderRadius: 14, padding: "14px 20px", background: "var(--surface, #ffffff)", border: "1px solid var(--border, #e5e7eb)", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 26, flex: "0 0 auto" }}>{k.emoji}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1, #0f172a)", lineHeight: 1.15 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: "var(--text-3, #64748b)", fontWeight: 600, marginTop: 2 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, padding: 4, borderRadius: 12, background: "var(--surface-2, #f1f5f9)", border: "1px solid var(--border, #e5e7eb)", flexWrap: 'wrap' }}>
        {TABS.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{ flex: '1 1 120px', padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, transition: "all 0.2s", background: activeTab === i ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "transparent", color: activeTab === i ? "#fff" : "var(--text-2, #475569)" }}>{tab}</button>
        ))}
      </div>

      <div style={CARD}>
        {/* Tab 0: 진행 단계 */}
        {activeTab === 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1,#0f172a)' }}>{o('stepsTitle', '온보딩 단계')}</div>
              <div style={{ flex: 1, maxWidth: 260, height: 8, borderRadius: 99, background: 'var(--surface-2,#eef1f5)', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#4f8ef7,#6366f1)' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {steps.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 18px', borderRadius: 12, background: s.current ? 'rgba(79,142,247,0.06)' : 'var(--surface-2,#f8fafc)', border: `1px solid ${s.current ? 'rgba(79,142,247,0.25)' : 'var(--border,#e5e7eb)'}` }}>
                  <span style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', background: s.done ? '#16a34a' : s.current ? '#4f8ef7' : '#cbd5e1' }}>{s.done ? '✓' : i + 1}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1,#0f172a)' }}>{s.title}
                      {s.done && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: '#16a34a' }}>{o('stepDone', '완료')}</span>}
                      {s.current && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: '#4f8ef7' }}>{o('stepCurrent', '진행 중')}</span>}
                    </div>
                    {s.desc && <div style={{ fontSize: 12, color: 'var(--text-3,#64748b)', marginTop: 4, lineHeight: 1.6 }}>{s.desc}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 1: 역할별 경로 */}
        {activeTab === 1 && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 18, color: 'var(--text-1,#0f172a)' }}>{o('guideRolesTitle', '역할별 경로 안내')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 14 }}>
              {roles.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, padding: '16px 18px', borderRadius: 12, background: 'var(--surface-2,#f8fafc)', border: '1px solid var(--border,#e5e7eb)' }}>
                  <span style={{ fontSize: 26, flexShrink: 0 }}>{r.emoji}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1,#0f172a)', marginBottom: 4 }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3,#64748b)', lineHeight: 1.6 }}>{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: 도움말 */}
        {activeTab === 2 && (
          <div style={{ maxWidth: 620 }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, color: 'var(--text-1,#0f172a)' }}>{o('helpTitle', '도움이 필요하신가요?')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-2,#475569)', lineHeight: 1.7, marginBottom: 18 }}>{o('helpDesc', '각 기능의 자세한 사용법은 이용 가이드에서 확인하거나, 우측 상단 도움말을 이용하세요.')}</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href="/help-center" style={{ padding: '10px 20px', borderRadius: 10, fontWeight: 800, fontSize: 13, color: '#fff', textDecoration: 'none', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)' }}>{o('viewGuide', '이용 가이드')}</a>
              <a href="/dashboard" style={{ padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13, color: 'var(--text-2,#475569)', textDecoration: 'none', background: 'var(--surface-2,#f1f5f9)', border: '1px solid var(--border,#e5e7eb)' }}>{o('goToDashboard', '대시보드로 이동')}</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
