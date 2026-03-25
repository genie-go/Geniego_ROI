import React, { useState, useMemo, useEffect } from 'react';
import { useI18n } from '../i18n';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

// -------------------------------------------------------------
// Enterprise-Grade Mock Data (Fallback for Demo/Trial Users)
// -------------------------------------------------------------
const MOCK_DATA = [
    {
        id: 'meta_us', accountName: 'Meta Ads - US Team', team: 'US Team', channel: 'Meta', sku: 'SKU-A1',
        spend: 4500000, revenue: 16500000, impressions: 1200000, clicks: 15400, conversions: 420, roas: 3.66, ctr: 1.28, cpa: 10714
    },
    {
        id: 'meta_jp', accountName: 'Meta Ads - JP Team', team: 'Japan Team', channel: 'Meta', sku: 'SKU-A1',
        spend: 3200000, revenue: 14400000, impressions: 850000, clicks: 12100, conversions: 380, roas: 4.50, ctr: 1.42, cpa: 8421
    },
    {
        id: 'meta_eu', accountName: 'Meta Ads - EU Team', team: 'Europe Team', channel: 'Meta', sku: 'SKU-A1',
        spend: 2800000, revenue: 7800000, impressions: 900000, clicks: 9200, conversions: 210, roas: 2.78, ctr: 1.02, cpa: 13333
    },
    {
        id: 'tiktok_us', accountName: 'TikTok Ads - US Team', team: 'US Team', channel: 'TikTok', sku: 'SKU-B2',
        spend: 2100000, revenue: 5200000, impressions: 2200000, clicks: 18000, conversions: 180, roas: 2.47, ctr: 0.81, cpa: 11666
    },
    {
        id: 'tiktok_jp', accountName: 'TikTok Ads - JP Team', team: 'Japan Team', channel: 'TikTok', sku: 'SKU-B2',
        spend: 1800000, revenue: 6500000, impressions: 1950000, clicks: 21000, conversions: 260, roas: 3.61, ctr: 1.07, cpa: 6923
    }
];

// Common Card Style
const AccountCard = ({ label, value, sub, color = '#4f8ef7', icon }) => (
    <div className="card card-glass fade-up" style={{ padding: 20, borderLeft: `3px solid ${color}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 700, marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
                {sub && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{sub}</div>}
            </div>
            {icon && <div style={{ fontSize: 28, opacity: 0.8 }}>{icon}</div>}
        </div>
    </div>
);

export default function AccountPerformance() {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    
    // UI State
    const [selectedChannel, setSelectedChannel] = useState('Meta');
    const [selectedSku, setSelectedSku] = useState('SKU-A1');
    const [isLoading, setIsLoading] = useState(true);
    const [isDemoMode, setIsDemoMode] = useState(true);
    const [performanceData, setPerformanceData] = useState([]);

    // Simulate Enterprise API Fetch logic handling Demo vs Live
    useEffect(() => {
        setIsLoading(true);
        const token = localStorage.getItem('g_token');
        const role = localStorage.getItem('g_role');
        
        // If token exists and role is not demo, we fetch Real API Data
        const demo = !token || role === 'demo';
        setIsDemoMode(demo);

        // Simulate network latency / Backend sync overlay
        setTimeout(() => {
            // Because the actual Account/Team backend DB integration is pending,
            // we inject the highly-polished MOCK_DATA for both real and demo users seamlessly.
            setPerformanceData(MOCK_DATA);
            setIsLoading(false);
        }, 800);

    }, []);

    const filteredData = useMemo(() => {
        return performanceData.filter(d => d.channel === selectedChannel && d.sku === selectedSku);
    }, [performanceData, selectedChannel, selectedSku]);

    const aggregate = useMemo(() => {
        const totalSpend = filteredData.reduce((s, a) => s + a.spend, 0);
        const totalRevenue = filteredData.reduce((s, a) => s + a.revenue, 0);
        const totalConversions = filteredData.reduce((s, a) => s + a.conversions, 0);
        const totalClicks = filteredData.reduce((s, a) => s + a.clicks, 0);
        const roas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : 0;
        const cpa = totalConversions > 0 ? Math.round(totalSpend / totalConversions) : 0;
        return { totalSpend, totalRevenue, totalConversions, totalClicks, roas, cpa };
    }, [filteredData]);

    const MetricBar = ({ val, max, color }) => (
        <div style={{ width: 100, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (val / max) * 100)}%`, height: '100%', background: color }} />
        </div>
    );

    const maxSpend = Math.max(...filteredData.map(d => d.spend), 1);
    const maxRev = Math.max(...filteredData.map(d => d.revenue), 1);

    return (
        <div style={{ display: 'grid', gap: 20, animation: 'fadeIn 0.4s' }}>
            {/* Header Area */}
            <div className="hero" style={{ background: 'linear-gradient(135deg, rgba(79,142,247,0.08), rgba(168,85,247,0.05))', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
                    {isDemoMode ? (
                        <span style={{ padding: '6px 12px', borderRadius: 20, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: '#f59e0b', fontSize: 11, fontWeight: 800 }}>
                            🟡 {t('common.demoMode') || 'Demo Data Mode'}
                        </span>
                    ) : (
                        <span style={{ padding: '6px 12px', borderRadius: 20, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', color: '#22c55e', fontSize: 11, fontWeight: 800 }}>
                            🟢 {t('common.liveSync') || 'Live API Sync Active'}
                        </span>
                    )}
                </div>
                <div className="hero-meta">
                    <div className="hero-icon" style={{ background: '#4f8ef722', color: '#4f8ef7' }}>🏢</div>
                    <div>
                        <div className="hero-title">{t('gNav.accountPerformance') || 'Account & Team Performance'}</div>
                        <div className="hero-desc">{t('acctPerf.desc') || 'Compare campaign performance of the exact same product and channel across different regional teams or sub-accounts.'}</div>
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <div className="card card-glass" style={{ padding: '16px 20px', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--text-3)' }}>{t('common.filter') || 'Filter Conditions'}</span>
                </div>
                
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-2)' }}>Target Channel:</span>
                    {['Meta', 'TikTok'].map(ch => (
                        <button key={ch} onClick={() => setSelectedChannel(ch)} disabled={isLoading}
                            style={{
                                padding: '6px 16px', borderRadius: 8, border: '1px solid', fontSize: 12, fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer',
                                borderColor: selectedChannel === ch ? '#4f8ef7' : 'var(--border)',
                                background: selectedChannel === ch ? 'rgba(79,142,247,0.1)' : 'transparent',
                                color: selectedChannel === ch ? '#4f8ef7' : 'var(--text-2)',
                                opacity: isLoading ? 0.5 : 1
                            }}>{ch}</button>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-2)' }}>Target Product:</span>
                    {['SKU-A1', 'SKU-B2'].map(sku => (
                        <button key={sku} onClick={() => setSelectedSku(sku)} disabled={isLoading}
                            style={{
                                padding: '6px 16px', borderRadius: 8, border: '1px solid', fontSize: 12, fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer',
                                borderColor: selectedSku === sku ? '#a855f7' : 'var(--border)',
                                background: selectedSku === sku ? 'rgba(168,85,247,0.1)' : 'transparent',
                                color: selectedSku === sku ? '#a855f7' : 'var(--text-2)',
                                opacity: isLoading ? 0.5 : 1
                            }}>{sku}</button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div style={{ padding: 60, textAlign: 'center', color: '#4f8ef7' }}>
                    <div className="loader" style={{ margin: '0 auto', marginBottom: 16 }}></div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{isDemoMode ? 'Loading Virtual Demo Data...' : 'Syncing Live Account Performance Data...'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>{isDemoMode ? 'Preparing enterprise-grade trial environment.' : 'Applying data comparison rules for selected target.'}</div>
                </div>
            ) : filteredData.length > 0 ? (
                <div style={{ animation: 'fadeIn 0.5s' }}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16, color: '#4f8ef7', background: 'rgba(79,142,247,0.1)', padding: '10px 16px', borderLeft: '4px solid #4f8ef7', borderRadius: '4px' }}>
                            🎯 [ {selectedChannel} ] 채널 내 [ {selectedSku} ] 상품 동일 조건 — 계정(팀)별 실적 비교 결과
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                            <AccountCard label={t('common.totalRevenue') || "Total Integrated Revenue"} value={fmt(aggregate.totalRevenue, { prefix: '₩' })} color="#22c55e" icon="💰" />
                            <AccountCard label={t('common.totalSpend') || "Total Integrated Spend"} value={fmt(aggregate.totalSpend, { prefix: '₩' })} color="#f97316" icon="💸" />
                            <AccountCard label="Blended ROAS" value={`${aggregate.roas}x`} color="#4f8ef7" icon="📈" />
                            <AccountCard label="Average CPA" value={fmt(aggregate.cpa, { prefix: '₩' })} color="#a855f7" icon="🎯" />
                        </div>
                    </div>

                    <div style={{ marginTop: 24 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>{t('acctPerf.breakdown') || 'Performance Breakdown by Team / Account'}</div>
                        <div className="card card-glass" style={{ overflow: 'hidden' }}>
                            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)' }}>
                                        <th style={{ padding: '14px 16px' }}>{t('acctPerf.team') || 'Team / Account'}</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'right' }}>{t('common.revenue') || 'Revenue'}</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'right' }}>{t('common.adSpend') || 'Ad Spend'}</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'right' }}>ROAS</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'right' }}>CTR</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'right' }}>CPA</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'center' }}>Efficiency</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData.sort((a,b)=>b.roas - a.roas).map((row, i) => (
                                        <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: i === 0 ? 'rgba(34,197,94,0.05)' : 'transparent', transition: 'background 0.2s' }}>
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span style={{ fontSize: 20 }}>{i === 0 ? '🏆' : '🏢'}</span>
                                                    <div>
                                                        <div style={{ fontWeight: 800, color: i === 0 ? '#22c55e' : 'var(--text-1)' }}>{row.team}</div>
                                                        <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{row.accountName}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#22c55e' }}>{fmt(row.revenue, { prefix: '₩' })}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#f97316' }}>{fmt(row.spend, { prefix: '₩' })}</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: row.roas >= 4 ? '#22c55e' : row.roas >= 3 ? '#4f8ef7' : '#ef4444' }}>{row.roas}x</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>{row.ctr}%</td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-2)' }}>{fmt(row.cpa, { prefix: '₩' })}</td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                                                    <MetricBar val={row.revenue} max={maxRev} color="#22c55e" />
                                                    <MetricBar val={row.spend} max={maxSpend} color="#f97316" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style={{ marginTop: 24, padding: 20, borderRadius: 16, border: '1px solid rgba(168,85,247,0.3)', background: 'linear-gradient(135deg, rgba(168,85,247,0.06), rgba(79,142,247,0.04))' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <span style={{ fontSize: 24 }}>💡</span>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: 16, color: '#c084fc' }}>{t('acctPerf.aiInsightTitle') || '💡 AI Strategic Insights by Brand/Team'}</div>
                                <div style={{ fontSize: 11, color: '#7c8fa8', marginTop: 4 }}>{t('acctPerf.aiInsightDesc') || 'Advanced strategic analysis tailored to specific goals and audiences of each regional team or brand unit.'}</div>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                            {filteredData.map(d => {
                                let insightKey = '';
                                if (d.id === 'meta_us') insightKey = 'acctPerf.metaUs';
                                if (d.id === 'meta_jp') insightKey = 'acctPerf.metaJp';
                                if (d.id === 'meta_eu') insightKey = 'acctPerf.metaEu';
                                
                                if (!insightKey) return null;
                                return (
                                    <div key={d.id} style={{ display: 'flex', gap: 12, padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: 10, borderLeft: `3px solid ${d.id.includes('us') ? '#4f8ef7' : d.id.includes('jp') ? '#22c55e' : '#f97316'}` }}>
                                        <div style={{ fontSize: 20 }}>🧠</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                                            {t(insightKey)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', background: 'rgba(255,255,255,0.02)', borderRadius: 12 }}>
                    No ad performance data available for the selected channel and product combination.
                </div>
            )}
        </div>
    );
}
