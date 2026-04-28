/* ─── Tab: Usage Guide ─────────────────────────────────────────────────────── */
function UsageGuideTab() {
    const { t } = useI18n();
    const COLORS=['#4f8ef7','#22c55e','#f59e0b','#a855f7','#6366f1','#ec4899','#14b8a6','#ef4444','#8b5cf6','#10b981','#3b82f6','#e11d48','#06b6d4','#0ea5e9','#f97316'];
    const ICONS=['📝','📡','💰','🔄','🗂️','📦','📋','⏰','🔐','📊','🧪','⚙️','🛡️','📱','🚀'];
    const steps=[];
    for(let i=1;i<=15;i++){const title=t('catalogSync.guideStep'+i+'Title','');if(title&&!title.includes('catalogSync.'))steps.push({title,desc:t('catalogSync.guideStep'+i+'Desc',''),icon:ICONS[i-1],color:COLORS[i-1]});}
    const tips=[];
    for(let i=1;i<=10;i++){const tip=t('catalogSync.guideTip'+i,'');if(tip&&!tip.includes('catalogSync.'))tips.push(tip);}

    return (
        <div style={{ display: "grid", gap: 18 }}>
            <div style={{ background: "linear-gradient(135deg,#fff7ed,#fef3c7)", borderRadius: 16, border: "1px solid #fed7aa", padding: "28px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📖</div>
                <div style={{ fontWeight: 700, fontSize: 20, color: "#2563eb", marginBottom: 6 }}>{t('catalogSync.guideTitle')}</div>
                <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{t('catalogSync.guideOverviewDesc')}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {steps.map((s, i) => (
                    <div key={i} style={{ background: "#ffffff", borderRadius: 14, border: `1px solid ${s.color}25`, padding: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{s.icon}</div>
                            <div>
                                <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700 }}>STEP {i+1}</div>
                                <div style={{ fontWeight: 700, fontSize: 13, color: s.color }}>{s.title}</div>
                            </div>
                        </div>
                        <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{s.desc}</div>
                    </div>
                ))}
            </div>
            <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid rgba(245,158,11,0.2)", padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#f59e0b", marginBottom: 12 }}>💡 {t('catalogSync.guideTips')}</div>
                <div style={{ display: "grid", gap: 10 }}>
                    {tips.map((tip, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 12 }}>•</span>
                            <span style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{tip}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ─── Main Page ─────────────────────────────────────────────────────────────── */
export default function CatalogSync() {
    const { t } = useI18n();
    const { addAlert, inventory } = useGlobalData();
    const dynamicChannels = useDynamicChannels();
    const { connectedCount } = useConnectorSync();
    const { secBanner } = useCatalogSecurity();
    const [tab, setTab] = useState("catalog");
    const [jobs, setJobs] = useState([]);
    const addJob = useCallback(j => setJobs(prev => [...prev, j]), []);

    useEffect(() => {
        const bc = new BroadcastChannel('genie_product_sync');
        bc.onmessage = (e) => {
            if (e.data?.type === 'PRODUCT_UPDATE' && e.data.source !== 'catalogSync') {}
        };
        return () => bc.close();
    }, []);

    const broadcastProducts = useCallback(() => {
        try {
            const bc = new BroadcastChannel('genie_product_sync');
            bc.postMessage({ type: 'PRODUCT_UPDATE', source: 'catalogSync', ts: Date.now() });
            bc.close();
        } catch {}
    }, []);

    const TABS = useMemo(() => [
        { id: "catalog", label: `📚 ${t('catalogSync.tabCatalog')}` },
        { id: "sync", label: `🔄 ${t('catalogSync.tabSyncRun')}` },
        { id: "catmap", label: `🗂️ ${t('catalogSync.tabCategoryMapping')}` },
        { id: "price", label: `💰 ${t('catalogSync.tabPriceRules')}` },
        { id: "inventory", label: `📦 ${t('catalogSync.tabStockPolicy')}` },
        { id: "history", label: `📋 ${t('catalogSync.tabHistory')}` },
        { id: "guide", label: `📖 ${t('catalogSync.tabGuide')}` },
    ], [t]);

    const totalProducts = inventory?.length || PRODUCTS_INIT.length;
    const syncedProducts = (inventory?.length || PRODUCTS_INIT.length);
    const errorProducts = 0;
    const deltaProducts = 0;

    return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#f8fafc" }}>
      <div style={{ padding: "18px 24px 0", flexShrink: 0 }}>
            {secBanner && (
                <div style={{ padding: "12px 18px", borderRadius: 10, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>🛡️</span>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#ef4444" }}>{t('catalogSync.securityBannerTitle')}</div>
                        <div style={{ fontSize: 11, color: "#374151" }}>{secBanner.type} — {secBanner.at} ({secBanner.count}회)</div>
                    </div>
                </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 20, fontWeight: 700, background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }}>
                    🔗 {t('catalogSync.crossSyncActive')}
                </span>
            </div>
            <div style={{ background: "linear-gradient(135deg,#eff6ff,#f0fdf4)", borderRadius: 16, padding: "24px", border: "1px solid #bfdbfe", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#dbeafe,#d1fae5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, border: "1px solid #bfdbfe" }}>🔄</div>
                    <div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: "#2563eb" }}>{t('catalogSync.heroTitle')}</div>
                        <div style={{ fontSize: 13, color: "#374151", marginTop: 4 }}>{t('catalogSync.heroDesc')}</div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                    {dynamicChannels.map(c => (
                        <span key={c.id} style={{ fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: c.connected ? c.color + '18' : 'rgba(100,100,100,0.1)', color: c.connected ? c.color : '#6b7280', border: `1px solid ${c.connected ? c.color + '33' : 'rgba(100,100,100,0.2)'}`, opacity: c.connected ? 1 : 0.5 }}>
                            {c.icon} {c.name} {c.connected && '✅'}
                        </span>
                    ))}
                    {connectedCount > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}>🔗 {connectedCount} {t('catalogSync.connectedLabel')}</span>}
                </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 12 }}>
                {[
                    { l: t('catalogSync.kpiAllProducts'), v: totalProducts, c: "#4f8ef7" },
                    { l: t('catalogSync.kpiSyncDone'), v: syncedProducts, c: "#22c55e" },
                    { l: t('catalogSync.kpiChangeDetected'), v: deltaProducts, c: "#f97316" },
                    { l: t('catalogSync.kpiErrorProduct'), v: errorProducts, c: "#ef4444" },
                ].map(({ l, v, c }, i) => (
                    <div key={i} style={{ padding: "16px 18px", borderRadius: 14, background: "#ffffff", border: "1px solid #e5e7eb", textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{l}</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: c }}>{v}</div>
                        <ProgressBar pct={totalProducts > 0 ? (v / totalProducts) * 100 : 0} color={c} />
                    </div>
                ))}
            </div>
            <div style={{ display: "flex", gap: 4, padding: "5px", background: "#f1f5f9", borderRadius: 14, flexWrap: "wrap", marginBottom: 2 }}>
                {TABS.map(tb => (
                    <button key={tb.id} onClick={() => setTab(tb.id)} style={{ padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 11, background: tab === tb.id ? "#2563eb" : "#ffffff", color: tab === tb.id ? "#ffffff" : "#374151", transition: "all 150ms" }}>{tb.label}</button>
                ))}
            </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px" }}>
            {tab === "catalog" && <CatalogTab />}
            {tab === "sync" && <SyncRunTab onJobCreated={addJob} />}
            {tab === "catmap" && <CategoryMappingTab />}
            {tab === "price" && <PriceSyncTab />}
            {tab === "inventory" && <InventorySyncTab />}
            {tab === "history" && <JobHistoryTab jobs={jobs} />}
            {tab === "guide" && <UsageGuideTab />}
      </div>
    </div>
    );
}
