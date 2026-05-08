import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";


/* ═══════════════════════════════════════════════════════════════
   All 메뉴 인덱스 — Search 대상 데이터
═══════════════════════════════════════════════════════════════ */
const ALL_MENUS = [
    // ① 홈
    { to: "/dashboard", icon: "⬡", label: "통합 Dashboard", section: "홈", keywords: "Dashboard 홈 요약 현황 KPI All" },
    // ② 마케팅·광고
    { to: "/auto-marketing", icon: "🚀", label: "마케팅 자동화 AI", section: "마케팅·광고", keywords: "자동화 AI 마케팅 캠페인 메타 틱톡 Naver 광고 자동" },
    { to: "/marketing", icon: "📣", label: "광고 현황·Analysis", section: "마케팅·광고", keywords: "광고 현황 Analysis ROAS Channel 성과 CTR CPC" },
    { to: "/marketing-intelligence", icon: "🧠", label: "마케팅 인텔리전스", section: "마케팅·광고", keywords: "인텔리전스 기여도 추천 전략 Channel 최적화" },
    { to: "/campaign-manager", icon: "🎯", label: "캠페인 관리", section: "마케팅·광고", keywords: "캠페인 관리 생성 편집 목표 Budget" },
    { to: "/content-calendar", icon: "📆", label: "콘텐츠 캘린더", section: "마케팅·광고", keywords: "콘텐츠 캘린더 일정 포스팅 SNS 스케줄" },
    { to: "/budget-planner", icon: "💰", label: "Budget 플래너", section: "마케팅·광고", keywords: "Budget 플래너 계획 월 배분 Ad Spend" },
    { to: "/influencer", icon: "🤝", label: "인플루언서 관리", section: "마케팅·광고", keywords: "인플루언서 크리에이터 유튜버 협찬 수수료 평가" },
    { to: "/attribution", icon: "🔗", label: "전환 기여도 Analysis", section: "마케팅·광고", keywords: "기여도 전환 어트리뷰션 Channel 가중치 기여" },
    // ③ 커머스·물류
    { to: "/omni-channel", icon: "🌐", label: "멀티Channel 커머스", section: "커머스·물류", keywords: "멀티Channel 옴니Channel Coupang Naver 스마트스토어 아마존 11Street" },
    { to: "/kr-channel", icon: "🇰🇷", label: "국내 Channel 관리", section: "커머스·물류", keywords: "국내Channel Coupang 스마트스토어 지마켓 옥션 11Street 티몬 위메프" },
    { to: "/wms-manager", icon: "🏭", label: "WMS 창고·물류", section: "커머스·물류", keywords: "WMS 창고 물류 재고 입출고 피킹 패킹" },
    { to: "/order-hub", icon: "📦", label: "Orders 허브", section: "커머스·물류", keywords: "Orders 허브 OMS Orders관리 배송 택배 반품 교환" },
    { to: "/catalog-sync", icon: "📂", label: "상품 카탈로그", section: "커머스·물류", keywords: "카탈로그 상품 등록 동기화 SKU 이미지 상세" },
    { to: "/price-opt", icon: "💡", label: "가격 최적화", section: "커머스·물류", keywords: "가격 최적화 경쟁사 AI 다이나믹 프라이싱 마진" },
    { to: "/digital-shelf", icon: "🛍", label: "디지털 셸프", section: "커머스·물류", keywords: "디지털셸프 상품 진열 노출 Search 순위 SEO" },
    { to: "/amazon-risk", icon: "🏪", label: "아마존 리스크", section: "커머스·물류", keywords: "아마존 리스크 계정 정지 경고 컴플라이언스" },
    // ④ Analysis·성과
    { to: "/performance", icon: "📊", label: "성과 허브", section: "Analysis·성과", keywords: "성과 허브 KPI 지표 목표 달성률" },
    { to: "/pnl", icon: "🌊", label: "P&L 손익 Analysis", section: "Analysis·성과", keywords: "PnL 손익 Revenue 비용 이익 마진 Ad Spend 수수료" },
    { to: "/rollup", icon: "📈", label: "롤업 Dashboard", section: "Analysis·성과", keywords: "롤업 집계 All Channel 합산 요약" },
    { to: "/graph-score", icon: "🕸", label: "그래프 스코어", section: "Analysis·성과", keywords: "그래프 스코어 점수 Channel 인플루언서 기여 네트워크" },
    { to: "/ai-insights", icon: "🤖", label: "AI 인사이트", section: "Analysis·성과", keywords: "AI 인사이트 Analysis 추천 Claude 자동 리포트" },
    { to: "/report-builder", icon: "📋", label: "리포트 빌더", section: "Analysis·성과", keywords: "리포트 빌더 보고서 엑셀 다운로드 커스텀" },
    // ⑤ 정산·재무
    { to: "/reconciliation", icon: "💰", label: "Revenue 정산", section: "정산·재무", keywords: "정산 Revenue Channel 수수료 입금 일치 대조" },
    { to: "/settlements", icon: "📋", label: "정산 내역", section: "정산·재무", keywords: "정산내역 Channel별 월별 입금 Confirm" },
    { to: "/pricing", icon: "💳", label: "Plan·결제", section: "정산·재무", keywords: "Plan 결제 구독 Upgrade PRO " },
    // ⑥ 자동화·AI
    { to: "/ai-rule-engine", icon: "🧠", label: "AI 룰 엔진", section: "자동화·AI", keywords: "룰엔진 AI 자동 조건 트리거 액션 규칙" },
    { to: "/ai-policy", icon: "🤖", label: "AI 정책 관리", section: "자동화·AI", keywords: "AI정책 자동화 허용 차단 기준 관리" },
    { to: "/alert-policies", icon: "🚨", label: "Notification 정책", section: "자동화·AI", keywords: "Notification 정책 이메일 슬랙 Slack Kakao톡 조건" },
    { to: "/action-presets", icon: "🧰", label: "액션 프리셋", section: "자동화·AI", keywords: "액션 프리셋 자동화 시나리오 워크플로우" },
    { to: "/approvals", icon: "✅", label: "승인 워크플로우", section: "자동화·AI", keywords: "승인 워크플로우 결재 검토 반려 상태" },
    { to: "/writeback", icon: "↩", label: "라이트백", section: "자동화·AI", keywords: "라이트백 Writeback 데이터 역전송 외부 시스템" },
    // ⑦ 데이터·Integration
    { to: "/connectors", icon: "🔌", label: "Channel Integration·커넥터", section: "데이터·Integration", keywords: "커넥터 Integration Channel API 메타 구글 Naver Coupang 틱톡 인증키" },
    { to: "/api-keys", icon: "🔑", label: "API 키 관리", section: "데이터·Integration", keywords: "API키 인증키 등록 발급 토큰 관리 Delete" },
    { to: "/event-norm", icon: "🔄", label: "이벤트 표준화", section: "데이터·Integration", keywords: "이벤트 표준화 정규화 스키마 데이터 변환" },
    { to: "/mapping-registry", icon: "🧩", label: "매핑 레지스트리", section: "데이터·Integration", keywords: "매핑 레지스트리 필드 컬럼 연결 변환" },
    { to: "/data-product", icon: "🗂", label: "데이터 제품", section: "데이터·Integration", keywords: "데이터제품 스키마 API 외부 공유" },
    // ⑧ 시스템·관리
    { to: "/admin", icon: "⚙", label: "관리자 설정 (통합 관리)", section: "시스템·관리", keywords: "Admin 관리자 설정 시스템 환경 구성 회원 권한 모니터 결제 감사" },
    { to: "/operations", icon: "⚡", label: "운영 허브", section: "시스템·관리", keywords: "운영 허브 업무 현황 운영 관리" },
    { to: "/operations-guide", icon: "📖", label: "운영 가이드", section: "시스템·관리", keywords: "운영가이드 매뉴얼 절차 SOP" },
    { to: "/audit", icon: "🧾", label: "감사 로그", section: "시스템·관리", keywords: "감사 로그 이력 접속 변경 추적 보안" },
    { to: "/db-admin", icon: "🗄", label: "DB 어드민", section: "시스템·관리", keywords: "DB 어드민 데이터베이스 테이블 쿼리 SQL" },
    // 사용설명서
    { to: "/help", icon: "📚", label: "시스템 사용설명서", section: "Help", keywords: "사용설명서 Help 가이드 매뉴얼 Q&A 튜토리얼" },
];

/* ═══════════════════════════════════════════════════════════════
   GlobalSearch Component
═══════════════════════════════════════════════════════════════ */
export default function GlobalSearch({ open, onClose }) {
    const [query, setQuery] = useState("");
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const overlayRef = useRef(null);

    /* Ctrl+K 단축키 */
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                if (!open) return; // onClose/open 은 부모가 제어
            }
            if (e.key === "Escape" && open) onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, onClose]);

    /* 열릴 때 input 포커스 */
    useEffect(() => {
        if (open) {
            setQuery("");
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    const results = query.trim().length > 0
        ? ALL_MENUS.filter(m => {
            const q = query.toLowerCase();
            return (
                m.label.toLowerCase().includes(q) ||
                m.keywords.toLowerCase().includes(q) ||
                m.section.toLowerCase().includes(q)
            );
        })
        : ALL_MENUS;

    const goto = useCallback((to) => {
        navigate(to);
        onClose();
    }, [navigate, onClose]);

    if (!open) return null;

    /* Overlay click */
    const handleOverlay = (e) => {
        if (e.target === overlayRef.current) onClose();
    };

    /* 섹션별 그룹핑 */
    const grouped = results.reduce((acc, m) => {
        (acc[m.section] = acc[m.section] || []).push(m);
        return acc;
    }, {});

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlay}
            style={{
                position: "fixed", inset: 0,
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(8px)",
                zIndex: 1000,
                display: "flex", alignItems: "flex-start",
                justifyContent: "center",
                paddingTop: "8vh",
            }}
        >
            <div style={{
                width: "min(680px, 94vw)",
                background: "var(--surface, var(--surface))",
                border: "1px solid var(--border2, rgba(99,140,255,0.2))",
                borderRadius: 18,
                boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
                overflow: "hidden",
                maxHeight: "80vh",
                display: "flex", flexDirection: "column",
            }}>
                {/* Search 입력 */}
                <div style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "14px 18px",
                    borderBottom: "1px solid var(--border, rgba(99,140,255,0.12))",
                }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>🔍</span>
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="메뉴 Search... (예: 광고, Dashboard, API키, 인플루언서)"
                        style={{
                            flex: 1, background: "transparent", border: "none", outline: "none",
                            color: "var(--text-1, #e8f0ff)", fontSize: 15, fontFamily: "inherit",
                        }}
                    />
                    <div style={{
                        display: "flex", gap: 4, alignItems: "center",
                        fontSize: 10, color: "var(--text-3)", flexShrink: 0,
                    }}>
                        <kbd style={{
                            padding: "2px 6px", borderRadius: 4,
                            background: "var(--surface2, #111e33)",
                            border: "1px solid var(--border2)",
                            fontSize: 10, color: "var(--text-2)",
                        }}>ESC</kbd>
                        <span>Close</span>
                    </div>
                </div>

                {/* 결과 리스트 */}
                <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
                    {results.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-3)" }}>
                            <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
                            <div style={{ fontSize: 13 }}>"{query}"와 일치하는 메뉴가 없습니다.</div>
                        </div>
                    ) : query.trim() ? (
                        /* Search 결과 (flat) */
                        results.map(m => (
                            <SearchItem key={m.to} m={m} q={query} onGoto={goto} />
                        ))
                    ) : (
                        /* All 목록 (섹션별 그룹) */
                        Object.entries(grouped).map(([section, items]) => (
                            <div key={section}>
                                <div style={{
                                    padding: "8px 18px 4px",
                                    fontSize: 10, fontWeight: 800, letterSpacing: "0.8px",
                                    textTransform: "uppercase", color: "var(--text-3)",
                                }}>
                                    {section}
                                </div>
                                {items.map(m => (
                                    <SearchItem key={m.to} m={m} q="" onGoto={goto} />
                                ))}
                            </div>
                        ))
                    )}
                </div>

                {/* 하단 힌트 */}
                <div style={{
                    borderTop: "1px solid var(--border)",
                    padding: "8px 18px",
                    display: "flex", gap: 16, alignItems: "center",
                    fontSize: 10, color: "var(--text-3)",
                }}>
                    <span>↑↓ 이동</span>
                    <span>↵ 선택</span>
                    <span>Ctrl+K 열기</span>
                    <span style={{ marginLeft: "auto" }}>총 {ALL_MENUS.length}개 메뉴</span>
                </div>
            </div>
        </div>
    );
}

/* Search 결과 항목 */
function SearchItem({ m, q, onGoto }) {
    const [hover, setHover] = useState(false);

    const highlight = (text, query) => {
        if (!query) return text;
        const idx = text.toLowerCase().indexOf(query.toLowerCase());
        if (idx < 0) return text;
        return (
            <>
                {text.slice(0, idx)}
                <mark style={{ background: "rgba(79,142,247,0.35)", color: "inherit", borderRadius: 2 }}>
                    {text.slice(idx, idx + query.length)}
                </mark>
                {text.slice(idx + query.length)}
            </>
        );
    };

    return (
        <button
            onClick={() => onGoto(m.to)}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "10px 18px", border: "none", cursor: "pointer", textAlign: "left",
                background: hover ? "rgba(79,142,247,0.08)" : "transparent",
                transition: "background 120ms",
            }}
        >
            <span style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: hover ? "rgba(79,142,247,0.15)" : "rgba(99,140,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, transition: "background 120ms",
            }}>
                {m.icon}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>
                    {highlight(m.label, q)}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>
                    {m.section} · {m.to}
                </div>
            </div>
            <span style={{
                fontSize: 11, color: hover ? "var(--accent, #4f8ef7)" : "var(--text-3)",
                flexShrink: 0, transition: "color 120ms",
            }}>→</span>
        </button>
    );
}

/* Hook: Ctrl+K 전역 오픈 */
export function useGlobalSearch() {
    const [open, setOpen] = useState(false);
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                setOpen(true);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);
    return { open, setOpen };
}
