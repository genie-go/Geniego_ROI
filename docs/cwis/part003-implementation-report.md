# CWIS Part003 — Implementation Report

> 작성 2026-07-23 · 판정: **COMPLETED_WITH_LIMITATIONS**
> ★교차검증: 명세(Laravel/Spatie/Voter/Redis 전면 authz 엔진)를 스택·기존 authz와 대조 → 기존 RBAC 재사용 +
>   진짜 결여(외부 스코프 접근)만 구현. 상세=part003-access-control-analysis.md.

## 1. 기존 인가 구조 분석·재사용 (신규 권한엔진 신설 안 함)

- **RBAC 다층 존재**: api_key 역할(viewer<connector<analyst<admin+scopes)·**TeamPermissions acl_permission**(테넌트 RBAC 정본)·PM Shared 역할게이트·featurePlan → REUSE(무후퇴).
- **감사**: SecurityAudit(해시체인)·pm_audit_log REUSE.
- **테넌트 격리**: 전역 REUSE.

## 2. 본 차수 구현 — 외부 스코프 접근(옵션2 핵심·비중복·초엔터프라이즈)

- **`collaboration_access_grants`** 테이블: principal(USER/GUEST/PARTNER)×scope(PROJECT/…)×permissions×effect(ALLOW/DENY)×
  **만료(valid_until)**×granted_by×감사. Default Deny.
- **초대 확장**: membership_type=guest/partner → 특정 프로젝트 스코프 필수·만료 필수(기본 14일). 수락 시 **full 멤버 아님** —
  team_role='guest' 프로비저닝 + 스코프 그랜트(read/comment 최소권한).
- **`evaluateAccess`**(RBAC+ReBAC 통합·Default Deny): 내부멤버=ALLOW / 외부=유효(미만료·미철회) 스코프 그랜트가 action
  커버 시만 ALLOW / 그 외 Default Deny. PermissionDecision(allowed/decision/reason/expires) 반환.
- **★보안 구멍 차단(PM Shared::gate)**: team_role=guest/partner 는 PM 리소스 **전면 Default Deny(403)** — 외부가 초대만으로
  전권을 얻던 위험을 원천봉쇄(per-endpoint 스코프 enforcement 배선 전까지 안전측). 내부 멤버 무영향(무회귀).
- **API**: `POST access/check`(권한확인/시뮬레이션·§24)·`GET access/grants`·`POST access/grants/{id}/revoke`.
- **프론트**: 초대 폼에 게스트/파트너+프로젝트 스코프 · 외부 접근 그랜트 목록/철회.
- 레지스트리: `collaboration.external`→ENABLED · `collaboration.access`=ENABLED.

## 3. 신규/변경

- 신규: `collaboration_access_grants` · evaluateAccess/check/grants 메서드 · UserAuth guest 프로비저닝 허용(1줄).
- 변경: PM `Shared::gate` 외부 Default Deny(additive·무회귀) · Collaboration 초대 외부 분기 · routes 3종 · CollaborationHome 프론트.

## 4. 정직 보류(제품범위·중복 방지) — 차단 사유

전면 ABAC JSON 정책엔진·ReBAC 관계테이블·Redis 권한캐시·JIT·Delegation·SoD·Access Review·AI Agent/Service Account 권한
= 소규모팀 SaaS 미사용 투기 + TeamPermissions 중복 → PLANNED. **per-endpoint 외부 스코프 enforcement**(게스트가 grant 있는
프로젝트만 열람)는 evaluateAccess(SSOT) 배선을 각 PM 엔드포인트에 확산하는 후속(현재는 gate Default Deny 로 안전).

## 5. 검증

- php -l: Collaboration/Shared/UserAuth/routes 통과. 회귀0(내부 경로 무변경·gate 외부차단만 additive).
- 스모크(배포 후): access/check 401(무세션)·grants 401 등 500 없음.

## 6. 롤백

- routes 3종 제거 + Collaboration 접근메서드/외부분기 제거 + Shared::gate 외부차단 블록 제거 → 무해(신규 경로·additive만).

## 7. Part004 진행 가능 여부

**가능**(통합 네비게이션/정보구조). 단 협업 홈/메뉴는 이미 Part001 구축분 확장이 정답 — 동일 교차검증→적응.
