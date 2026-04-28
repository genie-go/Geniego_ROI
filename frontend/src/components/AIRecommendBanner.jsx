// AIRecommendBanner.jsx — All 메뉴 상단 AI 추천 미니 배너 (v8 통합 레이어 6)
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useI18n } from '../i18n/index.js';

/**
 * 9개 주요 메뉴 상단에 표시되는 AI 추천 미니 배너
 * - activeRules, rulesFired, aiRecommendationLog를 기반으로 상황별 추천 표시
 * - context: 페이지별 컨텍스트 ('marketing' | 'crm' | 'orders' | 'pnl' | 'kpi' | 'settlements' | 'performance' | 'insights' | 'attribution')
 */
export default function AIRecommendBanner({ context = 'default' }) {
    const navigate = useNavigate();
    const { t } = useI18n();
    const { activeRules, rulesFired, aiRecommendationLog, channelBudgets, crmSegments, pnlStats, alerts } = useGlobalData();
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    // 컨텍스트별 맞춤 AI 추천 메시지 생성
    const getRecommendation = () => {
        switch (context) {
            case 'marketing': {
                const lowRoasChannels = Object.entries(channelBudgets || {}).filter(([, c]) => c.roas < c.targetRoas);
                const highRoas = Object.entries(channelBudgets || {}).filter(([, c]) => c.roas > c.targetRoas * 1.1);
                const rulesActive = activeRules?.length || 0;
                const rulesFiredCount = rulesFired?.length || 0;
                if (lowRoasChannels.length > 0) return {
                    type: 'warn', icon: '⚡', color: '#eab308',
                    text: t('banner.mktLowRoas', { channel: lowRoasChannels[0][1].name, roas: lowRoasChannels[0][1].roas, target: lowRoasChannels[0][1].targetRoas }),
                    sub: rulesActive > 0 ? t('banner.mktRulesActive', { count: rulesActive, fired: rulesFiredCount }) : t('banner.mktOptimizeNow'),
                    action: () => navigate('/ai-marketing-hub'),
                    actionLabel: t('banner.mktHubAction'),
                };
                if (highRoas.length > 0) return {
                    type: 'success', icon: '📈', color: '#22c55e',
                    text: t('banner.mktHighRoas', { channel: highRoas[0][1].name, roas: highRoas[0][1].roas }),
                    sub: t('banner.mktHighRoasSub'),
                    action: () => navigate('/ai-marketing-hub'),
                    actionLabel: t('banner.mktBudgetAction'),
                };
                return null;
            }
            case 'crm': {
                const churnSeg = crmSegments?.find(s => s.id === 'seg_churn');
                const vipSeg = crmSegments?.find(s => s.id === 'seg_vip');
                if (churnSeg?.count > 0) return {
                    type: 'warn', icon: '⚠️', color: '#ef4444',
                    text: t('banner.crmChurn', { count: churnSeg.count }),
                    sub: vipSeg ? t('banner.crmVip', { count: vipSeg.count }) : t('banner.crmJourney'),
                    action: () => navigate('/journey-builder'),
                    actionLabel: t('banner.crmJourneyAction'),
                };
                return null;
            }
            case 'orders': {
                const recLog = aiRecommendationLog?.[0];
                if (recLog) return {
                    type: 'info', icon: '🤖', color: '#4f8ef7',
                    text: t('banner.ordersAiRun', { title: recLog.title }),
                    sub: t('banner.ordersAiSub', { revenue: (recLog.estimatedRevenue || 0).toLocaleString(), at: recLog.executedAt }),
                    action: () => navigate('/campaign-manager'),
                    actionLabel: t('banner.ordersCampaignAction'),
                };
                return null;
            }
            case 'pnl': {
                const margin = pnlStats?.margin;
                if (margin && parseFloat(margin) < 15) return {
                    type: 'warn', icon: '💹', color: '#ef4444',
                    text: t('banner.pnlLowMargin', { margin }),
                    sub: t('banner.pnlLowMarginSub'),
                    action: () => navigate('/ai-marketing-hub'),
                    actionLabel: t('banner.pnlAiAction'),
                };
                if (margin && parseFloat(margin) > 25) return {
                    type: 'success', icon: '💹', color: '#22c55e',
                    text: t('banner.pnlHighMargin', { margin }),
                    sub: t('banner.pnlHighMarginSub'),
                    action: () => navigate('/ai-marketing-hub'),
                    actionLabel: t('banner.pnlBudgetAction'),
                };
                return null;
            }
            case 'kpi': {
                const rulesActive = activeRules?.length || 0;
                if (rulesActive > 0) return {
                    type: 'info', icon: '🧠', color: '#a855f7',
                    text: t('banner.kpiRulesActive', { count: rulesActive }),
                    sub: rulesFired?.length > 0 ? t('banner.kpiRulesFired', { count: rulesFired.length }) : t('banner.kpiAllNormal'),
                    action: () => navigate('/ai-rule-engine'),
                    actionLabel: t('banner.kpiRuleAction'),
                };
                return null;
            }
            case 'attribution': {
                const aiData = aiRecommendationLog?.slice(0, 3) || [];
                if (aiData.length > 0) return {
                    type: 'info', icon: '📈', color: '#4f8ef7',
                    text: t('banner.attrAiRun', { count: aiData.length }),
                    sub: t('banner.attrAiSub'),
                    action: null,
                    actionLabel: null,
                };
                return null;
            }
            default:
                return null;
        }
    };

    const rec = getRecommendation();
    if (!rec) return null;

    const bg = {
        warn: 'rgba(234,179,8,0.06)',
        success: 'rgba(34,197,94,0.06)',
        info: 'rgba(79,142,247,0.06)',
    }[rec.type] || 'rgba(99,102,241,0.06)';

    const border = {
        warn: 'rgba(234,179,8,0.25)',
        success: 'rgba(34,197,94,0.25)',
        info: 'rgba(79,142,247,0.25)',
    }[rec.type] || 'rgba(99,102,241,0.25)';

    return (
        <div style={{
            padding: '10px 16px', borderRadius: 10, marginBottom: 12,
            background: bg, border: `1px solid ${border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
        }}>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: rec.color }}>
                    {rec.icon} {rec.text}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{rec.sub}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                {rec.action && (
                    <button onClick={rec.action} style={{
                        padding: '5px 12px', borderRadius: 8, border: 'none',
                        background: rec.color + '22', color: rec.color,
                        fontWeight: 700, fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}>{rec.actionLabel}</button>
                )}
                <button onClick={() => setDismissed(true)} style={{
                    padding: '4px 8px', borderRadius: 6, border: 'none',
                    background: 'transparent', color: 'var(--text-3)',
                    cursor: 'pointer', fontSize: 12, lineHeight: 1,
                }}>✕</button>
            </div>
        </div>
    );
}
