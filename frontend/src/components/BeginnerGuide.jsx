/* [246차] 공용 초보자 이용가이드 패널 — 모든 메뉴에서 동일 톤으로 재사용.
 *   onsite-cro 가이드(CroGuide) 스타일을 데이터 기반(spec)으로 일반화.
 *   사용: <BeginnerGuide spec={SPEC} defaultOpen={items.length===0} />
 *   spec = { sections: [ {icon,title, body?|boxes?|steps?|example?|code?|warn?|tips?|tipsWarn?} ] }
 *   ★신규 메뉴 0 — 기존 페이지 상단에 toggle 패널로 편입. 인라인 한글(폴백) 안전.
 */
import { useState } from 'react';
import { useT } from '../i18n/index.js';

const S = {
  wrap: { background: 'linear-gradient(135deg,#eff6ff,#f5f3ff)', border: '1px solid #c7d2fe', borderRadius: 16, padding: 22, display: 'grid', gap: 16 },
  sec: { background: 'var(--surface,#fff)', border: '1px solid var(--border,#e2e8f0)', borderRadius: 12, padding: '16px 18px' },
  h: { fontWeight: 900, fontSize: 15, color: 'var(--text-1)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 },
  p: { fontSize: 13, color: 'var(--text-2)', lineHeight: 1.75, margin: 0 },
  box: { flex: 1, minWidth: 180, background: '#f8fafc', border: '1px solid var(--border,#e2e8f0)', borderRadius: 10, padding: '12px 14px' },
  boxT: { fontWeight: 800, fontSize: 13, color: 'var(--text-1)', marginBottom: 4 },
  boxP: { fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6, margin: 0 },
  code: { background: '#0f172a', color: '#e2e8f0', borderRadius: 10, padding: 14, fontFamily: 'Consolas,monospace', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', overflowX: 'auto', marginTop: 8 },
  chip: { display: 'inline-block', background: '#eef2ff', color: '#3730a3', border: '1px solid #c7d2fe', borderRadius: 6, padding: '1px 7px', fontWeight: 700, fontSize: 12, marginRight: 6 },
};

function Step({ n, title, children }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ flex: '0 0 26px', width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg,#4f6ef7,#7c3aed)', color: '#fff', fontWeight: 900, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>{n}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--text-1)', marginBottom: 2 }}>{title}</div>
        {children != null && <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.65 }}>{children}</div>}
      </div>
    </div>
  );
}

function Section({ sec }) {
  const warnStyle = sec.tipsWarn;
  return (
    <div style={warnStyle ? { ...S.sec, background: '#fff7ed', borderColor: '#fed7aa' } : S.sec}>
      <div style={warnStyle ? { ...S.h, color: '#9a3412' } : S.h}>{sec.icon ? sec.icon + ' ' : ''}{sec.title}</div>
      {sec.body && <p style={S.p}>{sec.body}</p>}
      {Array.isArray(sec.boxes) && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: sec.body ? 10 : 0 }}>
          {sec.boxes.map((b, i) => <div key={i} style={S.box}><div style={S.boxT}>{b.t}</div><p style={S.boxP}>{b.p}</p></div>)}
        </div>
      )}
      {Array.isArray(sec.steps) && (
        <div style={{ display: 'grid', gap: 12, marginTop: sec.body ? 10 : 0 }}>
          {sec.steps.map((st, i) => <Step key={i} n={i + 1} title={st.t}>{st.b}</Step>)}
        </div>
      )}
      {Array.isArray(sec.example) && (
        <div style={{ display: 'grid', gap: 6, fontSize: 12.5, color: 'var(--text-2)', marginTop: sec.body ? 8 : 0 }}>
          {sec.example.map((e, i) => <div key={i}><span style={S.chip}>{e.k}</span>{e.v}</div>)}
        </div>
      )}
      {sec.code && <div style={S.code}>{sec.code}</div>}
      {sec.warn && <p style={{ ...S.p, marginTop: 8, color: 'var(--text-3)', fontSize: 12 }}>⚠ {sec.warn}</p>}
      {Array.isArray(sec.tips) && (
        <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
          {sec.tips.map((tip, i) => <li key={i} style={{ fontSize: 12.5, color: warnStyle ? '#9a3412' : 'var(--text-2)', lineHeight: 1.6 }}>{tip}</li>)}
        </ul>
      )}
    </div>
  );
}

export default function BeginnerGuide({ spec, defaultOpen = false }) {
  const t = useT();
  const [open, setOpen] = useState(!!defaultOpen);
  if (!spec || !Array.isArray(spec.sections)) return null;
  return (
    <div>
      <button onClick={() => setOpen(v => !v)} style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid var(--border,#e2e8f0)', background: open ? 'rgba(79,142,247,0.12)' : 'var(--surface,#fff)', color: open ? '#4f6ef7' : 'var(--text-2)', fontWeight: 800, fontSize: 12.5, cursor: 'pointer', marginBottom: open ? 14 : 0 }}>
        {open ? `▲ ${t('guideCommon.hide', '이용 가이드 접기')}` : `📖 ${t('guideCommon.show', '처음이신가요? 이용 가이드 보기')}`}
      </button>
      {open && <div style={S.wrap}>{spec.sections.map((sec, i) => <Section key={i} sec={sec} />)}</div>}
    </div>
  );
}
