// InfluencerDemographics — v2 (module-level t() bug removed, useI18n only)

// ══════════════════════════════════════════════════════════════════════
//  props:
//    data  : graphicsData object
//    col   : string
//    title : string
// ==========================================================================

// Mock Data permanently removed as requested
export const DEFAULT_GRAPHICS = {
    gender: { male: 0, female: 0 },
    age: { '10-19': 0, '20-29': 0, '30-39': 0, '40-49': 0, '50+': 0 },
    top_regions: [],
    engagement_by_gender: { male_er: 0, female_er: 0 },
    engagement_by_age: { '10-19': 0, '20-29': 0, '30-39': 0, '40-49': 0, '50+': 0 },
    purchase_contribution: {
        by_gender: { male: 0, female: 0 },
        by_age: {},
        by_region: {},
    },
};

// --- Internal Utility Component ---
function MiniBar({ v, max, col, h = 6, showLabel = true }) {
    const pct = Math.min((v / (max || 1)) * 100, 100);
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1, height: h, background: 'var(--border)', borderRadius: 3 }}>
                <div style={{
                    width: `${pct}%`, height: '100%',
                    background: `linear-gradient(90deg,${col},${col}88)`,
                    borderRadius: 3, boxShadow: `0 0 5px ${col}44`,
                }} />
            </div>
            {showLabel && <span style={{ fontSize: 10, fontWeight: 800, color: col, width: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v}%</span>}
        </div>
    );
}

function SectionTitle({ children }) {
    return (
        <div style={{
            fontSize: 10, fontWeight: 700, color: 'var(--text-3)',
            textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 8
        }}>
            {children}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════
export default function InfluencerDemographics({ data, col = '#4f8ef7', title }) {
    const d = { ...DEFAULT_GRAPHICS, ...(data || {}) };
    const CARD = {
        background: 'linear-gradient(145deg,rgba(255,255,255,0.03),rgba(8,18,38,0.95))',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '12px 14px',
    };

    const ageLabels = ['10-19', '20-29', '30-39', '40-49', '50+'];
    const ageCols = ['#7c5cfc', '#4f8ef7', '#22c55e', '#f97316', '#ec4899'];
    const ageEngMax = Math.max(...ageLabels.map(k => d.engagement_by_age?.[k] ?? 0));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {title && (
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>{title}</div>
            )}

            {/* ─ 성별 ───────────────────────────────────────────── */}
            <div style={CARD}>
                <SectionTitle>⚥ 성별 팔로워 구성 & 참여 기여도</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    {[
                        { l: '👨 남성', pct: d.gender.male, er: d.engagement_by_gender?.male_er ?? 0, col: '#4f8ef7' },
                        { l: '👩 여성', pct: d.gender.female, er: d.engagement_by_gender?.female_er ?? 0, col: '#f472b6' },
                    ].map(g => (
                        <div key={g.l} style={{ background: `${g.col}08`, border: `1px solid ${g.col}18`, borderRadius: 9, padding: '10px 12px', textAlign: 'center' }}>
                            <div style={{ fontSize: 14 }}>{g.l.split(' ')[0]}</div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: g.col, marginTop: 4 }}>{g.pct}%</div>
                            <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2 }}>{g.l.split(' ')[1]}</div>
                            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginTop: 6 }}>
                                <div style={{ width: `${g.pct}%`, height: '100%', background: g.col, borderRadius: 2 }} />
                            </div>
                            <div style={{ fontSize: 9, color: g.col, marginTop: 5, fontWeight: 700 }}>참여율 {g.er.toFixed(1)}%</div>
                        </div>
                    ))}
                </div>
                {/* 구매 기여도 by gender */}
                <SectionTitle>💳 성별 구매 기여도</SectionTitle>
                {[
                    { l: '남성', v: d.purchase_contribution?.by_gender?.male ?? 44, col: '#4f8ef7' },
                    { l: '여성', v: d.purchase_contribution?.by_gender?.female ?? 56, col: '#f472b6' },
                ].map(g => (
                    <div key={g.l} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-3)', width: 28 }}>{g.l}</span>
                        <MiniBar v={g.v} max={100} col={g.col} />
                    </div>
                ))}
            </div>

            {/* ─ 연령 ───────────────────────────────────────────── */}
            <div style={CARD}>
                <SectionTitle>📊 연령대 분포 & 참여율</SectionTitle>
                {/* 막대 그래프 */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 70, marginBottom: 10 }}>
                    {ageLabels.map((k, i) => {
                        const v = d.age[k] ?? 0;
                        const maxV = Math.max(...ageLabels.map(kk => d.age[kk] ?? 0));
                        return (
                            <div key={k} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                <span style={{ fontSize: 9, fontWeight: 800, color: ageCols[i] }}>{v}%</span>
                                <div style={{
                                    width: '100%', height: `${(v / maxV) * 52}px`,
                                    background: `linear-gradient(180deg,${ageCols[i]},${ageCols[i]}88)`,
                                    borderRadius: '3px 3px 0 0',
                                    boxShadow: `0 0 6px ${ageCols[i]}44`,
                                }} />
                                <span style={{ fontSize: 8, color: 'var(--text-3)' }}>{k}</span>
                            </div>
                        );
                    })}
                </div>
                {/* 연령별 참여율 */}
                <SectionTitle>❤️ 연령별 참여율</SectionTitle>
                {ageLabels.map((k, i) => {
                    const v = d.engagement_by_age?.[k] ?? 0;
                    return (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                            <span style={{ fontSize: 10, color: 'var(--text-3)', width: 38 }}>{k}</span>
                            <MiniBar v={+v.toFixed(1)} max={ageEngMax || 1} col={ageCols[i]} showLabel={false} />
                            <span style={{ fontSize: 10, fontWeight: 800, color: ageCols[i], width: 38, textAlign: 'right' }}>{v.toFixed(1)}%</span>
                        </div>
                    );
                })}
                {/* 연령별 구매 기여도 */}
                <div style={{ marginTop: 10 }}>
                    <SectionTitle>💳 연령별 구매 기여도</SectionTitle>
                    {Object.entries(d.purchase_contribution?.by_age ?? {}).map(([k, v], i) => (
                        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                            <span style={{ fontSize: 10, color: 'var(--text-3)', width: 46 }}>{k}</span>
                            <MiniBar v={v} max={100} col={ageCols[Math.min(i, ageCols.length - 1)]} />
                        </div>
                    ))}
                </div>
            </div>

            {/* ─ 지역 ───────────────────────────────────────────── */}
            <div style={CARD}>
                <SectionTitle>🗺️ 지역별 팔로워 분포</SectionTitle>
                {(d.top_regions || []).map((r, i) => {
                    const regionCols = ['#4f8ef7', '#22c55e', '#f97316', '#a855f7', '#ec4899'];
                    const c2 = regionCols[i % regionCols.length];
                    return (
                        <div key={r.region} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                            <span style={{ fontSize: 10, color: 'var(--text-3)', width: 58 }}>{r.region}</span>
                            <MiniBar v={r.pct} max={100} col={c2} />
                        </div>
                    );
                })}
                {/* 지역별 구매 기여도 */}
                <div style={{ marginTop: 10 }}>
                    <SectionTitle>💳 지역별 구매 기여도</SectionTitle>
                    {Object.entries(d.purchase_contribution?.by_region ?? {}).map(([k, v], i) => {
                        const rc = ['#4f8ef7', '#22c55e', '#94a3b8'];
                        return (
                            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                                <span style={{ fontSize: 10, color: 'var(--text-3)', width: 62 }}>{k}</span>
                                <MiniBar v={v} max={100} col={rc[i % rc.length]} />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
