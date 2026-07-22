import React, { useState, useMemo, useEffect } from "react";
import { localizeDeep as _dloc } from "../utils/demoUiLocalize.js";
import { IS_DEMO } from '../utils/demoEnv';
import { useI18n } from '../i18n';
import { tGetJSON, tSetJSON } from '../utils/tenantStorage.js';

/* ═══════════════════════════════════════════════════════════════
   CaseStudy — 성공 사례 (Enterprise)
   ★ 격리 원칙(189차): 운영(www.genieroi.com)에는 가짜/목데이터 절대 유입 금지.
     - 데모(IS_DEMO)만 샘플 사례 노출.
     - 운영은 실데이터 또는 빈 상태(0). KPI 는 배열에서 계산 → 운영은 자동 0.
     - 북마크는 테넌트 격리 키(tKey)로 저장 → 타 계정 데이터 유입 차단.
   ═══════════════════════════════════════════════════════════════ */

// 데모 전용 샘플 (운영에는 절대 들어가지 않음 — IS_DEMO 게이트)
const DEMO_CASES = [
  { id: 'cs-1', industry: 'beauty', company: 'GlowLab', logo: '💄', sk: 'demoBeauty', summaryKo: '뷰티 브랜드가 채널별 ROAS를 통합 분석해 광고비를 재배분, 6개월 만에 ROI를 3배 이상 끌어올렸습니다.', roi: 312, period: 6, rating: 4.9, channels: ['Meta Ads', 'Naver', 'Coupang'], before: { roas: 1.8, revenue: 42 }, after: { roas: 4.6, revenue: 138 } },
  { id: 'cs-2', industry: 'fashion', company: 'Urbanette', logo: '👗', sk: 'demoFashion', summaryKo: '패션 브랜드가 숏폼 채널 중심으로 캠페인을 재편하고 크리에이티브를 AI로 최적화했습니다.', roi: 268, period: 4, rating: 4.7, channels: ['TikTok', 'Instagram'], before: { roas: 2.1, revenue: 30 }, after: { roas: 5.2, revenue: 96 } },
  { id: 'cs-3', industry: 'food', company: 'DailyBowl', logo: '🥗', sk: 'demoFood', summaryKo: '식품 브랜드가 정산·반품 데이터를 정규화해 실질 수익 기준으로 채널을 정리했습니다.', roi: 195, period: 8, rating: 4.6, channels: ['Naver', 'Kakao'], before: { roas: 1.5, revenue: 25 }, after: { roas: 3.4, revenue: 71 } },
  { id: 'cs-4', industry: 'electronics', company: 'VoltGear', logo: '🔌', sk: 'demoElec', summaryKo: '전자 브랜드가 검색·마켓플레이스 광고를 통합 관리하며 전환 가치를 기준으로 입찰을 최적화했습니다.', roi: 421, period: 5, rating: 4.8, channels: ['Google Ads', 'Amazon'], before: { roas: 2.4, revenue: 88 }, after: { roas: 6.1, revenue: 246 } },
  { id: 'cs-5', industry: 'beauty', company: 'PureSkin', logo: '🧴', sk: 'demoBeauty2', summaryKo: '스킨케어 브랜드가 인플루언서 ROI를 정량화해 협업 구조를 재설계했습니다.', roi: 287, period: 7, rating: 4.5, channels: ['Meta Ads', 'Coupang'], before: { roas: 1.9, revenue: 36 }, after: { roas: 4.8, revenue: 121 } },
  { id: 'cs-6', industry: 'fashion', company: 'NordWear', logo: '🧥', sk: 'demoFashion2', summaryKo: '아우터 브랜드가 시즌 프로모션과 쿠폰을 데이터 기반으로 운영해 마진을 개선했습니다.', roi: 233, period: 6, rating: 4.4, channels: ['Instagram', 'Naver'], before: { roas: 2.0, revenue: 28 }, after: { roas: 4.3, revenue: 84 } },
];
_dloc(DEMO_CASES);

const INDUSTRY = { all: '🗂', beauty: '💄', fashion: '👗', food: '🥗', electronics: '🔌' };

export default function CaseStudy() {
  const { t } = useI18n();
  const tr = (k, fb) => t(`caseStudy.${k}`, fb);
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [bookmarks, setBookmarks] = useState(() => tGetJSON('case_bookmarks', []) || []);

  // ★ 격리: 데모만 샘플, 운영은 빈 배열(실데이터 연동 전까지 빈 상태)
  const cases = useMemo(() => IS_DEMO ? DEMO_CASES : [], []);

  useEffect(() => { tSetJSON('case_bookmarks', bookmarks); }, [bookmarks]);

  const toggleBookmark = (id) => setBookmarks(b => b.includes(id) ? b.filter(x => x !== id) : [...b, id]);

  const tabs = [tr('tabAll', '전체 사례'), tr('tabIndustry', '업종별'), tr('tabRoi', 'ROI순'), tr('tabBookmark', '북마크')];

  const filtered = useMemo(() => {
    let rows = [...cases];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(c => c.company.toLowerCase().includes(q) || c.channels.join(' ').toLowerCase().includes(q));
    }
    if (activeTab === 2) rows.sort((a, b) => b.roi - a.roi);
    if (activeTab === 3) rows = rows.filter(c => bookmarks.includes(c.id));
    return rows;
  }, [cases, search, activeTab, bookmarks]);

  const byIndustry = useMemo(() => {
    const m = {};
    filtered.forEach(c => { (m[c.industry] = m[c.industry] || []).push(c); });
    return m;
  }, [filtered]);

  const avgRoi = cases.length ? Math.round(cases.reduce((s, c) => s + c.roi, 0) / cases.length) : 0;
  const avgRating = cases.length ? (cases.reduce((s, c) => s + c.rating, 0) / cases.length).toFixed(1) : '0.0';
  const industries = new Set(cases.map(c => c.industry)).size;

  const kpis = [
    { emoji: '📄', label: tr('kpiCases', '성공 사례'), val: cases.length },
    { emoji: '🏢', label: tr('kpiIndustries', '업종'), val: industries },
    { emoji: '📈', label: tr('kpiAvgRoi', '평균 ROI'), val: cases.length ? `+${avgRoi}%` : '—' },
    { emoji: '⭐', label: tr('kpiRating', '평균 평점'), val: cases.length ? avgRating : '—' },
  ];

  const Card = ({ c }) => (
    <div onClick={() => setDetail(c)} className="card card-glass card-hover" style={{ cursor: 'pointer', padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 30 }}>{c.logo}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>{c.company}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{tr('ind_' + c.industry, c.industry)} · {c.period}{tr('months', '개월')}</div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); toggleBookmark(c.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
          {bookmarks.includes(c.id) ? '⭐' : '☆'}
        </button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 12, minHeight: 38 }}>{tr(c.sk, c.summaryKo)}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>ROI</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#16a34a' }}>+{c.roi}%</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 10, background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.18)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>ROAS</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#2563eb' }}>{c.after.roas}x</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 10, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.18)' }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>{tr('rating', '평점')}</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#ca8a04' }}>{c.rating}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
      {/* Hero */}
      <div className="hero fade-up" style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.08),rgba(168,85,247,0.06))', borderColor: 'rgba(79,142,247,0.15)' }}>
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: 'linear-gradient(135deg,rgba(79,142,247,0.25),rgba(168,85,247,0.15))' }}>📚</div>
          <div>
            <div className="hero-title" style={{ background: 'linear-gradient(135deg,#4f8ef7,#a855f7)' }}>{tr('heroTitle', '성공 사례')}</div>
            <div className="hero-desc">{tr('heroDesc', '실제 도입 기업의 ROI 성과와 벤치마크를 확인하세요')}</div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {kpis.map((k, i) => (
          <div key={i} className="card card-glass" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 24, lineHeight: 1, flex: '0 0 auto' }}>{k.emoji}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.1 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + search */}
      <div className="card card-glass" style={{ padding: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{ flex: '0 0 auto', height: 36, padding: '0 16px', borderRadius: 10, border: activeTab === i ? 'none' : '1px solid var(--border)', cursor: 'pointer', fontWeight: 700, fontSize: 12, background: activeTab === i ? 'linear-gradient(135deg,#4f8ef7,#a855f7)' : 'var(--surface)', color: activeTab === i ? '#fff' : 'var(--text-2)' }}>{tab}</button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tr('searchPlaceholder', '기업·채널 검색')} style={{ marginLeft: 'auto', flex: '1 1 180px', maxWidth: 280, height: 36, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2, var(--surface))', color: 'var(--text-1)', fontSize: 12, outline: 'none' }} />
      </div>

      {/* Empty state (운영 기본 — 가짜데이터 없음) */}
      {filtered.length === 0 ? (
        <div className="card card-glass" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>
            {activeTab === 3 ? tr('emptyBookmark', '북마크한 사례가 없습니다') : tr('empty', '등록된 성공 사례가 없습니다')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            {IS_DEMO ? tr('emptyDemoHint', '검색어를 지우거나 다른 탭을 확인하세요') : tr('emptyProd', '도입 성과가 집계되면 이곳에 표시됩니다')}
          </div>
        </div>
      ) : activeTab === 1 ? (
        /* By industry */
        <div style={{ display: 'grid', gap: 18 }}>
          {Object.entries(byIndustry).map(([ind, list]) => (
            <div key={ind}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)', marginBottom: 10 }}>{INDUSTRY[ind] || '🗂'} {tr('ind_' + ind, ind)} <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>({list.length})</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {list.map(c => <Card key={c.id} c={c} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map(c => <Card key={c.id} c={c} />)}
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <>
          <div onClick={() => setDetail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 300 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'min(560px,95vw)', maxHeight: '85vh', overflowY: 'auto', background: 'var(--bg-card, #fff)', border: '1px solid var(--border)', borderRadius: 18, padding: 28, zIndex: 301, boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <span style={{ fontSize: 36 }}>{detail.logo}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)' }}>{detail.company}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{tr('ind_' + detail.industry, detail.industry)} · {detail.period}{tr('months', '개월')}</div>
              </div>
              <button onClick={() => setDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-3)' }}>✕</button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 18 }}>{tr(detail.sk, detail.summaryKo)}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: 14, borderRadius: 12, background: 'rgba(148,163,184,0.1)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 8 }}>{tr('before', '도입 전')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>ROAS {detail.before.roas}x</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{tr('revenue', '매출')} {detail.before.revenue}{tr('millionUnit', 'M')}</div>
              </div>
              <div style={{ padding: 14, borderRadius: 12, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>{tr('after', '도입 후')}</div>
                <div style={{ fontSize: 12, color: 'var(--text-1)', fontWeight: 700 }}>ROAS {detail.after.roas}x</div>
                <div style={{ fontSize: 12, color: 'var(--text-1)', fontWeight: 700 }}>{tr('revenue', '매출')} {detail.after.revenue}{tr('millionUnit', 'M')}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {detail.channels.map(ch => <span key={ch} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: 'rgba(79,142,247,0.1)', color: '#2563eb', fontWeight: 600 }}>{ch}</span>)}
            </div>
            <div style={{ padding: '12px 16px', borderRadius: 12, background: 'linear-gradient(135deg,rgba(34,197,94,0.1),rgba(79,142,247,0.06))', textAlign: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#16a34a' }}>ROI +{detail.roi}% · ⭐ {detail.rating}</span>
            </div>
          </div>
        </>
      )}

      {/* Usage Guide */}
      <div style={{ marginTop: 4 }}>
        <button onClick={() => setShowGuide(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto 12px', padding: '10px 24px', borderRadius: 12, border: '1px solid rgba(79,142,247,0.3)', background: 'rgba(79,142,247,0.06)', color: '#4f8ef7', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          📖 {tr('guideTitle', '성공 사례 이용 가이드')} {showGuide ? '▲' : '▼'}
        </button>
        {showGuide && (
          <div style={{ background: 'var(--surface2, rgba(255,255,255,0.025))', border: '1px solid rgba(79,142,247,0.15)', borderRadius: 16, padding: 24 }}>
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 36, marginBottom: 6 }}>📚</div>
              <h2 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 6px', color: 'var(--text-1)' }}>{tr('guideTitle', '성공 사례 이용 가이드')}</h2>
              <p style={{ color: 'var(--text-3)', fontSize: 12, margin: 0 }}>{tr('guideSub', '초보자도 이 가이드만 보면 벤치마크 사례를 찾아 우리 전략에 적용할 수 있습니다')}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 18 }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} style={{ padding: 14, borderRadius: 12, background: 'rgba(79,142,247,0.04)', border: '1px solid rgba(79,142,247,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, background: 'linear-gradient(135deg,#4f8ef7,#a855f7)', color: '#fff' }}>{i}</span>
                    <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-1)' }}>{tr(`guideStep${i}Title`, '')}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>{tr(`guideStep${i}Desc`, '')}</p>
                </div>
              ))}
            </div>
            <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginBottom: 6 }}>💡 {tr('guideTipTitle', '활용 팁')}</div>
              <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>{tr('guideTipDesc', '업종·ROI 기준으로 우리와 비슷한 사례를 찾아 도입 전/후 지표를 비교하세요. 관심 사례는 ⭐ 북마크하면 계정 안에 저장됩니다.')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
