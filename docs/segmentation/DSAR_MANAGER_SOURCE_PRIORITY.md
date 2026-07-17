# DSAR — Manager Source Priority (§62)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §62 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★★ 핵심 판정 — **"우선순위 미구현"이 아니라 정렬할 대상이 0개**

§62 는 **소스 간 우열을 정하라**는 요구다. 그러려면 **manager 데이터를 싣고 오는 소스가 2개 이상** 있어야 한다.
🔴 **레포의 manager 보유 소스 = 0개.** → **`VACUOUS` 이전에 무대상**이다. "우선순위 로직이 없다"가 아니라 **정렬할 리스트가 비어 있다.**

> 🔴 **`EnterpriseAuth` 는 존재한다. 그러나 manager 데이터를 한 바이트도 싣지 않는다.** "SSO 가 있으니 IdP 소스는 있다"로 계산하면 **존재증명을 이름으로 하는 규칙 7 위반**이다.

### 능력 실측 — **12단계 중 6단계가 소스 축 `ABSENT`**

| 소스군 | 이름 축 | **능력 축**(★판정 근거) |
|---|---|---|
| **HRIS**(2·3·4) | `hris`·`workday`·`bamboo`·`payroll` **소스 히트 0** | **커넥터 카탈로그 행 0 · fetcher 0 · 정규화 테이블 0** |
| **ERP**(5) | `sap`·`netsuite`·`dynamics` **히트 0** | **카탈로그 행 0 · fetcher 0 · 정규화 테이블 0** |
| **Directory/IdP**(8) | `ldap`·`active_directory`·`distinguishedName` **히트 0** | **`sso_config` DDL `EnterpriseAuth.php:45-54` = `email_attr`·`name_attr` **2슬롯뿐** · `manager_attr` 없음**(본 전사 재확인 — `manager_attr` grep 0) |
| **SCIM**(9) | 이름은 실재 | **`urn:ietf:params:scim:schemas:extension:enterprise:2.0:User` 전역 0** · `employeeNumber` 0 · `scimUserOut:329-339` = schemas/id/externalId/userName/active/name/emails/meta **뿐** · `scimCreateUser:364-375` = userName·name·externalId·groups **5종만** |

### 🔴 논증 주의 (규칙 11) — **무효 논증을 답습하지 마라**

*"`group_type` 열거에 `erp`·`hr` 가 없다"* 는 **무효 논증이다.**
`ChannelRegistry.php:36`,`:38`/`:46`,`:47` = **`VARCHAR(40)`/`VARCHAR(20)` 자유 문자열 · ENUM/CHECK 없음 · `in_array` 화이트리스트 0** → **누구든 `group_type='hr'` 를 삽입할 수 있다.** 주석(`:12`·`:79`)은 **열거가 아니라 관례**이며, 실값 `support` 가 **주석에 누락된 stale** 이다.
✅ **능력축으로만 논증하라**: **카탈로그 행 0 · fetcher 0 · 정규화 테이블 0.** (5-3-2 `Alerting::dispatch` 팬텀 · 5-3-3-1 `ChannelSync:914 depth` 주석 오독에 이은 **3연속 재발 지점** — 규칙 8.)

### 🔴 SCIM `manager` PATCH = **침묵 no-op(가짜녹색)**

`scimUpdateUser:391-396` Operations 루프가 **`'active'` 경로만** 분기한다 → IdP 가 `PATCH {"path":"manager"}` 를 보내면 `:399` 가 `is_active`·`name` 만 UPDATE 하고 **200 + 정상 User 리소스를 반환**한다. **Okta/Entra 콘솔엔 성공 표시 · 저장된 것은 없다.** `/Schemas`·`/ResourceTypes` 디스커버리 엔드포인트도 **부재**.
⚠️ **현재 소비자 0 → 관찰 사실 · 등급 미부여.**

### 🔴 오염원 — `'manager'` 문자열 함정

`sso_group_role_map.role`·`sso_config.default_role` 이 담는 `'manager'` 는 **`team_role ∈ {owner,manager,member}` 의 값(롤 라벨)** 이다. **"IdP 가 manager 를 준다"로 읽으면 §3.4 ⑧⑨ 를 통째로 오판**한다.
🔴 **정정(ⓑ)**: OIDC `:240`·SAML `:294` 는 `provisionUser` 를 **8인자로** 호출 → `$groups` 기본값 `[]`(`:476`) → `roleForGroups:81` 즉시 `''`. **OIDC/SAML 어설션은 groups 를 읽지 않는다 — 그룹→롤 매핑은 SCIM 경로 전용.**

## 1. 원문 전사 + 판정 — **원문 12종 (★번호목록)**

원문 지시: *"Tenant별로 **Versioned Source Priority** 를 설정하라. 권장 예:"*
★ **§62 는 불릿이 아니라 번호목록 1~12** 이다(불릿만 세면 0 — 측정기 경고와 일치).

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Approved Governance Override | 거버넌스 오버라이드 엔티티 **0**. 승인 경로 4개 어디에도 override 개념 없음 | `ABSENT` |
| 2 | HRIS Supervisory Organization | **HRIS 소스 부재** — 카탈로그 행 0 · fetcher 0 · 정규화 테이블 0 | `ABSENT` |
| 3 | HRIS Position Hierarchy | **HRIS 부재** + **Position 축 전역 0** — 이중 부재 | `ABSENT` |
| 4 | HRIS Explicit Manager | **HRIS 부재** + Manager 축 0 — 이중 부재 | `ABSENT` |
| 5 | ERP Personnel Hierarchy | **ERP 소스 부재**(`sap`·`netsuite`·`dynamics` 0). 🔴 `group_type` 논증 사용 금지(규칙 11) | `ABSENT` |
| 6 | Canonical Position Registry | Canonical 선언 자체가 없음 · Position 축 0 | `ABSENT` |
| 7 | Canonical Organization Manager Binding | `ORGANIZATION_*` **backend 전역 grep 0** · §3.1 = **18/18 `CONTRACT_ONLY`**(문서만) | `CONTRACT_ONLY` |
| 8 | IdP Manager Attribute | 🔴 **설정 슬롯조차 없다** — `sso_config` DDL `EnterpriseAuth.php:45-54` = `email_attr`·`name_attr` **2슬롯뿐** · **`manager_attr` grep 0**. IdP 는 **존재하나 manager 를 못 담는다** | `ABSENT` |
| 9 | SCIM Manager Reference | 🔴 **enterprise:2.0:User 확장 스키마 전역 0** · `scimUserOut:329-339`·`scimCreateUser:364-375` 에 manager 없음 · **PATCH 는 침묵 no-op**(`scimUpdateUser:391-396` → 200 반환 · 저장 0) | `ABSENT`(⚠️가짜녹색 잠복) |
| 10 | Manual Governed Relationship | **가장 근접하나 미달** — `team.manager_user_id` 쓰기경로는 **REAL**(`createTeam:463-469` 테넌트 검증 `:464` → INSERT `:466` → `promoteManager:469`). 🔴 그러나 **Governed 아님**: 승인 0 · 근거 0 · effective date 0 · 이력 0 · 버전 0 · **Type/Priority 슬롯 0** | `PARTIAL` |
| 11 | Imported Legacy Reference | 레거시 임포트 경로 0. 🔴 **`teamApi.js:94` `manager_user_id:'tm_1'` = 데모 fixture** — 소스로 계상 금지 | `ABSENT` |
| 12 | Unverified Source | 🔴 **규칙 10** — 미검증 소스를 **분류할 소스 자체가 0개**. 신뢰 등급 축(Trust/Quality/Confidence)이 manager 도메인에 **미도달** | `ABSENT` |

**실측 개수: 12 / 12 전사.** (측정기 분모 12 **번호목록** · 원문 대조 12 · 전사 12 — **일치**)
커버리지 = **`VALIDATED_LEGACY` 0** · `PARTIAL` 1(10) · `CONTRACT_ONLY` 1(7) · `ABSENT` 10.
★ **소스 축 `ABSENT` 6단계** = 2·3·4(HRIS) · 5(ERP) · 8(IdP) · 9(SCIM) — ⓑ 실측과 일치.

> ★ 원문 말미 별도 문장(항목 아님): *"**IdP·SCIM Manager Attribute를 HRIS보다 무조건 우선하지 마라.**"* → 원문 순번 자체가 **HRIS(2·3·4) > IdP(8) > SCIM(9)** 으로 이 지시를 반영한다.
> ★ 규칙 4 확인: 원문이 `evidence` 로 끝나지 않는다(12번 = `Unverified Source`) → **추가하지 않았다.**

## 2. 규칙

- 🔴 **"§62 는 우선순위 로직만 짜면 된다"는 서술 금지.** **manager 보유 소스 = 0개**다 → 우선순위 엔진을 먼저 만들면 **입력이 영원히 빈 리스트**이며, **최초 소스 1개가 붙는 순간 그것이 무조건 승리**한다(정렬이 아니라 통과). **소스 커넥터 → Canonical Manager Binding → §62** 순서 강제.
- 🔴 **`VACUOUS` 로도 적지 마라 — 무대상이다.** VACUOUS 는 "경로는 있으나 도달 불가"이고, §62 는 **경로의 입력 집합 자체가 정의되지 않았다.** 둘을 섞으면 "생산자만 붙이면 된다"는 **역산**이 된다.
- 🔴 **규칙 11 재확인 — `group_type` 논증 절대 금지.** `ChannelRegistry.php:36`,`:38`/`:46`,`:47` 은 **자유 VARCHAR · ENUM/CHECK 0 · `in_array` 0** 이다. 열거가 **코드로 강제되지 않으므로** "열거에 없다"는 부재의 증거가 **아니다**. **부재증명은 능력으로**: 카탈로그 행 0 · fetcher 0 · 정규화 테이블 0.
- 🔴 **8번(IdP Manager Attribute)은 컬럼 신설이 선결.** `sso_config` 에 **`manager_attr` 슬롯조차 없다**(`:45-54`) → **어설션에서 manager 를 읽을 설정 자리가 없다.** 🔴 그리고 **OIDC/SAML 경로는 groups 조차 읽지 않는다**(`:240`·`:294` 8인자 호출 → `$groups=[]` `:476`) → **IdP 축 확장은 어설션 파서부터**다.
- 🔴 **9번(SCIM)은 "PATCH 가 200 을 반환하니 동작한다"로 판단 절대 금지.** `scimUpdateUser:391-396` 이 **`'active'` 만 분기**하고 나머지를 **조용히 버린 뒤 200 + 정상 리소스를 반환**한다 = **288차 `ok=>true` 위장 14채널 18개소와 동형의 가짜녹색**. SCIM manager 배선 시 **① `enterprise:2.0:User` 확장 스키마 ② Operations 미지원 path → 400 fail-closed ③ `/Schemas`·`/ResourceTypes` 디스커버리** 3종 동시 필수.
  - ✅ **유일한 확장 지점 = SCIM `active` 인입 경로**(`EnterpriseAuth.php:389-400` PUT/PATCH 양형식 · `:394` `filter_var BOOLEAN`) — **IdP→내부 상태 인입이 REAL 인 유일 선례**. **재구현 금지 · 이 경로를 확장**하라.
- 🔴 **10번을 "Manual 은 됐다"로 계산 금지 — `PARTIAL`.** 쓰기경로가 REAL 이어도 **Governed** 요건(승인·근거·유효기간·버전·이력)이 **전부 0**이다. 🔴 특히 **시드 축 주의**: `seedOrg:739` INSERT 컬럼 8개에 `manager_user_id` 부재 → **`ORG_PRESET` 시드 15팀 전부 manager NULL.**
- 🔴 **"Versioned" 를 흘리지 마라.** 원문은 **Versioned Source Priority** 를 요구한다. 🔴 **엔티티 `version` 선례 = `menu_defaults.version` 1건이며 유일 생산자 `AdminMenu.php:309` 가 리터럴 `'baseline'` 고정 = 버전이 아니라 라벨**(주석 `:281` 이 282차까지 0행 자인). **`required_approvals` 의 유일 생산자 `Mapping.php:210` 이 리터럴 `2` 하드코딩**인 것과 **정확히 동형**이다 — **"컬럼이 있다 → 모델이 있다"는 규칙 7 위반.** §62 의 version 은 **실 생산자와 함께** 설계하라.
- 🔴 **§66 Reconciliation 은 §62 에 의존하며 현재 이중 공허**다 — 비교쌍의 **좌변(source)·우변(canonical) 양쪽 부재**. **"source 측만 만들면 된다"는 역산** · **Canonical 선언이 §66 에 선행**(5-3-3-1 D-14 동형). 양변 부재 상태의 대사(reconcile)는 **자동 MATCH = 가짜녹색**.
- 🔴 **11번: `teamApi.js:94` `manager_user_id:'tm_1'` 는 데모 fixture** — 레거시 소스로 계상하면 **목데이터를 운영 소스로 승격**하는 데이터 헌법 위반.
