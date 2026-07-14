/**
 * Enterprise Session Expiry Warning Modal
 * =========================================
 * - 세션 만료 5분 전 경고
 * - 연장 버튼으로 세션 갱신
 * - 카운트다운 타이머
 */
import React, { useState, useEffect, useRef } from 'react';
import { allowNavigation } from '../services/unsavedGuard.js'; // [현 차수] 세션만료 이탈 시 미저장 경고 통과

const WARN_BEFORE   = 5 * 60 * 1000;     // 5 min before

// [세션 타임아웃 SSOT — 260차] 유휴 자동 로그아웃 시간은 사용자 설정(auto_logout_min)을 단일
//   진실원천으로 사용. AuthContext 프로필 "자동 로그아웃(유휴 시간)"과 완전 일치. 0/미설정이면 비활성.
//   과거 하드코딩 30분이 사용자 설정(예: 120분)을 무시하던 문제 해소.
function sessionTimeoutMs() {
  try {
    const raw = localStorage.getItem('genie_auto_logout_min')
             || localStorage.getItem('demo_genie_auto_logout_min') || '0';
    const min = parseInt(raw, 10) || 0;
    return min > 0 ? min * 60 * 1000 : 0;
  } catch (e) { return 0; }
}

// 262차: AuthContext 가 영속한 마지막 활동 시각(genie_last_activity / demo_ 폴백) 읽기.
//   백그라운드/재시작 후 복귀 시 인메모리 ref 대신 이 값을 기준으로 유휴를 계산해 SSOT 를 맞춘다.
function persistedLastActivity() {
  try {
    const raw = localStorage.getItem('genie_last_activity')
             || localStorage.getItem('demo_genie_last_activity') || '0';
    return parseInt(raw, 10) || 0;
  } catch (e) { return 0; }
}

export default function SessionExpiryWarning() {
  const [show, setShow] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    // 262차: 영속 활동시각으로 baseline 초기화(재시작/복귀 시 정확).
    const seed = persistedLastActivity();
    if (seed > 0) lastActivity.current = seed;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const reset = () => { lastActivity.current = Date.now(); };
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    // 탭 복귀 시 영속본으로 재동기화(백그라운드 동안 다른 탭 활동 반영).
    const onVis = () => { if (document.visibilityState === 'visible') { const p = persistedLastActivity(); if (p > lastActivity.current) lastActivity.current = p; } };
    document.addEventListener('visibilitychange', onVis);

    const timer = setInterval(() => {
      const SESSION_TIMEOUT = sessionTimeoutMs();
      if (SESSION_TIMEOUT <= 0) { setShow(false); return; } // 유휴 자동 로그아웃 비활성
      // 인메모리 ref 와 영속본 중 최신(가장 최근 활동)을 기준으로 계산.
      const p = persistedLastActivity();
      const last = p > lastActivity.current ? p : lastActivity.current;
      const idle = Date.now() - last;
      const left = SESSION_TIMEOUT - idle;

      if (left <= 0) {
        // Session expired — 유휴 초과. AuthContext 와 동일 키 정리(genie_/demo_ 양쪽).
        setShow(false);
        ['genie_token', 'demo_genie_token', 'genie_last_activity', 'demo_genie_last_activity'].forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
        try { sessionStorage.removeItem('genie_sess_active'); sessionStorage.removeItem('demo_genie_sess_active'); } catch (e) {}
        allowNavigation();
        window.location.href = '/login?reason=expired';
      } else if (left <= WARN_BEFORE) {
        setRemaining(Math.ceil(left / 1000));
        setShow(true);
      } else {
        setShow(false);
      }
    }, 1000);

    return () => {
      events.forEach(e => window.removeEventListener(e, reset));
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(timer);
    };
  }, []);

  const extend = () => {
    lastActivity.current = Date.now();
    setShow(false);
  };

  if (!show) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <>
      {/* Overlay */}
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 100000, backdropFilter: 'blur(4px)',
      }} />
      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)', zIndex: 100001,
        background: 'var(--surface-2, #fff)', borderRadius: 20,
        padding: '40px 36px', textAlign: 'center', maxWidth: 400, width: '90%',
        boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
        animation: 'modalPop 0.3s ease-out',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.2)',
        }}>
          <span style={{ fontSize: 32 }}>⏱️</span>
        </div>

        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-1, #1e293b)', marginBottom: 8 }}>
          Session Expiring Soon
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3, #64748b)', marginBottom: 20, lineHeight: 1.6 }}>
          Your session will expire due to inactivity.
        </div>

        {/* Countdown */}
        <div style={{
          fontSize: 36, fontWeight: 900, fontFamily: 'monospace',
          color: remaining < 60 ? '#ef4444' : '#f59e0b',
          marginBottom: 24, letterSpacing: 2,
        }}>
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={extend} style={{
            padding: '12px 32px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff',
            fontWeight: 800, fontSize: 14,
          }}>
            🔄 Extend Session
          </button>
          <button onClick={() => { window.location.href = '/login'; }} style={{
            padding: '12px 24px', borderRadius: 12, cursor: 'pointer',
            border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.8)',
            color: 'var(--text-2, #475569)', fontWeight: 700, fontSize: 13,
          }}>
            Logout
          </button>
        </div>
      </div>
      <style>{`@keyframes modalPop { from { opacity:0; transform:translate(-50%,-50%) scale(0.9); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }`}</style>
    </>
  );
}
