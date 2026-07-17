# DSAR — Administrative Manager (§19)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §19(953-971줄) · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Administrative Manager | `administrative_manager` **backend/src grep 0** | `ABSENT` |
| Functional Manager | `functional_manager` **grep 0** | `ABSENT` |
| **Administrative/Functional 구분 수단** | 🔴 **`app_user.team_role` 문자열 1개**(`UserAuth.php:168` `VARCHAR(40)` · 값 `owner|manager|member`) — **`'manager'` 라는 값 하나에 두 종류가 뭉개진다** | `ABSENT`(구분 불가) |
| HRIS/ERP/Directory | `hris`·`workday`·`bamboo`·`payroll`·`sap`·`netsuite`·`ldap`·`active_directory` **소스 히트 0** · 커넥터 **카탈로그 행 0 · fetcher 0 · 정규화 테이블 0** | `ABSENT` |
| Legal Entity | `ceo_name` = `app_user` **프로필 평문 문자열**(`UserAuth.php:306-307`,`:499`) · FK·감독관계 전무 | `ABSENT` |
| Primary Organization | `app_user.team_id` **단일 컬럼**(`TeamPermissions.php:175`) = **1인 1팀** · 이력·유효기간 0 | `ABSENT`(Primary 개념 표현 불가) |
| 유효기간 / 이력 | `valid_from`·`valid_to`·`effective_to` **grep 0** · as-of 질의 **전역 0** | `ABSENT` |

**★축 주의 ① — "Administrative 와 Functional 이 다를 수 있게 하라"(원문 968줄)는 현행에서 표현 자체가 불가능하다.**
현행이 두 종류를 **혼동하지 않는 것**은 구분을 구현해서가 아니라 **`team_role='manager'` 문자열 하나뿐이라 구분할 대상이 애초에 없어서**다(규칙 10). 이 문자열은 **관계가 아니라 롤 라벨**이며, 이 값 하나에 위임 권한이 걸려 있다(`UserAuth.php:1062` · `TeamPermissions.php:136` `isManagerAdmin` · `:618` `putMemberPermissions`). **"1개니까 충돌 없음"을 정합으로 계산하면 §19 전체가 소멸한다.**

**★축 주의 ② — HRIS source priority 는 "우선순위 미구현"이 아니라 정렬할 대상이 0개다.**
§62 판정과 동형: **manager 데이터를 싣는 소스가 0개**다. EnterpriseAuth 는 존재하나 **manager 를 한 바이트도 싣지 않는다** — `sso_config` DDL `EnterpriseAuth.php:45-54` 에 **`manager_attr` 슬롯 자체가 없고**, SCIM `scimUserOut:329-339` 은 schemas/id/externalId/userName/active/name/emails/meta **뿐**, `urn:ietf:params:scim:schemas:extension:enterprise:2.0:User`(manager 를 담는 표준 확장) **전역 0**. `VACUOUS` 이전에 **무대상**이다.
🔴 **논증 주의(규칙 11)**: *"`group_type` 열거에 `hr`·`erp` 가 없다"* 로 부재를 논증하지 마라 — `ChannelRegistry.php:36`,`:46` 은 **자유 `VARCHAR` · ENUM/CHECK 없음 · `in_array` 화이트리스트 0** 이라 **열거가 실재하지 않는다.** **능력축(카탈로그 행 0 · fetcher 0 · 정규화 테이블 0)으로만 논증하라.**

**★축 주의 ③ — SCIM manager PATCH 는 침묵 no-op(가짜 녹색).** `scimUpdateUser:391-396` Operations 루프가 **`'active'` 경로만** 분기 → IdP 가 `PATCH {"path":"manager"}` 를 보내면 `:399` 가 `is_active`·`name` 만 UPDATE 하고 **200 + 정상 User 리소스 반환**. **Okta/Entra 콘솔엔 성공 표시 · 저장된 것은 없다.** §19 를 SCIM 으로 채우려면 이 경로부터 정직해져야 한다. **현재 소비자 0 → 관찰 사실 · 등급 미부여.**

## 1. 원문 전사 + 판정 — **원문 8종**(필수 속성 8)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | official supervisory relationship | **부재** — 감독 관계 엔터티 0(`manager_id`·`reports_to`·`supervisor_id` grep 0). 🔴`team.manager_user_id`(`TeamPermissions.php:148`)는 **팀당 1칸 라벨**이지 `official` 을 선언하는 수단이 없다(공식/비공식 구분 축 0) | `ABSENT` |
| 2 | primary organization alignment | **부재** — `app_user.team_id` **단일 컬럼 = 1인 1팀** → **`primary` 를 붙일 두 번째 소속이 존재할 수 없다**(규칙 10). `team` 에 **`parent_team_id` 없음 → 팀 트리 자체가 없다** | `ABSENT` |
| 3 | employment legal entity | **부재** — 법인 엔터티 0. `ceo_name` = **프로필 평문 문자열**(`UserAuth.php:306-307` · `:1183` 가입 필수검사) · FK·감독관계·승인라우팅·시점 **전무**. `DATA_SCOPES` `'company'`(`TeamPermissions.php:717`)는 **법인이 아니라 무제한 센티넬**(`effectiveScope():258`) | `ABSENT` |
| 4 | HRIS source priority | **부재 · 무대상** — 🔴**정렬할 소스가 0개**다(HRIS/ERP/Directory 커넥터 카탈로그 행 0 · fetcher 0 · 정규화 테이블 0 · SCIM enterprise 확장 0 · `sso_config` 에 `manager_attr` 슬롯 없음 `EnterpriseAuth.php:45-54`). **"우선순위만 붙이면 된다"는 역산** — 소스 자체가 선결 | `ABSENT` |
| 5 | manager chain eligibility | **부재** — chain 개념 0(재귀 매니저 질의 **0개**) · 적격 술어 0. 🔴**현행은 정반대**: `'manager'` **라는 이유만으로 승인/위임 권한이 자동 부여**된다(`UserAuth.php:1064` · `TeamPermissions.php:136`) — **적격성 판정 없음** | `ABSENT` |
| 6 | approval routing eligibility | **부재** — 승인자 **후보를 계산하는 코드가 레포에 없다**(`resolveApprover`·`approval_chain`·`routeApproval` **grep 0** · `approver` 2건은 **에러 메시지 문자열** `Mapping.php:248`,`:280`). 승인 경로 4개 전량 = **"호출자가 곧 승인자"** → 라우팅 대상 축 0 | `ABSENT` |
| 7 | valid period | **부재** — `valid_from`·`valid_to`·`effective_to` **grep 0** · `team.manager_user_id` 에 **effective date 0 · 이력 0**. 기간축 유일 선례 `kr_fee_rule.effective_from`(`Db.php:898`)은 **컬럼 有·질의 無**(읽기 4개소 전부 최신승) | `ABSENT` |
| 8 | historical reconstruction | **부재** — as-of 질의 **전역 0**(`WHERE effective_from <= :as_of` 0 · `as_of` 2건은 **응답 타임스탬프** `PgSettlement.php:279`·`AttributionEngine.php:666`). 🔴**`AgencyPortal.php:304`·`:381` 이 `revoked_at=NULL` 로 이전 해지 시각을 소거** → **이력 물리적 소멸** = 과거 재구성 **정면 반례** | `ABSENT` |

**실측 개수: 8 / 8 전사.**
- **측정기 분모 8** · **원문 대조 8** · **전사 8** — **일치.**
- ★**규칙 4 확인**: 원문 §19 목록은 `historical reconstruction`(966줄)으로 **끝난다.** `evidence` 로 끝나지 **않으므로 추가하지 않았다.**
- ★원문 968줄 *"Administrative Manager와 Functional Manager가 다를 수 있게 하라"* 는 **불릿이 아닌 산문 요구**다 — 측정기 분모 8 에 포함되지 않으므로 표에 넣지 않고 **§2 규칙**으로 전사한다(규칙 3 — 숫자를 조용히 맞추지 않는다).
- 커버리지 = **`ABSENT` 8 · 커버 0.**

## 2. 규칙

- 🔴 **원문 968줄 요구 — "Administrative Manager 와 Functional Manager 가 다를 수 있게 하라."** 현행 `team_role='manager'` **문자열 1개로는 원리적으로 불가능**하다. 🔴**`team_role` 에 `'admin_manager'`·`'func_manager'` 값을 추가하는 방식 금지** — 이 컬럼 값 하나에 **인가 게이트가 직결**되어 있어(`UserAuth.php:1062-1064` · `TeamPermissions.php:136`) 값을 늘리는 순간 **기존 `=== 'manager'` 비교가 조용히 false 가 되어 권한이 소실**된다(무후퇴 위반). **관계는 별도 엔터티로 분리**하고 `team_role` 은 **롤 라벨로 보존**한다.
- 🔴 **#4 HRIS source priority 를 §62 우선순위 설계로 착수 금지.** **manager 를 싣는 소스가 0개**이므로 우선순위 테이블을 먼저 만들면 **정렬 대상 0의 빈 껍데기 = 가짜 녹색**이다. **소스 확보(또는 Canonical 선언)가 선행.**
- 🔴 **§66 Reconciliation 을 §19 로 닫지 마라 — 이중 공허.** 비교쌍의 **좌변(HRIS source)·우변(canonical) 양쪽이 부재**다. 양변 부재 → **자동 MATCH = 가짜 녹색**(288차 `ok=>true` 위장과 동형). **Canonical 선언이 §66 에 선행.**
- **SCIM 은 유일한 실 확장 지점이나 manager 는 미도달.** `active` 인입 경로는 **REAL**(`EnterpriseAuth.php:389-400` PUT/PATCH 양형식 · `:394` `filter_var BOOLEAN`)이므로 **형태를 이식**할 수 있다. 🔴 단 **`scimUpdateUser:391-396` 의 침묵 no-op 을 그대로 두고 manager 를 얹으면 IdP 에 성공으로 표시되며 저장되지 않는다** — **미지원 path 는 400/`invalidPath` 로 정직하게 실패**시키는 것이 선결. **`/Schemas`·`/ResourceTypes` 디스커버리 엔드포인트도 부재**다.
- 🔴 **OIDC/SAML 어설션으로 manager 를 받겠다는 설계 금지** — OIDC `:240`·SAML `:294` 는 `provisionUser` 를 **8인자로** 호출해 `$groups` 기본값 `[]`(`:476`) → **어설션은 groups 조차 읽지 않는다.** 그룹→롤 매핑은 **SCIM 경로 전용**.
- **#8 historical reconstruction 의 이식 선례** = `pm_audit_log`(migration `20260526_168_008` — `tenant_id NOT NULL`+`entity`+`diff_json`+3인덱스+append-only). 🔴**`menu_audit_log` 스키마 복제 금지**(`tenant_id` 없음 · `lastHash()` 에 tenant 술어 없음) — **hash_chain 알고리즘만 이식**(`AdminMenu.php:128`,`:182-197`)하고 `WHERE tenant_id=?` 필수.
- 🔴 **`revoked_at=NULL` 소거 패턴(`AgencyPortal.php:304`,`:381`) 복제 절대 금지** — #8 의 정면 반례다. Manager 관계 종료는 **행 갱신이 아니라 기간 종료(신규 행)** 로 표현한다.
- 🔴 **8종 "있다고 가정"하고 배선 금지.**
