import React, { useEffect, createContext, useCallback, useContext, useRef, useState, useMemo } from "react";
import { tChannelName } from '../utils/tenantStorage.js'; // 180차: 회원 격리 크로스탭
import { planRank, setPlanLabels } from "./plans.js";
import { menuAllowedByTier, isAdminOnlyMenu } from "./planMenuPolicy.js"; // 181차 플랜별 메뉴접근 초고도화
import { normalizeTeamRole, canWrite as canTeamRoleWrite, isReadOnlyRole } from "./teamRolePolicy.js"; // 183차 Phase3 팀역할 RBAC


export const AuthContext = createContext(null);

// ★Capacitor 네이티브 로그인 수정: 네이티브 앱은 https://localhost(Android)/capacitor://localhost(iOS)
//   스킴에서 서빙되므로 상대경로 "/api" 는 존재하지 않는 곳으로 호출돼 로그인/회원가입/admin 인증이 전부
//   실패한다. 빌드 시 주입되는 VITE_API_BASE(.env.capacitor=https://www.genieroi.com)를 접두해 절대 URL 로
//   강제한다. 웹/PWA 빌드는 VITE_API_BASE 미설정(빈 문자열) → 기존과 동일한 상대경로 "/api" 유지.
const API = (import.meta.env.VITE_API_BASE || "") + "/api";

/* ── 데모 모드 감지 (VITE_DEMO_MODE=true 로 빌드 시 활성화) ── */
const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

/* 데모/운영 localStorage 키 분리 — 세션 교차 오염 방지 */
const KEY_PREFIX = IS_DEMO_MODE ? "demo_genie_" : "genie_";
const TOKEN_KEY = KEY_PREFIX + "token";
const USER_KEY = KEY_PREFIX + "user";
const REAL_KEYS_FLAG = KEY_PREFIX + "has_real_keys";
const AUTO_LOGOUT_KEY = KEY_PREFIX + "auto_logout_min";
// 262차: 유휴 자동로그아웃 근본수정 — "마지막 활동 시각"을 localStorage 에 영속한다.
//   기존엔 lastActivityRef(메모리)만 있어 브라우저를 닫으면 유휴 타이머가 소실 → 설정시간이 지나도
//   로그아웃되지 않고 다음날 접속 시 자동로그인되던 결함. 로드 시점(restorableToken)에 이 값과 대조해
//   유휴 초과분을 계산, 초과 시 토큰 복원을 차단(재로그인 강제)한다.
const LAST_ACTIVITY_KEY = KEY_PREFIX + "last_activity";
// 189차 자동 로그인(remember-me): 토큰은 호환성을 위해 localStorage 에 두되,
//   영속 복원 여부는 REMEMBER_KEY(localStorage) + SESSION_ACTIVE_KEY(sessionStorage 센티넬)로 판별.
//   - remember=1: 브라우저 재시작 후에도 자동 복원(영속)
//   - remember=0: 같은 브라우징 세션(sessionStorage 유지)에서만 복원, 브라우저 종료 시 자동 로그인 안 함
const REMEMBER_KEY = KEY_PREFIX + "remember";
const SESSION_ACTIVE_KEY = KEY_PREFIX + "sess_active";

/** 저장된 토큰을 현재 정책(remember/세션 센티넬)에 따라 자동 복원할지 결정. */
function restorableToken() {
    try {
        const tok = localStorage.getItem(TOKEN_KEY);
        if (!tok) return null;
        // 262차 유휴 자동로그아웃 로드시 강제 — 활동시각 영속본과 대조(브라우저 재시작/종료 무관).
        //   유휴 설정(auto_logout_min>0) + 마지막 활동 이후 설정시간 경과 → 토큰 폐기(재로그인 강제).
        //   이 검사가 admin/일반 사용자 공통으로 "닫았다 다음날 접속 시 자동로그인" 을 차단한다.
        try {
            const alm = parseInt(localStorage.getItem(AUTO_LOGOUT_KEY) || "0", 10) || 0;
            if (alm > 0) {
                const last = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || "0", 10) || 0;
                if (last > 0 && (Date.now() - last) >= alm * 60 * 1000) {
                    localStorage.removeItem(TOKEN_KEY);
                    localStorage.removeItem(USER_KEY);
                    try { sessionStorage.removeItem(SESSION_ACTIVE_KEY); } catch {}
                    return null;
                }
            }
        } catch {}
        // 이미 활성 브라우징 세션(현재 탭) → 항상 복원
        if (sessionStorage.getItem(SESSION_ACTIVE_KEY) === "1") return tok;
        // 명시적 영속(자동 로그인 체크) → 복원
        if (localStorage.getItem(REMEMBER_KEY) === "1") {
            try { sessionStorage.setItem(SESSION_ACTIVE_KEY, "1"); } catch {}
            return tok;
        }
        // admin 계정은 보안상 비영속: 새 브라우저 세션/새 탭에서 재인증(접속키) 요구.
        let cachedPlan = "";
        try { const u = JSON.parse(localStorage.getItem(USER_KEY) || "null"); cachedPlan = u?.plan || u?.plans || ""; } catch {}
        if (cachedPlan === "admin") {
            // 260차: admin 이 "유휴 자동 로그아웃"을 명시 설정했으면(보안 경계 존재) 세션을 영속한다.
            //   → "설정한 시간(예: 120분) 동안 유지, 그 후 유휴 로그아웃" 요구 충족(새 탭/재시작에도 유지).
            //   미설정 시에는 기존대로 비영속(새 세션 접속키 재인증) 유지 = 안전한 기본값.
            const alm = parseInt(localStorage.getItem(AUTO_LOGOUT_KEY) || "0", 10) || 0;
            if (alm <= 0) return null;
            try { sessionStorage.setItem(SESSION_ACTIVE_KEY, "1"); } catch {}
            return tok;
        }
        // 192차 로그아웃 버그 수정: 일반 사용자는 영속 세션이 기본(엔터프라이즈 SaaS).
        //   새 탭/창·브라우저 재시작·홈("/") 이동에도 로그인 유지. 189차 비영속 기본값이
        //   "로그아웃 안 했는데 로그아웃" 호소의 근본 원인이었음. 보안 제어는 명시적 로그아웃 +
        //   idle 자동 로그아웃(autoLogoutMin)으로 수행한다.
        try { sessionStorage.setItem(SESSION_ACTIVE_KEY, "1"); } catch {}
        return tok;
    } catch { return null; }
}

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => restorableToken());
    const [user, setUser] = useState(() => {
        try {
            if (!restorableToken()) return null; // 토큰 복원이 차단되면 user 도 복원하지 않음
            return JSON.parse(localStorage.getItem(USER_KEY) || "null");
        } catch { return null; }
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
    const lastPersistRef = useRef(0); // 262차: 활동시각 영속 throttle

    const setAutoLogoutMin = useCallback((min) => {
        const v = Math.max(0, parseInt(min, 10) || 0);
        setAutoLogoutMinState(v);
        localStorage.setItem(AUTO_LOGOUT_KEY, String(v));
        localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now())); // 262차: 설정 즉시 baseline
        lastActivityRef.current = Date.now(); // 설정 변경 시 타이머 리셋
        // 262차: 서버측 유휴 강제의 진실원천으로 임계를 서버에 영속(fire-and-forget).
        try {
            const tok = localStorage.getItem(TOKEN_KEY);
            if (tok) {
                fetch(`${API}/auth/profile`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
                    body: JSON.stringify({ auto_logout_min: v }),
                }).catch(() => {});
            }
        } catch { /* ignore */ }
    }, []);

    /* 사용자 활동 감지 → 마지막 활동 시각 갱신(+ 영속). 262차: localStorage 영속으로 재시작에도 유휴 계산 유지. */
    useEffect(() => {
        if (!token || autoLogoutMin <= 0) return;
        // 세션 시작(로그인/로드) 시 활동시각 baseline 을 현재로 기록.
        try { localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now())); } catch {}
        lastPersistRef.current = Date.now();
        const onActivity = () => {
            const now = Date.now();
            lastActivityRef.current = now;
            // 매 이벤트마다 쓰지 않고 5초 throttle(디스크/성능).
            if (now - lastPersistRef.current > 5000) {
                lastPersistRef.current = now;
                try { localStorage.setItem(LAST_ACTIVITY_KEY, String(now)); } catch {}
            }
        };
        const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
        events.forEach(e => window.addEventListener(e, onActivity, { passive: true }));
        return () => events.forEach(e => window.removeEventListener(e, onActivity));
    }, [token, autoLogoutMin]);

    /* 262차: 기존 클라이언트 유휴 설정을 서버로 1회 동기화(서버측 유휴 강제 진실원천 채우기).
       사용자가 재설정하지 않아도 다음 로그인 시 서버가 임계를 알게 됨. 값 변경 시마다 1회만 전송. */
    const almSyncedRef = useRef(0);
    useEffect(() => {
        if (!token || autoLogoutMin <= 0) return;
        if (almSyncedRef.current === autoLogoutMin) return;
        almSyncedRef.current = autoLogoutMin;
        fetch(`${API}/auth/profile`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ auto_logout_min: autoLogoutMin }),
        }).catch(() => {});
    }, [token, autoLogoutMin]);

    /* Idle 체크 인터벌(15초) + 탭 복귀 즉시 재검사. 262차: 백그라운드 스로틀/복귀 시에도 유휴 초과 즉시 로그아웃. */
    useEffect(() => {
        if (idleTimerRef.current) { clearInterval(idleTimerRef.current); idleTimerRef.current = null; }
        if (!token || autoLogoutMin <= 0) return;
        const timeoutMs = autoLogoutMin * 60 * 1000;
        const doLogout = () => {
            if (idleTimerRef.current) { clearInterval(idleTimerRef.current); idleTimerRef.current = null; }
            setToken(null); setUser(null);
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            try { sessionStorage.removeItem(SESSION_ACTIVE_KEY); } catch {}
            try { window.location.href = "/login?reason=idle"; } catch {}
        };
        // 영속 활동시각과 메모리 ref 중 최신(=가장 최근 활동)을 기준으로 경과 계산.
        const checkIdle = () => {
            let last = lastActivityRef.current;
            try { const p = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || "0", 10) || 0; if (p > last) last = p; } catch {}
            if (Date.now() - last >= timeoutMs) doLogout();
        };
        idleTimerRef.current = setInterval(checkIdle, 15000);
        const onVis = () => { if (document.visibilityState === "visible") checkIdle(); };
        document.addEventListener("visibilitychange", onVis);
        window.addEventListener("focus", onVis);
        return () => {
            if (idleTimerRef.current) clearInterval(idleTimerRef.current);
            document.removeEventListener("visibilitychange", onVis);
            window.removeEventListener("focus", onVis);
        };
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
            const labelMap = {};
            d.plans.forEach(p => {
                map[p.id] = p.menuAccess || [];
                if (p.id && p.name) labelMap[p.id] = p.name; // 202차: admin 변경 플랜명 전파
            });
            setPlanMenuAccess(map);
            setPlanLabels(labelMap); // 동적 표시명 주입 → planLabel() 전역 일치
            menuAccessLoadedRef.current = true;
        } catch { /* silent */ }
    }, []);

    useEffect(() => { loadMenuAccess(); }, [loadMenuAccess]);

    /*
     * 169차 P4 완벽 동기화: PlanPricing admin save 시 발행되는 sync event 수신.
     * - BroadcastChannel: cross-tab (다른 브라우저 탭의 user)
     * - custom event: same-tab (admin 본인 탭)
     * 둘 다 menuAccessLoadedRef 리셋 + loadMenuAccess() 재호출 → sidebar 자동 갱신.
     */
    useEffect(() => {
        const reload = () => {
            menuAccessLoadedRef.current = false;
            setPlanMenuAccess(null);
            loadMenuAccess();
        };
        let bc = null;
        try {
            bc = new BroadcastChannel(tChannelName("geniego_menu_access_sync"));
            bc.onmessage = (e) => { if (e.data?.type === "menu_access_updated") reload(); };
        } catch { /* unsupported */ }
        const sameTabHandler = () => reload();
        window.addEventListener("menu-access-saved", sameTabHandler);
        return () => {
            try { bc?.close(); } catch {}
            window.removeEventListener("menu-access-saved", sameTabHandler);
        };
    }, [loadMenuAccess]);

    const saveSession = useCallback((tok, usr, remember) => {
        setToken(tok);
        setUser(usr);
        localStorage.setItem(TOKEN_KEY, tok);
        localStorage.setItem(USER_KEY, JSON.stringify(usr));
        // 189차 자동 로그인: remember 미지정(세션 중 갱신 저장)은 기존 영속 설정 유지.
        //   admin 계정은 보안상 항상 비영속(브라우저 재시작 시 재인증 — 접속키 필수).
        try {
            let rememberFlag = remember;
            if (rememberFlag === undefined) rememberFlag = localStorage.getItem(REMEMBER_KEY) === "1";
            if ((usr?.plan === "admin") || (usr?.plans === "admin")) rememberFlag = false;
            localStorage.setItem(REMEMBER_KEY, rememberFlag ? "1" : "0");
            sessionStorage.setItem(SESSION_ACTIVE_KEY, "1"); // 현재 브라우징 세션 활성 표시
        } catch { /* ignore */ }
        // 180차 멀티테넌트: 계정 식별자 영속 → tenantStorage 격리 스코프 + API X-Tenant-ID 활성화
        try {
            const tid = usr?.tenant_id || usr?.tenantId;
            if (tid) localStorage.setItem('tenantId', String(tid));
        } catch { /* ignore */ }
        // 262차: 서버가 보관한 유휴 임계를 클라가 채택(다른 기기서 설정한 값 동기화).
        //   로컬 미설정(0)일 때만 서버값을 반영 → 로컬 최신 설정을 덮어쓰지 않음.
        try {
            const srvAlm = parseInt(usr?.auto_logout_min ?? usr?.profile?.auto_logout_min ?? 0, 10) || 0;
            const localAlm = parseInt(localStorage.getItem(AUTO_LOGOUT_KEY) || "0", 10) || 0;
            if (srvAlm > 0 && localAlm === 0) {
                localStorage.setItem(AUTO_LOGOUT_KEY, String(srvAlm));
                localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
                setAutoLogoutMinState(srvAlm);
            }
        } catch { /* ignore */ }
    }, []);

    // 180차: user 변경(로그인/me 갱신) 시 tenantId 동기화 — 어떤 경로로 user 가 세팅돼도 격리 식별자 보장
    useEffect(() => {
        try {
            const tid = user?.tenant_id || user?.tenantId;
            if (tid) localStorage.setItem('tenantId', String(tid));
        } catch { /* ignore */ }
    }, [user]);

    /* ══════════════════════════════════════════════════════════════════
     * 앱 로드 시 /auth/me 호출 → 최신 plan/구독 상태 동기화
     * ── 새로고침 시 로그아웃 방지 (데모 모드 + 운영 모드 모두) ──
     * 401 응답 시에도 로컬 캐시가 유효하면 세션을 유지합니다.
     * ══════════════════════════════════════════════════════════════════ */
    useEffect(() => {
        if (!token) return;
        // 로컬 오프라인 토큰 (서버 없는 개발환경) → 서버 호출 건너뜀
        if (token.startsWith("local_admin_") || token.startsWith("local__")) return;
        // [272차 대행사 전기능 브릿지] agt_ 토큰(대행사 세션)은 user_session 이 아니므로 /auth/me 를 호출하지 않는다.
        //   대행사가 클라이언트로 전환하면 합성 user(클라이언트 스코프)로 전 앱을 운영하며, 데이터는 미들웨어가
        //   agt_→클라이언트 tenant 주입으로 격리한다. 일반 사용자는 agt_ 를 갖지 않아 이 경로 무관(회귀0).
        if (token.startsWith("agt_")) return;
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

                            // 188차 P1 보안: 인증된 /auth/me 응답의 서버 plan 을 신뢰한다(다운그레이드/만료 즉시 반영).
                            // 과거엔 planRank(server) >= planRank(cached) 조건일 때만 서버 plan 을 채택해, 관리자가
                            // 강등하거나 구독이 만료돼도 상위 캐시 plan(메뉴·기능 권한)이 잔존하는 권한상승 버그가 있었다.
                            // 전송 실패(401/5xx/빈응답)는 위에서 별도로 캐시 유지 처리하므로, 정상 응답은 서버를 신뢰한다.
                            const cachedPlan = cached?.plan || "";
                            const serverPlan = d.user.plan || cachedPlan;

                            // 서버 user + 로컬 캐시 merge (id/email 등 로컬 필드 보존, plan·권한은 서버 신뢰)
                            const merged = {
                                ...(cached || {}),
                                ...d.user,
                                plan: serverPlan,
                                plans: d.user.plans || serverPlan,
                                subscription_status: d.user.subscription_status || serverPlan,
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

    /* ── 로컬 전용 계정 정의 (서버 없을 때 폴백) ──
     * 189차 보안: 하드코딩 admin 자격증명이 프로덕션 번들에 노출되면 클라이언트측 백도어가 된다
     * (188차에서 백엔드 마스터 패스워드 백도어를 제거한 것과 동일 취지). 개발 빌드에서만 활성화한다.
     */
    const LOCAL_ACCOUNTS = import.meta.env.DEV ? [
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
    ] : [];

    /* ── 로그인 (실제 서버, 실패 시 로컬 폴백) ── */
    const login = useCallback(async (email, password, loginType = "", accessKey = "", otp = "", remember = false) => {
        setLoading(true);
        try {
            const r = await fetch(`${API}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, login_type: loginType, access_key: accessKey, otp }),
            });

            // 서버 응답이 403 또는 HTML 응답(서버 미작동) → 로컬 폴백 시도
            const contentType = r.headers.get("content-type") || "";
            if (r.status === 403 || r.status === 502 || r.status === 503 || !contentType.includes("json")) {
                // 로컬 계정 확인
                const localMatch = LOCAL_ACCOUNTS.find(a => a.email === email.trim() && a.password === password);
                if (localMatch) {
                    const token = "local_admin_" + Date.now();
                    saveSession(token, localMatch.user, remember);
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
                    saveSession(token, localMatch.user, remember);
                    return localMatch.user;
                }
            }

            // 189차 MFA: 비밀번호는 맞으나 2단계 인증 코드 필요 → 호출측(AuthPage)에 OTP 입력 신호
            if (!d.ok && d.mfa_required) {
                const mfaErr = new Error(d.error || "2단계 인증 코드를 입력하세요.");
                mfaErr.mfaRequired = true;
                mfaErr.mfaMethod = d.mfa_method || "totp"; // 195차 #3: 인증 방식(email/sms/kakao/totp)
                mfaErr.otpSent = !!d.otp_sent;
                throw mfaErr;
            }

            if (!d.ok) {
                const e = new Error(d.error || "로그인 실패");
                // [현 차수] 데모↔운영 사이트 혼동: 올바른 사이트 안내(클릭 이동)를 호출측(AuthPage)에 전달.
                if (d.wrong_site) { e.wrongSite = true; e.correctUrl = d.correct_url || ""; e.correctSite = d.correct_site || ""; }
                throw e;
            }
            saveSession(d.token, d.user, remember);
            return d.user;

        } catch (e) {
            // 네트워크 완전 오류 (오프라인) → 로컬 폴백
            if (e.message && (e.message.includes("fetch") || e.message.includes("network") || e.message.includes("Failed"))) {
                const localMatch = LOCAL_ACCOUNTS.find(a => a.email === email.trim() && a.password === password);
                if (localMatch) {
                    const token = "local_admin_" + Date.now();
                    saveSession(token, localMatch.user, remember);
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
        localStorage.removeItem(REMEMBER_KEY);            // 189차 자동 로그인 플래그 정리
        localStorage.removeItem(LAST_ACTIVITY_KEY);       // 262차: 유휴 활동시각 영속본 정리
        try { sessionStorage.removeItem(SESSION_ACTIVE_KEY); } catch {}
        localStorage.removeItem('tenantId'); // 180차: 회원 전환 시 이전 계정 격리 식별자 제거(누출 차단)
        // 180차: 회원 sessionStorage(같은 탭 순차 로그인 누출 방지) 정리 — aihub_* 등 비즈니스 캐시
        try {
            Object.keys(sessionStorage).forEach(k => {
                if (/^aihub_|^sc_auto_|^g_/.test(k)) sessionStorage.removeItem(k);
            });
        } catch { /* ignore */ }
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

    /* ── [현 차수] 프로필(회사 상세정보) 수정 — PATCH /auth/profile → 로컬 user 즉시 갱신 ──
     *  회원가입/프로필관리에서 등록한 회사정보를 한 곳에 영속화하고, 발급신청 등에서 재사용(중복입력 제거). */
    const updateProfile = useCallback(async (fields = {}) => {
        if (!token) return { ok: false, error: 'not_authenticated' };
        try {
            const r = await fetch(`${API}/auth/profile`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(fields),
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok || !d.ok) return { ok: false, error: d.error || `http_${r.status}` };
            if (d.user) {
                setUser(d.user);
                localStorage.setItem(USER_KEY, JSON.stringify(d.user));
            }
            return { ok: true, user: d.user || null };
        } catch (e) {
            return { ok: false, error: String(e?.message || e) };
        }
    }, [token]);

    /* ── 파생 상태 ── */
    const subscriptionExpiresAt = user?.subscription_expires_at ?? null;
    const subscriptionDaysLeft = subscriptionExpiresAt
        ? Math.max(0, Math.ceil((new Date(subscriptionExpiresAt) - Date.now()) / 86400000))
        : null;
    const subscriptionStatus = user?.subscription_status ?? "none";
    const isSubscriptionExpired = subscriptionStatus === "expired";

    /* 플랜 체크 (구독 만료 반영) */
    /* 🎪 데모 모드: 서버 plan과 무관하게 enterprise 강제 적용 (DB 수정 없이 전체 메뉴 접근 보장)
       ★207차: 단, admin(플랫폼 운영자) 계정은 데모에서도 'admin' 으로 보존한다.
       기존엔 데모가 admin 계정마저 'enterprise'로 강제해, hasMenuAccess(userPlan==='admin'만 통과)가
       관리자 메뉴를 막고 "Admin Plan 으로 업그레이드"(구매 불가 역할) 구독화면을 띄우던 버그. */
    const _isAdminAccount = (user?.plan === "admin") || (user?.plans === "admin");
    const userPlan = IS_DEMO_MODE
        ? (_isAdminAccount ? "admin" : "enterprise")
        : (isSubscriptionExpired ? "free" : (user?.plan ?? "free"));
    const isPro   = planRank(userPlan) >= 1;   // starter 이상
    const isPaid  = planRank(userPlan) >= 1;   // starter 이상 (= isPro alias)
    // isDemo: 체험용 데모는 무한 렌더링 방지를 위해 false 유지
    const isDemo  = false;
    const isFreeUser = userPlan === "free" && !hasRealKeys;    // 유료결제 전 무료가입 회원
    // ★207차 보안: admin 권한은 '실제 admin 계정(userPlan==="admin")'만 부여.
    //   기존 `|| IS_DEMO_MODE`는 모든 데모 회원을 admin 으로 만들어 사이드바 ADMIN_MENU·admin 기능이
    //   데모 회원에게 노출되던 치명 갭. 요구사항: admin 계정은 데모·운영 양쪽 접근 가능(userPlan 보존으로
    //   데모에서도 admin 유지), 데모회원·운영회원은 admin 절대 접근 불가.
    const isAdmin = userPlan === "admin";

    /* ── [현 차수] 하위 관리자(sub-admin) 체계 ──
     * 최고관리자(master)가 발급한 하위 관리자는 plan='admin'이되 admin_level='sub'.
     * 부여받은 메뉴(admin_menus: 경로 배열)만 접근 가능. 최고관리자는 전체 접근.
     * 홈(종합 대시보드)은 안정적 랜딩을 위해 항상 허용. */
    const isSubAdmin = isAdmin && (user?.admin_level === "sub");
    const _SUB_ALWAYS = ["/dashboard"];
    // [231차 #4] admin_menus 가 {경로:'view'|'edit'} 맵(신) 또는 경로배열(레거시) — 양형 정규화.
    const _adminMenuPaths = (am) => Array.isArray(am) ? am : (am && typeof am === "object" ? Object.keys(am) : []);
    const subMenuAllowed = useCallback((to) => {
        if (!isSubAdmin) return true;
        if (!to) return true;
        if (_SUB_ALWAYS.includes(to)) return true;
        const paths = _adminMenuPaths(user?.admin_menus);
        // 부여된 경로(정확) 또는 그 하위 경로(예: /crm → /crm/123) 허용.
        return paths.some((p) => to === p || to.startsWith(p + "/"));
    }, [isSubAdmin, user]);
    /* [231차 #4] 하위관리자 메뉴 권한 레벨: 'view'|'edit'|null. master/비-sub 은 항상 'edit'. 페이지가 읽기전용 게이팅에 사용. */
    const adminMenuLevel = useCallback((to) => {
        if (!isSubAdmin) return "edit";
        if (!to || _SUB_ALWAYS.includes(to)) return "edit";
        const am = user?.admin_menus;
        if (Array.isArray(am)) return am.some((p) => to === p || to.startsWith(p + "/")) ? "edit" : null;
        if (am && typeof am === "object") {
            if (am[to]) return am[to];
            const parent = Object.keys(am).find((p) => to.startsWith(p + "/"));
            return parent ? am[parent] : null;
        }
        return null;
    }, [isSubAdmin, user]);

    /* ── 183차 Phase3: 테넌트 내 팀 역할(team_role) RBAC ──
     * owner > manager > member. admin/데모는 항상 전체 쓰기(우회).
     * member 만 읽기 전용. 미지정 역할은 owner 로 정규화(기존 안정성 보존). */
    const teamRole = normalizeTeamRole(user?.team_role);
    const isReadOnlyMember = !isAdmin && isReadOnlyRole(user?.team_role);
    /* canTeamWrite(action?) — UI 쓰기 버튼 게이팅용. admin/데모 우회 포함. */
    const canTeamWrite = useCallback((action) => {
        if (isAdmin) return true;
        return canTeamRoleWrite(user?.team_role, action);
    }, [isAdmin, user]);

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
        // ── 최상위 admin: 모든 메뉴 허용 ──
        if (userPlan === "admin") return true;

        // ── 플랫폼 관리(admin 전용) 메뉴: admin 외 전원 차단 (enterprise 포함, 은행급 격리) ──
        if (isAdminOnlyMenu(menuKey)) return false;

        // ── enterprise: admin 전용 외 전체 허용 ──
        if (userPlan === "enterprise") return true;

        // ── 203차: 데모(체험) 환경은 데모 빌드(VITE_DEMO_MODE)에서 userPlan="enterprise" 로
        //   강제되므로 위 enterprise 분기로 전체 미리보기를 유지한다(아래 흐름 미도달).
        //   실(운영) Free 플랜 사용자는 더 이상 전체 개방하지 않고, 정책(MENU_MIN_PLAN: Free=핵심 12개)
        //   대로 tier 게이팅한다(상위 메뉴는 PlanGate 업그레이드 유도 — 사방넷식 평생무료+업셀 분리).
        //   ※ 기존 `planRank===0 → return true` 가 운영 Free 게이팅을 무력화하던 갭 해소(전수감사 발견).

        // ── Free 포함 유료/무료 사용자(free/starter/growth/pro) ──
        // 1) 관리자(MenuAccessManager/PlanPricing)가 설정한 plan_menu_access 가 있으면 우선
        if (planMenuAccess) {
            const allowedKeys = planMenuAccess[userPlan] || planMenuAccess["free"];
            if (Array.isArray(allowedKeys) && allowedKeys.length > 0) {
                // 202차 하위호환: commerce_channel(옴니/카탈로그/주문)은 기존 coarse "ops" 에서
                //   분리됨. admin 이 신규 추천을 재저장하기 전, ops 를 보유한 유료 플랜이 해당
                //   메뉴 접근을 잃지 않도록 ops 보유 시 commerce_channel 도 허용(회귀 방지).
                if (menuKey === "commerce_channel" && allowedKeys.includes("ops")) return true;
                return allowedKeys.some(k => k === menuKey || menuKey.startsWith(k));
            }
        }
        // 2) 관리자 설정 부재 시: 정본 기본 등급으로 fail-secure 강제 (181차 — 기존 전체허용 해소)
        return menuAllowedByTier(userPlan, menuKey);
    }, [userPlan, planMenuAccess]);

    return (
        <AuthContext.Provider value={{
            user, token, loading,
            login, register, logout, upgrade, upgradeToPro,
            onPaymentSuccess, refreshPlan, updateProfile, canAccess, hasMenuAccess,
            autoLogoutMin, setAutoLogoutMin,
            isDemoMode: IS_DEMO_MODE,
            isPro, isPaid, isDemo, isFreeUser, isAdmin,
            isSubAdmin, subMenuAllowed, adminMenuLevel, // [현 차수] 하위 관리자 메뉴 게이팅 + [231차 #4] view/edit 레벨
            adminLevel: isAdmin ? (user?.admin_level === "sub" ? "sub" : "master") : null,
            agentMode: ["recommend", "approval", "auto"].includes(user?.agent_mode) ? user.agent_mode : "approval", // [231차 OS#4] AI Agent 권한모드
            hasRealKeys, activateLiveMode, onApiKeyRegistered,
            subscriptionExpiresAt, subscriptionDaysLeft,
            subscriptionStatus, isSubscriptionExpired,
            plan: userPlan,
            teamRole, isReadOnlyMember, canTeamWrite, // 183차 Phase3 팀역할 RBAC
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
