# CWIS Part002 — Organization/Workspace/Team/Membership Gap Analysis & Mapping

> 작성 2026-07-23 · ★교차검증 원칙(feedback_cross_verify_all_commands) 적용.
> 명세를 맹목 이행하지 않고 (1) 스택 대조 (2) 기존구조 매핑(§34 step 3-5 필수) (3) 제품범위 검토.

## 0. 스택 교차검증 (Part001과 동일 결론)

Part002도 Laravel/artisan/Eloquent-migration/DDD-4계층/Enum/Repository-interface/Outbox/EventBus/Queue/
PHPStan-L8/Pest 전제. 실제=Slim4·PDO·routes.php·Handlers·ensureTables(172 동결)·**큐/이벤트버스/테스트러너 부재**·Enum 0개.
→ 명세 형식 적용 불가. Part001 확립 방식(Slim/PDO 적응·기존 인프라 재사용)을 승계.

## 1. 기존구조 ↔ Part002 모델 매핑 (★핵심 — 중복 신설 방지)

| Part002 개념 | 기존 실체 (증거) | 판정 | 전략 |
|---|---|---|---|
| **Organization** | `tenant` + `tenant_business_profile`(company_name/industry/country, DataPlatform.php:72) | 존재(tenant=조직) | **REUSE** — 별도 org 테이블 신설 금지(§4) |
| Organization 계층(parent_org) | 부재 | MISSING | 제품범위 검토(소규모 SaaS에 다단계 조직 수요 불확실) |
| **Workspace** | `WorkspaceState`(tenant KV, routes 866) · `TeamWorkspace.jsx`(데모 shell) | PARTIAL | EXTEND(KV) / 데모 shell 재작성 |
| **Member/User** | `app_user`(tenant_id·parent_user_id·team_role[owner]·team_name·plan, UserAuth.php:186-189) | 존재 | **REUSE** — users 복제 금지(§4) |
| **Team** | `app_user.team_name`(약한 문자열) + `acl_permission`(TeamPermissions: subject×menu×actions, TeamPermissions.php:169) | PARTIAL(1급 엔티티 아님) | EXTEND(필요 시 team_name→teams 승격) |
| **Membership** | `app_user`(암묵적 tenant 소속) | PARTIAL(scope별 멤버십 없음) | EXTEND |
| **Permissions** | `acl_permission`(TeamPermissions) | 존재 | REUSE(상세=Part003) |
| **Invitation** | **부재**(agency `agency_client_link`·live `live_guests` 도메인특화만) | **MISSING** | NEW(후속 1순위·token_hash) |
| **External(guest/partner)** | `AgencyPortal`(agency_client_link: 파트너 초대/status)·`PartnerPortal`(supplier/logistics) | PARTIAL | EXTEND/통합 |
| **Department** | 부재 | MISSING | 제품범위 검토 |
| **Squad** | 부재 | MISSING | 제품범위 검토 |
| **Community** | 부재 | MISSING | 제품범위 검토 |

## 2. ★제품범위 교차검증 (명세가 실제보다 과대)

GeniegoROI = **멀티테넌트 ROI/마케팅 분석 SaaS**(테넌트=한 회사·소규모 팀). 명세가 요구하는
**다단계 조직(parent_org)·부서(department)·스쿼드(squad)·커뮤니티(community)·전사 조직도**는
**대기업 HR/조직관리 도구의 개념**으로, 현 제품의 실사용(테넌트당 소수 멤버 + 팀 이름 + 권한)과 괴리가 크다.
→ 이들을 즉시 신설하면 **미사용 기능/투기적 개발**이 된다. **PLANNED 등록 + 수요 확인 후 착수**로 정직 처리.

**반면 실수요·비중복인 것**: 조직(tenant)·멤버(app_user)·팀(team_name/acl)은 이미 있고, **초대(token_hash 기반 팀원 초대)**가 진짜 결여(현재 owner 직접생성만)라 가장 실용적 다음 대상.

## 3. Part002 처리 (본 차수)

- **레지스트리 등록(정직 상태)**: `collaboration.{organization=ENABLED(tenant), external=PARTIAL, invitation=PLANNED, department/squad/community=PLANNED(제품범위)}` — 협업 홈에 Part002 도메인 실상태 반영.
- **REUSE 확정**: 조직=tenant, 멤버=app_user, 권한=acl_permission — 신규 테이블 0(§4 복제금지 준수).
- **후속 1순위 = 초대 시스템**: `collaboration_invitations`(token_hash·만료·수락/철회) + 기존 email/notification 재사용. 팀원/게스트/파트너 통합 초대.
- **보류(제품범위)**: department/squad/community/다단계 조직/전사 조직도 — 수요 확인 후.

## 4. 판정

**COMPLETED_WITH_LIMITATIONS** — 재사용 가능 도메인(조직/멤버/팀/워크스페이스)은 기존 구조로 충족·레지스트리 등록.
진짜 결여(초대)는 후속 1순위. 투기적 대기업-조직 기능(부서/스쿼드/커뮤니티)은 제품범위 확인 후. Part003(권한 엔진)은
acl_permission/TeamPermissions 확장으로 진행 가능.
