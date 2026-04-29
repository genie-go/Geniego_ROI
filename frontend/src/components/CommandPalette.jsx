/**
 * Enterprise Command Palette (Ctrl+K)
 * =====================================
 * Spotlight-style quick navigation & search
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const COMMANDS = [
  { id: 'dashboard', label: '📊 Dashboard', path: '/dashboard', keywords: 'home main overview' },
  { id: 'marketing', label: '📢 Marketing', path: '/marketing', keywords: 'ads campaigns' },
  { id: 'crm', label: '👥 CRM', path: '/crm', keywords: 'customers contacts leads' },
  { id: 'auto-marketing', label: '🤖 Auto Marketing', path: '/auto-marketing', keywords: 'automation ai' },
  { id: 'order-hub', label: '📦 Order Hub', path: '/order-hub', keywords: 'orders shipping fulfillment' },
  { id: 'omni-channel', label: '🌐 Omni Channel', path: '/omni-channel', keywords: 'channels stores marketplace' },
  { id: 'catalog-sync', label: '📋 Catalog Sync', path: '/catalog-sync', keywords: 'products inventory' },
  { id: 'price-opt', label: '💰 Price Optimization', path: '/price-opt', keywords: 'pricing strategy' },
  { id: 'wms', label: '🏭 WMS Manager', path: '/wms-manager', keywords: 'warehouse logistics' },
  { id: 'supply-chain', label: '🔗 Supply Chain', path: '/supply-chain', keywords: 'suppliers procurement' },
  { id: 'returns', label: '↩️ Returns Portal', path: '/returns-portal', keywords: 'refunds returns' },
  { id: 'performance', label: '📈 Performance Hub', path: '/performance', keywords: 'analytics metrics kpi' },
  { id: 'attribution', label: '🎯 Attribution', path: '/attribution', keywords: 'tracking conversion' },
  { id: 'report', label: '📄 Report Builder', path: '/report-builder', keywords: 'reports export' },
  { id: 'budget', label: '💳 Budget Tracker', path: '/budget-tracker', keywords: 'spend roi' },
  { id: 'ai-insights', label: '🧠 AI Insights', path: '/ai-insights', keywords: 'intelligence prediction' },
  { id: 'ai-rule', label: '⚙️ AI Rule Engine', path: '/ai-rule-engine', keywords: 'automation rules' },
  { id: 'rollup', label: '📊 Rollup Dashboard', path: '/rollup', keywords: 'summary aggregate' },
  { id: 'pnl', label: '💵 P&L Dashboard', path: '/pnl', keywords: 'profit loss financial' },
  { id: 'channel-kpi', label: '📡 Channel KPI', path: '/channel-kpi', keywords: 'metrics performance' },
  { id: 'data-trust', label: '🛡️ Data Trust', path: '/data-trust', keywords: 'quality compliance' },
  { id: 'journey', label: '🗺️ Journey Builder', path: '/journey-builder', keywords: 'customer flow' },
  { id: 'email', label: '📧 Email Marketing', path: '/email-marketing', keywords: 'email campaigns' },
  { id: 'sms', label: '💬 SMS Marketing', path: '/sms-marketing', keywords: 'text messages' },
  { id: 'help', label: '❓ Help Center', path: '/help', keywords: 'support docs guide' },
  { id: 'settings', label: '⚙️ User Management', path: '/user-management', keywords: 'users roles settings' },
  { id: 'feedback', label: '💬 Feedback', path: '/feedback', keywords: 'survey reviews' },
  { id: 'workspace', label: '👥 Team Workspace', path: '/workspace', keywords: 'team collaborate' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    if (!query.trim()) return COMMANDS.slice(0, 12);
    const q = query.toLowerCase();
    return COMMANDS.filter(c =>
      c.label.toLowerCase().includes(q) || c.keywords.includes(q) || c.path.includes(q)
    ).slice(0, 10);
  }, [query]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
        setQuery('');
        setSelectedIdx(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const go = (path) => {
    setOpen(false);
    setQuery('');
    navigate(path);
  };

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filtered[selectedIdx]) { go(filtered[selectedIdx].path); }
  };

  if (!open) return null;

  return (
    <>
      <div onClick={() => setOpen(false)} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 100000, backdropFilter: 'blur(6px)',
      }} />
      <div style={{
        position: 'fixed', top: '18%', left: '50%', transform: 'translateX(-50%)',
        zIndex: 100001, width: '90%', maxWidth: 520,
        background: 'var(--surface-2, #fff)', borderRadius: 18,
        boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
        animation: 'cmdPop 0.2s ease-out', overflow: 'hidden',
      }}>
        {/* Search Input */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18, opacity: 0.5 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIdx(0); }}
            onKeyDown={handleKey}
            placeholder="Search pages, features..."
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: 15, fontWeight: 600,
              background: 'transparent', color: 'var(--text-1, #1e293b)',
            }}
          />
          <kbd style={{
            padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
            background: 'rgba(0,0,0,0.05)', color: 'var(--text-3, #64748b)',
            border: '1px solid rgba(0,0,0,0.08)',
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 360, overflowY: 'auto', padding: '8px' }}>
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              onClick={() => go(cmd.path)}
              onMouseEnter={() => setSelectedIdx(i)}
              style={{
                padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: i === selectedIdx ? 'rgba(79,142,247,0.08)' : 'transparent',
                transition: 'background 0.15s',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1, #1e293b)' }}>{cmd.label}</span>
              <span style={{ fontSize: 10, color: 'var(--text-4, #94a3b8)', fontFamily: 'monospace' }}>{cmd.path}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3, #64748b)', fontSize: 13 }}>
              No results found
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 16px', borderTop: '1px solid rgba(0,0,0,0.05)',
          display: 'flex', gap: 16, justifyContent: 'center',
        }}>
          {[
            { key: '↑↓', label: 'Navigate' },
            { key: '↵', label: 'Open' },
            { key: 'Esc', label: 'Close' },
          ].map(h => (
            <span key={h.key} style={{ fontSize: 10, color: 'var(--text-4, #94a3b8)' }}>
              <kbd style={{ padding: '1px 5px', borderRadius: 4, background: 'rgba(0,0,0,0.04)', marginRight: 4, fontWeight: 700 }}>{h.key}</kbd>
              {h.label}
            </span>
          ))}
        </div>
      </div>
      <style>{`@keyframes cmdPop { from { opacity:0; transform:translateX(-50%) translateY(-10px) scale(0.97); } to { opacity:1; transform:translateX(-50%) translateY(0) scale(1); } }`}</style>
    </>
  );
}
