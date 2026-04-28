import React from 'react';
import { useI18n } from '../../i18n/index.js';

/* ═══════════════════════════════════════════════════════════════════
   DashGuide — Enterprise Dashboard Usage Guide
   ✅ 10-Step Guide + Tab Reference + Expert Tips + FAQ + Ready
   ✅ Full i18n: 12 languages via dashGuide.* keys
   ═══════════════════════════════════════════════════════════════════ */

const C = {
  bg: 'var(--bg)', surface: 'var(--surface)', card: 'var(--bg-card, rgba(255,255,255,0.95))',
  border: 'var(--border)', text: 'var(--text-1)', muted: 'var(--text-3)',
  accent: '#4f8ef7', green: '#22c55e', yellow: '#f59e0b', purple: '#a855f7',
  orange: '#f97316', cyan: '#14d9b0', pink: '#ec4899', red: '#ef4444',
};
const CARD = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 };

export default function DashGuide() {
  const { t } = useI18n();

  const steps = [
    { icon: '1️⃣', title: t('dashGuide.step1Title', 'Access the Dashboard'), desc: t('dashGuide.step1Desc', 'Click "Dashboard" from the left menu after login.'), color: C.accent },
    { icon: '2️⃣', title: t('dashGuide.step2Title', 'Check Overview KPIs'), desc: t('dashGuide.step2Desc', 'Review the top 6 KPI cards.'), color: C.green },
    { icon: '3️⃣', title: t('dashGuide.step3Title', 'Analyze Marketing'), desc: t('dashGuide.step3Desc', 'Compare channel performance in Marketing tab.'), color: C.pink },
    { icon: '4️⃣', title: t('dashGuide.step4Title', 'Check Channel KPIs'), desc: t('dashGuide.step4Desc', 'View CTR, CPC, ROAS per channel.'), color: C.yellow },
    { icon: '5️⃣', title: t('dashGuide.step5Title', 'Review Commerce'), desc: t('dashGuide.step5Desc', 'Check marketplace settlement status.'), color: C.orange },
    { icon: '6️⃣', title: t('dashGuide.step6Title', 'Global Sales Analysis'), desc: t('dashGuide.step6Desc', 'Analyze country-level revenue through world map.'), color: C.cyan },
    { icon: '7️⃣', title: t('dashGuide.step7Title', 'Manage Influencers'), desc: t('dashGuide.step7Desc', 'Monitor creator followers and engagement.'), color: C.purple },
    { icon: '8️⃣', title: t('dashGuide.step8Title', 'System Monitoring'), desc: t('dashGuide.step8Desc', 'Check server and security status.'), color: C.cyan },
    { icon: '9️⃣', title: t('dashGuide.step9Title', 'Review Security Alerts'), desc: t('dashGuide.step9Desc', 'Check the security banner for threats.'), color: C.red },
    { icon: '🔟', title: t('dashGuide.step10Title', 'Regular Monitoring'), desc: t('dashGuide.step10Desc', 'Create a daily dashboard review routine.'), color: C.accent },
  ];

  const tabs = [
    { icon: '🏠', name: t('dashTabs.overview', 'Overview'), desc: t('dashGuide.tabOverview', 'View 6 major KPIs at a glance.'), color: C.accent },
    { icon: '📈', name: t('dashTabs.marketing', 'Marketing'), desc: t('dashGuide.tabMarketing', 'Compare ad performance across channels.'), color: C.pink },
    { icon: '📡', name: t('dashTabs.channel', 'Channel KPI'), desc: t('dashGuide.tabChannel', 'Real-time CTR, CPC, ROAS per channel.'), color: C.green },
    { icon: '🛒', name: t('dashTabs.commerce', 'Commerce'), desc: t('dashGuide.tabCommerce', 'Marketplace settlements and fees.'), color: C.orange },
    { icon: '🌍', name: t('dashTabs.sales', 'Global Sales'), desc: t('dashGuide.tabSales', 'World map-based country comparison.'), color: C.cyan },
    { icon: '🤝', name: t('dashTabs.influencer', 'Influencer'), desc: t('dashGuide.tabInfluencer', 'Creator engagement tracking.'), color: C.purple },
    { icon: '🖥️', name: t('dashTabs.system', 'System'), desc: t('dashGuide.tabSystem', 'Server and security monitoring.'), color: C.cyan },
  ];

  const features = [
    { icon: '📊', title: t('dashGuide.feat1Title', 'Real-Time KPI Dashboard'), desc: t('dashGuide.feat1Desc', 'All data syncs in real-time.') },
    { icon: '🔄', title: t('dashGuide.feat2Title', 'Auto Data Sync'), desc: t('dashGuide.feat2Desc', 'Latest data updates every 5 seconds.') },
    { icon: '🌐', title: t('dashGuide.feat3Title', '12 Language Support'), desc: t('dashGuide.feat3Desc', 'Auto-detects 12 languages.') },
    { icon: '💰', title: t('dashGuide.feat4Title', 'Unified Revenue Analysis'), desc: t('dashGuide.feat4Desc', 'Analyze by channel, country, creator.') },
    { icon: '🛡️', title: t('dashGuide.feat5Title', 'Enterprise Security'), desc: t('dashGuide.feat5Desc', 'XSS, CSRF, brute force protection.') },
    { icon: '📱', title: t('dashGuide.feat6Title', 'Responsive Design'), desc: t('dashGuide.feat6Desc', 'Optimized for all devices.') },
  ];

  const faqs = [
    { q: t('dashGuide.faq1Q', 'No data is displayed'), a: t('dashGuide.faq1A', 'Create ad campaigns first in Campaign Manager.') },
    { q: t('dashGuide.faq2Q', 'KPI values are 0'), a: t('dashGuide.faq2A', 'Data collection takes a few hours.') },
    { q: t('dashGuide.faq3Q', 'A specific channel is missing'), a: t('dashGuide.faq3A', 'Connect the channel in Campaign Manager.') },
    { q: t('dashGuide.faq4Q', 'Security alerts keep appearing'), a: t('dashGuide.faq4A', 'SecurityGuard detected threats. Use Dismiss.') },
    { q: t('dashGuide.faq5Q', 'How do I switch languages?'), a: t('dashGuide.faq5A', 'Use the language dropdown in top-right.') },
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
        <div style={{ fontWeight: 900, fontSize: 22, marginTop: 8, color: C.text }}>
          {t('dashGuide.title', 'Dashboard Usage Guide')}
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 6, maxWidth: 560, margin: '6px auto 0', lineHeight: 1.7 }}>
          {t('dashGuide.subtitle', 'Learn all Dashboard features step by step.')}
        </div>
        {/* Badges */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, background: `${C.accent}15`, border: `1px solid ${C.accent}30`, color: C.accent, fontWeight: 700 }}>
            🎓 {t('dashGuide.beginnerBadge', 'Beginner Guide')}
          </span>
          <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, background: `${C.green}15`, border: `1px solid ${C.green}30`, color: C.green, fontWeight: 700 }}>
            ⏱ {t('dashGuide.timeBadge', '5 min read')}
          </span>
          <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, background: `${C.purple}15`, border: `1px solid ${C.purple}30`, color: C.purple, fontWeight: 700 }}>
            🌐 {t('dashGuide.langBadge', '12 Languages')}
          </span>
        </div>
      </div>

      {/* ── Where to Start ───────────────────────────────────────── */}
      <div style={{ ...CARD, background: `${C.accent}08`, borderColor: `${C.accent}30` }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 10, color: C.accent }}>
          🧭 {t('dashGuide.whereToStart', 'Where do I start?')}
        </div>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 2.0, whiteSpace: 'pre-line' }}>
          {t('dashGuide.whereToStartDesc', '1. Click "Dashboard" from the left menu.\n2. Check overview KPIs.\n3. Click sub-tabs for detailed analysis.\n4. Review security banner.')}
        </div>
      </div>

      {/* ── 10-Step Guide ────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, color: C.text }}>
          {t('dashGuide.stepsTitle', '🚀 Getting Started — 10-Step Guide')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ background: s.color + '0a', border: `1px solid ${s.color}25`, borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: s.color }}>{s.title}</span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab Descriptions ─────────────────────────────────────── */}
      <div style={CARD}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, color: C.text }}>
          {t('dashGuide.tabsTitle', '📋 Tab-by-Tab Reference')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {tabs.map((tab, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', background: 'var(--surface)', borderRadius: 10, border: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{tab.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: tab.color }}>{tab.name}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.6 }}>{tab.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Key Features ──────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, color: C.text }}>
          {t('dashGuide.featuresTitle', '✨ Key Features')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {features.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: 'var(--surface)', borderRadius: 10, border: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: C.text }}>{f.title}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Expert Tips ───────────────────────────────────────────── */}
      <div style={{ ...CARD, background: 'rgba(34,197,94,0.05)', borderColor: C.green + '30' }}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12, color: C.text }}>
          💡 {t('dashGuide.tipsTitle', 'Expert Tips')}
        </div>
        <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: C.muted, lineHeight: 2.2 }}>
          <li>{t('dashGuide.tip1', 'Check KPI card colors every morning. Red = immediate action.')}</li>
          <li>{t('dashGuide.tip2', 'Click channel cards for 5-Section analysis.')}</li>
          <li>{t('dashGuide.tip3', 'Click country markers for detailed analysis.')}</li>
          <li>{t('dashGuide.tip4', 'Use AI analysis for creator portfolio evaluation.')}</li>
          <li>{t('dashGuide.tip5', 'Regularly verify "SECURE" status in System tab.')}</li>
        </ul>
      </div>

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <div style={CARD}>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, color: C.text }}>
          ❓ {t('dashGuide.faqTitle', 'Frequently Asked Questions')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {faqs.map((faq, i) => (
            <div key={i} style={{
              background: 'var(--surface)', borderRadius: 10,
              border: `1px solid ${C.border}`, padding: '12px 14px',
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.accent, marginBottom: 6 }}>
                Q. {faq.q}
              </div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, paddingLeft: 20 }}>
                A. {faq.a}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Ready to Start ───────────────────────────────────────── */}
      <div style={{
        ...CARD,
        background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(79,142,247,0.06))',
        borderColor: C.green + '40',
        textAlign: 'center',
        padding: 32,
      }}>
        <div style={{ fontSize: 40 }}>🚀</div>
        <div style={{ fontWeight: 900, fontSize: 18, marginTop: 8, color: C.green }}>
          {t('dashGuide.readyTitle', '🎉 You\'re Ready to Start!')}
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 6, maxWidth: 500, margin: '6px auto 0', lineHeight: 1.7 }}>
          {t('dashGuide.readyDesc', 'Click the Overview tab above to begin using the dashboard.')}
        </div>
      </div>
    </div>
  );
}
