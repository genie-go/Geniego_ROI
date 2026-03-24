import React, { useState } from "react";
import { useT } from "../i18n/index.js";

/* ──────────────────────────────────────────────────────────────────────────────
 * CaseStudy.jsx — Case Study / Brand Reference
 * Weakness #4: Public 케이스스터디 부재 → 가상 3건 Reference로 신뢰도 강화
 * ────────────────────────────────────────────────────────────────────────────── */

const CASES = [
  {
    id: 1,
    company: "StyleKorea",
    industry: "패션·뷰티 e-커머스",
    icon: "👗",
    color: "#e91e8c",
    logo: "SK",
    tags: ["AI Marketing Auto화", "멀티터치 어트리뷰션", "CRM Unified"],
    challenge: "10개 이상의 Channel에서 Ad를 운영하면서 정확한 ROI 측정이 불가능했습니다. Channel 간 어트리뷰션 in progress복으로 실제 Ad Efficiency을 파악할 Count 없었고, Marketing Budget의 30% 이상이 과소평가된 Channel에 집in progress되어 있었습니다.",
    solution: "Geniego-ROI의 Exact Shapley Value 어트리뷰션과 Bayesian MMM을 도입하여 Channelper 진짜 기여도를 Analysis했습니다. AI Forecast 모델로 Next 주 ROAS를 사전 Forecast하여 Budget을 선제적으로 재배분했습니다.",
    results: [
      { label: "Ad ROAS 개선", value: "+34%", color: "#22c55e" },
      { label: "Marketing Cost 절감", value: "-22%", color: "#4f8ef7" },
      { label: "Conv. Rate", value: "+18%", color: "#a855f7" },
      { label: "도입 후 첫 Quarter Revenue", value: "+₩2.4B", color: "#f59e0b" },
    ],
    period: "2025년 Q3 (3개월)",
    teamSize: "Marketing Team 8명",
    channels: ["Meta Ads", "Naver", "Kakao", "Kakao Channel"],
    quote: "Geniego-ROI 도입 후 처음으로 각 Channel이 실제로 얼마나 기여하는지 알 Count 있었습니다. Previous에는 Last Touch에만 의존했는데, Shapley Analysis 결과를 보고 Budget 배분을 완전히 바꿨습니다.",
    quotePerson: "김다은 Marketing 디렉터",
  },
  {
    id: 2,
    company: "FreshMart Korea",
    industry: "신선식품 D2C 커머스",
    icon: "🛒",
    color: "#22c55e",
    logo: "FM",
    tags: ["WMS Unified", "Count요 Forecast", "정산 Auto화"],
    challenge: "전국 5개 물류 센터와 42개 마켓플레이스를 Connect하면서 Stock 파악과 Orders 처리가 CountActions으로 이루어지고 있었습니다. 피크 시즌에 Stock 부족으로 인한 결품률이 12%에 달했고, 정산도 Channelper로 Count동 Aggregate하는 데 주 6Time이 소요됐습니다.",
    solution: "Geniego-ROI의 WMS 모듈과 Orders 허브를 Integration하여 Stock·Orders 데이터를 실Time Unified했습니다. AI Count요 Forecast으로 4주 선행 발주 Plan을 Auto Generate하고, Auto 정산으로 Channelper Profit을 즉시 Aggregate합니다.",
    results: [
      { label: "결품률 Decrease", value: "-78%", color: "#22c55e" },
      { label: "정산 처리 Time", value: "-95%", color: "#4f8ef7" },
      { label: "Stock 회전율", value: "+31%", color: "#a855f7" },
      { label: "물류 Cost 절감", value: "-17%", color: "#f59e0b" },
    ],
    period: "2025년 Q4 (6개월)",
    teamSize: "물류·Marketing Team 23명",
    channels: ["Coupang", "Naver SmartStore", "11Street", "자체몰"],
    quote: "Count요 Forecast 정확도가 예전 엑셀 모델 대비 2배 이상 향상되었고, 정산 Auto화로 Team원들이 Analysis과 의사결정에 집in progress할 Count 있게 되었습니다.",
    quotePerson: "박준호 물류 운영 Team장",
  },
  {
    id: 3,
    company: "G-Brand Global",
    industry: "K-뷰티 Global Count출",
    icon: "🌏",
    color: "#a855f7",
    logo: "GB",
    tags: ["아시아 물류", "Global Channel", "다국어 CRM"],
    challenge: "한국·일본·동남아 3개 시장에서 동시에 Marketing을 운영하면서 Channelper Performance를 Unified Analysis하기 어려웠습니다. Kakao(한국), LINE(일본·태국), WhatsApp(동남아) Channel을 따로 Management하는 데 막대한 리소스가 낭비됐습니다.",
    solution: "Geniego-ROI의 멀티Channel CRM(Kakao·LINE·WhatsApp·인스타그램 DM)과 아시아 물류 모듈을 Unified했습니다. Single Dashboard에서 3개국 Performance를 실Time으로 모니터링하고, AI 여정 빌더로 Languageper Auto Personal화 Message를 Send합니다.",
    results: [
      { label: "Customer 응답률", value: "+52%", color: "#22c55e" },
      { label: "Countryper ROAS 편차", value: "-41%", color: "#4f8ef7" },
      { label: "CRM 운영 Cost", value: "-38%", color: "#a855f7" },
      { label: "Global GMV 성장", value: "+₩8.7B", color: "#f59e0b" },
    ],
    period: "2025년 Q2~Q4 (9개월)",
    teamSize: "Global Marketing Team 15명",
    channels: ["Rakuten", "LINE", "WhatsApp", "Shopify", "Naver"],
    quote: "세 나라, 다섯 Channel을 하나의 Screen에서 Management하게 된 것이 가장 큰 변화입니다. AI가 Countryper 최적 Send Time과 Message를 Auto으로 Settings해줘서 Team 운영 효율이 극적으로 높아졌습니다.",
    quotePerson: "Sarah Kim Global Marketing VP",
  },
];

const METRICS_SUMMARY = [
  { label: "Average ROAS 개선", value: "+28%", icon: "📈", color: "#22c55e" },
  { label: "Marketing Cost 최적화", value: "-25%", icon: "💰", color: "#4f8ef7" },
  { label: "Team 운영 효율", value: "+3.4x", icon: "⚡", color: "#a855f7" },
  { label: "도입 Average ROI", value: "480%", icon: "🏆", color: "#f59e0b" },
];

function CaseCard({ c, expanded, onToggle }) {
  return (
    <div className="card card-glass" style={{ borderLeft: `3px solid ${c.color}`, cursor: "pointer" }} onClick={onToggle}>
      {/* Header */}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg,${c.color}33,${c.color}18)`, border: `2px solid ${c.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
          {c.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 15, color: "var(--text-1)" }}>{c.company}</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>{c.industry}</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
            {c.tags.map(t => (
              <span key={t} style={{ fontSize: 9, padding: "2px 8px", borderRadius: 20, background: `${c.color}18`, color: c.color, border: `1px solid ${c.color}30`, fontWeight: 700 }}>{t}</span>
            ))}
          </div>
        </div>
        <span style={{ fontSize: 16, color: "var(--text-3)", flexShrink: 0 }}>{expanded ? "▲" : "▼"}</span>
      </div>

      {/* 결과 KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: expanded ? 16 : 0 }}>
        {c.results.map(r => (
          <div key={r.label} style={{ textAlign: "center", padding: "8px 6px", borderRadius: 8, background: `${r.color}08`, border: `1px solid ${r.color}18` }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: r.color }}>{r.value}</div>
            <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 2, lineHeight: 1.3 }}>{r.label}</div>
          </div>
        ))}
      </div>

      {/* 확장 내용 */}
      {expanded && (
        <div style={{ display: "grid", gap: 14 }} onClick={e => e.stopPropagation()}>
          {/* 도전 과제 */}
          <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#ef4444", marginBottom: 6 }}>🔴 도전 과제</div>
            <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>{c.challenge}</div>
          </div>

          {/* 솔루션 */}
          <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(79,142,247,0.05)", border: "1px solid rgba(79,142,247,0.15)" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#4f8ef7", marginBottom: 6 }}>🔵 Geniego-ROI 솔루션</div>
            <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>{c.solution}</div>
          </div>

          {/* 도입 Info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.15)" }}>
              <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700, marginBottom: 6 }}>📅 도입 Period / Team 규모</div>
              <div style={{ fontSize: 11, color: "var(--text-1)" }}>{c.period}</div>
              <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2 }}>{c.teamSize}</div>
            </div>
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)" }}>
              <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 700, marginBottom: 6 }}>🔌 Integration Channel</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {c.channels.map(ch => (
                  <span key={ch} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 20, background: "rgba(99,140,255,0.1)", color: "#4f8ef7", border: "1px solid rgba(99,140,255,0.2)" }}>{ch}</span>
                ))}
              </div>
            </div>
          </div>

          {/* 인용구 */}
          <div style={{ padding: "14px 16px", borderRadius: 12, background: `${c.color}08`, border: `1px solid ${c.color}25` }}>
            <div style={{ fontSize: 13, color: "var(--text-1)", lineHeight: 1.8, fontStyle: "italic", marginBottom: 8 }}>
              "{c.quote}"
            </div>
            <div style={{ fontSize: 11, color: c.color, fontWeight: 800 }}>— {c.quotePerson}, {c.company}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CaseStudy() {
  const [expanded, setExpanded] = useState(1); // 첫 번째 열린 Status로

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Hero */}
      <div className="hero fade-up">
        <div className="hero-meta">
          <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(168,85,247,0.25),rgba(99,102,241,0.15))" }}>🏆</div>
          <div>
            <div className="hero-title" style={{ background: "linear-gradient(135deg,#a855f7,#6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Customer Success Stories
            </div>
            <div className="hero-desc">
              Geniego-ROI를 도입한 기업들의 실제 Performance를 Confirm하세요. AI Marketing Auto화·멀티터치 어트리뷰션·커머스 Unified으로 달성한 측정 Available ROI.
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI */}
      <div className="grid4 fade-up fade-up-1">
        {METRICS_SUMMARY.map(({ label, value, icon, color }, i) => (
          <div key={label} className="kpi-card card-hover fade-up" style={{ "--accent": color, animationDelay: `${i * 60}ms` }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
            <div className="kpi-value" style={{ color }}>{value}</div>
            <div className="kpi-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Case Study 섹션 */}
      <div className="card card-glass fade-up fade-up-2">
        <div className="section-header">
          <div>
            <div className="section-title">📖 Case Study (3건)</div>
            <div className="section-sub">가상 샘플 데이터 기반 Demo · 실제 도입 시 사례 Public 예정</div>
          </div>
          <span className="badge" style={{ fontSize: 10, background: "rgba(168,85,247,0.12)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.25)" }}>
            🔒 Virtual Data / Demo용
          </span>
        </div>
      </div>

      {/* 케이스 Card */}
      <div style={{ display: "grid", gap: 12 }} className="fade-up fade-up-3">
        {CASES.map(c => (
          <CaseCard key={c.id} c={c} expanded={expanded === c.id} onToggle={() => setExpanded(expanded === c.id ? null : c.id)} />
        ))}
      </div>

      {/* CTA — 실제 도입 문의 */}
      <div className="card card-glass fade-up fade-up-4" style={{ textAlign: "center", padding: "32px 24px", background: "linear-gradient(135deg,rgba(168,85,247,0.07),rgba(79,142,247,0.05))", border: "1px solid rgba(168,85,247,0.25)" }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>🚀</div>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8, background: "linear-gradient(135deg,#a855f7,#4f8ef7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          귀사의 Performance도 Geniego-ROI로 만들어보세요
        </div>
        <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7, marginBottom: 20, maxWidth: 480, margin: "0 auto 20px" }}>
          AI Marketing Auto화부터 커머스·물류 Unified까지, 7일 Free 체험으로 직접 Confirm하세요.<br/>
          전담 온보딩 Team이 도입 첫 날부터 함께합니다.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn-primary" style={{ background: "linear-gradient(135deg,#a855f7,#6366f1)", padding: "11px 24px" }}
            onClick={() => window.location.href = "/app-pricing"}>
            💎 Pricing제 보기
          </button>
          <button className="btn-ghost" style={{ padding: "11px 24px" }}
            onClick={() => window.location.href = "/help"}>
            📚 도입 가이드
          </button>
        </div>
      </div>
    </div>
  );
}
