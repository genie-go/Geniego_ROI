# DSAR — Reporting Line Registry Type / Authoritative Source (§6)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §6 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

본 편은 §6 의 **`registry_type` 축(원문 10종)** 을 전사하며, 같은 §6 의 **`authoritative_source`·`source priority`** 필드와 **직결**한다 — Registry Type 은 곧 *"어느 권위 소스가 이 레지스트리를 채우는가"* 의 열거이기 때문이다.

### ★대전제 — **authoritative source 가 0개다** (§62 판정과 정합)

> **§62 는 "우선순위 미구현"이 아니다. 정렬할 대상이 0개다.**
> 권장 12단계 중 **2·3·4(HRIS)·5(ERP)·8(IdP)·9(SCIM) 6단계가 `ABSENT`**.
> `EnterpriseAuth` 는 **존재하나 manager 데이터를 한 바이트도 싣지 않는다** → **manager 보유 소스 = 0개**.
> → **`VACUOUS` 이전에 무대상.** 우선순위 정렬 로직을 먼저 짜면 영원히 도달 불가한 코드가 된다.

| 소스 후보 | 이름 축 | **능력 축**(규칙 7 — 부재증명은 능력으로) | 판정 |
|---|---|---|---|
| HRIS | `hris`·`workday`·`bamboo`·`payroll` **소스 히트 0** | 커넥터 **카탈로그 행 0 · fetcher 0 · 정규화 테이블 0** | `ABSENT` |
| ERP | `sap`·`netsuite`·`dynamics` **0** | 동일 — 카탈로그/fetcher/정규화 **전부 0** | `ABSENT` |
| Directory | `ldap`·`active_directory`·`distinguishedName` **0** | 동일 | `ABSENT` |
| IdP(OIDC/SAML) | `sso_config` DDL `EnterpriseAuth.php:45-54` **실측** | **`email_attr`·`name_attr` 2슬롯뿐 — `manager_attr` 없음** → §3.4 IdP Manager Attribute 는 **설정 슬롯조차 없다**. ★OIDC `:240`·SAML `:294` 는 `provisionUser` 를 **8인자**로 호출 → `$groups` 기본값 `[]`(`:476`) → `roleForGroups:81` 즉시 `''` → **어설션은 groups 를 읽지 않는다** | `ABSENT` |
| SCIM | `urn:ietf:params:scim:schemas:extension:enterprise:2.0:User` **전역 0** · `employeeNumber` 0 | `scimUserOut:329-339` = schemas/id/externalId/userName/active/name/emails/meta **뿐** · `scimCreateUser:364-375` = 5종만 파싱 · **`/Schemas`·`/ResourceTypes` 디스커버리 부재** | `ABSENT` |

### 🔴 ★SCIM `manager` PATCH = **침묵 no-op(가짜 녹색)** — 289차 재확인

`scimUpdateUser:391-396` 의 Operations 루프는 **`'active'` 경로만** 분기한다(`:394`):

```php
foreach ($b['Operations'] as $op) {
    $path = strtolower((string)($op['path'] ?? '')); $val = $op['value'] ?? null;
    if ($path === 'active' || (is_array($val) && array_key_exists('active', $val))) { ... }
}
```

→ IdP 가 `PATCH {"path":"manager"}` 를 보내면 `:399` 가 `is_active`·`name` **만** UPDATE 하고 **`:402` 가 200 + 정상 User 리소스를 반환**한다.
**Okta/Entra 콘솔엔 성공 표시 · 저장된 것은 없다.** → **현재 소비자 0 → 관찰 사실 · 등급 미부여**(⚠️ 생산자 배선 시 즉시 활성 결함).

### 🔴 ★논증 주의 (규칙 11) — **"열거에 없다"를 근거로 쓰지 마라**

*"`group_type` 열거에 `erp`·`hr` 가 없으므로 부재"* 는 **무효 논증**이다.
`ChannelRegistry.php:36`,`:38`/`:46`,`:47` = **`VARCHAR(40)`/`VARCHAR(20)` 자유 문자열 · ENUM/CHECK 없음 · `in_array` 화이트리스트 0** → **누구든 `group_type='hr'` 삽입 가능**. 주석(`:12`·`:79`)은 **열거가 아니라 관례**이며 실값 `support` 가 **주석에 누락된 stale** 이다(규칙 8 — 주석을 스키마 제약으로 오독 금지).
→ **본 편의 모든 `ABSENT` 는 능력축(카탈로그 행 0 · fetcher 0 · 정규화 테이블 0)으로만 논증한다.**

### §66 Reconciliation = **이중 공허**

비교쌍의 **좌변(source)·우변(canonical) 양쪽이 부재**다. *"source 측만 만들면 된다"* 는 **역산**이며, **Canonical 선언이 §66 에 선행**한다(5-3-3-1 D-14 동형). 양변 부재 상태의 자동 MATCH = **가짜녹색** = 288차 `ok=>true` 위장과 동형.

## 1. 원문 전사 + 판정 — **원문 10종**

원문 §6 `Registry Type:` (spec `:463-474`)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | PLATFORM | 플랫폼 스코프 보고선 부재. 🔴**함정**: `platform_growth` 는 **테넌트 문자열**(286차 하이재킹 원인)이지 레지스트리 스코프 아님 · `Db::envLabel()` 은 **게이트가 아니다**(`Db.php:51-54` 코드가 스스로 금지 자인) | `ABSENT` |
| 2 | TENANT | 인접 REAL = `team.tenant_id`(`TeamPermissions.php:146`)·`data_scope UNIQUE(tenant_id,…)`(`:164`) — **스코프 격리 능력은 REAL 이나 보고선 레지스트리 없음**(규칙 9: 스코프 있음 ≠ 기능 충족) | `ABSENT` |
| 3 | HRIS | `hris`·`workday`·`bamboo`·`payroll` 소스 히트 0 · **커넥터 카탈로그 행 0 · fetcher 0 · 정규화 테이블 0** | `ABSENT` |
| 4 | ERP | `sap`·`netsuite`·`dynamics` 0 · 동일 능력축 0. ★`group_type` 열거 논증 **금지**(위 규칙 11) | `ABSENT` |
| 5 | DIRECTORY | `ldap`·`active_directory`·`distinguishedName` 0. 🔴**함정**: `$dn`(`Connectors.php:1557`·`GraphScore.php:343`)은 **PHP 지역변수**이지 `distinguishedName` 아님 | `ABSENT` |
| 6 | PROJECT | 유일 인접자산 = `pm_projects.owner_user_id`(migration `20260526_168_001:13` · `KEY idx_pm_proj_owner :21` · 쓰기 `Projects.php:58`,`:66`,`:113`). 🔴**판독 술어 0**(`WHERE owner_user_id` grep 0) → **저장된 라벨** · 무검증 자유문자열(`:112-117`) · 기본값이 생성자(`:66`) · 단일값. §22 Project Manager 10요구 중 **7 부재**(sponsor grep 0 등). 🔴`pm_portfolio` "프로그램"은 **주석 팬텀**(`Enterprise.php:13`) — 코드에 program 개념 0 | `NAME_ONLY` |
| 7 | FINANCE | `cost_center`·`profit_center` **backend/src grep 0**(289차 실측) · 재무 조직 명부 0. `budget_amount`(migration `…168_001:14-15`) = **프로젝트 예산액**이지 매니저 권한 아님. ⚠️`ORG_PRESET` `'재무팀' => 'company'`(`TeamPermissions.php:717`) = **무제한 센티넬**(`effectiveScope():258`) — 법인/재무 조직 아님 | `ABSENT` |
| 8 | REGIONAL | **탐지·라우팅·세그먼트이지 명부 아님**. `Geo.php:23-53` = IP→ISO alpha-2 **언어 결정용** · `region` 3축(광고 인구통계 `Db.php:681`,`:690` / **Amazon Ads 엔드포인트 na·eu·fe** `Connectors.php:2704-2710` / **WMS 시·도** `Wms.php:129`·`regionOf():286`) · `APAC`/`EMEA`/`LATAM` **0**. 🔴**함정**: `wms_warehouses.manager VARCHAR(120)`(`Wms.php:62`/`:112` · 쓰기 `:290`,`:299`,`:313`)가 **`region`·`country` 와 같은 테이블에 공존**해 Regional Manager 로 오독하기 쉽다 — **시설 담당자 자유텍스트 · FK 0 · 판독 술어 0** | `ABSENT`(인접 `wms_warehouses.manager` = `NAME_ONLY`) |
| 9 | BRAND | `catalog_brand`(`Catalog.php:151-169`) = `id·tenant_id·name·code·created_at·updated_at` · `UNIQUE(tenant_id,name)`. **관리자 필드 없음**. 🔴**규칙 9 적중 — 명부는 REAL · 매니저는 `ABSENT`** | `ABSENT` |
| 10 | CUSTOM | 확장 슬롯 부재 — 레지스트리 자체가 없으므로 커스텀 타입을 담을 곳이 없다 | `ABSENT` |

**측정기 분모: 32(§6 전체) / 원문 대조: 필수 필드 22 + Registry Type 10 = 32 / 본 편 전사: 10.** 잔여 22(필수 필드)는 [DSAR_REPORTING_LINE_REGISTRY.md](DSAR_REPORTING_LINE_REGISTRY.md) 에서 전사. **불일치 없음.**

커버리지 = **`VALIDATED_LEGACY` 0** · `ABSENT` 9 · `NAME_ONLY` 1.

> ★**원문에 `authoritative_source` 자체의 항목 축은 없다.** §6 은 `registry_type` 만 열거하며, `authoritative_source`·`source priority` 는 **필드일 뿐 열거를 동반하지 않는다**(규칙 5 준수 — 없는 축을 만들지 않았다). 소스 우선순위 12단계는 **§62 원문 소관**이며 본 편은 인용만 한다.

## 2. 규칙

- 🔴 **10종 전부 `ABSENT` 라는 사실을 "정합"으로 읽지 마라**(규칙 9·10). 중복이 0인 것은 **축이 없어서**이지 설계가 깨끗해서가 아니다.
- 🔴 **`authoritative_source` 를 `EnterpriseAuth` 로 채울 수 있다고 계산 금지.** SSO/SCIM 은 **인증·프로비저닝 경로로서 REAL** 이나 **manager 데이터를 한 바이트도 싣지 않는다**. "IdP 가 있으니 소스가 있다" = 규칙 7 위반(**존재증명도 이름이 아니라 능력으로**).
- 🔴 **`sso_group_role_map.role`·`sso_config.default_role` 이 담는 `'manager'` 를 소스 데이터로 읽지 마라.** 그것은 `team_role ∈ {owner,manager,member}` 의 **값(롤 라벨)**이다. *"IdP 가 manager 를 준다"* 로 읽으면 §3.4 ⑧⑨ 를 **통째로 오판**한다.
- ✅ **유일한 확장 지점 = SCIM `active` 인입 경로**(`EnterpriseAuth.php:389-400` PUT/PATCH 양형식 · `:394` `filter_var BOOLEAN`) — **이 경로만 REAL 이다.** manager 를 추가하려면 ① `scimCreateUser:364-375` 파서 확장 ② `scimUpdateUser:391-396` Operations 분기 확장 ③ `scimUserOut:329-339` 출력 확장 ④ enterprise 확장 스키마 선언 ⑤ `/Schemas` 디스커버리 신설 — **5개소 동시**. 하나라도 빠지면 현재의 **침묵 no-op 가 그대로 재생산**된다.
- 🔴 **`sso_config` 에 `manager_attr` 슬롯 신설이 IdP 축의 선결 조건**이다 — 슬롯 없이 매핑 로직만 만들면 설정 불가능한 코드가 된다.
- 🔴 **§66 Reconciliation 을 source 측부터 착수 금지.** 양변 부재 → **Canonical 선언이 선행**. 좌변만 만들면 비교 결과가 **자동 MATCH = 가짜녹색**이 된다.
- 🔴 **커넥터 신설 시 Connector Registry 등록 · Quality Gate · Trust Score · 회귀테스트까지 완료해야 완료**(데이터 헌법 Volume 2 §14). HRIS/ERP 커넥터를 붙이는 순간 이 전체가 의무가 된다.
