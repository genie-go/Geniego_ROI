// LiveGuest.jsx — [현 차수] 게스트/코호스트 참여 + 카메라 송출(공개 페이지, 계정 불요).
//   초대 링크(/live-guest?token=…)로 진입 → POST /api/v425/live/guests/join(공개, 토큰=인증) →
//   stream_key·whip_url·ice 수신 → getUserMedia → WHIP 송출(미디어서버 설정 시). 미설정 시 로컬 프리뷰.
//   ★control-plane(LiveCommerce.php inviteGuest/joinGuest)이 발급한 join_url 을 실제로 소비하는 종단.
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { publishWhip } from '../../services/liveWebrtc.js';

const API_BASE = import.meta.env.VITE_API_BASE || '';

function useToken() {
  try { return new URLSearchParams(window.location.search).get('token') || ''; } catch { return ''; }
}

export default function LiveGuest() {
  const token = useToken();
  const [joined, setJoined] = useState(null);   // { guest, session, ingest }
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [bcast, setBcast] = useState({ state: 'idle' }); // idle|connecting|live|local|error
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const pubRef = useRef(null);

  const join = useCallback(async () => {
    if (!token) { setError('참여 토큰이 없습니다. 올바른 초대 링크로 접속하세요.'); return; }
    setBusy(true); setError('');
    try {
      const r = await fetch(`${API_BASE}/api/v425/live/guests/join`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
      });
      const d = await r.json();
      if (!r.ok || !d?.ok) throw new Error(d?.error || `참여 실패 (${r.status})`);
      setJoined(d);
    } catch (e) { setError(String(e?.message || e)); }
    finally { setBusy(false); }
  }, [token]);

  useEffect(() => { join(); }, [join]);

  const startCam = useCallback(async () => {
    if (!joined) return;
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; await videoRef.current.play().catch(() => {}); }
      const ing = joined.ingest || {};
      if (!ing.configured || !ing.whip_url) { setBcast({ state: 'local' }); return; } // 미디어서버 미설정 → 로컬 프리뷰
      setBcast({ state: 'connecting' });
      try {
        pubRef.current = await publishWhip(stream, ing.whip_url, ing.ice_servers || []);
        setBcast({ state: 'live' });
      } catch (e) { pubRef.current = null; setBcast({ state: 'error', msg: String(e?.message || e) }); }
    } catch (e) {
      setError('카메라/마이크 접근이 거부되었거나 장치를 찾을 수 없습니다. (' + (e?.name || e) + ')');
    }
  }, [joined]);

  const stopCam = useCallback(() => {
    try { pubRef.current?.stop?.(); } catch {} pubRef.current = null;
    try { streamRef.current?.getTracks().forEach(tr => tr.stop()); } catch {} streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setBcast({ state: 'idle' });
  }, []);
  useEffect(() => () => stopCam(), [stopCam]);

  const g = joined?.guest; const s = joined?.session;
  const roleLabel = g?.role === 'cohost' ? '코호스트' : '게스트';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#0f172a,#1e1b4b)', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 30 }}>🎙️</div>
          <div style={{ fontWeight: 900, fontSize: 20, marginTop: 4 }}>라이브 방송 참여</div>
          {s && <div style={{ fontSize: 13, color: '#c4b5fd', marginTop: 4 }}>{s.title} {s.status === 'live' ? '· ● LIVE' : ''}</div>}
        </div>

        {error && <div style={{ background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.4)', borderRadius: 12, padding: 14, fontSize: 13, marginBottom: 14 }}>⚠️ {error}</div>}

        {busy && !joined && <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>⏳ 참여 처리 중…</div>}

        {joined && (
          <>
            <div style={{ background: '#0b1020', borderRadius: 16, overflow: 'hidden', aspectRatio: '16/9', position: 'relative', marginBottom: 12 }}>
              <video ref={videoRef} playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: bcast.state === 'idle' ? 'none' : 'block' }} />
              {bcast.state === 'idle' && <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: 40 }}>📷</div><div style={{ fontSize: 13, marginTop: 6 }}>카메라가 꺼져 있습니다</div>
              </div>}
              {bcast.state === 'live' && <span style={{ position: 'absolute', top: 12, left: 12, background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 6 }}>● 송출 중</span>}
            </div>

            <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 13 }}>
              <div><b>{g?.name}</b> · {roleLabel}</div>
              <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>송출 키: <code style={{ color: '#c4b5fd' }}>{g?.stream_key}</code></div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {bcast.state === 'idle'
                ? <button onClick={startCam} style={btn('#0891b2')}>📷 카메라 시작 & 참여</button>
                : <button onClick={stopCam} style={btn('#64748b')}>⏹ 송출 중지</button>}
            </div>

            {bcast.state === 'connecting' && <div style={{ color: '#22d3ee', fontSize: 12, marginTop: 10 }}>📡 미디어서버 송출 연결 중…</div>}
            {bcast.state === 'live' && <div style={{ color: '#4ade80', fontSize: 12, marginTop: 10, fontWeight: 700 }}>🔴 실시간 송출 중 — 영상이 방송에 합성됩니다.</div>}
            {bcast.state === 'local' && <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 10 }}>📷 로컬 프리뷰만 — 미디어서버 미설정(운영자 .env LIVE_MEDIA_BASE 설정 시 실송출).</div>}
            {bcast.state === 'error' && <div style={{ color: '#f87171', fontSize: 12, marginTop: 10 }}>⚠️ 송출 실패 — {bcast.msg}</div>}
          </>
        )}
      </div>
    </div>
  );
}

function btn(color) {
  return { flex: 1, padding: '12px 18px', borderRadius: 10, border: 'none', background: color, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' };
}
