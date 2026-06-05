import React, { useState, useEffect, useCallback } from "react";
import { getJson } from "../services/apiClient.js";
import { IS_DEMO } from "../utils/demoEnv";

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

  const tabs = ["개요", "🤖 AI 엔진", "운영 정책", "보안 정책", "백업 / 복구"];

  const kpis = [
    { emoji: "👥", label: "총 사용자", val: health?.users?.total ?? "—" },
    { emoji: "🏢", label: "활성 Tenant", val: health?.tenants?.active ?? "—" },
    { emoji: "🔑", label: "API Key", val: health?.api_keys?.total ?? "—" },
    { emoji: "🟢", label: "활성 세션", val: health?.sessions?.active ?? "—" },
    { emoji: "💾", label: "DB 사이즈", val: health?.db?.size_mb ? `${health.db.size_mb} MB` : "—" },
    { emoji: "⏱️", label: "가동 시간", val: health?.uptime ?? "—" },
    { emoji: "⚡", label: "평균 응답", val: health?.perf?.avg_ms ? `${health.perf.avg_ms} ms` : "—" },
    { emoji: "🟥", label: "오류율 (1h)", val: health?.errors?.rate_1h ?? "—" },
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
            <div style={{ fontSize: 22, fontWeight: 800 }}>플랫폼 환경 관리</div>
            <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
              시스템 관리 · 전역 정책 · 운영 모니터링 콘솔
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
            }}>⚠ 관리자 전용 — 변경 사항은 모든 Tenant 에 영향</div>
          </div>
        </div>
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
          <div key={i} style={cardStyle}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{k.emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{k.val}</div>
            <div style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 600, marginTop: 2 }}>
              {k.label}
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
  const [aiKey, setAiKey] = useState("");
  const [aiKeySet, setAiKeySet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { t:'ok'|'err', m }
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
    })();
  }, []);

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

function TabOverview({ health }) {
  return (
    <>
      <SectionCard title="시스템 정보" items={[
        `Geniego-ROI v${health?.version || "424"}`,
        `PHP ${health?.php_version || "8.1.34"}`,
        `MySQL ${health?.db?.version || "8.0.37"}`,
        `Nginx + PHP-FPM`,
        `Tenant 격리: X-Tenant-Id`,
        `인증: Bearer + RBAC (viewer / connector / analyst / admin)`,
      ]} />
      <SectionCard title="활성 트랙" items={[
        "N-152-F PM-Core (Task / Milestone / Gantt)",
        "N-152-F F2/F3 메뉴 가시성 토글",
        "N-152-F 결제 정책 (USD 단일 / Paddle 카드 전용)",
        "N-PH3 실시간 알림 + SSE",
        "U-166-D 보안 자동화 폐기 → 수동 PR",
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
        "RBAC 우회: 거부 (감사 로그 필수)",
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
        "nginx vhost: roi.genie-go.com.conf.bak_pre*_*",
        "backend .env: 운영자 별도 보관",
        "운영 .my.cnf.bak: chmod 600 root:root",
      ]} />
    </>
  );
}

export default Admin;
