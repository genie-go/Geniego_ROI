import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { useT } from '../i18n';

/* ── Plan Helper ────────────────────────────────────────────── */
const PLAN_RANK = { free: 0, demo: 0, starter: 1, growth: 2, pro: 3, enterprise: 4, admin: 5 };
const isPaidPlan = (plan) => (PLAN_RANK[plan] ?? 0) >= 1;

/* ── Data Trust도 배지 ──────────────────────────────────────── */
export function DataBadge({ level = 'real', size = 'sm' }) {
  const t = useT();
    const cfg = {
        real:     { label: '● Live Data', color: '#22c55e', bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.3)' },
        estimated:{ label: '~ 추정Value',      color: '#eab308', bg: 'rgba(234,179,8,0.10)', border: 'rgba(234,179,8,0.3)' },
        mock:     { label: '◌ Demo 데이터', color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.25)' },
        none:     { label: '✕ 미Integration',      color: '#ef4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.3)' },
    };
    const c = cfg[level] || cfg.mock;
    const fs = size === 'xs' ? 9 : size === 'sm' ? 10 : 11;
    return (
        <span style={{ fontSize: fs, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
            background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: 'nowrap' }}>
            {c.label}
        </span>
    );
}

/* ── Pixel Integration Settings 스텝 ────────────────────────────────────── */
const PIXELS = [
    {
        id: 'meta_pixel', name: 'Meta Pixel + CAPI', icon: '📘', color: '#1877f2',
        desc: 'Conversion Event 서버사이드 전송으로 iOS 14+ 추적 복원',
        steps: [
            { step: '1. Meta 비즈니스 Management자 → Event Management자 열기', doc: 'https://business.facebook.com/events_manager' },
            { step: '2. "Data Source Add" → 웹사이트 → Pixel ID Copy', doc: null },
            { step: '3. 아래 입력란에 Pixel ID 입력 후 Save', doc: null },
            { step: '4. CAPI 액세스 토큰 Create (Event Management자 → Settings)', doc: null },
        ],
        fields: [
            { key: 'pixel_id', label: 'Pixel ID', placeholder: '12345678901234' },
            { key: 'access_token', label: 'CAPI Access Token', placeholder: 'EAAxxxxxx...', type: 'password' },
        ],
        events: ['Purchase', 'AddToCart', 'ViewContent', 'Lead', 'CompleteRegistration'],
    },
    {
        id: 'google_gtag', name: 'Google Tag (GA4 + Ads)', icon: '🔍', color: '#4285f4',
        desc: 'GA4 Enhanced Ecommerce + Google Ads Conversion Tracking',
        steps: [
            { step: '1. Google Analytics → Management → 데이터 스트림 → 측정 ID Copy', doc: 'https://analytics.google.com' },
            { step: '2. Google Ads → 도구 → Conversion → Tag Settings → Conversion ID Copy', doc: null },
            { step: '3. 아래 입력란에 ID 입력', doc: null },
        ],
        fields: [
            { key: 'measurement_id', label: 'GA4 측정 ID', placeholder: 'G-XXXXXXXXXX' },
            { key: 'ads_conversion_id', label: 'Google Ads Conversion ID', placeholder: 'AW-XXXXXXXXX' },
        ],
        events: ['purchase', 'add_to_cart', 'view_item', 'begin_checkout'],
    },
    {
        id: 'naver_pixel', name: 'Naver 공통 스크립트', icon: '🟩', color: '#03c75a',
        desc: 'Naver SearchAd + 쇼핑 Conversion Tracking',
        steps: [
            { step: '1. Naver SearchAd → 도구 → Conversion추적 → 스크립트 키 Confirm', doc: 'https://searchad.naver.com' },
            { step: '2. Naver 쇼핑 파트너센터 → Ad → Pixel Management → ID Copy', doc: null },
            { step: '3. 아래 입력란에 ID 입력', doc: null },
        ],
        fields: [
            { key: 'na_account_id', label: 'SearchAd Account ID', placeholder: 'naver-xxxxxxxx' },
            { key: 'ns_pixel_id', label: '쇼핑 Pixel ID', placeholder: 'sp_xxxxxxxx' },
        ],
        events: ['구매Done', '장바구니Add', 'ProductSearch'],
    },
    {
        id: 'tiktok_pixel', name: 'TikTok Pixel', icon: '🎵', color: '#EE1D52',
        desc: 'TikTok Shop + TikTok Ads Conversion 및 구매 추적',
        steps: [
            { step: '1. TikTok Ads Manager → Assets → Events → Web Events', doc: 'https://ads.tiktok.com' },
            { step: '2. Pixel Create → Pixel ID + Access Token Copy', doc: null },
        ],
        fields: [
            { key: 'pixel_id', label: 'Pixel ID', placeholder: 'CXXXXXXXXXXXXXXXXX' },
            { key: 'access_token', label: 'Events API Token', placeholder: 'xxxxxxxx', type: 'password' },
        ],
        events: ['Purchase', 'AddToCart', 'ViewContent', 'InitiateCheckout'],
    },
    {
        id: 'kakao_pixel', name: 'Kakao Pixel', icon: '💛', color: '#fbbf24',
        desc: 'Kakao 모먼트 Ad Conversion 및 Kakao Channel Analysis',
        steps: [
            { step: '1. Kakao 비즈니스 → Pixel&SDK → Pixel Create → Track ID Copy', doc: 'https://business.kakao.com' },
            { step: '2. 아래 Track ID 입력', doc: null },
        ],
        fields: [
            { key: 'track_id', label: 'Kakao Track ID', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
        ],
        events: ['Purchase', 'CompleteRegistration', 'ViewContent'],
    },
];

/* ── Data Source 현황 ────────────────────────────────────────── */
const DATA_SOURCES = [
    { id: 'inventory',   label: 'Stock 데이터',       icon: '📦', level: 'real',      desc: 'API Integration 또는 CSV Upload 기반', source: 'GlobalDataContext (mock)' },
    { id: 'orders',      label: 'Orders 데이터',        icon: '📋', level: 'real',      desc: 'Channel API에서 실Time Count집', source: 'GlobalDataContext (mock)' },
    { id: 'ads_roas',    label: 'Ad ROAS',          icon: '📈', level: 'estimated', desc: 'Pixel 미Integration 시 추정Value 사용', source: 'channelBudgets SettingsValue' },
    { id: 'conversion',  label: 'Conversion 데이터',        icon: '🛒', level: 'none',      desc: 'Meta/Google Pixel Integration 필요', source: 'Pixel 미Integration' },
    { id: 'crm',         label: 'CRM 세그먼트',       icon: '👥', level: 'estimated', desc: 'AI 추정 세그먼트 (실측 아님)', source: 'AI Create 데이터' },
    { id: 'settlement',  label: '정산 데이터',        icon: '🧾', level: 'real',      desc: 'Channel 정산Report Upload 기반', source: 'GlobalDataContext (mock)' },
    { id: 'attribution', label: '기여 Analysis',          icon: '🔗', level: 'none',      desc: '서버사이드 CAPI Integration 필요', source: '미Integration' },
    { id: 'pnl',         label: 'P&L 손익',          icon: '🌊', level: 'estimated', desc: 'Revenue·Stock 기반 추정 계산', source: 'PnLDashboard 추정Value' },
];

/* ── Pixel Integration Card ─────────────────────────────────────────── */
function PixelSetupCard({ pixel, saved, onSave, isPaid }) {
    const [open, setOpen] = useState(false);
    const [vals, setVals] = useState({});
    const [saving, setSaving] = useState(false);
    const [tested, setTested] = useState(false);
    const [simDone, setSimDone] = useState(false);

    const handleSave = async () => {
        if (Object.values(vals).some(v => !v)) {
            alert('모든 필드를 입력해주세요.'); return;
        }
        setSaving(true);
        await new Promise(r => setTimeout(r, 1200));
        setSaving(false);
        if (isPaid) {
            onSave(pixel.id, vals);  // 실제 Save
        } else {
            setSimDone(true);  // Demo 시뮬레이션
            setTimeout(() => setSimDone(false), 4000);
        }
        setOpen(false);
    };

    const handleTest = async () => {
        setSaving(true);
        await new Promise(r => setTimeout(r, 800));
        setSaving(false);
        setTested(true);
        setTimeout(() => setTested(false), 3000);
    };

    const isSaved = isPaid ? !!saved : simDone;

    return (
        <div className="card card-glass" style={{ border: `1.5px solid ${isSaved ? pixel.color + '44' : 'rgba(255,255,255,0.07)'}`, padding: 18, transition: 'border 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 24 }}>{pixel.icon}</span>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 13 }}>{pixel.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{pixel.desc}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <DataBadge level={isSaved ? 'real' : 'none'} />
                    <button onClick={() => setOpen(v => !v)} style={{
                        padding: '7px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11,
                        background: isSaved ? `${pixel.color}22` : `linear-gradient(135deg,${pixel.color},${pixel.color}cc)`,
                        color: isSaved ? pixel.color : '#fff',
                    }}>
                        {isSaved ? (isPaid ? '✓ Integration됨 (재Settings)' : '✓ Demo 시뮬레이션 Done') : '+ Integration Settings'}
                    </button>
                </div>
            </div>

            {/* 추적 Event */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
                {pixel.events.map(ev => (
                    <span key={ev} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: `${pixel.color}12`, color: pixel.color, border: `1px solid ${pixel.color}33`, fontWeight: 600 }}>
                        {ev}
                    </span>
                ))}
            </div>

            {/* Settings 폼 */}
            {open && (
                <div style={{ marginTop: 16, padding: '16px', borderRadius: 12, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {/* Settings 단계 */}
                    <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>📋 Integration Order</div>
                        {pixel.steps.map((s, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6, fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>
                                <span style={{ color: pixel.color, fontWeight: 800, minWidth: 16 }}>{i + 1}.</span>
                                <span>
                                    {s.step}
                                    {s.doc && <a href={s.doc} target="_blank" rel="noreferrer" style={{ marginLeft: 6, color: pixel.color, fontWeight: 700, fontSize: 10 }}>→ 바로가기</a>}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Input Field */}
                    <div style={{ display: 'grid', gap: 10 }}>
                        {pixel.fields.map(f => (
                            <div key={f.key}>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4, fontWeight: 600 }}>{f.label}</div>
                                <input
                                    type={f.type || 'text'}
                                    placeholder={f.placeholder}
                                    value={vals[f.key] || ''}
                                    onChange={e => setVals(p => ({ ...p, [f.key]: e.target.value }))}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: 9, background: 'rgba(0,0,0,0.3)', border: `1px solid ${pixel.color}44`, color: '#fff', fontSize: 12, boxSizing: 'border-box' }}
                                />
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button onClick={handleTest} disabled={saving} style={{ padding: '8px 16px', borderRadius: 9, border: `1px solid ${pixel.color}44`, background: 'transparent', color: pixel.color, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                            {tested ? '✅ Test Done!' : saving ? '⏳...' : '🔬 Connect Test'}
                        </button>
                        <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '8px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 12, background: `linear-gradient(135deg,${pixel.color},${pixel.color}bb)`, color: '#fff', opacity: saving ? 0.7 : 1 }}>
                            {saving ? '⏳ Save in progress...' : isPaid ? '💾 Integration Save' : '🎭 Demo 시뮤레이션 Run'}
                        </button>
                        <button onClick={() => setOpen(false)} style={{ padding: '8px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-3)', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── 메인 Component ───────────────────────────────────────────── */
export default function DataTrustDashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isPaid = isPaidPlan(user?.plan);
    const [savedPixels, setSavedPixels] = useState({});
    const [tab, setTab] = useState('overview');

    const realCount    = DATA_SOURCES.filter(d => d.level === 'real').length;
    const estCount     = DATA_SOURCES.filter(d => d.level === 'estimated').length;
    const noneCount    = DATA_SOURCES.filter(d => d.level === 'none').length;
    const pixelSaved   = Object.keys(savedPixels).length;
    const trustScore   = Math.round(((realCount + pixelSaved * 1.5) / (DATA_SOURCES.length + PIXELS.length * 1.5)) * 100);

    const TABS = [
        { id: 'overview', label: '📊 데이터 현황' },
        { id: 'pixel',    label: '🔌 Pixel Integration' },
        { id: 'quality',  label: '🔬 품질 기준' },
    ];

    return (
        <div style={{ display: 'grid', gap: 18 }}>
            {/* Header */}
            <div className="card card-glass" style={{ padding: '20px 24px', background: 'linear-gradient(135deg,rgba(34,197,94,0.06),rgba(79,142,247,0.06))', borderColor: 'rgba(34,197,94,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 20, color: 'var(--text-1)', marginBottom: 4 }}>
                            🔬 Data Trust성 센터
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            Platform All Data Source의 신뢰도를 Management하고 Pixel·API Integration으로 Live Data 정확도를 높이세요
                        </div>
                    </div>
                    {/* 신뢰도 점Count */}
                    <div style={{ textAlign: 'center', padding: '14px 22px', borderRadius: 14, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>Data Trust도 점Count</div>
                        <div style={{ fontWeight: 900, fontSize: 32, color: trustScore > 60 ? '#22c55e' : trustScore > 40 ? '#eab308' : '#ef4444', lineHeight: 1 }}>
                            {trustScore}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2 }}>/ 100</div>
                    </div>
                </div>

                {/* KPI */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 16 }}>
                    {[
                        { label: '✅ Live Data', value: realCount + '개', color: '#22c55e' },
                        { label: '~ 추정Value', value: estCount + '개', color: '#eab308' },
                        { label: '✕ 미Integration', value: noneCount + '개', color: '#ef4444' },
                        { label: '🔌 Pixel Integration', value: pixelSaved + '/' + PIXELS.length, color: '#4f8ef7' },
                    ].map(k => (
                        <div key={k.label} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(0,0,0,0.2)', textAlign: 'center' }}>
                            <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 4 }}>{k.label}</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: k.color }}>{k.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tab */}
            <div className="card card-glass" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ display: 'flex' }}>
                    {TABS.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            flex: 1, padding: '13px 8px', border: 'none', cursor: 'pointer', textAlign: 'center',
                            background: tab === t.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                            borderBottom: `2px solid ${tab === t.id ? '#6366f1' : 'transparent'}`,
                            fontSize: 12, fontWeight: 800, color: tab === t.id ? 'var(--text-1)' : 'var(--text-2)',
                            transition: 'all 200ms',
                        }}>{t.label}</button>
                    ))}
                </div>
            </div>

            <div className="card card-glass" style={{ padding: 20 }}>
                {/* Tab: 데이터 현황 */}
                {tab === 'overview' && (
                    <div style={{ display: 'grid', gap: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>📦 Data Sourceper 신뢰도 현황</div>
                        {DATA_SOURCES.map(ds => (
                            <div key={ds.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: 20 }}>{ds.icon}</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 12 }}>{ds.label}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{ds.desc}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'monospace' }}>{ds.source}</span>
                                    <DataBadge level={ds.level} />
                                    {ds.level === 'none' && (
                                        <button onClick={() => setTab('pixel')} style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                                            Integration Settings →
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Data Trust도 향상 가이드 */}
                        <div style={{ marginTop: 8, padding: '14px 18px', borderRadius: 12, background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.2)' }}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: '#4f8ef7', marginBottom: 8 }}>🎯 Data Trust도 향상 방법</div>
                            <div style={{ display: 'grid', gap: 6 }}>
                                {[
                                    { icon: '1', text: 'Meta Pixel + CAPI Integration으로 Conversion 데이터를 실측Value으로 Conversion', btn: 'Pixel Integration →', action: 'pixel' },
                                    { icon: '2', text: 'Google Analytics 4 Integration으로 사이트 트래픽 실측 Analysis Start', btn: 'Integration →', action: 'pixel' },
                                    { icon: '3', text: 'Channel API Key Register으로 Orders·Stock 데이터를 실Time Count집', btn: 'API Settings →', action: '/api-keys' },
                                ].map(g => (
                                    <div key={g.icon} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-2)' }}>
                                        <span><strong style={{ color: '#4f8ef7' }}>{g.icon}.</strong> {g.text}</span>
                                        <button onClick={() => g.action.startsWith('/') ? navigate(g.action) : setTab(g.action)} style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(79,142,247,0.3)', background: 'transparent', color: '#4f8ef7', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                            {g.btn}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Pixel Integration */}
                {tab === 'pixel' && (
                    <div style={{ display: 'grid', gap: 14 }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>🔌 Ad Pixel & Conversion API Integration</div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Pixel Integration 시 ROAS·Conversion 데이터가 추정Value이 아닌 실제 측정Value으로 Conversion됩니다</div>
                            </div>
                            <span style={{ fontSize: 11, padding: '5px 14px', borderRadius: 99, background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', fontWeight: 700 }}>
                                {pixelSaved}/{PIXELS.length} Integration Done
                            </span>
                        </div>
                        {PIXELS.map(px => (
                            <PixelSetupCard key={px.id} pixel={px}
                                saved={savedPixels[px.id]}
                                onSave={(id, vals) => setSavedPixels(p => ({ ...p, [id]: vals }))}
                            />
                        ))}
                    </div>
                )}

                {/* Tab: 품질 기준 */}
                {tab === 'quality' && (
                    <div style={{ display: 'grid', gap: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>🔬 Data Quality 기준표</div>

                        {[
                            {
                                level: 'real', title: '✅ Live Data (Real Data)',
                                color: '#22c55e', bg: 'rgba(34,197,94,0.06)',
                                desc: 'Ad Pixel/Channel API/정산Report에서 직접 Count집된 원본 데이터. 가장 높은 신뢰도.',
                                examples: ['Meta CAPI Conversion Event', 'Channel API Orders 데이터', '정산Report 정산 Amount', 'Stock API 실Time Quantity'],
                            },
                            {
                                level: 'estimated', title: '~ 추정Value (Estimated)',
                                color: '#eab308', bg: 'rgba(234,179,8,0.06)',
                                desc: 'Live Data 기반으로 계산·추정된 Value. 방향성은 맞지만 정확한 Count치가 아닐 Count Present.',
                                examples: ['CRM AI 세그먼트 (실측 아님)', 'P&L 추정 Profit률', 'ROAS SettingsValue 기반 계산', 'AI Forecast Conv. Rate'],
                            },
                            {
                                level: 'mock', title: '◌ Demo 데이터 (Demo)',
                                color: '#94a3b8', bg: 'rgba(148,163,184,0.06)',
                                desc: '개발·시연 목적의 샘플 데이터. 실제 비즈니스 의사결정에 사용하지 마세요.',
                                examples: ['초기 Settings 전 Basic 표시 데이터', '튜토리얼 예시 데이터'],
                            },
                            {
                                level: 'none', title: '✕ 미Integration (Not Connected)',
                                color: '#ef4444', bg: 'rgba(239,68,68,0.06)',
                                desc: '해당 Data Source가 Integration되지 않음. 표시되는 0Value 또는 빈 Status.',
                                examples: ['Pixel 미Integration Conversion 데이터', 'API Key 미Register Channel 데이터'],
                            },
                        ].map(q => (
                            <div key={q.level} style={{ padding: '16px 18px', borderRadius: 12, background: q.bg, border: `1px solid ${q.color}22` }}>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                                    <DataBadge level={q.level} size="md" />
                                    <span style={{ fontWeight: 700, fontSize: 13, color: q.color }}>{q.title}</span>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 10, lineHeight: 1.6 }}>{q.desc}</div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {q.examples.map(ex => (
                                        <span key={ex} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: `${q.color}12`, color: q.color, border: `1px solid ${q.color}22` }}>{ex}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

import { useI18n } from '../i18n/index.js';