import React, { useMemo } from 'react';
import { useT } from '../i18n/index.js';
import { useMenuVisibility } from '../context/MenuVisibilityContext.jsx';

/**
 * UserMenuPreferences — N-152-F F3 (사용자별 개인 메뉴 토글) skeleton.
 *
 * - 본인 한정 (localStorage 영속, 백엔드 영속은 별도 트랙)
 * - 전역 > 개인 우선순위 (admin 이 숨긴 메뉴는 사용자가 펼칠 수 없음)
 */
export default function UserMenuPreferences() {
  const t = useT();
  const { globalVisibility, userPrefs, setUserVisibility, resetUserPrefs, loading, error } = useMenuVisibility();

  const menuIds = useMemo(() => Object.keys(globalVisibility).sort(), [globalVisibility]);

  return (
    <div style={{ padding: 24, color: 'var(--text-1, #e5e7eb)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>{t('user.menu.title', '내 메뉴 설정')}</h2>
        <button
          onClick={() => {
            if (confirm('개인 메뉴 설정을 모두 초기화합니까?')) resetUserPrefs();
          }}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border, #334155)',
                   background: 'transparent', color: 'inherit', cursor: 'pointer' }}
        >
          초기화
        </button>
      </div>

      <div style={{ padding: 12, marginBottom: 16, background: 'rgba(99,102,241,0.1)',
                    borderRadius: 8, fontSize: 13, lineHeight: 1.6 }}>
        ※ 관리자가 숨긴 메뉴는 본 페이지에서 펼칠 수 없습니다. (전역 &gt; 개인 우선)
      </div>

      {error && (
        <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444',
                      borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading && <div>로딩 중…</div>}

      {!loading && menuIds.length === 0 && (
        <div style={{ padding: 24, opacity: 0.7 }}>
          메뉴 목록을 불러올 수 없습니다. (백엔드 운영 적용 + seed 필요)
        </div>
      )}

      <div>
        {menuIds.map(id => {
          const g = globalVisibility[id];
          const u = userPrefs[id];
          const globalHidden = g && g.visibility !== 'visible';
          const finalHidden = globalHidden || u === 'hidden';
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 12,
                                   padding: '8px 0', borderBottom: '1px solid var(--border, #1e293b)' }}>
              <span style={{ flex: 1 }}>
                {id}
                {globalHidden && (
                  <span style={{ marginLeft: 8, fontSize: 11, color: '#ef4444' }}>(전역 숨김)</span>
                )}
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: globalHidden ? 0.4 : 1 }}>
                <input
                  type="checkbox"
                  checked={!finalHidden}
                  disabled={globalHidden}
                  onChange={e => setUserVisibility(id, e.target.checked)}
                />
                <span>{finalHidden ? '숨김' : '표시'}</span>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
