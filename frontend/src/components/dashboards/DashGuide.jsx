import React from 'react';
import { useI18n } from '../../i18n/index.js';
import GUIDE_BASE from './dashGuideI18n.js';
import GUIDE_REST from './dashGuideI18n_rest.js';
import GUIDE_P3 from './dashGuideI18n_p3.js';
import GUIDE_P4 from './dashGuideI18n_p4.js';

const GUIDE_I18N = { ...GUIDE_BASE, ...GUIDE_REST, ...GUIDE_P3, ...GUIDE_P4 };

/* ═══════════════════════════════════════════════════════════════════
   DashGuide — Enterprise Dashboard Usage Guide (Expanded Edition)
   ✅ 15-Step Complete Guide (Start → Finish)
   ✅ Full i18n: 15 languages via embedded dictionary
   ═══════════════════════════════════════════════════════════════════ */

const C = {
  bg: 'var(--bg)', surface: 'var(--surface)', card: 'rgba(255,255,255,0.95)',
  border: 'rgba(99,140,255,0.12)', text: '#1e293b', muted: '#64748b',
  accent: '#4f8ef7', green: '#22c55e', yellow: '#f59e0b', purple: '#a855f7',
  orange: '#f97316', cyan: '#14d9b0', pink: '#ec4899', red: '#ef4444',
};
const CARD = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 };
const STEP_COLORS = [C.accent, C.green, C.yellow, C.pink, C.orange, C.cyan, C.purple, C.red, C.accent, C.green, C.yellow, C.pink, C.orange, C.cyan, C.purple];
const STEP_ICONS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','1️⃣1️⃣','1️⃣2️⃣','1️⃣3️⃣','1️⃣4️⃣','1️⃣5️⃣'];

export default function DashGuide() {
  const { t, lang } = useI18n();
  // Use embedded translations, fallback to en
  const dict = GUIDE_I18N[lang] || GUIDE_I18N.en || {};
  const g = (key, fallback) => dict[key] || fallback || '';

  const steps = Array.from({ length: 15 }, (_, i) => ({
    icon: STEP_ICONS[i], color: STEP_COLORS[i],
    title: g(`s${i+1}t`, `Step ${i+1}`),
    desc: g(`s${i+1}d`, ''),
  }));

  const tabs = [
    { icon: '🏠', name: t('dashTabs.overview', 'Overview'), desc: g('tabOverview', ''), color: C.accent },
    { icon: '📈', name: t('dashTabs.marketing', 'Marketing'), desc: g('tabMarketing', ''), color: C.pink },
    { icon: '📡', name: t('dashTabs.channel', 'Channel KPI'), desc: g('tabChannel', ''), color: C.green },
    { icon: '🛒', name: t('dashTabs.commerce', 'Commerce'), desc: g('tabCommerce', ''), color: C.orange },
    { icon: '🌍', name: t('dashTabs.sales', 'Global Sales'), desc: g('tabSales', ''), color: C.cyan },
    { icon: '🤝', name: t('dashTabs.influencer', 'Influencer'), desc: g('tabInfluencer', ''), color: C.purple },
    { icon: '🖥️', name: t('dashTabs.system', 'System'), desc: g('tabSystem', ''), color: C.cyan },
  ];

  const features = [
    { icon: '📊', title: g('f1t','Real-Time KPI'), desc: g('f1d','') },
    { icon: '🔄', title: g('f2t','Auto Sync'), desc: g('f2d','') },
    { icon: '🌐', title: g('f3t','15 Languages'), desc: g('f3d','') },
    { icon: '💰', title: g('f4t','Revenue Analysis'), desc: g('f4d','') },
    { icon: '🛡️', title: g('f5t','Security'), desc: g('f5d','') },
    { icon: '📱', title: g('f6t','Responsive'), desc: g('f6d','') },
  ];

  const faqs = [
    { q: g('faq1Q','No data'), a: g('faq1A','Create campaigns first.') },
    { q: g('faq2Q','KPI = 0'), a: g('faq2A','Wait a few hours.') },
    { q: g('faq3Q','Channel missing'), a: g('faq3A','Connect in Campaign Manager.') },
    { q: g('faq4Q','Security alerts'), a: g('faq4A','Click Dismiss.') },
    { q: g('faq5Q','Change language?'), a: g('faq5A','Use top-right dropdown.') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Hero Banner ──────────────────────────────────────────── */}
      <div style={{
        ...CARD,
        background: 'linear-gradient(135deg, rgba(79,142,247,0.12), rgba(168,85,247,0.08))',
        borderColor: C.accent + '40', textAlign: 'center', padding: 32,
      }}>
        <div style={{ fontSize: 44 }}>📊</div>
        <div style={{ fontWeight: 900, fontSize: 22, marginTop: 8, color: '#4f46e5' }}>
          {g('title', 'Dashboard Usage Guide')}
        </div>
        <div style={{ fontSize: 13, color: '#374151', marginTop: 6, maxWidth: 560, margin: '6px auto 0', lineHeight: 1.7, fontWeight: 600 }}>
          {g('subtitle', 'Learn all Dashboard features step by step.')}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, padding: '5px 14px', borderRadius: 20, background: '#4f46e5', color: '#fff', fontWeight: 800, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
            🎓 {g('beginnerBadge', 'Beginner Guide')}
          </span>
          <span style={{ fontSize: 11, padding: '5px 14px', borderRadius: 20, background: '#059669', color: '#fff', fontWeight: 800, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
            ⏱ {g('timeBadge', '5 min read')}
          </span>
          <span style={{ fontSize: 11, padding: '5px 14px', borderRadius: 20, background: '#7c3aed', color: '#fff', fontWeight: 800, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
            🌐 {g('langBadge', '15 Languages')}
          </span>
        </div>
      </div>

      {/* ── Where to Start ───────────────────────────────────────── */}
      <div style={{ ...CARD, background: `${C.accent}08`, borderColor: `${C.accent}30` }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 10, color: '#4f46e5' }}>
          🧭 {g('whereToStart', 'Where do I start?')}
        </div>
        <div style={{ fontSize: 13, color: '#374151', lineHeight: 2.0, whiteSpace: 'pre-line' }}>
          {g('whereToStartDesc', '1. Click Dashboard from the left menu.\n2. Check overview KPIs.\n3. Click sub-tabs for detailed analysis.')}
        </div>
      </div>

      {/* ── 15-Step Guide ────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, color: '#1f2937' }}>
          {g('stepsTitle', '🚀 Complete Guide — 15 Steps')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ background: s.color + '0a', border: `1px solid ${s.color}25`, borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: s.color }}>{s.title}</span>
              </div>
              <div style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.7 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab Descriptions ─────────────────────────────────────── */}
      <div style={CARD}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, color: '#1f2937' }}>
          {g('tabsTitle', '📋 Tab-by-Tab Reference')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {tabs.map((tab, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', background: 'rgba(241,245,249,0.7)', borderRadius: 10, border: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{tab.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: tab.color }}>{tab.name}</div>
                <div style={{ fontSize: 11, color: '#4b5563', marginTop: 3, lineHeight: 1.6 }}>{tab.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Key Features ──────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, color: '#1f2937' }}>
          {g('featuresTitle', '✨ Key Features')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {features.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: 'rgba(241,245,249,0.7)', borderRadius: 10, border: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: '#1f2937' }}>{f.title}</div>
                <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Expert Tips ───────────────────────────────────────────── */}
      <div style={{ ...CARD, background: 'rgba(34,197,94,0.05)', borderColor: C.green + '30' }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12, color: '#1f2937' }}>
          💡 {g('tipsTitle', 'Expert Tips')}
        </div>
        <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#374151', lineHeight: 2.2 }}>
          <li>{g('tip1', 'Check KPI card colors every morning.')}</li>
          <li>{g('tip2', 'Click channel cards for details.')}</li>
          <li>{g('tip3', 'Click country markers for analysis.')}</li>
          <li>{g('tip4', 'Use AI analysis for creators.')}</li>
          <li>{g('tip5', 'Verify SECURE status regularly.')}</li>
        </ul>
      </div>

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, color: '#1f2937' }}>
          ❓ {g('faqTitle', 'Frequently Asked Questions')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {faqs.map((faq, i) => (
            <div key={i} style={{ background: 'rgba(241,245,249,0.7)', borderRadius: 10, border: `1px solid ${C.border}`, padding: '12px 14px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#4f46e5', marginBottom: 6 }}>Q. {faq.q}</div>
              <div style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.7, paddingLeft: 20 }}>A. {faq.a}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Ready to Start ───────────────────────────────────────── */}
      <div style={{
        ...CARD,
        background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(79,142,247,0.06))',
        borderColor: C.green + '40', textAlign: 'center', padding: 32,
      }}>
        <div style={{ fontSize: 40 }}>🚀</div>
        <div style={{ fontWeight: 900, fontSize: 18, marginTop: 8, color: '#059669' }}>
          {g('readyTitle', '🎉 You\'re Ready to Start!')}
        </div>
        <div style={{ fontSize: 13, color: '#374151', marginTop: 6, maxWidth: 500, margin: '6px auto 0', lineHeight: 1.7 }}>
          {g('readyDesc', 'Click the Overview tab above to begin.')}
        </div>
      </div>
    </div>
  );
}
