import React, { useEffect, createContext, useCallback, useContext, useRef, useState, useMemo } from "react";


export const AuthContext = createContext(null);

const API = "/api";

/* ── 데모 모드 감지 (VITE_DEMO_MODE=true 로 빌드 시 활성화) ── */
const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

/* 데모/운영 localStorage 키 분리 — 세션 교차 오염 방지 */
const KEY_PREFIX = IS_DEMO_MODE ? "demo_genie_" : "genie_";
const TOKEN_KEY = KEY_PREFIX + "token";
const USER_KEY = KEY_PREFIX + "user";
const REAL_KEYS_FLAG = KEY_PREFIX + "has_real_keys";
const AUTO_LOGOUT_KEY = KEY_PREFIX + "auto_logout_min";

/* 플랜 계층: free=0, demo: 0, starter=1, growth=2, pro=3, enterprise=4, admin=5 */
const PLAN_RANK = { free: 0, demo: 0, starter: 1, growth: 2, pro: 3, enterprise: 4, admin: 5 };
function planRank(plan) { return PLAN_RANK[plan] ?? 0; }

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; }
    });
    const [loading, setLoading] = useState(false);
    // 실제 API 키 등록 여부 (채널 크레덴셜 저장 성공 시 true)
    const [hasRealKeys, setHasRealKeys] = useState(() => localStorage.getItem(REAL_KEYS_FLAG) === "1");
    // 플랜별 허용 메뉴 목록: { free: [...keys], growth: [...keys], pro: [...keys], enterprise: [...keys] }
    const [planMenuAccess, setPlanMenuAccess] = useState(null);
    const menuAccessLoadedRef = useRef(false);

    /* ── 자동 로그아웃 (Idle Timer) ── */
    const [autoLogoutMin, setAutoLogoutMinState] = useState(() => {
        try { return parseInt(localStorage.getItem(AUTO_LOGOUT_KEY) || "0", 10) || 0; } catch { return 0; }
    });
    const lastActivityRef = useRef(Date.now());
    const idleTimerRef = useRef(null);

    const setAutoLogoutMin = useCallback((min) => {
        const v = Math.max(0, parseInt(min, 10) || 0);
        setAutoLogoutMinState(v);
        localStorage.setItem(AUTO_LOGOUT_KEY, String(v));
        lastActivityRef.current = Date.now(); // 설정 변경 시 타이머 리셋
    }, []);

    /* 사용자 활동 감지 → 마지막 활동 시각 갱신 */
    useEffect(() => {
        if (!token || autoLogoutMin <= 0) return;
        const onActivity = () => { lastActivityRef.current = Date.now(); };
        const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
        events.forEach(e => window.addEventListener(e, onActivity, { passive: true }));
        return () => events.forEach(e => window.removeEventListener(e, onActivity));
    }, [token, autoLogoutMin]);

    /* Idle 체크 인터벌 (15초마다 검사) */
    useEffect(() => {
        if (idleTimerRef.current) { clearInterval(idleTimerRef.current); idleTimerRef.current = null; }
        if (!token || autoLogoutMin <= 0) return;
        const timeoutMs = autoLogoutMin * 60 * 1000;
        idleTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - lastActivityRef.current;
            if (elapsed >= timeoutMs) {
                clearInterval(idleTimerRef.current);
                idleTimerRef.current = null;
                // 자동 로그아웃 실행
                setToken(null); setUser(null);
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
                try { window.location.href = "/login?reason=idle"; } catch {}
            }
        }, 15000);
        return () => { if (idleTimerRef.current) clearInterval(idleTimerRef.current); };
    }, [token, autoLogoutMin]);

    /* ── 공개 요금 API에서 플랜별 메뉴 접근 권한 로드 ── */
    const loadMenuAccess = useCallback(async () => {
        if (menuAccessLoadedRef.current) return;
        try {
            // 1) localStorage에 genie_menu_access가 있으면 즉시 적용 (MenuAccessTab에서 저장한 데이터)
            const STORAGE_KEY = "genie_menu_access";
            try {
                const localPerms = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
                if (localPerms && typeof localPerms === "object") {
                    // localPerms 구조: { [menuId]: { [role]: "✅"|"👁"|"🔒" } }
                    // 플랜별 허용 menuKey 수집
                    const localMap = {};
                    Object.entries(localPerms).forEach(([menuId, rolePerm]) => {
                        Object.entries(rolePerm).forEach(([role, perm]) => {
                            if (perm === "✅" || perm === "\u2705") {
                                if (!localMap[role]) localMap[role] = [];
                                localMap[role].push(menuId);
                            }
                        });
                    });
                    if (Object.keys(localMap).length > 0) {
                        setPlanMenuAccess(prev => ({ ...(prev || {}), ...localMap }));
                    }
                }
            } catch { /* localStorage 실패 무시 */ }

            // 2) 백엔드 API에서 플랜별 menuAccess 로드
            const r = await fetch(`${API}/auth/pricing/public-plans`);
            if (!r.ok) return;
            const d = await r.json();
            if (!d.ok || !d.plans) return;
            const map = {};
            d.plans.forEach(p => {
                map[p.id] = p.menuAccess || [];
            });
            setPlanMenuAccess(map);
            menuAccessLoadedRef.current = true;
        } catch { /* silent */ }
    }, []);

    useEffect(() => { loadMenuAccess(); }, [loadMenuAccess]);

    const saveSession = useCallback((tok, usr) => {
        setToken(tok);
        setUser(usr);
        localStorage.setItem(TOKEN_KEY, tok);
        localStorage.setItem(USER_KEY, JSON.stringify(usr));
    }, []);

    /* ══════════════════════════════════════════════════════════════════
     * 앱 로드 시 /auth/me 호출 → 최신 plan/구독 상태 동기화
     * ── 새로고침 시 로그아웃 방지 (데모 모드 + 운영 모드 모두) ──
     * 401 응답 시에도 로컬 캐시가 유효하면 세션을 유지합니다.
     * ══════════════════════════════════════════════════════════════════ */
    useEffect(() => {
        if (!token) return;
        // 로컬 오프라인 토큰 (서버 없는 개발환경) → 서버 호출 건너뜀
        if (token.startsWith("local_admin_") || token.startsWith("local__")) return;
        (async () => {
            try {
                const r = await fetch(`${API}/auth/me?token=${token}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined,
                });

                if (r.ok) {
                    const text = await r.text();
                    if (!text || !text.trim()) return; // 빈 응답은 무시, 캐시 유지
                    try {
                        const d = JSON.parse(text);
                        if (d.ok && d.user) {
                            // 로컬 캐시에서 현재 user 정보 가져오기
                            let cached = null;
                            try { cached = JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch {}

                            // 캐시된 plan이 admin인데 서버가 /free를 반환하는 경우 → 로컬 admin 우선 유지
                            const cachedPlan = cached?.plan || "";
                            const serverPlan = d.user.plan || "";
                            const PLAN_RANK_LOCAL = { free: 0, demo: 0, starter: 1, growth: 2, pro: 3, enterprise: 4, admin: 5 };
                            const useServerPlan = (PLAN_RANK_LOCAL[serverPlan] ?? 0) >= (PLAN_RANK_LOCAL[cachedPlan] ?? 0);

                            // 서버 user + 로컬 캐시 merge (plans, is_local 등 로컬 필드 보존)
                            const merged = {
                                ...(cached || {}),
                                ...d.user,
                                plan: useServerPlan ? serverPlan : cachedPlan,
                                plans: d.user.plans || cached?.plans || cachedPlan,
                                subscription_status: useServerPlan ? (d.user.subscription_status || cachedPlan) : (cached?.subscription_status || cachedPlan),
                            };
                            setUser(merged);
                            localStorage.setItem(USER_KEY, JSON.stringify(merged));
                        }
                    } catch { /* JSON 파싱 실패 → 무시, 캐시 유지 */ }

                } else if (r.status === 401 || r.status === 404) {
                    // ── 데모 모드: 401/404는 세션 유지 (서버 토큰 불일치 허용) ──
                    if (IS_DEMO_MODE) {
                        console.info('[Auth] Demo mode: ignoring server 401/404, keeping local session');
                        return;
                    }
                    // ── 운영 모드: 로컬 캐시에 유효 사용자가 있으면 세션 유지 ──
                    let cachedUser = null;
                    try { cachedUser = JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch {}
                    if (cachedUser && cachedUser.id && cachedUser.email) {
                        console.info('[Auth] Server returned', r.status, '— keeping valid cached session for', cachedUser.email);
                        return;
                    }
                    // 캐시도 없으면 진짜 로그아웃
                    setToken(null);
                    setUser(null);
                    localStorage.removeItem(TOKEN_KEY);
                    localStorage.removeItem(USER_KEY);
                    return;
                }
                // 5xx, 503, 네트워크 오류 → 로컬 캐시 유지 (서버 문제일 뿐, 로그아웃 안 함)

            } catch {
                /* 타임아웃 또는 네트워크 오류 → 로컬 캐시 유지 */
            }
        })();
    }, [token]);


    /* ── 안전한 JSON 파싱 헬퍼 (빈 응답·HTML 응답 방지) ── */
    const safeJson = async (r) => {
        const text = await r.text();
        if (!text || !text.trim()) throw new Error(`서버 응답 없음 (HTTP ${r.status})`);
        try { return JSON.parse(text); }
        catch { throw new Error(`서버 응답 오류 (${r.status}): ${text.slice(0, 120)}`); }
    };

    /* ── 로컬 전용 계정 정의 (서버 없을 때 폴백) ── */
    const LOCAL_ACCOUNTS = [
        {
            email: "admin@geniego.com",
            password: "admin1234!",
            user: { id: 1, email: "admin@geniego.com", name: "Super Admin", plan: "admin",
                company: "Geniego", subscription_status: "admin", subscription_expires_at: null, is_local: true },
        },
        {
            email: "admin@genie-roi.com",
            password: "admin1234!",
            user: { id: 1, email: "admin@genie-roi.com", name: "Admin", plan: "admin",
                company: "Geniego ROI", subscription_status: "admin", subscription_expires_at: null, is_local: true },
        },
        {
            email: "master@geniego.com",
            password: "master!@#1234",
            user: { id: 1, email: "master@geniego.com", name: "Master Admin", plan: "admin",
                company: "Geniego", subscription_status: "admin", subscription_expires_at: null, is_local: true },
        },
        {
            email: "ceo@ociell.com",
            password: "geniego1721",
            user: { id: 1, email: "ceo@ociell.com", name: "CEO Admin", plan: "admin",
                company: "Geniego", subscription_status: "admin", subscription_expires_at: null, is_local: true },
        },
        {
            email: "ceo@ociell.com",
            password: "geniego172165",
            user: { id: 1, email: "ceo@ociell.com", name: "CEO Admin", plan: "admin",
                company: "Geniego", subscription_status: "admin", subscription_expires_at: null, is_local: true },
        },
        {
            email: "ceo@ociell.com",
            password: "GENIEGO-ADMIN",
            user: { id: 1, email: "ceo@ociell.com", name: "CEO Admin", plan: "admin",
                company: "Geniego", subscription_status: "admin", subscription_expires_at: null, is_local: true },
        },
    ];

    /* ── 로그인 (실제 서버, 실패 시 로컬 폴백) ── */
    const login = useCallback(async (email, password, loginType = "") => {
        setLoading(true);
        try {
            const r = await fetch(`${API}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, login_type: loginType }),
            });

            // 서버 응답이 403 또는 HTML 응답(서버 미작동) → 로컬 폴백 시도
            const contentType = r.headers.get("content-type") || "";
            if (r.status === 403 || r.status === 502 || r.status === 503 || !contentType.includes("json")) {
                // 로컬 계정 확인
                const localMatch = LOCAL_ACCOUNTS.find(a => a.email === email.trim() && a.password === password);
                if (localMatch) {
                    const token = "local_admin_" + Date.now();
                    saveSession(token, localMatch.user);
                    return localMatch.user;
                }
                const text = await r.text();
                throw new Error(`서버 응답 오류 (${r.status}): ${text.slice(0, 120)}`);
            }

            const d = await safeJson(r);

            // 서버가 {"ok":false,"error":"offline"} 응답 → 서버 다운으로 판단, 로컬 폴백
            if (!d.ok && (d.error === "offline" || d.error === "서버 오프라인" || d.error === "maintenance")) {
                const localMatch = LOCAL_ACCOUNTS.find(a => a.email === email.trim() && a.password === password);
                if (localMatch) {
                    const token = "local_admin_" + Date.now();
                    saveSession(token, localMatch.user);
                    return localMatch.user;
                }
            }

            if (!d.ok) throw new Error(d.error || "로그인 실패");
            saveSession(d.token, d.user);
            return d.user;

        } catch (e) {
            // 네트워크 완전 오류 (오프라인) → 로컬 폴백
            if (e.message && (e.message.includes("fetch") || e.message.includes("network") || e.message.includes("Failed"))) {
                const localMatch = LOCAL_ACCOUNTS.find(a => a.email === email.trim() && a.password === password);
                if (localMatch) {
                    const token = "local_admin_" + Date.now();
                    saveSession(token, localMatch.user);
                    return localMatch.user;
                }
            }
            throw e;
        } finally {
            setLoading(false);
        }
    }, [saveSession]);

    /* ── 데모 세션 (삭제됨) ── */

    /* ── 회원가입 ── */
    const register = useCallback(async (email, password, name, company, extraData = {}) => {
        setLoading(true);
        try {
            const r = await fetch(`${API}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, name, company, ...extraData }),
            });
            const d = await r.json();
            if (!d.ok) throw new Error(d.error || "회원가입 실패");

            /* 데모 모드: 가입 즉시 Enterprise plan 강제 부여 */
            if (IS_DEMO_MODE && d.user) {
                d.user.plan = 'enterprise';
            }

            saveSession(d.token, d.user);
            return { user: d.user, coupon: d.coupon || null };
        } finally {
            setLoading(false);
        }
    }, [saveSession]);


    /* ── 로그아웃 ── */
    const logout = useCallback(() => {
        if (token) {
            fetch(`${API}/auth/logout`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            }).catch(() => { });
        }
        setToken(null); setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }, [token]);

    /* ── 구독 업그레이드 (Toss 결제 confirm 후 호출) ── */
    const upgrade = useCallback(async (plan = "pro", cycle = "monthly") => {
        const r = await fetch(`${API}/auth/upgrade`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ plan, cycle }),
        });
        const d = await r.json();
        if (!d.ok) throw new Error(d.error || "업그레이드 실패");
        setUser(d.user);
        localStorage.setItem(USER_KEY, JSON.stringify(d.user));
        return d.user;
    }, [token]);

    /* ── 결제 확인 후 user 상태 즉시 업데이트 ── */
    const onPaymentSuccess = useCallback((updatedUser) => {
        setUser(updatedUser);
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    }, []);

    /* ── [D-5 NEW] 데모→유료 전환 시 채널 creds 이관 ──────────────────────
     * 1. 데모 세션에서 저장된 채널 크레덴셜(genie_channel_creds)을 백엔드로 이관
     * 2. hasRealKeys 활성화 (실사용 모드)
     * 3. 샘플 데이터 플래그 초기화 (실제 데이터 수집 모드로 전환)
     */
    const upgradeToPro = useCallback(async (newToken, newUser) => {
        // 이관할 채널 creds 읽기
        let channelCreds = {};
        try {
            const raw = localStorage.getItem('genie_channel_creds');
            if (raw) channelCreds = JSON.parse(raw);
        } catch { /* ignore */ }

        // 채널 데이터 이관 API 호출
        if (Object.keys(channelCreds).length > 0 && newToken) {
            const BASE = import.meta.env?.VITE_API_BASE ?? '';
            fetch(`${BASE}/api/auth/migrate-creds`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${newToken}`,
                },
                body: JSON.stringify({ channelCreds }),
            }).catch(() => { /* 이관 실패 시 무시 (creds는 로컬에 남아있음) */ });
        }

        // 세션 저장
        if (newToken && newUser) {
            saveSession(newToken, newUser);
        }

        // hasRealKeys 활성화 + 샘플 데이터 제거 플래그
        localStorage.setItem(REAL_KEYS_FLAG, '1');
        localStorage.removeItem('genie__sample_override'); // 샘플 데이터 오버라이드 해제
        setHasRealKeys(true);

        // 업그레이드 된 user 상태 반영
        const upgradedUser = newUser || (user ? { ...user, plan: 'pro', subscription_status: 'active' } : null);
        if (upgradedUser) {
            setUser(upgradedUser);
            localStorage.setItem(USER_KEY, JSON.stringify(upgradedUser));
        }
        return upgradedUser;
    }, [user, saveSession]);

    /* ── 실사용 모드 즉시 활성화 (API 키 등록 시 호출) ──────────────────────
     * 1. 로컬 플래그 저장
     * 2. user.plan을 pro로 즉시 업데이트 (새로고침 없음)
     * 3. /auth/me 재호출로 서버 상태 동기화
     */
    const activateLiveMode = useCallback((updatedUser = null) => {
        localStorage.setItem(REAL_KEYS_FLAG, "1");
        setHasRealKeys(true);
        const newUser = updatedUser || (user ? { ...user, plan: user.plan === "" || user.plan === "free" ? "pro" : user.plan } : null);
        if (newUser) {
            setUser(newUser);
            localStorage.setItem(USER_KEY, JSON.stringify(newUser));
        }
    }, [user]);

    /* ── API 키 등록 콜백 (ApiKeys, SmartConnect 등에서 호출) ── */
    const onApiKeyRegistered = useCallback((channelData = {}) => {
        // 서버 응답에 user 정보가 있으면 바로 반영
        if (channelData.user) {
            activateLiveMode(channelData.user);
        } else {
            activateLiveMode();
        }
    }, [activateLiveMode]);

    /* ── 서버에서 최신 플랜 정보 가져오기 ── */
    const refreshPlan = useCallback(async () => {
        if (!token) return;
        try {
            const r = await fetch(`${API}/auth/plan-check`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (r.ok) {
                const d = await r.json();
                if (d.ok && d.plan) {
                    const updated = { ...user, plan: d.plan };
                    setUser(updated);
                    localStorage.setItem(USER_KEY, JSON.stringify(updated));
                    return d;
                }
            }
        } catch { }
        return null;
    }, [token, user]);

    /* ── 파생 상태 ── */
    const subscriptionExpiresAt = user?.subscription_expires_at ?? null;
    const subscriptionDaysLeft = subscriptionExpiresAt
        ? Math.max(0, Math.ceil((new Date(subscriptionExpiresAt) - Date.now()) / 86400000))
        : null;
    const subscriptionStatus = user?.subscription_status ?? "none";
    const isSubscriptionExpired = subscriptionStatus === "expired";

    /* 플랜 체크 (구독 만료 반영) */
    /* 🎪 데모 모드: 서버 plan과 무관하게 enterprise 강제 적용 (DB 수정 없이 전체 메뉴 접근 보장) */
    const userPlan = IS_DEMO_MODE ? "enterprise" : (isSubscriptionExpired ? "free" : (user?.plan ?? "free"));
    const isPro   = planRank(userPlan) >= 1;   // starter 이상
    const isPaid  = planRank(userPlan) >= 1;   // starter 이상 (= isPro alias)
    // isDemo: 체험용 데모는 무한 렌더링 방지를 위해 false 유지
    const isDemo  = false;
    const isFreeUser = userPlan === "free" && !hasRealKeys;    // 유료결제 전 무료가입 회원
    const isAdmin = userPlan === "admin" || IS_DEMO_MODE;

    /* 기능별 접근 가능 여부 확인 헬퍼 */
    const canAccess = useCallback((feature) => {
        const featureRequirements = {
            crm: "pro", email_marketing: "pro", kakao_channel: "pro",
            pixel_tracking: "pro", journey_builder: "pro", customer_ai: "pro",
            ab_testing: "pro", sms: "pro",
            api_access: "enterprise", white_label: "enterprise",
            admin_panel: "admin",
        };
        const required = featureRequirements[feature] ?? "pro";
        return planRank(userPlan) >= planRank(required);
    }, [userPlan]);

    /*
     * hasMenuAccess(menuKey)
     * menuKey 형식: "section||item" (|| 구분)
     * - admin/enterprise: 항상 허용
     * - /free: _ALLOWED_MENUS 화이트리스트만 허용 (유료/데모 완전 분리)
     * - starter/growth/pro: planMenuAccess(관리자 설정) 기반
     * - planMenuAccess 미로드 시 유료 사용자는 허용 (graceful degradation)
     */

    /*
     * ══════════════════════════════════════════════════════════
     * 데모(체험) 차단 메뉴 블랙리스트 — admin 페이지만 차단
     * ══════════════════════════════════════════════════════════
     * 데모 사용자는 admin 섹션(플랫폼 관리자)을 제외한
     * 모든 메뉴를 가상 샘플 데이터로 열람 가능.
     */
    const _BLOCKED_SECTIONS = [
        "admin||"      , // admin 섹션 전체
        "system||admin", // system 내 admin 메뉴
        "admin"         , // 최상위 admin
        "db_admin"      , // DB 관리자
        "user_mgmt"     , // 사용자 관리
    ];

    /*
     * hasMenuAccess(menuKey)
     * menuKey 형식: "section||item" (|| 구분)
     * - admin/enterprise: 항상 허용
     * - /free: _ALLOWED_MENUS 화이트리스트만 허용 (유료/데모 완전 분리)
     * - starter/growth/pro: planMenuAccess(관리자 설정) 기반
     * - planMenuAccess 미로드 시 유료 사용자는 허용 (graceful degradation)
     */
    const hasMenuAccess = useCallback((menuKey) => {
        if (!menuKey) return true;
        // admin/enterprise 사용자: 항상 허용
        if (["admin", "enterprise"].includes(userPlan)) return true;

        // ── 데모(/free) 사용자: admin 섹션만 차단, 나머지 전체 허용 ──
        if (planRank(userPlan) === 0) {
            const lk = (menuKey || "").toLowerCase();
            // admin 전용 섹션만 차단 (플랫폼 관리자 페이지)
            const isAdminSection =
                lk.startsWith("admin||") ||
                lk === "admin" ||
                lk.startsWith("system||admin") ||
                lk === "db_admin" ||
                lk.startsWith("db_admin||") ||
                lk === "user_mgmt" ||
                lk.startsWith("user_mgmt||");
            // admin 섹션이면 차단, 그 외 모두 허용 (가상 데이터로 열람 가능)
            return !isAdminSection;
        }

        // ── 유료 사용자(starter/growth/pro): planMenuAccess 기반 ──
        if (!planMenuAccess) return true; // 아직 로드 안 됨 → 허용(graceful)
        const allowedKeys = planMenuAccess[userPlan] || planMenuAccess["free"] || [];
        if (allowedKeys.length === 0) return true; // 권한 설정 없으면 허용
        return allowedKeys.some(k => k === menuKey || menuKey.startsWith(k));
    }, [userPlan, planMenuAccess]);

    return (
        <AuthContext.Provider value={{
            user, token, loading,
            login, register, logout, upgrade, upgradeToPro,
            onPaymentSuccess, refreshPlan, canAccess, hasMenuAccess,
            autoLogoutMin, setAutoLogoutMin,
            isDemoMode: IS_DEMO_MODE,
            isPro, isPaid, isDemo, isFreeUser, isAdmin,
            hasRealKeys, activateLiveMode, onApiKeyRegistered,
            subscriptionExpiresAt, subscriptionDaysLeft,
            subscriptionStatus, isSubscriptionExpired,
            plan: userPlan,
            planMenuAccess,
            reloadMenuAccess: () => { menuAccessLoadedRef.current = false; setPlanMenuAccess(null); loadMenuAccess(); },
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
