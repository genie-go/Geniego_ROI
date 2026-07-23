/**
 * [CWIS Part004-03] Sidebar 점진 전환 게이트 — ★무후퇴의 마지막 방어선.
 *
 * 동작:
 *   서버 `GET /v425/pm/sidebar` 의 `enabled === true` 일 때만 신규 UnifiedSidebar 를 렌더한다.
 *   그 외 **모든 경우**(기본값 · 로딩 중 · 401/403 · 503 스냅샷 부재 · 네트워크 오류 · JS 예외)
 *   → 레거시 `Sidebar` 를 그대로 렌더한다.
 *
 * 즉 다음이 보장된다.
 *   1. 아무 설정도 하지 않으면 화면은 **한 픽셀도 바뀌지 않는다**(기본 OFF).
 *   2. 켠 뒤 문제가 생기면 capability 토글 1회로 **즉시 롤백**된다(배포 불필요).
 *   3. 신규 사이드바 내부에서 렌더 예외가 나도 ErrorBoundary 가 레거시로 되돌린다.
 *
 * 전환 스위치는 기존 `tenant_collaboration_capabilities`(`collaboration.navigation.sidebar`)를
 * 재사용한다 — 신규 Feature Flag 저장소를 만들지 않는다(Part004-02 §19 권장).
 */
import React from 'react';
import LegacySidebar from '../../layout/Sidebar.jsx';
import UnifiedSidebar from './UnifiedSidebar.jsx';
import { useCollaborationContext } from '../../context/CollaborationContextProvider.jsx';

/** 신규 사이드바 렌더 실패 시 레거시로 되돌리는 경계. */
class UnifiedSidebarBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    // 사용자에게는 레거시가 즉시 보이고, 원인은 콘솔로만 남긴다(화면 공백 금지).
    try { console.error('[UnifiedSidebar] 렌더 실패 — 레거시 사이드바로 폴백', error); } catch { /* noop */ }
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

export default function SidebarSwitch(props) {
  const { enabled, available } = useCollaborationContext();

  // ★기본 경로: 레거시. enabled 가 명시적으로 true 일 때만 신규.
  if (enabled !== true || available !== true) return <LegacySidebar {...props} />;

  return (
    <UnifiedSidebarBoundary fallback={<LegacySidebar {...props} />}>
      <UnifiedSidebar {...props} />
    </UnifiedSidebarBoundary>
  );
}
