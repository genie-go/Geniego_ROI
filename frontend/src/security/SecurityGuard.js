/**
 * SecurityGuard — Enterprise Security Monitor v1.0
 * ─────────────────────────────────────────────────
 * • XSS injection detection (URL, input, postMessage)
 * • Brute-force login throttling
 * • CSRF token validation helper
 * • DevTools open detection
 * • Suspicious network request monitoring
 * • Rate limiter for sensitive endpoints
 * • Content-Security-Policy enforcement
 * • Real-time alert system via GlobalDataContext
 */
import { useEffect, useCallback, useRef } from 'react';

/* ══════════════════════════════════════════════════
   Constants & Configuration
══════════════════════════════════════════════════ */
const SECURITY_CONFIG = {
    MAX_LOGIN_ATTEMPTS: 5,
    LOGIN_LOCKOUT_MS: 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_WINDOW_MS: 60 * 1000,   // 1 minute
    MAX_API_CALLS_PER_MIN: 120,
    SESSION_TIMEOUT_MS: 30 * 60 * 1000,  // 30 minutes idle timeout (bank-grade)
    SESSION_ABSOLUTE_MS: 8 * 60 * 60 * 1000, // 8 hours absolute session limit
    TOKEN_REFRESH_WARN_MS: 5 * 60 * 1000, // Warn 5 min before expiry
    XSS_PATTERNS: [
        /<script\b[^>]*>/gi,
        /javascript\s*:/gi,
        /on\w+\s*=/gi,
        /eval\s*\(/gi,
        /document\.cookie/gi,
        /document\.write/gi,
        /\.innerHTML\s*=/gi,
        /window\.location\s*=/gi,
        /fetch\s*\(\s*['"`](?!\/api)/gi,
        /XMLHttpRequest/gi,
        /btoa|atob/gi,
    ],
    SUSPICIOUS_HEADERS: ['x-forwarded-for', 'x-real-ip', 'via'],
    LS_LOGIN_KEY: 'g_sec_login_attempts',
    LS_LOCKOUT_KEY: 'g_sec_lockout_until',
    LS_ALERTS_KEY: 'g_sec_alerts',
};

/* ══════════════════════════════════════════════════
   CSRF Token Management
══════════════════════════════════════════════════ */
let _csrfToken = null;

export function generateCSRFToken() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    _csrfToken = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem('g_csrf_token', _csrfToken);
    return _csrfToken;
}

export function getCSRFToken() {
    if (_csrfToken) return _csrfToken;
    _csrfToken = sessionStorage.getItem('g_csrf_token');
    if (!_csrfToken) return generateCSRFToken();
    return _csrfToken;
}

export function validateCSRFToken(token) {
    return token === getCSRFToken();
}

/* ══════════════════════════════════════════════════
   XSS Sanitizer
══════════════════════════════════════════════════ */
export function sanitizeInput(value) {
    if (typeof value !== 'string') return value;
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

export function detectXSS(value) {
    if (typeof value !== 'string') return false;
    return SECURITY_CONFIG.XSS_PATTERNS.some(pattern => pattern.test(value));
}

/* ══════════════════════════════════════════════════
   Brute-Force Login Protection
══════════════════════════════════════════════════ */
export function getLoginAttempts() {
    try {
        const raw = localStorage.getItem(SECURITY_CONFIG.LS_LOGIN_KEY);
        return raw ? JSON.parse(raw) : { count: 0, firstAt: 0 };
    } catch { return { count: 0, firstAt: 0 }; }
}

export function isLoginLocked() {
    try {
        const lockout = localStorage.getItem(SECURITY_CONFIG.LS_LOCKOUT_KEY);
        if (!lockout) return false;
        if (Date.now() < Number(lockout)) return true;
        // Lockout expired, clear
        localStorage.removeItem(SECURITY_CONFIG.LS_LOCKOUT_KEY);
        localStorage.removeItem(SECURITY_CONFIG.LS_LOGIN_KEY);
        return false;
    } catch { return false; }
}

export function recordLoginAttempt(success = false) {
    if (success) {
        localStorage.removeItem(SECURITY_CONFIG.LS_LOGIN_KEY);
        localStorage.removeItem(SECURITY_CONFIG.LS_LOCKOUT_KEY);
        return { locked: false };
    }

    const attempts = getLoginAttempts();
    const now = Date.now();

    // Reset window if older than lockout period
    if (now - attempts.firstAt > SECURITY_CONFIG.LOGIN_LOCKOUT_MS) {
        attempts.count = 0;
        attempts.firstAt = now;
    }

    attempts.count += 1;
    if (!attempts.firstAt) attempts.firstAt = now;
    localStorage.setItem(SECURITY_CONFIG.LS_LOGIN_KEY, JSON.stringify(attempts));

    if (attempts.count >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
        const lockUntil = now + SECURITY_CONFIG.LOGIN_LOCKOUT_MS;
        localStorage.setItem(SECURITY_CONFIG.LS_LOCKOUT_KEY, String(lockUntil));
        addSecurityAlert('critical', `🚨 Brute-force detected: ${attempts.count} failed login attempts. Account locked for 15 minutes.`);
        return { locked: true, remaining: attempts.count, lockUntil };
    }

    return { locked: false, remaining: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - attempts.count };
}

/* ══════════════════════════════════════════════════
   API Rate Limiter
══════════════════════════════════════════════════ */
const _apiCallLog = [];

export function checkRateLimit(endpoint = '') {
    const now = Date.now();
    // Remove calls outside window
    while (_apiCallLog.length > 0 && now - _apiCallLog[0] > SECURITY_CONFIG.RATE_LIMIT_WINDOW_MS) {
        _apiCallLog.shift();
    }
    _apiCallLog.push(now);

    if (_apiCallLog.length > SECURITY_CONFIG.MAX_API_CALLS_PER_MIN) {
        addSecurityAlert('warn', `⚠️ Rate limit exceeded: ${_apiCallLog.length} API calls in 1 minute (endpoint: ${endpoint})`);
        return false; // Blocked
    }
    return true; // Allowed
}

/* ══════════════════════════════════════════════════
   Security Alert System
══════════════════════════════════════════════════ */
function addSecurityAlert(level, message) {
    try {
        const raw = localStorage.getItem(SECURITY_CONFIG.LS_ALERTS_KEY);
        const alerts = raw ? JSON.parse(raw) : [];
        alerts.unshift({
            id: `SEC-${Date.now().toString(36)}`,
            level, // 'info' | 'warn' | 'critical'
            message,
            timestamp: new Date().toISOString(),
            read: false,
        });
        // Keep last 100 alerts
        localStorage.setItem(SECURITY_CONFIG.LS_ALERTS_KEY, JSON.stringify(alerts.slice(0, 100)));
    } catch { /* ignore */ }
}

export function getSecurityAlerts() {
    try {
        const raw = localStorage.getItem(SECURITY_CONFIG.LS_ALERTS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

export function clearSecurityAlerts() {
    localStorage.removeItem(SECURITY_CONFIG.LS_ALERTS_KEY);
}

/* ══════════════════════════════════════════════════
   Secure Fetch Wrapper
══════════════════════════════════════════════════ */
export async function secureFetch(url, options = {}) {
    // Rate limit check
    if (!checkRateLimit(url)) {
        throw new Error('Rate limit exceeded. Please wait before retrying.');
    }

    // Add CSRF token for state-changing requests
    const method = (options.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        options.headers = {
            ...options.headers,
            'X-CSRF-Token': getCSRFToken(),
            'X-Requested-With': 'XMLHttpRequest',
        };
    }

    // Add auth token (188차 P1: 미설정 'g_token' → 정식 키 genie_token/demo_genie_token 으로 수정. writeback 무인증 실패 해소)
    const token = localStorage.getItem('genie_token') || localStorage.getItem('demo_genie_token') || '';
    if (token) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
        };
    }

    // Timeout (10s default)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 10000);
    options.signal = controller.signal;

    try {
        const res = await fetch(url, options);
        clearTimeout(timeout);

        // Detect suspicious responses
        if (res.status === 401 || res.status === 403) {
            addSecurityAlert('warn', `🔒 Unauthorized request to ${url} (${res.status})`);
        }

        return res;
    } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
            addSecurityAlert('info', `⏱ Request timeout: ${url}`);
        }
        throw err;
    }
}

/* ══════════════════════════════════════════════════
   SecurityGuard React Hook — Runtime Monitor
══════════════════════════════════════════════════ */
export function useSecurityGuard({ addAlert, enabled = true } = {}) {
    const alertCallback = useRef(addAlert);
    alertCallback.current = addAlert;

    const notify = useCallback((type, msg) => {
        addSecurityAlert(type === 'critical' ? 'critical' : type === 'warn' ? 'warn' : 'info', msg);
        if (alertCallback.current) {
            alertCallback.current({ type: type === 'critical' ? 'error' : type, msg });
        }
        // Browser notification for critical alerts
        if (type === 'critical' && Notification.permission === 'granted') {
            new Notification('🚨 Security Alert — Geniego-ROI', { body: msg, icon: '/icon-192.png' });   // [280차] /favicon.ico 는 실존하지 않는 팬텀(SPA HTML 폴백 수신 → 아이콘 디코드 실패)
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;

        // ── Generate CSRF token on mount ──
        generateCSRFToken();

        // ── Request notification permission ──
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // ── 1. Monitor URL for XSS injection ──
        const checkUrl = () => {
            const url = window.location.href;
            if (detectXSS(decodeURIComponent(url))) {
                notify('critical', `🚨 XSS injection attempt detected in URL: ${url.slice(0, 100)}`);
                // Sanitize by removing malicious params
                window.history.replaceState(null, '', window.location.pathname);
            }
        };
        checkUrl();

        // ── 2. Monitor postMessage for suspicious origins ──
        const handleMessage = (e) => {
            const trustedOrigins = [window.location.origin, 'https://www.genieroi.com'];
            if (!trustedOrigins.includes(e.origin)) {
                notify('warn', `⚠️ Untrusted postMessage from ${e.origin}`);
                return;
            }
            if (typeof e.data === 'string' && detectXSS(e.data)) {
                notify('critical', `🚨 XSS payload detected via postMessage from ${e.origin}`);
            }
        };
        window.addEventListener('message', handleMessage);

        // ── 3. DevTools open detection 제거 (196차) ──
        //   창 크기 차이로 DevTools 를 추정해 "위협 감지" 알림을 띄우던 로직 제거.
        //   정상 디버깅/개발 행위를 위협으로 오인 표시(g_sec_alerts)해 사용자 혼란 → no-op.
        const devtoolsCheck = setInterval(() => { }, 600000);

        // ── 4. Monitor localStorage tampering ──
        const handleStorage = (e) => {
            if ((e.key === 'genie_token' || e.key === 'demo_genie_token') && e.oldValue && !e.newValue) {
                notify('warn', '⚠️ Auth token was cleared from another tab');
            }
            if (e.key?.startsWith('g_') && e.newValue && detectXSS(e.newValue)) {
                notify('critical', `🚨 XSS payload injected into localStorage key: ${e.key}`);
                localStorage.removeItem(e.key);
            }
        };
        window.addEventListener('storage', handleStorage);

        // ── 5. Console warning for social engineering ──
        console.log(
            '%c⚠️ STOP!',
            'color: red; font-size: 40px; font-weight: bold; text-shadow: 1px 1px 0 black;'
        );
        console.log(
            '%cThis is a browser feature intended for developers. If someone told you to copy-paste something here to enable a feature or "hack" an account, it\'s a scam and will give them access to your data.',
            'color: #f97316; font-size: 16px; font-weight: bold;'
        );

        // ── 6. Clickjacking protection ──
        if (window.self !== window.top) {
            notify('critical', '🚨 Page loaded in iframe — potential clickjacking attack');
            // Optionally break out of iframe
            // window.top.location = window.self.location;
        }

        // ── Cleanup ──
        return () => {
            window.removeEventListener('message', handleMessage);
            window.removeEventListener('storage', handleStorage);
            clearInterval(devtoolsCheck);
        };
    }, [enabled, notify]);
}

/* ══════════════════════════════════════════════════
   Content-Security-Policy Meta Tag Helper
══════════════════════════════════════════════════ */
export function injectCSPMeta() {
    // Only inject once
    if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;

    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https://ipapi.co https://*.genieroi.com https://*.geniego.com ws://localhost:*",
        "frame-ancestors 'self'",
        "base-uri 'self'",
        "form-action 'self'",
    ].join('; ');
    document.head.appendChild(meta);
}

/* ══════════════════════════════════════════════════
   Session Timeout Manager (Bank-Grade)
══════════════════════════════════════════════════ */
let _lastActivity = Date.now();
let _sessionStart = Date.now();
let _idleTimer = null;
let _absoluteTimer = null;

export function initSessionManager(onExpire) {
    _sessionStart = Date.now();
    _lastActivity = Date.now();

    // Track user activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const resetIdle = () => { _lastActivity = Date.now(); };
    activityEvents.forEach(evt => document.addEventListener(evt, resetIdle, { passive: true }));

    // [세션 타임아웃 SSOT — 260차] 유휴 자동 로그아웃 시간은 사용자 설정(auto_logout_min)을
    //   단일 진실원천으로 사용한다. AuthContext 프로필 "자동 로그아웃(유휴 시간)" 설정과 완전 일치.
    //   0/미설정이면 유휴 자동 로그아웃 비활성(강제 로그아웃 안 함).
    //   과거 하드코딩 30분(SESSION_TIMEOUT_MS)이 사용자 설정(예: 120분)을 무시하고 조기 로그아웃
    //   시키던 문제 해소 — 이 함수가 향후 배선되더라도 사용자 설정을 존중한다.
    const idleLimitMs = () => {
        try {
            const raw = localStorage.getItem('genie_auto_logout_min')
                     || localStorage.getItem('demo_genie_auto_logout_min') || '0';
            const min = parseInt(raw, 10) || 0;
            return min > 0 ? min * 60 * 1000 : 0;
        } catch (e) { return 0; }
    };

    // Idle timeout check (every 60s)
    _idleTimer = setInterval(() => {
        const limit = idleLimitMs();
        if (limit <= 0) return; // 사용자가 유휴 자동 로그아웃 비활성 → 강제 로그아웃 안 함
        const idle = Date.now() - _lastActivity;
        if (idle > limit) {
            addSecurityAlert('warn', `⏱ Session expired: ${Math.round(idle / 60000)}min idle`);
            cleanupSession();
            if (onExpire) onExpire('idle');
        }
    }, 60000);

    // Absolute session limit
    _absoluteTimer = setTimeout(() => {
        addSecurityAlert('warn', '⏱ Absolute session limit reached (8h)');
        cleanupSession();
        if (onExpire) onExpire('absolute');
    }, SECURITY_CONFIG.SESSION_ABSOLUTE_MS);

    return () => {
        activityEvents.forEach(evt => document.removeEventListener(evt, resetIdle));
        clearInterval(_idleTimer);
        clearTimeout(_absoluteTimer);
    };
}

function cleanupSession() {
    clearInterval(_idleTimer);
    clearTimeout(_absoluteTimer);
    // Clear sensitive data
    localStorage.removeItem('genie_token');
    localStorage.removeItem('g_token');
    sessionStorage.removeItem('g_csrf_token');
    _csrfToken = null;
}

/* ══════════════════════════════════════════════════
   Token Environment Isolation
══════════════════════════════════════════════════ */
// 180차: startsWith('demo') 는 실 데모호스트 roidemo.* 미매칭 → 데모에서 운영 토큰키 오선택 버그. demoEnv 정본으로 교정.
import { IS_DEMO } from '../utils/demoEnv';
const _isSecDemo = IS_DEMO;

export function getTokenKey() {
    return _isSecDemo ? 'geniego_demo_token' : 'genie_token';
}

export function getEnvPrefix() {
    return _isSecDemo ? 'geniego_demo_' : 'geniego_';
}

/* ══════════════════════════════════════════════════
   Request Fingerprinting (Anomaly Detection)
══════════════════════════════════════════════════ */
let _fingerprint = null;

export function getRequestFingerprint() {
    if (_fingerprint) return _fingerprint;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('GeniegROI-FP', 2, 2);
    const nav = [
        navigator.language,
        navigator.platform,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
    ].join('|');
    _fingerprint = btoa(nav).slice(0, 24);
    return _fingerprint;
}

/* ══════════════════════════════════════════════════
   Sensitive Data Masking (for logs/display)
══════════════════════════════════════════════════ */
export function maskSensitive(value, visibleChars = 4) {
    if (!value || typeof value !== 'string') return '****';
    if (value.length <= visibleChars) return '****';
    return value.slice(0, visibleChars) + '•'.repeat(Math.min(value.length - visibleChars, 20));
}

export function maskEmail(email) {
    if (!email || !email.includes('@')) return '****';
    const [user, domain] = email.split('@');
    return user.slice(0, 2) + '•••@' + domain;
}

export function maskPhone(phone) {
    if (!phone || phone.length < 7) return '****';
    return phone.slice(0, 3) + '-••••-' + phone.slice(-4);
}

/* ══════════════════════════════════════════════════
   Export all utilities
══════════════════════════════════════════════════ */
export default {
    generateCSRFToken,
    getCSRFToken,
    validateCSRFToken,
    sanitizeInput,
    detectXSS,
    isLoginLocked,
    recordLoginAttempt,
    checkRateLimit,
    secureFetch,
    getSecurityAlerts,
    clearSecurityAlerts,
    injectCSPMeta,
    useSecurityGuard,
    initSessionManager,
    getTokenKey,
    getEnvPrefix,
    getRequestFingerprint,
    maskSensitive,
    maskEmail,
    maskPhone,
};
