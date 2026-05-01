/**
 * EmptyState Component - Journey Builder Empty State
 * ────────────────────────────────────────────────────
 * 여정이 없을 때 표시되는 빈 상태 컴포넌트
 * 신규 사용자에게 명확한 다음 액션 가이드 제공
 */
import React from 'react';
import { useI18n } from '../i18n';

/* ── i18n key registry ─────────────────────── */
const K = {
    emptyTitle: 'jb.emptyTitle',
    emptyDesc: 'jb.emptyDesc',
    createJourney: 'jb.createJourney',
    useTemplate: 'jb.useTemplate',
    templateWelcome: 'jb.templateWelcome',
    templateAbandon: 'jb.templateAbandon',
    templateThanks: 'jb.templateThanks',
    templateChurn: 'jb.templateChurn',
};

const FB = {
    [K.emptyTitle]: '아직 여정이 없습니다',
    [K.emptyDesc]: '첫 번째 고객 여정을 만들어보세요',
    [K.createJourney]: '새 여정 생성',
    [K.useTemplate]: '템플릿 사용하기',
    [K.templateWelcome]: '회원가입 환영 여정',
    [K.templateAbandon]: '장바구니 이탈 리마인더',
    [K.templateThanks]: '구매 감사 메시지',
    [K.templateChurn]: '이탈 방지 캠페인',
};

/* ── Template Data ─────────────────────── */
const TEMPLATES = [
    {
        id: 'welcome',
        icon: '👋',
        nameKey: K.templateWelcome,
        trigger: 'signup',
        channels: ['email', 'kakao'],
        delay: '1h',
        color: '#4f8ef7'
    },
    {
        id: 'abandon',
        icon: '🛒',
        nameKey: K.templateAbandon,
        trigger: 'abandon',
        channels: ['email', 'sms'],
        delay: '3d',
        color: '#f59e0b'
    },
    {
        id: 'thanks',
        icon: '🎉',
        nameKey: K.templateThanks,
        trigger: 'purchase',
        channels: ['email', 'kakao'],
        delay: '1d',
        color: '#22c55e'
    },
    {
        id: 'churn',
        icon: '💔',
        nameKey: K.templateChurn,
        trigger: 'churn',
        channels: ['email', 'sms', 'push'],
        delay: '7d',
        color: '#ef4444'
    }
];

export default function EmptyState({ onCreateClick, onTemplateClick }) {
    const { t } = useI18n();
    const tr = (key) => {
        const v = t(key);
        return v === key ? (FB[key] || key) : v;
    };

    return (
        <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'linear-gradient(180deg, #ffffff, #f8faff)',
            borderRadius: 16,
            border: '1px solid rgba(0,0,0,0.06)'
        }}>
            {/* Icon */}
            <div style={{
                fontSize: 64,
                marginBottom: 16,
                animation: 'float 3s ease-in-out infinite'
            }}>
                🗺️
            </div>

            {/* Title */}
            <h3 style={{
                fontSize: 20,
                fontWeight: 800,
                color: '#1e293b',
                marginBottom: 8,
                letterSpacing: '-0.3px'
            }}>
                {tr(K.emptyTitle)}
            </h3>

            {/* Description */}
            <p style={{
                fontSize: 14,
                color: '#64748b',
                marginBottom: 32,
                lineHeight: 1.6
            }}>
                {tr(K.emptyDesc)}
            </p>

            {/* Action Buttons */}
            <div style={{
                display: 'flex',
                gap: 12,
                justifyContent: 'center',
                marginBottom: 40,
                flexWrap: 'wrap'
            }}>
                <button
                    onClick={onCreateClick}
                    style={{
                        padding: '12px 28px',
                        borderRadius: 12,
                        border: 'none',
                        cursor: 'pointer',
                        background: 'linear-gradient(135deg, #4f8ef7, #06b6d4)',
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: 14,
                        boxShadow: '0 4px 16px rgba(79,142,247,0.3)',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(79,142,247,0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(79,142,247,0.3)';
                    }}
                >
                    + {tr(K.createJourney)}
                </button>
                <button
                    onClick={() => onTemplateClick?.(null)}
                    style={{
                        padding: '12px 28px',
                        borderRadius: 12,
                        border: '2px solid #4f8ef7',
                        cursor: 'pointer',
                        background: 'rgba(79,142,247,0.06)',
                        color: '#4f8ef7',
                        fontWeight: 800,
                        fontSize: 14,
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(79,142,247,0.12)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(79,142,247,0.06)';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    📋 {tr(K.useTemplate)}
                </button>
            </div>

            {/* Template Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 12,
                maxWidth: 600,
                margin: '0 auto'
            }}>
                {TEMPLATES.map((template) => (
                    <div
                        key={template.id}
                        onClick={() => onTemplateClick?.(template)}
                        style={{
                            padding: '16px 12px',
                            borderRadius: 12,
                            border: `2px solid ${template.color}20`,
                            background: `${template.color}08`,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = `0 8px 20px ${template.color}30`;
                            e.currentTarget.style.borderColor = `${template.color}40`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.borderColor = `${template.color}20`;
                        }}
                    >
                        <div style={{
                            fontSize: 32,
                            marginBottom: 8
                        }}>
                            {template.icon}
                        </div>
                        <div style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: template.color,
                            lineHeight: 1.4
                        }}>
                            {tr(template.nameKey)}
                        </div>
                    </div>
                ))}
            </div>

            {/* Float Animation */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
            `}</style>
        </div>
    );
}
