import React from "react";
import { ImgCreativeEditor } from './ImgCreativeEditor.jsx';
import MediaEditor from '../components/MediaEditor.jsx';
import { BudgetPanel, ChannelBarCard, ChannelAdCard } from './AIRecommendTab.jsx';
import { CHANNEL_COLORS, CHANNEL_ICONS } from './AIRecommendTab.jsx';

import { useT } from '../i18n/index.js';
function ResultSection(props) {
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
                                📚 전문가 지식 베이스
                            </span>
                            <span style={{ padding: '2px 10px', borderRadius: 99, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 9, color: '#a5b4fc' }}>
                                Google Ads · Meta Business · TikTok for Business · Naver Ad · 업종 벤치마크 기반
                            </span>
                        </>
                    ) : (
                        <span style={{ padding: '2px 10px', borderRadius: 99, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)', fontSize: 9, fontWeight: 700, color: '#818cf8' }}>
                            🤖 Claude AI Analysis ({dataModel})
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 28 }}>{dataSource === 'fallback' ? '📊' : '🤖'}</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 900, fontSize: 14, color: dataSource === 'fallback' ? '#f59e0b' : '#6366f1' }}>
                            {dataSource === 'fallback' ? '전문가 Marketing Analysis 결과' : 'Claude AI Analysis 결과'}
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
                        📌 핵심 전략: {result.strategy}
                    </div>
                )}

                {/* Budget 근거 Panel */}
                {(result.budget_rationale || result.product_analysis) && (
                    <div style={{ marginTop: 4, padding: '12px 14px', borderRadius: 10, background: 'linear-gradient(135deg,rgba(34,197,94,0.06),rgba(79,142,247,0.06))', border: '1px solid rgba(34,197,94,0.2)' }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#22c55e', marginBottom: 8 }}>💰 AI Budget Recommend 근거</div>
                        {result.budget_rationale && (
                            <div style={{ fontSize: 10, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: result.product_analysis ? 8 : 0 }}>
                                {result.budget_rationale}
                            </div>
                        )}
                        {result.product_analysis && (
                            <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.18)', fontSize: 10, color: 'var(--text-3)', lineHeight: 1.65 }}>
                                📊 Product 효율 Analysis: {result.product_analysis}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Channel Effectiveness Rank 바 Chart */}
            <div className="card card-glass" style={{ padding: 16 }}>
                <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 10 }}>📊 Channelper Ad Effectiveness Compare & Budget 배분</div>
                {(result.channels || []).map((ch, idx) => (
                    <ChannelBarCard key={ch.channel_id} ch={{ ...ch, _idx: idx }} colors={CHANNEL_COLORS} icons={CHANNEL_ICONS} />
                ))}
            </div>

            {/* Image Create Banner Button (눈에 띄게) */}
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'linear-gradient(135deg,rgba(79,142,247,0.1),rgba(168,85,247,0.1))', border: '1px solid rgba(99,102,241,0.25)', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 18 }}>🎨</span>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#a5b4fc' }}>Ad Marketing Image Auto Generate</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Claude AI가 Channelper Ad Creative·헤드라인·카피를 Auto Generate합니다</div>
                </div>
                <button onClick={() => { setActiveTab('images'); if (imgStatus === 'idle') genCreatives(result.channels || [], searchQ); }}
                    style={{ padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#4f8ef7,#a855f7)', color: '#fff', fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap' }}>
                    {imgStatus === 'loading' ? '⏳ Creating...' : imgStatus === 'done' ? '🖼 Image 보기' : '🎨 Image Create Start'}
                </button>
            </div>

            {/* 서브Tab */}
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: 4, border: '1px solid rgba(255,255,255,0.06)' }}>
                {[['channels', '📋 Channelper 상세'], ['images', `🖼 Ad Image Create${imgStatus === 'loading' ? ' ⏳' : imgStatus === 'done' ? ' ✓' : ''}`], ['timeline', '📅 타임라인']].map(([id, lbl]) => (
                    <button key={id} onClick={() => setActiveTab(id)}
                        style={{
                            flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                            background: activeTab === id ? 'linear-gradient(135deg,#4f8ef7,#6366f1)' : 'transparent',
                            color: activeTab === id ? '#fff' : 'var(--text-3)', transition: 'all 0.2s'
                        }}>
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
                                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>이제 Ad Creative를 제작할 Count 있습니다. 아래 Button으로 소재 Tab으로 Move하세요.</div>
                            </div>
                            <button onClick={() => { setActiveTab('images'); if (imgStatus === 'idle') genCreatives(result?.channels || [], searchQ || cat.label); setShowApproveAllBanner(false); }}
                                style={{ padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontWeight: 900, fontSize: 12, whiteSpace: 'nowrap' }}>
                                🎨 소재 제작 Start →
                            </button>
                        </div>
                    )}

                    {imgStatus === 'loading' && (
                        <div style={{ padding: '10px 14px', borderRadius: 9, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', fontSize: 11, color: '#a5b4fc', textAlign: 'center' }}>
                            🎨 Claude AI가 Channelper Ad Creative Creating...
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
                                    ✅ All Approval
                                </button>
                                <button onClick={handleExecuteAll} disabled={approvedCount === 0}
                                    style={{
                                        padding: '8px 20px', borderRadius: 8, border: 'none', cursor: approvedCount > 0 ? 'pointer' : 'not-allowed',
                                        background: approvedCount > 0 ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'rgba(255,255,255,0.05)',
                                        color: approvedCount > 0 ? '#fff' : 'var(--text-3)', fontWeight: 800, fontSize: 11
                                    }}>
                                    🚀 {approvedCount}개 Channel Ad Auto화 일괄 Run
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
                        {[['ai', '🤖 AI 소재 Create'], ['upload', '🖼️ 내 Image/동영상 편집']].map(([k, l]) => (
                            <button key={k} onClick={() => setImgSubTab(k)}
                                style={{
                                    padding: '6px 14px', borderRadius: 8, fontWeight: 700, fontSize: 11, cursor: 'pointer',
                                    border: '1px solid ' + (imgSubTab === k ? cat.color : 'rgba(120,130,200,0.2)'),
                                    background: imgSubTab === k ? cat.color + '22' : 'transparent',
                                    color: imgSubTab === k ? cat.color : 'var(--text-3)'
                                }}>{l}
                            </button>
                        ))}
                    </div>

                    {imgSubTab === 'upload' && (
                        <div className="card card-glass" style={{ padding: 18, display: 'grid', gap: 14 }}>
                            {/* Channel Select Button */}
                            {result?.channels?.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>📣 편집 Channel Select:</div>
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
                            <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#a5b4fc' }}>🎨 Channelper Ad Creative — AI Auto Generate</div>

                            <button onClick={() => genCreatives(result.channels || [], searchQ)}
                                disabled={imgStatus === 'loading'}
                                style={{
                                    padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                    background: imgStatus === 'loading' ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#4f8ef7,#6366f1)',
                                    color: '#fff', fontWeight: 800, fontSize: 11
                                }}>
                                {imgStatus === 'loading' ? '⏳ Creating...' : '🔄 All 재Create'}
                            </button>
                        </div>

                        {imgStatus === 'loading' && (
                            <div style={{ padding: '32px 0', textAlign: 'center' }}>
                                <div style={{ fontSize: 32, marginBottom: 10 }}>🎨</div>
                                <div style={{ fontSize: 13, color: '#a5b4fc', fontWeight: 700 }}>Claude AI가 Channelper Ad Creative Creating...</div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>헤드라인·카피·CTA·Ad 형식을 Auto Generate합니다</div>
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
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>Ad Image Create 준비됨</div>
                                <div style={{ fontSize: 11 }}>위 "🎨 Image Create Start" Button을 Clicks하면<br />Channelper 맞춤 Ad Image를 Auto으로 Create합니다</div>
                            </div>
                        )}
                    </div>

                    {/* 타임라인 Tab */}
                    {activeTab === 'timeline' && (result.timeline || []).length > 0 && (
                        <div className="card card-glass" style={{ padding: 20 }}>
                            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 14 }}>📅 Ad Campaign Run 타임라인</div>
                            {result.timeline.map((t, i) => (
                                <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'flex-start' }}>
                                    <div style={{ width: 72, fontSize: 10, color: '#6366f1', fontWeight: 800, flexShrink: 0 }}>{t.phase}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{t.title}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.55 }}>{t.detail}</div>
                                    </div>
                                </div>
                            ))}
                            {result.immediate_action && (
                                <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.22)', fontSize: 11, color: '#22c55e', fontWeight: 700 }}>
                                    ⚡ 즉시 Run: {result.immediate_action}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}

export { ResultSection };
