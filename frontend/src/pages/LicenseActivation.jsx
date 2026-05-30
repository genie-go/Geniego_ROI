
/* ── Enterprise Dynamic Locale Map ────────────────────── */
const LANG_LOCALE_MAP = {
  ko:'ko-KR', en:'en-US', ja:'ja-JP', zh:'zh-CN', 'zh-TW':'zh-TW',
  de:'de-DE', es:'es-ES', fr:'fr-FR', pt:'pt-BR', ru:'ru-RU',
  ar:'ar-SA', hi:'hi-IN', th:'th-TH', vi:'vi-VN', id:'id-ID'
};

/* ── Enterprise Demo Isolation Guard ─────────────────────── */
const _isDemo = IS_DEMO; // 180차: 자가가드(startsWith demo — roidemo.* 미매칭) → demoEnv 정본 격리
import React, { useState, useCallback, useEffect } from "react";
import { IS_DEMO } from '../utils/demoEnv';
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from '../i18n/index.js';
import { useT } from '../i18n/index.js';
import { postJsonAuth, getJsonAuth, requestJsonAuth, postJson } from '../services/apiClient.js';

/* ─── 채널별 API Key 발급 가이드 ────────────────────────────────────────────── */
const CHANNEL_GUIDES = [
    /* ── 광고 채널 ── */
    {
        id: "meta",
        category: "광고 채널",
        name: "Meta (Facebook / Instagram)",
        icon: "📘", color: "#1877f2",
        authType: "oauth_token",
        badge: "Global",
        keyFields: [
            { key: "access_token", label: "Access Token *", placeholder: "EAAxxxxxx...", required: true },
            { key: "ad_account_id", label: "광고 계정 ID", placeholder: "act_123456789" },
            { key: "pixel_id", label: "Pixel ID (선택)", placeholder: "123456789" },
        ],
        steps: [
            "Meta for Developers (developers.facebook.com) 접속",
            "내 앱 → 앱 설정 → 기본 설정에서 앱 ID 확인",
            "비즈니스 관리자 → [설정] → [API 및 통합] → Access Token 생성",
            "ads_read, ads_management 권한 포함하여 발급",
            "광고 계정 ID: 비즈니스 관리자 URL에서 확인 (act_숫자)",
        ],
        docsUrl: "https://developers.facebook.com/docs/marketing-api/get-started",
        unlocks: ["Meta 광고 실적", "페이스북/인스타그램 캠페인", "Pixel 전환 추적"],
    },
    {
        id: "google_ads",
        category: "광고 채널",
        name: "Google Ads",
        icon: "🔍", color: "#4285f4",
        authType: "api_key",
        badge: "Global",
        keyFields: [
            { key: "developer_token", label: "Developer Token *", placeholder: "xxxxxxxxxxxxxxxx", required: true },
            { key: "client_id", label: "OAuth Client ID", placeholder: "xxxxx.apps.googleusercontent.com" },
            { key: "client_secret", label: "Client Secret", placeholder: "GOCSPX-xxxxx" },
            { key: "refresh_token", label: "Refresh Token", placeholder: "1//xxxxxxxxxx" },
            { key: "customer_id", label: "Customer ID (MCC)", placeholder: "123-456-7890" },
        ],
        steps: [
            "Google Ads API 콘솔 (developers.google.com) 접속",
            "API 액세스 → Developer Token 신청/확인",
            "Google Cloud Console → OAuth 2.0 클라이언트 생성",
            "Google Ads API 스코프로 Refresh Token 발급",
            "Customer ID: Google Ads 우측 상단 숫자 (XXX-XXX-XXXX)",
        ],
        docsUrl: "https://developers.google.com/google-ads/api/docs/first-call/overview",
        unlocks: ["Google 검색/디스플레이 광고", "YouTube 광고 실적", "전환 업로드"],
    },
    {
        id: "tiktok",
        category: "광고 채널",
        name: "TikTok for Business",
        icon: "🎵", color: "#ff0050",
        badge: "Global",
        keyFields: [
            { key: "access_token", label: "Access Token *", placeholder: "xxxxxxxxxx", required: true },
            { key: "advertiser_id", label: "광고주 ID", placeholder: "7001234567890" },
        ],
        steps: [
            "TikTok for Business (ads.tiktok.com) 로그인",
            "우측 상단 프로필 → 개발자 계정 신청",
            "My Apps → 앱 생성 → OAuth 인증 → Access Token 발급",
            "권한: ad.read, report.read 포함 필수",
            "광고주 ID: 광고 관리자 URL에 포함된 숫자",
        ],
        docsUrl: "https://ads.tiktok.com/marketing_api/docs",
        unlocks: ["TikTok 광고 실적", "숏폼 영상 광고 분석", "전환 트래킹"],
    },
    {
        id: "kakao",
        category: "광고 채널",
        name: "Kakao 모먼트",
        icon: "💬", color: "#fee500",
        badge: "국내",
        keyFields: [
            { key: "access_token", label: "Access Token *", placeholder: "xxxxxxxxxxxxxxxx", required: true },
            { key: "ad_account_id", label: "광고 계정 ID", placeholder: "1234567" },
        ],
        steps: [
            "Kakao Developers (developers.kakao.com) 로그인",
            "내 애플리케이션 → 앱 등록 또는 기존 앱 선택",
            "Kakao 모먼트 API → 동의 항목 설정",
            "Access Token: REST API Key로 OAuth 인증 후 발급",
            "광고 계정 ID: Kakao 광고 관리자 URL에서 확인",
        ],
        docsUrl: "https://developers.kakao.com/docs/latest/ko/kakaomoment/common",
        unlocks: ["Kakao 광고 실적", "Kakao톡 채널 메시지", "알림톡 발송"],
    },
    {
        id: "naver_ads",
        category: "광고 채널",
        name: "Naver 검색광고",
        icon: "🟢", color: "#03c75a",
        badge: "국내",
        keyFields: [
            { key: "api_key", label: "API Key *", placeholder: "ENTER YOUR API KEY", required: true },
            { key: "secret_key", label: "Secret Key *", placeholder: "ENTER YOUR SECRET KEY", required: true },
            { key: "customer_id", label: "Customer ID", placeholder: "1234567" },
        ],
        steps: [
            "Naver 검색광고 (searchad.naver.com) 로그인",
            "도구 → API 사용 신청",
            "API 설정 → API Key / Secret Key 확인",
            "Customer ID: Dashboard URL의 숫자 값",
        ],
        docsUrl: "https://naver.github.io/SearchAdvertiseAPI",
        unlocks: ["Naver 검색광고 실적", "키워드 성과 분석", "소재 관리"],
    },
    /* ── 판매 채널 ── */
    {
        id: "coupang",
        category: "판매 채널",
        name: "Coupang Wing",
        icon: "🛍️", color: "#00bae5",
        badge: "국내",
        keyFields: [
            { key: "access_key", label: "Access Key *", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx", required: true },
            { key: "secret_key", label: "Secret Key *", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", required: true },
            { key: "vendor_id", label: "판매자 ID", placeholder: "A12345678" },
        ],
        steps: [
            "Coupang 날개 (wing.coupang.com) 로그인",
            "[판매자 정보] → [API 설정] 메뉴",
            "API Key 발급 → Access Key & Secret Key 복사",
            "판매자 ID: Coupang 파트너 계정 ID (영문+숫자)",
        ],
        docsUrl: "https://developers.coupangwing.com",
        unlocks: ["Coupang 주문 연동", "상품 재고 동기화", "정산 데이터"],
    },
    {
        id: "naver_store",
        category: "판매 채널",
        name: "Naver 스마트스토어",
        icon: "🏪", color: "#03c75a",
        badge: "국내",
        keyFields: [
            { key: "client_id", label: "Client ID *", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", required: true },
            { key: "client_secret", label: "Client Secret *", placeholder: "xxxxxxxxxxxxxxxx", required: true },
        ],
        steps: [
            "Naver 커머스 API (api.commerce.naver.com) 접속",
            "판매자 센터 로그인 → [설정] → [외부 API]",
            "API 사용 신청 → Client ID / Client Secret 발급",
            "권한: 상품, 주문, 정산 모두 선택",
        ],
        docsUrl: "https://apicenter.commerce.naver.com",
        unlocks: ["스마트스토어 주문 연동", "상품 동기화", "정산 조회"],
    },
    {
        id: "11st",
        category: "판매 채널",
        name: "11Street",
        icon: "🏬", color: "#ff0000",
        badge: "국내",
        keyFields: [
            { key: "api_key", label: "API Key *", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", required: true },
        ],
        steps: [
            "11Street 오픈 API (openapi.11st.co.kr) 접속",
            "개발자 신청 → API Key 발급",
            "판매자 계정으로 로그인 후 API Key 확인",
        ],
        docsUrl: "https://openapi.11st.co.kr",
        unlocks: ["11Street 주문 연동", "상품 재고 관리", "매출 데이터"],
    },
    {
        id: "shopify",
        category: "판매 채널",
        name: "Shopify",
        icon: "🛒", color: "#96bf48",
        badge: "Global",
        keyFields: [
            { key: "shop_url", label: "스토어 URL *", placeholder: "yourstore.myshopify.com", required: true },
            { key: "access_token", label: "Admin API Token *", placeholder: "shpat_xxxxxxxxxxxxxxxx", required: true },
        ],
        steps: [
            "Shopify 어드민 (yourstore.myshopify.com/admin) 로그인",
            "[설정] → [앱 및 판매 채널] → [앱 개발]",
            "커스텀 앱 생성 → Admin API 접근 범위 설정",
            "API 자격 증명 → Admin API 액세스 토큰 Copy",
        ],
        docsUrl: "https://shopify.dev/docs/admin-api",
        unlocks: ["Shopify 주문/재고 동기화", "글로벌 이커머스 데이터", "고객 데이터"],
    },
    {
        id: "amazon",
        category: "판매 채널",
        name: "Amazon SP-API",
        icon: "📦", color: "#ff9900",
        badge: "Global",
        keyFields: [
            { key: "selling_partner_id", label: "판매자 ID *", placeholder: "A1234567890123", required: true },
            { key: "marketplace_id", label: "마켓플레이스 ID", placeholder: "ATVPDKIKX0DER" },
            { key: "refresh_token", label: "Refresh Token *", placeholder: "Atzr|xxxxx", required: true },
            { key: "client_id", label: "LWA Client ID", placeholder: "amzn1.application-oa2-client.xxxx" },
            { key: "client_secret", label: "LWA Client Secret", placeholder: "xxxxxxxxxxxx" },
        ],
        steps: [
            "Amazon Seller Central (sellercentral.amazon.com) 로그인",
            "[앱 및 서비스] → [개발자 아카데미] → SP-API 신청",
            "Amazon Developer Console → 앱 등록 → OAuth Refresh Token 발급",
            "한국: ATVPDKIKX0DER (미국), A1PA6795UKMFR9D (일본), A1VC38T7YXB528 (한국)",
        ],
        docsUrl: "https://developer-docs.amazon.com/sp-api",
        unlocks: ["Amazon 주문/재고 연동", "FBA 재고 관리", "광고 실적"],
    },
    {
        id: "rakuten",
        category: "판매 채널",
        name: "Rakuten (일본)",
        icon: "🇯🇵", color: "#bf0000",
        badge: "일본",
        keyFields: [
            { key: "service_secret", label: "Service Secret *", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", required: true },
            { key: "license_key", label: "License Key *", placeholder: "xxxx-xxxx-xxxx-xxxx", required: true },
            { key: "shop_url", label: "라쿠텐 쇼핑몰 URL", placeholder: "yourshop" },
        ],
        steps: [
            "라쿠텐 RMS (merchant.rms.rakuten.co.jp) 로그인",
            "API 접속 신청 → 승인 후 Service Secret 발급",
            "RMS Web Service → License Key 확인",
        ],
        docsUrl: "https://webservice.rakuten.co.jp",
        unlocks: ["라쿠텐 주문 연동", "일본 재고 관리", "정산 데이터"],
    },
    /* ── 결제 시스템 ── */
    {
        id: "toss_payments",
        category: "결제 시스템",
        name: "토스페이먼츠",
        icon: "💳", color: "#0064ff",
        badge: "국내 PG",
        keyFields: [
            { key: "secret_key", label: "시크릿 Key *", placeholder: "test_sk_xxxxxxxxxxxx or live_sk_xxxx", required: true },
            { key: "client_key", label: "클라이언트 Key", placeholder: "test_ck_xxxx or live_ck_xxxx" },
        ],
        steps: [
            "토스페이먼츠 개발자 센터 (developers.tosspayments.com) 접속",
            "대시보드 → API Key 탭",
            "Test: test_sk_ 로 시작하는 시크릿 Key",
            "실제 결제: live_sk_ 로 시작하는 운영 시크릿 Key (심사 후 발급)",
        ],
        docsUrl: "https://developers.tosspayments.com/guides/get-started",
        unlocks: ["국내 카드 결제", "구독 정기결제", "간편결제 (Kakao페이·Naver페이)"],
    },
    {
        id: "stripe",
        category: "결제 시스템",
        name: "Stripe",
        icon: "💳", color: "#635bff",
        badge: "Global PG",
        keyFields: [
            { key: "secret_key", label: "Secret Key *", placeholder: "sk_test_xxxx or sk_live_xxxx", required: true },
            { key: "publishable_key", label: "Publishable Key", placeholder: "pk_test_xxxx or pk_live_xxxx" },
            { key: "webhook_secret", label: "Webhook Secret", placeholder: "whsec_xxxx" },
        ],
        steps: [
            "Stripe Dashboard (dashboard.stripe.com) 로그인",
            "[개발자] → [API Key] → Secret Key Copy",
            "Test: sk_test_ / 운영: sk_live_ Key 사용",
            "웹훅: [개발자] → [웹훅] → 엔드포인트 등록 후 서명 시크릿 복사",
        ],
        docsUrl: "https://stripe.com/docs/api",
        unlocks: ["글로벌 카드 결제", "구독 관리", "다국가 결제"],
    },
];

const CATEGORIES = [...new Set(CHANNEL_GUIDES.map(c => c.category))];

/* ─── 헬퍼 ──────────────────────────────────────────────────────────────────── */
function Badge({ text, color }) {
    return (
        <span style={{
            fontSize: 9, padding: "2px 7px", borderRadius: 20, fontWeight: 700,
            background: `${color}18`, border: `1px solid ${color}44`, color,
            display: "inline-block" }}>{text}</span>
    );
}

function StepGuide({ steps, docsUrl }) {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ marginTop: 10 }}>
            <button onClick={() => setOpen(v => !v)} style={{ fontSize: 11, color: "#4f8ef7", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 700 }}>
                {open ? "▲ 가이드 접기" : "▼ Key 발급 방법 보기 (초보자용)"}
            </button>
            {open && (
                <div style={{ marginTop: 8, padding: "12px 14px", borderRadius: 10, background: "rgba(79,142,247,0.04)", border: "1px solid rgba(79,142,247,0.15)" }}>
                    <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
                        {steps.map((s, i) => (
                            <li key={i} style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.6 }}>{s}</li>
                        ))}
                    </ol>
                    {docsUrl && (
                        <a href={docsUrl} target="_blank" rel="noopener noreferrer"
                            style={{ display: "inline-block", marginTop: 10, fontSize: 11, color: "#4f8ef7", fontWeight: 700 }}>
                            📖 공식 문서 바로가기 →
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}

function ChannelKeyForm({ ch, values, onChange, saved, token, onSaved, onCleared }) {
    const [show, setShow] = useState(false);
    const [busy, setBusy] = useState(false);
    const [testMsg, setTestMsg] = useState(null); // { ok, message }
    const [status, setStatus] = useState(saved ? "saved" : "idle");

    const handleSave = async () => {
        const missing = ch.keyFields.filter(f => f.required && !values[f.key]);
        if (missing.length > 0) {
            alert(`필수 항목을 입력해주세요: ${missing.map(f => f.label).join(", ")}`);
            return;
        }
        setBusy(true);
        setTestMsg(null);
        const savedIds = [];
        try {
            for (const f of ch.keyFields) {
                if (!values[f.key]) continue;
                const d = await postJsonAuth(`/api/v423/creds`, {
                    channel: ch.id,
                    cred_type: ch.authType || "api_key",
                    label: ch.name,
                    key_name: f.key,
                    key_value: values[f.key],
                });
                if (d.ok && d.id) savedIds.push(d.id);
            }
            setStatus("saved");
            if (onSaved) onSaved(ch.id, savedIds);

            // 저장 후 자동 동기화 테스트 (첫 번째 저장된 ID)
            if (savedIds[0]) {
                const td = await postJsonAuth(`/api/v423/creds/${savedIds[0]}/test`);
                setTestMsg({ ok: td.ok, message: td.message || (td.ok ? "연동 성공" : "연동 실패") });
            }
        } catch (e) {
            setTestMsg({ ok: false, message: "저장 중 오류: " + e.message });
        } finally {
            setBusy(false);
        }
    };

    const handleClear = async () => {
        try {
            // 해당 채널의 creds 목록 조회 후 삭제
            const d = await getJsonAuth(`/api/v423/creds?channel=${ch.id}`);
            if (d.creds) {
                for (const cred of d.creds) {
                    await requestJsonAuth(`/api/v423/creds/${cred.id}`, "DELETE");
                }
            }
        } catch (_) {}
        ch.keyFields.forEach(f => onChange(ch.id, f.key, ""));
        setStatus("idle");
        setTestMsg(null);
        if (onCleared) onCleared(ch.id);
    };

    return (
        <div className="card card-glass" style={{
            borderLeft: `3px solid ${status === "saved" ? "#22c55e" : ch.color}`,
            transition: "border-color 0.3s" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: `${ch.color}18`, border: `1.5px solid ${ch.color}44`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{ch.icon}</div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{ch.name}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                        <Badge text={ch.badge} color={ch.badge === "국내" ? "#22c55e" : ch.badge === "일본" ? "#ef4444" : "#4f8ef7"} />
                        {status === "saved" && <Badge text="✓ 연동됨" color="#22c55e" />}
                    </div>
                </div>
                {status === "saved" && (
                    <button onClick={handleClear} style={{ fontSize: 10, color: "#ef4444", background: "none", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, cursor: "pointer", padding: "3px 8px" }}>삭제</button>
                )}
            </div>

            {/* 활성화 기능 미리보기 */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
                {ch.unlocks.map(u => (
                    <span key={u} style={{
                        fontSize: 9, padding: "2px 8px", borderRadius: 20,
                        background: `${ch.color}0d`, border: `1px solid ${ch.color}33`,
                        color: ch.color }}>✓ {u}</span>
                ))}
            </div>

            {/* Key 입력 폼 */}
            <div style={{ display: "grid", gap: 10 }}>
                {ch.keyFields.map(f => (
                    <div key={f.key}>
                        <label style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 700, display: "block", marginBottom: 4 }}>
                            {f.label}
                        </label>
                        <div style={{ display: "flex", gap: 6 }}>
                            <input
                                type={show ? "text" : "password"}
                                value={values[f.key] || ""}
                                onChange={e => onChange(ch.id, f.key, e.target.value)}
                                placeholder={f.placeholder}
                                style={{ flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 12, background: "rgba(9,15,30,0.8)", border: "1px solid rgba(99,140,255,0.2)", color: '#fff', outline: "none", fontFamily: "monospace" }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* 표시/숨김 + Save */}
            <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={() => setShow(v => !v)} style={{ fontSize: 11, color: "var(--text-3)", background: "none", border: "1px solid rgba(99,140,255,0.15)", borderRadius: 6, cursor: "pointer", padding: "5px 10px" }}>👁 {show ? "숨기기" : "보기"}</button>
                <button onClick={handleSave} disabled={busy} style={{
                    padding: "8px 18px", borderRadius: 8, border: "none",
                    background: `linear-gradient(135deg,${ch.color},${ch.color}bb)`,
                    color: '#fff', fontWeight: 700, fontSize: 12, cursor: "pointer",
                    opacity: busy ? 0.7 : 1 }}>
                    {busy ? "⏳ 저장 중…" : status === "saved" ? "✓ 저장됨" : "💾 저장"}
                </button>
                {status === "saved" && !testMsg && (
                    <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>
                        ✓ {ch.name} 연동 준비 완료
                    </span>
                )}
            </div>

            {/* 연동 테스트 결과 */}
            {testMsg && (
                <div style={{
                    marginTop: 10, padding: "8px 12px", borderRadius: 8, fontSize: 11,
                    background: testMsg.ok ? "rgba(34,197,94,0.07)" : "rgba(239,68,68,0.07)",
                    border: `1px solid ${testMsg.ok ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                    color: testMsg.ok ? "#22c55e" : "#ef4444" }}>
                    {testMsg.ok ? "✅" : "⚠️"} {testMsg.message}
                </div>
            )}

            {/* Key 발급 가이드 (초보자용) */}
            <StepGuide steps={ch.steps} docsUrl={ch.docsUrl} />
        </div>
    );
}

/* ─── 메인 페이지 ────────────────────────────────────────────────────────────── */

export default function LicenseActivation() {
  const t = useT();
    const { user, token, onPaymentSuccess } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState(1); // 1=라이선스Key, 2=채널API Key
    const [licenseKey, setLicenseKey] = useState("");
    const [licBusy, setLicBusy] = useState(false);
    const [licResult, setLicResult] = useState(null);
    const [licError, setLicError] = useState("");
    const [showKey, setShowKey] = useState(false);

    const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
    const [keyValues, setKeyValues] = useState({});
    const [savedChannels, setSavedChannels] = useState([]);

    // 마운트 또는 step 변경 시 서버에서 저장된 채널 목록 조회
    useEffect(() => {
        if (!token) return;
        getJsonAuth(`/api/v423/creds`)
            .then(d => {
                if (d.creds) {
                    const channels = [...new Set(d.creds.map(c => c.channel))];
                    setSavedChannels(channels);
                }
            })
            .catch(() => {});
    }, [token, step]);

    const handleKeyChange = useCallback((channelId, fieldKey, value) => {
        setKeyValues(prev => ({
            ...prev,
            [channelId]: { ...(prev[channelId] || {}), [fieldKey]: value },
        }));
    }, []);

    const handleSaved = useCallback((channelId) => {
        setSavedChannels(prev => prev.includes(channelId) ? prev : [...prev, channelId]);
    }, []);

    const handleCleared = useCallback((channelId) => {
        setSavedChannels(prev => prev.filter(c => c !== channelId));
    }, []);

    /* License Key Activate */
    const activateLicense = async () => {
        if (!licenseKey.trim()) { setLicError("License Key를 입력해주세요."); return; }
        setLicBusy(true); setLicError("");
        try {
            const d = await postJson("/api/auth/license", { license_key: licenseKey.trim() });
            if (!d.ok) { setLicError(d.error || "활성화 실패"); return; }
            setLicResult(d);
            if (d.user) onPaymentSuccess(d.user);
            setStep(2);
        } catch (e) {
            setLicError("네트워크 오류: " + e.message);
        } finally {
            setLicBusy(false);
        }
    };

    const isPlanActive = user && ["pro", "enterprise", "admin"].includes(user.plan);

    return (
        <div style={{ display: "grid", gap: 16, maxWidth: 780, margin: "0 auto" }}>
            {/* Hero */}
            <div className="hero fade-up">
                <div className="hero-meta">
                    <div className="hero-icon" style={{ background: "linear-gradient(135deg,rgba(79,142,247,0.25),rgba(168,85,247,0.15))" }}>🔑</div>
                    <div>
                        <div className="hero-title" style={{ background: "linear-gradient(135deg,#4f8ef7,#a855f7)" }}>
                            서비스 활성화 센터
                        </div>
                        <div className="hero-desc">License Key 등록 → 판매·광고·결제 채널 API Key 등록 → 모든 기능 즉시 사용 가능</div>
                    </div>
                </div>
            </div>

            {/* 진행 단계 표시 */}
            <div style={{ display: "flex", gap: 0, background: "rgba(9,15,30,0.6)", borderRadius: 12, border: "1px solid rgba(99,140,255,0.15)", overflow: "hidden" }}>
                {[
                    { n: 1, label: "① License Key 등록", sub: "서비스 활성화" },
                    { n: 2, label: "② 채널 API Key 등록", sub: "광고·판매·결제 연동" },
                ].map(s => (
                    <button key={s.n} onClick={() => setStep(s.n)} style={{ flex: 1, padding: "14px 20px", textAlign: "left", border: "none", cursor: "pointer", background: step === s.n ? "rgba(79,142,247,0.12)" : "transparent", borderRight: s.n < 2 ? "1px solid rgba(99,140,255,0.12)" : "none", transition: "background 0.2s" }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color: step === s.n ? "#4f8ef7" : "var(--text-2)" }}>{s.label}</div>
                        <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{s.sub}</div>
                    </button>
                ))}
            </div>

            {/* STEP 1: License Key */}
            {step === 1 && (
                <div className="card card-glass" style={{ display: "grid", gap: 20 }}>
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>🎫 License Key 등록</div>
                        <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7 }}>
                            구매하신 License Key를 입력하면 <strong style={{ color: "#4f8ef7" }}>모든 유료 기능이 즉시 활성화</strong>됩니다.<br />
                            License Key는 이메일로 발송되거나 관리자가 발급합니다.
                        </div>
                    </div>

                    {isPlanActive ? (
                        <div style={{ padding: "16px 18px", borderRadius: 12, background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.25)" }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "#22c55e", marginBottom: 4 }}>
                                ✅ 라이선스가 이미 활성화되어 있습니다
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                                현재 플랜: <strong style={{ color: "#4f8ef7" }}>{user?.plan?.toUpperCase()}</strong> ·
                                만료일: <strong>{user?.subscription_expires_at
                                    ? new Date(user.subscription_expires_at).toLocaleDateString(LANG_LOCALE_MAP[lang] || 'ko-KR')
                                    : "무제한"}</strong>
                            </div>
                            <button onClick={() => setStep(2)} style={{ marginTop: 12, padding: "10px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#22c55e,#14d9b0)", color: '#fff', fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                                채널 API Key 등록으로 이동 →
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* License Key 형식 안내 */}
                            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(79,142,247,0.05)", border: "1px solid rgba(79,142,247,0.2)", fontSize: 11 }}>
                                <div style={{ fontWeight: 700, color: "#4f8ef7", marginBottom: 6 }}>📋 License Key 형식</div>
                                <div style={{ fontFamily: "monospace", color: "var(--text-2)", letterSpacing: 1 }}>GENIE-XXXX-XXXX-XXXX-XXXX</div>
                                <div style={{ marginTop: 6, color: "var(--text-3)" }}>X는 영문 대문자 또는 숫자 (예: GENIE-A1B2-C3D4-E5F6-G7H8)</div>
                            </div>

                            <div>
                                <label style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 700, display: "block", marginBottom: 8 }}>
                                    License Key 입력 *
                                </label>
                                <div style={{ display: "flex", gap: 8 }}>
                                    <input
                                        type={showKey ? "text" : "password"}
                                        value={licenseKey}
                                        onChange={e => setLicenseKey(e.target.value.toUpperCase())}
                                        onKeyDown={e => e.key === "Enter" && activateLicense()}
                                        placeholder="GENIE-XXXX-XXXX-XXXX-XXXX"
                                        style={{ flex: 1, padding: "12px 16px", borderRadius: 10, fontSize: 14, background: "rgba(9,15,30,0.8)", border: "1px solid rgba(99,140,255,0.25)", color: '#fff', outline: "none", fontFamily: "monospace", letterSpacing: 2 }}
                                    />
                                    <button onClick={() => setShowKey(v => !v)} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(99,140,255,0.2)", background: "transparent", color: "var(--text-3)", cursor: "pointer", fontSize: 18 }}>👁</button>
                                </div>
                                {licError && (
                                    <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", fontSize: 12, color: "#ef4444" }}>
                                        ❌ {licError}
                                    </div>
                                )}
                            </div>

                            <button onClick={activateLicense} disabled={licBusy || !licenseKey.trim()} style={{ padding: "14px 0", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#4f8ef7,#a855f7)", color: '#fff', fontWeight: 800, fontSize: 15, cursor: "pointer", boxShadow: "0 8px 24px rgba(79,142,247,0.3)", opacity: licBusy || !licenseKey.trim() ? 0.6 : 1, transition: "all 0.2s" }}>
                                {licBusy ? "⏳ 검증 중…" : "🚀 라이선스 활성화"}
                            </button>

                            <div style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center" }}>
                                License Key가 없으신가요?{" "}
                                <button onClick={() => navigate("/pricing")} style={{ background: "none", border: "none", color: "#4f8ef7", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                                    요금제 보기
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* STEP 2: 채널 API Key — 채널 API Key 관리(/api-keys)로 통합 */}
            {step === 2 && (
                <div style={{ display: "grid", gap: 16 }}>
                    {/* Done 안내 Card */}
                    <div className="card card-glass" style={{ padding: "28px 32px", textAlign: "center", background: "linear-gradient(135deg,rgba(34,197,94,0.06),rgba(79,142,247,0.06))", border: "1.5px solid rgba(34,197,94,0.2)" }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8, color: "#22c55e" }}>
                            라이선스 활성화 완료!
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.8, marginBottom: 20 }}>
                            이제 채널 API Key를 등록하면 <strong>광고·판매·결제 채널의 실시간 데이터가 자동 동기화</strong>됩니다.<br />
                            아래 버튼을 클릭해 <strong>채널 API Key 관리</strong> 페이지에서 채널을 등록하세요.
                        </div>
                        <button onClick={() => navigate("/api-keys")} style={{ padding: "14px 36px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#4f8ef7,#6366f1)", color: '#fff', fontWeight: 800, fontSize: 15, cursor: "pointer", boxShadow: "0 6px 20px rgba(79,142,247,0.35)" }}>
                            🔑 채널 API Key 관리 페이지로 이동
                        </button>
                    </div>

                    {/* 지원 Channel 미리보기 */}
                    <div className="card card-glass" style={{ padding: "20px 24px" }}>
                        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 14 }}>📡 등록 가능 채널 (30개+)</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
                            {[
                                { icon: "📘", name: "Meta Ads", badge: "글로벌 광고" },
                                { icon: "🎶", name: "TikTok Business", badge: "글로벌 광고" },
                                { icon: "🔵", name: "Google Ads", badge: "글로벌 광고" },
                                { icon: "🟠", name: "Amazon Ads", badge: "글로벌 광고" },
                                { icon: "👻", name: "Snapchat Ads", badge: "글로벌 광고" },
                                { icon: "🐦", name: "Twitter/X Ads", badge: "글로벌 광고" },
                                { icon: "📦", name: "Amazon SP-API", badge: "글로벌 커머스" },
                                { icon: "🛍", name: "Shopify", badge: "글로벌 커머스" },
                                { icon: "🏪", name: "eBay", badge: "글로벌 커머스" },
                                { icon: "🔴", name: "Lazada/Tmall", badge: "글로벌 커머스" },
                                { icon: "🟡", name: "Qoo10(큐텐)", badge: "글로벌 커머스" },
                                { icon: "🛒", name: "Rakuten(라쿠텐)", badge: "글로벌 커머스" },
                                { icon: "🟢", name: "Naver 스마트스토어", badge: "국내" },
                                { icon: "🟩", name: "Naver SearchAds", badge: "국내" },
                                { icon: "🛒", name: "Coupang", badge: "국내" },
                                { icon: "💛", name: "Kakao 모먼트", badge: "국내" },
                                { icon: "🔶", name: "11Street", badge: "국내" },
                                { icon: "🟡", name: "Gmarket/옥션", badge: "국내" },
                                { icon: "🔴", name: "Lotte ON", badge: "국내" },
                                { icon: "🟠", name: "WeMakePrice", badge: "국내" },
                                { icon: "🔵", name: "Interpark", badge: "국내" },
                                { icon: "🏠", name: "자사몰 Webhook", badge: "자사몰·기타" },
                                { icon: "☕", name: "카페24", badge: "자사몰·기타" },
                                { icon: "📊", name: "Google Analytics 4", badge: "자사몰·기타" },
                                { icon: "🎁", name: "베네피아", badge: "폐쇄몰" },
                                { icon: "📱", name: "포인트몰(KT/SKT/LG)", badge: "폐쇄몰" },
                                { icon: "📗", name: "교보생명 웰컴", badge: "폐쇄몰" },
                                { icon: "🔴", name: "롯데 복지몰", badge: "폐쇄몰" },
                                { icon: "🔷", name: "삼성 웰스토리", badge: "폐쇄몰" },
                                { icon: "🏢", name: "일반 폐쇄몰", badge: "폐쇄몰" },
                            ].map(c => (
                                <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 9, background: "rgba(99,140,255,0.04)", border: "1px solid rgba(99,140,255,0.08)" }}>
                                    <span style={{ fontSize: 16 }}>{c.icon}</span>
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 700 }}>{c.name}</div>
                                        <div style={{ fontSize: 9, color: "var(--text-3)" }}>{c.badge}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Button */}
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                        <button onClick={() => navigate("/connectors")} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(99,140,255,0.2)", background: "transparent", color: "var(--text-2)", cursor: "pointer", fontSize: 12 }}>커넥터 현황 보기</button>
                        <button onClick={() => navigate("/dashboard")} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#22c55e,#14d9b0)", color: '#fff', fontWeight: 700, fontSize: 12, cursor: "pointer" }}>🏠 대시보드로 이동</button>
                    </div>
                </div>
            )}
        </div>
    );
}