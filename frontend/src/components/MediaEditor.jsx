import { useI18n } from '../i18n/index.js';
/**
 * 위치: 캠페인관리 > AI마케팅 추천 > 이미지 생성 > 내 이미지/동영상 편집 탭
 */
import { useState, useRef, useCallback, useEffect } from 'react';

import ko from '../i18n/locales/ko.js';
const t = (k) => k.split('.').reduce((o,i)=>o?.[i], {auto: ko?.auto}) || k;


/* ─── Channel별 광고 규격 가이드 ─── */
const CHANNEL_SPECS = {
    meta: [
        { name: '피드 광고', ratio: '1:1', size: '1080×1080', note: '정사각형 · JPG/PNG · 최대 30MB' },
        { name: '스토리 광고', ratio: '9:16', size: '1080×1920', note: '세로형 · 텍스트 20% 이하 권장' },
        { name: '가로 배너', ratio: '1.91:1', size: '1200×628', note: '링크 광고 · 뉴스피드 최적' },
    ],
    instagram: [
        { name: '피드 광고', ratio: '1:1', size: '1080×1080', note: '기본 정사각형' },
        { name: '릴스 광고', ratio: '9:16', size: '1080×1920', note: '세로형 영상 · 최대 60초' },
        { name: '스토리 광고', ratio: '9:16', size: '1080×1920', note: '15초 이내 권장' },
    ],
    tiktok: [
        { name: '인피드 광고', ratio: '9:16', size: '1080×1920', note: '세로형 영상 · 5~60초' },
        { name: '탑뷰', ratio: '9:16', size: '1080×1920', note: '첫 오픈 시 노출 · 최대 60초' },
    ],
    youtube: [
        { name: '범퍼 광고', ratio: '16:9', size: '1920×1080', note: '6초 스킵 불가' },
        { name: '인스트림', ratio: '16:9', size: '1920×1080', note: '5초 후 스킵 가능 · 최대 3분' },
        { name: '디스플레이', ratio: '16:9', size: '300×250', note: '사이드바 디스플레이 광고' },
    ],
    google_search: [
        { name: '반응형 광고', ratio: '1:1', size: '1200×1200', note: '정사각형 기본 이미지' },
        { name: '가로형', ratio: '1.91:1', size: '1200×628', note: '가로형 이미지 광고' },
    ],
    naver_search: [
        { name: '파워링크', ratio: '1:1', size: '500×500', note: 'Search 광고 이미지' },
        { name: '배너', ratio: '3:1', size: '1029×258', note: '브랜드 Search 배너' },
    ],
    kakao: [
        { name: 'Kakao 피드', ratio: '1:1', size: '800×800', note: '비즈보드 정사각형' },
        { name: '풀뷰', ratio: '2:1', size: '800×400', note: '와이드 이미지형' },
    ],
    default: [
        { name: '기본 정사각형', ratio: '1:1', size: '1080×1080', note: '범용 SNS 광고' },
        { name: '가로형 배너', ratio: '16:9', size: '1920×1080', note: '웹 배너·유튜브 썸네일' },
    ],
};

/* ─── 기본 텍스트 레이어 ─── */
const defaultLayer = () => ({
    id: Date.now() + Math.random(),
    text: '텍스트를 입력하세요',
    x: 50, y: 40,
    fontSize: 22,
    fontFamily: 'Pretendard, sans-serif',
    color: 'var(--text-1)',
    bold: true,
    italic: false,
    align: 'center',
    shadow: true,
    bg: false,
    bgColor: 'rgba(0,0,0,0.45)',
    rotation: 0,
    opacity: 100,
    lineHeight: 1.4,
});

const FONTS = ['Pretendard', 'Noto Sans KR', 'Arial', 'Georgia', 'Impact', 'Courier New'];
const PRESET_COLORS = ['#ffffff', '#000000', '#ff4444', '#ffd700', '#44aaff', '#44ee88', '#ff69b4', '#ff8c00'];

export default function MediaEditor({ channelName, channelId, accentColor = '#6366f1', onExport, aiCreative }) {
    const [media, setMedia] = useState(null);
    const [layers, setLayers] = useState([]);
    const [selId, setSelId] = useState(null);
    const [drag, setDrag] = useState(null);
    const [dropOver, setDropOver] = useState(false);
    const [showSpecGuide, setShowSpecGuide] = useState(false);
    const [aiImported, setAiImported] = useState(false);
    const [exportMsg, setExportMsg] = useState('');
    const previewRef = useRef(null);
    const canvasRef = useRef(null);
    const fileRef = useRef(null);

    const sel = layers.find(l => l.id === selId) || null;
    const specs = CHANNEL_SPECS[channelId] || CHANNEL_SPECS.default;

    /* ─── AI 소재 자동 임포트 ─── */
    useEffect(() => {
        if (!aiCreative || aiImported) return;
        if (aiCreative.headline || aiCreative.copy) {
            const layers = [];
            if (aiCreative.headline) {
                layers.push({ ...defaultLayer(), id: Date.now() + 1, text: aiCreative.headline, fontSize: 26, y: 40, bold: true, shadow: true });
            }
            if (aiCreative.copy) {
                layers.push({ ...defaultLayer(), id: Date.now() + 2, text: aiCreative.copy, fontSize: 14, y: 62, bold: false, shadow: true });
            }
            if (aiCreative.cta) {
                layers.push({ ...defaultLayer(), id: Date.now() + 3, text: aiCreative.cta, fontSize: 16, y: 80, bold: true, bg: true, bgColor: 'rgba(0,0,0,0.55)' });
            }
            if (layers.length > 0) {
                setLayers(layers);
                setAiImported(true);
            }
        }
    }, [aiCreative]);

    /* ─── 파일 처리 ─── */
    const handleFile = useCallback(file => {
        if (!file) return;
        const isVideo = file.type.startsWith('video/');
        if (!file.type.startsWith('image/') && !isVideo) {
            alert('이미지(JPG·PNG·GIF·WebP) 또는 동영상(MP4·MOV·WebM) 파일을 선택하세요.');
            return;
        }
        const url = URL.createObjectURL(file);
        setMedia({ url, type: isVideo ? 'video' : 'image', file, name: file.name });
        if (layers.length === 0) {
            setLayers([defaultLayer()]);
        }
        setSelId(null);
        setAiImported(false);
    }, [layers.length]);

    const onInputChange = e => { handleFile(e.target.files[0]); };
    const onDrop = e => { e.preventDefault(); setDropOver(false); handleFile(e.dataTransfer.files[0]); };

    /* ─── 레이어 조작 ─── */
    const addLayer = () => { const l = defaultLayer(); setLayers(p => [...p, l]); setSelId(l.id); };
    const duplicateLayer = id => {
        const src = layers.find(l => l.id === id);
        if (!src) return;
        const dup = { ...src, id: Date.now() + Math.random(), x: src.x + 3, y: src.y + 3 };
        setLayers(p => [...p, dup]);
        setSelId(dup.id);
    };
    const delLayer = id => { setLayers(p => p.filter(l => l.id !== id)); if (selId === id) setSelId(null); };
    const updateSel = patch => setLayers(p => p.map(l => l.id === selId ? { ...l, ...patch } : l));
    const moveLayerOrder = (id, dir) => {
        setLayers(p => {
            const idx = p.findIndex(l => l.id === id);
            if (idx < 0) return p;
            const next = [...p];
            const swapIdx = idx + dir;
            if (swapIdx < 0 || swapIdx >= next.length) return p;
            [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
            return next;
        });
    };

    /* ─── AI 소재 임포트 버튼 (수동) ─── */
    const importAiText = () => {
        if (!aiCreative) return;
        const newLayers = [];
        if (aiCreative.headline) {
            newLayers.push({ ...defaultLayer(), id: Date.now() + 1, text: aiCreative.headline, fontSize: 26, y: 38, bold: true });
        }
        if (aiCreative.copy) {
            newLayers.push({ ...defaultLayer(), id: Date.now() + 2, text: aiCreative.copy, fontSize: 14, y: 60, bold: false });
        }
        if (aiCreative.cta) {
            newLayers.push({ ...defaultLayer(), id: Date.now() + 3, text: aiCreative.cta, fontSize: 16, y: 80, bold: true, bg: true, bgColor: 'rgba(0,0,0,0.5)' });
        }
        setLayers(prev => [...prev, ...newLayers]);
        setAiImported(true);
    };

    /* ─── 드래그 이동 ─── */
    const onMouseDown = (e, id) => {
        e.stopPropagation();
        setSelId(id);
        const box = previewRef.current?.getBoundingClientRect();
        if (!box) return;
        const layer = layers.find(l => l.id === id);
        setDrag({ id, startX: e.clientX, startY: e.clientY, origX: layer.x, origY: layer.y, w: box.width, h: box.height });
    };
    useEffect(() => {
        const onMove = e => {
            if (!drag || !previewRef.current) return;
            const dx = (e.clientX - drag.startX) / drag.w * 100;
            const dy = (e.clientY - drag.startY) / drag.h * 100;
            setLayers(p => p.map(l => l.id === drag.id
                ? { ...l, x: Math.max(0, Math.min(95, drag.origX + dx)), y: Math.max(0, Math.min(95, drag.origY + dy)) }
                : l));
        };
        const onUp = () => setDrag(null);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [drag]);

    /* ─── Canvas 내보내기 (이미지만) ─── */
    const exportImage = () => {
        if (!media || media.type !== 'image' || !canvasRef.current || !previewRef.current) return;
        const canvas = canvasRef.current;
        const img = new Image();
        img.onload = () => {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const box = previewRef.current.getBoundingClientRect();
            layers.forEach(l => {
                const px = (l.x / 100) * img.naturalWidth;
                const py = (l.y / 100) * img.naturalHeight;
                const fs = Math.round(l.fontSize * img.naturalWidth / box.width);
                ctx.save();
                ctx.globalAlpha = (l.opacity ?? 100) / 100;
                ctx.translate(px, py);
                if (l.rotation) ctx.rotate(l.rotation * Math.PI / 180);
                ctx.textAlign = l.align;
                ctx.font = `${l.italic ? 'italic ' : ''}${l.bold ? 'bold ' : ''}${fs}px ${l.fontFamily}`;
                ctx.shadowColor = l.shadow ? 'rgba(0,0,0,0.7)' : 'transparent';
                ctx.shadowBlur = l.shadow ? 6 : 0;
                ctx.shadowOffsetX = l.shadow ? 2 : 0;
                ctx.shadowOffsetY = l.shadow ? 2 : 0;
                // 텍스트 배경
                if (l.bg) {
                    const lines = l.text.split('\n');
                    const lineH = fs * (l.lineHeight || 1.4);
                    const maxW = Math.max(...lines.map(ln => ctx.measureText(ln).width));
                    ctx.fillStyle = l.bgColor;
                    ctx.fillRect(-maxW / 2 - 12, -fs - 4, maxW + 24, lineH * lines.length + 12);
                }
                ctx.fillStyle = l.color;
                // 멀티라인 지원
                l.text.split('\n').forEach((line, i) => {
                    ctx.fillText(line, 0, i * fs * (l.lineHeight || 1.4));
                });
                ctx.restore();
            });
            const dataUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `ad_${channelName || 'export'}_${Date.now()}.png`;
            a.click();
            onExport?.(dataUrl);
            setExportMsg('✅ PNG 이미지 Save Done!');
            setTimeout(() => setExportMsg(''), 2500);
        };
        img.src = media.url;
    };

    /* ─── 스타일 헬퍼 ─── */
    const btn = (active, c = accentColor) => ({
        padding: '4px 10px', borderRadius: 6, border: `1px solid ${c}${active ? '99' : '33'}`,
        background: active ? c + '22' : 'transparent', color: active ? c : 'var(--text-3)',
        fontSize: 11, fontWeight: active ? 700 : 400, cursor: 'pointer',
    });

    const inputStyle = {
        width: '100%', background: 'var(--surface)', border: '1px solid rgba(150,150,200,0.2)',
        borderRadius: 6, color: 'var(--text-1)', padding: '6px 8px', fontSize: 11,
        resize: 'vertical', boxSizing: 'border-box',
    };

    /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ RENDER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    return (
        <div style={{ display: 'grid', gap: 14 }}>

            {/* ── 헤더: Channel 규격 가이드 ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: accentColor }}>🖼️ 이미지/동영상 업로드 편집기</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>
                        직접 만든 이미지·동영상을 업로드하고 텍스트 오버레이를 Add하세요
                    </div>
                </div>
                <button
                    onClick={() => setShowSpecGuide(p => !p)}
                    style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${accentColor}44`, background: showSpecGuide ? accentColor + '18' : 'transparent', color: accentColor, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                    📐 {showSpecGuide ? '규격 Close' : 'Channel 광고 규격 보기'}
                </button>
            </div>

            {/* Channel 규격 가이드 패널 */}
            {showSpecGuide && (
                <div style={{ padding: '12px 16px', borderRadius: 10, background: accentColor + '09', border: `1px solid ${accentColor}30` }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: accentColor, marginBottom: 8 }}>
                        📐 {channelName || '광고 Channel'} 권장 규격
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                        {specs.map((s, i) => (
                            <div key={i} style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.25)', border: `1px solid ${accentColor}22` }}>
                                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 3 }}>{s.name}</div>
                                <div style={{ fontSize: 13, fontWeight: 900, color: accentColor, marginBottom: 2 }}>{s.size}</div>
                                <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 2 }}>비율: {s.ratio}</div>
                                <div style={{ fontSize: 9, color: 'var(--text-3)' }}>{s.note}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AI 소재 임포트 배너 (aiCreative가 있을 때) */}
            {aiCreative && (aiCreative.headline || aiCreative.copy) && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: 'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(168,85,247,0.1))', border: '1px solid rgba(99,102,241,0.28)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#a5b4fc', marginBottom: 2 }}>🤖 AI 생성 텍스트 가져오기</div>
                        <div style={{ fontSize: 9, color: 'var(--text-3)' }}>
                            AI가 생성한 헤드라인·카피·CTA를 텍스트 레이어로 자동 Add합니다
                        </div>
                        {aiCreative.headline && (
                            <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 4, padding: '4px 8px', borderRadius: 5, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' }}>
                                "{aiCreative.headline}"
                            </div>
                        )}
                    </div>
                    <button
                        onClick={importAiText}
                        style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#6366f1,#a855f7)', color: 'var(--text-1)', fontWeight: 800, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {aiImported ? '✅ 임포트됨' : '⬇ 텍스트 가져오기'}
                    </button>
                </div>
            )}

            {/* ── 업로드 드롭존 ── */}
            {!media && (
                <div
                    onDragOver={e => { e.preventDefault(); setDropOver(true); }}
                    onDragLeave={() => setDropOver(false)}
                    onDrop={onDrop}
                    onClick={() => fileRef.current?.click()}
                    style={{
                        border: `2px dashed ${dropOver ? accentColor : 'rgba(99,102,241,0.35)'}`,
                        borderRadius: 16, padding: '44px 20px', textAlign: 'center', cursor: 'pointer',
                        background: dropOver ? accentColor + '09' : 'rgba(99,102,241,0.04)',
                        transition: 'all 0.22s',
                    }}>
                    <div style={{ fontSize: 42, marginBottom: 10 }}>🖼️</div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: accentColor, marginBottom: 6 }}>
                        이미지 또는 동영상 업로드
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 6, lineHeight: 1.6 }}>
                        드래그&드롭 또는 클릭하여 파일 선택<br />
                        <span style={{ opacity: 0.8 }}>JPG · PNG · GIF · WebP · MP4 · MOV · WebM 지원</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 16, padding: '4px 12px', borderRadius: 99, background: 'rgba(99,102,241,0.08)', display: 'inline-block' }}>
                        최대 파일 크기: 100MB
                    </div>
                    <div>
                        <span style={{ padding: '8px 24px', borderRadius: 9, background: `linear-gradient(135deg,${accentColor},#a855f7)`, color: 'var(--text-1)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                            파일 선택
                        </span>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={onInputChange} />
                </div>
            )}

            {/* ── 에디터 영역 ── */}
            {media && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 14 }}>

                    {/* 프리뷰 */}
                    <div style={{ position: 'relative' }}>
                        {/* 파일명 배지 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <div style={{ fontSize: 9, padding: '2px 10px', borderRadius: 99, background: accentColor + '18', color: accentColor, border: `1px solid ${accentColor}33`, fontWeight: 700 }}>
                                {media.type === 'video' ? '🎥 동영상' : '🖼️ 이미지'}
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {media.name}
                            </div>
                        </div>

                        <div ref={previewRef} onClick={() => setSelId(null)}
                            style={{
                                position: 'relative', borderRadius: 12, overflow: 'hidden',
                                border: `1px solid ${accentColor}33`, background: '#000', lineHeight: 0,
                                boxShadow: `0 8px 32px ${accentColor}20`,
                            }}>
                            {media.type === 'video'
                                ? <video src={media.url} controls style={{ width: '100%', display: 'block', maxHeight: 400 }} />
                                : <img src={media.url} alt="preview" style={{ width: '100%', display: 'block' }} />
                            }
                            {/* 텍스트 레이어 오버레이 */}
                            {layers.map(l => (
                                <div key={l.id}
                                    onMouseDown={e => onMouseDown(e, l.id)}
                                    style={{
                                        position: 'absolute', left: `${l.x}%`, top: `${l.y}%`,
                                        transform: `translate(-50%,-50%) rotate(${l.rotation}deg)`,
                                        cursor: 'move', userSelect: 'none',
                                        fontFamily: l.fontFamily,
                                        fontSize: l.fontSize,
                                        fontWeight: l.bold ? 700 : 400,
                                        fontStyle: l.italic ? 'italic' : 'normal',
                                        color: l.color, textAlign: l.align,
                                        textShadow: l.shadow ? '0 2px 8px rgba(0,0,0,0.9)' : 'none',
                                        background: l.bg ? l.bgColor : 'transparent',
                                        padding: l.bg ? '4px 10px' : 0, borderRadius: l.bg ? 6 : 0,
                                        outline: selId === l.id ? `2px dashed ${accentColor}` : 'none',
                                        outlineOffset: 5, whiteSpace: 'pre',
                                        opacity: (l.opacity ?? 100) / 100,
                                        lineHeight: l.lineHeight || 1.4,
                                        transition: 'outline 0.1s',
                                    }}>
                                    {selId === l.id
                                        ? <textarea
                                            autoFocus value={l.text}
                                            onChange={e => updateSel({ text: e.target.value })}
                                            onMouseDown={e => e.stopPropagation()}
                                            style={{
                                                background: 'transparent', border: 'none', outline: 'none',
                                                color: l.color, fontFamily: l.fontFamily, fontSize: l.fontSize,
                                                fontWeight: l.bold ? 700 : 400, fontStyle: l.italic ? 'italic' : 'normal',
                                                resize: 'none', minWidth: 80, width: 'auto',
                                                textShadow: l.shadow ? '0 2px 8px rgba(0,0,0,0.9)' : 'none',
                                                lineHeight: l.lineHeight || 1.4,
                                            }}
                                            rows={Math.max(1, (l.text.match(/\n/g) || []).length + 1)}
                                        />
                                        : l.text
                                    }
                                </div>
                            ))}
                        </div>

                        {/* 하단 액션 버튼 */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                            <button onClick={addLayer} style={{ ...btn(false), background: accentColor + '18', padding: '6px 14px' }}>＋ 텍스트 Add</button>
                            {sel && (
                                <>
                                    <button onClick={() => duplicateLayer(selId)} style={{ ...btn(false, '#14b8a6') }}>📋 복제</button>
                                    <button onClick={() => delLayer(selId)} style={{ ...btn(false, '#ef4444') }}>🗑️ Delete</button>
                                </>
                            )}
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                                {exportMsg && (
                                    <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700 }}>{exportMsg}</span>
                                )}
                                {media.type === 'image' && (
                                    <button onClick={exportImage} style={{
                                        padding: '7px 18px', borderRadius: 9, border: 'none',
                                        background: `linear-gradient(135deg,${accentColor},#a855f7)`,
                                        color: 'var(--text-1)', fontWeight: 800, fontSize: 11, cursor: 'pointer'
                                    }}>
                                        ⬇️ PNG Save
                                    </button>
                                )}
                                {media.type === 'video' && (
                                    <div style={{ fontSize: 9, color: 'var(--text-3)', padding: '4px 10px', borderRadius: 7, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                                        💡 동영상: 텍스트 위치 미리보기만 지원
                                    </div>
                                )}
                                <button onClick={() => { URL.revokeObjectURL(media.url); setMedia(null); setLayers([]); setAiImported(false); }}
                                    style={{ ...btn(false, '#f59e0b') }}>🔄 교체</button>
                            </div>
                        </div>
                        <canvas ref={canvasRef} style={{ display: 'none' }} />
                    </div>

                    {/* 사이드 편집 패널 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 580, overflowY: 'auto', paddingRight: 2 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: accentColor, marginBottom: 2 }}>✏️ 텍스트 편집 패널</div>

                        {!sel && (
                            <div style={{ fontSize: 10, color: 'var(--text-3)', padding: '16px 10px', textAlign: 'center', border: '1px dashed rgba(150,150,200,0.2)', borderRadius: 10 }}>
                                프리뷰에서 텍스트를 클릭하거나<br />＋ 텍스트 Add를 누르세요
                            </div>
                        )}

                        {sel && (<>
                            {/* 텍스트 */}
                            <div>
                                <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 4 }}>텍스트 내용</div>
                                <textarea value={sel.text} onChange={e => updateSel({ text: e.target.value })}
                                    rows={3} style={inputStyle} />
                            </div>

                            {/* 크기 */}
                            <div>
                                <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 4 }}>크기 {sel.fontSize}px</div>
                                <input type="range" min={8} max={100} value={sel.fontSize} onChange={e => updateSel({ fontSize: +e.target.value })}
                                    style={{ width: '100%', accentColor }} />
                            </div>

                            {/* 색상 */}
                            <div>
                                <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 4 }}>글자 색상</div>
                                <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <input type="color" value={sel.color} onChange={e => updateSel({ color: e.target.value })}
                                        style={{ width: 32, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'transparent' }} />
                                    {PRESET_COLORS.map(c => (
                                        <div key={c} onClick={() => updateSel({ color: c })}
                                            style={{ width: 18, height: 18, borderRadius: 4, background: c, cursor: 'pointer', border: sel.color === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
                                    ))}
                                </div>
                            </div>

                            {/* 폰트 */}
                            <div>
                                <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 4 }}>폰트</div>
                                <select value={sel.fontFamily} onChange={e => updateSel({ fontFamily: e.target.value })}
                                    style={{ width: '100%', background: 'var(--border)', border: '1px solid rgba(150,150,200,0.2)', borderRadius: 6, color: 'var(--text-1)', padding: '5px 8px', fontSize: 11 }}>
                                    {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>

                            {/* 스타일 토글 */}
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                <button onClick={() => updateSel({ bold: !sel.bold })} style={btn(sel.bold)}>B 굵게</button>
                                <button onClick={() => updateSel({ italic: !sel.italic })} style={btn(sel.italic)}>I 이탤릭</button>
                                <button onClick={() => updateSel({ shadow: !sel.shadow })} style={btn(sel.shadow)}>🌔 그림자</button>
                                <button onClick={() => updateSel({ bg: !sel.bg })} style={btn(sel.bg)}>🔲 배경</button>
                            </div>

                            {/* 정렬 */}
                            <div style={{ display: 'flex', gap: 5 }}>
                                {['left', 'center', 'right'].map(a => (
                                    <button key={a} onClick={() => updateSel({ align: a })} style={{ ...btn(sel.align === a), flex: 1 }}>
                                        {a === 'left' ? '⬅ 좌' : a === 'center' ? '↔ 중' : '➡ 우'}
                                    </button>
                                ))}
                            </div>

                            {/* 투명도 */}
                            <div>
                                <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 4 }}>투명도 {sel.opacity ?? 100}%</div>
                                <input type="range" min={10} max={100} value={sel.opacity ?? 100} onChange={e => updateSel({ opacity: +e.target.value })}
                                    style={{ width: '100%', accentColor }} />
                            </div>

                            {/* 회전 */}
                            <div>
                                <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 4 }}>회전 {sel.rotation}°</div>
                                <input type="range" min={-180} max={180} value={sel.rotation} onChange={e => updateSel({ rotation: +e.target.value })}
                                    style={{ width: '100%', accentColor }} />
                            </div>

                            {/* 줄간격 */}
                            <div>
                                <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 4 }}>줄간격 {(sel.lineHeight || 1.4).toFixed(1)}</div>
                                <input type="range" min={1} max={3} step={0.1} value={sel.lineHeight || 1.4} onChange={e => updateSel({ lineHeight: +e.target.value })}
                                    style={{ width: '100%', accentColor }} />
                            </div>

                            {/* 위치 미세 조정 */}
                            <div>
                                <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 4 }}>위치 조정</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                    <div>
                                        <div style={{ fontSize: 8, color: 'var(--text-3)' }}>X {Math.round(sel.x)}%</div>
                                        <input type="range" min={0} max={95} value={sel.x} onChange={e => updateSel({ x: +e.target.value })} style={{ width: '100%', accentColor }} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 8, color: 'var(--text-3)' }}>Y {Math.round(sel.y)}%</div>
                                        <input type="range" min={0} max={95} value={sel.y} onChange={e => updateSel({ y: +e.target.value })} style={{ width: '100%', accentColor }} />
                                    </div>
                                </div>
                            </div>

                            {/* 배경색 (bg Active 시) */}
                            {sel.bg && (
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <div style={{ fontSize: 9, color: 'var(--text-3)' }}>배경색</div>
                                    <input type="color"
                                        value={sel.bgColor.replace(/rgba?\([^)]+\)/, '#000000').slice(0, 7) || '#000000'}
                                        onChange={e => updateSel({ bgColor: e.target.value + 'aa' })}
                                        style={{ width: 32, height: 26, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent' }} />
                                    <div style={{ fontSize: 9, color: 'var(--text-3)' }}>투명도</div>
                                </div>
                            )}

                            {/* 레이어 순서 */}
                            <div style={{ display: 'flex', gap: 5 }}>
                                <button onClick={() => moveLayerOrder(selId, -1)} style={{ ...btn(false), flex: 1, fontSize: 9 }}>▲ 앞으로</button>
                                <button onClick={() => moveLayerOrder(selId, 1)} style={{ ...btn(false), flex: 1, fontSize: 9 }}>▼ Back</button>
                            </div>
                        </>)}

                        {/* 레이어 목록 */}
                        {layers.length > 0 && (
                            <div style={{ marginTop: 6 }}>
                                <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 5, fontWeight: 700 }}>📋 텍스트 레이어 목록</div>
                                {layers.map((l, i) => (
                                    <div key={l.id} onClick={() => setSelId(l.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 9px', borderRadius: 7,
                                            background: selId === l.id ? accentColor + '18' : 'transparent',
                                            border: `1px solid ${selId === l.id ? accentColor + '44' : 'transparent'}`,
                                            cursor: 'pointer', marginBottom: 4, transition: 'all 0.15s'
                                        }}>
                                        <span style={{ fontSize: 9, color: accentColor, fontWeight: 800, flexShrink: 0 }}>T{i + 1}</span>
                                        <span style={{ flex: 1, fontSize: 9, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.text}</span>
                                        <span onClick={e => { e.stopPropagation(); delLayer(l.id); }} style={{ fontSize: 9, color: '#ef4444', cursor: 'pointer', padding: '0 2px' }}>✕</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 모든 레이어 초기화 */}
                        {layers.length > 0 && (
                            <button onClick={() => { setLayers([]); setSelId(null); }}
                                style={{ marginTop: 4, padding: '4px 0', borderRadius: 7, border: '1px solid rgba(239,68,68,0.25)', background: 'transparent', color: '#ef4444', fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>
                                🗑 All 텍스트 초기화
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
