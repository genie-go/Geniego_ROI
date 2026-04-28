import React, { useEffect, useState } from "react";

import ko from '../i18n/locales/ko.js';
import { useT } from '../i18n/index.js';
const t = (k) => k.split('.').reduce((o,i)=>o?.[i], {auto: ko?.auto}) || k;


function ImgCreativeEditor({ chId, cr, color, onUpdate }) {
    const [editing, setEditing] = useState(false);
    const [vals, setVals] = useState({ headline: cr?.headline || '', copy: cr?.copy || '', cta: cr?.cta || '' });
    React.useEffect(() => { setVals({ headline: cr?.headline || '', copy: cr?.copy || '', cta: cr?.cta || '' }); }, [cr?.headline]);
    const set = (k, v) => setVals(p => ({ ...p, [k]: v }));
    const save = () => { onUpdate(vals); setEditing(false); };
    const fields = [
        ['Main Headline (Headline)', 'headline', vals.headline, 'input', 'Impact with 긴 Ad 문구'],
        ['카피 (Ad 본문)', 'copy', vals.copy, 'textarea', '혜택·서비스 Description 2-3문장'],
        ['CTA Button', 'cta', vals.cta, 'input', '예: 지금 신청, Free 상담'],
    ];
    const inpStyle = { width: '100%', background: 'rgba(0,0,0,0.35)', border: `1px solid ${color}33`, borderRadius: 7, color: 'var(--text-1)', padding: '6px 10px', fontSize: 11, boxSizing: 'border-box' };
    return (
        <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color }}>📝 Ad Creative 편집</div>
                <button onClick={() => editing ? save() : setEditing(true)}
                    style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${color}55`, background: editing ? color + '22' : 'transparent', color, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
                    {editing ? '✓ Save' : '✏️ 편집'}
                </button>
            {fields.map(([lbl, key, val, type, ph]) => (
                <div key={key}>
                    <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 3, fontWeight: 600 }}>{lbl}</div>
                    {editing ? (
                        type === 'textarea'
                            ? <textarea value={val} onChange={e => set(key, e.target.value)} rows={3} placeholder={ph} style={{ ...inpStyle, resize: 'none' }} />
                            : <input value={val} onChange={e => set(key, e.target.value)} placeholder={ph} style={inpStyle} />
                    ) : (
                        <div style={{ padding: '6px 10px', borderRadius: 7, background: 'var(--surface)', border: `1px solid ${color}18`, fontSize: 11, color: 'var(--text-1)', minHeight: 30, lineHeight: 1.5 }}>
                            {val || <span style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>미Create</span>}
                    )}
            ))}
                </div>
);
}

/* Channel 결과 Card (편집 포함) */
function ChannelResultCard({ ch, idx, creative, svcLabel, approved, executed, executing,
    onApprove, onExecute, onRegenImg, regenLoading }) {
    const color = CHANNEL_COLORS[ch.channel_id] || CHANNEL_COLORS.default;
    const icon = CHANNEL_ICONS[ch.channel_id] || '📣';
    const size = ch.channel_id === 'youtube' ? 'banner'
        : (ch.channel_id === 'instagram' || ch.channel_id === 'tiktok') ? 'story' : 'feed';

    // 편집 Status
    const [editMain, setEditMain] = useState(false);
    const [mainTitle, setMainTitle] = useState('');
    const [subTitle, setSubTitle] = useState('');
    const [bodyText, setBodyText] = useState('');
    const [headline, setHeadline] = useState('');
    const [copy, setCopy] = useState('');
    const [savedTitle, setSavedTitle] = useState(null);

    // creative가 도착하면 초기Value 세팅
    React.useEffect(() => {
        if (creative && !savedTitle) {
            setMainTitle(creative.main_title || creative.headline || `${svcLabel} ${ch.channel_name} Ad`);
            setSubTitle(creative.sub_title || creative.ad_type || ch.ad_type || '');
            setBodyText(creative.body || creative.copy || ch.action_plan || '');
            setHeadline(creative.headline || '');
            setCopy(creative.copy || '');
        }
    }, [creative]);

    const onSave = () => { setSavedTitle(mainTitle); setEditMain(false); };

    return (
        <div style={{
            borderRadius: 14,
            border: `1px solid ${approved ? color + '66' : 'rgba(99,140,255,0.13)'}`,
            background: approved ? color + '07' : 'rgba(9,15,30,0.55)',
            overflow: 'hidden', transition: 'all 0.22s',
        }}>
            {/* Header */}
            <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: color + '25', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</div>
                    <div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontWeight: 900, color, fontSize: 15 }}>#{idx + 1}</span>
                            <span style={{ fontWeight: 800, fontSize: 13 }}>{ch.channel_name}</span>
                            <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 99, background: color + '18', color, border: `1px solid ${color}33` }}>{ch.ad_type}</span>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{ch.reason}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 17, fontWeight: 900, color }}>{ch.effectiveness_score ? `효과 ${ch.effectiveness_score}점` : ''}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>월 ₩{(ch.monthly_budget || 0).toLocaleString()}</div>
            </div>

            <div style={{ padding: '14px 16px', display: 'grid', gap: 12 }}>
                {/* Budget 바 */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
                        <span style={{ color, fontWeight: 700 }}>Budget 배분 {ch.budget_pct}%</span>
                        <span style={{ color: 'var(--text-2)' }}>Annual ₩{((ch.monthly_budget || 0) * 12).toLocaleString()}</span>
                    <div style={{ height: 7, background: 'var(--border)', borderRadius: 4 }}>
                        <div style={{ width: (ch.budget_pct || 0) + '%', height: '100%', background: `linear-gradient(90deg,${color},${color}99)`, borderRadius: 4, transition: 'width 0.7s' }} />
                </div>

                {/* KPI Info 그리드 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
                    {[
                        ['Ad 형태', ch.ad_format || ch.ad_type],
                        ['예상 ROAS', ch.expected_roas],
                        ['KPI Goal', ch.kpi_goal],
                        ['타겟팅', ch.targeting],
                        ['예상 CPA', ch.expected_cpa],
                        ['효과 Metric', ch.key_metric],
                    ].filter(([, v]) => v).map(([l, v]) => (
                        <div key={l} style={{ background: 'rgba(0,0,0,0.22)', borderRadius: 8, padding: '6px 9px' }}>
                            <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 2 }}>{l}</div>
                            <div style={{ fontSize: 10, fontWeight: 700 }}>{v}</div>
                    ))}

                {/* Ad Creative + 대/in progress제목/내용 편집 */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    {/* Image 미리보기 */}
                    <div style={{ flexShrink: 0 }}>
                        {regenLoading === ch.channel_id ? (
                            <div style={{ width: size === 'banner' ? 190 : 140, height: size === 'story' ? 185 : size === 'banner' ? 55 : 140, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 22 }}>🎨</span>
                        ) : (
                            <AdMockup chId={ch.channel_id} headline={headline || savedTitle || mainTitle} copy={copy || bodyText} color={color} size={size} />
                        )}
                        <button onClick={() => onRegenImg(ch.channel_id)}
                            style={{ marginTop: 5, width: '100%', padding: '3px 0', borderRadius: 6, border: 'none', background: color + '22', color, fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>
                            {regenLoading === ch.channel_id ? '⏳' : '🔄 Image 재Create'}
                        </button>

                    {/* 편집 Panel */}
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color }}>📝 Ad Creative 편집</div>
                            <button onClick={() => editMain ? onSave() : setEditMain(true)}
                                style={{ padding: '3px 11px', borderRadius: 6, border: `1px solid ${color}55`, background: editMain ? color + '22' : 'transparent', color, fontSize: 9, fontWeight: 700, cursor: 'pointer' }}>
                                {editMain ? '✓ Save' : '✏️ 편집'}
                            </button>
                        {editMain ? (
                            <div style={{ display: 'grid', gap: 7 }}>
                                {[
                                    ['Main Headline', mainTitle, setMainTitle, 'Ad 메인 Headline'],
                                    ['in progress제목', subTitle, setSubTitle, '서브 타이틀'],
                                    ['Headline', headline, setHeadline, 'Channel Ad Headline (짧고 Impact)'],
                                ].map(([lbl, val, set, ph]) => (
                                    <div key={lbl}>
                                        <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 2 }}>{lbl}</div>
                                        <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
                                            style={{ width: '100%', background: 'rgba(0,0,0,0.32)', border: `1px solid ${color}33`, borderRadius: 7, color: 'var(--text-1)', padding: '5px 8px', fontSize: 11, boxSizing: 'border-box' }} />
                                ))}
                                <div>
                                    <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 2 }}>내용 (Ad 카피)</div>
                                    <textarea value={bodyText} onChange={e => setBodyText(e.target.value)} rows={3}
                                        style={{ width: '100%', background: 'rgba(0,0,0,0.32)', border: `1px solid ${color}33`, borderRadius: 7, color: 'var(--text-1)', padding: '5px 8px', fontSize: 11, boxSizing: 'border-box', resize: 'none' }} />
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: 6 }}>
                                <div style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--surface)', border: `1px solid ${color}22` }}>
                                    <div style={{ fontSize: 8, color: 'var(--text-3)', marginBottom: 2 }}>Main Headline</div>
                                    <div style={{ fontSize: 12, fontWeight: 900 }}>{savedTitle || mainTitle || '–'}</div>
                                {subTitle && <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.15)' }}>
                                    <div style={{ fontSize: 8, color: 'var(--text-3)', marginBottom: 2 }}>in progress제목</div>
                                    <div style={{ fontSize: 11, fontWeight: 700 }}>{subTitle}</div>
                                </div>}
                                {bodyText && <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.15)' }}>
                                    <div style={{ fontSize: 8, color: 'var(--text-3)', marginBottom: 2 }}>내용</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-2)', lineHeight: 1.55 }}>{bodyText}</div>
                                </div>}
                        )}
                </div>

                {/* 집행 Plan */}
                {ch.action_plan && (
                    <div style={{ fontSize: 10, color: 'var(--text-2)', padding: '7px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)', lineHeight: 1.6 }}>
                        📋 {ch.action_plan}
                )}

                {/* 효율 극대화 팁 */}
                {ch.efficiency_tips && ch.efficiency_tips.length > 0 && (
                    <div style={{ padding: '10px 12px', borderRadius: 9, background: color + '08', border: `1px solid ${color}22` }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color, marginBottom: 6 }}>💡 이 Channel 효율 극대화 방법</div>
                        {ch.efficiency_tips.map((tip, i) => (
                            <div key={i} style={{ display: 'flex', gap: 6, fontSize: 10, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 3 }}>
                                <span style={{ color, fontWeight: 700, flexShrink: 0 }}>·</span>{tip}
                        ))}
                )}

                {/* Approval 전: Image 만들기 Button */}
                <div style={{ padding: '10px 14px', borderRadius: 10, background: 'linear-gradient(135deg,rgba(168,85,247,0.08),rgba(79,142,247,0.08))', border: '1px solid rgba(168,85,247,0.22)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>🎨</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#a855f7' }}>Ad Image 만들기</div>
                        <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2 }}>썸네일·Banner·스토리 Ad Image를 AI로 Auto Generate합니다</div>
                    <button onClick={() => onRegenImg(ch.channel_id)} disabled={regenLoading === ch.channel_id}
                        style={{
                            padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: regenLoading === ch.channel_id ? 'rgba(168,85,247,0.3)' : 'linear-gradient(135deg,#a855f7,#7c3aed)',
                            color: 'var(--text-1)', fontWeight: 800, fontSize: 11, whiteSpace: 'nowrap'
                        }}>
                        {regenLoading === ch.channel_id ? '⏳ Creating...' : '🎨 Image Create'}
                    </button>

                {/* Create된 Image 미리보기 (Image가 있을 때만) */}
                {creative && (creative.headline || creative.copy) && (
                    <div style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--surface)', border: `1px solid ${color}22` }}>
                        <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 6 }}>📋 Create된 Ad Creative 미리보기</div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <AdMockup chId={ch.channel_id}
                                headline={creative.headline}
                                copy={creative.copy}
                                color={color}
                                size={ch.channel_id === 'youtube' ? 'banner' : (ch.channel_id === 'instagram' || ch.channel_id === 'tiktok') ? 'story' : 'feed'} />
                            <div style={{ flex: 1 }}>
                                {creative.headline && <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 4 }}>"{creative.headline}"</div>}
                                {creative.copy && <div style={{ fontSize: 10, color: 'var(--text-2)', lineHeight: 1.55, marginBottom: 4 }}>{creative.copy}</div>}
                                {creative.cta && <div style={{ fontSize: 9, padding: '2px 8px', borderRadius: 6, background: color + '18', color, display: 'inline-block', fontWeight: 700 }}>CTA: {creative.cta}</div>}
                                {creative.tips && <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.5 }}>💡 {creative.tips}</div>}
                        </div>
                )}

                {/* Approval/Run Button */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => onApprove(ch.channel_id)}
                        style={{
                            flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${approved ? color : 'rgba(99,140,255,0.22)'}`,
                            background: approved ? color + '1a' : 'transparent', color: approved ? color : 'var(--text-3)',
                            fontWeight: 700, fontSize: 11, cursor: 'pointer', transition: 'all 0.15s'
                        }}>
                        {approved ? '✅ Approved' : 'Approval하기'}
                    </button>
                    {approved && !executed && (
                        <button onClick={() => onExecute(ch)} disabled={executing}
                            style={{
                                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                                background: executing ? 'rgba(99,102,241,0.3)' : `linear-gradient(135deg,${color},#6366f1)`,
                                color: 'var(--text-1)', fontWeight: 800, fontSize: 11, transition: 'all 0.2s'
                            }}>
                            {executing ? '⏳ Run in progress...' : '▶ Ad Auto화 Run'}
                        </button>
                    )}
                    {executed && (
                        <div style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e', fontWeight: 800, fontSize: 11, textAlign: 'center' }}>
                            ✅ Auto화 Run Done
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
                    </div>
                </div>
            </div>
        </div>
    </div>
);
}

export { ImgCreativeEditor };
