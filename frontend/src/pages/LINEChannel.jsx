import React, { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import PlanGate from "../components/PlanGate.jsx";
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import { getJsonAuth } from '../services/apiClient.js'; // 191차: 세션 토큰 인증(LINE 백엔드 신설 — requirePro)
import { useI18n } from '../i18n';
import { IS_DEMO } from '../utils/demoEnv';

/* ─── 180차: 데모 가상데이터 (빈 데이터 0 — roidemo.* 에서 LINE 채널 전 탭 시드) ─── */
const DEMO_LINE_STATS = { ok: true, total_followers: 12483, monthly_sent: 38500, avg_open_rate: 72.4, avg_click_rate: 18.9 };
const DEMO_LINE_CAMPAIGNS = [
  { id: "ln_d1", name: "新春セール告知", type: "marketing", template_name: "セール告知v2", status: "active", sent: 9820, opened: 7110, clicked: 1340 },
  { id: "ln_d2", name: "配送完了通知", type: "transactional", template_name: "配送ステータス", status: "active", sent: 15240, opened: 13980, clicked: 2210 },
  { id: "ln_d3", name: "リピート顧客クーポン", type: "marketing", template_name: "クーポン配布", status: "paused", sent: 5400, opened: 3720, clicked: 980 },
];
const DEMO_LINE_TEMPLATES = [
  { id: "tpl_d1", name: "セール告知v2", type: "marketing", status: "approved", usage: 24 },
  { id: "tpl_d2", name: "配送ステータス", type: "transactional", status: "approved", usage: 156 },
  { id: "tpl_d3", name: "クーポン配布", type: "marketing", status: "approved", usage: 18 },
];
const DEMO_LINE_SETTINGS = { ok: true, channel_id: "@geniego_demo", connected: true, webhook: "https://roidemo.genie-go.com/api/line/webhook", plan: "Messaging API" };

const C = {
    bg: "var(--bg)", surface: "var(--surface)", card: "var(--bg-card, rgba(255,255,255,0.95))",
    border: "var(--border)", accent: "#06c755",  // LINE Green
    green: "#22c55e", red: "#f87171", yellow: "#fbbf24",
    purple: "#a78bfa", muted: "var(--text-3)", text: "var(--text-1)",
    line: "#06c755", lineLight: "rgba(6,199,85,0.15)",
};

/* ─── Statistics Card */
function StatCard({ icon, label, value, color, sub }) {
    return (
        <div style={{ background: C.card, borderRadius: 14, padding: "18px 20px", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: color || C.text }}>{value}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{label}</div>
            {sub && <div style={{ fontSize: 10, color: color || C.accent, marginTop: 4, fontWeight: 600 }}>{sub}</div>}
        </div>
    );
}

/* ─── Campaign Tab */
function CampaignsTab({ campaigns, isDemo = false }) {
    const { t } = useI18n();
    const { kakaoCampaignsLinked } = useGlobalData();
    // 180차: 데모/운영 공통 — 공유 상태에서 line 타입 캠페인 라이브 파생(CRM·대시보드와 동기화)
    const linkedLine = kakaoCampaignsLinked.filter(c => c.type === "line");

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* CRM Integration Campaign (Paid) */}
            {linkedLine.length > 0 && (
                <div style={{ background: C.lineLight, border: `1px solid ${C.line}40`, borderRadius: 12, padding: "14px 18px", marginBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.line, marginBottom: 8 }}>🔗 CRM 세그먼트 Integration ({linkedLine.length}개)</div>
                    {linkedLine.map(c => (
                        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                            <span style={{ fontSize: 12 }}>{(t("Data." + c.name) !== "Data." + c.name ? t("Data." + c.name) : c.name)}</span>
                            <span style={{ fontSize: 11, color: C.muted }}>→ {c.targetSegmentName}</span>
                        </div>
                    ))}
                </div>
            )}
            {campaigns.map(c => (
                <div key={c.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{(t("Data." + c.name) !== "Data." + c.name ? t("Data." + c.name) : c.name)}</div>
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                                <span style={{ background: c.type === "transactional" ? "rgba(79,142,247,0.15)" : C.lineLight, color: c.type === "transactional" ? "#4f8ef7" : C.line, padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>
                                    {c.type === "transactional" ? "🔔 トランザクション" : "📣 マーケティング"}
                                </span>
                                <span style={{ marginLeft: 8 }}>{c.template_name}</span>
                            </div>
                        </div>
                        <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, fontWeight: 700, background: c.status === "active" ? "rgba(34,197,94,0.15)" : "rgba(234,179,8,0.15)", color: c.status === "active" ? "#22c55e" : "#eab308" }}>
                            {c.status === "active" ? "✅ 配信中" : "⏰ 予約済み"}
                        </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                        {[["配信数", c.sent.toLocaleString()], ["開封率", `${c.open_rate}%`], ["クリック率", `${c.click_rate}%`]].map(([l, v]) => (
                            <div key={l} style={{ background: 'var(--surface)', borderRadius: 8, padding: "10px 12px" }}>
                                <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{l}</div>
                                <div style={{ fontWeight: 800, fontSize: 15 }}>{v}</div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ─── 템플릿 Tab */
function TemplatesTab({ templates }) {
    const [selected, setSelected] = useState(null);
    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {templates.map(t => (
                    <div key={t.id} onClick={() => setSelected(t)} style={{ background: selected?.id === t.id ? C.lineLight : C.card, border: `1px solid ${selected?.id === t.id ? C.line : C.border}`, borderRadius: 12, padding: "14px 18px", cursor: "pointer", transition: "all 0.2s" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
                                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{t.category}</div>
                            </div>
                            <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, fontWeight: 700, background: t.status === "approved" ? "rgba(34,197,94,0.15)" : "rgba(234,179,8,0.15)", color: t.status === "approved" ? "#22c55e" : "#eab308" }}>
                                {t.status === "approved" ? "承認済み" : "審査中"}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            {/* Template Preview */}
            <div style={{ background: C.card, borderRadius: 14, padding: 20, border: `1px solid ${C.border}` }}>
                {selected ? (
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: 12, color: C.line }}>📱 プレビュー: {selected.name}</div>
                        <div style={{ background: "#00b900", borderRadius: 16, padding: "14px 18px", maxWidth: 280 }}>
                            <div style={{ fontSize: 11, color: '#fff', marginBottom: 8, fontWeight: 600 }}>LINE公式アカウント</div>
                            <div style={{ background: "#fff", borderRadius: 10, padding: "12px 14px" }}>
                                <div style={{ fontSize: 12, color: "#333", lineHeight: 1.7, whiteSpace: "pre-line" }}>{selected.preview}</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ color: C.muted, textAlign: "center", padding: 40 }}>テンプレートを選択してください</div>
                )}
            </div>
        </div>
    );
}

/* ─── Settings Tab */
function SettingsTab({ settings }) {
    const fields = [
        ["Channel ID", settings.channel_id],
        ["LINE ID", settings.line_id],
        ["フォロワー数", `${settings.followers?.toLocaleString()}人`],
        ["接続状態", settings.status === "connected" ? "✅ 接続済み" : "❌ 未接続"],
        ["Channel Secret", settings.channel_secret?.replace(/./g, "•")],
    ];
    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ background: C.card, borderRadius: 14, padding: 20, border: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16, color: C.line }}>🔧 LINE チャンネル設定</div>
                {fields.map(([l, v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                        <span style={{ fontSize: 13, color: C.muted }}>{l}</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
                    </div>
                ))}
            </div>
            <div style={{ background: C.card, borderRadius: 14, padding: 20, border: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 16 }}>📊 月次パフォーマンス</div>
                {/* 206차: 하드코딩 통계 IS_DEMO 게이트 — 운영(미연동)은 '—', 데모만 시드값 노출(목데이터 운영유입 차단) */}
                {[["月間配信数", settings.monthly_sent?.toLocaleString() || (IS_DEMO ? "37,376" : "—")], ["平均開封率", IS_DEMO ? "91.2%" : "—"], ["平均クリック率", IS_DEMO ? "37.8%" : "—"]].map(([l, v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                        <span style={{ fontSize: 13, color: C.muted }}>{l}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.line }}>{v}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─── LINE Channel 내용 */
function LINEChannelContent() {
    const { token } = useAuth();
    const { t } = useI18n();
    const isDemo = IS_DEMO; /* 180차: demoEnv 정본 — 데모 가상데이터 활성(빈 데이터 0) */
    const { kakaoCampaignsLinked, createKakaoCampaignFromSegment, crmSegments } = useGlobalData();

    const [tab, setTab] = useState("campaigns");
    const TABS = [
        { id: "campaigns", label: "📊 キャンペーン" },
        { id: "templates", label: "📝 テンプレート" },
        { id: "settings", label: "⚙️ 設定" },
    ];

    const [campaigns, setCampaigns] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [settings, setSettings] = useState({});
    const [stats, setStats] = useState(null);

    useEffect(() => {
        if (isDemo) {
            // 데모: 가상데이터 시드 (운영 API 미호출 — 격리)
            setCampaigns(DEMO_LINE_CAMPAIGNS);
            setTemplates(DEMO_LINE_TEMPLATES);
            setSettings(DEMO_LINE_SETTINGS);
            setStats(DEMO_LINE_STATS);
            return;
        }
        // 191차: 세션 인증(/api/line requirePro). getJson(무인증)→getJsonAuth.
        getJsonAuth('/api/line/campaigns').then(r => r.campaigns && setCampaigns(r.campaigns)).catch(() => { });
        getJsonAuth('/api/line/templates').then(r => r.templates && setTemplates(r.templates)).catch(() => { });
        getJsonAuth('/api/line/settings').then(r => r.ok && setSettings(r)).catch(() => { });
        getJsonAuth('/api/line/stats').then(r => r.ok && setStats(r)).catch(() => { });
    }, [isDemo, token]);

    return (
        <div style={{ background: C.bg, minHeight: "100%", color: C.text }}>
            

            {/* Header */}
            <div style={{ borderRadius: 16, background: `linear-gradient(135deg, #004225, #00b900)`, border: `1px solid ${C.line}40`, padding: "22px 28px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <div style={{ fontSize: 22, fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 32 }}>💚</span> LINE チャンネル
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>メッセージ配信 · テンプレート管理 · 日本市場対応</div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: "10px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.line }}>{stats?.total_followers?.toLocaleString() || (IS_DEMO ? "12,483" : "—")}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)' }}>フォロワー数</div>
                </div>
            </div>

            {/* Statistics Card */}
            {stats && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
                    <StatCard icon="👥" label="フォロワー" value={stats.total_followers?.toLocaleString()} color={C.line} />
                    <StatCard icon="📤" label="月間配信数" value={stats.monthly_sent?.toLocaleString()} color="#4f8ef7" />
                    <StatCard icon="👁" label="平均開封率" value={`${stats.avg_open_rate}%`} color="#22c55e" sub="業界平均67.8%比" />
                    <StatCard icon="🖱" label="平均クリック率" value={`${stats.avg_click_rate}%`} color="#f59e0b" />
                </div>
            )}

            {/* CRM 세그먼트 Integration Button (도 사용 가능) */}
            <div style={{ background: C.card, borderRadius: 12, padding: "14px 18px", marginBottom: 16, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: C.muted }}>🔗 CRM セグメント連携</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {crmSegments.map(s => (
                        <button key={s.id} onClick={() => createKakaoCampaignFromSegment(s.id, `[LINE] ${(t("Data." + s.name) !== "Data." + s.name ? t("Data." + s.name) : s.name)}キャンペーン`)}
                            style={{ fontSize: 11, padding: "5px 12px", borderRadius: 8, border: `1px solid ${C.line}40`, background: C.lineLight, color: C.line, cursor: "pointer", fontWeight: 700 }}>
                            💚 {(t("Data." + s.name) !== "Data." + s.name ? t("Data." + s.name) : s.name)} ({s.count}名)
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab 네비게이션 */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "9px 18px", borderRadius: 10, border: "none", cursor: "pointer", background: tab === t.id ? C.line : C.card, color: tab === t.id ? "#000" : C.muted, fontWeight: 700, fontSize: 13, transition: "all 0.2s" }}>{t.label}</button>
                ))}
            </div>

            {tab === "campaigns" && <CampaignsTab campaigns={campaigns} isDemo={isDemo} />}
            {tab === "templates" && <TemplatesTab templates={templates} />}
            {tab === "settings" && <SettingsTab settings={settings} />}
        </div>
    );
}

/* ─── 메인 */
export default function LINEChannel() {
    return (
        <PlanGate feature="line_channel">
            <LINEChannelContent />
        </PlanGate>
    );
}

/* Mocked defaults for removed DataLayer */
const _LINE_CAMPAIGNS = [];
const _LINE_TEMPLATES = [];
const _LINE_STATS = {};
const _LINE_SETTINGS = {};