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
import { loadChannelRegistry, registryBySyncKind } from "../services/channelRegistry.js";


/* ─── Context ──────────────────────────────────────────────────────────────── */
const ConnectorSyncContext = createContext(null);

/* ─── Channel 키 목록 ─────────────────────────────────────────────────────────── */
const KNOWN_CHANNELS = [
  "meta_ads", "google_ads", "tiktok_business", "amazon_spapi", "amazon_ads",
  "shopify", "coupang", "naver_smartstore", "naver_sa", "kakao_moment",
  "st11", "gmarket", "rakuten", "lazada", "qoo10", "instagram",
  "youtube", "ga4", "slack", "cafe24", "own_mall",
];

const getToken = () =>
  localStorage.getItem("genie_token") || localStorage.getItem("genie_auth_token") || "";

// 179차 — 데모 환경: 가상으로 API 연동된 채널 상태(체험용). 판별은 정본(demoEnv) 사용.
import { IS_DEMO as _IS_DEMO } from '../utils/demoEnv.js';
import { tChannelName } from '../utils/tenantStorage.js'; // [현 차수] 감사 B-1 크로스탭 연결상태 구독
const DEMO_CONNECTED = (() => {
  const ok = ['coupang','naver_smartstore','naver_sa','meta_ads','google_ads','tiktok_business','kakao_moment','amazon_spapi','ga4','sendgrid'];
  const st = {};
  ok.forEach(ch => { st[ch] = { connected: true, keyCount: ch === 'meta_ads' ? 2 : 1, lastTest: new Date(), testStatus: 'ok' }; });
  st['st11'] = { connected: true, keyCount: 1, lastTest: new Date(), testStatus: 'error' };
  return st;
})();

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
  // 212차 #4: 레지스트리 SSOT additive merge — 하드코딩 KNOWN_CHANNELS 베이스에 admin 추가 채널을 동적 합류.
  const [knownChannels, setKnownChannels] = useState(KNOWN_CHANNELS);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const refreshTimerRef = useRef(null);

  /* DB에서 Channel 자격증명 요약 로드 */
  const refresh = useCallback(async () => {
    if (!token) return;
    if (_IS_DEMO) {
      // 데모: 가상 연동 상태 시드 (실제 API 호출 없이 연동된 것처럼 체험)
      setConnectedChannels(DEMO_CONNECTED);
      setLoading(false);
      setLastRefresh(new Date());
      return;
    }
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

  /* 레지스트리 SSOT 로드 → 자격증명 채널(ad/commerce/messaging) 키를 KNOWN_CHANNELS 에 additive merge */
  useEffect(() => {
    if (!token) return;
    loadChannelRegistry().then((reg) => {
      const regKeys = registryBySyncKind(reg, ['ad', 'commerce', 'messaging']).map((c) => c.channel_key);
      if (!regKeys.length) return;
      setKnownChannels((prev) => {
        const merged = new Set(prev);
        regKeys.forEach((k) => merged.add(k));
        return merged.size === prev.length ? prev : Array.from(merged);
      });
    });
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

  /* [현 차수] 감사 B-1: 크로스탭 채널 연결/해제 즉시 반영 — ApiKeys 가 발신하던 genie_connector_sync
     BroadcastChannel(CHANNEL_REGISTERED/REMOVED)을 SSOT 컨텍스트가 미구독해 connectedChannels 배지가 최대 5분 stale.
     구독 후 즉시 refresh()로 다른 탭(같은 tenant 멀티탭/팀원)의 연결상태를 실시간 동기화. */
  useEffect(() => {
    if (!token || typeof BroadcastChannel === 'undefined') return;
    let bc;
    try {
      bc = new BroadcastChannel(tChannelName('genie_connector_sync'));
      bc.onmessage = (e) => {
        const ty = e?.data?.type;
        if (ty === 'CHANNEL_REGISTERED' || ty === 'CHANNEL_REMOVED') refresh();
      };
    } catch { /* 미지원 환경 무음 */ }
    return () => { try { if (bc) bc.close(); } catch { /* BroadcastChannel 정리 실패 무시 */ } };
  }, [token, refresh]);

  /* 단일 Channel 연결 Test */
  const testChannel = useCallback(async (channelKey) => {
    setConnectedChannels(prev => ({
      ...prev,
      [channelKey]: { ...prev[channelKey], testStatus: "testing" },
    }));
    // 데모: 가상 연결 테스트 — 실제 API 호출 없이 성공 시뮬레이션
    const result = _IS_DEMO ? { ok: true, demo: true } : await testChannelConn(channelKey);
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
    () => knownChannels.filter(ch => !connectedChannels[ch]?.connected),
    [connectedChannels, knownChannels]
  );

  const value = useMemo(() => ({
    connectedChannels,
    loading,
    lastRefresh,
    connectedCount,
    missingChannels,
    totalChannels: knownChannels.length,
    refresh,
    testChannel,
    markChannelRegistered,
    markChannelDisconnected,
    /* 특정 Channel이 연결됐는지 빠른 체크 */
    isConnected: (ch) => connectedChannels[ch]?.connected ?? false,
  }), [
    connectedChannels, loading, lastRefresh, connectedCount, missingChannels, knownChannels,
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
