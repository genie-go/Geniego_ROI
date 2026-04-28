import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useI18n } from '../i18n/index.js';

const SYSTEM_MENUS = [
    { catKey: "menuAccess.catDash", catDef: "홈 대시보드", items: ["요약 대시보드", "실시간 모니터링", "알림 피드"] },
    { catKey: "menuAccess.catAI", catDef: "AI 자동화 & 룰 엔진", items: ["통합 AI 캠페인 빌더", "캠페인 관리", "고객 여정 빌더", "신규 메뉴관리자 접근권한"] },
    { catKey: "menuAccess.catAds", catDef: "광고/채널 분석", items: ["광고 성과 분석", "마케팅 인텔리전스", "어트리뷰션 분석", "채널 KPI 대시보드", "디지털 셀프"] },
    { catKey: "menuAccess.catCRM", catDef: "고객 CRM & 메신저", items: ["CRM 세그먼트", "이메일 마케팅", "카카오 채널", "인스타그램 DM", "문자 발송"] },
    { catKey: "menuAccess.catComm", catDef: "커머스 통합 & 물류", items: ["멀티 채널 관리", "주문 통합 허브", "WMS 창고 관리", "AI 가격 최적화"] }
];

// SaaS Industry Standard Plan Recommendations (e.g. HubSpot, Salesforce models)
const PLAN_PRESETS = {
    free: {
        name: "Free (Starter)", 
        desc: "기본 조회 전용. 생성/수정 권한 제한.",
        color: "#94a3b8",
        perms: { read: ["요약 대시보드", "광고 성과 분석"], create: [], update: [] }
    },
    pro: {
        name: "Pro (Professional)", 
        desc: "일반 마케터 및 운영자. 조회 및 캠페인/CRM 등록 가능. (최상위 설정 불가)",
        color: "#3b82f6",
        perms: { 
            read: ["요약 대시보드", "실시간 모니터링", "알림 피드", "통합 AI 캠페인 빌더", "캠페인 관리", "광고 성과 분석", "마케팅 인텔리전스", "어트리뷰션 분석", "CRM 세그먼트", "이메일 마케팅", "주문 통합 허브"], 
            create: ["통합 AI 캠페인 빌더", "캠페인 관리", "이메일 마케팅"], 
            update: ["캠페인 관리"] 
        }
    },
    enterprise: {
        name: "Enterprise (Admin)", 
        desc: "최고 관리자 및 재무/개발 파트장. 시스템 전체 통제 및 권한 관리 부여.",
        color: "#a855f7",
        perms: { read: "ALL", create: "ALL", update: "ALL" }
    }
};

export default function MenuAccessManager() {
    const { t } = useI18n();
    const {isDemo} = useAuth();
    const [selectedTarget, setSelectedTarget] = useState('user_custom');
    const [permissions, setPermissions] = useState({});
    
    useEffect(() => {
        applyPreset("pro"); // Default Load
    }, []);

    const applyPreset = (planKey) => {
        const p = PLAN_PRESETS[planKey];
        let initP = {};
        SYSTEM_MENUS.forEach(sec => {
            sec.items.forEach(item => {
                if (p.perms.read === "ALL") {
                    initP[item] = { read: true, create: true, update: true };
                } else {
                    initP[item] = {
                        read: p.perms.read.includes(item),
                        create: p.perms.create.includes(item),
                        update: p.perms.update.includes(item)
                    };
                }
            });
        });
        setPermissions(initP);
        setSelectedTarget(planKey);
    };

    const togglePerm = (item, type) => {
        if(isDemo) return;
        setPermissions(prev => ({
            ...prev,
            [item]: { ...prev[item], [type]: !prev[item][type] }
        }));
    };

    const handleSave = () => {
        if(isDemo) {
            alert(t("marketing.Locker") || '데모 모드에서는 저장할 수 없습니다.');
            return;
        }
        alert(t("marketing.memAccessSaved") || '권한 체계가 성공적으로 저장되었습니다.');
    };

    return (
        <div style={{ padding: 24, paddingBottom: 60, minHeight: '100vh', background: '#0a101d', color: '#fff' }}>
            <div style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>{t("gNav.menuAccessManager") || "플랜별 / 역할별 제어 (Menu Access Roles)"}</h1>
                <p style={{ color: '#94a3b8', fontSize: 13 }}>
                    {t("menuAccess.desc") || "B2B SaaS 표준 모델을 기반으로 한 플랜(요금제) 및 직무(역할)별 권한 매트릭스를 제어하고 추천합니다."}
                </p>
            </div>

            {/* AI Recommendation Banner */}
            <div style={{ marginBottom: 24, padding: "20px 24px", background: "linear-gradient(135deg, rgba(79,142,247,0.1), rgba(168,85,247,0.05))", border: "1px solid rgba(79,142,247,0.2)", borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>✨</span>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{t("menuAccess.recommendTitle") || "타사 (Salesforce, HubSpot) 사례 기반 플랜 권한 자동 추천"}</h3>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    {Object.entries(PLAN_PRESETS).map(([key, plan]) => (
                        <div key={key} onClick={() => applyPreset(key)} style={{
                            flex: 1, padding: 16, cursor: 'pointer', borderRadius: 8,
                            background: selectedTarget === key ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.3)',
                            border: `1px solid ${selectedTarget === key ? plan.color : 'rgba(255,255,255,0.05)'}`,
                            transition: 'all 0.2s', position: 'relative'
                        }}>
                            {selectedTarget === key && <div style={{ position: 'absolute', top: -1, left: -1, right: -1, height: 3, background: plan.color, borderRadius: '4px 4px 0 0' }}/>}
                            <div style={{ fontSize: 15, fontWeight: 800, color: selectedTarget === key ? '#fff' : '#94a3b8', marginBottom: 6 }}>{plan.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{plan.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 20, position: 'relative' }}>
                <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>{t("menuAccess.targetObj") || "권한 대상:"}</span>
                            <div style={{ padding: '6px 14px', background: 'rgba(79,142,247,0.15)', color: '#fff', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>
                                {PLAN_PRESETS[selectedTarget]?.name || "Custom Configuration"}
                            </div>
                        </div>
                        <button onClick={handleSave} style={{ padding: '8px 18px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', fontWeight: 800, borderRadius: 8, cursor: 'pointer' }}>💾 {t("menuAccess.saveBtn") || "매트릭스 덮어쓰기 (배포)"}</button>
                    </div>

                    <div style={{ display: 'grid', gap: 12 }}>
                        {SYSTEM_MENUS.map((sec, idx) => (
                            <div key={idx} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                                <div style={{ background: 'rgba(79,142,247,0.08)', padding: '10px 16px', fontWeight: 900, color: '#fff', fontSize: 13 }}>
                                    {t(sec.catKey) || sec.catDef}
                                </div>
                                <div style={{ padding: '12px 16px', display: 'grid', gap: 8 }}>
                                    {sec.items.map(item => {
                                        const p = permissions[item] || { read: false, create: false, update: false };
                                        return (
                                            <div key={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.03)' }}>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{t(`menuAccess.item_${item}`) || item}</div>
                                                <div style={{ display: 'flex', gap: 20 }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: p.read ? '#38bdf8' : '#64748b' }}>
                                                        <input type="checkbox" checked={p.read} onChange={() => togglePerm(item, 'read')} style={{ accentColor: '#38bdf8' }} />
                                                        {t("menuAccess.permRead") || "열람조회 (Read)"}
                                                    </label>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: p.create ? '#10b981' : '#64748b' }}>
                                                        <input type="checkbox" checked={p.create} onChange={() => togglePerm(item, 'create')} style={{ accentColor: '#10b981' }} disabled={!p.read} />
                                                        {t("menuAccess.permCreate") || "개체생성 (Create)"}
                                                    </label>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: p.update ? '#f59e0b' : '#64748b' }}>
                                                        <input type="checkbox" checked={p.update} onChange={() => togglePerm(item, 'update')} style={{ accentColor: '#f59e0b' }} disabled={!p.read} />
                                                        {t("menuAccess.permUpdate") || "수정승인 (Update)"}
                                                    </label>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    

);
}