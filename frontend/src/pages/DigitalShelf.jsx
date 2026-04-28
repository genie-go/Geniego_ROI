import React, { useState, useMemo, useEffect } from "react";

import { useT } from '../i18n/index.js';
import ko from '../i18n/locales/ko.js';
const t = (k) => k.split('.').reduce((o,i)=>o?.[i], {auto: ko?.auto}) || k;

/* ─── CSV ───────────────────────────────────────────────────── */
function downloadCSV(filename, headers, rows) {
  const BOM = '\uFEFF';
  const esc = v => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))];
  const blob = new Blob([BOM + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

/* ── Data (Live API) ──── */
const CHANNELS = [
  { id: "coupang",  name: "Coupang",     icon: "🇰🇷", color: "#00bae5" },
  { id: "naver",    name: "Naver",        icon: "🟢",  color: "#03c75a" },
  { id: "amazon",   name: "Amazon KR",   icon: "📦",  color: "#ff9900" },
  { id: "11st",     name: "11Street",       icon: "🏬",  color: "#ff0000" },
  { id: "shopify",  name: "Shopify",     icon: "🛒",  color: "#96bf48" },
];

/* Keywords — live API data */
const KEYWORDS_INIT = [];

const COMPETITORS = [
  { name: "A사", color: "#ef4444", share: 38.2 },
  { name: "B사", color: "#f97316", share: 24.5 },
  { name: "자사", color: "#4f8ef7", share: 18.4 },
  { name: "C사", color: "#a855f7", share: 11.3 },
  { name: "기타", color: "#4e6080", share: 7.6 },
];

const _shelfFmt = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 });
const TOP_PRODUCTS = [
  { sku: "WH-1000XM5",  name: "노이즈캔슬링 헤드폰 XM5",  rank: 1, prev: 3, rating: 4.8, reviews: 2841, price: _shelfFmt.format(428000), channel: "Coupang" },
  { sku: "KB-MXM-RGB",  name: "세라마이딘(Ceramidin) 세라마이드 크림 MX",       rank: 2, prev: 2, rating: 4.6, reviews: 1203, price: _shelfFmt.format(189000), channel: "Naver" },
  { sku: "HC-USB4-7P",  name: "USB4 7포트 허브 Pro",         rank: 4, prev: 6, rating: 4.5, reviews: 876,  price: _shelfFmt.format(132000), channel: "Amazon KR" },
  { sku: "GM-PRO-X",    name: "게이밍 마우스 Pro X",         rank: 6, prev: 5, rating: 4.3, reviews: 2104, price: _shelfFmt.format(98000),  channel: "11Street" },
  { sku: "WC-4K-PRO",   name: "더마클리어 마이크로 폼 수딩 젤",                 rank: 1, prev: 4, rating: 4.7, reviews: 634,  price: _shelfFmt.format(218000), channel: "Amazon KR" },
];

const AI_INSIGHTS = [
  { level: "high",  icon: "🚀", title: "기계식 키보드 SoS 급등", desc: "Naver·Coupang에서 자사 SoS가 전월 대비 +8.4%p 상승. Budget 20% 증액 권장.", action: "Budget 증액" },
  { level: "warn",  icon: "⚠", title: "스마트워치 경쟁사 SoS 우위", desc: "경쟁사 A사가 55.4%로 압도적. Price·리뷰·콘텐츠 전략 재검토 필요.", action: "전략 검토" },
  { level: "warn",  icon: "📉", title: "포터블 충전기 Rank 하락", desc: "Coupang·Naver 모두 Rank 하락 트렌드. 리스팅 최적화 및 Ad 집행 검토.", action: "리스팅 최적화" },
  { level: "info",  icon: "🎯", title: "4K 웹캠 1위 유지 in progress", desc: "Coupang·Amazon KR 모두 1위 안정 유지. CTR 7.2% - 업계 최고 Count준.", action: "현상 유지" },
];

/* ─── helpers ────────────────────────────────────────────────── */
function TrendIcon({ t }) {
  if (t === "up")   return <span style={{ color: "#22c55e", fontSize: 11, fontWeight: 700 }}>▲ 상승</span>;
  if (t === "down") return <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 700 }}>▼ 하락</span>;
  return <span style={{ color: "#7c8fa8", fontSize: 11 }}>─ 유지</span>;
}

function SoSBar({ brand, comp }) {
  const other = Math.max(0, 100 - brand - comp);
  return (
    <div style={{ display: "flex", height: 6, borderRadius: 4, overflow: "hidden", minWidth: 100, gap: 1 }}>
      <div style={{ width: `${brand}%`, background: "#4f8ef7" }} title={`자사 ${brand}%`} />
      <div style={{ width: `${comp}%`, background: "#ef4444" }} title={`경쟁사 ${comp}%`} />
      <div style={{ width: `${other}%`, background: "rgba(255,255,255,0.07)" }} />
    </div>
  );
}

function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 2000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, background: "rgba(34,197,94,0.95)", color: '#fff', padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
      {msg}
    </div>
  );
}

/* ─── 키워드 Add Modal ────────────────────────────────────────── */
function AddKeywordModal({ onClose, onAdd }) {
  const [kw, setKw] = useState("");
  const [channel, setChannel] = useState("coupang");
  const [brandSos, setBrandSos] = useState("15");
  const [compSos, setCompSos] = useState("35");

  const handleAdd = () => {
    if (!kw.trim()) return;
    onAdd({ keyword: kw.trim(), channel, brandSos: Number(brandSos), compSos: Number(compSos) });
    onClose();
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 200 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(440px,94vw)", background: "linear-gradient(180deg,var(--surface),#090f1e)", border: "1px solid rgba(79,142,247,0.3)", borderRadius: 20, padding: 28, zIndex: 201, boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>🔍 키워드 Add</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label className="input-label">키워드 *</label>
            <input className="input" value={kw} onChange={e => setKw(e.target.value)} placeholder="예: Wireless Earbuds" />
          </div>
          <div>
            <label className="input-label">Channel</label>
            <select className="input" value={channel} onChange={e => setChannel(e.target.value)}>
              {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="input-label">자사 SoS (%)</label>
              <input className="input" type="number" min="0" max="100" value={brandSos} onChange={e => setBrandSos(e.target.value)} />
            </div>
            <div>
              <label className="input-label">경쟁사 SoS (%)</label>
              <input className="input" type="number" min="0" max="100" value={compSos} onChange={e => setCompSos(e.target.value)} />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleAdd} disabled={!kw.trim()}>Add</button>
        </div>
      </div>
    </>
  
  );
}

/* ─── Main ───────────────────────────────────────────────────── */
export default function DigitalShelf() {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("brand_sos");
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterTrend, setFilterTrend] = useState("all");
  const [keywords, setKeywords] = useState(KEYWORDS_INIT);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedKw, setExpandedKw] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState("sos"); // 신규 Tab 시스템

  // Channelper Aggregate 함Count
  const getChannelData = (kw, chId) => {
    if (chId === "all") {
      // 전 Channel Average
      const allChs = Object.values(kw.channels);
      if (!allChs.length) return null;
      return {
        brand_sos: allChs.reduce((s, c) => s + c.brand_sos, 0) / allChs.length,
        comp_sos: allChs.reduce((s, c) => s + c.comp_sos, 0) / allChs.length,
        rank: Math.min(...allChs.map(c => c.rank)),
        ctr: allChs.reduce((s, c) => s + c.ctr, 0) / allChs.length,
        rev_share: allChs.reduce((s, c) => s + c.rev_share, 0) / allChs.length,
        vol: allChs.reduce((s, c) => s + c.vol, 0),
      };
    }
    return kw.channels[chId] || null;
  };

  const filtered = useMemo(() => {
    return keywords
      .filter(kw => {
        if (search && !kw.keyword.includes(search)) return false;
        if (filterTrend !== "all" && kw.trend !== filterTrend) return false;
        if (filterChannel !== "all" && !kw.channels[filterChannel]) return false;
        return true;
      })
      .map(kw => {
        const chData = getChannelData(kw, filterChannel);
        return { ...kw, chData };
      })
      .filter(kw => kw.chData !== null)
      .sort((a, b) => {
        if (!a.chData || !b.chData) return 0;
        return (b.chData[sortKey] || 0) - (a.chData[sortKey] || 0);
      });
  }, [keywords, search, filterTrend, filterChannel, sortKey]);

  const allData = useMemo(() => filtered.map(kw => getChannelData(kw, filterChannel)).filter(Boolean), [filtered, filterChannel]);
  const avgBrand = allData.length ? (allData.reduce((s, c) => s + c.brand_sos, 0) / allData.length).toFixed(1) : 0;
  const top3Count = filtered.filter(kw => kw.chData && kw.chData.rank <= 3).length;
  const avgCtr = allData.length ? (allData.reduce((s, c) => s + c.ctr, 0) / allData.length).toFixed(1) : 0;

  const handleAdd = ({ keyword, channel, brandSos, compSos }) => {
    setKeywords(prev => [...prev, {
      keyword,
      channels: { [channel]: { brand_sos: brandSos, comp_sos: compSos, rank: 10, ctr: 3.0, rev_share: 15.0, vol: 10000 } },
      trend: "stable"
    }]);
    setToast(`✓ "${keyword}" Add됨`);
  };

  const handleDownload = () => {
    downloadCSV(
      `digital_shelf_${new Date().toISOString().slice(0, 10)}.csv`,
      ["키워드", "Channel", "자사 SoS(%)", "경쟁사 SoS(%)", "Impressions Rank", "Search량", "CTR(%)", "Revenue 기여(%)", "트렌드"],
      filtered.map(kw => {
        const ch = kw.chData;
        return [kw.keyword, filterChannel === "all" ? "전ChannelAverage" : filterChannel, ch?.brand_sos?.toFixed(1), ch?.comp_sos?.toFixed(1), ch?.rank, ch?.vol?.toLocaleString(), ch?.ctr?.toFixed(1), ch?.rev_share?.toFixed(1), kw.trend];
      })
    );
    setToast("✓ CSV Download Done");
  };

  const SortTh = ({ k, label, right }) => (
    <th style={{ textAlign: right ? "right" : "left", cursor: "pointer", userSelect: "none" }}
      onClick={() => setSortKey(k)}>
      {label} {sortKey === k ? "↓" : ""}
    </th>
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      {showAddModal && <AddKeywordModal onClose={() => setShowAddModal(false)} onAdd={handleAdd} />}

      {/* Hero */}
      <div className="hero fade-up">
        <div className="hero-grid">
          <div className="hero-meta">
            <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(20,217,176,0.25),rgba(79,142,247,0.15))" }}>🛍</div>
            <div>
              <div className="hero-title" style={{ background: "linear-gradient(135deg,#14d9b0,#4f8ef7)" }}>
                Digital Shelf
              </div>
              <div className="hero-desc">Domestic 5개 Channel 자사 Product Search 가시성 · 경쟁 점유율(SoS) · 키워드 Rank를 실Time 모니터링합니다.</div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="btn-primary" style={{ fontSize: 11, padding: "6px 14px" }} onClick={() => setShowAddModal(true)}>
                  ＋ 키워드 Add
                </button>
                <button className="btn-ghost" style={{ fontSize: 11, padding: "6px 14px" }} onClick={handleDownload}>
                  📥 CSV Download
                </button>
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {[
              { l: "Average SoS",  v: `${avgBrand}%`, c: "#14d9b0" },
              { l: "Top 3 키워드", v: `${top3Count}개`, c: "#4f8ef7" },
              { l: "Average CTR", v: `${avgCtr}%`, c: "#a855f7" },
            ].map(({ l, v, c }) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(9,15,30,0.5)", borderRadius: 8, border: "1px solid rgba(99,140,255,0.1)" }}>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>{l}</span>
                <span style={{ fontWeight: 800, color: c }}>{v}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 8, fontWeight: 700 }}>점유율 (SoS) 분포</div>
            {COMPETITORS.map(c => (
              <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{ width: 28, fontSize: 11, color: "var(--text-3)", textAlign: "right" }}>{c.name}</span>
                <div style={{ flex: 1, height: 6, background: 'var(--surface)', borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${c.share}%`, height: "100%", background: c.color, borderRadius: 4, transition: "width 0.8s ease" }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: c.color, width: 36 }}>{c.share}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 신규 Tab Button */}
      <div style={{ display:'flex', gap:4, background: 'var(--surface)', borderRadius:12, padding:5, flexWrap:'wrap' }}>
        {[['sos','🎚️ SoS 모니터링'],['quality','⭐ 리스팅 품질 점Count'],['reviews','💬 리뷰 Analysis']].map(([id,lbl])=>(
          <button key={id} onClick={()=>setActiveTab(id)}
            style={{ padding:'7px 16px', borderRadius:9, border:'none', cursor:'pointer', fontWeight:700, fontSize:11, background:activeTab===id?'linear-gradient(135deg,#14d9b0,#4f8ef7)':'transparent', color:activeTab===id?'#fff':'var(--text-3)', transition:'all 150ms' }}>
            {lbl}
          </button>
        ))}
      </div>

      {activeTab === 'quality' && <ListingQualitySection />}
      {activeTab === 'reviews' && <ReviewAnalysisSection />}

      {activeTab === 'sos' && <>
      {/* AI 인사이트 */}
      <div className="card card-glass fade-up fade-up-1">
        <div className="section-title" style={{ marginBottom: 12 }}>🤖 AI 인사이트 · 최적화 권고</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
          {AI_INSIGHTS.map((ins, i) => (
            <div key={i} style={{
              padding: "12px 14px", borderRadius: 10,
              background: ins.level === "high" ? "rgba(34,197,94,0.05)" : ins.level === "warn" ? "rgba(234,179,8,0.05)" : "rgba(79,142,247,0.05)",
              border: `1px solid ${ins.level === "high" ? "rgba(34,197,94,0.2)" : ins.level === "warn" ? "rgba(234,179,8,0.2)" : "rgba(79,142,247,0.15)"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ fontWeight: 700, fontSize: 12, display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 14 }}>{ins.icon}</span>
                  {ins.title}
                </div>
                <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 99, fontWeight: 700, background: ins.level === "high" ? "rgba(34,197,94,0.15)" : ins.level === "warn" ? "rgba(234,179,8,0.15)" : "rgba(79,142,247,0.12)", color: ins.level === "high" ? "#22c55e" : ins.level === "warn" ? "#eab308" : "#4f8ef7" }}>
                  {ins.action}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.5 }}>{ins.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid4 fade-up fade-up-2">
        {[
          { l: "추적 키워드",  v: filtered.length + "개", s: "Active 추적 in progress", c: "#4f8ef7" },
          { l: "Average 자사 SoS", v: `${avgBrand}%`, s: "↑ 2.3%p vs 전월", c: "#14d9b0" },
          { l: "Top 3 진입", v: `${top3Count}개`, s: `All ${filtered.length}개 in progress`, c: "#a855f7" },
          { l: "Average CTR", v: `${avgCtr}%`, s: "업계 Average 2.9% 대비", c: "#22c55e" },
        ].map(({ l, v, s, c }, i) => (
          <div key={l} className="kpi-card card-hover fade-up" style={{ "--accent": c, animationDelay: `${i * 60}ms` }}>
            <div className="kpi-label">{l}</div>
            <div className="kpi-value" style={{ color: c }}>{v}</div>
            <div className="kpi-sub">{s}</div>
          </div>
        ))}
      </div>

      {/* 키워드 SoS Table */}
      <div className="card card-glass fade-up fade-up-3">
        <div className="section-header">
          <div>
            <div className="section-title">🔍 키워드 SoS Analysis</div>
            <div className="section-sub">{filtered.length}개 키워드 표시</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="input" style={{ width: 160, padding: "6px 10px", fontSize: 11 }}
              placeholder="키워드 Search..." value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="input" style={{ width: 140, padding: "6px 10px", fontSize: 11 }}
              value={filterChannel} onChange={e => setFilterChannel(e.target.value)}>
              <option value="all">All Channel (Average)</option>
              {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <select className="input" style={{ width: 110, padding: "6px 10px", fontSize: 11 }}
              value={filterTrend} onChange={e => setFilterTrend(e.target.value)}>
              <option value="all">All 트렌드</option>
              <option value="up">▲ 상승</option>
              <option value="down">▼ 하락</option>
              <option value="stable">─ 유지</option>
            </select>
            <select className="input" style={{ width: 130, padding: "6px 10px", fontSize: 11 }}
              value={sortKey} onChange={e => setSortKey(e.target.value)}>
              <option value="brand_sos">자사 SoS순</option>
              <option value="rev_share">Revenue 기여순</option>
              <option value="ctr">CTR순</option>
              <option value="vol">Search량순</option>
            </select>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>키워드</th>
              <SortTh k="brand_sos" label="자사 SoS" />
              <SortTh k="comp_sos" label="경쟁사 SoS" />
              <th>SoS 시각화</th>
              <th>Rank</th>
              <SortTh k="vol" label="Search량" right />
              <SortTh k="ctr" label="CTR" right />
              <SortTh k="rev_share" label="Revenue 기여" right />
              <th>트렌드</th>
              <th>Channel Count</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(kw => {
              const ch = kw.chData;
              if (!ch) return null;
              const isExpanded = expandedKw === kw.keyword;
              return (
                <>
                  <tr key={kw.keyword}
                    onClick={() => setExpandedKw(isExpanded ? null : kw.keyword)}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(79,142,247,0.04)"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{kw.keyword}</td>
                    <td style={{ color: "#4f8ef7", fontWeight: 700 }}>{ch.brand_sos.toFixed(1)}%</td>
                    <td style={{ color: "#ef4444", fontWeight: 600 }}>{ch.comp_sos.toFixed(1)}%</td>
                    <td><SoSBar brand={ch.brand_sos} comp={ch.comp_sos} /></td>
                    <td>
                      <span className={`badge badge-${ch.rank <= 3 ? "green" : ch.rank <= 6 ? "blue" : "yellow"}`}>
                        #{ch.rank}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", color: "var(--text-2)", fontFamily: "monospace" }}>
                      {ch.vol >= 1000 ? (ch.vol / 1000).toFixed(0) + "K" : ch.vol}
                    </td>
                    <td style={{ textAlign: "right", color: "var(--text-2)" }}>{ch.ctr.toFixed(1)}%</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: ch.rev_share >= 30 ? "#22c55e" : "var(--text-1)" }}>
                      {ch.rev_share.toFixed(1)}%
                    </td>
                    <td><TrendIcon t={kw.trend} /></td>
                    <td>
                      <span className="badge" style={{ fontSize: 9 }}>{Object.keys(kw.channels).length}개 Channel</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 10, color: "var(--text-3)" }}>{isExpanded ? "▲" : "▼"}</span>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={kw.keyword + "_expand"}>
                      <td colSpan={11} style={{ padding: 0 }}>
                        <div style={{ padding: "12px 16px", background: "rgba(79,142,247,0.03)", borderTop: "1px solid rgba(99,140,255,0.1)" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 10 }}>📊 Channelper 상세</div>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {Object.entries(kw.channels).map(([chId, data]) => {
                              const ch = CHANNELS.find(c => c.id === chId) || { name: chId, icon: "🛒", color: "#4f8ef7" };
                              return (
                                <div key={chId} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(9,15,30,0.6)", border: `1px solid ${ch.color}22`, minWidth: 160 }}>
                                  <div style={{ fontWeight: 700, fontSize: 11, color: ch.color, marginBottom: 6 }}>{ch.icon} {ch.name}</div>
                                  {[
                                    ["자사 SoS", data.brand_sos.toFixed(1) + "%", "#4f8ef7"],
                                    ["경쟁사 SoS", data.comp_sos.toFixed(1) + "%", "#ef4444"],
                                    ["Rank", "#" + data.rank, data.rank <= 3 ? "#22c55e" : "var(--text-2)"],
                                    ["CTR", data.ctr.toFixed(1) + "%", "#a855f7"],
                                    ["Revenue 기여", data.rev_share.toFixed(1) + "%", "#f97316"],
                                  ].map(([l, v, c]) => (
                                    <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
                                      <span style={{ color: "var(--text-3)" }}>{l}</span>
                                      <span style={{ fontWeight: 700, color: c }}>{v}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 32, color: "var(--text-3)" }}>Search 결과 None</div>
        )}
      </div>

      {/* Channelper Rank 현황 */}
      <div className="card card-glass fade-up fade-up-4">
        <div className="section-title" style={{ marginBottom: 12 }}>📡 Channelper 키워드 커버리지</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          {CHANNELS.map(ch => {
            const covered = KEYWORDS_INIT.filter(kw => kw.channels[ch.id]).length;
            const top3 = KEYWORDS_INIT.filter(kw => kw.channels[ch.id] && kw.channels[ch.id].rank <= 3).length;
            return (
              <div key={ch.id} style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(9,15,30,0.6)", border: `1px solid ${ch.color}22` }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: ch.color, marginBottom: 10 }}>{ch.icon} {ch.name}</div>
                <div style={{ display: "grid", gap: 5 }}>
                  {[
                    ["추적 키워드", covered + "개"],
                    ["Top 3 키워드", top3 + "개"],
                  ].map(([l, v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: "var(--text-3)" }}>{l}</span>
                      <span style={{ fontWeight: 700 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 8, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4 }}>
                  <div style={{ width: `${(covered / KEYWORDS_INIT.length) * 100}%`, height: "100%", background: ch.color, borderRadius: 4 }} />
                </div>
              </div>
            
);
          })}
        </div>
      </div>

      {/* Top Product */}
      <div className="card card-glass fade-up fade-up-5">
        <div className="section-header">
          <div className="section-title">🏆 Channel 내 TOP Product Rank</div>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {TOP_PRODUCTS.map((p, i) => {
            const diff = p.prev - p.rank;
            return (
              <div key={p.sku} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", background: i === 0 ? "rgba(34,197,94,0.05)" : "rgba(9,15,30,0.4)", borderRadius: 10, border: `1px solid ${i === 0 ? "rgba(34,197,94,0.2)" : "rgba(99,140,255,0.08)"}` }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: ["#fde047", "#e2e8f0", "#fdba74", "var(--text-3)", "var(--text-3)"][i], width: 32, textAlign: "center" }}>
                  {["🥇", "🥈", "🥉", "4", "5"][i]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
                    <span style={{ fontSize: 9, fontFamily: "monospace", color: "var(--text-3)" }}>{p.sku}</span>
                    <span className="badge" style={{ fontSize: 9 }}>{p.channel}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "var(--text-3)", fontSize: 10 }}>Rating</div>
                    <div style={{ fontWeight: 700, color: "#fde047" }}>★ {p.rating}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "var(--text-3)", fontSize: 10 }}>리뷰</div>
                    <div style={{ fontWeight: 700 }}>{p.reviews.toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "var(--text-3)", fontSize: 10 }}>Price</div>
                    <div style={{ fontWeight: 700, color: "#4f8ef7" }}>{p.price}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "var(--text-3)", fontSize: 10 }}>Rank Change</div>
                    <div style={{ fontWeight: 700, color: diff > 0 ? "#22c55e" : diff < 0 ? "#ef4444" : "var(--text-3)" }}>
                      {diff > 0 ? `▲${diff}` : diff < 0 ? `▼${Math.abs(diff)}` : "─"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </>}
    </div>
);
}

/* ═══ 리스팅 품질 점Count 섹션 ═══════════════════════════════ */
function ListingQualitySection() {
  const LISTINGS = [
    { sku:'DJ-CICA-101', name:'무선 노이즈캐슬링 헤드폰', title:92, images:85, desc:78, spec:95, keywords:88, channel:'coupang', issues:['Image Count 부족 (3/8)'], ai:'제목에 "ANC" 키워드 Add 권장' },
    { sku:'DJ-CERA-002', name:'세라마이딘(Ceramidin) 세라마이드 크림', title:71, images:95, desc:65, spec:80, keywords:72, channel:'naver', issues:['Description 글자Count 부족 (450/1000)','키워드 밀도 Low'], ai:'제품 스펙(키압/배열) 상세 Add 필요' },
    { sku:'HC-USB4-7P-01', name:'바이탈 하이드라 콜라겐 앰플', title:98, images:100, desc:95, spec:98, keywords:96, channel:'amazon', issues:[], ai:'최적 Status 유지' },
    { sku:'CAM-4K-PRO-01', name:'4K 웹츠 Pro', title:82, images:90, desc:82, spec:75, keywords:84, channel:'coupang', issues:['스펙 미기재 (Max해상도)'], ai:'UHD 4K 60fps 명시, 호환OS List Add' },
    { sku:'MS-ERG-BL-01', name:'크라이오 고무 마스크 워터풀', title:68, images:75, desc:70, spec:72, keywords:65, channel:'11st', issues:['제목 키워드 누락','Image Background 미준Count'], ai:'무소음·블루투스·인체공학 키워드 삽입' },
  ];
  const scoreColor = v => v >= 90 ? '#22c55e' : v >= 75 ? '#f97316' : '#ef4444';
  const totalScore = item => Math.round((item.title+item.images+item.desc+item.spec+item.keywords)/5);
  return (
    <div style={{ display:'grid', gap:14, padding:4 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
        {[{l:'최적 리스팅',v:LISTINGS.filter(l=>totalScore(l)>=90).length+'개',c:'#22c55e'},{l:'개선 필요',v:LISTINGS.filter(l=>totalScore(l)<75).length+'개',c:'#ef4444'},{l:'Average 품질점Count',v:Math.round(LISTINGS.reduce((s,l)=>s+totalScore(l),0)/LISTINGS.length)+'점',c:'#4f8ef7'}].map(({l,v,c})=>(
          <div key={l} style={{background: 'var(--surface)',borderRadius:12,padding:'12px',border:`1px solid ${c}22`}}>
            <div style={{ fontSize:10, color:'var(--text-3)', fontWeight:700 }}>{l}</div>
            <div style={{ fontSize:22, fontWeight:900, color:c, marginTop:4 }}>{v}</div>
          </div>
        ))}
      </div>
      {LISTINGS.map(l => {
        const score = totalScore(l);
        return (
          <div key={l.sku} style={{background: 'var(--surface)',border:`1px solid ${scoreColor(score)}22`,borderRadius:14,padding:16}}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:800 }}>{l.name}</div>
                <div style={{ fontSize:10, color:'var(--text-3)', marginTop:2 }}>{l.sku} · {l.channel}</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:28, fontWeight:900, color:scoreColor(score) }}>{score}</div>
                <div style={{ fontSize:9, color:'var(--text-3)' }}>/ 100점</div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, marginBottom:12 }}>
              {[['제목',l.title],['Image',l.images],['Description',l.desc],['스펙',l.spec],['키워드',l.keywords]].map(([lbl,val])=>(
                <div key={lbl} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:9, color:'var(--text-3)', marginBottom:4, fontWeight:600 }}>{lbl}</div>
                  <div style={{ height:40, background: 'var(--border)', borderRadius:4, position:'relative', overflow:'hidden' }}>
                    <div style={{position:'absolute',bottom:0,width:'100%',height:`${val}%`,background:scoreColor(val),transition:'height 0.5s'}}/>
                  </div>
                  <div style={{ fontSize:10, fontWeight:700, color:scoreColor(val), marginTop:3 }}>{val}</div>
                </div>
              ))}
            </div>
            {l.issues.length > 0 && (
              <div style={{ padding:'8px 12px', background:'rgba(239,68,68,0.07)', borderRadius:8, marginBottom:8 }}>
                {l.issues.map(iss=><div key={iss} style={{ fontSize:10, color:'#f87171' }}>⚠️ {iss}</div>)}
              </div>
            )}
            <div style={{ fontSize:10, color:'#4f8ef7', fontStyle:'italic' }}>🤖 AI 제안: {l.ai}</div>
          </div>
        
        );
      })}
    </div>
  
);
}

/* ═══ 리뷰 Analysis 섹션 ════════════════════════════════════ */
function ReviewAnalysisSection() {
  const REVIEWS = [
    { sku:'DJ-CICA-101', name:'무선 헤드폰', rating:4.8, count:2841, positive:89, negative:5, neutral:6, keywords:[{w:'음질',s:92},{w:'노이즈쾔슬',s:88},{w:'착용감',s:76},{w:'배터리',s:71}], negKw:[{w:'Price',s:45},{w:'배터리',s:22}], responseRate:78, channel:'coupang' },
    { sku:'DJ-CERA-002', name:'RGB 키보드', rating:4.6, count:1203, positive:82, negative:11, neutral:7, keywords:[{w:'타건감',s:88},{w:'RGB',s:84},{w:'내구성',s:72}], negKw:[{w:'소음',s:55},{w:'드라이버',s:32}], responseRate:45, channel:'naver' },
    { sku:'HC-USB4-7P-01', name:'USB-C 허브', rating:4.5, count:876, positive:80, negative:12, neutral:8, keywords:[{w:'Connect안정성',s:85},{w:'발열None',s:78},{w:'호환성',s:72}], negKw:[{w:'인식Error',s:42},{w:'발열',s:28}], responseRate:62, channel:'amazon' },
  ];
  return (
    <div style={{ display:'grid', gap:16, padding:4 }}>
      {REVIEWS.map(r=>(
        <div key={r.sku} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius:14, padding:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:800 }}>{r.name}</div>
              <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>{r.sku} · {r.channel} · 리뷰 {r.count.toLocaleString()}개</div>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:32, fontWeight:900, color:'#fde047' }}>★ {r.rating}</div>
              <div style={{ fontSize:10, color: r.responseRate < 70 ? '#f97316' : '#22c55e' }}>응답률 {r.responseRate}%</div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:12, marginBottom:10 }}>💬 감성 분포</div>
              {[['긍정','#22c55e',r.positive],['in progress립','#f97316',r.neutral],['부정','#ef4444',r.negative]].map(([lbl,c,pct])=>(
                <div key={lbl} style={{ marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
                    <span style={{ color:c, fontWeight:700 }}>{lbl}</span><span>{pct}%</span>
                  </div>
                  <div style={{ height:6, background: 'var(--border)', borderRadius:4 }}>
                    <div style={{width:`${pct}%`,height:'100%',background:c,borderRadius:4}}/>
                  </div>
                </div>
              ))}
              {r.responseRate < 70 && <div style={{ marginTop:10, padding:'8px', background:'rgba(249,115,22,0.09)', borderRadius:8, fontSize:10, color:'#f97316' }}>⚠️ 리뷰 응답률 {r.responseRate}% — 80% 이상 권장</div>}
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:12, marginBottom:10 }}>🔑 주요 키워드</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
                {r.keywords.map(k=><span key={k.w} style={{ padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700, background:'rgba(79,142,247,0.15)', color:'#4f8ef7', border:'1px solid rgba(79,142,247,0.25)' }}>{k.w} {k.s}</span>)}
              </div>
              <div style={{ fontWeight:700, fontSize:11, marginBottom:6, color:'#ef4444' }}>⚠️ 부정 키워드</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {r.negKw.map(k=><span key={k.w} style={{ padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700, background:'rgba(239,68,68,0.12)', color:'#ef4444', border:'1px solid rgba(239,68,68,0.2)' }}>{k.w} {k.s}</span>)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  
  );
}
