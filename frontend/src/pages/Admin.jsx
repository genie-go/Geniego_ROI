import React, { useState, useEffect, useCallback } from "react";
import { getJson } from "../services/apiClient.js";

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

  const tabs = ["개요", "운영 정책", "보안 정책", "백업 / 복구"];

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
        {activeTab === 1 && <TabOperationsPolicy />}
        {activeTab === 2 && <TabSecurityPolicy />}
        {activeTab === 3 && <TabBackupRestore />}
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
