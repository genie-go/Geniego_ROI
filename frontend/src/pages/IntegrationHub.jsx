import React, { useState } from 'react';
import { useI18n } from '../i18n';

import { useT } from '../i18n/index.js';
export default function IntegrationHub() {
  const t = useT();
    const [connected, setConnected] = useState({ meta: true, google: false, cafe24: false, shopify: true, salesforce: false });
    const [loading, setLoading] = useState(null);

    const handleConnect = (key) => {
        if(connected[key]) return;
        setLoading(key);
        setTimeout(() => {
            setConnected(p => ({ ...p, [key]: true }));
            setLoading(null);
        }, 1500);
    };

    const apps = [
        { key: 'meta', name: t('super.ihMeta'), cat: t('super.ihAdvertising'), desc: t('super.ihMetaDesc'), icon: '🔵' },
        { key: 'google', name: t('super.ihGoogle'), cat: t('super.ihAdvertising'), desc: t('super.ihGoogleDesc'), icon: '🔴' },
        { key: 'cafe24', name: t('super.ihCafe'), cat: t('super.ihCommerce'), desc: t('super.ihCafeDesc'), icon: '🛒' },
        { key: 'shopify', name: t('super.ihShopify'), cat: t('super.ihCommerce'), desc: t('super.ihShopifyDesc'), icon: '🛍️' },
        { key: 'salesforce', name: t('super.ihSalesforce'), cat: t('super.ihCrm'), desc: t('super.ihSfDesc'), icon: '☁️' },
        { key: 'slack', name: t('super.ihSlack'), cat: t('super.ihCollab'), desc: t('super.ihSlackDesc'), icon: '💬' }
    ];

    return (
        <div style={{ padding: 24, animation: 'fadeIn 0.3s' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(79,142,247,0.1), rgba(168,85,247,0.1))', padding: '24px 32px', borderRadius: 16, marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>{t('super.ihTitle')}</h1>
                <p style={{ color: 'var(--text-3)', fontSize: 13 }}>{t('super.ihDesc')}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                {apps.map(app => (
                    <div key={app.key} style={{ background: 'var(--card-bg, #1e1e2e)', borderRadius: 12, padding: 20, border: connected[app.key] ? '1px solid #22c55e30' : '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ fontSize: 32 }}>{app.icon}</div>
                                <div>
                                    <div style={{ fontSize: 16, fontWeight: 800 }}>{app.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{app.cat}</div>
                                </div>
                            </div>
                            {connected[app.key] ? 
                                <span style={{ padding: '4px 10px', background: '#22c55e20', color: '#22c55e', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{t('super.ihConnected')}</span>
                            :
                                <button onClick={() => handleConnect(app.key)} disabled={loading === app.key} style={{ padding: '6px 16px', background: '#4f8ef7', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                                    {loading === app.key ? t('super.ihConnecting') : t('super.ihConnect')}
                                </button>
                            }
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{app.desc}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
