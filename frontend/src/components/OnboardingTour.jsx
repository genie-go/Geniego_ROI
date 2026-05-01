/**
 * OnboardingTour.jsx - 첫 방문자 가이드 시스템
 * ================================================
 * 첫 방문 사용자를 위한 인터랙티브 온보딩 투어
 * - 주요 기능 소개
 * - 단계별 가이드
 * - 진행률 추적
 * - 모바일 최적화
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';

const TOUR_STEPS = [
    {
        id: 'welcome',
        title: 'onboarding.tour.welcome.title',
        desc: 'onboarding.tour.welcome.desc',
        icon: '👋',
        color: '#4f8ef7',
        route: '/dashboard',
    },
    {
        id: 'dashboard',
        title: 'onboarding.tour.dashboard.title',
        desc: 'onboarding.tour.dashboard.desc',
        icon: '📊',
        color: '#22c55e',
        route: '/dashboard',
    },
    {
        id: 'marketing',
        title: 'onboarding.tour.marketing.title',
        desc: 'onboarding.tour.marketing.desc',
        icon: '🚀',
        color: '#a855f7',
        route: '/auto-marketing',
    },
    {
        id: 'integration',
        title: 'onboarding.tour.integration.title',
        desc: 'onboarding.tour.integration.desc',
        icon: '🔌',
        color: '#f97316',
        route: '/integration-hub',
    },
    {
        id: 'complete',
        title: 'onboarding.tour.complete.title',
        desc: 'onboarding.tour.complete.desc',
        icon: '🎉',
        color: '#14b8a6',
        route: '/dashboard',
    },
];

export function OnboardingTour({ onComplete }) {
    const { t } = useI18n();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // 첫 방문 체크
        const hasSeenTour = localStorage.getItem('geniego_tour_completed');
        if (!hasSeenTour) {
            setIsVisible(true);
        }
    }, []);

    const handleNext = useCallback(() => {
        if (currentStep < TOUR_STEPS.length - 1) {
            const nextStep = currentStep + 1;
            setCurrentStep(nextStep);
            const step = TOUR_STEPS[nextStep];
            if (step.route) {
                navigate(step.route);
            }
        } else {
            handleComplete();
        }
    }, [currentStep, navigate]);

    const handleSkip = useCallback(() => {
        localStorage.setItem('geniego_tour_completed', 'true');
        setIsVisible(false);
        onComplete?.();
    }, [onComplete]);

    const handleComplete = useCallback(() => {
        localStorage.setItem('geniego_tour_completed', 'true');
        setIsVisible(false);
        onComplete?.();
    }, [onComplete]);

    if (!isVisible) return null;

    const step = TOUR_STEPS[currentStep];
    const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                animation: 'fadeIn 0.3s ease-out',
            }}
            onClick={(e) => e.target === e.currentTarget && handleSkip()}
        >
            {/* Tour Card */}
            <div
                style={{
                    background: 'var(--surface, #1e293b)',
                    borderRadius: 20,
                    maxWidth: 560,
                    width: '100%',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                    overflow: 'hidden',
                    animation: 'slideUp 0.4s ease-out',
                }}
            >
                {/* Progress Bar */}
                <div style={{ height: 4, background: 'rgba(255,255,255,0.1)' }}>
                    <div
                        style={{
                            height: '100%',
                            background: `linear-gradient(90deg, ${step.color}, ${step.color}dd)`,
                            width: `${progress}%`,
                            transition: 'width 0.4s ease-out',
                        }}
                    />
                </div>

                {/* Content */}
                <div style={{ padding: '32px' }}>
                    {/* Icon & Step Counter */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div
                            style={{
                                width: 64,
                                height: 64,
                                borderRadius: 16,
                                background: `${step.color}15`,
                                border: `2px solid ${step.color}30`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 32,
                            }}
                        >
                            {step.icon}
                        </div>
                        <div
                            style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: step.color,
                                padding: '6px 12px',
                                borderRadius: 8,
                                background: `${step.color}15`,
                            }}
                        >
                            {currentStep + 1} / {TOUR_STEPS.length}
                        </div>
                    </div>

                    {/* Title */}
                    <div
                        style={{
                            fontSize: 24,
                            fontWeight: 900,
                            color: 'var(--text-1, #e8eaf0)',
                            marginBottom: 12,
                            lineHeight: 1.3,
                        }}
                    >
                        {t(step.title) || step.title}
                    </div>

                    {/* Description */}
                    <div
                        style={{
                            fontSize: 14,
                            color: 'var(--text-3, #94a3b8)',
                            lineHeight: 1.7,
                            marginBottom: 32,
                        }}
                    >
                        {t(step.desc) || step.desc}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button
                            onClick={handleSkip}
                            style={{
                                flex: 1,
                                padding: '12px 20px',
                                borderRadius: 12,
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-2, #cbd5e1)',
                                fontWeight: 700,
                                fontSize: 14,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.background = 'rgba(255,255,255,0.08)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.background = 'rgba(255,255,255,0.05)';
                            }}
                        >
                            {t('onboarding.tour.skip') || '건너뛰기'}
                        </button>
                        <button
                            onClick={handleNext}
                            style={{
                                flex: 2,
                                padding: '12px 20px',
                                borderRadius: 12,
                                border: 'none',
                                background: `linear-gradient(135deg, ${step.color}, ${step.color}dd)`,
                                color: '#fff',
                                fontWeight: 800,
                                fontSize: 14,
                                cursor: 'pointer',
                                boxShadow: `0 4px 20px ${step.color}40`,
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = `0 6px 24px ${step.color}50`;
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = `0 4px 20px ${step.color}40`;
                            }}
                        >
                            {currentStep === TOUR_STEPS.length - 1
                                ? t('onboarding.tour.finish') || '시작하기'
                                : t('onboarding.tour.next') || '다음'}
                        </button>
                    </div>
                </div>

                {/* Step Indicators */}
                <div
                    style={{
                        display: 'flex',
                        gap: 8,
                        padding: '0 32px 24px',
                        justifyContent: 'center',
                    }}
                >
                    {TOUR_STEPS.map((_, idx) => (
                        <div
                            key={idx}
                            style={{
                                width: idx === currentStep ? 24 : 8,
                                height: 8,
                                borderRadius: 4,
                                background: idx <= currentStep ? step.color : 'rgba(255,255,255,0.2)',
                                transition: 'all 0.3s',
                                cursor: 'pointer',
                            }}
                            onClick={() => setCurrentStep(idx)}
                        />
                    ))}
                </div>
            </div>

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 640px) {
          .onboarding-tour-card {
            margin: 16px;
            padding: 24px !important;
          }
        }
      `}</style>
        </div>
    );
}

export default OnboardingTour;
