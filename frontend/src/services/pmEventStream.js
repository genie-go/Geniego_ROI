// 178차 N-152-F §8 — PM SSE 이벤트 스트림 클라이언트.
// Backend: GET /api/v425/pm/events/stream (Events.php long-loop 본체).
// EventSource 는 커스텀 헤더 불가 → ?api_key=<token> 로 인증 (index.php 미들웨어 지원).
// 자동 재연결 + Last-Event-ID 재개 + 300s cap(bye) 후 즉시 재연결.
import { useEffect, useRef, useState } from 'react';
import { IS_DEMO } from '../utils/demoEnv';

const _IS_DEMO = IS_DEMO; // 180차: broad includes('demo') 제거 → demoEnv 정본 격리
const TOKEN_KEY = _IS_DEMO ? 'demo_genie_token' : 'genie_token';

function resolveToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) ||
           localStorage.getItem('accessToken') ||
           localStorage.getItem('genie_auth_token') || '';
  } catch { return ''; }
}

/**
 * PmEventStream — EventSource 수명주기 관리 (재연결/재개/cap 처리).
 *
 *   const s = new PmEventStream({ projectId, onEvent, onStatus });
 *   s.start(); ... s.stop();
 */
export class PmEventStream {
  constructor({ projectId = '', onEvent, onStatus } = {}) {
    this.base = (import.meta.env.VITE_API_BASE || '');
    this.projectId = projectId;
    this.onEvent = onEvent || (() => {});
    this.onStatus = onStatus || (() => {});
    this.es = null;
    this.lastEventId = null;
    this.retryMs = 2000;
    this.maxRetryMs = 30000;
    this.stopped = false;
    this.reconnectTimer = null;
    this._EVENT_TYPES = ['create', 'update', 'delete', 'ready', 'bye'];
  }

  _url() {
    const token = resolveToken();
    const p = new URLSearchParams();
    if (this.projectId) p.set('project_id', this.projectId);
    if (this.lastEventId != null) p.set('last_event_id', String(this.lastEventId));
    if (token) p.set('api_key', token);
    return `${this.base}/api/v425/pm/events/stream?${p.toString()}`;
  }

  start() {
    this.stopped = false;
    this._open();
  }

  _open() {
    if (this.stopped) return;
    try { this.es?.close(); } catch { /* noop */ }

    const es = new EventSource(this._url());
    this.es = es;

    const handle = (e) => {
      if (e?.lastEventId && /^\d+$/.test(e.lastEventId)) this.lastEventId = e.lastEventId;
      let data = null;
      try { data = e.data ? JSON.parse(e.data) : null; } catch { data = e.data; }
      if (e.type === 'ready') { this.onStatus('open'); this.retryMs = 2000; return; }
      if (e.type === 'bye') { this._reconnectSoon(true); return; } // cap → 즉시 재연결
      this.onEvent({ type: e.type, data, id: this.lastEventId });
    };

    this._EVENT_TYPES.forEach(t => es.addEventListener(t, handle));
    es.onmessage = handle; // event: 명시 없는 기본 메시지

    es.onopen = () => { this.onStatus('open'); this.retryMs = 2000; };
    es.onerror = () => {
      // EventSource 기본 자동재연결은 헤더/cap 상황에서 불안정 → 수동 제어
      this.onStatus('reconnecting');
      try { es.close(); } catch { /* noop */ }
      this._reconnectSoon(false);
    };
  }

  _reconnectSoon(immediate) {
    if (this.stopped) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const delay = immediate ? 300 : this.retryMs;
    this.reconnectTimer = setTimeout(() => this._open(), delay);
    if (!immediate) this.retryMs = Math.min(this.retryMs * 2, this.maxRetryMs); // 지수 백오프
  }

  stop() {
    this.stopped = true;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    try { this.es?.close(); } catch { /* noop */ }
    this.es = null;
    this.onStatus('closed');
  }
}

/**
 * React 훅 — 컴포넌트 수명주기에 SSE 바인딩.
 * @returns {{ status, lastEvent, eventCount }}
 *   status: 'idle'|'open'|'reconnecting'|'closed'
 *   onEvent 콜백으로 개별 이벤트 수신 (예: 목록 refetch 트리거)
 */
export function usePmEventStream(projectId, onEvent, { enabled = true } = {}) {
  const [status, setStatus] = useState('idle');
  const [lastEvent, setLastEvent] = useState(null);
  const [eventCount, setEventCount] = useState(0);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    let active = true;
    const stream = new PmEventStream({
      projectId,
      onStatus: (s) => { if (active) setStatus(s); },
      onEvent: (evt) => {
        if (!active) return;
        setLastEvent(evt);
        setEventCount((n) => n + 1);
        try { onEventRef.current && onEventRef.current(evt); } catch { /* noop */ }
      },
    });
    stream.start();
    return () => { active = false; stream.stop(); };
  }, [projectId, enabled]);

  return { status, lastEvent, eventCount };
}
