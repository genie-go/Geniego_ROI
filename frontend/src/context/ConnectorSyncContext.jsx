/**
 * ConnectorSyncContext.jsx
 *
 * 전역 Channel 연결 상태 공유 컨텍스트.
 * - API 키가 등록된 Channel 목록을 앱 전역에서 공유
 * - 메뉴 간 동기화: Dashboard, AI Insights, Marketing 등에서 동일 연결 상태 참조
 * - 새 키 등록 또는 연결 해제 시 자동으로 갱신
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "../auth/AuthContext";

import ko from '../i18n/locales/ko.js';
const t = (k) => k.split('.').reduce((o,i)=>o?.[i], {auto: ko?.auto}) || k;


/* ─── Context ──────────────────────────────────────────────────────────────── */
const ConnectorSyncContext = createContext(null);

/* ─── Channel 키 목록 ─────────────────────────────────────────────────────────── */
const KNOWN_CHANNELS = [
  "meta_ads", "google_ads", "tiktok_business", "amazon_spapi", "amazon_ads",
  "shopify", "coupang", "naver_smartstore", "naver_sa", "kakao_moment",
  "st11", "gmarket", "rakuten", "lazada", "qoo10", "instagram",
  "youtube", "google_analytics", "slack", "cafe24", "own_mall",
];

const getToken = () =>
  localStorage.getItem("genie_token") || localStorage.getItem("genie_auth_token") || "";

async function fetchCredsSummary() {
  const token = getToken();
  try {
    const res = await fetch("/api/v423/creds/summary", {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function testChannelConn(channel) {
  const token = getToken();
  try {
    const res = await fetch(`/api/v423/connectors/${channel}/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    });
    return await res.json();
  } catch {
    return { ok: false, error: "network_error" };
  }
}

/* ─── Provider ─────────────────────────────────────────────────────────────── */
export function ConnectorSyncProvider({ children }) {
  const { token, user } = useAuth();

  // connectedChannels: { [channelKey]: { connected: bool, keyCount: int, lastTest: Date|null, testStatus: 'ok'|'error'|null } }
  const [connectedChannels, setConnectedChannels] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const refreshTimerRef = useRef(null);

  /* DB에서 Channel 자격증명 요약 로드 */
  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchCredsSummary();
      if (data?.ok && data.channels) {
        // 백엔드 응답: { channels: { meta_ads: { keyCount:2, hasRequired:true }, ... } }
        const newState = {};
        for (const [ch, info] of Object.entries(data.channels)) {
          newState[ch] = {
            connected: info.hasRequired ?? info.keyCount > 0,
            keyCount: info.keyCount ?? 0,
            lastTest: null,
            testStatus: null,
          };
        }
        setConnectedChannels(newState);
      }
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, [token]);

  /* 마운트 시 + 토큰 변경 시 자동 갱신 */
  useEffect(() => {
    if (token) {
      refresh();
      // 5분마다 자동 갱신
      refreshTimerRef.current = setInterval(refresh, 300_000);
    }
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [token, refresh]);

  /* 단일 Channel 연결 Test */
  const testChannel = useCallback(async (channelKey) => {
    setConnectedChannels(prev => ({
      ...prev,
      [channelKey]: { ...prev[channelKey], testStatus: "testing" },
    }));
    const result = await testChannelConn(channelKey);
    const status = result.ok ? "ok" : "error";
    setConnectedChannels(prev => ({
      ...prev,
      [channelKey]: {
        ...prev[channelKey],
        connected: result.ok,
        testStatus: status,
        lastTest: new Date(),
      },
    }));
    return result;
  }, []);

  /* Channel 연결 상태 수동 업데이트 (키 Save 후 즉시 반영) */
  const markChannelRegistered = useCallback((channelKey, keyCount = 1) => {
    setConnectedChannels(prev => ({
      ...prev,
      [channelKey]: {
        connected: keyCount > 0,
        keyCount,
        lastTest: null,
        testStatus: null,
        ...(prev[channelKey] || {}),
      },
    }));
  }, []);

  const markChannelDisconnected = useCallback((channelKey) => {
    setConnectedChannels(prev => ({
      ...prev,
      [channelKey]: { connected: false, keyCount: 0, lastTest: null, testStatus: null },
    }));
  }, []);

  /* 연결된 Channel 수 */
  const connectedCount = useMemo(
    () => Object.values(connectedChannels).filter(c => c.connected).length,
    [connectedChannels]
  );

  /* 미연결 필수 Channel 목록 */
  const missingChannels = useMemo(
    () => KNOWN_CHANNELS.filter(ch => !connectedChannels[ch]?.connected),
    [connectedChannels]
  );

  const value = useMemo(() => ({
    connectedChannels,
    loading,
    lastRefresh,
    connectedCount,
    missingChannels,
    totalChannels: KNOWN_CHANNELS.length,
    refresh,
    testChannel,
    markChannelRegistered,
    markChannelDisconnected,
    /* 특정 Channel이 연결됐는지 빠른 체크 */
    isConnected: (ch) => connectedChannels[ch]?.connected ?? false,
  }), [
    connectedChannels, loading, lastRefresh, connectedCount, missingChannels,
    refresh, testChannel, markChannelRegistered, markChannelDisconnected,
  ]);

  return (
    <ConnectorSyncContext.Provider value={value}>
      {children}
    </ConnectorSyncContext.Provider>
  );
}

/* ─── Hook ─────────────────────────────────────────────────────────────────── */
export function useConnectorSync() {
  const ctx = useContext(ConnectorSyncContext);
  if (!ctx) {
    // Context 없이 사용하면 무해한 기본값 반환 ( Mode 등)
    return {
      connectedChannels: {},
      loading: false,
      lastRefresh: null,
      connectedCount: 0,
      missingChannels: [],
      totalChannels: 0,
      refresh: async () => {},
      testChannel: async () => ({ ok: false }),
      markChannelRegistered: () => {},
      markChannelDisconnected: () => {},
      isConnected: () => false,
    };
  }
  return ctx;
}
