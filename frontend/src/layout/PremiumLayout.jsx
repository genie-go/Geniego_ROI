import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { LANG_OPTIONS } from "../i18n/index.js";
import { st, siteLang } from "../pages/public/siteI18n.js";

/* 187차 — 공유 프리미엄 라이트 레이아웃 (랜딩과 동일 톤). Pretendard 고급 타이포 + 로고 애니메이션. */

const FONT_STACK = "'Pretendard','Inter','Apple SD Gothic Neo','Segoe UI',system-ui,sans-serif";

export function PremiumStyles() {
    return (
        <style>{`
            @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            @keyframes glFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
            @keyframes glSpin { to { transform: rotate(360deg) } }
            @keyframes glSpinR { to { transform: rotate(-360deg) } }
            @keyframes glPulse { 0%,100%{opacity:.55; transform:scale(1)} 50%{opacity:.9; transform:scale(1.08)} }
            @keyframes glOrbit { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
            @keyframes glBob { 0%,100%{transform:scale(1)} 50%{transform:scale(1.14)} }
            @keyframes glDash { to { stroke-dashoffset: -28; } }
            @keyframes glUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
            .gl-up { animation: glUp .6s cubic-bezier(.2,.7,.2,1) forwards; }
            .gl-card { transition: transform .28s cubic-bezier(.2,.7,.2,1), box-shadow .28s, border-color .28s; }
            .gl-card:hover { transform: translateY(-6px); box-shadow: 0 24px 60px rgba(15,23,42,0.12) !important; }
            @media (max-width:860px){ .gl-nav,.gl-loginbtn,.gl-langlabel{ display:none !important; } }
        `}</style>
    );
}

/* GeniegoROI 동적 플랫폼 애니메이션 — 마케팅·커머스·물류·데이터·정산·AI가 로고를 중심으로
   아주 천천히 공전(궤도)하며, 상단(12시)에 도착한 모듈의 이름이 다국어로 크게 확대 등장한다.
   + AI 실시간 분석 바 모션으로 "데이터 분석 전문 플랫폼"의 느낌. (15개국 현지 자연어) */
const ORBIT_MODS = [
    { e: "📣", c: "#ef4444", k: "marketing" }, // 마케팅
    { e: "🛒", c: "#4f46e5", k: "commerce" },  // 커머스
    { e: "🚚", c: "#10b981", k: "logistics" }, // 물류
    { e: "📊", c: "#06b6d4", k: "data" },       // 데이터 분석
    { e: "💳", c: "#f59e0b", k: "settle" },     // 정산
    { e: "🤖", c: "#7c3aed", k: "ai" },         // AI 자동화
];
/* [제목, 태그라인] — 상단 도착 시 확대 등장하는 모듈 라벨 (15개국) */
const ORBIT_TXT = {
    marketing: {
        ko: ["마케팅", "AI 캠페인·광고 ROAS 최적화"], en: ["Marketing", "AI campaign & ad ROAS optimization"],
        ja: ["マーケティング", "AIキャンペーン・広告ROAS最適化"], zh: ["营销", "AI 营销活动与广告 ROAS 优化"],
        "zh-TW": ["行銷", "AI 行銷活動與廣告 ROAS 最佳化"], de: ["Marketing", "KI-Kampagnen- & Anzeigen-ROAS"],
        th: ["การตลาด", "ปรับ ROAS แคมเปญและโฆษณาด้วย AI"], vi: ["Tiếp thị", "Tối ưu ROAS chiến dịch & quảng cáo bằng AI"],
        id: ["Pemasaran", "Optimasi ROAS kampanye & iklan dengan AI"], ar: ["التسويق", "تحسين عائد الإنفاق الإعلاني بالذكاء الاصطناعي"],
        es: ["Marketing", "Optimización de ROAS de campañas con IA"], fr: ["Marketing", "Optimisation du ROAS des campagnes par IA"],
        hi: ["मार्केटिंग", "AI कैम्पेन और विज्ञापन ROAS अनुकूलन"], pt: ["Marketing", "Otimização de ROAS de campanhas com IA"],
        ru: ["Маркетинг", "ИИ-оптимизация ROAS кампаний и рекламы"],
    },
    commerce: {
        ko: ["커머스", "멀티 마켓플레이스 통합 판매"], en: ["Commerce", "Unified multi-marketplace selling"],
        ja: ["コマース", "マルチマーケットプレイス統合販売"], zh: ["电商", "多平台统一销售"],
        "zh-TW": ["電商", "多平台統一銷售"], de: ["Commerce", "Einheitlicher Multi-Marktplatz-Verkauf"],
        th: ["คอมเมิร์ซ", "ขายรวมหลายมาร์เก็ตเพลส"], vi: ["Thương mại", "Bán hàng đa sàn hợp nhất"],
        id: ["Commerce", "Penjualan multi-marketplace terpadu"], ar: ["التجارة", "بيع موحّد عبر منصات متعددة"],
        es: ["Comercio", "Venta unificada multicanal"], fr: ["Commerce", "Vente multi-marketplace unifiée"],
        hi: ["कॉमर्स", "एकीकृत मल्टी-मार्केटप्लेस बिक्री"], pt: ["Commerce", "Venda unificada multimarketplace"],
        ru: ["Коммерция", "Единые продажи на маркетплейсах"],
    },
    logistics: {
        ko: ["물류", "WMS·풀필먼트·배송 자동화"], en: ["Logistics", "WMS, fulfillment & shipping automation"],
        ja: ["物流", "WMS・フルフィルメント・配送自動化"], zh: ["物流", "WMS·履约·配送自动化"],
        "zh-TW": ["物流", "WMS·履約·配送自動化"], de: ["Logistik", "WMS-, Fulfillment- & Versandautomatisierung"],
        th: ["โลจิสติกส์", "ระบบ WMS จัดส่งอัตโนมัติ"], vi: ["Hậu cần", "Tự động hóa WMS, fulfillment & vận chuyển"],
        id: ["Logistik", "Otomatisasi WMS, fulfillment & pengiriman"], ar: ["اللوجستيات", "أتمتة المستودعات والتنفيذ والشحن"],
        es: ["Logística", "Automatización de WMS, fulfillment y envíos"], fr: ["Logistique", "Automatisation WMS, fulfillment & expédition"],
        hi: ["लॉजिस्टिक्स", "WMS, फुलफिलमेंट और शिपिंग स्वचालन"], pt: ["Logística", "Automação de WMS, fulfillment e envio"],
        ru: ["Логистика", "Автоматизация WMS, фулфилмента и доставки"],
    },
    data: {
        ko: ["데이터 분석", "AI 기반 실시간 인사이트"], en: ["Data Analytics", "AI-powered real-time insights"],
        ja: ["データ分析", "AIによるリアルタイム分析"], zh: ["数据分析", "AI 驱动的实时洞察"],
        "zh-TW": ["數據分析", "AI 驅動的即時洞察"], de: ["Datenanalyse", "KI-gestützte Echtzeit-Insights"],
        th: ["วิเคราะห์ข้อมูล", "อินไซต์เรียลไทม์ด้วย AI"], vi: ["Phân tích dữ liệu", "Thông tin thời gian thực bằng AI"],
        id: ["Analitik Data", "Wawasan real-time bertenaga AI"], ar: ["تحليل البيانات", "رؤى لحظية مدعومة بالذكاء الاصطناعي"],
        es: ["Analítica de datos", "Insights en tiempo real con IA"], fr: ["Analyse de données", "Insights en temps réel par IA"],
        hi: ["डेटा विश्लेषण", "AI-संचालित रियल-टाइम इनसाइट्स"], pt: ["Análise de dados", "Insights em tempo real com IA"],
        ru: ["Анализ данных", "Аналитика в реальном времени на ИИ"],
    },
    settle: {
        ko: ["정산", "손익·정산 자동 집계"], en: ["Settlement", "Automated P&L & reconciliation"],
        ja: ["精算", "損益・精算の自動集計"], zh: ["结算", "损益与对账自动化"],
        "zh-TW": ["結算", "損益與對帳自動化"], de: ["Abrechnung", "Automatisierte GuV & Abstimmung"],
        th: ["การชำระบัญชี", "สรุปกำไรขาดทุนอัตโนมัติ"], vi: ["Quyết toán", "Tự động đối soát & lãi/lỗ"],
        id: ["Penyelesaian", "Otomatisasi laba-rugi & rekonsiliasi"], ar: ["التسوية", "احتساب الأرباح والمطابقة آليًا"],
        es: ["Liquidación", "P&L y conciliación automatizados"], fr: ["Règlement", "P&L et rapprochement automatisés"],
        hi: ["निपटान", "स्वचालित P&L और समाधान"], pt: ["Liquidação", "P&L e conciliação automatizados"],
        ru: ["Расчёты", "Автоматический P&L и сверка"],
    },
    ai: {
        ko: ["AI 자동화", "자율 의사결정·워크플로우"], en: ["AI Automation", "Autonomous decisions & workflows"],
        ja: ["AI自動化", "自律的な意思決定とワークフロー"], zh: ["AI 自动化", "自主决策与工作流"],
        "zh-TW": ["AI 自動化", "自主決策與工作流程"], de: ["KI-Automatisierung", "Autonome Entscheidungen & Workflows"],
        th: ["ระบบอัตโนมัติ AI", "ตัดสินใจและเวิร์กโฟลว์อัตโนมัติ"], vi: ["Tự động hóa AI", "Quyết định & quy trình tự động"],
        id: ["Otomatisasi AI", "Keputusan & alur kerja otonom"], ar: ["الأتمتة بالذكاء الاصطناعي", "قرارات وتدفقات عمل ذاتية"],
        es: ["Automatización IA", "Decisiones y flujos autónomos"], fr: ["Automatisation IA", "Décisions et workflows autonomes"],
        hi: ["AI स्वचालन", "स्वायत्त निर्णय और वर्कफ़्लो"], pt: ["Automação de IA", "Decisões e fluxos autônomos"],
        ru: ["ИИ-автоматизация", "Автономные решения и процессы"],
    },
};
const ORBIT_ANALYZING = {
    ko: "AI 실시간 분석", en: "AI live analysis", ja: "AIリアルタイム分析", zh: "AI 实时分析", "zh-TW": "AI 即時分析",
    de: "KI-Echtzeitanalyse", th: "วิเคราะห์เรียลไทม์ด้วย AI", vi: "Phân tích thời gian thực bằng AI", id: "Analisis langsung AI",
    ar: "تحليل لحظي بالذكاء الاصطناعي", es: "Análisis en vivo con IA", fr: "Analyse en direct par IA", hi: "AI रियल-टाइम विश्लेषण",
    pt: "Análise ao vivo com IA", ru: "ИИ-анализ в реальном времени",
};

export function LogoOrbit({ size = 200, lang: langProp }) {
    // lang prop 이 없으면 (CompanyIntro/TeamIntro 등) 스스로 현재 언어를 추적
    const [autoLang, setAutoLang] = useState(() => { try { return siteLang(); } catch { return "en"; } });
    useEffect(() => {
        const onL = (e) => { if (e?.detail?.lang) setAutoLang(e.detail.lang); };
        window.addEventListener("genie-lang-change", onL);
        return () => window.removeEventListener("genie-lang-change", onL);
    }, []);
    const lang = langProp || autoLang;

    const ICONS = ORBIT_MODS;
    const N = ICONS.length;
    const ringRef = useRef(null);
    const [active, setActive] = useState(0);

    // requestAnimationFrame 으로 공전 각도를 직접 구동 → 상단 도착 아이콘을 정확히 동기화
    useEffect(() => {
        let raf, start = null;
        const PERIOD = 36000; // 36초/1회전 = 모듈당 6초 (아주 천천히)
        const tick = (ts) => {
            if (start === null) start = ts;
            const prog = ((ts - start) % PERIOD) / PERIOD; // 0..1
            const deg = prog * 360;
            const el = ringRef.current;
            if (el) { el.style.transform = `rotate(${deg}deg)`; el.style.setProperty("--lo-cnt", `${-deg}deg`); }
            // 아이콘 i 는 base(i)=i/N*360-90 에서 시작 → top(12시) 도착 조건: i ≡ -prog*N (mod N)
            let idx = ((Math.round(-prog * N) % N) + N) % N;
            setActive(p => (p === idx ? p : idx));
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [N]);

    const cx = size / 2;
    const R = size * 0.43, CHIP = Math.round(size * 0.2), PR = size * 0.3;
    const pos = (i, n, r, off) => { const a = (i / n) * 2 * Math.PI + (off || 0); return { x: cx + Math.cos(a) * r, y: cx + Math.sin(a) * r }; };
    const pcol = ["#06b6d4", "#4f46e5", "#7c3aed", "#10b981", "#f59e0b"];
    const act = ICONS[active];
    const txt = ORBIT_TXT[act.k]?.[lang] || ORBIT_TXT[act.k]?.en || [act.k, ""];
    const analyzing = ORBIT_ANALYZING[lang] || ORBIT_ANALYZING.en;

    return (
        <div style={{ margin: "0 auto", width: "fit-content", textAlign: "center" }}>
            <style>{`
                @keyframes loFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
                @keyframes loSpin{to{transform:rotate(360deg)}}
                @keyframes loSpinR{to{transform:rotate(-360deg)}}
                @keyframes loPulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:.92;transform:scale(1.08)}}
                @keyframes loBob{0%,100%{transform:scale(1)}50%{transform:scale(1.16)}}
                @keyframes loZoom{0%{opacity:0;transform:scale(.5) translateY(16px)}55%{opacity:1;transform:scale(1.1)}100%{opacity:1;transform:scale(1) translateY(0)}}
                @keyframes loBar{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}
                @keyframes loBlink{0%,100%{opacity:.3}50%{opacity:1}}
                .lo-zoom{animation:loZoom .62s cubic-bezier(.2,.8,.2,1.05) both}
                .lo-bar{transform-origin:bottom;animation:loBar 1.05s ease-in-out infinite}
            `}</style>

            <div style={{ width: size, height: size, position: "relative", margin: "0 auto", animation: "loFloat 6s ease-in-out infinite" }}>
                {/* glow — 활성 모듈 색으로 부드럽게 전환 */}
                <div style={{ position: "absolute", inset: size * 0.13, borderRadius: "50%", background: `radial-gradient(circle, ${act.c}33, transparent 70%)`, animation: "loPulse 3.6s ease-in-out infinite", transition: "background .6s" }} />
                {/* conic gradient ring */}
                <div style={{ position: "absolute", inset: size * 0.06, borderRadius: "50%", background: "conic-gradient(from 0deg,#4f46e5,#7c3aed,#06b6d4,#10b981,#f59e0b,#4f46e5)", opacity: 0.5,
                    WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))", mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))", animation: "loSpin 13s linear infinite" }} />
                {/* dashed data ring (reverse) */}
                <div style={{ position: "absolute", inset: size * 0.17, borderRadius: "50%", border: "1.5px dashed rgba(79,70,229,0.22)", animation: "loSpinR 24s linear infinite" }} />
                {/* 상단 도착 지점 마커 (12시) */}
                <div style={{ position: "absolute", top: -3, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: `9px solid ${act.c}`, filter: "drop-shadow(0 2px 4px rgba(15,23,42,.2))", transition: "border-top-color .5s", zIndex: 3 }} />
                {/* fast data particles (데이터 흐름) */}
                <div style={{ position: "absolute", inset: 0, animation: "loSpin 8s linear infinite" }}>
                    {[0, 1, 2, 3, 4].map(i => { const p = pos(i, 5, PR); return <div key={i} style={{ position: "absolute", left: p.x - 3.5, top: p.y - 3.5, width: 7, height: 7, borderRadius: "50%", background: pcol[i], boxShadow: "0 0 10px " + pcol[i] }} />; })}
                </div>
                {/* 활동 아이콘 공전 (rAF 구동) — 자식은 --lo-cnt 로 역회전하여 항상 정립 */}
                <div ref={ringRef} style={{ position: "absolute", inset: 0, willChange: "transform" }}>
                    {ICONS.map((ic, i) => { const p = pos(i, N, R, -Math.PI / 2); const on = i === active; return (
                        <div key={i} style={{ position: "absolute", left: p.x - CHIP / 2, top: p.y - CHIP / 2, width: CHIP, height: CHIP, transform: "rotate(var(--lo-cnt,0deg))" }}>
                            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#fff", border: `2px solid ${ic.c}${on ? "" : "33"}`, boxShadow: on ? `0 0 0 4px ${ic.c}22, 0 10px 28px ${ic.c}66` : "0 6px 18px " + ic.c + "3a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: CHIP * 0.5, transform: on ? "scale(1.18)" : "scale(1)", transition: "transform .4s cubic-bezier(.2,.8,.2,1.1), box-shadow .4s, border-color .4s", animation: "loBob 2.8s ease-in-out " + (i * 0.4) + "s infinite" }}>{ic.e}</div>
                        </div>
                    ); })}
                </div>
                {/* 중앙 로고 */}
                <div style={{ position: "absolute", inset: size * 0.31, borderRadius: size * 0.15, background: "#fff", boxShadow: "0 14px 42px rgba(79,70,229,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src="/logo_v5.png" alt="GeniegoROI" style={{ width: "92%", height: "92%", objectFit: "contain", borderRadius: size * 0.1 }} />
                </div>
            </div>

            {/* 상단 도착 모듈 — 다국어 라벨 확대 등장 */}
            <div style={{ minHeight: 96, marginTop: 16, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div key={act.k} className="lo-zoom" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: "clamp(20px,2.6vw,30px)", fontWeight: 900, letterSpacing: -0.5, color: act.c }}>
                        <span style={{ fontSize: "1.05em", lineHeight: 1 }}>{act.e}</span>
                        <span>{txt[0]}</span>
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "#64748b", maxWidth: 360, lineHeight: 1.45 }}>{txt[1]}</div>
                </div>
                {/* AI 실시간 분석 바 모션 — 데이터 분석 전문 느낌 */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", animation: "loBlink 1.2s ease-in-out infinite" }} />
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 18 }}>
                        {[0, 1, 2, 3, 4, 5, 6].map(i => <span key={i} className="lo-bar" style={{ width: 3, height: 18, borderRadius: 2, background: `linear-gradient(180deg,${act.c},${act.c}55)`, animationDelay: i * 0.12 + "s" }} />)}
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.3 }}>{analyzing}</span>
                </div>
            </div>
        </div>
    );
}

function PremiumHeader({ lang, setLang }) {
    const [scrolled, setScrolled] = useState(false);
    const [langOpen, setLangOpen] = useState(false);
    const [vis, setVis] = useState({ about: false, team: false });
    const lref = useRef(null);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll, { passive: true });
        const onClick = (e) => { if (lref.current && !lref.current.contains(e.target)) setLangOpen(false); };
        document.addEventListener("mousedown", onClick);
        const base = import.meta.env.VITE_API_BASE || "";
        fetch(base + "/auth/site/intro").then(r => r.json()).then(d => { if (d?.visibility) setVis(d.visibility); }).catch(() => {});
        return () => { window.removeEventListener("scroll", onScroll); document.removeEventListener("mousedown", onClick); };
    }, []);
    const cur = LANG_OPTIONS.find(l => l.code === lang) || LANG_OPTIONS[1];
    const navLink = { fontSize: 14, fontWeight: 600, color: "#334155", textDecoration: "none", padding: "8px 12px", borderRadius: 8, transition: "all 150ms" };
    const hov = (e, on) => e.currentTarget.style.background = on ? "#f1f5f9" : "transparent";
    return (
        <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, transition: "all 300ms",
            background: scrolled ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.62)", backdropFilter: "blur(18px) saturate(160%)",
            borderBottom: scrolled ? "1px solid #eef2f7" : "1px solid transparent", boxShadow: scrolled ? "0 4px 24px rgba(15,23,42,0.05)" : "none" }}>
            <div style={{ maxWidth: 1220, margin: "0 auto", padding: "0 24px", height: 66, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <Link to="/" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none" }}>
                    <img src="/logo_v5.png" alt="Geniego-ROI" style={{ width: 34, height: 34, borderRadius: 9, objectFit: "cover", boxShadow: "0 4px 14px rgba(79,70,229,0.25)" }} />
                    <span style={{ fontWeight: 900, fontSize: 17, color: "#0f172a", letterSpacing: -0.4 }}>Geniego<span style={{ color: "#4f46e5" }}>ROI</span></span>
                </Link>
                <nav style={{ display: "flex", alignItems: "center", gap: 2 }} className="gl-nav">
                    {vis.about && <Link to="/about" style={navLink} onMouseEnter={e => hov(e, 1)} onMouseLeave={e => hov(e, 0)}>{st("navAbout", lang)}</Link>}
                    {vis.team && <Link to="/team" style={navLink} onMouseEnter={e => hov(e, 1)} onMouseLeave={e => hov(e, 0)}>{st("navTeam", lang)}</Link>}
                    <Link to="/pricing" style={navLink} onMouseEnter={e => hov(e, 1)} onMouseLeave={e => hov(e, 0)}>Pricing</Link>
                </nav>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div ref={lref} style={{ position: "relative" }}>
                        <button onClick={() => setLangOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 11px", borderRadius: 9, background: "#fff", border: "1px solid #e2e8f0", color: "#334155", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
                            <span style={{ fontSize: 15 }}>{cur.flag}</span><span className="gl-langlabel">{cur.label}</span><span style={{ fontSize: 9, opacity: .5 }}>▼</span>
                        </button>
                        {langOpen && <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 6, minWidth: 168, maxHeight: 360, overflowY: "auto", boxShadow: "0 16px 48px rgba(15,23,42,0.16)" }}>
                            {LANG_OPTIONS.map(l => (
                                <button key={l.code} onClick={() => { setLang(l.code); setLangOpen(false); localStorage.setItem("landing_lang", l.code); localStorage.setItem("genie_roi_lang", l.code); try { window.dispatchEvent(new CustomEvent("genie-lang-change", { detail: { lang: l.code } })); } catch {} }}
                                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: lang === l.code ? "#eef2ff" : "transparent", color: lang === l.code ? "#4f46e5" : "#334155" }}>
                                    <span style={{ fontSize: 15 }}>{l.flag}</span><span>{l.label}</span>
                                </button>
                            ))}
                        </div>}
                    </div>
                    <Link to="/login" style={{ ...navLink, color: "#475569" }} className="gl-loginbtn">Log in</Link>
                    <Link to="/login?tab=register" style={{ padding: "9px 20px", borderRadius: 10, background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", fontWeight: 800, fontSize: 13.5, textDecoration: "none", boxShadow: "0 6px 20px rgba(79,70,229,0.32)", whiteSpace: "nowrap" }}>Start free</Link>
                </div>
            </div>
        </header>
    );
}

export default function PremiumLayout({ children }) {
    const [lang, setLang] = useState(siteLang());
    useEffect(() => {
        const onL = (e) => { if (e?.detail?.lang) setLang(e.detail.lang); };
        window.addEventListener("genie-lang-change", onL);
        return () => window.removeEventListener("genie-lang-change", onL);
    }, []);
    return (
        <div style={{ minHeight: "100vh", background: "#ffffff", color: "#0f172a", fontFamily: FONT_STACK }}>
            <PremiumStyles />
            <PremiumHeader lang={lang} setLang={setLang} />
            <main style={{ paddingTop: 66 }}>{children}</main>
            <footer style={{ borderTop: "1px solid #eef2f7", background: "#fafbfc" }}>
                <div style={{ maxWidth: 1180, margin: "0 auto", padding: "44px 24px 30px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <img src="/logo_v5.png" alt="Geniego-ROI" style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover" }} />
                        <span style={{ fontWeight: 900, fontSize: 15, color: "#0f172a" }}>Geniego<span style={{ color: "#4f46e5" }}>ROI</span></span>
                    </div>
                    <div style={{ display: "flex", gap: 18, fontSize: 13, color: "#64748b", flexWrap: "wrap" }}>
                        <Link to="/pricing" style={{ color: "#64748b", textDecoration: "none" }}>Pricing</Link>
                        <Link to="/terms" style={{ color: "#64748b", textDecoration: "none" }}>Terms</Link>
                        <Link to="/privacy" style={{ color: "#64748b", textDecoration: "none" }}>Privacy</Link>
                        <Link to="/refund" style={{ color: "#64748b", textDecoration: "none" }}>Refund</Link>
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>© 2024–2026 OCIELL Co., Ltd.</div>
                </div>
            </footer>
        </div>
    );
}
