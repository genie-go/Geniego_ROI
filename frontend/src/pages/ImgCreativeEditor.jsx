import React, { useState, useEffect } from "react";

/**
 * ImgCreativeEditor — AI 추천 크리에이티브 인라인 편집기.
 *
 * 207차 회귀 복구: 기존 props 기반 실구현이 영문 셸(propless)로 덮여
 * AIRecommendTab/ResultSection 호출의 chId/cr/color/onUpdate 가 전부 무시되고
 * onUpdate 콜백이 미발화(편집 저장 불가)하던 것을 정상 props 계약으로 재구축.
 *
 * 계약: <ImgCreativeEditor chId={..} cr={{headline,copy,cta}} color={..} onUpdate={(vals)=>..} />
 *   - cr      : 현재 크리에이티브(headline/copy/cta)
 *   - onUpdate: 저장 시 수정값 {headline,copy,cta} 전달 (호출측이 chId 바인딩)
 */
export function ImgCreativeEditor({ cr, color = '#4f8ef7', onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [vals, setVals] = useState({
    headline: cr?.headline || '',
    copy: cr?.copy || '',
    cta: cr?.cta || '',
  });

  // 상위에서 새 크리에이티브가 도착하면 동기화
  useEffect(() => {
    setVals({ headline: cr?.headline || '', copy: cr?.copy || '', cta: cr?.cta || '' });
  }, [cr?.headline, cr?.copy, cr?.cta]);

  const set = (k, v) => setVals(p => ({ ...p, [k]: v }));
  const save = () => { onUpdate?.(vals); setEditing(false); };

  const fields = [
    { key: 'headline', label: '광고 헤드라인', type: 'input',    ph: '임팩트 있는 광고 문구' },
    { key: 'copy',     label: '광고 본문(카피)', type: 'textarea', ph: '혜택·서비스 설명 2~3문장' },
    { key: 'cta',      label: 'CTA 버튼',       type: 'input',    ph: '예: 지금 신청, 무료 상담' },
  ];

  const inpStyle = {
    width: '100%', background: 'rgba(0,0,0,0.35)', border: `1px solid ${color}33`,
    borderRadius: 7, color: 'var(--text-1)', padding: '6px 10px', fontSize: 11, boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color }}>📝 광고 크리에이티브 편집</div>
        <button onClick={() => (editing ? save() : setEditing(true))}
          style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${color}55`, background: editing ? color + '22' : 'transparent', color, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
          {editing ? '✓ 저장' : '✏️ 편집'}
        </button>
      </div>
      {fields.map(f => (
        <div key={f.key}>
          <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 3, fontWeight: 600 }}>{f.label}</div>
          {editing ? (
            f.type === 'textarea'
              ? <textarea value={vals[f.key]} onChange={e => set(f.key, e.target.value)} rows={3} placeholder={f.ph} style={{ ...inpStyle, resize: 'none' }} />
              : <input value={vals[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.ph} style={inpStyle} />
          ) : (
            <div style={{ padding: '6px 10px', borderRadius: 7, background: 'var(--surface)', border: `1px solid ${color}18`, fontSize: 11, color: 'var(--text-1)', minHeight: 30, lineHeight: 1.5 }}>
              {vals[f.key] || <span style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>미작성</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default ImgCreativeEditor;
