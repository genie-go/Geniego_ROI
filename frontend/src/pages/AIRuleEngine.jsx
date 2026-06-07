import React, { useState } from "react";
import { IS_DEMO } from '../utils/demoEnv';
import { useI18n } from '../i18n';

const _isDemo = IS_DEMO; // 180차: demoEnv 정본 격리 (운영=빈값, 데모=샘플)

/* 199차: 영문 하드코딩 스텁 → i18n(aiRuleEngine 네임스페이스, 15개국) + 탭별 콘텐츠 전환 실구현.
   운영은 백엔드 미연동이므로 빈 상태(목데이터 오염 차단), 데모(IS_DEMO)만 샘플 노출. */
export default function AIRuleEngine() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState({ name: '', trigger: '', action: '' });

  const tr = (k, fb) => t('aiRuleEngine.' + k, fb);

  const TABS = [
    tr('tabRules', '📋 규칙'),
    tr('tabCreate', '➕ 규칙 생성'),
    tr('tabExecLog', '📜 실행 로그'),
    tr('tabLearning', '📈 학습 상태'),
  ];

  // 데모 전용 샘플 (운영=빈 배열)
  const rules = IS_DEMO ? [
    { name: 'Low ROAS Guard', trigger: 'ROAS < 2.0 (3d)', action: '예산 -15%', acc: '98.4%', on: true },
    { name: 'High Return Alert', trigger: '반품률 > 12%', action: '카탈로그 일시중지', acc: '96.1%', on: true },
    { name: 'Scale Winner', trigger: 'ROAS ≥ 4.0', action: '예산 +15%', acc: '99.0%', on: false },
  ] : [];
  const logs = IS_DEMO ? [
    { time: '2026-06-07 09:12', name: 'Low ROAS Guard', result: t('aiRuleEngine.active', '활성') + ' · 예산 -15%' },
    { time: '2026-06-07 03:40', name: 'High Return Alert', result: '카탈로그 2건 일시중지' },
  ] : [];

  const kpis = [
    { emoji: '📏', label: tr('kpiActiveRules', '활성 규칙'), val: IS_DEMO ? 28 : 0 },
    { emoji: '⚡', label: tr('kpiTriggeredToday', '오늘 트리거'), val: IS_DEMO ? 156 : 0 },
    { emoji: '✅', label: tr('kpiSuccessRate', '성공률'), val: IS_DEMO ? '99.2%' : '—' },
    { emoji: '🔄', label: tr('kpiAutoActions', '자동 실행'), val: IS_DEMO ? 42 : 0 },
  ];

  const CARD = { borderRadius: 16, padding: '24px 28px', minHeight: 320, background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e5e7eb)' };
  const TH = { textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-3, #64748b)', padding: '10px 12px', borderBottom: '1px solid var(--border, #e5e7eb)', whiteSpace: 'nowrap' };
  const TD = { fontSize: 13, color: 'var(--text-1, #0f172a)', padding: '12px', borderBottom: '1px solid var(--border, #eef1f5)' };
  const empty = (msg, hint) => (
    <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-3, #64748b)' }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>🗂️</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2, #475569)' }}>{msg}</div>
      {hint && <div style={{ fontSize: 12, marginTop: 6 }}>{hint}</div>}
    </div>
  );

  return (
    <div style={{ padding: 24, minHeight: "100%", color: "var(--text-1, #0f172a)" }}>
      <div style={{ borderRadius: 18, padding: "28px 32px", marginBottom: 22, background: "linear-gradient(135deg, rgba(79,142,247,0.08), rgba(99,102,241,0.06))", border: "1px solid rgba(79,142,247,0.12)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 32 }}>🧠</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1, #0f172a)" }}>{tr('pageTitle', '🧠 AI 학습 규칙 엔진')}</div>
            <div style={{ fontSize: 13, color: "var(--text-3, #64748b)", marginTop: 2 }}>{tr('pageSub', 'ML 기반 규칙 자동 최적화 · 이상 징후 감지 · 자동 실행')}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ borderRadius: 14, padding: "18px 20px", background: "var(--surface, #ffffff)", border: "1px solid var(--border, #e5e7eb)" }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{k.emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1, #0f172a)" }}>{k.val}</div>
            <div style={{ fontSize: 11, color: "var(--text-3, #64748b)", fontWeight: 600, marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, padding: 4, borderRadius: 12, background: "var(--surface-2, #f1f5f9)", border: "1px solid var(--border, #e5e7eb)", flexWrap: 'wrap' }}>
        {TABS.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{ flex: '1 1 120px', padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, transition: "all 0.2s", background: activeTab === i ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "transparent", color: activeTab === i ? "#fff" : "var(--text-2, #475569)" }}>{tab}</button>
        ))}
      </div>

      <div style={CARD}>
        {/* Tab 0: 규칙 목록 */}
        {activeTab === 0 && (
          rules.length === 0 ? empty(tr('noRules', '생성된 규칙이 없습니다.'), tr('rulesEmptyHint', '운영 데이터가 연동되면 규칙이 여기에 표시됩니다.')) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={TH}>{tr('ruleName', '규칙 이름')}</th><th style={TH}>{tr('trigger', '트리거')}</th>
                  <th style={TH}>{tr('action', '행동')}</th><th style={TH}>{tr('accuracy', '정확성')}</th><th style={TH}>{tr('status', '상태')}</th>
                </tr></thead>
                <tbody>
                  {rules.map((r, i) => (
                    <tr key={i}>
                      <td style={{ ...TD, fontWeight: 700 }}>{r.name}</td><td style={TD}>{r.trigger}</td>
                      <td style={TD}>{r.action}</td><td style={{ ...TD, fontFamily: 'monospace', color: '#16a34a' }}>{r.acc}</td>
                      <td style={TD}><span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: r.on ? 'rgba(22,163,74,0.1)' : 'rgba(100,116,139,0.12)', color: r.on ? '#16a34a' : '#64748b' }}>{r.on ? tr('active', '활성') : tr('inactive', '비활성')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize: 11, color: 'var(--text-3,#64748b)', marginTop: 12 }}>{tr('samplesDemoOnly', '※ 샘플 데이터는 데모 환경에서만 표시됩니다.')}</div>
            </div>
          )
        )}

        {/* Tab 1: 규칙 생성 */}
        {activeTab === 1 && (
          <div style={{ maxWidth: 560 }}>
            <div style={{ fontSize: 13, color: 'var(--text-2,#475569)', marginBottom: 18, lineHeight: 1.6 }}>{tr('createDesc', '조건(트리거)과 행동(액션)을 정의하면 AI가 규칙을 자동 실행·최적화합니다.')}</div>
            {[['name', tr('ruleName', '규칙 이름'), ''], ['trigger', tr('trigger', '트리거'), tr('triggerPlaceholder', '예: ROAS < 2.0 이 3일 연속')], ['action', tr('action', '행동'), tr('actionPlaceholder', '예: 캠페인 예산 15% 증액')]].map(([key, label, ph]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-2,#475569)', marginBottom: 6 }}>{label}</label>
                <input value={form[key]} placeholder={ph} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border,#e5e7eb)', background: 'var(--surface,#fff)', color: 'var(--text-1,#0f172a)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <button style={{ marginTop: 8, padding: '11px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 13, color: '#fff', background: 'linear-gradient(135deg,#4f8ef7,#6366f1)' }}>{tr('save', '저장')}</button>
          </div>
        )}

        {/* Tab 2: 실행 로그 */}
        {activeTab === 2 && (
          logs.length === 0 ? empty(tr('noLogs', '실행 로그가 없습니다.'), tr('rulesEmptyHint', '운영 데이터가 연동되면 규칙이 여기에 표시됩니다.')) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={TH}>{tr('execTime', '실행 시각')}</th><th style={TH}>{tr('ruleName', '규칙 이름')}</th><th style={TH}>{tr('result', '결과')}</th>
                </tr></thead>
                <tbody>
                  {logs.map((l, i) => (<tr key={i}><td style={{ ...TD, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{l.time}</td><td style={{ ...TD, fontWeight: 700 }}>{l.name}</td><td style={TD}>{l.result}</td></tr>))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Tab 3: 학습 상태 */}
        {activeTab === 3 && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 18, color: 'var(--text-1,#0f172a)' }}>{tr('learningStatus', 'AI 학습 현황')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 14 }}>
              {[[tr('trainingData', '훈련 데이터'), IS_DEMO ? '1,284,500' : '0'], [tr('modelAccuracy', '모델 정확도'), IS_DEMO ? '99.2%' : '—'], [tr('accuracy', '정확성'), IS_DEMO ? '98.6%' : '—']].map(([label, val], i) => (
                <div key={i} style={{ borderRadius: 12, padding: '18px 20px', background: 'var(--surface-2,#f8fafc)', border: '1px solid var(--border,#e5e7eb)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-3,#64748b)', fontWeight: 600, marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#4f8ef7' }}>{val}</div>
                </div>
              ))}
            </div>
            {!IS_DEMO && <div style={{ fontSize: 12, color: 'var(--text-3,#64748b)', marginTop: 16 }}>{tr('rulesEmptyHint', '운영 데이터가 연동되면 규칙이 여기에 표시됩니다.')}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
