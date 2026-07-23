import React, { useEffect, useState, useCallback } from 'react';

/**
 * CollabAccept — CWIS Part002 초대 수락(public·무세션).
 * 초대 이메일 링크(/collab/accept?token=RAW)로 진입 → 토큰 검증(email/role 미리보기) → 이름/비밀번호 설정 → 수락.
 * 백엔드: GET verify / POST accept (token hash-only·만료·1회성·비번정책·member/manager 프로비저닝).
 */
export default function CollabAccept() {
  const base = import.meta.env.VITE_API_BASE || '';
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') || '');
  const [preview, setPreview] = useState(null);
  const [loadErr, setLoadErr] = useState('');
  const [name, setName] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) { setLoadErr('초대 토큰이 없습니다.'); return; }
    (async () => {
      try {
        const r = await fetch(`${base}/api/v425/pm/collaboration/invitations/verify?token=${encodeURIComponent(token)}`);
        const j = await r.json();
        if (!r.ok || !j?.ok) setLoadErr(j?.error === 'expired_or_used' ? '만료되었거나 이미 사용된 초대입니다.' : '유효하지 않은 초대입니다.');
        else setPreview(j.invitation);
      } catch (e) { setLoadErr('초대 확인 중 오류가 발생했습니다.'); }
    })();
  }, [token, base]);

  const accept = useCallback(async () => {
    setBusy(true); setMsg('');
    try {
      const r = await fetch(`${base}/api/v425/pm/collaboration/invitations/accept`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password: pw }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) setMsg(j?.error || `수락 실패 (HTTP ${r.status})`);
      else setDone(true);
    } catch (e) { setMsg(String(e?.message || e)); }
    finally { setBusy(false); }
  }, [base, token, name, pw]);

  const wrap = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: 20 };
  const card = { width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' };
  const inp = { width: '100%', padding: '11px 12px', borderRadius: 9, border: '1px solid #cbd5e1', fontSize: 14, marginTop: 8, boxSizing: 'border-box' };

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>🤝 GeniegoROI</div>
        <div style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>팀 협업 초대 수락</div>

        {loadErr && <div style={{ padding: 12, borderRadius: 8, background: 'rgba(220,38,38,0.08)', color: '#dc2626', fontSize: 13 }}>{loadErr}</div>}

        {!loadErr && !preview && <div style={{ color: '#64748b', fontSize: 13 }}>초대 확인 중…</div>}

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>초대가 수락되었습니다</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 18 }}>이제 로그인하여 팀 협업을 시작하세요.</div>
            <a href="/login" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 9, background: '#4f8ef7', color: '#fff', fontWeight: 700, textDecoration: 'none' }}>로그인</a>
          </div>
        ) : preview && (
          <>
            <div style={{ padding: 12, borderRadius: 9, background: 'rgba(79,142,247,0.08)', fontSize: 13, marginBottom: 16 }}>
              <b>{preview.email}</b> 님을 <b>{preview.role === 'manager' ? '매니저' : '멤버'}</b> 권한으로 초대합니다.
            </div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>이름
              <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="이름" />
            </label>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginTop: 12 }}>비밀번호
              <input style={inp} type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="8자 이상 · 영문/숫자/특수문자" />
            </label>
            {msg && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 10 }}>{msg}</div>}
            <button onClick={accept} disabled={busy || !name || !pw}
              style={{ width: '100%', marginTop: 18, padding: '12px', borderRadius: 9, border: 'none', background: '#4f8ef7', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', opacity: busy || !name || !pw ? 0.5 : 1 }}>
              {busy ? '처리 중…' : '초대 수락하고 계정 만들기'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
