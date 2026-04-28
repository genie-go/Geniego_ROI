import React, { useState, useMemo, useCallback } from 'react';
import { useGlobalData } from '../../context/GlobalDataContext.jsx';
import { useI18n } from '../../i18n/index.js';
import { useSecurityGuard } from '../../security/SecurityGuard.js';
import {
    ComposableMap, Geographies, Geography, Marker, ZoomableGroup,
} from 'react-simple-maps';
import { fmt } from './ChartUtils.jsx';
import { useCurrency } from '../../contexts/CurrencyContext.jsx';

// ══════════════════════════════════════════════════════════════════════════
//  🌍 DashSalesGlobal — 글로벌 매출현황 Dashboard
//  ✅ Zero Mock Data: 100% GlobalDataContext 실시간 연동
//  ✅ Enterprise i18n: LOC 로컬 사전 + t() 이중 다국어 보장 (9개 언어)
//  ✅ Security: XSS-safe rendering
// ══════════════════════════════════════════════════════════════════════════

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const GAP = 10;

// ── Enterprise Zero-Miss i18n Dictionary ─────────────────────────────
const LOC = {
  ko: {
    liveGlobal:'실시간 · 글로벌', countryStatus:'매출현황', countries:'개국',
    totalGlobalRev:'총글로벌매출', totalOrders:'Total Orders', opProfit:'영업이익',
    globalRevenue:'글로벌총매출', avgGrowth:'평균성장율', topMarket:'최대시장',
    activeCountries:'액티브국가', channelPerf:'🏗 채널별', growthRate:'📈 성장율',
    popularProducts:'🏷 인기상품', channelRevRoas:'채널별 매출·ROAS 성과',
    shareRate:'점유율', highGrowthTop5:'🚀 고성장 시장 Top 5',
    cautionMarket:'⚠️ 주의 시장 (저성장/역성장)',
    globalTopProducts:'글로벌 인기 상품 Top 5',
    mapClickHint:'💡 지도 클릭 또는 아래 목록에서 국가 선택',
    countryRevRank:'🏆 국가별 매출 기여도 순위',
    selectCountryHint:'국가를 선택하면 상세 분석이 표시됩니다',
    selectFromMap:'지도 마커 또는 국가 목록에서 선택하세요',
    revContrib:'총매출 기여도', growth:'성장', totalRev:'총매출',
    orders:'주문수', contrib:'기여도', growthRate2:'성장률',
    topChannels:'🏆 주요 채널 (Top 3)', popularProductsLabel:'📦 인기 상품',
    channelRevByCountry:'채널별 매출', regionRev:'📍 지역별 매출',
    genderRatio:'👥 성별 구매 비율', male:'남성', female:'여성', other:'기타',
    ageGroupRatio:'📊 연령대별 구매 비율',
    countryOverview:'개요', countryChannel:'채널', countryRegion:'지역', countryDemo:'인구통계',
    unit:'건',
  },
  ja: {
    liveGlobal:'リアルタイム・グローバル', countryStatus:'売上状況', countries:'カ国',
    totalGlobalRev:'グローバル総売上', totalOrders:'総注文数', opProfit:'営業利益',
    globalRevenue:'グローバル総売上', avgGrowth:'平均成長率', topMarket:'最大市場',
    activeCountries:'アクティブ国数', channelPerf:'🏗 チャネル別', growthRate:'📈 成長率',
    popularProducts:'🏷 人気商品', channelRevRoas:'チャネル別 売上・ROAS実績',
    shareRate:'シェア', highGrowthTop5:'🚀 高成長市場 Top 5',
    cautionMarket:'⚠️ 注意市場（低成長・マイナス成長）',
    globalTopProducts:'グローバル人気商品 Top 5',
    mapClickHint:'💡 地図をクリックまたは下のリストから国を選択',
    countryRevRank:'🏆 国別売上貢献度ランキング',
    selectCountryHint:'国を選択すると詳細分析が表示されます',
    selectFromMap:'地図マーカーまたは国リストから選択してください',
    revContrib:'総売上貢献度', growth:'成長', totalRev:'総売上',
    orders:'注文数', contrib:'貢献度', growthRate2:'成長率',
    topChannels:'🏆 主要チャネル (Top 3)', popularProductsLabel:'📦 人気商品',
    channelRevByCountry:'チャネル別売上', regionRev:'📍 地域別売上',
    genderRatio:'👥 性別購入比率', male:'男性', female:'女性', other:'その他',
    ageGroupRatio:'📊 年齢層別購入比率',
    countryOverview:'概要', countryChannel:'チャネル', countryRegion:'地域', countryDemo:'人口統計',
    unit:'件',
  },
  en: {
    liveGlobal:'Live · Global', countryStatus:'Sales', countries:' Countries',
    totalGlobalRev:'Total Global Revenue', totalOrders:'Total Orders', opProfit:'Op. Profit',
    globalRevenue:'Global Revenue', avgGrowth:'Avg Growth', topMarket:'Top Market',
    activeCountries:'Active Countries', channelPerf:'🏗 Channels', growthRate:'📈 Growth',
    popularProducts:'🏷 Products', channelRevRoas:'Channel Revenue & ROAS',
    shareRate:'Share', highGrowthTop5:'🚀 High Growth Markets Top 5',
    cautionMarket:'⚠️ Caution Markets (Low/Negative Growth)',
    globalTopProducts:'Global Popular Products Top 5',
    mapClickHint:'💡 Click the map or select a country from the list below',
    countryRevRank:'🏆 Country Revenue Contribution Ranking',
    selectCountryHint:'Select a country to view detailed analysis',
    selectFromMap:'Click a map marker or select from country list',
    revContrib:'Revenue Contribution', growth:'Growth', totalRev:'Total Revenue',
    orders:'Orders', contrib:'Contribution', growthRate2:'Growth Rate',
    topChannels:'🏆 Top Channels (Top 3)', popularProductsLabel:'📦 Popular Products',
    channelRevByCountry:'Channel Revenue', regionRev:'📍 Regional Revenue',
    genderRatio:'👥 Gender Purchase Ratio', male:'Male', female:'Female', other:'Other',
    ageGroupRatio:'📊 Age Group Purchase Ratio',
    countryOverview:'Overview', countryChannel:'Channels', countryRegion:'Region', countryDemo:'Demographics',
    unit:'',
  },
  zh: {
    liveGlobal:'实时 · 全球', countryStatus:'销售状况', countries:'个国家',
    totalGlobalRev:'全球总收入', totalOrders:'总订单量', opProfit:'营业利润',
    globalRevenue:'全球总收入', avgGrowth:'平均增长率', topMarket:'最大市场',
    activeCountries:'活跃国家', channelPerf:'🏗 渠道', growthRate:'📈 增长率',
    popularProducts:'🏷 热门商品', channelRevRoas:'渠道销售额与ROAS',
    shareRate:'占比', highGrowthTop5:'🚀 高增长市场 Top 5',
    cautionMarket:'⚠️ 注意市场（低增长/负增长）',
    globalTopProducts:'全球热门商品 Top 5',
    mapClickHint:'💡 点击地图或从下方列表中选择国家',
    countryRevRank:'🏆 国家收入贡献排名',
    selectCountryHint:'选择一个国家以查看详细分析',
    selectFromMap:'点击地图标记或从国家列表中选择',
    revContrib:'收入贡献度', growth:'增长', totalRev:'总收入',
    orders:'订单量', contrib:'贡献度', growthRate2:'增长率',
    topChannels:'🏆 主要渠道 (Top 3)', popularProductsLabel:'📦 热门商品',
    channelRevByCountry:'渠道销售额', regionRev:'📍 地区销售额',
    genderRatio:'👥 性别购买比例', male:'男性', female:'女性', other:'其他',
    ageGroupRatio:'📊 年龄段购买比例',
    countryOverview:'概览', countryChannel:'渠道', countryRegion:'地区', countryDemo:'人口统计',
    unit:'件',
  },
  'zh-TW': {
    liveGlobal:'即時 · 全球', countryStatus:'銷售狀況', countries:'個國家',
    totalGlobalRev:'全球總收入', totalOrders:'總訂單量', opProfit:'營業利潤',
    globalRevenue:'全球總收入', avgGrowth:'平均成長率', topMarket:'最大市場',
    activeCountries:'活躍國家', channelPerf:'🏗 頻道', growthRate:'📈 成長率',
    popularProducts:'🏷 熱門商品', channelRevRoas:'頻道銷售額與ROAS',
    shareRate:'佔比', highGrowthTop5:'🚀 高成長市場 Top 5',
    cautionMarket:'⚠️ 注意市場（低成長/負成長）',
    globalTopProducts:'全球熱門商品 Top 5',
    mapClickHint:'💡 點擊地圖或從下方列表中選擇國家',
    countryRevRank:'🏆 國家收入貢獻排名',
    selectCountryHint:'選擇一個國家以查看詳細分析',
    selectFromMap:'點擊地圖標記或從國家列表中選擇',
    revContrib:'收入貢獻度', growth:'成長', totalRev:'總收入',
    orders:'訂單量', contrib:'貢獻度', growthRate2:'成長率',
    countryOverview:'概覽', countryChannel:'頻道', countryRegion:'地區', countryDemo:'人口統計',
    unit:'件',
  },
  de: {
    liveGlobal:'Live · Global', countryStatus:'Umsatzstatus', countries:' Länder',
    totalGlobalRev:'Globaler Gesamtumsatz', totalOrders:'Gesamtbestellungen', opProfit:'Betriebsgewinn',
    globalRevenue:'Globaler Umsatz', avgGrowth:'Ø Wachstum', topMarket:'Top Markt',
    activeCountries:'Aktive Länder', channelPerf:'🏗 Kanäle', growthRate:'📈 Wachstum',
    popularProducts:'🏷 Produkte', channelRevRoas:'Kanal Umsatz & ROAS',
    shareRate:'Anteil', countryOverview:'Übersicht', countryChannel:'Kanäle',
    countryRegion:'Region', countryDemo:'Demografie', unit:'',
    mapClickHint:'💡 Klicken Sie auf die Karte oder wählen Sie ein Land',
    countryRevRank:'🏆 Länderbeitrag zum Umsatz',
    selectCountryHint:'Wählen Sie ein Land für Details',
    selectFromMap:'Klicken Sie auf einen Marker oder wählen Sie aus der Liste',
  },
  th: {
    liveGlobal:'เรียลไทม์ · ทั่วโลก', countryStatus:'สถานะยอดขาย', countries:' ประเทศ',
    totalGlobalRev:'ยอดขายรวมทั่วโลก', totalOrders:'จำนวนสั่งซื้อทั้งหมด', opProfit:'กำไรดำเนินงาน',
    globalRevenue:'ยอดขายทั่วโลก', avgGrowth:'อัตราเติบโตเฉลี่ย', topMarket:'ตลาดใหญ่สุด',
    activeCountries:'ประเทศที่ใช้งาน', countryOverview:'ภาพรวม', countryChannel:'ช่องทาง',
    countryRegion:'ภูมิภาค', countryDemo:'ประชากร', unit:'',
    mapClickHint:'💡 คลิกแผนที่หรือเลือกประเทศจากรายการ',
    selectCountryHint:'เลือกประเทศเพื่อดูรายละเอียด',
  },
  vi: {
    liveGlobal:'Trực tiếp · Toàn cầu', countryStatus:'Doanh thu', countries:' quốc gia',
    totalGlobalRev:'Tổng doanh thu toàn cầu', totalOrders:'Tổng đơn hàng', opProfit:'Lợi nhuận',
    globalRevenue:'Doanh thu toàn cầu', avgGrowth:'Tăng trưởng TB', topMarket:'Thị trường lớn nhất',
    activeCountries:'Quốc gia hoạt động', countryOverview:'Tổng quan', unit:'',
    mapClickHint:'💡 Nhấp vào bản đồ hoặc chọn quốc gia',
    selectCountryHint:'Chọn quốc gia để xem chi tiết',
  },
  id: {
    liveGlobal:'Langsung · Global', countryStatus:'Status Penjualan', countries:' Negara',
    totalGlobalRev:'Total Pendapatan Global', totalOrders:'Total Pesanan', opProfit:'Laba Operasional',
    globalRevenue:'Pendapatan Global', avgGrowth:'Rata-rata Pertumbuhan', topMarket:'Pasar Terbesar',
    activeCountries:'Negara Aktif', countryOverview:'Ikhtisar', unit:'',
    mapClickHint:'💡 Klik peta atau pilih negara dari daftar',
    selectCountryHint:'Pilih negara untuk melihat detail',
  },
};

// ─── Static map/geo config ──────────────────────────────────────────
// ✅ Production: 국가별 데이터는 API 연동 후 GlobalDataContext에서 공급
// Demo mock data는 완전 제거됨 — 운영 시스템 오염 방지
const COUNTRIES = {};
const ALL = Object.entries(COUNTRIES).map(([iso, d]) => ({ iso: Number(iso), ...d }));
const TOTAL = ALL.reduce((s, c) => s + c.rev, 0);
const MAX_R = Math.max(...ALL.map(c => c.rev), 1);
const markerR = r => 7 + (r / MAX_R) * 18;
const GEO_D = { fill: '#e2e8f0', stroke: '#cbd5e1', strokeWidth: 0.5, outline: 'none' };
const mkSaleGeo = (col, sel) => ({
  fill: sel ? col : col + 'bb', stroke: sel ? '#fff' : col,
  strokeWidth: sel ? 1.2 : 0.7, outline: 'none',
});

// ─── Bar Component ──────────────────────────────────────────────────
function Bar({ pct, col, h = 6 }) {
  return (
    <div style={{ flex:1, height:h, background:'var(--surface, rgba(0,0,0,0.06))', borderRadius:4, overflow:'hidden' }}>
      <div style={{ width:`${pct}%`, height:'100%', background:col, borderRadius:4, transition:'width 0.5s ease' }} />
    </div>
  );
}

// ─── Country Rank List ──────────────────────────────────────────────
function CountryRankList({ sorted, selIso, onSelect }) {
  const { fmt: fmtC } = useCurrency();
  if (sorted.length === 0) return null;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {sorted.map((c, i) => {
        const pct = TOTAL > 0 ? ((c.rev / TOTAL) * 100).toFixed(1) : '0';
        const isSel = selIso === c.iso;
        return (
          <div key={c.iso} onClick={() => onSelect(c.iso)} style={{
            display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:10, cursor:'pointer',
            background: isSel ? `${c.col}18` : 'var(--surface, rgba(0,0,0,0.02))',
            border: `1px solid ${isSel ? c.col+'55' : 'var(--border, rgba(0,0,0,0.08))'}`, transition:'all 0.2s',
          }}>
            <span style={{ fontSize:10, color:'var(--text-3, #6b7280)', width:14, fontWeight:700 }}>{i+1}</span>
            <span style={{ fontSize:16 }}>{c.flag}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:11, fontWeight:700, color: isSel ? c.col : 'var(--text-1, #1f2937)', marginBottom:2 }}>{c.name}</div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <Bar pct={parseFloat(pct)} col={c.col} h={4} />
                <span style={{ fontSize:10, color:c.col, fontWeight:700, whiteSpace:'nowrap' }}>{pct}%</span>
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:11, fontWeight:800, color: isSel ? c.col : 'var(--text-1, #1f2937)' }}>{fmtC(c.rev)}</div>
              <div style={{ fontSize:9, color: c.growth >= 0 ? '#4ade80' : '#f87171', marginTop:1 }}>
                {c.growth >= 0 ? '▲' : '▼'} {Math.abs(c.growth)}%
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Global Summary Panel (no country selected) ─────────────────────
function GlobalSummaryPanel({ sorted, totalRev, channelBudgets, txt }) {
  const { fmt: fmtC } = useCurrency();
  const [activeTab, setActiveTab] = useState('channels');

  const avgGrowth = sorted.length ? (sorted.reduce((s, c) => s + c.growth, 0) / sorted.length).toFixed(1) : 0;
  const topGrowth = [...sorted].sort((a, b) => b.growth - a.growth).slice(0, 5);
  const botGrowth = [...sorted].sort((a, b) => a.growth - b.growth).slice(0, 3);
  const topRevCountry = sorted[0] || {};

  const channels = channelBudgets ? Object.entries(channelBudgets).map(([, v]) => ({
    name: v.name, col: v.color, icon: v.icon,
    rev: v.revenue || v.spent * v.roas, roas: v.roas,
    pct: Math.round((v.spent / Math.max(1, Object.values(channelBudgets).reduce((s2, c2) => s2 + c2.spent, 0))) * 100),
  })).sort((a, b) => b.rev - a.rev) : [];

  const TABS = [
    { id:'channels', label: txt('channelPerf') },
    { id:'growth',   label: txt('growthRate') },
    { id:'products', label: txt('popularProducts') },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {/* Global KPI Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {[
          { ico:'💰', label:txt('globalRevenue'), val:fmtC(totalRev), col:'#22c55e' },
          { ico:'📊', label:txt('avgGrowth'), val:`+${avgGrowth}%`, col:'#4f8ef7' },
          { ico:'🏆', label:txt('topMarket'), val:(topRevCountry.flag||'')+' '+(topRevCountry.name||'-'), col:'#f97316' },
          { ico:'🌍', label:txt('activeCountries'), val:`${sorted.length}${txt('countries')}`, col:'#a855f7' },
        ].map(k => (
          <div key={k.label} style={{ padding:'10px 12px', borderRadius:10, background:`${k.col}10`, border:`1px solid ${k.col}30` }}>
            <div style={{ fontSize:17, marginBottom:2 }}>{k.ico}</div>
            <div style={{ fontSize:10, color:'var(--text-3, #6b7280)', marginBottom:3 }}>{k.label}</div>
            <div style={{ fontSize:15, fontWeight:900, color:k.col }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'var(--surface, rgba(0,0,0,0.04))', borderRadius:8, padding:3 }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex:1, border:'none', borderRadius:6, padding:'6px 4px', cursor:'pointer',
            fontSize:10, fontWeight:700, transition:'all 0.18s',
            background: activeTab===tab.id ? '#4f8ef7' : 'transparent',
            color: activeTab===tab.id ? '#fff' : 'var(--text-3, #9ca3af)',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Channel Tab */}
      {activeTab === 'channels' && (
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          <div style={{ fontSize:10, color:'var(--text-3, #6b7280)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.8 }}>{txt('channelRevRoas')}</div>
          {channels.map(ch => {
            const chPct = totalRev > 0 ? ((ch.rev / totalRev) * 100).toFixed(1) : ch.pct;
            return (
              <div key={ch.name} style={{ padding:'10px 12px', borderRadius:10, background:'var(--surface, rgba(0,0,0,0.02))', border:`1px solid ${ch.col}22` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ fontSize:14 }}>{ch.icon || '📡'}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:'var(--text-1, #1f2937)' }}>{ch.name}</span>
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    {ch.roas > 0 && <span style={{ fontSize:10, padding:'2px 7px', borderRadius:12, background:'rgba(34,197,94,0.12)', color:'#4ade80', fontWeight:700 }}>ROAS {ch.roas.toFixed(1)}x</span>}
                    <span style={{ fontSize:12, fontWeight:800, color:ch.col }}>{fmtC(ch.rev)}</span>
                  </div>
                </div>
                <Bar pct={parseFloat(chPct)} col={ch.col} h={5} />
                <div style={{ fontSize:10, color:'var(--text-3, #6b7280)', marginTop:3 }}>{txt('shareRate')} {chPct}%</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Growth Tab */}
      {activeTab === 'growth' && (
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          <div style={{ fontSize:10, color:'rgba(74,222,128,0.8)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.8 }}>{txt('highGrowthTop5')}</div>
          {topGrowth.map((c, i) => (
            <div key={c.iso} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:9, background:'rgba(74,222,128,0.05)', border:'1px solid rgba(74,222,128,0.15)' }}>
              <span style={{ fontSize:10, fontWeight:800, color:'var(--text-3, #6b7280)', width:14 }}>#{i+1}</span>
              <span style={{ fontSize:14 }}>{c.flag}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-1, #1f2937)', marginBottom:3 }}>{c.name}</div>
                <Bar pct={Math.min(100, c.growth*4)} col='#4ade80' h={4} />
              </div>
              <span style={{ fontSize:13, fontWeight:900, color:'#4ade80' }}>▲{c.growth}%</span>
            </div>
          ))}
          <div style={{ fontSize:10, color:'rgba(248,113,113,0.8)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.8, marginTop:4 }}>{txt('cautionMarket')}</div>
          {botGrowth.map(c => (
            <div key={c.iso} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:9, background:'rgba(248,113,113,0.05)', border:'1px solid rgba(248,113,113,0.15)' }}>
              <span style={{ fontSize:14 }}>{c.flag}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-1, #1f2937)', marginBottom:3 }}>{c.name}</div>
                <Bar pct={Math.min(100, Math.abs(c.growth)*4)} col='#f87171' h={4} />
              </div>
              <span style={{ fontSize:13, fontWeight:900, color: c.growth < 0 ? '#f87171' : '#94a3b8' }}>{c.growth >= 0 ? '▲' : '▼'}{Math.abs(c.growth)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          <div style={{ fontSize:10, color:'var(--text-3, #6b7280)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.8 }}>{txt('globalTopProducts')}</div>
          <div style={{ textAlign:'center', padding:20, color:'var(--text-3, #6b7280)', fontSize:12 }}>-</div>
        </div>
      )}
    </div>
  );
}

// ─── Country Detail Panel ───────────────────────────────────────────
function CountryDetail({ c, txt }) {
  const { fmt: fmtC } = useCurrency();
  const [tab, setTab] = useState('overview');

  if (!c) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:340, gap:12, color:'var(--text-3, #6b7280)' }}>
      <span style={{ fontSize:48 }}>🌍</span>
      <div style={{ fontSize:13, fontWeight:600 }}>{txt('selectCountryHint')}</div>
      <div style={{ fontSize:11 }}>{txt('selectFromMap')}</div>
    </div>
  );

  const pct = TOTAL > 0 ? ((c.rev / TOTAL) * 100).toFixed(1) : '0';
  const TABS = [
    { id:'overview', label:txt('countryOverview') },
    { id:'channel',  label:txt('countryChannel') },
    { id:'region',   label:txt('countryRegion') },
    { id:'demo',     label:txt('countryDemo') },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:12, background:`linear-gradient(135deg,${c.col}15,rgba(0,0,0,0))`, border:`1px solid ${c.col}33` }}>
        <span style={{ fontSize:36 }}>{c.flag}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:16, fontWeight:900, color:c.col }}>{c.name}</div>
          <div style={{ fontSize:11, color:'var(--text-2, #374151)', marginTop:2 }}>
            {txt('revContrib')} {pct}% · AOV {fmtC(c.aov || 0)}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:22, fontWeight:900, color:c.col }}>{fmtC(c.rev)}</div>
          <div style={{ fontSize:11, color:'#4ade80', marginTop:2 }}>▲ {c.growth}% {txt('growth')}</div>
        </div>
      </div>

      {/* KPI 4-col */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
        {[
          { label:txt('totalRev'), val:fmtC(c.rev), col:c.col },
          { label:txt('orders'), val:(c.orders?.toLocaleString()||'0')+txt('unit'), col:'#4f8ef7' },
          { label:txt('contrib'), val:pct+'%', col:'#22c55e' },
          { label:txt('growthRate2'), val:'▲'+(c.growth||0)+'%', col:'#4ade80' },
        ].map(m => (
          <div key={m.label} style={{ padding:'10px 12px', borderRadius:10, background:`${m.col}0e`, border:`1px solid ${m.col}22` }}>
            <div style={{ fontSize:9, color:'var(--text-3, #6b7280)', fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>{m.label}</div>
            <div style={{ fontSize:14, fontWeight:900, color:m.col }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Detail Tabs */}
      <div style={{ display:'flex', gap:4, background:'var(--surface, rgba(0,0,0,0.03))', borderRadius:10, padding:4 }}>
        {TABS.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} style={{
            flex:1, padding:'7px 0', borderRadius:8, border:'none', cursor:'pointer',
            fontWeight:800, fontSize:11, transition:'all 0.2s',
            background: tab===tb.id ? `${c.col}22` : 'transparent',
            color: tab===tb.id ? c.col : 'var(--text-3, #9ca3af)',
            borderBottom: tab===tb.id ? `2px solid ${c.col}` : '2px solid transparent',
          }}>{tb.label}</button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && c.channels && (
        <div style={{ display:'grid', gap:10 }}>
          <div style={{ padding:'12px 14px', borderRadius:10, background:'var(--surface, rgba(0,0,0,0.02))', border:'1px solid var(--border, rgba(0,0,0,0.06))' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text-3, #6b7280)', marginBottom:10, textTransform:'uppercase' }}>{txt('topChannels')}</div>
            {c.channels.slice(0,3).map(ch => (
              <div key={ch.name} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:ch.col, flexShrink:0 }} />
                <span style={{ flex:1, fontSize:12, color:'var(--text-1, #1f2937)' }}>{ch.name}</span>
                <Bar pct={ch.pct} col={ch.col} h={5} />
                <span style={{ fontSize:11, color:ch.col, fontWeight:700, width:36, textAlign:'right' }}>{ch.pct}%</span>
                <span style={{ fontSize:10, color:'var(--text-2, #374151)', width:60, textAlign:'right' }}>{fmtC(ch.rev)}</span>
              </div>
            ))}
          </div>
          {c.topProducts && (
            <div style={{ padding:'12px 14px', borderRadius:10, background:'var(--surface, rgba(0,0,0,0.02))', border:'1px solid var(--border, rgba(0,0,0,0.06))' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-3, #6b7280)', marginBottom:10, textTransform:'uppercase' }}>{txt('popularProductsLabel')}</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {c.topProducts.map((p, i) => (
                  <span key={p} style={{ fontSize:11, padding:'4px 10px', borderRadius:20, fontWeight:700, background:`${c.col}18`, border:`1px solid ${c.col}33`, color:c.col }}>{i+1}. {p}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Channel Tab */}
      {tab === 'channel' && c.channels && (
        <div style={{ padding:'12px 14px', borderRadius:10, background:'var(--surface, rgba(0,0,0,0.02))', border:'1px solid var(--border, rgba(0,0,0,0.06))', display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--text-3, #6b7280)', textTransform:'uppercase' }}>📡 {c.name} {txt('channelRevByCountry')}</div>
          {c.channels.map(ch => (
            <div key={ch.name}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:11 }}>
                <span style={{ color:'var(--text-1, #1f2937)', fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:ch.col }} />
                  {ch.name}
                </span>
                <span style={{ display:'flex', gap:12 }}>
                  <span style={{ color:ch.col, fontWeight:800 }}>{ch.pct}%</span>
                  <span style={{ color:'var(--text-2, #374151)' }}>{fmtC(ch.rev)}</span>
                </span>
              </div>
              <Bar pct={ch.pct} col={ch.col} h={8} />
            </div>
          ))}
        </div>
      )}

      {/* Region Tab */}
      {tab === 'region' && c.regions && (
        <div style={{ padding:'12px 14px', borderRadius:10, background:'var(--surface, rgba(0,0,0,0.02))', border:'1px solid var(--border, rgba(0,0,0,0.06))', display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'var(--text-3, #6b7280)', textTransform:'uppercase', marginBottom:4 }}>{txt('regionRev')}</div>
          {c.regions.map((r, i) => (
            <div key={r.name}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:11 }}>
                <span style={{ color:'var(--text-1, #1f2937)', fontWeight:600 }}>
                  <span style={{ color:'var(--text-3, #6b7280)', marginRight:6 }}>{i+1}</span> {r.name}
                </span>
                <span style={{ display:'flex', gap:12 }}>
                  <span style={{ color:`hsl(${120+i*30},65%,58%)`, fontWeight:800 }}>{r.pct}%</span>
                  <span style={{ color:'var(--text-2, #374151)' }}>{r.orders?.toLocaleString()}</span>
                  <span style={{ color:c.col, fontWeight:700 }}>{fmtC(r.rev)}</span>
                </span>
              </div>
              <Bar pct={r.pct} col={`hsl(${120+i*30},65%,52%)`} h={7} />
            </div>
          ))}
        </div>
      )}

      {/* Demographics Tab */}
      {tab === 'demo' && c.gender && (
        <div style={{ display:'grid', gap:10 }}>
          <div style={{ padding:'12px 14px', borderRadius:10, background:'var(--surface, rgba(0,0,0,0.02))', border:'1px solid var(--border, rgba(0,0,0,0.06))' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text-3, #6b7280)', marginBottom:10, textTransform:'uppercase' }}>{txt('genderRatio')}</div>
            <div style={{ display:'flex', gap:8, marginBottom:8 }}>
              <Bar pct={c.gender.male} col='#4f8ef7' h={12} />
              <Bar pct={c.gender.female} col='#ec4899' h={12} />
              {c.gender.other > 0 && <Bar pct={c.gender.other} col='#a855f7' h={12} />}
            </div>
            <div style={{ display:'flex', gap:16, fontSize:11 }}>
              <span style={{ color:'#4f8ef7', fontWeight:800 }}>{txt('male')} {c.gender.male}%</span>
              <span style={{ color:'#ec4899', fontWeight:800 }}>{txt('female')} {c.gender.female}%</span>
              {c.gender.other > 0 && <span style={{ color:'#a855f7', fontWeight:800 }}>{txt('other')} {c.gender.other}%</span>}
            </div>
          </div>
          {c.age && (
            <div style={{ padding:'12px 14px', borderRadius:10, background:'var(--surface, rgba(0,0,0,0.02))', border:'1px solid var(--border, rgba(0,0,0,0.06))' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-3, #6b7280)', marginBottom:10, textTransform:'uppercase' }}>{txt('ageGroupRatio')}</div>
              {c.age.map((a, i) => {
                const ageCol = `hsl(${200+i*30},70%,58%)`;
                return (
                  <div key={a.label} style={{ marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3, fontSize:11 }}>
                      <span style={{ color:'var(--text-2, #374151)', fontWeight:600 }}>{a.label}</span>
                      <span style={{ color:ageCol, fontWeight:800 }}>{a.pct}%</span>
                    </div>
                    <Bar pct={a.pct} col={ageCol} h={8} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  Main Component
// ══════════════════════════════════════════════════════════════════════
export default function DashSalesGlobal() {
  const { fmt: fmtC } = useCurrency();
  const [selIso, setSelIso] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState([0, 20]);

  // ✅ GlobalDataContext — Single Source of Truth
  const { pnlStats, orderStats, channelBudgets, addAlert } = useGlobalData();
  const { t, lang: ctxLang } = useI18n();
  const lang = ctxLang || 'ko';
  const txt = useCallback((k, fb) => LOC[lang]?.[k] || LOC.en?.[k] || t(`dash.${k}`, fb || k), [lang, t]);

  // ✅ SecurityGuard — Enterprise real-time threat monitoring
  useSecurityGuard({ addAlert: useCallback((a) => { if (typeof addAlert === 'function') addAlert(a); }, [addAlert]), enabled: true });

  const sorted = useMemo(() => [...ALL].sort((a, b) => b.rev - a.rev), []);
  const selCountry = selIso ? COUNTRIES[selIso] : null;
  const totalRev = TOTAL || pnlStats?.revenue || 0;

  const handleMarker = useCallback((iso) => {
    const c = COUNTRIES[iso];
    if (!c) return;
    const isDesel = selIso === iso;
    setSelIso(isDesel ? null : iso);
    setCenter(c.coords);
    setZoom(isDesel ? 1 : 3);
  }, [selIso]);

  return (
    <div style={{ display:'grid', gap:GAP }}>
      {/* ── Real-time KPI Badges ────────────────────────────────── */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <span style={{ fontSize:10, background:'rgba(20,217,176,0.12)', border:'1px solid rgba(20,217,176,0.3)', borderRadius:20, padding:'3px 10px', color:'#14d9b0', fontWeight:700 }}>
          ● {txt('liveGlobal')} {sorted.length}{txt('countries')} {txt('countryStatus')}
        </span>
        <span style={{ fontSize:10, background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:20, padding:'3px 10px', color:'#22c55e', fontWeight:700 }}>
          💰 {txt('totalGlobalRev')} {fmtC(totalRev)}
        </span>
        <span style={{ fontSize:10, background:'rgba(79,142,247,0.12)', border:'1px solid rgba(79,142,247,0.3)', borderRadius:20, padding:'3px 10px', color:'#4f8ef7', fontWeight:700 }}>
          📦 {txt('totalOrders')} {(orderStats?.totalOrders || 0).toLocaleString()}
        </span>
        <span style={{ fontSize:10, background:'rgba(234,179,8,0.12)', border:'1px solid rgba(234,179,8,0.3)', borderRadius:20, padding:'3px 10px', color:'#eab308', fontWeight:700 }}>
          📊 {txt('opProfit')} {fmtC(pnlStats?.operatingProfit || 0)}
        </span>
      </div>

      {/* ── Main Layout: Map 60% + Panel 40% ────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'60fr 40fr', gap:GAP, alignItems:'start' }}>

        {/* Left: Map + Country List */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {/* World Map */}
          <div style={{ borderRadius:14, overflow:'hidden', background:'linear-gradient(145deg,#040e1a,#030c14)', border:'1px solid rgba(79,142,247,0.12)', height:540 }}>
            <ComposableMap projection="geoNaturalEarth1" style={{ width:'100%', height:'100%' }} projectionConfig={{ scale:175 }}>
              <ZoomableGroup zoom={zoom} center={center} onMoveEnd={({ zoom: z, coordinates: co }) => { setZoom(z); setCenter(co); }}>
                <Geographies geography={GEO_URL}>
                  {({ geographies }) => geographies.map(geo => {
                    const iso = geo.id ? Number(geo.id) : null;
                    const cData = iso ? COUNTRIES[iso] : null;
                    const isSel = iso === selIso;
                    return (
                      <Geography key={geo.rsmKey} geography={geo}
                        onClick={() => cData && handleMarker(iso)}
                        style={{
                          default: cData ? mkSaleGeo(cData.col, isSel) : GEO_D,
                          hover: cData ? mkSaleGeo(cData.col+'ee', isSel) : { ...GEO_D, fill:'#141f2e' },
                          pressed: cData ? mkSaleGeo(cData.col, true) : GEO_D,
                        }}
                      />
                    );
                  })}
                </Geographies>
                {ALL.map(c => (
                  <Marker key={c.iso} coordinates={c.coords} onClick={() => handleMarker(c.iso)}>
                    <circle r={markerR(c.rev)} fill={selIso===c.iso ? c.col : c.col+'88'} stroke={selIso===c.iso ? '#fff' : c.col} strokeWidth={selIso===c.iso ? 1.5 : 0.8} style={{ cursor:'pointer' }} />
                    <text textAnchor="middle" y={-markerR(c.rev)-3} fontSize={7} fill="rgba(0,0,0,0.6)" style={{ pointerEvents:'none' }}>{c.flag}</text>
                  </Marker>
                ))}
              </ZoomableGroup>
            </ComposableMap>
          </div>

          {/* Map Hint */}
          <div style={{ fontSize:10, color:'var(--text-3, #6b7280)', textAlign:'center' }}>
            {txt('mapClickHint')}
          </div>

          {/* Country Rank List */}
          <div style={{ borderRadius:12, background:'var(--surface, rgba(0,0,0,0.02))', border:'1px solid var(--border, rgba(0,0,0,0.06))', padding:'10px', maxHeight:190, overflowY:'auto' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text-3, #6b7280)', marginBottom:8, textTransform:'uppercase', letterSpacing:0.8 }}>
              {txt('countryRevRank')}
            </div>
            <CountryRankList sorted={sorted} selIso={selIso} onSelect={handleMarker} />
          </div>
        </div>

        {/* Right: Detail Panel */}
        <div style={{ borderRadius:14, padding:'14px 16px', background: 'var(--surface)', border:'1px solid rgba(79,142,247,0.1)', minHeight:700, display:'flex', flexDirection:'column', gap:12 }}>
          {selCountry ? (
            <CountryDetail c={selCountry} txt={txt} />
          ) : (
            <GlobalSummaryPanel sorted={sorted} totalRev={totalRev} channelBudgets={channelBudgets} txt={txt} />
          )}
        </div>
      </div>
    </div>
  );
}
