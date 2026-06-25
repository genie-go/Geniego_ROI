// [현 차수] 공용 기간조회 선택바 — "기간 설정 후 조회"가 누락된 거래/수집/로그 리스트 메뉴 공통 적용.
//   PixelTracking(일수버튼)·Audit(dateFrom/To) 의 두 패턴을 하나로 통합(중복 구현 금지). 프리셋(전체/7/30/90일)
//   + 사용자지정(since~until). value={preset,from,to(ms)}; inPeriod(날짜값, value)로 리스트를 클라이언트 필터.
//   ★날짜 파싱은 atISO/ISO 우선(ko-KR 'at' 문자열은 new Date 파싱불가 — 전 메뉴 공통 트랩). i18n 인라인 한글 폴백.
import { useState } from 'react';
import { useI18n } from '../../i18n/index.js';

const DAY = 86400000;

/** 어떤 형태의 날짜값이든 robust 파싱 — ISO 우선, ko-KR 'YYYY. M. D. ...' 도 흡수. 실패 시 null. */
export function parseAnyDate(v) {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const s = String(v);
  let d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  // ko-KR 로케일 문자열 폴백: "2026. 6. 25. 14:30:00"
  const m = s.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?\s*(?:(?:오전|오후)\s*)?(\d{1,2})?:?(\d{1,2})?/);
  if (m) { d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0)); if (!isNaN(d.getTime())) return d; }
  return null;
}

/** preset → {preset, from, to(ms)}. 'all'/custom 지원. */
export function buildRange(preset, since, until) {
  if (preset === 'custom') {
    const from = since ? new Date(since + 'T00:00:00').getTime() : 0;
    const to = until ? new Date(until + 'T23:59:59').getTime() : Date.now();
    return { preset, from, to, since, until };
  }
  const days = { '7d': 7, '30d': 30, '90d': 90 }[preset];
  if (!days) return { preset: 'all', from: 0, to: Infinity };
  return { preset, from: Date.now() - days * DAY, to: Date.now() };
}

/** 날짜값이 선택 기간 안에 있는지. range.preset==='all' 이면 항상 true(전체). 날짜 없으면 제외(전체일 땐 포함). */
export function inPeriod(dateVal, range) {
  if (!range || range.preset === 'all') return true;
  const d = parseAnyDate(dateVal);
  if (!d) return false;
  const t = d.getTime();
  return t >= range.from && t <= range.to;
}

/** 여러 후보 필드 중 첫 파싱가능 날짜로 판정(atISO/created_at/... 우선, ko-KR at 마지막). */
export function inPeriodAny(obj, range, fields) {
  if (!range || range.preset === 'all') return true;
  for (const f of fields) { const d = parseAnyDate(obj?.[f]); if (d) return inPeriod(d, range); }
  return false;
}

export default function PeriodFilterBar({ value, onChange, presets = ['all', '7d', '30d', '90d'], custom = true, compact = false, style }) {
  const { t } = useI18n();
  const [since, setSince] = useState(value?.since || new Date(Date.now() - 30 * DAY).toISOString().slice(0, 10));
  const [until, setUntil] = useState(value?.until || new Date().toISOString().slice(0, 10));
  const preset = value?.preset || 'all';
  const LBL = { all: t('period.all', '전체'), '7d': t('period.d7', '지난 7일'), '30d': t('period.d30', '지난 30일'), '90d': t('period.d90', '지난 90일'), custom: t('period.custom', '사용자지정') };
  const pick = (p) => onChange(buildRange(p, since, until));
  const btn = (on) => ({ padding: compact ? '4px 10px' : '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: compact ? 11 : 12, fontWeight: 700, background: on ? '#4f8ef7' : 'rgba(241,245,249,0.9)', color: on ? '#fff' : '#475569', transition: 'all .15s' });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', ...style }}>
      <span style={{ fontSize: compact ? 10 : 11, color: '#94a3b8', fontWeight: 700 }}>📅 {t('period.label', '기간')}</span>
      <div style={{ display: 'flex', gap: 3, background: 'rgba(241,245,249,0.6)', borderRadius: 10, padding: 3 }}>
        {presets.map(p => <button key={p} onClick={() => pick(p)} style={btn(preset === p)}>{LBL[p] || p}</button>)}
        {custom && <button onClick={() => pick('custom')} style={btn(preset === 'custom')}>{LBL.custom}</button>}
      </div>
      {custom && preset === 'custom' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="date" value={since} onChange={e => { setSince(e.target.value); onChange(buildRange('custom', e.target.value, until)); }}
            style={{ padding: '4px 8px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 11, color: '#1e293b' }} />
          <span style={{ color: '#94a3b8', fontSize: 11 }}>~</span>
          <input type="date" value={until} onChange={e => { setUntil(e.target.value); onChange(buildRange('custom', since, e.target.value)); }}
            style={{ padding: '4px 8px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 11, color: '#1e293b' }} />
        </div>
      )}
    </div>
  );
}
