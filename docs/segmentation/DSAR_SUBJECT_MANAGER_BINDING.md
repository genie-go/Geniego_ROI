# DSAR — Subject Manager Binding (§15)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §15(834-862) · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### 🔴 ★최우선 축 주의 — **`app_user.parent_user_id` 는 §15 를 커버하지 않는다**

형태상 "사람 → 사람 포인터"라 §15 `SUBJECT_MANAGER_BINDING` 의 대체물로 오독하기 가장 쉽다. **실측은 다른 축이다.**

| 검증 축 | 실측 | 결론 |
|---|---|---|
| **의미** | 정의 주석 `UserAuth.php:156` — *"하위(팀원) 계정의 **상위 owner id**. owner=NULL"* · **nullable**(`:167` `ALTER TABLE app_user ADD COLUMN parent_user_id INTEGER NULL`) | **테넌트 소속 포인터**(보고선 아님) |
| **깊이** | 🔴**전 생성경로가 owner 직속 2단으로 봉인** — `UserAuth.php:1226-1227`(주석 `:1225` *"항상 최상위 owner 에 종속: manager 가 추가해도 parent 는 최상위 owner"*) · `EnterpriseAuth.php:500`(INSERT · `:494-496` owner 조회 후 `(int)$owner['id']`) · `UserAuth.php:670`(null) · `:573`(승격 시 `parent_user_id = NULL`). **3단 경로가 코드에 없다.** | **보고선이 될 수 없다** |
| **순회** | **단일 홉** — `resolveTenantId:200-217` · `LIMIT 1` **1회**(`:209`) · 재귀 없음 · 하위계정이 상위 owner tenant_id 를 **그대로** 물려받음(`:197`·`:214`) | **체인 순회 능력 0** |
| **판독 술어** | 전 소비처가 **tenant 해석 전용** — `:41`(plan 조회) · `:207` · `:243` · `:296`(롤 파생) · `:992-993` · `:1113` · `UserAdmin.php:521-522` · `Rollup.php:47`,`:56`. **보고선·승인라우팅·감독 효과 0** | **관계로 판독되지 않는다** |

★**규칙 7 적용(부재증명은 이름이 아니라 능력으로 · 존재증명도 이름이 아니라 능력으로)**: `parent_user_id` 는 **이름이 그럴듯하나 능력이 없다.**
★**규칙 10 적중**: `parent_user_id` 가 "1홉"인 것은 **깊이 정책 준수가 아니라 여러 홉을 표현할 수단이 없어서**다.
🔴 **3단 허용 시 `resolveTenantId` 단일 홉 가정이 붕괴 → 286차 하이재킹과 동형 사고. 일반화가 선결이며, 본 §의 해법이 아니다.**

### 그 외 대체물도 §15 축이 아니다

| 대체물 | 실제 축 | 증거 |
|---|---|---|
| `team.manager_user_id` | **조직당 1칸** → **§17 축** | DDL `TeamPermissions.php:148` |
| `team_role='manager'` | **롤 라벨**(관계 아님) | `UserAuth.php:168` (owner\|manager\|member) |

### Subject(직원) 아이덴티티 실측 — §15 의 좌·우변 자체가 빈약하다

- **직원 아이덴티티 = `app_user` 뿐** — `app_user.id` + `email` + **외부 상관자 3컬럼**(`oidc_sub`·`oidc_provider`·`scim_external_id` · 정의부 **`EnterpriseAuth.php:64-65`** · `:500` 은 INSERT 소비처).
- **병합/정규화 계층 0** — union-find 는 **고객 전용**(`CRM.php:597-643`).
- ★**`app_user` ALTER 사이트 = 5개소**: `UserAuth.php:166-178`(9) · `Db.php:1123-1135` · `Db.php:1225-1232` · `UserAuth.php:3421-3423`(**동적 `$col` — mfa 6종**) · `TeamPermissions.php:175`(`team_id` **중복 정의**) · `EnterpriseAuth.php:65`. **결론(고용 컬럼 0)은 5개소 전량에서 유지.**
- 🔴 **DSAR "Data Subject" = 고객**(직원 아님) · **`admin_level`(master\|sub `:171`) ≠ Executive Level**(콘솔 특권) · **`grade` 45+건 전량 무관**(고객등급·리드등급·모델품질) · **`business_unit_id` = Trustpilot 자격증명**.

### 시점 축

`valid_from`·`valid_to`·`effective_to` **grep 0**. ★**`valid_to` 유일 히트 `Onsite.php:396` 은 `'invalid_token'` 문자열의 부분일치 = 위양성.**

## 1. 원문 전사 + 판정 — **원문 18종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | subject_manager_binding_id | 바인딩 엔티티 부재 · §13 관계 엔티티 자체 부재 | `ABSENT` |
| 2 | subordinate subject id | 🔴**`parent_user_id` 를 여기 매핑 금지** — 테넌트 소속 포인터(`UserAuth.php:156`) · owner 직속 2단 봉인 · 판독 술어 전부 tenant 해석. 좌변으로 쓸 종속측 참조 **없음** | `ABSENT` |
| 3 | manager subject id | 🔴**`parent_user_id` 의 우변은 매니저가 아니라 owner** — `EnterpriseAuth.php:494-496` 가 `team_role='owner'` 를 **조회해서** 넣는다(`:500`). **테넌트 루트이지 상급자 아님** | `ABSENT` |
| 4 | relationship type | §11 Manager Type 27종 표현 수단 0 · 🔴**`team_role='manager'` 는 롤 라벨의 값이지 관계 유형 아님** | `ABSENT` |
| 5 | tenant_id | **패턴 실재** — `app_user.tenant_id`(`UserAuth.php:155` *"격리 경계. owner = 'acct_<id>'"*) · 격리 REAL | `LEGACY_ADAPTER`(컬럼 관례만 이식) |
| 6 | subordinate employment reference | 🔴**고용(Employment) 엔티티 0** — §3.2 18항목 중 14 `ABSENT` · `is_active` 는 **계정 상태이지 고용 상태가 아니다**(base DDL `Db.php:1106`) · `Leave Status`/`Termination Status`/`Work Location` **전역 0** | `ABSENT` |
| 7 | manager employment reference | 동상 — 고용 엔티티 0 | `ABSENT` |
| 8 | subordinate organization | `app_user.team_id` 인접 — 🔴**단일 컬럼 = 1인 1팀**(이력·유효기간 0) · **`TeamPermissions.php:175` 에 중복 정의** | `PARTIAL`(단일 소속 한정) |
| 9 | manager organization | 매니저측 조직 참조 0 · **`parent_team_id` 없음 → 팀 트리 자체가 없다**(`:146-150`) | `ABSENT` |
| 10 | subordinate legal entity | 🔴**Legal Entity Officer `ABSENT`** — `ceo_name` = `app_user` **프로필 평문 문자열**(`UserAuth.php:306-307`,`:499`,`:1720` · `:1183` 가입 필수검사) · FK·감독관계·승인라우팅·시점 **전무**. 🔴**`DATA_SCOPES` `'company'` = 무제한 센티넬**(`effectiveScope():258`)이지 **법인 아님** | `ABSENT` |
| 11 | manager legal entity | 동상 | `ABSENT` |
| 12 | primary 여부 | 🔴**규칙 10** — `parent_user_id`·`team_id` 가 각각 1칸이라 "primary" 가 **우연히 참**. 복수 바인딩을 표현할 수단이 없어서지 정책이 아니다 | `ABSENT` |
| 13 | approval routing eligible 여부 | 🔴**승인자 후보를 계산하는 코드가 레포에 없다** — `resolveApprover`/`approval_chain`/`routeApproval` **0**(`approver` 2건은 에러 메시지 문자열 `Mapping.php:248`,`:280`). 승인 4경로 전량 **"호출자가 곧 승인자"** | `ABSENT` |
| 14 | valid_from | `valid_from` grep **0** | `ABSENT` |
| 15 | valid_to | `valid_to` grep **0** (★`Onsite.php:396` `'invalid_token'` = 부분일치 위양성) | `ABSENT` |
| 16 | source | 🔴**Subject-based manager 를 싣는 소스 0개** — SCIM `manager` **전역 0**(`urn:ietf:params:scim:schemas:extension:enterprise:2.0:User` 전역 0 · `employeeNumber` 0 · `scimUserOut:329-339` = schemas/id/externalId/userName/active/name/emails/meta **뿐** · `scimCreateUser:364-375` = userName·name·externalId·groups **5종만** 파싱) · `sso_config` DDL(`EnterpriseAuth.php:45-54`) = `email_attr`·`name_attr` **2슬롯뿐 · `manager_attr` 없음** | `ABSENT` |
| 17 | status | **패턴 실재** — `team.status VARCHAR(20) DEFAULT 'active'`(`:148`) · 화이트리스트 `['active','disabled','archived']`(`:490`). 바인딩 도메인 0 | `LEGACY_ADAPTER`(패턴만 이식) |
| 18 | evidence | 증거 첨부 축 0 · §66 Reconciliation 은 **좌변(source)·우변(canonical) 이중 부재** | `ABSENT` |

**실측 개수: 18 / 18 전사** (측정기 18 · 원문 대조 18 · 전사 18 — **3자 일치**).
커버리지 = `ABSENT` 15 · `LEGACY_ADAPTER` 2 · `PARTIAL` 1. **`VALIDATED_LEGACY` 0 — 커버 0종.**

## 2. 원문 지시 전사

> **"Subject Binding은 개인 교체 시 유지보수 비용이 높으므로 Source of Truth가 실제로 Subject-based일 때만 사용하라."** (원문 859)

**현행 판정**: 🔴 **Subject-based Source of Truth 가 0개다.** manager 데이터를 싣는 외부 소스가 **한 바이트도 없다**(SCIM `manager` 전역 0 · `sso_config` 에 `manager_attr` 슬롯조차 없음 · HRIS/ERP/Directory 커넥터 카탈로그 행 0 · fetcher 0 · 정규화 테이블 0).
→ **원문 조건이 현재 충족되지 않는다.** §15 를 선택할 근거가 **아직 존재하지 않으며**, 선택하려면 **Subject-based SoT 확보가 선행**이다.

## 3. 규칙

- 🔴 **`app_user.parent_user_id` 를 §15 의 커버로 계산 금지 — 본 문서 최상위 규칙.** 테넌트 소속 포인터이며 ① 의미(주석 `UserAuth.php:156` *"상위 owner id"*) ② 깊이(**owner 직속 2단 봉인** · 3단 경로 코드에 없음) ③ 순회(**단일 홉** `LIMIT 1` `:209`) ④ 판독(**전부 tenant 해석**) **4축 전부에서 보고선이 아니다**. 매핑은 **갭이 정의상 소멸하는 역산**이다.
- 🔴 **`parent_user_id` 를 3단으로 확장해 §15 를 구현하려는 시도 금지.** `resolveTenantId:200-217` 의 **단일 홉 가정이 붕괴** → **286차 하이재킹과 동형 사고**. Subject Manager Binding 은 **별도 엔티티**로 신설하고 `parent_user_id` 는 **테넌트 소속 축 그대로 보존**하라(무후퇴).
- 🔴 **원문 859 의 선택 조건을 먼저 통과시켜라.** Subject-based SoT 가 **0개**인 상태에서 §15 를 채택하면 **개인 교체마다 수기 유지보수**가 전제된다 — 원문이 경고한 바로 그 비용이다.
- 🔴 **`source` 를 "SCIM 을 켜면 된다"로 역산 금지.** SCIM `manager` = **`ABSENT` 확정**이며, ★**PATCH 는 침묵 no-op(가짜 녹색)**이다: `scimUpdateUser:391-396` Operations 루프가 **`'active'` 경로만** 분기 → IdP 가 `PATCH {"path":"manager"}` 를 보내면 `:399` 가 `is_active`·`name` 만 UPDATE 하고 **200 + 정상 User 리소스 반환**. **Okta/Entra 콘솔엔 성공 표시·저장된 것은 없다.** (**현재 소비자 0 → 관찰 사실·등급 미부여.**) **`/Schemas`·`/ResourceTypes` 디스커버리 엔드포인트도 부재.**
  - ★**확장 지점은 `active` 축뿐** — `EnterpriseAuth.php:389-400`(PUT/PATCH 양형식 · `:394` `filter_var BOOLEAN`)이 IdP→내부 상태 인입의 **유일한 REAL 경로**.
  - 🔴 **OIDC/SAML 어설션은 groups 를 읽지 않는다** — `:240`(OIDC)·`:294`(SAML)가 `provisionUser` 를 **8인자로** 호출 → `$groups` 기본값 `[]`(`:476`) → `roleForGroups:81` 즉시 `''`. **그룹→롤 매핑은 SCIM 경로 전용.**
  - 🔴 **`'manager'` 롤 리터럴을 IdP manager 로 오독 금지** — `sso_group_role_map.role`·`sso_config.default_role` 이 담는 것은 `team_role ∈ {owner,manager,member}` 의 **값**이다. **"IdP 가 manager 를 준다"로 읽으면 §3.4 ⑧⑨ 를 통째로 오판.**
- 🔴 **`evidence`/`source` 설계에 §66 Reconciliation 선행 금지 조건** — 비교쌍의 **좌변(source)·우변(canonical) 양쪽이 부재**다. **"source 측만 만들면 된다"는 역산이며, Canonical 선언이 §66 에 선행**한다(양변 부재 → **자동 MATCH = 가짜녹색** = 288차 `ok=>true` 위장과 동형).
- 🔴 **`subordinate/manager employment reference` 에 `is_active` 재사용 금지** — **계정 상태이지 고용 상태가 아니며**, ★**`UNKNOWN` 조차 표현 불가**(`NOT NULL DEFAULT 1` → **미지가 자동으로 "가용" = fail-open**). `is_active=0` 이 **3경로 혼재**(`UserAuth.php:1380` 팀원삭제 · `EnterpriseAuth.php:412` SCIM DELETE · `UserAdmin.php:361` 관리자 토글) → **사유 구분 불가**.
- 🔴 18종 **"있다고 가정"하고 배선 금지.**
