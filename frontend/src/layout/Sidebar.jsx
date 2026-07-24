import React, { useMemo, useState, useEffect, useCallback } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useT, useI18n } from "../i18n/index.js";
import SIDEBAR_DICT from './sidebarI18n.js';
import { useAuth } from "../auth/AuthContext.jsx";
import { useGlobalData } from "../context/GlobalDataContext.jsx";
import { useMobileSidebar } from "../context/MobileSidebarContext.jsx";
import { useMenuVisibility } from "../context/MenuVisibilityContext.jsx";
import { MEMBER_MENU, ADMIN_MENU, ADMIN_ONLY_MENU_KEYS } from './sidebarManifest.js';
import { IS_DEMO } from '../utils/demoEnv';

/* 데모 모드 감지 — 180차: broad includes('demo') 제거 → demoEnv 정본 격리 */
const IS_DEMO_MODE = IS_DEMO;

/* 즐겨찾기 토글 별표 — 메뉴 항목 옆에 붙는 유일한 "추가" 진입점.
 *
 * ★[현 차수] 이 버튼이 없어서 즐겨찾기는 도달 불가능한 기능이었다.
 *   초기 커밋 이래 toggleFav 는 QuickAccessPanel 의 ✕(해제) 버튼에서만 호출됐다.
 *   즉 **추가할 방법이 없으니 favs 는 영원히 비어 있고**, hasFavs 가 false 라
 *   즐겨찾기 탭 자체가 렌더되지 않았다(해제 버튼도 함께 도달 불가).
 *   i18n `sidebar.addFav` 는 15개국 전부에 이미 준비돼 있었다 — 버튼만 없었다.
 *
 * 접근성: 토글이므로 aria-pressed 로 현재 상태를 스크린리더에 노출한다(ST03 실측 0건 → 보강).
 * 무후퇴: NavLink 를 감싸지 않고 형제로 두며, NavLink 는 기존 className·style 을 그대로 유지한다.
 *
 * ★[현 차수] touch — 모바일 터치 타깃 보강(BACKLOG-2).
 *   기존 hit 영역은 padding 2px 5px + glyph 12~13px = 약 23x17px 로 WCAG 2.5.5 권장 44px 에 미달했다.
 *   **글리프 크기는 그대로 두고 hit 영역만 44x44 로 넓힌다**(시각 변화 0 · 무후퇴).
 *   행 높이는 늘지 않는다 — styles.css:797 `.sidebar .nav-item { min-height:44px !important }` 로
 *   모바일 행이 이미 44px 이상이라 minHeight 44 가 행을 밀어내지 않기 때문이다.
 *   (이 전제가 깨지면 NavSection 의 _itemH=48 아코디언 maxHeight 계산이 클리핑을 일으키므로 함께 확인할 것.)
 */
function FavStar({ path, isFav, onToggle, addLabel, removeLabel, size = 12, touch = false }) {
  if (!onToggle) return null;
  const label = isFav ? removeLabel : addLabel;
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(path); }}
      aria-pressed={isFav}
      aria-label={label}
      title={label}
      style={{
        flexShrink: 0, border: 'none', background: 'transparent',
        cursor: 'pointer', lineHeight: 1, fontSize: size,
        color: isFav ? '#eab308' : 'var(--text-3)',
        opacity: isFav ? 1 : 0.45, transition: 'opacity 150ms, color 150ms',
        ...(touch
          ? { minWidth: 44, minHeight: 44, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }
          : { padding: '2px 5px' }),
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = 1; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = isFav ? 1 : 0.45; }}
    >{isFav ? '★' : '☆'}</button>
  );
}

/* 즐겨찾기
 * ★[ST07-06] 사용자 지정 순서(device-local Reorder) 지원.
 *   저장 형태는 이전과 동일한 경로 배열(localStorage 'g_sidebar_favs')이라 **기존 사용자 데이터 무후퇴**.
 *   상태는 Set 하나를 유지하되, Set 은 삽입 순서를 보존하므로 [...favs] 가 곧 사용자 순서다.
 *   - toggle 추가: 배열 맨 앞에 prepend(최신이 상단) → 이전의 "add(끝) + 표시 시 reverse" 와 시각 결과 동일(무후퇴)
 *     하지만 순서가 명시적이 되어 재정렬이 가능해진다(표시부의 reverse 제거와 짝).
 *   - move: 인접 항목과 위치 교환(경계에서 no-op). DnD 라이브러리 부재로 키보드 접근 가능한 ▲▼ 버튼이 유일 방식.
 */
function useFavorites() {
  const [favs, setFavs] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('g_sidebar_favs') || '[]')); }
    catch { return new Set(); }
  });
  const persist = (arr) => {
    try { localStorage.setItem('g_sidebar_favs', JSON.stringify(arr)); } catch { /* 스토리지 접근 실패(프라이빗 모드/쿼터) 무시 */ }
  };
  const toggle = useCallback((path) => {
    setFavs(prev => {
      const arr = [...prev];
      const next = arr.includes(path) ? arr.filter(p => p !== path) : [path, ...arr]; // 추가는 맨 앞(최신 상단)
      persist(next);
      return new Set(next);
    });
  }, []);
  const move = useCallback((path, dir) => {
    setFavs(prev => {
      const arr = [...prev];
      const i = arr.indexOf(path);
      if (i < 0) return prev;
      const j = dir === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= arr.length) return prev; // 경계 no-op
      [arr[i], arr[j]] = [arr[j], arr[i]];
      persist(arr);
      return new Set(arr);
    });
  }, []);
  return { favs, toggle, move };
}

/* 최근 방문 */
/* [현 차수] 과거엔 방문 시점의 **번역된 라벨 문자열**을 localStorage 에 스냅샷 저장했다. 그 결과 일본어로
 *   방문한 항목은 이후 한국어/영어로 바꿔도 칩이 영원히 일본어로 남았다(브라우저 검증에서 "WMS在庫管理" 실측).
 *   즐겨찾기(QuickAccessPanel:322)는 이미 경로만 저장하고 allItems 에서 매번 재해석하는 올바른 패턴이므로 통일한다.
 *   경로만 저장 → 렌더 시 현재 언어로 재해석. 기존에 저장된 {to,label,icon} 항목도 to 만 취해 자동 치유된다. */
function useRecentVisits(allItems, maxItems = 5) {
  const location = useLocation();
  const [recentPaths, setRecentPaths] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('g_sidebar_recents') || '[]');
      return raw.map(r => (typeof r === 'string' ? r : r?.to)).filter(Boolean);
    } catch { return []; }
  });
  useEffect(() => {
    const matched = allItems.find(it => it.to === location.pathname);
    if (!matched) return;
    setRecentPaths(prev => {
      const next = [location.pathname, ...prev.filter(p => p !== location.pathname)].slice(0, maxItems);
      try { localStorage.setItem('g_sidebar_recents', JSON.stringify(next)); } catch { /* 스토리지 접근 실패(프라이빗 모드/쿼터) 무시 */ }
      return next;
    });
  }, [location.pathname]);
  // 라벨/아이콘은 저장하지 않고 현재 언어의 allItems 에서 해석(언어 전환 즉시 반영).
  return useMemo(
    () => recentPaths.map(p => allItems.find(it => it.to === p)).filter(Boolean),
    [recentPaths, allItems]
  );
}

// Upgrade 안내 모달 (유료 Plan 전용 메뉴 접근 시)
function Upgradal({ menuLabel, onClose, t }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "linear-gradient(135deg,#0f172a,#1e293b)",
          border: "1px solid rgba(99,102,241,0.4)",
          borderRadius: 20, padding: "32px 28px", maxWidth: 400, width: "90%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
        <div style={{ fontWeight: 900, fontSize: 18, color: "var(--text-1)", marginBottom: 8 }}>
          {menuLabel} — {t('g.upgradalTitle')}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7, marginBottom: 24 }}>
          {(t('g.upgradalDesc', '')).split('\n').map((line, i) => (
            <React.Fragment key={i}>{line}{i === 0 && <br/>}</React.Fragment>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={onClose}
            style={{
              padding: "9px 20px", borderRadius: 10, border: '1px solid var(--border)',
              background: "transparent", color: 'var(--text-3)', fontSize: 13, cursor: "pointer",
            }}
          >
            {t('g.upgradalClose')}
          </button>
          <button
            onClick={() => { onClose(); window.location.href = "/app-pricing"; }}
            style={{
              padding: "9px 22px", borderRadius: 10, border: "none",
              background: "linear-gradient(135deg,#4f8ef7,#6366f1)",
              color: 'var(--text-1)', fontWeight: 800, fontSize: 13, cursor: "pointer",
              boxShadow: "0 4px 16px rgba(79,142,247,0.4)",
            }}
          >
            {t('g.upgradalBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}

// MEMBER_MENU / ADMIN_MENU / ADMIN_ONLY_MENU_KEYS 는 ./sidebarManifest.js 에서 import
// (PlanPricing 의 "🔐 메뉴 접근 권한" 트리 뷰가 동일 manifest 를 SSOT 로 사용)


/* Section Component with Lock Support */
function NavSection({ section, t, isOpen, onToggle, hasMenuAccess, isDemo, onLockClick, navigate, isSubAdmin, subMenuAllowed, isMobile, favs, toggleFav, favLabels }) {
  // ★favLabels 는 useT() 로케일 사전에서 미리 뽑아 넘긴다.
  //   이 컴포넌트의 t 는 SIDEBAR_DICT(평면 키) 라서 `sidebar.addFav` 같은 네임스페이스 키를 못 찾는다.
  //   두 사전을 섞으면 라벨이 키 문자열 그대로 노출되므로 반드시 분리한다.
  const isFavPath = (p) => !!(favs && favs.has(p));
  const location = useLocation();
  const { isVisible: isMenuVisible, getVisibility } = useMenuVisibility();
  const hasActive = section.items.some(i => location.pathname === i.to);

  const sectionLabel = section.label ?? t(section.labelKey, section.labelKey.split('.')[1]);

  // 172차 PHASE 2-D 5계층: section 자체 visibility 우선 체크.
  // __section:<key> 가 hidden → 섹션 통째로 비노출.
  const sectionKey = `__section:${section.key}`;
  const sectionVis = getVisibility(sectionKey);
  if (sectionVis === 'hidden') return null;
  const sectionDisabled = sectionVis === 'disabled';

  // 169차 F2/F3 + 172차 leaf 확장:
  //   item 의 menuKey (중메뉴) OR __leaf:/path (하위) 둘 다 visible 이어야 노출.
  const itemMenuKey = (item) => item.menuKey || item.to.replace(/^\//, "");
  const itemLeafKey = (item) => `__leaf:${item.to}`;
  const itemIsVisible = (item) => {
    if (!isMenuVisible(itemMenuKey(item))) return false;
    return getVisibility(itemLeafKey(item)) !== 'hidden';
  };
  const itemIsDisabled = (item) => {
    const vis1 = getVisibility(itemMenuKey(item));
    const vis2 = getVisibility(itemLeafKey(item));
    return vis1 === 'disabled' || vis2 === 'disabled' || sectionDisabled;
  };

  // 접근 권한 체크 (plan/role):
  //  - 데모 User: ADMIN_ONLY_MENU_KEYS에 해당하는 것만 잠금, 나머지 전부 열람 가능
  //  - 유료 User: hasMenuAccess(서버 Save 권한) 기준으로 체크
  const itemHasAccess = (item) => {
    const key = itemMenuKey(item);
    // [현 차수] 하위 관리자(sub-admin): 최고관리자가 부여한 메뉴(경로)만 노출.
    if (isSubAdmin && subMenuAllowed && !subMenuAllowed(item.to)) return false;
    if (isDemo) {
      return !ADMIN_ONLY_MENU_KEYS.has(key);
    }
    if (!hasMenuAccess) return true;
    return hasMenuAccess(key);
  };

  // Single-item sections render without accordion
  if (section.items.length === 1) {
    const item = section.items[0];
    if (!itemIsVisible(item)) return null; // F2/F3: hidden item → 섹션 자체 비노출
    // [271차] labelKey 우선 — 매니페스트에 한글 label 이 박혀 있어도 번역이 이김(label 은 최후 폴백).
    //   기존 `item.label ?? t(...)` 는 한글 label 이 있으면 항상 한글 렌더(비한국어 누출). labelKey 부재시만 label.
    const label = item.labelKey ? t(item.labelKey, item.label ?? item.labelKey.split('.')[1]) : item.label;
    const accessible = itemHasAccess(item);
    if (!accessible) return null; // [현 차수] 비접근 메뉴 숨김 — 구독플랜에 주어진 메뉴만 노출(잠금표시 대신 숨김)
    const disabled = itemIsDisabled(item);
    if (disabled) {
      return (
        <div className="nav-item" style={{ opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' }} title="관리자가 비활성으로 설정한 메뉴입니다">
          <span className="nav-icon">{item.icon}</span>
          <span className="truncate" style={{ textDecoration: 'line-through' }}>{label}</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(220,38,38,0.15)', color: '#dc2626' }}>비활성</span>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <NavLink
          to={item.to}
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          style={{ flex: 1, minWidth: 0 }}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="truncate">{label}</span>
        </NavLink>
        <FavStar path={item.to} isFav={isFavPath(item.to)} onToggle={toggleFav}
          addLabel={favLabels?.add} removeLabel={favLabels?.remove} size={13} touch={isMobile} />
      </div>
    );
  }

  // [현 차수] 다항목 섹션: 접근 가능한 항목만 노출, 하나도 없으면 섹션 통째 숨김(구독플랜 메뉴만 보이도록)
  const _accessibleItems = section.items.filter(item => itemIsVisible(item) && itemHasAccess(item));
  if (_accessibleItems.length === 0) return null;

  // 모바일/데스크톱 적응형: 접근 가능한 하위메뉴 패널 id (aria-controls 연결용)
  const sectionPanelId = `nav-sec-${section.key}`;
  // 모바일 터치 높이(≥44px)에 맞춰 펼침 maxHeight 산정 — 고정 40px 클리핑 방지
  const _itemH = isMobile ? 48 : 40;

  return (
    <div style={{ marginBottom: 2 }}>
      <button
        className="nav-section-toggle"
        aria-expanded={isOpen}
        aria-controls={sectionPanelId}
        onClick={() => {
          // [현 차수] 데스크톱: 상위 메뉴 클릭 시 첫 번째 "접근 가능한" 하위 메뉴로 자동 이동(열 때만).
          //   닫혀 있던 섹션을 열면 그 섹션의 첫 하위 페이지가 즉시 표시됨(추가 클릭 불필요).
          // ★모바일: 펼침 전용 — 즉시 네비게이션하면 라우트 변경으로 drawer 가 닫혀
          //   하위 메뉴 탐색이 불가능해지므로, 모바일에서는 펼치기만 하고 사용자가 하위를 직접 선택하게 함.
          if (!isMobile && !isOpen && navigate && _accessibleItems[0]?.to) navigate(_accessibleItems[0].to);
          onToggle();
        }}
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%",
          padding: "7px 12px", border: "none", background: "none", cursor: "pointer",
          borderRadius: 8, color: hasActive ? "var(--text-1)" : "var(--text-2)",
          fontWeight: hasActive ? 700 : 600, fontSize: 12,
          transition: "background 150ms",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(99,140,255,0.07)"}
        onMouseLeave={e => e.currentTarget.style.background = "none"}
      >
        <span style={{ fontSize: 14, width: 20, textAlign: "center", flexShrink: 0 }}>{section.icon}</span>
        <span style={{ flex: 1, textAlign: "left", whiteSpace: "normal", overflowWrap: "break-word", wordBreak: "keep-all", lineHeight: 1.3 }}>{sectionLabel}</span>
        {hasActive && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4f8ef7", flexShrink: 0 }} />}
        <span aria-hidden="true" style={{
          fontSize: 10, color: "var(--text-3)", transition: "transform 200ms",
          transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0,
        }}>▶</span>
      </button>

      <div
        id={sectionPanelId}
        role="region"
        aria-label={sectionLabel}
        style={{
          overflow: "hidden",
          maxHeight: isOpen ? `${section.items.length * _itemH + 8}px` : "0px",
          transition: "max-height 220ms cubic-bezier(.4,0,.2,1)",
        }}>
        <div style={{ paddingLeft: 10 }}>
          {_accessibleItems.map(item => {
            // [271차] labelKey 우선 — 매니페스트에 한글 label 이 박혀 있어도 번역이 이김(label 은 최후 폴백).
    //   기존 `item.label ?? t(...)` 는 한글 label 이 있으면 항상 한글 렌더(비한국어 누출). labelKey 부재시만 label.
    const label = item.labelKey ? t(item.labelKey, item.label ?? item.labelKey.split('.')[1]) : item.label;
            const accessible = itemHasAccess(item);
            if (!accessible) {
              return (
                <div
                  key={item.to}
                  onClick={() => onLockClick && onLockClick(label)}
                  className="nav-item"
                  style={{
                    fontSize: 11, paddingLeft: 24, position: "relative",
                    cursor: "pointer", opacity: 0.5, display: "flex", alignItems: "center",
                  }}
                >
                  <span style={{
                    position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                    width: 6, height: 1, background: "rgba(99,140,255,0.25)",
                  }} />
                  <span className="nav-icon" style={{ fontSize: 12 }}>🔒</span>
                  <span className="truncate" style={{ color: "var(--text-3)" }}>{label}</span>
                  <span style={{
                    marginLeft: "auto", fontSize: 10, padding: "1px 5px", borderRadius: 4,
                    background: "rgba(99,102,241,0.15)", color: "#a5b4fc",
                    border: "1px solid rgba(99,102,241,0.25)", whiteSpace: "nowrap", flexShrink: 0,
                  }}>{t('g.upgradeLabel')}</span>
                </div>
              );
            }
            // 172차 PHASE 2-D — disabled 상태 시각 표시 (line-through + 회색)
            if (itemIsDisabled(item)) {
              return (
                <div
                  key={item.to}
                  className="nav-item"
                  style={{
                    fontSize: 11, paddingLeft: 24, position: 'relative',
                    opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none',
                    display: 'flex', alignItems: 'center',
                  }}
                  title="관리자가 비활성으로 설정한 메뉴"
                >
                  <span style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    width: 6, height: 1, background: 'rgba(99,140,255,0.25)',
                  }} />
                  <span className="nav-icon" style={{ fontSize: 12 }}>{item.icon}</span>
                  <span className="truncate" style={{ textDecoration: 'line-through' }}>{label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(220,38,38,0.15)', color: '#dc2626' }}>비활성</span>
                </div>
              );
            }
            return (
              <div key={item.to} style={{ display: 'flex', alignItems: 'center' }}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                  style={{ fontSize: 11, paddingLeft: 24, position: "relative", flex: 1, minWidth: 0 }}
                >
                  <span style={{
                    position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                    width: 6, height: 1, background: "rgba(99,140,255,0.25)",
                  }} />
                  <span className="nav-icon" style={{ fontSize: 12 }}>{item.icon}</span>
                  <span className="truncate">{label}</span>
                </NavLink>
                <FavStar path={item.to} isFav={isFavPath(item.to)} onToggle={toggleFav}
                  addLabel={favLabels?.add} removeLabel={favLabels?.remove} touch={isMobile} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* 즐겨찾기/최근방문 패널 (아코디언) */
function QuickAccessPanel({ favs, recents, allItems, navigate, toggleFav, moveFav, t, isExpanded, onToggle, isMobile }) {
  const [tab, setTab] = useState('recents');
  const hasFavs = favs && favs.size > 0;
  const hasRecents = recents && recents.length > 0;
  if (!hasFavs && !hasRecents) return null;

  const activeTab = tab === 'favs' && !hasFavs ? 'recents' : tab === 'recents' && !hasRecents ? 'favs' : tab;
  // ★[ST07-06] 즐겨찾기는 이제 **사용자 지정 순서**(useFavorites 가 Set 삽입순서로 보존)를 그대로 표시한다.
  //   이전의 `.reverse()` 를 제거 — 재정렬(move)과 짝을 이뤄야 하기 때문. toggle 이 추가를 맨 앞에 prepend 하므로
  //   "최신 추가분이 상단"이라는 기존 시각 동작은 유지된다(무후퇴).
  //   BACKLOG-1(6개↑ 열람): slice(0,5) 제거 + 아래 스크롤 컨테이너로 해소됨(유지).
  //   recents 는 useRecentVisits(_, 5) 가 원천에서 5개로 제한하므로 재정렬 대상 아님.
  const favOrder = [...favs]; // Set 삽입 순서 = 사용자 순서
  const items = activeTab === 'favs'
    ? favOrder.map(path => allItems.find(it => it.to === path) || { to: path, label: path, icon: '📄' })
    : recents;
  const itemCount = activeTab === 'favs' ? favs.size : recents.length;

  return (
    // ★[현 차수] flexShrink:0 — 패널이 테두리(2px)만 남고 찌그러지던 결함 수정.
    //   .sidebar 는 display:flex/column 이고 이 패널은 flex 아이템이다. 그런데 `overflow:hidden` 때문에
    //   CSS 사양상 automatic minimum size 가 0 이 되어(min-height:auto → 0), 사이드바 세로 내용이
    //   넘칠 때마다 flex-shrink 가 이 패널을 0 까지 눌러버렸다(실측: 높이 2px = 위아래 테두리만).
    //   즉 즐겨찾기/최근방문 패널이 데스크톱에서 **보이지 않았다**.
    //   ★내 변경 이전에도 동일했음을 실측 대조로 확인했다(구 slice(0,5) 재현 시에도 2px).
    //   67dee1fe46a 가 고친 "도달 불가" 와 같은 계열의 결함이라 함께 바로잡는다.
    <div style={{ flexShrink: 0, margin: '4px 8px 0', borderRadius: 10, background: 'rgba(79,142,247,0.04)', border: '1px solid rgba(79,142,247,0.1)', overflow: 'hidden' }}>
      {/* 아코디언 헤더 */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 10px', cursor: 'pointer', userSelect: 'none',
          background: isExpanded ? 'rgba(79,142,247,0.08)' : 'transparent',
          transition: 'background 200ms',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,142,247,0.1)'}
        onMouseLeave={e => e.currentTarget.style.background = isExpanded ? 'rgba(79,142,247,0.08)' : 'transparent'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, opacity: 0.7 }}>⏱️</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)' }}>{t('root_quickRecents', t('g.quickRecents', 'Recent'))}</span>
          {itemCount > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 8,
              background: 'rgba(79,142,247,0.15)', color: '#4f8ef7',
            }}>{itemCount}</span>
          )}
        </div>
        <span style={{
          fontSize: 10, color: 'var(--text-3)', transition: 'transform 250ms ease',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block',
        }}>▶</span>
      </div>

      {/* 아코디언 본문 (열기/접기) */}
      <div style={{
        maxHeight: isExpanded ? '300px' : '0px',
        overflow: 'hidden',
        transition: 'max-height 300ms cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* 탭 전환 */}
        {hasFavs && hasRecents && (
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            <button onClick={(e) => { e.stopPropagation(); setTab('favs'); }} style={{ flex: 1, padding: '5px 0', fontSize: 10, fontWeight: 700, border: 'none', cursor: 'pointer', background: activeTab === 'favs' ? 'rgba(79,142,247,0.12)' : 'transparent', color: activeTab === 'favs' ? '#4f8ef7' : 'var(--text-3)', transition: 'all 150ms' }}>⭐{t('g.quickFavs', 'Favorites')} {favs.size}</button>
            <button onClick={(e) => { e.stopPropagation(); setTab('recents'); }} style={{ flex: 1, padding: '5px 0', fontSize: 10, fontWeight: 700, border: 'none', cursor: 'pointer', background: activeTab === 'recents' ? 'rgba(34,197,94,0.1)' : 'transparent', color: activeTab === 'recents' ? '#22c55e' : 'var(--text-3)', transition: 'all 150ms' }}>🕐 {t('g.quickRecents', 'Recent')}</button>
          </div>
        )}

        {/* 아이템 리스트 — ★스크롤 영역(BACKLOG-1). maxHeight 240 은 바깥 아코디언 300px 안에서
            탭바(약 23px)+상하 padding(8px) 을 빼고도 남는 값이라 클리핑이 발생하지 않는다. */}
        <div style={{
          padding: '4px 0', maxHeight: 240, overflowY: 'auto', overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}>
          {items.map((item, i) => (
            <div key={item.to || i} style={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: isMobile ? 44 : undefined }}>
              <button onClick={() => navigate(item.to)} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, padding: '5px 10px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background 120ms', minWidth: 0, minHeight: isMobile ? 44 : undefined }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ fontSize: 12, flexShrink: 0 }}>{item.icon || '📄'}</span>
                <span style={{ fontSize: 10, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label ? t(item.label) : item.to}</span>
              </button>
              {/* ★[ST07-06] 순서 변경 — DnD 라이브러리 부재로 키보드 접근 가능한 ▲▼ 버튼(§13·§14 대체 방식).
                  버튼이라 Tab+Enter 로 조작 가능하고, 경계(첫/끝)에서는 disabled 로 no-op. */}
              {activeTab === 'favs' && moveFav && itemCount > 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                  {[{ dir: 'up', glyph: '▲', dis: i === 0, lbl: t('sidebar.moveFavUp', 'Move up') },
                    { dir: 'down', glyph: '▼', dis: i === items.length - 1, lbl: t('sidebar.moveFavDown', 'Move down') }].map(b => (
                    <button
                      key={b.dir}
                      type="button"
                      disabled={b.dis}
                      onClick={() => moveFav(item.to, b.dir)}
                      aria-label={`${b.lbl} — ${item.label ? t(item.label) : item.to}`}
                      title={b.lbl}
                      style={{
                        border: 'none', background: 'transparent', color: 'var(--text-3)',
                        fontSize: 7, lineHeight: 1, cursor: b.dis ? 'default' : 'pointer',
                        opacity: b.dis ? 0.25 : 0.6, padding: 0,
                        // 모바일: 두 버튼 세로 합산이 44px 이상 되도록 각 22px + 히트 확보
                        ...(isMobile ? { minWidth: 44, minHeight: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } : { minWidth: 16, height: 11 }),
                      }}
                    >{b.glyph}</button>
                  ))}
                </div>
              )}
              {activeTab === 'favs' && toggleFav && (
                <button
                  type="button"
                  onClick={() => toggleFav(item.to)}
                  aria-label={`${t('sidebar.removeFav', 'Remove favorite')} — ${item.label ? t(item.label) : item.to}`}
                  title={t('sidebar.removeFav', 'Remove favorite')}
                  style={{
                    border: 'none', background: 'transparent', cursor: 'pointer', color: '#eab308',
                    fontSize: 10, flexShrink: 0, lineHeight: 1,
                    // ★[현 차수] BACKLOG-2 — 해제(✕) 버튼도 모바일에서 44x44 확보(글리프 크기는 불변)
                    ...(isMobile
                      ? { minWidth: 44, minHeight: 44, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }
                      : { padding: '4px 6px' }),
                  }}
                >✕</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Main Sidebar */
export default function Sidebar() {
  const t = useT();
  const { lang } = useI18n();
  /* gNav embedded translator: checks sidebarI18n first, then falls back to t() */
  const navT = useCallback((key, fallback) => {
    if (key && key.startsWith('gNav.')) {
      const k = key.slice(5);
      const loc = SIDEBAR_DICT[lang] || SIDEBAR_DICT.en || {};
      if (loc[k]) return loc[k];
    }
    return t(key, fallback);
  }, [t, lang]);
  const {user, logout, isDemo, isPro, isAdmin, hasMenuAccess, isSubAdmin, subMenuAllowed} = useAuth();
  const [lockModal, setLockModal] = useState(null); // locked menu label
  const { open: mobileOpen, close: mobileClose } = useMobileSidebar();
  const navigate = useNavigate();
  const { unreadAlertCount, activeCampaignCount } = useGlobalData();
  const { favs, toggle: toggleFav, move: moveFav } = useFavorites();
  // 별표 라벨은 로케일 사전(useT)에서 뽑는다 — NavSection 의 t 는 SIDEBAR_DICT(평면 키)라 못 찾는다.
  const favLabels = React.useMemo(() => ({
    add: t('sidebar.addFav', 'Add to favorites'),
    remove: t('sidebar.removeFav', 'Remove favorite'),
  }), [t]);

  // 모든 메뉴 아이템 flat 목록 (최근방문용) — labelKey는 navT로 변환 (gNav.* 포함)
  const allMenuItems = React.useMemo(() => {
    const menu = isAdmin ? [...MEMBER_MENU, ...ADMIN_MENU] : MEMBER_MENU;
    return menu.flatMap(s => s.items.map(item => ({
      to: item.to,
      label: item.label ?? (item.labelKey ? navT(item.labelKey, item.labelKey.split('.').pop()) : item.to),
      icon: item.icon,
    })));
  }, [isAdmin, navT]);
  const recents = useRecentVisits(allMenuItems, 5);

  const location = useLocation();
  
  // Accordion Sidebar Core Logic
  const initialActiveSection = React.useMemo(() => {
    const allSecs = isAdmin ? [...MEMBER_MENU, ...ADMIN_MENU] : MEMBER_MENU;
    for (const sec of allSecs) {
      if (sec.items.some(it => it.to === location.pathname)) return sec.key;
    }
    return null;
  }, [location.pathname, isAdmin]);

  const [openSectionId, setOpenSectionId] = useState(initialActiveSection);
  const [quickExpanded, setQuickExpanded] = useState(false); // 기본 접힘 → 클릭 시에만 펼침

  // 모바일(≤768px) 감지 — 모바일에서만 대메뉴 클릭=펼침전용/터치높이 적용
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 768px)');
    const fn = () => setIsMobile(mq.matches);
    fn();
    if (mq.addEventListener) mq.addEventListener('change', fn);
    else mq.addListener(fn); // Safari 구버전 폴백
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', fn);
      else mq.removeListener(fn);
    };
  }, []);

  useEffect(() => {
    if (initialActiveSection) setOpenSectionId(initialActiveSection);
  }, [initialActiveSection]);

  // 라우트 변경 시 최근 방문 패널 자동 접기 + 모바일 사이드바 Close
  useEffect(() => {
    setQuickExpanded(false);
    mobileClose();
  }, [location.pathname]);

  // 모바일 drawer 열림 상태: ESC 키 + Android(Capacitor) 하드웨어 백버튼 → 닫기
  //   (바깥 영역 클릭 닫기는 오버레이가 처리, 라우트 변경 닫기는 위 effect가 처리)
  //   ★백버튼은 capacitorInit.js 의 중앙 핸들러가 window.__geniegoCloseDrawer 를 먼저 확인해
  //     drawer 만 닫고 네비/종료를 차단한다(이중 backButton 리스너 발화 방지). 여기서는 그 닫기
  //     함수만 등록/해제한다.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') mobileClose(); };
    window.addEventListener('keydown', onKey);
    try { window.__geniegoCloseDrawer = mobileClose; } catch { /* 실패 무시(best-effort) */ }

    return () => {
      window.removeEventListener('keydown', onKey);
      try { if (window.__geniegoCloseDrawer === mobileClose) window.__geniegoCloseDrawer = null; } catch { /* 실패 무시(best-effort) */ }
    };
  }, [mobileOpen, mobileClose]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {/* 모바일 사이드바 배경 오버레이 */}
      {mobileOpen && (
        <div
          onClick={mobileClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 299,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(2px)',
            display: 'none', // CSS 미디어쿼리에서 Active
          }}
          className="sidebar-overlay"
        />
      )}
    <div className={`sidebar${mobileOpen ? ' sidebar-open' : ''}`}>
      {/* Upgrade 모달 */}
      {lockModal && (
        <Upgradal
          menuLabel={lockModal}
          onClose={() => setLockModal(null)}
          t={t}
        />
      )}

      {/* Logo */}
      <div className="sidebar-logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
        <div style={{
          width: 54, height: 54, borderRadius: 13, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(232,229,244,0.95), rgba(221,217,238,0.9))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 16px rgba(79,142,247,0.25), 0 0 0 1px rgba(79,142,247,0.08)',
          overflow: 'hidden',
        }}>
          <img
            src="/logo_v5.png"
            alt="Geniego-ROI"
            style={{ width: 54, height: 54, objectFit: 'contain', imageRendering: '-webkit-optimize-contrast' }}
          />
        </div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-name">Geniego-ROI</div>
          <div className="sidebar-logo-version">{IS_DEMO_MODE ? "Demo System" : "Production v423"}</div>
        </div>
      </div>

      {/* 실시간 현황 배지 */}
      {(unreadAlertCount > 0 || activeCampaignCount > 0) && (
        <div style={{
          margin: "4px 8px", padding: "6px 10px", borderRadius: 8,
          background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.12)",
          display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
        }}>
          {activeCampaignCount > 0 && (
            <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 700 }}>
              {(t('g.sidebarCampaignActive', '🚀 {n} campaigns')).replace(/\{\{n\}\}|\{n\}/g, activeCampaignCount)}
            </span>
          )}
          {unreadAlertCount > 0 && (
            <span
              onClick={() => navigate("/alert-policies")}
              style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700, cursor: "pointer" }}
            >
              {(t('g.sidebarAlertCount', '🔔 {n} alerts')).replace(/\{\{n\}\}|\{n\}/g, unreadAlertCount)}
            </span>
          )}
        </div>
      )}

      {/* 즐겨찾기 + 최근방문 패널 (아코디언) */}
      <QuickAccessPanel
        favs={favs} recents={recents} allItems={allMenuItems}
        navigate={navigate} toggleFav={toggleFav} moveFav={moveFav} t={t}
        isExpanded={quickExpanded}
        onToggle={() => setQuickExpanded(prev => !prev)}
        isMobile={isMobile}
      />

      {/* 데모/운영 환경 구분 배너 */}
      <div style={{
        margin: '4px 8px', padding: '8px 10px', borderRadius: 10,
        background: IS_DEMO_MODE
          ? 'linear-gradient(135deg, rgba(251,146,60,0.15), rgba(245,158,11,0.1))'
          : 'linear-gradient(135deg, rgba(79,142,247,0.08), rgba(99,102,241,0.05))',
        border: `1px solid ${IS_DEMO_MODE ? 'rgba(251,146,60,0.35)' : 'rgba(79,142,247,0.2)'}`,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: IS_DEMO_MODE ? '#fb923c' : '#4f8ef7', marginBottom: 2 }}>
          {IS_DEMO_MODE ? t('sidebar.demoMode', '🧪 Demo Mode') : t('sidebar.prodMode', '🏢 Production System')}
        </div>
        <div style={{ fontSize: 10, color: IS_DEMO_MODE ? 'rgba(251,146,60,0.7)' : 'rgba(79,142,247,0.6)', lineHeight: 1.4 }}>
          {IS_DEMO_MODE ? t('sidebar.demoDesc', 'Explore all features with virtual data') : t('sidebar.prodDesc', 'Production Environment')}
        </div>
      </div>

      {/* Accordion Nav */}
      <div style={{ display: "grid", gap: 2, padding: "4px 0" }}>
        {/* 플랫폼 Admin: 일반 메뉴 + Admin 전용 메뉴 All 표시 */}
        {/* 일반 회원(Free/유료): 일반 메뉴(MEMBER_MENU)만 표시 */}
        {(isAdmin ? [...MEMBER_MENU, ...ADMIN_MENU] : MEMBER_MENU).map((section, i) => (
          <NavSection
            key={section.key}
            section={section}
            t={navT}
            isOpen={openSectionId === section.key}
            onToggle={() => {
              setOpenSectionId(prev => prev === section.key ? null : section.key);
              setQuickExpanded(false); // 메뉴 섹션 클릭 시 최근 방문 자동 접기
            }}
            hasMenuAccess={isAdmin ? null : hasMenuAccess}
            isDemo={isDemo}
            onLockClick={(label) => setLockModal(label)}
            navigate={navigate}
            isSubAdmin={isSubAdmin}
            subMenuAllowed={subMenuAllowed}
            isMobile={isMobile}
            favs={favs}
            toggleFav={toggleFav}
            favLabels={favLabels}
          />
        ))}
      </div>


      {/* User 패널 */}
      {user && (
        <div style={{
          margin: "8px 8px 0", padding: "10px 12px", borderRadius: 10,
          background: IS_DEMO_MODE ? "rgba(251,146,60,0.04)" : "rgba(99,140,255,0.04)",
          border: `1px solid ${IS_DEMO_MODE ? 'rgba(251,146,60,0.15)' : 'rgba(99,140,255,0.1)'}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: IS_DEMO_MODE
                ? "linear-gradient(135deg,#fb923c,#f59e0b)"
                : (isPro ? "linear-gradient(135deg,#4f8ef7,#6366f1)" : "linear-gradient(135deg,#eab308,#f59e0b)"),
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: 'var(--text-1)',
            }}>{user.name?.[0] || "U"}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
              <div style={{ fontSize: 10, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
            </div>
          </div>
          {/* 회원 유형 배지 */}
          <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 8, flexWrap: 'wrap' }}>
            {IS_DEMO_MODE ? (
              <>
                <span style={{
                  padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                  background: 'linear-gradient(135deg, rgba(251,146,60,0.2), rgba(245,158,11,0.15))',
                  color: '#fb923c',
                  border: '1px solid rgba(251,146,60,0.4)',
                  animation: 'demoPulse 2s ease-in-out infinite',
                }}>{t('sidebar.demoBadge', '🧪 Demo Member')}</span>
                <span style={{
                  fontSize: 10, color: 'rgba(251,146,60,0.6)', fontWeight: 600,
                }}>{t('sidebar.demoSysDesc', 'Demo System')}</span>
              </>
            ) : (
              <>
                <span style={{
                  padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700,
                  background: isPro ? "rgba(79,142,247,0.12)" : "rgba(234,179,8,0.12)",
                  color: isPro ? "#4f8ef7" : "#eab308",
                  border: `1px solid ${isPro ? "rgba(79,142,247,0.25)" : "rgba(234,179,8,0.25)"}`,
                }}>{isPro ? t('sidebar.proBadge', '🚀 PRO') : t('sidebar.freeBadge', '⭐ Free')}</span>
                <span style={{
                  fontSize: 10, color: 'rgba(79,142,247,0.6)', fontWeight: 600,
                }}>{t('sidebar.prodMember', 'Production Member')}</span>
              </>
            )}
          </div>
          {/* 데모 회원: 운영시스템 전환 안내 */}
          {IS_DEMO_MODE && (
            <a href="https://www.genieroi.com/login" style={{
              display: 'block', width: '100%', padding: '6px 0', borderRadius: 7,
              background: 'linear-gradient(135deg, rgba(79,142,247,0.12), rgba(99,102,241,0.08))',
              border: '1px solid rgba(79,142,247,0.25)',
              color: '#4f8ef7', fontSize: 10, fontWeight: 700,
              textAlign: 'center', textDecoration: 'none',
              marginBottom: 6, transition: 'all 200ms',
            }}>
              {t('sidebar.loginProd', '🏢 Production Login / Sign Up')}
            </a>
          )}
          {/* [현 차수] 운영 회원: 데모 체험 진입(새 탭) — 운영 세션 유지한 채 데모를 자유롭게 체험.
              ★격리: target=_blank + rel=noopener 로 데모 탭이 운영 window 에 접근 불가. 데모는 별도
              origin(roidemo)·별도 DB(geniego_roi_demo)·상대 API 라 목데이터가 운영에 유입될 경로 없음. */}
          {!IS_DEMO_MODE && (
            <a href="https://demo.genieroi.com/" target="_blank" rel="noopener noreferrer" style={{
              display: 'block', width: '100%', padding: '6px 0', borderRadius: 7,
              background: 'linear-gradient(135deg, rgba(251,146,60,0.12), rgba(245,158,11,0.08))',
              border: '1px solid rgba(251,146,60,0.3)',
              color: '#fb923c', fontSize: 10, fontWeight: 700,
              textAlign: 'center', textDecoration: 'none',
              marginBottom: 6, transition: 'all 200ms',
            }}>
              {t('sidebar.tryDemo', '🧪 데모 체험 (새 탭 · 운영 데이터 영향 없음)')}
            </a>
          )}
          <button onClick={handleLogout} style={{
            width: "100%", padding: "5px 0", borderRadius: 7, border: "1px solid rgba(99,140,255,0.15)",
            background: "transparent", color: "var(--text-3)", fontSize: 10, cursor: "pointer",
            fontWeight: 600, transition: "all 150ms",
          }}>{t('sidebar.logout', t('root_sidebarLogout', t('g.sidebarLogout', 'Logout')))}</button>
        </div>
      )}

      <div className="sidebar-footer">
        {t('sidebar.footerLine1', 'Revenue + Risk + Governance')}<br />{t('sidebar.footerLine2', 'Settlement OS · v423.0.0')}
      </div>
    </div>
    </>
  );
}
