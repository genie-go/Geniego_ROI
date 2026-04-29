const fs = require('fs');
const path = require('path');
const dir = 'frontend/src/pages';

const pages = {
  'AIRuleEngine.jsx': {
    name: 'AIRuleEngine', title: '🤖 AI Rule Engine', desc: 'Define intelligent automation rules with AI-powered conditions',
    icon: '🤖', kpis: [
      { emoji: '📏', label: 'Active Rules', val: 28 },
      { emoji: '⚡', label: 'Triggered Today', val: 156 },
      { emoji: '✅', label: 'Success Rate', val: '99.2%' },
      { emoji: '🔄', label: 'Auto-actions', val: 42 },
    ],
    tabs: ['Rule List', 'Create Rule', 'Execution Log', 'Templates'],
    features: ['IF-THEN-ELSE builder', 'AI condition suggestions', 'Multi-channel triggers', 'Audit trail'],
  },
  'BudgetPlanner.jsx': {
    name: 'BudgetPlanner', title: '💰 Budget Planner', desc: 'Plan and optimize marketing budgets across all channels',
    icon: '💰', kpis: [
      { emoji: '💰', label: 'Total Budget', val: '$124K' },
      { emoji: '📊', label: 'Allocated', val: '87%' },
      { emoji: '📈', label: 'ROI Target', val: '340%' },
      { emoji: '🎯', label: 'Efficiency', val: 'A+' },
    ],
    tabs: ['Overview', 'Channel Allocation', 'Forecast', 'History'],
    features: ['AI budget optimization', 'Channel mix modeling', 'Scenario planning', 'Real-time spend tracking'],
  },
  'CommerceUnifiedSearch.jsx': {
    name: 'CommerceUnifiedSearch', title: '🔍 Unified Search', desc: 'Search across all products, orders, customers, and channels',
    icon: '🔍', kpis: [
      { emoji: '🔍', label: 'Searches Today', val: 1240 },
      { emoji: '📦', label: 'Products', val: '8.4K' },
      { emoji: '🛒', label: 'Orders', val: '2.1K' },
      { emoji: '👥', label: 'Customers', val: '5.6K' },
    ],
    tabs: ['All Results', 'Products', 'Orders', 'Customers'],
    features: ['Fuzzy search', 'Filter by channel', 'Sort by relevance', 'Export results'],
  },
  'DLQ.jsx': {
    name: 'DLQ', title: '📬 Dead Letter Queue', desc: 'Monitor and reprocess failed messages and events',
    icon: '📬', kpis: [
      { emoji: '📬', label: 'Queue Size', val: 3 },
      { emoji: '🔄', label: 'Retried', val: 47 },
      { emoji: '✅', label: 'Resolved', val: 44 },
      { emoji: '❌', label: 'Permanent Fail', val: 0 },
    ],
    tabs: ['Pending', 'Retried', 'Resolved', 'Config'],
    features: ['Auto-retry with backoff', 'Manual replay', 'Error categorization', 'Alert integration'],
  },
  'SubscriptionPricing.jsx': {
    name: 'SubscriptionPricing', title: '💳 Subscription Management', desc: 'Manage subscription tiers and billing',
    icon: '💳', kpis: [
      { emoji: '💳', label: 'Current Plan', val: 'Enterprise' },
      { emoji: '📅', label: 'Renewal', val: '2026-12-01' },
      { emoji: '👥', label: 'Seats Used', val: '12/20' },
      { emoji: '📊', label: 'Usage', val: '68%' },
    ],
    tabs: ['Current Plan', 'Usage', 'Billing', 'Upgrade'],
    features: ['Plan comparison', 'Usage analytics', 'Invoice history', 'Seat management'],
  },
  'UnifiedAIBuilder.jsx': {
    name: 'UnifiedAIBuilder', title: '🧠 Unified AI Builder', desc: 'Build and deploy custom AI models without coding',
    icon: '🧠', kpis: [
      { emoji: '🧠', label: 'Models', val: 6 },
      { emoji: '🚀', label: 'Deployed', val: 4 },
      { emoji: '📊', label: 'Accuracy', val: '94.8%' },
      { emoji: '⏱️', label: 'Avg Latency', val: '120ms' },
    ],
    tabs: ['My Models', 'Training', 'Deployment', 'Monitoring'],
    features: ['No-code model builder', 'AutoML training', 'A/B testing', 'Performance monitoring'],
  },
  'ImgCreativeEditor.jsx': {
    name: 'ImgCreativeEditor', title: '🎨 Creative Editor', desc: 'AI-powered image editor for marketing creatives',
    icon: '🎨', kpis: [
      { emoji: '🎨', label: 'Templates', val: 86 },
      { emoji: '🖼️', label: 'Created', val: 234 },
      { emoji: '⭐', label: 'Top Rated', val: 18 },
      { emoji: '📤', label: 'Published', val: 45 },
    ],
    tabs: ['Editor', 'Templates', 'My Creatives', 'AI Generate'],
    features: ['AI background removal', 'Brand kit integration', 'Batch resize', 'Smart text placement'],
  },
  'CampaignEnterpriseTabs.jsx': {
    name: 'CampaignEnterpriseTabs', title: '📋 Campaign Enterprise', desc: 'Enterprise campaign management with advanced orchestration',
    icon: '📋', kpis: [
      { emoji: '📋', label: 'Campaigns', val: 24 },
      { emoji: '🔄', label: 'Active', val: 8 },
      { emoji: '📊', label: 'Avg CTR', val: '3.8%' },
      { emoji: '💰', label: 'Total Spend', val: '$42K' },
    ],
    tabs: ['All Campaigns', 'Active', 'Drafts', 'Analytics'],
    features: ['Multi-channel orchestration', 'A/B testing', 'Budget pacing', 'Creative rotation'],
  },
  'CreativeStudioTab.jsx': {
    name: 'CreativeStudioTab', title: '🎬 Creative Studio', desc: 'Design and manage ad creatives across platforms',
    icon: '🎬', kpis: [
      { emoji: '🎬', label: 'Creatives', val: 156 },
      { emoji: '📱', label: 'Formats', val: 12 },
      { emoji: '✅', label: 'Approved', val: 142 },
      { emoji: '📊', label: 'Top CTR', val: '5.2%' },
    ],
    tabs: ['Gallery', 'Create New', 'Performance', 'Brand Assets'],
    features: ['Multi-format export', 'AI copy generator', 'Performance analytics', 'Brand consistency check'],
  },
  'OrderHubOverview.jsx': {
    name: 'OrderHubOverview', title: '📦 Order Overview', desc: 'Unified order management across all sales channels',
    icon: '📦', kpis: [
      { emoji: '📦', label: 'Total Orders', val: '3.2K' },
      { emoji: '🚚', label: 'In Transit', val: 156 },
      { emoji: '✅', label: 'Delivered', val: '2.8K' },
      { emoji: '↩️', label: 'Returns', val: 34 },
    ],
    tabs: ['All Orders', 'Pending', 'Shipped', 'Returns'],
    features: ['Real-time tracking', 'Bulk processing', 'Auto-fulfillment', 'Exception handling'],
  },
  'OrderHubEnhancedOrder.jsx': {
    name: 'OrderHubEnhancedOrder', title: '🛒 Enhanced Orders', desc: 'Advanced order processing with AI optimization',
    icon: '🛒', kpis: [
      { emoji: '🛒', label: 'Processing', val: 42 },
      { emoji: '⚡', label: 'Auto-processed', val: '89%' },
      { emoji: '🎯', label: 'SLA Met', val: '97.3%' },
      { emoji: '📊', label: 'Avg Time', val: '2.4h' },
    ],
    tabs: ['Queue', 'Processing', 'Completed', 'Rules'],
    features: ['Priority routing', 'Smart bundling', 'Fraud detection', 'Auto-split shipping'],
  },
  'OrderHubSettlement.jsx': {
    name: 'OrderHubSettlement', title: '💵 Settlement Center', desc: 'Track and reconcile payments across all channels',
    icon: '💵', kpis: [
      { emoji: '💵', label: 'Pending', val: '$18.4K' },
      { emoji: '✅', label: 'Settled', val: '$342K' },
      { emoji: '📊', label: 'Channels', val: 8 },
      { emoji: '🔄', label: 'Disputes', val: 2 },
    ],
    tabs: ['Pending', 'Settled', 'Disputes', 'Reports'],
    features: ['Auto-reconciliation', 'Multi-currency', 'Tax calculation', 'Payout scheduling'],
  },
};

Object.entries(pages).forEach(([file, cfg]) => {
  const fpath = path.join(dir, file);
  const jsx = `import React, { useState } from "react";
import { useI18n } from '../i18n';

const _isDemo = (() => {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'demo.genie-go.com' || h === 'demo.geniego.com' || h.startsWith('demo');
})();

export default function ${cfg.name}() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(0);
  const tabs = ${JSON.stringify(cfg.tabs)};
  const kpis = ${JSON.stringify(cfg.kpis)};

  return (
    <div style={{ padding: 24, minHeight: "100%", color: "var(--text-1, #1e293b)" }}>
      <div style={{ borderRadius: 18, padding: "28px 32px", marginBottom: 22, background: "linear-gradient(135deg, rgba(79,142,247,0.08), rgba(99,102,241,0.06))", border: "1px solid rgba(79,142,247,0.12)", backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 32 }}>${cfg.icon}</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1, #1e293b)" }}>${cfg.title}</div>
            <div style={{ fontSize: 13, color: "var(--text-3, #64748b)", marginTop: 2 }}>${cfg.desc}</div>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ borderRadius: 14, padding: "18px 20px", background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{k.emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1, #1e293b)" }}>{k.val}</div>
            <div style={{ fontSize: 11, color: "var(--text-3, #64748b)", fontWeight: 600, marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 20, padding: 4, borderRadius: 12, background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.05)" }}>
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{ flex: 1, padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, transition: "all 0.2s", background: activeTab === i ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "transparent", color: activeTab === i ? "#fff" : "var(--text-2, #475569)" }}>{tab}</button>
        ))}
      </div>
      <div style={{ borderRadius: 16, padding: "28px 32px", minHeight: 320, background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-1, #1e293b)", marginBottom: 16 }}>{tabs[activeTab]}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {${JSON.stringify(cfg.features)}.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, background: "rgba(79,142,247,0.04)", border: "1px solid rgba(79,142,247,0.08)" }}>
              <span style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#4f8ef7,#6366f1)", color: "#fff", fontSize: 12, fontWeight: 800 }}>✓</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1, #1e293b)" }}>{f}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, padding: "16px 20px", borderRadius: 12, background: "linear-gradient(135deg, rgba(34,197,94,0.06), rgba(16,185,129,0.04))", border: "1px solid rgba(34,197,94,0.12)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>System Operational</span>
        </div>
      </div>
    </div>
  );
}
`;
  fs.writeFileSync(fpath, jsx, 'utf8');
  console.log('ACTIVATED ' + file);
});

console.log('\\n=== ' + Object.keys(pages).length + ' stub pages activated ===');
