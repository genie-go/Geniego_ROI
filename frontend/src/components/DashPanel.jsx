/**
 * DashPanel — 모든 페이지 상단에 표시되는 공유 Dashboard 선택 패널
 * 각 페이지에서 import 하여 최상단에 배치하면 됩니다.
 *
 * 사용법:
 *   import DashPanel from '../components/DashPanel.jsx';
 *   ...
 *   return (
 *     <div>
 *       <DashPanel current="marketing" />
 *       ... 페이지 내용 ...
 *     </div>
 *   );
 *
 * current prop: 현재 페이지와 매핑되는 Dashboard ID (자동 강조)
 */
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// 6개 Dashboard 정의 (Dashboard.jsx와 동일)
const DASHBOARDS = [
    {
        id: 'overview', icon: '🏠', label: '통합 현황', route: '/dashboard', color: '#4f8ef7',
        desc: '핵심 KPI · Channel 믹스 · 모듈 상태'
    },
    {
        id: 'marketing', icon: '📈', label: '마케팅 성과', route: '/dashboard?view=marketing', color: '#ec4899',
        desc: '전환 트렌드 · ROAS · Channel 분포'
    },
    {
        id: 'channel', icon: '📡', label: 'Channel KPI', route: '/dashboard?view=channel', color: '#22c55e',
        desc: '6Channel 달성률 · 멀티 트렌드'
    },
    {
        id: 'commerce', icon: '🛒', label: '커머스·정산', route: '/dashboard?view=commerce', color: '#f97316',
        desc: 'Orders현황 · 대사율 · 수수료'
    },
    {
        id: 'influencer', icon: '🤝', label: 'AI·인플루언서', route: '/dashboard?view=influencer', color: '#a855f7',
        desc: '크리에이터 성과 · AI 제안'
    },
    {
        id: 'system', icon: '🖥️', label: '시스템 현황', route: '/dashboard?view=system', color: '#14d9b0',
        desc: '모듈상태 · APIIntegration · 응답시간'
    },
];

// inline styles (Tailwind-free)
const S = {
    wrap: {
        marginBottom: 12,
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 14,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    label: {
        fontSize: 10,
        fontWeight: 700,
        color: 'rgba(255,255,255,0.3)',
        textTransform: 'uppercase',
        letterSpacing: '0.8px',
        marginRight: 4,
        whiteSpace: 'nowrap',
        flexShrink: 0,
    },
    divider: {
        width: 1,
        height: 22,
        background: 'rgba(255,255,255,0.1)',
        flexShrink: 0,
        marginRight: 4,
    },
};

function DashBtn({ d, isActive, onClick }) {
    const [hov, setHov] = useState(false);
    return (
        <button
            onClick={() => onClick(d)}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            title={d.desc}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontSize: 11.5,
                fontWeight: isActive ? 800 : 600,
                transition: 'all 0.18s cubic-bezier(.4,0,.2,1)',
                background: isActive
                    ? d.color
                    : hov
                        ? 'rgba(255,255,255,0.08)'
                        : 'transparent',
                color: isActive ? '#fff' : hov ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)',
                boxShadow: isActive ? `0 2px 12px ${d.color}50` : 'none',
                transform: isActive ? 'translateY(-1px)' : 'none',
                flexShrink: 0,
            }}
        >
            <span style={{ fontSize: 14 }}>{d.icon}</span>
            {d.label}
        </button>
    );
}

export default function DashPanel({ current }) {
    const navigate = useNavigate();

    const handleClick = useCallback((d) => {
        // Dashboard 페이지로 이동하면서 뷰 파라미터 전달
        // Dashboard.jsx에서 URL 파라미터를 읽어 해당 뷰를 표시
        const url = d.id === 'overview' ? '/dashboard' : `/dashboard?view=${d.id}`;
        navigate(url);
    }, [navigate]);

    return (
        <div style={S.wrap}>
            <span style={S.label}>📊 Dashboard</span>
            <div style={S.divider} />
            {DASHBOARDS.map(d => (
                <DashBtn
                    key={d.id}
                    d={d}
                    isActive={current === d.id}
                    onClick={handleClick}
                />
            ))}
        </div>
    );
}
