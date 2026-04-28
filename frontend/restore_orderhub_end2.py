import urllib.request
import re

path = 'D:/project/GeniegoROI/frontend/src/pages/OrderHub.jsx'

with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('{hackAlert && (')

clean_tail = """{hackAlert && (
                <div style={{ padding: '12px 18px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>⚠️ {hackAlert}</span>
                    <button onClick={() => setHackAlert(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                </div>
            )}
            <div className="hero fade-up">
                <div className="hero-meta">
                    <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(79,142,247,0.25),rgba(34,197,94,0.15))" }}>📬</div>
                    <div>
                        <div className="hero-title" style={{ background: "linear-gradient(135deg,#4f8ef7,#22c55e)" }}>
                            {t('orderHub.heroTitle')}
                        </div>
                        <div className="hero-desc">{t('orderHub.heroDescI18n')}</div>
                    </div>
                </div>
            </div>
            <div className="fade-up fade-up-1"><LiveIngestBar tab={tab} /></div>
            <div className="grid4 fade-up fade-up-2">
                {[
                    { l: t('orderHub.kpiCollected'), v: kpis.orders, c: '#4f8ef7' },
                    { l: t('orderHub.kpiClaimRet'), v: kpis.claims, c: '#ef4444' },
                    { l: t('orderHub.kpiShipTrack'), v: kpis.deliveries, c: '#22c55e' },
                    { l: t('orderHub.kpiConnCh'), v: kpis.channels, c: '#a855f7' },
                ].map(({ l, v, c }) => (
                    <div key={l} className="kpi-card card-hover" style={{ '--accent': c }}>
                        <div className="kpi-label">{l}</div>
                        <div className="kpi-value" style={{ color: c }}>{v}</div>
                    </div>
                ))}
            </div>
            <div className="card card-glass fade-up fade-up-3">
                <div className="tabs" style={{ marginBottom: 20 }}>
                    {TABS.map(tb => (
                        <button key={tb.id} className={`tab ${tab === tb.id ? "active" : ""}`} onClick={() => setTab(tb.id)}>{tb.label}</button>
                    ))}
                </div>
                {tab === "overview"   && <OverviewTab />}
                {tab === "orders"     && <EnhancedOrderTab />}
                {tab === "claims"     && <ClaimTab />}
                {tab === "delivery"   && <DeliveryTab />}
                {tab === "settlement" && <EnhancedSettlementTab />}
                {tab === "intl"       && <IntlOrderTab />}
                {tab === "b2b"        && <B2BOrderTab />}
                {tab === "settings"   && <CollectSettingTab />}
                {tab === "routing"    && <AutoRoutingTab />}
                {tab === "guide"      && <GuideTab />}
            </div>
        </div>
    );
}
"""

if idx != -1:
    new_text = text[:idx] + clean_tail
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("OrderHub inner tail replaced properly")
else:
    print('idx not found')
