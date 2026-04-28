import React from "react";
import { useI18n } from '../i18n';

export default function CreativeStudioTab({ onUseCampaign, sourcePage = 'auto-marketing' }) {
  const { t } = useI18n();
  return (
    <div style={{ padding: 24, minHeight: "100%", color: "#1e293b" }}>
      <div style={{ borderRadius: 16, background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.08)", padding: "22px 28px", marginBottom: 20, backdropFilter: "blur(12px)" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#06b6d4" }}>🎨 {t('creative.pageTitle', 'AI 광고 소재 스튜디오')}</div>
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{t('creative.pageDesc', 'AI가 자동으로 광고 소재를 생성하고 최적화합니다. 카테고리와 채널을 선택하면 맞춤형 크리에이티브를 제안합니다.')}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, borderRadius: 14, background: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.05)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>{t('creative.comingSoonTitle', '곧 출시 예정')}</div>
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>{t('creative.comingSoonDesc', '해당 기능은 현재 개발 중입니다.')}<br/>{t('creative.comingSoonSub', '곧 업데이트를 통해 제공될 예정입니다.')}</div>
        </div>
      </div>
    </div>
  );
}
