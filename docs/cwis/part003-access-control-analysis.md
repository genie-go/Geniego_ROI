# CWIS Part003 — Access Control Analysis & Cross-Verification

> 작성 2026-07-23 · ★교차검증 원칙 적용. Laravel/Spatie/Voter/Redis 전제 명세를 실제 스택·기존 authz와 대조.

## 0. 스택 (Part001~002 동일)
Slim4·PDO·routes.php·Handlers·ensureTables·**Redis 없음**·**테스트러너 없음**·Enum 0개. artisan/Spatie/Voter 부재.

## 1. 기존 인가(authz) 구조 실측 — RBAC는 이미 다층 존재

| 명세 요구 | 기존 실체 | 판정 |
|---|---|---|
| RBAC(역할×권한) | ① api_key 역할 `viewer<connector<analyst<admin`+scopes(write:*/admin:keys, index.php 미들웨어) ② **TeamPermissions `acl_permission`**(subject×menu_key×actions·테넌트 RBAC 정본) ③ PM `Shared::gate` 역할게이트 ④ `featurePlan`/`requirePlan`(플랜 게이팅) | **EXISTS_COMPLETE(분산)** — REUSE |
| 쓰기 전역강제 | `writeGuard`(289차 서버전역) | EXISTS — REUSE |
| 감사 | `SecurityAudit`(해시체인)·`pm_audit_log`·`menu_audit_log` | EXISTS — REUSE |
| 테넌트 격리 | 전역(tenant_id 3,294회)·PM gate | EXISTS_COMPLETE — REUSE |
| Authority/Delegation/Authorization Registry | 289차 EPIC06-A 설계(대부분 BLOCKED_PREREQUISITE·코드 얇음) | EXISTS_PARTIAL |
| ABAC(속성 정책 JSON) | 부재 | MISSING |
| ReBAC(관계 기반) | 부재(암묵적 소유만) | MISSING |
| 외부(게스트/파트너) 스코프 접근 | **부재**(AgencyPortal/PartnerPortal 도메인특화만) | **MISSING** |
| Redis 권한캐시·JIT·SoD·Access Review·AI Agent/SvcAccount 권한 | 부재 | MISSING |

## 2. ★제품범위 교차검증 (명세가 실제보다 과대)

전면 엔터프라이즈 authz 엔진(ABAC JSON 정책 + ReBAC 관계테이블 + Redis 캐시 + JIT + Delegation + SoD +
Access Review + AI Agent/Service Account 8테이블 + 시뮬레이터)은 **대기업 IAM 제품 개념**. GeniegoROI(소규모팀
ROI SaaS)의 실 authz는 이미 TeamPermissions+api_key 역할로 충족되며, 전면 엔진 신설은 **중복(TeamPermissions와)·
투기(미사용 JIT/SoD/AccessReview)**가 된다. 명세 §5도 "중복 역할·권한 테이블 생성 금지"·"기존 IAM 무시 금지"를 명시.

**진짜 결여·비중복·제품실수요(옵션2 확정 범위와 정합) = 외부(게스트/파트너) 스코프 접근**:
- 외부를 full 멤버로 만들지 않고 **특정 프로젝트/리소스에만 만료·최소권한으로** 접근시키는 것(ReBAC 스코프 그랜트 + 외부정책 + 만료 + 감사). 이것이 Part003에서 실제로 지어야 할 핵심.

## 3. 본 차수 구현(초엔터프라이즈급·비중복)

- **`collaboration_access_grants`**(스코프 외부접근 그랜트): principal(USER/GUEST/PARTNER)×scope(PROJECT/WORKSPACE/ORG)×
  permissions×effect(ALLOW/DENY)×만료(valid_until)×granted_by×감사. Default-Deny.
- **초대 확장**: membership_type=guest/partner → 수락 시 **full 멤버 아님** — team_role='guest' 프로비저닝 + 스코프
  그랜트(특정 project·만료 필수·최소권한). member/manager는 기존 경로.
- **`evaluateAccess`**(RBAC+ReBAC 통합 결정): 테넌트격리 우선 → Explicit Deny → 내부멤버(기존 역할) → 외부는 grant
  스코프+만료+action 매칭만 ALLOW·그 외 Default Deny. PermissionDecision(allowed/reason/expires) 반환.
- **권한 확인 API** `POST /collaboration/access/check`(명세 §24) + 외부 그랜트 list/revoke(admin).
- 레지스트리: `collaboration.external`→ENABLED · `collaboration.security` 갱신.

## 4. 정직 보류(제품범위·중복 방지) — 차단 사유

전면 ABAC JSON 정책엔진·ReBAC 관계테이블·Redis 캐시·JIT·Delegation·SoD·Access Review·AI Agent/Service Account
권한 = 소규모팀 SaaS 미사용 투기 + TeamPermissions 중복. **PLANNED 보류**(수요 확인 후). 기존 RBAC는
TeamPermissions/api_key로 계속 사용(무후퇴).

## 5. 판정
**COMPLETED_WITH_LIMITATIONS** — 외부 스코프 접근(옵션2 핵심 authz) 실구현·기존 RBAC 재사용·전면 엔진 정직 보류.
