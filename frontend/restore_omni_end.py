import urllib.request
import re

path = 'D:/project/GeniegoROI/frontend/src/pages/OmniChannel.jsx'

with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('<div style={{ display: \'grid\', gap: 18, padding: 4, position: \'relative\' }}>')

clean_tail = """<div style={{ display: 'grid', gap: 18, padding: 4, position: 'relative' }}>
            {/* Live Sync Status */}
            <div style={{ padding:'6px 12px',borderRadius:8,background:'rgba(20,217,176,0.04)',border:'1px solid rgba(20,217,176,0.12)',fontSize:10,color:'#14d9b0',fontWeight:600,display:'flex',alignItems:'center',gap:6 }}>
                <span style={{ width:6,height:6,borderRadius:'50%',background:'#22c55e',animation:'pulse 2s infinite' }} />
                {t('omniChannel.liveSyncMsg')}
            </div>

            {/* Security Alert Banner */}
            {hackAlert && (
                <div style={{
                    position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 99999,
                    background: 'rgba(239,68,68,0.95)', backdropFilter: 'blur(10px)', border: '1px solid #fca5a5',
                    padding: '16px 24px', borderRadius: 12, color: 'var(--text-1)', fontWeight: 900, fontSize: 13,
                    boxShadow: '0 20px 40px rgba(220,38,38,0.4)', display: 'flex', alignItems: 'center', gap: 14,
                    animation: 'shake 0.4s ease-in-out'
                }}>
                    <span style={{ fontSize: 24 }}>🛡️</span>
                    <span>{hackAlert}</span>
                    <button onClick={clearAlert} style={{ marginLeft: 20, background: 'var(--surface)', border: 'none', color: 'var(--text-1)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>✕</button>
                    <style>{`@keyframes shake { 0%,100%{transform:translateX(-50%)} 25%{transform:translateX(calc(-50% - 10px))} 75%{transform:translateX(calc(-50% + 10px))} }`}</style>
                </div>
            )}

            {/* Hero */}
            <div className="hero fade-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div className="hero-title grad-blue-purple">🌐 {t('omniChannel.heroTitle')}</div>
                        <div className="hero-desc">{t('omniChannel.heroDesc')}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                            <span className="badge badge-blue">{t('omniChannel.badgeChannelCount').replace('{{n}}', CHANNELS_MASTER.length)}</span>
                            <span className="badge badge-teal">{t('omniChannel.badgeRegion')}</span>
                            {plan === 'pro'
                                ? <span className="badge" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)' }}>⚡ {t('omniChannel.badgeProInteg')}</span>
                                : <span className="badge badge-purple">🎮 {t('omniChannel.badgeFree')}</span>}
                            <span className="badge" style={{ background: 'rgba(79,142,247,0.15)', color: '#60a5fa', border: '1px solid rgba(79,142,247,0.3)' }}>
                                {t('omniChannel.badgeOrderMgmt').replace('{{n}}', orderStats?.count || 0)}
                            </span>
                            {hubChannels.length > 0 && (
                                <span className="badge" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>
                                    🔗 {t('omniChannel.autoSyncActive')} ({hubChannels.length})
                                </span>
                            )}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{t('omniChannel.unifiedRevenue')}</div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: '#22c55e' }}>{fmt(status?.totals?.revenue || 0)}</div>
                        <button onClick={() => navigate('/wms-manager')} style={{ marginTop: 8, padding: '5px 12px', borderRadius: 8,
                            border: '1px solid rgba(99,140,255,0.2)', background: 'transparent', color: 'var(--text-3)', fontSize: 10, cursor: 'pointer' }}>
                            {t('omniChannel.warehouseStock')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, padding: '5px', background: 'rgba(0,0,0,0.25)', borderRadius: 14, flexWrap: 'wrap' }}>
                {TABS.map(tb => (
                    <button key={tb.id} onClick={() => setTab(tb.id)}
                        style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11,
                            background: tab === tb.id ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'transparent',
                            color: tab === tb.id ? '#fff' : 'var(--text-2)', transition: 'all 150ms' }}>
                        <div>{tb.label}</div>
                        <div style={{ fontSize: 9, fontWeight: 400, opacity: 0.7, marginTop: 1 }}>{tb.desc}</div>
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {tab === 'channels' && <ChannelTab channelStatus={status} onRefresh={() => { loadStatus(); broadcast('channel_update', {}); }} plan={plan} isDemo={isDemo} t={t} csIsConnected={csIsConnected} />}
            {tab === 'products' && <ProductsTab t={t} />}
            {tab === 'orders' && <OrdersTab t={t} />}
            {tab === 'inventory' && <InventoryTab t={t} />}
            {tab === 'overview' && <OverviewTab channelStatus={status} t={t} />}
            {tab === 'guide' && <GuideTab t={t} />}
        </div>
    );
}

export default function OmniChannel() {
    return (
        <PlanGate feature="omni_channel">
            <OmniChannelInner />
        </PlanGate>
    );
}
"""

if idx != -1:
    new_text = text[:idx] + clean_tail
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("OmniChannel inner tail replaced properly")
else:
    print('idx not found')
