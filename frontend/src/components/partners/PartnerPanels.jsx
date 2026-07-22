// [현 차수] 파트너 계정 + 거래처(매입처) 통합 관리 패널 — 팀·계정(team-members)에서 일원 관리.
//   사용자 요구: ①WMS에 흩어진 파트너 계정 발급·거래처 등록을 team-members 콘솔로 통합(IAM 일원화)
//   ②등록 시 "어떤 거래처/어떤 파트너인지" 선택 ③거래처 카테고리는 사용자가 직접 추가 등록 가능.
//   ★백엔드 SSOT 그대로 재사용(/api/wms/suppliers, /api/auth/partners) → WMS 운영(발주·입고)과 항상 동기화.
//   카테고리 목록은 tenant-scoped localStorage 영속(회원별 격리). WMS 의 기존 두 탭은 본 패널로 딥링크.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n } from '../../i18n';
import { useCurrency } from '../../contexts/CurrencyContext.jsx';
import { tScopedKey } from '../../utils/tenantStorage.js';
import { handlePlanLimit } from '../../utils/planLimit.js';
import * as wmsApi from '../../services/wmsApi.js';

/* ── 공용 UI ───────────────────────────────────────────── */
const inp = { width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 9, background: '#f0f5ff', border: '1.5px solid rgba(79,142,247,0.25)', color: '#1f2937', fontSize: 12, outline: 'none' };
const lbl = { fontSize: 10, fontWeight: 700, color: '#6b7280' };
function Btn({ children, onClick, color = '#4f8ef7', small }) {
  return <button onClick={onClick} style={{ padding: small ? '4px 12px' : '8px 16px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: small ? 11 : 12, background: `linear-gradient(135deg,${color},${color}cc)`, color: '#fff' }}>{children}</button>;
}
function Tag({ label, color = '#4f8ef7' }) {
  return <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: color + '18', color, border: `1px solid ${color}33` }}>{label}</span>;
}
function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return <div><label style={lbl}>{label}</label><input style={inp} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /></div>;
}
const CARD = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 1px 3px rgba(15,23,42,0.04)' };
const SEC = { fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 12 };

/* ── 거래처 카테고리(사용자 확장형) — tenant-scoped 영속 ── */
const VCAT_KEY = 'genie_vendor_categories';
const DEFAULT_VCATS = ['제조사', '도매상', '해외공급사', '3PL 물류', '원자재', 'OEM/ODM', '부자재/포장재'];
export function useVendorCategories() {
  const [cats, setCats] = useState(() => {
    try { const r = localStorage.getItem(tScopedKey(VCAT_KEY)); const a = r ? JSON.parse(r) : null; return Array.isArray(a) && a.length ? a : DEFAULT_VCATS; }
    catch { return DEFAULT_VCATS; }
  });
  const persist = useCallback((next) => { setCats(next); try { localStorage.setItem(tScopedKey(VCAT_KEY), JSON.stringify(next)); } catch { /* 스토리지 접근 실패(프라이빗 모드/쿼터) 무시 */ } }, []);
  const add = useCallback((label) => { const v = String(label || '').trim(); if (!v) return false; setCats(prev => { if (prev.includes(v)) return prev; const next = [...prev, v]; try { localStorage.setItem(tScopedKey(VCAT_KEY), JSON.stringify(next)); } catch { /* 스토리지 접근 실패(프라이빗 모드/쿼터) 무시 */ } return next; }); return true; }, []);
  const remove = useCallback((label) => setCats(prev => { const next = prev.filter(c => c !== label); try { localStorage.setItem(tScopedKey(VCAT_KEY), JSON.stringify(next)); } catch { /* 스토리지 접근 실패(프라이빗 모드/쿼터) 무시 */ } return next; }), []);
  return { cats, add, remove, persist };
}

/* ════════════════════════════════════════════════════════════════
   거래처(매입처) 등록 — 카테고리 사용자 확장형
════════════════════════════════════════════════════════════════ */
const PAY_TERMS = ['Cash', '7D', '30D', '60D', '30% prepaid', 'LC 60D'];
export function SupplierPanel() {
  const { t } = useI18n();
  const { fmt } = useCurrency();
  const { cats, add: addCat, remove: removeCat } = useVendorCategories();
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [showCatMgr, setShowCatMgr] = useState(false);
  const [newCat, setNewCat] = useState('');
  const blank = { id: '', name: '', code: '', category: cats[0] || '', country: 'KR', contact: '', phone: '', email: '', payTerms: '30D', leadDays: 14, rating: 5, active: true };
  const [form, setForm] = useState(blank);

  const toPayload = (f) => ({ name: f.name, code: f.code, contact: f.contact, phone: f.phone, email: f.email, active: f.active ? 1 : 0, memo: JSON.stringify({ type: f.category, country: f.country, payTerms: f.payTerms, leadDays: Number(f.leadDays) || 0, rating: Number(f.rating) || 5 }) });
  const mapRow = (r) => { let ex = {}; try { ex = JSON.parse(r.memo || '{}'); } catch { /* 파싱 실패 시 기본값 유지 */ } return { id: r.id, name: r.name || '', code: r.code || '', contact: r.contact || '', phone: r.phone || '', email: r.email || '', active: r.active === false ? false : !!(r.active ?? 1), category: ex.type || ex.category || '', country: ex.country || 'KR', payTerms: ex.payTerms || '30D', leadDays: ex.leadDays ?? 14, rating: ex.rating ?? 5 }; };
  const reload = useCallback(async () => { try { const r = await wmsApi.listSuppliers(); if (Array.isArray(r?.suppliers)) setSuppliers(r.suppliers.map(mapRow)); } catch { /* 로드/요청 실패 시 기존·기본 상태 유지 */ } }, []);
  useEffect(() => { reload(); }, [reload]);

  const filtered = suppliers.filter(s => !search || s.name.includes(search) || s.code.includes(search) || (s.category || '').includes(search) || (s.contact || '').includes(search));
  const reset = () => setForm({ ...blank, category: cats[0] || '' });
  const save = async () => {
    if (!form.name || !form.code) { alert(t('partners.supNameCodeReq', '거래처명과 코드는 필수입니다.')); return; }
    try {
      if (editing?.id) await wmsApi.updateSupplier(editing.id, toPayload(form));
      else await wmsApi.createSupplier(toPayload(form));
      await reload();
    } catch (e) { if (handlePlanLimit(e)) return; alert(String(e?.message || e)); return; }
    reset(); setShowForm(false); setEditing(null);
  };
  const RC = r => r >= 5 ? '#22c55e' : r >= 3 ? '#eab308' : '#ef4444';

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
        {[{ l: t('partners.supTotal', '등록 거래처'), v: suppliers.length, c: '#4f8ef7' }, { l: t('partners.supActive', '활성'), v: suppliers.filter(s => s.active).length, c: '#22c55e' }, { l: t('partners.supCats', '카테고리'), v: cats.length, c: '#a855f7' }, { l: t('partners.supCountries', '국가'), v: new Set(suppliers.map(s => s.country)).size, c: '#f97316' }].map(({ l, v, c }) => (
          <div key={l} style={{ background: `${c}0d`, border: `1px solid ${c}22`, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700 }}>{l}</div><div style={{ fontSize: 20, fontWeight: 900, color: c, marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#4f8ef7' }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('partners.supSearch', '거래처명·코드·카테고리 검색')} style={{ ...inp, paddingLeft: 34 }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn onClick={() => setShowCatMgr(v => !v)} color="#a855f7" small>🏷 {t('partners.supCatMgr', '카테고리 관리')}</Btn>
          <Btn onClick={() => { reset(); setShowForm(true); setEditing(null); }} color="#22c55e">+ {t('partners.supAdd', '거래처 등록')}</Btn>
        </div>
      </div>

      {/* 카테고리 관리(사용자 확장형) */}
      {showCatMgr && (
        <div style={{ ...CARD, background: 'rgba(168,85,247,0.04)', borderColor: 'rgba(168,85,247,0.2)' }}>
          <div style={SEC}>🏷 {t('partners.supCatMgrTitle', '거래처 카테고리 관리 (사용자 추가 가능)')}</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder={t('partners.supCatNew', '새 카테고리명 (예: 라이선스 공급사)')} style={{ ...inp, maxWidth: 280 }} onKeyDown={e => { if (e.key === 'Enter' && addCat(newCat)) setNewCat(''); }} />
            <Btn onClick={() => { if (addCat(newCat)) setNewCat(''); }} color="#a855f7">+ {t('partners.supCatAddBtn', '추가')}</Btn>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {cats.map(c => (
              <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '5px 10px', borderRadius: 20, background: '#a855f718', color: '#7c3aed', border: '1px solid #a855f733', fontWeight: 700 }}>
                {c}
                <button onClick={() => { if (window.confirm(t('partners.supCatDel', '카테고리 "{c}" 삭제? (기존 거래처 데이터는 유지)').replace('{c}', c))) removeCat(c); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#a855f7', fontSize: 12, padding: 0 }}>✕</button>
              </span>
            ))}
            {cats.length === 0 && <span style={{ fontSize: 12, color: '#94a3b8' }}>{t('partners.supCatEmpty', '카테고리가 없습니다. 추가하세요.')}</span>}
          </div>
        </div>
      )}

      {/* 등록/수정 폼 */}
      {showForm && (
        <div style={CARD}>
          <div style={SEC}>{editing ? t('partners.supEdit', '거래처 수정') : t('partners.supNew', '신규 거래처 등록')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            <Field label={t('partners.supNameL', '거래처명')} value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder={t('partners.supNamePh', '(주)대한공급')} />
            <Field label={t('partners.supCodeL', '코드')} value={form.code} onChange={v => setForm(f => ({ ...f, code: v }))} placeholder="SUP-001" />
            <div>
              <label style={lbl}>{t('partners.supCatL', '카테고리 (어떤 거래처)')}</label>
              <select style={inp} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {cats.map(c => <option key={c} value={c}>{c}</option>)}
                {form.category && !cats.includes(form.category) && <option value={form.category}>{form.category}</option>}
              </select>
            </div>
            <Field label={t('partners.supCountryL', '국가')} value={form.country} onChange={v => setForm(f => ({ ...f, country: v }))} placeholder="KR, CN, JP..." />
            <Field label={t('partners.supContactL', '담당자')} value={form.contact} onChange={v => setForm(f => ({ ...f, contact: v }))} placeholder="홍길동" />
            <Field label={t('partners.supPhoneL', '연락처')} value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="02-1234-5678" />
            <Field label={t('partners.supEmailL', '이메일')} value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="contact@company.com" />
            <div>
              <label style={lbl}>{t('partners.supPayL', '결제조건')}</label>
              <select style={inp} value={form.payTerms} onChange={e => setForm(f => ({ ...f, payTerms: e.target.value }))}>{PAY_TERMS.map(p => <option key={p} value={p}>{p}</option>)}</select>
            </div>
            <Field label={t('partners.supLeadL', '리드타임(일)')} value={form.leadDays} onChange={v => setForm(f => ({ ...f, leadDays: v }))} type="number" placeholder="14" />
            <div>
              <label style={lbl}>{t('partners.supRatingL', '평가(1~5)')}</label>
              <select style={inp} value={form.rating} onChange={e => setForm(f => ({ ...f, rating: Number(e.target.value) }))}>{[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{'★'.repeat(r)}{'☆'.repeat(5 - r)} ({r})</option>)}</select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Btn onClick={save} color="#22c55e">{t('partners.save', '저장')}</Btn>
            <Btn onClick={() => { reset(); setShowForm(false); setEditing(null); }} color="#64748b">{t('partners.cancel', '취소')}</Btn>
          </div>
        </div>
      )}

      {/* 목록 */}
      <div style={{ display: 'grid', gap: 10 }}>
        {filtered.length === 0 && <div style={{ ...CARD, color: '#94a3b8', fontSize: 12, textAlign: 'center' }}>{t('partners.supNoData', '등록된 거래처가 없습니다.')}</div>}
        {filtered.map(s => (
          <div key={s.id} style={{ ...CARD, opacity: s.active ? 1 : 0.6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>{s.name}</span>
                  <Tag label={s.code} color="#4f8ef7" />
                  {s.category && <Tag label={s.category} color="#a855f7" />}
                  <Tag label={s.country} color="#6366f1" />
                  <Tag label={s.active ? t('partners.active', '활성') : t('partners.inactive', '비활성')} color={s.active ? '#22c55e' : '#64748b'} />
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.7 }}>
                  👤 {s.contact || '—'} · 📞 {s.phone || '—'} · ✉️ {s.email || '—'}<br />
                  💳 {s.payTerms} · ⏱️ {t('partners.supLead', '리드타임')} {s.leadDays}{t('partners.days', '일')} · <span style={{ color: RC(s.rating) }}>{'★'.repeat(s.rating)}{'☆'.repeat(5 - s.rating)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Btn onClick={() => { setForm({ ...s }); setEditing(s); setShowForm(true); }} color="#6366f1" small>{t('partners.edit', '수정')}</Btn>
                <Btn onClick={async () => { try { await wmsApi.updateSupplier(s.id, { ...toPayload(s), active: s.active ? 0 : 1 }); await reload(); } catch (e) { alert(String(e?.message || e)); } }} color={s.active ? '#ef4444' : '#22c55e'} small>{s.active ? t('partners.deactivate', '비활성') : t('partners.activate', '활성')}</Btn>
                <Btn onClick={async () => { if (window.confirm(t('partners.supDel', "'{n}' 거래처를 삭제할까요?").replace('{n}', s.name))) { try { await wmsApi.deleteSupplier(s.id); await reload(); } catch (e) { alert(String(e?.message || e)); } } }} color="#94a3b8" small>{t('partners.delete', '삭제')}</Btn>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
