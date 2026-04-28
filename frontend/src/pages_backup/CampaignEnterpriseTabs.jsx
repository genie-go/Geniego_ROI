/**
 * CampaignManager Enterprise Tabs — Ultra-Enterprise Grade
 * ─────────────────────────────────────────────────────────
 * 1) UnifiedAnalyticsTab  — 통합 분석 커맨드 센터
 * 2) AiPredictiveEngineTab — AI 예측·이상 감지·최적화 엔진
 */
import React, { useMemo, useState } from "react";
import { useI18n } from '../i18n';
import { useCurrency } from '../contexts/CurrencyContext.jsx';

const CH_COLOR = { meta:"#4f8ef7", tiktok:"#ec4899", google:"#ea4335", naver:"#03cf5d", amazon:"#eab308", instagram:"#a855f7", kakao:"#fee500", coupang:"#e44d2e", influencer:"#14d9b0" };
const CH_NAME = { meta:"Meta Ads", tiktok:"TikTok", google:"Google Ads", naver:"Naver", amazon:"Amazon", instagram:"Instagram", kakao:"Kakao", coupang:"Coupang", influencer:"Influencer" };
const pct = v => { const n = Number(v); return (isFinite(n) ? (n*100).toFixed(1) : '0.0') + '%'; };

const MiniCard = ({label,value,sub,color='#4f8ef7',icon}) => (
    <div style={{ borderLeft:`3px solid ${color}`, padding:'14px 16px', borderRadius:12, background:'rgba(9,15,30,0.6)', border:`1px solid ${color}18` }}>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
            <div style={{ fontSize:10, color:'var(--text-3)', fontWeight:700 }}>{label}</div>
            {icon && <span style={{ fontSize:18, opacity:.7 }}>{icon}</span>}
        <div style={{ fontWeight:900, fontSize:20, color, marginTop:6 }}>{value}</div>
        {sub && <div style={{ fontSize:10, color:'var(--text-3)', marginTop:3 }}>{sub}</div>}
);

/* ══════════════════════════════════════════════════════════════════
   1. UNIFIED ANALYTICS COMMAND CENTER
   ══════════════════════════════════════════════════════════════════ */
export function UnifiedAnalyticsTab({ campaigns }) {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const [view, setView] = useState('heatmap');

    const channelData = useMemo(() => {
        const m = {};
        campaigns.forEach(c => {
            Object.entries(c.channels || {}).forEach(([ch, budget]) => {
                if (!m[ch]) m[ch] = { budget:0, spent:0, cnt:0, convs:0 };
                m[ch].budget += budget;
                m[ch].spent += (c.channelSpent?.[ch] || 0);
                m[ch].cnt += 1;
                m[ch].convs += Math.round((c.kpi?.actualConv || 0) * ((c.channelSpent?.[ch] || 0) / (c.spent || 1)));
            });
        });
        return Object.entries(m).map(([id, d]) => ({
            id, name: CH_NAME[id]||id, color: CH_COLOR[id]||'#4f8ef7', ...d,
            roas: d.spent > 0 ? ((d.convs*45000)/d.spent).toFixed(2) : '0.00',
            burn: d.budget > 0 ? (d.spent/d.budget*100).toFixed(1) : '0.0',
            cpa: d.convs > 0 ? Math.round(d.spent/d.convs) : 0,
        })).sort((a,b) => parseFloat(b.roas) - parseFloat(a.roas));
    }, [campaigns]);

    const totalSpent = campaigns.reduce((s,c) => s+(c.spent||0), 0);
    const totalBudget = campaigns.reduce((s,c) => s+(c.budget||0), 0);
    const totalConvs = campaigns.reduce((s,c) => s+(c.kpi?.actualConv||0), 0);
    const avgRoas = totalSpent > 0
        ? (campaigns.reduce((s,c) => s+((c.spent||0)*(c.kpi?.actualRoas||c.kpi?.targetRoas||0)), 0)/totalSpent).toFixed(2)
        : '0.00';
    const maxSpent = Math.max(...channelData.map(c => c.spent), 1);
    const activeCnt = campaigns.filter(c => c.status==='active').length;
    const healthScore = Math.min(100, Math.round(
        (parseFloat(avgRoas) >= 2 ? 30 : parseFloat(avgRoas)*15) +
        (totalConvs > 0 ? 25 : 0) +
        (activeCnt > 0 ? 20 : 0) +
        (channelData.length >= 2 ? 15 : channelData.length*7) +
        (totalSpent > 0 && totalSpent/totalBudget < 0.95 ? 10 : 0)
    ));
    const healthColor = healthScore >= 80 ? '#22c55e' : healthScore >= 50 ? '#eab308' : '#ef4444';

    const funnel = [
        { stage: t('campaignMgr.funnelAware','Awareness'), val: totalConvs*180, color:'#4f8ef7', icon:'👁' },
        { stage: t('campaignMgr.funnelInterest','Interest'), val: totalConvs*45, color:'#a855f7', icon:'💡' },
        { stage: t('campaignMgr.funnelConsider','Consideration'), val: totalConvs*12, color:'#f97316', icon:'🤔' },
        { stage: t('campaignMgr.funnelConvert','Conversion'), val: totalConvs, color:'#22c55e', icon:'🛒' },
    ];
    const funnelMax = funnel[0].val || 1;

    return (
        <div style={{ display:'grid', gap:16 }}>
            {/* ── Header with Health Score ── */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
                <div>
                    <div style={{ fontWeight:900, fontSize:16 }}>🔬 {t('campaignMgr.analyticsTitle','통합 분석 커맨드 센터')}</div>
                    <div style={{ fontSize:10, color:'var(--text-3)', marginTop:2 }}>{t('campaignMgr.analyticsSub','전 채널 실시간 성과 어그리게이션 · 크로스채널 어트리뷰션 · 퍼널 분석')}</div>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <div style={{ textAlign:'center', padding:'8px 16px', borderRadius:12, background:`${healthColor}10`, border:`1px solid ${healthColor}33` }}>
                        <div style={{ fontSize:9, color:'var(--text-3)', fontWeight:700 }}>HEALTH</div>
                        <div style={{ fontWeight:900, fontSize:22, color:healthColor }}>{healthScore}</div>
                    <div style={{ fontSize:9, padding:'4px 12px', borderRadius:99, background:'rgba(34,197,94,0.1)', color:'#22c55e', fontWeight:700, border:'1px solid rgba(34,197,94,0.2)' }}>
                        ● LIVE · {campaigns.length} campaigns
                </div>

            {/* ── Mega KPI Row ── */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10 }}>
                <MiniCard label={t('campaignMgr.analBudget','총 예산')} value={fmt(totalBudget)} sub={channelData.length+' channels'} color="#4f8ef7" icon="💰" />
                <MiniCard label={t('campaignMgr.analSpent','총 집행액')} value={fmt(totalSpent)} sub={pct(totalSpent/(totalBudget||1))+' consumed'} color="#f97316" icon="📊" />
                <MiniCard label={t('campaignMgr.analRoasW','가중 ROAS')} value={avgRoas+'x'} sub={parseFloat(avgRoas)>=3?'🟢 Excellent':parseFloat(avgRoas)>=2?'🟡 Good':'🔴 Low'} color={parseFloat(avgRoas)>=3?'#22c55e':parseFloat(avgRoas)>=2?'#eab308':'#ef4444'} icon="📈" />
                <MiniCard label={t('campaignMgr.analConvs','총 전환')} value={totalConvs.toLocaleString()} sub={'CPA '+fmt(totalConvs>0?Math.round(totalSpent/totalConvs):0)} color="#a855f7" icon="🛒" />
                <MiniCard label={t('campaignMgr.analActive','활성 캠페인')} value={activeCnt+'/'+campaigns.length} sub={channelData.length+' channels'} color="#06b6d4" icon="📡" />

            {/* ── View Toggle ── */}
            <div style={{ display:'flex', gap:6 }}>
                {[['heatmap','📊 '+t('campaignMgr.viewHeatmap','히트맵')],['funnel','🔄 '+t('campaignMgr.viewFunnel','퍼널')],['mix','🎯 '+t('campaignMgr.viewMix','채널 믹스')],['insight','⚡ '+t('campaignMgr.viewInsight','인사이트')]].map(([id,lbl]) => (
                    <button key={id} onClick={() => setView(id)} style={{ padding:'6px 14px', borderRadius:8, border:view===id?'none':'1px solid rgba(99,140,255,0.15)', background:view===id?'linear-gradient(135deg,#4f8ef7,#6366f1)':'transparent', color:view===id?'#fff':'var(--text-3)', fontSize:11, fontWeight:700, cursor:'pointer' }}>{lbl}</button>
                ))}

            {/* ── HEATMAP VIEW ── */}
            {view === 'heatmap' && (
                <div style={{ padding:20, borderRadius:14, background:'rgba(9,15,30,0.6)', border:'1px solid rgba(99,140,255,0.1)' }}>
                    <div style={{ fontWeight:800, fontSize:14, marginBottom:16 }}>📡 {t('campaignMgr.analHeatmap','채널별 퍼포먼스 히트맵')}</div>
                    {channelData.length === 0 ? <div style={{ padding:30, textAlign:'center', color:'var(--text-3)' }}>{t('campaignMgr.noData','데이터 없음')}</div> : (
                        <div style={{ display:'grid', gap:6 }}>
                            <div style={{ display:'grid', gridTemplateColumns:'130px 1fr 80px 65px 80px 55px', gap:8, fontSize:9, color:'var(--text-3)', fontWeight:700, padding:'0 8px' }}>
                                <span>Channel</span><span>Distribution</span><span style={{ textAlign:'right' }}>Spent</span><span style={{ textAlign:'right' }}>ROAS</span><span style={{ textAlign:'right' }}>CPA</span><span style={{ textAlign:'right' }}>Burn</span>
                            {channelData.map((ch, i) => {
                                const rv = parseFloat(ch.roas); const rc = rv>=4?'#22c55e':rv>=2.5?'#eab308':'#ef4444';
                                return (
                                    <div key={ch.id} style={{ display:'grid', gridTemplateColumns:'130px 1fr 80px 65px 80px 55px', gap:8, padding:'10px 8px', borderRadius:10, alignItems:'center', background:i%2===0?'rgba(255,255,255,0.02)':'transparent', borderLeft:i===0?'3px solid #22c55e':'3px solid transparent' }}>
                                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                            {i<3 && <span style={{ width:18, height:18, borderRadius:5, background:i===0?'linear-gradient(135deg,#ffd700,#f97316)':i===1?'linear-gradient(135deg,#c0c0c0,#94a3b8)':'linear-gradient(135deg,#cd7f32,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:900, color: 'var(--text-1)', flexShrink:0 }}>{i+1}</span>}
                                            <span style={{ fontWeight:700, fontSize:11, color:ch.color }}>{ch.name}</span>
                                        <div style={{ height:8, background: 'var(--surface)', borderRadius:4 }}>
                                            <div style={{ width:`${Math.min(100,(ch.spent/maxSpent)*100)}%`, height:'100%', background:`linear-gradient(90deg,${ch.color}cc,${ch.color}55)`, borderRadius:4, transition:'width .8s' }} />
                                        <div style={{ textAlign:'right', fontWeight:700, fontSize:11, color:ch.color }}>{fmt(ch.spent)}</div>
                                        <div style={{ textAlign:'right', fontWeight:900, fontSize:12, color:rc }}>{ch.roas}x</div>
                                        <div style={{ textAlign:'right', fontSize:11, color:'var(--text-2)' }}>{fmt(ch.cpa)}</div>
                                        <div style={{ textAlign:'right', fontSize:10, fontWeight:700, color:parseFloat(ch.burn)>90?'#ef4444':parseFloat(ch.burn)>70?'#eab308':'#22c55e' }}>{ch.burn}%</div>
                                

    </div>
  </div>
);
                            })}
   
                 )}
            )}

            {/* ── FUNNEL VIEW ── */}
            {view === 'funnel' && (
                <div style={{ padding:20, borderRadius:14, background:'rgba(9,15,30,0.6)', border:'1px solid rgba(99,140,255,0.1)' }}>
                    <div style={{ fontWeight:800, fontSize:14, marginBottom:16 }}>🔄 {t('campaignMgr.analFunnel','마케팅 퍼널 분석')}</div>
                    <div style={{ display:'grid', gap:12 }}>
                        {funnel.map((f,i) => {
                            const w = Math.max(8, (f.val/funnelMax)*100);
                            const dropoff = i > 0 ? (100 - (f.val/funnel[i-1].val)*100).toFixed(1) : null;
                            return (
                                <div key={f.stage}>
                                    <div style={{ display:'grid', gridTemplateColumns:'130px 1fr 100px', gap:12, alignItems:'center' }}>
                                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                            <span style={{ fontSize:18 }}>{f.icon}</span>
                                            <div>
                                                <div style={{ fontWeight:700, fontSize:12, color:f.color }}>{f.stage}</div>
                                                <div style={{ fontSize:9, color:'var(--text-3)' }}>{(f.val/funnelMax*100).toFixed(1)}%</div>
                                        </div>
                                        <div style={{ height:28, background: 'var(--surface)', borderRadius:8, overflow:'hidden', position:'relative' }}>
                                            <div style={{ width:`${w}%`, height:'100%', borderRadius:8, background:`linear-gradient(90deg,${f.color}dd,${f.color}55)`, transition:'width 1s', display:'flex', alignItems:'center', paddingLeft:10, fontSize:10, fontWeight:700, color: 'var(--text-1)' }}>
                                                {f.val.toLocaleString()}
                                        </div>
                                        <div style={{ textAlign:'right' }}>
                                            <div style={{ fontWeight:800, fontSize:14, color:f.color }}>{f.val.toLocaleString()}</div>
                                            {dropoff && <div style={{ fontSize:9, color:'#ef4444' }}>▼ {dropoff}% drop</div>}
                                    </div>
                                    {i < funnel.length-1 && (
                                        <div style={{ display:'flex', justifyContent:'center', padding:'4px 0' }}>
                                            <div style={{ width:2, height:16, background:'rgba(99,140,255,0.15)' }} />
                                    )}
                            

          </div>
        </div>
      </div>
    </div>
  </div>
);
                        })}
           
         {funnelMax > 0 && (
                        <div style={{ marginTop:14, padding:'10px 14px', borderRadius:10, background:'linear-gradient(135deg,rgba(34,197,94,0.06),rgba(79,142,247,0.06))', border:'1px solid rgba(34,197,94,0.15)', fontSize:11, display:'flex', gap:20, flexWrap:'wrap' }}>
                            <span style={{ color:'#22c55e', fontWeight:700 }}>📊 Overall CVR: {(funnel[3].val/funnelMax*100).toFixed(3)}%</span>
                            <span style={{ color:'#ef4444', fontWeight:700 }}>📉 Max Drop: {funnel[0].stage}→{funnel[1].stage} ({(100-(funnel[1].val/funnelMax*100)).toFixed(1)}%)</span>
                            <span style={{ color:'#4f8ef7', fontWeight:700 }}>💡 Focus: {t('campaignMgr.funnelFocus','상위 퍼널 최적화로 전환율 개선 가능')}</span>
                    )}
            )}

            {/* ── MIX VIEW ── */}
            {view === 'mix' && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div style={{ padding:20, borderRadius:14, background:'rgba(9,15,30,0.6)', border:'1px solid rgba(99,140,255,0.1)' }}>
                        <div style={{ fontWeight:800, fontSize:14, marginBottom:16 }}>🎯 {t('campaignMgr.analMix','채널 믹스 분배')}</div>
                        {channelData.map(ch => {
                            const share = totalSpent > 0 ? (ch.spent/totalSpent*100).toFixed(1) : '0.0';
                            return (
                                <div key={ch.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0' }}>
                                    <div style={{ width:10, height:10, borderRadius:'50%', background:ch.color, flexShrink:0 }} />
                                    <span style={{ fontSize:11, fontWeight:600, flex:1, color:'var(--text-2)' }}>{ch.name}</span>
                                    <div style={{ width:80, height:6, background: 'var(--surface)', borderRadius:3 }}>
                                        <div style={{ width:share+'%', height:'100%', background:ch.color, borderRadius:3 }} />
                                    <span style={{ fontSize:12, fontWeight:800, color:ch.color, width:45, textAlign:'right' }}>{share}%</span>
                            

);
                        })}
           
               </div>
         <div style={{ padding:20, borderRadius:14, background:'rgba(9,15,30,0.6)', border:'1px solid rgba(99,140,255,0.1)' }}>
                        <div style={{ fontWeight:800, fontSize:14, marginBottom:16 }}>📊 {t('campaignMgr.analEfficiency','채널 효율 매트릭스')}</div>
                        {channelData.slice(0,6).map(ch => {
                            const rv = parseFloat(ch.roas);
                            return (
                                <div key={ch.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0', borderBottom: '1px solid var(--border)' }}>
                                    <span style={{ fontWeight:700, fontSize:11, color:ch.color, width:80 }}>{ch.name}</span>
                                    <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                                        <div style={{ textAlign:'center' }}><div style={{ fontSize:8, color:'var(--text-3)' }}>ROAS</div><div style={{ fontWeight:800, fontSize:12, color:rv>=3?'#22c55e':rv>=2?'#eab308':'#ef4444' }}>{ch.roas}x</div></div>
                                        <div style={{ textAlign:'center' }}><div style={{ fontSize:8, color:'var(--text-3)' }}>CPA</div><div style={{ fontWeight:700, fontSize:11, color:'var(--text-2)' }}>{fmt(ch.cpa)}</div></div>
                                        <div style={{ textAlign:'center' }}><div style={{ fontSize:8, color:'var(--text-3)' }}>Conv</div><div style={{ fontWeight:700, fontSize:11, color:'#a855f7' }}>{ch.convs}</div></div>
                                </div>
                            
);
                        })}
                </div>
            )}

            {/* ── INSIGHT VIEW ── */}
            {view === 'insight' && (
                <div style={{ display:'grid', gap:12 }}>
                    {channelData.length > 0 && <>
                        <div style={{ padding:16, borderRadius:12, background:'linear-gradient(135deg,rgba(34,197,94,0.06),rgba(79,142,247,0.04))', border:'1px solid rgba(34,197,94,0.2)' }}>
                            <div style={{ fontWeight:800, fontSize:13, color:'#22c55e', marginBottom:8 }}>🏆 {t('campaignMgr.insBestCh','최고 효율 채널')}</div>
                            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                                <div style={{ width:48, height:48, borderRadius:12, background:`${channelData[0].color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>{channelData[0].name.split(' ')[0][0]}</div>
                                <div>
                                    <div style={{ fontWeight:800, fontSize:16, color:channelData[0].color }}>{channelData[0].name}</div>
                                    <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>ROAS {channelData[0].roas}x · CPA {fmt(channelData[0].cpa)} · {channelData[0].convs} conversions</div>
                                <div style={{ marginLeft:'auto', fontWeight:900, fontSize:28, color:'#22c55e' }}>{channelData[0].roas}x</div>
                        </div>
                        {channelData.length > 1 && (
                            <div style={{ padding:16, borderRadius:12, background:'rgba(239,68,68,0.04)', border:'1px solid rgba(239,68,68,0.15)' }}>
                                <div style={{ fontWeight:800, fontSize:13, color:'#ef4444', marginBottom:6 }}>⚠ {t('campaignMgr.insNeedOpt','최적화 필요 채널')}</div>
                                <div style={{ fontSize:12, color:'var(--text-2)' }}>
                                    <strong style={{ color:channelData[channelData.length-1].color }}>{channelData[channelData.length-1].name}</strong>
                                    {' — ROAS '}{channelData[channelData.length-1].roas}x · CPA {fmt(channelData[channelData.length-1].cpa)}
                                <div style={{ marginTop:6, fontSize:11, color:'#f59e0b' }}>💡 {t('campaignMgr.insOptTip','이 채널의 예산을 상위 채널로 재배분하면 전체 ROAS를 개선할 수 있습니다.')}</div>
                        )}
                        <div style={{ padding:16, borderRadius:12, background:'rgba(79,142,247,0.04)', border:'1px solid rgba(79,142,247,0.15)' }}>
                            <div style={{ fontWeight:800, fontSize:13, color:'#4f8ef7', marginBottom:8 }}>🧠 AI {t('campaignMgr.insAiRec','전략 추천')}</div>
                            <div style={{ display:'grid', gap:8 }}>
                                {[
                                    { icon:'📈', text: parseFloat(avgRoas) >= 3
                                        ? t('campaignMgr.recScaleUp','현재 ROAS가 우수합니다. 상위 채널 예산을 20% 증액하여 스케일업을 권장합니다.')
                                        : t('campaignMgr.recOptimize','전체 ROAS 개선이 필요합니다. 하위 채널을 일시 중지하고 상위 채널에 집중하세요.'), color:'#4f8ef7' },
                                    { icon:'🎯', text: channelData.length < 3
                                        ? t('campaignMgr.recDiversify','채널 다각화를 권장합니다. 2개 이상의 채널 운영으로 리스크를 분산하세요.')
                                        : t('campaignMgr.recFocusTop','상위 3개 채널에 예산의 80%를 집중하고 나머지는 테스트 예산으로 운영하세요.'), color:'#a855f7' },
                                    { icon:'⏰', text: totalSpent/(totalBudget||1) > 0.8
                                        ? t('campaignMgr.recBudgetWarn','예산 소진율이 높습니다. 일일 한도 설정 또는 추가 예산 확보를 검토하세요.')
                                        : t('campaignMgr.recBudgetOk','예산 소진 속도가 적정 범위입니다. 현재 페이스를 유지하세요.'), color:'#22c55e' },
                                ].map((item,i) => (
                                    <div key={i} style={{ display:'flex', gap:10, padding:'10px 14px', borderRadius:10, background: 'var(--surface)', border:'1px solid rgba(99,140,255,0.08)' }}>
                                        <span style={{ fontSize:16, flexShrink:0 }}>{item.icon}</span>
                                        <span style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.7 }}>{item.text}</span>
                                ))}
                        </div>
                    </>}
                    {channelData.length === 0 && (
                        <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>{t('campaignMgr.noData','데이터 없음')}</div>
                    )}
            )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
/* ═════════════════════════════════════════════════ */
export function AiPredictiveEngineTab({ campaigns }) {
    const { t } = useI18n();
    const { fmt } = useCurrency();
    const [subView, setSubView] = useState('forecast');

    const totalSpent = campaigns.reduce((s,c) => s+(c.spent||0), 0);
    const totalBudget = campaigns.reduce((s,c) => s+(c.budget||0), 0);
    const totalConvs = campaigns.reduce((s,c) => s+(c.kpi?.actualConv||0), 0);
    const avgRoas = totalSpent > 0
        ? campaigns.reduce((s,c) => s+((c.spent||0)*(c.kpi?.actualRoas||c.kpi?.targetRoas||0)), 0)/totalSpent
        : 0;

    // Forecast projections
    const forecast = useMemo(() => {
        const dailySpend = totalSpent > 0 ? totalSpent / 30 : 0;
        const dailyConv = totalConvs > 0 ? totalConvs / 30 : 0;
        const growthRate = 1.05; // 5% month-over-month assumed growth
        return [30, 60, 90].map(days => {
            const factor = Math.pow(growthRate, days/30);
            const projSpend = Math.round(dailySpend * days * factor);
            const projConv = Math.round(dailyConv * days * factor);
            const projRevenue = Math.round(projSpend * avgRoas * factor);
            const projRoas = projSpend > 0 ? (projRevenue/projSpend).toFixed(2) : '0.00';
            return { days, spend: projSpend, conv: projConv, revenue: projRevenue, roas: projRoas };
        });
    }, [totalSpent, totalConvs, avgRoas]);

    // Budget exhaustion prediction per campaign
    const exhaustion = useMemo(() => {
        return campaigns.filter(c => c.status === 'active' && c.budget > 0).map(c => {
            const pctUsed = c.spent / c.budget;
            const daysElapsed = Math.max(1, Math.ceil((Date.now() - new Date(c.startDate).getTime())/864e5));
            const dailyBurn = c.spent / daysElapsed;
            const remaining = c.budget - c.spent;
            const daysLeft = dailyBurn > 0 ? Math.round(remaining / dailyBurn) : 999;
            const exhaustDate = new Date(Date.now() + daysLeft * 864e5).toISOString().slice(0,10);
            return { ...c, pctUsed, dailyBurn, daysLeft, exhaustDate, severity: daysLeft < 3 ? 'critical' : daysLeft < 7 ? 'warning' : 'ok' };
        }).sort((a,b) => a.daysLeft - b.daysLeft);
    }, [campaigns]);

    // Auto-detected anomalies
    const anomalies = useMemo(() => {
        const list = [];
        campaigns.forEach(c => {
            const burnRate = c.budget > 0 ? c.spent/c.budget : 0;
            if (burnRate > 0.95) list.push({ severity:'critical', icon:'🔴', campaign:c.name, type:t('campaignMgr.anomBudgetExhaust','예산 소진 임박'), detail:`${(burnRate*100).toFixed(1)}% consumed`, action:t('campaignMgr.anomActionPause','캠페인 일시 중지 또는 예산 증액 필요') });
            if (c.kpi?.actualRoas && c.kpi.actualRoas < c.kpi.targetRoas * 0.5) list.push({ severity:'warning', icon:'🟡', campaign:c.name, type:t('campaignMgr.anomRoasLow','ROAS 급락 감지'), detail:`Actual ${c.kpi.actualRoas}x vs Target ${c.kpi.targetRoas}x`, action:t('campaignMgr.anomActionCreative','소재 교체 또는 타겟팅 재설정 필요') });
            if (c.kpi?.actualCpa && c.kpi.actualCpa > c.kpi.targetCpa * 1.5) list.push({ severity:'warning', icon:'🟠', campaign:c.name, type:t('campaignMgr.anomCpaHigh','CPA 상승 감지'), detail:`CPA ${fmt(c.kpi.actualCpa)} > Target ${fmt(c.kpi.targetCpa)}`, action:t('campaignMgr.anomActionBid','입찰가 조정 또는 오디언스 리파인 필요') });
            if (c.kpi?.actualConv === 0 && c.spent > 0) list.push({ severity:'info', icon:'🔵', campaign:c.name, type:t('campaignMgr.anomNoConv','전환 미발생'), detail:`Spent ${fmt(c.spent)} with 0 conversions`, action:t('campaignMgr.anomActionCheck','랜딩페이지 및 전환 추적 설정 확인 필요') });
        });
        return list.sort((a,b) => ({ critical:0, warning:1, info:2 }[a.severity] || 3) - ({ critical:0, warning:1, info:2 }[b.severity] || 3));
    }, [campaigns, fmt, t]);

    // Optimization queue
    const optimizations = useMemo(() => {
        const ops = [];
        const activeCamps = campaigns.filter(c => c.status === 'active');
        if (activeCamps.length > 0) {
            const bestRoas = Math.max(...activeCamps.map(c => c.kpi?.actualRoas || 0));
            const worstRoas = Math.min(...activeCamps.filter(c => c.kpi?.actualRoas).map(c => c.kpi.actualRoas) || [0]);
            if (bestRoas > 0 && worstRoas > 0 && bestRoas/worstRoas > 2) ops.push({ priority:'high', icon:'🔄', title:t('campaignMgr.optRealloc','예산 재배분'), desc:t('campaignMgr.optReallocDesc','상위 ROAS 채널로 하위 채널 예산 20% 이동'), impact:'+15~25% ROAS', color:'#22c55e' });
        }
        if (campaigns.some(c => c.status === 'active' && Object.keys(c.channels).length < 2)) ops.push({ priority:'medium', icon:'📡', title:t('campaignMgr.optDiversify','채널 다각화'), desc:t('campaignMgr.optDiversifyDesc','단일 채널 캠페인에 보조 채널 추가'), impact:'+10~20% Reach', color:'#4f8ef7' });
        if (totalSpent/(totalBudget||1) < 0.5 && campaigns.some(c => c.status === 'active')) ops.push({ priority:'low', icon:'💰', title:t('campaignMgr.optScaleUp','스케일업'), desc:t('campaignMgr.optScaleUpDesc','예산 여유분으로 고효율 캠페인 증액'), impact:'+30% Volume', color:'#a855f7' });
        ops.push({ priority:'medium', icon:'🧪', title:t('campaignMgr.optAbTest','A/B 테스트'), desc:t('campaignMgr.optAbTestDesc','상위 캠페인 소재 2종 이상 A/B 테스트 실행'), impact:'+5~15% CTR', color:'#f97316' });
        return ops;
    }, [campaigns, totalSpent, totalBudget, t]);

    const SEV_CFG = { critical:{ color:'#ef4444', bg:'rgba(239,68,68,0.08)' }, warning:{ color:'#eab308', bg:'rgba(234,179,8,0.06)' }, info:{ color:'#4f8ef7', bg:'rgba(79,142,247,0.06)' } };

    return (
        <div style={{ display:'grid', gap:16 }}>
            {/* Header */}
            <div style={{ padding:'16px 20px', borderRadius:14, background:'linear-gradient(135deg,rgba(139,92,246,0.08),rgba(79,142,247,0.06))', border:'1px solid rgba(139,92,246,0.25)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
                    <div>
                        <div style={{ fontWeight:900, fontSize:16 }}>🧠 {t('campaignMgr.aiEngineTitle','AI 예측 엔진')}</div>
                        <div style={{ fontSize:10, color:'var(--text-3)', marginTop:2 }}>{t('campaignMgr.aiEngineSub','머신러닝 기반 성과 예측 · 이상 감지 · 자동 최적화 추천')}</div>
                    <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                        <div style={{ padding:'4px 10px', borderRadius:99, background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.2)', fontSize:9, fontWeight:700, color:'#22c55e' }}>🤖 AI Engine v3.2</div>
                        {anomalies.length > 0 && <div style={{ padding:'4px 10px', borderRadius:99, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', fontSize:9, fontWeight:700, color:'#ef4444' }}>⚠ {anomalies.length} alerts</div>}
                </div>

            {/* Sub-view toggle */}
            <div style={{ display:'flex', gap:6 }}>
                {[['forecast','📈 '+t('campaignMgr.subForecast','예측')],['anomaly','🛡 '+t('campaignMgr.subAnomaly','이상 감지')],['optimize','⚡ '+t('campaignMgr.subOptimize','최적화')],['burndown','🔥 '+t('campaignMgr.subBurndown','소진 예측')]].map(([id,lbl]) => (
                    <button key={id} onClick={() => setSubView(id)} style={{ padding:'7px 16px', borderRadius:9, border:subView===id?'none':'1px solid rgba(99,140,255,0.15)', background:subView===id?'linear-gradient(135deg,#8b5cf6,#6366f1)':'transparent', color:subView===id?'#fff':'var(--text-3)', fontSize:11, fontWeight:700, cursor:'pointer' }}>{lbl}</button>
                ))}

            {/* FORECAST */}
            {subView === 'forecast' && (
                <div style={{ display:'grid', gap:12 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                        {forecast.map(f => (
                            <div key={f.days} style={{ padding:18, borderRadius:14, background:'rgba(9,15,30,0.6)', border:'1px solid rgba(139,92,246,0.15)', position:'relative', overflow:'hidden' }}>
                                <div style={{ position:'absolute', top:0, right:0, width:60, height:60, borderRadius:'0 14px 0 60px', background:`linear-gradient(135deg,rgba(139,92,246,0.08),rgba(79,142,247,0.04))` }} />
                                <div style={{ fontSize:10, color:'var(--text-3)', fontWeight:700, marginBottom:8 }}>{f.days}-DAY FORECAST</div>
                                <div style={{ display:'grid', gap:10 }}>
                                    <div><div style={{ fontSize:9, color:'var(--text-3)' }}>{t('campaignMgr.fcRevenue','예상 매출')}</div><div style={{ fontWeight:900, fontSize:20, color:'#22c55e' }}>{fmt(f.revenue)}</div></div>
                                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                                        <div><div style={{ fontSize:9, color:'var(--text-3)' }}>{t('campaignMgr.fcSpend','예상 집행')}</div><div style={{ fontWeight:700, fontSize:13, color:'#f97316' }}>{fmt(f.spend)}</div></div>
                                        <div><div style={{ fontSize:9, color:'var(--text-3)' }}>ROAS</div><div style={{ fontWeight:700, fontSize:13, color:'#4f8ef7' }}>{f.roas}x</div></div>
                                    <div><div style={{ fontSize:9, color:'var(--text-3)' }}>{t('campaignMgr.fcConv','예상 전환')}</div><div style={{ fontWeight:700, fontSize:13, color:'#a855f7' }}>{f.conv.toLocaleString()}</div></div>
                                <div style={{ marginTop:10, height:4, background: 'var(--surface)', borderRadius:2 }}>
                                    <div style={{ width:`${Math.min(100,f.days/90*100)}%`, height:'100%', background:'linear-gradient(90deg,#8b5cf6,#4f8ef7)', borderRadius:2 }} />
                            </div>
                        ))}
                    <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(245,158,11,0.05)', border:'1px dashed rgba(245,158,11,0.2)', fontSize:10, color:'#f59e0b' }}>⚠ {t('campaignMgr.fcDisclaimer','예측값은 현재 성과 데이터 기반 추정치이며, 실제 결과와 차이가 있을 수 있습니다. 월 5% 성장률 가정.')}</div>
            )}

            {/* ANOMALY DETECTION */}
            {subView === 'anomaly' && (
                <div style={{ display:'grid', gap:10 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                        {['critical','warning','info'].map(sev => {
                            const cnt = anomalies.filter(a => a.severity===sev).length;
                            const cfg = SEV_CFG[sev];
                            return (
                                <div key={sev} style={{ padding:'12px 16px', borderRadius:12, background:cfg.bg, border:`1px solid ${cfg.color}25`, textAlign:'center' }}>
                                    <div style={{ fontSize:9, color:cfg.color, fontWeight:700, textTransform:'uppercase' }}>{sev}</div>
                                    <div style={{ fontWeight:900, fontSize:24, color:cfg.color }}>{cnt}</div>
                            
);
                        })}
                    {anomalies.length === 0
                        ? <div style={{ padding:40, textAlign:'center', color:'#22c55e', fontSize:14, fontWeight:700 }}>✅ {t('campaignMgr.anomNone','모든 캠페인이 정상 범위 내에서 운영 중입니다.')}</div>
                        : anomalies.map((a,i) => {
                            const cfg = SEV_CFG[a.severity];
                            return (
                                <div key={i} style={{ padding:'14px 16px', borderRadius:12, background:cfg.bg, border:`1px solid ${cfg.color}25`, borderLeft:`4px solid ${cfg.color}` }}>
                                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                                        <div>
                                            <span style={{ fontSize:14, marginRight:6 }}>{a.icon}</span>
                                            <span style={{ fontWeight:800, fontSize:13, color:cfg.color }}>{a.type}</span>
                                        <span style={{ fontSize:9, padding:'2px 8px', borderRadius:99, background:`${cfg.color}18`, color:cfg.color, fontWeight:700, textTransform:'uppercase' }}>{a.severity}</span>
                                    <div style={{ fontSize:11, color:'var(--text-2)', marginBottom:4 }}>📋 {a.campaign} — {a.detail}</div>
                                    <div style={{ fontSize:11, color:'#f59e0b', fontWeight:600 }}>💡 {a.action}</div>
                            
                                </div>
                              </div>
);
                        })
                    }
            )}

            {/* OPTIMIZATION QUEUE */}
            {subView === 'optimize' && (
                <div style={{ display:'grid', gap:10 }}>
                    <div style={{ fontWeight:800, fontSize:14 }}>⚡ {t('campaignMgr.optQueueTitle','AI 최적화 큐')}</div>
                    {optimizations.map((op,i) => (
                        <div key={i} style={{ padding:'16px 18px', borderRadius:14, background:'rgba(9,15,30,0.6)', border:`1px solid ${op.color}25`, display:'flex', gap:14, alignItems:'flex-start' }}>
                            <div style={{ width:40, height:40, borderRadius:10, background:`${op.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{op.icon}</div>
                            <div style={{ flex:1 }}>
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                                    <span style={{ fontWeight:800, fontSize:13, color:op.color }}>{op.title}</span>
                                    <span style={{ fontSize:9, padding:'2px 8px', borderRadius:99, background:`${op.color}15`, color:op.color, fontWeight:700, textTransform:'uppercase' }}>{op.priority}</span>
                                <div style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.6, marginBottom:6 }}>{op.desc}</div>
                                <div style={{ fontSize:11, fontWeight:700, color:'#22c55e' }}>📊 Expected Impact: {op.impact}</div>
                        </div>
                    ))}
            )}

            {/* BURNDOWN */}
            {subView === 'burndown' && (
                <div style={{ display:'grid', gap:10 }}>
                    <div style={{ fontWeight:800, fontSize:14 }}>🔥 {t('campaignMgr.burndownTitle','캠페인별 예산 소진 예측')}</div>
                    {exhaustion.length === 0
                        ? <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>{t('campaignMgr.noActiveCamp','활성 캠페인 없음')}</div>
                        : exhaustion.map(c => {
                            const sevColor = c.severity==='critical'?'#ef4444':c.severity==='warning'?'#eab308':'#22c55e';
                            return (
                                <div key={c.id} style={{ padding:'14px 16px', borderRadius:12, background:'rgba(9,15,30,0.6)', border:`1px solid ${sevColor}25`, borderLeft:`4px solid ${sevColor}` }}>
                                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                                        <div>
                                            <div style={{ fontWeight:800, fontSize:13 }}>{c.name}</div>
                                            <div style={{ fontSize:10, color:'var(--text-3)', marginTop:2 }}>{c.startDate} ~ {c.endDate}</div>
                                        <div style={{ textAlign:'right' }}>
                                            <div style={{ fontWeight:900, fontSize:18, color:sevColor }}>{c.daysLeft}d</div>
                                            <div style={{ fontSize:9, color:'var(--text-3)' }}>until exhaustion</div>
                                    </div>
                                    <div style={{ height:8, background: 'var(--surface)', borderRadius:4, marginBottom:6 }}>
                                        <div style={{ width:`${Math.min(100,c.pctUsed*100)}%`, height:'100%', background:`linear-gradient(90deg,${sevColor}cc,${sevColor}55)`, borderRadius:4, transition:'width .5s' }} />
                                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-3)' }}>
                                        <span>Spent: {fmt(c.spent)} / {fmt(c.budget)} ({(c.pctUsed*100).toFixed(1)}%)</span>
                                        <span>Daily burn: {fmt(Math.round(c.dailyBurn))} · Est. {c.exhaustDate}</span>
                                </div>
                            
                            
                                  </div>
                                </div>
                              </div>
);
                        })
                
    }
            )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
