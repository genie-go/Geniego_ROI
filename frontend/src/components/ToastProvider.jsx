/**
 * Enterprise Toast Notification System
 * ======================================
 * Global toast manager for success/error/warning/info messages
 */
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext(null);

const TOAST_ICONS = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
const TOAST_COLORS = {
  success: 'linear-gradient(135deg, rgba(34,197,94,0.95), rgba(16,185,129,0.95))',
  error: 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(220,38,38,0.95))',
  warning: 'linear-gradient(135deg, rgba(245,158,11,0.95), rgba(234,88,12,0.95))',
  info: 'linear-gradient(135deg, rgba(79,142,247,0.95), rgba(99,102,241,0.95))',
};

let _toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++_toastId;
    setToasts(prev => [...prev.slice(-4), { id, message, type, duration }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast Container */}
      <div style={{
        position: 'fixed', top: 20, right: 20, zIndex: 99998,
        display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360,
      }}>
        {toasts.map((toast, i) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            style={{
              padding: '14px 20px', borderRadius: 14, cursor: 'pointer',
              background: TOAST_COLORS[toast.type] || TOAST_COLORS.info,
              color: '#fff', fontWeight: 700, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 10,
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              animation: 'toastSlideIn 0.3s ease-out',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>{TOAST_ICONS[toast.type]}</span>
            <span style={{ lineHeight: 1.4 }}>{toast.message}</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toastSlideIn { from { opacity:0; transform:translateX(60px); } to { opacity:1; transform:translateX(0); } }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { addToast: () => {}, removeToast: () => {} };
  return ctx;
}

export default ToastProvider;
