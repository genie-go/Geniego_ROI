import React, { useState, useMemo, useEffect } from "react";
import { IS_DEMO } from '../utils/demoEnv';
import { useI18n } from '../i18n';
import { tGetJSON, tSetJSON } from '../utils/tenantStorage.js';

/* ═══════════════════════════════════════════════════════════════
   FeedbackCenter — 고객 피드백 센터 (Enterprise)
   ★ 격리(189차+): 데모(IS_DEMO)만 샘플 피드백. 운영은 테넌트 격리 실데이터/빈상태.
     - 피드백은 tenant 스코프 localStorage('fb_entries')에 저장 → 타 계정 유입 차단.
     - KPI 는 항목 배열에서 계산 → 운영은 자동 0(가짜 수치 금지).
   ═══════════════════════════════════════════════════════════════ */

const SENTIMENTS = {
  positive: { color: '#22c55e', emoji: '😊', ko: '긍정' },
  neutral:  { color: '#eab308', emoji: '😐', ko: '중립' },
  negative: { color: '#ef4444', emoji: '😞', ko: '부정' },
};
const CHANNELS = {
  web:    { ko: '웹', icon: '🌐' },
  app:    { ko: '앱', icon: '📱' },
  email:  { ko: '이메일', icon: '✉️' },
  kakao:  { ko: '카카오', icon: '💬' },
  review: { ko: '리뷰', icon: '⭐' },
};

// 데모 전용 샘플 (운영에는 절대 들어가지 않음 — IS_DEMO 게이트)
const DEMO_FEEDBACK = [
  { id: 'f1', channel: 'web',    sentiment: 'positive', rating: 5, author: 'Jiwoo H.', text: '대시보드에서 채널별 ROAS를 한눈에 볼 수 있어 광고비 배분이 훨씬 쉬워졌어요.', at: '2h', resolved: true },
  { id: 'f2', channel: 'app',    sentiment: 'neutral',  rating: 3, author: 'Mina P.',  text: '리포트 내보내기는 좋은데 모바일에서 표가 조금 좁게 보입니다.', at: '5h', resolved: false },
  { id: 'f3', channel: 'review', sentiment: 'positive', rating: 5, author: 'Tom L.',   text: '정산·반품 데이터까지 합쳐 실질 수익 기준으로 봐서 의사결정이 빨라졌습니다.', at: '1d', resolved: true },
  { id: 'f4', channel: 'email',  sentiment: 'negative', rating: 2, author: 'Sora K.',  text: '연동 채널 동기화가 가끔 지연되는데 알림이 늦게 와요. 개선 부탁드립니다.', at: '1d', resolved: false },
  { id: 'f5', channel: 'kakao',  sentiment: 'positive', rating: 4, author: 'Daniel C.',text: 'AI 추천 예산 배분이 실제 성과로 이어져서 만족합니다.', at: '2d', resolved: true },
  { id: 'f6', channel: 'web',    sentiment: 'neutral',  rating: 3, author: 'Yuna J.',  text: '온보딩 가이드가 더 자세하면 처음 쓰는 팀원이 따라하기 좋겠어요.', at: '3d', resolved: false },
];

export default function FeedbackCenter() {
  const { t } = useI18n();
  const tr = (k, fb) => t(`feedbackCenter.${k}`, fb);
  const [activeTab, setActiveTab] = useState(0);

  const [entries, setEntries] = useState(() => IS_DEMO
    ? (tGetJSON('fb_entries', DEMO_FEEDBACK) || DEMO_FEEDBACK)
    : (tGetJSON('fb_entries', []) || []));
  useEffect(() => { tSetJSON('fb_entries', entries); }, [entries]);

  const [form, setForm] = useState({ channel: 'web', sentiment: 'positive', rating: 5, text: '' });
  const [showGuide, setShowGuide] = useState(false);

  const addEntry = () => {
    const v = form.text.trim();
    if (!v) return;
    setEntries(es => [{ id: 'fl' + Date.now(), channel: form.channel, sentiment: form.sentiment, rating: +form.rating, author: tr('youLabel', '나'), text: v, at: tr('justNow', '방금'), resolved: false }, ...es]);
    setForm({ channel: 'web', sentiment: 'positive', rating: 5, text: '' });
  };
  const toggleResolved = (id) => setEntries(es => es.map(e => e.id === id ? { ...e, resolved: !e.resolved } : e));
  const delEntry = (id) => setEntries(es => es.filter(e => e.id !== id));

  const stats = useMemo(() => {
    const total = entries.length;
    const by = { positive: 0, neutral: 0, negative: 0 };
    entries.forEach(e => { by[e.sentiment] = (by[e.sentiment] || 0) + 1; });
    const pct = (n) => total ? Math.round((n / total) * 100) : 0;
    const byChannel = {};
    entries.forEach(e => { byChannel[e.channel] = (byChannel[e.channel] || 0) + 1; });
    const avgRating = total ? (entries.reduce((s, e) => s + (e.rating || 0), 0) / total).toFixed(1) : '0.0';
    return { total, by, pct, byChannel, avgRating };
  }, [entries]);

  const tabs = [tr('tabDashboard', '대시보드'), tr('tabRecent', '최근 피드백'), tr('tabSentiment', '감성 분석'), tr('tabActions', '액션')];
  const kpis = [
    { emoji: '📩', label: tr('kpiTotal', '총 피드백'), val: stats.total, color: '#4f8ef7' },
    { emoji: '😊', label: tr('kpiPositive', '긍정'), val: stats.total ? stats.pct(stats.by.positive) + '%' : '—', color: '#22c55e' },
    { emoji: '😐', label: tr('kpiNeutral', '중립'), val: stats.total ? stats.pct(stats.by.neutral) + '%' : '—', color: '#eab308' },
    { emoji: '😞', label: tr('kpiNegative', '부정'), val: stats.total ? stats.pct(stats.by.negative) + '%' : '—', color: '#ef4444' },
  ];

  const Empty = ({ msg, hint }) => (
    <div style={{ textAlign: 'center', padding: '44px 20px', color: 'var(--text-3)' }}>
      <div style={{ fontSize: 38, marginBottom: 10 }}>💬</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>{msg}</div>
      {hint && <div style={{ fontSize: 11, marginTop: 6 }}>{hint}</div>}
    </div>
  );

  const SentimentBadge = ({ s }) => {
    const c = SENTIMENTS[s] || SENTIMENTS.neutral;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: c.color + '18', color: c.color, border: `1px solid ${c.color}33` }}>{c.emoji} {tr('sentiment_' + s, c.ko)}</span>;
  };

  const Row = ({ e, showResolve }) => {
    const ch = CHANNELS[e.channel] || { ko: e.channel, icon: '📨' };
    return (
      <div style={{ display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'var(--surface2, var(--surface))', border: '1px solid var(--border)', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 18, marginTop: 1 }}>{ch.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
            <SentimentBadge s={e.sentiment} />
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{tr('ch_' + e.channel, ch.ko)} · {'★'.repeat(e.rating)}{'☆'.repeat(5 - e.rating)}</span>
            <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 'auto' }}>{e.author} · {e.at}</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-1)', lineHeight: 1.6 }}>{e.text}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {showResolve && (
            <button onClick={() => toggleResolved(e.id)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '3px 8px', color: e.resolved ? '#22c55e' : 'var(--text-3)' }}>
              {e.resolved ? `✓ ${tr('resolved', '처리됨')}` : tr('markResolved', '처리')}
            </button>
          )}
          <button onClick={() => delEntry(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 13 }}>✕</button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
      {/* Hero */}
      <div className="hero fade-up" style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.08),rgba(99,102,241,0.06))', borderColor: 'rgba(79,142,247,0.15)' }}>
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.25),rgba(99,102,241,0.15))' }}>💬</div>
          <div>
            <div className="hero-title" style={{ background: 'linear-gradient(135deg,#4f8ef7,#6366f1)' }}>{tr('heroTitle', '고객 피드백 센터')}</div>
            <div className="hero-desc">{tr('heroDesc', '고객 의견을 수집하고 감성을 분석해 개선 액션으로 연결하세요')}</div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {kpis.map((k, i) => (
          <div key={i} className="card card-glass" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 24, flex: '0 0 auto' }}>{k.emoji}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: k.color, lineHeight: 1.15 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="card card-glass" style={{ padding: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{ flex: '0 0 auto', height: 36, padding: '0 16px', borderRadius: 10, border: activeTab === i ? 'none' : '1px solid var(--border)', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: activeTab === i ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'var(--surface)', color: activeTab === i ? '#fff' : 'var(--text-2)' }}>{tab}</button>
        ))}
      </div>

      <div className="card card-glass">
        {/* Dashboard */}
        {activeTab === 0 && (stats.total === 0 ? <Empty msg={tr('emptyAll', '수집된 피드백이 없습니다')} hint={!IS_DEMO ? tr('emptyHint', '아래 “피드백 추가”로 직접 등록하거나 채널을 연동하면 이곳에 집계됩니다') : null} /> : (
          <div style={{ display: 'grid', gap: 18 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-2)', marginBottom: 10 }}>{tr('sentimentDist', '감성 분포')} · {tr('avgRating', '평균 평점')} ⭐ {stats.avgRating}</div>
              <div style={{ display: 'flex', height: 14, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                {['positive', 'neutral', 'negative'].map(s => stats.by[s] > 0 && (
                  <div key={s} style={{ width: `${stats.pct(stats.by[s])}%`, background: SENTIMENTS[s].color }} title={`${SENTIMENTS[s].ko} ${stats.pct(stats.by[s])}%`} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
                {['positive', 'neutral', 'negative'].map(s => (
                  <span key={s} style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 2, background: SENTIMENTS[s].color }} />
                    {tr('sentiment_' + s, SENTIMENTS[s].ko)} {stats.by[s]}{tr('countUnit', '건')} ({stats.pct(stats.by[s])}%)
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-2)', marginBottom: 10 }}>{tr('byChannel', '채널별 수집')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                {Object.entries(stats.byChannel).map(([c, n]) => (
                  <div key={c} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface2, var(--surface))', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: 16 }}>{(CHANNELS[c] || {}).icon || '📨'}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)' }}>{n}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{tr('ch_' + c, (CHANNELS[c] || {}).ko || c)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Recent + add form */}
        {activeTab === 1 && (
          <div>
            <div style={{ display: 'grid', gap: 8, marginBottom: 14, padding: 14, borderRadius: 12, background: 'var(--surface2, var(--surface))', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-2)' }}>+ {tr('addFeedback', '피드백 추가')}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))} className="input" style={{ width: 120, height: 34, fontSize: 12 }}>
                  {Object.keys(CHANNELS).map(c => <option key={c} value={c}>{CHANNELS[c].icon} {tr('ch_' + c, CHANNELS[c].ko)}</option>)}
                </select>
                <select value={form.sentiment} onChange={e => setForm(f => ({ ...f, sentiment: e.target.value }))} className="input" style={{ width: 110, height: 34, fontSize: 12 }}>
                  {Object.keys(SENTIMENTS).map(s => <option key={s} value={s}>{SENTIMENTS[s].emoji} {tr('sentiment_' + s, SENTIMENTS[s].ko)}</option>)}
                </select>
                <select value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))} className="input" style={{ width: 90, height: 34, fontSize: 12 }}>
                  {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{'★'.repeat(r)}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addEntry()} placeholder={tr('feedbackPlaceholder', '고객 의견을 입력하고 Enter')} style={{ flex: 1, height: 36, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-1)', fontSize: 12, outline: 'none' }} />
                <button onClick={addEntry} className="btn-primary" style={{ height: 36, padding: '0 18px', fontSize: 12 }}>{tr('add', '추가')}</button>
              </div>
            </div>
            {entries.length === 0 ? <Empty msg={tr('emptyAll', '수집된 피드백이 없습니다')} /> : (
              <div style={{ display: 'grid', gap: 8 }}>
                {entries.map(e => <Row key={e.id} e={e} showResolve={false} />)}
              </div>
            )}
          </div>
        )}

        {/* Sentiment analysis */}
        {activeTab === 2 && (stats.total === 0 ? <Empty msg={tr('emptyAll', '수집된 피드백이 없습니다')} /> : (
          <div style={{ display: 'grid', gap: 14 }}>
            {['positive', 'neutral', 'negative'].map(s => {
              const list = entries.filter(e => e.sentiment === s);
              const c = SENTIMENTS[s];
              return (
                <div key={s} style={{ padding: 14, borderRadius: 12, background: c.color + '0a', border: `1px solid ${c.color}22` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 18 }}>{c.emoji}</span>
                    <span style={{ fontWeight: 800, fontSize: 13, color: c.color }}>{tr('sentiment_' + s, c.ko)}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{list.length}{tr('countUnit', '건')} · {stats.pct(list.length)}%</span>
                  </div>
                  {list.length === 0 ? <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{tr('noneInGroup', '해당 감성의 피드백이 없습니다')}</div> : (
                    <div style={{ display: 'grid', gap: 6 }}>
                      {list.slice(0, 4).map(e => (
                        <div key={e.id} style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.6, padding: '6px 10px', borderRadius: 8, background: 'var(--surface)' }}>“{e.text}” <span style={{ color: 'var(--text-3)' }}>— {tr('ch_' + e.channel, (CHANNELS[e.channel] || {}).ko || e.channel)}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Actions (unresolved needing response) */}
        {activeTab === 3 && (() => {
          const queue = entries.filter(e => !e.resolved && (e.sentiment === 'negative' || e.sentiment === 'neutral'));
          return queue.length === 0
            ? <Empty msg={tr('emptyActions', '대응이 필요한 피드백이 없습니다')} hint={stats.total > 0 ? tr('actionsHint', '부정·중립 피드백 중 미처리 건이 여기에 모입니다') : null} />
            : (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>{tr('actionQueueDesc', '부정·중립 피드백 중 미처리 건 — 우선 대응 대상')} ({queue.length})</div>
                {queue.map(e => <Row key={e.id} e={e} showResolve={true} />)}
              </div>
            );
        })()}
      </div>

      {/* Usage Guide */}
      <div style={{ marginTop: 4 }}>
        <button onClick={() => setShowGuide(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto 12px', padding: '10px 24px', borderRadius: 12, border: '1px solid rgba(79,142,247,0.3)', background: 'rgba(79,142,247,0.06)', color: '#4f8ef7', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          📖 {tr('guideTitle', '피드백 센터 이용 가이드')} {showGuide ? '▲' : '▼'}
        </button>
        {showGuide && (
          <div style={{ background: 'var(--surface2, rgba(255,255,255,0.025))', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 16, padding: 24 }}>
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 36, marginBottom: 6 }}>💬</div>
              <h2 style={{ fontSize: 19, fontWeight: 900, margin: '0 0 6px', color: 'var(--text-1)' }}>{tr('guideTitle', '피드백 센터 이용 가이드')}</h2>
              <p style={{ color: 'var(--text-3)', fontSize: 12, margin: 0 }}>{tr('guideSub', '초보자도 이 가이드만 보면 피드백 수집부터 개선 액션까지 운영할 수 있습니다')}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 18 }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} style={{ padding: 14, borderRadius: 12, background: 'rgba(79,142,247,0.04)', border: '1px solid rgba(79,142,247,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff' }}>{i}</span>
                    <span style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-1)' }}>{tr(`guideStep${i}Title`, '')}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>{tr(`guideStep${i}Desc`, '')}</p>
                </div>
              ))}
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginBottom: 6 }}>💡 {tr('guideTipTitle', '운영 팁')}</div>
              <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>{tr('guideTipDesc', '부정·중립 피드백은 “액션” 탭에서 우선 대응하세요. 처리 완료로 표시하면 대기열에서 자동으로 빠집니다.')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
