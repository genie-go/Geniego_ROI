/**
 * Enterprise Network Status Detector
 * ====================================
 * - Online/Offline 감지 + UI 배너
 * - 자동 재연결 감지
 * - 네트워크 품질 모니터링
 */
import React, { useState, useEffect, useCallback } from 'react';

export default function NetworkStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      if (wasOffline) {
        setShowBanner(true);
        setTimeout(() => setShowBanner(false), 4000);
      }
    };
    const goOffline = () => {
      setOnline(false);
      setWasOffline(true);
      setShowBanner(true);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [wasOffline]);

  if (!showBanner && online) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 99999, animation: 'slideUp 0.3s ease-out',
    }}>
      <div style={{
        padding: '12px 24px', borderRadius: 14,
        background: online
          ? 'linear-gradient(135deg, rgba(34,197,94,0.95), rgba(16,185,129,0.95))'
          : 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(220,38,38,0.95))',
        color: '#fff', fontWeight: 700, fontSize: 13,
        display: 'flex', alignItems: 'center', gap: 10,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}>
        <span style={{ fontSize: 18 }}>{online ? '✅' : '📡'}</span>
        <span>{online ? 'Connection restored' : 'No internet connection'}</span>
        {!online && (
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#fbbf24', animation: 'pulse 1.5s infinite',
          }} />
        )}
      </div>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
