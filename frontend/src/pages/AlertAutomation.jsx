import React, { useState } from 'react';
import { useI18n } from '../i18n';

import { useT } from '../i18n/index.js';
export default function AlertAutomation() {
  const t = useT();
    const [rules, setRules] = useState([
        { id: 1, name: "{t('super.aaRoasAlert')}", cond: "ROAS < 2.0x", channel: "Slack #marketing", active: true },
        { id: 2, name: "{t('super.aaStock')}", cond: "Remaining < 50 units", channel: "Teams", active: false },
        { id: 3, name: "{t('super.aaCvr')}", cond: "CVR > 15%", channel: "Email", active: true }
    ]);
    const [newRule, setNewRule] = useState(false);

    return (
        <div style={{ padding: 24, animation: 'fadeIn 0.3s' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(245,158,11,0.1))', padding: '24px 32px', borderRadius: 16, marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>{t('super.aaTitle')}</h1>
                <p style={{ color: 'var(--text-3)', fontSize: 13 }}>{t('super.aaDesc')}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Automation Rules */}
                <div style={{ background: 'var(--card-bg, #1e1e2e)', borderRadius: 12, padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div style={{ fontSize: 16, fontWeight: 800 }}>{t('super.aaRules')}</div>
                        <button onClick={() => setNewRule(true)} style={{ padding: '6px 12px', background: '#eab308', color: '#000', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>{t('super.aaAdd')}</button>
                    </div>
                    {rules.map(r => (
                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 10, borderLeft: r.active ? '4px solid #22c55e' : '4px solid #888' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{t('super.aaCond')}: <span style={{ color: '#ef4444' }}>{r.cond}</span></div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 11, background: '#4f8ef720', color: '#4f8ef7', padding: '2px 8px', borderRadius: 4 }}>{r.channel}</div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginTop: 4 }}>
                                    <input type="checkbox" checked={r.active} onChange={() => {}} /> Active
                                </label>
                            </div>
                        </div>
                    ))}
                    {newRule && (
                        <div style={{ padding: 12, background: 'rgba(245,158,11,0.1)', borderRadius: 8, border: '1px solid #f59e0b50', marginTop: 10 }}>
                            <input placeholder={t('super.aaRuleName')} style={{ width: '100%', marginBottom: 8, padding: 6, borderRadius: 4, background: '#000', color: '#fff' }} />
                            <input placeholder={t('super.aaRuleCond')} style={{ width: '100%', marginBottom: 8, padding: 6, borderRadius: 4, background: '#000', color: '#fff' }} />
                            <select style={{ width: '100%', marginBottom: 8, padding: 6, borderRadius: 4, background: '#000', color: '#fff' }}><option>Slack</option><option>Teams</option><option>Email</option></select>
                            <button onClick={() => setNewRule(false)} style={{ width: '100%', padding: '6px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}>{t('super.aaSave')}</button>
                        </div>
                    )}
                </div>

                {/* Dashboard Annotations */}
                <div style={{ background: 'var(--card-bg, #1e1e2e)', borderRadius: 12, padding: 20 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>{t('super.aaTeamAnn')}</div>
                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 10 }}>
                        <div style={{ fontSize: 11, color: '#4f8ef7', fontWeight: 700, marginBottom: 4 }}>{t('super.aaAdmin')}</div>
                        <div style={{ fontSize: 13 }}>{t('super.aaAdminCmt')}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'right', marginTop: 8 }}>{t('super.aaTime1')}</div>
                    </div>
                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 10 }}>
                        <div style={{ fontSize: 11, color: '#eab308', fontWeight: 700, marginBottom: 4 }}>{t('super.aaLead')}</div>
                        <div style={{ fontSize: 13 }}>{t('super.aaLeadCmt')}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'right', marginTop: 8 }}>{t('super.aaTime2')}</div>
                    </div>
                    <div style={{ marginTop: 20 }}>
                        <input placeholder={t('super.aaAddCmt')} style={{ width: '100%', padding: '10px', borderRadius: 6, border: '1px solid var(--border)', background: 'rgba(0,0,0,0.5)', color: '#fff' }} />
                        <button style={{ marginTop: 8, width: '100%', padding: '8px', background: '#4f8ef7', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>{t('super.aaPostCmt')}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
