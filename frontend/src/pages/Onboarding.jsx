import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useT } from '../i18n/index.js';
/* ── By Role Persona Definition ── */
const ROLES = [
    {
        id: 'marketer', icon: '📣', title: 'Marketer', color: '#ec4899',
        desc: t('auto.hh6la2', 'Ads Performance Analysis, AI Campaign Auto화, CRM 세그먼트'),
        tags: [t('auto.qstyfg', 'Ads 최적화'), 'A/B Test', t('auto.kc58kb', 'Auto화')],
        steps: [
            { icon: '🌐', title: 'Ads Channel Integration', desc: t('auto.1vubs3', 'Meta·Google·TikTok·Naver·Kakao API 키 입력만으로 Ads 데이터가 Auto Count집됩니다.'), route: '/omni-channel', kpi: t('auto.q6vjna', 'Average 30분 내 첫 데이터 Count집') },
            { icon: '🎯', title: t('auto.qhofs2', '어트리뷰션 Analysis'), desc: t('auto.tkaqzq', '어떤 Channel이 실제 Revenue에 기여했는지 Shapley Value 기반으로 공정하게 측정합니다.'), route: '/attribution', kpi: t('auto.pj1l6q', 'Channel 낭비 Budget Average 23% 절감') },
            { icon: '🤖', title: t('auto.xu3n99', 'AI Marketing Auto화'), desc: t('auto.jpeba6', 'AI가 Customer Segment를 Auto Generate하고, 최적 Send Time에 Email·Kakao·SMS를 Auto 집행합니다.'), route: '/auto-marketing', kpi: t('auto.ztp2v4', 'CTR +41% Average 향상') },
            { icon: '👥', title: t('auto.f2aii2', 'CRM 세그먼트 Settings'), desc: t('auto.pt0j8a', 'VIP·이탈 위험·재구매 가능 Customer을 AI가 Auto Classify합니다.'), route: '/crm', kpi: t('auto.nxe45n', '이탈 Forecast 정확도 87%') },
            { icon: '🧪', title: 'A/B Test Run', desc: t('auto.dzpkmy', 'Bayesian 최적화로 승자 변형을 Statistics적으로 95% 신뢰도에서 Auto 확정합니다.'), route: '/attribution', kpi: t('auto.t6genf', 'Conv. Rate Average +18% 향상') },
        ],
    },
    {
        id: 'commerce', icon: '🛒', title: 'Commerce Owner', color: '#f97316',
        desc: t('auto.zpdo9f', '멀티Channel Orders·Stock·WMS·반품 Unified Management'),
        tags: ['Stock Sync', 'Orders Management', '3PL'],
        steps: [
            { icon: '🔗', title: t('auto.yxqehh', '판매 Channel Integration'), desc: t('auto.772f4m', 'Shopify·Coupang·Naver·Amazon SP-API를 Connect하면 Product·Stock·Orders이 실Time Sync됩니다.'), route: '/omni-channel', kpi: t('auto.c7a8yt', 'Stock 오차 99.2% 제거') },
            { icon: '📦', title: t('auto.5teenu', 'Orders 허브 Settings'), desc: t('auto.9awiem', '모든 Channel Orders을 한 곳에서 처리하고 배송사 Auto 배정 Rule을 Settings합니다.'), route: '/order-hub', kpi: t('auto.zrcuxy', 'Orders 처리 Time 68% 단축') },
            { icon: '🏭', title: t('auto.qcb7jb', 'WMS 창고 Settings'), desc: t('auto.vapb5x', '입고·피킹·출고·Stock 실사를 바코드 스캔 기반으로 Auto화합니다.'), route: '/wms', kpi: t('auto.qcgp5h', '피킹 Error율 0.08% 이하') },
            { icon: '💰', title: t('auto.bfpmg9', '정산 Auto화'), desc: t('auto.uhfim3', 'Channelper Commission를 Auto 대사하고 실질 순Profit을 실Time 계산합니다.'), route: '/settlements', kpi: t('auto.8f9ks5', '정산 처리 Time 84% 절감') },
            { icon: '🔔', title: 'Stock Notification Settings', desc: t('auto.gjxfol', '안전Stock 이하 진입 시 즉시 Notification, Count요Forecast 기반 Auto 발주 권고를 받습니다.'), route: '/alert-policies', kpi: t('auto.9gge9v', 'Stock 소진 사전 방지') },
        ],
    },
    {
        id: 'finance', icon: '📊', title: t('auto.pbi8e7', 'Finance·경영자'), color: '#22c55e',
        desc: t('auto.juzhz3', 'P&L Analysis, Channelper Profit성, ESG·리포트 Auto화'),
        tags: ['P&L', t('auto.wch7dh', 'Profit성 Analysis'), 'ESG'],
        steps: [
            { icon: '💹', title: 'P&L Dashboard', desc: t('auto.w8u7sy', 'Channelper·SKUper 실질 순Profit을 Ad Spend·Commission·물류비 차감 후 실Time으로 Confirm합니다.'), route: '/pnl-dashboard', kpi: t('auto.6iw4v1', 'Profit 구조 즉시 파악') },
            { icon: '📈', title: t('auto.u94l5o', 'Channelper Profit성 Analysis'), desc: t('auto.klr1yq', 'LTV/CAC Rate로 어떤 Channel이 장기적으로 가장 Profit성이 높은지 Analysis합니다.'), route: '/attribution', kpi: t('auto.1io62j', 'LTV/CAC Average 7.2x 유지') },
            { icon: '💳', title: t('auto.9gshr0', '정산 대조'), desc: t('auto.6em5ak', 'Platform Settlement History과 실제 입Amount을 Auto 매칭해 미지급·오지급을 즉시 감지합니다.'), route: '/reconciliation', kpi: t('auto.35q0ze', '매칭율 97.6%') },
            { icon: '🌱', title: 'ESG Report', desc: t('auto.y26zoo', '탄소 배출·지속가능성 Metric를 Auto Aggregate해 투자자·규제 대응 리포트를 Create합니다.'), route: '/pnl-dashboard', kpi: t('auto.879p7o', '규제 준Count Auto화') },
            { icon: '📄', title: t('auto.ol0p59', '리포트 Auto화'), desc: t('auto.wzw2wz', '경영진용 Weekly/Monthly 리포트를 PDF·Excel로 스케줄 Auto Send Settings합니다.'), route: '/report-builder', kpi: t('auto.jrwd7h', '리포트 작성 Time 90% 절감') },
        ],
    },
    {
        id: 'ops', icon: '⚙️', title: t('auto.c3dd0a', '운영 Owner'), color: '#a855f7',
        desc: t('auto.fyzx92', '3PL·물류·공급망·반품 Unified 운영'),
        tags: ['3PL', t('auto.zlh80r', '공급망'), t('auto.69z99r', '반품')],
        steps: [
            { icon: '🚚', title: t('auto.kol2bo', '3PL 파트너 Register'), desc: t('auto.mwqt7b', 'CJ대한통운·Coupang풀필먼트·CFS 등 3PL 파트너를 Register하고 Auto 배차 Rule을 Settings합니다.'), route: '/supply-chain', kpi: t('auto.wxqs43', '물류비 최적화 Average 15%') },
            { icon: '🗺️', title: t('auto.lm1lmd', '공급망 Management'), desc: t('auto.r6w5o6', '공급업체부터 소비자까지 All 공급망 가시성을 실Time으로 Confirm합니다.'), route: '/supply-chain', kpi: t('auto.a9jx95', '공급망 리스크 조기 감지') },
            { icon: '↩️', title: t('auto.nmhbkk', '반품 포털 Settings'), desc: t('auto.h3ceov', 'Customer 반품 신청→검Count→재입고→환불을 Auto화하고 반품 원인을 Analysis합니다.'), route: '/returns-portal', kpi: t('auto.uzuanv', '반품 처리 42% 단축') },
            { icon: '🌏', title: t('auto.gw376v', '아시아 물류 Integration'), desc: t('auto.bp4c88', 'in progress국·일본·동남아 3PL, 관세·통관 Auto화, 다국 창고 Management를 Settings합니다.'), route: '/asia-logistics', kpi: t('auto.q7fown', '해외 배송 Error 78% Decrease') },
            { icon: '⚠️', title: t('auto.573g3f', '운영 Notification Settings'), desc: t('auto.3y83s1', '배송 지연, Stock 임박, 시스템 Error 발생 시 즉각 Notification을 Slack·Email로 받습니다.'), route: '/alert-policies', kpi: t('auto.ve0ul2', '문제 감지-대응 Time 단축') },
        ],
    },
    {
        id: 'developer', icon: '💻', title: t('auto.r2p1qf', 'Developer·IT Management자'), color: '#14d9b0',
        desc: t('auto.vsrszt', 'API Integration, 시스템 모니터링, 데이터 스키마'),
        tags: ['API', t('auto.h10c24', '시스템 모니터링'), t('auto.w2nh2i', '데이터')],
        steps: [
            { icon: '🔑', title: t('auto.jnllg8', 'API 키 Issue'), desc: t('auto.c9xn8j', 'REST API 키를 Issue받아 외부 시스템과 Geniego-ROI를 Unified합니다.'), route: '/api-keys', kpi: t('auto.gm3gc1', '400+ API 엔드포인트 지원') },
            { icon: '🔌', title: t('auto.l8wkxx', '커넥터 Settings'), desc: t('auto.zzjssi', 'ERP·PIM·WMS 등 기존 시스템과 양방향 Data Pipeline을 구성합니다.'), route: '/connectors', kpi: t('auto.ic3qyz', '100+ 시스템 Integration 지원') },
            { icon: '📋', title: t('auto.hy6oys', '데이터 스키마 Confirm'), desc: t('auto.xprwao', 'Count집되는 모든 Event·Orders·Customer Data의 스키마와 정규화 규칙을 검토합니다.'), route: '/data-schema', kpi: t('auto.oa12u6', '실Time 데이터 검증') },
            { icon: '🖥️', title: t('auto.2mgjz5', '시스템 모니터링'), desc: t('auto.pgvkhc', 'API 레이턴시, DLQ Error, 배치 Run Status를 실Time 모니터링합니다.'), route: '/system-monitor', kpi: 'p99 < 200ms Goal' },
            { icon: '🛡️', title: t('auto.hn5n74', 'AI 정책 Settings'), desc: t('auto.0cb8ye', 'AI Auto화 Rule의 Run 조건·Approval 플로우·감사 로그를 구성합니다.'), route: '/ai-policy', kpi: t('auto.oa0owj', 'Auto화 신뢰도 Management') },
        ],
    },
];

function RoleCard({ role, selected, onSelect }) {
    return (
        <div onClick={() => onSelect(role.id)} style={{
            padding: '20px', borderRadius: 16, cursor: 'pointer', transition: 'all 200ms',
            background: selected ? `${role.color}12` : 'rgba(255,255,255,0.03)',
            border: `2px solid ${selected ? role.color : 'rgba(255,255,255,0.08)'}`,
            transform: selected ? 'translateY(-2px)' : 'none',
            boxShadow: selected ? `0 8px 30px ${role.color}25` : 'none',
        }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>{role.icon}</div>
            <div style={{ fontWeight: 900, fontSize: 14, color: selected ? role.color : 'var(--text-1)', marginBottom: 4 }}>{role.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 10 }}>{role.desc}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {role.tags.map(t => (
                    <span key={t} style={{ fontSize: 9, padding: '2px 8px', borderRadius: 99, background: `${role.color}15`, color: role.color, fontWeight: 700, border: `1px solid ${role.color}30` }}>{t}</span>
                ))}
            </div>
            {selected && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, color: role.color, fontSize: 11, fontWeight: 700 }}>
                    <span style={{ width: 16, height: 16, borderRadius: '50%', background: role.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10 }}>✓</span>
                    {t('auto.gq8cb1', 'Select됨')}
                </div>
            )}
        </div>
    );
}

function StepProgress({ steps, currentStep, completed, color }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
            {steps.map((s, i) => (
                <React.Fragment key={i}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: completed.has(i) ? 14 : 13, fontWeight: 900, transition: 'all 300ms',
                            background: completed.has(i) ? '#22c55e' : i === currentStep ? color : 'rgba(255,255,255,0.08)',
                            color: (completed.has(i) || i === currentStep) ? '#fff' : 'var(--text-3)',
                            boxShadow: i === currentStep ? `0 0 16px ${color}66` : 'none',
                        }}>
                            {completed.has(i) ? '✓' : s.icon}
                        </div>
                        <div style={{ fontSize: 9, color: i === currentStep ? color : 'var(--text-3)', marginTop: 4, fontWeight: i === currentStep ? 700 : 400, textAlign: 'center', maxWidth: 60 }}>{s.title.slice(0, 6)}</div>
                    </div>
                    {i < steps.length - 1 && (
                        <div style={{ height: 2, flex: 1.5, background: completed.has(i) ? '#22c55e' : 'rgba(255,255,255,0.08)', transition: 'background 300ms', marginBottom: 20 }} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

export default function Onboarding() {
  const t = useT();
    const [selectedRole, setSelectedRole] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [completed, setCompleted] = useState(new Set());
    const [phase, setPhase] = useState('role'); // 'role' | 'steps'
    const [elapsed, setElapsed] = useState(0);
    const navigate = useNavigate();

    const role = ROLES.find(r => r.id === selectedRole);
    const steps = role?.steps || [];
    const step = steps[currentStep];
    const progress = steps.length > 0 ? Math.round(completed.size / steps.length * 100) : 0;

    // 경과 Time 타이머
    useEffect(() => {
        if (phase !== 'steps') return;
        const t = setInterval(() => setElapsed(e => e + 1), 60000);
        return () => clearInterval(t);
    }, [phase]);

    // localStorage Save/복원
    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('g_smart_onboarding') || '{}');
            if (saved.role) { setSelectedRole(saved.role); setPhase('steps'); }
            if (saved.completed) setCompleted(new Set(saved.completed));
            if (saved.step) setCurrentStep(saved.step);
        } catch { }
    }, []);

    useEffect(() => {
        if (!selectedRole) return;
        try { localStorage.setItem('g_smart_onboarding', JSON.stringify({ role: selectedRole, completed: [...completed], step: currentStep })); }
        catch { }
    }, [selectedRole, completed, currentStep]);

    const startWithRole = (roleId) => {
  const t = useT();
        setSelectedRole(roleId);
        setPhase('steps');
        setCurrentStep(0);
        setCompleted(new Set());
    };

    const completeStep = useCallback(() => {
        setCompleted(c => new Set([...c, currentStep]));
        if (currentStep < steps.length - 1) setCurrentStep(i => i + 1);
    }, [currentStep, steps.length]);

    const handleAction = (route) => {
        completeStep();
        navigate(route);
    };

    const resetOnboarding = () => {
        setSelectedRole(null);
        setPhase('role');
        setCurrentStep(0);
        setCompleted(new Set());
        localStorage.removeItem('g_smart_onboarding');
    };

    /* ── Select Role Screen ── */
    if (phase === 'role') {
        return (
            <div style={{ maxWidth: 1000, margin: '0 auto', padding: 4 }}>
                <div className="hero fade-up" style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
                    <div className="hero-title grad-blue-purple">{t('auto.g4qk32', 'Geniego-ROI에 오신 것을 환영합니다!')}</div>
                    <div className="hero-desc" style={{ maxWidth: 520, margin: '8px auto' }}>
                        {t('auto.ftfrur', '역할을 Select하면')}<strong>{t('auto.73suy7', '30분 내 첫 인사이트')}</strong>{t('auto.s4lhg7', '를 얻을 Count 있는 맞춤 5단계 경로를 안내합니다.')}
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '6px 16px', borderRadius: 99, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', fontSize: 11, color: '#4ade80', fontWeight: 700 }}>
                        {t('auto.xw01x3', '⏱️ 예상 소요: 역할당 30분 이내')}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
                    {ROLES.map(r => (
                        <RoleCard key={r.id} role={r} selected={selectedRole === r.id} onSelect={setSelectedRole} />
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button onClick={() => selectedRole && startWithRole(selectedRole)} disabled={!selectedRole} style={{
                        padding: '14px 40px', borderRadius: 14, border: 'none', cursor: selectedRole ? 'pointer' : 'not-allowed',
                        background: selectedRole ? `linear-gradient(135deg, ${ROLES.find(r => r.id === selectedRole)?.color}, #6366f1)` : 'rgba(255,255,255,0.08)',
                        color: '#fff', fontWeight: 900, fontSize: 15, transition: 'all 200ms',
                        boxShadow: selectedRole ? `0 8px 30px ${ROLES.find(r => r.id === selectedRole)?.color}44` : 'none',
                        opacity: selectedRole ? 1 : 0.5,
                    }}>
                        {selectedRole ? `${ROLES.find(r => r.id === selectedRole)?.title} Start하기 →` : t('auto.u1yfzi', '역할을 Select하세요')}
                    </button>
                </div>
            </div>
        );
    }

    /* ── 단계per Guide Screen ── */
    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 4 }}>
            {/* Header */}
            <div className="hero fade-up" style={{ background: `linear-gradient(135deg,${role.color}08,rgba(0,0,0,0))`, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 28 }}>{role.icon}</span>
                        <div>
                            <div style={{ fontSize: 11, color: role.color, fontWeight: 700 }}>{role.title} 전용 Start Guide</div>
                            <div style={{ fontSize: 18, fontWeight: 900 }}>{t('auto.dmon46', '5단계 맞춤 경로')}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 11, color: '#4ade80' }}>
                            ⏱️ {elapsed}분 경과 / Goal 30분
                        </div>
                        <button onClick={resetOnboarding} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'var(--text-3)', fontSize: 11, cursor: 'pointer' }}>{t('auto.jbdi2h', '역할 Change')}</button>
                    </div>
                </div>

                {/* In Progress률 */}
                <div style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>
                        <span>{t('auto.iclchp', 'In Progress률')}</span>
                        <span style={{ fontWeight: 700, color: progress === 100 ? '#22c55e' : role.color }}>{progress}% {progress === 100 ? '🎉 Done!' : ''}</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 8, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', borderRadius: 8, transition: 'width 500ms', background: `linear-gradient(90deg,${role.color},#6366f1)` }} />
                    </div>
                </div>
            </div>

            {/* 스텝 In Progress 표시 */}
            <StepProgress steps={steps} currentStep={currentStep} completed={completed} color={role.color} />

            {/* 현재 스텝 상세 */}
            {step && (
                <div className="card card-glass fade-up" style={{ border: `1px solid ${role.color}22`, background: `linear-gradient(145deg,rgba(5,10,25,0.9),${role.color}05)` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ width: 56, height: 56, borderRadius: 16, background: `${role.color}12`, border: `2px solid ${role.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                            {step.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: 10, color: role.color, fontWeight: 800, marginBottom: 3 }}>STEP {currentStep + 1} / {steps.length}</div>
                            <div style={{ fontSize: 20, fontWeight: 900 }}>{step.title}</div>
                        </div>
                    </div>

                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, marginBottom: 16 }}>{step.desc}</div>

                    {/* KPI 예상 효과 */}
                    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>🎯</span>
                        <div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 1 }}>{t('auto.qpa49v', '이 단계 Done 시 예상 효과')}</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#4ade80' }}>{step.kpi}</div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => handleAction(step.route)} style={{
                            flex: 2, padding: '13px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 14,
                            background: `linear-gradient(135deg,${role.color},${role.color}88)`, color: '#fff',
                            boxShadow: `0 4px 20px ${role.color}33`, transition: 'all 150ms',
                        }}>
                            {step.title} Start하기 →
                        </button>
                        {!completed.has(currentStep) && (
                            <button onClick={completeStep} style={{ flex: 1, padding: '13px', borderRadius: 12, border: `1px solid ${role.color}44`, background: 'transparent', color: role.color, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                                {t('auto.bedkqv', 'Done 표시 ✓')}
                            </button>
                        )}
                        {currentStep < steps.length - 1 && (
                            <button onClick={() => setCurrentStep(i => i + 1)} style={{ padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-2)', fontSize: 13, cursor: 'pointer' }}>
                                Next →
                            </button>
                        )}
                    </div>

                    {/* 단계 도트 */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                        {steps.map((_, i) => (
                            <div key={i} onClick={() => setCurrentStep(i)} style={{
                                width: i === currentStep ? 20 : 8, height: 8, borderRadius: 8, cursor: 'pointer', transition: 'all 200ms',
                                background: completed.has(i) ? '#22c55e' : i === currentStep ? role.color : 'rgba(255,255,255,0.15)',
                            }} />
                        ))}
                    </div>
                </div>
            )}

            {/* Done 시 축하 Message */}
            {progress === 100 && (
                <div className="card card-glass" style={{ textAlign: 'center', marginTop: 16, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.04)' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#22c55e', marginBottom: 8 }}>{t('auto.oex06s', '5단계 Done!')}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
                        {role.title} Onboarding을 Done했습니다. 이제 Geniego-ROI로 ROI를 극대화하세요.
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                        <button onClick={() => navigate('/dashboard')} style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#22c55e,#4f8ef7)', color: '#fff', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
                            {t('auto.0jyye3', 'Dashboard로 Move →')}
                        </button>
                        <button onClick={resetOnboarding} style={{ padding: '12px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'var(--text-2)', fontSize: 13, cursor: 'pointer' }}>
                            {t('auto.p4fk21', '다른 역할 탐색')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
