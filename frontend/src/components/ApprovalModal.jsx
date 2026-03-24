/**
 * ApprovalModal - Admin 통제 승인 모달 (공통 컴포넌트)
 * 마케팅 캠페인 Run / 출고 지시 등 중요 액션 전 승인을 요구
 */
import React, { useState, useEffect } from 'react';

export default function ApprovalModal({
    title = 'Admin 승인 필요',
    subtitle = '아래 내용을 Confirm하고 승인해 주세요.',
    items = [],           // [{ label, value, color }]
    warnings = [],        // ['경고 메시지']
    confirmText = '승인 후 Run',
    confirmColor = '#22c55e',
    onConfirm,
    onCancel,
    requireNote = false,  // 승인 메모 필수 여부
}) {
    const [checked, setChecked] = useState(false);
    const [note, setNote] = useState('');
    const [step, setStep] = useState(1); // 1=검토, 2=승인Done
    const [countdown, setCountdown] = useState(3);

    // Esc 키로 Close
    useEffect(() => {
        const fn = e => { if (e.key === 'Escape') onCancel?.(); };
        window.addEventListener('keydown', fn);
        return () => window.removeEventListener('keydown', fn);
    }, [onCancel]);

    // 승인 후 카운트다운
    useEffect(() => {
        if (step === 2) {
            if (countdown <= 0) { onConfirm?.(note); return; }
            const t = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => clearTimeout(t);
        }
    }, [step, countdown]);

    const canConfirm = checked && (!requireNote || note.trim().length >= 5);

    return (
        <>
            {/* Backdrop */}
            <div onClick={onCancel} style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(6px)',
                zIndex: 900,
            }} />

            {/* Modal */}
            <div style={{
                position: 'fixed', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                width: 'min(520px, 95vw)',
                background: 'linear-gradient(135deg,#0d1525,#0a0f1e)',
                border: '1px solid rgba(99,140,255,0.25)',
                borderRadius: 20,
                padding: 28,
                zIndex: 901,
                boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}>
                {step === 1 ? (
                    <>
                        {/* 헤더 */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    🔐 {title}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{subtitle}</div>
                            </div>
                            <button onClick={onCancel} style={{
                                background: 'none', border: 'none', color: 'var(--text-3)',
                                fontSize: 18, cursor: 'pointer', padding: '2px 6px',
                            }}>✕</button>
                        </div>

                        {/* 승인 항목 */}
                        {items.length > 0 && (
                            <div style={{
                                padding: '14px 16px', borderRadius: 12,
                                background: 'rgba(79,142,247,0.05)',
                                border: '1px solid rgba(79,142,247,0.15)',
                                marginBottom: 14,
                            }}>
                                {items.map(({ label, value, color = 'var(--text-1)' }, i) => (
                                    <div key={i} style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '6px 0',
                                        borderBottom: i < items.length - 1 ? '1px solid rgba(99,140,255,0.08)' : 'none',
                                    }}>
                                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{label}</span>
                                        <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 경고 박스 */}
                        {warnings.length > 0 && (
                            <div style={{
                                padding: '12px 14px', borderRadius: 10,
                                background: 'rgba(234,179,8,0.06)',
                                border: '1px solid rgba(234,179,8,0.2)',
                                marginBottom: 14,
                            }}>
                                {warnings.map((w, i) => (
                                    <div key={i} style={{ fontSize: 11, color: '#eab308', marginBottom: i < warnings.length - 1 ? 6 : 0 }}>
                                        ⚠️ {w}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 승인 메모 */}
                        {requireNote && (
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 5 }}>승인 메모 (필수, 5자 이상)</div>
                                <textarea
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    placeholder="승인 사유를 입력하세요..."
                                    rows={2}
                                    style={{
                                        width: '100%', boxSizing: 'border-box',
                                        background: 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${note.trim().length >= 5 ? 'rgba(34,197,94,0.3)' : 'rgba(99,140,255,0.2)'}`,
                                        borderRadius: 8, color: 'var(--text-1)',
                                        padding: '8px 10px', fontSize: 12,
                                        resize: 'none', outline: 'none',
                                    }}
                                />
                            </div>
                        )}

                        {/* Confirm 체크박스 */}
                        <label style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            cursor: 'pointer', marginBottom: 18,
                            padding: '10px 14px', borderRadius: 10,
                            background: checked ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${checked ? 'rgba(34,197,94,0.25)' : 'rgba(99,140,255,0.12)'}`,
                            transition: 'all 150ms',
                        }}>
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={e => setChecked(e.target.checked)}
                                style={{ width: 16, height: 16, marginTop: 1, accentColor: '#22c55e', flexShrink: 0 }}
                            />
                            <span style={{ fontSize: 11, color: checked ? '#22c55e' : 'var(--text-2)', lineHeight: 1.5 }}>
                                위 내용을 Confirm하였으며, Admin로서 이 작업의 Run을 승인합니다.
                                Run 후에는 Cancel가 어려울 수 있습니다.
                            </span>
                        </label>

                        {/* 버튼 */}
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button onClick={onCancel} style={{
                                padding: '9px 20px', borderRadius: 10,
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'var(--text-2)', cursor: 'pointer', fontSize: 12,
                            }}>Cancel</button>
                            <button
                                onClick={() => canConfirm && setStep(2)}
                                disabled={!canConfirm}
                                style={{
                                    padding: '9px 22px', borderRadius: 10, border: 'none',
                                    background: canConfirm
                                        ? `linear-gradient(135deg,${confirmColor},${confirmColor}cc)`
                                        : 'rgba(255,255,255,0.08)',
                                    color: canConfirm ? '#fff' : 'var(--text-3)',
                                    fontWeight: 700, cursor: canConfirm ? 'pointer' : 'not-allowed',
                                    fontSize: 12, transition: 'all 200ms',
                                }}
                            >
                                ✅ {confirmText}
                            </button>
                        </div>
                    </>
                ) : (
                    /* Step 2: 승인 Done 애니메이션 */
                    <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                        <div style={{ fontSize: 56, marginBottom: 16, animation: 'pulse 0.8s ease' }}>✅</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#22c55e', marginBottom: 8 }}>승인 Done!</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20 }}>
                            {countdown > 0 ? `${countdown}초 후 자동 Run됩니다...` : 'Run 중...'}
                        </div>
                        <div style={{
                            height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden',
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${((3 - countdown) / 3) * 100}%`,
                                background: 'linear-gradient(90deg,#22c55e,#4f8ef7)',
                                borderRadius: 4, transition: 'width 1s linear',
                            }} />
                        </div>
                        {note && (
                            <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text-3)' }}>
                                📝 승인 메모: {note}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
