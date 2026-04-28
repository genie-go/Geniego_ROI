import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useGlobalData } from '../context/GlobalDataContext.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useConnectorSync } from '../context/ConnectorSyncContext.jsx';

/* ─── Channel Detection ─── */
function useConnectedChannels() {
    return useMemo(() => {
        const ch = [];
        try { const k = JSON.parse(localStorage.getItem('geniego_api_keys') || '[]'); if (Array.isArray(k)) k.forEach(x => { if (x.service) ch.push(x.service.toLowerCase()); }); } catch {}
        ['meta','google','tiktok','kakao_moment','naver','coupang','amazon','shopify','gmarket','11st','line','whatsapp','qoo10','rakuten','shopee'].forEach(c => {
            try { if (localStorage.getItem(`geniego_channel_${c}`)) ch.push(c); } catch {}
        });
        return [...new Set(ch)];
    }, []);
}

/* ═══════════════════════════════════════════════════
   SECURITY — Enterprise Superium v5.0
   ═══════════════════════════════════════════════════ */
const THREAT_PATTERNS = [
  { re: /<script/i, type: 'XSS' }, { re: /javascript:/i, type: 'XSS' },
  { re: /on\w+\s*=/i, type: 'XSS' }, { re: /eval\s*\(/i, type: 'XSS' },
  { re: /document\.(cookie|domain|location)/i, type: 'XSS' },
  { re: /union\s+select/i, type: 'SQL_INJECT' }, { re: /drop\s+table/i, type: 'SQL_INJECT' },
  { re: /;\s*delete\s+from/i, type: 'SQL_INJECT' }, { re: /or\s+1\s*=\s*1/i, type: 'SQL_INJECT' },
  { re: /__proto__/i, type: 'PROTO_POLLUTION' }, { re: /constructor\s*\[/i, type: 'PROTO_POLLUTION' },
  { re: /fetch\s*\(\s*['"]http/i, type: 'DATA_EXFIL' },
  { re: /Function\s*\(/i, type: 'CODE_INJECT' },
  { re: /window\.(open|location)/i, type: 'WINDOW_MANIP' },
];
function useSecurityGuard(addAlert) {
  const [locked, setLocked] = useState(null);
  const inputLog = useRef([]);
  useEffect(() => {
    const onInput = (e) => {
      const val = e.target?.value || '';
      if (val.length < 3) return;
      const now = Date.now();
      inputLog.current.push(now);
      inputLog.current = inputLog.current.filter(t => now - t < 3000);
      if (inputLog.current.length > 20) { setLocked('BRUTE_FORCE'); try { addAlert?.({ type: 'error', msg: '[Onboarding] Brute-force blocked' }); } catch (_) {} e.target.value = ''; return; }
      for (const p of THREAT_PATTERNS) { if (p.re.test(val)) { setLocked(p.type + ': ' + val.slice(0, 60)); try { addAlert?.({ type: 'error', msg: '[Onboarding] ' + p.type + ' blocked' }); } catch (_) {} e.target.value = ''; return; } }
    };
    document.addEventListener('input', onInput, true);
    return () => document.removeEventListener('input', onInput, true);
  }, [addAlert]);
  return { locked, setLocked };
}
function SecurityOverlay({ reason, onUnlock, t }) {
  const [code, setCode] = useState('');
  if (!reason) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,5,20,0.95)', backdropFilter: 'blur(20px)' }}>
      <div style={{ textAlign: 'center', maxWidth: 420, padding: 40 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>&#128737;&#65039;</div>
        <div style={{ fontWeight: 900, fontSize: 22, color: '#ef4444', marginBottom: 12 }}>{t('onboarding.secTitle')}</div>
        <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: 11, color: '#ef4444', fontFamily: 'monospace', marginBottom: 20, wordBreak: 'break-all' }}>{reason}</div>
        <input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && code === 'GENIE-UNLOCK-2026' && onUnlock()}
          placeholder={t('onboarding.secCode')} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(9,15,30,0.6)', color: 'var(--text-1)', fontSize: 13, marginBottom: 12, outline: 'none', textAlign: 'center' }} />
        <button onClick={() => code === 'GENIE-UNLOCK-2026' && onUnlock()} style={{ padding: '10px 28px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: 'var(--text-1)', fontWeight: 800, fontSize: 13 }}>{t('onboarding.secUnlock')}</button>
        </div>
    </div>
);
}

/* ═══════════════════════════════════════════════════
   ROLES — fully i18n
   ═══════════════════════════════════════════════════ */
function buildRoles(t) {
  return [
    {
      id: 'marketer', icon: '📣', title: t('onboarding.roleMarketer'), color: '#ec4899',
      desc: t('onboarding.roleMarketerDesc'),
      tags: [t('onboarding.tagAdsOpt'), 'A/B Test', t('onboarding.tagAutomation')],
      steps: [
        { icon: '🌐', title: t('onboarding.stepAdsIntegration'), desc: t('onboarding.stepAdsIntegrationDesc'), route: '/omni-channel', kpi: t('onboarding.kpiAdsIntegration') },
        { icon: '🎯', title: t('onboarding.stepAttribution'), desc: t('onboarding.stepAttributionDesc'), route: '/attribution', kpi: t('onboarding.kpiAttribution') },
        { icon: '🤖', title: t('onboarding.stepAIMarketing'), desc: t('onboarding.stepAIMarketingDesc'), route: '/ai-marketing-hub', kpi: t('onboarding.kpiAIMarketing') },
        { icon: '👥', title: t('onboarding.stepCRM'), desc: t('onboarding.stepCRMDesc'), route: '/crm', kpi: t('onboarding.kpiCRM') },
        { icon: '🧪', title: t('onboarding.stepABTest'), desc: t('onboarding.stepABTestDesc'), route: '/attribution', kpi: t('onboarding.kpiABTest') },
      ],
    },
    {
      id: 'commerce', icon: '🛒', title: t('onboarding.roleCommerce'), color: '#f97316',
      desc: t('onboarding.roleCommerceDesc'),
      tags: [t('onboarding.tagInventory'), t('onboarding.tagOrders'), '3PL'],
      steps: [
        { icon: '🔗', title: t('onboarding.stepChannelConnect'), desc: t('onboarding.stepChannelConnectDesc'), route: '/omni-channel', kpi: t('onboarding.kpiChannelConnect') },
        { icon: '📦', title: t('onboarding.stepOrderHub'), desc: t('onboarding.stepOrderHubDesc'), route: '/order-hub', kpi: t('onboarding.kpiOrderHub') },
        { icon: '🏭', title: t('onboarding.stepWMS'), desc: t('onboarding.stepWMSDesc'), route: '/wms', kpi: t('onboarding.kpiWMS') },
        { icon: '💰', title: t('onboarding.stepSettlement'), desc: t('onboarding.stepSettlementDesc'), route: '/settlements', kpi: t('onboarding.kpiSettlement') },
        { icon: '🔔', title: t('onboarding.stepInventoryAlert'), desc: t('onboarding.stepInventoryAlertDesc'), route: '/alert-policies', kpi: t('onboarding.kpiInventoryAlert') },
      ],
    },
    {
      id: 'finance', icon: '📊', title: t('onboarding.roleFinance'), color: '#22c55e',
      desc: t('onboarding.roleFinanceDesc'),
      tags: ['P&L', t('onboarding.tagProfitability'), 'ESG'],
      steps: [
        { icon: '💹', title: t('onboarding.stepPnL'), desc: t('onboarding.stepPnLDesc'), route: '/pnl-dashboard', kpi: t('onboarding.kpiPnL') },
        { icon: '📈', title: t('onboarding.stepChannelProfit'), desc: t('onboarding.stepChannelProfitDesc'), route: '/attribution', kpi: t('onboarding.kpiChannelProfit') },
        { icon: '💳', title: t('onboarding.stepReconciliation'), desc: t('onboarding.stepReconciliationDesc'), route: '/reconciliation', kpi: t('onboarding.kpiReconciliation') },
        { icon: '🌱', title: t('onboarding.stepESG'), desc: t('onboarding.stepESGDesc'), route: '/pnl-dashboard', kpi: t('onboarding.kpiESG') },
        { icon: '📄', title: t('onboarding.stepReportAuto'), desc: t('onboarding.stepReportAutoDesc'), route: '/report-builder', kpi: t('onboarding.kpiReportAuto') },
      ],
    },
    {
      id: 'ops', icon: '⚙️', title: t('onboarding.roleOps'), color: '#a855f7',
      desc: t('onboarding.roleOpsDesc'),
      tags: ['3PL', t('onboarding.tagSupplyChain'), t('onboarding.tagReturns')],
      steps: [
        { icon: '🚚', title: t('onboarding.step3PL'), desc: t('onboarding.step3PLDesc'), route: '/supply-chain', kpi: t('onboarding.kpi3PL') },
        { icon: '🗺️', title: t('onboarding.stepSupplyChain'), desc: t('onboarding.stepSupplyChainDesc'), route: '/supply-chain', kpi: t('onboarding.kpiSupplyChain') },
        { icon: '↩️', title: t('onboarding.stepReturns'), desc: t('onboarding.stepReturnsDesc'), route: '/returns-portal', kpi: t('onboarding.kpiReturns') },
        { icon: '🌏', title: t('onboarding.stepAsiaLogistics'), desc: t('onboarding.stepAsiaLogisticsDesc'), route: '/asia-logistics', kpi: t('onboarding.kpiAsiaLogistics') },
        { icon: '⚠️', title: t('onboarding.stepOpsAlert'), desc: t('onboarding.stepOpsAlertDesc'), route: '/alert-policies', kpi: t('onboarding.kpiOpsAlert') },
      ],
    },
    {
      id: 'developer', icon: '💻', title: t('onboarding.roleDev'), color: '#14d9b0',
      desc: t('onboarding.roleDevDesc'),
      tags: ['API', t('onboarding.tagMonitoring'), t('onboarding.tagData')],
      steps: [
        { icon: '🔑', title: t('onboarding.stepAPIKey'), desc: t('onboarding.stepAPIKeyDesc'), route: '/api-keys', kpi: t('onboarding.kpiAPIKey') },
        { icon: '🔌', title: t('onboarding.stepConnector'), desc: t('onboarding.stepConnectorDesc'), route: '/connectors', kpi: t('onboarding.kpiConnector') },
        { icon: '📋', title: t('onboarding.stepDataSchema'), desc: t('onboarding.stepDataSchemaDesc'), route: '/data-schema', kpi: t('onboarding.kpiDataSchema') },
        { icon: '🖥️', title: t('onboarding.stepSysMonitor'), desc: t('onboarding.stepSysMonitorDesc'), route: '/system-monitor', kpi: t('onboarding.kpiSysMonitor') },
        { icon: '🛡️', title: t('onboarding.stepAIPolicy'), desc: t('onboarding.stepAIPolicyDesc'), route: '/ai-policy', kpi: t('onboarding.kpiAIPolicy') },
      ],
    },
  ];
}

/* ═══════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════ */
function RoleCard({ role, selected, onSelect }) {
  return (
    <div onClick={() => onSelect(role.id)} style={{
      padding: '20px', borderRadius: 16, cursor: 'pointer', transition: 'all 200ms',
      background: selected ? `${role.color}12` : 'rgba(255,255,255,0.03)',
      border: `2px solid ${selected ? role.color : 'rgba(255,255,255,0.08)'}`,
      transform: selected ? 'translateY(-2px)' : 'none',
      boxShadow: selected ? `0 8px 30px ${role.color}25` : 'none',
    }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>{role.icon}</div>
      <div style={{ fontWeight: 900, fontSize: 14, color: selected ? role.color : 'var(--text-1)', marginBottom: 4 }}>{role.title}</div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 10 }}>{role.desc}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {role.tags.map(tag => (
          <span key={tag} style={{ fontSize: 9, padding: '2px 8px', borderRadius: 99, background: `${role.color}15`, color: role.color, fontWeight: 700, border: `1px solid ${role.color}30` }}>{tag}</span>
        ))}
      {selected && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, color: role.color, fontSize: 11, fontWeight: 700 }}>
          <span style={{ width: 16, height: 16, borderRadius: '50%', background: role.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-1)', fontSize: 10 }}>✓</span>
          ✓
      </div>
      )}
            </div>
);
}

function StepProgress({ steps, currentStep, completed, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: completed.has(i) ? 14 : 13, fontWeight: 900, transition: 'all 300ms',
              background: completed.has(i) ? '#22c55e' : i === currentStep ? color : 'rgba(255,255,255,0.08)',
              color: (completed.has(i) || i === currentStep) ? '#fff' : 'var(--text-3)',
              boxShadow: i === currentStep ? `0 0 16px ${color}66` : 'none',
            }}>
              {completed.has(i) ? '✓' : s.icon}
            <div style={{ fontSize: 9, color: i === currentStep ? color : 'var(--text-3)', marginTop: 4, fontWeight: i === currentStep ? 700 : 400, textAlign: 'center', maxWidth: 60 }}>{s.title.slice(0, 8)}</div>
          {i < steps.length - 1 && (
            <div style={{ height: 2, flex: 1.5, background: completed.has(i) ? '#22c55e' : 'rgba(255,255,255,0.08)', transition: 'background 300ms', marginBottom: 20 }} />
          )}
        </React.Fragment>
      ))}
            </div>
        </div>
    </div>
);
}

/* ═══════════════════════════════════════════════════
   GuideTab — Usage Guide (9-lang)
   ═══════════════════════════════════════════════════ */
function GuideTab({ t }) {
    const CARD = { borderRadius: 16, border: '1px solid rgba(99,140,255,0.08)', padding: 20, background: 'rgba(9,15,30,0.6)' };
    const steps = [
        { icon: '1️⃣', title: t('onboarding.guideStep1Title'), desc: t('onboarding.guideStep1Desc'), color: '#ec4899' },
        { icon: '2️⃣', title: t('onboarding.guideStep2Title'), desc: t('onboarding.guideStep2Desc'), color: '#f97316' },
        { icon: '3️⃣', title: t('onboarding.guideStep3Title'), desc: t('onboarding.guideStep3Desc'), color: '#22c55e' },
        { icon: '4️⃣', title: t('onboarding.guideStep4Title'), desc: t('onboarding.guideStep4Desc'), color: '#a855f7' },
        { icon: '5️⃣', title: t('onboarding.guideStep5Title'), desc: t('onboarding.guideStep5Desc'), color: '#4f8ef7' },
        { icon: '6️⃣', title: t('onboarding.guideStep6Title'), desc: t('onboarding.guideStep6Desc'), color: '#14d9b0' },
    ];
    const sections = [
        { icon: '📣', name: t('onboarding.roleMarketer'), desc: t('onboarding.guideSecMarketer') },
        { icon: '🛒', name: t('onboarding.roleCommerce'), desc: t('onboarding.guideSecCommerce') },
        { icon: '📊', name: t('onboarding.roleFinance'), desc: t('onboarding.guideSecFinance') },
        { icon: '⚙️', name: t('onboarding.roleOps'), desc: t('onboarding.guideSecOps') },
        { icon: '💻', name: t('onboarding.roleDev'), desc: t('onboarding.guideSecDev') },
    ];
    return (
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24, padding: 4 }}>
            <div style={{ ...CARD, background: 'linear-gradient(135deg,rgba(79,142,247,0.08),rgba(99,102,241,0.06))', borderColor: '#4f8ef740', textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 40 }}>🚀</div>
                <div style={{ fontWeight: 900, fontSize: 20, marginTop: 8 }}>{t('onboarding.guideTitle')}</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 6, maxWidth: 520, margin: '6px auto 0' }}>{t('onboarding.guideSub')}</div>
            <div style={CARD}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>{t('onboarding.guideStepsTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                    {steps.map((s, i) => (
                        <div key={i} style={{ background: s.color + '08', border: `1px solid ${s.color}25`, borderRadius: 12, padding: 16, transition: 'transform 150ms, border-color 150ms' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = s.color + '55'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = s.color + '25'; }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <span style={{ fontSize: 20 }}>{s.icon}</span>
                                <span style={{ fontWeight: 700, fontSize: 14, color: s.color }}>{s.title}</span>
                            <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>{s.desc}</div>
                    ))}
            </div>
            <div style={CARD}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>{t('onboarding.guideRolesTitle')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                    {sections.map((n, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, border: '1px solid rgba(99,140,255,0.08)' }}>
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icon}</span>
                            <div><div style={{ fontWeight: 700, fontSize: 12 }}>{n.name}</div><div style={{ fontSize: 11, color: '#888', marginTop: 2, lineHeight: 1.5 }}>{n.desc}</div></div>
                    ))}
            </div>
            <div style={{ ...CARD, background: 'rgba(79,142,247,0.04)', borderColor: '#4f8ef730' }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>💡 {t('onboarding.guideTipsTitle')}</div>
                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#888', lineHeight: 2 }}>
                    <li>{t('onboarding.guideTip1')}</li><li>{t('onboarding.guideTip2')}</li><li>{t('onboarding.guideTip3')}</li><li>{t('onboarding.guideTip4')}</li><li>{t('onboarding.guideTip5')}</li>
                </ul>
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

/* ═══════════════════════════════════════════════════
   MAIN — Enterprise Superium v6.0
   ═══════════════════════════════════════════════════ */
export default function Onboarding() {
  const { t } = useI18n();
  const { addAlert } = useGlobalData();
  const navigate = useNavigate();
  const { locked, setLocked } = useSecurityGuard(addAlert);
  const bcRef = useRef(null);
  const connectedChannels = useConnectedChannels();
  const { connectedCount = 0 } = useConnectorSync?.() || {};
  const [syncTick, setSyncTick] = useState(0);

  const ROLES = buildRoles(t);

  const [selectedRole, setSelectedRole] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(new Set());
  const [phase, setPhase] = useState('role');
  const [elapsed, setElapsed] = useState(0);

  const role = ROLES.find(r => r.id === selectedRole);
  const steps = role?.steps || [];
  const step = steps[currentStep];
  const progress = steps.length > 0 ? Math.round(completed.size / steps.length * 100) : 0;

  // BroadcastChannel 3-channel sync + 30s polling
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch1 = new BroadcastChannel('genie_onboarding_sync');
    const ch2 = new BroadcastChannel('genie_connector_sync');
    const ch3 = new BroadcastChannel('genie_product_sync');
    const handler = () => setSyncTick(p => p + 1);
    ch1.onmessage = (e) => {
      handler();
      if (e.data?.type === 'step_completed')
        addAlert?.({ type: 'info', msg: t('onboarding.crossTabSync') });
    };
    ch2.onmessage = (e) => { if (['CHANNEL_REGISTERED','CHANNEL_REMOVED'].includes(e.data?.type)) handler(); };
    ch3.onmessage = handler;
    bcRef.current = ch1;
    return () => { ch1.close(); ch2.close(); ch3.close(); };
  }, []);
  useEffect(() => {
    const id = setInterval(() => { setSyncTick(p => p + 1); try { bcRef.current?.postMessage({ type: 'OB_UPDATE', ts: Date.now() }); } catch {} }, 30000);
    return () => clearInterval(id);
  }, []);

  // Elapsed timer
  useEffect(() => {
    if (phase !== 'steps') return;
    const timer = setInterval(() => setElapsed(e => e + 1), 60000);
    return () => clearInterval(timer);
  }, [phase]);

  // localStorage persistence
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('g_smart_onboarding') || '{}');
      if (saved.role) { setSelectedRole(saved.role); setPhase('steps'); }
      if (saved.completed) setCompleted(new Set(saved.completed));
      if (saved.step) setCurrentStep(saved.step);
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!selectedRole) return;
    try { localStorage.setItem('g_smart_onboarding', JSON.stringify({ role: selectedRole, completed: [...completed], step: currentStep })); } catch (_) {}
  }, [selectedRole, completed, currentStep]);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), role: selectedRole, progress, completedSteps: [...completed], connectedChannels }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `onboarding_${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
  };

  const startWithRole = (roleId) => {
    setSelectedRole(roleId);
    setPhase('steps');
    setCurrentStep(0);
    setCompleted(new Set());
    addAlert?.({ type: 'info', msg: `[Onboarding] ${t('onboarding.roleStarted')}` });
  };

  const completeStep = useCallback(() => {
    setCompleted(c => new Set([...c, currentStep]));
    if (currentStep < steps.length - 1) setCurrentStep(i => i + 1);
    try { bcRef.current?.postMessage({ type: 'step_completed', step: currentStep }); } catch (_) {}
    addAlert?.({ type: 'success', msg: `[Onboarding] ${t('onboarding.stepCompleted')} (${currentStep + 1}/${steps.length})` });
  }, [currentStep, steps.length, addAlert, t]);

  const handleAction = (route) => { completeStep(); navigate(route); };

  const resetOnboarding = () => {
    setSelectedRole(null); setPhase('role'); setCurrentStep(0); setCompleted(new Set()); setElapsed(0);
    localStorage.removeItem('g_smart_onboarding');
  };

  /* ── Guide phase ── */
  if (phase === 'guide') {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 4 }}>
        <SecurityOverlay reason={locked} onUnlock={() => setLocked(null)} t={t} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10, gap: 6 }}>
          <button onClick={() => setPhase('role')} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontSize: 11, cursor: 'pointer' }}>{t('onboarding.backToRoles')} ←</button>
          <button onClick={handleExport} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(79,142,247,0.3)', background: 'rgba(79,142,247,0.08)', color: '#4f8ef7', cursor: 'pointer', fontWeight: 700, fontSize: 11 }}>📥 {t('onboarding.export')}</button>
        <GuideTab t={t} />
        </div>
    </div>
);
  }

  /* ── Role Selection ── */
  if (phase === 'role') {
    return (
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: 4 }}>
        <SecurityOverlay reason={locked} onUnlock={() => setLocked(null)} t={t} />
        <div className="hero fade-up" style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
          <div className="hero-title grad-blue-purple">{t('onboarding.welcomeTitle')}</div>
          <div className="hero-desc" style={{ maxWidth: 520, margin: '8px auto' }}>
            {t('onboarding.welcomeDesc')}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 99, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', fontSize: 11, color: '#4ade80', fontWeight: 700 }}>
              ⏱️ {t('onboarding.estimatedTime')}
            {connectedChannels.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '6px 12px', borderRadius: 99, background: '#a855f718', color: '#a855f7', border: '1px solid #a855f733' }}>🔗 {connectedChannels.length} {t('onboarding.channelsLinked')}</span>}
            <button onClick={() => setPhase('guide')} style={{ padding: '6px 16px', borderRadius: 99, border: '1px solid rgba(79,142,247,0.3)', background: 'rgba(79,142,247,0.08)', color: '#4f8ef7', cursor: 'pointer', fontWeight: 700, fontSize: 11 }}>📖 {t('onboarding.viewGuide')}</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
          {ROLES.map(r => <RoleCard key={r.id} role={r} selected={selectedRole === r.id} onSelect={setSelectedRole} />)}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button onClick={() => selectedRole && startWithRole(selectedRole)} disabled={!selectedRole} style={{
            padding: '14px 40px', borderRadius: 14, border: 'none', cursor: selectedRole ? 'pointer' : 'not-allowed',
            background: selectedRole ? `linear-gradient(135deg, ${ROLES.find(r => r.id === selectedRole)?.color}, #6366f1)` : 'rgba(255,255,255,0.08)',
            color: 'var(--text-1)', fontWeight: 900, fontSize: 15, transition: 'all 200ms',
            boxShadow: selectedRole ? `0 8px 30px ${ROLES.find(r => r.id === selectedRole)?.color}44` : 'none',
            opacity: selectedRole ? 1 : 0.5,
          }}>
            {selectedRole ? `${ROLES.find(r => r.id === selectedRole)?.title} — ${t('onboarding.btnStart')} →` : t('onboarding.selectRole')}
          </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
  }

  /* ── Step Guide ── */
  return (
<div style={{ maxWidth: 900, margin: '0 auto', padding: 4 }}>
      <SecurityOverlay reason={locked} onUnlock={() => setLocked(null)} t={t} />
      {/* Header */}
      <div className="hero fade-up" style={{ background: `linear-gradient(135deg,${role.color}08,rgba(0,0,0,0))`, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>{role.icon}</span>
            <div>
              <div style={{ fontSize: 11, color: role.color, fontWeight: 700 }}>{role.title} — {t('onboarding.exclusiveGuide')}</div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{t('onboarding.fiveStepPath')}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 11, color: '#4ade80' }}>
              ⏱️ {elapsed}{t('onboarding.minElapsed')} / {t('onboarding.goal30min')}
            <button onClick={resetOnboarding} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', fontSize: 11, cursor: 'pointer' }}>{t('onboarding.changeRole')}</button>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>
            <span>{t('onboarding.progressLabel')}</span>
            <span style={{ fontWeight: 700, color: progress === 100 ? '#22c55e' : role.color }}>{progress}% {progress === 100 ? '🎉' : ''}</span>
          <div style={{ height: 8, borderRadius: 8, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', borderRadius: 8, transition: 'width 500ms', background: `linear-gradient(90deg,${role.color},#6366f1)` }} />
        </div>

      <StepProgress steps={steps} currentStep={currentStep} completed={completed} color={role.color} />

      {step && (
        <div className="card card-glass fade-up" style={{ border: `1px solid ${role.color}22`, background: `linear-gradient(145deg,rgba(5,10,25,0.9),${role.color}05)` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: `${role.color}12`, border: `2px solid ${role.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{step.icon}</div>
            <div>
              <div style={{ fontSize: 10, color: role.color, fontWeight: 800, marginBottom: 3 }}>STEP {currentStep + 1} / {steps.length}</div>
              <div style={{ fontSize: 20, fontWeight: 900 }}>{step.title}</div>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.8, marginBottom: 16 }}>{step.desc}</div>
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🎯</span>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 1 }}>{t('onboarding.expectedEffect')}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#4ade80' }}>{step.kpi}</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handleAction(step.route)} style={{
              flex: 2, padding: '13px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: 14,
              background: `linear-gradient(135deg,${role.color},${role.color}88)`, color: 'var(--text-1)',
              boxShadow: `0 4px 20px ${role.color}33`, transition: 'all 150ms',
            }}>
              {step.title} — {t('onboarding.btnStart')} →
            </button>
            {!completed.has(currentStep) && (
              <button onClick={completeStep} style={{ flex: 1, padding: '13px', borderRadius: 12, border: `1px solid ${role.color}44`, background: 'transparent', color: role.color, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {t('onboarding.markComplete')} ✓
              </button>
            )}
            {currentStep < steps.length - 1 && (
              <button onClick={() => setCurrentStep(i => i + 1)} style={{ padding: '13px 16px', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontSize: 13, cursor: 'pointer' }}>
                {t('onboarding.btnNext')} →
              </button>
            )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            {steps.map((_, i) => (
              <div key={i} onClick={() => setCurrentStep(i)} style={{
                width: i === currentStep ? 20 : 8, height: 8, borderRadius: 8, cursor: 'pointer', transition: 'all 200ms',
                background: completed.has(i) ? '#22c55e' : i === currentStep ? role.color : 'rgba(255,255,255,0.15)',
              }} />
            ))})}

      {progress === 100 && (
        <div className="card card-glass" style={{ textAlign: 'center', marginTop: 16, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.04)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#22c55e', marginBottom: 8 }}>{t('onboarding.allComplete')}</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>{t('onboarding.completionMsg')}</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => navigate('/dashboard')} style={{ padding: '12px 28px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#22c55e,#4f8ef7)', color: 'var(--text-1)', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
              {t('onboarding.goToDashboard')} →
            </button>
            <button onClick={resetOnboarding} style={{ padding: '12px 20px', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', fontSize: 13, cursor: 'pointer' }}>
              {t('onboarding.exploreOtherRoles')}
            </button>)}
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
