/**
 * [CWIS Part004-03] Context Breadcrumb.
 *
 * ★서버가 권한·테넌트 격리를 검증해 만든 항목만 렌더한다. 프론트는 링크를 스스로 만들지 않는다.
 * ★긴 경로는 중간을 축약하되 **스크린리더에는 전체 경로를 제공**한다(명세 §32).
 * ★신규 사이드바가 꺼져 있으면 아무것도 렌더하지 않는다(무후퇴).
 */
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../i18n/index.js';
import { useCollaborationContext } from '../../context/CollaborationContextProvider.jsx';

const MAX_VISIBLE = 4;

export default function ContextBreadcrumb() {
  const t = useT();
  const { breadcrumb, enabled } = useCollaborationContext();

  const { visible, hiddenCount, fullPath } = useMemo(() => {
    const items = breadcrumb || [];
    const full = items.map(i => i.label).join(' > ');
    if (items.length <= MAX_VISIBLE) return { visible: items, hiddenCount: 0, fullPath: full };
    // 첫 1개 + 마지막 (MAX_VISIBLE-1)개만 노출, 중간은 축약
    const head = items.slice(0, 1);
    const tail = items.slice(items.length - (MAX_VISIBLE - 1));
    return { visible: [...head, null, ...tail], hiddenCount: items.length - MAX_VISIBLE, fullPath: full };
  }, [breadcrumb]);

  if (!enabled || !breadcrumb || breadcrumb.length === 0) return null;

  return (
    <nav aria-label={t('nav.breadcrumb', '현재 위치')} style={{ padding: '6px 16px', minWidth: 0 }}>
      {/* 스크린리더용 전체 경로 — 축약과 무관하게 항상 완전한 경로를 읽어준다 */}
      <span className="sr-only">{t('nav.breadcrumbFull', '전체 경로')}: {fullPath}</span>
      <ol
        style={{
          display: 'flex', alignItems: 'center', gap: 6, listStyle: 'none', margin: 0, padding: 0,
          flexWrap: 'nowrap', overflowX: 'auto', fontSize: 12, color: 'var(--text-3, #64748b)',
        }}
      >
        {visible.map((item, i) => {
          if (item === null) {
            return (
              <li key="ellipsis" aria-hidden="true" style={{ flexShrink: 0 }}>
                <span title={`${hiddenCount} more`}>…</span>
                <span style={{ margin: '0 6px', opacity: 0.5 }}>/</span>
              </li>
            );
          }
          const last = i === visible.length - 1;
          return (
            <li key={`${item.menu_key || item.url || item.label}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flexShrink: 0 }}>
              {item.clickable && item.url ? (
                <Link to={item.url} style={{ color: 'inherit', textDecoration: 'none', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.label}>
                  {item.label_key ? t(item.label_key, item.label) : item.label}
                </Link>
              ) : (
                <span
                  aria-current={item.current ? 'page' : undefined}
                  title={item.label}
                  style={{
                    maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontWeight: item.current ? 700 : 400, color: item.current ? 'var(--text-1, #1e293b)' : 'inherit',
                  }}
                >
                  {item.label_key ? t(item.label_key, item.label) : item.label}
                </span>
              )}
              {!last && <span aria-hidden="true" style={{ opacity: 0.5 }}>/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
