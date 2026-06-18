import { useAuth } from './AuthContext.jsx';
import { useLocation } from 'react-router-dom';

/*
 * useAdminReadOnly (231차 #17) — 하위관리자 ADMIN 메뉴 '열람(view)' 레벨 읽기전용 강제.
 *  - 최고관리자(master): 항상 편집 가능 → false
 *  - 하위관리자(sub): 해당 admin 경로의 권한이 'view' 면 읽기전용 → true, 'edit'/미지정이면 false
 *  admin_menus={경로:'view'|'edit'} (231차 #4) + AuthContext.adminMenuLevel 소비.
 *  페이지는 이 값으로 쓰기 버튼 disable + 핸들러 early-return + <ReadOnlyBanner/> 노출.
 */
export function useAdminReadOnly(pathOverride) {
  const { adminLevel, adminMenuLevel } = useAuth();
  const loc = useLocation();
  if (adminLevel === 'master') return false;
  const lvl = adminMenuLevel ? adminMenuLevel(pathOverride || loc.pathname) : null;
  return lvl === 'view';
}
