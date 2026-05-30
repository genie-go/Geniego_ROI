/**
 * useTeamRole.js — 페이지에서 team_role 기반 쓰기 게이팅을 쓰기 위한 편의 훅 · 183차 Phase3
 *
 * 사용 예:
 *   const { isReadOnly, canWrite, isOwner } = useTeamRole();
 *   <button disabled={!canWrite()} ...>저장</button>
 *   <button disabled={!canWrite('billing')} ...>구독 변경</button>  // 소유자 전용 동작
 */
import { useAuth } from "./AuthContext.jsx";

export function useTeamRole() {
  const { teamRole, isReadOnlyMember, canTeamWrite, isAdmin } = useAuth();
  return {
    teamRole,                       // 'owner' | 'manager' | 'member'
    isOwner: teamRole === "owner",
    isManager: teamRole === "manager",
    isMember: teamRole === "member",
    isReadOnly: !!isReadOnlyMember,  // member 이면서 admin/데모가 아님
    isAdmin: !!isAdmin,
    /** canWrite(action?) — 쓰기 가능 여부(admin/데모 우회 포함) */
    canWrite: canTeamWrite,
  };
}

export default useTeamRole;
