/**
 * Enterprise Session Expiry Warning Modal
 * =========================================
 * - 세션 만료 5분 전 경고
 * - 연장 버튼으로 세션 갱신
 * - 카운트다운 타이머
 */
import React, { useState, useEffect, useRef } from 'react';

const SESSION_TIMEOUT = 30 * 60 * 1000;  // 30 min
const WARN_BEFORE   = 5 * 60 * 1000;     // 5 min before

export default function SessionExpiryWarning() {
  const [show, setShow] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const reset = () => { lastActivity.current = Date.now(); };
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));

    const timer = setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      const left = SESSION_TIMEOUT - idle;

      if (left <= 0) {
        // Session expired
        setShow(false);
        localStorage.removeItem('genie_token');
        localStorage.removeItem('geniego_demo_token');
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
