import urllib.request
import re

path = 'D:/project/GeniegoROI/frontend/src/pages/DataProduct.jsx'

with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>')

clean_tail = """                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
                        {[
                            { v: `${SCHEMA.length}`, l: t("dataProduct.badgeFields") },
                            { v: `${PLATFORM_MAPPING.length}`, l: t("dataProduct.badgePlatforms") },
                            { v: `${METRICS.length}`, l: t("dataProduct.badgeMetrics") },
                            { v: `${RULES.length}`, l: t("dataProduct.badgeRules") },
                        ].map(k => (
                            <div key={k.l} style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(79,142,247,0.07)", border: "1px solid rgba(79,142,247,0.15)" }}>
                                <span style={{ fontWeight: 900, fontSize: 14, color: "#4f8ef7" }}>{k.v}</span>
                                <span style={{ fontSize: 9, color: "var(--text-3)", marginLeft: 5 }}>{k.l}</span>
                            </div>
                        ))}
                        {connectedChannels.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "#a855f718", color: "#a855f7", border: "1px solid #a855f733" }}>🔗 {connectedChannels.length} {t("dataProduct.channelsLinked")}</span>}
                        <button onClick={handleExport} style={{ marginLeft: "auto", fontSize: 10, padding: "5px 14px", borderRadius: 8, border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.08)", color: "#22c55e", cursor: "pointer", fontWeight: 700 }}>📥 {t("dataProduct.export")}</button>
                    </div>
                </div>

                {/* Tab bar */}
                <div style={{ display: "flex", gap: 2, background: "var(--surface)", padding: "4px 4px 0", borderRadius: "12px 12px 0 0", border: "1px solid rgba(99,140,255,0.06)", borderBottom: "none" }}>
                    {TABS.map(tb => (
                        <button key={tb.id} onClick={() => setTab(tb.id)} style={{
                            flex: 1, padding: "10px 6px", border: "none", cursor: "pointer", textAlign: "center", borderRadius: "8px 8px 0 0",
                            background: tab === tb.id ? "rgba(79,142,247,0.08)" : "transparent",
                            borderBottom: `2px solid ${tab === tb.id ? "#4f8ef7" : "transparent"}`, transition: "all 200ms",
                        }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: tab === tb.id ? "var(--text-1)" : "var(--text-2)" }}>{tb.icon} {tb.label}</div>
                            <div style={{ fontSize: 8, color: "var(--text-3)", marginTop: 2 }}>{tb.desc}</div>
                        </button>
                    ))}
                </div>
            </div>
"""

idx_end = text.find('            {/* ─── Scrollable Content ─── */}')

if idx != -1 and idx_end != -1:
    new_text = text[:idx] + clean_tail + text[idx_end:]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_text)
    print("DataProduct headers fixed")
else:
    print('idx not found')
