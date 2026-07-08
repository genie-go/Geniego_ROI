import React, { useState, useEffect, useCallback } from "react";
import { getJson } from "../services/apiClient.js";
import { IS_DEMO } from "../utils/demoEnv";
import { useI18n } from "../i18n/index.js";

// 196차 — 관리자 환경 콘솔에서 플랫폼 AI(Claude)·SMTP 키 등록(등록 즉시 전체 이용자 적용)
const ADMIN_TOKEN = () => localStorage.getItem(IS_DEMO ? "demo_genie_token" : "genie_token") || localStorage.getItem("genie_token") || localStorage.getItem("demo_genie_token") || "";

/**
 * AdminEnvironment — 플랫폼 환경 관리자 콘솔.
 *
 * 169차 N-152-F P0: 168차 stub redirect (`<Navigate to="/dashboard" />`) 대체.
 * 사용자 발견 issue: 사이드바 "시스템 관리 > 플랫폼 환경" 클릭 시 /admin → /dashboard 무한 redirect.
 *
 * 본 구현 범위:
 *  - 8 KPI (총 사용자, 활성 tenant, API key, 활성 세션, DB 사이즈, 가동시간, 평균 응답, 오류율)
 *  - 4 tab (개요 / 운영 정책 / 보안 정책 / 백업 / 복구)
 *  - 실제 데이터 fetch 는 /v424/health (구축) + 보조 endpoint placeholder. 미응답 시 정적 fallback.
 *
 * 한국어 고정 (DbAdmin.jsx 패턴 정합).
 */
function Admin() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(0);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  const fetchHealth = useCallback(async () => {
    try {
      const data = await getJson("/v424/health");
      setHealth(data);
      setError(null);
    } catch (e) {
      setError(String(e?.message || e));
    }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  const tabs = ["개요", t('admin.tabs.aiEngine','🤖 AI 엔진'), t('admin.tabs.opsPolicy','운영 정책'), t('admin.tabs.securityPolicy','보안 정책'), t('admin.tabs.backupRestore','백업 / 복구'), t('admin.tabs.channelOauth','🔗 채널 OAuth')];

  const kpis = [
    { emoji: "👥", label: t('admin.kpi.totalUsers','총 사용자'), val: health?.users?.total ?? "—" },
    { emoji: "🏢", label: t('admin.kpi.activeTenant','활성 Tenant'), val: health?.tenants?.active ?? "—" },
    { emoji: "🔑", label: "API Key", val: health?.api_keys?.total ?? "—" },
    { emoji: "🟢", label: t('admin.kpi.activeSessions','활성 세션'), val: health?.sessions?.active ?? "—" },
    { emoji: "💾", label: t('admin.kpi.dbSize','DB 사이즈'), val: health?.db?.size_mb ? `${health.db.size_mb} MB` : "—" },
    { emoji: "⏱️", label: t('admin.kpi.uptime','가동 시간'), val: health?.uptime ?? "—" },
    { emoji: "⚡", label: t('admin.kpi.avgResponse','평균 응답'), val: health?.perf?.avg_ms ? `${health.perf.avg_ms} ms` : "—" },
    { emoji: "🟥", label: t('admin.kpi.errorRate','오류율 (1h)'), val: health?.errors?.rate_1h ?? "—" },
  ];

  const cardStyle = {
    borderRadius: 14,
    padding: "18px 20px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
  };

  return (
    <div style={{ padding: 24, minHeight: "100%", color: "var(--text-1)" }}>
      <div style={{
        borderRadius: 18,
        padding: "28px 32px",
        marginBottom: 22,
        background: "linear-gradient(135deg, rgba(99,102,241,0.10), rgba(79,142,247,0.06))",
        border: "1px solid rgba(99,102,241,0.18)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 32 }}>⚙</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{t('admin.header.title','플랫폼 환경 관리')}</div>
            <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
              {t('admin.header.subtitle','시스템 관리 · 전역 정책 · 운영 모니터링 콘솔')}
            </div>
            <div style={{
              fontSize: 10,
              color: "#a78bfa",
              fontWeight: 700,
              marginTop: 4,
              padding: "2px 8px",
              borderRadius: 4,
              background: "rgba(167,139,250,0.10)",
              display: "inline-block",
            }}>{t('admin.header.badge','⚠ 관리자 전용 — 변경 사항은 모든 Tenant 에 영향')}</div>
          </div>
        </div>
      </div>

      {/* 207차: 관리자 환경 전환 — 운영/데모는 별도 시스템(별도 DB)이라, 접속 도메인의 데이터만 보인다.
          관리자가 운영·데모 콘솔을 명확히 인지·전환하도록 스위처 제공. */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        borderRadius: 14, padding: "14px 18px", marginBottom: 22,
        background: IS_DEMO ? "rgba(251,146,60,0.08)" : "rgba(34,197,94,0.07)",
        border: `1px solid ${IS_DEMO ? "rgba(251,146,60,0.35)" : "rgba(34,197,94,0.3)"}`,
      }}>
        <span style={{ fontSize: 22 }}>{IS_DEMO ? "🎪" : "🏢"}</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: IS_DEMO ? "#fb923c" : "#22c55e" }}>
            {t('admin.envSwitch.currentLabel','현재 관리 환경:')} {IS_DEMO ? t('admin.envSwitch.demoLabel','🎪 데모 환경 (체험용 · 샌드박스)') : "🏢 운영 시스템 (실데이터)"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
            {IS_DEMO
              ? t('admin.envSwitch.demoDesc','지금은 데모(체험) 데이터를 관리 중입니다. 실제 고객·매출을 관리하려면 운영 시스템으로 전환하세요.')
              : "실제 운영 데이터를 관리 중입니다. 체험/시연 데이터는 데모 환경에서 관리합니다."}
          </div>
        </div>
        <a href="https://www.genieroi.com/admin" style={{
          padding: "9px 16px", borderRadius: 9, fontSize: 12, fontWeight: 800, textDecoration: "none",
          background: !IS_DEMO ? "#22c55e" : "rgba(34,197,94,0.12)",
          color: !IS_DEMO ? "#fff" : "#22c55e",
          border: `1px solid ${!IS_DEMO ? "#22c55e" : "rgba(34,197,94,0.4)"}`,
          cursor: "pointer", whiteSpace: "nowrap",
        }}>{t('admin.envSwitch.prodBtn','🏢 운영 시스템')} {!IS_DEMO ? t('admin.envSwitch.current','(현재)') : "보기"}</a>
        <a href="https://demo.genieroi.com/admin" style={{
          padding: "9px 16px", borderRadius: 9, fontSize: 12, fontWeight: 800, textDecoration: "none",
          background: IS_DEMO ? "#fb923c" : "rgba(251,146,60,0.12)",
          color: IS_DEMO ? "#fff" : "#fb923c",
          border: `1px solid ${IS_DEMO ? "#fb923c" : "rgba(251,146,60,0.4)"}`,
          cursor: "pointer", whiteSpace: "nowrap",
        }}>{t('admin.envSwitch.demoBtn','🎪 데모 환경')} {IS_DEMO ? t('admin.envSwitch.current','(현재)') : "보기"}</a>
      </div>

      {error && (
        <div style={{
          marginBottom: 18,
          padding: "12px 16px",
          borderRadius: 10,
          background: "rgba(248,113,113,0.06)",
          border: "1px solid rgba(248,113,113,0.20)",
          color: "#f87171",
          fontSize: 12,
        }}>
          ⚠ /v424/health 조회 실패 — {error}. 정적 fallback 표시 중.
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 14,
        marginBottom: 22,
      }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ ...cardStyle, padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 26, flex: "0 0 auto" }}>{k.emoji}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.15 }}>{k.val}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, marginTop: 2 }}>
                {k.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        display: "flex",
        gap: 4,
        marginBottom: 20,
        padding: 4,
        borderRadius: 12,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{
            flex: 1,
            padding: "10px 16px",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 12,
            background: activeTab === i ? "linear-gradient(135deg,#6366f1,#4f8ef7)" : "transparent",
            color: activeTab === i ? "#fff" : "var(--text-2)",
          }}>{tab}</button>
        ))}
      </div>

      <div style={{
        borderRadius: 16,
        padding: "28px 32px",
        minHeight: 320,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}>
        {activeTab === 0 && <TabOverview health={health} />}
        {activeTab === 1 && <TabAiEngine />}
        {activeTab === 2 && <TabOperationsPolicy />}
        {activeTab === 3 && <TabSecurityPolicy />}
        {activeTab === 4 && <TabBackupRestore />}
        {activeTab === 5 && <TabChannelOauth />}
      </div>
    </div>
  );
}

function SectionCard({ title, items }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>{title}</div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 10,
      }}>
        {items.map((it, i) => (
          <div key={i} style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderRadius: 10,
            background: "rgba(99,102,241,0.04)",
            border: "1px solid rgba(99,102,241,0.10)",
          }}>
            <span style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg,#6366f1,#4f8ef7)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 800,
            }}>✓</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{it}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabAiEngine() {
  const { t } = useI18n();
  const [aiKey, setAiKey] = useState("");
  const [aiKeySet, setAiKeySet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { t:'ok'|'err', m }
  // 실사 이미지 생성 API
  const [imgKey, setImgKey] = useState("");
  const [imgKeySet, setImgKeySet] = useState(false);
  const [imgProvider, setImgProvider] = useState("openai");
  const [imgBusy, setImgBusy] = useState(false);
  // AI 동영상 생성 API
  const [vidKey, setVidKey] = useState("");
  const [vidKeySet, setVidKeySet] = useState(false);
  const [vidModel, setVidModel] = useState("");
  const [vidBusy, setVidBusy] = useState(false);
  // SMTP
  const [smtp, setSmtp] = useState({ host: "", port: "587", user: "", pass: "", from: "", from_name: "Geniego-ROI", secure: "tls" });
  const [smtpSet, setSmtpSet] = useState(false);
  const [smtpBusy, setSmtpBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/auth/admin/ai-key", { headers: { Authorization: `Bearer ${ADMIN_TOKEN()}` } });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.ok) setAiKeySet(!!d.key_set || !!d.configured);
      } catch {}
      try {
        const r = await fetch("/api/auth/admin/smtp", { headers: { Authorization: `Bearer ${ADMIN_TOKEN()}` } });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.ok) { setSmtpSet(!!d.configured); if (d.smtp) setSmtp(s => ({ ...s, ...d.smtp, port: String(d.smtp.port ?? s.port), pass: "" })); }
      } catch {}
      try {
        const r = await fetch("/api/auth/admin/img-key", { headers: { Authorization: `Bearer ${ADMIN_TOKEN()}` } });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.ok) { setImgKeySet(!!d.key_set || !!d.configured); if (d.provider) setImgProvider(d.provider); }
      } catch {}
      try {
        const r = await fetch("/api/auth/admin/video-key", { headers: { Authorization: `Bearer ${ADMIN_TOKEN()}` } });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.ok) { setVidKeySet(!!d.key_set || !!d.configured); if (d.model) setVidModel(d.model); }
      } catch {}
    })();
  }, []);

  const saveVidKey = async () => {
    if (!vidKey.trim()) { setMsg({ t: "err", m: "동영상 생성 API 키를 입력하세요." }); return; }
    setVidBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/auth/admin/video-key", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${ADMIN_TOKEN()}` }, body: JSON.stringify({ api_key: vidKey.trim(), provider: "replicate", model: vidModel.trim() }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setMsg({ t: "ok", m: d.message || "동영상 생성 API가 저장되었습니다." }); setVidKey(""); setVidKeySet(true); }
      else setMsg({ t: "err", m: d.error || "저장에 실패했습니다." });
    } catch { setMsg({ t: "err", m: "서버 오류. 다시 시도하세요." }); }
    setVidBusy(false);
  };

  const saveImgKey = async () => {
    if (!imgKey.trim()) { setMsg({ t: "err", m: "이미지 생성 API 키를 입력하세요." }); return; }
    setImgBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/auth/admin/img-key", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${ADMIN_TOKEN()}` }, body: JSON.stringify({ api_key: imgKey.trim(), provider: imgProvider }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setMsg({ t: "ok", m: d.message || "이미지 생성 API가 저장되었습니다." }); setImgKey(""); setImgKeySet(true); }
      else setMsg({ t: "err", m: d.error || "저장에 실패했습니다." });
    } catch { setMsg({ t: "err", m: "서버 오류. 다시 시도하세요." }); }
    setImgBusy(false);
  };

  const saveAiKey = async () => {
    if (!aiKey.trim()) { setMsg({ t: "err", m: "Anthropic API 키(sk-ant-...)를 입력하세요." }); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/auth/admin/ai-key", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${ADMIN_TOKEN()}` }, body: JSON.stringify({ api_key: aiKey.trim() }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setMsg({ t: "ok", m: d.message || "AI API 키가 저장되었습니다. 전체 이용자에게 실시간 AI가 적용됩니다." }); setAiKey(""); setAiKeySet(true); }
      else setMsg({ t: "err", m: d.error || "저장에 실패했습니다." });
    } catch { setMsg({ t: "err", m: "서버 오류. 다시 시도하세요." }); }
    setBusy(false);
  };

  const saveSmtp = async () => {
    if (!smtp.host.trim() || !smtp.from.trim()) { setMsg({ t: "err", m: "SMTP 호스트와 발신 이메일은 필수입니다." }); return; }
    setSmtpBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/auth/admin/smtp", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${ADMIN_TOKEN()}` }, body: JSON.stringify(smtp) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setMsg({ t: "ok", m: d.message || "SMTP 설정이 저장되었습니다." }); setSmtpSet(true); }
      else setMsg({ t: "err", m: d.error || "SMTP 저장 실패." });
    } catch { setMsg({ t: "err", m: "서버 오류." }); }
    setSmtpBusy(false);
  };

  const inp = { width: "100%", boxSizing: "border-box", padding: "11px 13px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "var(--text-1)", fontSize: 13, outline: "none" };
  const lbl = { fontSize: 12, fontWeight: 700, color: "var(--text-2)", display: "block", marginBottom: 6, marginTop: 12 };

  return (
    <>
      {msg && (
        <div style={{ marginBottom: 18, padding: "11px 15px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: msg.t === "ok" ? "rgba(34,197,94,0.1)" : "rgba(248,113,113,0.08)",
          border: `1px solid ${msg.t === "ok" ? "rgba(34,197,94,0.25)" : "rgba(248,113,113,0.25)"}`,
          color: msg.t === "ok" ? "#4ade80" : "#f87171" }}>{msg.m}</div>
      )}

      {/* AI 엔진(Claude) 키 — 핵심 */}
      <div style={{ borderRadius: 16, padding: "24px 26px", marginBottom: 20,
        background: aiKeySet ? "rgba(34,197,94,0.06)" : "linear-gradient(135deg, rgba(168,85,247,0.12), rgba(79,142,247,0.08))",
        border: `1.5px solid ${aiKeySet ? "rgba(34,197,94,0.3)" : "rgba(168,85,247,0.3)"}` }}>
        <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 6 }}>🤖 AI 엔진(Claude) API 키</div>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-2)", marginBottom: 16 }}>
          {aiKeySet
            ? "✅ AI 엔진이 활성화되어 있습니다. 전체 이용자가 실시간 AI 광고 디자인·분석을 사용합니다."
            : "⚠️ AI 키 미설정 — 현재는 내장 템플릿으로 동작합니다. Anthropic API 키를 등록하면 전체 이용자에게 실시간 AI 디자인 생성이 활성화됩니다."}
          <br /><span style={{ fontSize: 11, color: "var(--text-3)" }}>※ 플랫폼 전역 설정 — 여기 한 번 등록하면 모든 Tenant·이용자에 적용됩니다. (console.anthropic.com → API Keys 에서 발급)</span>
        </div>
        <label style={{ ...lbl, marginTop: 0 }}>Anthropic API 키</label>
        <input type="password" value={aiKey} onChange={e => setAiKey(e.target.value)} autoComplete="new-password"
          placeholder={aiKeySet ? "sk-ant-... (변경 시에만 입력)" : "sk-ant-api03-..."} style={inp} />
        <button onClick={saveAiKey} disabled={busy || !aiKey.trim()}
          style={{ width: "100%", marginTop: 14, padding: "13px 0", borderRadius: 12, border: "none",
            cursor: busy || !aiKey.trim() ? "not-allowed" : "pointer",
            background: busy || !aiKey.trim() ? "rgba(168,85,247,0.2)" : "linear-gradient(135deg,#a855f7,#4f8ef7)",
            color: "#fff", fontSize: 14.5, fontWeight: 800 }}>
          {busy ? "저장 중..." : "🤖 AI 키 저장 (전체 적용)"}
        </button>
      </div>

      {/* 실사 이미지 생성 API (DALL·E / Stability) */}
      <div style={{ borderRadius: 16, padding: "24px 26px", marginBottom: 20,
        background: imgKeySet ? "rgba(34,197,94,0.06)" : "linear-gradient(135deg, rgba(236,72,153,0.10), rgba(168,85,247,0.07))",
        border: `1.5px solid ${imgKeySet ? "rgba(34,197,94,0.3)" : "rgba(236,72,153,0.3)"}` }}>
        <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 6 }}>🖼️ 실사 이미지 생성 API</div>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-2)", marginBottom: 16 }}>
          {imgKeySet
            ? "✅ 실사 이미지 생성이 활성화되어 있습니다. 대화형 AI 디자인이 실사 비주얼을 생성해 매거진급 광고를 만듭니다."
            : "⚠️ 미설정 — 현재는 벡터(SVG) 프리미엄 디자인으로 동작합니다. 이미지 생성 API 키를 등록하면 실사 비주얼이 활성화됩니다."}
          <br /><span style={{ fontSize: 11, color: "var(--text-3)" }}>※ OpenAI(DALL·E 3) = platform.openai.com / Stability(SD) = platform.stability.ai 에서 발급. 플랫폼 전역 적용.</span>
        </div>
        <label style={{ ...lbl, marginTop: 0 }}>이미지 생성 제공자</label>
        <select value={imgProvider} onChange={e => setImgProvider(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
          <option value="openai">OpenAI — DALL·E 3 (권장)</option>
          <option value="stability">Stability AI — Stable Diffusion</option>
        </select>
        <label style={lbl}>{t('admin.aiEngine.imgApiKeyLabel','API 키')}</label>
        <input type="password" value={imgKey} onChange={e => setImgKey(e.target.value)} autoComplete="new-password"
          placeholder={imgKeySet ? "(변경 시에만 입력)" : (imgProvider === "openai" ? "sk-..." : "sk-...")} style={inp} />
        <button onClick={saveImgKey} disabled={imgBusy || !imgKey.trim()}
          style={{ width: "100%", marginTop: 14, padding: "13px 0", borderRadius: 12, border: "none",
            cursor: imgBusy || !imgKey.trim() ? "not-allowed" : "pointer",
            background: imgBusy || !imgKey.trim() ? "rgba(236,72,153,0.2)" : "linear-gradient(135deg,#ec4899,#a855f7)",
            color: "#fff", fontSize: 14.5, fontWeight: 800 }}>
          {imgBusy ? "저장 중..." : "🖼️ 이미지 생성 API 저장 (전체 적용)"}
        </button>
      </div>

      {/* AI 동영상 생성 API (Replicate 등) */}
      <div style={{ borderRadius: 16, padding: "24px 26px", marginBottom: 20,
        background: vidKeySet ? "rgba(34,197,94,0.06)" : "linear-gradient(135deg, rgba(6,182,212,0.10), rgba(79,142,247,0.07))",
        border: `1.5px solid ${vidKeySet ? "rgba(34,197,94,0.3)" : "rgba(6,182,212,0.3)"}` }}>
        <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 6 }}>🎥 AI 동영상 생성 API</div>
        <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-2)", marginBottom: 16 }}>
          {vidKeySet
            ? "✅ AI 동영상 생성이 활성화되어 있습니다. 대화형 AI 디자인의 '🎥 동영상' 모드로 광고 영상을 생성합니다."
            : "⚠️ 미설정 — '🎥 동영상' 모드 사용 시 키 등록 안내가 표시됩니다. 동영상 생성 API 키를 등록하면 활성화됩니다."}
          <br /><span style={{ fontSize: 11, color: "var(--text-3)" }}>※ Replicate(replicate.com) API 토큰. 영상 생성은 1~3분 소요. 플랫폼 전역 적용.</span>
        </div>
        <label style={{ ...lbl, marginTop: 0 }}>Replicate API 토큰</label>
        <input type="password" value={vidKey} onChange={e => setVidKey(e.target.value)} autoComplete="new-password"
          placeholder={vidKeySet ? "(변경 시에만 입력)" : "r8_..."} style={inp} />
        <label style={lbl}>영상 모델 (선택 — 미입력 시 기본 모델)</label>
        <input value={vidModel} onChange={e => setVidModel(e.target.value)} placeholder="예: minimax/video-01" style={inp} />
        <button onClick={saveVidKey} disabled={vidBusy || !vidKey.trim()}
          style={{ width: "100%", marginTop: 14, padding: "13px 0", borderRadius: 12, border: "none",
            cursor: vidBusy || !vidKey.trim() ? "not-allowed" : "pointer",
            background: vidBusy || !vidKey.trim() ? "rgba(6,182,212,0.2)" : "linear-gradient(135deg,#06b6d4,#4f8ef7)",
            color: "#fff", fontSize: 14.5, fontWeight: 800 }}>
          {vidBusy ? "저장 중..." : "🎥 동영상 생성 API 저장 (전체 적용)"}
        </button>
      </div>

      {/* SMTP — 부가(이메일 발송/2FA) */}
      <div style={{ borderRadius: 16, padding: "22px 26px",
        background: "rgba(255,255,255,0.03)", border: `1px solid ${smtpSet ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)"}` }}>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>📧 이메일 발송(SMTP) 설정</div>
        <div style={{ fontSize: 12, lineHeight: 1.7, color: "var(--text-3)", marginBottom: 12 }}>
          {smtpSet ? "✅ SMTP 설정됨 — 이메일 OTP·비밀번호 재설정 발송에 사용됩니다." : "이메일 2단계 인증·비밀번호 재설정 메일 발송에 사용됩니다. 발신 이메일은 변경 가능합니다."}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
          <div><label style={lbl}>SMTP 호스트 *</label><input value={smtp.host} onChange={e => setSmtp(s => ({ ...s, host: e.target.value }))} placeholder="smtp.example.com" style={inp} /></div>
          <div><label style={lbl}>포트</label><input value={smtp.port} onChange={e => setSmtp(s => ({ ...s, port: e.target.value }))} placeholder="587" style={inp} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={lbl}>계정(사용자)</label><input value={smtp.user} onChange={e => setSmtp(s => ({ ...s, user: e.target.value }))} placeholder="user@example.com" style={inp} autoComplete="off" /></div>
          <div><label style={lbl}>비밀번호</label><input type="password" value={smtp.pass} onChange={e => setSmtp(s => ({ ...s, pass: e.target.value }))} placeholder={smtpSet ? "(변경 시에만 입력)" : "앱 비밀번호"} style={inp} autoComplete="new-password" /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={lbl}>발신 이메일 *</label><input value={smtp.from} onChange={e => setSmtp(s => ({ ...s, from: e.target.value }))} placeholder="geniegoroi@ociell.com" style={inp} /></div>
          <div><label style={lbl}>발신자 이름</label><input value={smtp.from_name} onChange={e => setSmtp(s => ({ ...s, from_name: e.target.value }))} placeholder="Geniego-ROI" style={inp} /></div>
        </div>
        <button onClick={saveSmtp} disabled={smtpBusy}
          style={{ width: "100%", marginTop: 16, padding: "12px 0", borderRadius: 12, border: "none",
            cursor: smtpBusy ? "not-allowed" : "pointer", background: smtpBusy ? "rgba(79,142,247,0.2)" : "linear-gradient(135deg,#4f8ef7,#06b6d4)", color: "#fff", fontSize: 14, fontWeight: 800 }}>
          {smtpBusy ? "저장 중..." : "📧 SMTP 저장"}
        </button>
      </div>
    </>
  );
}

/* [227차] 채널 OAuth 앱 등록 — 런칭 시 관리자 1회 등록 → 전 구독회원 즉시 원클릭 연결.
   회원 플로우(authorize→callback→테넌트별 토큰)는 완비. 여기서 플랫폼 client_id/secret만 등록하면 활성화. */
function TabChannelOauth() {
  const PROVIDERS = [
    { key: 'google',   name: 'Google (Ads · Analytics)',            icon: '🔵', console: 'https://console.cloud.google.com/projectselector2/apis/credentials' }, // [229차] 프로젝트 선택기 강제
    { key: 'meta',     name: 'Meta (Facebook · Instagram 광고)',     icon: '📘', console: 'https://developers.facebook.com/apps' },
    { key: 'facebook', name: 'Facebook · Instagram (페이지/라이브)', icon: '👍', console: 'https://developers.facebook.com/apps' },
    { key: 'tiktok',   name: 'TikTok (광고 · Marketing API)',         icon: '🎶', console: 'https://business-api.tiktok.com/', idLabel: 'App ID', secretLabel: 'App Secret', note: '광고 집행용 TikTok Marketing API 앱의 App ID / Secret을 입력하세요(소비자 Login Kit 키 아님). 비즈니스센터 앱에 광고 관리 권한을 부여해야 합니다.' },
    { key: 'kakao',    name: 'Kakao',                               icon: '💛', console: 'https://developers.kakao.com/console/app' },
    { key: 'naver',    name: 'Naver (검색광고 · 스마트스토어 · 페이)', icon: '🟢', console: 'https://developers.naver.com/apps' },
  ];
  const [cfg, setCfg] = useState({});
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyBusy, setNotifyBusy] = useState(false);

  const load = async () => {
    try {
      const r = await fetch('/api/auth/admin/oauth-apps', { headers: { Authorization: `Bearer ${ADMIN_TOKEN()}` } });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setCfg(d.providers || {}); setNotifyEmail(d.apply_notify_email || ''); }
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const saveNotify = async () => {
    setNotifyBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/auth/admin/apply-notify', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN()}` }, body: JSON.stringify({ email: notifyEmail.trim() }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) setMsg({ t: 'ok', m: d.message || '저장되었습니다.' });
      else setMsg({ t: 'err', m: d.error || '저장 실패' });
    } catch { setMsg({ t: 'err', m: '서버 오류' }); }
    setNotifyBusy(false);
  };

  const fld = (p, k, v) => setForm(s => ({ ...s, [p]: { ...(s[p] || {}), [k]: v } }));
  const save = async (p) => {
    const f = form[p] || {};
    if (!(f.client_id || '').trim() && !(f.client_secret || '').trim()) { setMsg({ t: 'err', m: 'client_id / client_secret을 입력하세요.' }); return; }
    setBusy(p); setMsg(null);
    try {
      const r = await fetch('/api/auth/admin/oauth-apps', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN()}` }, body: JSON.stringify({ provider: p, client_id: (f.client_id || '').trim(), client_secret: (f.client_secret || '').trim() }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) { setMsg({ t: 'ok', m: d.message || '저장되었습니다.' }); setForm(s => ({ ...s, [p]: { client_id: '', client_secret: '' } })); load(); }
      else setMsg({ t: 'err', m: d.error || '저장 실패' });
    } catch { setMsg({ t: 'err', m: '서버 오류' }); }
    setBusy('');
  };
  const clearP = async (p) => {
    if (!window.confirm(`${p} OAuth 앱 설정을 해제할까요? 해당 채널 원클릭 연결이 비활성화됩니다.`)) return;
    setBusy(p);
    try { await fetch('/api/auth/admin/oauth-apps', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_TOKEN()}` }, body: JSON.stringify({ provider: p, clear: true }) }); setMsg({ t: 'ok', m: `${p} 설정을 해제했습니다.` }); load(); } catch {}
    setBusy('');
  };
  const copy = (v) => { try { navigator.clipboard?.writeText(v); setMsg({ t: 'ok', m: 'Redirect URI를 복사했습니다.' }); } catch {} };

  const inp = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-1)', fontSize: 12.5, outline: 'none' };
  const lbl = { fontSize: 11.5, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 5, marginTop: 10 };
  const cfgCount = PROVIDERS.filter(p => cfg[p.key]?.configured).length;

  return (
    <>
      {msg && (
        <div style={{ marginBottom: 16, padding: '11px 15px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: msg.t === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(248,113,113,0.08)',
          border: `1px solid ${msg.t === 'ok' ? 'rgba(34,197,94,0.25)' : 'rgba(248,113,113,0.25)'}`,
          color: msg.t === 'ok' ? '#4ade80' : '#f87171' }}>{msg.m}</div>
      )}
      <div style={{ borderRadius: 14, padding: '18px 20px', marginBottom: 18, background: 'linear-gradient(135deg, rgba(34,197,94,0.10), rgba(79,142,247,0.07))', border: '1px solid rgba(34,197,94,0.25)' }}>
        <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 6 }}>🔗 채널 OAuth 앱 — 플랫폼 전역 등록 ({cfgCount}/{PROVIDERS.length})</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.7, color: 'var(--text-2)' }}>
          각 provider 개발자 콘솔에서 OAuth 앱을 만들고 <b>아래 Redirect URI를 등록</b>한 뒤, 발급된 <b>client_id / client_secret</b>을 여기 한 번만 등록하세요.
          <br/>등록 즉시 <b>모든 구독회원</b>이 연동허브에서 <b>원클릭 연결</b>(자기 계정 인가→자기 테넌트에 토큰 자동 저장)을 사용할 수 있습니다. (회원별 토큰 격리·암호화 저장)
        </div>
      </div>
      {/* 발급신청 알림 수신 이메일 — 콘솔/계약형 채널의 발급 대행 신청 통지처(운영팀) */}
      <div style={{ borderRadius: 14, padding: '16px 18px', marginBottom: 18, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 4 }}>📨 발급신청 알림 수신 이메일</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 10 }}>
          회원이 콘솔 발급이 어려운 채널의 <b>발급 대행을 신청</b>하면, 신청 정보가 이 이메일로 통지됩니다(미설정 시 신청자 확인 메일만 발송).
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="email" value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)} autoComplete="off" placeholder="ops@your-company.com"
            style={{ flex: 1, boxSizing: 'border-box', padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-1)', fontSize: 12.5, outline: 'none' }} />
          <button onClick={saveNotify} disabled={notifyBusy} style={{ padding: '10px 18px', borderRadius: 9, border: 'none', cursor: notifyBusy ? 'not-allowed' : 'pointer', background: notifyBusy ? 'rgba(79,142,247,0.25)' : 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontSize: 12.5, fontWeight: 800 }}>{notifyBusy ? '저장 중...' : '저장'}</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(330px,1fr))', gap: 14 }}>
        {PROVIDERS.map(p => {
          const c = cfg[p.key] || {};
          const on = !!c.configured;
          const f = form[p.key] || {};
          return (
            <div key={p.key} style={{ borderRadius: 14, padding: 16, background: on ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${on ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{p.icon}</span>
                <span style={{ fontWeight: 800, fontSize: 13.5, flex: 1 }}>{p.name}</span>
                <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 9px', borderRadius: 20, background: on ? 'rgba(34,197,94,0.15)' : 'rgba(148,163,184,0.12)', color: on ? '#4ade80' : '#94a3b8' }}>{on ? '✅ 활성' : '미설정'}</span>
              </div>
              {/* Redirect URI 안내 */}
              <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginBottom: 4 }}>① provider 콘솔에 등록할 Redirect URI</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                <code style={{ flex: 1, fontSize: 10.5, padding: '7px 9px', borderRadius: 8, background: 'rgba(0,0,0,0.25)', color: '#a5b4fc', wordBreak: 'break-all', lineHeight: 1.4 }}>{c.redirect_uri || '—'}</code>
                <button onClick={() => copy(c.redirect_uri || '')} title="복사" style={{ flexShrink: 0, padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 12 }}>📋</button>
              </div>
              <a href={p.console} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10.5, color: '#60a5fa', textDecoration: 'none' }}>🔗 {p.key} 개발자 콘솔에서 앱 만들기 →</a>
              {p.note && <div style={{ fontSize: 10, color: '#fbbf24', marginTop: 5, lineHeight: 1.5, padding: '6px 8px', borderRadius: 7, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>ⓘ {p.note}</div>}
              {/* client_id / secret */}
              <label style={lbl}>② {p.idLabel || 'Client ID'} {c.client_id_mask && <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>(현재: {c.client_id_mask})</span>}</label>
              <input value={f.client_id || ''} onChange={e => fld(p.key, 'client_id', e.target.value)} autoComplete="off" placeholder={on ? '변경 시에만 입력' : (p.idLabel || 'client_id')} style={inp} />
              <label style={lbl}>{p.secretLabel || 'Client Secret'} {c.configured && <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>(등록됨)</span>}</label>
              <input type="password" value={f.client_secret || ''} onChange={e => fld(p.key, 'client_secret', e.target.value)} autoComplete="new-password" placeholder={on ? '변경 시에만 입력' : (p.secretLabel || 'client_secret')} style={inp} />
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => save(p.key)} disabled={busy === p.key} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: busy === p.key ? 'not-allowed' : 'pointer', background: busy === p.key ? 'rgba(34,197,94,0.25)' : 'linear-gradient(135deg,#22c55e,#4f8ef7)', color: '#fff', fontSize: 13, fontWeight: 800 }}>{busy === p.key ? '저장 중...' : (on ? '💾 업데이트' : '💾 등록 (전체 적용)')}</button>
                {on && <button onClick={() => clearP(p.key)} disabled={busy === p.key} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(248,113,113,0.3)', cursor: 'pointer', background: 'rgba(248,113,113,0.08)', color: '#f87171', fontSize: 12, fontWeight: 700 }}>해제</button>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function TabOverview({ health }) {
  const { t } = useI18n();
  return (
    <>
      <SectionCard title={t('admin.overview.sysInfoTitle','시스템 정보')} items={[
        `Geniego-ROI v${health?.version || "424"}`,
        `PHP ${health?.php_version || "8.1.34"}`,
        `MySQL ${health?.db?.version || "8.0.37"}`,
        `Nginx + PHP-FPM`,
        t('admin.overview.tenantIsolation','Tenant 격리: X-Tenant-Id'),
        t('admin.overview.authInfo','인증: Bearer + RBAC (viewer / connector / analyst / admin)'),
      ]} />
      <SectionCard title={t('admin.overview.activeTracksTitle','활성 트랙')} items={[
        "N-152-F PM-Core (Task / Milestone / Gantt)",
        t('admin.overview.trackMenuToggle','N-152-F F2/F3 메뉴 가시성 토글'),
        t('admin.overview.trackPaymentPolicy','N-152-F 결제 정책 (USD 단일 / Paddle 카드 전용)'),
        t('admin.overview.trackRealtimeSse','N-PH3 실시간 알림 + SSE'),
        t('admin.overview.trackSecurityAutomation','U-166-D 보안 자동화 폐기 → 수동 PR'),
      ]} />
    </>
  );
}

function TabOperationsPolicy() {
  return (
    <>
      <SectionCard title="배포 정책 (U-166-D)" items={[
        "Backend: 운영자 수동 PR + plink/pscp 적용",
        "Frontend: 사용자 명시 승인 후 vite build + pscp",
        "DB: bin/migrate.php both --dry-run → both → rollback 옵션 보유",
        "CI/CD: GitHub Actions 사용 안 함 (165차 폐기 결정)",
        "rollback: tgz backup 즉시 복원",
      ]} />
      <SectionCard title="운영 SLA" items={[
        "응답 P95 ≤ 300 ms",
        "DB 가동률 ≥ 99.9 %",
        "오류율 (1h) ≤ 0.5 %",
        "deploy 빈도: 주 1-2 회 권장",
      ]} />
    </>
  );
}

function TabSecurityPolicy() {
  const { t } = useI18n();
  return (
    <>
      <SectionCard title="9 개 절대 원칙" items={[
        "초엔터프라이즈 + 기존 안정성 보존",
        "은행급 보안 (SHA-256 키 / TLS / RBAC)",
        "글로벌 SaaS 표준 (15 locale / Tenant 격리)",
        "AI 중심 의사결정 (집계 데이터 only)",
        "사방넷 이상 운영 안정성",
      ]} />
      <SectionCard title="RBAC 매트릭스" items={[
        "viewer: 읽기 전용",
        "connector: ingest 쓰기 (write:ingest)",
        "analyst: 일반 쓰기 (write:*)",
        "admin: 전체 + admin:keys",
        t('admin.security.rbacAuditLog','RBAC 우회: 거부 (감사 로그 필수)'),
      ]} />
      <SectionCard title="PII 정책" items={[
        "집계 only — 개별 구매자 레코드 비저장",
        "v418.1 decisioning: 코호트 단위",
        "credentials: chat 인용 금지 / memory 미저장 / 1 회 사용 후 회전",
      ]} />
    </>
  );
}

function TabBackupRestore() {
  return (
    <>
      <SectionCard title="DB 백업" items={[
        "mysqldump 일간 (운영 host /tmp/)",
        "168차 사례: backup_geniego_roi_pre_168_*.sql.gz (7.9 KB)",
        "보관 기간: 30 일 권장",
        "복구: gunzip + mysql < dump.sql",
      ]} />
      <SectionCard title="Frontend dist 백업" items={[
        "deploy 직전 tgz 자동 (frontend_dist_pre*.tgz)",
        "168차 사례: 18 MB (4/30 build 기준)",
        "rollback: tar -xzf pre*.tgz → 즉시 복원",
      ]} />
      <SectionCard title="설정 파일 백업" items={[
        "nginx vhost: www.genieroi.com.conf.bak_pre*_*",
        "backend .env: 운영자 별도 보관",
        "운영 .my.cnf.bak: chmod 600 root:root",
      ]} />
    </>
  );
}

export default Admin;
