import React from 'react';
import { useI18n } from '../i18n/index.js';

/*
 * ReadOnlyBanner (231차 #17) — 하위관리자 '열람' 권한 페이지 상단 읽기전용 안내.
 * useAdminReadOnly() 가 true 일 때만 페이지가 렌더한다.
 */
export default function ReadOnlyBanner() {
  const { t } = useI18n();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', margin: '0 0 12px', borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)', color: '#b45309', fontSize: 12.5, fontWeight: 700 }}>
      👁️ {t('readonly.banner', '열람 전용 권한입니다 — 이 페이지의 변경/저장은 비활성화되어 있습니다. (수정 권한은 최고관리자에게 요청하세요)')}
    </div>
  );
}
