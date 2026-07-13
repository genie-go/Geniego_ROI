import React, { useState, useMemo, useEffect } from "react";

import { useT } from '../i18n/index.js';
import { IS_DEMO } from '../utils/demoEnv'; // 181차 가상데이터 운영오염 차단
import { getJsonAuth, postJsonAuth } from '../services/apiClient'; // [265차] 키워드 영속 배선

/* [265차] 백엔드 flat 행(키워드×채널) → 프론트 중첩 모델 그룹화(키워드별 채널맵). 외부 harvest 전 ctr/vol=0(정직). */
/* [267차] v429 shelf/harvest 배선: brand/harvest_source/harvest_status/harvest_note/harvested_at 노출 + 자동수집 rank/SoS 병기. */
function mapShelfRows(rows) {
  const byKw = {};
  (rows || []).forEach(r => {
    const k = r.keyword || '';
    if (!k) return;
    if (!byKw[k]) byKw[k] = { keyword: k, channels: {}, trend: 'stable', _id: r.id, brand: r.brand || '', harvest_source: '', harvest_status: '', harvest_note: '', harvested_at: '' };
    byKw[k].channels[r.channel || 'all'] = {
      brand_sos: r.ourSos != null ? r.ourSos : 0,
      comp_sos: r.compSos != null ? r.compSos : 0,
      rank: r.rank != null ? r.rank : 99,
      ctr: 0, rev_share: 0, vol: 0,
      // [267차] 채널별 자동수집 메타(harvest 미실행 시 빈값=정직). ★핸들러는 camelCase 반환(DigitalShelf.php:97-101).
      harvest_source: r.harvestSource || '',
      harvest_status: r.harvestStatus || '',
      harvest_note: r.harvestNote || '',
      harvested_at: r.harvestedAt || '',
    };
    // [267차] 키워드 대표값: brand 및 harvest 상태(행 중 값 존재 시 갱신)
    if (r.brand) byKw[k].brand = r.brand;
    if (r.harvestStatus) {
      byKw[k].harvest_status = r.harvestStatus;
      byKw[k].harvest_source = r.harvestSource || byKw[k].harvest_source;
      byKw[k].harvest_note = r.harvestNote || byKw[k].harvest_note;
      byKw[k].harvested_at = r.harvestedAt || byKw[k].harvested_at;
    }
    if (r.trend === 'up' || r.trend === 'down') byKw[k].trend = r.trend;
  });
  return Object.values(byKw);
}
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

const _shelfFmt = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 });

/* ─── helpers ────────────────────────────────────────────────── */
function TrendIcon({ t: dir }) {
  const t = useT();
  if (dir === "up")   return <span style={{ color: "#22c55e", fontSize: 11, fontWeight: 700 }}>▲ {t('digitalShelf.trendUp', '상승')}</span>;
  if (dir === "down") return <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 700 }}>▼ {t('digitalShelf.trendDown', '하락')}</span>;
  return <span style={{ color: "#7c8fa8", fontSize: 11 }}>─ {t('digitalShelf.trendFlat', '유지')}</span>;
}

function SoSBar({ brand, comp }) {
  const t = useT();
  const other = Math.max(0, 100 - brand - comp);
  return (
    <div style={{ display: "flex", height: 6, borderRadius: 4, overflow: "hidden", minWidth: 100, gap: 1 }}>
      <div style={{ width: `${brand}%`, background: "#4f8ef7" }} title={`${t('digitalShelf.ownLabel', '자사')} ${brand}%`} />
      <div style={{ width: `${comp}%`, background: "#ef4444" }} title={`${t('digitalShelf.compLabel', '경쟁사')} ${comp}%`} />
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

/* [267차] 자동수집 상태 배지 (live / pending / no_brand) — 테마 토큰 기반 */
function HarvestBadge({ status }) {
  const t = useT();
  if (!status) return null;
  const map = {
    live:     { c: '#22c55e', bg: 'rgba(34,197,94,0.15)',  l: t('digitalShelf.harvest.statusLive', '실시간 수집') },
    pending:  { c: '#eab308', bg: 'rgba(234,179,8,0.15)',  l: t('digitalShelf.harvest.pending', '검색 자격증명 미설정') },
    no_brand: { c: '#7c8fa8', bg: 'rgba(124,143,168,0.18)', l: t('digitalShelf.harvest.noBrand', '몰/브랜드명 미설정') },
  };
  const m = map[status] || { c: '#7c8fa8', bg: 'rgba(124,143,168,0.18)', l: status };
  return <span title={m.l} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, fontWeight: 700, background: m.bg, color: m.c, whiteSpace: 'nowrap' }}>{m.l}</span>;
}

/* [267차] 자동수집 진행 스피너 (테마 무관 회전 링) */
function Spinner() {
  return <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(127,143,168,0.35)', borderTopColor: 'currentColor', borderRadius: '50%', animation: 'dsSpin 0.7s linear infinite', verticalAlign: 'middle' }} />;
}

/* ─── 키워드 Add Modal ────────────────────────────────────────── */
function AddKeywordModal({ onClose, onAdd }) {
  const t = useT();
  const [kw, setKw] = useState("");
  const [channel, setChannel] = useState("coupang");
  const [brand, setBrand] = useState("");
  const [brandSos, setBrandSos] = useState("15");
  const [compSos, setCompSos] = useState("35");

  const handleAdd = () => {
    if (!kw.trim()) return;
    onAdd({ keyword: kw.trim(), channel, brand: brand.trim(), brandSos: Number(brandSos), compSos: Number(compSos) });
    onClose();
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 200 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(440px,94vw)", background: "linear-gradient(180deg,var(--surface),#090f1e)", border: "1px solid rgba(79,142,247,0.3)", borderRadius: 20, padding: 28, zIndex: 201, boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>🔍 {t('digitalShelf.addKeyword', '키워드 추가')}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label className="input-label">{t('digitalShelf.keywordLabel', '키워드')} *</label>
            <input className="input" value={kw} onChange={e => setKw(e.target.value)} placeholder={t('digitalShelf.keywordPh', '예: Wireless Earbuds')} />
          </div>
          <div>
            <label className="input-label">{t('digitalShelf.channel', '채널')}</label>
            <select className="input" value={channel} onChange={e => setChannel(e.target.value)}>
              {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">{t('digitalShelf.harvest.brandLabel', '몰/브랜드명 (검색결과 매칭용)')}</label>
            <input className="input" value={brand} onChange={e => setBrand(e.target.value)} placeholder={t('digitalShelf.harvest.brandPh', '예: 지니고 공식스토어')} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="input-label">{t('digitalShelf.ownSosLabel', '자사 SoS (%)')}</label>
              <input className="input" type="number" min="0" max="100" value={brandSos} onChange={e => setBrandSos(e.target.value)} />
            </div>
            <div>
              <label className="input-label">{t('digitalShelf.compSosLabel', '경쟁사 SoS (%)')}</label>
              <input className="input" type="number" min="0" max="100" value={compSos} onChange={e => setCompSos(e.target.value)} />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
          <button className="btn-ghost" onClick={onClose}>{t('cancel', '취소')}</button>
          <button className="btn-primary" onClick={handleAdd} disabled={!kw.trim()}>{t('add', '추가')}</button>
        </div>
      </div>
    </>
  
  );
}

/* ─── Main ───────────────────────────────────────────────────── */

/* ── Enterprise Error Boundary ─────────────────────────── */
function ErrorFallback({ error, onRetry }) {
  const t = useT();
  return (
    <div style={{
      padding: '40px 28px', textAlign: 'center', borderRadius: 16,
      background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)',
      margin: '20px 0'
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontWeight: 800, fontSize: 16, color: '#ef4444', marginBottom: 8 }}>
        {t('digitalShelf.errorOccurred', '오류가 발생했습니다')}
      </div>
      <div style={{
        fontSize: 11, color: 'var(--text-3)', marginBottom: 16,
        padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.06)',
        fontFamily: 'monospace', wordBreak: 'break-all', maxWidth: 500, margin: '0 auto 16px'
      }}>
        {error?.message || 'Unknown error'}
      </div>
      <button onClick={onRetry} style={{
        padding: '8px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff',
        fontWeight: 700, fontSize: 12
      }}>
        🔄 Retry
      </button>
    </div>
  );
}

export default function DigitalShelf() {
  const t = useT(); // 181차: 메인 컴포넌트 t 미정의(런타임 ReferenceError) 버그 수정
  // [현 차수] i18n: 데모 렌더 시드 리터럴 t() 전환 — t 접근 위해 모듈상수→컴포넌트 스코프 이동(inline 폴백 원문 유지, 로직 동일).
  const COMPETITORS = [
    { name: t('digitalShelf.compA', 'A사'), color: "#ef4444", share: 38.2 },
    { name: t('digitalShelf.compB', 'B사'), color: "#f97316", share: 24.5 },
    { name: t('digitalShelf.ownLabel', '자사'), color: "#4f8ef7", share: 18.4 },
    { name: t('digitalShelf.compC', 'C사'), color: "#a855f7", share: 11.3 },
    { name: t('digitalShelf.compEtc', '기타'), color: "#4e6080", share: 7.6 },
  ];
  const TOP_PRODUCTS = [
    { sku: "WH-1000XM5",  name: t('digitalShelf.prodXm5', '노이즈캔슬링 헤드폰 XM5'),  rank: 1, prev: 3, rating: 4.8, reviews: 2841, price: _shelfFmt.format(428000), channel: "Coupang" },
    { sku: "KB-MXM-RGB",  name: t('digitalShelf.prodCeramidin', '세라마이딘(Ceramidin) 세라마이드 크림 MX'),       rank: 2, prev: 2, rating: 4.6, reviews: 1203, price: _shelfFmt.format(189000), channel: "Naver" },
    { sku: "HC-USB4-7P",  name: t('digitalShelf.prodUsb4Hub', 'USB4 7포트 허브 Pro'),         rank: 4, prev: 6, rating: 4.5, reviews: 876,  price: _shelfFmt.format(132000), channel: "Amazon KR" },
    { sku: "GM-PRO-X",    name: t('digitalShelf.prodGamingMouse', '게이밍 마우스 Pro X'),         rank: 6, prev: 5, rating: 4.3, reviews: 2104, price: _shelfFmt.format(98000),  channel: "11Street" },
    { sku: "WC-4K-PRO",   name: t('digitalShelf.prodSoothingGel', '더마클리어 마이크로 폼 수딩 젤'),                 rank: 1, prev: 4, rating: 4.7, reviews: 634,  price: _shelfFmt.format(218000), channel: "Amazon KR" },
  ];
  const AI_INSIGHTS = [
    { level: "high",  icon: "🚀", title: t('digitalShelf.insight1Title', '기계식 키보드 SoS 급등'), desc: t('digitalShelf.insight1Desc', 'Naver·Coupang에서 자사 SoS가 전월 대비 +8.4%p 상승. Budget 20% 증액 권장.'), action: t('digitalShelf.insight1Action', 'Budget 증액') },
    { level: "warn",  icon: "⚠", title: t('digitalShelf.insight2Title', '스마트워치 경쟁사 SoS 우위'), desc: t('digitalShelf.insight2Desc', '경쟁사 A사가 55.4%로 압도적. Price·리뷰·콘텐츠 전략 재검토 필요.'), action: t('digitalShelf.insight2Action', '전략 검토') },
    { level: "warn",  icon: "📉", title: t('digitalShelf.insight3Title', '포터블 충전기 Rank 하락'), desc: t('digitalShelf.insight3Desc', 'Coupang·Naver 모두 Rank 하락 트렌드. 리스팅 최적화 및 Ad 집행 검토.'), action: t('digitalShelf.insight3Action', '리스팅 최적화') },
    { level: "info",  icon: "🎯", title: t('digitalShelf.insight4Title', '4K 웹캠 1위 유지 중'), desc: t('digitalShelf.insight4Desc', 'Coupang·Amazon KR 모두 1위 안정 유지. CTR 7.2% — 업계 최고 수준.'), action: t('digitalShelf.insight4Action', '현상 유지') },
  ];
  const [_pageError, _setPageError] = React.useState(null);
  const [_retryCount, _setRetryCount] = React.useState(0);
  // 181차 가상데이터 운영오염 차단: 데모 시드는 IS_DEMO 에서만 노출
  const competitors = IS_DEMO ? COMPETITORS : [];
  const aiInsights = IS_DEMO ? AI_INSIGHTS : [];

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("brand_sos");
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterTrend, setFilterTrend] = useState("all");
  const [keywords, setKeywords] = useState(KEYWORDS_INIT);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedKw, setExpandedKw] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState("sos"); // 신규 Tab 시스템
  const [harvesting, setHarvesting] = useState(false); // [267차] 라이브 순위 수집 진행
  const [harvestMsg, setHarvestMsg] = useState(""); // [267차] 수집 요약

  // [265차] 운영: 백엔드 영속 추적 키워드 로드(데모는 로컬 KEYWORDS_INIT 유지=IS_DEMO 격리).
  const reloadKeywords = React.useCallback(() => {
    if (IS_DEMO) return;
    getJsonAuth('/api/v429/shelf/keywords') // nginx는 v429 직접 프록시 안 함 → /api 접두(basePath strip 매치)
      .then(r => { if (r && r.ok && Array.isArray(r.keywords)) setKeywords(mapShelfRows(r.keywords)); })
      .catch(() => {});
  }, []);
  useEffect(() => { reloadKeywords(); }, [reloadKeywords]);

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

  const handleAdd = ({ keyword, channel, brand, brandSos, compSos }) => {
    if (!IS_DEMO) {
      // [265차] 운영: 백엔드 영속(새로고침 유지) → 성공 시 재로드. 실 SoS/순위는 외부 harvest 로드맵(값 날조 없음).
      // [267차] brand(검색결과 매칭용 몰/브랜드명) 함께 영속 → shelf/harvest 가 이 값으로 "자사" 리스팅 매칭.
      // [280차 P2] 종전엔 .catch(()=>{}) 로 실패를 삼키고 setToast('추가됨')를 프로미스와 무관하게 동기 실행 →
      //   5xx·저장실패에도 항상 "추가됨" 표시(겉보기 정상·실제 사망). 성공 분기 안으로 토스트 이동·실패 표면화.
      postJsonAuth('/api/v429/shelf/keywords', { keyword, channel, brand: brand || '', ourSos: brandSos, compSos })
        .then(r => {
          if (r && r.ok === false) { setToast(r.error || t('digitalShelf.toastAddFail', '추가 실패')); return; }
          reloadKeywords();
          setToast(t('digitalShelf.toastAdded', '✓ "{{kw}}" 추가됨', { kw: keyword }));
        })
        .catch(() => setToast(t('digitalShelf.toastAddFail', '추가 실패')));
      return;
    }
    // 데모: 로컬 시드(IS_DEMO 격리·기존 동작)
    setKeywords(prev => [...prev, {
      keyword, brand: brand || '', harvest_source: '', harvest_status: '', harvest_note: '', harvested_at: '',
      channels: { [channel]: { brand_sos: brandSos, comp_sos: compSos, rank: 10, ctr: 3.0, rev_share: 15.0, vol: 10000, harvest_source: '', harvest_status: '', harvest_note: '', harvested_at: '' } },
      trend: "stable"
    }]);
    setToast(t('digitalShelf.toastAdded', '✓ "{{kw}}" 추가됨', { kw: keyword }));
  };

  // [267차] 라이브 순위/SoS 벌크 수집: 테넌트 전 키워드를 검색 결과에서 harvest → 성공 시 재로드.
  // 브랜드 미설정/자격증명 미설정은 백엔드가 no_brand/pending 로 정직 반환(값 날조 없음).
  const handleHarvest = () => {
    if (harvesting) return;
    setHarvesting(true);
    setHarvestMsg("");
    postJsonAuth('/api/v429/shelf/harvest', {})
      .then(r => {
        const s = (r && r.summary) ? r.summary : (r || {});
        const live = s.harvested != null ? s.harvested : (s.live != null ? s.live : null);
        const parts = [];
        if (live != null) parts.push(t('digitalShelf.harvest.doneCount', '{{n}}개 수집', { n: live }));
        if (s.pending != null) parts.push(t('digitalShelf.harvest.pendingCount', '대기 {{n}}', { n: s.pending }));
        if (s.no_brand != null) parts.push(t('digitalShelf.harvest.noBrandCount', '브랜드 미설정 {{n}}', { n: s.no_brand }));
        setHarvestMsg(parts.length ? parts.join(' · ') : t('digitalShelf.harvest.done', '수집 완료'));
        setToast(t('digitalShelf.harvest.done', '수집 완료'));
        reloadKeywords();
      })
      .catch(() => setHarvestMsg(t('digitalShelf.harvest.failed', '수집 실패 — 잠시 후 다시 시도해 주세요')))
      .finally(() => setHarvesting(false));
  };

  const handleDownload = () => {
    downloadCSV(
      `digital_shelf_${new Date().toISOString().slice(0, 10)}.csv`,
      [t('digitalShelf.colKeyword', '키워드'), t('digitalShelf.channel', '채널'), t('digitalShelf.csvOwnSos', '자사 SoS(%)'), t('digitalShelf.csvCompSos', '경쟁사 SoS(%)'), t('digitalShelf.csvImpRank', '노출 순위'), t('digitalShelf.colSearchVol', '검색량'), "CTR(%)", t('digitalShelf.csvRevShare', '매출 기여(%)'), t('digitalShelf.colTrend', '트렌드')],
      filtered.map(kw => {
        const ch = kw.chData;
        return [kw.keyword, filterChannel === "all" ? t('digitalShelf.allChannelAvgShort', '전채널 평균') : filterChannel, ch?.brand_sos?.toFixed(1), ch?.comp_sos?.toFixed(1), ch?.rank, ch?.vol?.toLocaleString(), ch?.ctr?.toFixed(1), ch?.rev_share?.toFixed(1), kw.trend];
      })
    );
    setToast(t('digitalShelf.toastCsvDone', '✓ CSV 다운로드 완료'));
  };

  const SortTh = ({ k, label, right }) => (
    <th style={{ textAlign: right ? "right" : "left", cursor: "pointer", userSelect: "none" }}
      onClick={() => setSortKey(k)}>
      {label} {sortKey === k ? "↓" : ""}
    </th>
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <style>{`@keyframes dsSpin{to{transform:rotate(360deg)}}`}</style>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      {showAddModal && <AddKeywordModal onClose={() => setShowAddModal(false)} onAdd={handleAdd} />}

      {/* Hero */}
      <div className="hero fade-up">
        <div className="hero-grid">
          <div className="hero-meta">
            <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(20,217,176,0.25),rgba(79,142,247,0.15))" }}>🛍</div>
            <div>
              <div className="hero-title" style={{ background: "linear-gradient(135deg,#14d9b0,#4f8ef7)" }}>
                {t('digitalShelf.title', '디지털 쉘프')}
              </div>
              <div className="hero-desc">{t('digitalShelf.heroDesc', '국내 5개 채널의 자사 상품 검색 가시성·경쟁 점유율(SoS)·키워드 순위를 실시간으로 모니터링합니다.')}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button className="btn-primary" style={{ fontSize: 11, padding: "6px 14px" }} onClick={() => setShowAddModal(true)}>
                  ＋ {t('digitalShelf.addKeyword', '키워드 추가')}
                </button>
                {!IS_DEMO && (
                  <button className="btn-ghost" style={{ fontSize: 11, padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: 6, color: "#14d9b0" }} onClick={handleHarvest} disabled={harvesting}>
                    {harvesting ? <Spinner /> : "📡"} {t('digitalShelf.harvest.button', '라이브 순위 수집')}
                  </button>
                )}
                <button className="btn-ghost" style={{ fontSize: 11, padding: "6px 14px" }} onClick={handleDownload}>
                  📥 {t('digitalShelf.csvDownload', 'CSV 다운로드')}
                </button>
              </div>
              {!IS_DEMO && (harvesting || harvestMsg) && (
                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  {harvesting && <Spinner />}
                  {harvesting ? t('digitalShelf.harvest.running', '검색 결과에서 순위·SoS 수집 중...') : harvestMsg}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {[
              { l: t('digitalShelf.avgSos', '평균 SoS'),  v: `${avgBrand}%`, c: "#14d9b0" },
              { l: t('digitalShelf.top3Keywords', 'Top 3 키워드'), v: `${top3Count}${t('digitalShelf.unitCount', '개')}`, c: "#4f8ef7" },
              { l: t('digitalShelf.avgCtr', '평균 CTR'), v: `${avgCtr}%`, c: "#a855f7" },
            ].map(({ l, v, c }) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(9,15,30,0.5)", borderRadius: 8, border: "1px solid rgba(99,140,255,0.1)" }}>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>{l}</span>
                <span style={{ fontWeight: 800, color: c }}>{v}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 8, fontWeight: 700 }}>{t('digitalShelf.sosDistribution', '점유율(SoS) 분포')}</div>
            {competitors.map(c => (
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
        {[['sos','🎚️ ' + t('digitalShelf.tabSos', 'SoS 모니터링')],['quality','⭐ ' + t('digitalShelf.tabQuality', '리스팅 품질 점수')],['reviews','💬 ' + t('digitalShelf.tabReviews', '리뷰 분석')]].map(([id,lbl])=>(
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
        <div className="section-title" style={{ marginBottom: 12 }}>🤖 {t('digitalShelf.aiInsightTitle', 'AI 인사이트 · 최적화 권고')}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
          {aiInsights.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '8px 4px' }}>{t('digitalShelf.noInsight', '표시할 인사이트가 없습니다.')}</div>}
          {aiInsights.map((ins, i) => (
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
          { l: t('digitalShelf.kpiTracked', '추적 키워드'),  v: filtered.length + t('digitalShelf.unitCount', '개'), s: t('digitalShelf.kpiTrackedSub', '추적 진행 중'), c: "#4f8ef7" },
          { l: t('digitalShelf.kpiAvgOwnSos', '평균 자사 SoS'), v: `${avgBrand}%`, s: IS_DEMO ? t('digitalShelf.kpiAvgOwnSosSub', '↑ 2.3%p vs 전월') : '', c: "#14d9b0" }, // [259차] 하드코딩 증감 운영 미노출
          { l: t('digitalShelf.kpiTop3', 'Top 3 진입'), v: `${top3Count}${t('digitalShelf.unitCount', '개')}`, s: t('digitalShelf.kpiTop3Sub', '전체 {{n}}개 진행 중', { n: filtered.length }), c: "#a855f7" },
          { l: t('digitalShelf.kpiAvgCtr', '평균 CTR'), v: `${avgCtr}%`, s: IS_DEMO ? t('digitalShelf.kpiAvgCtrSub', '업계 평균 2.9% 대비') : '', c: "#22c55e" }, // [259차] 하드코딩 비교 운영 미노출
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
            <div className="section-title">🔍 {t('digitalShelf.kwSosTitle', '키워드 SoS 분석')}</div>
            <div className="section-sub">{t('digitalShelf.kwShown', '{{n}}개 키워드 표시', { n: filtered.length })}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="input" style={{ width: 160, padding: "6px 10px", fontSize: 11 }}
              placeholder={t('digitalShelf.searchKeyword', '키워드 검색...')} value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="input" style={{ width: 140, padding: "6px 10px", fontSize: 11 }}
              value={filterChannel} onChange={e => setFilterChannel(e.target.value)}>
              <option value="all">{t('digitalShelf.allChannelAvg', '전체 채널(평균)')}</option>
              {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <select className="input" style={{ width: 110, padding: "6px 10px", fontSize: 11 }}
              value={filterTrend} onChange={e => setFilterTrend(e.target.value)}>
              <option value="all">{t('digitalShelf.allTrend', '전체 트렌드')}</option>
              <option value="up">▲ {t('digitalShelf.trendUp', '상승')}</option>
              <option value="down">▼ {t('digitalShelf.trendDown', '하락')}</option>
              <option value="stable">─ {t('digitalShelf.trendStable', '유지')}</option>
            </select>
            <select className="input" style={{ width: 130, padding: "6px 10px", fontSize: 11 }}
              value={sortKey} onChange={e => setSortKey(e.target.value)}>
              <option value="brand_sos">{t('digitalShelf.sortOwnSos', '자사 SoS순')}</option>
              <option value="rev_share">{t('digitalShelf.sortRevShare', '매출 기여순')}</option>
              <option value="ctr">{t('digitalShelf.sortCtr', 'CTR순')}</option>
              <option value="vol">{t('digitalShelf.sortVol', '검색량순')}</option>
            </select>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>{t('digitalShelf.colKeyword', '키워드')}</th>
              <SortTh k="brand_sos" label={t('digitalShelf.colOwnSos', '자사 SoS')} />
              <SortTh k="comp_sos" label={t('digitalShelf.colCompSos', '경쟁사 SoS')} />
              <th>{t('digitalShelf.colSosViz', 'SoS 시각화')}</th>
              <th>{t('digitalShelf.rank', '순위')}</th>
              <SortTh k="vol" label={t('digitalShelf.colSearchVol', '검색량')} right />
              <SortTh k="ctr" label="CTR" right />
              <SortTh k="rev_share" label={t('digitalShelf.colRevShare', '매출 기여')} right />
              <th>{t('digitalShelf.colTrend', '트렌드')}</th>
              <th>{t('digitalShelf.channelCount', '채널 수')}</th>
              <th>{t('digitalShelf.harvest.source', '수집 출처')}</th>
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
                      <span className="badge" style={{ fontSize: 9 }}>{Object.keys(kw.channels).length}{t('digitalShelf.unitCount', '개')} Channel</span>
                    </td>
                    <td>
                      {kw.harvest_status ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start" }}>
                          <HarvestBadge status={kw.harvest_status} />
                          {kw.harvest_source && <span style={{ fontSize: 9, color: "var(--text-3)" }}>{kw.harvest_source}</span>}
                          {kw.harvested_at && <span style={{ fontSize: 9, color: "var(--text-3)", fontFamily: "monospace" }}>{String(kw.harvested_at).slice(0, 10)}</span>}
                        </div>
                      ) : (
                        <span style={{ fontSize: 9, color: "var(--text-3)" }}>—</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: 10, color: "var(--text-3)" }}>{isExpanded ? "▲" : "▼"}</span>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={kw.keyword + "_expand"}>
                      <td colSpan={12} style={{ padding: 0 }}>
                        <div style={{ padding: "12px 16px", background: "rgba(79,142,247,0.03)", borderTop: "1px solid rgba(99,140,255,0.1)" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 10 }}>📊 {t('digitalShelf.channelDetail', '채널별 상세')}</div>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {Object.entries(kw.channels).map(([chId, data]) => {
                              const ch = CHANNELS.find(c => c.id === chId) || { name: chId, icon: "🛒", color: "#4f8ef7" };
                              return (
                                <div key={chId} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(9,15,30,0.6)", border: `1px solid ${ch.color}22`, minWidth: 160 }}>
                                  <div style={{ fontWeight: 700, fontSize: 11, color: ch.color, marginBottom: 6 }}>{ch.icon} {ch.name}</div>
                                  {[
                                    [t('digitalShelf.colOwnSos', '자사 SoS'), data.brand_sos.toFixed(1) + "%", "#4f8ef7"],
                                    [t('digitalShelf.colCompSos', '경쟁사 SoS'), data.comp_sos.toFixed(1) + "%", "#ef4444"],
                                    [t('digitalShelf.rank', '순위'), "#" + data.rank, data.rank <= 3 ? "#22c55e" : "var(--text-2)"],
                                    ["CTR", data.ctr.toFixed(1) + "%", "#a855f7"],
                                    [t('digitalShelf.colRevShare', '매출 기여'), data.rev_share.toFixed(1) + "%", "#f97316"],
                                  ].map(([l, v, c]) => (
                                    <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
                                      <span style={{ color: "var(--text-3)" }}>{l}</span>
                                      <span style={{ fontWeight: 700, color: c }}>{v}</span>
                                    </div>
                                  ))}
                                  {/* [267차] 채널별 자동수집 메타(순위/SoS 병기) — harvest 미실행 시 미노출 */}
                                  {(data.harvest_status || data.harvest_source) && (
                                    <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid rgba(127,143,168,0.18)", display: "flex", flexDirection: "column", gap: 3 }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10 }}>
                                        <span style={{ color: "var(--text-3)" }}>{t('digitalShelf.harvest.source', '수집 출처')}</span>
                                        <HarvestBadge status={data.harvest_status} />
                                      </div>
                                      {(data.harvest_source || data.harvested_at) && (
                                        <div style={{ fontSize: 9, color: "var(--text-3)" }}>
                                          {data.harvest_source}{data.harvest_source && data.harvested_at ? " · " : ""}{data.harvested_at ? String(data.harvested_at).slice(0, 16) : ""}
                                        </div>
                                      )}
                                      {data.harvest_note && <div style={{ fontSize: 9, color: "#f97316" }}>{data.harvest_note}</div>}
                                    </div>
                                  )}
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
          <div style={{ textAlign: "center", padding: 32, color: "var(--text-3)" }}>{t('digitalShelf.noSearchResult', '검색 결과 없음')}</div>
        )}
      </div>

      {/* Channelper Rank 현황 */}
      <div className="card card-glass fade-up fade-up-4">
        <div className="section-title" style={{ marginBottom: 12 }}>📡 {t('digitalShelf.channelKwCoverage', '채널별 키워드 커버리지')}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          {CHANNELS.map(ch => {
            const covered = keywords.filter(kw => kw.channels[ch.id]).length; // [259차] KEYWORDS_INIT(영구 빈배열)→라이브 keywords state 참조(항상 0/ NaN% 버그 수정)
            const top3 = keywords.filter(kw => kw.channels[ch.id] && kw.channels[ch.id].rank <= 3).length;
            return (
              <div key={ch.id} style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(9,15,30,0.6)", border: `1px solid ${ch.color}22` }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: ch.color, marginBottom: 10 }}>{ch.icon} {ch.name}</div>
                <div style={{ display: "grid", gap: 5 }}>
                  {[
                    [t('digitalShelf.trackedKw', '추적 키워드'), covered + t('digitalShelf.unitCount', '개')],
                    [t('digitalShelf.top3Kw', 'Top 3 키워드'), top3 + t('digitalShelf.unitCount', '개')],
                  ].map(([l, v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: "var(--text-3)" }}>{l}</span>
                      <span style={{ fontWeight: 700 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 8, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4 }}>
                  <div style={{ width: `${keywords.length ? (covered / keywords.length) * 100 : 0}%`, height: "100%", background: ch.color, borderRadius: 4 }} />
                </div>
              </div>
            
);
          })}
        </div>
      </div>

      {/* Top Product */}
      <div className="card card-glass fade-up fade-up-5">
        <div className="section-header">
          <div className="section-title">🏆 {t('digitalShelf.topProductRank', '채널 내 TOP 상품 순위')}</div>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {!IS_DEMO ? (
            <div style={{ textAlign: "center", padding: "24px 16px", color: "var(--text-3)", fontSize: 12 }}>{t('digitalShelf.noTopProducts', '채널을 연동하면 채널 내 TOP 상품 순위가 집계되어 표시됩니다.')}</div>
          ) : TOP_PRODUCTS.map((p, i) => {
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
                    <div style={{ color: "var(--text-3)", fontSize: 10 }}>{t('digitalShelf.rating', '평점')}</div>
                    <div style={{ fontWeight: 700, color: "#f59e0b" }}>★ {p.rating}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "var(--text-3)", fontSize: 10 }}>{t('digitalShelf.reviews', '리뷰')}</div>
                    <div style={{ fontWeight: 700 }}>{p.reviews.toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "var(--text-3)", fontSize: 10 }}>{t('digitalShelf.price', '가격')}</div>
                    <div style={{ fontWeight: 700, color: "#4f8ef7" }}>{p.price}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ color: "var(--text-3)", fontSize: 10 }}>{t('digitalShelf.rankChange', '순위 변동')}</div>
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

/* ═══ 리스팅 품질 점수 섹션 ═══════════════════════════════ */
function ListingQualitySection() {
  const t = useT();
  // [현 차수] i18n: 데모 시드 렌더 리터럴 t() 전환 — 모듈상수→함수 스코프 이동(inline 폴백 원문 유지, 로직 동일).
  const LISTINGS_SEED = [
    { sku:'DJ-CICA-101', name:t('digitalShelf.lqName1', '무선 노이즈캔슬링 헤드폰'), title:92, images:85, desc:78, spec:95, keywords:88, channel:'coupang', issues:[t('digitalShelf.lqIssue1', '이미지 수 부족 (3/8)')], ai:t('digitalShelf.lqAi1', '제목에 "ANC" 키워드 추가 권장') },
    { sku:'DJ-CERA-002', name:t('digitalShelf.lqName2', '세라마이딘(Ceramidin) 세라마이드 크림'), title:71, images:95, desc:65, spec:80, keywords:72, channel:'naver', issues:[t('digitalShelf.lqIssue2a', '설명 글자 수 부족 (450/1000)'),t('digitalShelf.lqIssue2b', '키워드 밀도 낮음')], ai:t('digitalShelf.lqAi2', '제품 스펙(키압/배열) 상세 추가 필요') },
    { sku:'HC-USB4-7P-01', name:t('digitalShelf.lqName3', '바이탈 하이드라 콜라겐 앰플'), title:98, images:100, desc:95, spec:98, keywords:96, channel:'amazon', issues:[], ai:t('digitalShelf.lqAi3', '최적 상태 유지') },
    { sku:'CAM-4K-PRO-01', name:t('digitalShelf.lqName4', '4K 웹캠 Pro'), title:82, images:90, desc:82, spec:75, keywords:84, channel:'coupang', issues:[t('digitalShelf.lqIssue4', '스펙 미기재 (최대 해상도)')], ai:t('digitalShelf.lqAi4', 'UHD 4K 60fps 명시, 호환 OS 목록 추가') },
    { sku:'MS-ERG-BL-01', name:t('digitalShelf.lqName5', '크라이오 고무 마스크 워터풀'), title:68, images:75, desc:70, spec:72, keywords:65, channel:'11st', issues:[t('digitalShelf.lqIssue5a', '제목 키워드 누락'),t('digitalShelf.lqIssue5b', '이미지 배경 미준수')], ai:t('digitalShelf.lqAi5', '무소음·블루투스·인체공학 키워드 삽입') },
  ];
  const LISTINGS = IS_DEMO ? LISTINGS_SEED : []; // 181차 운영오염 차단
  const scoreColor = v => v >= 90 ? '#22c55e' : v >= 75 ? '#f97316' : '#ef4444';
  const totalScore = item => Math.round((item.title+item.images+item.desc+item.spec+item.keywords)/5);
  if (!LISTINGS.length) return <div style={{ padding:24, textAlign:'center', color:'var(--text-3)', fontSize:13 }}>{t('digitalShelf.noListing', '리스팅 품질 데이터가 없습니다.')}</div>;
  return (
    <div style={{ display:'grid', gap:14, padding:4 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
        {[{l:t('digitalShelf.lqOptimal', '최적 리스팅'),v:LISTINGS.filter(l=>totalScore(l)>=90).length+t('digitalShelf.unitCount', '개'),c:'#22c55e'},{l:t('digitalShelf.lqNeedsWork', '개선 필요'),v:LISTINGS.filter(l=>totalScore(l)<75).length+t('digitalShelf.unitCount', '개'),c:'#ef4444'},{l:t('digitalShelf.lqAvgScore', '평균 품질 점수'),v:Math.round(LISTINGS.reduce((s,l)=>s+totalScore(l),0)/LISTINGS.length)+t('digitalShelf.unitScore', '점'),c:'#4f8ef7'}].map(({l,v,c})=>(
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
                <div style={{ fontSize:9, color:'var(--text-3)' }}>/ {t('digitalShelf.outOf100', '100점')}</div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,minmax(40px,1fr))', gap:8, marginBottom:12 }}>
              {[[t('digitalShelf.lqTitle', '제목'),l.title],[t('digitalShelf.lqImage', '이미지'),l.images],[t('digitalShelf.lqDesc', '설명'),l.desc],[t('digitalShelf.lqSpec', '스펙'),l.spec],[t('digitalShelf.lqKeyword', '키워드'),l.keywords]].map(([lbl,val])=>(
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
            <div style={{ fontSize:10, color:'#4f8ef7', fontStyle:'italic' }}>🤖 {t('digitalShelf.aiSuggest', 'AI 제안')}: {l.ai}</div>
          </div>
        
        );
      })}
    </div>
  
);
}

/* ═══ 리뷰 분석 섹션 ════════════════════════════════════ */
function ReviewAnalysisSection() {
  const t = useT();
  // [현 차수] i18n: 데모 시드 렌더 리터럴 t() 전환 — 모듈상수→함수 스코프 이동(inline 폴백 원문 유지, 로직 동일).
  const REVIEWS_SEED = [
    { sku:'DJ-CICA-101', name:t('digitalShelf.rvName1', '무선 헤드폰'), rating:4.8, count:2841, positive:89, negative:5, neutral:6, keywords:[{w:t('digitalShelf.rvSoundQuality', '음질'),s:92},{w:t('digitalShelf.rvNoiseCancel', '노이즈캔슬'),s:88},{w:t('digitalShelf.rvFit', '착용감'),s:76},{w:t('digitalShelf.rvBattery', '배터리'),s:71}], negKw:[{w:t('digitalShelf.rvPrice', '가격'),s:45},{w:t('digitalShelf.rvBattery', '배터리'),s:22}], responseRate:78, channel:'coupang' },
    { sku:'DJ-CERA-002', name:t('digitalShelf.rvName2', 'RGB 키보드'), rating:4.6, count:1203, positive:82, negative:11, neutral:7, keywords:[{w:t('digitalShelf.rvKeyFeel', '타건감'),s:88},{w:'RGB',s:84},{w:t('digitalShelf.rvDurability', '내구성'),s:72}], negKw:[{w:t('digitalShelf.rvNoise', '소음'),s:55},{w:t('digitalShelf.rvDriver', '드라이버'),s:32}], responseRate:45, channel:'naver' },
    { sku:'HC-USB4-7P-01', name:t('digitalShelf.rvName3', 'USB-C 허브'), rating:4.5, count:876, positive:80, negative:12, neutral:8, keywords:[{w:t('digitalShelf.rvConnStability', '연결 안정성'),s:85},{w:t('digitalShelf.rvNoHeat', '발열 없음'),s:78},{w:t('digitalShelf.rvCompat', '호환성'),s:72}], negKw:[{w:t('digitalShelf.rvRecogError', '인식 오류'),s:42},{w:t('digitalShelf.rvHeat', '발열'),s:28}], responseRate:62, channel:'amazon' },
  ];
  const REVIEWS = IS_DEMO ? REVIEWS_SEED : []; // 181차 운영오염 차단
  if (!REVIEWS.length) return <div style={{ padding:24, textAlign:'center', color:'var(--text-3)', fontSize:13 }}>{t('digitalShelf.noReview', '리뷰 분석 데이터가 없습니다.')}</div>;
  return (
    <div style={{ display:'grid', gap:16, padding:4 }}>
      {REVIEWS.map(r=>(
        <div key={r.sku} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius:14, padding:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:800 }}>{r.name}</div>
              <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>{r.sku} · {r.channel} · {t('digitalShelf.reviewCount', '리뷰')} {r.count.toLocaleString()}{t('digitalShelf.unitCount', '개')}</div>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:32, fontWeight:900, color:'#f59e0b' }}>★ {r.rating}</div>
              <div style={{ fontSize:10, color: r.responseRate < 70 ? '#f97316' : '#22c55e' }}>{t('digitalShelf.responseRate', '응답률')} {r.responseRate}%</div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:12, marginBottom:10 }}>💬 {t('digitalShelf.sentimentDist', '감성 분포')}</div>
              {[[t('digitalShelf.positive', '긍정'),'#22c55e',r.positive],[t('digitalShelf.neutral', '중립'),'#f97316',r.neutral],[t('digitalShelf.negative', '부정'),'#ef4444',r.negative]].map(([lbl,c,pct])=>(
                <div key={lbl} style={{ marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
                    <span style={{ color:c, fontWeight:700 }}>{lbl}</span><span>{pct}%</span>
                  </div>
                  <div style={{ height:6, background: 'var(--border)', borderRadius:4 }}>
                    <div style={{width:`${pct}%`,height:'100%',background:c,borderRadius:4}}/>
                  </div>
                </div>
              ))}
              {r.responseRate < 70 && <div style={{ marginTop:10, padding:'8px', background:'rgba(249,115,22,0.09)', borderRadius:8, fontSize:10, color:'#f97316' }}>⚠️ {t('digitalShelf.responseRateWarn', '리뷰 응답률 {{r}}% — 80% 이상 권장', { r: r.responseRate })}</div>}
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:12, marginBottom:10 }}>🔑 {t('digitalShelf.mainKeywords', '주요 키워드')}</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
                {r.keywords.map(k=><span key={k.w} style={{ padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700, background:'rgba(79,142,247,0.15)', color:'#4f8ef7', border:'1px solid rgba(79,142,247,0.25)' }}>{k.w} {k.s}</span>)}
              </div>
              <div style={{ fontWeight:700, fontSize:11, marginBottom:6, color:'#ef4444' }}>⚠️ {t('digitalShelf.negKeywords', '부정 키워드')}</div>
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
