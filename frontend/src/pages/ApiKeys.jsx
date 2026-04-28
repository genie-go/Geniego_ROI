import React from "react";
import { useI18n } from '../i18n';

export default function ApiKeys() {
  const { t } = useI18n();
  return (
    <div style={{ padding: 24, minHeight: "100%", color: "var(--text-1, #1e293b)" }}>
      <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.08)", padding: "22px 28px", marginBottom: 20, backdropFilter: "blur(12px)" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{t('common.underConstruction', 'ApiKeys')}</div>
        <div style={{ fontSize: 13, color: "var(--text-3, #64748b)", marginTop: 4 }}>{t('common.comingSoon', 'Coming soon.')}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, borderRadius: 14, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.05)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Coming Soon</div>
          <div style={{ fontSize: 13, color: "var(--text-3, #64748b)", lineHeight: 1.7 }}>Under development.<br/>Available in an upcoming update.</div>
        </div>
      </div>
    </div>
  );
}

