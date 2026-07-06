import React from "react";
import { ImgCreativeEditor } from './ImgCreativeEditor.jsx';
import MediaEditor from '../components/MediaEditor.jsx';
import { BudgetPanel, ChannelBarCard, ChannelAdCard, AdMockup } from './AIRecommendTab.jsx';
import { CHANNEL_COLORS, CHANNEL_ICONS } from './AIRecommendTab.jsx';
import { useI18n } from '../i18n/index.js';
import { sanitizeHtml } from '../utils/xssSanitizer.js';

// ★[266차 HIGH 크래시 수정] 채널 결과 카드 — /ai-recommend 기본 'channels' 탭이 참조하던 <ChannelResultCard> 가
//   231차 pages_backup 삭제 시 소실돼 매 렌더 ReferenceError 화이트스크린이었다(259차 ResultSection 추출 이후 잠복).
//   손상된 자동번역 원본을 복원하지 않고, 현재 프리미티브(AdMockup·CHANNEL_COLORS/ICONS)로 클린 재구성(승인/집행/재생성 워크플로 보존).
function ChannelResultCard({ ch, idx, creative, svcLabel, approved, executed, executing, onApprove, onExecute, onRegenImg, regenLoading }) {
    const { t } = useI18n();
    const color = CHANNEL_COLORS[ch.channel_id] || CHANNEL_COLORS.default || '#4f8ef7';
    const icon = CHANNEL_ICONS[ch.channel_id] || '📣';
    const size = ch.channel_id === 'youtube' ? 'banner'
        : (ch.channel_id === 'instagram' || ch.channel_id === 'tiktok') ? 'story' : 'feed';
    const loading = regenLoading === ch.channel_id;
    const kpis = [
        [t('gAiRec.kpiRoas', '예상 ROAS'), ch.expected_roas],
        [t('gAiRec.kpiGoal', 'KPI 목표'), ch.kpi_goal],
        [t('gAiRec.kpiTarget', '타겟팅'), ch.targeting],
        [t('gAiRec.kpiCpa', '예상 CPA'), ch.expected_cpa],
        [t('gAiRec.kpiMetric', '핵심 지표'), ch.key_metric],
    ].filter(([, v]) => v);
    return (
        <div style={{ borderRadius: 14, border: `1px solid ${approved ? color + '66' : 'rgba(99,140,255,0.13)'}`, background: approved ? color + '07' : 'rgba(9,15,30,0.55)', overflow: 'hidden' }}>
            <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: color + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</div>
                    <div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 900, color, fontSize: 15 }}>#{idx + 1}</span>
                            <span style={{ fontWeight: 800, fontSize: 13 }}>{ch.channel_name}</span>
                            {ch.ad_type && <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 99, background: color + '18', color, border: `1px solid ${color}33` }}>{ch.ad_type}</span>}
                        </div>
                        {ch.reason && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{ch.reason}</div>}
                    </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {ch.effectiveness_score ? <div style={{ fontSize: 15, fontWeight: 900, color }}>{ch.effectiveness_score}</div> : null}
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>₩{(ch.monthly_budget || 0).toLocaleString()}/mo</div>
                </div>
            </div>
            <div style={{ padding: '14px 16px', display: 'grid', gap: 12 }}>
                {ch.budget_pct != null && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
                            <span style={{ color, fontWeight: 700 }}>{t('gAiRec.budgetAlloc', '예산 배분')} {ch.budget_pct}%</span>
                        </div>
                        <div style={{ height: 7, background: 'var(--border)', borderRadius: 4 }}>
                            <div style={{ width: (ch.budget_pct || 0) + '%', height: '100%', background: `linear-gradient(90deg,${color},${color}99)`, borderRadius: 4 }} />
                        </div>
                    </div>
                )}
                {kpis.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
                        {kpis.map(([l, v]) => (
                            <div key={l} style={{ background: 'rgba(0,0,0,0.22)', borderRadius: 8, padding: '6px 9px' }}>
                                <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 2 }}>{l}</div>
                                <div style={{ fontSize: 10, fontWeight: 700 }}>{v}</div>
                            </div>
                        ))}
                    </div>
                )}
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ flexShrink: 0 }}>
                        {loading ? (
                            <div style={{ width: 140, height: 140, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 22 }}>🎨</span></div>
                        ) : (
                            <AdMockup chId={ch.channel_id} headline={creative?.headline || ch.action_plan || ch.channel_name} copy={creative?.copy || ch.ad_type || ''} color={color} size={size} />
                        )}
                        <button onClick={() => onRegenImg(ch.channel_id)} disabled={loading} style={{ marginTop: 5, width: '100%', padding: '4px 0', borderRadius: 6, border: 'none', background: color + '22', color, fontSize: 9, fontWeight: 700, cursor: loading ? 'default' : 'pointer' }}>
                            {loading ? '⏳' : `🔄 ${t('gAiRec.regenImage', '이미지 재생성')}`}
                        </button>
                    </div>
                    <div style={{ flex: 1, display: 'grid', gap: 6 }}>
                        {ch.action_plan && <div style={{ fontSize: 10, color: 'var(--text-2)', padding: '7px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', lineHeight: 1.6 }}>📋 {ch.action_plan}</div>}
                        {creative && (creative.headline || creative.copy) && (
                            <div style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--surface)', border: `1px solid ${color}22` }}>
                                {creative.headline && <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 3 }}>"{creative.headline}"</div>}
                                {creative.copy && <div style={{ fontSize: 10, color: 'var(--text-2)', lineHeight: 1.5 }}>{creative.copy}</div>}
                                {creative.cta && <div style={{ marginTop: 4, fontSize: 9, padding: '2px 8px', borderRadius: 6, background: color + '18', color, display: 'inline-block', fontWeight: 700 }}>CTA: {creative.cta}</div>}
                            </div>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => onApprove(ch.channel_id)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${approved ? color : 'rgba(99,140,255,0.22)'}`, background: approved ? color + '1a' : 'transparent', color: approved ? color : 'var(--text-3)', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                        {approved ? `✅ ${t('gAiRec.approved', '승인됨')}` : t('gAiRec.approve', '승인하기')}
                    </button>
                    {approved && !executed && (
                        <button onClick={() => onExecute(ch)} disabled={executing} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: executing ? 'default' : 'pointer', background: executing ? 'rgba(99,102,241,0.3)' : `linear-gradient(135deg,${color},#6366f1)`, color: '#fff', fontWeight: 800, fontSize: 11 }}>
                            {executing ? `⏳ ${t('gAiRec.running', '실행 중...')}` : `▶ ${t('gAiRec.runAd', '광고 자동화 실행')}`}
                        </button>
                    )}
                    {executed && (
                        <div style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontWeight: 800, fontSize: 11, textAlign: 'center' }}>✅ {t('gAiRec.runDone', '자동화 실행 완료')}</div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ResultSection(props) {
    const { t } = useI18n();
    const {
        result, dataSource, dataModel, searchQ, cat,
        customBudget, setCustomBudget, budgetEditing, setBudgetEditing, budgetInputVal, setBudgetInputVal,
        activeTab, setActiveTab, imgStatus, creatives, setCreatives, approved, executing, executed,
        handleApprove, handleExecute, handleExecuteAll, approvedCount, regenImage, regenLoad,
        genCreatives, imgSubTab, setImgSubTab, uploadChannelId, setUploadChannelId,
        uploadCh, uploadChColor, uploadCreative, aiTabDisplay, mkUpdater, handleDownload,
        handleApproveAll, showApproveAllBanner, setShowApproveAllBanner
    } = props;
    return (
        <div style={{ display: 'grid', gap: 14 }}>

            {/* AI Analysis Summary Card */}
            <div className="card card-glass" style={{ padding: 20 }}>
                {/* 데이터 Source 배지 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                    {dataSource === 'fallback' ? (
                        <>
                            <span style={{ padding: '2px 10px', borderRadius: 99, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.35)', fontSize: 9, fontWeight: 700, color: '#fbbf24' }}>
                                {t('gAiRec.expertDb')}
                            </span>
                            <span style={{ padding: '2px 10px', borderRadius: 99, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 9, color: '#a5b4fc' }}>
                                {t('gAiRec.benchmarkBase')}
                            </span>
                        </>
                    ) : (
                        <span style={{ padding: '2px 10px', borderRadius: 99, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)', fontSize: 9, fontWeight: 700, color: '#818cf8' }}>
                            🤖 Claude AI {t('gAiRec.analysisRes')} ({dataModel})
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 28 }}>{dataSource === 'fallback' ? '📊' : '🤖'}</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 900, fontSize: 14, color: dataSource === 'fallback' ? '#f59e0b' : '#6366f1' }}>
                            {dataSource === 'fallback' ? t('gAiRec.expertMarketingRes') : `Claude AI ${t('gAiRec.analysisRes')}`}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>Search: "{searchQ}" · {cat.label} ({cat.route})</div>
                    </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.8, marginBottom: 12 }}>{result.summary}</div>

                {/* Monthly/Annual Budget Recommend (편집 가능) */}
                {(result.monthly_budget || result.annual_budget) && (

                    <BudgetPanel result={result} customBudget={customBudget} setCustomBudget={setCustomBudget}

                        budgetEditing={budgetEditing} setBudgetEditing={setBudgetEditing}

                        budgetInputVal={budgetInputVal} setBudgetInputVal={setBudgetInputVal} />

                )}


                {result.strategy && (
                    <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', fontSize: 11, color: '#a5b4fc' }}>
                        📌 {t('gAiRec.coreStrategy')}: {result.strategy}
                    </div>
                )}

                {/* Budget 근거 Panel */}
                {(result.budget_rationale || result.product_analysis) && (
                    <div style={{ marginTop: 4, padding: '12px 14px', borderRadius: 10, background: 'linear-gradient(135deg,rgba(34,197,94,0.06),rgba(79,142,247,0.06))', border: '1px solid rgba(34,197,94,0.2)' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#22c55e', marginBottom: 8 }}>💰 {t('gAiRec.aiBudgetBase')}</div>
                        {result.budget_rationale && (
                            <div style={{ fontSize: 10, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: result.product_analysis ? 8 : 0 }}>
                                {result.budget_rationale}
                            </div>
                        )}
                        {result.product_analysis && (
                            <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.18)', fontSize: 10, color: 'var(--text-3)', lineHeight: 1.65 }}>
                                📊 {t('gAiRec.prodEfficiency')}: {result.product_analysis}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Channel Effectiveness Rank 바 Chart */}
            <div className="card card-glass" style={{ padding: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 10 }}>📊 {t('gAiRec.channelCompare')}</div>
                {(result.channels || []).map((ch, idx) => (
                    <ChannelBarCard key={ch.channel_id} ch={{ ...ch, _idx: idx }} colors={CHANNEL_COLORS} icons={CHANNEL_ICONS} />
                ))}
            </div>

            {/* Image Create Banner Button (눈에 띄게) */}
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'linear-gradient(135deg,rgba(79,142,247,0.1),rgba(168,85,247,0.1))', border: '1px solid rgba(99,102,241,0.25)', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 18 }}>🎨</span>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#a5b4fc' }}>Ad Marketing Image Auto Generate</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('gAiRec.imgAutoCreateDesc')}</div>
                </div>
                <button onClick={() => { setActiveTab('images'); if (imgStatus === 'idle') genCreatives(result.channels || [], searchQ); }} style={{ padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#4f8ef7,#a855f7)', color: '#fff', fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap' }}>
                    {imgStatus === 'loading' ? `⏳ ${t('gAiRec.creating')}...` : imgStatus === 'done' ? `🖼 ${t('gAiRec.viewImg')}` : `🎨 ${t('gAiRec.startImgCreate')}`}
                </button>
            </div>

            {/* 서브Tab */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', borderRadius: 10, padding: 4, border: '1px solid var(--border)' }}>
                {[['channels', `📋 ${t('gAiRec.channelDetails')}`], ['images', `🖼 ${t('gAiRec.adImgCreate')}${imgStatus === 'loading' ? ' ⏳' : imgStatus === 'done' ? ' ✓' : ''}`], ['timeline', `📅 ${t('gAiRec.timeline')}`]].map(([id, lbl]) => (
                    <button key={id} onClick={() => setActiveTab(id)}
                        style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: activeTab === id ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'transparent', color: activeTab === id ? '#fff' : 'var(--text-3)', transition: 'all 0.2s' }}>
                        {lbl}
                    </button>
                ))}
            </div>

            {/* Channelper 상세 Card (편집+Image+Approval/Run) */}
            {activeTab === 'channels' && (
                <div style={{ display: 'grid', gap: 12 }}>
                    {/* All Approval Done Banner */}
                    {showApproveAllBanner && (
                        <div style={{ padding: '14px 18px', borderRadius: 12, background: 'linear-gradient(135deg,rgba(34,197,94,0.12),rgba(79,142,247,0.12))', border: '1px solid rgba(34,197,94,0.4)', display: 'flex', alignItems: 'center', gap: 14, animation: 'fadeIn 0.4s' }}>
                            <span style={{ fontSize: 28 }}>🎉</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 900, color: '#22c55e', marginBottom: 3 }}>All Channel Approval Done!</div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{t('gAiRec.canCreateAd')}</div>
                            </div>
                            <button onClick={() => { setActiveTab('images'); if (imgStatus === 'idle') genCreatives(result?.channels || [], searchQ || cat.label); setShowApproveAllBanner(false); }} style={{ padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontWeight: 900, fontSize: 12, whiteSpace: 'nowrap' }}>
                                🎨 {t('gAiRec.startMaterialCreate')} →
                            </button>
                        </div>
                    )}

                    {imgStatus === 'loading' && (
                        <div style={{ padding: '10px 14px', borderRadius: 9, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', fontSize: 11, color: '#a5b4fc', textAlign: 'center' }}>
                            🎨 {t('gAiRec.claudeCreating')}
                        </div>
                    )}
                    {(result.channels || []).map((ch, idx) => (
                        <ChannelResultCard key={ch.channel_id}
                            ch={ch} idx={idx} creative={creatives[ch.channel_id]}
                            svcLabel={cat.label}
                            approved={!!approved[ch.channel_id]}
                            executed={!!executed[ch.channel_id]}
                            executing={!!executing[ch.channel_id]}
                            onApprove={handleApprove}
                            onExecute={handleExecute}
                            onRegenImg={regenImage}
                            regenLoading={regenLoad}
                        />
                    ))}

                    {/* All Approval/일괄 Run */}
                    {(result.channels || []).length > 0 && (
                        <div className="card card-glass" style={{ padding: 14 }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                <button onClick={handleApproveAll}
                                    style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: '#a5b4fc', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                                    ✅ {t('gAiRec.allApprove')}
                                </button>
                                <button onClick={handleExecuteAll} disabled={approvedCount === 0}
                                    style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: approvedCount > 0 ? 'pointer' : 'not-allowed', background: approvedCount > 0 ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'rgba(255,255,255,0.05)', color: approvedCount > 0 ? '#fff' : 'var(--text-3)', fontWeight: 800, fontSize: 11 }}>
                                    🚀 {approvedCount}{t('gAiRec.runAllBatch')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Ad Image Create Tab ── */}
            {activeTab === 'images' && (
                <div style={{ display: 'grid', gap: 16 }}>
                    {/* 서브Tab Button */}
                    <div style={{ display: 'flex', gap: 6 }}>
                        {[['ai', `🤖 AI ${t('gAiRec.materialCreate')}`], ['upload', `🖼️ ${t('gAiRec.editMyMedia')}`]].map(([k, l]) => (
                            <button key={k} onClick={() => setImgSubTab(k)}
                                style={{ padding: '6px 14px', borderRadius: 8, fontWeight: 700, fontSize: 11, cursor: 'pointer', border: '1px solid ' + (imgSubTab === k ? cat.color : 'rgba(120,130,200,0.2)'), background: imgSubTab === k ? cat.color + '22' : 'transparent', color: imgSubTab === k ? cat.color : 'var(--text-3)' }}>{l}
                            </button>
                        ))}
                    </div>

                    {imgSubTab === 'upload' && (
                        <div className="card card-glass" style={{ padding: 18, display: 'grid', gap: 14 }}>
                            {/* Channel Select Button */}
                            {result?.channels?.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>📣 {t('gAiRec.selectEditChannel')}:</div>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {result.channels.map(ch => (
                                            <button key={ch.channel_id}
                                                onClick={() => setUploadChannelId(ch.channel_id)}
                                                style={{
                                                    padding: '4px 12px', borderRadius: 99, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                                                    border: `1px solid ${(uploadChannelId || result.channels[0]?.channel_id) === ch.channel_id ? CHANNEL_COLORS[ch.channel_id] || CHANNEL_COLORS.default : 'rgba(120,130,200,0.2)'}`,
                                                    background: (uploadChannelId || result.channels[0]?.channel_id) === ch.channel_id ? (CHANNEL_COLORS[ch.channel_id] || CHANNEL_COLORS.default) + '18' : 'transparent',
                                                    color: (uploadChannelId || result.channels[0]?.channel_id) === ch.channel_id ? (CHANNEL_COLORS[ch.channel_id] || CHANNEL_COLORS.default) : 'var(--text-3)',
                                                    transition: 'all 0.15s'
                                                }}>
                                                {(CHANNEL_ICONS[ch.channel_id] || '\uD83D\uDCE3')} {ch.channel_name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <MediaEditor
                                channelName={uploadCh?.channel_name || cat?.label || 'ad'}
                                channelId={uploadCh?.channel_id || ''}
                                accentColor={uploadChColor}
                                aiCreative={uploadCreative}
                            />
                        </div>
                    )}


                    <div style={{ display: aiTabDisplay, gap: 16 }}>
                        {/* Top 컨트롤 */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#a5b4fc' }}>🎨 {t('gAiRec.channelCreativeAuto')}</div>

                            <button onClick={() => genCreatives(result.channels || [], searchQ)}
                                disabled={imgStatus === 'loading'}
                                style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: imgStatus === 'loading' ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#4f8ef7,#6366f1)', color: '#fff', fontWeight: 800, fontSize: 11 }}>
                                {imgStatus === 'loading' ? '⏳ Creating...' : '\uD83D\uDD04 ' + t('gAiRec.recreateAll')}
                            </button>
                        </div>

                        {imgStatus === 'loading' && (
                            <div style={{ padding: '32px 0', textAlign: 'center' }}>
                                <div style={{ fontSize: 32, marginBottom: 10 }}>🎨</div>
                                <div style={{ fontSize: 13, color: '#a5b4fc', fontWeight: 700 }}>{t('gAiRec.claudeCreating')}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{t('gAiRec.autoGenFormats')}</div>
                            </div>
                        )}

                        {imgStatus !== "loading" && (result.channels || []).map((ch) => (
                            <ChannelAdCard key={ch.channel_id} ch={ch}
                                cr={creatives[ch.channel_id] || {}}
                                color={CHANNEL_COLORS[ch.channel_id] || CHANNEL_COLORS.default}
                                icon={CHANNEL_ICONS[ch.channel_id] || "\uD83D\uDCE3"}
                                catLabel={cat?.label}
                                regenLoad={regenLoad}
                                onRegen={regenImage}
                                onDownload={handleDownload}
                                onUpdate={(chId, u) => mkUpdater(chId, u, setCreatives)}
                            />
                        ))}

                        {imgStatus === 'idle' && Object.keys(creatives).length === 0 && (
                            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)' }}>
                                <div style={{ fontSize: 40, marginBottom: 10 }}>🎨</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>{t('gAiRec.imgCreateReady')}</div>
                                <div style={{ fontSize: 11 }}><span dangerouslySetInnerHTML={{ __html: sanitizeHtml(t('gAiRec.imgCreateReadyDesc')) }} /></div>
                            </div>
                        )}
                    </div>

                </div>
            )}

            {/* ── 타임라인 Tab (259차: images 블록 안에 중첩돼 activeTab==='timeline' 시 절대 렌더 불가하던 죽은 탭 → 최상위 탭 형제로 이동) ── */}
            {activeTab === 'timeline' && (
                (result.timeline || []).length > 0 ? (
                    <div className="card card-glass" style={{ padding: 20 }}>
                        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 14 }}>📅 {t('gAiRec.adCampaignTimeline')}</div>
                        {result.timeline.map((tl, i) => (
                            <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
                                <div style={{ width: 72, fontSize: 10, color: '#6366f1', fontWeight: 800, flexShrink: 0 }}>{tl.phase}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{tl.title}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.55 }}>{tl.detail}</div>
                                </div>
                            </div>
                        ))}
                        {result.immediate_action && (
                            <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.22)', fontSize: 11, color: '#22c55e', fontWeight: 700 }}>
                                ⚡ {t('gAiRec.instantRun')}: {result.immediate_action}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="card card-glass" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>{t('gAiRec.adCampaignTimeline')}</div>
                )
            )}

        </div>
    );
}

export { ResultSection };
