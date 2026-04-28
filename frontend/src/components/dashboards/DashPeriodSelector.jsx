// ══════════════════════════════════════════════════════════════════════
//  📅 DashPeriodSelector — Enterprise Date Range Selector v1.0
//  • 기간선택 프리셋 (오늘/7일/14일/30일/90일/커스텀)
//  • 캘린더 커스텀 날짜 선택
//  • i18n 완전 지원
//  • Premium glassmorphism + micro-animation 디자인
// ══════════════════════════════════════════════════════════════════════
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '../../i18n/index.js';

// ── Helper: 날짜 포맷 ────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
function fmtLabel(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}

// ── 프리셋 정의 ──────────────────────────────────────────────────────
function getPresets(t) {
  return [
    { id: 'today', label: t('dashPeriod.today', '오늘'), days: 0 },
    { id: '7d', label: t('dashPeriod.7d', '7일'), days: 7 },
    { id: '14d', label: t('dashPeriod.14d', '14일'), days: 14 },
    { id: '30d', label: t('dashPeriod.30d', '30일'), days: 30 },
    { id: '90d', label: t('dashPeriod.90d', '90일'), days: 90 },
    { id: 'custom', label: t('dashPeriod.custom', '기간설정'), days: -1 },
  ];
}

// ── 날짜 범위 계산 ───────────────────────────────────────────────────
function calcRange(presetId) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (presetId === 'today') {
    return { start, end };
  }
  const days = { '7d': 7, '14d': 14, '30d': 30, '90d': 90 }[presetId] || 14;
  start.setDate(start.getDate() - days + 1);
  return { start, end };
}

// ═══════════════════════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════════════════════
export default function DashPeriodSelector({ value, onChange, compact = false }) {
  // i18n을 안전하게 사용
  const i18n = useI18n() || {};
  const t = typeof i18n.t === 'function' ? i18n.t : (key, fallback) => fallback || key;
  const [activePreset, setActivePreset] = useState(value?.preset || '14d');
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState(fmtDate(value?.start || new Date(Date.now() - 13 * 86400000)));
  const [customEnd, setCustomEnd] = useState(fmtDate(value?.end || new Date()));
  const popRef = useRef(null);
  const presets = getPresets(t);

  // Close custom picker on outside click
  useEffect(() => {
    if (!showCustom) return;
    const handler = (e) => {
      if (popRef.current && !popRef.current.contains(e.target)) setShowCustom(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCustom]);

  const handlePreset = useCallback((preset) => {
    if (preset.id === 'custom') {
      setShowCustom(true);
      setActivePreset('custom');
      return;
    }
    setActivePreset(preset.id);
    setShowCustom(false);
    const range = calcRange(preset.id);
    onChange?.({ preset: preset.id, start: range.start, end: range.end });
  }, [onChange]);

  const handleCustomApply = useCallback(() => {
    const s = new Date(customStart);
    const e = new Date(customEnd);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return;
    s.setHours(0, 0, 0, 0);
    e.setHours(23, 59, 59, 999);
    setActivePreset('custom');
    setShowCustom(false);
    onChange?.({ preset: 'custom', start: s, end: e });
  }, [customStart, customEnd, onChange]);

  // Display label
  const rangeLabel = activePreset === 'custom'
    ? `${fmtLabel(customStart)} ~ ${fmtLabel(customEnd)}`
    : presets.find(p => p.id === activePreset)?.label || '';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: compact ? 3 : 4,
      position: 'relative',
    }}>
      {/* ── 프리셋 버튼 그룹 ──────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 0,
        background: 'var(--surface, rgba(255,255,255,0.95))',
        border: '1px solid var(--border, #e5e7eb)',
        borderRadius: 10, padding: 3,
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
      }}>
        {presets.map(p => {
          const isActive = activePreset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handlePreset(p)}
              style={{
                padding: compact ? '4px 8px' : '5px 11px',
                borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: compact ? 10 : 11, fontWeight: 700,
                transition: 'all 0.18s ease',
                background: isActive
                  ? 'linear-gradient(135deg, #4f8ef7, #6366f1)'
                  : 'transparent',
                color: isActive ? '#fff' : 'var(--text-3, #9ca3af)',
                boxShadow: isActive ? '0 2px 8px rgba(79,142,247,0.3)' : 'none',
                transform: isActive ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* ── 선택 기간 표시 라벨 ─────────────────────────── */}
      {activePreset === 'custom' && (
        <span style={{
          fontSize: 10, color: '#4f8ef7', fontWeight: 700,
          padding: '3px 8px', borderRadius: 6,
          background: 'rgba(79,142,247,0.08)',
          border: '1px solid rgba(79,142,247,0.15)',
          whiteSpace: 'nowrap',
        }}>
          📅 {rangeLabel}
        </span>
      )}

      {/* ── 커스텀 날짜 팝업 ──────────────────────────── */}
      {showCustom && (
        <div ref={popRef} style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 6,
          background: 'var(--bg-card, #fff)',
          border: '1px solid var(--border, #e5e7eb)',
          borderRadius: 14, padding: '14px 16px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
          zIndex: 100, minWidth: 280,
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1, #111827)', marginBottom: 12 }}>
            📅 {t('dashPeriod.customRange', '기간 직접 설정')}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, color: 'var(--text-3, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                {t('dashPeriod.startDate', '시작일')}
              </label>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                max={customEnd}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: 8,
                  border: '1px solid var(--border, #e5e7eb)',
                  background: 'var(--surface, #f9fafb)',
                  color: 'var(--text-1, #111827)', fontSize: 12,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <span style={{ color: 'var(--text-3)', fontSize: 14, marginTop: 16 }}>~</span>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, color: 'var(--text-3, #9ca3af)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                {t('dashPeriod.endDate', '종료일')}
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                min={customStart}
                max={fmtDate(new Date())}
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: 8,
                  border: '1px solid var(--border, #e5e7eb)',
                  background: 'var(--surface, #f9fafb)',
                  color: 'var(--text-1, #111827)', fontSize: 12,
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
          <button
            onClick={handleCustomApply}
            style={{
              width: '100%', padding: '9px 0', borderRadius: 8,
              border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #4f8ef7, #6366f1)',
              color: '#fff', fontWeight: 800, fontSize: 12,
              boxShadow: '0 4px 14px rgba(79,142,247,0.35)',
              transition: 'all 0.2s',
            }}
          >
            {t('dashPeriod.apply', '적용')}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Export helper: 초기 기간 값 생성 ─────────────────────────────────
export function getDefaultPeriod(presetId = '14d') {
  const range = calcRange(presetId);
  return { preset: presetId, ...range };
}
