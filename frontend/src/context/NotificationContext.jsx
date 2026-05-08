import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";


const NotificationContext = createContext(null);

/* ─── Notification 유형 Settings ────────────────────────────────────────────────────────── */
export const NOTIF_TYPES = {
  feedback:  { icon: "💬", color: "#4f8ef7", label: "피드백" },
  review:    { icon: "⭐", color: "#eab308", label: "리뷰·UGC" },
  order:     { icon: "📦", color: "#22c55e", label: "Orders" },
  alert:     { icon: "🚨", color: "#ef4444", label: "Notification 정책" },
  connector: { icon: "🔌", color: "#a855f7", label: "커넥터" },
  ai:        { icon: "🤖", color: "#14d9b0", label: "AI 자동화" },
  stock:     { icon: "📊", color: "#f97316", label: "재고" },
  campaign:  { icon: "🎯", color: "#6366f1", label: "캠페인" },
  system:    { icon: "⚙️", color: "#8da4c4", label: "시스템" },
};

/* ─── 초기 데모 Notification ─────────────────────────────────────────────────────────── */
const _NOTIFICATIONS = [
  {
    id: "d1",
    type: "review",
    title: "부정 리뷰 급증 감지",
    body: "Coupang Channel에서 \"배송 지연\" 키워드가 +12건 증가했습니다.",
    time: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    read: false,
    link: "/reviews-ugc",
  },
  {
    id: "d2",
    type: "connector",
    title: "Rakuten 웹훅 수신",
    body: "order.new 이벤트가 수신되었습니다. (RK-20260304-00128)",
    time: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    read: false,
    link: "/connectors",
  },
  {
    id: "d3",
    type: "ai",
    title: "AI 룰 엔진 자동 Run",
    body: "ROAS < 1.5 조건 감지 → 광고 Budget 30% 자동 삭감이 Run되었습니다.",
    time: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    read: true,
    link: "/ai-rule-engine",
  },
  {
    id: "d4",
    type: "order",
    title: "신규 Orders 14건 입고",
    body: "Amazon KR Channel에서 신규 Orders 14건이 접수되었습니다.",
    time: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    read: true,
    link: "/order-hub",
  },
  {
    id: "d5",
    type: "stock",
    title: "재고 부족 경고",
    body: "에르고 마우스 (MS-ERG-BL) 재고가 0개입니다. 즉시 발주가 필요합니다.",
    time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    read: true,
    link: "/operations",
  },
];

const LS_KEY = "geniego_notifications";

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return null;
}

function saveToStorage(items) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items.slice(0, 100)));
  } catch (_) {}
}

/* ─── Provider ───────────────────────────────────────────────────────────────── */
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(() => {
    const stored = loadFromStorage();
    return stored && stored.length > 0 ? stored : _NOTIFICATIONS;
  });

  // 토스트 표시 상태 (최신 Notification 1건)
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    saveToStorage(notifications);
  }, [notifications]);

  /* 새 Notification Add */
  const pushNotification = useCallback((item) => {
    const newItem = {
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      time: new Date().toISOString(),
      read: false,
      ...item,
    };
    setNotifications(prev => {
      const next = [newItem, ...prev].slice(0, 100);
      saveToStorage(next);
      return next;
    });
    // 토스트 표시
    setToast(newItem);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  /* 읽음 처리 */
  const markRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  /* All 읽음 */
  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  /* Delete */
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  /* All Delete */
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      pushNotification,
      markRead,
      markAllRead,
      removeNotification,
      clearAll,
    }}>
      {children}
      {/* 전역 토스트 */}
      {toast && <NotifToast item={toast} onClose={() => setToast(null)} />}
    </NotificationContext.Provider>
  );
}

/* ─── 토스트 컴포넌트 ─────────────────────────────────────────────────────────── */
function NotifToast({ item, onClose }) {
  const cfg = NOTIF_TYPES[item.type] || NOTIF_TYPES.system;
  return (
    <div style={{
      position: "fixed",
      bottom: 28,
      right: 28,
      zIndex: 9999,
      background: "rgba(10,16,30,0.97)",
      border: `1px solid ${cfg.color}44`,
      borderLeft: `4px solid ${cfg.color}`,
      borderRadius: 14,
      padding: "14px 18px",
      minWidth: 300,
      maxWidth: 400,
      boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px ${cfg.color}22`,
      animation: "slideInRight 0.3s cubic-bezier(.4,0,.2,1)",
      backdropFilter: "blur(20px)",
    }}>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>{cfg.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-1)", marginBottom: 3 }}>{item?.title}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>{item?.body}</div>
          <div style={{
            marginTop: 4, fontSize: 9, display: "inline-block",
            padding: "1px 7px", borderRadius: 99,
            background: `${cfg.color}18`, border: `1px solid ${cfg.color}33`, color: cfg.color, fontWeight: 700,
          }}>{cfg.label}</div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-3)", fontSize: 16, flexShrink: 0, lineHeight: 1,
            padding: "0 2px",
          }}
        >✕</button>
      </div>
    </div>
  );
}

/* ─── Hook ───────────────────────────────────────────────────────────────────── */
export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used within NotificationProvider");
  return ctx;
}
