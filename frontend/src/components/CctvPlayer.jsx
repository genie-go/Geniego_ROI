import React, { useEffect, useRef, useState, useCallback } from 'react';
import { requestJsonAuth } from '../services/apiClient.js';
import { useI18n } from '../i18n';

/**
 * CCTV 단일 카메라 플레이어.
 *
 * 서버가 발급한 단기 재생 URL(자격증명 미포함)만 다룬다 — 아이디/비번은 이 컴포넌트에
 * 절대 들어오지 않으며, 백엔드가 업스트림 요청에 주입한다.
 *
 * 프로토콜별 재생:
 *   rtsp / hls → hls.js(동적 import, Chrome/Edge/FF) · Safari 는 네이티브 HLS
 *   snapshot   → <img> 폴링(1초). ffmpeg 없는 서버의 항상-동작 경로.
 *   webrtc     → WHEP: 브라우저가 offer 생성 → 서버가 자격증명 주입해 중계 → answer 적용.
 *   iframe     → 벤더 임베드 페이지(벤더 자체 인증).
 *
 * rtsp 세션은 서버에서 무시청 90초 뒤 ffmpeg 가 수거되므로 30초마다 keepalive 를 보낸다.
 */
const BASE = import.meta.env?.VITE_API_BASE ?? '';
const abs = (u) => (u && u.startsWith('/') ? BASE + u : u);

export default function CctvPlayer({ camera, height = 260, onError }) {
    const { t } = useI18n();
    const videoRef = useRef(null);
    const hlsRef = useRef(null);
    const pcRef = useRef(null);
    const [session, setSession] = useState(null);
    const [status, setStatus] = useState('idle'); // idle | loading | live | error
    const [err, setErr] = useState('');
    const [snapSrc, setSnapSrc] = useState('');

    const fail = useCallback((m) => {
        setStatus('error');
        setErr(m);
        if (onError) onError(m);
    }, [onError]);

    /* ── 1) 재생 세션 발급 ── */
    useEffect(() => {
        let dead = false;
        setStatus('loading'); setErr(''); setSession(null);
        requestJsonAuth(`/api/wms/cameras/${camera.id}/session`, 'POST', {})
            .then(r => { if (!dead) setSession(r); })
            .catch(e => { if (!dead) fail(String(e?.message || e)); });
        return () => { dead = true; };
    }, [camera.id, fail]);

    /* ── 2) 프로토콜별 재생 시작 ── */
    useEffect(() => {
        if (!session?.play_url) return;
        const proto = session.protocol;
        let dead = false;

        if (proto === 'snapshot') {
            const tick = () => {
                if (dead) return;
                // 캐시 무효화 — DVR 스냅샷은 동일 URL 이므로 nonce 로 강제 재요청.
                setSnapSrc(abs(session.play_url) + '&_=' + Date.now());
            };
            tick();
            const iv = setInterval(tick, 1000);
            setStatus('live');
            return () => { dead = true; clearInterval(iv); };
        }

        if (proto === 'webrtc') {
            (async () => {
                try {
                    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
                    pcRef.current = pc;
                    pc.addTransceiver('video', { direction: 'recvonly' });
                    pc.ontrack = (ev) => { if (videoRef.current) videoRef.current.srcObject = ev.streams[0]; setStatus('live'); };
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    const r = await fetch(abs(session.play_url), {
                        method: 'POST', headers: { 'Content-Type': 'application/sdp' }, body: offer.sdp,
                    });
                    if (!r.ok) throw new Error(`WHEP ${r.status}`);
                    const answer = await r.text();
                    if (dead) return;
                    await pc.setRemoteDescription({ type: 'answer', sdp: answer });
                } catch (e) { if (!dead) fail(String(e?.message || e)); }
            })();
            return () => { dead = true; if (pcRef.current) { pcRef.current.close(); pcRef.current = null; } };
        }

        if (proto === 'rtsp' || proto === 'hls') {
            const url = abs(session.play_url);
            const video = videoRef.current;
            if (!video) return;

            // Safari 는 네이티브 HLS — hls.js 를 받지 않는다(번들 절약).
            if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = url;
                video.play().catch(() => {});
                setStatus('live');
                return () => { dead = true; video.removeAttribute('src'); video.load(); };
            }

            import('hls.js').then(({ default: Hls }) => {
                if (dead || !videoRef.current) return;
                if (!Hls.isSupported()) { fail(t('wms.cctv.errNoHls', '이 브라우저는 HLS 재생을 지원하지 않습니다')); return; }
                const hls = new Hls({ lowLatencyMode: true, backBufferLength: 10, liveSyncDurationCount: 2 });
                hlsRef.current = hls;
                hls.on(Hls.Events.ERROR, (_e, data) => {
                    if (!data.fatal) return;
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
                    else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
                    else fail(t('wms.cctv.errStream', '스트림 오류') + ': ' + (data.details || ''));
                });
                hls.on(Hls.Events.MANIFEST_PARSED, () => { setStatus('live'); videoRef.current?.play().catch(() => {}); });
                hls.loadSource(url);
                hls.attachMedia(videoRef.current);
            }).catch(e => { if (!dead) fail(String(e?.message || e)); });

            return () => {
                dead = true;
                if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
            };
        }

        if (proto === 'iframe') setStatus('live');
        return () => { dead = true; };
    }, [session, fail, t]);

    /* ── 3) keepalive — rtsp 트랜스코더가 유휴 수거되지 않도록 ── */
    useEffect(() => {
        if (session?.protocol !== 'rtsp' || !session?.play_url) return;
        const tk = new URLSearchParams(session.play_url.split('?')[1] || '').get('tk');
        if (!tk) return;
        const iv = setInterval(() => {
            requestJsonAuth(`/api/wms/cameras/${camera.id}/keepalive?tk=${encodeURIComponent(tk)}`, 'POST', {}).catch(() => {});
        }, 30000);
        return () => clearInterval(iv);
    }, [session, camera.id]);

    const frame = {
        position: 'relative', width: '100%', height, background: '#0b0f19',
        borderRadius: 10, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
    };
    const overlay = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12, textAlign: 'center', padding: 16 };

    return (
        <div style={frame}>
            {session?.protocol === 'iframe' && status === 'live' && (
                <iframe title={camera.name} src={session.play_url} style={{ width: '100%', height: '100%', border: 0 }}
                        allow="autoplay; fullscreen" sandbox="allow-scripts allow-same-origin" />
            )}
            {session?.protocol === 'snapshot' && status === 'live' && (
                <img src={snapSrc} alt={camera.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                     onError={() => fail(t('wms.cctv.errSnapshot', '스냅샷을 가져오지 못했습니다'))} />
            )}
            {(session?.protocol === 'rtsp' || session?.protocol === 'hls' || session?.protocol === 'webrtc') && (
                <video ref={videoRef} muted playsInline autoPlay
                       style={{ width: '100%', height: '100%', objectFit: 'contain', display: status === 'live' ? 'block' : 'none' }} />
            )}

            {status === 'loading' && <div style={overlay}>{t('wms.cctv.connecting', '카메라에 연결 중…')}</div>}
            {status === 'error' && (
                <div style={{ ...overlay, color: '#fca5a5', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 22 }}>📵</div>
                    <div style={{ fontWeight: 700 }}>{t('wms.cctv.errTitle', '영상을 불러올 수 없습니다')}</div>
                    <div style={{ fontSize: 11, opacity: 0.8, wordBreak: 'break-word' }}>{err}</div>
                </div>
            )}

            {status === 'live' && (
                <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', alignItems: 'center', gap: 5,
                              background: 'rgba(0,0,0,0.55)', padding: '3px 8px', borderRadius: 20 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
                    <span style={{ color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: 0.5 }}>LIVE</span>
                </div>
            )}
            <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, color: '#e2e8f0', fontSize: 11,
                          textShadow: '0 1px 3px rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontWeight: 700 }}>{camera.name}</span>
                {camera.place && <span style={{ opacity: 0.75 }}>📍 {camera.place}</span>}
            </div>
        </div>
    );
}
