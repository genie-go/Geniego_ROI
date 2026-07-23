# CWIS Part002 — Implementation Report

> 작성 2026-07-23 · 판정: **COMPLETED_WITH_LIMITATIONS**
> ★교차검증: 명세(Laravel/DDD 8테이블 신설)를 맹목 이행하지 않고, 기존구조 매핑 후 재사용·비중복 원칙으로 적응.

## 1. 기존 조직·회원 구조 분석 (증거)

- **조직=tenant**: 별도 org 테이블 없음. `tenant_business_profile`(company_name/industry/country, DataPlatform.php:72)가 tenant를 회사로 정의.
- **회원=app_user**: tenant_id·parent_user_id·team_role(owner)·team_name·plan(UserAuth.php:186-189). 팀 멤버십이 app_user에 내장.
- **팀=team_name(문자열)+acl_permission**: 1급 Team 엔티티 없음. 권한=`acl_permission`(TeamPermissions.php:169, subject×menu×actions).
- **워크스페이스=WorkspaceState**(tenant KV) + TeamWorkspace.jsx(데모 shell).
- **초대/부서/스쿼드/커뮤니티=부재**(agency_client_link·live_guests는 도메인특화).

## 2. 재사용한 테이블·코드 (신규 테이블 0)

| Part002 | 재사용 |
|---|---|
| Organization | tenant + tenant_business_profile |
| Member/Membership | app_user(parent_user_id/team_role/team_name) |
| Team | app_user.team_name + acl_permission(TeamPermissions) |
| Permissions | acl_permission (Part003에서 확장) |
| External | AgencyPortal(agency_client_link)/PartnerPortal |
| 인증/테넌트/감사 | PM\Shared(세션·tenant격리·pm_audit_log) — Part001 승계 |

## 3. 본 차수 구현물

- **Capability Registry 확장**(`PM\Collaboration::CATALOG`): Part002 도메인 6종 정직 등록 —
  `collaboration.organization`=ENABLED(tenant), `external`=PARTIAL, `invitation`=PLANNED(후속 1순위),
  `department`/`squad`/`community`=PLANNED(제품범위 검토). 협업 홈/readiness에 즉시 반영.
- **매핑 문서**: `docs/cwis/part002-gap-analysis.md`(기존구조↔Part002 매핑·제품범위 교차검증).

## 4. 새로 만든 테이블·코드

- **없음**(§4 users/tenants/team 복제금지 준수). 신규 테이블은 후속(초대)에서만.

## 5. 기존 프로젝트 Membership ↔ 협업 Membership 연결

- PM 멤버(pm_task_assignees) 및 팀 멤버(app_user)는 동일 tenant 스코프. 통합 멤버십 read-model은 초대 시스템과 함께 후속.

## 6. Guest/External 보안 정책

- 현: AgencyPortal(agency_client_link status/scope_json·revoke) — 파트너 접근 제어 존재. 통합 게스트/파트너 초대(만료·최소권한·감사강화)는 후속 초대 시스템에서.

## 7. 보류(제품범위·투기 방지) — 차단 사유 명시

- **department/squad/community/다단계 조직/전사 조직도**: GeniegoROI(소규모 팀 ROI SaaS)의 실사용과 괴리. 즉시 신설=미사용/투기 기능. **수요 확인 후 착수**로 정직 보류(PLANNED).
- 명세의 8테이블 전면 신설은 기존 tenant/app_user/acl_permission과 **중복**이라 미이행(§4 준수).

## 8. 후속 1순위 = 초대 시스템 (권장 다음 착수)

`collaboration_invitations`(token_hash·만료·수락/철회·scope) + 기존 email/NotifyEngine/user_notification 재사용.
팀원/게스트/파트너 통합 초대. 현재 owner 직접생성(createTeamMember)만 있어 self-accept 초대가 진짜 결여.

## 9. 검증

- php -l: Collaboration.php 통과. 회귀0(레지스트리 CATALOG 확장만·기존 미변경).
- readiness: Part002 capability 반영해 자동 재계산.

## 10. 롤백

- CATALOG의 Part002 6엔트리 제거 → 완전 무해(레지스트리 데이터만·재시드 시 사라짐).

## 11. Part003 진행 가능 여부

**가능**. Part003(RBAC/ABAC/ReBAC 권한 엔진)은 **기존 `acl_permission`/TeamPermissions 확장**이 정답 — 신규 권한엔진 신설 시 중복. 동일하게 교차검증→적응 필요.
